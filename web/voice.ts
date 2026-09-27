import { z } from 'zod'
import { api } from './api.js'

const eventSchema = z
  .object({
    type: z.string(),
    response: z
      .object({
        id: z.string(),
        output: z
          .array(
            z
              .object({
                type: z.string(),
                name: z.string().optional(),
                call_id: z.string().optional(),
                arguments: z.string().optional()
              })
              .passthrough()
          )
          .optional()
      })
      .passthrough()
      .optional(),
    error: z.object({ message: z.string().optional() }).passthrough().optional()
  })
  .passthrough()
export class Voice {
  private pc?: RTCPeerConnection
  private channel?: RTCDataChannel
  private stream?: MediaStream
  private audio = new Audio()
  private epoch = 0
  private pressed = false
  private activeResponse = false
  private readonly responses = new Map<string, number>()
  private readonly seen = new Set<string>()
  constructor(
    private readonly status: (text: string) => void,
    private readonly onDisconnect: () => void
  ) {}
  private send(message: unknown) {
    if (this.channel?.readyState === 'open')
      this.channel.send(JSON.stringify(message))
  }
  async connect(openMic: boolean) {
    this.close()
    try {
      const pc = (this.pc = new RTCPeerConnection())
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      for (const track of this.stream.getTracks()) {
        track.enabled = openMic
        pc.addTrack(track, this.stream)
      }
      this.audio.autoplay = true
      pc.ontrack = (event) => {
        this.audio.srcObject = event.streams[0] ?? null
        void this.audio
          .play()
          .catch(() => this.status('Click Talk to enable assistant audio.'))
      }
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected'
        ) {
          this.close()
          this.status('Voice disconnected. Connect again.')
        }
      }
      const channel = (this.channel = pc.createDataChannel('oai-events'))
      channel.onmessage = (event) => {
        const parsed = eventSchema.safeParse(JSON.parse(event.data as string))
        if (parsed.success)
          void this.receive(parsed.data).catch(() =>
            this.status('Voice tool failed. Check the operator timeline.')
          )
      }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: offer.sdp, openMic })
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: await response.text()
      })
      if (channel.readyState !== 'open')
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Voice connection timed out.')),
            10000
          )
          channel.addEventListener(
            'open',
            () => {
              clearTimeout(timeout)
              resolve()
            },
            { once: true }
          )
          channel.addEventListener(
            'close',
            () => {
              clearTimeout(timeout)
              reject(new Error('Voice connection closed.'))
            },
            { once: true }
          )
        })
      this.status(
        openMic ? 'Listening · open mic' : 'Voice ready · push to talk'
      )
    } catch (err) {
      this.close()
      throw err
    }
  }
  private async interrupt() {
    this.epoch++
    if (this.activeResponse) this.send({ type: 'response.cancel' })
    this.send({ type: 'output_audio_buffer.clear' })
    await api('cancel', {})
  }
  async talk(pressed: boolean) {
    this.pressed = pressed
    if (pressed) {
      await this.audio.play().catch(() => {})
      await this.interrupt()
      if (!this.pressed) return
      this.send({ type: 'input_audio_buffer.clear' })
      this.stream?.getAudioTracks().forEach((track) => {
        track.enabled = true
      })
      this.status('Listening…')
    } else {
      this.stream?.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
      this.send({ type: 'input_audio_buffer.commit' })
      this.send({ type: 'response.create' })
      this.status('Thinking…')
    }
  }
  private async receive(event: z.infer<typeof eventSchema>) {
    if (event.type === 'input_audio_buffer.speech_started') {
      this.epoch++
      await api('cancel', {})
      this.status('Listening…')
    }
    if (event.type === 'response.created' && event.response) {
      this.activeResponse = true
      this.responses.set(event.response.id, this.epoch)
    }
    if (event.type === 'error')
      this.status(event.error?.message ?? 'Voice error')
    if (event.type !== 'response.done' || !event.response) return
    this.activeResponse = false
    const epoch = this.responses.get(event.response.id)
    this.responses.delete(event.response.id)
    const calls = (event.response.output ?? []).filter(
      (item) => item.type === 'function_call'
    )
    let ran = false
    // Execute the complete batch and request a single continuation.
    for (const call of calls) {
      if (
        !call.call_id ||
        !call.name ||
        !call.arguments ||
        this.seen.has(call.call_id)
      )
        continue
      this.seen.add(call.call_id)
      let output: unknown = {
        outcome: 'superseded',
        message: 'User interrupted this response. Do not execute or retry it.'
      }
      if (epoch === this.epoch) {
        try {
          output = await api('tool', {
            name: call.name,
            arguments: JSON.parse(call.arguments),
            callId: call.call_id
          })
        } catch {
          output = {
            outcome: 'failed',
            message: 'Local tool unavailable. Do not assume completion.'
          }
        }
        ran = true
      }
      this.send({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(output)
        }
      })
    }
    if (ran && epoch === this.epoch) this.send({ type: 'response.create' })
    else this.status('Voice ready')
  }
  close() {
    this.onDisconnect()
    this.epoch++
    this.pressed = false
    this.stream?.getTracks().forEach((track) => {
      track.stop()
    })
    this.channel?.close()
    this.pc?.close()
    this.audio.pause()
    this.audio.srcObject = null
    this.stream = undefined
    this.channel = undefined
    this.pc = undefined
    this.activeResponse = false
    this.seen.clear()
    this.responses.clear()
  }
}

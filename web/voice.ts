import { api } from './api.js'
import { VoiceTools } from './voice-tools.js'

export class Voice {
  private pc?: RTCPeerConnection
  private channel?: RTCDataChannel
  private stream?: MediaStream
  private tools?: VoiceTools
  private connection?: AbortController
  private audio = new Audio()
  private pressed = false
  private recordingAt?: number
  private press = 0
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
    const connection = (this.connection = new AbortController())
    const current = () => this.connection === connection
    try {
      const pc = (this.pc = new RTCPeerConnection())
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      if (!current()) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('Voice connection superseded.')
      }
      this.stream = stream
      for (const track of stream.getTracks()) {
        track.enabled = openMic
        pc.addTrack(track, stream)
      }
      this.audio.autoplay = true
      pc.ontrack = (event) => {
        if (!current()) return
        this.audio.srcObject = event.streams[0] ?? null
        void this.audio.play().catch(() => {
          if (current()) this.status('Click Talk to enable assistant audio.')
        })
      }
      pc.onconnectionstatechange = () => {
        if (
          current() &&
          (pc.connectionState === 'failed' ||
            pc.connectionState === 'disconnected')
        ) {
          this.close()
          this.status('Voice disconnected. Connect again.')
        }
      }
      const channel = (this.channel = pc.createDataChannel('oai-events'))
      const tools = (this.tools = new VoiceTools(
        (message) => {
          if (current() && channel.readyState === 'open')
            channel.send(JSON.stringify(message))
        },
        api,
        (text) => {
          if (current()) this.status(text)
        }
      ))
      channel.onmessage = (event) => {
        if (current())
          void tools.receive(event.data).catch(() => {
            if (current())
              this.status(
                'Voice tool failed. Reconnect voice before trying again.'
              )
          })
      }
      const offer = await pc.createOffer()
      connection.signal.throwIfAborted()
      await pc.setLocalDescription(offer)
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: offer.sdp, openMic }),
        signal: connection.signal
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }
      const sdp = await response.text()
      connection.signal.throwIfAborted()
      await pc.setRemoteDescription({ type: 'answer', sdp })
      if (channel.readyState !== 'open')
        await new Promise<void>((resolve, reject) => {
          const finish = (error?: Error) => {
            clearTimeout(timeout)
            channel.removeEventListener('open', opened)
            channel.removeEventListener('close', closed)
            connection.signal.removeEventListener('abort', closed)
            if (error) reject(error)
            else resolve()
          }
          const opened = () => finish()
          const closed = () => finish(new Error('Voice connection closed.'))
          const timeout = setTimeout(
            () => finish(new Error('Voice connection timed out.')),
            10000
          )
          channel.addEventListener('open', opened, { once: true })
          channel.addEventListener('close', closed, { once: true })
          connection.signal.addEventListener('abort', closed, { once: true })
          if (connection.signal.aborted) closed()
        })
      connection.signal.throwIfAborted()
      this.status(
        openMic ? 'Listening · open mic' : 'Voice ready · push to talk'
      )
    } catch (err) {
      if (current()) this.close()
      throw err
    }
  }
  async talk(pressed: boolean) {
    if (
      !this.tools ||
      this.channel?.readyState !== 'open' ||
      this.pressed === pressed
    )
      return
    const connection = this.connection
    const tools = this.tools
    this.pressed = pressed
    const press = ++this.press
    if (pressed) {
      try {
        await this.audio.play().catch(() => {})
        if (this.connection !== connection || this.press !== press) return
        await tools.interrupt()
        if (this.connection !== connection || this.press !== press) return
        this.send({ type: 'input_audio_buffer.clear' })
        this.stream?.getAudioTracks().forEach((track) => {
          track.enabled = true
        })
        this.recordingAt = performance.now()
        this.status('Listening…')
      } catch {
        if (this.connection === connection) {
          this.pressed = false
          this.status(
            'Could not interrupt the previous request. Reconnect voice.'
          )
        }
      }
    } else {
      this.stream?.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
      const duration =
        this.recordingAt === undefined
          ? 0
          : performance.now() - this.recordingAt
      this.recordingAt = undefined
      if (duration < 150) {
        this.send({ type: 'input_audio_buffer.clear' })
        this.status('Hold Talk while speaking.')
        return
      }
      this.send({ type: 'input_audio_buffer.commit' })
      this.send({ type: 'response.create' })
      this.status('Thinking…')
    }
  }
  close() {
    this.connection?.abort()
    this.connection = undefined
    this.tools?.close()
    this.tools = undefined
    this.pressed = false
    this.press++
    this.recordingAt = undefined
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
    this.onDisconnect()
  }
}

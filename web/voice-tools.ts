import { z } from 'zod'

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
// One instance per WebRTC connection. Pending results never cross sessions.
export class VoiceTools {
  private closed = false
  private epoch = 0
  private activeResponse?: string
  private readonly responses = new Map<string, number>()
  private readonly seen = new Set<string>()
  private cancellation: Promise<unknown> = Promise.resolve()
  constructor(
    private readonly emit: (message: unknown) => void,
    private readonly request: (path: string, data: unknown) => Promise<unknown>,
    private readonly status: (text: string) => void
  ) {}
  private send(message: unknown) {
    if (!this.closed) this.emit(message)
  }
  async interrupt(manual = true) {
    if (this.closed) return
    this.epoch++
    if (manual) {
      if (this.activeResponse) this.send({ type: 'response.cancel' })
      this.send({ type: 'output_audio_buffer.clear' })
    }
    // New tool calls must wait until all earlier cancellation requests settle.
    // A failed cancellation leaves this session unable to issue further tools.
    this.cancellation = this.cancellation.then(() =>
      this.closed ? undefined : this.request('cancel', {})
    )
    await this.cancellation
  }
  async receive(raw: unknown) {
    if (this.closed) return
    let parsed
    try {
      parsed = eventSchema.safeParse(
        typeof raw === 'string' ? JSON.parse(raw) : raw
      )
    } catch {
      this.status('Invalid voice event received.')
      return
    }
    if (!parsed.success) return
    const event = parsed.data
    if (event.type === 'input_audio_buffer.speech_started') {
      await this.interrupt(false)
      if (!this.closed) this.status('Listening…')
    }
    if (event.type === 'response.created' && event.response) {
      this.activeResponse = event.response.id
      this.responses.set(event.response.id, this.epoch)
    }
    if (event.type === 'error')
      this.status(event.error?.message ?? 'Voice error')
    if (event.type !== 'response.done' || !event.response) return
    if (this.activeResponse === event.response.id)
      this.activeResponse = undefined
    const epoch = this.responses.get(event.response.id)
    this.responses.delete(event.response.id)
    const calls = (event.response.output ?? []).filter(
      (item) => item.type === 'function_call'
    )
    let ran = false
    for (const call of calls) {
      if (
        !call.call_id ||
        !call.name ||
        !call.arguments ||
        this.seen.has(call.call_id)
      )
        continue
      this.seen.add(call.call_id)
      await this.cancellation
      if (this.closed) return
      let output: unknown = {
        outcome: 'superseded',
        message: 'User interrupted this response. Do not execute or retry it.'
      }
      if (epoch === this.epoch) {
        try {
          output = await this.request('tool', {
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
  }
  close() {
    this.closed = true
    this.epoch++
    this.responses.clear()
    this.seen.clear()
  }
}

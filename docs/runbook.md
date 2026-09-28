> Current workflow: use [the one-session demo guide](demo-session.md) and the controller's six journeys. Earlier step-by-step probe instructions below are diagnostics, not a requirement to interrupt the user after every action.

# Hardware runbook and recording script

Use the same coordinator through manual buttons and voice. Record physical results in an ignored .local/hardware-runs.md; never infer them from a successful API response.

## Active testing constraint

The user asked to keep the TV muted during testing. Volume is currently set to 0 and verified through LG state. Keep it at 0; do not restore the earlier level of 10 or run audible-volume tests unless the user explicitly changes this instruction. The user is multitasking and is not a reliable observer of precise response timing during these automated probes.

## Prepare

- TV awake. Xbox on, signed in, installed demo game updated; Retail Mode and Remote features enabled.
- LG connected on the same reachable LAN as this Mac. Pair LG and discover actual IDs; choose HDMI 3.
- Soundbar on HDMI 2. Keep the laptop speaker independent of TV HDMI audio.
- Native LG YouTube manually works in the selected profile, with first-run prompts cleared.
- Pair YouTube using its TV code. Complete Microsoft sign-in and choose the console/game.
- Keep API keys in local setup or .env. Select Live mode and confirm the banner.
- pnpm setup:check reports prerequisites without printing credentials.

## P1: native receiver

1. Manually open LG YouTube. Use Known-video diagnostic with a real 11-character video ID (A).
2. Record the visible/audible result and fresh receiver/video event.
3. Replace with B. Pause, then Continue. Verify physically.
4. Close/reopen YouTube using the TV remote and reconnect.
5. Restart the controller, reconnect with saved pairing and repeat A → B.
6. If app prompts/ads interfere, record them; do not relabel acceptance as playback.

## P2: room primitives

Pair/reconnect LG; check discovered native YouTube and HDMI 3 mappings. Test Volume 15 and Quieter, confirming the **soundbar's audible response**. Test Xbox game activation, Xbox Home and TV Home independently. Note whether CEC changes the input after a command.

A game launch gate is activation, not saved-game readiness. Home buttons return accepted-only when no dependable dashboard observation is available.

## P3: three physical runs

Start with Xbox HDMI visible. Close native YouTube before at least one run.

For the close/reopen case, first open native YouTube, then use **Known-video diagnostic → Close native YouTube for reopen test**. After the backend containing this diagnostic has been loaded, it requests closure of only `youtube.leanback.v4` and waits for LG to report another foreground app. If it fails, refresh state and inspect the TV before retrying. Run the native playback probe afterward and record the close/reopen result separately from a warm transition. This is an app close/reopen experiment, not a TV power cycle; accepted closure and foreground exit alone do not prove successful reopening or visible playback.

1. Known video A → native YouTube launches and becomes foreground.
2. Replace A with B in the same receiver.
3. Pause/resume.
4. Back to Xbox explicitly pauses YouTube and selects HDMI 3.
5. Repeat three times. Record warm/cold path, requested/observed IDs and first physical picture/audio.

Also interrupt a pending search/startup with a newer request. Verify no later step of the old request steals the display. Disconnect/close the receiver for one intentional failure; recovery should require an explicit reconnect, not an invented success.

## P4: voice and real search

Add a YouTube Data API key and connect Realtime. Start with push-to-talk.

- Request an artist/song that was not used during implementation.
- Correct only the song and verify artist carryover.
- Ask for the live version; clarify if results are ambiguous.
- Try a second unfamiliar request.
- Speak pause/continue, then back to Xbox.
- Test open mic only with room music audible and explicit interruption tests.

The standard OpenAI key stays on the server; the browser receives an SDP answer. Do not put API keys in model arguments.

## Timing sheet

For each attempt record:

| Run | Warm/cold | Speech end | Intent ready | Search complete | Command accepted | Fresh state | First picture/audio | Physical pass/failure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 |  |  |  |  |  |  |  |  |

Use trace.jsonl for software timestamps and pnpm timings for grouped medians/worst observations. Add speech-end and first-picture/audio from the live observer/video; they are not inferred by the controller. Keep simulated and live records separate.

## Development server reloads

Keep `pnpm dev` running in the user's network-enabled Terminal. Source changes in backend TypeScript or `bridge/main.py` restart its child automatically. Agents can also run `pnpm dev:restart` from the repository without controlling the Terminal UI. The command updates only the server file timestamp, not its contents. It requires the watcher to be running; it is not a process supervisor for a closed Terminal or `pnpm dev:stable`.

Before a restart, finish or cancel active device probes and disconnect voice. Afterward, wait for `/api/status` boot results, then use `get_room_state` to verify actual TV access. The server can answer HTTP before its device connections finish, so an immediate empty state is not evidence of lost permissions. Showing the live TV panel again supplies the new display token; reconnect voice as needed. During hardware timing trials, avoid edits that trigger reloads.

Verified on the user's actual setup: touching `src/server.ts` changed the listening child PID from 15817 to 17569, startup reconnected LG and Xbox, and a fresh TV read reported native YouTube with volume 0. The source contents were unchanged. Thus an automatic child restart preserved LAN access in this Terminal-launched watcher.

## Recovery

- TV unreachable: confirm displayed IP and network reachability, then Pair / reconnect LG; accept the prompt. On this Mac, the same secure-port TCP check succeeded in the user’s Terminal but failed in Codex-launched Python/Node processes, even after Python.app Local Network access was enabled. If that difference persists, stop the existing controller and run pnpm dev in the successful Terminal, leaving it open. Recheck pairing through the same localhost UI. Do not infer a TV or router fault from the agent-process error alone.
- Receiver unavailable: open native YouTube, clear prompts, then Reconnect receiver. Re-pair if revoked.
- Xbox authorization fails: start sign-in again; callback expires after ten minutes. Port 8080 must be free. The default public desktop client might be rejected by the account; own-app registration is a later fallback.
- Uncertain mutation: Refresh observations and inspect the actual screen before retrying.
- Stuck bridge: restart pnpm dev. Never blindly repeat device buttons.
- API search failure: check Google API enablement/quota/key. Known IDs may diagnose playback but do not pass P4.
- Voice failure: reconnect after checking microphone permission, independent speaker output and API access.

## Continuous take, approximately 2–3 minutes

Start with `pnpm dev:stable` (preserving `TV_DISPLAY_HOST` when using the panel). This disables backend file watching for the take. Do not edit the controller during measured device trials.

Frame the person, TV and enough of the room to establish the real devices.

1. Begin on LG Home. “Open [installed game] on Xbox and set volume to 15.”
2. “A little quieter.” “Go to Xbox Home.”
3. Request a music video chosen at recording time.
4. “No, play [another song].” “Actually, the live version.”
5. “Pause.” “Continue.” “Back to Xbox.”

Complete two rehearsals without developer intervention before the recorded take. Keep real delays/ads/prompts visible in evidence. A separate edited highlight may follow.

## Native HUD gate

Use the exact model/firmware in room.md for a bounded V1 investigation. Test a static dismissible transparent label over both native YouTube and direct Xbox HDMI, including audio, focus, normal game picture mode, transitions and Home. No firmware modifications are authorized by this plan.

Only after V1 passes should native animation be added. /display is a laptop preview and must not be filmed or described as proof of a TV overlay. If V1 fails, retain the working control demo and document the visual limitation explicitly.

## Seeking within native YouTube

Reconnect voice after loading the seek tool, then try “Go to one minute thirty,” “Skip forward thirty seconds,” “Go back ten seconds,” and “Start over.” These act on the current video without searching or replacing it. Default forward/back jumps are ten seconds when no amount is given. The controller requires foreground native YouTube and fresh receiver feedback; live streams or videos that reject seeking can fail explicitly. For a muted supervised check, verify the picture and player timestamp after each request.

## Additional YouTube voice controls

See [the complete agent tool list](agent-tools.md). Reconnect voice, then test “Next track,” “Previous video,” “Play at one-and-a-half speed,” “Normal speed,” “English captions,” “Captions off,” and “Turn autoplay off.” Record actual picture/player-setting results. Captions need an available language. Autoplay is a real preference change; restore it if desired after testing. Ad skip remains disabled for this Premium room.

# Implementation status

Updated September 28, 2026. This ledger distinguishes code, local evidence and physical-device evidence. The full original scope in [the implementation plan](implementation-plan.md) remains active.

| Package | Implemented / verified locally | Remaining gate |
| --- | --- | --- |
| P0 | Node/Vite/React app, setup forms, explicit Live/Simulation, manual tools, JSONL traces, locked Python bridge, setup check. Browser loads and reports unavailable hardware/keys. | Recheck after device configuration changes. |
| P1 | Native LG YouTube paired. Real receiver confirmed requested video A eventually, replacement B within deadline, then Paused → Playing for B. | User picture/sound confirmation; investigate first-play timeout; closed/reopened app and saved receiver reconnect after bridge/controller restart. |
| P2 | LG pairing accepted on the actual TV; saved key reconnects after bridge restart. Actual app/input catalogs and fresh Home/volume/ARC state read successfully. Control adapters and Xbox OAuth/catalog code implemented. | Physical input/Home/volume changes, Xbox login and installed game activation. |
| P3 | Deadlines, serialized source effects, independent volume lane, interruption, receiver/foreground/freshness checks. Coordinator tests pass. | Three consecutive physical transitions, including cold launch; test actual CEC behavior and interruption. |
| P4 | Real YouTube API search/cache, candidate IDs/context, Realtime WebRTC and validated tools, PTT/open mic. OpenAI model access and both session configurations accepted (HTTP 200). | YouTube API key; real search, two unfamiliar requests, speech/correction and room acoustics. |
| P5 | Timing summarizer and rehearsal/recording runbook. | Measured hardware runs, two uninterrupted rehearsals, continuous physical recording. |
| V1 | Exact model/firmware recorded. Laptop display preview exists. | [Source investigation](overlay-experiment.md) is recorded; install/test on this TV remains pending. Preview does not establish overlay support. |
| V2 | Basic laptop listening/action visual treatment. | Only implement native animation after V1 proves the rendering path. |

## Evidence so far

- pnpm test: 23 TypeScript tests (14 coordinator/observation and 9 voice interruption/lifecycle regressions) and 5 Python bridge regression tests, plus lint/format/typecheck.
- pnpm build: browser bundle produced.
- Browser simulation: game launch → known-video playback → return to Xbox passed through the UI; restored Live mode afterward. These are simulation results only.
- Browser: live-mode page renders; missing Google key fails without selecting media; volume fails with an unpaired TV.
- Existing OpenAI key can retrieve the gpt-realtime-2.1 model (HTTP 200). The client-secrets endpoint also accepted the actual push-to-talk and open-mic configurations with all nine tools (HTTP 200 each); returned secrets were discarded without logging. This validates configuration, not a WebRTC connection or microphone/audio test.
- Voice regression tests cover old-session results after reconnect, delayed microphone permission, stale peer callbacks, quick-release audio, interruption ordering, failed cancellation and duplicate response events. These use controlled mocks; actual room acoustics remain untested.
- LG discovery failed from Codex-launched processes, including direct-IP probes after enabling Python.app Local Network permission. The same secure-port check succeeded in the user’s Terminal. Running pnpm dev from that Terminal resolved controller access; keep using that launch environment.
- User accepted the physical LG pairing prompt. Live app/input catalogs were read; saved pairing survived bridge restarts. Actual IDs: YouTube youtube.leanback.v4; Xbox HDMI_3 / com.webos.app.hdmi3. The TV labeled HDMI 2 “LG Sound Bar” and HDMI 3 “XBOX Game Console.”
- Fresh LG state read: app com.webos.app.home, volume 10, soundOutput external_arc. No input or volume mutation has been physically verified yet.
- The TV rejects get_software_info with WebOsTvResponseTypeError while required discovery succeeds. Optional metadata now returns an explicit warning; required app/input failures still fail setup. Two bridge regressions cover this boundary. Firmware identity remains grounded in the user’s screenshot.
- Native YouTube TV-code pairing succeeds. Diagnostic A (4NRXx6U8ABQ) was accepted at 667 ms but timed out at 20 seconds while another video ID was reported; a later read confirmed the requested video Playing. An advertisement is a hypothesis awaiting user confirmation, not an established cause.
- Replacement B (XXYlFuWEuKI) was accepted at 543 ms and observed Playing at 10,458 ms. Pause was accepted at 144 ms and observed at 4,865 ms; resume at 113 ms / 2,380 ms. Native YouTube remained foreground, with LG volume 10 and external_arc. These are command/state timings, not measured physical picture/audio onset; user confirmation is pending.
- Physical identity from user screenshot: 86UA8450PSA, webOS 25, software 33.31.61. Xbox HDMI 3, soundbar HDMI 2.

## Integration decisions

Use one long-lived Python process over JSON lines, leaving sequencing, search, candidate validation and voice in TypeScript. The researched clients have the required library interfaces; no protocol port is needed. A Node-only LG alternative, [lgtv2](https://github.com/hobbyquaker/lgtv2), supports typed request/subscription control and secure webOS connections. Keeping LG beside the already-selected Python YouTube/Xbox clients avoids another device runtime interface; it is not a claim that TypeScript LG support is unavailable. aiowebostv 0.10.0, pyytlounge 3.4.0 and python-xbox 0.3.0 are locked locally. LG pairing, catalogs and state reads are now hardware-tested on this TV. LG mutations and the YouTube/Xbox integrations remain unverified.

The YouTube library's wrapper.store_auth_state() uses a different shape from load_auth_state() in 3.4.0. The bridge persists auth.serialize(), and a round-trip regression test covers that choice. No dependency source was patched.

Xbox commands report acceptance separately from title observation. Game launch compares the console's focus AUMID with the installed product catalog. Home commands remain accepted-only until the person in the room verifies their visible result.

Playback-state-only events do not carry video identity. The bridge requests a correlated now-playing event instead of making an old video ID appear fresh. Video completion also requires the chosen receiver and foreground native app.

## Remaining limitations

- Actual LG pairing, discovery and state reads pass; no complete P1–P5 journey gate has passed yet.
- Open-mic acoustics and end-to-end voice timing are untested.
- Room volume through the HDMI 2 soundbar must be tested; the server caps requested LG volume at 40 by default.
- Cloud-delivered commands may act after acceptance. The coordinator suppresses later steps of interrupted sequences; it cannot revoke a command already delivered to vendor infrastructure.
- Receiver reconnection is bounded; revoked auth requires a new TV code.
- No root, firmware change, on-TV HUD or video recording has been performed.
- Local trace timestamps cover intent/search/command/observed state. Physical first-picture/audio timings require observer entries in the run log.

Continue with user confirmation of native playback, first-play delay diagnosis, and saved-receiver/cold-app checks before adding demo polish.

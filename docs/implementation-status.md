# Implementation status

Updated September 28, 2026. This ledger distinguishes code, local evidence and physical-device evidence. The full original scope in [the implementation plan](implementation-plan.md) remains active.

| Package | Implemented / verified locally | Remaining gate |
| --- | --- | --- |
| P0 | Node/Vite/React app, setup forms, explicit Live/Simulation, manual tools, JSONL traces, locked Python bridge, setup check. Browser loads and reports unavailable hardware/keys. | Recheck after device configuration changes. |
| P1 | YouTube code pairing, auth serialization, receiver session, replace/pause/resume, correlated now-playing events. Regression test covers auth round-trip. | Pair native LG YouTube; physically verify A → B, pause/resume, closed/reopened app, and controller restart. |
| P2 | LG pairing/catalog/input/Home/volume; Microsoft browser OAuth with nonce and expiring loopback callback; Xbox catalog/launch/Home. | Real pairing, login, discovery, soundbar volume and installed game activation. |
| P3 | Deadlines, serialized source effects, independent volume lane, interruption, receiver/foreground/freshness checks. Coordinator tests pass. | Three consecutive physical transitions, including cold launch; test actual CEC behavior and interruption. |
| P4 | Real YouTube API search/cache, candidate IDs/context, Realtime WebRTC and validated tools, PTT/open mic. OpenAI model access and both session configurations accepted (HTTP 200). | YouTube API key; real search, two unfamiliar requests, speech/correction and room acoustics. |
| P5 | Timing summarizer and rehearsal/recording runbook. | Measured hardware runs, two uninterrupted rehearsals, continuous physical recording. |
| V1 | Exact model/firmware recorded. Laptop display preview exists. | [Source investigation](overlay-experiment.md) is recorded; install/test on this TV remains pending. Preview does not establish overlay support. |
| V2 | Basic laptop listening/action visual treatment. | Only implement native animation after V1 proves the rendering path. |

## Evidence so far

- pnpm test: 23 TypeScript tests (14 coordinator/observation and 9 voice interruption/lifecycle regressions) and 3 Python auth/event regression tests, plus lint/format/typecheck.
- pnpm build: browser bundle produced.
- Browser simulation: game launch → known-video playback → return to Xbox passed through the UI; restored Live mode afterward. These are simulation results only.
- Browser: live-mode page renders; missing Google key fails without selecting media; volume fails with an unpaired TV.
- Existing OpenAI key can retrieve the gpt-realtime-2.1 model (HTTP 200). The client-secrets endpoint also accepted the actual push-to-talk and open-mic configurations with all nine tools (HTTP 200 each); returned secrets were discarded without logging. This validates configuration, not a WebRTC connection or microphone/audio test.
- Voice regression tests cover old-session results after reconnect, delayed microphone permission, stale peer callbacks, quick-release audio, interruption ordering, failed cancellation and duplicate response events. These use controlled mocks; actual room acoustics remain untested.
- LG SSDP discovery received zero LG responses, first across Wi-Fi bands and again after the Mac moved onto the TV's 2.4 GHz network. The user then supplied the TV IP, now saved in ignored local config. Direct pairing fails before authentication: TCP ports 3000/3001/8008 report “No route to host.” A neighbor entry exists. Python.app Local Network permission was enabled with user approval and verified in System Settings, but fresh Python and Node probes still return host-unreachable. Pairing remains unverified; an independent user-terminal connectivity check is pending.
- Physical identity from user screenshot: 86UA8450PSA, webOS 25, software 33.31.61. Xbox HDMI 3, soundbar HDMI 2.

## Integration decisions

Use one long-lived Python process over JSON lines, leaving sequencing, search, candidate validation and voice in TypeScript. The researched clients have the required library interfaces; no protocol port is needed. A Node-only LG alternative, [lgtv2](https://github.com/hobbyquaker/lgtv2), supports typed request/subscription control and secure webOS connections. Keeping LG beside the already-selected Python YouTube/Xbox clients avoids another device runtime interface; it is not a claim that TypeScript LG support is unavailable. aiowebostv 0.10.0, pyytlounge 3.4.0 and python-xbox 0.3.0 are locked locally. These versions are **locally tested**, not yet hardware-tested.

The YouTube library's wrapper.store_auth_state() uses a different shape from load_auth_state() in 3.4.0. The bridge persists auth.serialize(), and a round-trip regression test covers that choice. No dependency source was patched.

Xbox commands report acceptance separately from title observation. Game launch compares the console's focus AUMID with the installed product catalog. Home commands remain accepted-only until the person in the room verifies their visible result.

Playback-state-only events do not carry video identity. The bridge requests a correlated now-playing event instead of making an old video ID appear fresh. Video completion also requires the chosen receiver and foreground native app.

## Remaining limitations

- No physical-device gate is passed yet.
- Open-mic acoustics and end-to-end voice timing are untested.
- Room volume through the HDMI 2 soundbar must be tested; the server caps requested LG volume at 40 by default.
- Cloud-delivered commands may act after acceptance. The coordinator suppresses later steps of interrupted sequences; it cannot revoke a command already delivered to vendor infrastructure.
- Receiver reconnection is bounded; revoked auth requires a new TV code.
- No root, firmware change, on-TV HUD or video recording has been performed.
- Local trace timestamps cover intent/search/command/observed state. Physical first-picture/audio timings require observer entries in the run log.

Resolve direct-IP network access, then LG pairing and the native YouTube known-video probe before adding demo polish.

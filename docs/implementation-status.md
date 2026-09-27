# Implementation status

Updated September 28, 2026. This ledger distinguishes code, local evidence and physical-device evidence. The full original scope in [the implementation plan](implementation-plan.md) remains active.

| Package | Implemented / verified locally | Remaining gate |
| --- | --- | --- |
| P0 | Node/Vite/React app, setup forms, explicit Live/Simulation, manual tools, JSONL traces, locked Python bridge, setup check. Browser loads and reports unavailable hardware/keys. | Recheck after device configuration changes. |
| P1 | Native LG YouTube paired. Real receiver confirmed requested video A eventually, replacement B within deadline, then Paused → Playing for B. | User confirmed picture/sound for A → B, pause and resume. Saved receiver authentication reconnects after bridge restart. Remaining: investigate first-play timeout, closed/reopened app and full controller restart. |
| P2 | LG pairing accepted on the actual TV; saved key reconnects after bridge restart. Actual app/input catalogs and fresh Home/volume/ARC state read successfully. Xbox OAuth, console/catalog discovery and Hades launch physically confirmed by the user. | Input/Home picture confirmation and audible volume effects; foreground-title metadata remains unavailable. Automated tests must now keep volume 0. |
| P3 | Deadlines, serialized source effects, independent volume lane, interruption, receiver/foreground/freshness checks. Coordinator tests pass. | A first warm transition reached A, B and Paused, but resume timed out; three consecutive complete transitions including cold launch remain pending. Test actual CEC behavior and interruption. |
| P4 | Real YouTube API search/cache, candidate IDs/context, Realtime WebRTC and validated tools, PTT/open mic. OpenAI model access and both session configurations accepted (HTTP 200); actual Chrome WebRTC connection reached Voice ready in push-to-talk mode. | Two new songs and artist carryover pass real search-to-native-playback state checks. Remaining: actual speech/correction and room acoustics. |
| P5 | Timing summarizer and rehearsal/recording runbook. | Measured hardware runs, two uninterrupted rehearsals, continuous physical recording. |
| V1 | Exact model/firmware recorded. Static dismissible TV probe packages with LG CLI 3.2.6; transparent browser layout checked. | [Source investigation](overlay-experiment.md) is recorded; Developer Mode setup and install/test on this TV remain pending. Preview does not establish overlay support. |
| V2 | Basic laptop listening/action visual treatment. | Only implement native animation after V1 proves the rendering path. |

## Evidence so far

- pnpm test: 26 TypeScript tests (17 coordinator/observation and 9 voice interruption/lifecycle regressions) and 7 Python bridge regression tests, plus lint/format/typecheck.
- pnpm build: browser bundle produced.
- Browser simulation: game launch → known-video playback → return to Xbox passed through the UI; restored Live mode afterward. These are simulation results only.
- Browser: live-mode page renders; missing Google key fails without selecting media; volume fails with an unpaired TV.
- Existing OpenAI key can retrieve the gpt-realtime-2.1 model (HTTP 200). The client-secrets endpoint also accepted the actual push-to-talk and open-mic configurations with all nine tools (HTTP 200 each); returned secrets were discarded without logging. This validates configuration, not a WebRTC connection or microphone/audio test.
- Voice regression tests cover old-session results after reconnect, delayed microphone permission, stale peer callbacks, quick-release audio, interruption ordering, failed cancellation and duplicate response events. These use controlled mocks; actual room acoustics remain untested.
- LG discovery failed from Codex-launched processes, including direct-IP probes after enabling Python.app Local Network permission. The same secure-port check succeeded in the user’s Terminal. Running pnpm dev from that Terminal resolved controller access; keep using that launch environment.
- User accepted the physical LG pairing prompt. Live app/input catalogs were read; saved pairing survived bridge restarts. Actual IDs: YouTube youtube.leanback.v4; Xbox HDMI_3 / com.webos.app.hdmi3. The TV labeled HDMI 2 “LG Sound Bar” and HDMI 3 “XBOX Game Console.”
- LG reported volume 9 → 10 and a source switch to com.webos.app.hdmi3 with native YouTube Paused. Picture/audible-effect verification for these changes remains pending. The user subsequently requested silent testing: volume 0 is now verified and must remain there.
- The TV rejects get_software_info with WebOsTvResponseTypeError while required discovery succeeds. Optional metadata now returns an explicit warning; required app/input failures still fail setup. Two bridge regressions cover this boundary. Firmware identity remains grounded in the user’s screenshot.
- Native YouTube TV-code pairing succeeds. Diagnostic A (4NRXx6U8ABQ) was accepted at 667 ms but timed out at 20 seconds while another video ID was reported; a later read confirmed the requested video Playing. The user explicitly confirmed YouTube Premium and no ads. The initial delay remains unexplained; do not attribute it to an advertisement.
- Replacement B (XXYlFuWEuKI) was accepted at 543 ms and observed Playing at 10,458 ms. Pause was accepted at 144 ms and observed at 4,865 ms; resume at 113 ms / 2,380 ms. Native YouTube remained foreground, with LG volume 10 and external_arc. These are command/state timings, not measured physical picture/audio onset. The user confirmed that the actual TV played A → B, paused and resumed with sound.
- Saved YouTube pairing reconnects after bridge restart without another TV code. A fresh receiver event subsequently restored the current video and state; session connection alone was not treated as a playback observation.
- One warm HDMI → native YouTube sequence observed A at 5,395 ms, replacement B at 10,663 ms and pause at 18,545 ms; resume timed out at 20 seconds and the sequence stopped. A later read showed Playing. This is not a P3 pass.
- User is multitasking and explicitly said they are not certain whether physical playback reacted promptly in the later tests. Do not infer physical latency from their earlier general success report.
- A bounded latency investigation found command acknowledgements in roughly 0.1–0.7 seconds but inconsistent later receiver observations. A one-second shared status-request budget did not improve the result (two timeouts, including after a 52-second quiet interval) and was reverted. Temporary wire tracing showed a Paused event parsed immediately after arriving, approximately 5.3 seconds after the command. This rules out a multi-second local parse delay for that sample, not upstream/TV delay generally. Instrumentation was removed; cause remains unresolved.
- Muted LG Home probe: the Home button command was accepted; an immediate snapshot still showed YouTube, and a later fresh read reported com.webos.app.home. Do not treat button acceptance as synchronous navigation. A subsequent native YouTube launch from Home observed video A Playing in 4,562 ms with volume 0. This establishes a warm transition only, not app termination/cold start.
- Physical identity from user screenshot: 86UA8450PSA, webOS 25, software 33.31.61. Xbox HDMI 3, soundbar HDMI 2.

## September 28: Xbox and real search

- Microsoft granted both requested scopes, XboxLive.signin and XboxLive.offline_access. The catalog initially returned OK with no consoles. After the user enabled Remote features, Living room Xbox and its installed catalog appeared. This resolves discovery without changing OAuth scopes or router settings.
- User reported Strict NAT. Catalog and state reads succeed, and a Hades launch operation reported Succeeded. The user explicitly confirmed Hades opened on the physical TV. This does not validate remote video streaming, which this architecture does not use.
- Hades was selected as the initial installed game alias. The first launch was accepted at 1,266 ms, selected HDMI at 1,307 ms, but timed out on the foreground-title check at 20 seconds. A subsequent direct status check returned power On, remote management enabled and an empty focus AUMID. A targeted launch operation independently reported Succeeded. The feedback change above addresses this missing metadata without relaxing title-observation claims.
- YouTube Data API v3 is enabled in the user's selected Google Cloud project. A dedicated key restricted to that API was saved in ignored local configuration and as YOUTUBE_API_KEY in the ignored, owner-only .env file. Public search succeeds; no personal YouTube OAuth was added.
- Real search found Virtual Insanity and Cosmic Girl by Jamiroquai in 436 ms and 319 ms respectively. The second search omitted the artist and retained Jamiroquai correctly. These queries were new to this prototype; repeated playback searches then used its cache.
- From Xbox HDMI, the real Virtual Insanity result was observed Playing in native LG YouTube at 6,618 ms. Contextual correction to the real Cosmic Girl result was observed Playing at 6,543 ms, followed by Paused at 8,172 ms. Volume remained 0 with external ARC. These are receiver/foreground observations, not physical latency measurements or a voice test.
- Actual Chrome session: granted microphone access for this visit, connected through /api/session, and reached Voice ready · push to talk. The microphone track remained disabled (Talk was never pressed); disconnected after verification. This proves the real WebRTC/data-channel handshake, not speech recognition, assistant audibility, tool use from speech or room acoustics.
- The updated Xbox feedback passes local regressions and build. Full controller restart in the user's Terminal and verification of the new live feedback are pending; an explicit restart request is open. Computer control cannot operate the Terminal app, and starting a replacement from Codex loses the known-working TV network access.

## Integration decisions

Use one long-lived Python process over JSON lines, leaving sequencing, search, candidate validation and voice in TypeScript. The researched clients have the required library interfaces; no protocol port is needed. A Node-only LG alternative, [lgtv2](https://github.com/hobbyquaker/lgtv2), supports typed request/subscription control and secure webOS connections. Keeping LG beside the already-selected Python YouTube/Xbox clients avoids another device runtime interface; it is not a claim that TypeScript LG support is unavailable. aiowebostv 0.10.0, pyytlounge 3.4.0 and python-xbox 0.3.0 are locked locally. LG pairing, catalogs and state reads are now hardware-tested on this TV. Native YouTube replacement/pause/resume have user-confirmed physical results. Xbox account discovery and Hades activation now have live evidence; see the command/title distinction below.

The YouTube library's wrapper.store_auth_state() uses a different shape from load_auth_state() in 3.4.0. The bridge persists auth.serialize(), and a round-trip regression test covers that choice. No dependency source was patched.

Xbox commands now inspect the matching cloud operation after acceptance, rejecting reported console-side failures. A completed launch plus observed Xbox HDMI with a blank foreground title returns **accepted**, with an explicit message that title verification is unavailable; it never fabricates an active title or upgrades that case to observed. Where a title is available, it must still match the installed product catalog. A contradictory title, pending operation, stale/disconnected state or failed source switch cannot use this fallback. Home commands remain accepted-only until the person in the room verifies their visible result.

Playback-state-only events do not carry video identity. The bridge requests a correlated now-playing event instead of making an old video ID appear fresh. Video completion also requires the chosen receiver and foreground native app.

## Remaining limitations

- Actual LG pairing, discovery and state reads pass; no complete P1–P5 journey gate has passed yet.
- Open-mic acoustics and end-to-end voice timing are untested.
- User requested muted tests: keep LG volume at 0. Audible soundbar effects require a later explicit change to that instruction.
- Cloud-delivered commands may act after acceptance. The coordinator suppresses later steps of interrupted sequences; it cannot revoke a command already delivered to vendor infrastructure.
- Receiver reconnection is bounded; revoked auth requires a new TV code.
- No root, firmware change, on-TV HUD or video recording has been performed.
- Local trace timestamps cover intent/search/command/observed state. Physical first-picture/audio timings require observer entries in the run log.

Continue with source transitions, first-play delay diagnosis, cold-app/full-controller restart checks and actual speech before adding demo polish.

# Implementation status

September 30 automatic ambient update: the paired-controller launcher is implemented and enabled for the live Home-idle test. It requires LG’s actual `Screen Saver` signal after fresh Home observation, not elapsed time on Home. Two natural Home → Screen Saver → Room Ambient entries are recorded after about ten minutes each, and the owner confirms the app opened automatically and remained visible. The owner reports several hours of uninterrupted photos with the saved guard enabled. See [automatic activation](ambient-screensaver.md#automatic-activation) for setup, safeguards and acceptance.

Updated September 30, 2026. This ledger distinguishes code, local evidence and physical-device evidence. Earlier dated entries below are historical observations, not current instructions to pause for every manual test.

The current objective includes a polished filmed demo, ongoing personal use of Room Ambient, and a reproducible open-source preview for technical owners. [The roadmap](roadmap.md) owns current priorities and release gates; this document records evidence. Automatic activation is required scope; manual setup is acceptable. The six existing controller journeys are joined by a required ambient journey documented in [the demo session](demo-session.md), not yet implemented in the controller. [Ambient scope and acceptance](ambient-screensaver.md#scope-and-acceptance) owns the requirements.

## Portless development URL: September 30

`pnpm dev` and `pnpm dev:stable` now wrap the controller with pinned `portless@0.15.6`. The default URL is `https://smart-tv-for-real-tho.localhost`; use the printed URL for custom proxy ports/worktrees. The backend respects injected `PORT` and allows the exact configured `PORTLESS_URL` origin/host alongside its direct loopback addresses. Vite’s WebSocket transport shares the backend HTTP server. TV LAN feed and Xbox OAuth callback addresses are unchanged.

Verification: 85 TypeScript and 24 Python tests, lint/format/types and production builds pass. Chrome rendered the controller and ambient images over trusted HTTPS; Vite reported connected, with no app console warnings/errors. HTTP checks covered the controller, both labs, a valid-origin request reaching the router, and rejection of foreign/missing POST origins and an unexpected Host. No TV mutation or voice/audio test was performed for this change.

The old Terminal-launched controller connected to LG and Xbox. A temporary Codex-launched Portless server reached Xbox but failed LG startup, reproducing the existing process-specific LAN limitation. Computer Use cannot control Terminal. That temporary server was stopped after browser validation. The owner then started `pnpm dev` in the working Terminal; LG and Xbox both reconnected. The TV feed was initially disabled because its LAN bind address was not saved in `.env`. Saved the Mac’s current TV-facing IPv4 and feed port in ignored `.env`, used `pnpm dev:restart`, and verified LG/Xbox startup plus `displayEnabled: true`. Future backend edits retain automatic watcher restarts. Browser-local notes/preferences remain associated with the old origin; server-side saved setup is unchanged.

### Visual lab and navigation follow-up

The first Portless pass checked the HUD route’s HTTP response but missed its visible controls: both clients only recognized literal localhost/127.0.0.1, so the named origin showed the native standby panel. Preview detection now recognizes named `.localhost` hosts and worktrees in one place; the React renderer follows that decision. The display CSP permits same-origin HTTPS requests for live preview and appearance saving. A regression exercises direct/named/worktree previews, preview dismissal, and exclusion of native/public lookalike URLs.

Removed decorative arrows from links and made internal controller/lab navigation stay in the same tab. External Microsoft authentication and library reference links retain their separate-tab behavior. Browser verification covers all four themes, nine patterns, state selection, live controller preview over HTTPS, and controller → ambient → controller → visual-lab navigation in one tab. Six display-client regressions, lint/types, formatting and production builds pass. No native app installation is needed for this browser-preview correction.

## Current assistant visual milestone

The owner selected Ember Thinking Orbs + restrained Voice Glow, keeping the original cool cyan backgrounds/surfaces and using warm orange for the orb, glow and accents. Approved orb settings remain unchanged. Ember is the shared default and is already saved in local TV appearance settings. The glow now uses a matching warm palette and a more visible edge treatment at the existing 0.3 strength.

The lab now plays a short recorded request/thinking/reply sequence and local audio files, measuring actual samples for both visuals. Local clips remain in the browser; their reply is explicitly prerecorded. Same-page live voice reuses the controller’s Voice client with connect/cancel/disconnect and pointer/keyboard push-to-talk. Chrome verified sample and file playback, real WebRTC connection, quick keyboard release without submitting an empty utterance, and disconnect. No room-control request or TV installation was performed. Native animation performance, the final TV appearance and a spoken end-to-end request from this page still need physical acceptance. See [visual lab](visual-lab.md) and [the next demo session](demo-session.md).

Validation: 90 TypeScript tests, 24 Python tests, formatting, lint, typecheck and production builds passed. New regressions cover measured playback levels, phase transitions after actual clip completion, stopping during decode/playback/thinking, and rejecting long clips before playback.

## Latest ambient milestone: September 30

- Room Ambient 0.0.8 is installed. Saved guard preferences, controller preservation, bounded re-registration recovery and session diagnostics are implemented. The automatic-launch change passes 82 TypeScript and 24 Python tests plus format/lint/types.
- The user confirmed the guard is checked after the no-override reopen, hid controls with Back once, and subsequently reported several hours of advancing photos without the clock. Duration is estimated; the exact stock timeout and veto count were not recorded.
- Automatic activation from LG Home is **implemented, with positive physical confirmation of automatic entry**. The paired-controller watcher uses LG's actual `Screen Saver` state after observing Home. Live reads record Home → Active/Screen Saver Ready → Screen Saver after about ten minutes. Two automatic launches are accepted and followed by Room Ambient foreground within about six seconds of LG’s idle signal. At 08:39:27 Asia/Bangkok, the latest run is still observed active after about 30 minutes. The owner did not watch for a brief stock-clock flash. Three separately watched runs, deliberate dismissal and standby recovery remain open. No TV package update or native provider registration is involved.

The following demo-build table reflects the September 29 milestone; the ambient record above and linked owning documents contain newer results.

| Area | Current result | Remaining batch check |
| --- | --- | --- |
| Device control | LG/Xbox pairing, Hades, native YouTube, search/correction, voice, seeking; 13 active tools with conditional ad skip | Three complete transitions, cold-start reliability, new YouTube settings |
| Voice | Actual spoken search/playback and concise response style user-confirmed | Contextual interruption, two unfamiliar songs, two rehearsals, optional acoustics |
| Native HUD baseline | User-confirmed picture coexistence over YouTube/Xbox, clean Hide, smooth text updates, Back/focus recovery on LG Home, explicit post-switch relaunch | Animated version, automatic source restoration, sustained performance |
| Animated HUD 0.0.3 | CSS/SVG cyan/amber HUD, full/subtle/static modes, actual voice/tool signals, local visual lab, package built | Install on reachable TV, then batch-check native rendering |
| Rehearsal | Six complete journeys, browser-persisted notes, downloadable results with recent traces, one-click muted demo start | One room session and an uncut recording |
| Local verification | 55 TypeScript + 20 Python tests, format/lint/typecheck, browser build and TV package pass; browser layout and state preview inspected | Remaining real-device results deliberately deferred |

## Historical initial checks: September 28

- pnpm test: 43 TypeScript tests (including display-feed/client, coordinator/observation/overlay, YouTube close/reopen and voice interruption/lifecycle regressions) and 14 Python bridge regression tests, plus lint/format/typecheck.
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
- At this initial check, the updated Xbox feedback passed locally but awaited a controller restart. That restart and live feedback verification were subsequently completed below. Backend watch/restart support now preserves the working Terminal environment; see [the runbook](runbook.md#development-server-reloads).

## Historical bounded reliability run: September 28

Batch `warm-reliability-1790540161907` stopped on the first failed step, so runs 2 and 3 were not attempted. Initial state was LG Home, volume 0. Xbox HDMI was observed in 440 ms; native YouTube A in 8,768 ms, replacement B in 7,063 ms, pause in 12,997 ms and resume in 10,226 ms. Return-to-Xbox timed out at 20,007 ms while awaiting pause confirmation. A subsequent read reported native YouTube still foreground, B Paused, volume 0. No blind retry or source switch followed. This fails P3 and supplies no physical latency measurement.

At that check, the original controller had not loaded the revised Xbox feedback and Developer Mode was absent. Subsequent entries record the restart, feedback verification, Developer Mode pairing, spoken playback and physical overlay coexistence. The failed batch remains useful latency evidence; it is not a current setup blocker.

## Integration decisions

Use one long-lived Python process over JSON lines, leaving sequencing, search, candidate validation and voice in TypeScript. The researched clients have the required library interfaces; no protocol port is needed. A Node-only LG alternative, [lgtv2](https://github.com/hobbyquaker/lgtv2), supports typed request/subscription control and secure webOS connections. Keeping LG beside the already-selected Python YouTube/Xbox clients avoids another device runtime interface; it is not a claim that TypeScript LG support is unavailable. aiowebostv 0.10.0, pyytlounge 3.4.0 and python-xbox 0.3.0 are locked locally. LG pairing, catalogs and state reads are now hardware-tested on this TV. Native YouTube replacement/pause/resume have user-confirmed physical results. Xbox account discovery and Hades activation now have live evidence; see the command/title distinction below.

The YouTube library's wrapper.store_auth_state() uses a different shape from load_auth_state() in 3.4.0. The bridge persists auth.serialize(), and a round-trip regression test covers that choice. No dependency source was patched.

Xbox commands now inspect the matching cloud operation after acceptance, rejecting reported console-side failures. A completed launch plus observed Xbox HDMI with a blank foreground title returns **accepted**, with an explicit message that title verification is unavailable; it never fabricates an active title or upgrades that case to observed. Where a title is available, it must still match the installed product catalog. A contradictory title, pending operation, stale/disconnected state or failed source switch cannot use this fallback. Home commands remain accepted-only until the person in the room verifies their visible result.

Playback-state-only events do not carry video identity. The bridge requests a correlated now-playing event instead of making an old video ID appear fresh. Video completion also requires the chosen receiver and foreground native app.

## Reliability boundaries

- Actual LG pairing, discovery and state reads pass; no complete P1–P5 journey gate has passed yet.
- Open-mic acoustics and end-to-end voice timing are untested.
- User requested muted tests: keep LG volume at 0. Audible soundbar effects require a later explicit change to that instruction.
- Cloud-delivered commands may act after acceptance. The coordinator suppresses later steps of interrupted sequences; it cannot revoke a command already delivered to vendor infrastructure.
- Receiver reconnection is bounded; revoked auth requires a new TV code.
- Static on-TV overlay over Xbox HDMI and native YouTube is physically confirmed; YouTube briefly glitches/shows a spinner at launch. No root, firmware change or video recording has been performed.
- Local trace timestamps cover intent/search/command/observed state. Physical first-picture/audio timings require observer entries in the run log.

Current work combines final visual selection with source-transition, cold-start and recovery checks. Follow [the roadmap](roadmap.md); earlier failures do not invalidate later physical successes, and individual successes do not establish a repeatable full-session pass.

## Developer setup and first physical overlay result

The user restarted the controller; a subsequent check found the replacement server (PID 93467), with TV and Xbox connections restored. Live verification of the revised Xbox feedback remains pending. LG Developer sign-in succeeded in Chrome Incognito. The user enabled Developer Mode/Key Server and verified model/SDK/firmware through the paired CLI in their Terminal. Codex-launched CLI access still fails with EHOSTUNREACH. The user installed/launched the static probe and explicitly confirmed “Your room. Your software.” appeared over Xbox with its picture visible behind the panel. This is physical HDMI transparency evidence, not a complete V1 pass. Dismissal/timeout, YouTube and transitions remain pending.

The user subsequently clarified that they manually dismissed the first Xbox overlay, relaunched it, and observed it dismiss automatically after 60 seconds. This verifies both a manual exit and the timeout on the TV. The manual control used and post-dismissal focus/picture continuity were not separately reported. Native YouTube coexistence remains pending.

The next user-observed test confirmed native LG YouTube video playing beneath the overlay. Launch briefly produced a glitch and spinner, then returned to the YouTube video with the panel visible. Record this as recovered native-app coexistence with a launch interruption, not a seamless or uninterrupted-playback pass. No simultaneous receiver-state trace or audio-continuity test was captured.

Controller-driven Show/Hide overlay probes are now implemented, with before/after room snapshots and shared source-effect sequencing. After the user restarted the server, live launch and active close were accepted (1,266 ms and 152 ms in the bounded retake). Actual foreground snapshots remained Xbox HDMI and volume remained 0; physical visibility of those particular commands was not observed. The earlier close after roughly 66 seconds was inconclusive because the probe could already have auto-dismissed. See the overlay experiment for details.

A separate optional live-activity TV client and token-protected read-only LAN feed are now implemented and packaged. Local tests cover the feed boundary and client lifecycle; all 44 tests and browser build pass. The TV package is not yet installed and actual launch parameters, LAN connectivity and dynamic text remain unverified. This is tool-progress transport, not microphone/listening synchronization or animation. The feed is disabled unless TV_DISPLAY_HOST is supplied at controller startup; the full control API remains localhost-only.

## September 28: live Xbox feedback and another transition sample

After the restart, batch `restart-check-1790551450752` verified volume 0 and ran Hades through the revised coordinator. Xbox reported the matching operation Succeeded, LG reported Xbox HDMI, and the title remained unavailable. The response correctly returned accepted with the title-verification limitation in 6,834 ms. This verifies the loaded live feedback path; the user’s earlier physical Hades confirmation remains separate from this run.

Batch `transition-after-restart-1790551485031` tested the reduced A → B → return-to-Xbox sequence (without separate pause/resume). First run: A observed at 5,935 ms, B at 6,623 ms, and Xbox return at 14,661 ms. The pause command was accepted at 127 ms but matching paused state was not observed until 14,231 ms; the subsequent HDMI change completed quickly. All successful snapshots reported volume 0.

The second run stopped at A’s 20-second timeout. LG launch was accepted at 1,975 ms, native YouTube foreground observed at 2,334 ms, receiver connect accepted at 2,335 ms and play accepted at 2,402 ms. Requested playback was not confirmed before the deadline. No third run or automatic retry followed. This remains a P3 failure, with no physical timing measurement. A later controller instance has the TV activity feed enabled; its state reset must not be interpreted as the earlier receiver’s state at the timeout.

A narrowly targeted close/reopen diagnostic is implemented under Known-video diagnostic and `POST /api/probe/youtube-close`. It only closes the fixed native YouTube app in live mode, requires that app to be foreground, serializes with source commands, and waits for fresh foreground exit after LG accepts the close. It cannot close arbitrary apps. Successful exit is not proof of a TV power cycle or visible playback after reopening. Tests cover unchanged foreground despite acceptance, simulation/non-YouTube rejection, newer-source cancellation and LG command rejection. All 47 tests pass; build passes. The currently running server still returns 404 for this new route, so hardware close/reopen awaits its next restart.

The read-only TV activity feed is now enabled in the running controller. Recent overlay commands were accepted, but their generic trace labels do not distinguish the static probe from the live panel. The user subsequently confirmed “Live controller activity” appears on the TV. This establishes a received authenticated feed frame, but multiple updates within an already-visible panel remain unverified.

## Live panel feedback and dismissal revision

The user physically confirmed the live activity status, then reported a couple-second loading screen and another second or two of blackness before native YouTube renders when opening the panel/app. Dismissal does not show the same glitch. These observations do not establish a weak-chip or OS cause; initial launch cost and in-place updates need separate measurement.

The user also reported Hide live TV panel failing. A close trace failed with WebOsTvResponseTypeError about four seconds after a launch. The revised version 0.0.2 requests self-dismissal through the existing read-only feed, preserving the working local Dismiss behavior and avoiding the rejected SSAP close path for this app. The controller records acceptance only. Hide is idempotent and does not supersede media work; late activity cannot reopen the panel. The timeout is five minutes to cover a short session without repeated launches. All 49 tests, browser build and IPK packaging pass. TV installation/backend restart and physical Hide verification are pending. The static probe remains unchanged.

Batch `display-update-1790551800795` verified volume 0, received live-panel launch acceptance in 294 ms and completed a search-only request in 581 ms without selecting playback. Because the search followed launch immediately, this does not isolate updates after the panel is visibly rendered. No in-place glitch-free update claim is made.

## YouTube connection recovery regression

Source inspection found a reproducible local defect: a failed or timed-out `get_now_playing` status request set `youtube.connected` false, but later successful requests in the same receiver session never restored it. Coordinator playback observations consequently could continue rejecting otherwise fresh matching events. This is a demonstrated code defect, not proof that it caused every measured TV timeout.

The bridge now restores transport-connected status only after an accepted status request while the same receiver and subscription task remain active. Rejected requests and ended subscriptions stay disconnected; a late read from an older subscription cannot overwrite its replacement. Request acceptance does not modify the video ID, playback value or observation timestamp, so playback still requires a fresh correlated event.

The initial reproduction failed before the fix. Three regressions now cover timeout/recovery/rejection without playback freshness changes, subscription ending during a request, and replacement subscription protection. All 39 TypeScript and 13 Python tests pass with format/lint/typecheck. No frontend/package changes were needed. The running server still lacked the close/reopen route at the start of this continuation, so live confirmation of the recovery fix awaits the already-requested server restart. Do not claim the three-run or cold-start gate passed.

## Restart verified; close/reopen and delayed panel-update trial

The user reported installing version 0.0.2 and restarting. The new close/reopen endpoint now validates requests (HTTP 400 for deliberately invalid input, previously 404), the display feed is enabled, and LG/Xbox startup connections succeeded.

Panel batch `display-v002-1790552354018`: volume 0 observed; Show accepted in 271 ms; after an eight-second rendering interval, search-only text update completed in 416 ms; after another eight seconds, Hide accepted in 4 ms through the feed without an LG close error. The following state read reported native YouTube, volume 0. Questions about physical disappearance and whether the text update glitched are pending. API acceptance is not a physical Hide or rendering pass.

Close/reopen batch `cold-reopen-1790552416076`: LG accepted native YouTube close and reported Home in 2,773 ms, then Xbox HDMI in 593 ms. Reopening A timed out at 20,008 ms. Within that attempt, native-app launch was accepted at 2,638 ms, YouTube foreground observed at 5,116 ms, receiver connection accepted at 5,876 ms and play accepted at 5,923 ms. A later read showed native YouTube and volume 0, but a disconnected receiver without a video event. The test stopped; B, pause/resume and return were not attempted.

One explicit receiver reconnect subsequently completed in 743 ms. The next read reported the requested A Playing, with a fresh receiver timestamp and volume 0. No second play command was sent. This supports a bounded reconnection recovery experiment; it does not prove all the delay came from that connection or retroactively pass the original deadline.

The coordinator now attempts at most one receiver reconnect when observation after a delivered play command reports disconnection while native YouTube is freshly foreground. It retains the original operation deadline, cancellation, receiver ID, video ID and freshness requirements. It never resends the play command. Four regressions cover recovery, persistent disconnection, changed receiver and stale data; all 43 TypeScript and 13 Python tests and browser build pass. The new automatic recovery still needs loading and a live close/reopen retest.

Development now uses `tsx watch` for backend TypeScript and explicitly included `bridge/main.py`. A temporary isolated runner verified initial launch, TypeScript-triggered restart, Python-triggered restart and cleanup without touching the TV controller. `pnpm dev:stable` preserves the previous non-watching command for filming. The current user-Terminal process must be restarted once to enter watch mode; future watched code edits can then reload in that same working network environment. No measured hardware test should overlap code edits/restarts.

## Automatic restart verified with real device access

The user restarted into `pnpm dev` watch mode. An agent-triggered timestamp change on `src/server.ts` restarted the listening child from PID 15817 to 17569 without editing its content. After asynchronous startup finished, LG and Xbox both reconnected and a fresh read showed native YouTube, volume 0. An immediate read during startup was empty, so readiness checks must wait for connection boot results.

Added `pnpm dev:restart` to trigger that same watcher without source edits. Running the actual command changed child PID 17569 to 19142; LG/Xbox startup succeeded again and a fresh TV read confirmed connection, native YouTube foreground and volume 0. This resolves repeated manual restarts while the Terminal-launched watcher stays running. It does not start a stopped watcher or restart stable filming mode. The hardware runbook records the operator/agent workflow. Live panel Hide observation, automatic receiver recovery after cold reopen, speech, focus/transitions and filming remain outstanding.

## Bounded receiver recovery and status-rate comparison on hardware

Batch `recovery-gate-1790553071431` confirms the automatic reconnect actually ran during a cold reopen: play was accepted at 5,269 ms, disconnection prompted a receiver reconnect at 7,423 ms, reconnect completed at 7,989 ms, and A was observed Playing at 14,285 ms. No second play command was sent. B, pause and resume were observed in 9,139 / 13,377 / 19,881 ms; return-to-Xbox failed at 20,006 ms awaiting pause. A later read reported B Paused. This is successful cold-app API recovery, not a complete P3 run or physical latency measurement.

Repeated room reads previously requested YouTube status at approximately the coordinator polling rate. The bridge now coalesces those requests to at most once per five seconds, while its event subscription and playback-event correlation remain active. It does not change observation timestamps on reads or relax the 20-second operation deadline. A regression verifies that repeated reads share a request, cached playback stays stale and another request becomes possible after the interval. Existing transient-recovery tests advance the request interval explicitly.

The matched experiment `status-5s-1790553317663` completed one full sequence:

| Step                               | API-observed completion |
| ---------------------------------- | ----------------------- |
| A after explicit app close/reopen  | 13,281 ms               |
| Replacement B                      | 3,215 ms                |
| Pause                              | 8,073 ms                |
| Resume                             | 8,195 ms                |
| Return to Xbox with YouTube Paused | 1,506 ms                |

All successful snapshots reported volume 0. Run 2 stopped at A’s 20,007 ms timeout; a later read reported the previous B Stopped. The first-run comparison is encouraging but is not a causal proof of queueing or a reliability guarantee. P3 still requires three consecutive runs and physical observations.

A subsequent fresh-session-on-launch experiment (`fresh-session-1790553567816`) stopped at the initial cold A timeout, before it could test its intended warm-session replacement branch. It did not establish a benefit and was removed, along with its experiment-specific tests. The lower-rate status reads remain. Final checks pass: 43 TypeScript and 14 Python tests (57 total); the browser build passed during the comparison work. No TV package update is required.

The last post-failure read showed an unavailable LG and a receiver reporting no selected video/Stopped. After code cleanup, automatic reload again restored successful LG and Xbox startup connections. Further playback testing stopped pending a user screen check (YouTube home/profile prompt, video/loading, another input or off). Physical confirmation of feed-driven Hide and in-place text updates also remains unanswered. No hardware success is inferred from those pending observations.

## September 28: spoken playback and concise voice behavior

The user completed the spoken request “Play Virtual Insanity by Jamiroquai” and reported that it worked perfectly on the TV. This confirms one end-to-end spoken search/playback journey, not the remaining correction/rehearsal gates.

At the user’s request, the Realtime prompt now specifies warm, confident routine responses (usually 2–8 words), silent tool execution by default, and no redundant recap after an acknowledgment. Technical tool messages and physical-verification caveats remain developer information. Observed success permits a short completion response; accepted commands receive action wording without invented completion. Actual failures still get a concise, useful error. Tool outcomes, diagnostics, and coordinator verification remain intact. Reconnect voice to load the revised prompt; its spoken style still needs a live retest. Prompt structure follows [official OpenAI voice prompting guidance](https://developers.openai.com/api/docs/guides/voice-prompting).

## September 28: native YouTube seeking

The voice-tool surface previously exposed only pause/resume despite the installed pyytlounge library providing `seek_to(seconds)`. Added `seek_video` with absolute timestamps and signed relative offsets, exposed correlated position/duration from now-playing events, and added a live-panel activity title. Voice maps timestamps to seconds, “start over” to zero, and unspecified forward/back jumps to ten seconds. Seek is restricted to foreground native YouTube, uses a fresh position for relative jumps, clamps to the available duration (one second before the end), and checks same-video/receiver position feedback after the command. Missing/stale position cannot silently become zero. Stream-specific seek restrictions can still reject or time out; no remote-button fallback is implemented.

Validation: 46 TypeScript and 16 Python tests pass along with format/lint/type checks. New cases cover timestamps, forward/backward jumps, restart, clamping, stale-position refusal, acceptance without movement, bridge input validation/rejection, and clearing position on a video change.

Live receiver evidence (volume 0): absolute seek to 90 seconds returned observed at position 92.860 (`98a7c49f-29c4-4e23-934e-21747cc67e6e`); relative +30 returned observed at position 135.486 (`573b956b-a818-484a-98f4-a21aae670509`), both on video `yPwkzdYN4JE`. The preceding attempt to open Virtual Insanity timed out and a different video remained playing; no startup success is claimed. Physical/voice seek confirmation is pending. Reconnect voice to obtain the new tool schema.

## September 29: expanded YouTube agent controls

Added next/previous to `control_video`, plus playback speed, caption language/off, and autoplay tools. Added `skip_video_ad` behind Premium and explicit-enable checks in both the Realtime tool list and coordinator; defaults and the running room confirm Premium=true / enableAdSkip=false. The Python bridge requires fresh eligible-ad feedback before calling skip. No ad was tested or skipped on this Premium account.

Validation: 50 TypeScript and 20 Python tests pass, plus formatting, lint, and type checks. Coverage includes exact bridge routing, input validation/rejection, next/previous simulation, setting acceptance without fabricated observation, foreground restrictions, all Premium/enable combinations, and ad eligibility expiry/consumption. Live behavior of these newly added controls is pending. The user reported the preceding seek feature was working well.

The complete agent surface and sound-control boundaries are in [agent tools](agent-tools.md). Reconnect voice to load the updated schema. No manual server restart is required under the dev watcher.

## September 29: autonomous visual build and batch rehearsal

Implemented the 0.0.3 HUD and complete rehearsal workflow described above. The read-only feed now projects concise presentation state, motion preferences, source labels and selected request titles. Browser voice events are session/sequence checked; old-session events cannot overwrite a new voice connection. The overlay uses local assets only and renders text through textContent. Hide prevents restoration; source restoration is generation checked and serialized without cancelling media. Credentials and raw diagnostic details remain outside the display feed.

A fixed, loopback-only install action was added to reuse the controller's existing LAN environment. Installation failed; a subsequent read-only ares-device system-info request reported a connection timeout, and ordinary LG startup connection also failed. No successful install or physical V2 pass is claimed. The package is ready; the next room session can install and test it in one batch.

The user subsequently confirmed the TV is turned off. Device checks and installation are deferred until it is back on. Continue local work and commit completed milestones regularly.

Local milestone checks: 55 TypeScript and 20 Python tests pass, plus formatting, lint, type checks, the browser build, and TV package build. Added regressions for idle-heartbeat dismissal, actual voice-event projection, and a late SDP response after reconnect. Browser inspection confirmed the preview states and persisted rehearsal notes; the temporary UI note was cleared. No physical-device result was added.

## September 29: Thinking Orbs + Voice Glow and local exploration

Built TV package 0.0.4 using the actual pinned Libraries.dev packages, a shared React/Canvas renderer, and a local visual lab. Nine patterns can follow configurable assistant states or stay pinned; four room presets vary palette/density/motion independently. Glow, size, speed, particles, static motion, synthetic/manual levels and contrasting backdrops are adjustable. Browser-local choices persist; a separate appearance-save action updates the authenticated display feed without launching the TV.

Existing laptop microphone/WebRTC audio now supplies normalized level telemetry. No additional microphone is opened and no audio samples are sent to the display feed. Session ordering, phase gating and short freshness expiry prevent old levels from animating a new session. Native frame polling is 100 ms; local rendering is independent.

Validation: 57 TypeScript and 20 Python tests, formatting/lint/type checks, browser build and TV package build pass. Browser checks covered independent pattern/style/state controls, mapping, persistence, static motion and bright backdrop; no console errors were reported. See [visual lab details](visual-lab.md). TV remains off: no installation, native performance, transparency or actual voice-response claim is added.

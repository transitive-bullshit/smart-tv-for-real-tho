# Native HUD investigation

Target: LG 86UA8450PSA, webOS 25, firmware 33.31.61. The static probe builds locally, and developer pairing is verified from the user’s Terminal. The user has now confirmed the installed overlay panel is visible over Xbox HDMI with the Xbox picture visible behind it. The user also confirmed manual dismissal and automatic dismissal after 60 seconds. The user also confirmed native YouTube video playing behind the panel after a brief launch glitch/spinner. Focus recovery and transition checks remain pending; launch is not visually seamless.

## Source evidence

The [homebrew metadata reference](https://www.webosbrew.org/pages/appinfojson) describes defaultWindowType=overlay, a transparent page background, and closure when opening Home. This is a compatibility lead, not a supported general LG API contract.

The [webos-ssh-client example](https://github.com/sh00bx/webos-ssh-client) reports an LG G4 on webOS 25. Its README distinguishes the TV-side web frontend from root helpers used for screen capture/local shells, describes installation on rooted TVs, and points to Developer Mode build instructions. That does not establish which overlay behavior is available without root on this UA-series model.

LG's [official app metadata](https://webostv.developer.lge.com/develop/references/appinfo-json) documents a web app and transparency settings; it does not establish that an arbitrary app can persist above YouTube and HDMI.

## Smallest test after the control gate

1. Enable LG Developer Mode using the official workflow; pair the developer connection on this exact TV.
2. Package only a static transparent web page and one dismissible text rectangle. Try the documented homebrew overlay metadata without privileged services.
3. Launch above native YouTube and direct Xbox HDMI. Film the physical screen; verify both picture/audio continue and that remote focus/dismissal behave acceptably.
4. Switch source, press Home, and relaunch. Record whether it closes as the homebrew reference predicts and whether restoration satisfies the intended journey.
5. Stop if installation/window type is rejected or privileges beyond Developer Mode are needed. Record the actual error and boundary; no firmware modification is in this spike.
6. Build synchronized animations only if these tests pass. A fullscreen interlude or native toast is a separate fallback, never an overlay pass.

`/display` remains a laptop preview; the installed probe now has separate physical evidence over Xbox HDMI and native YouTube. No purchase, root procedure, capture-card architecture or replacement playback host is assumed.

## Prepared probe and local evidence

`tv/overlay-probe` contains a static HTML label, an original 80×80 PNG icon, dismissal code and app metadata. The manifest requests the experimental overlay window type, transparent background and no Luna API permissions (`requiredACG: []`). The page has no network calls, audio or credentials. Back (461), Escape and the focused OK/click button request `window.close()`; a 60-second timer requests the same exit. The user confirmed manual dismissal (method unspecified) and automatic dismissal after 60 seconds on the TV. Individual Back/OK handling and underlying focus recovery remain unverified. [LG app metadata](https://webostv.developer.lge.com/develop/references/appinfo-json), [Back and exit handling](https://webostv.developer.lge.com/develop/guides/back-button)

Build with `pnpm tv:package`. The pinned official CLI 3.2.6 creates `build/tv/it.transitivebullsh.smarttv.overlayprobe_0.0.1_all.ipk`. Archive inspection confirmed only the four app files plus package metadata. No private files are included. `pnpm tv:preview` serves a local browser preview at `http://127.0.0.1:3211`; this is a layout check only. Chrome verified transparent document/body backgrounds and initial focus on Dismiss. Escape reached the exit handler; Chrome refused the window-close request for this tab, so actual TV closure must be tested. [LG CLI](https://webostv.developer.lge.com/develop/tools/cli-introduction)

## One-time TV preparation

When ready for the TV-side experiment:

1. Install **Developer Mode** from LG Apps and sign into an LG Developer account on the TV.
2. Enable **Dev Mode Status**; LG says the TV will reboot. Recheck volume 0 afterward before any playback tests.
3. Reopen Developer Mode and turn on **Key Server**. Do not use Clear Cache Data.
4. In the project Terminal, run `pnpm tv:cli ares-setup-device`. Add a TV profile named `smart-tv`, address `192.168.1.217`, port `9922`, username `prisoner`, with no password.
5. Run `pnpm tv:cli ares-novacom --device smart-tv --getkey`. Enter the TV's six-character passphrase directly into the prompt; do not put it in chat or Git.
6. Verify with `pnpm tv:cli ares-device --system-info --device smart-tv`.

Keep the Developer Mode session current with Extend. LG removes developer apps after Developer Mode becomes disabled. This setup is separate from the existing LG remote-control pairing. [Official Developer Mode workflow](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app)

## Developer pairing verified

The user enabled Developer Mode and Key Server and successfully ran `ares-device --system-info --device smart-tv` from their Terminal. The TV reported model `86UA8450PSA.CTMFBH`, SDK `10.3.1`, firmware `33.31.61`, board `K25LP_DVB_AJ`, and OTA ID `HE_DTV_W25P_AFADATAA`. The local `smart-tv` CLI profile uses port 9922 and user `prisoner`; credentials stay outside Git.

LG Developer website sign-in succeeded in Chrome Incognito after normal Chrome email/password and Google sign-in attempts stalled without a visible error. The underlying browser-session cause is unproven.

The same paired CLI check launched from Codex still fails with `EHOSTUNREACH`, while the user’s Terminal succeeds. Installation therefore needs the user’s working Terminal environment. The package was rebuilt successfully after pairing. The user then installed/launched the probe from Terminal and confirmed the panel appeared over Xbox with the picture visible behind it. This verifies installation, launch and transparency over HDMI on this TV without root. The user subsequently confirmed manual dismissal on the first run and automatic dismissal after 60 seconds on a repeat run. The user then launched it over a playing video in native LG YouTube and confirmed the video visible/playing behind the overlay after a split-second glitch and spinner. This is recovered coexistence, not evidence of uninterrupted playback or a seamless launch. Xbox game responsiveness, individual dismissal controls, focus recovery and audio continuity remain unverified.

## Install and test after the control gate

Run from the repository root with the configured `smart-tv` profile:

```sh
pnpm tv:package
pnpm tv:cli ares-install --device smart-tv build/tv/it.transitivebullsh.smarttv.overlayprobe_0.0.1_all.ipk
pnpm tv:cli ares-launch --device smart-tv it.transitivebullsh.smarttv.overlayprobe
```

If remote dismissal does not work, terminate only this test app:

```sh
pnpm tv:cli ares-launch --device smart-tv --close it.transitivebullsh.smarttv.overlayprobe
```

The user executed the install/launch workflow and physically confirmed the overlay over Xbox HDMI. The close command remains a prepared fallback. [LG CLI command reference](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)

Record each result in `.local/hardware-runs.md`:

| Condition | Evidence required | Status |
| --- | --- | --- |
| Native YouTube foreground | Physical video continues behind label; receiver remains Playing | User confirmed video playing behind overlay after brief launch glitch/spinner; simultaneous receiver state not captured |
| Xbox HDMI 3 | Xbox picture remains visible behind label | User confirmed panel and background picture; game responsiveness/motion not separately measured |
| Focus | Back/OK dismiss; underlying controls recover | Manual dismissal confirmed; specific control and focus recovery unverified |
| Timeout | Probe closes after 60 seconds and underlying picture remains | User confirmed automatic dismissal after 60 seconds; post-dismissal picture continuity not separately reported |
| Home and relaunch | Record closure, then verify explicit relaunch | Untested |
| Source transitions | Record persistence/closure and any focus or picture interruption | Untested |
| Soundbar | Audio continuity requires a later explicit change to the mute instruction | Deferred |

Persistent black/full-screen replacement, suspended YouTube, installation rejection, or missing permissions is a failed coexistence test. The observed brief YouTube launch glitch/spinner must remain a recorded limitation; recovered coexistence does not establish uninterrupted playback. Record the result before considering a different architecture. A browser preview and successful package build are never a native-overlay pass.

## Controller-driven overlay probes

After restarting `pnpm dev`, use **Room → TV overlay experiment → Show TV overlay / Hide TV overlay**. These buttons call the loopback-only `POST /api/probe/overlay` endpoint with an allowlisted `launch` or `close` action. This endpoint targets only `it.transitivebullsh.smarttv.overlayprobe`; a separate display endpoint targets the fixed live-activity app. Neither installs packages or accepts arbitrary app IDs. It refreshes the app catalog before launch and reports a missing installation clearly.

The coordinator cancels older media work and serializes overlay effects with source changes. The result remains `accepted`, with actual before/after room snapshots for investigating LG foreground reporting. No remembered underlying app is substituted for the TV’s report. Volume is unchanged. Simulation rejects this hardware probe.

Local verification: three coordinator tests cover acceptance-only semantics, simulation/disconnection boundaries and a late overlay launch followed by a newer Home command; a Python regression covers the fixed target, installation prerequisite and rejected actions/results. Full checks/build pass. The browser renders the controls. After the user restarted the controller, live SSAP launch and close both returned accepted. In the bounded retake, launch completed in 1,266 ms and close in 152 ms, with close requested about 1.3 seconds after launch completed. Before/after and intervening foreground reads reported Xbox HDMI; volume remained 0. These are API observations, not visual confirmation of these particular launches. An earlier close after roughly 66 seconds failed after the automatic timeout could already have closed the app; it does not establish an active-close failure. Raw results are in ignored `.local/hardware-probes.jsonl`. The earlier user-confirmed visible overlays used the developer CLI.

## Live-activity client: feed and revised dismissal physically confirmed

`tv/display` is a separate installable app, `it.transitivebullsh.smarttv.display`, preserving the static compatibility probe. It projects generic controller tool progress and distinguishes an accepted command from observed device state. Search completion explicitly says nothing has played yet. It does not yet show microphone/listening state or synchronized animation.

The optional listener binds only the configured private laptop address on port 3212. It exposes a single read-only route, `/display/state`, requiring a random per-process bearer token. The full control API remains on localhost. Launch passes the display URL/token directly to the installed app; credentials are not packaged or returned to the controller browser. The feed contains selected generic status strings, not room credentials or raw errors. This spike uses plain HTTP on the local network; its token is not transport-encrypted.

The TV client polls at 500 ms after each completed request, uses bounded timeouts and marks disconnection explicitly. Relaunch supersedes older responses; dismissal aborts polling. Version 0.0.2 uses Back/OK and a five-minute timeout to request closure. The separate static probe retains its verified 60-second timeout. LG documents launch/relaunch events and launch parameters; the user has now confirmed “Live controller activity” appears on the actual TV, establishing launch-parameter delivery and an authenticated feed response for version 0.0.1. [LG events](https://webostv.developer.lge.com/develop/references/webos-event), [LG launch parameters](https://webostv.developer.lge.com/develop/references/webostvjs-webosdev)

### First installation and connection

Use the user's working Terminal in the repository root:

```sh
pnpm tv:package-display
pnpm tv:cli ares-install --device smart-tv build/tv/it.transitivebullsh.smarttv.display_0.0.2_all.ipk
```

Stop the current dev server with Ctrl+C in its Terminal, then start it with the read-only feed enabled:

```sh
TV_DISPLAY_HOST=192.168.1.191 pnpm dev
```

That laptop address was rechecked on September 28; replace it if Wi-Fi assigns another address. The TV remains `192.168.1.217`. Alternatively save `TV_DISPLAY_HOST` in ignored `.env`. No new service account or API key is needed.

At `http://localhost:3210`, use **Room → TV overlay experiment → Show live TV panel**. A connected panel should show “Waiting for a request” and “Live controller activity.” A harmless repeat of setting volume to 0 can exercise the status update. Keep the TV silent. Use **Hide live TV panel** before switching sources during this initial check. Record actual screen results; accepted launch does not prove feed connectivity. Do not launch both probe apps together.

Local validation: all 39 TypeScript and 10 Python tests pass, including token/read-only boundaries, stale-response suppression, feed dismissal and fixed display launch parameters. Browser build and display IPK packaging pass. The user confirmed the version 0.0.1 panel connects and displays “Live controller activity.” Multiple visible text changes within an already-open panel remain unverified. V1 focus/Home/source-transition checks still gate animation.

### Launch interruption and Hide failure

The user reports a noticeable loading screen of a couple of seconds when opening the panel/native app, followed by another second or two of blackness before YouTube renders. Dismissing the overlay does not produce a similar glitch. These are qualitative physical observations, not measured video timings. They support investigating launch cost separately from text updates; CPU limits or an OS optimization problem have not been established as the cause.

The user reported an error from Hide live TV panel. The controller logged an LG `WebOsTvResponseTypeError` on a close approximately four seconds after a launch, which cannot be explained solely by the 60-second expiry. The generic pairing advice in that exception does not establish broken pairing: other LG commands continued working. The exact LG rejection reason is unavailable in the sanitized trace.

Version 0.0.2 changes only the live panel's Hide path to publish `dismiss: true` on its existing authenticated feed. The app calls its own existing dismissal handler on receipt. Hide is idempotent in controller state and does not cancel playback work. A later tool event cannot clear the dismissal request; only an explicit Show does. The API reports request acceptance, not physically observed closure. This requires both the rebuilt TV package and a backend restart; version 0.0.1 ignores the new field. The static probe retains its separate SSAP close experiment.

The live panel timeout is now five minutes so a two-to-three-minute take can avoid repeated launches. This does not prove seamless text updates or remove the initial startup interruption. Keep testing those separately after installation. The new Hide path is now physically confirmed below; the five-minute timeout remains locally tested but not physically timed.

### Supervised LG Home check — September 28

The user returned from the LG screensaver to Home. The controller reconnected to the paired TV and observed LG Home with volume 0 through external ARC. Live-panel launch was accepted; the user saw live activity showing “adjusting volume,” with a brief loading screen before the panel appeared. The subsequent feed-based Hide was accepted and the user confirmed that the panel disappeared while LG Home stayed visible, with no loading screen or black flash. This physically verifies the revised Hide path on LG Home.

The user accepts the launch interruption for this spike. Its underlying graphics/compositor cause is unverified; deeper OS integration is a hypothesis, not a demonstrated requirement. Multiple in-place text updates, remote focus recovery, and source transitions remain separate checks.

### Supervised in-place update — September 28

After the TV returned to its screensaver, the controller sent Home and explicitly reopened the live panel. With the user watching, search-only `find_youtube_video` for Jamiroquai / Cosmic Girl completed (request `865b84db-8a4c-4b5d-902d-5f73fb4d29b3`). The user confirmed that the panel changed to “Search results ready” without a loading screen, black flash, or disappearance. No playback was requested; the preceding TV snapshot reported volume 0. This verifies one in-place search-result update over LG Home, separately from the accepted launch interruption. Remote focus recovery and updates over native YouTube/Xbox remain unverified.

### Supervised remote focus recovery — September 28

The user pressed Back on the LG remote to dismiss the live panel, then Left/Right on LG Home. They confirmed the panel closed and Home navigation worked immediately. This verifies Back dismissal and focus recovery on LG Home; OK dismissal and recovery over YouTube/Xbox remain separate checks.

### Supervised live panel over native YouTube — September 28

The user confirmed the requested Cosmic Girl video visibly started after controller playback request `cc2ccdfa-5e18-46c6-96b1-364bc4ecd282`. Later live-panel launch `33e2f788-98dd-4739-84dd-077dba94989b` was accepted over native YouTube. At that point the receiver reported a different video (`nyDvaivsBrg`); continuity of the originally requested video is not claimed. The TV reported volume 9, so the controller restored and observed volume 0 with request `634183b2-eb05-4849-897c-db84d77b7237`.

The user confirmed about one second of loading when the panel opened, followed by the live overlay visibly above the YouTube player while video continued playing behind it. A subsequent receiver observation also reported Playing. This verifies recovered live-panel coexistence with native YouTube; it does not establish uninterrupted playback during launch. In-place updates over playing YouTube and source transitions remain separate checks.

### Supervised in-place update over YouTube — September 28

Search-only request `028ff804-ebeb-4035-b8fe-1eea50441dc0` for Jamiroquai / Virtual Insanity updated the already-open panel. The user confirmed “Search results ready” appeared while YouTube kept playing smoothly, with no additional loading screen or black flash. No replacement playback was requested. This verifies in-place text updates over playing native YouTube.

### Supervised YouTube-to-Xbox transition — September 28

With the live panel open over YouTube, `return_to_xbox` request `d6ba1932-262c-407c-834f-82c5a38e1ab4` observed YouTube Paused and HDMI 3 selected in about 5.8 seconds, with TV volume 0. The user confirmed the picture switched to Xbox and the overlay was hidden during the switch. The live panel therefore did not remain visibly persistent across this transition. Whether it was closed or merely hidden is not established. Explicit relaunch on the destination is the next check; automatic relaunch is not yet implemented or verified here.

### Supervised live-panel relaunch over Xbox — September 28

After the source transition hid the panel, explicit launch `c1f8f4d0-3375-40d9-8d10-983452d5789f` was accepted with HDMI 3 foreground and volume 0. The user confirmed the live panel looked good on top of Xbox. This verifies explicit destination relaunch after a YouTube-to-Xbox switch; automatic relaunch remains unimplemented/unverified.

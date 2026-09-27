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

## Optional live-activity client: prepared, not TV-verified

`tv/display` is a separate installable app, `it.transitivebullsh.smarttv.display`, preserving the static compatibility probe. It projects generic controller tool progress and distinguishes an accepted command from observed device state. Search completion explicitly says nothing has played yet. It does not yet show microphone/listening state or synchronized animation.

The optional listener binds only the configured private laptop address on port 3212. It exposes a single read-only route, `/display/state`, requiring a random per-process bearer token. The full control API remains on localhost. Launch passes the display URL/token directly to the installed app; credentials are not packaged or returned to the controller browser. The feed contains selected generic status strings, not room credentials or raw errors. This spike uses plain HTTP on the local network; its token is not transport-encrypted.

The TV client polls at 500 ms after each completed request, uses bounded timeouts and marks disconnection explicitly. Relaunch supersedes older responses; dismissal aborts polling. Back/OK and a 60-second timeout request closure. LG documents launch/relaunch events and launch parameters; actual delivery and networking for this app on this TV remain unverified. [LG events](https://webostv.developer.lge.com/develop/references/webos-event), [LG launch parameters](https://webostv.developer.lge.com/develop/references/webostvjs-webosdev)

### First installation and connection

Use the user's working Terminal in the repository root:

```sh
pnpm tv:package-display
pnpm tv:cli ares-install --device smart-tv build/tv/it.transitivebullsh.smarttv.display_0.0.1_all.ipk
```

Stop the current dev server with Ctrl+C in its Terminal, then start it with the read-only feed enabled:

```sh
TV_DISPLAY_HOST=192.168.1.191 pnpm dev
```

That laptop address was rechecked on September 28; replace it if Wi-Fi assigns another address. The TV remains `192.168.1.217`. Alternatively save `TV_DISPLAY_HOST` in ignored `.env`. No new service account or API key is needed.

At `http://localhost:3210`, use **Room → TV overlay experiment → Show live TV panel**. A connected panel should show “Waiting for a request” and “Live controller activity.” A harmless repeat of setting volume to 0 can exercise the status update. Keep the TV silent. Use **Hide live TV panel** before switching sources during this initial check. Record actual screen results; accepted launch does not prove feed connectivity. Do not launch both probe apps together.

Local validation: all 35 TypeScript and 9 Python tests pass, including token/read-only boundaries, stale-response suppression and fixed display launch parameters. Browser build and display IPK packaging pass. No live installation, TV-to-laptop fetch, launch-parameter receipt or physical dynamic text update has been verified yet. V1 focus/Home/source-transition checks still gate animation.

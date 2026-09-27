# Native HUD investigation

Target: LG 86UA8450PSA, webOS 25, firmware 33.31.61. The static probe builds locally. No TV package has been installed and no overlay gate has passed.

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

Until this test, /display is only a laptop preview. No purchase, root procedure, capture-card architecture or replacement playback host is assumed.

## Prepared probe and local evidence

`tv/overlay-probe` contains a static HTML label, an original 80×80 PNG icon, dismissal code and app metadata. The manifest requests the experimental overlay window type, transparent background and no Luna API permissions (`requiredACG: []`). The page has no network calls, audio or credentials. Back (461), Escape and the focused OK/click button request `window.close()`; a 60-second timer requests the same exit. Remote focus, dismissal and timeout on the TV are still unverified. [LG app metadata](https://webostv.developer.lge.com/develop/references/appinfo-json), [Back and exit handling](https://webostv.developer.lge.com/develop/guides/back-button)

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

These commands are prepared, not yet executed against the TV. [LG CLI command reference](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)

Record each result in `.local/hardware-runs.md`:

| Condition | Evidence required | Status |
| --- | --- | --- |
| Native YouTube foreground | Physical video continues behind label; receiver remains Playing | Untested |
| Xbox HDMI 3, normal game mode | Physical game picture continues behind label | Untested |
| Focus | Back/OK dismiss; underlying controls recover | Untested |
| Timeout | Probe closes after 60 seconds and underlying picture remains | Untested |
| Home and relaunch | Record closure, then verify explicit relaunch | Untested |
| Source transitions | Record persistence/closure and any focus or picture interruption | Untested |
| Soundbar | Audio continuity requires a later explicit change to the mute instruction | Deferred |

Black/full-screen replacement, suspended YouTube, installation rejection, or missing permissions is a failed coexistence test. Record the result before considering a different architecture. A browser preview and successful package build are never a native-overlay pass.

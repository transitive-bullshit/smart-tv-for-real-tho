# Native HUD investigation

Target: LG 86UA8450PSA, webOS 25, firmware 33.31.61. No TV package has been installed and no overlay gate has passed.

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

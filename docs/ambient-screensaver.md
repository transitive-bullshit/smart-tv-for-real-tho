# Room Ambient: custom screensaver spike

September 29, 2026. Target: LG 86UA8450PSA / webOS 25 (SDK 10.3.1), firmware 33.31.61. **Implemented and prepared locally; physical TV verification is pending.** The existing assistant overlay remains a separate app.

## Feasibility and the useful boundary

We can own the full-screen ambient experience in a normal Developer Mode app: show our images, choose framing, animate them, and open/close it from the controller. This does **not** register our app as LG's automatic, TV-wide idle screensaver. In April 2026, LG staff answered that exact request by saying a custom screensaver API is not currently planned. [LG custom screensaver discussion](https://forum.webostv.developer.lge.com/t/how-can-i-create-a-custom-screen-saver-app/28169)

| Approach | What it gives us | Evidence / remaining question |
| --- | --- | --- |
| Foreground image app | Full visual control, original photos, adjustable focal points and timing | Ordinary web rendering; local prototype works. TV performance and native idle interruption remain to test. |
| Private foreground guard | Requests that LG leave our visible image app alone when its idle timer fires | Two open-source implementations; exact TV permissions/effectiveness unknown. Optional probe, off by default. |
| Real full-screen video | The same photo motion, encoded into a silent looping film | LG documents this as exempt from its screensaver. Decoder behavior, loop gap and long-run behavior need hardware verification. |
| Remote shortcut | One-button entry into our app | LG documents Quick Access; verify registration for this sideloaded app and remote. |
| Global automatic replacement | Own what starts after inactivity in Home, YouTube or Xbox | No public provider-registration or global idle API. Outside this prototype. |
| Root / system modification | Potential replacement of the actual screensaver | Existing homebrew requires root; not assessed as compatible with this firmware and not implemented. |

LG says changing images/layouts does not exempt a non-video app from its idle screensaver. CSS animation is therefore not a keep-awake mechanism. [LG staff, February 2026](https://forum.webostv.developer.lge.com/t/request-for-guidance-to-prevent-app-from-entering-idle-screen-saver-mode-on-webos/28089)

The public exception is actual full-screen video. OLED-only Type 2/3 settings are not custom providers; even Type 3 only extends inactivity to 30 minutes. We do not set those flags on this direct-backlit model. [Screensaver guide](https://webostv.developer.lge.com/develop/guides/screensaver), [exact model specifications](https://www.lg.com/my/tv-soundbars/uhd-4k-tvs/86ua8450psa/)

LG requires the video area to cover the viewport from `(0,0)` without border, offset, transform or opacity effects. Our pan/zoom and crossfades are **inside the encoded frames**; the single video element stays opaque and untransformed. The film contains no audio track. [LG FAQ, full-screen video](https://webostv.developer.lge.com/faq)

LG also says there is no screensaver-event API. `visibilitychange` is useful for suspending our app and releasing subscriptions; it does not prove why the app became hidden and cannot measure TV-wide inactivity. We do not infer room inactivity from an idle voice session. [LG screensaver detection discussion](https://forum.webostv.developer.lge.com/t/screensaver-detection/28202)

## What is built

Open [the ambient lab](http://localhost:3210/ambient/?preview=1), or use **Open ambient lab** on the controller.

- Two bundled user-supplied originals: `starship.jpeg` and `ethereal-desk.jpg`. No remote image service, vision API, or network connection is needed for playback in the installed app.
- Cover framing with no exposed edges; default 8% zoom and soft 3-second dissolves. A new scene starts every 30 seconds after the initial scene. Motion continues through each dissolve.
- Hand-selected focal points: rocket `(0.49, 0.45)`, person/desk `(0.513, 0.855)`. Coordinates are fractions of the original image. This is curated focus, not a claimed automatic focal-point detector.
- The focal point stays in the same relative screen position as the image gently enlarges around it. The person stays visible near the bottom while the huge structure retains its scale; we do not dramatically zoom or move the person to the center.
- Local controls for image, timing, zoom, focus X/Y, focus marker, progress scrubbing, pause, previous/next, and clean full-screen view. Live adjustments apply to that app instance only and reset on reload. They do not change the packaged film or an already-running TV app.
- A separate 60-second H.264 / yuv420p / 1920×1080 / 30 fps film with the default moves baked in. It crosses from the second scene back into the first before looping; the final/initial image positions match closely. A native decoder restart gap is still possible and must be checked on TV.
- Image mode honors `prefers-reduced-motion` with still frames/direct cuts. The optional film retains its baked-in motion; choose images for a still experience.
- A normal, opaque, foreground webOS app: `it.transitivebullsh.smarttv.ambient`, version `0.0.1`. There are no system file edits, root dependencies, background services or automatic entry rules.
- Controller buttons for a fixed package install, image launch, film launch, and close. Launch sets room volume to zero, pauses connected foreground YouTube, hides/disables automatic restoration of the assistant panel, then opens Room Ambient. It does not promise to pause an Xbox game.
- Back exits through the webOS platform navigation hook. Home is OS-controlled. OK reveals the controls; left/right switch scenes when controls are hidden. Browser shortcuts: H toggles controls, Space pauses, arrows switch scenes. Hardware key routing and the exact destination after Back remain pending.

The TV assets use a small standalone TypeScript/CSS client, separate from the React controller. The image engine only animates transforms and opacity; at most two photos are composited. The film uses one real video element. We chose 1080p as the initial decode/render baseline; LG's UI resolution and its UHD video plane are distinct, so 4K video is a possible later refinement rather than a prerequisite. [LG app resolution](https://webostv.developer.lge.com/develop/specifications/app-resolution)

## Private hook probe

This experiment is off by default. Enable **Try private idle guard with the slideshow** before controller launch, or the equivalent checkbox inside the app's diagnostics.

The code holds a `PalmServiceBridge` subscription to:

```text
luna://com.webos.service.tvpower/power/registerScreenSaverRequest
{ clientName: "it.transitivebullsh.smarttv.ambient", subscribe: true }
```

For a timestamped request, it sends `responseScreenSaverRequest` with the same name/timestamp and `ack:false`. We record registration, rejection, timeout, and acknowledgments separately. A registration response or acknowledgment alone does not prove that the picture remained visible. The bridge is canceled on hiding, leaving, disabling the checkbox, or switching to video. There is no background veto loop and no permission escalation if access is refused.

The author of webos-tv-kit says `ares-install` supplies the app's Luna registration; its manual/root installation path requires separate bus files. That is community implementation evidence, not an LG guarantee. We deliberately test the normal Developer Mode package first. [webos-tv-kit README](https://github.com/CheerChen/webos-tv-kit), [guard implementation](https://github.com/CheerChen/webos-tv-kit/blob/main/js/webos-platform.js), [independent custom-home implementation](https://github.com/zzeppieri/webos-custom-home/blob/main/src/service/luna.ts)

The package declares no public ACG permissions. LG documents ACG enforcement as unavailable on webOS 25; future TV upgrades may change private-hook access. No undocumented permission names are guessed to force access. [LG ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide)

Actual system replacement is a different technique. `webosbrew/custom-screensaver` explicitly requires root and bind-mounts over LG's QML screensaver. Its existence does not establish compatibility with webOS 25 or this firmware. [Project](https://github.com/webosbrew/custom-screensaver), [mount script](https://github.com/webosbrew/custom-screensaver/blob/main/assets/apply.sh)

## Rebuild and package

```sh
pnpm build:ambient
pnpm ambient:render
pnpm tv:package-ambient
```

Film rendering requires `ffmpeg` on PATH, already present on this Mac. The render script uses the shared defaults and focal points, hashes its inputs, and reuses an up-to-date render. To change the film, edit `tv/ambient-src/model.ts` and rerun the package command. The two originals are tracked; generated bundles, MP4 and IPK are ignored and reproducible. No new npm packages or API keys are required.

Package output: `build/tv/it.transitivebullsh.smarttv.ambient_0.0.1_all.ipk`. `pnpm build` builds both clients and the main controller, without requiring ffmpeg in CI. `pnpm dev` builds the static clients at startup; after client edits run `pnpm build:ambient` and reload the preview. Server/bridge edits continue using the existing dev watcher.

Equivalent manual device commands, **for the joint TV session only**:

```sh
pnpm tv:cli ares-install --device smart-tv build/tv/it.transitivebullsh.smarttv.ambient_0.0.1_all.ipk
pnpm tv:cli ares-launch --device smart-tv it.transitivebullsh.smarttv.ambient --params '{"mode":"images","guard":false}'
pnpm tv:cli ares-launch --device smart-tv it.transitivebullsh.smarttv.ambient --params '{"mode":"video","guard":false}'
pnpm tv:cli ares-launch --device smart-tv --close it.transitivebullsh.smarttv.ambient
```

Controller preview assets use an exact file allowlist and support byte ranges for film seeking. Neither arbitrary local files nor generated package installation paths can be supplied by the browser. Device actions remain loopback/origin restricted and share the existing source-command queue, so a newer Home request wins over an older pending launch.

## One shared TV session

No TV commands or installation were run during preparation. Start once the user is watching, with TV awake, Developer Mode session active and laptop on its LAN. Existing Developer Mode pairing should suffice; no additional LG account or service key is needed.

1. **Install once** using the controller's Room Ambient section. **Show slideshow on TV**, guard unchecked. Observe one full two-image cycle: cover edges, smooth motion/dissolve, person/desk in frame, no audio. OK opens diagnostics/controls; Back exits; reopen; Home exits. Record the return destination. The original overlay is not part of this check.
2. **Baseline idle:** reopen images with guard off. Leave it untouched and time any stock screensaver takeover. Stop the initial observation at 10 minutes if none occurs and record “not seen within 10 minutes,” not “disabled.” Note whether visibility diagnostics changed. Allow this passive interval while doing other work; only inspect at its end.
3. **Private guard, if useful:** launch images with guard on. Inspect diagnostics once, then return to clean view and leave it untouched past the baseline timeout plus two minutes (or the same 10-minute observation if no baseline was established). A denied/timed-out guard needs no repeated install or permission work; proceed to film. After leaving the app, check that normal LG idle behavior still returns.
4. **Film path:** launch the film. Check at least two loop boundaries and leave it past the measured baseline timeout plus two minutes (at least 10 minutes if the baseline was unknown). Record any decoder gap, black frame, stock screensaver, dimming or TV power-off separately. The documented video exception is not a promise to disable other power-saving timers. Back/Home must still work.
5. **Optional remote entry:** while our app is open, hold an unused number 1–8 and register it if offered. Hold that number from Home to reopen. Hold 0 to inspect/remove Quick Access assignments; 9 is reserved for Quick Help. If this remote lacks accessible number keys or LG refuses the sideloaded app, skip the shortcut. [LG Quick Access instructions](https://www.lg.com/us/simroom/tvs/user-guide/2024/set-up-quick-access-shortcuts)

Prefer the image engine if the scoped guard proves reliable; otherwise keep the full-screen film as the demo path. Either result gives us a personal ambient screen we can launch on demand. Automatic activation over other apps remains a separately scoped research problem.

| Hardware observation                                 | Result  |
| ---------------------------------------------------- | ------- |
| Image motion, crops and dissolves                    | Pending |
| Back, Home, OK, repeat launch / mode changes         | Pending |
| Baseline stock screensaver timeout                   | Pending |
| Private guard permissions, idle behavior, release    | Pending |
| Film decoding, loop boundary, long-run idle behavior | Pending |
| Quick Access registration                            | Pending |

Local verification completed: 62 TypeScript tests and 21 Python tests pass, including cover bounds/focal visibility, HTTP byte ranges, live-mode gating, mute/pause ordering, newer-source cancellation, fixed app targeting, and private subscription cleanup/rejection. Format, lint, TypeScript and full builds pass. Chrome preview exercised image selection, end framing, focus toggles, missing-native-bridge diagnostics, and actual film playback/seek. ffprobe confirms one silent H.264 video stream, 1920×1080 at 30 fps, exactly 60 seconds (~34 MB). The webOS IPK was built locally. Browser rendering or an API's acceptance is never substituted for the physical observations above.

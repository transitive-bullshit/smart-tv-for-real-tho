# Room Ambient: custom screensaver spike

Updated September 30, 2026. Target: LG 86UA8450PSA / webOS 25 (SDK 10.3.1), firmware 33.31.61. **Room Ambient 0.0.7 moves the 15-scene collection to R2 with bounded prefetching. It is installed and launched on the live TV; fresh API state confirms the app foreground and volume zero. Remote-image playback is browser-verified; physical feedback for this version is pending. The user confirmed all new images look great on the live TV in 0.0.5. The image slideshow, cover framing, transitions, persistent titles, focal-point control and two-step Back navigation are user-verified. The private guard registration responded on the TV; idle suppression remains unverified.** The existing assistant overlay remains a separate app.

## Feasibility and the useful boundary

We can own the full-screen ambient experience in a normal Developer Mode app: show our images, choose framing, animate them, and open/close it from the controller. This does **not** register our app as LG's automatic, TV-wide idle screensaver. In April 2026, LG staff answered that exact request by saying a custom screensaver API is not currently planned. [LG custom screensaver discussion](https://forum.webostv.developer.lge.com/t/how-can-i-create-a-custom-screen-saver-app/28169)

| Approach | What it gives us | Evidence / remaining question |
| --- | --- | --- |
| Foreground image app | Full visual control, original photos, adjustable focal points and timing | User verified images, framing and transitions on this TV. Native idle interruption remains to test. |
| Private foreground guard | Requests that LG leave our visible image app alone when its idle timer fires | Two open-source implementations; exact TV permissions/effectiveness unknown. Optional probe, off by default. |
| Remote shortcut | One-button entry into our app | LG documents Quick Access; verify registration for this sideloaded app and remote. |
| Global automatic replacement | Own what starts after inactivity in Home, YouTube or Xbox | No public provider-registration or global idle API. Outside this prototype. |
| Root / system modification | Potential replacement of the actual screensaver | Existing homebrew requires root; not assessed as compatible with this firmware and not implemented. |

LG says changing images/layouts does not exempt a non-video app from its idle screensaver. CSS animation is therefore not a keep-awake mechanism. [LG staff, February 2026](https://forum.webostv.developer.lge.com/t/request-for-guidance-to-prevent-app-from-entering-idle-screen-saver-mode-on-webos/28089)

The public exception is actual full-screen video. OLED-only Type 2/3 settings are not custom providers; even Type 3 only extends inactivity to 30 minutes. We do not set those flags on this direct-backlit model. [Screensaver guide](https://webostv.developer.lge.com/develop/guides/screensaver), [exact model specifications](https://www.lg.com/my/tv-soundbars/uhd-4k-tvs/86ua8450psa/)

A full-screen 60-second rendered film was tested and rejected by the user for visual quality. Version 0.0.3 removes the video element, render script, bundled MP4 and film controls. The documented video exception is background research, not our selected implementation.

LG also says there is no screensaver-event API. `visibilitychange` is useful for suspending our app and releasing subscriptions; it does not prove why the app became hidden and cannot measure TV-wide inactivity. We do not infer room inactivity from an idle voice session. [LG screensaver detection discussion](https://forum.webostv.developer.lge.com/t/screensaver-detection/28202)

## What is built

Open [the ambient lab](http://localhost:3210/ambient/?preview=1), or use **Open ambient lab** on the controller.

- Fifteen remotely loaded scenes: the original rocket and desk images, plus all 13 Midjourney upscales from September 30. Photos live at `https://assets.cultural-alignment.com/smart-tv/<sha256>.jpg`; only the [structured catalog](../tv/ambient-src/catalog.json) ships with the app. It contains titles, dimensions, focal points, byte sizes, SHA-256 hashes and public URLs. [Midjourney provenance](ambient-images.json). Internet access is needed for an uncached image; the browser HTTP cache may reuse immutable responses across launches, but offline playback is not guaranteed.
- A fresh shuffled playlist on opening the app. Each scene appears once per round; subsequent rounds reshuffle with at least five intervening scenes before an image repeats (or all other scenes for smaller collections). Preloading keeps the next scene fixed. Previous retraces the actual playlist; selecting a scene explicitly starts a fresh round from that image. Image failures remove that scene and rebuild the remaining playlist.
- Cover framing with no exposed edges; default 8% zoom and soft 3-second dissolves. A new scene starts every 30 seconds after the initial scene. Motion continues through each dissolve.
- Hand-selected focal points: rocket `(0.49, 0.45)`, person/desk `(0.513, 0.855)`. Coordinates are fractions of the original image. The 13 added scenes also have hand-selected focus near the person/desk, plus short scene titles. This is curated focus, not a claimed automatic focal-point detector.
- The focal point stays in the same relative screen position as the image gently enlarges around it. The person stays visible near the bottom while the huge structure retains its scale; we do not dramatically zoom or move the person to the center.
- Local controls for image, timing, zoom, focus X/Y, focus marker, progress scrubbing, pause, previous/next, and clean full-screen view. Live adjustments apply to that app instance only and reset on reload. Browser changes do not change an already-running TV app.
- The lower-left scene title remains visible in clean view, independently of controls. The scene counter and decorative subtitle have been removed.
- The slideshow honors `prefers-reduced-motion` with still frames/direct cuts.
- A normal, opaque, foreground webOS app: `it.transitivebullsh.smarttv.ambient`, version `0.0.7`. There are no system file edits, root dependencies, background services or automatic entry rules.
- Controller buttons for a fixed package install, slideshow launch, and close. Launch sets room volume to zero, pauses connected foreground YouTube, hides/disables automatic restoration of the assistant panel, then opens Room Ambient. It does not promise to pause an Xbox game.
- In 0.0.4, Back hides the settings panel first without stopping playback or the guard; a second press from clean view calls `window.close()` to exit directly. Repeated keydown events are ignored so holding Back does not run both actions. The old `platformBack()` path caused LG's confirmation prompt. LG documents `window.close()` as the direct exit alternative; the user confirmed this works without an exit prompt on September 30. [LG Back-button guide](https://webostv.developer.lge.com/develop/guides/back-button) Home is OS-controlled. OK reveals the controls; left/right switch scenes when controls are hidden. Browser shortcuts: H toggles controls, Space pauses, arrows switch scenes. Remote OK explicitly toggles focused checkboxes (HTML checkboxes otherwise use Space). The user verified the controls and focal marker after this fix; guard idle suppression still needs a dedicated physical check.

The TV assets use a small standalone TypeScript/CSS client, separate from the React controller. The image engine only animates transforms and opacity; at most two photos are composited. The decoded image pool retains current/next scenes and temporarily one pending manual selection, then releases old image elements and sources. A separate compressed-blob cache prefetches up to 12 scenes ahead during idle time, capped at 16 entries / 32 MiB (including in-flight reservations) with two downloads in flight. Foreground loads precede background prefetch. Unneeded in-flight requests are cancelled; unpinned least-recently-used blobs are evicted and their object URLs revoked. The next shuffled scene is fixed before preloading. Automatic playback holds the current image if the next one is still loading; late results from superseded selections are ignored. The catalog drives both the scene picker and remote loading. The server only serves the ambient HTML, JS and CSS; it no longer serves photos. The app uses a 1920×1080 logical canvas, rendering the original-resolution JPEGs with cover transforms. LG's UI resolution and its UHD video plane are distinct. [LG app resolution](https://webostv.developer.lge.com/develop/specifications/app-resolution)

## Private hook probe

This experiment is off by default. Enable **Try private idle guard with the slideshow** before controller launch, or the equivalent checkbox inside the app's diagnostics.

The code holds a `PalmServiceBridge` subscription to:

```text
luna://com.webos.service.tvpower/power/registerScreenSaverRequest
{ clientName: "it.transitivebullsh.smarttv.ambient", subscribe: true }
```

For a timestamped request, it sends `responseScreenSaverRequest` with the same name/timestamp and `ack:false`. We record registration, rejection, timeout, and acknowledgments separately. A registration response or acknowledgment alone does not prove that the picture remained visible. The bridge is canceled on hiding, leaving or disabling the checkbox. There is no background veto loop and no permission escalation if access is refused.

The author of webos-tv-kit says `ares-install` supplies the app's Luna registration; its manual/root installation path requires separate bus files. That is community implementation evidence, not an LG guarantee. We deliberately test the normal Developer Mode package first. [webos-tv-kit README](https://github.com/CheerChen/webos-tv-kit), [guard implementation](https://github.com/CheerChen/webos-tv-kit/blob/main/js/webos-platform.js), [independent custom-home implementation](https://github.com/zzeppieri/webos-custom-home/blob/main/src/service/luna.ts)

The package declares no public ACG permissions. LG documents ACG enforcement as unavailable on webOS 25; future TV upgrades may change private-hook access. No undocumented permission names are guessed to force access. [LG ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide)

Actual system replacement is a different technique. `webosbrew/custom-screensaver` explicitly requires root and bind-mounts over LG's QML screensaver. Its existence does not establish compatibility with webOS 25 or this firmware. [Project](https://github.com/webosbrew/custom-screensaver), [mount script](https://github.com/webosbrew/custom-screensaver/blob/main/assets/apply.sh)

## Rebuild and package

```sh
pnpm build:ambient
pnpm tv:package-ambient
```

The catalog is tracked; the 15 display JPEGs are stored in R2. Generated bundles and IPK are ignored and reproducible without storage credentials. Original PNG downloads and migration JPEG backups remain in ignored `.local/` directories. The uploader uses the AWS SDK with S3-compatible credentials; the TV package contains only public delivery URLs. It needs neither the laptop server nor S3 credentials for playback.

Package output: `build/tv/it.transitivebullsh.smarttv.ambient_0.0.7_all.ipk`. `pnpm build` builds both TV clients and the main controller. `pnpm dev` builds the static TV clients at startup; after ambient client or HTML edits run `pnpm build:ambient` and reload the preview. Vite does not need restarting. Rebuild before opening the preview so HTML and JavaScript agree. Server/bridge edits use the existing dev watcher.

The installed TV package is separate from the browser preview. Rebuild with `pnpm tv:package-ambient`, close the running app, install through the controller, then launch it again. Reuse the same app ID for updates; do not create another ambient app.

Equivalent manual device commands:

```sh
pnpm tv:cli ares-install --device smart-tv build/tv/it.transitivebullsh.smarttv.ambient_0.0.7_all.ipk
pnpm tv:cli ares-launch --device smart-tv it.transitivebullsh.smarttv.ambient --params '{"guard":false}'
pnpm tv:cli ares-launch --device smart-tv --close it.transitivebullsh.smarttv.ambient
```

On this Mac, the Codex process reported `EHOSTUNREACH` on port 9922 while the existing controller could install successfully. Use its fixed `POST /api/ambient/install` and `/api/ambient/control` endpoints, with the loopback Origin header, instead of asking the user to reinstall manually.

Controller preview assets use an exact file allowlist. Neither arbitrary local files nor generated package installation paths can be supplied by the browser. Device actions remain loopback/origin restricted and share the existing source-command queue, so a newer Home request wins over an older pending launch.

## One shared TV session

Initial preparation did not touch the TV. The user subsequently authorized installation and live testing; see the session evidence below. Start once the user is watching, with TV awake, Developer Mode session active and laptop on its LAN. Existing Developer Mode pairing should suffice; no additional LG account or service key is needed.

1. **Install once** using the controller's Room Ambient section. **Show slideshow on TV**, guard unchecked. Observe several scene transitions and select added scenes from the picker: cover edges, smooth motion/dissolve, person/desk in frame, no audio. OK opens diagnostics/controls; Check the title remains in clean view and both checkboxes toggle with remote OK. Back hides settings; Back again should exit without a prompt; reopen; Home exits. Record the return destination. The original overlay is not part of this check.
2. **Baseline idle:** reopen images with guard off. Leave it untouched and time any stock screensaver takeover. Stop the initial observation at 10 minutes if none occurs and record “not seen within 10 minutes,” not “disabled.” Note whether visibility diagnostics changed. Allow this passive interval while doing other work; only inspect at its end.
3. **Private guard, if useful:** launch images with guard on. Inspect diagnostics once, then return to clean view and leave it untouched past the baseline timeout plus two minutes (or the same 10-minute observation if no baseline was established). If the guard is denied or times out, record that limitation and keep the slideshow available on demand; do not reintroduce video. After leaving the app, check that normal LG idle behavior still returns.
4. **Optional remote entry:** while our app is open, hold an unused number 1–8 and register it if offered. Hold that number from Home to reopen. Hold 0 to inspect/remove Quick Access assignments; 9 is reserved for Quick Help. If this remote lacks accessible number keys or LG refuses the sideloaded app, skip the shortcut. [LG Quick Access instructions](https://www.lg.com/us/simroom/tvs/user-guide/2024/set-up-quick-access-shortcuts)

The image engine is the selected visual experience regardless of the guard result. Without a working guard, LG may interrupt it after inactivity. Automatic activation over other apps remains a separately scoped research problem.

| Hardware observation | Result |
| --- | --- |
| Image motion, crops and dissolves | User confirmed 0.0.2 works perfectly; both images, person visible, correct cover framing and transition |
| Permanent title and focal-point control | User confirmed 0.0.3 works with controls hidden and the remote toggle fixed |
| Expanded collection | User confirmed all 13 new images look great on the live TV in 0.0.5 |
| Back navigation | User confirmed 0.0.4: first Back hides settings; second Back exits without confirmation |
| App reopen | Controller relaunch previously verified; exact return destination for the new direct exit was not separately reported |
| Installed app cleanup | Catalog shows one Room Ambient plus Smart TV Live Activity; obsolete Smart TV Overlay Probe removed |
| Baseline stock screensaver timeout | Pending; no uninterrupted measured interval yet |
| Private guard permissions, idle behavior, release | User observed “Registration responded · waiting for an idle request”; idle veto and sustained visibility remain unverified |
| Quick Access registration | Pending |

Local verification for 0.0.3: 63 TypeScript tests and 21 Python tests pass, including cover bounds/focal visibility, independent image loading, live-mode gating, mute/pause ordering, newer-source cancellation, fixed app targeting, and private subscription cleanup/rejection. Format, lint, TypeScript, production builds and package build pass. Chrome confirms image rendering and Enter toggles the focal checkbox on/off; guard activation correctly reports no native bridge in the browser. Browser rendering or an API's acceptance is never substituted for physical observations.

## Live session: September 29

- Installed 0.0.1 through the controller, with room volume zero. The user saw an unscaled desk image and “A bundled image is missing.” Both JPEGs were present in the IPK.
- Diagnosis: `Promise.all(image.decode())` gated the entire animation/cover loop. A rejected promise prevented all transforms and was incorrectly labeled a missing file. The exact native rejection reason was not captured.
- 0.0.2 starts rendering independently, uses actual load events/natural dimensions and isolates individual image failures. The user confirmed both images, correct framing and transitions using the same originals: “YES, it is working perfectly.”
- The user rejected the rendered film's appearance. Removed that direction completely in 0.0.3.
- The user requested permanent scene titles without the counter/subtitle and reported that remote OK did not toggle either checkbox. 0.0.3 separates the titles from controls and explicitly handles Enter for checkboxes.
- During edits, the browser briefly served updated HTML with the previous static bundle. The removed playback selector caused `Cannot set properties of null (setting 'onchange')`, stopping image initialization. Rebuilt the ambient client and refreshed the user's Chrome tab; images render again without restarting Vite.
- Installed and relaunched 0.0.3; fresh TV state confirms the ambient app foreground and volume zero. The user confirmed the title and focal-point control work, and then reported “registration responded - waiting for an idle request.” This confirms a registration response, not yet a veto or prevention of the stock screensaver.
- Removed only `it.transitivebullsh.smarttv.overlayprobe` through the fixed cleanup endpoint. A fresh installed-app catalog confirms it is gone; `it.transitivebullsh.smarttv.ambient` and `it.transitivebullsh.smarttv.display` remain. There were no duplicate ambient IDs.

## Back navigation update: 0.0.4

The user confirmed that 0.0.3 asks whether to exit on Back, even while settings are open. Version 0.0.4 handles settings dismissal before app exit and replaces the system Back call with direct close. Hiding settings preserves the guard and playback state. Installed and relaunched on the TV with the guard enabled; fresh device state confirms the ambient app foreground and volume zero. All 63 TypeScript tests, 21 Python tests, formatting, lint, types, production builds and package build pass. Browser Escape hides settings while retaining the scene/title, and Enter reopens them. On September 30, the user confirmed “this is working perfectly” in response to the OK → Back → Back check: settings dismiss first, then the app exits without LG’s confirmation prompt. This verifies the requested navigation behavior; it does not establish long-run screensaver suppression.

## Midjourney collection: September 30 / 0.0.5

- Used the authenticated Midjourney Organize page with **Today → Upscaled**, in Asia/Bangkok. The final selection contained 13 jobs; Create no longer showed processing/queue counts. Downloaded the first 12 as a ZIP, then the final completed upscale separately. No generation, upscale or rerun jobs were submitted by this import.
- Preserved all 13 original PNGs locally (98,487,866 bytes total). Converted with ImageMagick to sRGB JPEG, quality 90, 4:4:4 sampling and baseline encoding, without resizing or cropping. The JPEGs total 17,395,742 bytes, about 82% smaller. Exact source job URLs and output dimensions are in [the manifest](ambient-images.json).
- Added titles and focal points after inspecting the images. The existing two scenes remain, giving 15 scenes total. Default timing remains 30 seconds with a 3-second dissolve and gentle 8% focal zoom.
- Replaced all-images-at-once startup with a bounded image pool. Unit checks cover cycling the full catalog while releasing old sources and ignoring completion/error events from cancelled selections.
- All 65 TypeScript tests, 21 Python tests, format, lint, types, production build and TV package build pass. Chrome rendered all 15 scenes at their expected dimensions with two retained image elements per scene and no console errors. Automatic playback advanced from the last new scenes back to the originals; diagnostics read 15/15 visited and 0 unavailable.
- Version 0.0.5 installed through the existing local controller and launched with the private guard enabled and room volume zero. Fresh device state confirms the ambient app foreground and volume zero. The user then confirmed: “The live TV connection worked and all of the new images look great.”

## Shuffled playback: 0.0.6

The playlist is generated a complete round at a time, rather than picking a random image at each transition. With 15 scenes, repeats have at least five other scenes between them, including across round boundaries. Current/next preloading remains bounded; Previous/Next follow the shuffled sequence, including across boundaries. Selecting a specific scene starts a new round with that scene first. All 68 TypeScript tests and 21 Python tests pass, along with formatting, lint, type checking, production builds and the TV package build. Playlist checks cover complete rounds, repeat spacing, stable preloading, navigation history, manual selection and failed images. Chrome showed all 15 scenes exactly once in the first round, then a reshuffled successor; Previous/Next retraced the same sequence across the boundary, with no console errors. Version 0.0.6 was installed and launched through the local controller with the private guard enabled. A fresh state read confirms the ambient app foreground and room volume zero. The earlier collection is user-verified on hardware; the shuffle sequence itself was verified through unit and browser checks.

## R2 storage and prefetch: 0.0.7

Reuses Cultural Alignment’s S3 variable names and conditional immutable upload convention, with a separate `smart-tv/` key prefix. Its existing public GET/HEAD CORS policy already supports the browser and packaged TV app; bucket permissions and CORS settings were not changed. [Cloudflare CORS documentation](https://developers.cloudflare.com/r2/buckets/cors/)

Uploader configuration belongs in ignored `.env`: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_API_ENDPOINT`, `S3_BUCKET_NAME`, `S3_REGION` (default `auto`) and `S3_PUBLIC_URL`. The authenticated API endpoint is never a delivery URL. None of these variables are needed to build or run the viewer.

To replace the catalog, prepare a local JSON array with `id`, `title`, `file` (local JPEG path), `width`, `height`, `x` and `y` for every scene to keep, then run:

```sh
pnpm ambient:upload .local/r2-migration/import.json
pnpm tv:package-ambient
```

The uploader computes SHA-256 from the exact JPEG bytes and uses `smart-tv/<hash>.jpg`, `Content-Type: image/jpeg` and `Cache-Control: public,max-age=31536000,immutable`. It checks existing keys before uploading, uses conditional writes to avoid overwrites, and bounds concurrency to three. It downloads and hashes each public object and checks its type, cache headers and CORS before atomically replacing the catalog. A second run verified all 15 existing keys with zero uploads. New catalog entries require rebuilding/installing the package; photo bytes themselves load dynamically from R2.

The TV prioritizes current/next/manual selections and warms the next 12 scenes when idle. Only two images normally have decoded elements; a pending manual selection may temporarily add a third. The 32 MiB compressed cache is separate from decoded image/GPU memory and is not a total process-memory guarantee. A source JPEG may be at most 8 MiB; downloads enforce its catalog byte size while streaming, with three attempts, 500 ms / 1.5 s backoff and a 15 s whole-response timeout per attempt. Decode failures and exhausted downloads exclude that scene for the session, log to diagnostics/console, and do not show a toast. Restarting gives excluded images another chance. Hidden apps release decoded elements and stop new prefetch; exiting also revokes blob URLs.

Browser verification rendered all 15 remotely loaded scenes. A rapid-selection stress test exposed an unhandled abort on the ky streaming path. The image-specific native fetch reader owns cancellation, bounded reads and retries directly; subsequent cold-request stress checks showed no new unhandled errors. ky remains the uploader HTTP client. Tests cover cancellation during streamed responses, retry exhaustion, oversized bodies, queue priority, cache limits, LRU release, stale completion suppression and shuffled lookahead.

The image directory is removed from the current checkout and ignored against reintroduction. Git history cleanup targets only `tv/ambient/media/`; app icons remain tracked. A temporary ignored Git bundle preserves rollback until the rewrite and remote verification are complete. Historical version notes above describe earlier bundled builds.

Verification for 0.0.7: all 75 TypeScript tests and 21 Python tests pass, as do formatting, lint, types, production builds and packaging. Chrome rendered every catalog image at its expected original dimensions; diagnostics reached 15/15 visited, 0 unavailable and 15 compressed JPEGs / 18.5 MiB cached, with two image elements. The IPK shrank from 19,329,920 bytes (0.0.6) to 12,004 bytes. Installation succeeded and a fresh TV state read observed Room Ambient foreground with volume zero; physical network-playback feedback remains pending.

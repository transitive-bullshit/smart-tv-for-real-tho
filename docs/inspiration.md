# TV customization inspiration

Reviewed October 19, 2026, Asia/Bangkok. These additional references inform possible improvements to our existing LG/Xbox project. Recommendations below are **proposed**, not implemented or hardware-verified; they do not reopen the completed publication pass or change the [roadmap](roadmap.md).

## Sources and what they contribute

### OmkarK97 / webos-vibehack — non-root LG launcher and external Home watcher

[Repository](https://github.com/OmkarK97/webos-vibehack), inspected at [`31a518a`](https://github.com/OmkarK97/webos-vibehack/commit/31a518aef23768067975f3ac2e464462a8046bab). A direct webOS port of Gathin's Android launcher, with author-reported testing on **OLED55C6XLA, webOS 26, firmware 43.21.79**. It installs through Developer Mode without root; our webOS 25 UA84 remains untested.

The useful source-backed distinction is its [external Home watcher](https://github.com/OmkarK97/webos-vibehack/blob/31a518aef23768067975f3ac2e464462a8046bab/home-watch.py): an awake LAN host subscribes to foreground-app changes and opens the custom launcher when LG Home appears. A second Home entry within three seconds is left on LG Home as an escape. This is a Home redirect, not system Home substitution or TV-only persistence. The [Mac service helper](https://github.com/OmkarK97/webos-vibehack/blob/31a518aef23768067975f3ac2e464462a8046bab/home-watch-mac.sh) provides login startup and uninstall; stopping the watcher leaves normal LG Home behavior. Redirect timing is author-reported, not measured here.

Its [app-sync script](https://github.com/OmkarK97/webos-vibehack/blob/31a518aef23768067975f3ac2e464462a8046bab/sync-apps.py) reads app/input metadata from the paired computer and bundles it for the TV frontend. The [manifest](https://github.com/OmkarK97/webos-vibehack/blob/31a518aef23768067975f3ac2e464462a8046bab/app/appinfo.json) declares `application.launcher` and `network.query` ACGs. The README describes a four-app dock, saved reordering and ordinary LG promotion/privacy settings; the repository supplies no system-package debloat step.

**Project relevance:** this is a concrete non-root fallback for a custom Home using the controller host we already have. Integrate any equivalent watcher through our coordinator rather than starting competing automation. Redirecting away from LG Home would change the eligibility of our current Home-qualified ambient trigger, so Home/Back, double-Home escape, ambient entry, HDMI/YouTube exclusions and host-disconnect behavior need a combined acceptance session. No external scripts were executed or installed. See [the LG architecture comparison](home-screen.md#omkark97webos-vibehack-non-root-home-redirect-from-a-companion-host).

### Direct LG webOS references — Luis Catacora / lucataco

These are especially relevant to our project because they concern LG webOS itself:

- [LG OLED demonstration](https://x.com/lucataco/status/2111846873216553433): reports a faster, customizable TV. The photos show stock LG Home and a custom **Dusk** screen with artwork, greeting/date/clock, Home/Apps/Settings navigation and a favorites row containing console/input shortcuts. This is a direct visual reference for our proposed Home; the photos do not establish its Home-button, boot or wake integration.
- [Developer Mode follow-up](https://x.com/lucataco/status/2111882088475435401): says the work used Developer Mode, without hacking into the TV, and reports disabling LG Channels preloading, turning off promotions/recommendations and hiding 77 apps. Preserve this as the author's report of a potential non-root route, not verified behavior on our TV.
- [webos-debloat guide and script](https://gist.github.com/lucataco/7c303b443934008a9031a55cfca552ec), inspected at [revision `a269896`](https://gist.github.com/lucataco/7c303b443934008a9031a55cfca552ec/a269896606b83a31bb85f2f25146b51ceb876fe6): provides concrete app-block-list, preload-policy and promotion/ACR settings mechanisms, with preview/undo controls and protected core apps. It does not contain the Dusk frontend or a Home takeover implementation.

**Compatibility and source discrepancy:** the published guide explicitly requires root and reports testing only on a **2026 OLED, webOS 26 / firmware 11.2, US region**. Our recorded TV is **webOS 25 / firmware 33.31.61**. The script checks for UID 0 before its mutating operations. Both inspected gist revisions already contain those requirements, so the Developer Mode-only reply remains unreconciled with the published procedure. These are strong LG-specific leads, not evidence of the same major-version/device compatibility. See [the detailed LG assessment](home-screen.md#lucataco-lg-specific-cleanup-and-the-dusk-reference).

The concrete improvement to our research plan is to examine **preloading and privacy/promotion settings separately from the custom Home UI**. Hiding tiles is mostly visual cleanup; memory savings require inspecting actual preload/process state. Treat the script's restore and dry-run behavior as something to verify before reuse, rather than assuming every option exactly restores prior state or is read-only. No supplied commands were executed.

### Gathin23 / tv-vibehack

[Repository](https://github.com/Gathin23/tv-vibehack), inspected at [`5a207d1`](https://github.com/Gathin23/tv-vibehack/commit/5a207d146028d816694d0299b2b975909f2aa064).

An Android TV/Google TV debloating workflow and small native launcher. Useful ideas include an agent-readable setup prompt, reversible changes, a short favorites dock, deliberate directional navigation, remembered focus and a restrained clock screensaver. Its README explicitly excludes LG webOS. [Setup prompt](https://github.com/Gathin23/tv-vibehack/blob/5a207d146028d816694d0299b2b975909f2aa064/PROMPT.md), [focus restoration](https://github.com/Gathin23/tv-vibehack/blob/5a207d146028d816694d0299b2b975909f2aa064/launcher/app/src/main/java/com/gathin/tvhome/MainActivity.java#L274-L303), [directional navigation](https://github.com/Gathin23/tv-vibehack/blob/5a207d146028d816694d0299b2b975909f2aa064/launcher/app/src/main/java/com/gathin/tvhome/MainActivity.java#L425-L476).

The clock uses Android `DreamService`; that implementation does not establish an LG screensaver-provider mechanism. [ClockDream source](https://github.com/Gathin23/tv-vibehack/blob/5a207d146028d816694d0299b2b975909f2aa064/launcher/app/src/main/java/com/gathin/tvhome/ClockDream.java#L13-L79).

### humblemuzzu / dumbtv

[Repository](https://github.com/humblemuzzu/dumbtv), inspected at [`38bc6d2`](https://github.com/humblemuzzu/dumbtv/commit/38bc6d293b9d2221cbdb3ada89d9605b324f9f79).

A Fire TV customization project with debloating, a minimal local launcher, recovery tooling and structured device reports. Particularly useful source patterns are screen-sized local wallpaper decoding, persisted settings, checksum-verified installation and release consistency checks. [Wallpaper loading](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/launcher/src/tv/dumbtv/home/Home.java#L463-L494), [settings](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/launcher/src/tv/dumbtv/home/Config.java#L104-L149), [release checks](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/launcher/release-check.sh), [verified install](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/launcher/install.sh#L85-L115).

Its Home interception relies on an Android accessibility service and Amazon launcher detection, so it is not transferable to webOS. Its published speed/memory numbers are author measurements on a Fire OS setup, not reproduced LG results. [Home guard](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/launcher/src/tv/dumbtv/home/Guard.java#L18-L80), [measurement table](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/launcher/README.md#L32-L45).

### Muzzammil / DevMuzzammil: agent-assisted TV customization

[Post](https://x.com/DevMuzzammil/status/2111595814099591535). Describes the ADB, TV-IP and Developer Mode starting point for agent-assisted debloating, quoting Ryan Doyle's speed demonstration. The attached photo shows a stripped-back app row on the TV and laptop. The useful lesson is a short, discoverable setup path tailored to the actual device; the post does not establish LG compatibility or a universal three-step install.

### Ryan Doyle / doooyle: navigation speed

[Post and video](https://x.com/doooyle/status/2111247627748565091). Reports a faster TV after removing unwanted software. The roughly 13-second handheld clip is useful inspiration for a physical, understandable demonstration. It supplies no controlled before/after benchmark, frame timing or evidence that the same changes improve our LG. Do not attribute a measured speedup to package removal from this clip alone.

### Ryan Doyle / doooyle: a useful ambient screen

[Post and photo](https://x.com/doooyle/status/2111196679680540724). Describes artwork with calendar, weather, revenue and payment notifications. The photo shows a landscape filling the screen, upcoming events at upper left, clock/date/weather at upper right and business metrics near the lower edge. This is the strongest product inspiration: an ambient screen can provide a small amount of personally useful information while keeping the artwork dominant.

The post is a first-person demonstration, not an implementation guide or reliability test. Neither inspected GitHub project implements these calendar/weather/payment feeds; do not conflate their launchers with this dashboard.

### Mihir Gupta / 0900mihir: a simpler home screen

[Post and before/after graphic](https://x.com/0900mihir/status/2111746030228455883). Reports disabling 25 unwanted apps, replacing a stock launcher labeled 192 MB with a custom one labeled 83 MB, and adding rotating wallpapers. The graphic contrasts a Google TV home screen with sponsored content against landscape artwork, a small clock and a short app dock with a clear focus outline.

Useful inspiration for the [planned everyday controller view](roadmap.md#m1--choose-and-finish-the-assistants-visual-identity): keep a few primary actions visible and let artwork dominate. Rotating artwork already exists in Room Ambient. The launcher figures are author-reported, with no measurement method supplied in the post; do not treat them as a verified memory benchmark or infer an LG launcher-replacement path. The consistent before/after framing is also a useful presentation reference for future visual comparisons.

### Harshit / harshitsatija: content-first voice control

[Post](https://x.com/harshitsatija/status/2111731520641896945). Describes adding Liquid AI's d1-3B decision model to a customized TV: spoken intent chooses the appropriate app and ADB commands. Inspired by Ryan Doyle's original post, the author argues for choosing content directly rather than navigating the TV's app menus. These are the author's implementation claims; model performance and the attached video were not independently evaluated.

This reinforces our existing [voice-to-validated-device-tools architecture](implementation-plan.md#implemented-architecture), which already resolves content requests and controls native YouTube/Xbox. For a [custom Home](home-screen.md#recommended-project-direction), favor activity shortcuts such as playing music, returning to Xbox and starting Ambient, alongside app/input access. This is a proposed presentation improvement, not a missing voice-control layer. The post's ADB integration does not establish LG compatibility or a reason to switch our current voice/model stack.

### codila / 0xCodila: agent-assisted TV cleanup and sideloading

[Post and six-step TV walkthrough](https://x.com/0xCodila/status/2111826236586570101). Describes putting the computer and TV on the same network, identifying the TV with a photo, enabling Developer Mode, approving the connection, cleaning up unwanted software and installing open-source apps from GitHub. The author reports using a 2017 TV and links the broader reverse-engineering guide below.

Useful setup inspiration: discover the actual device, explain its manual connection steps, and make each proposed change and restoration path clear. The advertised five-minute setup, large speedups and broad TV coverage are unverified claims, not measured results for our LG. The walkthrough's Play Store references and developer-access steps do not establish a webOS Home-replacement or root procedure; use the [LG-specific investigation](home-screen.md) for that decision. The attached demo video was not evaluated.

### codila's linked guide: REA and evidence-led reverse engineering

[Linked article](https://x.com/i/article/2109398658751856642), also available through its [quoted announcement](https://x.com/0xCodila/status/2109623431763292649). Covers REA setup, analysis engines, a first investigation, worked examples, limitations and reusable prompts. Its useful workflow is to inspect a narrow behavior, preserve the evidence, write a behavioral specification, then implement and verify it.

The guide points to [morluto/rea](https://github.com/morluto/rea) and the [official setup guide](https://rea.tools/get-started/). Their current documentation confirms an MCP/CLI analysis toolkit for applications, binaries and recorded behavior, with target-specific dependencies; Android device inspection uses ADB, while firmware analysis has its own tooling. This is research tooling, not a mechanism that grants access to our LG or automatically replaces its Home screen.

For this project, retain it as an optional method for a bounded investigation when existing source, documented APIs and logs cannot explain a particular behavior. Keep observations and unknowns separate and verify the resulting behavior on the actual device. No REA installation, agent-configuration change or reverse-engineering experiment was performed by adding these references.

## Concrete recommendations for this project

### 1. Make Ambient useful on a cold offline launch

**Daily-use value; modest scope.** Bundle one small rights-cleared fallback artwork, displayed immediately while remote scenes load. Later, consider a bounded persistent last-good image if the TV's storage APIs pass a device check. Keep the existing decoded-image and compressed-cache limits.

Our [current cache](../tv/ambient-src/image-cache.ts) and [downloader](../tv/ambient-src/download-image.ts) already bound memory, retries and request duration. They do not guarantee a picture on a cold offline launch; exhausted failures [exclude scenes for that session](../tv/ambient-src/main.ts). Add bounded recovery for transient network failures so reconnecting can restore remote scenes without reopening the app. Local wallpaper in dumbtv supplies the relevant pattern, rather than a reason to replace our slideshow engine.

**Acceptance:** cold launch without internet shows the bundled image promptly; reconnect resumes remote artwork; persistent failure retains a useful picture without a retry storm. Automatic entry still needs its existing controller or a separately validated [TV-only path](ambient-tv-only.md).

### 2. Remember everyday Ambient preferences and remote focus

**Small improvement with immediate value.** Persist validated slide duration and zoom; optionally save per-scene focal adjustments under stable catalog IDs. [AmbientPreferences](../tv/ambient-src/preferences.ts) currently saves only the guard. Other framing/playback choices initialize afresh in [the client](../tv/ambient-src/main.ts). dumbtv's persisted settings show a lightweight approach.

Keep fresh shuffled playback as the default and avoid persisting transient pause/scrub state. Restore the previously focused settings control when reopening the panel, with a fallback if it disappears; our panel currently always focuses the scene picker. tv-vibehack's identity-based focus recovery is a useful reference. Larger navigation changes can wait for a sofa-distance check.

**Acceptance:** selected duration/zoom survive close/reopen; reset restores defaults; invalid or unavailable storage does not break playback; OK/Back retain their current behavior.

### 3. Add an optional glance layer over the artwork

**Largest visible product addition; moderate scope.** Start with a local clock/date toggle, then optional weather and one next calendar event. Use quiet corner placement, legible type and restrained contrast, informed by Ryan's photo. Keep art-only mode as the default; business metrics and payment notices can remain later opt-ins if wanted.

Clock/date can run locally. Credentialed integrations should fetch on the controller and send only a small validated display snapshot through a read-only boundary, following our [existing architecture](implementation-plan.md#local-configuration-and-security-boundaries). Refresh at the data's cadence rather than the animation rate. On stale data, hide it or label its age; a feed failure must not interrupt the art. Keep tokens off the TV and provide an easy privacy toggle for calendar details.

**Acceptance:** the art-only path remains usable with the controller disconnected; the clock needs no network; stale widgets cannot imply current data; the composition remains readable and calm from the couch. This extends foreground rendering and does not solve unattended activation.

### 4. Make setup checks specific to the experience someone wants

**Best adoption improvement when reproducibility work resumes.** Sharpen the existing [M4 setup/doctor task](roadmap.md#m4--let-another-technical-owner-reproduce-it) into separate Ambient, voice, YouTube and Xbox paths. Someone trying Ambient should get its prerequisites and recovery steps without being blocked on optional voice or Xbox credentials.

The current [`pnpm setup:check`](../scripts/doctor.ts) reports configuration, key presence and saved credential files, explicitly without proving authorization. Extend it with capability states such as ready, blocked, optional and unverified, and one specific recovery action. Keep its initial pass read-only; pairing, installation and device actions belong in explicit subsequent steps. Borrow the short agent-readable setup style from tv-vibehack and the [device-report template](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/.github/ISSUE_TEMPLATE/device-report.yml) from dumbtv. Export model/firmware/host/build results without account, network or credential details.

**Acceptance:** a clean checkout can explain what is needed for Ambient alone; a report distinguishes saved credentials from verified readiness and never claims hardware success from a package-install response.

### 5. Use one build identity for packages and diagnostics

**Small concrete fix before another TV package release.** Ambient's [manifest](../tv/ambient/appinfo.json) and [installer](../src/tv-package.ts) target **0.0.9**, but the [client's exported diagnostics](../tv/ambient-src/main.ts) still say **0.0.8**. This is a source inconsistency, not a finding about the installed TV's current build.

Generate manifest/installer/diagnostic versions from one definition and include a source/build identifier. Before downloadable IPKs, add a release consistency check and artifact SHA-256 verification, following dumbtv's release tooling. This makes the existing versioned-artifact roadmap item concrete.

**Acceptance:** the built manifest, installer target and exported diagnostics agree; a deliberately mismatched release fails its packaging check. Do not rewrite historical hardware evidence to match a new version.

## What to carry forward

Start with offline fallback and remembered preferences for everyday use; build identity is a small maintenance fix. The glance layer is the strongest optional feature expansion. Setup/reporting improvements fit the already deferred reproducibility milestone. These are recommendations, not newly scheduled launch requirements.

Keep our native YouTube/direct Xbox behavior and selected Ember renderer. Android package disabling, Fire OS Home interception and Android screensaver registration supply no new evidence for replacing LG Home or removing our automatic-entry controller. The [LG TV-only investigation](ambient-tv-only.md) remains the relevant feasibility work.

The separate [LG Home replacement and debloating investigation](home-screen.md) identifies actual webOS-specific routes, including experimental rooted Home substitution on webOS 25. The Android references above are not the only available approaches; exact-device compatibility remains unverified.

tv-vibehack and dumbtv are very recent examples, so their popularity is not evidence of mature maintenance or broad hardware reliability. Their code is MIT; tv-vibehack's Outfit font has separate OFL terms, and dumbtv's device catalog/schema use CC BY-SA 4.0. Preserve applicable notices if reusing implementation or data. [tv-vibehack license](https://github.com/Gathin23/tv-vibehack/blob/5a207d146028d816694d0299b2b975909f2aa064/LICENSE), [dumbtv license](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/LICENSE), [catalog license](https://github.com/humblemuzzu/dumbtv/blob/38bc6d293b9d2221cbdb3ada89d9605b324f9f79/catalog/LICENSE).

Research provenance: GitHub source was inspected at the pinned commits above without executing external code. Ryan's post text came from the local archive, whose collection records were updated October 18, 2026 at 01:44 UTC; the speed post was also present in the freshly retrieved quote. Muzzammil's, Mihir's, Harshit's and codila's post text was read through authenticated `bird` on October 19 after local archive misses. Codila's linked article text was returned in the quoted post; REA's official README and setup guide were also checked. Lucataco's original post was present in archive collections updated October 19 at 01:51 UTC, then refreshed through `bird`; its follow-up was retrieved through `bird` after an archive miss. The public gist's full files and both revisions were inspected. Public photos, including lucataco's two LG screenshots, and selected frames of Ryan's video were inspected in the browser; Harshit's and codila's attached videos were not evaluated. Engagement counts were not used. No live TV commands, installations, settings changes or backend restarts were performed.

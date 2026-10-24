# LG Home replacement and debloating

Researched October 19, 2026, Asia/Bangkok. Read-only research: no TV connection, exploit, installation, removal, setting change or restart. The last confirmed TV remains **86UA8450PSA.CTMFBH, webOS 25, firmware 33.31.61**, recorded September 28 in [room facts](room.md); its current firmware was not read.

**Assessment:** there is a concrete rooted route to both debloating and a completely different Home on our webOS generation. This deserves a separate feasibility experiment if the owner wants it. Compatibility with our exact TV and daily-use reliability remain unverified; it does not change the published MVP's scope or acceptance.

## What each level gives us

| Approach | What changes | Boundary |
| --- | --- | --- |
| Ordinary settings and app removal | Delete removable apps, reorder shortcuts and adjust available Home promotion/recommendation options | Built-in system apps are not all removable; this retains LG's Home. Menus vary by firmware/region. |
| Custom foreground launcher in Developer Mode | Completely authored screen with app/input shortcuts | It can be opened like our existing apps; that alone does not take over Home, boot or wake. |
| Non-root external Home watcher | Paired LAN host opens a Developer Mode launcher when LG Home appears | Needs an awake external host; redirects after LG Home opens rather than replacing that system app. webos-vibehack supplies this implementation. |
| Rooted launcher with a watcher | Launch a custom screen when Home is pressed or becomes foreground; start it at boot | TV-side persistent process; stock Home can appear during the handoff. |
| Rooted Home substitution | Run another frontend under LG Home's app identity | Glasshouse implements this on webOS 25 experimentally; stronger integration and a larger recovery obligation. |
| Rooted debloating | Hide system tiles, remove removable apps, disable selected background services/preloads and block selected advertising/telemetry endpoints | These are different operations. Hiding an icon does not remove its bytes or stop its services. |

LG documents ordinary [webOS 24/25 app removal](https://www.lg.com/us/support/help-library/lg-tv-memory-shortage-error-app-wont-run--20154522128317) and says [default apps cannot be deleted](https://www.lg.com/us/simroom/tvs/user-guide/2023/use-intelligent-edit). Its [promotion/recommendation settings guide](https://www.lg.com/ae/support/product-help/CT20076005-20153529296767LST) is for older generations, so it is guidance about the feature, not verification of this TV's menu. A [plain Developer Mode launcher](https://github.com/partridgeworks/webos-launcher) demonstrates the foreground-app option; it explicitly does not take over Home and is published without a maintainer.

## Root compatibility: promising, conditional

The freshly rendered [CanI.RootMy.TV lookup](https://cani.rootmy.tv/?q=86UA8450PSA+33.31.61) still resolves the model family to **UA8450PSA.ANR, k25lp, webOS 25 / 10.x**, with **33.31.61** listed as the latest known rootable version for SlopBro and DangBro. The returned regional suffix differs from our recorded **CTMFBH**. This is a current database lead for the recorded firmware, not a root verdict for the physical TV.

The [SlopBro author's documentation](https://github.com/throwaway96/slopbro) reports successful use across webOS 4–11, including a workaround for an attempted patch. [DangBro](https://github.com/azoffshowy/dangbro) has a DVB-tuner/region requirement. Neither was executed. Refresh the installed firmware and exact device identity before choosing a method; do not assume an older generic RootMyTV recipe applies.

## Should we upgrade to webOS 26?

Checked October 19, 2026. **Recommendation for the customization goal: wait until the exact offered update and its compatibility are known.** webOS 26 is not a prerequisite for a custom Home or selective cleanup.

LG advertises [Re:New upgrades for the 86UA8450PSA](https://www.lg.com/ae/tvs-soundbars/lg-86ua8450psa), with four upgrades over five years and schedules/features varying by model and region. That supports eventual upgrade eligibility, not a claim that webOS 26 has already rolled out to this Thailand TV.

The **live, browser-rendered [LG Thailand support page](https://www.lg.com/th/support/product-support/cs-86UA8450PSA.ATMQ/)** lists **33.31.61** and **33.31.80**, the latter dated **October 14, 2026**. Its latest reference lists the 86UA8450PSA and describes minor bug fixes; it does not identify this download as a webOS 26 upgrade. The search-index snapshot still showed older files, so the rendered listing is the current evidence. No firmware file was downloaded or installed. The public support suffix is ATMQ; our room record retains the owner's CTMFBH code. OTA availability and the TV's current installed version were not read.

To check the TV itself, use **Settings → All Settings → Support → Software Update → Check for Updates**, and record both the installed version and the exact offered update before installing. [LG's instructions](https://www.lg.com/ae/lg-story/helpful-guide/what-is-webos) use this path. A firmware version number alone is not a webOS marketing-version label. Use only an official update offered for the correct model/region; another owner's OLED software or a generic webOS 26 download is not an upgrade path for this TV.

The project-specific tradeoffs are:

- [Glasshouse's inspected Home eligibility](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/server/lib/home.js#L820-L830) offers internal 10.x / webOS 25 experimentally, while 11.x / webOS 26 remains gated behind `allowExperimentalHome` and is described as untried. General Glasshouse dashboard/screensaver reports on 11.2 do not validate Home takeover on that version.
- Root compatibility depends on the **exact firmware**. [SlopBro's pinned README](https://github.com/throwaway96/slopbro/blob/21023d56ca424607bb03d2939609cc658c655fc7/README.md#overview) reports use across webOS 4–11 and a patch workaround; it neither proves that 26 is unrootable nor validates a future regional update for our TV. [webOS Brew](https://www.webosbrew.org/guides/rooting/#firmware-updates-factory-reset) says existing root usually persists across updates, with qualifications, so neither guaranteed loss nor guaranteed preservation should be claimed.
- LG's [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide#platform-support) introduces optional enforcement on webOS 26 Re:New when `requiredACG` is declared. Our TV manifests already declare `[]`; our private ambient guard and overlay behavior would need fresh device checks. This is an untested compatibility risk, not proof they fail on 26.
- Downgrade is not a dependable recovery plan. The author's [downgr8 warnings](https://github.com/throwaway96/downgr8/blob/2005332425dbcbdb8233d0f769712bdcd28687ad/README.md#general-downgrade-warning) describe an unsupported procedure requiring existing root, exact compatibility and substantial recovery considerations; it is not a validated undo path for this TV.

Official upgrades can provide useful features, fixes and security patches. Reassess when a specific benefit and the offered firmware are known; do not upgrade solely to match the webOS 26 debloat gist. First establish the best supported customization route on the actual installed firmware. No update settings, TV apps or controller processes were changed by this research.

## Most relevant implementations

### OmkarK97/webos-vibehack: non-root Home redirect from a companion host

Inspected [`31a518a`](https://github.com/OmkarK97/webos-vibehack/commit/31a518aef23768067975f3ac2e464462a8046bab). The [README](https://github.com/OmkarK97/webos-vibehack/blob/31a518aef23768067975f3ac2e464462a8046bab/README.md) reports a Developer Mode install on OLED55C6XLA / webOS 26 / firmware 43.21.79 without root. It is a new, single-commit prototype, not independent validation on our webOS 25 UA84.

The [watcher](https://github.com/OmkarK97/webos-vibehack/blob/31a518aef23768067975f3ac2e464462a8046bab/home-watch.py) runs on an external host, subscribes through paired SSAP to `getForegroundAppInfo`, then launches `com.gathin.tvhome` when `com.webos.app.home` appears. A repeated Home observation within three seconds is allowed to remain on LG Home. Its [launchd helper](https://github.com/OmkarK97/webos-vibehack/blob/31a518aef23768067975f3ac2e464462a8046bab/home-watch-mac.sh) starts the watcher at Mac login and provides an uninstall path. Losing the awake host leaves stock Home available. No app-manager substitution or TV boot hook is used.

This adds an alternative to the rooted paths below: **a non-root Home-button experience is possible through external redirection**, subject to our own device test. It does not establish autonomous TV-only Home replacement. Reuse our existing coordinator and discovered app/input IDs for a future implementation; do not run an independent Home watcher alongside our automatic ambient policy without coordinating them. The current ambient trigger specifically waits for LG Home to idle, so a custom foreground Home would need its own qualified idle path. Keep media exclusions, standby handling and a stock-Home escape explicit. Package installation, foreground acceptance and physical focus/timing remain separate checks.

### lucataco: LG-specific cleanup and the Dusk reference

The owner's [LG OLED demonstration](https://x.com/lucataco/status/2111846873216553433), [Developer Mode follow-up](https://x.com/lucataco/status/2111882088475435401) and [webos-debloat gist](https://gist.github.com/lucataco/7c303b443934008a9031a55cfca552ec) are directly relevant primary sources. The pictured Dusk UI is a useful Home design reference; the gist supplies cleanup code, not that frontend or its Home-button integration.

**Keep the access/version distinction explicit.** The follow-up says Developer Mode was sufficient and reports 77 hidden apps. The current guide instead requires root and identifies one test platform: a 2026 LG OLED on webOS 26 / firmware 11.2, US region. Our TV is recorded as webOS 25 / 33.31.61. At inspected [revision `a269896`](https://gist.github.com/lucataco/7c303b443934008a9031a55cfca552ec/a269896606b83a31bb85f2f25146b51ceb876fe6), the script's `require_root` checks UID 0 for apply, preload/settings changes and boot hooks. The first revision has the same contents; the later revision only renamed the guide. Thus the public Developer Mode-only claim is a promising separate lead, not a source-validated non-root procedure. A root requirement in this script also does not prove that every individual settings change intrinsically requires root.

The script gives us three concrete mechanisms to investigate on our firmware:

- App hiding uses `/var/preferences/com.webos.applicationManager/blockedSystemAppList`, rather than deleting system apps. Core Home/Settings/Live TV/input IDs are protected.
- Preload changes combine `preloadmanager/setPreloadPolicy` with the persisted `allowedApps` configuration, targeting LG Channels and the browser by default. Home, Live TV and HDMI preloads are intentionally retained. Hidden-tile count is not a RAM measurement.
- Promotion, sports-alert, recommendation and Live Plus/ACR settings are separate from launcher appearance. The script records prior settings and offers explicit restoration.

Inspect the [guide](https://gist.githubusercontent.com/lucataco/7c303b443934008a9031a55cfca552ec/raw/1998dc9cefcded2c4a1b9f7af8732cd7b417847e/DEBLOAT.md) and [script](https://gist.githubusercontent.com/lucataco/7c303b443934008a9031a55cfca552ec/raw/ecc48489e07ae7e51680651e84c3ed87de9d7d0a/webos-debloat.sh) before adapting them. In particular, `--preload-on` enables recorded apps rather than restoring arbitrary original preload values. Some `--dry-run` paths create directories/backups; boot-hook commands do not honor that flag. Do not describe the entire CLI as read-only under dry-run or promise exact restoration without additional checks. These findings come from source inspection, not execution.

For a later device session, first inventory the actual apps, settings and read-only preload-policy/permission responses. Resolve what Developer Mode alone exposes before choosing a rooted procedure. Keep this cleanup experiment independent of the custom Home implementation, preserve original values per change, and measure foreground/input performance as well as available memory. No TV access or script execution was performed for this addition.

### Glasshouse: integrated cleanup and experimental Home replacement

Inspected **v0.117.2**, commit [`46b76f2`](https://github.com/rorygallagher2024/glasshouse/commit/46b76f29210b5cfc8870da9034b4f4eba6d42eb7). Root is required. The [release](https://github.com/rorygallagher2024/glasshouse/releases/tag/v0.117.2) offers Home directly on internal webOS 10, corresponding to consumer webOS 25; support remains experimental.

Its [Home takeover implementation](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/server/lib/home-takeover.js#L1-L22) bind-mounts a replacement directory over `com.webos.app.home` and refreshes that app's registration. This is actual app substitution, rather than only reacting to the Home key. LG's original files remain beneath the mount. It covers returning Home, leaving the last app and waking onto Home. [Recovery controls](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/docs/dashboard/home.md#L29-L57) include restoring LG Home and fallback behavior when the server fails.

Debloating is separately implemented as:

- [Uninstalling removable apps](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/docs/dashboard/apps.md#L11-L15).
- [Hiding built-in tiles through metadata overlays](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/server/lib/apps.js#L845-L917), without deleting their system files.
- [Stopping a curated set of services](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/server/lib/services.js#L9-L108), plus [selective preload changes](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/docs/dashboard/apps.md#L115-L121).
- [Configurable network blocking](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/docs/dashboard/privacy.md#L15-L24).

This is a concrete candidate, not established reliability on our UA84. The [experimental compatibility notes](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/docs/experimental.md#glasshouse-home) describe other tested TVs. An open [G5 startup regression](https://github.com/rorygallagher2024/glasshouse/issues/865) led to eligibility/recovery changes shortly before this release. Separately, tile-hiding's app-manager restart has caused picture, ARC and HDMI-CEC failures requiring reboot; the [risk notes](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/docs/experimental.md#why-the-first-two-are-experimental) identify the affected mechanisms. Removing Glasshouse does not automatically undo all privacy/preload changes; [restoration needs an explicit inventory](https://github.com/rorygallagher2024/glasshouse/blob/46b76f29210b5cfc8870da9034b4f4eba6d42eb7/docs/managing.md#L61-L74).

### Launch Home: an alternative with an explicit webOS 25 test platform

Inspected [`dc33d92`](https://github.com/gprot42/webos-launch-home/commit/dc33d92743830a4df0299e3d898705dbe9b7feae). The [project](https://github.com/gprot42/webos-launch-home) reports working on an OLED55C56LB with webOS 25 and supplies app/input shortcuts, artwork, clock/weather and backup controls. Its [watcher](https://github.com/gprot42/webos-launch-home/blob/dc33d92743830a4df0299e3d898705dbe9b7feae/scripts/home-watcher.sh) observes stock Home becoming foreground, launches its frontend, closes stock Home and relaunches to obtain remote focus. This is a redirect, with a possible handoff flash. [Disabling the watcher](https://github.com/gprot42/webos-launch-home/blob/dc33d92743830a4df0299e3d898705dbe9b7feae/scripts/disable-home-watcher.sh) removes its boot hook. It requires root and is also a young project; the reported OLED result does not establish UA84 compatibility.

Two further source leads: [zzeppieri's custom Home](https://github.com/zzeppieri/webos-custom-home/tree/41f8fc2cf368374293d036979390e683e40c370d) uses a TV-side service watching remote input and a Homebrew boot hook, with author validation on webOS 24 and expected support on 25. [webOS 10 Home asset customization](https://github.com/mareklarek/webos10-homescreen-customization/tree/80e39c822097a933fd49c2a23ff5cdfbf9e54763) instead changes LG's Flutter layout/assets through bind mounts, demonstrated on EU webOS 10.2.2. Neither is a universal compatibility guarantee.

## Recommended project direction

A custom Home could make this project a personal TV environment: our artwork and Ember identity, a short row for YouTube / Xbox / Ambient, optional clock/weather, and clear access to LG Settings and stock Home. We can build and test that foreground UI without first committing to root. Reuse the current native app/input mappings and direct Xbox HDMI path.

If the owner wants the complete replacement, first confirm current firmware and prepare a device-specific recovery plan, then test one rooted Home mechanism before adding debloat changes. Assess removing each downloaded app, hiding each tile and stopping each service independently, with a record of the original state and how to restore it. Preserve native YouTube, HDMI/CEC, ARC, networking, app installation and essential system services. Measure actual navigation/memory changes rather than promising the speedups shown in Android TV posts.

A persistent rooted service also supplies a plausible foundation for moving our ambient watcher onto the TV. That still needs our own Home/idle, media-exclusion, dismissal and standby acceptance; installing a launcher does not establish it. See [TV-only ambient](ambient-tv-only.md).

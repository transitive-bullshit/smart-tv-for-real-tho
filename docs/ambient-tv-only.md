# TV-only ambient: feasibility check

Inspected **October 18, 2026**, Asia/Bangkok. Research only: no TV connection, installation, activity registration, setting change, reboot or exploit was performed. The last owner-confirmed hardware facts remain **86UA8450PSA.CTMFBH, webOS 25, software 33.31.61**, from September 28; current firmware was not refreshed. See [room facts](room.md).

## What currently requires the controller

The installed Room Ambient app renders its slideshow on the TV. Its images come from the configured image host, and its foreground idle guard runs inside the TV app. The laptop currently supplies the separate **observe Home → observe LG idle → launch Room Ambient** behavior. Installing a foreground app does not give it that background responsibility or register it as LG's screensaver. See [implemented architecture and evidence](ambient-screensaver.md#automatic-activation) and [TV app](../tv/ambient-src/main.ts).

There is **no established setting that selects our installed app** as the system idle provider. LG staff answered the custom-provider request on April 15, 2026 with no current plans. That establishes the public-product boundary, not the impossibility of private TV-only mechanisms. [LG answer](https://forum.webostv.developer.lge.com/t/how-can-i-create-a-custom-screen-saver-app/28169)

## Available paths

| Path | TV-only result | Current verdict |
| --- | --- | --- |
| Open Room Ambient manually / Quick Access | Our existing experience runs on the TV once opened | Already implemented; automatic entry remains separate. |
| LG Gallery+ | LG's own renderer can supply art at idle | Supported feature on applicable models/regions; exact local availability and personal-photo idle assignment need checking. |
| Packaged JavaScript service | Move our watcher onto the TV, keeping our app | Credible non-root experiment; startup, private state access and reboot recovery are unverified. |
| Rooted watcher / native replacement | Persistent TV-side activation or actual replacement | Current compatibility leads exist; requires a separate owner decision and exact-device validation. |

**LG's supported alternative:** its webOS 25 guide says Gallery+ content can be applied to the screensaver. The same guide offers photos from external devices, ThinQ or Google Photos as wallpaper and notes model/region differences and an LG-account requirement. The documentation does not establish that every personal-photo source can be assigned to the idle screensaver, or what subscription this TV requires. Check **Home → LG Gallery+ → Photo**, then the selected content's screensaver options. This may satisfy “our artwork, TV only,” but it would use LG's layout, transitions and controls instead of Room Ambient. [LG webOS 25 guide, Gallery+](https://kr.eguide.lgappstv.com/manual/w25/w25_k01/engk.html), [LG Gallery+ support](https://www.lg.com/us/support/help-library/lg-tv-how-do-i-use-lg-gallery--20155006048649)

The guide's ordinary **Screen Saver Settings** expose Promotion and Standby Time, not an arbitrary installed-app selector. **Power On Screen** is also not such a selector: LG documents Home or the recent external input. [LG webOS 25 guide](https://kr.eguide.lgappstv.com/manual/w25/w25_t45/engb.html), [LG startup-screen support](https://www.lg.com/us/support/help-library/how-to-set-the-startup-screen-on-your-lg-tv-CT10000030-20155412183664)

## Non-root service: worth testing, not yet a solution

LG's **TV** documentation provides real building blocks:

- A custom JavaScript service can invoke Application Manager to launch an app. [App lifecycle](https://webostv.developer.lge.com/develop/guides/app-lifecycle-management)
- Activity Manager callbacks can resume services. Its `persist` activity type is explicitly documented to survive device reboots; `explicit` activities can invoke the callback again when orphaned. This is TV documentation, not an assumption imported from webOS OSE. [Activity Manager](https://webostv.developer.lge.com/develop/references/activity-manager)
- The service FAQ describes five-second idle exit and supported live activities/Activity Manager callbacks for longer work. An ordinary JavaScript timer alone does not solve service lifetime. [JS service FAQ](https://webostv.developer.lge.com/develop/guides/js-service-faq)

There is contradictory first-party guidance: LG staff said on April 7 and again October 15–16, 2025 that a service starts from a foreground app and that the app is launched by the user. The later thread specifically asks about boot. The reference APIs therefore justify a bounded experiment, not a promise of supported unattended boot behavior. [April answer](https://forum.webostv.developer.lge.com/t/i-am-created-a-service-but-not-able-to-start-service-when-app-is-going-to-background-foreground-and-reboot-tv/24840), [October boot answer](https://forum.webostv.developer.lge.com/t/start-service-on-boot/27945)

Our safe trigger also needs fresh power/processing and foreground-app state. The currently used private `tvpower/power/getPowerState` and `applicationManager/getForegroundAppInfo` methods are not in LG's public TV Luna inventory. Their availability through the paired external controller does not prove access from a packaged TV service. LG says ACG is unsupported on webOS 25 and lower; that does **not** establish unrestricted access to all private services or writable provider settings. No private setting that persistently selects our app has been verified. [Public TV references](https://webostv.developer.lge.com/develop/references), [ACG platform support](https://webostv.developer.lge.com/develop/guides/acg-guide)

**Smallest next feasibility check:** prepare a removable service in Room Ambient's package, started once from its foreground UI. First record read-only responses to those two state methods. Then, only in a dedicated device session, register a bounded persistent Activity Manager callback that records timestamps and the same read-only observations. Check it after leaving/closing the app, stopping the controller and disconnecting developer SSH, then through an owner-operated cold restart. Provide cancellation by activity name and cancel before uninstall; set no power-holding flags. This separates service access, lifetime and boot persistence without automatic TV launches. Only after these pass should a single guarded Home/idle launch be tested, with YouTube/HDMI exclusions, dismissal and standby checks. No prototype or device result is claimed here.

## Root: a more concrete lead than the earlier notes

The browser-rendered [CanI.RootMy.TV result](https://cani.rootmy.tv/?q=86UA8450PSA+33.31.61) returned **UA8450PSA.ANR**, machine **k25lp**, OTA ID **HE_DTV_W25P_AFADATAA**, webOS 25/10.x. It lists **33.31.61** as the latest known rootable firmware for both **SlopBro** and **DangBro**. The database suffix differs from this owner's **CTMFBH** code, and current firmware is unknown: this is a concrete compatibility lead, not a verified verdict for the physical TV.

SlopBro's current author documentation reports use on webOS 4–11 and a workaround for an attempted patch. DangBro's author limits it to DVB-tuner TVs on webOS 7 through 25. Neither was run. Older faultmanager patch-status notes alone are therefore insufficient to conclude that this TV cannot be rooted. [SlopBro](https://github.com/throwaway96/slopbro), [DangBro](https://github.com/azoffshowy/dangbro)

The older `webosbrew/custom-screensaver` source actually **bind-mounts a replacement over LG's `qml/main.qml`**, with a Homebrew boot-hook link. It requires root; it does not register an arbitrary HTML app. Its latest main commit inspected was January 7, 2022 (`90666c1`), so it is an implementation reference rather than evidence of current webOS 25 support. [Apply script](https://github.com/webosbrew/custom-screensaver/blob/90666c19112ec77d6c2b1b84ae7db7d914285e92/assets/apply.sh), [boot registration](https://github.com/webosbrew/custom-screensaver/blob/90666c19112ec77d6c2b1b84ae7db7d914285e92/frontend/views/MainPanel.js), [commit](https://github.com/webosbrew/custom-screensaver/commit/90666c19112ec77d6c2b1b84ae7db7d914285e92)

Current Glasshouse source handles the newer **Flutter** stock screensaver on webOS 10/11 by mounting a replacement app and asking the app manager to reread that one app. Its comments report success since 0.98.1 on C5 10.3.1, C2 10.3 and G3 11.2; earlier switching through a system app-manager restart could leave picture/audio/HDMI control unavailable until a power cut. This is source-author evidence on other TVs, not our acceptance result. It demonstrates that current rooted replacement is technically real, while the old single-QML-file recipe is insufficient. A root-persistent watcher launching our existing app is another design, not an implemented feature. [Inspected source at `eb45e3f`](https://github.com/rorygallagher2024/glasshouse/blob/eb45e3fcd88994ccd7f3c3f2f952e157f1660eb3/server/lib/screensavers.js), [changes and boot persistence](https://rorygallagher2024.github.io/glasshouse/TV-CHANGES/)

Prefer the bounded non-root check before system modification. If it fails, refresh the exact installed firmware and regional model/OTA match before deciding whether root is worth the tradeoff. Until a path passes device acceptance, the repaired external controller remains the proven automatic-entry fallback; native slideshow playback itself needs no laptop.

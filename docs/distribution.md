# Distribution: technical preview first

Researched September 30, 2026 against official LG documentation. [Roadmap M4](roadmap.md#m4--let-another-technical-owner-reproduce-it) owns release tasks and acceptance. Nothing in this document changes repository visibility or submits an app.

## Recommended first release

Publish the source, a reproducible build and versioned overlay/ambient IPKs for technical owners using LG Developer Mode and a local controller. This is an engineering recommendation based on LG's documented package/install workflow, not a claim of permanent consumer installation or universal firmware support. `ares-package` produces an IPK; `ares-install` and `ares-launch` install and run it on a configured target. [LG CLI guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)

Each owner needs an LG developer account, the Developer Mode app from LG Apps, and a computer on the same network. Enable Developer Mode and reboot; enable Key Server; register port `9922` / user `prisoner`; obtain the SSH key using the on-screen passphrase. These are separate from ordinary paired LAN controls. [LG Developer Mode setup](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app)

**It is not a permanent one-time installation.** LG says expiry disables Developer Mode after a reboot and removes apps installed through it; ten offline reboots can also disable it. The supported Extend UI needs network access and an unexpired session. [LG session lifecycle](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app)

LG staff states a maximum session of **1,000 hours**, about 42 days. CLI v3 removed `ares-extend-dev`; the documented replacement is below. This is researched guidance, not a command tested by this planning change and not an implemented renewal scheduler. [LG renewal clarification](https://forum.webostv.developer.lge.com/t/whats-the-way-to-extend-dev-time-with-webos-cli/28033)

```sh
pnpm tv:cli ares-launch com.palmdts.devmode -p extend=true -d smart-tv
```

Show remaining session time and renewal/reinstall help during onboarding and readiness checks. Test any optional automated renewal on the actual TV, including its foreground impact, before enabling it. The first release should not require sharing LG credentials with our project or a hosted service.

## What a replicable release contains

The current repository already has an MIT license, locked Node/Python environments, configuration examples, CI, package scripts and pairing UI. It still needs portable defaults, a guided setup, a clean-install check, versioned release artifacts and independent validation.

| Deliverable | Release expectation |
| --- | --- |
| Quick start | Prerequisites and own-credential setup, optional Xbox/voice/image-upload paths, explicit Live/Simulation behavior, one supported host path first. |
| TV packages | Named versions, checksums, matching source tag, reproducible packaging, install/update/uninstall and Developer Mode renewal instructions. |
| Readiness and recovery | Explain LAN access, expired/revoked pairing, TV package mismatch, receiver state and the specific next action without exposing tokens. |
| Images | Small rights-cleared sample set and replaceable catalog/public URLs. Cloud write credentials remain optional and local; no dependence on our personal R2 bucket. |
| Compatibility | Exact tested LG model/webOS/firmware and controller OS; label every untested combination and experimental private feature. |
| Release hygiene | License/notice inventory, samples and reachable-history review, public configuration examples, upstream client/auth assumptions documented. |
| Outside validation | One technical owner reproduces supported journeys on their own setup from a clean clone without an author-led call. |

An awake computer running the controller remains necessary for voice/control and automatic ambient entry. The already-open ambient app continues independently. Moving the controller to an always-on host is an optional later portability milestone, not a current compatibility claim.

## What LG Store publication entails

1. Register through Seller Lounge. LG supports both individual and corporate sellers; a company is not documented as the only path. [Seller registration](https://webostv.developer.lge.com/distribute/app-ecosystem)
2. Prepare the IPK, listing images, a UX scenario that testers can follow, and the self-checklist filled with actual test results. [Submission requirements](https://webostv.developer.lge.com/distribute/app-approval-process)
3. Pass LG's submission pretest, functional testing and content testing. Fix reported issues and resubmit if rejected. Approved updates require their own approval; these sources provide no promised turnaround time. [Approval process](https://webostv.developer.lge.com/distribute/app-approval-process)
4. Validate remote/pointer navigation, focus/selection, Back behavior and credential handling against the store checklist. Our successful personal-TV Back test is useful evidence, not a full store-readiness pass. [App self-checklist](https://webostv.developer.lge.com/distribute/app-self-checklist)

The substantial uncertainty is feature eligibility:

- **Assistant overlay:** public `transparent` metadata describes app-background transparency, not a documented third-party entitlement to draw over HDMI. `defaultWindowType: overlay` is absent from the public manifest reference, and LG staff has said no third-party overlay API was provided. This firmware's real success does not establish store eligibility. [Manifest](https://webostv.developer.lge.com/develop/references/appinfo-json), [LG overlay answer](https://forum.webostv.developer.lge.com/t/is-there-an-api-like-in-android-tv-to-overlay-ui-element-on-the-screen/1418)
- **Ambient guard:** our private tvpower veto is not a documented custom-provider registration. LG's public screensaver policy controls supported exceptions and warns that incorrect screensaver configuration can prevent publication. Its April 2026 answer says a custom-provider API is not planned. [Screensaver policy](https://webostv.developer.lge.com/develop/guides/screensaver), [custom-provider answer](https://forum.webostv.developer.lge.com/t/how-can-i-create-a-custom-screen-saver-app/28169)
- **Newer platform permissions:** LG's ACG guide says webOS 25 and older do not support that mechanism, webOS 26 Re:New supports testing it, and webOS 27 requires `requiredACG` for Seller Lounge eligibility (including `[]` with no Luna calls). Its public API list does not include our tvpower guard. This is a portability question to test, not proof that every private call will fail. [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide)

If store distribution becomes a priority, prepare the exact manifest/private-call inventory, controller prerequisites, supported hardware matrix and a UX recording for Seller Lounge's 1:1 Q&A. Ask about eligibility and any partner route before investing in a store version. A foreground-only app using public APIs might be a later reduced feature set; it would not promise the entire current overlay/idle experience. [LG submission support](https://webostv.developer.lge.com/contact)

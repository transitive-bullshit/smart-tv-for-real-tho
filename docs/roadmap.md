# From working room to polished demo to open source

Updated October 2, 2026. This is the owner-approved scope and ordered backlog. It supersedes the original preparation-only / demo-only boundary. Ember is selected, the voice lab is implemented, and the new public-facing room demo is built. See the [concrete launch plan and next joint session](launch-plan.md) for the shortest path from here.

Build an assistant that feels present, understands a short request, acts on the actual room, and recedes. Preserve native LG YouTube and direct Xbox HDMI. The three outcomes are a reliable personal setup, a compelling real-device video, and a reproducible open-source release for technical owners. Consumer app-store distribution is a separate option.

## Starting point

- **Hardware-confirmed:** LG and Xbox control, Hades, native YouTube search/correction, spoken requests, seeking, baseline transparent overlay over YouTube/Xbox, clean overlay Hide, ambient photos/framing/titles/Back, and several hours of ambient playback with the guard on.
- **Automatic ambient:** two logged Home → idle → ambient entries after about ten minutes, plus positive physical feedback. Complete repeated observations, dismissal and recovery checks remain open. [Evidence](ambient-screensaver.md#evidence-so-far).
- **Installed and measured:** animated overlay 0.0.5, Ember Thinking Orbs + cached Voice Glow, live controller mirror and TV frame-rate reporting. All nine patterns advanced in short native samples at 25–50 fps; composing remains below the 30 fps target. Sustained voice/source acceptance is outstanding. [Visual lab](visual-lab.md).
- **Verification baseline:** 93 TypeScript and 24 Python tests passed after the live-mirror update. Automated tests establish code behavior; the physical acceptance below establishes the room experience.
- **Public web preview:** a separate scripted landing page at `/demo/`, with a cinematic fictional room, the existing Ember orb renderer and bundled artwork. It needs no controller or API key. The owner selected instant demo first and optional live voice later; public hosting and hardware acceptance remain separate gates.

## Milestones, in order

### M1 — Choose and finish the assistant’s visual identity

**Next work package.** The lab and native overlay already share a renderer and live-state wiring. Finish that integration and its presentation; do not start another rendering system.

- [x] Select the local design direction: **Ember** warm orb/glow/accents with the original **cool cyan backgrounds and surfaces**. Preserve the approved orb defaults. The lab now has an audible recorded conversation, local clip playback and same-page live push-to-talk; alternatives remain available.
- [ ] Verify the selected Ember default on the actual TV at sofa distance. Freeze its palette, particle weight/density, orb size, glow strength, type scale and placement over dark/bright YouTube and Xbox content. Keep alternatives in the lab.
- [ ] Make the full interaction coherent: calm idle → attentive listening → quiet thinking → speech-reactive response → brief completion → recede. Use real voice/tool events; stop speaking animation on interruption, clear obsolete text, and make disconnect/error states actionable. Technical uncertainty stays in operator diagnostics; never fabricate completion.
- [ ] Save the selected look as the shared default, verify it survives restart, package/install it, and check actual microphone-to-TV response. Simplify the main controller into an everyday/demo view, with setup, labs and detailed traces in secondary panels. Confirm deliberate overlay dismissal and source-restoration behavior together.

**Done:** one owner-approved live-TV look, legible from the couch, consistent across listening/thinking/speaking and both native sources. At least a 15-minute animated run with no accumulating stutter, stuck activity or audio/focus regression. Measure frame pacing on the TV before tuning density/resolution; a steady 30 fps is the design target. Short native checks now span 25–50 fps, so composing and the complete sustained interaction still need attention. The known launch loading flash is an accepted platform limitation for v0.1; normal in-place updates must stay smooth.

### M2 — Make the complete journeys dependable

Can prepare the harness and recovery UI alongside M1; validate the final visual build as one room session.

- [ ] Run three complete Xbox → native YouTube → correction → pause/resume → Xbox transitions, including one closed-app start. Use two unfamiliar searches. Measure speech end, acknowledgement, command acceptance, fresh receiver state and first physical picture/audio separately. Investigate the previously delayed receiver observations before relabeling timeouts or relaxing confirmation checks.
- [ ] Exercise one interruption, one unavailable receiver and one reconnect. The newest request wins; one concise recovery action is enough. Batch-check next/previous, speed, available captions and autoplay; retain an explicit unverified label for any untested capability. Ad skip stays disabled in the Premium demo.
- [ ] Finish [ambient acceptance](ambient-screensaver.md#scope-and-acceptance): three separately observed entries, deliberate Back/dismissal and cooldown, active YouTube/Xbox exclusions, TV standby/wake, controller restart and LAN interruption. Investigate any unexplained return to Home; the first logged ambient run returned after 57 minutes without a nearby controller command, and its cause is unknown.
- [ ] Give the operator a dependable readiness/recovery path: current app/package versions, pairing/receiver readiness, Developer Mode session status, and the specific fix for a failure. Document a stable controller startup and keep-awake strategy. A minimal optional process supervisor is useful; moving to an always-on host is a later portability test.

**Done:** recorded physical results for all required cases, no stale request taking over the screen, saved setup reused after restart, and a final-build ambient soak of at least two hours (or until an explicitly configured shutdown). Record failures honestly and fix blockers before filming. Existing multi-hour feedback counts as prior evidence, not a substitute for final-build recovery checks.

### M3 — Rehearse and record the demo

- [x] Add the ambient journey to the controller’s rehearsal entries, using the [filming guide](demo-session.md). All seven journeys have saved notes and export.
- [ ] Export the completed result sheet with tested build/configuration identifiers and physical observations.
- [ ] Run two complete voice rehearsals without developer intervention. Start push-to-talk; use open mic in the film only after a successful audible-room interruption test. TV stays muted for unattended work; choose recording volume explicitly with the owner.
- [ ] Record a 60–90-second main take: real TV/voice, music request, correction, one seek, return to Xbox, and concise responsive visuals. Record automatic ambient entry as a separate honest before/after or labeled time-lapse of the approximately ten-minute wait, plus a clean close-up of the artwork.
- [ ] Prepare the final short edit, captions, a simple architecture/setup card and representative screenshots. Keep native delays visible in the continuous take; distinguish any montage/time compression. Use audio/images cleared for public sharing and avoid account/credential screens in the shot.

**Done:** the video makes the value understandable without narration about internals, and the corresponding reproducible live take and run notes exist. The filmed overlay is actually on the TV.

### M4 — Let another technical owner reproduce it

Start after the demo flow is stable. This is a technical preview, not universal TV compatibility or a hosted consumer product.

- [ ] Build a guided setup/doctor flow around the existing configuration, pairing UI and scripts: LAN/local-network permission, LG pairing, optional Xbox, YouTube receiver pairing/search, local API keys, Developer Mode, package install, display-host binding, readiness and specific recovery instructions. Make voice, Xbox and ambient dependencies explicit; someone trying ambient should not need an Xbox or OpenAI key.
- [ ] Remove owner-specific assumptions from defaults and public examples. Let users select their HDMI/game/catalog and bring their own public image URLs or optional S3-compatible upload credentials. Ship a small rights-cleared sample catalog; our Cultural Alignment bucket and personal images are not a required public service.
- [ ] Prepare versioned overlay/ambient IPKs, checksums, build instructions, changelog, compatibility table and optional-dependency/credential guide. Verify packaging in CI from the locked environments. Document Developer Mode expiry/renewal and uninstall/reset paths. Test a clean clone with empty `.local` rather than reusing the owner’s setup.
- [ ] Run a release review for reachable Git history, sample data, licenses/notices and credential handling; verify Xbox client registration/distribution assumptions and the community YouTube protocol boundary. Publish no personal tokens or account state. Recruit one independent technical LG owner for a setup run without an author-led call, and fix their blockers before calling the preview reproducible.

**Done:** another owner installs, pairs, completes at least the supported LG/YouTube journey and ambient activation, and can recover/reinstall using only the docs. Label Xbox and models/firmwares not independently exercised. Prepare a GitHub technical-preview release, then review the concrete release package with the owner before making the currently private repository public. No npm publication or store submission is required.

### M5 — Optional broader distribution

After the open-source preview: assess an always-on controller host, more tested models, easier upgrades and a supported store-compatible feature set. LG Store publication requires its own submission/review process; Developer Mode success is not an approval guarantee. See [distribution paths](distribution.md). Rooting, rewriting webOS, TV-microphone integration, a wake word, support for arbitrary apps and a commercial hosted service remain outside the initial release.

## Decisions and actual blockers

| Item | Status / what unblocks it |
| --- | --- |
| Visual family | Decided: Thinking Orbs + restrained Voice Glow. No new library search needed. |
| Final theme and choreography | Owner selected Ember foregrounds and accents on cool cyan surfaces, retaining orb defaults. Local recorded/live voice testing is implemented; combined TV choreography acceptance remains. |
| Animated overlay performance | Needs installation/version confirmation and an observed TV run. Browser results cannot settle it. Prep and local work can proceed now. |
| Native control reliability | Primitives work; full cold/warm, cancellation and recovery acceptance remains. Measured receiver lag is an investigation item. |
| Automatic ambient | Core flow works. Requires an awake controller host, valid Developer Mode and the remaining recovery checks. No extra TV setting is currently required. |
| Filming | Needs a short hands-on slot, approved audio level and a quiet recording environment. No new hardware purchase is assumed. |
| Open-source release | Needs portable setup, reusable sample content and one outside installation. It is now in scope; changing GitHub visibility is a later release action. |
| LG Store | Not a blocker for technical preview. Private overlay/guard capabilities and review requirements need a separate assessment. |

## Immediate queue

1. Review the [room demo and launch story](launch-plan.md#landing-page-story). Its self-contained static build can be hosted separately from the eventual source release.
2. Run the [combined TV session](launch-plan.md#the-next-session-together): install/verify Ember, exercise real push-to-talk, source transitions and recovery, and collect ambient acceptance.
3. Fix findings, then complete two rehearsals and record the real-device film.
4. Package and document the working result for a fresh outside installation before the open-source release.

Work should remain autonomous between these concrete human checkpoints. Keep [implementation status](implementation-status.md) as the evidence ledger; this roadmap owns priority and release scope, [journeys](journeys.md) owns intended behavior, and [ambient scope](ambient-screensaver.md#scope-and-acceptance) owns detailed idle acceptance.

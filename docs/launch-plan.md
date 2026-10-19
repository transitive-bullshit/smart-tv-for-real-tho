# From this prototype to a public launch

Updated October 19, 2026. The owner wants an 80/20 publication pass, then to call this project done for now. Ship a polished website and an experimental personal/source preview, with a separate short manual demo video. The [evidence ledger](implementation-status.md) retains the limits of the real-device results.

## The MVP finish line

**Published:** the [website and interactive room](https://smart-tv-for-real-tho.transitivebullsh.it/) and [GitHub source](https://github.com/transitive-bullshit/smart-tv-for-real-tho) are public. The README and screenshots are refreshed, GitHub/X footer links are shipped, and dependency notices are distributed without a visible credits link. The approved two-blob history cleanup is complete for both public branches; the [publication report](publication-review.md) records verification and GitHub's retained PR-reference limit.

The existing fictional room is the public preview; the real controller stays local. The website uses the owner’s personal-site subdomain. No hosted controller or public AI service is required.

- Public pages, desktop/mobile interactions, sharing metadata and static-only deployment were checked.
- Source/media review, replacement sample audio, compatibility limits and fresh-install/build instructions are documented.
- Before the history rewrite, Node 24 hosted CI passed on `9171c97`: 101 TypeScript tests, 24 Python tests, format/lint/types and both builds. Its cleaned counterpart has an identical file tree. This is historical evidence, not a CI result for the final documentation commit.
- Publication approval has been given and repository visibility is already public; no visibility gate remains.
- **Separate manual video:** the owner records one short real-TV request, correction and return to Xbox, with an ambient cutaway if convenient. The agent can supply a shot list and help with editing/captions when requested. Recording does not block the website or source publication.

**Done for now:** the public surfaces, illustrated README, source review and approved branch-history cleanup are complete. The manual video remains separate. No independent-installation or broad reliability guarantee is implied.

Defer the larger reproducibility programme: an outside owner setup run, expanded doctor, downloadable IPKs/checksums, wider model support, exhaustive physical acceptance, always-on hosting, live public voice and LG Store submission. These remain open work, not passed checks. The detailed hardware checklist below is available for later validation or filming.

## Where we are

The hardware rows summarize the last recorded results from October 2; their open checks are deferred from this publication pass. Public-site and source readiness are checked by the current finish line above.

| Area | What works | What remains before we claim it is ready |
| --- | --- | --- |
| Real AI voice | OpenAI Realtime over WebRTC; laptop mic/speaker; push-to-talk; optional server VAD/open mic; validated device tools, cancellation, real input/output amplitude. A spoken YouTube request worked on the TV. The newer lab established a real WebRTC connection. | A complete spoken run with the current Ember overlay, interruption and reconnect. Open-mic acoustics remain untested. |
| TV and Xbox | Native YouTube search, correction, basic playback/seek, Xbox control and direct HDMI have evidence. | Three complete cold/warm journeys, two unfamiliar searches, and recovery. Extended playback settings need physical checks. |
| Overlay | Baseline transparency over YouTube/Xbox worked. Ember is selected. Panel 0.0.5 is installed with a live controller mirror; all patterns advanced at 25–50 fps in short native samples. | Check composing against the 30 fps target, sofa-distance readability, real microphone-to-TV state changes, source restoration, Back/Hide and 15-minute smoothness. |
| Ambient | 0.0.9 is installed with 52 scenes; all images passed browser checks. Earlier scenes and multi-hour operation have physical confirmation; two automatic Home-idle entries have logs and positive owner feedback. | See the new images physically; finish three observed entries, dismissal/cooldown, active-media exclusions, restart/network/standby recovery and a final two-hour run. |
| Public web demo | Published and anonymously verified at the Vercel URL, with the real orb renderer, scripted story, local artwork, sharing image, GitHub/X links and dependency notices. | Simulation is not evidence of device performance. |
| Public source preview | Public on GitHub with an illustrated README, locked dependencies, successful pre-rewrite Node 24 CI, setup checks, TV package scripts and cleaned branch history. | GitHub retains the old merged PR reference; see the publication report. Independent reproduction remains unverified. |

**Assessment:** the experimental personal project is published with clear limitations and completed branch-history cleanup. The historical reliability and reproducibility programme remains deferred.

## The next session, together

Optional extended hardware validation, retained from the earlier launch plan. This is not a prerequisite for the current website/source preview. For the quick manual video, choose a short flow that works and describe only what was actually observed.

Allow **40–50 minutes of active testing**, followed by idle cycles and a two-hour ambient run. Keep one browser open at the controller; use **Demo journeys → Export session notes** for results. Seven journeys are now present, including ambient. Times are planning estimates.

1. **Get ready — 5 minutes.** Run `pnpm dev` in the working Terminal and open [the controller](https://smart-tv-for-real-tho.localhost/). Confirm Live mode, LG/Xbox saved connections, YouTube receiver, OpenAI key presence, and the current LAN feed address. Keep TV volume at zero. Use an independent laptop mic/speaker. Reconnect voice after any backend restart.
2. **Put the new look on the actual TV — start a 15-minute observation.** Build with `pnpm tv:package-display`, then use **Install TV update**, **Show TV panel** and the saved Ember look. Confirm assistant version **0.0.5**. Watch over both bright/dark YouTube and Xbox. From the sofa: readable text, restrained glow, transparent background, smooth motion, no accumulating stutter. The known one-time launch flash is acceptable; repeated flashes during updates are not.
3. **Prove real voice — 5 minutes, during that observation.** Connect push-to-talk. Say “Play [an unfamiliar song] by [artist].” Then “Actually, [another song]” and “The live version.” Watch listening → thinking → responding → receding on the TV. Confirm the artist/context carries forward and the spoken reply stays short. Say “Pause,” “Continue,” and “Forward thirty seconds.” Record what physically changes.
4. **Prove switching and interruption — 10 minutes.** “Back to Xbox.” Repeat three full Xbox → YouTube → correction → Xbox runs, with two unfamiliar searches and one closed-YouTube start. During one pending request, press Talk and say “Actually, back to Xbox.” The newer request must win. Deliberately disconnect/reconnect one receiver and retry. A failure gets one useful message, never invented success.
5. **Prove the escape routes — 3 minutes.** Press Back and try native navigation. Show the panel again; then click **Hide** and change sources: it must stay hidden. Current distinction: remote Back closes the instance but does not disable the controller’s restoration preference; **Hide** disables restoration. Decide whether that behavior is acceptable for the preview, and record it. Confirm the speaking animation stops when interrupted.
6. **Rehearse — 5 minutes.** Run two continuous takes without developer intervention. If they pass, record the 60–90-second live take. Choose TV volume explicitly before unmuting. Keep push-to-talk for the first film; only try open mic after an audible-room interruption test.
7. **Finish ambient separately.** Confirm some new 0.0.9 images visually. Close Room Ambient, go to LG Home, leave the remote alone, and watch the roughly ten-minute natural idle transition. Record any clock flash. Exit with Back and check cooldown. Observe three separate entries, check that playing YouTube/Xbox prevents entry, then standby/wake, controller restart and LAN recovery. Finish with a two-hour run. These cannot fit honestly into the short voice rehearsal.

**A pass means a physical observation**, not only an accepted API command. Record build/version, source, exact request, visible outcome, rough delay and any recovery action. Export notes before clearing browser storage. Use [the detailed filming guide](demo-session.md) if a check fails.

## Deferred hardware and reproducibility work

These earlier tasks remain open for a later reproducible hardware release. They do not reopen the completed publication approval:

- [x] Build the public story/demo separately from the operator console, with no device or credential dependency.
- [x] Add ambient to rehearsal notes/export; update stale Ember-selection and package guidance.
- [ ] Fix findings from the combined voice/overlay session. Freeze one look; keep experiments in the lab.
- [ ] Extend the setup doctor with actionable LAN/feed binding, pairing, receiver, package and Developer Mode readiness. Make Xbox, voice, YouTube search and image upload explicitly optional.
- [ ] Replace owner-specific defaults with discovery/configuration; provide a small redistributable sample catalog. The public website bundles three local samples and does not require the owner’s R2 service; the native ambient catalog still uses it.
- [ ] Rehearse setup from a clean clone and empty `.local`, then have one other technical LG owner follow the docs. Record exact model/webOS/host compatibility.
- [ ] Produce versioned overlay/ambient IPKs with SHA-256 checksums, a source tag, changelog, install/update/uninstall guide, dependency notices and credential/history review.
- [ ] Prepare a versioned hardware release after the deferred work passes. The experimental source is already public; no store submission or npm publication is needed.

The **web concept demo and experimental source preview are published before the reproducible hardware release**, with their prototype/simulation labels, documented limits and working public source link. Do not advertise universal TV compatibility, a TV microphone, native global screensaver replacement or a one-click consumer install.

## Landing-page story

**Logline:** Someone just wants to enjoy their evening, but the biggest screen in the room keeps asking them to navigate menus. A conversational interface gets them to the content, handles a change of mind, and leaves the room with something beautiful when the watching stops.

**Repeatable claim:** A personal voice interface for your TV, with ambient art for the room.

**Hook:** “A smart TV. For real, this time.”

**Arc:** familiar remote/menu friction → ask for something → change your mind without starting over → return to your game → the assistant recedes → ambient art changes the feeling of the room.

**Invitation:** try the fictional room immediately. No key, account or microphone permission first. The current story uses captions and is silent. Optional live AI voice should be a later, explicit mode with tools restricted to the simulated scene; it must not reuse the live device adapter.

The current backdrop is an AI-generated architectural render. The TV surface and Ember orb are live browser UI. This is not a Blender model or a recording of the owner’s real room. If a navigable 3D room becomes useful after reviewing this version, keep the interactive TV as a texture/HTML layer and replace the backdrop with a real scene; a Blender production pipeline is not needed for the first public concept demo.

## Video and asset plan

The quick owner-recorded video is the current goal. The longer continuous proof and ambient reference takes below are optional follow-up assets, not publication gates.

| Asset | Concrete content | Status |
| --- | --- | --- |
| Interactive landing page | Cinematic fictional room; three voice examples; source changes; ambient art; explicit simulation labels | Published and verified; see the MVP finish line above |
| Room artwork | Warm room with an empty TV, reusable for the site/launch layout | Generated and saved in [demo assets](../web/demo/assets/README.md) |
| 15–20-second teaser | First five seconds: show a request changing the actual TV. Then one correction, return to game, ambient finish. Caption: “A smart TV. For real, this time.” | Script ready; needs hardware footage |
| Quick manual demo | Short real-TV request, correction and return to Xbox; optional ambient cutaway | Owner records separately; not a website gate |
| 60–90-second proof | One continuous real-TV voice take, with actual waits and native overlay visible | Deferred; needs two clean rehearsals first |
| Ambient cutaway | Real Home → idle → art, with the waiting period labeled as time-lapse, plus a close-up of the new collection | Needs filming; preserve a continuous reference take |
| Static launch images | Wide room/TV hero and Ember overlay view. Label simulated images “Interactive preview”; label real photos with tested hardware/build. | [Fresh production-build captures and provenance](launch-media/README.md) |

Suggested teaser captions: **“Your TV has enough menus” → “Just ask” → “Change your mind” → “Back to your game” → “Make room for quiet.”** Keep the first visible result inside five seconds. Scripted web timings must never be presented as measured native performance. Real proof footage and the fictional web story are complementary assets.

## Run and publish the web demo

- With the normal controller running: open [`/demo/`](https://smart-tv-for-real-tho.localhost/demo/). Its development footer links to the controller and both labs.
- Without hardware, Python or API keys: `pnpm install`, then `pnpm demo`; open the printed URL, normally `http://127.0.0.1:3215/`.
- Produce the public artifact: `pnpm build:demo`. Serve **only `build/site/`** from a static host. `pnpm demo:preview` previews that artifact at `http://127.0.0.1:3216/`.
- Asset paths are relative, so the output works at a domain root or a subdirectory. The public build omits links to local tools and contains no backend, keys, account state, full ambient catalog or API calls.
- The website and source are public. After future changes, verify the production URL and keep the static-only boundary; no new visibility approval is needed for the already published repository.

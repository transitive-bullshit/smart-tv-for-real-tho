# Rehearse and film the real room

Updated September 30, 2026. [Roadmap](roadmap.md) owns the milestone gates; this is the practical room-session and recording guide. The owner wants cohesive batches of checks, with autonomous preparation between sessions.

## Before the room session

- Prepare the three M1 look candidates in the [visual lab](visual-lab.md). Confirm the installed assistant package version; 0.0.4 is built and browser-checked, while its physical installation/rendering has no confirmed record. The old TV-off/connection-timeout observation is historical, not a current blocker or a request for another approval.
- Build/package the final visual candidate and install through the controller's **Install TV update** action. Build native changes before installation; refreshing the browser does not update the TV. Leave Room Ambient 0.0.8 alone unless that client changes.
- Run relevant local checks, confirm saved pairings and independent laptop microphone/speaker, and make sure YouTube has the intended profile with startup prompts cleared. Xbox stays in Retail Mode with Remote features and the selected game ready.
- Keep the development process in the working network-enabled Terminal. For rehearsals use `pnpm dev:stable` with the saved `.env` and this computer's actual `TV_DISPLAY_HOST`, not a copied owner-specific address. Restarting the backend rotates the HUD feed token and ends voice sessions; reconnect and relaunch the panel once before the take.
- Keep TV volume zero for unattended preparation. Agree on recording volume with the owner before audible tests. Push-to-talk is the default; open mic is a separate acoustic check.

The controller is at https://smart-tv-for-real-tho.localhost/ and the shared visual lab at https://smart-tv-for-real-tho.localhost/hud/?preview=1. The preview does not command the TV. **Use this look on TV** saves appearance; an installed, running compatible panel receives it through the feed. This does not install or launch a TV app.

## One combined validation session

First compare Signal, Quiet and Ember on the actual TV over bright/dark native YouTube and Xbox content. Choose one look; then run the interaction/recovery batch with that look. Allow roughly 30–45 minutes of active checks plus unattended idle/soak time; this is a planning allowance, not a measured duration.

**Start demo session** reconnects configured LG, sets volume zero, enables HUD restoration, shows the panel and connects voice. Check any reported setup error before proceeding. Keep the same session established through source changes.

The controller currently contains six expandable scripts with saved results/notes. The seventh ambient row below is required and partly verified; adding it to the controller's result sheet is a roadmap task.

| Journey | Result to record |
| --- | --- |
| 1. Take control | Game activation, Xbox Home, LG Home, actual room-volume behavior when sound is authorized. |
| 2. Music and correction | Unfamiliar song → retained artist correction → version refinement → pause/resume → Xbox. Repeat three full runs, including one closed-app start. |
| 3. Player control | Seek, next/previous, speed, available captions and autoplay; distinguish commands accepted from visible setting changes. |
| 4. Change your mind | Interrupt pending work; latest request wins. One unavailable-receiver case and a successful recovery. |
| 5. Assistant in the room | Real listening/thinking/speaking, native transparency, source restoration, readable text, remote focus and deliberate Hide/Back. Observe at least 15 minutes for animation degradation. |
| 6. Continuous voice take | Two full rehearsals without developer intervention, followed by the recording. |
| 7. Automatic ambient | LG Home → natural idle → photos → deliberate exit/cooldown; active-media exclusions, standby/wake and controller restart. Follow [ambient acceptance](ambient-screensaver.md#scope-and-acceptance). |

Use two song requests not previously selected during development. **Export session notes** includes browser-saved notes and recent software events. The current exporter only carries the latest 100 trace events, not the complete historical log; use `pnpm timings` for the server log. Record physical picture/audio timing separately. A full result sheet should include build/package versions, selected appearance, warm/cold start, physical pass/failure and recovery action.

The final-build ambient soak should last at least two hours or until a deliberately configured shutdown. Existing positive multi-hour feedback and two automatic-entry log sequences are recorded in [ambient evidence](ambient-screensaver.md#evidence-so-far); they do not certify every recovery case.

## Storyboard

The main 60–90-second take shows the TV, the speaker and the interaction together. Adjust content/timing after rehearsing; do not promise this duration before measuring native app startup.

1. **Ownership:** a short opening line such as “Your room. Your software.” while the real room is visible.
2. **Ask:** request a music video from Xbox or LG Home; the native orb listens, thinks and acknowledges briefly while YouTube opens.
3. **Correct:** change the song or ask for a live version; show context carried forward without navigating menus.
4. **Control:** seek ahead, then return to Xbox with the chosen game still on the direct HDMI input.
5. **Recede:** assistant settles and dismisses; show that the content owns the screen again.

Film automatic ambient as a separate beat: LG Home, an explicitly labeled approximately ten-minute time-lapse/cut, then the actual automatic transition and a clean close-up of the artwork. It cannot honestly fit a ten-minute wait into the short uncut voice take. Keep a reference recording of the real transition if measuring the stock-clock flash.

Deliver a short edit, captions, a simple setup/architecture card and a few screenshots. Use music/images cleared for public sharing; avoid account screens, keys and pairing prompts. Preserve the live take and run notes so the demo remains reproducible. Do not composite a fictional HUD in postproduction or edit away delays while presenting a sequence as continuous.

## Visual behavior to validate

Thinking Orbs uses a local Canvas 2D renderer; Voice Glow uses Canvas/SVG/CSS. The TV receives actual session/tool states and amplitude envelopes, with synthetic audio available only in preview. One shared chosen appearance should drive the lab, live overlay and controller preview. Full/subtle/static motion and system reduced-motion handling exist; choose the final TV settings after measuring native frame pacing.

In-place updates should not relaunch the panel. Native source changes can hide it; source restoration is serialized and discards stale requests. **Hide** currently disables automatic restoration for the session. Remote Back closes the current panel instance but does not update the controller's restoration preference because the feed is read-only; M1 must make that distinction predictable, or deliberately improve it before filming. A subsequent source change can currently restore a Back-dismissed panel.

The current panel expires after five minutes without new activity; normal idle heartbeats do not extend that time. Completion-to-recede timing is part of M1 choreography, not proof that this five-minute default is the final design. The brief launch loading screen is accepted for the first release; sustained stutter or repeated in-place flashes are not.

## Recovery

Cancel pending work, inspect actual state and reconnect the affected device through setup. A backend restart requires reconnecting voice and relaunching the HUD with its new feed token. Dismiss technical details into operator diagnostics; retain concise truthful errors in the room. Use Subtle/Static only as an explicitly recorded fallback if the selected animation cannot meet the native performance gate.

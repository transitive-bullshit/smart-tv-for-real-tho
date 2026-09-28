# One session, the whole room

September 29, 2026. The user requested autonomous implementation and one cohesive test session instead of per-feature TV checks. The original hardware gates remain evidence to collect in that session; they no longer block building the animated HUD.

## Before sitting down

The controller runs at http://localhost:3210/. The exact TV client is previewed at http://localhost:3210/hud/?preview=1. The visual lab is a local illustration when a preview state is selected, and follows actual display events in Live feed mode. It does not send commands to the TV.

Build the TV client with `pnpm tv:package-display`. The controller's **Install TV update · 0.0.3** button installs only that fixed package to the saved `smart-tv` developer profile. It runs in the existing controller environment, avoiding a new Terminal process with different LAN permissions. The fixed CLI fallback is:

```sh
pnpm tv:cli ares-install --device smart-tv build/tv/it.transitivebullsh.smarttv.display_0.0.3_all.ipk
```

Current installation status: package built, installation not completed. A read-only check through the controller reported a Developer Mode connection timeout, and LG control startup also timed out. Direct Codex CLI access reports EHOSTUNREACH, as earlier. The user subsequently confirmed the TV is turned off. No further device checks or installation attempts will run until it is available; the timeout is not evidence that the Developer key expired. When the room is available, turn on the TV and verify Developer Mode before another install attempt. One immediate install retry was rejected by automatic approval review pending diagnosis; subsequent actions were read-only diagnostics, not a bypass.

Once installed, click **Start demo session**. This reconnects the configured LG, sets volume zero, enables HUD restoration, shows the panel, and connects voice. Allow the existing localhost microphone permission if prompted. Push-to-talk is the default. If a step fails, its error appears on the controller; it does not pretend the session is ready. No API keys, account login or pairing should need re-entry unless a credential has expired.

For filming, start `TV_DISPLAY_HOST=192.168.1.191 pnpm dev:stable` once before the take. For development, keep the current `pnpm dev` watcher; code edits reload it automatically. A server restart requires reconnecting voice and showing the HUD again because the feed token rotates.

## Run the journeys

The controller includes expandable scripts and saved result/notes fields for all six journeys:

| Journey | Purpose | Time |
| --- | --- | --- |
| 1. Take control of the room | Hades → Xbox Home → LG Home → volume zero | 2 min |
| 2. Music, correction, and back | New song → artist carryover → live version → pause/resume → Xbox | 3 min |
| 3. A player that listens | Absolute/relative seek → speed → captions → next/previous → autoplay → restart | 3 min |
| 4. Change your mind | Interrupt a request → new destination wins → useful error → recover | 2 min |
| 5. The HUD in the room | Voice states → YouTube/Xbox → motion comparison → remote focus → Hide | 3 min |
| 6. One continuous take | Two complete rehearsals, then one uncut recording | 2 × 90 sec plus recording |

Choose at least two artist/song requests not used during development. Use **Export session notes** after the batch. Notes are stored locally in the browser, and export includes the latest 100 software trace events without diagnostic detail, credentials, or transcripts. It does not contain all historical traces: use `pnpm timings` for the server's full ignored trace log. A software event timestamp is not the time the physical picture appeared.

For the original three-transition gate, repeat Journey 2 three times and close/reopen native YouTube using the Room diagnostic before one run. Record each run separately in the note, including any timeout. For the final recording, use a wide view that includes the TV and your spoken request, then show the correction and return to Xbox in the same uncut take. Keep real loading time visible. No postproduction overlay is needed.

## HUD behavior and comparison

The 0.0.3 package renders a compact cyan/amber panel, segmented orbit graphics and a voice-state glyph. These are CSS/SVG graphics, not measured audio amplitude. Listening/speaking states come from microphone interaction and Realtime audio events; work/result states come from the actual coordinator. Resolved video/game labels come from validated local request context. Routine technical caveats stay in controller diagnostics.

Full mode rotates the orbital arcs while listening/working and animates the voice glyph while listening/speaking. Subtle keeps only the voice motion; Static stops animation. The client's reduced-motion media query overrides animation, and hidden-page animation stops. There are no external fonts, canvas/WebGL loops, large blur filters, or image fetches in the native package. Browser preview confirms appearance, not TV GPU performance.

Start opens the panel once; in-place text and voice-state updates do not relaunch it. Native source changes are known to hide the overlay, so successful source-changing requests restore it when **Restore after source changes** is enabled. This restoration is serialized with device effects and drops stale requests; it does not cancel media or clear search candidates. Explicit **Hide** disables restoration. LG remote Back closes the current instance; because the client feed is read-only, it does not turn off the controller's restoration preference. The next source change can therefore restore it. Use Hide for session-wide dismissal.

The panel closes after five minutes without a new activity timestamp. Routine idle voice heartbeats must not count as activity. Source restoration, sustained motion performance and audible focus/audio behavior on the TV are batch-test items, not claimed physical passes. The known short loading screen on opening is accepted for this spike.

## Recovery and sound

If a request fails, cancel pending work, inspect the current TV picture once, and reconnect the relevant device from Room setup. Don't repeat commands blindly. A still-visible stale panel after a backend restart should say it needs reconnecting; use Show after reconnect. If motion stutters, switch to Subtle or Static in the same take and record which mode worked.

Keep the initial session muted. An audible volume or open-mic acoustic test is optional and requires choosing to unmute; it is not part of unattended testing. Set a modest volume, test interruption, then return to zero. HDMI ARC remains the soundbar path. Ad skip remains disabled for Premium.

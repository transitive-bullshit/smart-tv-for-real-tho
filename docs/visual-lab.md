# Thinking Orbs visual lab

Implemented September 29, 2026 in TV package 0.0.4. Browser-verified; physical TV rendering and live microphone-to-TV latency remain unverified. Installation of this specific animated build is not confirmed in the evidence ledger. Earlier TV-off notes describe the original build session, not current device availability.

The owner selected **Ember Thinking Orbs + restrained Voice Glow**, keeping the original cool cyan backgrounds and surfaces with warm orange foregrounds and accents. Orb size, density, speed and state mapping retain the approved defaults. The glow now has a matching seven-color warm palette and enough height to read during speech. Confirm this treatment on the actual TV and refine the whole conversation’s motion and dismissal. See [the roadmap](roadmap.md#m1--choose-and-finish-the-assistants-visual-identity). Murmur is not part of the next comparison.

## Explore locally

Open [the visual lab](https://smart-tv-for-real-tho.localhost/hud/?preview=1) from the controller's **Open visual lab** link. The same compiled renderer and assets are used in the native TV package. The right sidebar contains four design directions, nine orb patterns and assistant states. The `preview=1` query enables these controls on direct localhost or named Portless `.localhost` URLs; native launches keep them hidden.

- **Try the conversation:** **Play conversation** plays a roughly ten-second recorded request → thinking → recorded reply sequence. Both the orb and Voice Glow follow measured audio levels. **Use an audio file** replaces the request with a local clip (up to 30 seconds / 10 MB); the response remains the labeled sample reply. Files stay in the browser. Stop, switching to another preview state, or hiding the page stops playback. Volume controls the laptop playback without changing the measured envelope or TV volume.
- **Live voice:** connect directly in this page, then hold **Hold to talk** with a pointer or Space/Enter while focused. Release sends the utterance. Pointer cancellation, loss of focus and hiding the page release the microphone; disconnect/navigation closes the session. This uses the existing controller’s real assistant and room tools, so a live request can control devices.
- **Design direction:** Quiet, Signal, Ember and Prism are our room presets. They vary ink/glow palette, density and motion speed. They are independent of assistant states.
- **Orb pattern:** all nine upstream Thinking Orbs animations are available. Click one to pin that geometry across states. **Follow state** restores the configurable mapping.
- **Assistant state:** idle, listening, thinking, speaking, complete and error. **Play sequence** cycles through a short happy path. This only simulates presentation; it makes no device or AI calls.
- **Light & motion:** tune restrained glow, orb size, speed, synthetic speech versus manual level, static/subtle/full motion, and dark/bright/transparency backdrops. System reduced motion takes precedence.
- **Particle tuning & state mapping:** adjust density/weight and choose a pattern per assistant state. Mappings apply only in Follow state mode.
- **Live session:** follows controller state and audio envelopes, including a session connected with the new **Live voice** controls on this page. It can also observe a session from another tab. Choose a manual assistant state to leave live mode and close this page’s voice session.

Choices are remembered in this browser. The v2 preference key starts the accepted Ember defaults once; subsequent customizations persist. **Use this look on TV** separately saves the appearance to ignored `.local/display-appearance.json`. It does not wake, install or launch the TV app. An already-running 0.0.4 panel receives it through its feed; otherwise it is used at the next launch. Preview motion and backdrop are local only; the main controller's Motion control sets TV motion. **Reset look** restores local defaults; save afterward to use those defaults on the TV.

## Build and run

`pnpm dev` and `pnpm dev:stable` build the visual assets before starting the usual watched controller. `pnpm build` builds both visual assets and the main web app. After editing `tv/visuals`, run `pnpm build:visuals` and refresh the lab; backend edits retain their existing watcher behavior. No user-Terminal restart is required for visual asset builds.

`pnpm tv:package-display` builds assets and creates `build/tv/it.transitivebullsh.smarttv.display_0.0.4_all.ipk`. The controller's **Install TV update · 0.0.4** action installs the fixed package when the TV is available. The package was built locally; confirm installation and native rendering during the next shared TV session.

## Implementation

Pinned dependencies: `thinking-orbs@0.3.2` and `voice-glow@0.2.1`. The large orb uses the published Thinking Orbs engine, geometry, presets and painter, drawing at its actual size. It does not stretch a 64-pixel bitmap or replace the authored animations with approximations. Gallery thumbnails use the upstream React component. Voice Glow receives an external level getter and a processing flag. React and both MIT libraries are bundled locally; license notices ship with the TV app. No CDN, additional voice provider or TV microphone is required. The browser-only voice controls reuse the existing Voice client. Bundled original sample dialogue uses macOS synthesized voices; see [audio provenance](../tv/visuals/audio/README.md). Neither a YouTube embed nor cross-origin media access is needed for the offline demo.

The laptop analyses its existing microphone and assistant WebRTC streams. Only bounded input/output amplitude values reach the display service; no raw audio is forwarded for visualization. Telemetry is limited to 10 Hz with one request in flight, session/sequence validation, phase gating and a 750 ms stale-value timeout. The authenticated TV feed polls at 100 ms intervals after each completed request. Local canvas/glow animation runs independently; these intervals are not a measured end-to-end latency guarantee.

The UI pauses motion when hidden or requested by the user/system. Dismissing the native panel unmounts the visual renderer and stops polling. The visual lab supports showing the preview panel again without reloading. Existing dismissal, generation checks, device-control behavior and source restoration remain in place.

## Validation

Browser inspection covered the nine-pattern gallery, independent style/pattern/state changes, pinned patterns, custom state mappings, persisted choices, static motion, a bright backdrop, appearance saving and dismiss/restore. Browser console reported no warnings/errors during those checks. Automated coverage exercises envelope bounds, stale/reordered/session-mismatched values, phase gating, analysis without playback and cleanup. Existing device/coordinator regression tests continue to pass. Native performance, transparency and real-room voice response need the next TV session.

Sources and design credits: [Thinking Orbs](https://libraries.dev/orbs), [Voice Glow](https://libraries.dev/voice), and [the research shortlist](assistant-visual-references.md).

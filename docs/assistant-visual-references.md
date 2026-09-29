# Assistant visual references

Researched September 29, 2026. This is a design and source review, not an implemented renderer selection. The TV was off; no installation, graphics benchmark or hardware compatibility claim follows from these findings. See [graphics capabilities](overlay-graphics.md) for the current client and platform limits.

## Recommendation

Compare two directions before implementation:

1. **Libraries.dev Thinking Orbs + Voice Glow:** the closest match to the user's confirmed references. Fine particles supply an expressive identity; a restrained edge glow provides audio feedback. My preferred direction for an assistant that feels integrated into the room and recedes during playback.
2. **Murmur, especially Aura or Opal:** the strongest new candidate for a more cinematic presence. Its glass-like volume and internal light are visually richer; its state choreography is already meaningful. Worth adapting if this wins visually, rather than rejecting it because the existing renderer needs work.

ElevenLabs Orb is a strong third comparison. Orb UI offers a lighter atmospheric alternative. Preserve the chosen project's authored motion, timing and material treatment when adapting it. Dependencies are an implementation choice; visual quality is the selection criterion.

## Confirmed Libraries.dev references

### Thinking Orbs — Jakub Antalik, with Alexandr Brinza

[Live playground](https://libraries.dev/orbs) · [Source](https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs) · [License](https://github.com/Jakubantalik/Libraries.dev/blob/main/packages/thinking-orbs/LICENSE)

Visually inspected: restrained particle spheres, toroidal forms and connected clouds. These are particularly good at communicating activity without becoming a large distracting object. The current library has nine animation presets: working, searching, solving, listening, connecting, weaving, composing, breathing and shaping. Those are animation verbs, not a complete voice-session state machine; speaking needs an explicit mapping.

The [React component](https://github.com/Jakubantalik/Libraries.dev/blob/main/packages/thinking-orbs/src/ThinkingOrb.tsx) wraps a Canvas 2D renderer, with a separate [animation engine](https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs/src/engine). This is a promising extraction boundary for the existing vanilla TV client. Its drawing loop already handles pixel ratio and motion preferences. Using React is also possible if it makes the chosen integration clearer.

The documented 20/64-pixel treatments are tuned for small UI. On the TV, redraw at the selected display size and adjust particle weight, density and contrast for sofa distance; merely enlarging a low-resolution bitmap would lose the design. A larger on-screen treatment is a proposed adaptation, not a published preset.

### Voice Glow — Jakub Antalik

[Live playground](https://libraries.dev/voice) · [Source](https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/voice-glow)

A complementary light treatment along an element's bottom edge. The glow responds to voice and has a separate processing motion. It could illuminate the bottom of our compact assistant panel, or a bounded strip near the TV edge. It need not occupy the whole screen or compete with the orb.

The public API accepts an external normalized `level`, including a per-frame getter, plus a processing flag. We can drive it from the laptop's microphone and assistant audio without requesting microphone access on the TV. The renderer combines Canvas 2D, SVG filters and CSS, rather than requiring a 3D engine. Its source already includes reduced-resolution soft layers and adaptive frame pacing; blur area and backing resolution remain worth measuring on the TV. [Component](https://github.com/Jakubantalik/Libraries.dev/blob/main/packages/voice-glow/src/VoiceBeam.tsx), [render driver](https://github.com/Jakubantalik/Libraries.dev/blob/main/packages/voice-glow/src/voiceDriver.ts)

The published Libraries.dev libraries are MIT. Studio Pro exports, presets and recipes have separate paid terms; use the open-source packages as the baseline. [Repository licensing explanation](https://github.com/Jakubantalik/Libraries.dev#faq)

## Other strong candidates

| Project | Design assessment and state support | Renderer and adaptation |
| --- | --- | --- |
| **[Murmur — Kris Puckett](https://murmur.krispuckett.com/)** | Strongest new visual discovery. Live demo inspected: dark glass forms, luminous rims, internal ribbons and flashes. Eighteen variants; idle, listening, thinking, responding, success and error. MIT. [Repository](https://github.com/krispuckett/murmur-web) | WebGPU through vgpu with a WebGL2 fallback. Adjustable FPS, resolution and DPR. Needs transparent output for our overlay; see below. |
| **[ElevenLabs UI Orb](https://ui.elevenlabs.io/docs/components/orb)** | Fluid two-color shader orb with idle, thinking, listening and talking states, and separate input/output levels. A coherent, reusable voice-interface component. [MIT source](https://github.com/elevenlabs/ui) | React, Three.js, React Three Fiber and Drei. Already uses transparent canvas composition. The shader and state logic are concentrated in [one component](https://github.com/elevenlabs/ui/blob/main/apps/www/registry/elevenlabs-ui/ui/orb.tsx); extraction is feasible. Bundle its remotely loaded noise texture locally. |
| **[Orb UI — Alexander Chen / Experimental Software](https://orb-ui.com/)** | Cloud is a softly lit atmospheric sphere; visually inspected the simulated speaking demo. Radial is a four-lobe alternative. Explicit idle, connecting, listening, thinking, speaking and error states. [MIT repository](https://github.com/exprmntl/orb-ui) | Custom WebGL1 shaders with transparent output, React wrapper, optional provider integrations. Controlled input/output levels allow our existing voice session to drive it. [Cloud source](https://github.com/exprmntl/orb-ui/blob/main/src/themes/cloud/CloudTheme.tsx), [Radial source](https://github.com/exprmntl/orb-ui/blob/main/src/themes/radial/RadialTheme.tsx). |
| **[Paper Smoke Ring — Paper Design](https://shaders.paper.design/smoke-ring)** | A softer, smoky radial form with adjustable fill and layered detail. A visual primitive, not a finished assistant state system. | WebGL2 with a vanilla renderer; React optional. Shader supports opacity/background alpha. We would author the voice-state choreography. Current official [license is Apache-2.0](https://github.com/paper-design/shaders#license), despite stale references to an older license. [Shader](https://github.com/paper-design/shaders/blob/main/packages/shaders/src/shaders/smoke-ring.ts). |
| **[LiveKit Aura × Unicorn Studio](https://docs.livekit.io/frontends/agents-ui/audio-visualizer/prebuilt/)** | Organic glowing aura with existing state mapping. Worth reviewing as a distinct alternative to a sphere. | WebGL1, React/Motion/LiveKit wrapper. Numeric volume can be driven independently. The [component's own license](https://github.com/livekit/components-js/blob/main/packages/shadcn/components/agents-ui/agent-audio-visualizer-aura.tsx) is PolyForm Non-Resale 1.0.0, despite the repository's Apache license. Source-available with restrictions; do not classify it with the MIT options. |

Murmur's [state implementation](https://github.com/krispuckett/murmur-web/blob/main/src/state.ts) is a particular strength: 0.6-second transitions, calmer idle, attentive listening, a thinking wake envelope, directional responding, completion swell and restrained error motion. Separate voice level and activity inputs let animation communicate more than raw loudness.

Its transparency issue is concrete: the [renderer](https://github.com/krispuckett/murmur-web/blob/main/src/renderer.ts) uses `alpha: false` for WebGL2 and opaque WebGPU composition; the [presentation shader](https://github.com/krispuckett/murmur-web/blob/main/src/shaders/wgsl/post/present.wgsl) outputs alpha 1. Removing a CSS background is insufficient. We would need a body/halo alpha treatment and correct compositing, then compare it against the original visual. That is an adaptation task, not proof of incompatibility.

## What was actually found in saved references

### X likes

The local X archive contained 34,910 likes and 143 bookmarks and was refreshed September 29, 2026 at 06:51 UTC. Focused text searches matched actual `likes` collection membership, not merely a tweet's public like count.

- **[Thinking Orbs launch](https://x.com/i/status/2079609095079047494): confirmed liked.** The post announces six types and credits collaboration with Alexandr Brinza. That is an older launch description; the current library advertises nine presets. This confirms the user's remembered reference.
- **[The Orb launch](https://x.com/i/status/1848255738977845415): confirmed liked.** The post describes a Realtime API voice experiment based on Bruno Simon's Organic Sphere. [The live project](https://theorb.boltai.com/) credits Daniel Nguyen and Bruno Simon. This is a useful lineage/design reference; a reusable repository and license were not established in this research. No API key was entered into its demo.
- **[Shader for Interfaces](https://x.com/jshguo/status/2094379172391211323): confirmed liked.** [Its repository](https://github.com/v2space-labs/shader-for-interfaces) is adjacent implementation inspiration, not a ready assistant orb selected for this project.

Some imported posts have placeholder timestamps and missing author handles. These findings establish saved membership, not when the user liked them. No bulk archive content is included here.

### Notion

A bounded search used eight terms: orb, shader, libraries.dev, Jakub, voice, visualizer, assistant and Antalik. No exact Libraries.dev save was confirmed. This is not proof that one does not exist; Notion tokenized some searches broadly.

- **[Audio Visualization Inspiration](https://app.notion.com/p/49e8e8f566c54bb7915abc06d31560ea)** under Senpai research saves **[Voice AI visual design by Gleb Kuznetsov / Milkinside](https://dribbble.com/shots/10164464-Voice-AI-visual-design)**, with an attached video. The creator describes a vehicle HMI voice project from 2016. Strong authored visual inspiration; no open-source implementation established.
- **[Theme Inspiration](https://app.notion.com/p/3d3edb27f12480179f9ff7ca604ab83c)** saves **[Shader Gradient](https://shadergradient.co/)** with an enthusiastic note about its fit for Repaint. Its [MIT React/Three.js source](https://github.com/ruucm/shadergradient) supports spheres and animation controls. It is a material/shape foundation; assistant state choreography would be additional work.
- **[Component Resources](https://app.notion.com/p/3cfedb27f124808d846ee8c44cc5d219)** saves React Bits and other UI libraries; an orb component was not specifically confirmed. **[Libraries for agents](https://app.notion.com/p/3cfedb27f12480988a38eb981070bb26)** saves vgpu, which also appears in Murmur's implementation.

Notion search used its UI because the connector's mandated search-routing tools were not callable. Relevant pages were then inspected with available reads. No Notion content was changed.

## Proposed adaptation after a visual choice

Keep the existing room-control architecture. Drive the selected renderer with a small interface: semantic phase, input level, output level, optional task activity, visibility and motion preference. No new voice provider or device control framework is needed.

| Assistant condition | Proposed visual behavior |
| --- | --- |
| Idle | Small, slow breathing or minimal presence; hide when no session needs attention. |
| Listening | Immediate input-level response with smoothing; motion draws inward. |
| Thinking or executing a command | Deliberate non-audio motion; remain visibly active during tool latency. |
| Speaking | Output-level response using the actual assistant audio envelope. |
| Completed or error | Brief, restrained acknowledgment; communicate actionable errors with concise text. |

These are proposed mappings, not behavior already shipped. Avoid a permanent wall of debugging information. Keep controls and text legible over both dark and bright content.

Measure audio envelopes on the laptop, where microphone and assistant audio already exist. Send only levels/state to the TV and interpolate locally. Current controller polling waits 500 ms between requests and has no amplitude telemetry; it is suitable for coarse state but would feel delayed for voice-reactive motion. A modest faster telemetry channel and a local draw loop are the relevant changes. Sending audio to the TV just to animate the orb is unnecessary.

For the first selected design, preserve source attribution, pin the upstream revision, bundle assets, and adapt one renderer. Compare full and reduced rendering quality over native YouTube and Xbox. Retune pixel ratio, effect bounds and particle/blur cost only when measurements justify it. The present TV client's lack of React is not a visual ceiling.

## Actual technical limits and open questions

- **Native transparency is established; these new renderers are not yet hardware-tested.** Canvas/WebGL context support, alpha correctness and frame timing need a short on-device check. WebGPU should not be required; use a supported fallback or port the design.
- **The app surface is 1080p.** Size, contrast and fine detail must work from across the room and in a camera recording. This does not prevent convincing shaders or a detailed localized effect.
- **Our shader cannot sample the underlying Xbox/YouTube pixels.** Internal lighting and simulated glass are feasible; literal refraction or distortion of the native video would require an additional image-access architecture. None of the recommended directions needs that to be compelling.
- **No frame-rate promise yet.** Bound the effect area and measure it. Starting with a 256–512-pixel render buffer and comparing 30/60 fps are candidate test settings, not measured hardware limits.
- **Renderer choice does not fix the observed webOS launch transition.** That lifecycle behavior is separate from steady-state visual fidelity.

These constraints come from the [existing graphics review](overlay-graphics.md) and current implementation. No architectural showstopper was identified for the recommended visual directions; Murmur's alpha path and the TV's actual WebGL support are the most concrete items to verify before committing to its renderer.

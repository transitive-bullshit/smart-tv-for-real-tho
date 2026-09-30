# Overlay graphics capabilities

Researched September 29, 2026 for LG 86UA8450PSA, webOS 25, firmware 33.31.61. This separates implementation, platform documentation and historical experiments. No exact-device graphics benchmark was performed during the research. The selected Canvas-based renderer is now built; [the roadmap](roadmap.md) prioritizes its native visual/performance check rather than a general shader exploration. Earlier TV-off notes are not a current blocker.

## What runs today

The TV client is a packaged web app. [Its manifest](../tv/display/appinfo.json) requests a transparent 1920×1080 web surface with the experimental `overlay` window type. The 0.0.4 build adds a local React bundle: Thinking Orbs' Canvas 2D engine draws the orb, and Voice Glow draws the restrained light using Canvas/SVG/CSS. HTML text and the authenticated feed client remain. No WebGL renderer is required by the selected design. See [visual lab implementation](visual-lab.md).

The approximately 750-pixel corner panel is a layout choice, not an API size cap. Transparent regions reveal the underlying native picture. Baseline overlay and in-place text updates have physical evidence; the 0.0.4 renderer is built and browser-checked but installation of that specific build is not confirmed in the evidence ledger. See [the evidence ledger](implementation-status.md).

Polling now waits 100 ms after each completed request. Existing laptop streams supply bounded amplitude telemetry at up to 10 Hz, with freshness checks; the TV animates locally. Actual TV frame timing and microphone-to-TV latency remain unmeasured.

## Supported platform and likely rendering options

LG maps webOS TV 25 to Chromium 120. LG no longer publishes comprehensive per-API tables for webOS 4 and newer, and explicitly cautions that platform-specific compatibility can differ from desktop Chrome. Engine version is therefore a useful baseline, not proof that a particular WebGL context or extension works on this exact TV. [LG engine specification](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine)

| Technique | What it can add | Evidence and qualification |
| --- | --- | --- |
| HTML/CSS/SVG | Animated typography, rings, grids, masks, transitions, translucent cards | Used in our implementation. Native text/transparency verified; new motion awaits installation. |
| Canvas 2D | Procedural trails, waveforms, particles, custom drawing | Standard web rendering approach; expected candidate on this engine, not yet exercised in our TV overlay. [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) |
| WebGL with GLSL | Custom vertex/fragment shaders, procedural glow/noise, energy fields, particles and lightweight 3D | WebGL is a canvas rendering API with shaders and alpha compositing. Context creation and shader execution must be checked on the actual TV. [WebGL specification](https://registry.khronos.org/webgl/specs/1.0/) |
| WebGL 2 | More modern graphics features and GLSL ES 3.00 | Do not require it before testing `getContext('webgl2')` and the features we use. Chromium version alone does not establish device support. [WebGL 2 specification](https://registry.khronos.org/webgl/specs/2.0/) |
| React | Component structure and state management around these renderers | Optional architectural choice; a bundled frontend can use normal web rendering. It neither provides shaders nor raises GPU limits. LG supports JavaScript-framework-based web apps. [LG web apps](https://webostv.developer.lge.com/discover) |
| WebGPU / compute shaders | Modern GPU compute/rendering | No LG support guarantee found. Exclude from this spike's baseline; Chromium version alone is insufficient because rollout depends on operating system and GPU. [Chrome WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview) |

## Meaningful limits

**Graphics resolution:** LG's public web-app contract supports 1920×1080 or 1280×720, explicitly excluding UHD web-app graphics. Our manifest already requests 1080p. LG separately lists UHD video playback at 3840×2160; video and app graphics have different limits. Do not infer a native 4K overlay from the panel's resolution or from rendering a larger offscreen texture. This statement concerns the supported web-app surface, not every possible private/root/native compositor path. [App metadata](https://webostv.developer.lge.com/develop/references/appinfo-json), [app versus video resolution](https://webostv.developer.lge.com/develop/specifications/app-resolution)

**Underlying pixels:** our current architecture receives device state, not an HDMI/YouTube video texture or screen capture. Its shaders can process graphics and textures owned by our app. They cannot implement actual distortion, refraction, colour sampling, object tracking or blur of the native picture without an additional image-access path. This is an architectural conclusion from the current implementation. CSS backdrop-filter applies inside the page's backdrop-root boundaries; it does not establish access to another app or hardware video plane. A translucent tint or simulated frosted surface is possible without claiming real background blur. [Backdrop-filter scope](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)

**Performance:** actual available GPU/CPU budget, shader precision, texture limits, extensions, alpha behavior and sustained frame timing are unmeasured. Neither 60 fps nor a particle count is currently defensible. Large transparent layers, expensive fragment shaders, repeated full-screen blur passes and large textures increase cost. Start with a small effect area, few draws and adjustable backing-buffer size. WebGL memory is not exposed as a simple portable VRAM limit. [Rendering guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

**Lifecycle:** richer graphics do not remove the observed app-launch loading screen or source-transition dismissal. We have no evidence that the startup interruption was caused by insufficient shader/GPU performance. Keep source restoration and graphics smoothness as separate test results. [Local physical evidence](overlay-experiment.md)

## Original graphics probe proposal (before design selection)

Keep HTML/SVG for legible text and controls, and add one transparent WebGL canvas for a distinctive energy orb or flowing particle field. Start around a 512×512 effect buffer, then adjust based on measured performance. Retain the existing SVG/static fallback. The 512 size and 30/60-fps comparison below are proposed test settings, not measured device limits.

Prepare one selectable graphics lab rather than separate manual checks: existing CSS/SVG; Canvas 2D particles; a simple WebGL shader; and a heavier shader at selectable buffer sizes. At initialization collect viewport/DPR, context creation results, actual alpha attributes, GLSL version, texture/renderbuffer limits, optional renderer information, supported extensions and shader compilation results. Record frame-time distributions under capped 30-fps and uncapped animation, plus context-loss events. Stop drawing when hidden and release resources on dismissal. These probes are proposed, not implemented by this research task.

Run the same batch above native YouTube and Xbox once the TV is available, recording visible background continuity and transparency separately from JavaScript frame timing. Compare simple and heavier effects before adopting a 3D framework or full-screen postprocessing. Successful laptop rendering is a development preview, not TV performance evidence. This is enough to establish whether the demo can use a detailed shader-driven assistant while keeping the current device-control architecture.

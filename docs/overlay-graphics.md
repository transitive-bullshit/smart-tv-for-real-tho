# Overlay graphics capabilities

Researched September 29, 2026 for LG 86UA8450PSA, webOS 25, firmware 33.31.61. This owns platform limits and historical alternatives. [Visual lab](visual-lab.md) owns the current renderer; [native evidence](implementation-status.md#native-animation-repair-and-live-mirror-october-2) records later device measurements; [the roadmap](roadmap.md#milestones-in-order) owns remaining acceptance.

## What runs today

The TV client is a packaged web app. [Its manifest](../tv/display/appinfo.json) requests a transparent 1920×1080 web surface with the experimental `overlay` window type. The selected renderer uses bundled React, Thinking Orbs Canvas 2D and Voice Glow Canvas/SVG/CSS. HTML text and the authenticated feed client remain. See [visual lab implementation](visual-lab.md#implementation) for rendering and telemetry behavior.

The corner panel size is a layout choice, not an API size cap. Transparent regions reveal the underlying native picture. Installation, native animation samples and remaining sustained checks are recorded in [the dated evidence](implementation-status.md#native-animation-repair-and-live-mirror-october-2).

## Supported platform and likely rendering options

LG maps webOS TV 25 to Chromium 120. LG no longer publishes comprehensive per-API tables for webOS 4 and newer, and explicitly cautions that platform-specific compatibility can differ from desktop Chrome. Engine version is therefore a useful baseline, not proof that a particular WebGL context or extension works on this exact TV. [LG engine specification](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine)

| Technique | What it can add | Evidence and qualification |
| --- | --- | --- |
| HTML/CSS/SVG | Animated typography, rings, grids, masks, transitions, translucent cards | Used in the installed renderer; [native evidence](implementation-status.md#native-animation-repair-and-live-mirror-october-2) distinguishes short checks from sustained acceptance. |
| Canvas 2D | Procedural trails, waveforms, particles, custom drawing | Used by the installed orb and glow; [native samples](implementation-status.md#native-animation-repair-and-live-mirror-october-2) are available. [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) |
| WebGL with GLSL | Custom vertex/fragment shaders, procedural glow/noise, energy fields, particles and lightweight 3D | WebGL is a canvas rendering API with shaders and alpha compositing. Context creation and shader execution must be checked on the actual TV. [WebGL specification](https://registry.khronos.org/webgl/specs/1.0/) |
| WebGL 2 | More modern graphics features and GLSL ES 3.00 | Do not require it before testing `getContext('webgl2')` and the features we use. Chromium version alone does not establish device support. [WebGL 2 specification](https://registry.khronos.org/webgl/specs/2.0/) |
| React | Component structure and state management around these renderers | Optional architectural choice; a bundled frontend can use normal web rendering. It neither provides shaders nor raises GPU limits. LG supports JavaScript-framework-based web apps. [LG web apps](https://webostv.developer.lge.com/discover) |
| WebGPU / compute shaders | Modern GPU compute/rendering | No LG support guarantee found. Exclude from this spike's baseline; Chromium version alone is insufficient because rollout depends on operating system and GPU. [Chrome WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview) |

## Meaningful limits

**Graphics resolution:** LG's public web-app contract supports 1920×1080 or 1280×720, explicitly excluding UHD web-app graphics. Our manifest already requests 1080p. LG separately lists UHD video playback at 3840×2160; video and app graphics have different limits. Do not infer a native 4K overlay from the panel's resolution or from rendering a larger offscreen texture. This statement concerns the supported web-app surface, not every possible private/root/native compositor path. [App metadata](https://webostv.developer.lge.com/develop/references/appinfo-json), [app versus video resolution](https://webostv.developer.lge.com/develop/specifications/app-resolution)

**Underlying pixels:** our current architecture receives device state, not an HDMI/YouTube video texture or screen capture. Its shaders can process graphics and textures owned by our app. They cannot implement actual distortion, refraction, colour sampling, object tracking or blur of the native picture without an additional image-access path. This is an architectural conclusion from the current implementation. CSS backdrop-filter applies inside the page's backdrop-root boundaries; it does not establish access to another app or hardware video plane. A translucent tint or simulated frosted surface is possible without claiming real background blur. [Backdrop-filter scope](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)

**Performance:** short native Canvas measurements are recorded in [the evidence ledger](implementation-status.md#native-animation-repair-and-live-mirror-october-2); sustained performance and a broader GPU/WebGL capability survey remain open. Those samples establish neither a general 60 fps promise nor a particle-count budget. Large transparent layers, expensive fragment shaders, repeated full-screen blur passes and large textures increase cost. Start with a small effect area, few draws and adjustable backing-buffer size. WebGL memory is not exposed as a simple portable VRAM limit. [Rendering guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

**Lifecycle:** richer graphics do not remove the observed app-launch loading screen or source-transition dismissal. We have no evidence that the startup interruption was caused by insufficient shader/GPU performance. Keep source restoration and graphics smoothness as separate test results. [Local physical evidence](overlay-experiment.md)

## Original graphics probe proposal (before design selection)

Keep HTML/SVG for legible text and controls, and add one transparent WebGL canvas for a distinctive energy orb or flowing particle field. Start around a 512×512 effect buffer, then adjust based on measured performance. Retain the existing SVG/static fallback. The 512 size and 30/60-fps comparison below are proposed test settings, not measured device limits.

Prepare one selectable graphics lab rather than separate manual checks: existing CSS/SVG; Canvas 2D particles; a simple WebGL shader; and a heavier shader at selectable buffer sizes. At initialization collect viewport/DPR, context creation results, actual alpha attributes, GLSL version, texture/renderbuffer limits, optional renderer information, supported extensions and shader compilation results. Record frame-time distributions under capped 30-fps and uncapped animation, plus context-loss events. Stop drawing when hidden and release resources on dismissal. These probes are proposed, not implemented by this research task.

Run the same batch above native YouTube and Xbox once the TV is available, recording visible background continuity and transparency separately from JavaScript frame timing. Compare simple and heavier effects before adopting a 3D framework or full-screen postprocessing. Successful laptop rendering is a development preview, not TV performance evidence. This is enough to establish whether the demo can use a detailed shader-driven assistant while keeping the current device-control architecture.

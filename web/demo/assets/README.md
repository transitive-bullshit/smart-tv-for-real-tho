# Demo artwork

This directory is intentionally small and self-contained. The public build imports only the four named image files. It does not contact the owner’s R2 bucket or ship the full private-use catalog.

| File | Origin |
| --- | --- |
| `evening-room.webp` | Generated with the built-in image generation tool for this project on October 2, 2026; converted to WebP, preserving its composition. A fictional architectural visualization, not a photograph of the owner’s home and not a Blender scene. |
| `pink-sculpture.jpg` | Owner-supplied earlier Midjourney image `3dd8c1a0-5137-4a27-9e47-09e5139673ad`, titled “The shape of possibility.” Exact original optimized JPEG; selected for the pink sculptural form after the owner requested replacing the golden cloud. |
| `quiet-shore.jpg` | Owner-supplied Midjourney image `d336599f-fd41-409e-9e38-44b4f28ec19a`, titled “The quiet shore.” Exact original optimized JPEG. |
| `cloud-workshop.jpg` | Owner-supplied Midjourney image `7597b2f3-ca48-47d9-8b39-a47590f3e4f6`, titled “The workshop above the clouds.” Exact original optimized JPEG. |

Source metadata and hashes are in [the native catalog](../../../tv/ambient-src/catalog.json) and [the second collection manifest](../../../docs/ambient-images-round-2.json). They are used as artwork for explicitly fictional music/game screens as well as ambient scenes; they are not game or music-video footage. Final public redistribution terms/attribution for the supplied artwork remain part of the release asset review. The code’s MIT license does not by itself resolve image provenance.

No audio recordings, third-party music, bundled synthesized voices or microphone capture are used in this demo.

## Room generation prompt

Built-in image generation, original asset (no reference images):

> Use case: ads-marketing. Create a premium photorealistic architectural visualization / Blender-quality rendered living room at blue hour for an interactive smart TV product landing page. Wide landscape 16:9 composition. Straight-on camera perfectly perpendicular to back wall, symmetrical central TV. One large ultra-thin dark television, precisely rectangular 16:9 black blank screen, roughly 50% of image width and centered horizontally, TV screen spans approximately x25% to75% and y24% to74%. TV mounted above a very low dark walnut media console. Charcoal textured plaster wall, warm amber practical lamp glow from left, small sculptural plant on right, linen lounge chair partly visible in lower left foreground, dark wood floor. Moody editorial interior, tasteful lived-in warmth, restrained Scandinavian/Japanese interior architecture, rich in real material detail, subtle golden reflected light around the TV, physically believable light and shadows. TV is the clear hero with no perspective skew on screen and no objects obscuring it. Leave its screen uniformly dark black with no images, reflections, text, icons or interface: live UI will be layered over this screen in the browser. No people, no logos, no lettering, no watermarks, no baked-in UI. Premium design magazine quality, cinematic but natural, a room somebody wants to be in. Save a local image asset for this project.

The generated screen bounds were fitted in CSS after inspection. The small favicon and wordmark are ordinary UI geometry.

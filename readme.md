# Smart TV, for real tho

A personal voice interface and ambient screen for the room: native LG YouTube, direct Xbox HDMI, room volume, conversational corrections and personal artwork. The goals are a polished filmed demo, ongoing use on the owner's real TV, and an open-source technical preview that another owner can reproduce. The laptop runs the controller; the TV continues using its native apps.

## Next milestones

Verify the selected Ember Thinking Orbs + restrained Voice Glow treatment on the real TV → prove the complete journeys and recovery → film after two clean rehearsals → prepare a reproducible open-source preview. The renderer already shares real voice/state wiring with the TV package; native appearance and performance still need validation.

[The roadmap](docs/roadmap.md) owns the prioritized checklist, pass criteria and decisions. [Distribution](docs/distribution.md) covers Developer Mode installation, renewal and the optional LG Store path. Public release preparation is planned; this is currently the owner’s working prototype.

For a concrete status assessment, the next 40–50-minute hands-on session and the launch story/video plan, start with [the launch checklist](docs/launch-plan.md).

## Try the fictional room

The cinematic landing page is at [`/demo/`](https://smart-tv-for-real-tho.localhost/demo/) when the controller is running. Try scripted requests, corrections, returning to a fictional game and the ambient screen. It reuses the actual Ember orb renderer and three bundled artworks, with no microphone, API calls or TV control. The public preview is intentionally separate from the operator UI and hardware evidence.

To run it without hardware, Python or API keys:

```sh
pnpm install --frozen-lockfile
pnpm demo
```

Open the printed URL, normally `http://127.0.0.1:3215/`. `pnpm build:demo` creates a self-contained static site in `build/site`; `pnpm demo:preview` serves that production artifact locally at `http://127.0.0.1:3216/`. Publish only that directory. Hosting, optional live-voice simulation and the hardware source release are separate next steps. See [demo artwork provenance](web/demo/assets/README.md).

## Run locally

Requires Node.js 24+, pnpm 12.5.1, and [uv](https://docs.astral.sh/uv/getting-started/installation/).

```sh
pnpm install --frozen-lockfile
pnpm bridge:sync
pnpm setup:check
pnpm dev
```

`pnpm dev` now watches backend TypeScript and `bridge/main.py`, restarting the controller when those files change. Keep this process in the user’s working Terminal so its network access is preserved. Backend reloads reset voice sessions and rotate the TV display token; reconnect voice and show the panel again afterward. Use `pnpm dev:stable` for rehearsals/filming when automatic restarts are undesirable. To request a restart without editing code, run `pnpm dev:restart` in this repository. It touches the watched server entry without changing its contents; it requires an already-running `pnpm dev` watcher and does not start a stopped server.

Open **[https://smart-tv-for-real-tho.localhost](https://smart-tv-for-real-tho.localhost)**. `pnpm dev` and `pnpm dev:stable` use the pinned [Portless](https://portless.sh/) dependency to assign the backend port and provide a stable HTTPS address. The terminal prints the actual URL, including any existing custom proxy port or worktree prefix. Portless may request local certificate trust/admin access on first use. The Node server, Vite UI and long-lived Python bridge start together. Controls bind only to loopback. The display view at /display is a laptop preview, not an installed TV overlay.

For direct-port troubleshooting, `PORTLESS=0 pnpm dev` bypasses the proxy and uses `PORT` (default 3210). Do not run two controllers at once: they share device sessions and the TV feed. Browser-only preferences and rehearsal notes belong to their original origin; the first switch from localhost:3210 creates a separate browser store. Saved device pairings, API keys and TV appearance remain in `.local`.

The app starts in **Live device mode**. Unavailable hardware produces a failure; it never silently falls back to simulation. The setup mode selector enables explicit simulation for local development. Real search still requires a YouTube API key in simulation.

## First connection

1. **LG:** enter the TV's IPv4 address in Room setup, click Pair / reconnect LG, and accept the TV prompt. The discovered catalog supplies the YouTube app and HDMI IDs. Check that the Xbox input is HDMI 3, then save the room.
2. **YouTube:** manually open the native LG app, select the intended profile, open Settings → Link with TV code, and enter that code in setup. Known-video diagnostics work without a search API key.
3. **Xbox:** enable Remote features in Retail Mode; start Microsoft sign-in in setup, complete the browser flow, then load consoles. Select the console and load games again. Choose an installed game and save.
4. **API keys:** enter OpenAI and YouTube Data API keys in the local setup form, or provide OPENAI_API_KEY and YOUTUBE_API_KEY through an ignored .env. The OpenAI model defaults to gpt-realtime-2.1 and can be changed using OPENAI_REALTIME_MODEL. Public YouTube search needs an API key with YouTube Data API v3 enabled.
5. **Voice:** use independent laptop speakers/microphone, connect voice and hold the Talk button. Open-mic mode is opt-in and must be tested with room audio.

No developer mode is needed for these controls. See [room facts](docs/room.md) and the [hardware runbook](docs/runbook.md).

## Demo build

The controller includes live voice, an always-present TV panel reference, native frame-rate reporting and seven rehearsal journeys. **Panel 0.0.5 is installed**; short TV measurements span 25–50 fps. Use [the visual lab](docs/visual-lab.md) to customize Ember and [the session guide](docs/demo-session.md) for remaining voice/source and sustained checks. Keep unattended tests at volume zero.

## Personal ambient screen

**Automatic ambient activation is required scope for the demo and daily use.** An opt-in laptop watcher now waits for LG’s actual `Screen Saver` signal after observing Home, then rechecks and opens Room Ambient. Keep the Mac awake and controller running. Two ten-minute Home → idle → ambient cycles are recorded, and the owner confirms seeing Room Ambient open automatically and remain visible. See [scope and acceptance](docs/ambient-screensaver.md#scope-and-acceptance).

Open [the ambient lab](https://smart-tv-for-real-tho.localhost/ambient/?preview=1) to explore the supplied wallpapers with focal-point motion and cover framing. **Room Ambient 0.0.9** loads 52 scenes from content-addressed R2 URLs: the original 15 plus all 37 supplied second-round Midjourney JPEGs, uploaded without resizing or recompression. The full collection is browser-verified; 0.0.9 is installed and reopened on the TV, with fresh API confirmation of the ambient app foreground. The new images await physical picture confirmation. Only the structured catalog is tracked. It prefetches 12 scenes ahead, caches at most 16 compressed images / 32 MiB, and keeps current/next decoded; failed downloads retry then silently skip. See [storage and upload instructions](docs/ambient-screensaver.md#r2-storage-and-prefetch-007). Each image plays once per shuffled round, with at least five intervening scenes before any repeat across rounds. The earlier 15-scene collection is verified by the user on the live TV, alongside the slideshow, transitions, persistent scene titles and focal-point control. Back closes settings first, then exits directly without the system prompt; both steps are user-verified on the TV. The rendered film direction has been removed. The private guard preference is now remembered on the TV, controller launches preserve it, and diagnostics retain idle counts across hide/show. The owner reports several hours without clock takeover with the guard enabled; this remains a foreground app, not LG's global idle provider.

The user verified that the guard remains checked after reopening 0.0.8 and reports several hours of advancing photos with no clock takeover. Exact duration and veto count were not measured. Automatic entry now has positive physical feedback and two corroborating log sequences; repeated visual checks and everyday recovery remain open.

[Feasibility, implementation and live checks](docs/ambient-screensaver.md). Build the installable package with `pnpm tv:package-ambient`. After TV client edits, run `pnpm build:ambient` and reload the browser preview; Vite does not need restarting. The TV itself requires a package update through the controller.

## Development checks

```sh
pnpm test
pnpm build
pnpm setup:check
pnpm timings
```

Tests include format, lint, TypeScript, coordinator behavior and Python bridge regression checks. CI installs both locked environments and builds the browser app. No device credentials are required by automated tests.

The app uses TypeScript/ESM, React/Vite, ky, zod, p-map, the shared Oxlint/Oxfmt presets, and a stdio Python bridge using aiowebostv, pyytlounge and python-xbox. Python dependencies are pinned by bridge/uv.lock. No separate bridge service port is exposed; Xbox OAuth temporarily uses localhost:8080.

## Local data and recovery

.local contains config.json, pairings, OAuth credentials and trace.jsonl; it is ignored by Git. Credentials are written with owner-only permissions. No keys are sent to the browser or included in traces. Search queries/video selections are part of the demo's local operational context.

Restart with pnpm dev to reconnect saved LG/Xbox configuration. YouTube refreshes its saved receiver authorization when a playback sequence or Reconnect receiver requests it. If pairing was revoked, reconnect through setup. To reset one pairing, stop the app and remove only its .local/lg.json, youtube.json or xbox.json, then pair again. Deleting config.json resets room mappings; it is not needed to rotate an API key.

Commands already delivered to a vendor cannot be recalled. Cancellation prevents remaining older actions from running; a final source/state check detects a mismatch. Ads, CEC changes, prompts and game loading still require physical verification.

## Project context

- [Roadmap](docs/roadmap.md): next milestones, pass criteria and open decisions.
- [Launch plan](docs/launch-plan.md): current readiness, next joint test session, public demo and video assets.
- [Implementation plan](docs/implementation-plan.md): architecture, scope and implementation boundaries.
- [Distribution](docs/distribution.md): technical preview packaging and optional LG Store requirements.
- [Current status](docs/implementation-status.md): evidence, limitations and next steps.
- [Hardware runbook](docs/runbook.md): probes, recovery, timing and filming.
- [Native overlay experiment](docs/overlay-experiment.md): `pnpm tv:package`, Developer Mode setup and the static compatibility probe.
- [Overlay graphics](docs/overlay-graphics.md) and [assistant visual references](docs/assistant-visual-references.md): rendering limits, selected design libraries and historical alternatives.
- [Journeys](docs/journeys.md) and [feasibility research](docs/feasibility.md).
- [Agent guidance](AGENTS.md).

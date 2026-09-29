# Smart TV, for real tho

A personal voice interface for the room: native LG YouTube, direct Xbox HDMI, room volume, and conversational corrections. The laptop runs the controller; the TV continues using its native apps.

## Run locally

Requires Node.js 24+, pnpm 12.5.1, and [uv](https://docs.astral.sh/uv/getting-started/installation/).

```sh
pnpm install --frozen-lockfile
pnpm bridge:sync
pnpm setup:check
pnpm dev
```

`pnpm dev` now watches backend TypeScript and `bridge/main.py`, restarting the controller when those files change. Keep this process in the user’s working Terminal so its network access is preserved. Backend reloads reset voice sessions and rotate the TV display token; reconnect voice and show the panel again afterward. Use `pnpm dev:stable` for rehearsals/filming when automatic restarts are undesirable. To request a restart without editing code, run `pnpm dev:restart` in this repository. It touches the watched server entry without changing its contents; it requires an already-running `pnpm dev` watcher and does not start a stopped server.

Open **http://localhost:3210**. The Node server, Vite UI and long-lived Python bridge start together. Controls bind only to loopback. The display view at /display is a laptop preview, not an installed TV overlay.

The app starts in **Live device mode**. Unavailable hardware produces a failure; it never silently falls back to simulation. The setup mode selector enables explicit simulation for local development. Real search still requires a YouTube API key in simulation.

## First connection

1. **LG:** enter the TV's IPv4 address in Room setup, click Pair / reconnect LG, and accept the TV prompt. The discovered catalog supplies the YouTube app and HDMI IDs. Check that the Xbox input is HDMI 3, then save the room.
2. **YouTube:** manually open the native LG app, select the intended profile, open Settings → Link with TV code, and enter that code in setup. Known-video diagnostics work without a search API key.
3. **Xbox:** enable Remote features in Retail Mode; start Microsoft sign-in in setup, complete the browser flow, then load consoles. Select the console and load games again. Choose an installed game and save.
4. **API keys:** enter OpenAI and YouTube Data API keys in the local setup form, or provide OPENAI_API_KEY and YOUTUBE_API_KEY through an ignored .env. The OpenAI model defaults to gpt-realtime-2.1 and can be changed using OPENAI_REALTIME_MODEL. Public YouTube search needs an API key with YouTube Data API v3 enabled.
5. **Voice:** use independent laptop speakers/microphone, connect voice and hold the Talk button. Open-mic mode is opt-in and must be tested with room audio.

No developer mode is needed for these controls. See [room facts](docs/room.md) and the [hardware runbook](docs/runbook.md).

## Demo build

The controller now includes **Start demo session**, a native Thinking Orbs + Voice Glow HUD with full/subtle/static motion, source-transition restoration, and six full rehearsal journeys with local notes/export. Open [the visual lab](http://localhost:3210/hud/?preview=1) to inspect the actual TV client without changing the TV.

Native YouTube, Xbox Hades, spoken playback, seeking and baseline overlay coexistence have user-confirmed evidence. The new animated package is built as version 0.0.4; installation currently awaits a reachable TV Developer Mode connection. Use the controller's **Install TV update** action once available. New native animation/restoration, extended playback settings and complete rehearsals will be tested together, per the user's request. No physical performance or recording success is inferred from a browser preview.

Explore nine orb patterns, four design directions, state mappings and restrained audio glow in [the visual lab](http://localhost:3210/hud/?preview=1). [Visual lab usage and implementation](docs/visual-lab.md) explains local choices, real voice levels and saving a look for the TV.

Read [one-session testing and filming](docs/demo-session.md), [the agent tool inventory](docs/agent-tools.md), and [implementation status](docs/implementation-status.md). Keep unattended tests at volume zero.

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

- [Implementation plan](docs/implementation-plan.md): full objective, ordered work and live-device gates.
- [Current status](docs/implementation-status.md): evidence, limitations and next steps.
- [Hardware runbook](docs/runbook.md): probes, recovery, timing and filming.
- [Native overlay experiment](docs/overlay-experiment.md): `pnpm tv:package`, Developer Mode setup and the static compatibility probe.
- [Overlay graphics](docs/overlay-graphics.md) and [assistant visual references](docs/assistant-visual-references.md): rendering limits, designer-built orbs and proposed adaptation.
- [Journeys](docs/journeys.md) and [feasibility research](docs/feasibility.md).
- [Agent guidance](AGENTS.md).

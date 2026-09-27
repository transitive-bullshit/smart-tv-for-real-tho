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

Open **http://localhost:3210**. The Node server, Vite UI and long-lived Python bridge start together. Controls bind only to loopback. The display view at /display is a laptop preview, not an installed TV overlay.

The app starts in **Live device mode**. Unavailable hardware produces a failure; it never silently falls back to simulation. The setup mode selector enables explicit simulation for local development. Real search still requires a YouTube API key in simulation.

## First connection

1. **LG:** enter the TV's IPv4 address in Room setup, click Pair / reconnect LG, and accept the TV prompt. The discovered catalog supplies the YouTube app and HDMI IDs. Check that the Xbox input is HDMI 3, then save the room.
2. **YouTube:** manually open the native LG app, select the intended profile, open Settings → Link with TV code, and enter that code in setup. Known-video diagnostics work without a search API key.
3. **Xbox:** enable Remote features in Retail Mode; start Microsoft sign-in in setup, complete the browser flow, then load consoles. Select the console and load games again. Choose an installed game and save.
4. **API keys:** enter OpenAI and YouTube Data API keys in the local setup form, or provide OPENAI_API_KEY and YOUTUBE_API_KEY through an ignored .env. The OpenAI model defaults to gpt-realtime-2.1 and can be changed using OPENAI_REALTIME_MODEL. Public YouTube search needs an API key with YouTube Data API v3 enabled.
5. **Voice:** use independent laptop speakers/microphone, connect voice and hold the Talk button. Open-mic mode is opt-in and must be tested with room audio.

No developer mode is needed for these controls. See [room facts](docs/room.md) and the [hardware runbook](docs/runbook.md).

## Current evidence

Native LG YouTube playback, replacement, pause/resume and Hades activation have user-confirmed physical results. LG app/input/volume/ARC observations, saved bridge pairings, Xbox discovery and installed-app catalog reads work. Real YouTube search found two new songs, retained the artist during correction, and their playback was observed in the native receiver. Chrome established an actual OpenAI Realtime WebRTC connection in push-to-talk mode; no speech was sent during that connection check.

The Xbox can report a successful launch operation while withholding its foreground title. The updated controller distinguishes that accepted command from an observed active title. **Keep TV volume at 0 during current testing.** Physical timing, cold-app/full-controller restart checks, complete spoken journeys, room acoustics and filming remain pending. The static TV overlay probe packages locally but has not been installed or verified on the TV. See [implementation status](docs/implementation-status.md) for exact evidence and remaining gates; no complete P1–P5 gate is claimed.

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
- [Journeys](docs/journeys.md) and [feasibility research](docs/feasibility.md).
- [Agent guidance](AGENTS.md).

# Smart TV, for real tho

A personal voice interface for an LG webOS TV and Xbox Series X: launch a game, adjust the room, ask for a music video, correct the song naturally, and return to Xbox.

The intended deliverable is a filmed demonstration using the actual devices and their native apps. The laptop hosts the controller. A real on-TV visual layer is a separate feasibility experiment.

## Status

Repository preparation only. TypeScript tooling and research are in place; application behavior, device adapters and live API integrations have not been implemented or tested. `src/index.ts` is an empty module that keeps the initial TypeScript project valid.

## Development

Use Node.js 24 or newer and the pnpm version pinned in `package.json`.

```sh
pnpm install
pnpm test
```

`pnpm test` checks formatting, lint and TypeScript. `pnpm fix` applies formatting and lint fixes. The same checks are configured in GitHub Actions for a future remote. No API keys or devices are required for these scaffold checks.

Tooling follows the owner's TypeScript template and shared `@fisch0920/config` presets. ky, zod and p-map are available for future implementation. Meaningful behavior tests and application dependencies should arrive with the features they verify or support.

## Project context

- [Implementation plan](docs/implementation-plan.md): architecture direction, user setup, work packages and live-device gates.
- [User journeys](docs/journeys.md): the concrete demo and what each integration needs to prove.
- [Feasibility research](docs/feasibility.md): cited platform capabilities, alternatives and remaining unknowns.
- [Agent guidance](AGENTS.md): a brief entry point for future agents.

The TypeScript application may use a small Python device bridge if the researched libraries make that the shortest reliable hardware path. That choice remains part of the future spike; no Python environment is scaffolded yet.

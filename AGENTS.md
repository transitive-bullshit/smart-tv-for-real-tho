# Smart TV, for real tho

A personal voice interface for an LG webOS TV and Xbox Series X. The goal is a compelling live-device demo; see [README](readme.md) for current repository status.

Use pnpm, modern TypeScript and ESM. Follow the checked-in scripts and shared Oxlint/Oxfmt configuration. Prefer ky for HTTP, zod for external data validation, and p-map for bounded concurrency across independent operations.

Read only the docs relevant to the task:

- Before implementation, architecture changes or device-bridge work: [implementation plan](docs/implementation-plan.md).
- Before changing demo behavior or acceptance criteria: [user journeys](docs/journeys.md).
- For device capabilities, overlays or alternative approaches: [feasibility research](docs/feasibility.md) and its sources.

Keep documentation links relative and distinguish proposed, implemented and hardware-verified behavior. Device pairings, account tokens and API keys belong in ignored local configuration.

# Smart TV, for real tho

A personal voice interface and ambient screen for an LG webOS TV and Xbox Series X. Goals include a polished live-device demo, ongoing use on the owner's TV, and an open-source preview that technical owners can reproduce; see [README](readme.md) for current status.

Use pnpm, modern TypeScript and ESM. Follow the checked-in scripts and shared Oxlint/Oxfmt configuration. Prefer ky for HTTP, zod for external data validation, and p-map for bounded concurrency across independent operations.

Read only the docs relevant to the task:

- Before prioritizing work or planning a release: [ordered milestones](docs/roadmap.md#milestones-in-order) and [launch readiness](docs/launch-plan.md#where-we-are).
- Before implementation or architecture changes: start with the [task-to-source map](docs/implementation-plan.md#task-to-source-map), then read the relevant architecture section.
- Before changing a UI surface or TV client: use the [route and build map](docs/implementation-plan.md#ui-surfaces-and-update-lifecycle); [visual lab](docs/visual-lab.md) owns the selected appearance and live-mirror behavior.
- Before changing demo behavior or acceptance criteria: [user journeys](docs/journeys.md).
- Before live-device testing, backend restarts or TV installation: read the runbook's [active constraint](docs/runbook.md#active-testing-constraint), [reloads](docs/runbook.md#development-server-reloads) and [recovery](docs/runbook.md#recovery). For a joint test session, use [the combined checklist](docs/demo-session.md#one-combined-validation-session).
- For ambient activation, idle behavior or daily-use reliability: [scope and acceptance](docs/ambient-screensaver.md#scope-and-acceptance) and [automatic activation](docs/ambient-screensaver.md#automatic-activation).
- Before importing artwork or changing storage: [artwork import and storage](docs/ambient-screensaver.md#artwork-import-and-storage).
- For physical-verification claims: use the [evidence index](docs/implementation-status.md#evidence-index) to reach the dated result; keep current priorities in the roadmap.
- For device capabilities or alternative approaches: [historical feasibility research](docs/feasibility.md) and [graphics limits](docs/overlay-graphics.md#meaningful-limits), with their sources.

Keep documentation links relative and distinguish proposed, implemented and hardware-verified behavior. Device pairings, account tokens and API keys belong in ignored local configuration.

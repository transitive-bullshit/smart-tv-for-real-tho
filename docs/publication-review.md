# MVP publication review

October 18, 2026. The owner selected the existing interactive room as the public preview. The real controller stays local. The project ships as an experimental personal project, with broader hardware acceptance and independent installation deferred.

## Review these

- [Live website and interactive room](https://smart-tv-for-real-tho.vercel.app/).
- [Visitor README](../readme.md) and [fresh preview screenshots](launch-media/README.md).
- [Minimal finish line and separate manual video](launch-plan.md#the-mvp-finish-line).

The website is deployed to Vercel's default URL and reached `READY`. Anonymous requests return 200 for the page, sharing image, credits, robots and sitemap; `/api/status`, `/.env` and `/.local/config.json` return 404. No custom domain, hosted controller or public AI service is required.

## Verification

- A fresh checkout of the starting source passed strict frozen pnpm installation, locked Python sync, all checks and both browser builds without local device configuration.
- The final preparation tree passed formatting, lint, TypeScript, 93 TypeScript tests, 24 Python tests, the controller/TV builds and `build:demo`. Local Node was 25.9.0; exact Node 24 execution was not repeated locally.
- Browser checks covered desktop and 390-pixel mobile layout, scripted requests, request replacement, focus view, artwork switching and reduced-motion styles. Screenshots retain simulation labels; no hardware performance is inferred.
- GitHub Actions on the starting head did not start: the account's Actions budget is exhausted. This remains **blocked**, not a passing hosted check. [Run](https://github.com/transitive-bullshit/smart-tv-for-real-tho/actions/runs/38920459265).
- The scoped read-only Codex review completed successfully and found one P2: the build-only credits file was linked during development. The link is now limited to production builds; its production URL is anonymously verified. Affected checks pass after that fix. No repeat review is required.

## Source and media

The reachable-history scan covered 475 text blobs and known credential patterns, including API tokens, JWTs, private-key blocks and quoted credential literals. It found no matches. Historical filenames contained no real `.env`, pairing or `.local` files. Nine binary blobs were outside that text scan; this is a bounded review, not proof that every possible secret format is absent. Vercel's upload manifest also excluded local keys and device state.

The static build now distributes the bundled MIT dependency notices. Project-supplied artwork has a [provenance record and separate reuse terms](../web/demo/assets/README.md). The native ambient catalog still uses the owner's public image service; portability is documented rather than promised.

The old two visual-lab MP3s were made with macOS System Voices. Apple's [macOS Tahoe license, section 2F](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf) restricts publishing that output. They have been replaced with locally generated Kokoro samples; [provenance, upstream licenses and regeneration instructions](../tv/visuals/audio/README.md) are checked in. No paid API or runtime dependency was added.

Deleting current files does not remove old copies from Git history. The proposed publication cleanup removes **only these two obsolete blobs** from reachable source history:

```text
b5702c9f3c8647f56c5cf62f8f87fc5185661ff2  old request.mp3
092aa8b3398bed444bf5d42b03522fa205624c91  old reply.mp3
```

An isolated cleaned-history candidate is prepared before the owner gate. Its final file tree must match the reviewed tree exactly, both old blobs must be absent from its reachable objects, and the original private history remains unchanged until approval. Publishing it rewrites affected commit IDs. GitHub currently has one branch, `main`, and no tags; recheck that scope before updating it with an explicit lease. Do not push unrelated local Codex snapshot refs.

## The one owner gate

Approve the public presentation, the two-blob history cleanup and making the GitHub repository public. After approval, the agent applies the reviewed cleanup, verifies the resulting source tree and remote refs, changes visibility, adds working GitHub links to the site, redeploys, and checks anonymous access. Preserve the blocked Actions status until hosted checks actually run.

The owner separately records a quick real-TV demo: one request, one correction, return to Xbox, optional ambient cutaway. Keep setup/account screens out of the shot and label any compressed wait. This is the only remaining manual creative work; expanded reliability, store distribution and a larger release package are deferred.

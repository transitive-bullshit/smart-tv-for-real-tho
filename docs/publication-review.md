# MVP publication review

October 18, 2026. The owner selected the existing interactive room as the public preview. The real controller stays local. The project ships as an experimental personal project, with broader hardware acceptance and independent installation deferred.

## Published

- [Live website and interactive room](https://smart-tv-for-real-tho.vercel.app/), with GitHub and X footer links.
- [Public GitHub repository](https://github.com/transitive-bullshit/smart-tv-for-real-tho).
- [Visitor README](../readme.md) and [fresh preview screenshots](launch-media/README.md).
- [Minimal finish line and separate manual video](launch-plan.md#the-mvp-finish-line).

The website is deployed to Vercel's default URL and reached `READY`. Anonymous requests return 200 for the page, sharing image, dependency notices, robots and sitemap; `/api/status`, `/.env` and `/.local/config.json` return 404. No custom domain, hosted controller or public AI service is required.

## Verification

- A fresh checkout of the starting source passed strict frozen pnpm installation, locked Python sync, all checks and both browser builds without local device configuration.
- The initial preparation tree passed formatting, lint, TypeScript, 93 TypeScript tests, 24 Python tests, the controller/TV builds and `build:demo` on local Node 25.9.0. Before history cleanup, `9171c97` included separate ambient-recovery fixes; its hosted Node 24 run passed 101 TypeScript and 24 Python tests, format/lint/types, strict frozen installation, locked Python sync, and both builds. Its cleaned counterpart has the same file tree. This [successful historical CI run](https://github.com/transitive-bullshit/smart-tv-for-real-tho/actions/runs/39138140124) is not a CI result for the final documentation commit; publication proceeds without waiting for that run at the owner's request.
- Browser checks covered desktop and 390-pixel mobile layout, scripted requests, request replacement, focus view, artwork switching and reduced-motion styles. Screenshots retain simulation labels; no hardware performance is inferred.
- The early preparation run did not start because the Actions budget was exhausted. That historical run remains blocked, not green; later hosted CI ran successfully as recorded above. [Historical blocked run](https://github.com/transitive-bullshit/smart-tv-for-real-tho/actions/runs/38920459265).
- The scoped read-only Codex review found one P2: a build-only credits file was linked during development. The visible credits link was subsequently removed; bundled dependency notices remain distributed. The later public site also includes GitHub/X links. No repeat review was required.

## Source and media

The reachable-history scan covered 475 text blobs and known credential patterns, including API tokens, JWTs, private-key blocks and quoted credential literals. It found no matches. Historical filenames contained no real `.env`, pairing or `.local` files. Nine binary blobs were outside that text scan; this is a bounded review, not proof that every possible secret format is absent. Vercel's upload manifest also excluded local keys and device state.

The static build now distributes the bundled MIT dependency notices. Project-supplied artwork has a [provenance record and separate reuse terms](../web/demo/assets/README.md). The native ambient catalog still uses the owner's public image service; portability is documented rather than promised.

The old two visual-lab MP3s were made with macOS System Voices. Apple's [macOS Tahoe license, section 2F](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf) restricts publishing that output. They have been replaced with locally generated Kokoro samples; [provenance, upstream licenses and regeneration instructions](../tv/visuals/audio/README.md) are checked in. No paid API or runtime dependency was added.

Deleting current files does not remove old copies from Git history. The owner authorized cleanup, including force push, of **only these two obsolete blobs** from normal branch/tag source history:

```text
b5702c9f3c8647f56c5cf62f8f87fc5185661ff2  old request.mp3
092aa8b3398bed444bf5d42b03522fa205624c91  old reply.mp3
```

The cleanup rewrote 10 of the 59 existing public-source commits. All 59 were checked: only four historical trees changed, solely by removing the two approved blobs; messages, authors, dates and parent topology were preserved. One old merge signature was removed by the rewrite. Both branch-tip file trees matched their originals exactly before this documentation update, preserving the later ambient fixes. The obsolete blobs are absent from the cleaned candidate's reachable history and object store; Git object integrity also passed.

The cleaned source snapshot on `main` is `42aba54b71b156323b5bdd66fa3528efd811b9b4`, followed by this documentation commit. The cleaned `codex/mvp-publication` tip is `934014ca27590259c1ed5870e6fbbf6d2251653a`. Both public branches are updated with explicit leases and an atomic force push; there are no public tags. A private backup is retained in ignored local storage. Unrelated local Codex snapshot refs are outside the push scope.

GitHub also retains PR #1's read-only `refs/pull/1/head` reference. Normal branch/tag cleanup does not establish removal from every GitHub PR reference or cache. GitHub documents these [history-rewrite limits](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository); do not describe this operation as a complete GitHub purge.

## Remaining work

Repository visibility is already public and the approved branch-history cleanup is complete. No visibility or cleanup approval gate remains. GitHub's retained PR reference and caches are outside the branch rewrite; this report does not claim a complete GitHub purge.

The owner separately records a quick real-TV demo: one request, one correction, return to Xbox, optional ambient cutaway. Keep setup/account screens out of the shot and label any compressed wait. This is the only remaining manual creative work; expanded reliability, store distribution and a larger release package are deferred.

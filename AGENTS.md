# Agent guidance

This file describes the project structure and key conventions for AI agents working in this repository.

## Overview

A GitHub Action compiled to a self-contained bundle (`dist/index.js`) via `esbuild`. Source is split across focused modules under `src/`. There are no tests and no CI workflow — the only build artifact that matters is `dist/index.js`.

## Essential rules

- **Always rebuild after editing source.** Run `npm run build` after any change under `src/`. The action runner executes `dist/index.js` — not the TypeScript source. Forgetting to rebuild means your changes have no effect.
- **Commit `dist/index.js` with source changes.** Both must be committed together.
- **Do not add a test suite without being asked.** There are currently no tests; do not scaffold one speculatively.
- **Do not add a CI workflow without being asked.** The `.github/workflows/` directory was intentionally removed.
- **Use arrow functions.** All exported and internal functions are arrow functions (`const foo = () => {}`). Do not introduce `function` declarations.
- **No `.js` extensions in imports.** The project uses CommonJS + ncc; extension-less relative imports are correct.
- **One function per file.** Each utility file exports exactly one function. Do not add a second export to an existing file — create a new one instead.

## Architecture

| File                                               | Purpose                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/index.ts`                                     | Entry point — `run()` orchestrates the full import flow                  |
| `src/utils/appstoreconnect/fetchVersionStrings.ts` | Fetches version strings for a set of build IDs via `buildsGetCollection` |
| `src/utils/appstoreconnect/downloadImage.ts`       | Downloads a screenshot image from an Apple-signed URL                    |
| `src/utils/github/issueExistsForFeedback.ts`       | Paginates issues by label to check for an existing feedback marker       |
| `src/utils/github/ensureLabelExists.ts`            | Creates a label if it does not already exist                             |
| `src/utils/github/uploadImageToGitHub.ts`          | Uploads an image buffer to the GitHub CDN via the issues assets endpoint |
| `src/utils/format/feedbackBody.ts`                 | Builds the markdown body for a new issue                                 |
| `src/utils/format/buildIncludedMap.ts`             | Indexes an SDK `included` array by resource ID                           |
| `src/utils/format/testerDisplayName.ts`            | Formats a tester's display name from `BetaTester` attributes             |
| `src/utils/format/buildVersion.ts`                 | Formats `versionString (buildNumber)` from `Build` attributes            |

All App Store Connect API calls go through `appstore-connect-sdk`. The SDK's `createClient` handles ES256 JWT generation and caching internally — there is no manual token management in this project.

## Key behaviours to preserve

- **Deduplication** is done by embedding `<!-- testflight-id:<id> -->` in the issue body and paginating existing issues (filtered by label) via `listForRepo` to check for the marker before creating a new issue. Do not change this marker format without updating the check in `issueExistsForFeedback`. The GitHub token requires `Issues: Read` permission for this check to work.
- **Cutoff filtering** is performed client-side after fetching (ASC does not support date filtering on these endpoints). Items older than `days_back` are skipped before the dedup check.
- **Dry run** (`dry_run: 'true'`) must never create issues or labels — gate all write calls behind `if (!dryRun)`.

## Inputs

ASC-related inputs are prefixed with `asc_`: `asc_issuer_id`, `asc_key_id`, `asc_private_key`, `asc_bundle_id`. Non-ASC inputs (`github_token`, `days_back`, `labels_feedback`, `labels_crashes`, `dry_run`, `import_crashes`) have no prefix.

`labels_feedback` and `labels_crashes` both accept a comma-separated list; the action parses, trims, and filters them before use.

`import_crashes: 'false'` skips the entire crash path — no fetch, no version string lookup, no label creation, no issue creation.

## Dependencies

| Package                | Why                                                         |
| ---------------------- | ----------------------------------------------------------- |
| `@actions/core`        | Inputs, outputs, logging, `setFailed`                       |
| `@actions/github`      | Octokit client and `context.repo`                           |
| `appstore-connect-sdk` | Type-safe ASC API client; handles ES256 JWT auth via `jose` |

Do not add new runtime dependencies without a strong reason — `ncc` bundles everything and larger bundles slow cold starts.

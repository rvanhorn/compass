---
title: JavaScript and TypeScript modules
description: Runtime boundaries, module format, names, source organization, file splitting, asynchronous behavior, tests, and the verification table for authored JavaScript and TypeScript.
generated: { by: claude-fable-5-1, at: "2026-10-10T01:00-0700" }
paths:
  - "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"
---

# JavaScript modules

Vanilla JavaScript and the runtime's native APIs by default. A UI framework comes in only when the project selects one; a bundler, linter, or CSS framework does not require one. Semantic HTML and native controls before a custom widget. Tooling stays proportional to the distribution: a browser app can ship native modules with no bundler; a single-file distribution needs a build.

## Runtime and modules

- `package.json` is the source of truth for scripts, module format, exports, and runtime requirements.
- ES modules for new code. Keep the module format an existing project declares. Do not mix ESM and CommonJS without an explicit interop boundary and a test that covers it.
- Select syntax and APIs against the declared browser and runtime targets. Syntax transformation does not supply a missing runtime API; add a polyfill only when a supported target needs it.
- Keep runtime adapters at the boundary. A browser bundle does not depend on Node-only APIs, process state, or the filesystem. A shared module does not import a server-only or UI-only implementation.

## Names

- Full words: `event`, `element`, `response`, `configuration`, not `e`, `el`, `res`, `cfg`. Established domain terms such as `id` and `url` stay.
- A function is named for its action and subject (`loadCatalog`, `savePreferences`); a boolean is a predicate (`isLoading`, `hasSelection`, `canSave`); a unit is visible where it matters (`timeoutMilliseconds`).
- A file is named for the responsibility it owns, not `helpers.js`. Follow the project's filename case.
- `const` unless reassigned; strict equality; explicit conversion at data boundaries; `??` only when `null` and `undefined` alone mean missing, so a valid `0`, `false`, or empty string survives.
- Split a nested ternary, a compressed statement, or a callback that mixes unrelated actions. Keep transformations separate from I/O and DOM changes; make side effects visible at their owner; no hidden global state.
- A mechanical naming or style preference goes in the linter or formatter config, not here.

## Comments and types

- Do not leave your own commented-out code behind (a comment a person wrote stays; `code-comments.md`). JSDoc when a public function's signature does not make its data shape, return value, side effect, or error contract clear, kept accurate when the implementation changes; no boilerplate on every function.
- JavaScript type checking when the project adopts it. JSDoc types do not require converting the project to TypeScript.

## Source organization

- The entry point owns initialization, composition, and lifecycle, and composes modules explicitly; nothing starts through an import side effect. Intentional CSS imports and platform setup imports are the exception, with their order kept explicit where it matters.
- Business logic, data access, state, features, views, components, styles, and utilities get modules with clear ownership when the project needs those boundaries. The project chooses the directory names; no directory exists only to satisfy a taxonomy.
- Split a file when it mixes responsibilities, independent lifecycles, or separately testable behavior. Neither a giant application file nor a giant utility file. Generated bundles are edited through their sources.
- Share behavior through explicit imports, never by copying or through globals. Export only the supported interface. No circular imports. A helper stays local until a second consumer or a real boundary justifies extraction; remove what an extraction left unused.
- Network and external-service calls go through an adapter or a domain-owned client, and external responses become application-owned data before other modules use them. Views and components stay independent of transport and persistence formats.
- State has one owner. Display values derive from it; no competing copies in components or features. Shared state changes only through its owner's operations, so validation and change notification run; consumers never mutate a shared object or array through an exposed reference. References between records use stable identifiers, never display names.

## File organization

For authored modules; generated bundles are exempt.

- A module is named for the one responsibility it owns. When that needs more than one file, make a folder of that name with an `index.js` that composes the rest.
- A part only its owner uses lives in `_components/` beneath the owner, and nothing outside the owner's folder imports from it.
- A short single-use helper stays inline; extracted pure helpers go in a sibling `<name>.utils.js`. A small single-use JSDoc type stays inline; a shared type goes in a sibling `<name>.types.js`.
- A part that holds state, listeners, or timers exports a factory `create<Name>(...)` returning its public functions; a stateless part exports plain functions.
- Collaborators are passed in explicitly. When parts call each other both ways, the owner builds one shared context object, fills it in creation order, documents its shape once, and a part reads a collaborator from it at call time, not at creation.
- Module body order: imports, module constants, private helpers, exported functions; in an entry point, composition and lifecycle last.
- One factory whose inner functions all close over the same state is the vanilla giant component. Groups of inner functions that rarely call across the group boundary are parts; a group with its own lifecycle is a part. About 300 module lines or 15 helper lines prompt a responsibility review, not an automatic split. Extract at a natural seam and preserve a valid contract, invariant, or test boundary even with one consumer.

## Asynchronous behavior and errors

- Asynchronous boundaries are explicit. A rejected promise is handled at the boundary that can recover, report, or end the operation. Check a `fetch` response status before consuming the payload; validate external data before committing it to state.
- Cancel obsolete requests with `AbortController`; reject stale results before they update replaced state; treat expected cancellation apart from failure. Set an explicit deadline where waiting forever is wrong. Release timers and resources on success, failure, and cancellation. Cancellation, shutdown, subprocess exit, and output draining are lifecycle behavior, designed and tested as such. Prevent duplicate submission while an operation is pending.
- Bound concurrency where work grows with input or collection size. Retry only when the operation is safe to repeat, with a bounded policy and delays, honoring cancellation. When adding context to an error, keep the original as `cause`. One failed request, feature, or optional integration does not take down unrelated behavior.
- User-visible asynchronous work defines loading, empty, partial, and error states. Logs are namespaced by subsystem; development diagnostics stay out of production output; no credentials, tokens, or user data in logs.

## Build, distribution, and versioning

- Authored source is separate from generated output. `package.json` defines development commands (may watch, keep names, add diagnostics) and production commands (produce the artifact the stated runtime or user installs). No development tooling at runtime unless the product runs there.
- A one-file distribution bundles its modules with no external runtime imports or extra chunks, and embeds and loads the built CSS explicitly; a JavaScript import alone does not inject CSS. Check assets and metadata in the final artifact.
- Never hand-edit `dist/`, bundles, manifests, or other derived files. The project's `REPOSITORY.md` records whether generated output is committed, ignored, or published. A packaging, export, or bundling change is checked by inspecting the build result, not the exit code.
- Use the repository's version format. When a version appears in package metadata, generated metadata, a changelog, or a tag, update every copy or automate it. Before a release, run the repository checks, build the production artifact, inspect its contents, and confirm it matches the intended revision.

## Tests

- A test lives with the source that owns the public behavior, in the location the project's `REPOSITORY.md` names. Unit, contract, integration, browser, and end-to-end scopes stay distinct. Test observable results and public contracts, not private calls or internal layout; for UI, cover repeated mounting, cleanup, stale responses, keyboard interaction, and persistence failure.
- The regular suite replaces an external provider with a contract-compatible fake; live provider checks are separate and explicit. Filesystem, database, and process tests use explicit temporary roots. Cover startup failure, degraded operation, cancellation, and shutdown where they apply.
- Elapsed time alone never proves asynchronous work completed. A test that depends on date or number formatting sets an explicit timezone or locale. When no test covers the changed behavior, check it with a focused reproduction.
- When application plugins start unrelated servers or build environments, keep the unit-test configuration separate. Drive cross-package behavior through public exports or the real composition root.

## Verification

| Change scope                               | Minimum final evidence                                |
| ------------------------------------------ | ----------------------------------------------------- |
| Policy or documentation                    | Narrow content or generation check                    |
| One package behavior                       | Focused test plus affected package type-check         |
| Shared contract or export                  | Contract tests plus each affected consumer type-check |
| Browser behavior                           | Focused browser-mode test plus local preview          |
| Build, runtime, or workspace configuration | Affected checks plus the relevant build               |
| Persistence, import, or migration          | Valid, invalid, and upgrade-path checks               |
| Process, path, persistence, or cleanup     | Failure-path tests plus the required safety gates     |
| Commit or explicit repository verification | The named full repository gate                        |

After the final edit, run the formatter and lint checks. Inspect every changed manifest and lockfile entry. When a shared package changes, check each affected runtime target.

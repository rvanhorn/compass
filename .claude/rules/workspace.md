---
title: Package and workspace boundaries
description: Package manager, runtime selection, workspace boundaries, pitfalls, and dependencies; loads on manifests and TypeScript configs.
generated: { by: claude-fable-5-1, at: "2026-10-10T01:00-0700" }
paths:
  - "package.json"
  - "apps/*/package.json"
  - "packages/*/package.json"
  - "**/tsconfig*.json"
  - "**/pnpm-workspace.yaml"
---

# Package and workspace boundaries

## Package manager and runtime

- The package manager is the one whose lockfile is committed. A second one's configuration is migration work, not an accepted override. Required package-manager and runtime versions live in the manifest and the project's `REPOSITORY.md`.
- The package manager does not select the runtime. Installing with Bun does not make a package a Bun runtime package; use Bun APIs only where the declared runtime supports them, and check Bun and Node API compatibility before code crosses a runtime boundary. Inspect the configured test runner: a script can invoke Vitest, Node, or a browser runner instead of `bun test`.
- The `test` script bounds its own concurrency (for example `node --test --test-concurrency=2`), so one run cannot saturate the machine.
- Run scripts from the root or from the affected package's `package.json`. The exact test, type-check, lint, format, build, and gate commands live in the project's `REPOSITORY.md`.

## Workspace boundaries

- Each package manifest and public export map is an interface. Import another package through its declared name and public exports; no relative path or deep import across a package boundary. Preserve the dependency direction between applications and packages.
- Browser packages carry no Bun or Node runtime APIs. Isomorphic packages carry no runtime-specific or UI-specific imports. Process, filesystem, database, and network adapters live in server-only packages. Shared request, event, and persistence shapes live in a contract package.
- An invalid import is corrected, never excused by weakening an architectural lint rule.
- When a change crosses a package or runtime boundary, confirm the affected exports, entry points, module formats, and dependency direction, and whether each package is server-only, browser-only, or isomorphic. Build, dependency, runtime, and verification questions are answered from the manifests, the TypeScript configs, and the CI config.

## Pitfalls

- A passing server test does not prove a browser bundle can load the module. An isomorphic package can fail after one import adds a Bun, Node, or React dependency. A package can compile through a source path while its public export is broken. A generated route tree or manifest can hide the real source of a mismatch. A watched server can restart after an edit and invalidate the current preview.

## Dependencies and generated state

- Lockfiles and generated source are never edited by hand. A new dependency (`hard-stops.md`) comes with a stated purpose and tradeoff. Before running a script that formats, fixes, generates, or restages files, inspect what it changes. Preserve the repository's rules for dependency age, exact versions, and workspace ranges.
- An edit that changes right after saving points at a post-edit formatting hook, not the editor.

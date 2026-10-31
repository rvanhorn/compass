<!-- Generated from the javascript profile instructions and REPOSITORY.md. Edit REPOSITORY.md, then rerun the profile install from the dotfiles repository. -->

# JavaScript profile

Installed from the `javascript` profile of the dotfiles repository. The profile owns this text and the rule files it lists, and reinstalling updates them. The project owns everything else, including `REPOSITORY.md` at its root: the rules that apply only to this repository, which the project writes itself. This file and its Codex twin are built from the profile's instruction parts plus `REPOSITORY.md`; the profile install refuses to replace either one after a direct edit, so project rules go in `REPOSITORY.md`.

- Rules under `.claude/rules/`, each loading only when a matching file is touched: `modules.md` (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, `.cts`), `browser.md` (`.js`, `.jsx`, `.tsx`, `.html`), `css.md` (`.css`), `typescript.md` (`.ts`, `.tsx`), `react.md` (`.jsx`, `.tsx`), `workspace.md` (the root `package.json`, `apps/*/package.json`, `packages/*/package.json`, `tsconfig*.json`, `pnpm-workspace.yaml`; a workspace that keeps packages elsewhere names the directories in `REPOSITORY.md`). A rule about where a new file goes cannot be path-scoped; that belongs in `REPOSITORY.md`.
- Lint and format: oxlint and oxfmt; the code preferences and their rule ids are in `typescript.md`. The profile ships no lint config because the project's own file wins.
- `.codegraph/` is ignored; `codegraph init` runs once after install.
- Prerequisites: two machine-wide binaries, installed through the pnpm global bin on the owner's machine. `codegraph` (the install's run step `codegraph init` fails without it) and `typescript-language-server`.

## Claude Code

- Code intelligence: `.mcp.json` runs codegraph as an MCP server with `alwaysLoad`; `.claude/settings.json` enables the `typescript-lsp` plugin and allows the codegraph tools; both are merged into the project's files, not replaced. A merge adds entries and never removes one, so when a profile replaces a settings entry (the `.env` deny rules on 2026-10-11 replaced `Read(/.env)` and `Read(/.env.*)`), the project deletes the superseded entries by hand. A committed `enabledMcpjsonServers` entry is ignored until the workspace is trusted, so a fresh clone shows codegraph as pending approval until then.

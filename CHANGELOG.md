# Changelog

All notable changes to Compass are recorded here, grouped by version and change type.

## 1.0.0

### Added

- GitHub Pages deployment of the built demo, downloadable app, and reading examples after successful checks on `main`, with manual deployment support.
- Refined appearance controls with custom slider tracks, compact value fields, color swatches, editable hex colors, and switches.
- Editable numeric values beside every workspace and reader customization slider, with synchronized values and range validation.
- Preview zoom controls (100%, 75%, and 50%) beside the desktop, tablet, and phone selectors.
- A shared JavaScript renderer for browser conversion in both the single-file downloadable app and static demo, preserving all 33 renderer options.
- Self-contained `dist/compass.html` and `dist/index.html` builds with Markdown parsing, syntax highlighting, YAML frontmatter, combined publications, and ZIP exports bundled locally.
- Browser folder linking where supported, folder imports elsewhere, portable saved projects with source snapshots and embedded images, and selectable one- and two-chapter examples.
- JavaScript renderer regression checks, offline packaged-app checks, and reader interaction checks against JavaScript-generated previews.
- A local publishing builder with file selection, drag and drop, ordering, live preview, appearance and feature controls, and saved JSON projects.
- Combined documents with chapter anchors and links between included Markdown files; separate-page exports with shared publication navigation.
- A source-controlled showcase, local illustration, and second chapter for exploring syntax and combined output.
- Bundled demo and combined-publication project files.
- Startup project loading with automatic preview and separate draft storage for demos.
- A complete builder options reference, contributor instructions, ignore rules, repeatable preview and test commands, and a GitHub checks workflow.
- `pnpm run clean` to remove generated output.
- One customizable reading layout with Contents, a side outline, heading search, focus mode, reading progress, code copying, section links, and image zoom.
- Syntax highlighting, task lists, alerts, footnotes, definitions, abbreviations, extended inline syntax, Mermaid diagrams, and MathJax equations.
- Sortable and resizable simple tables, bounded long-table scrolling, and print layouts that include every row.
- Standalone HTML exports with embedded layout assets and eligible local images; optional online libraries for diagrams and equations.

### Changed

- Migrated dependency installation, development commands, documentation, and CI to pinned PNPM 12.8.1 with a frozen lockfile, preserving Node.js tooling and GitHub Pages deployment.
- Updated bundled license collection to include transitive packages from PNPM’s dependency layout.
- Organized source by purpose under `src/app/`, `src/reader/`, and `src/shared/`, with tests beside the code they exercise.
- Renamed development tooling to `build-scripts/` and grouped demo publications under `demo/`, using descriptive filenames and `assets/` directories.
- Moved generated reading previews into ignored `dist/previews/` alongside the app build, and made `pnpm test` rebuild its required fixtures automatically.
- Aligned package metadata with version 1.0.0 and standardized development commands on PNPM.

### Fixed

- Feature switches apply without the previous 450 ms wait, with a fast preview crossfade and automatic navigation to offscreen items or their location when hidden.
- Preview fragment links stay in the document instead of loading another copy of the workspace inside the preview; cross-page fragments apply after scroll restoration.
- MathJax delimiter escaping so inline and display equations render completely.

### Removed

- Python renderer, local server, dependencies, tests, and CI setup. Conversion uses the JavaScript browser renderer throughout.
- Obsolete HTTP conversion, session-token handling, and Python server live-reload code from the browser controls.
- `Makefile` and `Compass.command` launch shortcuts.

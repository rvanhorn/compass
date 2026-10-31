# Changelog

All notable changes to Compass are recorded here, grouped by version and change type.

## 2.0.0

### Changed

- One interface for writing and reading: the publication fills the window beside one rail on the left that holds every tool. The setup screen, the bottom dock, the settings drawer, and the framed preview are gone.
- The rail lists the sections in working order (Sources, Pages, Style, Reader, Details) and ends with Publish. Each section opens a panel over the page; pin it to keep it beside the page. In Read, the rail shows the reader's own tools.
- Settings are flat rows with a description under each one. A reader tool's fine-tuning setting sits under the tool and is disabled while the tool is off, replacing the separate Fine Tuning group.
- Every input is a Compass component: switches, a custom select, the Compass color picker for every color, and segmented controls. The workspace uses the Iris palette: cool grays with one iris accent, in light and dark.
- The exported reader uses the same components: a top bar with Contents, Find, Customize, and Print, and a Contents side nav beside the page on wide screens; Find opens from the bar.
- New publication defaults: an indigo accent on white for light, and a periwinkle accent on a deep blue-black for dark. Projects saved with the old defaults move to the new ones.
- The workspace, the shared interface kit, and the reader tools are ES modules split by feature. `pnpm run dev` serves them unbundled through Vite with hot reload; `pnpm run build` still produces the single-file demo and offline app, and `pnpm run preview` serves that build.

### Removed

- Focus mode, Bookmarks, and Resume Reading. The Contents side nav covers the navigation they offered.

### Fixed

- Each color swatch in the workspace opened two color pickers, so the swatch reported itself closed while its picker was open.

### Added

- Page per H1 layout: a new page starts at each H1. The Page Breaks list turns any H2 into an H1 and back, and links, search, and contents follow the new pages.
- Read mode shows exactly what readers get, with an Edit button to return.
- A command palette (Ctrl/⌘ K) for commands, every setting, and the publication's text.
- Text color settings for the light and dark themes, and a Randomize button that picks a matching set of colors for both themes. Each press varies the background mood (clean, tinted, deep, or soft), how the background hue relates to the accent, and the accent itself; it keeps the candidate that looks most different from the last twelve sets, and keeps text and accents readable. The reader's own top bar, side nav, and Customize panel take these colors too.
- Preview width (Fit Window, Tablet, Phone) and Keyboard Shortcuts in the More menu.

## 1.0.1

### Added

- Offline full-text publication search with highlighted snippets and destinations across combined or separate HTML pages.
- Persistent publication checks for broken section/document links, missing images or alt text, heading gaps, and online media dependencies, with jumps to the affected chapter.
- Session undo/redo for file, title, source, branding, design, and feature changes, including grouped typing and bounded retained history.
- Portable appearance-only design presets, local body/heading font choices, and custom publication toolbar names, logos, favicons, and footers.
- Per-publication local section bookmarks and resume-reading prompts, respecting disabled preference storage and direct section links.
- Paper size, margins, chapter page breaks, print styling preview, and a complete-publication Print / Save PDF action.
- Live Markdown source editing; changes to linked files create an undoable local snapshot without modifying source files.

- A custom appearance menu with System, Light, and Dark themes for the workspace and live preview, automatic device appearance updates, and browser persistence separate from publication settings.
- Separate light and dark palette controls, automatic accent pairing, and configurable Compass SVG colors saved with projects and exports.
- Readable settings groups, visible described examples, a charcoal palette, custom menus, and a direct publishing flow with a persistent Download action.
- File & Export consolidates project commands; Design and Features have separate persistent reset controls and explicit hover/focus states.
- Letter spacing, paragraph spacing, heading size, and optional light/dark surface colors; redundant profiles and sample cards removed.
- Smooth open/close transitions with reduced-motion support, plus in-page color pickers that dismiss on outside clicks and Escape.
- Preview secondary surfaces derived from theme backgrounds rather than fixed blue colors.
- Bundled Lucide icons with centered icon controls and aligned icon-and-text buttons.
- Simplified Files hierarchy and compact reading-order rows with optional title editing and action menus; publication format and Chapter Titles now live in Publish.
- A branded 1200 × 630 Open Graph card with static Open Graph and Twitter sharing metadata for the hosted demo.
- A square sharing card advertised as an Open Graph alternate on the main demo URL, preserving the wide card as the preferred image; clients control image selection.

### Fixed

- Repeated clicks on setting labels, descriptions, and section headers no longer select text and interrupt toggling.

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

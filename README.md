# Compass

Turn Markdown into a polished, customizable HTML publication, entirely in your browser. Arrange files, choose appearance and reader features, preview, and export one combined document or connected pages.

The downloadable app and static demo share the same JavaScript renderer. Files are processed locally without a conversion server. Exports include the reading layout, controls, syntax highlighting, favicon, and supplied local images.

## Get started

Open **`compass.html`** in your browser. The standalone app needs no installation, Node.js, or local server to run. Use **Try Example** or **Try Two Chapters** to explore the features.

To build that file from this repository, install **Node.js 24.15+** and **[PNPM 12.8.1](https://pnpm.io/installation)**, then run:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
```

The PNPM version is pinned in `package.json`; `pnpm-lock.yaml` records the dependency versions used locally and in CI. Dependency install scripts are disabled by the install command above.

Open `dist/compass.html`. Node.js is needed to build from source, not to use the finished app.

Drop Markdown files or a folder into the setup screen. Arrange files, choose output and design options, then click **Preview Publication**. Settings move into a side drawer while the document takes the main pane. Changes update the preview; **Export HTML** downloads the result. Multiple separate pages download as a ZIP.

## Try the demo

The build also creates **`dist/index.html`**, which opens directly in preview with [the showcase](demo/feature-guide.md) already selected. The demo can convert your files using the same controls as the downloadable app.

```bash
pnpm run dev
# Open http://127.0.0.1:4173/
```

Use `http://127.0.0.1:4173/compass.html` for the empty workspace. Stop the static preview server with **Ctrl+C**; set `PORT=8765` to choose another port. The server only serves files; conversion happens in the browser.

The hosted demo will be available at **[rvanhorn.github.io/compass](https://rvanhorn.github.io/compass/)** after the first push to `main` and successful deployment. Its **Download App** button downloads the standalone app for offline use.

GitHub Pages uses **GitHub Actions** as its publishing source. The **Checks and Pages** workflow installs locked dependencies, builds the app and reading examples, runs all checks, and publishes only `dist/` after a successful push to `main`. Pull requests and other branches run checks without deploying. You can also deploy `main` manually from the workflow's **Run workflow** button. Local build and check commands do not publish anything.

Run `pnpm run previews` to generate reading examples in `dist/previews/`. Open `dist/previews/feature-guide.html` directly, or visit `http://127.0.0.1:4173/previews/feature-guide.html` while the preview server is running.

## Build a publication

- **Choose content:** Drop files or folders, change chapter titles, and reorder documents.
- **Choose output:** Export one combined HTML document or separate pages with publication navigation.
- **Set appearance:** Choose accent and background colors, text size, width, line spacing, corners, and compact spacing.
- **Choose features:** Show or hide Customize, Contents, the outline, Find, Focus, reading time, progress, metadata, code-copy buttons, heading links, and more.
- **Save a project:** Download `compass.json` containing settings, Markdown snapshots, and supplied images. Reopen it on another device to continue. Browser storage keeps a draft when available; use Save Project for a durable copy.

Import a folder to include local images and preserve links between its Markdown files. Combined output gives chapters distinct anchors and rewrites links between included documents. Importing the same source name again updates its contents.

In browsers with folder-access support, **Browse Workspace** links files to a folder you select. Linked files are reread during preview and export, with preview checks every four seconds. Other browsers offer folder import instead. Reconnect the folder after reopening a draft or an older project containing linked paths. Saving a project in the browser creates a portable snapshot of those linked files.

See [all 33 options and project fields](docs/options.md) for defaults, ranges, metadata, and examples. The bundled `.compass.json` examples contain repository-relative paths; select the repository folder when opening them manually, or use the built-in example buttons.

## Reading and Markdown

Readers can customize the document, search headings with **Ctrl/⌘ K**, enter Focus mode, copy code or section links, enlarge images, and print. Contents starts collapsed; the side outline is visible by default. Tables support sorting, column resizing, and bounded scrolling for long tables. Print includes all rows.

Compass supports tables, fenced code, task lists, autolinks, strikethrough, GFM alerts, footnotes, definition lists, abbreviations, `==marked text==`, `^^inserted text^^`, superscripts, subscripts, Mermaid, and LaTeX math. YAML frontmatter accepts `title`, `subtitle` or `description`, `author`, and `date`. The title falls back to the first H1, then the filename.

The app, conversion, layout, and controls work offline. Mermaid and MathJax load online libraries only when needed and enabled; remote images and links can also require internet access. Diagram and equation source remains readable when those libraries cannot load. Conversion uses no AI calls.

## Develop

```bash
pnpm run check       # Build app and previews, then run all checks
pnpm run clean       # Remove generated dist/ output
```

`pnpm test` also builds its required fixtures automatically. See [CONTRIBUTING.md](CONTRIBUTING.md) for structure and review guidance; record changes in [CHANGELOG.md](CHANGELOG.md).

```text
compass/
├── src/
│   ├── app/               Browser workspace, controls, styles, template, tests
│   ├── reader/            Markdown renderer, reader controls, styles, template, tests
│   │   └── assets/        Optional MathJax and Mermaid loaders
│   └── shared/            Project options, path helpers, favicon
├── build-scripts/         Build, preview generation, static server, cleanup
├── demo/                  Feature guide, publishing checklist, saved projects
│   └── assets/            Publishing workflow illustration
├── docs/                  Complete options reference
├── .github/workflows/     Checks and GitHub Pages deployment from main
├── package.json           JavaScript dependencies, PNPM version, development commands
├── pnpm-lock.yaml         Locked dependency versions
└── dist/                  Generated output (ignored)
    ├── compass.html       Downloadable standalone app
    ├── index.html         Static demo
    └── previews/          Generated reading examples
```

## Content and local access

Browser projects escape raw HTML by default. Turning this off trusts embedded HTML. Saved browser projects include source content and image assets, so review them before sharing. Folder linking requests read-only access to the folder you choose. Third-party package notices are included inside the built app and in `dist/THIRD_PARTY_NOTICES.txt`.

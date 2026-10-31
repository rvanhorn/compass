# Compass

Turn Markdown into a polished, customizable HTML publication, entirely in your browser. Arrange files, choose appearance and reader features, preview, and export one combined document or connected pages.

The downloadable app and static demo share the same JavaScript renderer. Files are processed locally without a conversion server. Exports include the reading layout, controls, syntax highlighting, favicon, and supplied local images.

## Get started

Open **`compass.html`** in your browser. The standalone app needs no installation, Node.js, or local server to run. Use **Explore Compass** for a single-document tour or **Publishing Guide** for a two-chapter example.

To build that file from this repository, install **Node.js 24.15+** and **[PNPM 12.8.1](https://pnpm.io/installation)**, then run:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
```

The PNPM version is pinned in `package.json`; `pnpm-lock.yaml` records the dependency versions used locally and in CI. Dependency install scripts are disabled by the install command above.

Open `dist/compass.html`. Node.js is needed to build from source, not to use the finished app.

Drop Markdown files or a folder anywhere on the page. The publication opens at once and fills the window beside one rail on the left. The rail lists the work in order: **Sources**, **Pages**, **Style**, **Reader**, and **Details** each open a panel over the page, and changes update the page as you make them. Pin a panel to keep it open beside the page instead. **Publish**, at the bottom of the rail, checks the publication and downloads it as one HTML file or, for several pages, a ZIP. Press Ctrl/⌘ K to search every command, setting, and the publication's text. The eye button shows exactly what readers of the published file get; **Edit** brings the tools back.

Use the Appearance button in the rail to choose **System**, **Light**, or **Dark** for the workspace and live preview. System follows your device's appearance and is the default. Your choice is remembered in this browser independently of publication design and saved projects.

## Try the demo

The build also creates **`dist/index.html`**, which opens directly in preview with [the showcase](demo/feature-guide.md) already selected. The demo can convert your files using the same controls as the downloadable app.

```bash
pnpm run build
pnpm run preview
# Open http://127.0.0.1:4173/
```

Use `http://127.0.0.1:4173/compass.html` for the empty workspace. Stop the preview server with **Ctrl+C**; add `--port 8765` to choose another port. The server only serves the built files; conversion happens in the browser.

The hosted demo will be available at **[rvanhorn.github.io/compass](https://rvanhorn.github.io/compass/)** after the first push to `main` and successful deployment. Its **Project menu → Download App** command downloads the standalone app for offline use.

The demo includes Open Graph and Twitter sharing metadata, with a 1200 × 630 card at `og-card.png`. The build copies the committed PNG from `src/app/assets/`; its editable source is `src/app/assets/og-card.svg`. When changing the artwork, render the SVG to a 1200 × 630 PNG and commit both files. Sharing URLs use the `homepage` in `package.json`; update it when hosting elsewhere.

The demo advertises only the wide card in both Open Graph and Twitter metadata. Listing multiple Open Graph images can make Discord display a gallery with cropped images. The 630 × 630 compact asset (`og-card-compact.png`) remains available, with editable source at `src/app/assets/og-card-compact.svg`, but is not included in the page's sharing metadata.

GitHub Pages uses **GitHub Actions** as its publishing source. The **Checks and Pages** workflow installs locked dependencies, builds the app and reading examples, runs all checks, and publishes only `dist/` after a successful push to `main`. Pull requests and other branches run checks without deploying. You can also deploy `main` manually from the workflow's **Run workflow** button. Local build and check commands do not publish anything.

Run `pnpm run previews` to generate reading examples in `dist/previews/`. Open `dist/previews/feature-guide.html` directly, or visit `http://127.0.0.1:4173/previews/feature-guide.html` while the preview server is running.

## Build a publication

- **Choose content:** In Pages, add files or folders, change file titles, and reorder files.
- **Choose a page layout:** In Pages, choose **One Page** (every file on one continuous page), **Page per File**, or **Page per H1** (a new page at each H1 heading). With Page per H1, the Page Breaks list turns any H2 into an H1 and back; a linked file becomes a local copy when you change it.
- **Set appearance:** In Design, set the accent, background, surface, text, and icon colors for the light and dark themes with the Compass color picker, or select **Randomize** for a matching set. Then adjust fonts, text size, letter and paragraph spacing, heading size, width, and corners. Matched accents keep the same hue across themes.
- **Choose reader tools:** In Reader Tools, turn Contents, Find, Customize, reading time, progress, metadata, code-copy buttons, heading links, and more on or off. Each tool says what it adds.
- **Edit content:** Choose **Edit Markdown** from a file's action menu for a source pane beside the page. Editing a linked file creates a local project copy and leaves its original unchanged.
- **Reuse a design:** In Style, save or import a preset containing colors, typography, and layout without replacing content or reader tools. Choose local sans, serif, or monospace families for body text and headings.
- **Add branding:** Set a reader toolbar name, upload a logo and favicon, and customize the footer in Details, under Branding.
- **Check and print:** Publish includes a persistent report for broken local links, missing images or alt text, heading gaps, and online media dependencies. Select paper size, margins, and chapter breaks; preview print styling or use **Print or Save PDF** for the complete publication.
- **Save a project:** Download `compass.json` containing settings, Markdown snapshots, and supplied images. Reopen it on another device to continue. Browser storage keeps a draft when available; choose **Save Project** (Ctrl/⌘ S) in Details, under Project File, for a durable copy.

Use **Undo** and **Redo** in the rail for file, title, source, and setting changes. Ctrl/⌘ Z and Ctrl/⌘ Shift Z work outside text fields and inside the Markdown source editor; ordinary text fields keep their native editing shortcuts. History is kept for the current session and starts fresh when opening a project or example.

Import a folder to include local images and preserve links between its Markdown files. Combined output gives chapters distinct anchors and rewrites links between included documents. Importing the same source name again updates its contents.

In browsers with folder-access support, **Link Folder** links files to a folder you select. Linked files are reread during preview and export, with preview checks every four seconds. Other browsers offer folder import instead. Reconnect the folder after reopening a draft or an older project containing linked paths. Saving a project in the browser creates a portable snapshot of those linked files.

The bundled `.compass.json` examples contain repository-relative paths; select the repository folder when opening them manually, or use the built-in example buttons.

## Reading and Markdown

Readers can customize the document, search text, headings, and code across all chapters with **Ctrl/⌘ K**, copy code or section links, enlarge images, and print. On wide screens the Contents list sits beside the page as a side nav, and the shorter list under the title is off unless you turn it on in Reader. Find shows highlighted snippets and jumps to the matching passage, including in separate exported pages, without an online search service.

Tables support sorting, column resizing, and bounded scrolling for long tables. Print includes all rows.

Compass supports tables, fenced code, task lists, autolinks, strikethrough, GFM alerts, footnotes, definition lists, abbreviations, `==marked text==`, `^^inserted text^^`, superscripts, subscripts, Mermaid, and LaTeX math. YAML frontmatter accepts `title`, `subtitle` or `description`, `author`, and `date`. The title falls back to the first H1, then the filename.

The app, conversion, layout, and controls work offline. Mermaid and MathJax load online libraries only when needed and enabled; remote images and links can also require internet access. Diagram and equation source remains readable when those libraries cannot load. Conversion uses no AI calls.

## Develop

```bash
pnpm run dev         # Serve the workspace from src/ with hot reload at http://127.0.0.1:5173/
pnpm run check       # Build app and previews, then run all checks
pnpm run clean       # Remove generated dist/ output
```

`pnpm run dev` loads the source as separate ES modules through Vite; only `pnpm run build` produces the single-file `dist/index.html` and `dist/compass.html`. `pnpm test` also builds its required fixtures automatically. See [CONTRIBUTING.md](CONTRIBUTING.md) for structure and review guidance; record changes in [CHANGELOG.md](CHANGELOG.md).

```text
compass/
├── src/
│   ├── app/               Browser workspace modules, styles, template, tests
│   ├── reader/            Markdown renderer, styles, template, tests
│   │   ├── assets/        Optional MathJax and Mermaid loaders
│   │   └── runtime/       Reader tools, bundled into each exported page
│   └── shared/            Project options, path helpers, interface kit, favicon
├── build-scripts/         Vite plugin, reader resources, preview generation, cleanup
├── vite.config.mjs        Development server and single-file build
├── demo/                  Feature guide, publishing checklist, saved projects
│   └── assets/            Publishing workflow illustration
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

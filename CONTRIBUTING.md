# Contributing to Compass

Use Node.js 24.15 or newer and [PNPM 12.8.1](https://pnpm.io/installation) to build the app and run JavaScript checks. The PNPM version is pinned in `package.json`:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm run check
pnpm run dev
```

The static demo is at `http://127.0.0.1:4173/`; the empty app is at `/compass.html`. You can also open `dist/compass.html` directly without a server. Conversion must work in both contexts.

`pnpm test` builds the app and reading fixtures before running the checks. Run `pnpm run clean` to remove generated output; dependencies and local projects are preserved.

Use `pnpm add <package>` or `pnpm add -D <package>` to change dependencies and commit the resulting `package.json` and `pnpm-lock.yaml` together. Use `pnpm install --ignore-scripts` when intentionally updating the lockfile after editing dependencies. CI uses `--frozen-lockfile` to reject dependency changes without a matching lockfile.

## Where to work

`src/` contains the app and exported reader implementation, with `.test.cjs` checks beside the code they exercise. `build-scripts/` contains development tools that build, serve, generate previews, and clean output. `demo/` contains the feature guide, publishing checklist, and saved projects used by the demo and tests. `docs/` contains reference documentation for people configuring publications.

| Area | Files |
| --- | --- |
| Markdown parsing and extensions | `src/reader/markdown.mjs` |
| Document transforms, publication links and exports | `src/reader/renderer.mjs` |
| Project format, renderer defaults and path helpers | `src/shared/options.mjs` |
| Browser file access, portable projects and local actions | `src/app/browser.mjs` |
| Workspace controls, styles and layout | `src/app/controls.js`, `styles.css`, `template.html` |
| Exported reader controls, styles and layout | `src/reader/controls.js`, `styles.css`, `template.html` |
| Optional diagram and equation loaders | `src/reader/assets/` |
| Shared icon | `src/shared/favicon.svg` |
| Standalone HTML bundling and static preview | `build-scripts/` |
| Examples and configuration | `demo/`, `docs/options.md` |
| Packaged app and workspace checks | `src/app/` |
| Renderer and reader interaction checks | `src/reader/` |

The build embeds dependencies, templates, and assets into each app HTML file. Keep URLs relative for repository subpaths. Add package licenses to the generated notices when adding bundled dependencies. Do not add runtime conversion endpoints: browser conversion must work without a server.

The reader renderer replaces `${name}` template placeholders and uses `$$` for a literal dollar sign. Templates, styles, and controls live beside the source that uses them. `build-scripts/resources.mjs` loads reader resources for both the build and renderer checks; the build embeds the app resources separately.

Edit source Markdown in `demo/` rather than generated HTML. `pnpm run previews` regenerates reading examples in `dist/previews/`. All generated files belong in ignored `dist/`; keep local publication exports in ignored `output/` and personal projects outside the source directories.

## Manual review

Try the one- and two-chapter examples in both combined and separate modes. Confirm chapter order, cross-document links, footnotes, images, and ZIP exports. Open the downloaded app from disk, import your own files, save a portable project, and reopen it. Confirm no conversion requests are sent over the network.

Check layout at narrow widths, keyboard controls, reader table sorting and resizing, and print behavior. Verify diagrams and equations online, and readable source when offline or media is disabled. Test linked source refresh in a browser supporting directory access and folder import in others.

Update the changelog and option reference when behavior changes. The **Checks and Pages** workflow builds and validates every push and pull request. Successful pushes to `main` also publish `dist/` to GitHub Pages; manual workflow runs on `main` can redeploy the site. Keep GitHub Pages configured to use **GitHub Actions** as its publishing source. Local build and check commands do not deploy.

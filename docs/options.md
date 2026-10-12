# Compass options

The browser workspace uses the version 1 project format and all 50 renderer options. Start with the built-in example buttons, [the demo project](../demo/feature-guide.compass.json), or [the combined project](../demo/two-chapter-guide.compass.json). Select the repository root as the workspace when manually opening these path-based example projects.

## Appearance preferences

The custom Appearance menu in the header offers **System** (the default), **Light**, and **Dark**. System follows device appearance changes automatically. The preference is stored locally in this browser when storage is available; it applies to the workspace and all live preview pages without changing exports or project settings. It remains usable for offline files when storage is unavailable.

## Publication settings

| Field | Default | Meaning |
| --- | --- | --- |
| `version` | `1` | Project format version |
| `name` | `Untitled Publication` | Project name and export filename basis |
| `title` | Empty | Combined document title; normally falls back to project name |
| `subtitle` | Empty | Publication subtitle; overrides individual subtitles when supplied |
| `author` | Empty | Publication author; overrides individual authors when supplied |
| `mode` | `combined` | `combined` for one document, `separate` for individual pages |
| `safe` | `true` | Escape source HTML in the builder |
| `chapter_titles` | `true` | Add a heading for each file when combining multiple documents |
| `files` | `[]` | Ordered source documents, up to 100 |
| `id` | Derived for older projects | Stable publication identity for local bookmarks and reading position; new browser projects assign an ID |
| `branding` | Empty fields | `name` for the reader toolbar, `footer` text, and embedded `logo` / `favicon` image data URLs |
| `options` | Renderer defaults | Appearance and behavior settings below |

A source entry contains `name`, an optional `title` override, and either a workspace-relative `path` or uploaded Markdown in `text`. Uploaded files can include an `assets` map from relative image paths to image data URLs. Linked source files are reread when a preview or export is requested; uploaded text is a snapshot saved in the project. For a single file in an unnamed project, the combined title falls back to that document's title; its subtitle and author are also used when the publication fields are empty.

The browser's **Save Project** snapshots linked files into `text`, preserves their relative folder names, and includes resolved image assets, so the saved project works without reconnecting the original folder. Older path-only projects and linked drafts require **Link Folder** to reconnect a folder. Browser folder access varies; folder import works as a snapshot where linking is unavailable. Reimport a source to refresh its snapshot. Conversion and ZIP creation run locally in both the downloadable HTML app and static demo.

```json
{
  "version": 1,
  "name": "Team handbook",
  "title": "Team handbook",
  "mode": "combined",
  "safe": true,
  "chapter_titles": true,
  "options": {
    "accent": "#14b8a6",
    "customize": false,
    "outline": true,
    "contents_open": true
  },
  "files": [
    { "name": "intro.md", "path": "content/intro.md" },
    { "name": "guide.md", "path": "content/guide.md", "title": "Guide" }
  ]
}
```

## Appearance

| Option | Default | Accepted values |
| --- | --- | --- |
| `accent` | `#475569` | Six-digit hex color |
| `surface` | Automatic (`""`) | Light-theme header/card background, six-digit hex or empty to derive from Background |
| `dark_surface` | Automatic (`""`) | Dark-theme header/card background, six-digit hex or empty to derive from Background |
| `background` | `#f7f9fc` | Light-theme page background, six-digit hex |
| `dark_accent` | `#64748b` | Dark-theme accent, six-digit hex |
| `dark_background` | `#0d1117` | Dark-theme page background, six-digit hex |
| `logo_color` | `#ffffff` | Light-theme Compass SVG foreground, six-digit hex |
| `dark_logo_color` | `#ffffff` | Dark-theme Compass SVG foreground, six-digit hex |
| `link_accents` | `true` | Generate the other theme’s accent when editing either accent in Design |
| `font` | `17` | 14–22 pixels |
| `width` | `930` | 640–1320 pixels |
| `leading` | `1.75` | 1.55–2.05 line height |
| `radius` | `13` | 0–28 pixels |
| `letter_spacing` | `0` | −0.02–0.08 em |
| `paragraph_spacing` | `18` | 8–32 pixels |
| `heading_scale` | `1` | 0.85–1.35 times the default heading size |
| `compact` | `false` | Compact spacing |
| `remember` | `true` | Reader appearance, bookmarks, and reading position in browser storage |
| `body_font` | `system` | `system`, `serif`, or `mono`; local body font family |
| `heading_font` | `system` | `system`, `serif`, or `mono`; local heading font family |

Design is organized into collapsed **Theme Colors**, **Typography**, and **Layout** sections. Theme Colors opens on the active workspace appearance. Each theme has an accent, page background, optional surface color for headers/cards/panels, and SVG icon color. Surface colors derive from the background by default; **Reset to Automatic** removes a custom surface override. Other secondary colors, including borders, blockquotes, tables, and inline code, follow the selected background instead of a fixed blue palette. With **Link Accent Colors** enabled, editing either accent generates a matching hue with lightness suited to the other theme. Turn it off for independent colors. Existing projects retain their colors; older projects with a custom accent receive a matching dark accent. Standalone exports follow the reader’s device appearance and include both palettes.

Use the live publication preview to assess changes. Reusable Design saves an appearance-only `compass-design.json` file and imports it into another project. Presets include color, font, spacing, and layout options; they exclude content, branding assets, reader switches, and print settings. Publication Branding accepts a toolbar name, custom footer text, and local logo/favicon uploads up to 2 MB each; the images travel with saved projects and exports. Features has collapsed groups for **Navigation**, **Reader Experience**, **Page Elements**, **Tables**, and **Content Tools**. **Advanced Tuning** contains outline depth, table threshold, and reading speed. Publish shows title, author, and introduction first, followed by output format and download name. Only advanced export options are collapsed. The Download action remains visible in the bottom bar. Files groups adding content and reading order; examples remain visible with descriptions. Design and Features groups start collapsed. Reset Design and Reset Features stay in the bottom bar and reset only their own settings. The header combines project commands in File & Export and uses a custom Appearance menu. Labels and supporting text use readable sizes with visible hover states. Open/close and Focus transitions respect reduced-motion preferences, and in-page color pickers dismiss on outside clicks or Escape.

Feature switches update the preview immediately with a quick crossfade. When the affected item is offscreen, the preview moves to it; disabling an item shows its surrounding location. Items already in view keep their position.

The builder preview uses the project's appearance defaults rather than saved reader settings. Exports honor `remember`: when enabled, readers' saved appearance preferences can override the initial defaults. Reader controls, when enabled, can still change the appearance of the opened document.

## Reader controls and navigation

All switches accept JSON `true` or `false`.

| Option | Default | Behavior |
| --- | --- | --- |
| `customize` | `true` | Show the reader customization menu |
| `outline` | `true` | Show the side outline and mobile navigation |
| `contents` | `true` | Show the opening Contents when there are multiple sections |
| `contents_open` | `false` | Expand Contents initially |
| `search` | `true` | Enable offline full-text Find across all publication pages, including paragraph and code text |
| `bookmarks` | `true` | Show locally saved section bookmarks |
| `resume` | `true` | Offer to continue at the last section when reader preferences are remembered |
| `focus` | `true` | Show Focus mode control |
| `reading_time` | `true` | Show estimated reading time |
| `progress` | `true` | Show reading progress |
| `filename` | `true` | Show source filename in the header |
| `footer` | `true` | Show the document footer |
| `logo` | `true` | Show the Compass header mark |
| `metadata` | `true` | Show author and date when supplied |
| `subtitle` | `true` | Show subtitle or description when supplied |
| `copy_code` | `true` | Show copy buttons on code blocks |
| `section_links` | `true` | Show heading link controls |
| `image_zoom` | `true` | Enable the image viewer |

| Numeric option | Default | Range |
| --- | --- | --- |
| `outline_depth` | `2` | 1–4 relative heading levels |
| `reading_speed` | `220` | 100–500 words per minute |

The outline depth is relative to the shallowest heading in the body. Find includes deeper headings and body text even when the outline omits them. Results show matching snippets and highlight the destination passage. Each separate HTML page embeds the publication’s search index, so it can search peer chapters offline. Bookmarks and resume state are scoped to the publication ID. A direct section URL takes precedence over the resume prompt. When `remember` is false, bookmarks last only for the open session and resume is not persisted. Builder previews never read or write reading state. Contents and the side outline are separate controls: Contents starts collapsed; the side outline is visible by default.

## Content behavior

| Option | Default | Behavior |
| --- | --- | --- |
| `table_sort` | `true` | Sort simple tables by clicking column labels |
| `table_resize` | `true` | Resize simple table columns |
| `table_scroll` | `true` | Bound the height of long tables |
| `table_rows` | `12` | Long-table threshold; 3–100 data rows |
| `title_case` | `true` | Title-case display headings while preserving IDs and technical names |
| `assessments` | `true` | Format repeated assessment labels as sections |
| `media` | `true` | Load Mermaid and MathJax when their syntax appears |

Tables with merged cells keep their original layout. Print expands scrolling tables. Disabling `media` retains diagram and equation source without the optional library loaders.

Unknown option keys are ignored. Invalid renderer option values fall back to the default; they are not clamped to the nearest boundary. Keep JSON booleans and numbers as their native types rather than quoting them.

## Markdown metadata

YAML frontmatter can set `title`, `subtitle` (or `description`), `author`, and `date`:

```yaml
---
title: Release plan
subtitle: A practical implementation guide
author: Engineering
date: 2026-10-11
---
```

The title comes from frontmatter, then the first H1, then the filename. A matching opening H1 is shown once in the hero. Missing metadata does not add placeholder labels. Builder project options are stored in JSON; YAML frontmatter is for document metadata.

## Publication checks and editing

Publish → Publication Check lists unresolved Markdown links, broken local section fragments, missing local images, empty image alt text, skipped heading levels, remote images, and enabled Mermaid/MathJax dependencies. Check Now works before opening a preview; previewing and exporting refresh the report. Changes mark the existing report as stale until the next check. Select an item to open its chapter and nearby section. Remote URLs are reported as dependencies rather than fetched to check reachability. Export remains available with report items; the check and download use the same snapshot of linked sources.

Files → Edit Markdown opens a source pane beside the live preview. Uploaded content is edited in the project. On the first edit of a linked document, Compass replaces that link with a local snapshot, preserves its relative name and supplied images, and leaves the source folder untouched. Undo restores the prior source and linking state. Save Project preserves the edited Markdown.

Undo and Redo cover file additions/removals, ordering, titles, source, branding, resets, and option changes. Continuous typing is grouped into short edits. History keeps up to 40 changes with a memory limit for retained source content, lasts for the current session, and resets when opening a project or example. Keyboard shortcuts are Ctrl/⌘ Z and Ctrl/⌘ Shift Z (or Ctrl Y). Ordinary text fields keep native text undo; the Markdown editor uses project history.

## Print and PDF

| Option | Default | Accepted values |
| --- | --- | --- |
| `print_paper` | `auto` | `auto`, `A4`, or `Letter` |
| `print_margin` | `18` | 0–40 millimeters |
| `print_chapters` | `false` | Start each combined chapter after the first on a new page |

Publish → Preview Print Layout displays print styling and the selected content width/margins in the live preview. Dashed separators indicate requested chapter breaks; the browser’s print dialog supplies actual pagination. Print / Save PDF prints all chapters together even when Linked HTML Pages is selected for download. Choose Save as PDF in the browser dialog to create a PDF. Paper and margin settings are embedded in HTML exports, and the reader’s Print action uses them. Print settings are independent of Design and Features resets.

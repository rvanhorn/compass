# Compass options

The browser workspace uses the version 1 project format and all 33 renderer options. Start with the built-in example buttons, [the demo project](../demo/feature-guide.compass.json), or [the combined project](../demo/two-chapter-guide.compass.json). Select the repository root as the workspace when manually opening these path-based example projects.

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
| `options` | Renderer defaults | Appearance and behavior settings below |

A source entry contains `name`, an optional `title` override, and either a workspace-relative `path` or uploaded Markdown in `text`. Uploaded files can include an `assets` map from relative image paths to image data URLs. Linked source files are reread when a preview or export is requested; uploaded text is a snapshot saved in the project. For a single file in an unnamed project, the combined title falls back to that document's title; its subtitle and author are also used when the publication fields are empty.

The browser's **Save Project** snapshots linked files into `text`, preserves their relative folder names, and includes resolved image assets, so the saved project works without reconnecting the original folder. Older path-only projects and linked drafts require **Browse Workspace** to reconnect a folder. Browser folder access varies; folder import works as a snapshot where linking is unavailable. Reimport a source to refresh its snapshot. Conversion and ZIP creation run locally in both the downloadable HTML app and static demo.

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
| `accent` | `#2563eb` | Six-digit hex color |
| `background` | `#f7f9fc` | Six-digit hex color |
| `font` | `17` | 14–22 pixels |
| `width` | `930` | 640–1320 pixels |
| `leading` | `1.75` | 1.55–2.05 line height |
| `radius` | `13` | 0–28 pixels |
| `compact` | `false` | Compact spacing |
| `remember` | `true` | Reader appearance preferences in browser storage |

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
| `search` | `true` | Enable Find for headings |
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

The outline depth is relative to the shallowest heading in the body. Find includes deeper headings even when the outline omits them. Contents and the side outline are separate controls: Contents starts collapsed; the side outline is visible by default.

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

---
version: alpha
name: Compass
description: A Markdown-to-web-page publisher for writers; quiet chrome that never competes with the page being made.
colors:
  light-desk: "#f3f3f6"
  light-bg: "#ffffff"
  light-panel: "#f7f7f9"
  light-ink: "#1a1a22"
  light-ink-2: "#3e3e4a"
  light-ink-3: "#646472"
  light-line: "#d3d3dc"
  light-brand: "#5b5bd6"
  light-brand-text: "#4848c0"
  light-brand-soft-on-bg: "#eeeefb"
  light-on-brand: "#ffffff"
  light-danger: "#c9302c"
  light-on-danger: "#ffffff"
  dark-desk: "#0f0f13"
  dark-bg: "#17171c"
  dark-panel: "#1d1d23"
  dark-raised: "#222229"
  dark-ink: "#ececf1"
  dark-ink-2: "#c3c3cf"
  dark-ink-3: "#9a9aaa"
  dark-line: "#363640"
  dark-brand: "#6363e0"
  dark-brand-text: "#a9a9ff"
  dark-brand-soft-on-bg: "#25253c"
  dark-on-brand: "#ffffff"
  dark-danger: "#ff6b64"
  dark-on-danger: "#14141a"
typography:
  title:
    fontFamily: system-ui
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: system-ui
    fontSize: 14px
    lineHeight: 1.45
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  panel: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  light-text:
    textColor: "{colors.light-ink}"
    backgroundColor: "{colors.light-bg}"
  light-text-2:
    textColor: "{colors.light-ink-2}"
    backgroundColor: "{colors.light-bg}"
  light-help:
    textColor: "{colors.light-ink-3}"
    backgroundColor: "{colors.light-bg}"
  light-help-on-panel:
    textColor: "{colors.light-ink-3}"
    backgroundColor: "{colors.light-panel}"
  light-help-on-desk:
    textColor: "{colors.light-ink-3}"
    backgroundColor: "{colors.light-desk}"
  light-button-primary:
    textColor: "{colors.light-on-brand}"
    backgroundColor: "{colors.light-brand}"
  light-link:
    textColor: "{colors.light-brand-text}"
    backgroundColor: "{colors.light-bg}"
  light-rail-active:
    textColor: "{colors.light-brand-text}"
    backgroundColor: "{colors.light-brand-soft-on-bg}"
  light-danger:
    textColor: "{colors.light-danger}"
    backgroundColor: "{colors.light-bg}"
  light-badge:
    textColor: "{colors.light-on-danger}"
    backgroundColor: "{colors.light-danger}"
  dark-text:
    textColor: "{colors.dark-ink}"
    backgroundColor: "{colors.dark-bg}"
  dark-text-2:
    textColor: "{colors.dark-ink-2}"
    backgroundColor: "{colors.dark-bg}"
  dark-help:
    textColor: "{colors.dark-ink-3}"
    backgroundColor: "{colors.dark-bg}"
  dark-help-on-panel:
    textColor: "{colors.dark-ink-3}"
    backgroundColor: "{colors.dark-raised}"
  dark-help-on-desk:
    textColor: "{colors.dark-ink-3}"
    backgroundColor: "{colors.dark-desk}"
  dark-button-primary:
    textColor: "{colors.dark-on-brand}"
    backgroundColor: "{colors.dark-brand}"
  dark-link:
    textColor: "{colors.dark-brand-text}"
    backgroundColor: "{colors.dark-bg}"
  dark-rail-active:
    textColor: "{colors.dark-brand-text}"
    backgroundColor: "{colors.dark-brand-soft-on-bg}"
  dark-danger:
    textColor: "{colors.dark-danger}"
    backgroundColor: "{colors.dark-bg}"
  dark-badge:
    textColor: "{colors.dark-on-danger}"
    backgroundColor: "{colors.dark-danger}"
---

## Overview

Design Read: a calm, single-purpose converter whose page fills the window and whose tools live on one rail. Reference: direction E (rail and flyout) from the 2026-10-31 rounds, which the owner picked because it does not take space from the content. Signature: the left rail lists the job in order, Sources to Publish, with Publish as the one filled button. Dials: density 5, motion 3, variance 2. The tokens live in `src/shared/tokens.css`; this file names them.

## Colors

Iris: cool neutral grays with a slight blue-violet cast, and one iris accent for actions, selection, and focus. The accent moves off GitHub blue so the chrome no longer looks like the publication's default accent. Text on a filled accent is always white; accent-coloured text uses `--ui-brand-text`, darker in light and lighter in dark. Rejected: glass, gradients, warm paper, vermilion.

## Typography

System UI stack. 14 px minimum everywhere, including rail labels and help text; 18 px flyout titles. Weights 400, 500, 550, 600.

## Layout

A 72 px rail on the left holds every section. A 400 px flyout opens over the page; the pin keeps it beside the page instead. Read swaps the rail's sections for the reader's tools. At 700 px and below the rail is a bottom bar and the flyout a bottom sheet.

## Shapes

12 px panels, 10 px rail items, 8 px controls, round switches. Floating surfaces get a 1 px line and one soft shadow; a pinned flyout drops the shadow.

## Components

The project's own `cx` components (`src/shared/ui.css`, `ui.js`): native inputs, the custom select and colour picker. Setting rows are flat: no bordered card per row.

## Motion

The flyout slides in at 220 ms and out at 150 ms. Menus fade at 160 ms. The command palette and keyboard-started actions do not animate. Reduced motion keeps fades only.

## Do's and Don'ts

- 2026-10-31 Do: UI text in Title Case for headings, buttons, tabs, and labels. Owner's standing preference.
- 2026-10-31 Do: one rail holds every setting, in flow order: Sources, Pages, Style, Reader, Details, then Publish. Owner picked direction E after three rounds of mockups.
- 2026-10-31 Do: a sub-setting sits right under its parent switch (Outline Levels under Contents Panel), unindented, and is disabled and dimmed while the parent is off. It replaces the separate Fine Tuning group. Owner asked for no indent.
- 2026-10-31 Don't: a settings panel that pushes the page unless the owner pins it. The page keeps the full window.
- 2026-10-31 Don't: a bordered card around every setting row. The owner found the stacked boxes cluttered.
- 2026-10-31 Don't: a tinted background or an indent behind nested settings. The owner found both odd.
- 2026-10-31 Do: headings, labels, and options in --ui-ink, rail labels and unselected options in --ui-ink-2; --ui-ink-3 only for descriptions and help. Owner found the muted headings too dim.
- 2026-10-31 Do: the Iris palette for the workspace chrome, light and dark. Owner approved it from the round 3 prototype.
- 2026-10-31 Do: rail menus slide out from behind the rail's edge, like the section panels, and never cover the rail. Owner's request.
- 2026-10-31 Do: every panel, menu, dialog, and popup closes on a click outside it; only a pinned panel stays. Owner's request.
- 2026-10-31 Do: the Compass mark at the top of the rail is a logo, not a menu. Save, Open, and Download App live in Details under Project File; Keyboard Shortcuts is a ⌘K command and a button in the palette footer. Owner's request.
- 2026-10-31 Do: publication defaults are indigo #3b5bdb on white for light and periwinkle #8ea8ff on #14161b for dark, with the Contents list under the title off by default (the side nav covers it; turned on, it starts open). Owner found the GitHub-style defaults looked like VS Code.
- 2026-10-31 Do: the reader's Contents panel is a side nav on the page by default on screens over 1,020 px: transparent, no border or header, centred with the text column. Owner rejected it as a drawer. Readers hide it from the toolbar or with Focus.
- 2026-10-31 Don't: a coloured bar on the left edge of anything: selected items, callouts, quotes, highlighted rows. The owner calls it an AI tell. Mark selection with text colour and weight, and a callout with a tinted outline and its coloured title.
- 2026-10-31 Do: Read mode shows the published file's own top bar and hides the rail; a bottom pill names the mode and returns to Edit (⌘E toggles both ways). Owner's choice over a floating toolbar.
- 2026-10-31 Do: the reader's Customize panel is attached to the right edge under the top bar and slides over the page; pinned on wide screens it moves the page aside. Same model as the workspace panels.
- 2026-10-31 Don't: Focus mode, Bookmarks, or Resume Reading. Owner removed them; the Contents side nav covers the navigation.
- 2026-10-31 Do: the Compass icon uses the Iris accent; a publication recolours it to its own accent.
- 2026-10-31 Do: grouped file actions are one bordered list of full-width rows, each with an icon, a name, and a one-line description. Owner found loose wrapping buttons careless.
- 2026-10-31 Do: rail icons 18 px everywhere; Publish is an icon-only filled button; tools are one column under a divider (Search, Undo, Redo, View). View holds preview width, zoom, appearance, and Read as a Visitor. Owner found the paired buttons, the large Publish, and the unlabeled eye confusing.

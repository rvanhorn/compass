# Interface decisions

The workspace and the exported reader are one interface. The design system, its reasons, and its decision log are in
[docs/design/system.md](design/system.md); the workspace brief and the owner's decisions are in
[docs/design/pages/workspace.md](design/pages/workspace.md).

- The publication fills the window. The workspace preview is the real reader output, so Edit shows what readers get.
- One dock at the bottom holds every tool: title and save status, Undo and Redo, Contents, Pages, Design, Reader
  Tools, search and commands, Edit and Read, Appearance, More, and Publish as the final, primary action.
- Pages, Design, Reader Tools, and Publish open as sheets beside the page, with one header design: title,
  one-line description, pin, and close. A sheet can be pinned beside the page at 1280 px and wider; on phones it
  is a bottom sheet.
- Settings sit in flat groups. Each row has its label with a short description directly under it. Only Advanced
  Export Options stays collapsed.
- Every control is a Compass component: switches in the brand blue, a custom select with a listbox, the Compass
  color picker behind every color swatch, and a segmented control for Page Layout. No native select or color popup.
- Ctrl/⌘ K opens one palette for commands, every setting, and the publication's text. In Read mode, and in exported
  files, Ctrl/⌘ K is Find.
- Read mode hides every authoring tool and shows the reader's own dock, with an Edit button added in the workspace.
  Ctrl/⌘ E switches modes; Escape returns to Edit.
- The exported reader uses the same components, colored by the publication: a bottom dock (Contents, Find, Focus,
  Bookmarks, Customize, Print) and a Contents card that floats or docks beside the page, remembered when reader
  preferences are allowed.
- Motion follows frequency: panels and menus animate briefly, the palette and shortcuts do not, nothing animates a
  layout property, and reduced motion keeps only fades.

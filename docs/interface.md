# Interface decisions

The editor uses a small set of consistent interaction patterns:

- Publication title, author, and introduction stay visible above format and filename. Only advanced export options use progressive disclosure. Download stays in the bottom bar.
- File & Export contains secondary project commands with explicit action names and descriptions. The Compass brand is a label, not navigation.
- Appearance is a custom menu with a selected state, keyboard navigation, outside-click dismissal, and Escape. System still follows device appearance.
- Settings use 15–16 px labels and 14 px supporting text, positioned directly below their labels. Interactive rows use compact spacing, subtle hover fills without bottom dividers or text underlines, and visible keyboard-focus states. Font sizes stay readable as the surrounding controls and margins shrink.
- Dark mode uses neutral charcoal surfaces and slate accents. Background and Surface have separate roles; Surface can be automatic or explicitly overridden.
- Design and Features have persistent, separately scoped reset actions. Surface overrides have an explicit Reset to Automatic action.
- Drawers, disclosures, menus, dialogs, color pickers, and Focus transitions share a motion system that respects reduced motion and handles interrupted transitions.
- Undo and Redo remain in the header, sharing the File & Export row on phones. The source editor sits beside the preview on wide screens and below it on phones; linked originals are preserved when editing creates a local copy.
- Publication Check keeps a report in Publish, marks it stale after changes, and offers jumps to affected chapters. Print settings are independent of design and reader feature resets; print preview describes its pagination limits beside the switch.
- Reusable Design and Publication Branding use the same collapsed groups as the existing design controls. Reader search includes contextual snippets, while bookmarks use a native dialog and resume reading uses a dismissible prompt.

These choices apply the task's preferences alongside guidance from [Material typography](https://m3.material.io/styles/typography/applying-type), [Nielsen Norman Group's progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/), [W3C's menu-button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/), and [WCAG contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) and [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). These sources informed the design; they are not a claim of a complete accessibility audit.

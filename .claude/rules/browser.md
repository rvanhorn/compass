---
title: Browser code
description: DOM, lifecycle, navigation, untrusted content, and persistence rules for browser user-interface code.
generated: { by: claude-fable-5-1, at: "2026-10-10T01:00-0700" }
paths:
  - "**/*.{js,jsx,tsx,html}"
---

# Browser code

Applies when the project includes browser UI.

## Semantics and components

- Semantic HTML. Preserve keyboard access, focus behavior, readable contrast, responsive layout, reduced-motion preferences, and useful error states. Reusable visual elements stay separate from screen-level composition.
- Each interactive component has a clear creation, update, and cleanup contract. On removal: unsubscribe from state, remove listeners, disconnect observers, clear timers, cancel owned work. Use `addEventListener` with an abort signal or remove listeners explicitly.
- Mounting twice must not duplicate UI, listeners, observers, or timers. Cleanup tolerates repeated calls and partially completed initialization.

## DOM and rendering

- Build the DOM with `textContent`, `createElement`, and static templates. Update the affected nodes without losing focus, selection, or user-entered values. `classList` and attributes carry discrete visual states; CSS custom properties carry dynamic style values.
- Keep DOM queries inside the owning component; no repeated full-page scans; no loops that alternate layout reads and writes. Measure a slow interaction before adding caches, workers, or other performance machinery.

## Navigation

- Use the History API or the project's router. Preserve Back and Forward. Keep route changes separate from view implementation.
- When embedded in another site, preserve the host's navigation and handlers: add event listeners, never replace a shared `onpopstate` or other handler property.

## Untrusted content

- Never insert an untrusted string as HTML. When rich HTML is required, use a maintained sanitizer suited to the context. Validate an untrusted URL before assigning it to a navigation or resource attribute.

## State and persistence

- Browser storage, files, databases, and provider storage sit behind a small adapter; persistence code stays out of presentation modules.
- Stored user data has a versioned schema and deliberate migrations. A backend change migrates existing data explicitly and preserves the old data until the new write succeeds. A persistence failure is reported, never claimed as saved.
- Imported or externally supplied data is validated before it changes state and applied atomically: invalid input must not partially replace valid data. Reset and destructive actions are explicit and, where the product supports it, recoverable.

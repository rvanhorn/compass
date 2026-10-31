---
title: CSS
description: Native CSS organization, modern syntax, embedding, and the plain-HTML integration of an optional CSS framework.
generated: { by: claude-fable-5-1, at: "2026-10-10T01:00-0700" }
paths:
  - "**/*.css"
---

# CSS

How stylesheets are written; how a UI looks is the design skill's matter.

## Native CSS

- Native CSS by default. When the project needs the boundaries, organize by tokens, base rules, layout, components, and views, with responsive rules next to their owner.
- Custom properties for shared design tokens. Grid or Flexbox for layout. Logical properties (`margin-inline`, `padding-block`) where layout follows writing direction. Fluid sizing with `clamp()`. Container queries when a component depends on its available space; viewport media queries for viewport-level changes.
- Shallow native nesting where it clarifies ownership. Low-specificity selectors. Cascade layers when application and third-party styles need explicit ordering.
- Modern syntax where the declared targets support it: `rgb(0 0 0 / 50%)`, range media queries, `:focus-visible`. `@supports` and fallbacks for an optional enhancement. Always preserve reduced-motion preferences and visible keyboard focus.
- When embedded in another site, scope selectors and tokens to the application root, or use Shadow DOM when its isolation fits. Cascade layers alone do not isolate host styles.

## Optional frameworks

- Keep an existing styling system unless replacement is in scope. Use the documentation for the installed version and the plain HTML and JavaScript integration; check whether interactive components need a separate script and carry its initialization, accessibility, and cleanup contracts.
- Compile framework CSS in development or the production build and ship the result. No development CDN compiler in production.
- Tailwind: include every HTML and JavaScript source in class detection; map state to complete class names, never `bg-${color}-500`; custom properties for runtime values; follow the installed version's source and theme configuration (v4 uses `@theme` in CSS). When embedded, omit or isolate global resets such as Preflight and confirm the host page is unchanged outside the application.

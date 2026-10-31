---
title: React
description: Component, state, data, routing, and file-organization rules for React code.
generated: { by: claude-fable-5-1, at: "2026-10-10T01:00-0700" }
paths:
  - "**/*.{jsx,tsx}"
---

# React

Applies when the package uses React.

## Components and state

- Functional components only. Before adding state, a ref, a flag, or a guard, write the derived expression and show what it cannot express. Before adding a context or an enum value, check whether an existing field or consumer already encodes the distinction.
- JSX, hooks, and side effects stay out of pure utility modules. Preserve the repository's component, state, routing, and styling patterns.
- Prefer the repository's shared accessible components and semantic design tokens over one-off markup and literal styles. Compose utility classes through the repository's canonical helper.
- Preserve focus, keyboard use, reduced motion, contrast, overflow, and touch behavior.

## Data and routing

- When TanStack Query owns server state, requests go through its domain hooks, and a successful mutation invalidates the affected keys.
- Route files hold route configuration; page behavior lives with its owning components. Generated router files (such as `routeTree.gen.ts`) are never edited by hand; a development server that predates a new route file cannot see it, so restart it first.
- Browser-mode tests run in the configured browser runner. A DOM simulation does not prove behavior in a real browser.

## File organization

- One folder per component with an `index.tsx` (or `index.jsx`) entry. Private sub-components in `_components/` beneath the owner. A component file is PascalCase, named for its exported component; non-component files stay lowercase.
- A small single-use type stays inline; a shared component contract or a substantial group of related types goes in a sibling `<Component>.types.ts`. Exported props are `<Component>Props`. Two or more exported types in one file prompt an ownership review, not an automatic extraction.
- Short single-use helpers stay inline; extracted pure helpers go in a sibling `<Component>.utils.ts`. A one-off component-local state hook stays inline. Domain hooks live in `src/hooks/<domain>/`, project-wide pure helpers in `src/utils/`; the project's `REPOSITORY.md` records any substitution.
- Component body order: hook setup (the `useState` calls grouped, then a blank line before `useQuery`, `useForm`, and other non-state hooks), derived values, handlers, memoized configuration, one contiguous block of `useEffect` calls, the JSX return.
- About 300 component lines or 15 helper lines prompt a responsibility review. Extract at a natural seam; preserve a valid contract, invariant, or test boundary even with one consumer.
- Place a component by its consumers: the shared UI folder for a primitive, the area folder (`site/`, `admin/`) for a component the area owns, `_components/` beneath the one owner otherwise. A private sub-component is not defined inside another component's file; a file may export a family of parts (`Card`, `CardBody`, `CardLink`).
- A shared primitive that exports a class-name function keeps its variant tables and that function in `<Component>.utils.ts`, the unions in `<Component>.types.ts`, and re-exports from `index.tsx`. A validation schema lives in the schema folder, never in a component's utils file.

## Preview

- Use a separate agent preview port and reuse it for the session; never take the owner's development server port. The default preview uses isolated state or unauthenticated read-only routes; a live authenticated session stays outside it. The project's `REPOSITORY.md` records the preview command.

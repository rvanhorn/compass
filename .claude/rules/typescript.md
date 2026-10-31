---
title: TypeScript
description: Type modeling, narrowing, exhaustiveness, syntax preferences, and boundary validation for TypeScript files.
generated: { by: claude-fable-5-1, at: "2026-10-10T01:00-0700" }
paths:
  - "**/*.{ts,tsx}"
---

# TypeScript

The modules rule applies to TypeScript too; this adds what the type system changes. The file names in the modules rule (`index.js`, `<name>.utils.js`, `<name>.types.js`) are the same names with `.ts` or `.tsx` in a TypeScript package.

## Configuration

- Preserve strictness, module resolution, target, path aliases, and project references as the project sets them.
- A root script can skip a package with its own `tsconfig`; a build script can omit type-checking. Inspect the script before treating a build as type evidence.

## Modeling

- Use types to reject invalid states while the model stays clear. A variant is a discriminated union with one literal discriminant name used throughout the repository, never a bag of optional fields whose contradictory combinations compile.
- Build a type from parts that are all legal instead of restricting a loose type at runtime: a non-empty list is `[T, ...T[]]`; a range is a start plus a duration.
- Strengthen a type only where a `!`, a cast, or a should-never-happen throw marks it as too weak. Keep the plain type while every operation on it is total.
- Brand a primitive that carries a distinct meaning; validate it once where it is created and trust the brand downstream.
- External data is `unknown` until parsed at the boundary into a named domain type derived from the repository's schema. One source of truth: never a schema plus a duplicate interface plus a hand-written guard. Never cast external input as a substitute for validation; use the repository's validation library.

## Narrowing

- Narrow with a discriminant `switch`, `in`, or `typeof` before writing a user-defined guard. A guard verifies what its name claims. `satisfies` where a value must match a type without widening.
- Every `switch` or match on a union has an exhaustiveness check the compiler enforces (a `never` default or `satisfies never`), so a new variant fails compilation until handled.
- Derive from an existing type with `Pick`, `Omit`, `Parameters`, `ReturnType`, or `typeof` before declaring a parallel shape by hand.

## Syntax

- `type` alias for a handwritten object shape; `interface` only for declaration merging or extending a third-party interface. Lint: `typescript/consistent-type-definitions: type`.
- Named `const` arrow functions for standalone functions and React components; a function declaration only where a typed function expression cannot express a required feature cleanly. Lint: `func-style: expression`, `prefer-const`.
- No `any`, `as any`, non-null `!`, or type-error suppression without the owner's approval.
- Generated code is exempt from the syntax rules. Beyond these rules, the formatter and linter decide; code reads like its neighbors.

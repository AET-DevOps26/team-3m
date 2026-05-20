---
paths:
  - "client/src/components/ui/**"
---
# shadcn Component Rules

> Path-scoped rules for shadcn-managed UI primitives. Applies to **`client/src/components/ui/`**. Extends [coding-style.md](./coding-style.md).

## Managed Directory

`client/src/components/ui/` is the shadcn-managed directory. Treat the files here as generated output of the shadcn CLI / preset (e.g. `radix-nova`). They are not arbitrary application code.

## What You Can Change

- **Add new variants** to existing components via `cva` (e.g. a new `variant: "success"` on `Alert`). This is the preferred extension point — actively encouraged when a new style is needed.
- **Add new sizes** through the existing `cva` `size` slot, same rules.
- Adding a new variant must not delete or rename existing variants.

## What You Cannot Change

- Do not alter the component's structure, props, slots, `data-*` attributes, exported names, or rendering behavior
- Do not edit the base class string of an existing variant — add a new variant instead
- Do not introduce app-specific logic into these files (no API calls, hooks, routing, business rules)

## Custom Components

If a design needs a component that does not exist in shadcn, or a "shadcn-like" component with different behavior:

- Create a new file **outside** `client/src/components/ui/` (typical locations: `client/src/components/<feature>/` or `client/src/components/<kebab-name>.tsx`)
- Match the shadcn aesthetic — use the same Tailwind tokens (`bg-card`, `text-muted-foreground`, `ring-foreground/10`, etc.), `cva` for variants, `data-slot` attributes, and `cn()` for class merging
- It is fine to **compose or merge** shadcn primitives into a higher-level component (e.g. a `ConnectionStatusBanner` built on `Alert` + a new variant)

## CSS Variables and Theming

- Theme via shadcn's CSS custom properties (defined in `client/src/index.css` under `:root` / `.dark`) — do not hardcode colors or radii in components
- Reference tokens through their Tailwind utilities (`bg-card`, `text-primary`, `ring-foreground/10`, `rounded-(--radius-lg)`) — these resolve to the CSS variables
- Need a new color or radius? Add the variable in `index.css` and wire it into Tailwind via `@theme inline` — then consume it everywhere

## Adding shadcn Components

- Use the shadcn CLI (or the `shadcn` skill / MCP) — never hand-write a shadcn component from memory
- After regenerating, re-apply any custom variants you previously added

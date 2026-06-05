# UI Coding Standards

## Rule: shadcn/ui Components Only

**All UI in this project must be built exclusively from shadcn/ui components. Creating custom UI components is strictly prohibited.**

### What this means

- Every button, input, dialog, card, table, badge, form element, and any other UI primitive must come from the shadcn/ui library.
- Do **not** create files under `src/components/` unless they are page-level compositions that wire together shadcn/ui components with data and logic — they must not introduce new visual primitives.
- Do **not** write custom CSS classes or Tailwind utility soup to build a component from scratch when a shadcn/ui equivalent exists.

### Adding a new component

Use the shadcn CLI to add components:

```bash
npx shadcn@latest add <component-name>
```

Components are installed into `src/components/ui/`. Import them from `@/components/ui/<component-name>`.

### Project configuration

| Setting | Value |
|---|---|
| Style | `base-nova` |
| Base color | `neutral` |
| CSS variables | enabled |
| Icon library | `lucide-react` |
| Component alias | `@/components/ui` |

Theme tokens live in `src/app/globals.css` under `@theme inline { ... }` (Tailwind v4 — no `tailwind.config.js`).

### Why

Consistency, maintainability, and accessibility. shadcn/ui components are built on Radix UI primitives and are fully accessible out of the box. Custom components fragment the visual language and must be maintained separately.

## View Controls and Filter Buttons

**Controls that switch between views or filter the content of a table (e.g. "Week View / Month View") must be rendered outside and above the Card that wraps the table — never inside `CardContent`.**

Place them in a sibling element before `<Card>`, not as children of `CardHeader` or `CardContent`. This keeps the card boundary clean and makes the control hierarchy clear to the user.

```tsx
// Correct
<div className="flex flex-col gap-4">
  <div>
    <Button onClick={toggleView}>Week View</Button>
  </div>
  <Card>
    <CardContent>
      <Table>…</Table>
    </CardContent>
  </Card>
</div>

// Wrong — control buried inside the card
<Card>
  <CardContent>
    <Button onClick={toggleView}>Week View</Button>
    <Table>…</Table>
  </CardContent>
</Card>
```

## Date Formatting

**All dates displayed in the UI must be formatted using the `date-fns` package. No other date formatting approach is permitted.**

### Format

Use the format string `dd.MM.yyyy`:

```ts
import { format } from 'date-fns';

format(date, 'dd.MM.yyyy') // → "01.01.2026", "26.10.2024", "13.12.2021"
```

- Day and month are always zero-padded to two digits.
- Year is always four digits.
- Separator is a dot (`.`), not `/` or `-`.

## Hover-Reveal Action Buttons

**Contextual action buttons (edit, delete, etc.) placed inline within table rows or list entries must be hidden by default and revealed only on hover.** This keeps the UI clean at a glance while still making actions discoverable.

### Implementation

Use Tailwind's `group` / `group-hover` utilities with an `opacity` transition. Apply `group` to the hover target (the row or entry container) and `opacity-0 group-hover:opacity-100 transition-opacity duration-150` to the button container.

```tsx
// Row-level trigger — buttons appear when hovering anywhere in the row
<TableRow className="group ...">
  <TableCell>
    <div className="flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <Button size="icon-xs" variant="ghost" ...><Pencil /></Button>
      <Button size="icon-xs" variant="ghost" ...><Trash2 /></Button>
    </div>
  </TableCell>
</TableRow>

// Entry-level trigger — buttons appear only when hovering that specific entry
<div className="group flex items-start gap-1">
  <p className="flex-1 text-xs">Note text here</p>
  <div className="flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
    <Button size="icon-xs" variant="ghost" ...><Pencil /></Button>
    <Button size="icon-xs" variant="ghost" ...><Trash2 /></Button>
  </div>
</div>
```

**Nested groups**: When a row has row-level buttons AND entry-level buttons inside it, use `group` on the row for the row-level buttons and a separate `group` on each entry div for entry-level buttons. Tailwind resolves `group-hover` against the **closest** `group` ancestor, so the two scopes remain independent.

### Button sizing and colours

Use `size="icon-xs"` + `variant="ghost"` for all inline action buttons. Standard colours:

| Action | Icon | Class |
|---|---|---|
| Add | `PlusCircle` | `text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700` |
| Edit | `Pencil` | `text-blue-600 hover:bg-blue-50 hover:text-blue-700` |
| Delete | `Trash2` | `text-red-500 hover:bg-red-50 hover:text-red-600` |

Always add a `title` attribute for tooltip text.

## Language

**The application is Polish-only. All user-facing strings must be written in Polish. There is no i18n system, no translation files, and no language switching.**

Do not add multi-language support or wrap strings in translation helpers.

### Checklist before opening a PR

- [ ] Every visual element uses a shadcn/ui component from `@/components/ui/`.
- [ ] No new hand-rolled component files were added under `src/components/` that introduce new visual primitives.
- [ ] Any new shadcn component was added via `npx shadcn@latest add`, not copied manually.
- [ ] All displayed dates are formatted with `date-fns` using the `dd.MM.yyyy` format string.
- [ ] All user-facing strings are written in Polish.

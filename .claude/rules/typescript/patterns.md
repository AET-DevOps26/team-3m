---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Patterns

> This file extends [common/patterns.md](../common/patterns.md) with TypeScript/JavaScript specific content.

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## Custom Hooks Pattern

Abstract complex logic into reusable hooks:

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

### Data Fetching Hooks

- Use **TanStack Query** (`@tanstack/react-query`) as the default data fetching layer
- Prefer Suspense queries (`useSuspenseQuery`) when the surrounding route can render a meaningful `<Suspense>` fallback (skeleton)
- Separate reads from writes — readers are `useResource`/`useResourceList`, writers are grouped in `useResourceMutations`

```typescript
// Reading
const { data } = useOrder(orderId)
const { data: orders } = useOrderList(filters)

// Mutations
const { createOrder, updateOrder, deleteOrder } = useOrderMutations()
```

## Product-Aware Components

Do not import shadcn primitives (`Button`, `Dialog`, `DropdownMenu`, …) directly inside feature code spread across the app. Wrap them in product-aware components that encode the **purpose**, not the primitive.

- Live outside `client/src/components/ui/` — typical location `client/src/components/<feature>/<name>.tsx`
- Each component starts with a short doc comment (`/** Submit button used on the transaction-import flow. ... */`) describing purpose, where it is used, and any constraints
- Expose a narrow, predictable API; do **not** re-expose every prop of the underlying primitive
- Reused by call sites — if a primitive is used identically in two places, wrap it

```typescript
/** Primary CTA for destructive confirmation dialogs (delete, discard). */
export function ConfirmDestructiveButton(props: ConfirmDestructiveButtonProps) {
  return <Button variant="destructive" {...props} />
}
```

## Compound Components

For complex UI patterns (dialogs with header/body/footer, multi-step flows, menu trees), expose a compound API instead of a single mega-component. Each sub-component handles one concern and they coordinate via context.

```typescript
<TransactionImport>
  <TransactionImport.Dropzone />
  <TransactionImport.Progress />
  <TransactionImport.Result />
</TransactionImport>
```

## Blocks, Not Pages

- A **page** wires routing, data loading, and layout
- A **block** is a self-contained, reusable section of UI (e.g. `TransactionImportBlock`, `ConnectionTesterBlock`)
- Build pages by composing blocks. Blocks live in `client/src/components/blocks/<name>.tsx` and own their internal state and UI; pages stay thin

## Forms

- Use **React Hook Form** for form state and validation
- Use **Zod** schemas for the validation contract and infer types from the schema (`z.infer<typeof schema>`)
- Wire RHF and Zod via `@hookform/resolvers/zod`
- Field-level error rendering goes through RHF's `formState.errors`; surface a global submit error via the central error handler

```typescript
const schema = z.object({
  amount: z.number().positive(),
  occurredAt: z.iso.date(),
})
type FormValues = z.infer<typeof schema>

const form = useForm<FormValues>({ resolver: zodResolver(schema) })
```

## Tables

- Use **TanStack Table** (`@tanstack/react-table`) for table logic — sorting, filtering, pagination, column visibility, row selection
- Use shadcn `Table` primitives (`Table`, `TableHeader`, `TableRow`, `TableCell`, …) for markup and styling
- Wrap the pairing in a product-aware `DataTable` component that takes `columns` and `data` (and feature flags like `enableRowSelection`) — do not re-implement the wiring per page

## Repository Pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```

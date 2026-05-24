---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with TypeScript/JavaScript specific content.

## Formatting and Linting

- Use **Biome** as the formatter and linter

## File and Folder Naming

- Use `kebab-case` for all file and folder names

## Shadcn/UI

- When adding Shadcn/UI components, always use the Shadcn CLI — never add them from memory
- Avoid excessive use of the `Card` component
- Use the **shadcn** skill or the shadcn MCP
- Do not modify shadcn-managed components — only add new variants via `cva`. See [shadcn-components.md](./shadcn-components.md) for the full rules and the managed path

## React Components

- Avoid hooks or functions named `renderSomething()` — create a proper React component instead
- Follow existing layouts and design patterns in the codebase
- Write custom hooks to abstract complex logic away from components
- Avoid over-styling: keep variant counts small, do layout via the parent container (not the leaf), and give components a predictable API (`variant`, `size`, `className`, children) instead of a fan of one-off boolean props

## Styling and Design Tokens

- Consume design tokens (CSS variables defined in `client/src/index.css`) via Tailwind tokens — `bg-card`, `text-muted-foreground`, `ring-foreground/10`, `--radius`, etc.
- Do not hardcode raw colors, radii, or font values (`#fff`, `rgb(...)`, `12px`) in components. Add a token in `index.css` and reference it everywhere
- New tokens belong in `:root` / `.dark` in `index.css`; wire them into Tailwind via `@theme inline`

## Lazy Loading

- Use lazy imports and code splitting for routes and heavy components

## useEffect

- Avoid unnecessary `useEffect`s — follow the advice from [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- Prefer `useMemo` or callbacks integrated into event handlers

## Nullish Coalescing

- Always prefer `??` over `||` for fallbacks — `||` swallows valid `0`, `""`, and `false`
- Use `||` only when falsy-coalescing is intentional, and add a comment

## Function Parameters

- Prefer a single param object when the function takes 2+ parameters, when params share a primitive type, or when params are optional and may grow
- Single-argument functions where the argument *is* the value (`formatDate(date)`) stay positional

## UI States

### Empty States

- Never show a blank screen — provide a message or call to action when no data is available

### Loading States

- Show a skeleton while data is being fetched
- Fall back to a loading spinner only when a skeleton is not feasible

### Error States

- Inform the user with actionable messages and recovery options like "Retry" or "Edit" for invalid data

### Pagination

- Handle pagination properly, ideally through infinite scrolling

## Types and Interfaces

Use types to make public APIs, shared models, and component props explicit, readable, and reusable.

### Public APIs

- Add parameter and return types to exported functions, shared utilities, and public class methods
- Let TypeScript infer obvious local variable types
- Extract repeated inline object shapes into named types or interfaces

```typescript
// WRONG: Exported function without explicit types
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}

// CORRECT: Explicit types on public APIs
interface User {
  firstName: string
  lastName: string
}

export function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

### Interfaces vs. Type Aliases

- Use `interface` for object shapes that may be extended or implemented
- Use `type` for unions, intersections, tuples, mapped types, and utility types
- Prefer string literal unions over `enum` unless an `enum` is required for interoperability

```typescript
interface User {
  id: string
  email: string
}

type UserRole = 'admin' | 'member'
type UserWithRole = User & {
  role: UserRole
}
```

### Avoid `any`

- Avoid `any` in application code
- Use `unknown` for external or untrusted input, then narrow it safely
- Use generics when a value's type depends on the caller

```typescript
// WRONG: any removes type safety
function getErrorMessage(error: any) {
  return error.message
}

// CORRECT: unknown forces safe narrowing
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}
```

### React Props

- Define component props with a named `interface` or `type`
- Type callback props explicitly
- Do not use `React.FC` unless there is a specific reason to do so

```typescript
interface User {
  id: string
  email: string
}

interface UserCardProps {
  user: User
  onSelect: (id: string) => void
}

function UserCard({ user, onSelect }: UserCardProps) {
  return <button onClick={() => onSelect(user.id)}>{user.email}</button>
}
```

### JavaScript Files

- In `.js` and `.jsx` files, use JSDoc when types improve clarity and a TypeScript migration is not practical
- Keep JSDoc aligned with runtime behavior

```javascript
/**
 * @param {{ firstName: string, lastName: string }} user
 * @returns {string}
 */
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}
```

## Immutability

Use spread operator for immutable updates:

```typescript
interface User {
  id: string
  name: string
}

// WRONG: Mutation
function updateUser(user: User, name: string): User {
  user.name = name // MUTATION!
  return user
}

// CORRECT: Immutability
function updateUser(user: Readonly<User>, name: string): User {
  return {
    ...user,
    name
  }
}
```

## Error Handling

Use async/await with try-catch and narrow unknown errors safely:

```typescript
interface User {
  id: string
  email: string
}

declare function riskyOperation(userId: string): Promise<User>

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}

const logger = {
  error: (message: string, error: unknown) => {
    // Replace with your production logger (for example, pino or winston).
  }
}

async function loadUser(userId: string): Promise<User> {
  try {
    const result = await riskyOperation(userId)
    return result
  } catch (error: unknown) {
    logger.error('Operation failed', error)
    throw new Error(getErrorMessage(error))
  }
}
```

## Input Validation

Use Zod for schema-based validation and infer types from the schema:

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

type UserInput = z.infer<typeof userSchema>

const validated: UserInput = userSchema.parse(input)
```

## Console.log

- No `console.log` statements in production code
- Use proper logging libraries instead

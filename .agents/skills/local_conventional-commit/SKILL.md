---
name: conventional-commit
description: (Team 3M) Generate conventional commit messages from git diffs, staged changes, or user descriptions. Use this skill whenever the user asks to write a commit message, wants help with a commit, mentions "conventional commit", asks to summarize changes for a commit, or says anything like "commit this", "write a commit", "what should my commit message be", or "help me commit". Also trigger when the user provides a git diff or describes code changes and expects a commit-ready output. Even casual phrasing like "commit msg" or "how should I commit this" should trigger this skill.
---

# Conventional Commits Skill

This skill generates clean, conventional commit messages that are ready to copy and use. The output is always a plain commit message — never wrapped in explanation, never decorated with bullet points, never followed by a summary of what you did.

## First Step: Understand the Changes

Before writing anything, figure out what changed and why. Use these sources in order of preference:

1. If the user provides a diff or description, use that directly.
2. If a git repository is available, run `git diff --staged` to see what is staged. If nothing is staged, run `git diff` for unstaged changes. Also run `git log --oneline -10` to get a sense of the project's existing commit style and any patterns in scope naming or type usage.
3. If the user just describes changes in plain language, work from that.

When checking git logs, pay attention to how previous commits name scopes, whether they use issue keys, and what types are common. Mirror the existing conventions of the repository where possible, while staying within the conventional commit spec.

## Commit Message Format

Every commit message follows this structure:

```
<type>(<optional scope or Issue-Key>): <description>

<optional body>

<optional footer(s)>
```

The type is always lowercase. The description starts lowercase and does not end with a period. The entire first line (type + scope + description) should stay under 72 characters when possible.

### Types

feat — a new feature for the application or library
fix — a bug fix
test — adding or updating tests
docs — documentation changes
refactor — code restructuring without changing behavior
style — formatting, whitespace, semicolons, no logic changes
chore — maintenance tasks, dependency updates, tooling
perf — performance improvements
ci — CI/CD pipeline or configuration changes
build — build system or external dependency changes

### Scope

A scope is optional. When used, it is a short noun in parentheses that names the area of the codebase affected, like `fix(parser):` or `feat(auth):`. If the repository's git log shows a pattern of using issue keys as scopes (like `feat(PROJ-123):`), follow that pattern.

### Breaking Changes

If a commit introduces a breaking change, indicate it with `!` before the colon in the header:

```
feat(api)!: remove deprecated /v1/users endpoint
```

Optionally, a `BREAKING CHANGE:` footer can be added to elaborate. If `!` is used in the header, the footer is not required but can provide additional detail.

### Description

The description immediately follows the colon and space. It is a short, imperative summary of what the change does. Think of it as completing the sentence "This commit will..." — so write "add pagination" not "added pagination" or "adds pagination".

### Body

The body is **optional**. Only include it when the description alone does not convey enough context — for instance, when the reasoning behind a decision matters, when a non-obvious approach was taken, or when the change has implications that are not self-evident from the diff.
Avoid descriptions if the commit contains only small changes. Keep the body short!

When writing a body, follow these rules strictly:

- Separate the body from the description with one blank line.
- Never use bullet points, dashes, asterisks, or any list formatting. Write in flowing prose, using complete sentences.
- Break the text into short paragraphs separated by blank lines. Each paragraph should be a coherent thought.
- Focus on WHY the change was made the way it was, not WHAT changed (the diff shows what changed).
- Keep lines to a reasonable length (around 72 characters is conventional, but don't stress over a few characters).

### Footers

Footers are optional. They appear after the body (or after the description if there is no body), separated by a blank line. Each footer is a token followed by `:<space>` or `<space>#`, then a value.

Common footers:

```
Refs: #123
Reviewed-by: Name <email>
BREAKING CHANGE: description of what breaks
```

Footer tokens use `-` instead of spaces (e.g., `Reviewed-by`, not `Reviewed by`). The exception is `BREAKING CHANGE` which is always uppercase and may use a space.

Never include `Co-authored-by` footers referencing Claude, Anthropic, or any AI. The commit message should read as if written by the developer.

## Output Rules

When presenting the commit message:

1. Output only the commit message itself inside a single code block. Nothing before it, nothing after it. No preamble like "Here's your commit message:". No explanation of choices. No follow-up suggestions. Just the message.
2. Never use bullet points or lists anywhere — not in the commit body, not in surrounding text, nowhere.
3. The message should be immediately copy-pasteable. A developer should be able to triple-click, copy, and paste it into their terminal without editing.

## Examples

**Example 1 — Simple feature:**

Input: "Added a dark mode toggle to the settings page"

Output:
```
feat(settings): add dark mode toggle
```

**Example 2 — Bug fix with scope from git log pattern:**

Input: User's git log shows scopes like `auth`, `api`, `db`. The diff fixes a null pointer in the authentication middleware.

Output:
```
fix(auth): handle null user object in token validation middleware
```

**Example 3 — Change that benefits from a body:**

Input: "Switched from REST to GraphQL for the product catalog endpoint. We did this because the frontend was making 6 separate REST calls to render a single product page, and GraphQL lets us fetch everything in one request."

Output:
```
feat(catalog): replace REST endpoint with GraphQL resolver

The product detail page required six separate REST calls to assemble
all the data needed for rendering. This created noticeable latency
on slower connections and complicated error handling on the frontend.

A single GraphQL query now retrieves the complete product payload
in one round trip, which simplifies the frontend data layer and
reduces page load time.
```

**Example 4 — Breaking change with footer:**

Input: "Removed support for Node 14 in the build pipeline"

Output:
```
build!: drop Node.js 14 support

Node.js 14 reached end-of-life in April 2023 and no longer receives
security patches. Continuing to support it added maintenance burden
to the CI matrix without meaningful benefit.

BREAKING CHANGE: Node.js 14 is no longer supported. The minimum
required version is now Node.js 18.
```

**Example 5 — Chore with issue key scope:**

Input: User's git log shows `chore(TEAM-456):` style scopes. Task is updating ESLint config.

Output:
```
chore(TEAM-812): update eslint config to v9 flat format
```

**Example 6 — Refactor with body explaining the why:**

Input: "Refactored the payment processing module to use the strategy pattern instead of a big switch statement"

Output:
```
refactor(payments): replace switch statement with strategy pattern

The original switch block had grown to fourteen cases and was
becoming difficult to extend safely. Each new payment method
required modifying the same function, increasing the risk of
regressions.

The strategy pattern isolates each payment method behind its own
class, so adding a new method means adding a new file rather than
touching shared control flow.
```

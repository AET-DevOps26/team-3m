# team-3m

Repository for team 3M

## Docker Compose

Run the Spring Boot server and React client:

```sh
docker compose up --build
```

The client is available at <http://localhost:5173> and the server at <http://localhost:8080>.

## AI Agent Setup

This project is configured for AI coding agents (Claude Code, Codex). Rules, skills, and MCP servers ensure agents follow consistent standards across the codebase.

### Rules

Coding rules live in `.claude/rules/` and are automatically loaded based on the files being edited. They enforce consistent style, testing, security, and architectural patterns. For more information, see the [Claude Code Docs](https://code.claude.com/docs/en/memory).

```bash
.claude/rules/
├── common/              # Apply to all code
│   ├── coding-style.md  # Immutability, KISS/DRY/YAGNI, naming, file organization
│   ├── testing.md       # TDD workflow, AAA pattern, 80%+ coverage
│   ├── patterns.md      # Repository pattern, API envelope, service classes
│   └── code-review.md   # Review checklist, security triggers, severity levels
├── java/                # Apply to *.java, pom.xml, build.gradle*
│   ├── coding-style.md  # Records, sealed classes, Optional, modern Java (16+)
│   ├── patterns.md      # Constructor injection, Spring conventions, Flyway, jOOQ
│   └── testing.md       # JUnit Jupiter 5, AssertJ, Mockito, Testcontainers
└── typescript/          # Apply to *.ts, *.tsx, *.js, *.jsx
    ├── coding-style.md  # Biome, kebab-case files, React patterns, Zod, shadcn/ui
    ├── patterns.md      # Custom hooks, data fetching, repository pattern
    └── testing.md       # Playwright for E2E testing
```

#### How rules work

- **Common rules** apply to all code. Language-specific rules extend them — they don't replace them.
- Each language-specific file declares a `paths` frontmatter (e.g. `**/*.java`) so agents load only the relevant rules for the files being edited.
- When common and language-specific rules conflict, the language-specific rule takes precedence.
- Currently, this only works for Claude Code, so to use it in Codex, link the files in `AGENTS.override.md` for Codex to load.

#### Managing rules

- **Add a rule:** Create a new `.md` file in the appropriate directory. Add a `paths` frontmatter block for language-specific rules. Link it in `AGENTS.override.md` for codex.
- **Edit a rule:** Modify the file directly. Changes take effect on the next agent session.
- **Remove a rule:** Delete the file.

### MCP Servers

MCP (Model Context Protocol) servers provide tool integrations for AI coding agents. They are configured in two places to support both Claude Code and Codex:

| File | Agent |
|------|-------|
| `.mcp.json` | Claude Code (Anthropic) |
| `.codex/config.toml` | Codex (OpenAI) |

Both files define the same servers — keep them in sync when adding or removing MCP servers.

### Skills

Skills extend AI coding agents with reusable instructions. They live in `.claude/skills/` (Claude Code) and `.agents/skills/` (Codex) and are tracked via `skills-lock.json`.

```bash
# Add a skill (e.g. shadcn/ui)
npx skills add shadcn/ui
# or
npx skills add https://github.com/affaan-m/everything-claude-code/tree/main/skills/docker-patterns -a claude-code -a codex

# List installed skills
npx skills list

# Update skills
npx skills update

# Remove a skill
npx skills remove <skill-name>
```

Only skills prefixed with `local_` (e.g. `.claude/skills/local_conventional-commit/`) are tracked in git. Externally synced skills are ignored via `.gitignore`.

To install skills from the lock file and symlink agent skills to Claude Code:

```bash
./install-skills.sh
```

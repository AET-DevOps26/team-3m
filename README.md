# Kontor

**Kontor** is a Progressive Web App that consolidates personal finance data - transactions, portfolios, and market data - and uses a GenAI layer to surface personalised, actionable insights. Stock and ETF data is sourced via Yahoo Finance; the AI component uses Retrieval-Augmented Generation (RAG) over the user's own financial data and curated financial news.

---

## Tech Stack

| Layer              | Technology                                                   |
| ------------------ | ------------------------------------------------------------ |
| Client             | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui  |
| Server             | Java 25, Spring Boot 4, Gradle                               |
| Linting/Formatting | Biome (client), Spotless + Checkstyle + Error Prone (server) |

---

## Setup

The repository includes a root `.env.example` and a local `.env` with the default compose values. Update `.env` if you want to change the Postgres credentials, Keycloak database credentials, or shared local Keycloak dev-user password.

The Compose Keycloak service is for local development only. It runs `start-dev`, imports `infra/keycloak/realms/kontor-realm.json`, and stores Keycloak state in the `keycloak_postgres_data` Docker volume. The realm import is skipped once the realm already exists, so delete that volume if you need to re-apply the import from scratch.

Local Keycloak users live in `infra/keycloak/realms/kontor-users-0.json`. Add another object to the `users` array to create more local accounts with their own `realmRoles` and `attributes`. The sample users share the `KEYCLOAK_DEV_USERS_PASSWORD` environment placeholder so adding users does not require more Compose variables.

```sh
docker compose up --build
```

| Service | URL                     |
| ------- | ----------------------- |
| Client  | <http://localhost:5173> |
| Server  | <http://localhost:8080> |

### Local Development

#### Client (`client/`)

```sh
cd client
npm install
npm run dev
```

| Task             | Command             |
| ---------------- | ------------------- |
| Type check       | `npm run typecheck` |
| Lint             | `npm run lint`      |
| Lint (autofix)   | `npm run lint:fix`  |
| Format (autofix) | `npm run format`    |
| Build            | `npm run build`     |

#### Server (`core/`)

```sh
cd core
./gradlew build
```

| Task          | Command                                   |
| ------------- | ----------------------------------------- |
| Test          | `./gradlew test`                          |
| Compile check | `./gradlew compileJava`                   |
| Format check  | `./gradlew spotlessCheck`                 |
| Format fix    | `./gradlew spotlessApply`                 |
| Lint          | `./gradlew checkstyleMain checkstyleTest` |

---

## Deployment

The Kontor stack ships as a single Helm chart in
[`deploy/helm/kontor/`](deploy/helm/kontor/README.md) that bundles the client,
core, Postgres (with `pgvector`), and an optional Keycloak. The chart README
documents environment overlays (`values-prod.yaml`,
`values-pr.template.yaml`), required secrets, and the install / upgrade flow.


```sh
helm upgrade --install kontor ./deploy/helm/kontor \
  -n team-3m \
  -f deploy/helm/kontor/values-prod.yaml \
  -f deploy/helm/kontor/secrets.yaml
```

---

### Top Level Architecture

![Component Diagram](deliverables/models/COMPONENT_DIAGRAM.svg)

### Use Case Diagram

![Use Case Diagram](deliverables/models/USE_CASE_DIAGRAM.svg)

### Analysis Object Model

![Analysis Object Model](deliverables/models/ANALYSIS_OBJECT_MODEL.svg)

---

## AI Agent Setup

This project is configured for AI coding agents (Claude Code, Codex). Rules, skills, and MCP servers ensure agents follow consistent standards across the codebase.

### Project Instructions

[`CLAUDE.md`](CLAUDE.md) is the top-level instruction file for Claude Code. It is automatically loaded at the start of every agent session and provides the agent with project context, commands, and coding rules. [`AGENTS.md`](AGENTS.md) serves the same purpose for Codex. For more information, see the [Claude Code docs on CLAUDE.md](https://code.claude.com/docs/en/claude-directory#ce-claude-md).

### Rules

Coding rules live in `.claude/rules/` and are automatically loaded based on the files being edited. They enforce consistent style, testing, security, and architectural patterns. For more information, see the [Claude Code Docs](https://code.claude.com/docs/en/memory).

```text
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

- **Common rules** apply to all code. Language-specific rules extend them — they don't replace them.
- When common and language-specific rules conflict, the language-specific rule takes precedence.

### MCP Servers

MCP (Model Context Protocol) servers provide tool integrations for AI coding agents. They are configured in two places to support both Claude Code and Codex:

| File                 | Agent                   |
| -------------------- | ----------------------- |
| `.mcp.json`          | Claude Code (Anthropic) |
| `.codex/config.toml` | Codex (OpenAI)          |

Both files define the same servers — keep them in sync when adding or removing MCP servers.

### Skills

Skills extend AI coding agents with reusable instructions. They live in `.claude/skills/` (Claude Code) and `.agents/skills/` (Codex) and are tracked via `skills-lock.json`.

```bash
# Add a skill
npx skills add shadcn/ui

# List installed skills
npx skills list

# Update skills
npx skills update

# Remove a skill
npx skills remove <skill-name>
```

Only skills prefixed with `local_` (e.g. `.agents/skills/local_conventional-commit/`) are tracked in git. Externally synced skills are ignored via `.gitignore`.

#### Creating a local skill

Local skills are project-specific skills that live in the repository. To create one:

1. Create a directory in `.agents/skills/` with a `local_` prefix (e.g. `.agents/skills/local_my-skill/`).
2. Add a `SKILL.md` file with frontmatter and instructions:

   ```markdown
   ---
   name: my-skill
   description: Short description of when and how the skill should be triggered.
   ---

   # My Skill

   Instructions for the agent...
   ```

3. Run `./install-skills.sh` to symlink the skill into `.claude/skills/`.

The `local_` prefix ensures the skill is tracked in git and not overwritten by external skill updates.

#### Install skills

To install skills from the lock file and symlink all agent skills (including local ones) to Claude Code:

```bash
./install-skills.sh
```

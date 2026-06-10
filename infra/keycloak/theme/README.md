# Kontor Keycloak login theme

A [Keycloakify](https://keycloakify.dev/) login theme that gives Keycloak the
Kontor look (zinc/neutral shadcn palette, Roboto, Kontor logo + favicon). The
`Dockerfile` here builds a custom Keycloak image with the theme jar baked into
`/opt/keycloak/providers/`, so the realm can select it via `loginTheme: kontor`.

## How it is used

- **Compose** — `docker-compose.yml` builds this directory (`image:
  kontor-keycloak:dev`) so local Keycloak ships the theme.
- **CI** — the `keycloak-docker` job (`.github/workflows/pr.yml` and
  `ci-cd.yml`) builds and pushes
  `ghcr.io/aet-devops26/team-3m/kontor-keycloak`; the Helm chart deploys it
  (`keycloak.image.repository` in `deploy/helm/kontor/values.yaml`).

## This is a minimal vendor

Only the customized/owned files plus config are committed. The full source of
truth is the standalone `keycloak-theme` repo; this is a trimmed copy so the
monorepo builds self-contained. `npm ci` runs Keycloakify's `postinstall`
(`keycloakify sync-extensions`), which regenerates the rest of the theme from
the pinned `@keycloakify/*` packages. Owned customizations are listed in
`src/.gitignore` and preserved across sync.

The build deletes the regenerated Storybook stories (`*.stories.tsx`): they are
a dev-only artifact, never part of the jar, and the generator currently emits
one with a syntax error.

## Editing the theme

Prefer editing the standalone `keycloak-theme` repo (it has Storybook, a Vite
dev server, and the full file tree), then re-vendor the changed files here.
Customizing extension-managed files requires claiming ownership first
(`keycloakify own --path <file>`), which moves them into the "Owned files"
section of `src/.gitignore` so they survive `sync-extensions`.

Theme configuration (name, colors, radius, font, logo, app name) is driven by
`SHADCN_THEME_*` env vars in `vite.config.ts`.

## Building locally

```sh
# Just the theme jar (needs Node + Maven):
npm ci && npm run build-keycloak-theme   # -> dist_keycloak/kontor-theme.jar

# The full Keycloak image:
docker build -t ghcr.io/aet-devops26/team-3m/kontor-keycloak:dev .
```

Keep the `KC` arg in the `Dockerfile` in sync with the Keycloak version used by
the Helm chart and Compose.

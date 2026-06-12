# Self-contained build of the Kontor Keycloak login-theme image.
#
# This dir is a MINIMAL vendor: only the customized/owned files + config are
# committed. `npm ci` runs Keycloakify's postinstall `sync-extensions`, which
# regenerates the rest of the theme from the pinned @keycloakify/* packages.
#
#   docker build -t ghcr.io/aet-devops26/team-3m/kontor-keycloak:26.6 .
#
# Keep KC in sync with the Helm chart / compose base image.
ARG KC=26.6
ARG NODE=22

# --- stage 1: build the theme jar (Node + Maven) ---
FROM node:${NODE}-bookworm AS theme
# Keycloakify assembles the jar with Maven, which needs a JRE.
RUN apt-get update \
 && apt-get install -y --no-install-recommends maven default-jre-headless \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY . .
# `npm ci` postinstall = `keycloakify sync-extensions`, regenerating the managed
# theme files (owned customizations in src/.gitignore are preserved). We then
# delete the regenerated Storybook stories: they are a dev-only artifact, never
# part of the deployable theme jar, and the generator currently emits one with a
# syntax error — stripping them keeps the production build green either way.
RUN npm ci \
 && find src -name '*.stories.tsx' -delete \
 && npm run build-keycloak-theme
# Output: dist_keycloak/kontor-theme.jar (name pinned via keycloakVersionTargets).

# --- stage 2: runtime ---
FROM quay.io/keycloak/keycloak:${KC}
# No `kc.sh build` / --optimized: that bakes build-time options (e.g. KC_DB) and
# would break the chart's runtime-selectable postgres vs. dev-mem databases.
# Keycloak loads theme providers during the build it runs on `start`.
COPY --from=theme /build/dist_keycloak/kontor-theme.jar /opt/keycloak/providers/

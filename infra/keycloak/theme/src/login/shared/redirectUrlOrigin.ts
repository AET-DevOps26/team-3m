/**
 * This file has been claimed for ownership from @oussemasahbeni/keycloakify-login-shadcn version 250004.0.24.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "login/shared/redirectUrlOrigin.ts" --revert
 */

const SESSION_STORAGE_KEY = "redirectUrlOrigin";

export const redirectUrlOrigin = ((): string | undefined => {
    from_url: {
        const url = new URL(window.location.href);

        // Keycloak's authorization endpoint carries the application return URL
        // as `redirect_uri` (the OIDC standard param); accept the legacy
        // `redirect_url` spelling too.
        const value =
            url.searchParams.get("redirect_uri") ??
            url.searchParams.get("redirect_url");

        if (value === null) {
            break from_url;
        }

        // `redirect_uri` may be relative or malformed — never throw at module
        // load (that would blank the whole login page).
        let redirectUrlOrigin: string;
        try {
            redirectUrlOrigin = new URL(value).origin;
        } catch {
            break from_url;
        }

        sessionStorage.setItem(SESSION_STORAGE_KEY, redirectUrlOrigin);

        return redirectUrlOrigin;
    }

    from_session_storage: {
        const redirectUrlOrigin = sessionStorage.getItem(SESSION_STORAGE_KEY);

        if (redirectUrlOrigin === null) {
            break from_session_storage;
        }

        return redirectUrlOrigin;
    }

    // No known destination — callers should omit the link rather than render a
    // dead "#" anchor.
    return undefined;
})();

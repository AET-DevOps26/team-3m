/**
 * This file has been claimed for ownership from @oussemasahbeni/keycloakify-login-shadcn version 250004.0.24.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "login/mocks/getKcContextMock.ts" --revert
 */

import { createGetKcContextMock } from "@keycloakify/login-ui/KcContext/getKcContextMock";
import { kcEnvDefaults, themeNames } from "../../kc.gen";
import type { KcContextExtension, KcContextExtensionPerPage } from "../KcContext";

const kcContextExtension: KcContextExtension = {
    themeName: themeNames[0],
    client: {
        baseUrl: "https://my-theme.keycloakify.dev"
    },
    darkMode: true,
    properties: {
        ...kcEnvDefaults
    }
};
const kcContextExtensionPerPage: KcContextExtensionPerPage = {};

export const { getKcContextMock } = createGetKcContextMock({
    kcContextExtension,
    kcContextExtensionPerPage,
    overrides: {
        // The Kontor realm is named "kontor" (lowercase). In production this
        // comes from Keycloak; we mirror it here so dev/Storybook match.
        realm: {
            name: "kontor",
            displayName: "kontor",
            // The layout prefers displayNameHtml; override it too so the brand
            // text isn't the default mock's "myrealm".
            displayNameHtml: "kontor"
        }
    },
    overridesPerPage: {}
});

/**
 * This file has been claimed for ownership from @oussemasahbeni/keycloakify-login-shadcn version 250004.0.24.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "login/components/Template/TemplateTopBar.tsx" --revert
 */

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/login/components/ui/ThemeToggle";
import { redirectUrlOrigin } from "@/login/shared/redirectUrlOrigin";
import { FiHome } from "react-icons/fi";
import { useI18n } from "../../i18n";
import { useKcContext } from "../../KcContext";
import { Languages } from "../ui/Langauges";

  export function TemplateTopBar() {
    const { kcContext } = useKcContext();
    const { enabledLanguages } = useI18n();

    // Where "home" points: the client's configured base URL, else the origin of
    // the app the user is logging in to (derived from redirect_uri). `||` (not
    // `??`) so an empty-string baseUrl also falls through. When neither exists
    // we omit the button rather than render a dead anchor that does nothing /
    // triggers a stray download.
    const homeUrl = kcContext.client?.baseUrl || redirectUrlOrigin;

    return (
        <div className="absolute inset-x-4 top-4 z-20 flex items-center gap-2">
            {homeUrl && (
                <Button type="button" variant="outline" size="icon" asChild>
                    <a href={homeUrl} aria-label="Home">
                        <FiHome />
                    </a>
                </Button>
            )}

            {kcContext.darkMode !== false && <ModeToggle />}

            {enabledLanguages.length > 1 && <Languages />}
        </div>
    );
}

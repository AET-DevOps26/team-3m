import { Link, useLocation } from "react-router-dom"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Home", to: "/" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Import", to: "/import" },
] as const

export function AppNav() {
  const { pathname } = useLocation()

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {NAV_ITEMS.map(({ label, to }) => (
          <NavigationMenuItem key={to}>
            <NavigationMenuLink
              asChild
              className={cn(
                navigationMenuTriggerStyle(),
                pathname === to && "text-foreground",
              )}
            >
              <Link to={to}>{label}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

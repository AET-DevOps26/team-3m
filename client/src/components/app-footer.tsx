import { Link } from "react-router-dom"

const GITHUB_URL = "https://github.com/AET-DevOps26/team-3m"

/**
 * App-wide footer rendered below every protected route. Mirrors the header:
 * brand and build version on the left, About and GitHub links on the right.
 */
export function AppFooter() {
  return (
    <footer className="flex items-center justify-between gap-3 border-t border-border bg-background/80 px-4 py-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <img src="/kontor_v3.png" alt="" className="size-5" />
        <span className="font-medium text-foreground">Kontor</span>
        <a
          href={`${GITHUB_URL}/releases/tag/v${__APP_VERSION__}`}
          target="_blank"
          rel="noreferrer"
          className="tabular-nums underline-offset-2 hover:text-foreground hover:underline"
        >
          v{__APP_VERSION__}
        </a>
      </span>
      <nav className="flex items-center gap-4">
        <Link
          to="/about"
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          About
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          GitHub
        </a>
      </nav>
    </footer>
  )
}

import { ArrowLeft, Code, Layers, Users } from "lucide-react"
import { Link } from "react-router-dom"
import { ConfettiLogo } from "@/components/about/confetti-logo"
import { SpotlightCard } from "@/components/about/spotlight-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const teamMembers = [
  { name: "Mathilde", role: "UI/UX Expert", github: "mathildeshagl" },
  { name: "Magnus", role: "DevOps Expert", github: "magkue" },
  { name: "Maximilian", role: "Java Expert", github: "rappm" },
]

const techStack = [
  { name: "React", url: "https://react.dev" },
  { name: "TypeScript", url: "https://www.typescriptlang.org" },
  { name: "Vite", url: "https://vite.dev" },
  { name: "PWA", url: "https://web.dev/explore/progressive-web-apps" },
  { name: "Java", url: "https://openjdk.org" },
  { name: "Spring", url: "https://spring.io" },
  { name: "PostgreSQL", url: "https://www.postgresql.org" },
  { name: "jOOQ", url: "https://www.jooq.org" },
  { name: "Flyway", url: "https://flywaydb.org" },
  { name: "Python", url: "https://www.python.org" },
  { name: "FastAPI", url: "https://fastapi.tiangolo.com" },
  { name: "Kubernetes", url: "https://kubernetes.io" },
  { name: "Docker", url: "https://www.docker.com" },
]

const buildTimeLabel = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(__BUILD_TIME__))

const entranceClass =
  "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards motion-reduce:animate-none"

export function AboutPage() {
  return (
    <div className="flex flex-col items-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 sm:gap-8">
        <div className="w-full">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft />
              Portfolio
            </Link>
          </Button>
        </div>

        <div
          className={`flex flex-col items-center gap-3 text-center ${entranceClass}`}
        >
          <div className="flex items-center gap-3">
            <ConfettiLogo />
            <h1 className="animate-gradient-sweep bg-linear-to-r from-foreground via-chart-2 to-foreground bg-clip-text bg-size-[200%_auto] text-3xl font-bold tracking-tight text-transparent motion-reduce:animate-none sm:text-4xl">
              Kontor
            </h1>
          </div>
          <p className="text-base text-muted-foreground sm:text-lg">
            Team 3M &mdash; DevOps Project
          </p>
          <Badge variant="outline" className="tabular-nums">
            v{__APP_VERSION__} &middot; built {buildTimeLabel}
          </Badge>
        </div>

        <Separator />

        <div className="grid w-full gap-4 sm:grid-cols-3">
          <SpotlightCard className={`${entranceClass} delay-150`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                Team
              </CardTitle>
              <CardDescription>Our members</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {teamMembers.map((member) => (
                  <li key={member.name}>
                    <a
                      href={`https://github.com/${member.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <img
                          src={`https://github.com/${member.github}.png?size=64`}
                          alt=""
                          loading="lazy"
                          className="size-6 rounded-full ring-1 ring-foreground/10"
                        />
                        <span className="flex flex-col leading-tight">
                          <span>{member.name}</span>
                          <span className="text-xs text-muted-foreground">
                            @{member.github}
                          </span>
                        </span>
                      </span>
                      <Badge variant="secondary">{member.role}</Badge>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </SpotlightCard>

          <SpotlightCard className={`${entranceClass} delay-300`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="size-4" />
                Tech Stack
              </CardTitle>
              <CardDescription>What we use</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {techStack.map((tech) => (
                  <Badge
                    key={tech.name}
                    asChild
                    variant="outline"
                    className="hover:-translate-y-0.5 hover:scale-110"
                  >
                    <a href={tech.url} target="_blank" rel="noreferrer">
                      {tech.name}
                    </a>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </SpotlightCard>

          <SpotlightCard className={`${entranceClass} delay-500`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="size-4" />
                Project
              </CardTitle>
              <CardDescription>Current status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className="bg-chart-1/20 text-chart-5">
                In Development
              </Badge>
              <p className="text-sm text-muted-foreground">
                Building a copilot for personal finance management.
              </p>
            </CardContent>
          </SpotlightCard>
        </div>
      </div>
    </div>
  )
}

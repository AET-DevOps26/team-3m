import {
  Code,
  Database,
  FileSpreadsheet,
  Layers,
  List,
  Loader2,
  Rocket,
  Server,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"
import { ConnectionStatusBanner } from "@/components/connection-status-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useHealthCheck } from "@/network/endpoints/health"
import { TransactionsBlock } from "@/pages/transactions-overview"

const teamMembers = [
  { name: "Mathilde", role: "UI/UX Expert" },
  { name: "Magnus", role: "DevOps Expert" },
  { name: "Maximilian", role: "Java Expert" },
]

const techStack = [
  "React",
  "TypeScript",
  "Vite",
  "PWA",
  "Java",
  "Spring",
  "PostgreSQL",
  "jOOQ",
  "Flyway",
  "Python",
  "FastAPI",
  "Kubernetes",
  "Docker",
]

export function StartPage() {
  const serverCheck = useHealthCheck("server")
  const databaseCheck = useHealthCheck("database")

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 sm:gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <Rocket className="size-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Kontor
            </h1>
          </div>
          <p className="text-base text-muted-foreground sm:text-lg">
            Team 3M &mdash; DevOps Project
          </p>
        </div>

        <Separator />

        <div className="grid w-full gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                Team
              </CardTitle>
              <CardDescription>Our members</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {teamMembers.map((member) => (
                  <li
                    key={member.name}
                    className="flex items-center justify-between"
                  >
                    <span>{member.name}</span>
                    <Badge variant="secondary">{member.role}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
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
                  <Badge key={tech} variant="outline">
                    {tech}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
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
          </Card>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4" />
              Server Connection
            </CardTitle>
            <CardDescription>
              Test the backend API and database connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => serverCheck.mutate()}
                disabled={serverCheck.isPending}
              >
                {serverCheck.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Server />
                )}
                {serverCheck.isPending ? "Connecting..." : "Test Server"}
              </Button>

              <Button
                variant="outline"
                onClick={() => databaseCheck.mutate()}
                disabled={databaseCheck.isPending}
              >
                {databaseCheck.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Database />
                )}
                {databaseCheck.isPending ? "Connecting..." : "Test Database"}
              </Button>
            </div>

            {serverCheck.isSuccess && (
              <ConnectionStatusBanner
                variant="success"
                label="Server"
                message={serverCheck.data.message}
                caption={`200 OK · ${serverCheck.data.latencyMs}ms`}
              />
            )}
            {serverCheck.isError && (
              <ConnectionStatusBanner
                variant="error"
                label="Server"
                message={serverCheck.error.message}
              />
            )}
            {databaseCheck.isSuccess && (
              <ConnectionStatusBanner
                variant="success"
                label="Database"
                message={databaseCheck.data.message}
                caption={`200 OK · ${databaseCheck.data.latencyMs}ms`}
              />
            )}
            {databaseCheck.isError && (
              <ConnectionStatusBanner
                variant="error"
                label="Database"
                message={databaseCheck.error.message}
              />
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-4" />
              Data Import
            </CardTitle>
            <CardDescription>
              Import financial transactions from CSV files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/import">
                <FileSpreadsheet />
                Import CSV
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="size-4" />
              Transactions
            </CardTitle>
            <CardDescription>All your financial transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionsBlock />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import {
  Code,
  Database,
  Layers,
  Loader2,
  Rocket,
  Server,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ConnectionStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; message: string; statusCode: number; latencyMs: number }
  | { state: "error"; error: string };

const teamMembers = [
  { name: "Mathilde", role: "UI/UX Expert" },
  { name: "Magnus", role: "DevOps Expert" },
  { name: "Maximilian", role: "Java Expert" },
];

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
];

export function StartPage() {
  const [serverStatus, setServerStatus] = useState<ConnectionStatus>({
    state: "idle",
  });
  const [databaseStatus, setDatabaseStatus] = useState<ConnectionStatus>({
    state: "idle",
  });

  async function testConnection(
    endpoint: string,
    setConnectionStatus: (status: ConnectionStatus) => void,
  ) {
    setConnectionStatus({ state: "loading" });
    const start = performance.now();

    try {
      const response = await fetch(endpoint);
      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        const errorMessage = await response.text();
        setConnectionStatus({
          state: "error",
          error:
            errorMessage || `HTTP ${response.status} ${response.statusText}`,
        });
        return;
      }

      const message = await response.text();
      setConnectionStatus({
        state: "success",
        message,
        statusCode: response.status,
        latencyMs,
      });
    } catch (error) {
      setConnectionStatus({
        state: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function renderConnectionStatus(label: string, status: ConnectionStatus) {
    if (status.state === "success") {
      return (
        <div className="space-y-2 rounded-lg border border-chart-1/30 bg-chart-1/5 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-chart-1/20 text-chart-5">
              {label} Connected
            </Badge>
            <span className="text-muted-foreground">
              {status.statusCode} OK &middot; {status.latencyMs}ms
            </span>
          </div>
          <p className="font-mono text-foreground">{status.message}</p>
        </div>
      );
    }

    if (status.state === "error") {
      return (
        <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <Badge variant="destructive">{label} Connection Failed</Badge>
          <p className="font-mono text-destructive">{status.error}</p>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <Rocket className="size-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Kontor</h1>
          </div>
          <p className="text-lg text-muted-foreground">
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
              Test the backend API and database at localhost:8080
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  testConnection("http://localhost:8080/hello", setServerStatus)
                }
                disabled={serverStatus.state === "loading"}
              >
                {serverStatus.state === "loading" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Server />
                )}
                {serverStatus.state === "loading"
                  ? "Connecting..."
                  : "Test Server"}
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  testConnection(
                    "http://localhost:8080/database",
                    setDatabaseStatus,
                  )
                }
                disabled={databaseStatus.state === "loading"}
              >
                {databaseStatus.state === "loading" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Database />
                )}
                {databaseStatus.state === "loading"
                  ? "Connecting..."
                  : "Test Database"}
              </Button>
            </div>

            {renderConnectionStatus("Server", serverStatus)}
            {renderConnectionStatus("Database", databaseStatus)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

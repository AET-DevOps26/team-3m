import { Code, Layers, Loader2, Rocket, Server, Users } from "lucide-react";
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
  const [status, setStatus] = useState<ConnectionStatus>({ state: "idle" });

  async function testConnection() {
    setStatus({ state: "loading" });
    const start = performance.now();
    try {
      const res = await fetch("http://localhost:8080/hello");
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        setStatus({
          state: "error",
          error: `HTTP ${res.status} ${res.statusText}`,
        });
        return;
      }
      const message = await res.text();
      setStatus({
        state: "success",
        message,
        statusCode: res.status,
        latencyMs,
      });
    } catch (e) {
      setStatus({
        state: "error",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
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
              Test the backend API at localhost:8080
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={status.state === "loading"}
            >
              {status.state === "loading" && (
                <Loader2 className="animate-spin" />
              )}
              {status.state === "loading" ? "Connecting..." : "Test Connection"}
            </Button>

            {status.state === "success" && (
              <div className="space-y-2 rounded-lg border border-chart-1/30 bg-chart-1/5 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-chart-1/20 text-chart-5">
                    Connected
                  </Badge>
                  <span className="text-muted-foreground">
                    {status.statusCode} OK &middot; {status.latencyMs}ms
                  </span>
                </div>
                <p className="font-mono text-foreground">{status.message}</p>
              </div>
            )}

            {status.state === "error" && (
              <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <Badge variant="destructive">Connection Failed</Badge>
                <p className="font-mono text-destructive">{status.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

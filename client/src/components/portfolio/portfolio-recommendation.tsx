import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { isSafeHttpUrl } from "@/lib/url"
import {
  type NewsReference,
  type RecommendationResponse,
  useGenerateRecommendation,
  useLatestRecommendation,
} from "@/network/endpoints/ai-advisor"
import type { PortfolioOverview } from "@/network/endpoints/portfolio"
import { useProfile } from "@/network/endpoints/profile"

interface PortfolioRecommendationProps {
  overview: PortfolioOverview
}

export function PortfolioRecommendation({
  overview,
}: PortfolioRecommendationProps) {
  const { data: profile } = useProfile()
  const {
    data: stored,
    isLoading,
    isError: isLoadError,
    error: loadError,
    refetch,
  } = useLatestRecommendation()
  const { mutate, isPending, isError, error } = useGenerateRecommendation()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>AI Recommendation</CardTitle>
            <CardDescription>
              Personalized portfolio insights from Kontor AI
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              mutate({ overview, riskTolerance: profile.riskTolerance })
            }
            disabled={isPending}
            size="sm"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isPending ? "Generating…" : stored ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </CardHeader>
      {isLoading && !stored && (
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      )}
      {stored && <RecommendationResult result={stored} />}
      {isLoadError && !stored && (
        <CardContent className="space-y-2">
          <p className="text-sm text-destructive">
            {loadError?.message ?? "Failed to load your saved recommendation."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      )}
      {isError && !isLoadError && (
        <CardContent className="space-y-1">
          <p className="text-sm text-destructive">
            {error?.message ?? "Failed to generate recommendation."}
          </p>
          <p className="text-xs text-muted-foreground">
            Click Generate to try again.
          </p>
        </CardContent>
      )}
    </Card>
  )
}

function RecommendationResult({ result }: { result: RecommendationResponse }) {
  return (
    <CardContent className="space-y-3">
      <p className="font-medium leading-relaxed">{result.recommendation}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {result.rationale}
      </p>
      {result.news_summary && (
        <NewsSummary
          summary={result.news_summary}
          references={result.news_references ?? []}
        />
      )}
      <Separator />
      <p className="text-xs italic text-muted-foreground">
        {result.disclaimer}
      </p>
    </CardContent>
  )
}

function NewsSummary({
  summary,
  references,
}: {
  summary: string
  references: NewsReference[]
}) {
  return (
    <>
      <Separator />
      <div className="space-y-2">
        <p className="text-sm font-medium">In the news</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
        {references.length > 0 && (
          <ul className="space-y-1">
            {references.map((reference) => (
              <li
                key={`${reference.title}|${reference.source ?? ""}|${reference.published_at ?? ""}`}
                className="text-xs text-muted-foreground"
              >
                {isSafeHttpUrl(reference.url) ? (
                  <a
                    href={reference.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {reference.title}
                  </a>
                ) : (
                  <span>{reference.title}</span>
                )}
                {reference.source && <span> · {reference.source}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

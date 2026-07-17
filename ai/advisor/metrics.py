"""OpenTelemetry instruments for the news ingest pipeline (queue -> embedding -> pgvector)."""

from opentelemetry.metrics import Meter, get_meter

CONSUMED_METRIC = "kontor.news.messages.consumed"
EMBEDDING_DURATION_METRIC = "kontor.news.embedding.duration"
# Durations are recorded in seconds; without this advisory the SDK applies its
# millisecond-tuned default buckets and every sample lands below le=5.0,
# making histogram_quantile() useless for sub-second latencies.
EMBEDDING_DURATION_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]

OUTCOME_STORED = "stored"
OUTCOME_INVALID = "invalid"
OUTCOME_DEAD_LETTERED = "dead_lettered"
OUTCOME_RETRIED = "retried"


class NewsIngestMetrics:
    """Counters and histograms recorded while handling ``news.articles`` messages."""

    def __init__(self, meter: Meter | None = None) -> None:
        resolved = meter if meter is not None else get_meter("kontor.ai.news")
        self._consumed = resolved.create_counter(
            CONSUMED_METRIC,
            unit="{message}",
            description="News messages consumed from the queue, partitioned by handling outcome",
        )
        self._embedding_duration = resolved.create_histogram(
            EMBEDDING_DURATION_METRIC,
            unit="s",
            description="Duration of embedding-provider calls during news ingest",
            explicit_bucket_boundaries_advisory=EMBEDDING_DURATION_BUCKETS,
        )

    def record_consumed(self, outcome: str) -> None:
        self._consumed.add(1, {"outcome": outcome})

    def record_embedding_duration(self, seconds: float, *, model: str) -> None:
        self._embedding_duration.record(seconds, {"model": model})


news_ingest_metrics = NewsIngestMetrics()

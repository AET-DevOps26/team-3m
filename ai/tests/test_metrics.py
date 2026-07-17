from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import InMemoryMetricReader

from advisor.metrics import (
    CONSUMED_METRIC,
    EMBEDDING_DURATION_METRIC,
    OUTCOME_RETRIED,
    OUTCOME_STORED,
    NewsIngestMetrics,
)


def _build() -> tuple[NewsIngestMetrics, InMemoryMetricReader]:
    reader = InMemoryMetricReader()
    provider = MeterProvider(metric_readers=[reader])
    return NewsIngestMetrics(meter=provider.get_meter("test")), reader


def _points_by_name(reader: InMemoryMetricReader, name: str) -> list:
    data = reader.get_metrics_data()
    assert data is not None
    points = []
    for resource_metrics in data.resource_metrics:
        for scope_metrics in resource_metrics.scope_metrics:
            for metric in scope_metrics.metrics:
                if metric.name == name:
                    points.extend(metric.data.data_points)
    return points


def test_record_consumed_counts_per_outcome() -> None:
    metrics, reader = _build()

    metrics.record_consumed(OUTCOME_STORED)
    metrics.record_consumed(OUTCOME_STORED)
    metrics.record_consumed(OUTCOME_RETRIED)

    points = _points_by_name(reader, CONSUMED_METRIC)
    by_outcome = {point.attributes["outcome"]: point.value for point in points}
    assert by_outcome == {OUTCOME_STORED: 2, OUTCOME_RETRIED: 1}


def test_record_embedding_duration_tracks_model_attribute() -> None:
    metrics, reader = _build()

    metrics.record_embedding_duration(0.25, model="test-embed")
    metrics.record_embedding_duration(0.75, model="test-embed")

    points = _points_by_name(reader, EMBEDDING_DURATION_METRIC)
    assert len(points) == 1
    point = points[0]
    assert point.attributes["model"] == "test-embed"
    assert point.count == 2
    assert point.sum == 1.0

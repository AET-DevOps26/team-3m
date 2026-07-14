CREATE INDEX idx_aggregation_run_started_at
    ON aggregation_run (started_at DESC);

CREATE INDEX idx_aggregation_run_trigger_started_at
    ON aggregation_run (triggered_by, started_at DESC);

CREATE INDEX idx_aggregation_run_running_started_at
    ON aggregation_run (started_at DESC)
    WHERE status = 'running';

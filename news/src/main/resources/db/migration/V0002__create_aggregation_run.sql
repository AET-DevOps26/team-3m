CREATE TABLE aggregation_run (
    id              UUID         PRIMARY KEY,
    triggered_by    VARCHAR(20)  NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    started_at      TIMESTAMPTZ  NOT NULL,
    finished_at     TIMESTAMPTZ,
    items_seen      INT          NOT NULL DEFAULT 0,
    items_published INT          NOT NULL DEFAULT 0,
    error           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

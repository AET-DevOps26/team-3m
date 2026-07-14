CREATE TABLE crawled_article (
    id            UUID          PRIMARY KEY,
    url_hash      VARCHAR(64)   NOT NULL CONSTRAINT crawled_article_url_hash_key UNIQUE,
    url           TEXT          NOT NULL,
    source        VARCHAR(100)  NOT NULL,
    feed_url      TEXT          NOT NULL,
    title         TEXT          NOT NULL,
    published_at  TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ   NOT NULL,
    pushed_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

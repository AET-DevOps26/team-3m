package de.devops26.kontor.news.messaging;

public interface ArticlePublisher {

    /**
     * Publishes the article and blocks until the broker confirms it. Throws
     * {@link ArticlePublishException} when the broker is unreachable, nacks the
     * message, or the confirm times out — callers must not mark the article as
     * pushed in that case.
     */
    void publish(ArticleMessage message);
}

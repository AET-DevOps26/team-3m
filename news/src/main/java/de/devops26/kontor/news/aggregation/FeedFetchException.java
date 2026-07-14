package de.devops26.kontor.news.aggregation;

public class FeedFetchException extends RuntimeException {

    public FeedFetchException(String feedUrl, Throwable cause) {
        super("Failed to fetch or parse feed: " + feedUrl, cause);
    }
}

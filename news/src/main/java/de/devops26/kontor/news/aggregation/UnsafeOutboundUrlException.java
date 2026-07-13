package de.devops26.kontor.news.aggregation;

public class UnsafeOutboundUrlException extends RuntimeException {

    public UnsafeOutboundUrlException(String url, String reason) {
        super("Outbound URL is not allowed (" + reason + "): " + url);
    }

    public UnsafeOutboundUrlException(String url, String reason, Throwable cause) {
        super("Outbound URL is not allowed (" + reason + "): " + url, cause);
    }
}

package de.devops26.kontor.news.aggregation;

public class ManualTriggerRateLimitException extends RuntimeException {

    private final long retryAfterSeconds;

    public ManualTriggerRateLimitException(long retryAfterSeconds) {
        super("Manual aggregation was triggered too recently; retry in " + retryAfterSeconds + " second(s)");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}

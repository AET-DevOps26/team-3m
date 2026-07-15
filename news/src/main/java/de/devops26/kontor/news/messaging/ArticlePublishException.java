package de.devops26.kontor.news.messaging;

public class ArticlePublishException extends RuntimeException {

    public ArticlePublishException(String articleId, String reason, Throwable cause) {
        super("Failed to publish article " + articleId + ": " + reason, cause);
    }
}

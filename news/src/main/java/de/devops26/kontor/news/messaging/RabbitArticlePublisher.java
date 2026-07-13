package de.devops26.kontor.news.messaging;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class RabbitArticlePublisher implements ArticlePublisher {

    private final RabbitTemplate rabbitTemplate;
    private final NewsMessagingProperties properties;

    public RabbitArticlePublisher(RabbitTemplate rabbitTemplate, NewsMessagingProperties properties) {
        this.rabbitTemplate = rabbitTemplate;
        this.rabbitTemplate.setMandatory(true);
        this.properties = properties;
    }

    @Override
    public void publish(ArticleMessage message) {
        var correlation = new CorrelationData(message.id());
        try {
            rabbitTemplate.convertAndSend(
                    properties.exchange(),
                    properties.routingKey(),
                    message,
                    amqpMessage -> {
                        amqpMessage.getMessageProperties().setMessageId(message.id());
                        return amqpMessage;
                    },
                    correlation);
            var confirm =
                    correlation.getFuture().get(properties.confirmTimeout().toMillis(), TimeUnit.MILLISECONDS);
            var returned = correlation.getReturned();
            if (returned != null) {
                throw new ArticlePublishException(
                        message.id(),
                        "message was returned: " + returned.getReplyCode() + " " + returned.getReplyText(),
                        null);
            }
            if (!confirm.ack()) {
                throw new ArticlePublishException(message.id(), "broker nack: " + confirm.reason(), null);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ArticlePublishException(message.id(), "interrupted while awaiting broker confirmation", e);
        } catch (TimeoutException e) {
            throw new ArticlePublishException(message.id(), "broker confirmation timed out", e);
        } catch (ExecutionException | AmqpException e) {
            throw new ArticlePublishException(message.id(), e.getMessage(), e);
        }
    }
}

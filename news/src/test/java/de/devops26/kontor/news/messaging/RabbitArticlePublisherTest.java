package de.devops26.kontor.news.messaging;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;

import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.stubbing.Answer;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.core.ReturnedMessage;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

@ExtendWith(MockitoExtension.class)
class RabbitArticlePublisherTest {

    private static final ArticleMessage MESSAGE =
            new ArticleMessage("a".repeat(64), "feed", "https://f", "https://a/1", "Title", null, null, null, null);

    @Mock
    private RabbitTemplate rabbitTemplate;

    private RabbitArticlePublisher publisher;

    @BeforeEach
    void setUp() {
        var properties = new NewsMessagingProperties("ex", "q", "rk", Duration.ofMillis(50), 100, 1024);
        publisher = new RabbitArticlePublisher(rabbitTemplate, properties);
    }

    @Test
    @DisplayName("publish returns normally after a positive broker confirm")
    void publish_confirmed_returnsNormally() {
        completePublish(new CorrelationData.Confirm(true, null), null);

        assertThatCode(() -> publisher.publish(MESSAGE)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("publish rejects a message returned as unroutable")
    void publish_returned_throws() {
        var returned = new ReturnedMessage(new Message(new byte[0]), 312, "NO_ROUTE", "ex", "missing");
        completePublish(new CorrelationData.Confirm(true, null), returned);

        assertThatThrownBy(() -> publisher.publish(MESSAGE))
                .isInstanceOf(ArticlePublishException.class)
                .hasMessageContaining("NO_ROUTE");
    }

    @Test
    @DisplayName("publish rejects a negative broker confirm")
    void publish_nacked_throws() {
        completePublish(new CorrelationData.Confirm(false, "queue limit"), null);

        assertThatThrownBy(() -> publisher.publish(MESSAGE))
                .isInstanceOf(ArticlePublishException.class)
                .hasMessageContaining("queue limit");
    }

    @Test
    @DisplayName("publish times out when no correlated confirm arrives")
    void publish_noConfirm_throws() {
        assertThatThrownBy(() -> publisher.publish(MESSAGE))
                .isInstanceOf(ArticlePublishException.class)
                .hasMessageContaining("timed out");
    }

    @Test
    @DisplayName("publish wraps immediate AMQP errors")
    void publish_amqpError_wrapsException() {
        var brokerDown = new AmqpException("connection refused");
        doThrow(brokerDown)
                .when(rabbitTemplate)
                .convertAndSend(
                        eq("ex"), eq("rk"), eq(MESSAGE), any(MessagePostProcessor.class), any(CorrelationData.class));

        assertThatThrownBy(() -> publisher.publish(MESSAGE))
                .isInstanceOf(ArticlePublishException.class)
                .hasMessageContaining(MESSAGE.id())
                .hasCause(brokerDown);
    }

    private void completePublish(CorrelationData.Confirm confirm, ReturnedMessage returned) {
        Answer<Void> completeConfirm = invocation -> {
            CorrelationData correlation = invocation.getArgument(4);
            correlation.setReturned(returned);
            correlation.getFuture().complete(confirm);
            return null;
        };
        doAnswer(completeConfirm)
                .when(rabbitTemplate)
                .convertAndSend(
                        eq("ex"), eq("rk"), eq(MESSAGE), any(MessagePostProcessor.class), any(CorrelationData.class));
    }
}

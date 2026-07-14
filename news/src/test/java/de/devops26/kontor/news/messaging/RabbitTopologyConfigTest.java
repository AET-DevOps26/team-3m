package de.devops26.kontor.news.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;

class RabbitTopologyConfigTest {

    @Test
    @DisplayName("declares a bounded queue that rejects publishes at its limits")
    void newsTopology_queue_hasCapacityLimits() {
        var properties = new NewsMessagingProperties("exchange", "queue", "route", Duration.ofSeconds(1), 42, 2048);

        var topology = new RabbitTopologyConfig().newsTopology(properties);
        var queues = topology.getDeclarablesByType(Queue.class);
        var queue = queues.stream()
                .filter(item -> item.getName().equals("queue"))
                .findFirst()
                .orElseThrow();
        var deadLetterQueue = queues.stream()
                .filter(item -> item.getName().equals("queue.dead"))
                .findFirst()
                .orElseThrow();

        assertThat(queue.getArguments())
                .containsEntry("x-max-length", 42L)
                .containsEntry("x-max-length-bytes", 2048L)
                .containsEntry("x-overflow", "reject-publish")
                .doesNotContainKeys("x-dead-letter-exchange", "x-dead-letter-routing-key");
        assertThat(deadLetterQueue.getArguments())
                .containsEntry("x-max-length", 42L)
                .containsEntry("x-max-length-bytes", 2048L)
                .containsEntry("x-overflow", "drop-head");
        assertThat(topology.getDeclarablesByType(DirectExchange.class))
                .extracting(DirectExchange::getName)
                .contains("exchange.dlx");
    }
}

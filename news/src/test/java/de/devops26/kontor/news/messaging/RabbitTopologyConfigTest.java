package de.devops26.kontor.news.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Queue;

class RabbitTopologyConfigTest {

    @Test
    @DisplayName("declares a bounded queue that rejects publishes at its limits")
    void newsTopology_queue_hasCapacityLimits() {
        var properties = new NewsMessagingProperties("exchange", "queue", "route", Duration.ofSeconds(1), 42, 2048);

        var queue = new RabbitTopologyConfig()
                .newsTopology(properties)
                .getDeclarablesByType(Queue.class)
                .getFirst();

        assertThat(queue.getArguments())
                .containsEntry("x-max-length", 42L)
                .containsEntry("x-max-length-bytes", 2048L)
                .containsEntry("x-overflow", "reject-publish");
    }
}

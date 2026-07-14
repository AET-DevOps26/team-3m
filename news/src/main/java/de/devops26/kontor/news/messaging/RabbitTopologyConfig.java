package de.devops26.kontor.news.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Producer-declared topology: the future news processor does not exist yet, so
 * the aggregator declares the durable exchange, queue, and binding itself —
 * published articles accumulate safely until a consumer subscribes.
 */
@Configuration
public class RabbitTopologyConfig {

    @Bean
    public Declarables newsTopology(NewsMessagingProperties properties) {
        var exchange = new TopicExchange(properties.exchange(), true, false);
        var queue = QueueBuilder.durable(properties.queue())
                .withArgument("x-max-length", properties.maxQueueMessages())
                .withArgument("x-max-length-bytes", properties.maxQueueBytes())
                .withArgument("x-overflow", "reject-publish")
                .build();
        Binding binding = BindingBuilder.bind(queue).to(exchange).with(properties.routingKey());
        return new Declarables(exchange, queue, binding);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new JacksonJsonMessageConverter();
    }
}

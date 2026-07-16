package de.devops26.kontor.news.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Producer-declared topology shared with the AI consumer. The aggregator owns
 * the durable exchange, queue, dead-letter queue, and bindings.
 */
@Configuration
public class RabbitTopologyConfig {

    @Bean
    public Declarables newsTopology(NewsMessagingProperties properties) {
        var exchange = new TopicExchange(properties.exchange(), true, false);
        var deadLetterExchange = new DirectExchange(properties.exchange() + ".dlx", true, false);
        var deadLetterRoutingKey = properties.routingKey() + ".dead";
        var queue = QueueBuilder.durable(properties.queue())
                .withArgument("x-max-length", properties.maxQueueMessages())
                .withArgument("x-max-length-bytes", properties.maxQueueBytes())
                .withArgument("x-overflow", "reject-publish")
                .build();
        var deadLetterQueue = QueueBuilder.durable(properties.queue() + ".dead")
                .withArgument("x-max-length", properties.maxQueueMessages())
                .withArgument("x-max-length-bytes", properties.maxQueueBytes())
                .withArgument("x-overflow", "drop-head")
                .build();
        Binding binding = BindingBuilder.bind(queue).to(exchange).with(properties.routingKey());
        Binding deadLetterBinding =
                BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with(deadLetterRoutingKey);
        return new Declarables(exchange, deadLetterExchange, queue, deadLetterQueue, binding, deadLetterBinding);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new JacksonJsonMessageConverter();
    }
}

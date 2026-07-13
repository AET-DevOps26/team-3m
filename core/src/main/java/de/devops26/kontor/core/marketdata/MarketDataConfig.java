package de.devops26.kontor.core.marketdata;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(MarketDataProperties.class)
public class MarketDataConfig {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

    @Bean
    public TwelveDataClient twelveDataClient(MarketDataProperties properties) {
        var httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
        var requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        return new TwelveDataClient(RestClient.builder().requestFactory(requestFactory), properties);
    }
}

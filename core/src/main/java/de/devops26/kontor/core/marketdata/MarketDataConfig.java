package de.devops26.kontor.core.marketdata;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableCaching
@EnableConfigurationProperties(MarketDataProperties.class)
public class MarketDataConfig {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration QUOTE_CACHE_TTL = Duration.ofSeconds(60);
    private static final Duration HISTORY_CACHE_TTL = Duration.ofMinutes(10);
    private static final long QUOTE_CACHE_MAX_ENTRIES = 1000;
    private static final long HISTORY_CACHE_MAX_ENTRIES = 2000;

    @Bean
    public TwelveDataClient twelveDataClient(MarketDataProperties properties) {
        var httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
        var requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        return new TwelveDataClient(RestClient.builder().requestFactory(requestFactory), properties);
    }

    @Bean
    public CacheManager marketDataCacheManager() {
        var quotes = new CaffeineCache(
                MarketDataService.QUOTES_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(QUOTE_CACHE_TTL)
                        .maximumSize(QUOTE_CACHE_MAX_ENTRIES)
                        .build());
        var history = new CaffeineCache(
                MarketDataService.HISTORY_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(HISTORY_CACHE_TTL)
                        .maximumSize(HISTORY_CACHE_MAX_ENTRIES)
                        .build());
        var cacheManager = new SimpleCacheManager();
        cacheManager.setCaches(List.of(quotes, history));
        return cacheManager;
    }
}

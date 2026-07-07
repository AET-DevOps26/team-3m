package de.devops26.kontor.core.marketdata;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kontor.market-data")
public record MarketDataProperties(String baseUrl, String apiKey) {

    public MarketDataProperties {
        baseUrl = baseUrl == null ? "" : baseUrl;
        apiKey = apiKey == null ? "" : apiKey;
    }

    @Override
    public String toString() {
        return "MarketDataProperties[baseUrl=" + baseUrl + ", apiKey=***]";
    }
}

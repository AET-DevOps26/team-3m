package de.devops26.kontor.news.aggregation;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FeedClientTest {

    private static HttpServer server;

    @BeforeAll
    static void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/declared-large", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/rss+xml");
            respond(exchange, 200, "x".repeat(256), 256);
        });
        server.createContext("/chunked-large", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/rss+xml");
            respond(exchange, 200, "x".repeat(256), 0);
        });
        server.createContext("/redirect", exchange -> {
            exchange.getResponseHeaders().set("Location", "file:///etc/passwd");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.start();
    }

    @AfterAll
    static void stopServer() {
        server.stop(0);
    }

    @Test
    @DisplayName("rejects a response whose Content-Length exceeds the feed limit")
    void fetchItems_declaredResponseTooLarge_throws() {
        assertOversized("/declared-large");
    }

    @Test
    @DisplayName("rejects a chunked response that exceeds the feed limit")
    void fetchItems_chunkedResponseTooLarge_throws() {
        assertOversized("/chunked-large");
    }

    @Test
    @DisplayName("revalidates redirect targets before following them")
    void fetchItems_redirectToNonHttpTarget_throws() {
        var client = client();
        var feed = new NewsFeedProperties.Feed("test", baseUrl() + "/redirect");

        assertThatThrownBy(() -> client.fetchItems(feed))
                .isInstanceOf(UnsafeOutboundUrlException.class)
                .hasMessageContaining("HTTPS is required");
    }

    private static void assertOversized(String path) {
        var client = client();
        var feed = new NewsFeedProperties.Feed("test", baseUrl() + path);

        assertThatThrownBy(() -> client.fetchItems(feed))
                .isInstanceOf(FeedFetchException.class)
                .hasRootCauseMessage("Response from " + baseUrl() + path + " exceeds the 64 byte limit");
    }

    private static FeedClient client() {
        var properties = new NewsHttpProperties(Duration.ofSeconds(2), 64, 64, 1000, 2, true, true);
        return new FeedClient(new FeedParser(), new OutboundUrlPolicy(properties), properties);
    }

    private static String baseUrl() {
        return "http://localhost:" + server.getAddress().getPort();
    }

    private static void respond(HttpExchange exchange, int status, String body, long responseLength)
            throws IOException {
        var bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, responseLength);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}

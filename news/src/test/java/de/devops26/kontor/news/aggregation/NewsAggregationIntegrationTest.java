package de.devops26.kontor.news.aggregation;

import static de.devops26.kontor.news.generated.tables.AggregationRun.AGGREGATION_RUN;
import static de.devops26.kontor.news.generated.tables.CrawledArticle.CRAWLED_ARTICLE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.jooq.DSLContext;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class NewsAggregationIntegrationTest {

    private static final Duration RUN_TIMEOUT = Duration.ofSeconds(30);
    private static final long ARTICLE_RESPONSE_DELAY_MS = 500;

    @Container
    static final RabbitMQContainer rabbit = new RabbitMQContainer("rabbitmq:4.2-management-alpine");

    private static HttpServer feedServer;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AggregationRunRepository runRepository;

    @Autowired
    private AggregationRunLeaseManager leaseManager;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private DSLContext dsl;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private de.devops26.kontor.news.messaging.NewsMessagingProperties messagingProperties;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeAll
    static void startFeedServer() throws IOException {
        feedServer = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        feedServer.createContext("/feed.xml", exchange -> respond(exchange, "application/rss+xml", feedXml()));
        feedServer.createContext("/articles/", exchange -> {
            sleep(ARTICLE_RESPONSE_DELAY_MS);
            respond(exchange, "text/html", articleHtml());
        });
        feedServer.start();
    }

    @AfterAll
    static void stopFeedServer() {
        feedServer.stop(0);
    }

    @DynamicPropertySource
    static void feedProperties(DynamicPropertyRegistry registry) {
        registry.add("news.aggregation.feeds[0].name", () -> "test-feed");
        registry.add("news.aggregation.feeds[0].url", () -> baseUrl() + "/feed.xml");
        registry.add("news.aggregation.fetch-full-text", () -> "true");
        registry.add("spring.rabbitmq.host", rabbit::getHost);
        registry.add("spring.rabbitmq.port", rabbit::getAmqpPort);
        registry.add("spring.rabbitmq.username", rabbit::getAdminUsername);
        registry.add("spring.rabbitmq.password", rabbit::getAdminPassword);
    }

    private static String baseUrl() {
        return "http://localhost:" + feedServer.getAddress().getPort();
    }

    private static void respond(HttpExchange exchange, String contentType, String body) throws IOException {
        var bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", contentType);
        exchange.sendResponseHeaders(200, bytes.length);
        try (var out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String feedXml() {
        var template = new String(FeedParserTest.fixture("integration-feed-template.xml"), StandardCharsets.UTF_8);
        return template.replace("${baseUrl}", baseUrl());
    }

    private static String articleHtml() {
        var paragraph = "Investors reacted to the latest batch of corporate earnings reports. ".repeat(5);
        return "<html><body><article><p>" + paragraph + "</p></article></body></html>";
    }

    @BeforeEach
    void cleanState() throws Exception {
        awaitNoRunInFlight();
        dsl.deleteFrom(CRAWLED_ARTICLE).execute();
        dsl.deleteFrom(AGGREGATION_RUN).execute();
        drainQueue();
    }

    @Test
    @DisplayName("manual trigger publishes new articles to the queue, marks them pushed, and dedupes on rerun")
    void manualTrigger_publishesAndDedupes() throws Exception {
        var firstRun = awaitFinished(triggerRun());

        assertThat(firstRun.status()).isEqualTo(AggregationStatus.SUCCEEDED);
        assertThat(firstRun.itemsSeen()).isEqualTo(2);
        assertThat(firstRun.itemsPublished()).isEqualTo(2);

        var messages = drainQueue();
        assertThat(messages).hasSize(2);
        var payloads = new ArrayList<JsonNode>();
        for (var message : messages) {
            assertThat(message.getMessageProperties().getMessageId()).hasSize(64);
            payloads.add(objectMapper.readTree(message.getBody()));
        }
        assertThat(payloads)
                .extracting(p -> p.path("title").asText())
                .containsExactlyInAnyOrder("Stocks rally on strong earnings", "Fed holds rates steady");
        assertThat(payloads).allSatisfy(p -> {
            assertThat(p.path("source").asText()).isEqualTo("test-feed");
            assertThat(p.path("contentText").asText()).contains("corporate earnings");
            assertThat(p.path("id").asText()).hasSize(64);
        });

        var rows = dsl.selectFrom(CRAWLED_ARTICLE).fetch();
        assertThat(rows).hasSize(2);
        assertThat(rows).allSatisfy(row -> assertThat(row.getPushedAt()).isNotNull());

        var secondRun = awaitFinished(triggerRun());
        assertThat(secondRun.status()).isEqualTo(AggregationStatus.SUCCEEDED);
        assertThat(secondRun.itemsSeen()).isEqualTo(2);
        assertThat(secondRun.itemsPublished()).isZero();
        assertThat(drainQueue()).isEmpty();
        assertThat(dsl.fetchCount(CRAWLED_ARTICLE)).isEqualTo(2);
    }

    @Test
    @DisplayName("a second trigger while a run is in flight returns 409")
    void trigger_whileRunning_returns409() throws Exception {
        var runId = triggerRun();

        mockMvc.perform(post("/api/v1/news/aggregation/runs").with(adminJwt()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        awaitFinished(runId);
    }

    @Test
    @DisplayName("runs list rejects out-of-range limits with 400")
    void listRuns_invalidLimit_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/news/aggregation/runs").param("limit", "0").with(adminJwt()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
        mockMvc.perform(get("/api/v1/news/aggregation/runs")
                        .param("limit", "101")
                        .with(adminJwt()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("startup sweep marks runs stuck in 'running' as failed")
    void staleRunningRun_isFailedBySweep() {
        var stale = runRepository.insertRunning(
                AggregationTrigger.SCHEDULED, java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC));

        var swept =
                runRepository.failStaleRunning(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC), "test sweep");

        assertThat(swept).isEqualTo(1);
        var reloaded = runRepository.findById(stale.id()).orElseThrow();
        assertThat(reloaded.status()).isEqualTo(AggregationStatus.FAILED);
        assertThat(reloaded.error()).isEqualTo("test sweep");
        assertThat(reloaded.finishedAt()).isNotNull();
    }

    @Test
    @DisplayName("endpoints require authentication")
    void endpoints_requireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/news/aggregation/runs")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/news/aggregation/runs")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/news/health/server")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("manual trigger requires the kontor-admin role")
    void trigger_authenticatedNonAdmin_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/news/aggregation/runs").with(jwt())).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("aggregation run details require the kontor-admin role")
    void runDetails_authenticatedNonAdmin_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/news/aggregation/runs").with(jwt())).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/news/aggregation/runs/{id}", UUID.randomUUID())
                        .with(jwt()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("the Postgres lock excludes another service instance until released")
    void aggregationLease_secondInstanceCannotAcquireUntilRelease() {
        var first = leaseManager.tryAcquire().orElseThrow();
        var otherInstance = new AggregationRunLeaseManager(dataSource);
        try {
            assertThat(otherInstance.tryAcquire()).isEmpty();
        } finally {
            first.close();
        }

        try (var reacquired = otherInstance.tryAcquire().orElseThrow()) {
            assertThat(reacquired).isNotNull();
        }
    }

    @Test
    @DisplayName("mandatory publishing fails when no queue is bound to the routing key")
    void publish_unroutableMessage_throws() {
        var unroutableProperties = new de.devops26.kontor.news.messaging.NewsMessagingProperties(
                messagingProperties.exchange(),
                messagingProperties.queue(),
                "missing." + UUID.randomUUID(),
                Duration.ofSeconds(5),
                100,
                1024);
        var publisher =
                new de.devops26.kontor.news.messaging.RabbitArticlePublisher(rabbitTemplate, unroutableProperties);
        var message = new de.devops26.kontor.news.messaging.ArticleMessage(
                "b".repeat(64), "feed", "https://feed.test", "https://article.test", "Title", null, null, null, null);

        assertThatThrownBy(() -> publisher.publish(message))
                .isInstanceOf(de.devops26.kontor.news.messaging.ArticlePublishException.class)
                .hasMessageContaining("returned");
    }

    private UUID triggerRun() throws Exception {
        var response = mockMvc.perform(post("/api/v1/news/aggregation/runs").with(adminJwt()))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("RUNNING"))
                .andReturn();
        var id = objectMapper
                .readTree(response.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText();
        return UUID.fromString(id);
    }

    private static JwtRequestPostProcessor adminJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_kontor-admin"));
    }

    private AggregationRun awaitFinished(UUID runId) throws InterruptedException {
        var deadline = System.nanoTime() + RUN_TIMEOUT.toNanos();
        while (System.nanoTime() < deadline) {
            var run = runRepository.findById(runId).orElseThrow();
            if (run.status() != AggregationStatus.RUNNING) {
                return run;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("Aggregation run " + runId + " did not finish within " + RUN_TIMEOUT);
    }

    private void awaitNoRunInFlight() throws InterruptedException {
        var deadline = System.nanoTime() + RUN_TIMEOUT.toNanos();
        while (System.nanoTime() < deadline) {
            var inFlight =
                    dsl.fetchCount(AGGREGATION_RUN, AGGREGATION_RUN.STATUS.eq(AggregationStatus.RUNNING.dbValue()));
            if (inFlight == 0) {
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("A previous aggregation run was still in flight");
    }

    private List<Message> drainQueue() {
        var messages = new ArrayList<Message>();
        Message message;
        while ((message = rabbitTemplate.receive(messagingProperties.queue(), 200)) != null) {
            messages.add(message);
        }
        return messages;
    }
}

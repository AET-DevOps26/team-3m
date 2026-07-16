package de.devops26.kontor.news.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ArticleMessageContractTest {

    @Test
    @DisplayName("serializes the shared producer-consumer contract example")
    void serialize_matchesSharedContractExample() throws Exception {
        var mapper = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();
        var message = new ArticleMessage(
                "a".repeat(64),
                "yahoo-finance",
                "https://finance.yahoo.com/news/rssindex",
                "https://finance.yahoo.com/news/example",
                "Markets rally on strong earnings",
                "Stocks rose after a positive earnings session.",
                "Global markets rallied after several companies beat earnings expectations.",
                OffsetDateTime.parse("2026-07-14T08:30:00Z"),
                OffsetDateTime.parse("2026-07-14T08:35:00Z"));
        var expected =
                mapper.readTree(Path.of("docs/examples/article-crawled.json").toFile());
        JsonNode actual = mapper.valueToTree(message);

        assertThat(actual).isEqualTo(expected);
    }
}

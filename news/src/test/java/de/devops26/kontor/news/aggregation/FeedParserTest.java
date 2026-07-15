package de.devops26.kontor.news.aggregation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FeedParserTest {

    private static final String FEED_URL = "https://example.com/rss";

    private final FeedParser parser = new FeedParser();

    static byte[] fixture(String name) {
        try (var in = FeedParserTest.class.getResourceAsStream("/fixtures/" + name)) {
            if (in == null) {
                throw new IllegalArgumentException("Missing fixture: " + name);
            }
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Test
    @DisplayName("parses RSS 2.0 items with title, link, guid, description, and pubDate")
    void parse_validRss_returnsItems() {
        var items = parser.parse(fixture("valid-feed.xml"), FEED_URL);

        assertThat(items).hasSize(2);
        var first = items.get(0);
        assertThat(first.title()).isEqualTo("Stocks rally on earnings");
        assertThat(first.url()).isEqualTo("https://example.com/articles/1");
        assertThat(first.externalId()).isEqualTo("article-1");
        assertThat(first.summary()).isEqualTo("Markets surged today.");
        assertThat(first.publishedAt()).isEqualTo(OffsetDateTime.of(2026, 7, 6, 12, 30, 0, 0, ZoneOffset.UTC));
        var second = items.get(1);
        assertThat(second.summary()).isNull();
        assertThat(second.publishedAt()).isNull();
    }

    @Test
    @DisplayName("skips items without a link or title")
    void parse_itemsWithoutLinkOrTitle_areSkipped() {
        var items = parser.parse(fixture("feed-missing-links.xml"), FEED_URL);

        assertThat(items).hasSize(1);
        assertThat(items.get(0).title()).isEqualTo("Valid");
    }

    @Test
    @DisplayName("throws FeedFetchException when the body is not a feed")
    void parse_invalidXml_throws() {
        var body = "<html>not a feed</html>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> parser.parse(body, FEED_URL))
                .isInstanceOf(FeedFetchException.class)
                .hasMessageContaining(FEED_URL);
    }

    @Test
    @DisplayName("rejects feeds containing a document type declaration")
    void parse_feedWithDoctype_throws() {
        assertThatThrownBy(() -> parser.parse(fixture("feed-with-doctype.xml"), FEED_URL))
                .isInstanceOf(FeedFetchException.class)
                .hasMessageContaining(FEED_URL);
    }
}

package de.devops26.kontor.news.aggregation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class UrlNormalizerTest {

    @ParameterizedTest
    @CsvSource({
        "HTTPS://Example.COM/News/story, https://example.com/News/story",
        "https://example.com/story?utm_source=rss&utm_medium=feed, https://example.com/story",
        "https://example.com/story?id=42&utm_campaign=x, https://example.com/story?id=42",
        "https://example.com/story#section, https://example.com/story",
        "https://example.com:8443/story?gclid=abc, https://example.com:8443/story",
    })
    @DisplayName("normalizes scheme/host case and strips tracking params and fragments")
    void normalize(String input, String expected) {
        assertThat(UrlNormalizer.normalize(input)).isEqualTo(expected);
    }

    @Test
    @DisplayName("returns trimmed input when the URL cannot be parsed")
    void normalize_unparseableUrl_returnsTrimmedInput() {
        assertThat(UrlNormalizer.normalize("  not a url ::: ")).isEqualTo("not a url :::");
    }

    @Test
    @DisplayName("same normalized URL yields the same hash, different URLs different hashes")
    void sha256Hex_isStableAndDistinct() {
        var first = UrlNormalizer.sha256Hex("https://example.com/story");
        var second = UrlNormalizer.sha256Hex("https://example.com/story");
        var other = UrlNormalizer.sha256Hex("https://example.com/other");

        assertThat(first).isEqualTo(second).hasSize(64);
        assertThat(first).isNotEqualTo(other);
    }
}

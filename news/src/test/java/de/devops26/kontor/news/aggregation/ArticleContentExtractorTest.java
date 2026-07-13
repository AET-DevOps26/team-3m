package de.devops26.kontor.news.aggregation;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ArticleContentExtractorTest {

    private static final String BASE_URL = "https://example.com/articles/1";

    private final ArticleContentExtractor extractor = new ArticleContentExtractor(
            new NewsHttpProperties(Duration.ofSeconds(2), 1024, 2048, 1000, 3, false, false));

    @Test
    @DisplayName("extracts paragraph text from the article element")
    void extract_articleElement_returnsParagraphs() {
        var paragraph = "Markets moved higher across the board as investors digested earnings. ".repeat(4);
        var html = "<html><body><nav><p>Menu item</p></nav><article><p>" + paragraph + "</p><p>" + paragraph
                + "</p></article></body></html>";

        var result = extractor.extract(html, BASE_URL);

        assertThat(result).isPresent();
        assertThat(result.get()).contains("Markets moved higher");
        assertThat(result.get()).doesNotContain("Menu item");
    }

    @Test
    @DisplayName("falls back to body paragraphs when there is no article element")
    void extract_noArticleElement_fallsBackToBody() {
        var paragraph = "The central bank left interest rates unchanged in its latest decision. ".repeat(4);
        var html = "<html><body><p>" + paragraph + "</p></body></html>";

        var result = extractor.extract(html, BASE_URL);

        assertThat(result).isPresent();
        assertThat(result.get()).contains("central bank");
    }

    @Test
    @DisplayName("returns empty for blank input or content below the minimum length")
    void extract_blankOrTooShort_returnsEmpty() {
        assertThat(extractor.extract(null, BASE_URL)).isEmpty();
        assertThat(extractor.extract("", BASE_URL)).isEmpty();
        assertThat(extractor.extract("<html><body><p>Too short.</p></body></html>", BASE_URL))
                .isEmpty();
    }

    @Test
    @DisplayName("truncates extracted content to the configured character limit")
    void extract_longContent_truncatesResult() {
        var limited = new ArticleContentExtractor(
                new NewsHttpProperties(Duration.ofSeconds(2), 1024, 2048, 220, 3, false, false));
        var html = "<article><p>" + "Relevant market reporting. ".repeat(30) + "</p></article>";

        assertThat(limited.extract(html, BASE_URL).orElseThrow()).hasSize(220);
    }
}

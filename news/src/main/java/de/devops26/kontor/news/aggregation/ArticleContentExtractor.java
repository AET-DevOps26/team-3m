package de.devops26.kontor.news.aggregation;

import java.util.Optional;
import java.util.stream.Collectors;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class ArticleContentExtractor {

    private static final int MIN_CONTENT_LENGTH = 200;
    private final int maxContentCharacters;

    public ArticleContentExtractor(NewsHttpProperties properties) {
        this.maxContentCharacters = properties.maxContentCharacters();
    }

    public Optional<String> extract(String html, String baseUrl) {
        if (html == null || html.isBlank()) {
            return Optional.empty();
        }
        var document = Jsoup.parse(html, baseUrl);
        var article = document.selectFirst("article");
        var scope = article != null ? article : document.body();
        if (scope == null) {
            return Optional.empty();
        }
        var text = scope.select("p").stream()
                .map(Element::text)
                .map(String::trim)
                .filter(paragraph -> !paragraph.isBlank())
                .collect(Collectors.joining("\n\n"));
        if (text.length() < MIN_CONTENT_LENGTH) {
            return Optional.empty();
        }
        return Optional.of(text.length() <= maxContentCharacters ? text : text.substring(0, maxContentCharacters));
    }
}

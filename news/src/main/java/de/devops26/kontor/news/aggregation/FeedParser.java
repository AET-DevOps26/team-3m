package de.devops26.kontor.news.aggregation;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

@Component
public class FeedParser {

    public List<FeedItem> parse(byte[] feedBody, String feedUrl) {
        try (var reader = new XmlReader(new ByteArrayInputStream(feedBody))) {
            var feed = new SyndFeedInput().build(reader);
            return feed.getEntries().stream()
                    .map(entry -> toItem(entry, feedUrl))
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            throw new FeedFetchException(feedUrl, e);
        }
    }

    private static FeedItem toItem(SyndEntry entry, String feedUrl) {
        var title = normalizeText(entry.getTitle());
        var url = resolveUrl(entry.getLink(), feedUrl);
        if (title == null || url == null || url.isBlank()) {
            return null;
        }
        var summary = entry.getDescription() != null
                ? normalizeText(entry.getDescription().getValue())
                : null;
        var publishedAt =
                toOffsetDateTime(entry.getPublishedDate() != null ? entry.getPublishedDate() : entry.getUpdatedDate());
        return new FeedItem(title, url, entry.getUri(), summary, publishedAt);
    }

    private static String resolveUrl(String link, String feedUrl) {
        if (link == null || link.isBlank()) {
            return null;
        }
        try {
            return URI.create(feedUrl).resolve(link.trim()).toString();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String normalizeText(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }
        var text = Jsoup.parse(html).text().trim();
        return text.isBlank() ? null : text;
    }

    private static OffsetDateTime toOffsetDateTime(Date date) {
        return date != null ? OffsetDateTime.ofInstant(date.toInstant(), ZoneOffset.UTC) : null;
    }
}

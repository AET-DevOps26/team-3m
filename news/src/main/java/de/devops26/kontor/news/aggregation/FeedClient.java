package de.devops26.kontor.news.aggregation;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class FeedClient {

    private static final String USER_AGENT = "KontorNewsAggregator/1.0 (+https://github.com/AET-DevOps26/team-3m)";
    private static final Set<MediaType> FEED_TYPES = Set.of(
            MediaType.APPLICATION_XML,
            MediaType.TEXT_XML,
            MediaType.parseMediaType("application/rss+xml"),
            MediaType.parseMediaType("application/atom+xml"));
    private static final Set<MediaType> ARTICLE_TYPES =
            Set.of(MediaType.TEXT_HTML, MediaType.parseMediaType("application/xhtml+xml"));

    private final RestClient restClient;
    private final FeedParser feedParser;
    private final OutboundUrlPolicy urlPolicy;
    private final NewsHttpProperties properties;

    public FeedClient(FeedParser feedParser, OutboundUrlPolicy urlPolicy, NewsHttpProperties properties) {
        var httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.timeout())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        var requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.timeout());
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .build();
        this.feedParser = feedParser;
        this.urlPolicy = urlPolicy;
        this.properties = properties;
    }

    public List<FeedItem> fetchItems(NewsFeedProperties.Feed feed) {
        try {
            var body = fetch(urlPolicy.validate(feed.url()), properties.maxFeedBytes(), FEED_TYPES, 0);
            if (body.length == 0) {
                throw new FeedFetchException(feed.url(), null);
            }
            return feedParser.parse(body, feed.url());
        } catch (FeedFetchException | UnsafeOutboundUrlException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new FeedFetchException(feed.url(), e);
        }
    }

    public String fetchHtml(String url) {
        var uri = urlPolicy.validate(url);
        var bytes = fetch(uri, properties.maxArticleBytes(), ARTICLE_TYPES, 0);
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private byte[] fetch(URI uri, int maxBytes, Set<MediaType> acceptedTypes, int redirects) {
        return restClient.get().uri(uri).exchange((request, response) -> {
            var status = response.getStatusCode();
            if (status.is3xxRedirection()) {
                if (redirects >= properties.maxRedirects()) {
                    throw new UnsafeOutboundUrlException(uri.toString(), "too many redirects");
                }
                var location = response.getHeaders().getLocation();
                if (location == null) {
                    throw new FeedFetchException(uri.toString(), null);
                }
                var target = urlPolicy.validate(uri.resolve(location));
                return fetch(target, maxBytes, acceptedTypes, redirects + 1);
            }
            if (!status.is2xxSuccessful()) {
                throw new FeedFetchException(uri.toString(), null);
            }
            validateContentType(uri, response.getHeaders().getContentType(), acceptedTypes);
            var declaredLength = response.getHeaders().getContentLength();
            if (declaredLength > maxBytes) {
                throw new ResponseTooLargeException(uri.toString(), maxBytes);
            }
            try {
                var body = response.getBody().readNBytes(maxBytes + 1);
                if (body.length > maxBytes) {
                    throw new ResponseTooLargeException(uri.toString(), maxBytes);
                }
                return body;
            } catch (IOException e) {
                throw new FeedFetchException(uri.toString(), e);
            }
        });
    }

    private static void validateContentType(URI uri, MediaType actual, Set<MediaType> acceptedTypes) {
        if (actual == null || acceptedTypes.stream().noneMatch(expected -> expected.isCompatibleWith(actual))) {
            throw new FeedFetchException(uri.toString(), null);
        }
    }

    private static final class ResponseTooLargeException extends RuntimeException {

        private ResponseTooLargeException(String url, int maxBytes) {
            super("Response from " + url + " exceeds the " + maxBytes + " byte limit");
        }
    }
}

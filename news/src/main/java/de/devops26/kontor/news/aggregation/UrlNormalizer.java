package de.devops26.kontor.news.aggregation;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Locale;
import java.util.stream.Collectors;

public final class UrlNormalizer {

    private UrlNormalizer() {}

    public static String normalize(String url) {
        try {
            var uri = new URI(url.trim());
            if (uri.getScheme() == null || uri.getHost() == null) {
                return url.trim();
            }
            var builder = new StringBuilder();
            builder.append(uri.getScheme().toLowerCase(Locale.ROOT));
            builder.append("://");
            builder.append(uri.getHost().toLowerCase(Locale.ROOT));
            if (uri.getPort() != -1) {
                builder.append(':').append(uri.getPort());
            }
            if (uri.getRawPath() != null) {
                builder.append(uri.getRawPath());
            }
            var query = stripTrackingParams(uri.getRawQuery());
            if (query != null) {
                builder.append('?').append(query);
            }
            return builder.toString();
        } catch (URISyntaxException e) {
            return url.trim();
        }
    }

    private static String stripTrackingParams(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return null;
        }
        var kept = Arrays.stream(rawQuery.split("&"))
                .filter(param -> !isTrackingParam(param))
                .collect(Collectors.joining("&"));
        return kept.isBlank() ? null : kept;
    }

    private static boolean isTrackingParam(String param) {
        var name = param.split("=", 2)[0].toLowerCase(Locale.ROOT);
        return name.startsWith("utm_") || name.equals("gclid") || name.equals("fbclid") || name.equals("mc_cid");
    }

    public static String sha256Hex(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}

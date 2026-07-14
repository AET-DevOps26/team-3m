package de.devops26.kontor.news.aggregation;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class OutboundUrlPolicy {

    private final NewsHttpProperties properties;

    public OutboundUrlPolicy(NewsHttpProperties properties) {
        this.properties = properties;
    }

    public URI validate(String url) {
        try {
            return validate(new URI(url));
        } catch (URISyntaxException | IllegalArgumentException e) {
            throw new UnsafeOutboundUrlException(url, "invalid URI", e);
        }
    }

    public URI validate(URI uri) {
        var url = uri.toString();
        var scheme = uri.getScheme();
        if (scheme == null
                || !(scheme.equalsIgnoreCase("https") || (properties.allowHttp() && scheme.equalsIgnoreCase("http")))) {
            throw new UnsafeOutboundUrlException(url, "HTTPS is required");
        }
        if (uri.getRawUserInfo() != null) {
            throw new UnsafeOutboundUrlException(url, "userinfo is forbidden");
        }
        var host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new UnsafeOutboundUrlException(url, "host is required");
        }
        if (properties.allowPrivateAddresses()) {
            return uri.normalize();
        }
        try {
            validateResolvedAddresses(url, InetAddress.getAllByName(host.toLowerCase(Locale.ROOT)));
        } catch (UnknownHostException e) {
            throw new UnsafeOutboundUrlException(url, "host cannot be resolved", e);
        }
        return uri.normalize();
    }

    void validateResolvedAddresses(String url, InetAddress[] addresses) {
        if (addresses == null || addresses.length == 0) {
            throw new UnsafeOutboundUrlException(url, "host cannot be resolved");
        }
        if (properties.allowPrivateAddresses()) {
            return;
        }
        for (var address : addresses) {
            if (!isPublic(address)) {
                throw new UnsafeOutboundUrlException(url, "host resolves to a non-public address");
            }
        }
    }

    private static boolean isPublic(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return false;
        }
        if (address instanceof Inet4Address) {
            return isPublicIpv4(address.getAddress());
        }
        if (address instanceof Inet6Address) {
            return isPublicIpv6(address.getAddress());
        }
        return false;
    }

    private static boolean isPublicIpv4(byte[] bytes) {
        var first = Byte.toUnsignedInt(bytes[0]);
        var second = Byte.toUnsignedInt(bytes[1]);
        var third = Byte.toUnsignedInt(bytes[2]);
        return first != 0
                && first != 10
                && first != 127
                && first != 224
                && first < 240
                && !(first == 100 && second >= 64 && second <= 127)
                && !(first == 169 && second == 254)
                && !(first == 172 && second >= 16 && second <= 31)
                && !(first == 192 && second == 0 && (third == 0 || third == 2))
                && !(first == 192 && second == 168)
                && !(first == 198 && (second == 18 || second == 19))
                && !(first == 198 && second == 51 && third == 100)
                && !(first == 203 && second == 0 && third == 113);
    }

    private static boolean isPublicIpv6(byte[] bytes) {
        var first = Byte.toUnsignedInt(bytes[0]);
        var second = Byte.toUnsignedInt(bytes[1]);
        var isGlobalUnicast = (first & 0xe0) == 0x20;
        var isDocumentation = first == 0x20
                && second == 0x01
                && Byte.toUnsignedInt(bytes[2]) == 0x0d
                && Byte.toUnsignedInt(bytes[3]) == 0xb8;
        var isTeredo = first == 0x20 && second == 0x01 && bytes[2] == 0 && bytes[3] == 0;
        var isSixToFour = first == 0x20 && second == 0x02;
        return isGlobalUnicast && !isDocumentation && !isTeredo && !isSixToFour;
    }
}

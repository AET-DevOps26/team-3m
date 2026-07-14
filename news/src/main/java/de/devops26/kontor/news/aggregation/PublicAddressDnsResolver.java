package de.devops26.kontor.news.aggregation;

import java.net.InetAddress;
import java.net.UnknownHostException;
import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.SystemDefaultDnsResolver;

final class PublicAddressDnsResolver implements DnsResolver {

    private final OutboundUrlPolicy urlPolicy;
    private final DnsResolver delegate;

    PublicAddressDnsResolver(OutboundUrlPolicy urlPolicy) {
        this(urlPolicy, SystemDefaultDnsResolver.INSTANCE);
    }

    PublicAddressDnsResolver(OutboundUrlPolicy urlPolicy, DnsResolver delegate) {
        this.urlPolicy = urlPolicy;
        this.delegate = delegate;
    }

    @Override
    public InetAddress[] resolve(String host) throws UnknownHostException {
        var addresses = delegate.resolve(host);
        try {
            urlPolicy.validateResolvedAddresses(host, addresses);
            return addresses;
        } catch (UnsafeOutboundUrlException e) {
            var failure = new UnknownHostException(e.getMessage());
            failure.initCause(e);
            throw failure;
        }
    }

    @Override
    public String resolveCanonicalHostname(String host) throws UnknownHostException {
        return delegate.resolveCanonicalHostname(host);
    }
}

package de.devops26.kontor.news.aggregation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class OutboundUrlPolicyTest {

    private final OutboundUrlPolicy policy =
            new OutboundUrlPolicy(new NewsHttpProperties(Duration.ofSeconds(2), 1024, 2048, 1000, 3, false, false));

    @ParameterizedTest
    @ValueSource(
            strings = {
                "file:///etc/passwd",
                "http://93.184.216.34/article",
                "https://127.0.0.1/article",
                "https://10.0.0.1/article",
                "https://100.64.0.1/article",
                "https://169.254.169.254/latest/meta-data",
                "https://192.168.1.1/article",
                "https://[::1]/article",
                "https://[fc00::1]/article",
                "https://[fe80::1]/article"
            })
    @DisplayName("rejects non-HTTPS and non-public outbound targets")
    void validate_blockedTarget_throws(String url) {
        assertThatThrownBy(() -> policy.validate(url)).isInstanceOf(UnsafeOutboundUrlException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://93.184.216.34/article", "https://[2606:4700:4700::1111]/article"})
    @DisplayName("accepts public HTTPS targets")
    void validate_publicHttpsTarget_returnsUri(String url) {
        assertThat(policy.validate(url)).hasToString(url);
    }
}

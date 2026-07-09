package de.devops26.kontor.core.marketdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class MarketRangeTest {

    @ParameterizedTest
    @CsvSource({
        "1D, 5min, 78",
        "1W, 30min, 65",
        "1M, 1day, 22",
        "1Y, 1day, 252",
        "MAX, 1month, 5000",
    })
    @DisplayName("fromParam maps range params to Twelve Data interval and output size")
    void fromParam_knownParam_mapsIntervalAndOutputSize(String param, String interval, int outputSize) {
        var range = MarketRange.fromParam(param);

        assertThat(range.param()).isEqualTo(param);
        assertThat(range.interval()).isEqualTo(interval);
        assertThat(range.outputSize()).isEqualTo(outputSize);
    }

    @ParameterizedTest
    @ValueSource(strings = {"1d", "2Y", "", "garbage"})
    @DisplayName("fromParam rejects unknown range params")
    void fromParam_unknownParam_throws(String param) {
        assertThatThrownBy(() -> MarketRange.fromParam(param))
                .isInstanceOf(InvalidMarketRangeException.class)
                .hasMessageContaining("allowed values are 1D, 1W, 1M, 1Y, MAX");
    }
}

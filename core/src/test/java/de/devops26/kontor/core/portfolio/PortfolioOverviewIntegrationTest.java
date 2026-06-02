package de.devops26.kontor.core.portfolio;

import static de.devops26.kontor.core.generated.tables.AppUser.APP_USER;
import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PortfolioOverviewIntegrationTest {

    private static final String USER_ALICE_SUB = "auth-provider|alice-portfolio";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DSLContext dsl;

    @BeforeEach
    void cleanDatabase() {
        dsl.deleteFrom(FINANCIAL_TRANSACTION).execute();
        dsl.deleteFrom(APP_USER).where(APP_USER.OIDC_SUB.eq(USER_ALICE_SUB)).execute();
    }

    @Test
    @DisplayName("GET /overview without bearer token returns 401")
    void getOverview_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/portfolio/overview")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /overview with no transactions returns empty portfolio")
    void getOverview_noTransactions_returnsEmptyPortfolio() throws Exception {
        mockMvc.perform(get("/api/v1/portfolio/overview").with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.holdings").isEmpty())
                .andExpect(jsonPath("$.data.cashBalance").value(0))
                .andExpect(jsonPath("$.data.totalValue").value(0));
    }

    @Test
    @DisplayName("GET /overview after CSV import returns aggregated holdings and cash balance")
    void getOverview_afterImport_returnsHoldingsAndCash() throws Exception {
        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(validCsv())
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/portfolio/overview").with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.currency").value("EUR"))
                // 3 assets with remaining shares: Apple (3), MSCI World (12), MSCI EM (8)
                .andExpect(jsonPath("$.data.holdings.length()").value(3))
                // cash = sum of all amounts = 723.76
                .andExpect(jsonPath("$.data.cashBalance").value(723.76))
                // holdings value: 3*198.76 + 12*85.25 + 8*38.12 = 596.28 + 1023.00 + 304.96 = 1924.24
                // total = 723.76 + 1924.24 = 2648.00
                .andExpect(jsonPath("$.data.totalValue").value(2648.0));
    }

    @Test
    @DisplayName("GET /overview shows holdings with symbol, name and asset class")
    void getOverview_afterImport_showsHoldingDetails() throws Exception {
        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(validCsv())
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/portfolio/overview").with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.holdings[?(@.symbol == 'US0378331005')].name")
                        .value(hasItem("Apple")))
                .andExpect(jsonPath("$.data.holdings[?(@.symbol == 'US0378331005')].assetClass")
                        .value(hasItem("STOCK")))
                .andExpect(jsonPath("$.data.holdings[?(@.symbol == 'IE00B4L5Y983')].assetClass")
                        .value(hasItem("FUND")))
                .andExpect(jsonPath("$.data.holdings[?(@.symbol == 'IE00B4L5YC18')].assetClass")
                        .value(hasItem("FUND")));
    }

    private MockMultipartFile validCsv() throws java.io.IOException {
        return new MockMultipartFile(
                "file",
                "transactions.csv",
                "text/csv",
                new ClassPathResource("csv/valid-transactions.csv").getInputStream());
    }

    private static SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor jwtFor(
            String sub, String preferredUsername) {
        return jwt().jwt(builder -> builder.subject(sub)
                .claim("preferred_username", preferredUsername)
                .claim("email", preferredUsername + "@kontor.test"));
    }
}

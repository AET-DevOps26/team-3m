package de.devops26.kontor.core.transaction;

import static de.devops26.kontor.core.generated.tables.AppUser.APP_USER;
import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FinancialTransactionListIntegrationTest {

    private static final String USER_ALICE_SUB = "auth-provider|alice-list";

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
    @DisplayName("GET /financial-transactions without bearer token returns 401")
    void listWithoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/financial-transactions"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("WWW-Authenticate"))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /financial-transactions with no data returns 200 with empty items")
    void listWithNoTransactions_returnsEmptyPage() throws Exception {
        mockMvc.perform(get("/api/v1/financial-transactions").with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.items").isEmpty());
    }

    @Test
    @DisplayName("GET /financial-transactions returns imported transactions")
    void listAfterImport_returnsTransactions() throws Exception {
        var csvBytes = new ClassPathResource("csv/valid-transactions.csv").getContentAsByteArray();
        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(new MockMultipartFile("file", "transactions.csv", "text/csv", csvBytes))
                        .with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/financial-transactions").with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.items.length()").value(8));
    }

    @Test
    @DisplayName("GET /financial-transactions with only afterDatetime returns 400")
    void listWithOnlyAfterDatetime_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/financial-transactions")
                        .param("afterDatetime", "2026-04-01T09:30:00Z")
                        .with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /financial-transactions with only afterId returns 400")
    void listWithOnlyAfterId_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/financial-transactions")
                        .param("afterId", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                        .with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /financial-transactions with invalid afterDatetime format returns 400")
    void listWithInvalidAfterDatetime_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/financial-transactions")
                        .param("afterDatetime", "not-a-date")
                        .param("afterId", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                        .with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /financial-transactions with valid cursor returns remaining transactions")
    void listWithValidCursor_returnsRemainingTransactions() throws Exception {
        var csvBytes = new ClassPathResource("csv/valid-transactions.csv").getContentAsByteArray();
        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(new MockMultipartFile("file", "transactions.csv", "text/csv", csvBytes))
                        .with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isOk());

        var result = mockMvc.perform(get("/api/v1/financial-transactions")
                        .param("pageSize", "3")
                        .with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(3))
                .andExpect(jsonPath("$.data.nextCursor").isNotEmpty())
                .andReturn();

        var body = result.getResponse().getContentAsString();
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper()
                .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        var tree = mapper.readTree(body);
        var afterDatetime = tree.at("/data/nextCursor/afterDatetime").asText();
        var afterId = tree.at("/data/nextCursor/afterId").asText();

        mockMvc.perform(get("/api/v1/financial-transactions")
                        .param("afterDatetime", afterDatetime)
                        .param("afterId", afterId)
                        .with(jwtFor(USER_ALICE_SUB, "alice-list")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray());
    }

    private static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                    .JwtRequestPostProcessor
            jwtFor(String sub, String preferredUsername) {
        return jwt().jwt(builder -> builder.subject(sub)
                .claim("preferred_username", preferredUsername)
                .claim("email", preferredUsername + "@kontor.test"));
    }
}

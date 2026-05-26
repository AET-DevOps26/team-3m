package de.devops26.kontor.core.transaction;

import static de.devops26.kontor.core.generated.tables.AppUser.APP_USER;
import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
class FinancialTransactionImportIntegrationTest {

    private static final String USER_ALICE_SUB = "auth-provider|alice";
    private static final String USER_BOB_SUB = "auth-provider|bob";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DSLContext dsl;

    @BeforeEach
    void cleanDatabase() {
        dsl.deleteFrom(FINANCIAL_TRANSACTION).execute();
        dsl.deleteFrom(APP_USER)
                .where(APP_USER.OIDC_SUB.in(USER_ALICE_SUB, USER_BOB_SUB))
                .execute();
    }

    @Test
    @DisplayName("POST /import without bearer token returns 401")
    void importWithoutToken_returns401() throws Exception {
        var csvFile = validCsv();

        mockMvc.perform(multipart("/api/v1/financial-transactions/import").file(csvFile))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("WWW-Authenticate"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Authentication required"));
    }

    @Test
    @DisplayName("POST /import with valid CSV inserts rows owned by the authenticated user")
    void importValidCsv_insertsRowsForUser() throws Exception {
        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(validCsv())
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.importedCount").value(8));

        var aliceId = dsl.select(APP_USER.ID)
                .from(APP_USER)
                .where(APP_USER.OIDC_SUB.eq(USER_ALICE_SUB))
                .fetchOne(APP_USER.ID);
        assertThat(aliceId).isNotNull();

        var rowsForAlice = dsl.fetchCount(FINANCIAL_TRANSACTION, FINANCIAL_TRANSACTION.USER_ID.eq(aliceId));
        assertThat(rowsForAlice).isEqualTo(8);
    }

    @Test
    @DisplayName("POST /import with same CSV twice upserts within the same user's rows")
    void importSameCsvTwice_sameUser_upsertsSuccessfully() throws Exception {
        var csvBytes = new ClassPathResource("csv/valid-transactions.csv").getContentAsByteArray();
        var first = new MockMultipartFile("file", "transactions.csv", "text/csv", csvBytes);
        var second = new MockMultipartFile("file", "transactions.csv", "text/csv", csvBytes);

        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(first)
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk());
        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(second)
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk());

        assertThat(dsl.fetchCount(FINANCIAL_TRANSACTION)).isEqualTo(8);
    }

    @Test
    @DisplayName("POST /import for two different users with same external IDs keeps both copies")
    void importSameCsvForDifferentUsers_keepsBothCopies() throws Exception {
        var csvBytes = new ClassPathResource("csv/valid-transactions.csv").getContentAsByteArray();
        var aliceUpload = new MockMultipartFile("file", "transactions.csv", "text/csv", csvBytes);
        var bobUpload = new MockMultipartFile("file", "transactions.csv", "text/csv", csvBytes);

        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(aliceUpload)
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isOk());
        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(bobUpload)
                        .with(jwtFor(USER_BOB_SUB, "bob")))
                .andExpect(status().isOk());

        var aliceId = dsl.select(APP_USER.ID)
                .from(APP_USER)
                .where(APP_USER.OIDC_SUB.eq(USER_ALICE_SUB))
                .fetchOne(APP_USER.ID);
        var bobId = dsl.select(APP_USER.ID)
                .from(APP_USER)
                .where(APP_USER.OIDC_SUB.eq(USER_BOB_SUB))
                .fetchOne(APP_USER.ID);

        assertThat(dsl.fetchCount(FINANCIAL_TRANSACTION, FINANCIAL_TRANSACTION.USER_ID.eq(aliceId)))
                .isEqualTo(8);
        assertThat(dsl.fetchCount(FINANCIAL_TRANSACTION, FINANCIAL_TRANSACTION.USER_ID.eq(bobId)))
                .isEqualTo(8);
        assertThat(dsl.fetchCount(FINANCIAL_TRANSACTION)).isEqualTo(16);
    }

    @Test
    @DisplayName("POST /import with missing required field returns 400 with errors")
    void importInvalidCsv_missingAmount_returns400() throws Exception {
        var csvFile = new MockMultipartFile(
                "file",
                "invalid.csv",
                "text/csv",
                new ClassPathResource("csv/invalid-missing-amount.csv").getInputStream());

        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(csvFile)
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.details[0].field").value("amount"));

        assertThat(dsl.fetchCount(FINANCIAL_TRANSACTION)).isEqualTo(0);
    }

    @Test
    @DisplayName("POST /import with invalid UUID returns 400 with errors")
    void importInvalidCsv_badUuid_returns400() throws Exception {
        var csvFile = new MockMultipartFile(
                "file", "invalid.csv", "text/csv", new ClassPathResource("csv/invalid-bad-uuid.csv").getInputStream());

        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(csvFile)
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.details[0].field").value("transaction_id"));

        assertThat(dsl.fetchCount(FINANCIAL_TRANSACTION)).isEqualTo(0);
    }

    @Test
    @DisplayName("POST /import with empty file returns 400")
    void importEmptyFile_returns400() throws Exception {
        var csvFile = new MockMultipartFile("file", "empty.csv", "text/csv", new byte[0]);

        mockMvc.perform(multipart("/api/v1/financial-transactions/import")
                        .file(csvFile)
                        .with(jwtFor(USER_ALICE_SUB, "alice")))
                .andExpect(status().isBadRequest());
    }

    private MockMultipartFile validCsv() throws java.io.IOException {
        return new MockMultipartFile(
                "file",
                "transactions.csv",
                "text/csv",
                new ClassPathResource("csv/valid-transactions.csv").getInputStream());
    }

    private static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                    .JwtRequestPostProcessor
            jwtFor(String sub, String preferredUsername) {
        return jwt().jwt(builder -> builder.subject(sub)
                .claim("preferred_username", preferredUsername)
                .claim("email", preferredUsername + "@kontor.test"));
    }
}

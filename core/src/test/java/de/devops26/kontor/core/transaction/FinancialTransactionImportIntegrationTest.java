package de.devops26.kontor.core.transaction;

import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class FinancialTransactionImportIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private DSLContext dsl;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
        dsl.deleteFrom(FINANCIAL_TRANSACTION).execute();
    }

    @Test
    @DisplayName("POST /import with valid CSV inserts rows into database")
    void importValidCsv_insertsRows() throws Exception {
        var csvFile = new MockMultipartFile(
                "file",
                "transactions.csv",
                "text/csv",
                new ClassPathResource("csv/valid-transactions.csv").getInputStream());

        mockMvc.perform(multipart("/api/v1/financial-transactions/import").file(csvFile))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(8));

        var count = dsl.fetchCount(FINANCIAL_TRANSACTION);
        assertThat(count).isEqualTo(8);
    }

    @Test
    @DisplayName("POST /import with same CSV twice upserts without error")
    void importSameCsvTwice_upsertsSuccessfully() throws Exception {
        var csvBytes = new ClassPathResource("csv/valid-transactions.csv").getContentAsByteArray();

        var firstFile = new MockMultipartFile("file", "transactions.csv", "text/csv", csvBytes);
        mockMvc.perform(multipart("/api/v1/financial-transactions/import").file(firstFile))
                .andExpect(status().isOk());

        var secondFile = new MockMultipartFile("file", "transactions.csv", "text/csv", csvBytes);
        mockMvc.perform(multipart("/api/v1/financial-transactions/import").file(secondFile))
                .andExpect(status().isOk());

        var count = dsl.fetchCount(FINANCIAL_TRANSACTION);
        assertThat(count).isEqualTo(8);
    }

    @Test
    @DisplayName("POST /import with missing required field returns 400 with errors")
    void importInvalidCsv_missingAmount_returns400() throws Exception {
        var csvFile = new MockMultipartFile(
                "file",
                "invalid.csv",
                "text/csv",
                new ClassPathResource("csv/invalid-missing-amount.csv").getInputStream());

        mockMvc.perform(multipart("/api/v1/financial-transactions/import").file(csvFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errors[0].field").value("amount"));

        var count = dsl.fetchCount(FINANCIAL_TRANSACTION);
        assertThat(count).isEqualTo(0);
    }

    @Test
    @DisplayName("POST /import with invalid UUID returns 400 with errors")
    void importInvalidCsv_badUuid_returns400() throws Exception {
        var csvFile = new MockMultipartFile(
                "file", "invalid.csv", "text/csv", new ClassPathResource("csv/invalid-bad-uuid.csv").getInputStream());

        mockMvc.perform(multipart("/api/v1/financial-transactions/import").file(csvFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("transaction_id"));

        var count = dsl.fetchCount(FINANCIAL_TRANSACTION);
        assertThat(count).isEqualTo(0);
    }

    @Test
    @DisplayName("POST /import with empty file returns 400")
    void importEmptyFile_returns400() throws Exception {
        var csvFile = new MockMultipartFile("file", "empty.csv", "text/csv", new byte[0]);

        mockMvc.perform(multipart("/api/v1/financial-transactions/import").file(csvFile))
                .andExpect(status().isBadRequest());
    }
}

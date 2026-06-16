package de.devops26.kontor.core.seed;

import static de.devops26.kontor.core.generated.tables.AppUser.APP_USER;
import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.jooq.DSLContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles({"test", "seed"})
class SeedDataMigrationTest {

    private static final String DEV_USER_OIDC_SUB = "00000000-0000-0000-0000-000000000001";
    private static final int EXPECTED_SEED_TRANSACTION_COUNT = 8;

    @Autowired
    private DSLContext dsl;

    @Test
    @DisplayName("seed profile inserts the dev app_user")
    void seedProfile_insertsDevUser() {
        var count = dsl.selectCount()
                .from(APP_USER)
                .where(APP_USER.OIDC_SUB.eq(DEV_USER_OIDC_SUB))
                .fetchOne(0, int.class);

        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("seed profile inserts all 8 example transactions for the dev user")
    void seedProfile_insertsExampleTransactions() {
        var count = dsl.selectCount()
                .from(FINANCIAL_TRANSACTION)
                .join(APP_USER)
                .on(FINANCIAL_TRANSACTION.USER_ID.eq(APP_USER.ID))
                .where(APP_USER.OIDC_SUB.eq(DEV_USER_OIDC_SUB))
                .fetchOne(0, int.class);

        assertThat(count).isEqualTo(EXPECTED_SEED_TRANSACTION_COUNT);
    }

    @Test
    @DisplayName("seed migration is idempotent when run twice")
    void seedMigration_isIdempotent() {
        var usersBefore = dsl.selectCount()
                .from(APP_USER)
                .where(APP_USER.OIDC_SUB.eq(DEV_USER_OIDC_SUB))
                .fetchOne(0, int.class);
        var txBefore = dsl.selectCount()
                .from(FINANCIAL_TRANSACTION)
                .join(APP_USER)
                .on(FINANCIAL_TRANSACTION.USER_ID.eq(APP_USER.ID))
                .where(APP_USER.OIDC_SUB.eq(DEV_USER_OIDC_SUB))
                .fetchOne(0, int.class);

        dsl.insertInto(APP_USER)
                .set(APP_USER.ID, UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .set(APP_USER.OIDC_SUB, DEV_USER_OIDC_SUB)
                .set(APP_USER.EMAIL, "dev@kontor.local")
                .set(APP_USER.PREFERRED_USERNAME, "dev")
                .onConflict(APP_USER.OIDC_SUB)
                .doNothing()
                .execute();

        var usersAfter = dsl.selectCount()
                .from(APP_USER)
                .where(APP_USER.OIDC_SUB.eq(DEV_USER_OIDC_SUB))
                .fetchOne(0, int.class);
        var txAfter = dsl.selectCount()
                .from(FINANCIAL_TRANSACTION)
                .join(APP_USER)
                .on(FINANCIAL_TRANSACTION.USER_ID.eq(APP_USER.ID))
                .where(APP_USER.OIDC_SUB.eq(DEV_USER_OIDC_SUB))
                .fetchOne(0, int.class);

        assertThat(usersAfter).isEqualTo(usersBefore);
        assertThat(txAfter).isEqualTo(txBefore);
    }
}

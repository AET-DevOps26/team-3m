package de.devops26.kontor.core.user;

import static de.devops26.kontor.core.generated.tables.AppUser.APP_USER;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
public class AppUserRepository {

    private final DSLContext dsl;

    public AppUserRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Optional<AppUser> findByOidcSub(String oidcSub) {
        return dsl.select(APP_USER.ID, APP_USER.OIDC_SUB, APP_USER.EMAIL, APP_USER.PREFERRED_USERNAME)
                .from(APP_USER)
                .where(APP_USER.OIDC_SUB.eq(oidcSub))
                .fetchOptional(record -> new AppUser(
                        record.get(APP_USER.ID),
                        record.get(APP_USER.OIDC_SUB),
                        record.get(APP_USER.EMAIL),
                        record.get(APP_USER.PREFERRED_USERNAME)));
    }

    public AppUser upsert(String oidcSub, String email, String preferredUsername) {
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        var record = dsl.insertInto(APP_USER)
                .set(APP_USER.ID, UUID.randomUUID())
                .set(APP_USER.OIDC_SUB, oidcSub)
                .set(APP_USER.EMAIL, email)
                .set(APP_USER.PREFERRED_USERNAME, preferredUsername)
                .set(APP_USER.CREATED_AT, now)
                .set(APP_USER.UPDATED_AT, now)
                .onConflict(APP_USER.OIDC_SUB)
                .doUpdate()
                .set(APP_USER.EMAIL, DSL.coalesce(DSL.excluded(APP_USER.EMAIL), APP_USER.EMAIL))
                .set(
                        APP_USER.PREFERRED_USERNAME,
                        DSL.coalesce(DSL.excluded(APP_USER.PREFERRED_USERNAME), APP_USER.PREFERRED_USERNAME))
                .set(APP_USER.UPDATED_AT, DSL.excluded(APP_USER.UPDATED_AT))
                .returning(APP_USER.ID, APP_USER.OIDC_SUB, APP_USER.EMAIL, APP_USER.PREFERRED_USERNAME)
                .fetchOne();

        if (record == null) {
            throw new IllegalStateException("Upsert of app_user returned no row for sub=" + oidcSub);
        }
        return new AppUser(
                record.get(APP_USER.ID),
                record.get(APP_USER.OIDC_SUB),
                record.get(APP_USER.EMAIL),
                record.get(APP_USER.PREFERRED_USERNAME));
    }
}

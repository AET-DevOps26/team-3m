CREATE TABLE app_user (
    id                  UUID            PRIMARY KEY,
    oidc_sub            VARCHAR(255)    NOT NULL CONSTRAINT app_user_oidc_sub_key UNIQUE,
    email               VARCHAR(255),
    preferred_username  VARCHAR(255),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Placeholder owner for any pre-auth rows already in financial_transaction.
-- Keeps the NOT NULL + FK additions safe across dev databases.
INSERT INTO app_user (id, oidc_sub, preferred_username)
SELECT
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'legacy-pre-auth'
WHERE EXISTS (SELECT 1 FROM financial_transaction);

ALTER TABLE financial_transaction
    ADD COLUMN user_id UUID;

UPDATE financial_transaction
   SET user_id = '00000000-0000-0000-0000-000000000000'
 WHERE user_id IS NULL;

ALTER TABLE financial_transaction
    ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE financial_transaction
    ADD CONSTRAINT fk_financial_transaction_user
        FOREIGN KEY (user_id) REFERENCES app_user (id);

ALTER TABLE financial_transaction
    DROP CONSTRAINT financial_transaction_transaction_id_key;

ALTER TABLE financial_transaction
    RENAME COLUMN transaction_id TO external_transaction_id;

ALTER TABLE financial_transaction
    ADD CONSTRAINT financial_transaction_user_external_uk
        UNIQUE (user_id, external_transaction_id);

-- Composite index supporting the common "list my transactions, newest first"
-- query pattern. Postgres can use the leftmost prefix for user-only filters,
-- so a separate user-only index is unnecessary.
CREATE INDEX idx_financial_transaction_user_datetime
    ON financial_transaction (user_id, datetime DESC);

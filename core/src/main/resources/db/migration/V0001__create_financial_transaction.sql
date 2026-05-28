CREATE TABLE financial_transaction (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    datetime          TIMESTAMPTZ     NOT NULL,
    date              DATE            NOT NULL,
    account_type      VARCHAR(50)     NOT NULL,
    category          VARCHAR(50)     NOT NULL,
    type              VARCHAR(50)     NOT NULL,
    asset_class       VARCHAR(50),
    name              VARCHAR(255),
    symbol            VARCHAR(50),
    shares            NUMERIC(20, 10),
    price             NUMERIC(18, 6),
    amount            NUMERIC(18, 6)  NOT NULL,
    fee               NUMERIC(18, 6),
    tax               NUMERIC(18, 6),
    currency          VARCHAR(3)      NOT NULL,
    original_amount   NUMERIC(18, 6),
    original_currency VARCHAR(3),
    fx_rate           NUMERIC(18, 6),
    description       TEXT,
    transaction_id    UUID            NOT NULL UNIQUE,
    counterparty_name VARCHAR(255),
    counterparty_iban VARCHAR(34),
    payment_reference VARCHAR(255),
    mcc_code          VARCHAR(4),
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_transaction_date ON financial_transaction (date);
CREATE INDEX idx_financial_transaction_category ON financial_transaction (category);
CREATE INDEX idx_financial_transaction_type ON financial_transaction (type);

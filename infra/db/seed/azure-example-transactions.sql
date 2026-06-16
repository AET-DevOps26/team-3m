-- Azure demo seed: a deterministic dev app_user plus the curated example
-- transactions, so a fresh Azure deploy lands the demo user in a ready-to-explore
-- environment instead of an empty account.
--
-- This mirrors resources/example-data/transaction-csv.example.csv and is keyed to
-- the fixed Keycloak user id in infra/keycloak/realms/kontor-azure-users-0.json
-- (the Keycloak user id is the OIDC `sub`, so the seeded app_user matches the row
-- CurrentUserService resolves on first login).
--
-- Idempotent: ON CONFLICT DO NOTHING makes it safe to re-run on every deploy.

INSERT INTO app_user (id, oidc_sub, email, preferred_username)
VALUES (
    '11111111-1111-1111-1111-1111111111de',
    '00000000-0000-0000-0000-0000000000de',
    'dev@kontor.local',
    'dev'
)
ON CONFLICT (oidc_sub) DO NOTHING;

INSERT INTO financial_transaction (
    id, user_id, datetime, date, account_type, category, type, asset_class,
    name, symbol, shares, price, amount, fee, tax, currency,
    original_amount, original_currency, fx_rate, description,
    external_transaction_id, counterparty_name, counterparty_iban,
    payment_reference, mcc_code
) VALUES
    (gen_random_uuid(), (SELECT id FROM app_user WHERE oidc_sub = '00000000-0000-0000-0000-0000000000de'), '2026-04-01T09:30:00.000000Z', '2026-04-01', 'DEFAULT', 'CASH', 'CUSTOMER_INBOUND', NULL, 'Jane Doe', NULL, NULL, NULL, 3200.000000, NULL, NULL, 'EUR', NULL, NULL, NULL, 'Monthly salary April 2026', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Jane Doe', 'DE89370400440532013000', NULL, NULL),
    (gen_random_uuid(), (SELECT id FROM app_user WHERE oidc_sub = '00000000-0000-0000-0000-0000000000de'), '2026-04-03T14:22:33.412Z', '2026-04-03', 'DEFAULT', 'TRADING', 'BUY', 'STOCK', 'Apple', 'US0378331005', 5.0, 192.340000, -961.70, -1.00, NULL, 'EUR', NULL, NULL, NULL, NULL, 'b2c3d4e5-f6a7-8901-bcde-f12345678901', NULL, NULL, NULL, NULL),
    (gen_random_uuid(), (SELECT id FROM app_user WHERE oidc_sub = '00000000-0000-0000-0000-0000000000de'), '2026-04-05T10:05:12.781Z', '2026-04-05', 'DEFAULT', 'TRADING', 'BUY', 'FUND', 'Core MSCI World USD (Acc)', 'IE00B4L5Y983', 12.0, 85.250000, -1023.00, -1.00, NULL, 'EUR', NULL, NULL, NULL, NULL, 'c3d4e5f6-a7b8-4012-9def-123456789012', NULL, NULL, NULL, NULL),
    (gen_random_uuid(), (SELECT id FROM app_user WHERE oidc_sub = '00000000-0000-0000-0000-0000000000de'), '2026-04-08T08:00:00.123456Z', '2026-04-08', 'DEFAULT', 'CASH', 'CUSTOMER_OUTBOUND', NULL, 'Jane Doe', NULL, NULL, NULL, -500.000000, NULL, NULL, 'EUR', NULL, NULL, NULL, 'Savings transfer', 'd4e5f6a7-b8c9-4123-8efa-234567890123', 'Jane Doe', 'DE27100777770209299700', NULL, NULL),
    (gen_random_uuid(), (SELECT id FROM app_user WHERE oidc_sub = '00000000-0000-0000-0000-0000000000de'), '2026-04-10T18:45:10.552Z', '2026-04-10', 'DEFAULT', 'TRADING', 'BUY', 'FUND', 'MSCI EM USD (Acc)', 'IE00B4L5YC18', 8.0, 38.120000, -304.96, -1.00, NULL, 'EUR', NULL, NULL, NULL, NULL, 'e5f6a7b8-c9d0-4234-8fab-345678901234', NULL, NULL, NULL, NULL),
    (gen_random_uuid(), (SELECT id FROM app_user WHERE oidc_sub = '00000000-0000-0000-0000-0000000000de'), '2026-04-15T07:15:00.000000Z', '2026-04-15', 'DEFAULT', 'CASH', 'CUSTOMER_OUTBOUND', NULL, 'Stadtwerke Berlin', NULL, NULL, NULL, -89.000000, NULL, NULL, 'EUR', NULL, NULL, NULL, 'Monthly electricity', 'f6a7b8c9-d0e1-4345-9abc-456789012345', 'Stadtwerke Berlin', 'DE44500105175407324931', NULL, NULL),
    (gen_random_uuid(), (SELECT id FROM app_user WHERE oidc_sub = '00000000-0000-0000-0000-0000000000de'), '2026-04-20T11:30:00.331Z', '2026-04-20', 'DEFAULT', 'TRADING', 'SELL', 'STOCK', 'Apple', 'US0378331005', 2.0, 198.760000, 397.52, -1.00, NULL, 'EUR', NULL, NULL, NULL, NULL, 'a7b8c9d0-e1f2-3456-abcd-567890123456', NULL, NULL, NULL, NULL),
    (gen_random_uuid(), (SELECT id FROM app_user WHERE oidc_sub = '00000000-0000-0000-0000-0000000000de'), '2026-04-25T16:20:45.900123Z', '2026-04-25', 'DEFAULT', 'TRADING', 'DIVIDEND', 'STOCK', 'Apple', 'US0378331005', NULL, NULL, 4.900000, NULL, 0.730000, 'EUR', 5.250000, 'USD', 0.933300, 'Quarterly dividend', 'b8c9d0e1-f2a3-4567-bcde-678901234567', NULL, NULL, NULL, NULL)
ON CONFLICT (user_id, external_transaction_id) DO NOTHING;

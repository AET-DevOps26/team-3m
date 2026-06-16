ALTER TABLE app_user
    ADD COLUMN risk_tolerance VARCHAR(20)
        CONSTRAINT app_user_risk_tolerance_check
            CHECK (risk_tolerance IN ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'));

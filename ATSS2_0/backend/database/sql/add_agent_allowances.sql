-- An agent's standing allowance, and the record of every allowance billed.
--
-- Mirrors database/migrations/2026_10_07_000001_add_allowance_to_agent_balance_and_create_agent_invoice_allowances.php
-- for deployments that apply schema changes by hand.
--
-- The agent_balance columns are already on the live database; they are listed
-- here (commented) for a fresh deployment.
--
-- ALTER TABLE `agent_balance`
--     ADD COLUMN `allowance_value` DECIMAL(10,2) NULL,
--     ADD COLUMN `period` VARCHAR(50) NULL;

-- One row per allowance billed on an agent invoice. The unique key stops the
-- same agent's coverage period (a billing week, or a calendar month) from being
-- paid twice.
CREATE TABLE IF NOT EXISTS `agent_invoice_allowances` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `agent_invoice_id` BIGINT UNSIGNED NOT NULL,
    `agent_id`         BIGINT UNSIGNED NOT NULL,
    `owner_key`        VARCHAR(40) NOT NULL,
    `agent_name`       VARCHAR(255) NULL,
    `period`           VARCHAR(20) NOT NULL,
    `coverage_start`   DATE NOT NULL,
    `coverage_end`     DATE NOT NULL,
    `amount`           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `created_at`       TIMESTAMP NULL DEFAULT NULL,
    `updated_at`       TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `agent_invoice_allowance_unique` (`agent_id`, `period`, `coverage_start`),
    KEY `agent_invoice_allowances_agent_id_index` (`agent_id`),
    KEY `agent_invoice_allowances_owner_key_index` (`owner_key`),
    CONSTRAINT `agent_invoice_allowances_agent_invoice_id_foreign`
        FOREIGN KEY (`agent_invoice_id`) REFERENCES `agent_invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The period an agent invoice's allowance covers.
--
-- Mirrors database/migrations/2026_10_06_000001_add_allowance_coverage_to_agent_invoices.php
-- for deployments that apply schema changes by hand.
--
-- NULL on both (every invoice by default) keeps the old layout. With both set,
-- the PDF prints "+ ALLOWANCE" below "+ INCENTIVE" with these dates, when there
-- is an allowance to pay.

ALTER TABLE `agent_invoices`
    ADD COLUMN `allowance_coverage_start` DATE NULL DEFAULT NULL AFTER `allowance`,
    ADD COLUMN `allowance_coverage_end` DATE NULL DEFAULT NULL AFTER `allowance_coverage_start`;

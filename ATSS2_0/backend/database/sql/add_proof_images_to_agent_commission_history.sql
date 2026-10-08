-- Every proof image attached to an agent payout, as a JSON array of Drive links.
--
-- Mirrors database/migrations/2026_10_06_000002_add_proof_images_to_agent_commission_history.php
-- for deployments that apply schema changes by hand.
--
-- `proof_of_payment` keeps the first image exactly as before, so every screen
-- that reads it — older mobile app builds included — still shows one proof.

ALTER TABLE `agent_commission_history`
    ADD COLUMN `proof_images` TEXT NULL DEFAULT NULL AFTER `proof_of_payment`;

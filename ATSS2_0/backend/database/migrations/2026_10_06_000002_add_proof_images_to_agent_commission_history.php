<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every proof image attached to an agent payout.
 *
 * `proof_of_payment` is a VARCHAR(255) holding one Google Drive link, and every
 * screen that shows a payout — the mobile app's builds included — reads it as
 * exactly that. So it keeps the FIRST image, unchanged, and the full list lives
 * here as a JSON array. A reader that knows about this column shows them all;
 * one that does not still shows the first.
 *
 * Guarded so the migration is safe to run twice, and safe on a deployment where
 * the column was already added by hand from
 * database/sql/add_proof_images_to_agent_commission_history.sql.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('agent_commission_history') && !Schema::hasColumn('agent_commission_history', 'proof_images')) {
            Schema::table('agent_commission_history', function (Blueprint $table) {
                $table->text('proof_images')->nullable()->after('proof_of_payment');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('agent_commission_history') && Schema::hasColumn('agent_commission_history', 'proof_images')) {
            Schema::table('agent_commission_history', function (Blueprint $table) {
                $table->dropColumn('proof_images');
            });
        }
    }
};

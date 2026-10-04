<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An allowance paid on top of what an agent invoice bills.
 *
 * Entered on the agent payout form. The payout carries it while it is Pending
 * (`agent_commission_history.allowance`), and approving the payout writes it
 * onto the invoice it settles (`agent_invoices.allowance`), where it is added
 * to the subtotal and printed on the PDF.
 *
 * Guarded so the migration is safe to run twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('agent_invoices') && !Schema::hasColumn('agent_invoices', 'allowance')) {
            Schema::table('agent_invoices', function (Blueprint $table) {
                $table->decimal('allowance', 12, 2)->default(0)->after('commission');
            });
        }

        if (Schema::hasTable('agent_commission_history') && !Schema::hasColumn('agent_commission_history', 'allowance')) {
            Schema::table('agent_commission_history', function (Blueprint $table) {
                $table->decimal('allowance', 12, 2)->default(0)->after('total_amount');
            });
        }
    }

    public function down(): void
    {
        foreach (['agent_invoices', 'agent_commission_history'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'allowance')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropColumn('allowance');
                });
            }
        }
    }
};

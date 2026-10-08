<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An agent's standing allowance, and the record of every allowance billed.
 *
 * `agent_balance.allowance_value` / `period` are the agent's terms: how much,
 * and whether it is paid weekly or monthly. They are set on the user form.
 *
 * `agent_invoice_allowances` is the ledger the weekly invoice run writes when it
 * bills one: which agent, which coverage period (the billing week, or the
 * calendar month), how much, and on which invoice. The unique key on
 * (agent_id, period, coverage_start) is what stops the same coverage being paid
 * twice — a second run, a retry or two runs racing are refused by the database
 * rather than trusted to check first.
 *
 * Deleting an invoice frees its allowances (cascade), the same as it frees its
 * customers, so a coverage period is never left claimed by an invoice that no
 * longer exists.
 *
 * Guarded so it is safe to run twice, and safe on a deployment where the
 * columns or the table were already added by hand from
 * database/sql/add_agent_allowances.sql.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('agent_balance')) {
            Schema::table('agent_balance', function (Blueprint $table) {
                if (!Schema::hasColumn('agent_balance', 'allowance_value')) {
                    $table->decimal('allowance_value', 10, 2)->nullable();
                }
                if (!Schema::hasColumn('agent_balance', 'period')) {
                    $table->string('period', 50)->nullable();
                }
            });
        }

        if (!Schema::hasTable('agent_invoice_allowances')) {
            Schema::create('agent_invoice_allowances', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('agent_invoice_id');
                // The agent the allowance is paid to (users.id).
                $t->unsignedBigInteger('agent_id')->index();
                // The invoice's owner, repeated for reading a team's history.
                $t->string('owner_key', 40)->index();
                // The name as it was when billed, as the invoice keeps its own.
                $t->string('agent_name')->nullable();
                // 'weekly' or 'monthly'.
                $t->string('period', 20);
                $t->date('coverage_start');
                $t->date('coverage_end');
                $t->decimal('amount', 12, 2)->default(0);
                $t->timestamps();

                $t->foreign('agent_invoice_id')
                  ->references('id')->on('agent_invoices')
                  ->onDelete('cascade');

                // One allowance per agent per coverage period, ever.
                $t->unique(['agent_id', 'period', 'coverage_start'], 'agent_invoice_allowance_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_invoice_allowances');
        // agent_balance's columns are left in place: they hold the agents' terms,
        // and were added to the live database by hand before this migration.
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The period an invoice's allowance covers.
 *
 * Set by hand on the invoices that need it, not by the weekly run. An invoice
 * with a coverage prints its ALLOWANCE line below the INCENTIVE with these
 * dates; one without keeps the old layout. Either way the line only appears
 * when there is an allowance to pay.
 *
 * Guarded so the migration is safe to run twice, and safe on a deployment where
 * the columns were already added by hand from
 * database/sql/add_allowance_coverage_to_agent_invoices.sql.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('agent_invoices')) {
            return;
        }

        Schema::table('agent_invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('agent_invoices', 'allowance_coverage_start')) {
                $table->date('allowance_coverage_start')->nullable()->after('allowance');
            }

            if (!Schema::hasColumn('agent_invoices', 'allowance_coverage_end')) {
                $table->date('allowance_coverage_end')->nullable()->after('allowance_coverage_start');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('agent_invoices')) {
            return;
        }

        foreach (['allowance_coverage_end', 'allowance_coverage_start'] as $column) {
            if (Schema::hasColumn('agent_invoices', $column)) {
                Schema::table('agent_invoices', function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }
    }
};

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One allowance billed on one agent invoice: whose, for which coverage period,
 * and how much.
 *
 * These rows are the record of which allowances have been paid. A unique key on
 * (agent_id, period, coverage_start) means the same agent's week or month can
 * never be written onto a second invoice — the check is in the database, not
 * only in the run that builds the invoice.
 */
class AgentInvoiceAllowance extends Model
{
    use HasFactory;

    public const PERIOD_WEEKLY  = 'weekly';
    public const PERIOD_MONTHLY = 'monthly';
    public const PERIODS = [self::PERIOD_WEEKLY, self::PERIOD_MONTHLY];

    protected $table = 'agent_invoice_allowances';

    protected $fillable = [
        'agent_invoice_id',
        'agent_id',
        'owner_key',
        'agent_name',
        'period',
        'coverage_start',
        'coverage_end',
        'amount',
    ];

    protected $casts = [
        'agent_invoice_id' => 'integer',
        'agent_id'         => 'integer',
        'coverage_start'   => 'date',
        'coverage_end'     => 'date',
        'amount'           => 'decimal:2',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(AgentInvoice::class, 'agent_invoice_id');
    }
}

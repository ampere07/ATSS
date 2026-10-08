<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One week's referral invoice for a team or a solo agent.
 *
 * The customers it bills for are on AgentInvoiceCustomer, one row each. Names
 * are held here as they were when the invoice was raised so that renaming a
 * team later does not rewrite a document that has already been issued.
 */
class AgentInvoice extends Model
{
    use HasFactory;

    protected $table = 'agent_invoices';

    public const TYPE_TEAM = 'team';
    public const TYPE_SOLO = 'solo';

    public const STATUS_GENERATED = 'Generated';
    public const STATUS_SENT      = 'Sent';
    public const STATUS_PAID      = 'Paid';
    public const STATUS_UNPAID    = 'Unpaid';
    public const STATUS_CANCELLED = 'Cancelled';

    /**
     * The statuses the invoice list offers when changing one by hand.
     *
     * Generated is where every invoice starts, and Paid/Unpaid are the two
     * states somebody settles it into.
     *
     * Sent and Cancelled are deliberately NOT here while remaining valid on
     * STATUSES below: invoices already carrying them keep them and continue to
     * display correctly, they simply are not offered as new choices.
     */
    public const SELECTABLE_STATUSES = [
        self::STATUS_GENERATED,
        self::STATUS_PAID,
        self::STATUS_UNPAID,
    ];

    /** Every status the column may legitimately hold, including legacy ones. */
    public const STATUSES = [
        self::STATUS_GENERATED,
        self::STATUS_SENT,
        self::STATUS_PAID,
        self::STATUS_UNPAID,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'invoice_number',
        'invoice_type',
        'owner_key',
        'team_id',
        'agent_id',
        'team_name',
        'agent_name',
        'period_start',
        'period_end',
        'invoice_date',
        'total_customers',
        'unit_price',
        'installation_fee',
        'total_amount',
        'commission',
        // Added when the payout that settles this invoice is approved, and
        // included in the subtotal.
        'allowance',
        // The period the allowance covers. Set by hand; when present the PDF
        // prints the allowance below the incentive with these dates, when there is one.
        'allowance_coverage_start',
        'allowance_coverage_end',
        'subtotal',
        'pdf_path',
        // The rendered PDF lives on Google Drive, not on this server. `pdf_path`
        // is still the layout-versioned name it was rendered under; these are
        // where it can actually be read from.
        'pdf_drive_url',
        'pdf_drive_id',
        'pdf_uploaded_at',
        'status',
        'organization_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'team_id'          => 'integer',
        'agent_id'         => 'integer',
        'period_start'     => 'date',
        'period_end'       => 'date',
        'invoice_date'     => 'date',
        'total_customers'  => 'integer',
        'unit_price'       => 'decimal:2',
        'installation_fee' => 'decimal:2',
        'total_amount'     => 'decimal:2',
        'commission'       => 'decimal:2',
        'allowance'        => 'decimal:2',
        'allowance_coverage_start' => 'date',
        'allowance_coverage_end'   => 'date',
        'subtotal'         => 'decimal:2',
        'organization_id'  => 'integer',
    ];

    /**
     * The owner key for a team or a solo agent.
     *
     * A single non-null string, because the unique keys that stop an invoice or
     * a customer being repeated are built on it — and MySQL would let a NULL
     * team_id or agent_id slip past a unique index.
     */
    public static function ownerKeyForTeam($teamId): string
    {
        return 'team:' . (int) $teamId;
    }

    public static function ownerKeyForAgent($agentId): string
    {
        return 'solo:' . (int) $agentId;
    }

    public function customers(): HasMany
    {
        return $this->hasMany(AgentInvoiceCustomer::class, 'agent_invoice_id');
    }

    /** The standing allowances this invoice bills — see AgentInvoiceAllowance. */
    public function allowances(): HasMany
    {
        return $this->hasMany(AgentInvoiceAllowance::class, 'agent_invoice_id');
    }

    /**
     * The allowance lines this invoice bills, oldest coverage first; empty on a
     * deployment that has not created the ledger table yet.
     *
     * @return \Illuminate\Support\Collection<int, AgentInvoiceAllowance>
     */
    public function allowanceLines()
    {
        if (!self::allowanceLedgerExists() || !$this->exists) {
            return collect();
        }

        return $this->relationLoaded('allowances')
            ? $this->allowances->sortBy('coverage_start')->values()
            : $this->allowances()->orderBy('coverage_start')->orderBy('id')->get();
    }

    /** Whether agent_invoice_allowances exists on this deployment, checked once per request. */
    public static function allowanceLedgerExists(): bool
    {
        static $exists = null;

        return $exists ??= \Illuminate\Support\Facades\Schema::hasTable('agent_invoice_allowances');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'team_id', 'id');
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id', 'id');
    }

    /** Who this invoice is addressed to, for a heading or a list column. */
    public function getBilledToAttribute(): string
    {
        return $this->invoice_type === self::TYPE_TEAM
            ? (string) ($this->team_name ?: 'Team')
            : (string) ($this->agent_name ?: 'Agent');
    }
}

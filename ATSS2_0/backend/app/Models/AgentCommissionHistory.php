<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentCommissionHistory extends Model
{
    use HasFactory;

    protected $table = 'agent_commission_history';

    protected $fillable = [
        'ref_number',
        'total_amount',
        // Allowance entered on the payout form. Written onto the invoice the
        // payout settles when it is approved — see CommissionController.
        'allowance',
        'created_by',
        'remarks',
        // The first proof image. Kept exactly as it always was, so every screen
        // reading it still finds one Drive link.
        'proof_of_payment',
        // Every proof image, first one included. Null on payouts recorded with
        // a single image before this column existed.
        'proof_images',
        'agent_id',
        'organization_id',
        'commission_id_list',
        'updated_by',
        'updated_at',
        // Transaction kind: commission / incentives / incentives_payout / Bonus /
        // Bonus_payout / all / achievement. Must stay fillable — the history tabs
        // and the +/- sign on the payout list are driven entirely by this column.
        'type',
        // The column is `approve_by` (no "d") — see database/db_schema.json.
        'approve_by',
        // Approval state, mirroring transactions: Pending / Approved / Rejected.
        // A payout only moves the agent's balance once it reaches Approved.
        'status',
        // The job orders this payout settles, kept so approval marks exactly
        // those as paid rather than re-deriving a possibly different set.
        'job_order_ids'
    ];

    protected $casts = [
        'proof_images' => 'array',
    ];

    public $timestamps = false; // The table has created_at but uses CURRENT_TIMESTAMP, and no updated_at

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }
}
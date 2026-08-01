<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One row per onboarded-referral milestone an agent has claimed. The reward amount is
 * fixed by CommissionController, so a claim can never be created for an arbitrary value.
 */
class AgentAchievementClaim extends Model
{
    use HasFactory;

    protected $table = 'agent_achievement_claims';

    protected $fillable = [
        'agent_id',
        'milestone',
        'amount',
    ];

    protected $casts = [
        'agent_id'  => 'integer',
        'milestone' => 'integer',
        'amount'    => 'decimal:2',
    ];

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }
}

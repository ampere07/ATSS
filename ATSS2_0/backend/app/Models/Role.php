<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $table = 'roles';

    /**
     * Seeded role IDs (see RolesSeeder). Named here so authorization checks read
     * as roles rather than as bare numbers scattered across controllers.
     *
     * IDs 1-8 are the "locked" system roles: they are never editable from Role
     * Management and their access is described by App\Support\Permissions. Any
     * role above 8 is a custom role and carries its own `permissions` array.
     */
    public const ADMINISTRATOR   = 1;
    public const TECHNICIAN      = 2;
    public const CUSTOMER        = 3;
    public const AGENT           = 4;
    public const INVENTORY_STAFF = 5;
    public const OSP             = 6;
    public const SUPER_ADMIN     = 7;
    public const HEAD_TECH       = 8;

    /** The seeded roles, in ID order. Anything outside this list is a custom role. */
    public const LOCKED_ROLE_IDS = [
        self::ADMINISTRATOR,
        self::TECHNICIAN,
        self::CUSTOMER,
        self::AGENT,
        self::INVENTORY_STAFF,
        self::OSP,
        self::SUPER_ADMIN,
        self::HEAD_TECH,
    ];

    /**
     * Slugs the `role` middleware accepts, mapped onto the IDs above.
     *
     * Every seeded role is listed so `role:technician` and friends work rather
     * than silently matching nothing; the middleware also takes a numeric ID
     * directly. Spellings that appear in the wild (`super_admin` vs
     * `superadmin`, `head_tech` vs `headtech`) both resolve.
     */
    private const SLUGS = [
        'administrator'   => self::ADMINISTRATOR,
        'admin'           => self::ADMINISTRATOR,
        'technician'      => self::TECHNICIAN,
        'customer'        => self::CUSTOMER,
        'agent'           => self::AGENT,
        'inventorystaff'  => self::INVENTORY_STAFF,
        'inventory_staff' => self::INVENTORY_STAFF,
        'osp'             => self::OSP,
        'super_admin'     => self::SUPER_ADMIN,
        'superadmin'      => self::SUPER_ADMIN,
        'headtech'        => self::HEAD_TECH,
        'head_tech'       => self::HEAD_TECH,
    ];

    /** Is this one of the seeded, non-editable roles? */
    public static function isLocked(int|string|null $roleId): bool
    {
        return in_array((int) $roleId, self::LOCKED_ROLE_IDS, true);
    }

    /**
     * Resolve a middleware argument — a slug like "super_admin" or a bare ID
     * like "7" — to a role ID. Returns null when it matches neither.
     */
    public static function idForSlug(string $role): ?int
    {
        $key = strtolower(trim($role));

        if ($key === '') {
            return null;
        }

        if (isset(self::SLUGS[$key])) {
            return self::SLUGS[$key];
        }

        return ctype_digit($key) ? (int) $key : null;
    }

    protected $fillable = [
        'role_name',
        'description',
        'permissions',
        'created_by_user_id',
        'updated_by_user_id',
        'organization_id'
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function users()
    {
        return $this->hasMany(User::class, 'role_id', 'id');
    }
}

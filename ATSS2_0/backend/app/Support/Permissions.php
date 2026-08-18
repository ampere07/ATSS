<?php

namespace App\Support;

use App\Models\Role;

/**
 * The single source of truth for what each role may see and do.
 *
 * There are two kinds of permission key:
 *
 *   page actions   — one per navigable section, named exactly as the section id
 *                    used by the sidebar and by Dashboard's renderContent
 *                    ("job-order", "transaction-list", ...). Holding the key
 *                    means "may open this page and use its ordinary endpoints".
 *
 *   sub actions    — "<page>.<verb>" for the individual buttons that are gated
 *                    separately ("job-order.approve", "customer.transact", ...).
 *                    A sub action always implies its parent page.
 *
 * Roles 1-8 are seeded and non-editable, so their keys live in ROLE_PERMISSIONS
 * below. Any role above 8 is a custom role created from Role Management and
 * carries its own list in roles.permissions — the same key strings, ticked in
 * the Role modal.
 *
 * Kept deliberately in step with:
 *   ATSS2_0/frontend/src/config/permissions.ts
 *   MOBILEAPP/frontend/src/config/permissions.ts
 * Those files are the same table for the two clients. Changing a key here means
 * changing it there; PermissionsParityTest guards the pair.
 */
final class Permissions
{
    /** Held by SuperAdmin only: grants every key, present and future. */
    public const WILDCARD = '*';

    /**
     * Every page key in the system, grouped the way the sidebar groups them.
     * The Role modal renders this list, so a page missing here can never be
     * granted to a custom role.
     */
    public const PAGES = [
        // Landing pages. One per audience; a user gets exactly the one their role implies.
        'dashboard',
        'agent-dashboard',
        'customer-dashboard',
        'customer-bills',
        'customer-support',
        'agent-application',

        'live-monitor',

        // Billing
        'customer',
        'transaction-list',
        'transactions-revert',
        'payment-portal',
        'soa',
        'invoice',
        'overdue',
        'so-charge',
        'dc-notice',
        'mass-rebate',
        'staggered-payment',
        'discounts',

        // Operations
        'application-management',
        'job-order',
        'service-order',
        'work-order',
        'lcp-nap-location',
        'sms-blast',
        'reports',
        'support',

        // Agent
        'commission',
        'agent-invoices',
        'agent-payout',
        'agent-management',
        'team-agent',

        // Inventory
        'inventory',
        'inventory-category-list',

        // Configuration
        'promo-list',
        'plan-list',
        'location-list',
        'lcp',
        'nap',
        'ports',
        'router-models',
        'status-remarks-list',
        'usage-type',
        'vlan-config',
        'payment-method',
        'work-category',
        'radius-config',
        'smart-olt',
        'sms-config',
        'sms-template',
        'email-templates',
        'pppoe-setup',
        'concern-config',
        'billing-config',

        // Users
        'user-management',
        'tech-users',
        'organization',
        'roles',
        'group-management',

        // Logs
        'disconnected-logs',
        'reconnection-logs',
        'sms-logs',
        'sms-blast-logs',
        'email-logs',
        'data-logs',
        'expenses-log',
        'smart-olt-logs',
        'radius-logs',
        'system-logs',

        'soa-generation',
        'settings',
    ];

    /**
     * Button-level keys, grouped by the page that owns them.
     *
     * job-order.tech-edit / job-order.admin-edit are mutually exclusive by
     * convention (the Role modal enforces it): one opens the technician's Done
     * form, the other the administrator's. Same for the service-order pair.
     */
    public const ACTIONS = [
        'job-order' => [
            'job-order.approve',
            'job-order.failed',
            'job-order.tech-edit',
            'job-order.admin-edit',
            'job-order.attachment',
        ],
        'customer' => [
            'customer.so-request',
            'customer.details-edit',
            'customer.attachment',
            'customer.transact',
        ],
        'transaction-list' => [
            'transaction-list.batch-approve',
            'transaction-list.approve',
            'transaction-list.revert-request',
        ],
        'mass-rebate' => [
            'mass-rebate.add',
        ],
        'staggered-payment' => [
            'staggered-payment.add',
        ],
        'discounts' => [
            'discounts.add',
        ],
        'application-management' => [
            'application-management.move-to-jo',
            'application-management.quick-status',
        ],
        'service-order' => [
            'service-order.tech-edit',
            'service-order.admin-edit',
        ],
        // Raising, reassigning or deleting a work order, as opposed to working
        // the ones already assigned to you. An agent has the page but not this:
        // their view is the jobs they referred, read only.
        'work-order' => [
            'work-order.manage',
        ],

        // Scheduling and issuing reports, kept apart from deleting one: a
        // report is a scheduled job other people rely on receiving, so removing
        // it is the heavier act. Deleting was already SuperAdmin-only, but it
        // was expressed as a role check on the route and, in the UI, by
        // borrowing the Settings key — which meant granting a custom role
        // Settings silently granted it report deletion too.
        'reports' => [
            'reports.manage',
            'reports.delete',
        ],

        // Raising a payout, incentive or bonus, and signing one off. Both were
        // previously inferred from "is this user not an agent".
        'commission' => [
            'commission.payout',
        ],

        // Approving or rejecting on the Agent Payout page. This one had no
        // front-end check at all — the buttons were wired straight to the
        // handler for anyone who could open the page.
        'agent-payout' => [
            'agent-payout.approve',
        ],

        // Issuing the weekly referral invoices, and marking one settled. An
        // agent reads their own; neither of these is theirs.
        'agent-invoices' => [
            'agent-invoices.generate',
            'agent-invoices.status',
        ],

        // The three list pages added since the Role modal was written. Each has
        // add/edit/delete controls that were open to anyone who could open the
        // page.
        'ports' => [
            'ports.manage',
        ],
        'router-models' => [
            'router-models.manage',
        ],
        'status-remarks-list' => [
            'status-remarks-list.manage',
        ],
        'soa-generation' => [
            'soa-generation.manage',
        ],
    ];

    /**
     * What each seeded role holds.
     *
     * These lists reproduce the access the eight locked roles already had in the
     * sidebar's allowedRoles tables — this is a consolidation of that behaviour,
     * not a re-grant. Two deliberate additions are called out inline: the
     * technician and head technician edit keys, which the old code never granted
     * to anyone but an administrator, leaving the technician Done button inert.
     */
    public const ROLE_PERMISSIONS = [
        // Full system control, including everything added later.
        Role::SUPER_ADMIN => [self::WILDCARD],

        Role::ADMINISTRATOR => [
            'dashboard',
            'live-monitor',
            // Billing
            'customer',
            'customer.so-request', 'customer.details-edit', 'customer.attachment', 'customer.transact',
            'transaction-list',
            'transaction-list.batch-approve', 'transaction-list.approve', 'transaction-list.revert-request',
            'transactions-revert',
            'payment-portal',
            'soa',
            'invoice',
            'overdue',
            'so-charge',
            'dc-notice',
            'mass-rebate', 'mass-rebate.add',
            'staggered-payment', 'staggered-payment.add',
            'discounts', 'discounts.add',
            // Operations
            'application-management',
            'application-management.move-to-jo', 'application-management.quick-status',
            'job-order',
            'job-order.approve', 'job-order.failed', 'job-order.admin-edit', 'job-order.attachment',
            'service-order', 'service-order.admin-edit',
            'work-order', 'work-order.manage',
            'lcp-nap-location',
            'sms-blast',
            'reports', 'reports.manage',
            'support',
            // Agent
            'commission', 'commission.payout',
            'team-agent',
            'agent-management',
            'agent-payout', 'agent-payout.approve',
            'agent-invoices', 'agent-invoices.generate', 'agent-invoices.status',
            // Inventory
            'inventory',
            'inventory-category-list',
            // Logs
            'disconnected-logs',
            'reconnection-logs',
            'sms-logs',
            'sms-blast-logs',
            'email-logs',
            'data-logs',
            'expenses-log',
        ],

        // Field technician: their own job orders and service orders, plus the
        // LCP/NAP map they need on site.
        //
        // The two edit keys are new. Sub-permissions were only ever read from a
        // custom role's array, which a locked role does not have, so a
        // technician's Done button resolved to "no permission" and did nothing.
        // Granting them here restores the button the role has always been meant
        // to have; the technician-only Done form is unchanged.
        Role::TECHNICIAN => [
            'job-order',
            'job-order.tech-edit',
            'job-order.attachment',
            'service-order',
            'service-order.tech-edit',
            // Work orders are a technician's work too. The web sidebar never
            // listed the page for them, but the page itself has always had
            // technician-specific behaviour — the queue ordering and the lock
            // in technicianWorkOrderAccess.ts, enforced server side by
            // WorkOrderApiController::isWorkOrderLockedForTechnician(). The
            // mobile app did list it. The omission was the sidebar's.
            'work-order', 'work-order.manage',
            'lcp-nap-location',
        ],

        // The customer portal. No sidebar, no admin pages.
        Role::CUSTOMER => [
            'customer-dashboard',
            'customer-bills',
            'customer-support',
        ],

        // Sales agent: their own referrals, their own payout history.
        Role::AGENT => [
            'agent-dashboard',
            'agent-application',
            'job-order',
            'work-order',
            'commission',
            'agent-invoices',
        ],

        Role::INVENTORY_STAFF => [
            'inventory',
            'inventory-category-list',
        ],

        // Outside plant: work orders and the fibre map.
        Role::OSP => [
            'work-order', 'work-order.manage',
            'lcp-nap-location',
        ],

        // Head technician: supervises the field roles and the parts of
        // Configurations that describe the plant.
        //
        // As with the technician, the edit keys are new — the role could open
        // the pages but no button was ever enabled for it.
        Role::HEAD_TECH => [
            'application-management',
            'application-management.move-to-jo', 'application-management.quick-status',
            'job-order',
            'job-order.approve', 'job-order.failed', 'job-order.admin-edit', 'job-order.attachment',
            'service-order', 'service-order.admin-edit',
            'work-order', 'work-order.manage',
            'lcp-nap-location',
            'location-list',
            'lcp',
            'nap',
        ],
    ];

    /**
     * Where each role lands after signing in.
     *
     * Must be a key the role actually holds — Dashboard falls back to the first
     * permission it finds when it is not, but that ordering is arbitrary and
     * makes for a poor landing page.
     */
    public const ROLE_HOME = [
        Role::SUPER_ADMIN     => 'dashboard',
        Role::ADMINISTRATOR   => 'dashboard',
        Role::TECHNICIAN      => 'job-order',
        Role::CUSTOMER        => 'customer-dashboard',
        Role::AGENT           => 'agent-dashboard',
        Role::INVENTORY_STAFF => 'inventory',
        Role::OSP             => 'work-order',
        Role::HEAD_TECH       => 'application-management',
    ];

    /** Every valid key: pages plus sub actions. */
    public static function all(): array
    {
        static $all = null;

        if ($all === null) {
            $all = array_values(array_unique(array_merge(
                self::PAGES,
                array_merge(...array_values(self::ACTIONS))
            )));
        }

        return $all;
    }

    /**
     * The keys a user effectively holds.
     *
     * A locked role reads from ROLE_PERMISSIONS; a custom role reads its own
     * `permissions` column. Either way the result also contains the parent page
     * of every sub action it holds, so a check for "job-order" succeeds for a
     * role that was only given "job-order.approve" — which is how the Role modal
     * presents it (ticking a sub action ticks its page).
     *
     * @param  \App\Models\User|object|null  $user
     * @return string[]
     */
    public static function forUser($user): array
    {
        if ($user === null) {
            return [];
        }

        $roleId = (int) ($user->role_id ?? 0);

        if ($roleId === Role::SUPER_ADMIN) {
            return [self::WILDCARD];
        }

        $keys = Role::isLocked($roleId)
            ? (self::ROLE_PERMISSIONS[$roleId] ?? [])
            : self::customRoleKeys($user);

        return self::withImpliedPages($keys);
    }

    /**
     * Does this user hold the given key?
     *
     * `$permission` may be a single key or a list, in which case holding any one
     * of them is enough — used by endpoints that serve two audiences, e.g. an
     * invoice readable both from the admin Invoice page and from the customer's
     * own Bills page.
     *
     * @param  \App\Models\User|object|null  $user
     * @param  string|string[]  $permission
     */
    public static function allows($user, string|array $permission): bool
    {
        if ($user === null) {
            return false;
        }

        $held = self::forUser($user);

        if (in_array(self::WILDCARD, $held, true)) {
            return true;
        }

        foreach ((array) $permission as $wanted) {
            if (in_array($wanted, $held, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Read a custom role's stored permission list.
     *
     * The column is cast to an array by the Role model, but rows written before
     * that cast existed hold a JSON string or a comma-separated list, so all
     * three shapes are accepted — the frontend parses it the same three ways.
     *
     * @return string[]
     */
    private static function customRoleKeys($user): array
    {
        $raw = null;

        // Prefer an already-loaded relation so this does not fire a query per
        // request; fall back to a lookup when the caller did not eager-load it.
        if (isset($user->role) && $user->role !== null) {
            $raw = $user->role->permissions ?? null;
        } elseif (!empty($user->role_id)) {
            $raw = optional(Role::find($user->role_id))->permissions;
        }

        if (is_array($raw)) {
            return array_values(array_filter(array_map('strval', $raw), 'strlen'));
        }

        if (is_string($raw) && trim($raw) !== '') {
            $decoded = json_decode($raw, true);

            if (is_array($decoded)) {
                return array_values(array_filter(array_map('strval', $decoded), 'strlen'));
            }

            return array_values(array_filter(array_map('trim', explode(',', $raw)), 'strlen'));
        }

        return [];
    }

    /**
     * Add the parent page of every "page.verb" key present.
     *
     * @param  string[]  $keys
     * @return string[]
     */
    private static function withImpliedPages(array $keys): array
    {
        $result = $keys;

        foreach ($keys as $key) {
            if (str_contains($key, '.')) {
                $parent = strstr($key, '.', true);

                if ($parent !== false && !in_array($parent, $result, true)) {
                    $result[] = $parent;
                }
            }
        }

        return array_values(array_unique($result));
    }
}

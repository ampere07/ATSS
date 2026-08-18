<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * What the API requires of a caller, endpoint by endpoint.
 *
 * The routes file grew to ~670 endpoints of which only 46 sat behind
 * `auth:sanctum`; the rest answered anyone who could reach the host. Rather
 * than annotate 600-odd route definitions — and lose the next one that gets
 * added without an annotation — the requirement is declared here in one table
 * and applied by App\Http\Middleware\ApiAccessControl to every request in the
 * `api` group.
 *
 * Three kinds of requirement:
 *
 *   PUBLIC_ACCESS  no credentials at all. Sign-in, the payment provider's
 *                  webhook, and the handful of branding endpoints the login
 *                  screen paints itself with before anyone has signed in.
 *
 *   null           any signed-in user. Reference and lookup data — regions,
 *                  plans, LCP/NAP, status remarks — which every role needs to
 *                  fill in the forms its own pages own. Reading the list of
 *                  barangays is not what authorization is for; writing to it
 *                  is, and the write side of each of those carries a key.
 *
 *   key | [keys]   a permission key from App\Support\Permissions. An array
 *                  means "any one of these", for endpoints that legitimately
 *                  serve two audiences — an invoice is read both from the admin
 *                  Invoice page and from the customer's own Bills page.
 *
 * Rules are matched in order and the first hit wins, so a specific path is
 * listed above the prefix that would otherwise swallow it. Patterns use `*`
 * (Str::is), matched against the path with the leading `api/` removed.
 *
 * A path that matches nothing falls through to DEFAULT_REQUIREMENT — signed in,
 * any role — so a newly added route is never anonymous by accident.
 * ApiPermissionCoverageTest fails on any route that is not matched by a rule
 * here, which is what stops that default from quietly becoming the norm.
 */
final class ApiPermissionMap
{
    /** No credentials required. */
    public const PUBLIC_ACCESS = 'public';

    /** Applied to any path no rule matches: signed in, no particular key. */
    public const DEFAULT_REQUIREMENT = null;

    /**
     * [pattern, GET requirement, write requirement] with an optional fourth
     * element: per-method requirements that override the write one.
     *
     * "write" covers POST, PUT, PATCH and DELETE. Where a single value is given
     * for both read and write it is repeated rather than defaulted, so each line
     * reads on its own.
     *
     * The fourth element exists for the handful of endpoints where one verb is
     * heavier than its neighbours — deleting a report is not the same act as
     * editing one — and is written `['DELETE' => 'reports.delete']`.
     */
    private const RULES = [
        // ── Anonymous ────────────────────────────────────────────────────────
        // Sign-in and the pieces the sign-in screen itself renders.
        ['login',                        self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        ['forgot-password',              self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        ['health',                       self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        ['cors-test',                    self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        ['locations-ping',               self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        // Read by the mobile app before anyone signs in, to decide whether the
        // installed build is still supported. Writing it is a setting.
        ['app-version/config',           self::PUBLIC_ACCESS, 'settings'],
        ['form-ui/config',               self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        ['settings-color-palette/active', self::PUBLIC_ACCESS, 'settings'],
        ['settings-image-size/active',   self::PUBLIC_ACCESS, 'settings'],
        ['system-config/logo',           self::PUBLIC_ACCESS, 'settings'],
        // Xendit calls these; there is no user to authenticate. The controller
        // verifies the provider's callback token.
        ['xendit-webhook',               self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        ['payments/webhook',             self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        ['payments/webhook-info',        self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],
        // Rendered by <img src>, which sends no Authorization header.
        ['proxy/image',                  self::PUBLIC_ACCESS, self::PUBLIC_ACCESS],

        // ── Diagnostics and one-off maintenance ──────────────────────────────
        // Listed first so a specific diagnostic beats the prefix rule for its
        // section further down. None of these is called by any client.
        //
        // `login-debug` is superadmin rather than public because it reports
        // whether an account exists and whether a password matches, which is an
        // account-enumeration oracle if left open.
        ['login-debug',                  'settings', 'settings'],
        ['debug/*',                      'settings', 'settings'],
        ['fix-customer-password',        'settings', 'settings'],
        ['emergency/*',                  'settings', 'settings'],
        ['setup/*',                      'settings', 'settings'],
        ['locations/mock',               'settings', 'settings'],
        ['locations/test',               'settings', 'settings'],
        ['locations/all-debug',          'settings', 'settings'],
        ['locations/locations/debug',    'settings', 'settings'],
        ['plans-test',                   'settings', 'settings'],
        ['plans-direct',                 'settings', 'settings'],
        ['job-order-items-test',         'settings', 'settings'],
        ['reports-migrate-pdf',          'settings', 'settings'],
        ['inventory/debug',              'settings', 'settings'],
        ['user-preferences/debug',       'settings', 'settings'],
        ['mass-rebates/test',            'mass-rebate', 'mass-rebate'],
        ['mass-rebates/test-connection', 'mass-rebate', 'mass-rebate'],
        ['monitor/debug',                'live-monitor', 'live-monitor'],
        ['notifications/debug-timezone', null, null],

        // ── The signed-in user's own account ─────────────────────────────────
        ['user',                         null, null],
        ['logout',                       null, null],
        ['me/permissions',               null, null],
        ['user-preferences/*',           null, null],
        ['user-settings/*',              null, null],
        ['broadcasting/auth',            null, null],
        ['tech-in-out/*',                null, null],
        // A technician's device posts its own position; who may read the trail
        // is the restricted half.
        ['technician-location',          null, null],
        // Only the Monitoring page draws the live map. Holding Job Order is not
        // a reason to see where every technician is standing.
        ['technician-locations*',        'live-monitor', null],

        // ── Presence pings ───────────────────────────────────────────────────
        // "who else is looking at this record" — no data returned, and every
        // list page that has a detail pane sends them.
        ['*/broadcast-viewing',          null, null],

        // ── Dashboards ───────────────────────────────────────────────────────
        ['dashboard/counts',             'dashboard', 'dashboard'],
        ['monitor/*',                    'live-monitor', 'live-monitor'],

        // ── Reference data ───────────────────────────────────────────────────
        // Read by everyone (form dropdowns, detail panes); written from the
        // Configurations page that owns the list.
        ['locations/{type}/*/related',   null, null],
        ['locations*',                   null, 'location-list'],
        ['location-details*',            null, 'location-list'],
        ['regions*',                     null, 'location-list'],
        ['region_list*',                 null, 'location-list'],
        ['cities*',                      null, 'location-list'],
        ['city_list*',                   null, 'location-list'],
        ['barangays*',                   null, 'location-list'],
        ['barangay_list*',               null, 'location-list'],
        ['villages*',                    null, 'location-list'],
        ['plans*',                       null, 'plan-list'],
        ['promos*',                      null, 'promo-list'],
        ['lcp-nap-locations',            null, 'lcp-nap-location'],
        ['lcpnap*',                      null, ['lcp', 'nap', 'lcp-nap-location']],
        ['lcp*',                         null, 'lcp'],
        ['nap*',                         null, 'nap'],
        ['ports*',                       null, 'ports.manage'],
        ['port*',                        null, 'ports.manage'],
        ['vlans*',                       null, 'vlan-config'],
        ['vlan*',                        null, 'vlan-config'],
        ['usage-types*',                 null, 'usage-type'],
        ['payment-methods*',             null, 'payment-method'],
        ['work-categories*',             null, 'work-category'],
        ['router-models*',               null, 'router-models.manage'],
        ['status-remarks*',              null, 'status-remarks-list.manage'],
        ['concerns*',                    null, 'concern-config'],
        ['sms-templates*',               null, 'sms-template'],
        ['email-templates*',             null, 'email-templates'],
        ['billing-statuses*',            null, 'billing-config'],
        ['custom-account-number*',       null, ['customer.details-edit', 'user-management']],
        ['settings-color-palette*',      null, 'settings'],
        ['settings-image-size*',         null, 'settings'],
        ['settings/*',                   'settings', 'settings'],
        ['system-config/*',              null, 'settings'],
        ['app-version/*',                null, 'settings'],
        ['form-ui/*',                    null, 'settings'],
        ['lookup/*',                     null, null],
        ['google-drive/upload',          null, null],
        ['notifications/*',              null, null],
        ['job-order-notifications*',     null, null],
        ['audit-trail-logs/*',           null, null],
        ['plan-change-logs/*',           null, null],
        ['details-update-logs/*',        null, null],
        ['change-due-logs/*',            null, null],
        ['security-deposits/*',          null, null],

        // ── People ───────────────────────────────────────────────────────────
        // The account list is read wherever a record has to be assigned to
        // somebody — a job order to a technician, a work order to a crew — so
        // the read side names those pages rather than being open to anyone
        // signed in. A customer signing in to pay a bill has no reason to
        // enumerate staff accounts.
        //
        // roles/* stays open to any signed-in user because the client fetches
        // its own role at sign-in to learn what its menu should contain.
        // Every role's app registers its own device for push, so this is
        // "signed in is enough" and has to sit above the users* rule that would
        // otherwise demand a staff page key from a technician or a customer.
        ['users/push-token',             null, null],
        ['users*', [
            'user-management', 'tech-users', 'agent-management', 'team-agent',
            'job-order', 'service-order', 'work-order', 'application-management',
        ], ['user-management', 'tech-users', 'agent-management']],
        ['technicians*', [
            'tech-users', 'user-management',
            'job-order', 'service-order', 'work-order', 'application-management',
        ], 'tech-users'],
        ['agents*', [
            'agent-management', 'team-agent', 'commission', 'agent-payout',
            'job-order', 'work-order', 'application-management',
        ], ['agent-management', 'team-agent']],
        ['roles*',                       null, 'roles'],
        ['groups*',                      null, ['group-management', 'user-management']],
        ['organizations*',               null, 'organization'],
        ['email-queue/send-credentials/*', 'user-management', 'user-management'],

        // ── Applications ─────────────────────────────────────────────────────
        // An agent submits an application from the portal's own form, so the
        // write side accepts the agent key as well as the admin page key.
        ['applications*',                'application-management', ['application-management', 'agent-application']],
        ['application-visits*',          'application-management', 'application-management'],

        // ── Job orders ───────────────────────────────────────────────────────
        ['job-orders/*/approve',         'job-order.approve', 'job-order.approve'],
        ['job-orders/*/create-radius-account', ['job-order.approve', 'radius-config'], ['job-order.approve', 'radius-config']],
        ['job-orders/*/enable-technician', 'job-order.admin-edit', 'job-order.admin-edit'],
        ['job-orders/*/upload-images',   'job-order.attachment', 'job-order.attachment'],
        ['job-orders/by-account/*',      null, 'job-order'],
        ['job-orders/by-item/*',         null, 'job-order'],
        ['job-orders/lookup/*',          'job-order', 'job-order'],
        ['job-orders/validate-sn',       'job-order', 'job-order'],
        ['job-orders*',                  'job-order', ['job-order.tech-edit', 'job-order.admin-edit', 'application-management.move-to-jo']],
        ['job-order-items*',             'job-order', ['job-order.tech-edit', 'job-order.admin-edit']],

        // ── Service orders ───────────────────────────────────────────────────
        // Both spellings of the prefix are registered in routes/api.php.
        ['service-orders/*/enable-technician', 'service-order.admin-edit', 'service-order.admin-edit'],
        ['service_orders/*/enable-technician', 'service-order.admin-edit', 'service-order.admin-edit'],
        ['service-orders/by-account/*',  null, 'service-order'],
        ['service-orders/by-item/*',     null, 'service-order'],
        ['service-orders*',              'service-order', ['service-order.tech-edit', 'service-order.admin-edit', 'customer.so-request']],
        ['service_orders*',              'service-order', ['service-order.tech-edit', 'service-order.admin-edit', 'customer.so-request']],
        ['service-order-items*',         'service-order', ['service-order.tech-edit', 'service-order.admin-edit']],
        ['service_order_items*',         'service-order', ['service-order.tech-edit', 'service-order.admin-edit']],

        // ── Work orders ──────────────────────────────────────────────────────
        // Reading is for anyone who holds the page — an agent sees the jobs
        // they referred. Raising, reassigning or deleting one is not.
        ['work-orders*',                 'work-order', 'work-order.manage'],

        // ── Customers and their billing ──────────────────────────────────────
        // The customer portal reads the same records for the account it belongs
        // to, so the customer keys sit alongside the admin ones. Controllers
        // scope those reads to the signed-in account.
        // The subscriber list and the detail pane behind it. Named page by page
        // rather than left open to any signed-in user: a technician's work is
        // the job order in front of them, not the subscriber book, and an agent
        // sees their own referrals through the Job Order page instead.
        ['customers/*/upload-images',    'customer.attachment', 'customer.attachment'],
        // Staff only. The customer portal never reads this collection — it reads
        // its own record through customer-detail/{accountNo} — so listing the
        // portal's keys here would have handed a signed-in subscriber the whole
        // subscriber book.
        ['customers*', [
            'customer',
            'application-management', 'transaction-list', 'payment-portal',
            'soa', 'invoice', 'overdue', 'dc-notice', 'so-charge',
            'mass-rebate', 'discounts', 'staggered-payment',
        ], ['customer.details-edit', 'application-management']],
        // Also opened from a service order's detail pane, which is a
        // technician's screen.
        ['customer-detail/*', [
            'customer', 'customer-dashboard', 'customer-bills',
            'service-order', 'application-management', 'transaction-list',
            'payment-portal', 'soa', 'invoice', 'overdue', 'dc-notice',
            'so-charge', 'mass-rebate', 'discounts', 'staggered-payment',
        // Editing is the Customer page's own key alone. Job Order's admin-edit
        // is a different job: holding it should not carry the right to rewrite
        // a subscriber's record.
        ], 'customer.details-edit'],
        ['billing-generation/invoices',  ['invoice', 'soa', 'customer', 'customer-bills', 'customer-dashboard'], 'billing-config'],
        ['billing-generation/statements', ['invoice', 'soa', 'customer', 'customer-bills', 'customer-dashboard'], 'billing-config'],
        ['billing-generation/*',         ['customer', 'billing-config'], ['customer', 'billing-config']],
        ['billing-notifications/*',      ['customer', 'billing-config'], ['customer', 'billing-config']],
        ['billing-config*',              'billing-config', 'billing-config'],
        ['billing-details*',             ['customer', 'customer-bills', 'customer-dashboard'], 'customer.details-edit'],
        ['billing_details*',             ['customer', 'customer-bills', 'customer-dashboard'], 'customer.details-edit'],
        ['billing*',                     ['customer', 'soa', 'invoice', 'overdue', 'customer-bills', 'customer-dashboard'], ['customer.transact', 'billing-config']],
        ['cron-test/*',                  ['customer', 'settings'], ['customer', 'settings']],

        ['transactions/batch-approve',   'transaction-list.batch-approve', 'transaction-list.batch-approve'],
        ['transactions/*/approve',       'transaction-list.approve', 'transaction-list.approve'],
        ['transactions/*/revert',        'transaction-list.revert-request', 'transaction-list.revert-request'],
        ['transactions/*/status',        'transaction-list', 'transaction-list.approve'],
        ['transactions/upload-images',   'customer.transact', 'customer.transact'],
        ['transactions/by-account/*',    ['transaction-list', 'customer', 'customer-bills', 'customer-dashboard'], 'customer.transact'],
        // Staff only, for the same reason as the subscriber collection: the
        // portal reads transactions/by-account/{accountNo}, which is the rule
        // directly above and does carry the portal's keys.
        ['transactions*',                ['transaction-list', 'customer'], 'customer.transact'],
        ['transaction-reverts/*/status', 'transactions-revert', 'transactions-revert'],
        ['transaction-reverts*',         'transactions-revert', ['transactions-revert', 'transaction-list.revert-request']],

        ['statement-of-accounts*',       ['soa', 'customer', 'customer-bills', 'customer-dashboard'], 'soa'],
        ['soa-records',                  ['soa', 'customer', 'customer-bills', 'customer-dashboard'], ['soa', 'soa-generation.manage']],
        ['soa/*',                        ['soa', 'customer', 'customer-bills', 'customer-dashboard'], 'soa'],
        ['invoice-records',              ['invoice', 'customer', 'customer-bills', 'customer-dashboard'], 'invoice'],
        ['invoices/*',                   ['invoice', 'customer', 'customer-bills', 'customer-dashboard'], 'invoice'],
        ['overdues*',                    ['overdue', 'customer', 'customer-bills', 'customer-dashboard'], 'overdue'],
        ['dc-notices*',                  'dc-notice', 'dc-notice'],
        ['service-charges*',             ['so-charge', 'customer'], 'so-charge'],
        ['service-charge-logs/*',        ['so-charge', 'customer'], 'so-charge'],
        ['discounts*',                   'discounts', 'discounts.add'],
        ['mass-rebates*',                'mass-rebate', 'mass-rebate.add'],
        ['rebates*',                     ['mass-rebate', 'customer'], 'mass-rebate.add'],
        ['staggered-installations*',     'staggered-payment', 'staggered-payment.add'],
        ['installment-schedules*',       ['staggered-payment', 'customer', 'customer-bills'], 'staggered-payment.add'],
        ['installments*',                ['staggered-payment', 'customer', 'customer-bills'], 'staggered-payment.add'],
        ['advanced-payments*',           ['customer', 'payment-portal', 'customer-bills', 'customer-dashboard'], ['customer.transact', 'payment-portal']],
        ['payment-portal-logs*',         ['payment-portal', 'customer', 'customer-bills', 'customer-dashboard'], 'payment-portal'],
        // A customer pays their own bill from the portal; an administrator
        // takes a payment from the Payment Portal page. Both are signed in.
        ['payments/*',                   null, null],

        // ── Network operations ───────────────────────────────────────────────
        ['smart-olt/validate-sn',        null, null],
        ['smart-olt*',                   ['smart-olt', 'job-order'], ['smart-olt', 'job-order.admin-edit', 'job-order.approve']],
        ['radius-config*',               'radius-config', 'radius-config'],
        ['radius/*',                     ['radius-config', 'job-order', 'customer'], ['radius-config', 'customer.details-edit', 'job-order.admin-edit', 'job-order.approve']],
        ['pppoe/*',                      'pppoe-setup', 'pppoe-setup'],

        // ── Inventory ────────────────────────────────────────────────────────
        // Items are read from the job/service/work order forms that consume
        // them; only the Inventory pages may change stock.
        ['inventory-categories*',        ['inventory', 'inventory-category-list'], 'inventory-category-list'],
        ['inventory-logs*',              'inventory', 'inventory'],
        ['inventory-items*',             ['inventory', 'job-order', 'service-order', 'work-order'], 'inventory'],
        ['inventory*',                   ['inventory', 'job-order', 'service-order', 'work-order'], 'inventory'],
        ['borrowed-logs/*',              'inventory', 'inventory'],
        ['defective-logs/*',             'inventory', 'inventory'],

        // ── Agents ───────────────────────────────────────────────────────────
        // An agent reads their own history and invoices; issuing and settling
        // them is an administrator's job.
        ['agent-invoices/generate',      'agent-invoices.generate', 'agent-invoices.generate'],
        ['agent-invoices/*/status',      'agent-invoices.status', 'agent-invoices.status'],
        ['agent-invoices*',              'agent-invoices', 'agent-invoices.generate'],
        ['commissions/*/approve',        'agent-payout.approve', 'agent-payout.approve'],
        ['commissions/*/reject',         'agent-payout.approve', 'agent-payout.approve'],
        ['commissions*',                 'commission', 'commission.payout'],

        // ── Messaging ────────────────────────────────────────────────────────
        ['sms-blast*',                   'sms-blast', 'sms-blast'],
        ['sms/blast',                    'sms-blast', 'sms-blast'],
        ['sms/logs',                     'sms-logs', 'sms-logs'],
        ['sms/send',                     'sms-blast', 'sms-blast'],
        ['sms/test',                     'sms-config', 'sms-config'],
        ['sms-config*',                  'sms-config', 'sms-config'],
        ['email-queue*',                 'email-logs', 'email-logs'],

        // ── Reports and logs ─────────────────────────────────────────────────
        ['reports/settings',             'reports', 'reports.manage'],
        ['reports*',                     'reports', 'reports.manage', ['DELETE' => 'reports.delete']],
        ['data-logs',                    'data-logs', 'data-logs'],
        ['disconnected-logs*',           'disconnected-logs', 'disconnected-logs'],
        ['disconnection-logs',           'disconnected-logs', 'disconnected-logs'],
        ['reconnection-logs*',           'reconnection-logs', 'reconnection-logs'],
        ['expenses-logs',                'expenses-log', 'expenses-log'],
        ['file-logs/*',                  ['smart-olt-logs', 'radius-logs', 'system-logs'], 'system-logs'],
        ['logs*',                        'system-logs', 'system-logs'],
    ];

    /**
     * The requirement for a request.
     *
     * @return string|string[]|null  PUBLIC_ACCESS, a key, a list of keys, or
     *                               null for "any signed-in user".
     */
    public static function requirementFor(string $method, string $path): string|array|null
    {
        $path = self::normalize($path);
        $method = strtoupper($method);
        $isRead = in_array($method, ['GET', 'HEAD', 'OPTIONS'], true);

        foreach (self::RULES as $rule) {
            [$pattern, $read, $write] = $rule;

            if (!Str::is($pattern, $path)) {
                continue;
            }

            // A per-method override outranks both, so DELETE can be stricter
            // than the PUT beside it.
            $perMethod = $rule[3] ?? [];

            if (array_key_exists($method, $perMethod)) {
                return $perMethod[$method];
            }

            return $isRead ? $read : $write;
        }

        return self::DEFAULT_REQUIREMENT;
    }

    /** Is there an explicit rule for this path, or did it fall through? */
    public static function hasRule(string $path): bool
    {
        $path = self::normalize($path);

        foreach (self::RULES as $rule) {
            if (Str::is($rule[0], $path)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Strip the `api/` prefix and any surrounding slashes.
     *
     * Route parameters are left as they are — `Str::is` treats `{id}` as
     * literal text, and every rule that needs to match past a parameter uses a
     * `*` at that position.
     */
    private static function normalize(string $path): string
    {
        $path = trim($path, '/');

        if (str_starts_with($path, 'api/')) {
            $path = substr($path, 4);
        }

        return $path === '' ? '/' : $path;
    }
}

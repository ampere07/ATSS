<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureDatabaseTables;
use App\Models\Role;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Role Management over real HTTP: RoleController behind ApiAccessControl, and
 * the role checks UserController makes when an account is put on a role.
 *
 * Runs against an in-memory SQLite database holding only the tables these
 * paths touch, built afresh for every test. Nothing reaches the application's
 * own database.
 */
class RoleManagementTest extends TestCase
{
    private int $nextUserId = 100;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.connections.role_management_test' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => false,
            ],
            'database.default' => 'role_management_test',
        ]);
        DB::purge('role_management_test');

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->string('role_name')->unique();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('base_role_id')->nullable();
            $table->longText('permissions')->nullable();
            $table->unsignedTinyInteger('permissions_version')->default(0);
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            $table->unsignedBigInteger('updated_by_user_id')->nullable();
            $table->timestamps();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('salutation')->nullable();
            $table->string('username')->unique();
            $table->string('password_hash')->nullable();
            $table->string('email_address')->unique();
            $table->string('first_name')->nullable();
            $table->string('middle_initial')->nullable();
            $table->string('last_name')->nullable();
            $table->string('contact_number')->nullable();
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->unsignedBigInteger('role_id')->nullable();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->unsignedBigInteger('group_id')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->string('level')->nullable();
            $table->string('action')->nullable();
            $table->text('message')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('target_user_id')->nullable();
            $table->string('resource_type')->nullable();
            $table->unsignedBigInteger('resource_id')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->text('additional_data')->nullable();
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->timestamps();
        });

        // Read by UserController when it saves an account and records the
        // change; empty is fine, they only have to exist.
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('organization_name')->nullable();
            $table->timestamps();
        });

        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->string('team_name')->nullable();
            $table->timestamps();
        });

        Schema::create('agent_balance', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->decimal('commission', 12, 2)->nullable();
            $table->decimal('quota', 12, 2)->nullable();
            $table->decimal('incentives_value', 12, 2)->nullable();
            $table->decimal('balance', 12, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('audit_trail_logs', function (Blueprint $table) {
            $table->id();
            $table->text('old_details')->nullable();
            $table->text('new_details')->nullable();
            $table->string('created_by_user')->nullable();
            $table->string('updated_by_user')->nullable();
            $table->timestamps();
        });

        foreach (Role::LOCKED_ROLE_NAMES as $id => $name) {
            DB::table('roles')->insert(['id' => $id, 'role_name' => $name]);
        }

        // It would create the whole production schema on finding tables missing.
        $this->withoutMiddleware(EnsureDatabaseTables::class);
    }

    // ── Fixtures ─────────────────────────────────────────────────────────────

    private function customRole(array $attributes = []): Role
    {
        static $sequence = 0;
        $sequence++;

        return Role::create($attributes + [
            'role_name' => "Custom $sequence",
            'permissions' => [],
            'permissions_version' => Permissions::CURRENT_VERSION,
        ]);
    }

    private function userOn(int $roleId, ?int $organizationId = null): User
    {
        $id = $this->nextUserId++;

        $user = new User();
        $user->forceFill([
            'id' => $id,
            'username' => "user$id",
            'email_address' => "user$id@example.test",
            'first_name' => 'Test',
            'last_name' => "User $id",
            'role_id' => $roleId,
            'organization_id' => $organizationId,
        ])->save();

        return $user;
    }

    /** A custom role holding the given keys, and a user on it, signed in. */
    private function signInWith(array $keys, ?int $organizationId = null): User
    {
        $role = $this->customRole(['permissions' => $keys, 'organization_id' => $organizationId]);
        $user = $this->userOn($role->id, $organizationId);

        $this->actingAs($user, 'sanctum');

        return $user;
    }

    private function signInAsSuperAdmin(?int $organizationId = null): User
    {
        $user = $this->userOn(Role::SUPER_ADMIN, $organizationId);
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    // ── Reading ──────────────────────────────────────────────────────────────

    /**
     * Reading a role must not list who holds it. This used to return every
     * member's name, email and phone, to any signed-in account.
     */
    public function test_reading_a_role_counts_its_members_rather_than_listing_them(): void
    {
        $this->userOn(Role::ADMINISTRATOR);
        $this->userOn(Role::ADMINISTRATOR);

        $this->signInWith(['user-management']);

        $response = $this->getJson('/api/roles/' . Role::ADMINISTRATOR)->assertOk();

        $this->assertArrayNotHasKey('users', $response->json('data'));
        $this->assertSame(2, $response->json('data.users_count'));
    }

    /** Only the pages that manage roles or assign them read the list. */
    public function test_roles_are_read_only_by_the_pages_that_use_them(): void
    {
        $this->actingAs($this->userOn(Role::CUSTOMER), 'sanctum');
        $this->getJson('/api/roles')->assertForbidden();
        $this->getJson('/api/roles/' . Role::ADMINISTRATOR)->assertForbidden();

        $this->actingAs($this->userOn(Role::TECHNICIAN), 'sanctum');
        $this->getJson('/api/roles')->assertForbidden();

        // Administrators create Agents from Agent Management, which picks a role.
        $this->actingAs($this->userOn(Role::ADMINISTRATOR), 'sanctum');
        $this->getJson('/api/roles')->assertOk();

        foreach (['roles', 'user-management', 'agent-management', 'team-agent', 'tech-users'] as $key) {
            $this->signInWith([$key]);
            $this->getJson('/api/roles')->assertOk();
        }
    }

    public function test_a_missing_or_malformed_role_is_not_found(): void
    {
        $this->signInAsSuperAdmin();

        $this->getJson('/api/roles/9999')->assertNotFound();
        $this->putJson('/api/roles/9999', ['role_name' => 'X'])->assertNotFound();
        $this->deleteJson('/api/roles/9999')->assertNotFound();
        $this->getJson('/api/roles/abc')->assertNotFound();
    }

    /** The modal is seeded from this, so it must show what the role really grants. */
    public function test_effective_permissions_include_grandfathered_buttons_and_implied_pages(): void
    {
        $this->signInAsSuperAdmin();

        $legacy = $this->customRole(['permissions' => ['plan-list'], 'permissions_version' => 0]);
        $actionOnly = $this->customRole(['permissions' => ['customer.transact']]);

        $legacyKeys = $this->getJson("/api/roles/{$legacy->id}")->json('data.effective_permissions');
        $this->assertContains('plan-list.create', $legacyKeys);
        $this->assertContains('plan-list.delete', $legacyKeys);

        $actionKeys = $this->getJson("/api/roles/{$actionOnly->id}")->json('data.effective_permissions');
        $this->assertContains('customer', $actionKeys);
    }

    // ── Creating ─────────────────────────────────────────────────────────────

    /** Organization and authorship are the server's to say, not the request's. */
    public function test_create_ignores_organization_and_author_sent_by_the_caller(): void
    {
        $actor = $this->signInAsSuperAdmin(5);

        $this->postJson('/api/roles', [
            'role_name' => 'Cashier',
            'permissions' => ['transaction-list'],
            'organization_id' => 99,
            'created_by_user_id' => 4242,
            'permissions_version' => 0,
        ])->assertCreated();

        $role = Role::where('role_name', 'Cashier')->firstOrFail();

        $this->assertSame(5, (int) $role->organization_id);
        $this->assertSame($actor->id, (int) $role->created_by_user_id);
        $this->assertSame(Permissions::CURRENT_VERSION, $role->permissions_version);
    }

    /** A hybrid stores its extras only, and every action brings its page. */
    public function test_create_stores_only_the_extras_of_a_hybrid(): void
    {
        $this->signInAsSuperAdmin();

        $response = $this->postJson('/api/roles', [
            'role_name' => 'Tech plus billing',
            'base_role_id' => Role::TECHNICIAN,
            'permissions' => ['job-order', 'service-order.tech-edit', 'customer.transact', 'inventory', 'inventory'],
        ])->assertCreated();

        $stored = Role::findOrFail($response->json('data.id'))->permissions;
        sort($stored);

        $this->assertSame(['customer', 'customer.transact', 'inventory'], $stored);
        $this->assertNotNull($response->json('data.effective_permissions'));
    }

    public function test_create_refuses_a_role_that_grants_nothing(): void
    {
        $this->signInAsSuperAdmin();

        $this->postJson('/api/roles', ['role_name' => 'Empty', 'permissions' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors('permissions');

        $this->assertFalse(Role::where('role_name', 'Empty')->exists());
    }

    /** Counting what the base brings: a Head Tech already holds admin-edit. */
    public function test_create_refuses_both_halves_of_an_exclusive_pair(): void
    {
        $this->signInAsSuperAdmin();

        $this->postJson('/api/roles', [
            'role_name' => 'Confused',
            'base_role_id' => Role::HEAD_TECH,
            'permissions' => ['job-order.tech-edit'],
        ])->assertStatus(422)->assertJsonValidationErrors('permissions');

        $this->postJson('/api/roles', [
            'role_name' => 'Also confused',
            'permissions' => ['service-order.tech-edit', 'service-order.admin-edit'],
        ])->assertStatus(422)->assertJsonValidationErrors('permissions');
    }

    public function test_create_validates_name_keys_and_base(): void
    {
        $this->signInAsSuperAdmin();

        $this->postJson('/api/roles', ['permissions' => ['inventory']])
            ->assertStatus(422)->assertJsonValidationErrors('role_name');

        $this->postJson('/api/roles', ['role_name' => 'Technician', 'permissions' => ['inventory']])
            ->assertStatus(422)->assertJsonValidationErrors('role_name');

        $this->postJson('/api/roles', ['role_name' => 'Typo', 'permissions' => ['inventroy']])
            ->assertStatus(422)->assertJsonValidationErrors('permissions.0');

        $custom = $this->customRole(['permissions' => ['inventory']]);
        $this->postJson('/api/roles', ['role_name' => 'Chained', 'base_role_id' => $custom->id])
            ->assertStatus(422)->assertJsonValidationErrors('base_role_id');
    }

    // ── Who may do what ──────────────────────────────────────────────────────

    /** The middleware's own refusal, as opposed to one of the controller's. */
    private const MIDDLEWARE_REFUSAL = 'You do not have permission to perform this action.';
    private const SUPER_ADMIN_ROLE_REFUSAL = 'Only a SuperAdmin can create, change or delete a role built on SuperAdmin.';

    public function test_role_writes_need_their_own_keys(): void
    {
        $role = $this->customRole(['permissions' => ['inventory']]);

        $this->signInWith(['roles']);

        $this->postJson('/api/roles', ['role_name' => 'X', 'permissions' => ['inventory']])
            ->assertForbidden()->assertJsonPath('message', self::MIDDLEWARE_REFUSAL);
        $this->putJson("/api/roles/{$role->id}", ['role_name' => 'Y'])
            ->assertForbidden()->assertJsonPath('message', self::MIDDLEWARE_REFUSAL);
        $this->deleteJson("/api/roles/{$role->id}")
            ->assertForbidden()->assertJsonPath('message', self::MIDDLEWARE_REFUSAL);
    }

    /**
     * A role manager hands out only what they hold. Without this, `roles.edit`
     * was a route to every key in the system — tick them onto your own role.
     */
    public function test_a_role_manager_cannot_grant_what_they_do_not_hold(): void
    {
        $manager = $this->signInWith(['roles', 'roles.create', 'roles.edit', 'inventory']);

        $this->putJson("/api/roles/{$manager->role_id}", [
            'permissions' => ['roles', 'roles.create', 'roles.edit', 'inventory', 'settings', 'user-management.edit'],
        ])
            ->assertForbidden()
            ->assertJsonPath('not_held', ['settings', 'user-management.edit', 'user-management']);
        $this->assertFalse(Permissions::allows($manager->fresh(), 'settings'));

        $this->postJson('/api/roles', ['role_name' => 'Back door', 'permissions' => ['inventory', 'settings']])
            ->assertForbidden();
        $this->assertFalse(Role::where('role_name', 'Back door')->exists());

        // A base role counts as the keys it brings.
        $this->postJson('/api/roles', ['role_name' => 'Admin copy', 'base_role_id' => Role::ADMINISTRATOR])
            ->assertForbidden();

        // What they do hold, they may hand out.
        $this->postJson('/api/roles', ['role_name' => 'Stock clerk', 'permissions' => ['inventory']])
            ->assertCreated();
    }

    /**
     * Only what a save adds is checked. A role already holding keys its
     * editor lacks can still be renamed, trimmed, or given keys they do hold.
     */
    public function test_a_role_manager_may_still_edit_a_role_wider_than_their_own(): void
    {
        $wide = $this->customRole(['permissions' => ['settings', 'customer', 'customer.transact']]);
        $this->signInWith(['roles', 'roles.edit', 'inventory']);

        $this->putJson("/api/roles/{$wide->id}", ['role_name' => 'Wide, renamed'])->assertOk();

        $this->putJson("/api/roles/{$wide->id}", ['permissions' => ['settings', 'customer', 'inventory']])
            ->assertOk();
        $this->assertEqualsCanonicalizing(['settings', 'customer', 'inventory'], $wide->fresh()->permissions);

        // Having dropped Transact, they cannot put it back: it is no longer the role's.
        $this->putJson("/api/roles/{$wide->id}", ['permissions' => ['settings', 'customer', 'customer.transact']])
            ->assertForbidden();
    }

    /** SuperAdmin reach is only handed out by somebody who already has it. */
    public function test_only_a_super_admin_may_build_a_role_on_super_admin(): void
    {
        $this->signInWith(['roles', 'roles.create']);

        $this->postJson('/api/roles', ['role_name' => 'Shadow admin', 'base_role_id' => Role::SUPER_ADMIN])
            ->assertForbidden()->assertJsonPath('message', self::SUPER_ADMIN_ROLE_REFUSAL);

        $this->signInAsSuperAdmin();

        $this->postJson('/api/roles', ['role_name' => 'Deputy', 'base_role_id' => Role::SUPER_ADMIN])
            ->assertCreated();
        $this->assertSame([], Role::where('role_name', 'Deputy')->firstOrFail()->permissions);
    }

    /** The escalation this closes: putting a SuperAdmin base on your own role. */
    public function test_a_role_manager_cannot_raise_their_own_role_to_super_admin(): void
    {
        $manager = $this->signInWith(['roles', 'roles.edit']);

        $this->putJson("/api/roles/{$manager->role_id}", ['base_role_id' => Role::SUPER_ADMIN])
            ->assertForbidden();

        $this->assertNull(Role::findOrFail($manager->role_id)->base_role_id);
        $this->assertFalse(Permissions::holdsEverything($manager->fresh()));
    }

    public function test_a_role_built_on_super_admin_is_out_of_reach_of_lesser_roles(): void
    {
        $deputy = $this->customRole(['base_role_id' => Role::SUPER_ADMIN]);

        $this->signInWith(['roles', 'roles.edit', 'roles.delete']);

        $this->putJson("/api/roles/{$deputy->id}", ['role_name' => 'Renamed'])->assertForbidden();
        $this->deleteJson("/api/roles/{$deputy->id}")->assertForbidden();
        $this->assertTrue(Role::whereKey($deputy->id)->exists());
    }

    public function test_system_roles_cannot_be_edited_or_deleted(): void
    {
        $this->signInAsSuperAdmin();

        $this->putJson('/api/roles/' . Role::TECHNICIAN, ['role_name' => 'Tech'])->assertForbidden();
        $this->deleteJson('/api/roles/' . Role::TECHNICIAN)->assertForbidden();
    }

    /** A caller in an organization sees the seeded roles and its own, only. */
    public function test_another_organizations_role_is_out_of_bounds(): void
    {
        $theirs = $this->customRole(['organization_id' => 6, 'permissions' => ['inventory']]);
        $ours = $this->customRole(['organization_id' => 5, 'permissions' => ['inventory']]);

        $this->signInWith(['roles', 'roles.edit', 'roles.delete'], 5);

        $listed = collect($this->getJson('/api/roles')->assertOk()->json('data'))->pluck('id');
        $this->assertTrue($listed->contains($ours->id));
        $this->assertFalse($listed->contains($theirs->id));
        $this->assertTrue($listed->contains(Role::TECHNICIAN));

        $this->getJson("/api/roles/{$theirs->id}")->assertNotFound();
        $this->putJson("/api/roles/{$theirs->id}", ['role_name' => 'Taken over'])->assertNotFound();
        $this->deleteJson("/api/roles/{$theirs->id}")->assertNotFound();

        $this->putJson("/api/roles/{$ours->id}", ['role_name' => 'Ours, renamed'])->assertOk();
    }

    // ── Updating ─────────────────────────────────────────────────────────────

    /**
     * A rename never showed anybody the checkboxes, so it must not stamp the
     * list as chosen — that would revoke an older role's Add/Edit/Delete.
     */
    public function test_a_rename_alone_keeps_grandfathered_buttons(): void
    {
        $legacy = $this->customRole(['permissions' => ['plan-list'], 'permissions_version' => 0]);

        $this->signInAsSuperAdmin();

        $this->putJson("/api/roles/{$legacy->id}", ['role_name' => 'Plans (legacy)'])->assertOk();

        $legacy->refresh();
        $this->assertSame(0, $legacy->permissions_version);
        $this->assertContains('plan-list.edit', Permissions::roleKeys($legacy));
    }

    /** Saving the list through the modal is what makes it authoritative. */
    public function test_saving_the_list_stamps_the_current_version(): void
    {
        $legacy = $this->customRole(['permissions' => ['plan-list'], 'permissions_version' => 0]);

        $this->signInAsSuperAdmin();

        $response = $this->putJson("/api/roles/{$legacy->id}", ['permissions' => ['plan-list', 'plan-list.create']])
            ->assertOk();

        $legacy->refresh();
        $this->assertSame(Permissions::CURRENT_VERSION, $legacy->permissions_version);
        $this->assertNotContains('plan-list.delete', Permissions::roleKeys($legacy));
        $this->assertContains('plan-list.create', $response->json('data.effective_permissions'));
    }

    public function test_update_cannot_spoof_authorship_or_organization(): void
    {
        $role = $this->customRole(['permissions' => ['inventory'], 'organization_id' => 5]);
        $actor = $this->signInAsSuperAdmin(5);

        $this->putJson("/api/roles/{$role->id}", [
            'description' => 'Stock room',
            'organization_id' => 6,
            'updated_by_user_id' => 4242,
            'created_by_user_id' => 4242,
        ])->assertOk();

        $role->refresh();
        $this->assertSame(5, (int) $role->organization_id);
        $this->assertSame($actor->id, (int) $role->updated_by_user_id);
        $this->assertNull($role->created_by_user_id);
        $this->assertSame('Stock room', $role->description);
    }

    public function test_an_emptied_name_is_a_validation_error(): void
    {
        $role = $this->customRole(['permissions' => ['inventory']]);
        $this->signInAsSuperAdmin();

        $this->putJson("/api/roles/{$role->id}", ['role_name' => ''])
            ->assertStatus(422)->assertJsonValidationErrors('role_name');
    }

    /** Switching base is checked against the extras already stored. */
    public function test_switching_base_alone_is_checked_against_stored_extras(): void
    {
        $role = $this->customRole(['permissions' => ['job-order', 'job-order.tech-edit']]);
        $this->signInAsSuperAdmin();

        $this->putJson("/api/roles/{$role->id}", ['base_role_id' => Role::ADMINISTRATOR])
            ->assertStatus(422)->assertJsonValidationErrors('permissions');
    }

    // ── Deleting ─────────────────────────────────────────────────────────────

    public function test_a_role_still_held_cannot_be_deleted(): void
    {
        $role = $this->customRole(['permissions' => ['inventory']]);
        $this->userOn($role->id);

        $this->signInAsSuperAdmin();

        $this->deleteJson("/api/roles/{$role->id}")
            ->assertStatus(400)
            ->assertJsonPath('success', false);
        $this->assertTrue(Role::whereKey($role->id)->exists());
    }

    public function test_an_unused_role_is_deleted_and_logged(): void
    {
        $role = $this->customRole(['permissions' => ['inventory']]);
        $this->signInAsSuperAdmin();

        $this->deleteJson("/api/roles/{$role->id}")->assertOk();

        $this->assertFalse(Role::whereKey($role->id)->exists());
        $this->assertTrue(DB::table('activity_logs')->where('action', 'delete_role')->where('resource_id', $role->id)->exists());
    }

    // ── Putting accounts on roles ────────────────────────────────────────────

    public function test_only_a_super_admin_may_assign_a_super_admin_role(): void
    {
        $deputy = $this->customRole(['base_role_id' => Role::SUPER_ADMIN]);
        $target = $this->userOn(Role::TECHNICIAN);

        $manager = $this->signInWith(['user-management', 'user-management.create', 'user-management.edit']);

        $newAccount = [
            'first_name' => 'New',
            'last_name' => 'Admin',
            'username' => 'newadmin',
            'email_address' => 'newadmin@example.test',
            'password' => 'secret-password',
        ];

        $this->postJson('/api/users', $newAccount + ['role_id' => Role::SUPER_ADMIN])->assertForbidden();
        $this->postJson('/api/users', $newAccount + ['role_id' => $deputy->id])->assertForbidden();
        $this->putJson("/api/users/{$target->id}", ['role_id' => Role::SUPER_ADMIN])->assertForbidden();
        $this->putJson("/api/users/{$manager->id}", ['role_id' => Role::SUPER_ADMIN])->assertForbidden();
        $this->postJson("/api/users/{$manager->id}/roles", ['role_id' => Role::SUPER_ADMIN])->assertForbidden();

        $this->assertSame(Role::TECHNICIAN, (int) $target->fresh()->role_id);
        $this->assertFalse(Permissions::holdsEverything($manager->fresh()));
    }

    /** Resetting a SuperAdmin's password is taking over their account. */
    public function test_a_super_admin_account_is_out_of_reach_of_lesser_roles(): void
    {
        $superAdmin = $this->userOn(Role::SUPER_ADMIN);

        $this->signInWith(['user-management', 'user-management.edit', 'user-management.delete']);

        $this->putJson("/api/users/{$superAdmin->id}", ['password' => 'taken-over-now'])->assertForbidden();
        $this->deleteJson("/api/users/{$superAdmin->id}")->assertForbidden();
        $this->assertTrue(User::whereKey($superAdmin->id)->exists());
    }

    public function test_a_role_from_another_organization_cannot_be_assigned(): void
    {
        $theirs = $this->customRole(['organization_id' => 6, 'permissions' => ['inventory']]);
        $target = $this->userOn(Role::TECHNICIAN, 5);

        $this->signInWith(['user-management', 'user-management.edit'], 5);

        $this->putJson("/api/users/{$target->id}", ['role_id' => $theirs->id])->assertForbidden();
        $this->assertSame(Role::TECHNICIAN, (int) $target->fresh()->role_id);
    }

    public function test_the_role_endpoints_on_an_account_need_the_edit_key(): void
    {
        $target = $this->userOn(Role::TECHNICIAN);

        $this->signInWith(['user-management', 'user-management.create', 'user-management.delete']);

        $this->postJson("/api/users/{$target->id}/roles", ['role_id' => Role::OSP])->assertForbidden();
        $this->deleteJson("/api/users/{$target->id}/roles")->assertForbidden();
    }

    // ── Whole flows ──────────────────────────────────────────────────────────

    /**
     * Somebody who manages roles without being a SuperAdmin can still do the
     * whole job for ordinary roles: create a hybrid, rework it, delete it.
     */
    public function test_a_role_manager_runs_the_whole_lifecycle_of_an_ordinary_role(): void
    {
        // A field supervisor who also manages roles: they may hand out what
        // they hold — the Technician and OSP keys, Inventory, Approve.
        $this->signInWith(array_merge(
            Permissions::ROLE_PERMISSIONS[Role::TECHNICIAN],
            Permissions::ROLE_PERMISSIONS[Role::OSP],
            ['inventory', 'roles', 'roles.create', 'roles.edit', 'roles.delete']
        ));

        $created = $this->postJson('/api/roles', [
            'role_name' => 'Field tech plus stock',
            'description' => 'Installs, and signs out modems',
            'base_role_id' => Role::TECHNICIAN,
            'permissions' => ['inventory'],
        ])->assertCreated();

        $id = $created->json('data.id');
        $this->assertSame(Role::TECHNICIAN, $created->json('data.base_role_id'));
        $this->assertSame(['inventory'], $created->json('data.effective_permissions'));
        $this->assertSame(0, $created->json('data.users_count'));

        $listed = collect($this->getJson('/api/roles')->assertOk()->json('data'))->firstWhere('id', $id);
        $this->assertSame(['inventory'], $listed['effective_permissions']);

        // Rebased onto OSP, which does not hold Job Order: the page comes back
        // as an extra alongside the action ticked on it.
        $this->putJson("/api/roles/$id", [
            'role_name' => 'Plant crew plus stock',
            'base_role_id' => Role::OSP,
            'permissions' => ['inventory', 'job-order.tech-edit'],
        ])->assertOk()->assertJsonPath('data.base_role_id', Role::OSP);

        $stored = Role::findOrFail($id)->permissions;
        sort($stored);
        $this->assertSame(['inventory', 'job-order', 'job-order.tech-edit'], $stored);

        // Back to a standalone role: it keeps exactly what was ticked.
        $this->putJson("/api/roles/$id", ['base_role_id' => null, 'permissions' => ['inventory']])
            ->assertOk()->assertJsonPath('data.base_role_id', null);
        $this->assertSame(['inventory'], Permissions::roleKeys(Role::findOrFail($id)));

        $this->deleteJson("/api/roles/$id")->assertOk();
        $this->assertFalse(Role::whereKey($id)->exists());
    }

    /** What an account on a hybrid is actually told it holds, and where it lands. */
    public function test_a_user_on_a_hybrid_gets_its_base_plus_its_extras(): void
    {
        $this->signInAsSuperAdmin();

        $roleId = $this->postJson('/api/roles', [
            'role_name' => 'Tech with billing',
            'base_role_id' => Role::TECHNICIAN,
            'permissions' => ['customer.transact'],
        ])->assertCreated()->json('data.id');

        $this->actingAs($this->userOn($roleId), 'sanctum');

        $me = $this->getJson('/api/me/permissions')->assertOk();
        $keys = $me->json('data.permissions');

        $this->assertContains('job-order', $keys, 'Inherited page missing.');
        $this->assertContains('job-order.tech-edit', $keys, 'Inherited action missing.');
        $this->assertContains('customer.transact', $keys, 'Extra action missing.');
        $this->assertContains('customer', $keys, 'The page behind the extra action is missing.');
        $this->assertNotContains('transaction-list', $keys);
        $this->assertSame('job-order', $me->json('data.home'));
        $this->assertSame($roleId, $me->json('data.role_id'));

        // And the API holds it to exactly that.
        $this->getJson('/api/roles')->assertForbidden();
        $this->postJson('/api/roles', ['role_name' => 'X', 'permissions' => ['inventory']])->assertForbidden();
        $this->getJson('/api/logs')->assertForbidden();
        $this->postJson('/api/transactions/batch-approve')->assertForbidden();
    }

    /** A page key opens the page; each button is its own key, checked by the API. */
    public function test_button_keys_gate_their_endpoints(): void
    {
        $this->signInWith(['plan-list']);

        $this->postJson('/api/plans', [])->assertForbidden()->assertJsonPath('message', self::MIDDLEWARE_REFUSAL);
        $this->putJson('/api/plans/1', [])->assertForbidden()->assertJsonPath('message', self::MIDDLEWARE_REFUSAL);
        $this->deleteJson('/api/plans/1')->assertForbidden()->assertJsonPath('message', self::MIDDLEWARE_REFUSAL);

        $this->signInWith(['plan-list', 'plan-list.create']);

        // Past the gate: whatever the plans controller then answers (this
        // fixture has no plans table), it is not the middleware refusing.
        $created = $this->postJson('/api/plans', []);
        $this->assertNotContains($created->status(), [401, 403], 'Holding plan-list.create was refused.');
        $this->assertNotSame(self::MIDDLEWARE_REFUSAL, $created->json('message'));
        $this->deleteJson('/api/plans/1')->assertForbidden()->assertJsonPath('message', self::MIDDLEWARE_REFUSAL);
    }

    /** A hybrid on SuperAdmin is a SuperAdmin for every check made here. */
    public function test_a_hybrid_on_super_admin_holds_everything(): void
    {
        $deputyRole = $this->customRole(['base_role_id' => Role::SUPER_ADMIN]);
        $this->actingAs($this->userOn($deputyRole->id), 'sanctum');

        $this->assertSame(['*'], $this->getJson('/api/me/permissions')->json('data.permissions'));
        $this->postJson('/api/roles', ['role_name' => 'Another deputy', 'base_role_id' => Role::SUPER_ADMIN])
            ->assertCreated();
    }

    /** The new endpoints work end to end, not just refuse. */
    public function test_an_account_is_moved_onto_and_off_a_role(): void
    {
        $target = $this->userOn(Role::TECHNICIAN);
        $this->signInAsSuperAdmin();

        $this->postJson("/api/users/{$target->id}/roles", ['role_id' => Role::OSP])
            ->assertOk()->assertJsonPath('success', true);
        $this->assertSame(Role::OSP, (int) $target->fresh()->role_id);

        $this->deleteJson("/api/users/{$target->id}/roles?role_id=" . Role::OSP)->assertOk();
        $this->assertNull($target->fresh()->role_id);
    }

    /**
     * The SuperAdmin guard must not get in the way of ordinary account work:
     * creating a technician, moving one to another ordinary role, and saving
     * an edit form that resends the role the account already has.
     */
    public function test_a_user_manager_still_manages_ordinary_accounts(): void
    {
        $team = $this->customRole(['organization_id' => 5, 'permissions' => ['inventory']]);
        $this->signInWith(['user-management', 'user-management.create', 'user-management.edit'], 5);

        $created = $this->postJson('/api/users', [
            'first_name' => 'Field',
            'last_name' => 'Tech',
            'username' => 'fieldtech',
            'email_address' => 'fieldtech@example.test',
            'password' => 'secret-password',
            'role_id' => Role::TECHNICIAN,
        ])->assertCreated();

        $id = $created->json('data.id');
        $this->assertSame(5, (int) User::findOrFail($id)->organization_id);

        $this->putJson("/api/users/$id", ['role_id' => $team->id])->assertOk();
        $this->assertSame($team->id, (int) User::findOrFail($id)->role_id);

        $this->putJson("/api/users/$id", ['role_id' => $team->id, 'first_name' => 'Renamed'])->assertOk();
        $this->assertSame('Renamed', User::findOrFail($id)->first_name);
    }

    /**
     * An account already on a role the editor could not hand out is still
     * theirs to edit, as long as the role is not changed: the edit form sends
     * the current role_id back every time.
     */
    public function test_resending_an_unassignable_current_role_is_not_a_change(): void
    {
        $legacy = $this->customRole(['permissions' => ['inventory']]);
        $target = $this->userOn($legacy->id, 5);

        $this->signInWith(['user-management', 'user-management.edit'], 5);

        $this->putJson("/api/users/{$target->id}", ['role_id' => $legacy->id, 'first_name' => 'Kept'])->assertOk();
        $this->assertSame('Kept', $target->fresh()->first_name);
    }

    /** A Users Management key does not let you move yourself onto a wider role. */
    public function test_nobody_below_super_admin_changes_their_own_role(): void
    {
        $wide = $this->customRole(['permissions' => ['settings']]);
        $manager = $this->signInWith(['user-management', 'user-management.edit']);

        $this->putJson("/api/users/{$manager->id}", ['role_id' => $wide->id])
            ->assertForbidden()->assertJsonPath('message', 'You cannot change your own role. Ask a SuperAdmin.');
        $this->postJson("/api/users/{$manager->id}/roles", ['role_id' => $wide->id])->assertForbidden();
        $this->deleteJson("/api/users/{$manager->id}/roles")->assertForbidden();
        $this->assertSame($manager->role_id, $manager->fresh()->role_id);

        // Their own details are still theirs to save, current role included.
        $this->putJson("/api/users/{$manager->id}", ['role_id' => $manager->role_id, 'first_name' => 'Me'])
            ->assertOk();
    }

    /** The role endpoints change the role, and nothing else sent alongside. */
    public function test_the_role_endpoints_ignore_other_fields_in_the_query_string(): void
    {
        $target = $this->userOn(Role::TECHNICIAN);
        $this->signInAsSuperAdmin();

        $this->postJson("/api/users/{$target->id}/roles?username=hijacked&first_name=Hijacked&active=0", [
            'role_id' => Role::OSP,
            'last_name' => 'Hijacked',
        ])->assertOk();

        $target->refresh();
        $this->assertSame(Role::OSP, (int) $target->role_id);
        $this->assertSame("user{$target->id}", $target->username);
        $this->assertSame('Test', $target->first_name);
        $this->assertNotSame('Hijacked', $target->last_name);
        $this->assertTrue((bool) $target->active);

        $this->deleteJson("/api/users/{$target->id}/roles?role_id=" . Role::OSP . '&username=hijacked')->assertOk();
        $this->assertSame("user{$target->id}", $target->fresh()->username);
    }

    /** A hybrid on SuperAdmin is trusted with SuperAdmin accounts too. */
    public function test_a_hybrid_super_admin_may_assign_super_admin_roles(): void
    {
        $deputyRole = $this->customRole(['base_role_id' => Role::SUPER_ADMIN]);
        $target = $this->userOn(Role::TECHNICIAN);
        $this->actingAs($this->userOn($deputyRole->id), 'sanctum');

        $this->putJson("/api/users/{$target->id}", ['role_id' => Role::SUPER_ADMIN])->assertOk();
        $this->assertSame(Role::SUPER_ADMIN, (int) $target->fresh()->role_id);
    }

    /**
     * Another organization's accounts are refused alike, whatever their role.
     * The SuperAdmin check used to answer first, telling a caller which of
     * another organization's accounts were SuperAdmins.
     */
    public function test_another_organizations_accounts_are_refused_alike(): void
    {
        $theirAdmin = $this->userOn(Role::SUPER_ADMIN, 6);
        $theirTech = $this->userOn(Role::TECHNICIAN, 6);

        $this->signInWith(['user-management', 'user-management.edit', 'user-management.delete'], 5);

        $orgRefusal = 'Unauthorized. You can only update users within your organization.';
        $this->putJson("/api/users/{$theirAdmin->id}", ['first_name' => 'X'])
            ->assertForbidden()->assertJsonPath('message', $orgRefusal);
        $this->putJson("/api/users/{$theirTech->id}", ['first_name' => 'X'])
            ->assertForbidden()->assertJsonPath('message', $orgRefusal);

        $deleteRefusal = 'Unauthorized. You can only delete users within your organization.';
        $this->deleteJson("/api/users/{$theirAdmin->id}")->assertJsonPath('message', $deleteRefusal);
        $this->deleteJson("/api/users/{$theirTech->id}")->assertJsonPath('message', $deleteRefusal);
    }

    /**
     * A new base sent on its own still re-cleans the stored extras, so one the
     * base now grants is not left behind as a copy that stops following it.
     */
    public function test_a_base_sent_alone_drops_extras_the_base_now_grants(): void
    {
        $role = $this->customRole(['permissions' => ['job-order', 'inventory'], 'permissions_version' => 0]);
        $this->signInAsSuperAdmin();

        $this->putJson("/api/roles/{$role->id}", ['base_role_id' => Role::TECHNICIAN])->assertOk();

        $role->refresh();
        $this->assertSame(['inventory'], $role->permissions);
        // Not a save from the checkboxes, so an older role stays grandfathered.
        $this->assertSame(0, $role->permissions_version);
        $this->assertContains('job-order', Permissions::roleKeys($role));
    }

    public function test_removing_a_role_the_account_does_not_hold_is_refused(): void
    {
        $target = $this->userOn(Role::TECHNICIAN);

        $this->signInAsSuperAdmin();

        $this->deleteJson("/api/users/{$target->id}/roles?role_id=" . Role::OSP)->assertStatus(422);
        $this->postJson('/api/users/9999/roles', ['role_id' => Role::OSP])->assertNotFound();
        $this->postJson("/api/users/{$target->id}/roles", [])->assertStatus(422);
        $this->assertSame(Role::TECHNICIAN, (int) $target->fresh()->role_id);
    }
}

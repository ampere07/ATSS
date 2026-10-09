<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Services\ActivityLogService;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    public function index()
    {
        try {
            $user = auth()->user();
            $organizationId = $this->organizationIdOf($user);

            $query = Role::withCount(['users']);

            if ($organizationId !== null) {
                // The seeded roles OR roles belonging to the user's organization
                $query->where(function($q) use ($organizationId) {
                    $q->whereIn('id', Role::LOCKED_ROLE_IDS)
                      ->orWhere('organization_id', $organizationId);
                });
            }

            $roles = $query->get()->map(fn (Role $role) => $this->withEffectivePermissions($role));

            return response()->json([
                'success' => true,
                'data' => $roles
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch roles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        // Each entry must be a key the system actually recognises. A role
        // carrying an unknown key would silently grant nothing, which reads as
        // "the permission system is broken" rather than as the typo it is.
        //
        // base_role_id must be one of the eight seeded roles. Anything else —
        // another custom role, a deleted id — would either inherit nothing or
        // start a chain of roles inheriting each other, and neither is what the
        // picker offers.
        $validator = Validator::make($request->all(), [
            'role_name' => 'required|string|max:255|unique:roles,role_name',
            'description' => 'nullable|string',
            'base_role_id' => 'nullable|integer|in:' . implode(',', Role::LOCKED_ROLE_IDS),
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|in:' . implode(',', Permissions::all()),
        ]);

        if ($validator->fails()) {
            return $this->validationFailed($validator->errors()->toArray());
        }

        $validated = $validator->validated();
        $user = auth()->user();

        $baseRoleId = isset($validated['base_role_id']) ? (int) $validated['base_role_id'] : null;
        $permissions = $this->normalizePermissions($validated['permissions'] ?? [], $baseRoleId);

        $candidate = new Role();
        $candidate->base_role_id = $baseRoleId;
        $candidate->permissions = $permissions;
        $candidate->permissions_version = Permissions::CURRENT_VERSION;

        if ($denied = $this->denyIfOutOfReach($user, $candidate)) {
            return $denied;
        }

        if ($denied = $this->denyIfBeyondCaller($user, $candidate)) {
            return $denied;
        }

        if ($invalid = $this->invalidGrant($candidate)) {
            return $invalid;
        }

        try {
            // Built field by field rather than from the request: organization
            // and authorship are the server's to say. Taking the request whole
            // let a caller file a role under another organization, or under
            // somebody else's name.
            $role = Role::create([
                'role_name' => $validated['role_name'],
                'description' => $validated['description'] ?? null,
                'base_role_id' => $baseRoleId,
                'permissions' => $permissions,
                // Saved with the per-action checkboxes on screen, so the list
                // above is exactly what was chosen and is read as written.
                'permissions_version' => Permissions::CURRENT_VERSION,
                'created_by_user_id' => $user->id ?? null,
                'updated_by_user_id' => $user->id ?? null,
                'organization_id' => $this->organizationIdOf($user),
            ]);

            ActivityLogService::roleCreated($user->id ?? null, $role, [
                'base_role_id' => $baseRoleId,
                'permissions' => $permissions,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Role created successfully',
                'data' => $this->withEffectivePermissions($role->loadCount('users'))
            ], 201);
        } catch (\Exception $e) {
            // The response carries the message, but nothing reaches the log
            // otherwise — a create that 500s server-side left no trace to read
            // back afterwards, only a status code in the browser.
            Log::error('Role create failed', [
                'role_name' => $request->input('role_name'),
                'base_role_id' => $request->input('base_role_id'),
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create role',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * A role row plus the keys it effectively holds.
     *
     * `permissions` is the column as stored, which for a role saved before the
     * per-action keys existed lists only its pages. The Role modal seeds its
     * checkboxes from a role, and seeding from that column would show Add, Edit
     * and Delete unticked for a role that has them — so the first save would
     * revoke them, silently, from a screen that never showed them ticked.
     *
     * `effective_permissions` is what App\Support\Permissions actually grants,
     * grandfathering included, so the modal opens showing the truth. Its own
     * keys are what the save then writes, which is how a role stops being
     * grandfathered without anything changing underneath it. The page behind
     * every action is included, as it is when the role is read for a user, so
     * the modal never shows an action ticked on a page it shows unticked.
     *
     * The inherited half of a hybrid is excluded: those keys are resolved live
     * from the base role and the modal shows them locked, from its own copy of
     * the table, rather than as ticks belonging to this role.
     */
    private function withEffectivePermissions(Role $role): Role
    {
        $inherited = Permissions::inheritedKeys($role->base_role_id ?? null);

        $role->setAttribute('effective_permissions', array_values(array_diff(
            Permissions::withImpliedPages(Permissions::roleKeys($role)),
            $inherited
        )));

        return $role;
    }

    public function show($id)
    {
        $role = $this->findRole($id);

        // Answered as "not found" rather than "forbidden" so another
        // organization's role ids cannot be enumerated from here.
        if ($role === null || !$this->isVisibleTo($role, auth()->user())) {
            return $this->notFound();
        }

        // Every signed-in user may read roles — the clients look up their own —
        // so the members are counted, never listed. This used to load the
        // `users` relation, which handed any account, a customer's included,
        // the name, email and phone of everybody holding the role asked for.
        $role->loadCount('users');

        return response()->json([
            'success' => true,
            'data' => $this->withEffectivePermissions($role)
        ]);
    }

    public function update(Request $request, $id)
    {
        if ($this->isNumericId($id) && Role::isLocked($id)) {
            return response()->json([
                'success' => false,
                'message' => 'System roles cannot be edited'
            ], 403);
        }

        $role = $this->findRole($id);

        if ($role === null) {
            return $this->notFound();
        }

        $user = auth()->user();

        // Seeded roles are refused above; this is the organization boundary.
        // Answered as show() answers it, so another organization's role ids
        // cannot be told apart from ids that do not exist.
        if (!$this->isVisibleTo($role, $user)) {
            return $this->notFound();
        }

        $validator = Validator::make($request->all(), [
            // `required` alongside `sometimes`: present means it must say
            // something. An emptied name otherwise reached the database as
            // NULL and failed there, as a 500.
            'role_name' => 'sometimes|required|string|max:255|unique:roles,role_name,' . $role->id,
            'description' => 'sometimes|nullable|string',
            // Null clears the base, turning a hybrid back into a standalone
            // custom role. Its own `permissions` are untouched, so it keeps
            // exactly the keys that were ticked against it rather than the
            // inherited ones it is losing.
            'base_role_id' => 'sometimes|nullable|integer|in:' . implode(',', Role::LOCKED_ROLE_IDS),
            'permissions' => 'sometimes|nullable|array',
            'permissions.*' => 'string|in:' . implode(',', Permissions::all()),
        ]);

        if ($validator->fails()) {
            return $this->validationFailed($validator->errors()->toArray());
        }

        $validated = $validator->validated();

        $baseChanged = array_key_exists('base_role_id', $validated);
        $permissionsChanged = array_key_exists('permissions', $validated);

        $baseRoleId = $baseChanged
            ? (isset($validated['base_role_id']) ? (int) $validated['base_role_id'] : null)
            : $role->baseRoleId();

        // The role as it would read after this save. Every check below is
        // made against that rather than against the request alone, so a base
        // switched on its own is checked against the extras already stored.
        $candidate = clone $role;
        $candidate->base_role_id = $baseRoleId;

        $updateData = [];

        if ($permissionsChanged) {
            $permissions = $this->normalizePermissions($validated['permissions'] ?? [], $baseRoleId);
            $candidate->permissions = $permissions;
            $candidate->permissions_version = Permissions::CURRENT_VERSION;

            $updateData['permissions'] = $permissions;
            // Whatever generation this row was saved under before, its list
            // has now been through the modal that shows every action, so it
            // stops being grandfathered.
            //
            // Only when the list itself was sent. A rename on its own never
            // showed anybody the checkboxes, and stamping the version then
            // would revoke the buttons an older role was still being granted.
            $updateData['permissions_version'] = Permissions::CURRENT_VERSION;
        } elseif ($baseChanged) {
            // A new base on its own still re-cleans the stored extras: one the
            // new base also grants would otherwise stay stored as a copy and
            // stop following the base. The version is left alone — this list
            // was not chosen on a screen, so an older role keeps the buttons
            // it is grandfathered into.
            $permissions = $this->normalizePermissions($this->storedKeys($role), $baseRoleId);
            $candidate->permissions = $permissions;
            $updateData['permissions'] = $permissions;
        }

        if ($denied = $this->denyIfOutOfReach($user, $candidate, $role)) {
            return $denied;
        }

        if ($denied = $this->denyIfBeyondCaller($user, $candidate, $role)) {
            return $denied;
        }

        // A rename alone is not the moment to re-litigate what the role holds.
        if (($permissionsChanged || $baseChanged) && ($invalid = $this->invalidGrant($candidate))) {
            return $invalid;
        }

        foreach (['role_name', 'description'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updateData[$field] = $validated[$field];
            }
        }

        if ($baseChanged) {
            $updateData['base_role_id'] = $baseRoleId;
        }

        try {
            $before = $role->only(['role_name', 'description', 'base_role_id', 'permissions']);

            $role->update($updateData + [
                'updated_by_user_id' => $user->id ?? null,
            ]);

            $changes = array_filter(
                $role->only(array_keys($before)),
                fn ($value, $field) => $value != $before[$field],
                ARRAY_FILTER_USE_BOTH
            );

            if ($changes !== []) {
                ActivityLogService::roleUpdated($user->id ?? null, $role, $changes);
            }

            return response()->json([
                'success' => true,
                'message' => 'Role updated successfully',
                'data' => $this->withEffectivePermissions($role->loadCount('users'))
            ]);
        } catch (\Exception $e) {
            Log::error('Role update failed', ['role_id' => $id, 'exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update role',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        if ($this->isNumericId($id) && Role::isLocked($id)) {
            return response()->json([
                'success' => false,
                'message' => 'System roles cannot be deleted'
            ], 403);
        }

        $role = $this->findRole($id);

        if ($role === null) {
            return $this->notFound();
        }

        $user = auth()->user();

        // As in show() and update(): not found, rather than a refusal that
        // confirms the id belongs to somebody else's organization.
        if (!$this->isVisibleTo($role, $user)) {
            return $this->notFound();
        }

        if ($denied = $this->denyIfOutOfReach($user, null, $role)) {
            return $denied;
        }

        try {
            // A role still held by somebody cannot go: their account would be
            // left pointing at nothing, and so holding nothing.
            $holders = $role->users()->count();

            if ($holders > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete a role that is assigned to {$holders} "
                        . ($holders === 1 ? 'user' : 'users')
                        . '. Move them to another role first.'
                ], 400);
            }

            $roleName = $role->role_name;
            $role->delete();

            ActivityLogService::roleDeleted($user->id ?? null, $role->id, $roleName);

            return response()->json([
                'success' => true,
                'message' => 'Role deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Role delete failed', ['role_id' => $id, 'exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete role',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * The list to store for a role.
     *
     * Duplicates go; the page behind every action is added, since the action
     * opens it anyway; and anything the base role already grants is dropped.
     * That last one matters most: a stored copy of an inherited key stops
     * tracking the base, so a key later taken away from the base would linger
     * on this role. A SuperAdmin base grants everything, leaving nothing to
     * store.
     *
     * @param  string[]  $keys
     * @return string[]
     */
    private function normalizePermissions(array $keys, ?int $baseRoleId): array
    {
        $inherited = Permissions::inheritedKeys($baseRoleId);

        if (in_array(Permissions::WILDCARD, $inherited, true)) {
            return [];
        }

        $keys = Permissions::withImpliedPages(array_values(array_unique(array_map('strval', $keys))));

        return array_values(array_diff($keys, $inherited));
    }

    /**
     * Refuse to let a caller hand out reach they do not have themselves.
     *
     * A role that grants everything — SuperAdmin's own wildcard, inherited
     * through a SuperAdmin base — makes whoever holds it a SuperAdmin. Without
     * this, anyone allowed to edit roles could put that base on their own role
     * and become one. So only a caller who already holds everything may build,
     * change or delete such a role.
     *
     * `$candidate` is the role as it would read after the save, `$existing` as
     * it reads now; either may be absent (a create has no existing row, a
     * delete no candidate).
     */
    private function denyIfOutOfReach($user, ?Role $candidate, ?Role $existing = null)
    {
        if (Permissions::holdsEverything($user)) {
            return null;
        }

        $grantsEverything = ($candidate !== null && Permissions::roleGrantsEverything($candidate))
            || ($existing !== null && Permissions::roleGrantsEverything($existing));

        if (!$grantsEverything) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'Only a SuperAdmin can create, change or delete a role built on SuperAdmin.'
        ], 403);
    }

    /**
     * Refuse a role that would grant keys the caller does not hold.
     *
     * Holding `roles.edit` is not the same as holding everything. Without
     * this, a role manager could tick Settings, Users Management and every
     * other key onto their own role — or onto a new one — and so reach any
     * part of the system. The rule is the usual one: you can hand out only
     * what you have yourself.
     *
     * Only what the save *adds* is checked, against what the role already
     * granted. A role that already holds keys its editor lacks can still be
     * renamed, trimmed or have other keys added; it just cannot gain more of
     * what the editor does not have. A base role counts as the keys it brings.
     * A SuperAdmin, holding everything, is never refused.
     */
    private function denyIfBeyondCaller($user, Role $candidate, ?Role $existing = null)
    {
        if (Permissions::holdsEverything($user)) {
            return null;
        }

        $wanted = Permissions::withImpliedPages(Permissions::roleKeys($candidate));
        $had = $existing === null ? [] : Permissions::withImpliedPages(Permissions::roleKeys($existing));
        $held = Permissions::forUser($user);

        $beyond = array_values(array_diff(array_diff($wanted, $had), $held));

        if ($beyond === []) {
            return null;
        }

        $named = implode(', ', array_slice($beyond, 0, 6))
            . (count($beyond) > 6 ? ' and ' . (count($beyond) - 6) . ' more' : '');

        return response()->json([
            'success' => false,
            'message' => "You can only grant permissions you hold yourself. Not held: $named.",
            'not_held' => $beyond,
        ], 403);
    }

    /**
     * The keys stored against a role, as a list of strings.
     *
     * The column is cast to an array; a row the cast cannot read gives null,
     * which is no keys rather than an error.
     *
     * @return string[]
     */
    private function storedKeys(Role $role): array
    {
        $stored = $role->permissions;

        return is_array($stored) ? array_values(array_filter(array_map('strval', $stored), 'strlen')) : [];
    }

    /**
     * A 422 for a role that could be stored but would not work, or null.
     *
     * Two shapes: a role that grants nothing at all, which would sign its
     * users in to a page refusing them; and one holding both halves of an
     * exclusive pair (see Permissions::EXCLUSIVE_PAIRS), counting what a
     * hybrid inherits.
     */
    private function invalidGrant(Role $candidate)
    {
        $effective = Permissions::roleKeys($candidate);

        if ($effective === []) {
            return $this->validationFailed([
                'permissions' => ['Choose a base role or tick at least one permission.'],
            ]);
        }

        $conflicts = Permissions::exclusiveConflicts($effective);

        if ($conflicts !== []) {
            return $this->validationFailed([
                'permissions' => array_map(
                    fn (array $pair) => "{$pair[0]} and {$pair[1]} cannot both be granted; choose one.",
                    $conflicts
                ),
            ]);
        }

        return null;
    }

    /** The caller's organization, or null for a caller who has none. */
    private function organizationIdOf($user): ?int
    {
        $organizationId = $user->organization_id ?? null;

        return $organizationId === null || $organizationId === '' ? null : (int) $organizationId;
    }

    /**
     * May this caller see this role?
     *
     * The same boundary index() draws: a caller in an organization sees the
     * seeded roles and its own organization's, one without an organization
     * sees every role. Compared as integers — a strict comparison between a
     * string and an int id refused a caller their own organization's roles.
     */
    private function isVisibleTo(Role $role, $user): bool
    {
        if (Role::isLocked($role->id)) {
            return true;
        }

        $organizationId = $this->organizationIdOf($user);

        if ($organizationId === null) {
            return true;
        }

        return $role->organization_id !== null && (int) $role->organization_id === $organizationId;
    }

    private function isNumericId($id): bool
    {
        return is_int($id) || (is_string($id) && ctype_digit($id));
    }

    private function findRole($id): ?Role
    {
        return $this->isNumericId($id) ? Role::find((int) $id) : null;
    }

    private function notFound()
    {
        return response()->json([
            'success' => false,
            'message' => 'Role not found'
        ], 404);
    }

    private function validationFailed(array $errors)
    {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $errors
        ], 422);
    }
}

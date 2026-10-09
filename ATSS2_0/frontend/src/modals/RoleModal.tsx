import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { Role, ApiResponse } from '../types/api';
import { roleService } from '../services/userService';
import ModalUITemplate, { useModalTheme } from './ui-modal/ModalUITemplate';
import {
  ACTIONS,
  BASE_ROLE_OPTIONS,
  WILDCARD,
  inheritedPermissions,
  labelFor,
  parsePermissions,
  permissionGroups,
} from '../config/permissions';
import { usePermissions } from '../hooks/usePermissions';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: Role) => void;
  role?: Role | null;
}

/**
 * Pages and their sub actions come from config/permissions.ts.
 *
 * They used to be a list maintained here by hand, which meant a page added to
 * the app was invisible to Role Management until somebody remembered to add it
 * a second time — Reports, Monitoring, the Agent pages and Data Logs had all
 * been added and none could be granted to a custom role. Reading the catalog
 * means the modal can never fall behind it again.
 */
const PERMISSION_GROUPS = permissionGroups();

/**
 * Keys that cannot both be held: one opens the technician's Done form, the
 * other the administrator's.
 *
 * Ticking one clears the other. When a base role brings one of a pair in, the
 * other is not offered at all — a hybrid cannot un-inherit half its base.
 */
const EXCLUSIVE_PARTNER: Record<string, string> = {
  'job-order.tech-edit': 'job-order.admin-edit',
  'job-order.admin-edit': 'job-order.tech-edit',
  'service-order.tech-edit': 'service-order.admin-edit',
  'service-order.admin-edit': 'service-order.tech-edit',
};

/** No base role — the standalone custom role this modal used to only build. */
const NO_BASE = 0;

/**
 * Add the page behind every action in the list, unless the base grants it.
 *
 * An action opens its page whether or not the page is ticked, so a list
 * holding the action without the page would show View unticked on a page the
 * role can in fact open.
 */
const withParentPages = (keys: string[], inherited: Set<string>): string[] => {
  const result = [...keys];

  keys.forEach(key => {
    if (!key.includes('.')) return;

    const parent = key.split('.')[0];
    if (!result.includes(parent) && !inherited.has(parent)) result.push(parent);
  });

  return result;
};

const RoleForm: React.FC<{
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBaseRoleChange: (baseRoleId: number) => void;
  handlePermissionChange: (pageId: string, checked: boolean) => void;
  errors: Record<string, string>;
  baseRoleId: number;
  baseRoleOptions: Array<{ id: number; label: string }>;
  selectedPermissions: string[];
  inherited: Set<string>;
  inheritsEverything: boolean;
  canGrant: (key: string) => boolean;
}> = ({
  formData,
  handleInputChange,
  handleBaseRoleChange,
  handlePermissionChange,
  errors,
  baseRoleId,
  baseRoleOptions,
  selectedPermissions,
  inherited,
  inheritsEverything,
  canGrant,
}) => {
  const { isDarkMode } = useModalTheme();

  const inputClass = (error?: string) => `w-full px-4 py-2.5 rounded-lg border transition-all duration-200 outline-none focus:ring-2 focus:ring-opacity-50
    ${isDarkMode
      ? `bg-gray-800 text-white ${error ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-700 focus:ring-blue-500/20'}`
      : `bg-white text-gray-900 ${error ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:ring-blue-500/20'}`
    }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

  const baseLabel = BASE_ROLE_OPTIONS.find(option => option.id === baseRoleId)?.label ?? '';

  /** Held because the base role holds it, rather than because it was ticked here. */
  const isInherited = (key: string) => inheritsEverything || inherited.has(key);

  /** The base holds the key this one cannot be combined with. */
  const isExcludedByBase = (key: string) => !!EXCLUSIVE_PARTNER[key] && isInherited(EXCLUSIVE_PARTNER[key]);

  /**
   * A key is locked when the base already grants it, when the base grants the
   * key it is mutually exclusive with, or when it is one the editor may not
   * hand out — see canGrant.
   */
  const isLocked = (key: string) => isInherited(key) || isExcludedByBase(key) || !canGrant(key);

  /** Why a locked checkbox is locked, as its tooltip. */
  const lockReason = (key: string): string | undefined => {
    if (isInherited(key)) return `Granted by ${baseLabel}`;
    if (isExcludedByBase(key)) {
      return `${baseLabel} holds ${labelFor(EXCLUSIVE_PARTNER[key])}, which this cannot be combined with`;
    }
    if (!canGrant(key)) return 'You can only grant permissions you hold yourself';
    return undefined;
  };

  const isChecked = (key: string) => isInherited(key) || selectedPermissions.includes(key);

  const checkboxClass = (key: string) =>
    `w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 ${
      isLocked(key) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
    }`;

  return (
    <div className="space-y-6">
      {errors.general && (
        <div className={`p-4 border rounded-xl text-sm font-medium ${isDarkMode ? 'bg-red-900/20 border-red-800/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {errors.general}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Role Name*</label>
          <input
            name="role_name"
            value={formData.role_name}
            onChange={handleInputChange}
            className={inputClass(errors.role_name)}
            placeholder="e.g. Administrator, Agent"
          />
          {errors.role_name && <p className="text-red-500 text-xs mt-1.5 font-medium ml-1">{errors.role_name}</p>}
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={inputClass()}
            placeholder="Briefly describe the role's responsibilities"
            rows={2}
          />
        </div>

        {/* The hybrid picker. Choosing one of the eight starts the role from
            that role's access; the ticks below then only add to it. */}
        <div>
          <label className={labelClass}>Start From a System Role</label>
          <select
            value={baseRoleId}
            onChange={(e) => handleBaseRoleChange(Number(e.target.value))}
            className={inputClass()}
          >
            <option value={NO_BASE}>None — pick every page by hand</option>
            {baseRoleOptions.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <p className={`text-xs mt-1.5 ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {baseRoleId === NO_BASE
              ? 'This role holds exactly what you tick below.'
              : inheritsEverything
                ? `Inherits everything a ${baseLabel} holds, including pages added later. There is nothing left to add.`
                : `Inherits everything a ${baseLabel} holds — shown ticked and locked below — and follows that role as it changes. Tick anything extra this role should also see.`}
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className={labelClass.replace('mb-1.5', '')}>Permissions</label>
            {baseRoleId !== NO_BASE && (
              <span className={`text-[11px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Locked ticks come from <span className="font-semibold">{baseLabel}</span>
              </span>
            )}
          </div>
          <p className={`text-xs mb-2 ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            View opens the page. Each action beside it is a button on that page —
            leave one unticked and it is hidden for this role.
          </p>
          {errors.permissions && (
            <p className="text-red-500 text-xs mb-2 font-medium ml-1">{errors.permissions}</p>
          )}
          <div className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`grid grid-cols-[minmax(0,1.4fr)_72px_minmax(0,2.2fr)] px-4 py-2 text-xs font-bold uppercase tracking-wider border-b ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
              <div>Page Name</div>
              <div className="text-center">View</div>
              <div>Actions</div>
            </div>
            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {PERMISSION_GROUPS.map((group) => (
                <React.Fragment key={group.label}>
                  {/* Section header — the same grouping the sidebar uses, so a
                      role is ticked in the shape it will be navigated in. */}
                  <div className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-gray-800/60 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                    {group.label}
                  </div>

                  {group.pages.map((pageId) => (
                    <div key={pageId} className="grid grid-cols-[minmax(0,1.4fr)_72px_minmax(0,2.2fr)] px-4 py-3 items-center transition-colors">
                      <div className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span>{labelFor(pageId)}</span>
                        {isInherited(pageId) && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                            Inherited
                          </span>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          aria-label={`${labelFor(pageId)}: View`}
                          checked={isChecked(pageId)}
                          disabled={isLocked(pageId)}
                          title={lockReason(pageId)}
                          onChange={(e) => handlePermissionChange(pageId, e.target.checked)}
                          className={checkboxClass(pageId)}
                        />
                      </div>
                      {/* Wraps: most pages now declare Add, Edit and Delete,
                          and a job order declares six. A single row of them
                          overflowed the column rather than moving to a second
                          line. */}
                      <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
                        {(ACTIONS[pageId] || []).map((actionId) => (
                          <div key={actionId} className="flex flex-col items-center gap-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-tight leading-none whitespace-nowrap ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {labelFor(actionId)}
                            </span>
                            <input
                              type="checkbox"
                              aria-label={`${labelFor(pageId)}: ${labelFor(actionId)}`}
                              checked={isChecked(actionId)}
                              disabled={isLocked(actionId)}
                              title={lockReason(actionId)}
                              onChange={(e) => handlePermissionChange(actionId, e.target.checked)}
                              className={checkboxClass(actionId)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, role }) => {
  const isEditMode = !!role;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    role_name: '',
    description: '',
  });

  /** The seeded role this one builds on, or NO_BASE for a standalone role. */
  const [baseRoleId, setBaseRoleId] = useState<number>(NO_BASE);

  /**
   * Only the keys ticked against this role.
   *
   * A hybrid's inherited keys are deliberately kept out: storing them would
   * freeze a copy of the base role at the moment of saving, which is the thing
   * hybrids exist to avoid.
   */
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const inheritedKeys = useMemo(() => inheritedPermissions(baseRoleId), [baseRoleId]);
  const inheritsEverything = inheritedKeys.includes(WILDCARD);
  const inherited = useMemo(() => new Set(inheritedKeys), [inheritedKeys]);

  // The editor may hand out only what they hold themselves — the server refuses
  // anything more. A key the role already had when the modal opened stays
  // theirs to keep or remove: only additions are checked.
  const { permissions: callerPermissions } = usePermissions();
  const callerHoldsEverything = callerPermissions.includes(WILDCARD);

  const originalKeys = useMemo(() => {
    if (!role) return new Set<string>();

    const own = Array.isArray(role.effective_permissions)
      ? role.effective_permissions
      : parsePermissions(role.permissions);

    return new Set(withParentPages([...own, ...inheritedPermissions(role.base_role_id)], new Set()));
  }, [role]);

  const canGrant = useCallback(
    (key: string) => callerHoldsEverything || callerPermissions.includes(key) || originalKeys.has(key),
    [callerHoldsEverything, callerPermissions, originalKeys]
  );

  // A base is offered when the editor could grant everything it brings, so a
  // SuperAdmin base only to somebody who holds everything. The role's current
  // base is always listed, so the picker reads true.
  const baseRoleOptions = useMemo(
    () =>
      BASE_ROLE_OPTIONS.filter(
        option =>
          option.id === Number(role?.base_role_id) ||
          inheritedPermissions(option.id).every(canGrant)
      ),
    [canGrant, role]
  );

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setFormData({
          role_name: role.role_name || '',
          description: role.description || '',
        });

        setBaseRoleId(Number(role.base_role_id) || NO_BASE);

        // What the role effectively holds, which for one saved before the
        // per-action keys existed includes the buttons its pages used to carry.
        // Seeding from the stored column instead would show Add, Edit and
        // Delete unticked for a role that has them, and the save below would
        // then revoke them from a screen that never showed them.
        //
        // Falls back to the column for a caller that has not been given the
        // resolved list — an array from Laravel's cast, or a JSON /
        // comma-separated string on a row written before that cast existed.
        //
        // An extra whose exclusive partner the base grants is dropped here, as
        // switching to that base would drop it. A role saved that way before
        // the server refused the pair would otherwise open with the extra
        // ticked and locked — impossible to untick, and refused on every save.
        const baseKeys = new Set(inheritedPermissions(role.base_role_id));
        const own = Array.isArray(role.effective_permissions)
          ? role.effective_permissions
          : parsePermissions(role.permissions);

        setSelectedPermissions(
          withParentPages(
            own.filter(key => !(EXCLUSIVE_PARTNER[key] && baseKeys.has(EXCLUSIVE_PARTNER[key]))),
            baseKeys
          )
        );
      } else {
        setFormData({
          role_name: '',
          description: '',
        });
        setBaseRoleId(NO_BASE);
        setSelectedPermissions([]);
      }
      setErrors({});
    }
  }, [isOpen, role]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Switching base role rewrites the extras it makes redundant or impossible.
   *
   * Anything the new base already grants stops being an extra — leaving it
   * would store a duplicate that then stops tracking the base — and anything
   * mutually exclusive with what the base grants is dropped, since the base
   * half of that pair cannot be given up.
   */
  const handleBaseRoleChange = (nextBaseRoleId: number) => {
    setBaseRoleId(nextBaseRoleId);

    const nextInherited = inheritedPermissions(nextBaseRoleId);

    if (nextInherited.includes(WILDCARD)) {
      setSelectedPermissions([]);
      return;
    }

    // An extra action whose page the old base supplied loses that page when
    // the base changes, so the page comes back as an extra of its own —
    // otherwise View would read unticked on a page the role still opens.
    const held = new Set(nextInherited);
    setSelectedPermissions(prev =>
      withParentPages(
        prev.filter(key => !held.has(key) && !(EXCLUSIVE_PARTNER[key] && held.has(EXCLUSIVE_PARTNER[key]))),
        held
      )
    );
    if (errors.permissions) {
      setErrors(prev => ({ ...prev, permissions: '' }));
    }
  };

  const handlePermissionChange = (pageId: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      let newPermissions = [...prev];

      if (checked) {
        if (!newPermissions.includes(pageId)) {
          newPermissions.push(pageId);
        }

        // If it's a sub-permission, auto-check the parent — unless the base role
        // already grants it, in which case there is nothing to add.
        if (pageId.includes('.')) {
          const parentId = pageId.split('.')[0];
          if (!newPermissions.includes(parentId) && !inherited.has(parentId)) {
            newPermissions.push(parentId);
          }
        }

        // The tech-edit / admin-edit pairs are mutually exclusive. The partner
        // can only be cleared here when it is an extra; an inherited one is
        // never offered, so this cannot leave the pair both ticked.
        const partner = EXCLUSIVE_PARTNER[pageId];
        if (partner) {
          newPermissions = newPermissions.filter(id => id !== partner);
        }
      } else {
        newPermissions = newPermissions.filter(id => id !== pageId);

        // If it's a parent, auto-uncheck all sub-permissions
        if (!pageId.includes('.')) {
          newPermissions = newPermissions.filter(id => !id.startsWith(pageId + '.'));
        }
      }

      return newPermissions;
    });
    if (errors.permissions) {
      setErrors(prev => ({ ...prev, permissions: '' }));
    }
  };

  /** What the save sends: the extras alone, with the page behind each action. */
  const extrasToSave = (): string[] =>
    inheritsEverything
      ? []
      : withParentPages(selectedPermissions.filter(key => !inherited.has(key)), inherited);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.role_name.trim()) newErrors.role_name = 'Required';
    else if (formData.role_name.trim().length > 255) newErrors.role_name = 'At most 255 characters';

    // A role holding nothing signs its users in to a page that refuses them.
    if (baseRoleId === NO_BASE && extrasToSave().length === 0) {
      newErrors.permissions = 'Choose a system role to start from, or tick at least one permission.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // No organization_id: the server files a role under the caller's own
      // organization and ignores one sent from here.
      const payload = {
        role_name: formData.role_name.trim(),
        description: formData.description,
        base_role_id: baseRoleId === NO_BASE ? null : baseRoleId,
        // Extras only. The server merges these with the base role's keys on
        // every read, so an inherited key sent back here would only go stale.
        permissions: extrasToSave(),
      };

      let response: ApiResponse<Role>;
      if (isEditMode && role) {
        response = await roleService.updateRole(role.id, payload as any);
      } else {
        response = await roleService.createRole(payload as any);
      }

      if (response.success && response.data) {
        onSave(response.data);
        onClose();
      } else {
        setErrors({ general: response.message || 'Something went wrong' });
      }
    } catch (error: any) {
      // Prefer what the server said over axios's "Request failed with status
      // code 500", which names the status and nothing about the cause. A 422
      // body carries the per-field messages; a 500 carries the exception.
      //
      // A message about the name or the permissions is shown beside that
      // field; anything else goes in the banner.
      const body = error?.response?.data;
      const serverErrors = (body?.errors || {}) as Record<string, string[] | string>;
      const firstOf = (value?: string[] | string) => (Array.isArray(value) ? value.join(' ') : value || '');

      const roleNameError = firstOf(serverErrors.role_name);
      const permissionErrors = Object.entries(serverErrors)
        .filter(([field]) => field === 'permissions' || field.startsWith('permissions.'))
        .map(([, value]) => firstOf(value));
      const otherErrors = Object.entries(serverErrors)
        .filter(([field]) => field !== 'role_name' && field !== 'permissions' && !field.startsWith('permissions.'))
        .map(([, value]) => firstOf(value));

      const fieldLevel = !!roleNameError || permissionErrors.length > 0;
      const detail = [fieldLevel ? '' : body?.message, ...otherErrors, body?.error]
        .filter(Boolean)
        .join(' — ');

      setErrors({
        ...(roleNameError ? { role_name: roleNameError } : {}),
        ...(permissionErrors.length > 0 ? { permissions: permissionErrors.join(' ') } : {}),
        ...(detail || !fieldLevel
          ? { general: detail || error.message || 'An unexpected error occurred' }
          : {}),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalUITemplate
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Role' : 'Add New Role'}
      loading={loading}
      maxWidth="max-w-4xl"
      primaryAction={{
        label: isEditMode ? 'Update' : 'Save',
        onClick: handleSave,
        disabled: loading
      }}
    >
      <RoleForm
        formData={formData}
        handleInputChange={handleInputChange}
        handleBaseRoleChange={handleBaseRoleChange}
        handlePermissionChange={handlePermissionChange}
        errors={errors}
        baseRoleId={baseRoleId}
        baseRoleOptions={baseRoleOptions}
        selectedPermissions={selectedPermissions}
        inherited={inherited}
        inheritsEverything={inheritsEverything}
        canGrant={canGrant}
      />
    </ModalUITemplate>
  );
};

export default RoleModal;

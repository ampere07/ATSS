import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Switch } from 'react-native';
import { Role, ApiResponse } from '../types/api';
import { roleService } from '../services/userService';
import ModalUITemplate, { useModalTheme } from './ui-modal/ModalUITemplate';
import { WILDCARD, baseRoleLabel, inheritedPermissions, parsePermissions } from '../config/permissions';
import { usePermissions } from '../hooks/usePermissions';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: Role) => void;
  role?: Role | null;
}

const SYSTEM_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'live-monitor', label: 'Monitoring' },
  { id: 'customer', label: 'Customer' },
  { id: 'transaction-list', label: 'Transaction List' },
  { id: 'transactions-revert', label: 'Revert Requests' },
  { id: 'payment-portal', label: 'Payment Portal' },
  { id: 'soa', label: 'Statements' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'so-charge', label: 'SO Charge' },
  { id: 'dc-notice', label: 'DC Notice' },
  { id: 'mass-rebate', label: 'Rebates' },
  { id: 'staggered-payment', label: 'Staggered' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'application-management', label: 'Application' },
  { id: 'job-order', label: 'Job Order' },
  { id: 'service-order', label: 'Service Order' },
  { id: 'work-order', label: 'Work Order' },
  { id: 'lcp-nap-location', label: 'LCP/NAP Location' },
  { id: 'sms-blast', label: 'SMS Blast' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'inventory-category-list', label: 'Inventory Category List' },
  { id: 'promo-list', label: 'Promo' },
  { id: 'plan-list', label: 'Plan' },
  { id: 'location-list', label: 'Location' },
  { id: 'lcp', label: 'LCP' },
  { id: 'nap', label: 'NAP' },
  { id: 'usage-type', label: 'Usage Type' },
  { id: 'payment-method', label: 'Payment Method' },
  { id: 'work-category', label: 'Work Category' },
  { id: 'radius-config', label: 'Radius Config' },
  { id: 'smart-olt', label: 'SmartOLT Config' },
  { id: 'sms-config', label: 'SMS Config' },
  { id: 'sms-template', label: 'SMS Template' },
  { id: 'email-templates', label: 'Email Templates' },
  { id: 'pppoe-setup', label: 'PPPoE Setup' },
  { id: 'concern-config', label: 'Concern Config' },
  { id: 'billing-config', label: 'Billing Configurations' },
  { id: 'user-management', label: 'Users Management' },
  { id: 'tech-users', label: 'Tech Users' },
  { id: 'team-agent', label: 'Team Agents' },
  { id: 'organization', label: 'Organization' },
  { id: 'roles', label: 'Roles Management' },
  { id: 'disconnected-logs', label: 'Disconnected Logs' },
  { id: 'reconnection-logs', label: 'Reconnection Logs' },
  { id: 'sms-logs', label: 'SMS Logs' },
  { id: 'email-logs', label: 'Email Logs' },
  { id: 'smart-olt-logs', label: 'Smart OLT Logs' },
  { id: 'radius-logs', label: 'Radius Logs' },
  { id: 'system-logs', label: 'System Logs' },
  { id: 'settings', label: 'Settings' },
];

const SUB_PERMISSIONS: Record<string, { id: string; label: string }[]> = {
  'job-order': [
    { id: 'job-order.approve', label: 'Approve' },
    { id: 'job-order.failed', label: 'Failed' },
    { id: 'job-order.tech-edit', label: 'Tech Edit' },
    { id: 'job-order.admin-edit', label: 'Admin Edit' },
    { id: 'job-order.attachment', label: 'Attachment' },
  ],
  customer: [
    { id: 'customer.so-request', label: 'SO Request' },
    { id: 'customer.details-edit', label: 'Details Edit' },
    { id: 'customer.attachment', label: 'Attachment' },
    { id: 'customer.transact', label: 'Transact' },
  ],
  'transaction-list': [
    { id: 'transaction-list.batch-approve', label: 'Batch Approve' },
    { id: 'transaction-list.approve', label: 'Approve' },
    { id: 'transaction-list.revert-request', label: 'Revert Request' },
  ],
  'mass-rebate': [{ id: 'mass-rebate.add', label: 'Add Rebate' }],
  'staggered-payment': [{ id: 'staggered-payment.add', label: 'Add Staggered' }],
  discounts: [{ id: 'discounts.add', label: 'Add Discount' }],
  'application-management': [
    { id: 'application-management.move-to-jo', label: 'Move to JO' },
    { id: 'application-management.quick-status', label: 'Quick Status' },
  ],
  'service-order': [
    { id: 'service-order.tech-edit', label: 'Tech Edit' },
    { id: 'service-order.admin-edit', label: 'Admin Edit' },
  ],
};

/**
 * Keys that cannot both be held: one opens the technician's Done form, the
 * other the administrator's. Ticking one clears the other, and the server
 * refuses the pair — counting what a hybrid inherits.
 */
const EXCLUSIVE_PARTNER: Record<string, string> = {
  'job-order.tech-edit': 'job-order.admin-edit',
  'job-order.admin-edit': 'job-order.tech-edit',
  'service-order.tech-edit': 'service-order.admin-edit',
  'service-order.admin-edit': 'service-order.tech-edit',
};

const RoleForm: React.FC<{
  formData: any;
  handleFieldChange: (name: string, value: string) => void;
  handlePermissionChange: (pageId: string, checked: boolean) => void;
  errors: Record<string, string>;
  selectedPermissions: string[];
  primaryColor: string;
  inherited: Set<string>;
  inheritsEverything: boolean;
  baseLabel: string;
  canGrant: (key: string) => boolean;
}> = ({
  formData,
  handleFieldChange,
  handlePermissionChange,
  errors,
  selectedPermissions,
  primaryColor,
  inherited,
  inheritsEverything,
  baseLabel,
  canGrant,
}) => {
  /**
   * Held because the role's base grants it rather than because it was ticked.
   * Shown on and locked: a hybrid cannot give up part of its base from here,
   * and the base is changed from the web portal's Role Management.
   */
  const isInherited = (key: string) => inheritsEverything || inherited.has(key);
  const isOn = (key: string) => isInherited(key) || selectedPermissions.includes(key);
  /** Locked: the base grants it, the base grants its exclusive partner, or the editor may not hand it out. */
  const isLocked = (key: string) =>
    isInherited(key) || (!!EXCLUSIVE_PARTNER[key] && isInherited(EXCLUSIVE_PARTNER[key])) || !canGrant(key);
  const labelStyle = { fontSize: 13, fontWeight: '500' as const, marginBottom: 6, color: '#6b7280' };
  const inputStyle = (error?: string) => ({
    width: '100%' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: error ? '#ef4444' : '#e5e7eb',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: 14,
  });

  return (
    <View style={{ gap: 20 }}>
      {errors.general ? (
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#dc2626' }}>{errors.general}</Text>
        </View>
      ) : null}

      <View>
        <Text style={labelStyle}>Role Name*</Text>
        <TextInput
          value={formData.role_name}
          onChangeText={(v) => handleFieldChange('role_name', v)}
          style={inputStyle(errors.role_name)}
          placeholder="e.g. Administrator, Agent"
          placeholderTextColor="#9ca3af"
        />
        {errors.role_name ? (
          <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: '500' }}>
            {errors.role_name}
          </Text>
        ) : null}
      </View>

      <View>
        <Text style={labelStyle}>Description</Text>
        <TextInput
          value={formData.description}
          onChangeText={(v) => handleFieldChange('description', v)}
          style={[inputStyle(), { minHeight: 64, textAlignVertical: 'top' }]}
          placeholder="Briefly describe the role's responsibilities"
          placeholderTextColor="#9ca3af"
          multiline
        />
      </View>

      <View>
        <Text style={labelStyle}>Permissions (Page Access)</Text>
        {baseLabel ? (
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, marginLeft: 4 }}>
            {inheritsEverything
              ? `Inherits everything a ${baseLabel} holds.`
              : `Inherits everything a ${baseLabel} holds — shown on and locked. Turn on anything extra.`}
          </Text>
        ) : null}
        {errors.permissions ? (
          <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 8, marginLeft: 4, fontWeight: '500' }}>
            {errors.permissions}
          </Text>
        ) : null}
        <View style={{ borderWidth: 1, borderRadius: 8, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
            {SYSTEM_PAGES.map((page) => {
              const subs = SUB_PERMISSIONS[page.id];
              const parentChecked = isOn(page.id);
              return (
                <View key={page.id} style={{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>{page.label}</Text>
                    <Switch
                      value={parentChecked}
                      disabled={isLocked(page.id)}
                      onValueChange={(val) => handlePermissionChange(page.id, val)}
                      trackColor={{ true: primaryColor, false: '#d1d5db' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                  {subs && parentChecked ? (
                    <View style={{ marginTop: 8, paddingLeft: 12, gap: 8 }}>
                      {subs.map((sub) => (
                        <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>{sub.label}</Text>
                          <Switch
                            value={isOn(sub.id)}
                            disabled={isLocked(sub.id)}
                            onValueChange={(val) => handlePermissionChange(sub.id, val)}
                            trackColor={{ true: primaryColor, false: '#d1d5db' }}
                            thumbColor="#ffffff"
                          />
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, role }) => {
  const { colorPalette } = useModalTheme();
  const primaryColor = colorPalette?.primary || '#7c3aed';
  const isEditMode = !!role;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    role_name: '',
    description: '',
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // The seeded role this one builds on. The mobile modal does not change the
  // base — that is done from the web portal — but it must show what the base
  // grants, and leave it out of what it saves.
  const baseRoleId = Number(role?.base_role_id) || 0;
  const inheritedKeys = useMemo(() => inheritedPermissions(baseRoleId), [baseRoleId]);
  const inheritsEverything = inheritedKeys.includes(WILDCARD);
  const inherited = useMemo(() => new Set(inheritedKeys), [inheritedKeys]);

  // The editor may hand out only what they hold themselves — the server
  // refuses anything more. A key the role already had stays theirs to keep or
  // remove: only additions are checked.
  const { permissions: callerPermissions } = usePermissions();
  const originalKeys = useMemo(() => {
    if (!role) return new Set<string>();
    const own = Array.isArray(role.effective_permissions)
      ? role.effective_permissions
      : parsePermissions(role.permissions);
    return new Set([...own, ...inheritedPermissions(role.base_role_id)]);
  }, [role]);
  const canGrant = useCallback(
    (key: string) =>
      callerPermissions.includes(WILDCARD) || callerPermissions.includes(key) || originalKeys.has(key),
    [callerPermissions, originalKeys]
  );

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setFormData({
          role_name: role.role_name || '',
          description: role.description || '',
        });

        // What the role effectively holds, which for one saved before the
        // per-action keys existed includes the buttons its pages used to
        // carry. Seeding from the stored column instead showed those buttons
        // off, and the save then revoked them — every config page's Add, Edit
        // and Delete — from a screen that never displayed them.
        //
        // Falls back to the column (array, JSON or comma-separated) for a
        // server that has not sent the resolved list.
        //
        // An extra whose exclusive partner the base grants is dropped: it was
        // stored before the server refused the pair, would show locked on,
        // and would make every save fail.
        const baseKeys = new Set(inheritedPermissions(role.base_role_id));
        const own = Array.isArray(role.effective_permissions)
          ? role.effective_permissions
          : parsePermissions(role.permissions);
        setSelectedPermissions(
          own.filter((key) => !(EXCLUSIVE_PARTNER[key] && baseKeys.has(EXCLUSIVE_PARTNER[key])))
        );
      } else {
        setFormData({
          role_name: '',
          description: '',
        });
        setSelectedPermissions([]);
      }
      setErrors({});
    }
  }, [isOpen, role]);

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionChange = (pageId: string, checked: boolean) => {
    setSelectedPermissions((prev) => {
      let newPermissions = [...prev];

      if (checked) {
        if (!newPermissions.includes(pageId)) {
          newPermissions.push(pageId);
        }

        // If it's a sub-permission, auto-check the parent — unless the base
        // role already grants it.
        if (pageId.includes('.')) {
          const parentId = pageId.split('.')[0];
          if (!newPermissions.includes(parentId) && !inherited.has(parentId)) {
            newPermissions.push(parentId);
          }
        }

        // The tech-edit / admin-edit pairs are mutually exclusive.
        const partner = EXCLUSIVE_PARTNER[pageId];
        if (partner) {
          newPermissions = newPermissions.filter((id) => id !== partner);
        }
      } else {
        newPermissions = newPermissions.filter((id) => id !== pageId);

        // If it's a parent, auto-uncheck all sub-permissions
        if (!pageId.includes('.')) {
          newPermissions = newPermissions.filter((id) => !id.startsWith(pageId + '.'));
        }
      }

      return newPermissions;
    });
    if (errors.permissions) {
      setErrors((prev) => ({ ...prev, permissions: '' }));
    }
  };

  /** The extras alone: the server merges the base role's keys in on every read. */
  const extrasToSave = (): string[] =>
    inheritsEverything ? [] : selectedPermissions.filter((key) => !inherited.has(key));

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.role_name.trim()) newErrors.role_name = 'Required';
    else if (formData.role_name.trim().length > 255) newErrors.role_name = 'At most 255 characters';

    // A role holding nothing signs its users in to a page that refuses them.
    if (!baseRoleId && extrasToSave().length === 0) {
      newErrors.permissions = 'Turn on at least one permission.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // No organization_id and no base_role_id: the server files a role under
      // the caller's own organization, and a base left out is kept as it is.
      const payload: any = {
        role_name: formData.role_name.trim(),
        description: formData.description,
        permissions: extrasToSave(),
      };

      let response: ApiResponse<Role>;
      if (isEditMode && role) {
        response = await roleService.updateRole(role.id, payload);
      } else {
        response = await roleService.createRole(payload);
      }

      if (response.success && response.data) {
        onSave(response.data);
        onClose();
      } else {
        setErrors({ general: response.message || 'Something went wrong' });
      }
    } catch (error: any) {
      // What the server said, rather than "Request failed with status code
      // 422". A taken name or an invalid permission set is shown beside its
      // field; anything else in the banner.
      const body = error?.response?.data;
      const serverErrors = (body?.errors || {}) as Record<string, string[] | string>;
      const textOf = (value?: string[] | string) => (Array.isArray(value) ? value.join(' ') : value || '');
      const roleNameError = textOf(serverErrors.role_name);
      const permissionError = Object.entries(serverErrors)
        .filter(([field]) => field === 'permissions' || field.startsWith('permissions.'))
        .map(([, value]) => textOf(value))
        .join(' ');

      if (roleNameError || permissionError) {
        setErrors({
          ...(roleNameError ? { role_name: roleNameError } : {}),
          ...(permissionError ? { permissions: permissionError } : {}),
        });
      } else {
        setErrors({
          general: [body?.message, body?.error].filter(Boolean).join(' — ') || error.message || 'An unexpected error occurred',
        });
      }
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
        disabled: loading,
      }}
    >
      <RoleForm
        formData={formData}
        handleFieldChange={handleFieldChange}
        handlePermissionChange={handlePermissionChange}
        errors={errors}
        selectedPermissions={selectedPermissions}
        primaryColor={primaryColor}
        inherited={inherited}
        inheritsEverything={inheritsEverything}
        baseLabel={baseRoleLabel(baseRoleId)}
        canGrant={canGrant}
      />
    </ModalUITemplate>
  );
};

export default RoleModal;

import React, { useState, useEffect } from 'react';
import { Role, ApiResponse } from '../types/api';
import { roleService } from '../services/userService';
import ModalUITemplate, { useModalTheme } from './ui-modal/ModalUITemplate';
import { ACTIONS, labelFor, parsePermissions, permissionGroups } from '../config/permissions';

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

const RoleForm: React.FC<{
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePermissionChange: (pageId: string, checked: boolean) => void;
  errors: Record<string, string>;
  selectedPermissions: string[];
}> = ({ formData, handleInputChange, handlePermissionChange, errors, selectedPermissions }) => {
  const { isDarkMode } = useModalTheme();

  const inputClass = (error?: string) => `w-full px-4 py-2.5 rounded-lg border transition-all duration-200 outline-none focus:ring-2 focus:ring-opacity-50 
    ${isDarkMode
      ? `bg-gray-800 text-white ${error ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-700 focus:ring-blue-500/20'}`
      : `bg-white text-gray-900 ${error ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:ring-blue-500/20'}`
    }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

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

        <div>
          <label className={labelClass}>Permissions (Page Access)</label>
          <div className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`grid grid-cols-[1.5fr_80px_2fr] px-4 py-2 text-xs font-bold uppercase tracking-wider border-b ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
              <div>Page Name</div>
              <div className="text-center">Access</div>
              <div></div>
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
                    <div key={pageId} className="grid grid-cols-[1.5fr_80px_2fr] px-4 py-3 items-center transition-colors">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{labelFor(pageId)}</div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(pageId)}
                          onChange={(e) => handlePermissionChange(pageId, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-x-6">
                        {(ACTIONS[pageId] || []).map((actionId) => (
                          <div key={actionId} className="flex flex-col items-center gap-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-tight leading-none whitespace-nowrap ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {labelFor(actionId)}
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(actionId)}
                              onChange={(e) => handlePermissionChange(actionId, e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
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

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setFormData({
          role_name: role.role_name || '',
          description: role.description || '',
        });
        
        // Array from Laravel's cast, or a JSON / comma-separated string on a
        // row written before that cast existed.
        setSelectedPermissions(parsePermissions(role.permissions));
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionChange = (pageId: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      let newPermissions = [...prev];
      
      if (checked) {
        if (!newPermissions.includes(pageId)) {
          newPermissions.push(pageId);
        }
        
        // If it's a sub-permission, auto-check the parent
        if (pageId.includes('.')) {
          const parentId = pageId.split('.')[0];
          if (!newPermissions.includes(parentId)) {
            newPermissions.push(parentId);
          }
        }

        // Handle mutual exclusivity for job-order.tech-edit and job-order.admin-edit
        if (pageId === 'job-order.tech-edit') {
          newPermissions = newPermissions.filter(id => id !== 'job-order.admin-edit');
        } else if (pageId === 'job-order.admin-edit') {
          newPermissions = newPermissions.filter(id => id !== 'job-order.tech-edit');
        }

        // Handle mutual exclusivity for service-order.tech-edit and service-order.admin-edit
        if (pageId === 'service-order.tech-edit') {
          newPermissions = newPermissions.filter(id => id !== 'service-order.admin-edit');
        } else if (pageId === 'service-order.admin-edit') {
          newPermissions = newPermissions.filter(id => id !== 'service-order.tech-edit');
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
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.role_name.trim()) newErrors.role_name = 'Required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const payload = {
        role_name: formData.role_name,
        description: formData.description,
        permissions: selectedPermissions
      };

      const authData = localStorage.getItem('authData');
      const currentUser = authData ? JSON.parse(authData) : null;
      if (currentUser?.organization_id) {
        (payload as any).organization_id = currentUser.organization_id;
      }

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
      setErrors({ general: error.message || 'An unexpected error occurred' });
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
        handlePermissionChange={handlePermissionChange}
        errors={errors}
        selectedPermissions={selectedPermissions}
      />
    </ModalUITemplate>
  );
};

export default RoleModal;

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RoleModal from './RoleModal';
import { roleService } from '../services/userService';
import { settingsColorPaletteService } from '../services/settingsColorPaletteService';
import { ROLE, ROLE_PERMISSIONS } from '../config/permissions';
import { Role } from '../types/api';

/**
 * The Role modal, rendered and driven the way an administrator uses it.
 *
 * Only the network is stubbed: the save calls and the colour palette. Every
 * checkbox, the base-role picker and the payload are the real ones, so these
 * pin down what the modal sends — which the server then stores as written.
 */

jest.mock('../services/userService', () => ({
  roleService: { createRole: jest.fn(), updateRole: jest.fn() },
}));

jest.mock('../services/settingsColorPaletteService', () => ({
  settingsColorPaletteService: { getActive: jest.fn() },
}));

const createRole = roleService.createRole as jest.Mock;
const updateRole = roleService.updateRole as jest.Mock;
const getActivePalette = settingsColorPaletteService.getActive as jest.Mock;

const signInAs = (auth: object) => localStorage.setItem('authData', JSON.stringify(auth));
const SUPER_ADMIN = { role_id: ROLE.SUPER_ADMIN, permissions: ['*'] };
/** A field supervisor who also manages roles: hands out only what they hold. */
const ROLE_MANAGER = {
  role_id: 20,
  permissions: [
    ...ROLE_PERMISSIONS[ROLE.TECHNICIAN],
    'customer', 'customer.transact', 'inventory',
    'roles', 'roles.create', 'roles.edit',
  ],
};

const savedRole = (overrides: Partial<Role> = {}): Role => ({
  id: 30,
  role_name: 'Saved',
  created_at: '',
  updated_at: '',
  ...overrides,
});

const open = (role: Role | null = null) =>
  render(<RoleModal isOpen onClose={jest.fn()} onSave={jest.fn()} role={role} />);

/** The View checkbox of a page, by its accessible name. */
const viewBox = (page: string) => screen.getByRole('checkbox', { name: `${page}: View` });

/** One action's checkbox on a page, e.g. actionBox('Job Order', 'Approve'). */
const actionBox = (page: string, action: string) => screen.getByRole('checkbox', { name: `${page}: ${action}` });

const typeName = (name: string) =>
  fireEvent.change(screen.getByPlaceholderText('e.g. Administrator, Agent'), {
    target: { name: 'role_name', value: name },
  });

const chooseBase = (roleId: number) =>
  fireEvent.change(screen.getByRole('combobox'), { target: { value: String(roleId) } });

const lastPayload = (mock: jest.Mock) => mock.mock.calls[mock.mock.calls.length - 1].slice(-1)[0];

// Implementations are set here rather than in the factories above: the
// project's Jest config resets every mock before each test.
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  // Never settles. The palette only colours the modal, and a fetch resolving
  // after a test has finished only produces act() warnings.
  getActivePalette.mockImplementation(() => new Promise(() => {}));
  createRole.mockResolvedValue({ success: true, data: savedRole() });
  updateRole.mockResolvedValue({ success: true, data: savedRole() });
});

test('a role that grants nothing is refused before anything is sent', async () => {
  signInAs(SUPER_ADMIN);
  open();

  typeName('Empty');
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText(/tick at least one permission/i)).toBeInTheDocument();
  expect(createRole).not.toHaveBeenCalled();
});

test('a base is offered only when the editor could grant everything it brings', () => {
  signInAs(ROLE_MANAGER);
  const { unmount } = open();
  expect(screen.queryByRole('option', { name: 'SuperAdmin' })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Administrator' })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Technician' })).toBeInTheDocument();
  unmount();

  signInAs(SUPER_ADMIN);
  open();
  expect(screen.getByRole('option', { name: 'SuperAdmin' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Administrator' })).toBeInTheDocument();
});

test('keys the editor does not hold are locked, unless the role already had them', () => {
  signInAs(ROLE_MANAGER);
  open(
    savedRole({
      id: 12,
      role_name: 'Wide',
      base_role_id: null,
      effective_permissions: ['settings', 'inventory'],
    })
  );

  // Not the editor's to hand out.
  expect(viewBox('Plan')).toBeDisabled();
  expect(viewBox('Plan')).toHaveAttribute('title', 'You can only grant permissions you hold yourself');
  // Already the role's: may be kept or removed.
  expect(viewBox('Settings')).toBeChecked();
  expect(viewBox('Settings')).not.toBeDisabled();
  // The editor's own: free to tick.
  expect(actionBox('Customer', 'Transact')).not.toBeDisabled();
});

test('a stored extra that clashes with the base is dropped on open, so the role can be saved', async () => {
  signInAs(SUPER_ADMIN);
  open(
    savedRole({
      id: 15,
      role_name: 'Older hybrid',
      base_role_id: ROLE.TECHNICIAN,
      effective_permissions: ['job-order.admin-edit', 'inventory'],
    })
  );

  expect(actionBox('Job Order', 'Tech Edit')).toBeChecked();
  expect(actionBox('Job Order', 'Admin Edit')).not.toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1));
  expect(lastPayload(updateRole).permissions).toEqual(['inventory']);
});

test('a hybrid shows its base locked and saves only its extras, with their pages', async () => {
  signInAs(ROLE_MANAGER);
  open();

  typeName('  Tech with billing  ');
  chooseBase(ROLE.TECHNICIAN);

  // Inherited from Technician: shown ticked, cannot be unticked.
  expect(viewBox('Job Order')).toBeChecked();
  expect(viewBox('Job Order')).toBeDisabled();
  expect(actionBox('Job Order', 'Tech Edit')).toBeChecked();
  // Technician's Tech Edit rules out Admin Edit.
  expect(actionBox('Job Order', 'Admin Edit')).toBeDisabled();
  expect(actionBox('Job Order', 'Admin Edit')).not.toBeChecked();

  fireEvent.click(actionBox('Customer', 'Transact'));
  expect(viewBox('Customer')).toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(createRole).toHaveBeenCalledTimes(1));

  const payload = lastPayload(createRole);
  expect(payload.role_name).toBe('Tech with billing');
  expect(payload.base_role_id).toBe(ROLE.TECHNICIAN);
  expect([...payload.permissions].sort()).toEqual(['customer', 'customer.transact']);
  expect(payload).not.toHaveProperty('organization_id');
});

test('dropping the base keeps the page of an extra action ticked', async () => {
  signInAs(SUPER_ADMIN);
  open();

  typeName('Approver');
  chooseBase(ROLE.TECHNICIAN);
  fireEvent.click(actionBox('Job Order', 'Approve'));

  chooseBase(0);

  // Job Order came from Technician; without it, it is this role's own tick.
  expect(viewBox('Job Order')).toBeChecked();
  expect(viewBox('Job Order')).not.toBeDisabled();
  expect(actionBox('Job Order', 'Approve')).toBeChecked();
  // Technician's own keys are gone with it.
  expect(actionBox('Job Order', 'Tech Edit')).not.toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(createRole).toHaveBeenCalledTimes(1));

  const payload = lastPayload(createRole);
  expect(payload.base_role_id).toBeNull();
  expect([...payload.permissions].sort()).toEqual(['job-order', 'job-order.approve']);
});

test('switching base clears an extra the new base rules out', () => {
  signInAs(SUPER_ADMIN);
  open();

  fireEvent.click(actionBox('Job Order', 'Tech Edit'));
  expect(actionBox('Job Order', 'Tech Edit')).toBeChecked();

  // Head Technician holds Admin Edit, which Tech Edit cannot sit beside.
  chooseBase(ROLE.HEAD_TECH);

  expect(actionBox('Job Order', 'Tech Edit')).not.toBeChecked();
  expect(actionBox('Job Order', 'Tech Edit')).toBeDisabled();
  expect(actionBox('Job Order', 'Admin Edit')).toBeChecked();
});

test('editing an older role shows, and keeps, the buttons it is still granted', async () => {
  signInAs(SUPER_ADMIN);
  open(
    savedRole({
      id: 12,
      role_name: 'Plans clerk',
      base_role_id: null,
      permissions: ['plan-list'],
      effective_permissions: ['plan-list', 'plan-list.create', 'plan-list.edit', 'plan-list.delete'],
    })
  );

  expect(viewBox('Plan')).toBeChecked();
  expect(actionBox('Plan', 'Add')).toBeChecked();
  expect(actionBox('Plan', 'Edit')).toBeChecked();
  expect(actionBox('Plan', 'Delete')).toBeChecked();

  fireEvent.click(actionBox('Plan', 'Delete'));
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1));

  expect(updateRole.mock.calls[0][0]).toBe(12);
  expect([...lastPayload(updateRole).permissions].sort()).toEqual([
    'plan-list',
    'plan-list.create',
    'plan-list.edit',
  ]);
});

test('unticking a page takes its actions with it', () => {
  signInAs(SUPER_ADMIN);
  open();

  fireEvent.click(actionBox('Plan', 'Add'));
  fireEvent.click(actionBox('Plan', 'Edit'));
  expect(viewBox('Plan')).toBeChecked();

  fireEvent.click(viewBox('Plan'));

  expect(viewBox('Plan')).not.toBeChecked();
  expect(actionBox('Plan', 'Add')).not.toBeChecked();
  expect(actionBox('Plan', 'Edit')).not.toBeChecked();
});

test('a server message about a field is shown beside that field', async () => {
  signInAs(SUPER_ADMIN);
  createRole.mockRejectedValue({
    message: 'Request failed with status code 422',
    response: {
      data: {
        message: 'Validation failed',
        errors: { role_name: ['The role name has already been taken.'] },
      },
    },
  });
  open();

  typeName('Technician');
  fireEvent.click(viewBox('Inventory'));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('The role name has already been taken.')).toBeInTheDocument();
  expect(screen.queryByText('Validation failed')).not.toBeInTheDocument();
  expect(screen.queryByText(/status code 422/)).not.toBeInTheDocument();
});

test('a refusal from the server is shown in its own words', async () => {
  signInAs(ROLE_MANAGER);
  createRole.mockRejectedValue({
    message: 'Request failed with status code 403',
    response: { data: { success: false, message: 'Only a SuperAdmin can create, change or delete a role built on SuperAdmin.' } },
  });
  open();

  typeName('Shadow');
  fireEvent.click(viewBox('Inventory'));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText(/Only a SuperAdmin can create/)).toBeInTheDocument();
});

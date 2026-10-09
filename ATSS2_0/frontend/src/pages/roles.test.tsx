import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Roles from './roles';
import { roleService } from '../services/userService';
import { settingsColorPaletteService } from '../services/settingsColorPaletteService';
import { useRoleStore } from '../store/roleStore';
import { ROLE } from '../config/permissions';
import { Role } from '../types/api';

/**
 * Role Management's list, rendered against a stubbed API: which controls each
 * row offers, and what deleting a role says when the server refuses.
 */

jest.mock('../services/userService', () => ({
  roleService: { getAllRoles: jest.fn(), deleteRole: jest.fn(), createRole: jest.fn(), updateRole: jest.fn() },
}));

jest.mock('../services/settingsColorPaletteService', () => ({
  settingsColorPaletteService: { getActive: jest.fn() },
}));

const getAllRoles = roleService.getAllRoles as jest.Mock;
const deleteRole = roleService.deleteRole as jest.Mock;

const role = (id: number, role_name: string, extra: Partial<Role> = {}): Role => ({
  id,
  role_name,
  created_at: '',
  updated_at: '2026-10-01T00:00:00Z',
  users_count: 0,
  ...extra,
});

const SEEDED = [role(ROLE.ADMINISTRATOR, 'Administrator'), role(ROLE.TECHNICIAN, 'Technician')];

const signInAs = (auth: object) => localStorage.setItem('authData', JSON.stringify(auth));
const SUPER_ADMIN = { role_id: ROLE.SUPER_ADMIN, permissions: ['*'] };

/** A role's table row, by the role name it starts with. */
const rowOf = (name: string) => screen.findByRole('row', { name: new RegExp(`^${name}\\b`) });

beforeEach(() => {
  localStorage.clear();
  useRoleStore.setState({ roles: [], isLoading: false, error: null });
  (settingsColorPaletteService.getActive as jest.Mock).mockImplementation(() => new Promise(() => {}));
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  jest.spyOn(window, 'confirm').mockImplementation(() => true);
});

test('seeded roles are locked; custom ones offer exactly the controls the role holds', async () => {
  signInAs({ role_id: 20, permissions: ['roles', 'roles.edit'] });
  getAllRoles.mockResolvedValue({ success: true, data: [...SEEDED, role(12, 'Cashier')] });

  render(<Roles />);

  expect(within(await rowOf('Technician')).getByText('Locked')).toBeInTheDocument();

  const cashier = await rowOf('Cashier');
  expect(within(cashier).getByRole('button', { name: 'Edit role Cashier' })).toBeInTheDocument();
  expect(within(cashier).queryByRole('button', { name: 'Delete role Cashier' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add role' })).not.toBeInTheDocument();
});

test('a role built on SuperAdmin is locked for anybody below SuperAdmin', async () => {
  const deputy = role(13, 'Deputy', { base_role_id: ROLE.SUPER_ADMIN });
  getAllRoles.mockResolvedValue({ success: true, data: [...SEEDED, deputy] });

  signInAs({ role_id: 20, permissions: ['roles', 'roles.create', 'roles.edit', 'roles.delete'] });
  const { unmount } = render(<Roles />);
  expect(within(await rowOf('Deputy')).getByText('Locked')).toBeInTheDocument();
  unmount();

  signInAs(SUPER_ADMIN);
  render(<Roles />);
  expect(within(await rowOf('Deputy')).getByRole('button', { name: 'Edit role Deputy' })).toBeInTheDocument();
});

test('a role still held is not deleted, and nothing is sent', async () => {
  signInAs(SUPER_ADMIN);
  getAllRoles.mockResolvedValue({ success: true, data: [...SEEDED, role(12, 'Cashier', { users_count: 3 })] });

  render(<Roles />);
  fireEvent.click(within(await rowOf('Cashier')).getByRole('button', { name: 'Delete role Cashier' }));

  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('assigned to 3 users'));
  expect(window.confirm).not.toHaveBeenCalled();
  expect(deleteRole).not.toHaveBeenCalled();
});

test('a refused delete shows the server reason, and a successful one removes the row', async () => {
  signInAs(SUPER_ADMIN);
  getAllRoles.mockResolvedValue({ success: true, data: [...SEEDED, role(12, 'Cashier'), role(14, 'Auditor')] });
  deleteRole.mockRejectedValueOnce({
    message: 'Request failed with status code 403',
    response: { data: { success: false, message: 'Unauthorized. You can only delete roles within your organization.' } },
  });
  deleteRole.mockResolvedValueOnce({ success: true });

  render(<Roles />);

  fireEvent.click(within(await rowOf('Cashier')).getByRole('button', { name: 'Delete role Cashier' }));
  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith('Unauthorized. You can only delete roles within your organization.')
  );
  expect(screen.getByText('Cashier')).toBeInTheDocument();

  fireEvent.click(within(await rowOf('Auditor')).getByRole('button', { name: 'Delete role Auditor' }));
  await waitFor(() => expect(screen.queryByText('Auditor')).not.toBeInTheDocument());
  expect(deleteRole).toHaveBeenLastCalledWith(14);
});

test('searching from a later page shows the matches instead of an empty table', async () => {
  signInAs(SUPER_ADMIN);
  const many = Array.from({ length: 30 }, (_, i) => role(100 + i, `Custom ${String(i).padStart(2, '0')}`));
  getAllRoles.mockResolvedValue({ success: true, data: [...SEEDED, ...many] });

  render(<Roles />);
  await screen.findByText('Custom 00');

  fireEvent.click(screen.getByTitle('Next Page'));
  expect(await screen.findByText('Custom 29')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('Search role name...'), { target: { value: 'Technician' } });

  // The header row and the one match — not a header over an empty body.
  expect(await rowOf('Technician')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(2);
  expect(screen.queryByText('No roles found')).not.toBeInTheDocument();
});

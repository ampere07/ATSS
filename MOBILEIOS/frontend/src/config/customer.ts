/**
 * The seeded Customer role's id. Mirrors ROLE.CUSTOMER in the full mobile app's
 * config/permissions.ts and the roles table on the server.
 */
export const CUSTOMER_ROLE_ID = 3;

interface RoleLike {
  role?: string | null;
  role_id?: number | string | null;
}

/**
 * Whether an account belongs to a customer — the only kind of account this app
 * serves.
 *
 * Either field is enough, because authData can arrive with one missing: the
 * same test the full app's App.tsx and CustomerDataContext already apply.
 */
export const isCustomerAccount = (user?: RoleLike | null): boolean => {
  if (!user) return false;

  return String(user.role || '').toLowerCase() === 'customer'
    || Number(user.role_id) === CUSTOMER_ROLE_ID;
};

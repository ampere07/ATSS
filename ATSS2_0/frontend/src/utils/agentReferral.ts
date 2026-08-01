// Shared helpers for the Agent point of view: matching a job order's "Referred By"
// value to an agent account, classifying a job order's onsite status, and detecting
// agent users.
//
// Kept intentionally in sync with MOBILEAPP/frontend/src/utils/agentReferral.ts so the
// web portal and the mobile app resolve the exact same set of records for an agent.

export const AGENT_ROLE_ID = 4;

// Roles that are allowed to see every record regardless of referral ownership.
const SUPER_ROLE_IDS = ['1', '7', '8'];
const SUPER_ROLE_NAMES = ['administrator', 'superadmin', 'headtech'];

// Normalize a name for comparison: lowercase, strip punctuation (e.g. middle-initial dots),
// and collapse whitespace so " Raven  B. Ampere " => "raven b ampere".
export const normalizeName = (s?: string | null): string =>
  (s || '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();

// A job order is owned by the agent whose account name matches the Referred By value.
// Matching is tolerant of middle names / extra words: every word of the agent's
// "first_name + last_name" must appear (as a whole word) in Referred By. This covers
// values like "John Rusell Ampere" for an account named "John Ampere", while still
// rejecting unrelated names. Email exact-match is also accepted.
export const agentOwnsReferral = (referredByRaw: string, fullName: string, email: string): boolean => {
  const ref = normalizeName(referredByRaw);
  if (!ref) return false;

  const em = (email || '').toLowerCase().trim();
  if (em && ref === em) return true;

  const fn = normalizeName(fullName);
  if (!fn) return false;
  if (ref === fn) return true;

  const refTokens = new Set(ref.split(' '));
  const nameTokens = fn.split(' ').filter(t => t.length >= 2);
  return nameTokens.length > 0 && nameTokens.every(t => refTokens.has(t));
};

// Normalized onsite status of a job order.
export const getOnsiteStatus = (jo: any): string =>
  String(jo?.Onsite_Status || jo?.onsite_status || '').toLowerCase().trim();

// Active (still-in-the-field) job orders shown to agents on the Job Order page.
// Agents only see job orders that are in progress or rescheduled.
export const isActiveOnsiteStatus = (status: string): boolean =>
  status === 'inprogress' || status === 'in progress' || status === 'in-progress' ||
  status === 'reschedule' || status === 'rescheduled' || status === 're-schedule';

// Completed job orders — these count towards commissions and achievements.
export const isDoneOnsiteStatus = (status: string): boolean =>
  status === 'done' || status === 'completed';

// Job orders that did not result in an installation.
export const isFailedOnsiteStatus = (status: string): boolean =>
  status === 'failed' || status === 'cancelled' || status === 'suspended' || status === 'disapproved';

// Job orders awaiting another visit.
export const isRescheduleOnsiteStatus = (status: string): boolean =>
  status === 'reschedule' || status === 'rescheduled' || status === 're-schedule';

// Job orders that have not been visited yet.
export const isInProgressOnsiteStatus = (status: string): boolean =>
  status === 'in progress' || status === 'inprogress' || status === 'in-progress' || status === 'pending';

export const isAgentUser = (role?: string | null, roleId?: number | string | null): boolean =>
  (role || '').toLowerCase().trim() === 'agent' || String(roleId ?? '') === String(AGENT_ROLE_ID);

export const isSuperUser = (role?: string | null, roleId?: number | string | null): boolean =>
  SUPER_ROLE_NAMES.includes((role || '').toLowerCase().trim()) ||
  SUPER_ROLE_IDS.includes(String(roleId ?? ''));

export interface AgentIdentity {
  id: number | null;
  fullName: string;
  email: string;
  username: string;
  role: string;
  roleId: number | string | null;
  isAgent: boolean;
}

// Reads the logged-in user out of localStorage. Mirrors the mobile app, which reads the
// same payload out of AsyncStorage.
export const getStoredAgentIdentity = (): AgentIdentity => {
  const empty: AgentIdentity = {
    id: null, fullName: '', email: '', username: '', role: '', roleId: null, isAgent: false
  };

  try {
    const raw = localStorage.getItem('authData');
    if (!raw) return empty;

    const user = JSON.parse(raw);

    // The login payload exposes full_name; fall back to the name parts for older sessions.
    const fullName: string = user.full_name || [
      user.first_name,
      user.middle_initial ? `${String(user.middle_initial).trim()}.` : '',
      user.last_name
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    return {
      id: user.id ?? user.user_id ?? null,
      fullName,
      email: user.email || user.email_address || '',
      username: user.username || '',
      role: user.role || '',
      roleId: user.role_id ?? null,
      isAgent: isAgentUser(user.role, user.role_id)
    };
  } catch (err) {
    console.error('[agentReferral] Failed to parse auth data:', err);
    return empty;
  }
};

// Number of onboarded referrals required per achievement milestone, and the reward paid out.
export const ACHIEVEMENT_TARGET = 30;
export const ACHIEVEMENT_REWARD = 1500;

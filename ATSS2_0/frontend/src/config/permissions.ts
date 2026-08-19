// The client's copy of the permission table.
//
// The server is the authority — every endpoint is checked against
// backend/app/Support/ApiPermissionMap.php whatever this file says. This
// exists so the UI can decide what to *draw* without waiting on a round trip:
// which menu entries to list, which page to open, which buttons to render.
//
// Kept deliberately in step with backend/app/Support/Permissions.php. The
// backend file is the one to change first; this mirrors it.

/** Held by SuperAdmin alone. Matches any key, including ones added later. */
export const WILDCARD = '*';

/** The seeded roles. Anything above 8 is a custom role with its own list. */
export const ROLE = {
  ADMINISTRATOR: 1,
  TECHNICIAN: 2,
  CUSTOMER: 3,
  AGENT: 4,
  INVENTORY_STAFF: 5,
  OSP: 6,
  SUPER_ADMIN: 7,
  HEAD_TECH: 8,
} as const;

export const LOCKED_ROLE_IDS: number[] = Object.values(ROLE);

/**
 * Role names as they come back from the API (lowercased role_name), mapped onto
 * their ids.
 *
 * Both are carried in authData and either can be missing or stale, so every
 * lookup tries the id first and falls back to the name.
 */
const ROLE_NAME_TO_ID: Record<string, number> = {
  administrator: ROLE.ADMINISTRATOR,
  admin: ROLE.ADMINISTRATOR,
  technician: ROLE.TECHNICIAN,
  customer: ROLE.CUSTOMER,
  agent: ROLE.AGENT,
  inventorystaff: ROLE.INVENTORY_STAFF,
  osp: ROLE.OSP,
  superadmin: ROLE.SUPER_ADMIN,
  headtech: ROLE.HEAD_TECH,
};

/** Every page key, in the order the Role modal lists them. */
export const PAGES = [
  'dashboard',
  'agent-dashboard',
  'customer-dashboard',
  'customer-bills',
  'customer-support',
  'agent-application',

  'live-monitor',

  'customer',
  'transaction-list',
  'transactions-revert',
  'payment-portal',
  'soa',
  'invoice',
  'overdue',
  'so-charge',
  'dc-notice',
  'mass-rebate',
  'staggered-payment',
  'discounts',

  'application-management',
  'job-order',
  'service-order',
  'work-order',
  'lcp-nap-location',
  'sms-blast',
  'reports',
  'support',

  'commission',
  'agent-invoices',
  'agent-payout',
  'agent-management',
  'team-agent',

  'inventory',
  'inventory-category-list',

  'promo-list',
  'plan-list',
  'location-list',
  'lcp',
  'nap',
  'ports',
  'router-models',
  'status-remarks-list',
  'usage-type',
  'vlan-config',
  'payment-method',
  'work-category',
  'radius-config',
  'smart-olt',
  'sms-config',
  'sms-template',
  'email-templates',
  'pppoe-setup',
  'concern-config',
  'billing-config',

  'user-management',
  'tech-users',
  'organization',
  'roles',
  'group-management',

  'disconnected-logs',
  'reconnection-logs',
  'sms-logs',
  'sms-blast-logs',
  'email-logs',
  'data-logs',
  'expenses-log',
  'smart-olt-logs',
  'radius-logs',
  'radius-queue',
  'system-logs',

  'soa-generation',
  'settings',
] as const;

/** The button-level keys, grouped by the page that owns them. */
export const ACTIONS: Record<string, string[]> = {
  'job-order': [
    'job-order.approve',
    'job-order.failed',
    'job-order.tech-edit',
    'job-order.admin-edit',
    'job-order.attachment',
  ],
  customer: [
    'customer.so-request',
    'customer.details-edit',
    'customer.attachment',
    'customer.transact',
  ],
  'transaction-list': [
    'transaction-list.batch-approve',
    'transaction-list.approve',
    'transaction-list.revert-request',
  ],
  'mass-rebate': ['mass-rebate.add'],
  'staggered-payment': ['staggered-payment.add'],
  discounts: ['discounts.add'],
  'application-management': [
    'application-management.move-to-jo',
    'application-management.quick-status',
  ],
  'service-order': ['service-order.tech-edit', 'service-order.admin-edit'],
  // Raising, reassigning or deleting a work order, as opposed to working
  // the ones already assigned to you. An agent has the page but not this.
  'work-order': ['work-order.manage'],
  // Scheduling and issuing reports, kept apart from deleting one: a report is a
  // scheduled job other people rely on receiving.
  reports: ['reports.manage', 'reports.delete'],
  // Raising a payout, incentive or bonus, and signing one off.
  commission: ['commission.payout'],
  'agent-payout': ['agent-payout.approve'],
  // Issuing the weekly referral invoices, and marking one settled. An agent
  // reads their own; neither of these is theirs.
  'agent-invoices': ['agent-invoices.generate', 'agent-invoices.status'],
  // List pages whose add/edit/delete controls were open to anyone who could
  // open the page.
  ports: ['ports.manage'],
  'router-models': ['router-models.manage'],
  'status-remarks-list': ['status-remarks-list.manage'],
  'soa-generation': ['soa-generation.manage'],
};

/** Every valid key. */
export const ALL_PERMISSIONS: string[] = [
  ...PAGES,
  ...Object.values(ACTIONS).flat(),
];

/**
 * How each key is written in Role Management.
 *
 * The Role modal renders from this rather than from a list of its own, so a
 * page added to PAGES above becomes grantable without a second edit — which is
 * how pages added since the modal was written (Reports, the Agent pages, Data
 * Logs, Monitoring) came to be ungrantable to a custom role.
 */
export const PERMISSION_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'agent-dashboard': 'Agent Dashboard',
  'customer-dashboard': 'Customer Portal',
  'customer-bills': 'Customer Bills',
  'customer-support': 'Customer Support',
  'agent-application': 'Agent Application Form',
  'live-monitor': 'Monitoring',
  'customer': 'Customer',
  'transaction-list': 'Transaction List',
  'transactions-revert': 'Revert Requests',
  'payment-portal': 'Payment Portal',
  'soa': 'Statements',
  'invoice': 'Invoice',
  'overdue': 'Overdue',
  'so-charge': 'SO Charge',
  'dc-notice': 'DC Notice',
  'mass-rebate': 'Rebates',
  'staggered-payment': 'Staggered',
  'discounts': 'Discounts',
  'application-management': 'Application',
  'job-order': 'Job Order',
  'service-order': 'Service Order',
  'work-order': 'Work Order',
  'lcp-nap-location': 'LCP/NAP Location',
  'sms-blast': 'SMS Blast',
  'reports': 'Reports',
  'support': 'Support',
  'commission': 'Pay Out/In',
  'agent-invoices': 'Agent Invoices',
  'agent-payout': 'Agent Payout',
  'agent-management': 'Agent Management',
  'team-agent': 'Team Agents',
  'inventory': 'Inventory',
  'inventory-category-list': 'Inventory Category List',
  'promo-list': 'Promo',
  'plan-list': 'Plan',
  'location-list': 'Location',
  'lcp': 'LCP',
  'nap': 'NAP',
  'ports': 'Ports',
  'router-models': 'Router Models',
  'status-remarks-list': 'Status Remarks',
  'usage-type': 'Usage Type',
  'vlan-config': 'VLAN Config',
  'payment-method': 'Payment Method',
  'work-category': 'Work Category',
  'radius-config': 'Radius Config',
  'smart-olt': 'SmartOLT Config',
  'sms-config': 'SMS Config',
  'sms-template': 'SMS Template',
  'email-templates': 'Email Templates',
  'pppoe-setup': 'PPPoE Setup',
  'concern-config': 'Concern Config',
  'billing-config': 'Billing Configurations',
  'user-management': 'Users Management',
  'tech-users': 'Tech Users',
  'organization': 'Organization',
  'roles': 'Roles Management',
  'group-management': 'Group Management',
  'disconnected-logs': 'Disconnected Logs',
  'reconnection-logs': 'Reconnection Logs',
  'sms-logs': 'SMS Logs',
  'sms-blast-logs': 'SMS Blast Logs',
  'email-logs': 'Email Logs',
  'data-logs': 'Data Logs',
  'expenses-log': 'Expenses Log',
  'smart-olt-logs': 'Smart OLT Logs',
  'radius-logs': 'Radius Logs',
  'radius-queue': 'Radius Queue',
  'system-logs': 'System Logs',
  'soa-generation': 'SOA Generation',
  'settings': 'Settings',

  // Sub actions, labelled as the button reads.
  'job-order.approve': 'Approve',
  'job-order.failed': 'Failed',
  'job-order.tech-edit': 'Tech Edit',
  'job-order.admin-edit': 'Admin Edit',
  'job-order.attachment': 'Attachment',
  'customer.so-request': 'SO Request',
  'customer.details-edit': 'Details Edit',
  'customer.attachment': 'Attachment',
  'customer.transact': 'Transact',
  'transaction-list.batch-approve': 'Batch Approve',
  'transaction-list.approve': 'Approve',
  'transaction-list.revert-request': 'Revert Request',
  'mass-rebate.add': 'Add Rebate',
  'staggered-payment.add': 'Add Staggered',
  'discounts.add': 'Add Discount',
  'application-management.move-to-jo': 'Move to JO',
  'application-management.quick-status': 'Quick Status',
  'service-order.tech-edit': 'Tech Edit',
  'service-order.admin-edit': 'Admin Edit',
  'work-order.manage': 'Manage',
  'reports.manage': 'Manage',
  'reports.delete': 'Delete',
  'commission.payout': 'Payout',
  'agent-payout.approve': 'Approve',
  'agent-invoices.generate': 'Generate',
  'agent-invoices.status': 'Set Status',
  'ports.manage': 'Manage',
  'router-models.manage': 'Manage',
  'status-remarks-list.manage': 'Manage',
  'soa-generation.manage': 'Manage',
};

export const labelFor = (key: string): string => PERMISSION_LABELS[key] ?? key;

/**
 * The order and grouping Role Management presents the pages in.
 *
 * Any page not named in a group is appended to "Other", so a page added to
 * PAGES is always grantable even if nobody remembers to file it here.
 */
export const PERMISSION_GROUPS: Array<{ label: string; pages: string[] }> = [
  { label: 'Dashboards', pages: ['dashboard', 'agent-dashboard', 'live-monitor', 'support'] },
  {
    label: 'Billing',
    pages: [
      'customer', 'transaction-list', 'transactions-revert', 'payment-portal',
      'soa', 'invoice', 'overdue', 'so-charge', 'dc-notice', 'mass-rebate',
      'staggered-payment', 'discounts', 'soa-generation',
    ],
  },
  {
    label: 'Operations',
    pages: [
      'application-management', 'job-order', 'service-order', 'radius-queue',
      'work-order', 'lcp-nap-location', 'sms-blast', 'reports',
    ],
  },
  {
    label: 'Agent',
    pages: ['commission', 'agent-invoices', 'agent-payout', 'agent-management', 'team-agent'],
  },
  { label: 'Inventory', pages: ['inventory', 'inventory-category-list'] },
  {
    label: 'Configurations',
    pages: [
      'promo-list', 'plan-list', 'location-list', 'lcp', 'nap', 'ports',
      'router-models', 'status-remarks-list', 'usage-type', 'vlan-config',
      'payment-method', 'work-category', 'radius-config', 'smart-olt',
      'sms-config', 'sms-template', 'email-templates', 'pppoe-setup',
      'concern-config', 'billing-config',
    ],
  },
  {
    label: 'Users',
    pages: ['user-management', 'tech-users', 'organization', 'roles', 'group-management'],
  },
  {
    label: 'Logs',
    pages: [
      'disconnected-logs', 'reconnection-logs', 'sms-logs', 'sms-blast-logs',
      'email-logs', 'data-logs', 'expenses-log', 'smart-olt-logs',
      'radius-logs', 'system-logs',
    ],
  },
  { label: 'Customer Portal', pages: ['customer-dashboard', 'customer-bills', 'customer-support', 'agent-application'] },
  { label: 'Settings', pages: ['settings'] },
];

/** The groups, with any unfiled page swept into a final "Other". */
export const permissionGroups = (): Array<{ label: string; pages: string[] }> => {
  const filed = new Set(PERMISSION_GROUPS.flatMap(group => group.pages));
  const unfiled = PAGES.filter(page => !filed.has(page));

  return unfiled.length > 0
    ? [...PERMISSION_GROUPS, { label: 'Other', pages: unfiled as unknown as string[] }]
    : PERMISSION_GROUPS;
};

/**
 * What each seeded role holds.
 *
 * This reproduces the access the sidebar's allowedRoles tables already granted,
 * with one deliberate change: the technician and head technician now hold their
 * edit keys. Sub-permissions were only ever read from a custom role's array,
 * which a locked role has none of, so a technician's Done button resolved to
 * "no permission" and did nothing at all.
 */
export const ROLE_PERMISSIONS: Record<number, string[]> = {
  [ROLE.SUPER_ADMIN]: [WILDCARD],

  [ROLE.ADMINISTRATOR]: [
    'dashboard',
    'live-monitor',
    'customer',
    'customer.so-request', 'customer.details-edit', 'customer.attachment', 'customer.transact',
    'transaction-list',
    'transaction-list.batch-approve', 'transaction-list.approve', 'transaction-list.revert-request',
    'transactions-revert',
    'payment-portal',
    'soa',
    'invoice',
    'overdue',
    'so-charge',
    'dc-notice',
    'mass-rebate', 'mass-rebate.add',
    'staggered-payment', 'staggered-payment.add',
    'discounts', 'discounts.add',
    'application-management',
    'application-management.move-to-jo', 'application-management.quick-status',
    'job-order',
    'job-order.approve', 'job-order.failed', 'job-order.admin-edit', 'job-order.attachment',
    'service-order', 'service-order.admin-edit',
    'work-order', 'work-order.manage',
    'lcp-nap-location',
    'sms-blast',
    'reports', 'reports.manage',
    'support',
    'commission', 'commission.payout',
    'team-agent',
    'agent-management',
    'agent-payout', 'agent-payout.approve',
    'agent-invoices', 'agent-invoices.generate', 'agent-invoices.status',
    'inventory',
    'inventory-category-list',
    'disconnected-logs',
    'reconnection-logs',
    'sms-logs',
    'sms-blast-logs',
    'email-logs',
    'data-logs',
    'expenses-log',
    // The RADIUS retry queue. Read-only, and an operational screen rather than
    // a configuration one.
    'radius-queue',
    // Tools suite. Every one of these mutates live state — subscriber ONUs,
    // RADIUS accounts, posted payments — so they are granted deliberately
    // rather than inherited from a group.
    'smartolt-tool',
    'mikrotik-radius-tool',
    'xendit-reconcile-tool',
  ],

  [ROLE.TECHNICIAN]: [
    'job-order',
    'job-order.tech-edit',
    'job-order.attachment',
    'service-order',
    'service-order.tech-edit',
    // Work orders are a technician's work too. The web sidebar never listed the
    // page for them, but the page itself has always had technician-specific
    // behaviour — the queue ordering and the lock in
    // utils/technicianWorkOrderAccess.ts, enforced server side by
    // WorkOrderApiController::isWorkOrderLockedForTechnician(). The mobile app
    // did list it. The omission was the sidebar's.
    'work-order', 'work-order.manage',
    'lcp-nap-location',
  ],

  [ROLE.CUSTOMER]: [
    'customer-dashboard',
    'customer-bills',
    'customer-support',
  ],

  [ROLE.AGENT]: [
    'agent-dashboard',
    'agent-application',
    'job-order',
    'work-order',
    'commission',
    'agent-invoices',
  ],

  [ROLE.INVENTORY_STAFF]: [
    'inventory',
    'inventory-category-list',
  ],

  [ROLE.OSP]: [
    'work-order', 'work-order.manage',
    'lcp-nap-location',
  ],

  [ROLE.HEAD_TECH]: [
    'application-management',
    'application-management.move-to-jo', 'application-management.quick-status',
    'job-order',
    'job-order.approve', 'job-order.failed', 'job-order.admin-edit', 'job-order.attachment',
    'service-order', 'service-order.admin-edit',
    'work-order', 'work-order.manage',
    'lcp-nap-location',
    'location-list',
    'lcp',
    'nap',
    // The two network tools. Xendit Reconciliation is deliberately NOT here:
    // it settles real money against real accounts, which is an Administrator
    // and SuperAdmin concern rather than a field-operations one.
    'smartolt-tool',
    'mikrotik-radius-tool',
  ],
};

/** Where each seeded role lands after signing in. */
export const ROLE_HOME: Record<number, string> = {
  [ROLE.SUPER_ADMIN]: 'dashboard',
  [ROLE.ADMINISTRATOR]: 'dashboard',
  [ROLE.TECHNICIAN]: 'job-order',
  [ROLE.CUSTOMER]: 'customer-dashboard',
  [ROLE.AGENT]: 'agent-dashboard',
  [ROLE.INVENTORY_STAFF]: 'inventory',
  [ROLE.OSP]: 'work-order',
  [ROLE.HEAD_TECH]: 'application-management',
};

/**
 * What a section of the app requires to be opened.
 *
 * Section ids and permission keys are the same strings by design — the sidebar
 * item id, the Dashboard switch case and the Role modal checkbox all use one
 * name — so a section needs an entry here only when it does not follow that
 * rule. Everything else is checked against its own id.
 */
export const SECTION_PERMISSION_OVERRIDES: Record<string, string | string[]> = {
  // The default case: which dashboard renders depends on the role, so any of
  // the three landing keys may open it.
  dashboard: ['dashboard', 'agent-dashboard', 'customer-dashboard'],
};

/** The key(s) a section requires. */
export const permissionForSection = (section: string): string | string[] =>
  SECTION_PERMISSION_OVERRIDES[section] ?? section;

/** The shape this module reads out of localStorage's authData. */
export interface AuthLike {
  role?: string | null;
  role_id?: number | string | null;
  permissions?: string[] | string | null;
  home?: string | null;
}

/** Resolve a role id from whichever of id/name the caller has. */
export const roleIdOf = (auth?: AuthLike | null): number => {
  if (!auth) return 0;

  const fromId = Number(auth.role_id);
  if (Number.isFinite(fromId) && fromId > 0) return fromId;

  const name = (auth.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  return ROLE_NAME_TO_ID[name] ?? 0;
};

export const isLockedRole = (roleId: number): boolean => LOCKED_ROLE_IDS.includes(roleId);

/**
 * Parse the permissions field.
 *
 * Rows written before the model cast existed hold a JSON string or a
 * comma-separated list, so all three shapes are accepted — the same three the
 * server accepts.
 */
export const parsePermissions = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }

  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // Not JSON — fall through to the comma-separated reading.
    }
    return raw.split(',').map(p => p.trim()).filter(Boolean);
  }

  return [];
};

/**
 * The keys a user effectively holds.
 *
 * A seeded role is answered from the table above, so it does not depend on the
 * server having sent a list. A custom role uses the list it was sent, which is
 * the only place that information exists. Either way the result also contains
 * the parent page of every sub action, matching the server.
 */
export const permissionsFor = (auth?: AuthLike | null): string[] => {
  if (!auth) return [];

  const roleId = roleIdOf(auth);

  if (roleId === ROLE.SUPER_ADMIN) return [WILDCARD];

  const keys = isLockedRole(roleId)
    ? ROLE_PERMISSIONS[roleId] ?? []
    : parsePermissions(auth.permissions);

  const withParents = [...keys];
  keys.forEach(key => {
    if (key.includes('.')) {
      const parent = key.split('.')[0];
      if (!withParents.includes(parent)) withParents.push(parent);
    }
  });

  return Array.from(new Set(withParents));
};

/**
 * Does this set of keys satisfy the requirement?
 *
 * `required` may be one key or several, in which case holding any one is
 * enough. An empty requirement means "no permission needed".
 */
export const permissionsAllow = (held: string[], required?: string | string[] | null): boolean => {
  if (!required || (Array.isArray(required) && required.length === 0)) return true;
  if (held.includes(WILDCARD)) return true;

  return (Array.isArray(required) ? required : [required]).some(key => held.includes(key));
};

/** Where to send this user when they sign in, or when the section they asked for is not theirs. */
export const homeSectionFor = (auth?: AuthLike | null): string => {
  if (!auth) return 'dashboard';

  const roleId = roleIdOf(auth);
  const declared = auth.home;

  if (declared && permissionsAllow(permissionsFor(auth), declared)) return declared;
  if (ROLE_HOME[roleId]) return ROLE_HOME[roleId];

  // A custom role: the first page it was granted, preferring a real page over a
  // sub action so it does not land on something like "job-order.approve".
  const held = permissionsFor(auth).filter(key => !key.includes('.'));
  return held[0] ?? 'dashboard';
};

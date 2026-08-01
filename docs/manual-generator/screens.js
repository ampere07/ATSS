/**
 * Per-screen walkthrough generator.
 *
 * Purposes are curated; every step, control, filter and column is driven by what the
 * extractor actually found in that screen, so the manual never claims a control the
 * screen does not have.
 */

/* ── what each screen is for ─────────────────────────────────────────────── */
const PURPOSE = {
  // Operations
  'dashboard': 'Operational overview for the office — headline counts and recent activity across applications, orders and billing.',
  'agent-dashboard': 'An agent\'s own landing screen: their four earnings balances, referral counts, the onboarding milestone, and a shortcut into the application form.',
  'customer-dashboard': 'A customer\'s own landing screen: amount due, account and plan details, and the button to pay.',
  'live-monitor': 'Live view of field activity, including technician locations, for supervising work as it happens.',
  'application-management': 'The intake queue. Every enquiry lands here and is triaged from here into a scheduled installation.',
  'job-order': 'Installations for new connections: scheduling, assignment, the technician\'s record of the visit, and approval into billing.',
  'service-order': 'Work on existing customers — relocations, plan changes, faults — following the same shape as a job order.',
  'work-order': 'Internal and outside-plant work that is not tied to one customer account.',
  'lcp-nap-location': 'Map of the outside plant: where each LCP and NAP sits, and what is served from it.',
  'reports': 'Generated reports over the operational and billing data.',
  'sms-blast': 'Send a message to many customers at once, and review what was sent.',
  'support': 'Concerns raised by customers, and their handling.',
  'customer-support': 'Where a customer raises a concern and follows its progress.',

  // Billing
  'customer': 'The customer master list — accounts, plans, balances and the billing details behind them.',
  'customer-bills': 'A customer\'s own statements, invoices and payment history.',
  'transaction-list': 'Every payment recorded against an account, however it was taken.',
  'transactions-revert': 'Requests to reverse a mistaken transaction, waiting for an administrator to approve or refuse.',
  'payment-portal': 'Payments taken through the online portal, and the state of each attempt.',
  'soa': 'Statements of account: generation for a period and the statements produced.',
  'soa-generation': 'The run that produces statements of account for a billing period.',
  'invoice': 'Invoices raised against statements.',
  'overdue': 'Accounts past their due date, for follow-up before disconnection.',
  'so-charge': 'Charges arising from service orders, passed through to billing.',
  'dc-notice': 'Disconnection notices issued to overdue accounts.',
  'mass-rebate': 'Credits applied across many accounts at once, typically after an outage.',
  'staggered-payment': 'Instalment arrangements for customers settling a balance over time.',
  'discounts': 'Discounts available and where they have been applied.',
  'billing': 'Consolidated billing list across accounts.',
  'bills': 'Statements, invoices and payments for one account.',

  // Agent
  'commission': 'Agent earnings. For the office, the place payouts are created; for an agent, their own read-only history of commission, incentives and bonus.',
  'team-agent': 'Agent teams and who belongs to them.',
  'agent-management': 'Agent accounts, including each one\'s commission rate.',
  'agent-payout': 'Payout runs to agents.',

  // Inventory
  'inventory': 'Stock on hand: items, their quantities and their movements.',
  'inventory-category-list': 'The categories that group inventory items.',

  // Configuration
  'promo-list': 'Promotions offered to applicants and customers.',
  'plan-list': 'The service plans customers can be sold, with their prices.',
  'location-list': 'The region, city, barangay and village hierarchy used by every address field.',
  'lcp': 'Local convergence points — the cabinets that fibre is distributed from.',
  'nap': 'Network access points hanging off each LCP, and their ports.',
  'usage-type': 'Usage classifications applied to a connection.',
  'vlan-config': 'VLAN allocations used when provisioning a connection.',
  'payment-method': 'The payment methods that can be recorded against a transaction.',
  'work-category': 'The categories a work order can be filed under.',
  'radius-config': 'Connection to the RADIUS server that authenticates subscriber sessions.',
  'smart-olt': 'Connection to SmartOLT, used to provision and monitor optical terminals.',
  'sms-config': 'Credentials and settings for the SMS gateway.',
  'sms-template': 'Reusable message templates for SMS.',
  'email-templates': 'Reusable templates for outgoing e-mail.',
  'pppoe-setup': 'PPPoE settings applied when a subscriber account is provisioned.',
  'concern-config': 'The concern types a customer can choose when raising support.',
  'billing-config': 'Billing rules: cycles, due dates, charges and how statements are produced.',
  'status-remarks-list': 'The standard remarks that can be attached to a status change.',
  'router-models': 'Router models issued to customers.',
  'ports': 'Individual ports on each NAP and what occupies them.',

  // Users
  'user-management': 'Staff accounts: who exists, their role and their organisation.',
  'tech-users': 'Technician accounts and their field assignments.',
  'organization': 'Organisations, where one deployment serves more than one operator.',
  'roles': 'Roles and, for custom roles, the sections each may open.',
  'group-management': 'Affiliate groupings used for reporting and commission.',

  // Logs
  'disconnected-logs': 'A record of every disconnection.',
  'reconnection-logs': 'A record of every reconnection.',
  'sms-logs': 'Every SMS the system sent, and whether it was delivered.',
  'sms-blast-logs': 'The result of each bulk SMS run.',
  'email-logs': 'Every e-mail the system sent.',
  'data-logs': 'An audit trail of changes made to records, and by whom.',
  'smart-olt-logs': 'Raw log output from the SmartOLT integration.',
  'radius-logs': 'Raw log output from the RADIUS integration.',
  'system-logs': 'Application-level system log.',
  'expenses-log': 'Operational expenses recorded against the business.',
  'file-log-viewer': 'Raw log files from an integration, read from disk.',
  'activity-logs': 'Application-level system log.',

  // System
  'settings': 'System-wide appearance and behaviour, including the colour palette and image sizes.',
  'menu': 'Your profile and account actions, and for administrators the full configuration tree.',
  'release-notes': 'What changed in each release, filtered to what matters for your role.',
  'database-setup': 'Database preparation and maintenance tasks.',
  'database-test': 'Connection and integrity checks against the database.',
  'applicationVisit': 'Survey visits confirming an address can be served, and on what facility.',
  'application-visit': 'Survey visits confirming an address can be served, and on what facility.',
  'achievement': 'Progress against the onboarding milestone and the rewards claimed.',
  'agent-history': 'An agent\'s completed referrals and whether each commission has been collected.',
  'rebate': 'Credits applied across many accounts at once.',
  'so-charges': 'Charges arising from service orders.',
  'disconnection-logs': 'A record of every disconnection.',
  'organizations': 'Organisations, where one deployment serves more than one operator.',
  'inventory-logs': 'Movements in and out of stock.',
};

/* ── what each named control does ────────────────────────────────────────── */
const BUTTON_HELP = {
  'add': 'Opens the form to create a new record.',
  'add record': 'Opens the form to create a new record.',
  'save': 'Writes your changes and closes the form.',
  'cancel': 'Closes without keeping the changes.',
  'edit': 'Opens the record for changes.',
  'delete': 'Removes the record, after a confirmation.',
  'export to csv': 'Downloads what you are currently viewing as a spreadsheet — the filtered rows and visible columns only.',
  'export to pdf': 'Downloads what you are currently viewing as a PDF.',
  'column visibility': 'Choose which columns the table shows. Your choice is remembered for this screen.',
  'card': 'Switches the list to card view.',
  'table': 'Switches the list to table view, which adds the column controls.',
  'first page': 'Jumps to the first page of results.',
  'last page': 'Jumps to the last page of results.',
  'refresh list': 'Fetches the latest records now.',
  'refresh': 'Fetches the latest records now.',
  'back to filters': 'On a phone, returns to the filter panel.',
  'back to status filters': 'On a phone, returns to the status panel.',
  'date filters': 'Opens the From and To date boxes.',
  'approve': 'Accepts the completed visit and moves the record into billing.',
  'failed': 'Closes the record as not installed.',
  'done': 'Records the visit as complete.',
  'yes': 'Confirms the action.',
  'no': 'Dismisses without acting.',
  'logout': 'Signs you out and clears the cached lists.',
  'sign in': 'Submits your credentials.',
  'submit': 'Sends the completed form.',
  'upload file': 'Attaches a file. On a phone this opens the camera so you can photograph the document.',
  'generate new question': 'Replaces the anti-spam sum with a different one.',
  'new commission payout': 'Opens the payout form for a commission payment.',
  'add work order': 'Raises a new work order and assigns it.',
  'open application form': 'Opens the blank application form.',
  'original layout': 'Shows the public form as one long page.',
  'multi-step layout': 'Shows the public form as a three-step wizard.',
  'single-page form': 'Shows the public form as one long page.',
  'step-by-step form': 'Shows the public form as a three-step wizard.',
  'all job orders': 'Clears the status tile filter.',
  'all customers': 'Clears the status tile filter.',
  'all applications': 'Clears the status tile filter.',
  'view records': 'On a phone, leaves the filter panel and shows the list.',
  'get my location': 'Drops the map pin at the device position.',
  'confirm location': 'Accepts the pinned point, provided it falls inside the service area.',
};

const PREFIX_HELP = [
  [/^add\b/i,      (l) => `Opens the form to create a new ${tail(l, 'add')}.`],
  [/^new\b/i,      (l) => `Opens the form to create a new ${tail(l, 'new')}.`],
  [/^create\b/i,   (l) => `Creates a new ${tail(l, 'create')}.`],
  [/^edit\b/i,     (l) => `Opens the ${tail(l, 'edit')} for changes.`],
  [/^delete\b/i,   (l) => `Removes the ${tail(l, 'delete')}, after a confirmation.`],
  [/^remove\b/i,   (l) => `Removes the ${tail(l, 'remove')}.`],
  [/^generate\b/i, (l) => `Runs the ${tail(l, 'generate')} generation.`],
  [/^export\b/i,   () => 'Downloads what you are currently viewing.'],
  [/^import\b/i,   () => 'Loads records in from a file.'],
  [/^assign\b/i,   (l) => `Assigns the ${tail(l, 'assign')}.`],
  [/^view\b/i,     (l) => `Opens the ${tail(l, 'view')}.`],
  [/^send\b/i,     (l) => `Sends the ${tail(l, 'send')}.`],
  [/ing\.\.\.$|ing$/i, () => 'Shown while the action is in progress.'],
];

function tail(label, word) {
  const t = label.replace(new RegExp(`^${word}\\s*`, 'i'), '').trim();
  return t ? t.toLowerCase() : 'record';
}

function helpFor(label) {
  const k = label.toLowerCase().replace(/\.\.\.$/, '').trim();
  if (BUTTON_HELP[k]) return BUTTON_HELP[k];
  for (const [re, fn] of PREFIX_HELP) if (re.test(k)) return fn(k);
  return 'Acts on the current screen or selection.';
}

/* ── standard icon controls, described only when the screen has them ─────── */
const ICON_CONTROLS = [
  ['search',     'Search box',        'Matches your text against every visible value in the row. Case and spaces are ignored.'],
  ['funnel',     'Funnel icon',       'Opens the field-by-field filter panel. Turns coloured while any filter is active.'],
  ['refresh',    'Refresh icon',      'Fetches the latest records now.'],
  ['viewToggle', 'View switch',       'Swaps between card and table layout.'],
  ['columns',    'Column settings',   'Tick which columns the table shows.'],
  ['export',     'Download icon',     'Exports the rows you are currently viewing.'],
  ['detail',     'Row',               'Click a row to open its detail panel.'],
  ['detail',     'Chevrons in panel', 'Step to the previous or next record without closing the panel.'],
  ['paging',     'Paging controls',   'First, previous, next and last, with a "showing X to Y of Z" readout.'],
  ['pageSize',   'Rows per page',     'Changes how many rows a page holds. Returns you to page one.'],
  ['dateRange',  'From and To dates', 'Bounds the list by date.'],
  ['attachments','Paperclip',         'Opens the attachments for this record.'],
];

/* ── step-by-step, assembled from the capabilities found ─────────────────── */
function stepsFor(entry, opts) {
  const c = new Set(entry ? entry.caps : []);
  const s = [];
  s.push(`Open ${opts.path}.`);

  if (c.has('org')) {
    s.push('The list loads showing only records that belong to your organisation.');
  } else {
    s.push('The list loads.');
  }
  if (c.has('realtime')) {
    s.push('The screen then keeps itself current — records created or changed by other users '
         + 'appear without you reloading.');
  }
  if (c.has('statusTiles')) {
    s.push('Narrow to a single status by pressing one of the status tiles. The counts on the tiles '
         + 'reflect what your search and filters have already narrowed down. Press the "All" tile '
         + 'to clear it again.');
  }
  if (c.has('search')) {
    s.push('Type into the search box to narrow the list. It matches across every visible value, '
         + 'ignoring case and spaces.');
  }
  if (c.has('funnel')) {
    s.push(opts.filterFields
      ? `Press the funnel icon for field-by-field filtering. ${opts.filterFields} fields are `
        + 'available; they are listed under Filters below, and they combine with AND.'
      : 'Press the funnel icon for field-by-field filtering. Filters combine with AND.');
  }
  if (c.has('dateRange')) s.push('Set the From and To dates to bound the list by date.');
  if (c.has('viewToggle')) {
    s.push('Switch between card and table view. Table view adds the column controls.');
  }
  if (c.has('columns') || c.has('sort')) {
    const bits = [];
    if (c.has('columns')) bits.push('choose which columns to show');
    if (c.has('reorder')) bits.push('drag a heading to reorder');
    if (c.has('resize')) bits.push('drag a divider to resize');
    if (c.has('sort')) bits.push('click a heading to sort, and again to reverse it');
    s.push(`In table view you can ${bits.join(', ')}. Your layout is remembered for this screen.`);
  }
  if (c.has('create') && opts.createLabel) {
    s.push(`Press ${opts.createLabel} to add a record. Required fields are marked with an `
         + 'asterisk and are checked before the form will save.');
  }
  if (c.has('detail')) {
    s.push('Click a row to open its detail panel. Use the chevrons at the top to step through the '
         + 'filtered list without closing it.');
  }
  if (c.has('related')) {
    s.push('Related records — applications, orders, invoices, transactions — are listed at the '
         + 'bottom of the panel and can be opened from there.');
  }
  if (c.has('attachments')) s.push('Use the paperclip to view or add attachments.');
  if (c.has('approve')) {
    s.push('Where the record is complete and not yet billed, Approve accepts it and moves it into '
         + 'billing; Failed closes it instead.');
  }
  if (c.has('export')) {
    s.push('Press the download icon to export exactly what you are looking at — the filtered rows '
         + 'and visible columns, not the whole table.');
  }
  if (c.has('paging')) {
    s.push('Page through the results with the first, previous, next and last controls.');
  }
  if (c.has('mobileSplit')) {
    s.push('On a phone the list and the detail view take turns rather than sitting side by side; '
         + 'use the back control to return to the list.');
  }
  return s;
}

function fieldNote(f) {
  const bits = [];
  if (f.readonly) bits.push('filled in for you');
  if (f.conditional) bits.push('looks different depending on how you opened it');
  if (f.choices && f.choices.length) bits.push('choose from: ' + f.choices.join(', '));
  else if (f.dynamic) bits.push('choose from a list the system keeps');
  return bits.join('; ') || '';
}

/* ── render one screen ───────────────────────────────────────────────────── */
function renderScreen(doc, ext, side, opts) {
  const entry = ext[side].pages[opts.component] || null;
  const purpose = PURPOSE[opts.id];

  doc.h3(opts.numbered ? `${opts.numbered} ${opts.label}` : opts.label);
  doc.metaLine([
    opts.path ? `To open it: ${opts.path}` : null,
    `You need to be: ${friendlyRoles(opts.roles)}`,
  ]);

  doc.p(purpose || 'Part of the system\'s configuration. Maintains the values this screen names, '
      + 'which are then offered by the operational screens that use them.');

  const filterName = entry && entry.imports.find(i => /FunnelFilter/.test(i));
  const filterKey = filterName ? filterName.replace('.tsx', '') : null;
  const filterFields = filterKey ? (ext[side].filters[filterKey] || null) : null;

  const createBtn = entry && entry.buttons.find(b => /^(Add|New|Create|Open)\b/i.test(b));

  doc.sub('Step by step');
  doc.steps(stepsFor(entry, {
    path: opts.path || `the ${opts.label} screen`,
    filterFields: filterFields ? filterFields.length : null,
    createLabel: createBtn ? `"${createBtn}"` : null,
  }));

  // Named controls
  const named = entry ? entry.buttons : [];
  if (named.length) {
    doc.sub('Buttons on this screen');
    doc.table(['Control', 'What it does'],
      named.map(b => [b, helpFor(b)]), { widths: [130, 337], fontSize: 8 });
  }

  // Standard icon controls actually present
  if (entry && entry.caps.length) {
    const present = ICON_CONTROLS.filter(([cap]) => entry.caps.includes(cap));
    if (present.length) {
      doc.sub('Unlabelled controls');
      doc.table(['Control', 'What it does'],
        present.map(([, n, d]) => [n, d]), { widths: [130, 337], fontSize: 8 });
    }
  }

  // Filters
  doc.sub('Filters');
  if (filterFields) {
    doc.p(`Press the funnel icon and you can narrow the list on any of these `
        + `${filterFields.length} things. Set as many as you like — the list keeps only the rows `
        + 'that satisfy all of them.', { size: 9.4 });
    const rows = filterFields.map(f => [f.label || f.key,
                                       TYPE_LABEL[f.type] || f.type,
                                       HOW_TO_FILTER[f.type] || '']);
    doc.table(['You can filter on', 'How you set it', 'What it does'], rows,
      { widths: [150, 96, 221], fontSize: 7.4 });
  } else if (entry && entry.caps.includes('dateRange')) {
    doc.p('No funnel-filter panel. The list is narrowed with the search box and the From and To '
        + 'date boxes.', { size: 9.4 });
  } else if (entry && entry.caps.includes('search')) {
    doc.p('No funnel-filter panel. The list is narrowed with the search box.', { size: 9.4 });
  } else {
    doc.p('None — this screen is a form or a fixed view rather than a filterable list.',
      { size: 9.4 });
  }

  // Columns
  const colKeys = entry ? Object.keys(entry.columns) : [];
  if (colKeys.length) {
    const cols = entry.columns[colKeys[0]];
    doc.sub('Columns');
    doc.p(cols.map(c => c.label).filter(Boolean).join(' · '), { size: 9 });
  }

  // The forms this screen opens, opened up in place
  const dialogs = entry
    ? entry.imports.filter(i => /Modal/.test(i)).map(i => i.replace('.tsx', ''))
    : [];
  if (dialogs.length && opts.dlg) {
    for (const name of dialogs) {
      const d = opts.dlg[name];
      if (!d) continue;
      if (d.fields && d.fields.length) {
        doc.sub(`The "${d.title}" form`);
        const req = d.fields.filter(f => f.required).length;
        doc.p(`${d.fields.length} field${d.fields.length === 1 ? '' : 's'}`
            + (req ? `, ${req} you must fill in.` : ', none compulsory.'), { size: 9.2 });
        doc.table(['Field', 'What you enter', 'Must fill in', 'Notes'],
          d.fields.map(f => [f.label, f.type, f.required ? 'Yes' : '', fieldNote(f)]),
          { widths: [124, 74, 48, 221], fontSize: 7.4 });
        if (d.rules && d.rules.length) {
          doc.p('It will not save until these are right: '
              + d.rules.map(r => `"${r.message}"`).join('; ') + '.', { size: 8.8 });
        }
        if (d.uploads) {
          doc.p(`${d.uploads} file can be attached here. Hover an attached image to view, `
              + 'replace or remove it.', { size: 8.8 });
        }
      } else if (d.buttons && d.buttons.length) {
        doc.sub(`The "${d.title}" message`);
        doc.p('Nothing to fill in. Your choices are: ' + d.buttons.join(', ') + '.',
          { size: 9.2 });
      }
    }
  }

  doc.space(6);
}

const TYPE_LABEL = { varchar: 'Type text', checklist: 'Tick from a list', int: 'From and To',
                     date: 'From and To dates', datetime: 'From and To', number: 'From and To' };

const HOW_TO_FILTER = {
  varchar: 'Keeps rows containing what you typed. Part words count.',
  checklist: 'Keeps rows matching any option you tick. Untick all to switch it off.',
  int: 'Keeps rows between the two numbers, both included.',
  number: 'Keeps rows between the two numbers, both included.',
  date: 'Keeps rows between the two dates, both days included.',
  datetime: 'Keeps rows between the two moments, to the minute.',
};

const ROLE_WORDS = {
  administrator: 'an administrator', superadmin: 'a system administrator',
  technician: 'a technician', agent: 'an agent', customer: 'a customer',
  inventorystaff: 'inventory staff', osp: 'outside-plant staff',
  headtech: 'a head technician', all: 'signed in',
};

function friendlyRoles(roles) {
  if (!roles || roles === 'all') return 'signed in';
  const parts = roles.split(',').map(r => ROLE_WORDS[r.trim().toLowerCase()] || r.trim());
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' or ' + parts[parts.length - 1];
}

function prettyDialog(name) {
  return name
    .replace(/Modal$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^JO /, 'Job order ')
    .replace(/^SO /, 'Service order ');
}

module.exports = { renderScreen, PURPOSE, stepsFor, helpFor, friendlyRoles };

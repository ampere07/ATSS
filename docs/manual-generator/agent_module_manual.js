/*
 * Builds the SYNC Agent Module User Manual PDF.
 *
 * Covers the Agent Module as it is actually implemented across the two clients
 * in this repository:
 *
 *   MOBILEAPP/frontend  — the Mobile Application an Agent signs in to
 *   ATSS2_0/frontend    — the Web Application an Administrator signs in to
 *   ATSS2_0/backend     — the shared API, crons and database behind both
 *
 * The product is branded SYNC in the document. The source directories keep their
 * own names, and so do the values the system actually prints — the ATSS-AGT
 * invoice prefix and the ATSS FIBER mark on the invoice artwork.
 *
 * Written for the people who use the module, not for developers, but every
 * screen, button, field, status and rule in it was read off the source before
 * it was written down. If a screen changes, edit this file.
 *
 *   node agent_module_manual.js [output.pdf] [date] [version] [preparedBy] [organization]
 */
const path = require('path');
const { Doc } = require('./render.js');

const OUT = process.argv[2] || path.join(__dirname, '..', 'SYNC_Agent_Module_Complete_User_Manual.pdf');
const DATE = process.argv[3] || '26 August 2026';
const VERSION = process.argv[4] || '1.0';
const PREPARED_BY = process.argv[5] || 'Documentation Team';
const ORGANIZATION = process.argv[6] || 'SYNC';

const AGENT = 'Applies to: AGENT';
const ADMIN = 'Applies to: ADMINISTRATOR';
const BOTH = 'Applies to: AGENT and ADMINISTRATOR';
const MOBILE = 'System: Mobile Application';
const WEB = 'System: Web Application';
const BOTH_SYS = 'System: Mobile Application and Web Application';

const doc = new Doc({
  eyebrow: 'SYNC',
  title: 'Agent Module User Manual',
  subtitle: 'Mobile Application and Web Application — Complete Operating Guide',
  blurb:
    'This manual documents the Agent Module end to end: how an agent account is created and '
    + 'activated, how an agent signs in and works the Mobile Application, how a referral becomes '
    + 'a customer, how commission, incentives and achievement rewards are earned and paid, how the '
    + 'weekly referral invoice is produced, and everything an administrator does in the Web Application to '
    + 'run the programme. Every screen, button, field and status described here was taken from the '
    + 'working system.',
  facts: [
    ['Document Title', 'SYNC Agent Module User Manual'],
    ['Subtitle', 'Mobile Application and Web Application — Complete Operating Guide'],
    ['Version', VERSION],
    ['Document Date', DATE],
    ['Prepared By', PREPARED_BY],
    ['Organization', ORGANIZATION],
    ['Intended Audience', 'Agents, and the administrators and billing staff who manage them'],
    ['Applies To', 'The Mobile Application and the Web Application'],
    ['How it is organised',
     'Parts Two and Three are for agents. Parts Four and Five are shared. Part Six is for '
     + 'administrators. Part Seven is reference for everybody.'],
  ],
  footNote:
    'Every chapter states the role and the system it applies to on the line under its heading. If '
    + 'a screen described here does not appear in your menu, your account does not hold the '
    + 'permission for it — ask your administrator to check your role. Figures shown in examples '
    + 'are the shipped defaults and may have been changed for your organisation.',
  runningHeader: 'SYNC Agent Module User Manual',
  runningFooter: 'Mobile Application and Web Application',
});

doc.cover();

/* ═════════════════════════════════════════════════════════════════════════════
   PART ONE — UNDERSTANDING THE AGENT MODULE
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part One', 'Understanding the Agent Module',
  'Read this part whoever you are. It explains what the module does, the two systems it is '
  + 'spread across, the words it uses, and what has to exist before anybody can use it.');

/* ── 1 ─────────────────────────────────────────────────────────────────────── */
doc.h1('1. Introduction');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('1.1 What the Agent Module Is');
doc.p(
  'The Agent Module is the part of the SYNC system that handles agents — the people who bring new '
  + 'subscribers in — and everything that follows from a referral they make. It covers the whole '
  + 'life of that relationship: the agent account itself, the application the agent submits, the '
  + 'job order raised to install the customer, the money the agent earns for it, and the weekly '
  + 'invoice that bills it.'
);
doc.p(
  'The module is spread across two applications that share one database. Agents work in the '
  + 'Mobile Application. Administrators work in the Web Application. Both talk to the same '
  + 'server, so a change made in one is visible in the other as soon as the screen is refreshed.'
);

doc.h2('1.2 The Two Systems at a Glance');
doc.table(['System', 'Who signs in', 'What it is for'], [
  ['Mobile Application',
   'Agents, and administrators who want a phone view of the same data.',
   'An agent’s own workspace: their dashboard, their referral form, their job orders, their '
   + 'earnings history and their achievement rewards. Everything an agent sees here is scoped by '
   + 'the server to that agent alone.'],
  ['Web Application',
   'Administrators, billing staff, super administrators — and agents, who see a reduced menu.',
   'The management side: creating teams and agent accounts, setting commission, quota and '
   + 'incentive rates, approving payouts, generating and settling the weekly referral invoices, '
   + 'and reading every agent’s records.'],
], { widths: [22, 30, 48] });

doc.h2('1.3 The Two Roles');
doc.table(['Role', 'Who they are', 'What the module gives them'], [
  ['Agent',
   'A person who introduces new subscribers. Holds the Agent role on their user account and an '
   + 'agent balance record.',
   'A private view of their own referrals and their own money. They can submit applications, '
   + 'follow their job orders, read their earnings and claim achievement rewards. They cannot '
   + 'record a payment to themselves, approve anything, or see another agent’s figures.'],
  ['Administrator',
   'Office, billing and management staff. Also covers Billing and SuperAdmin accounts.',
   'The whole programme: teams, agent accounts, rates, payouts and their approval, invoice '
   + 'generation and settlement, and every agent’s balance and history.'],
], { widths: [18, 34, 48] });

doc.callout('How to tell which you are',
  'Sign in and look at your menu. An agent sees a short menu — Dashboard, Job Order, Work Order, '
  + 'History and (on the web) Invoices. An administrator sees a long menu containing an Agent '
  + 'group with Bonus History, Team Agents, Agent Management, Agent Payout and Invoices. On a '
  + 'phone, your role is printed in capitals on the Menu screen under your name.');

doc.h2('1.4 The Words This Manual Uses');
doc.p(
  'Three words in this module do not mean what they first appear to mean. Getting them straight '
  + 'now will save a great deal of confusion later.'
);
doc.table(['Term', 'What it actually means'], [
  ['Agent',
   'A user account with the Agent role AND an agent balance record. Both are needed. An account '
   + 'with the role but no balance record is invisible to every part of the earnings machinery — '
   + 'it will never be matched to a referral, never earn commission and never be invoiced.'],
  ['Team',
   'A named group of agents. Teams are managed on the Team Agents screen, and an agent is put '
   + 'into one through the Team field on their own account. An agent may belong to no team, in '
   + 'which case they are a solo agent.'],
  ['Team Agents',
   'The screen that manages TEAMS, not agents. It has one field: Team Name. Agent accounts '
   + 'themselves are managed on the separate Agent Management screen.'],
  ['Referral',
   'A customer application whose Referred By field names an agent. The link between a customer '
   + 'and the agent who brought them in is that text field and nothing else — see chapter 9.'],
  ['Onboarded',
   'A referral whose job order has reached the onsite status Done (or Completed). This is what '
   + 'counts toward achievement progress.'],
  ['Owner',
   'Whoever a weekly invoice is addressed to: a team, or a solo agent. A team of five agents '
   + 'gets one invoice, not five.'],
], { widths: [20, 80] });

doc.h2('1.5 What the Module Does, in Order');
doc.steps([
  'An administrator creates a team (optional) and then an agent account, setting the '
  + 'commission rate, the quota and the incentive value on it.',
  'The agent signs in to the Mobile Application and lands on the Agent Dashboard.',
  'The agent submits a customer application. Their own name is pre-filled into Referred By, '
  + 'which is what credits the referral to them.',
  'The office reviews the application and moves it to a job order for installation.',
  'A technician is assigned, visits the address and records the outcome: Done, Reschedule or '
  + 'Failed.',
  'An administrator approves the job order. At that moment the referring agent is found and '
  + 'their commission is credited.',
  'A scheduled job counts the agent’s completed referrals; every full quota earns the '
  + 'incentive value once.',
  'Every Monday a job raises the weekly referral invoice for each team and each solo agent, '
  + 'covering the week that has just ended.',
  'An administrator records a payout against that invoice and approves it. Only then does the '
  + 'money leave the agent’s balance and the invoice become Paid.',
]);

/* ── 2 ─────────────────────────────────────────────────────────────────────── */
doc.h1('2. Prerequisites and Account Requirements');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('2.1 What Must Exist Before an Agent Can Earn');
doc.p(
  'The earnings machinery has a short list of preconditions. If any of them is missing the agent '
  + 'can still sign in and still submit applications, but nothing will ever be credited to them. '
  + 'Almost every "my commission is missing" report traces back to this table.'
);
doc.table(['Requirement', 'Where it is set', 'What happens without it'], [
  ['A user account with the Agent role',
   'Web Application > Agent Management > Add',
   'No agent dashboard, no agent menu.'],
  ['An agent balance record',
   'Created automatically when the account is saved with the Agent role',
   'The account is not recognised as an agent by commission settlement, the incentive job, the '
   + 'invoice run or the payout screens. It earns nothing.'],
  ['A commission rate greater than zero',
   'Commission field on the agent account (agent balance)',
   'Approving a job order credits nothing, and invoice lines price at zero.'],
  ['A quota greater than zero and an incentive value greater than zero',
   'Quota and Incentives fields on the agent account',
   'The incentive job skips the agent entirely — logged as "Quota or incentive value not '
   + 'configured".'],
  ['The account marked Active',
   'Account Status on the agent’s details panel',
   'Sign-in is refused with a suspended-account message.'],
  ['The customer application’s Referred By naming the agent',
   'Referred By field on the application form',
   'No referral is credited. The job order approves normally and silently pays nobody.'],
], { widths: [30, 32, 38] });

doc.h2('2.2 The Shipped Default Terms');
doc.p(
  'The Add Agent form pre-fills the three money fields with the agreed standard terms. They stay '
  + 'editable, and an existing agent always shows their own stored values instead.'
);
doc.table(['Field', 'Default', 'What it means'], [
  ['Commission', '100.00', 'Pesos earned for each referral whose job order is approved.'],
  ['Quota', '10', 'Number of completed referrals that make up one incentive cycle.'],
  ['Incentives', '100.00', 'Pesos earned once for each completed quota — not per referral in it.'],
], { widths: [24, 18, 58] });

doc.h2('2.3 The Achievement Tiers');
doc.p(
  'Achievement rewards are configured on the server rather than per agent, so every agent is on '
  + 'the same tiers. The dashboards read the figures from the server, so what you see on screen is '
  + 'always the live configuration.'
);
doc.table(['Tier', 'Target', 'Reward', 'Period'], [
  ['Weekly Achievement', '25 onboarded referrals', 'PHP 1,000.00', 'Resets every week'],
  ['Monthly Achievement', '100 onboarded referrals', 'PHP 15,000.00', 'Resets every calendar month'],
], { widths: [30, 28, 20, 22] });

doc.callout('Programme start date',
  'The system supports a programme start date that would exclude referrals onboarded before it '
  + 'from earning anything. It is currently switched off, which means an agent’s WHOLE history '
  + 'counts — every referral they have ever onboarded earns incentive progress and adds to their '
  + 'achievement counts, however old it is. If a start date is ever introduced it must be set in '
  + 'three places at once (the server and both apps), or the figures on screen will disagree with '
  + 'the figures being paid.');

/* ═════════════════════════════════════════════════════════════════════════════
   PART TWO — SETTING UP AN AGENT
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Two', 'Creating and Setting Up an Agent Account',
  'Everything in this part is done by an administrator in the Web Application, before the '
  + 'agent ever signs in. It is also available on a phone under Menu > Agent for an '
  + 'administrator account.');

/* ── 3 ─────────────────────────────────────────────────────────────────────── */
doc.h1('3. Creating a Team');
doc.metaLine([ADMIN, WEB]);

doc.h2('3.1 When You Need a Team');
doc.p(
  'A team groups agents so that one weekly invoice covers all of them. Create a team first if the '
  + 'agents you are about to add work together and should be billed and paid as a group. An agent '
  + 'left out of every team is a solo agent and receives an invoice addressed to them alone. '
  + 'Nothing else about the agent changes: commission, quota, incentives and achievements are '
  + 'always calculated per agent, never per team.'
);

doc.h2('3.2 The Team Agents Screen, Step by Step');
doc.p('Sidebar > Agent > Team Agents. The heading reads "Team Agent Management".');
doc.steps([
  'The screen lists every team in your organisation in a table with four columns: Team Name, '
  + 'Created At, Created By and Actions.',
  'Use the search box to filter by team name. It searches the team name only.',
  'Use the page-size selector and the first/previous/next/last buttons at the foot of the list '
  + 'to move through long lists. Page sizes offered are 10, 25, 50 and 100.',
  'Press the Add button in the top right to create a team.',
  'Enter a Team Name. It is the only field and it is required.',
  'Press Save. The team appears in the list immediately, stamped with your email address as '
  + 'Created By and the current date as Created At.',
]);

doc.h2('3.3 The Buttons on a Team Row');
doc.table(['Button', 'What it does'], [
  ['Record Payout',
   'Opens the payout form with this team pre-selected. Use it only when you intend to record a '
   + 'payment against the team. See chapter 20.'],
  ['Edit',
   'Reopens the team form so the Team Name can be changed. Renaming a team does not rewrite '
   + 'invoices already issued — those keep the name they were raised under.'],
  ['Delete',
   'Removes the team. Do this only for a team that has no agents assigned and no invoices, '
   + 'otherwise the agents on it are left pointing at a team that no longer exists.'],
], { widths: [22, 78] });

doc.h2('3.4 The Two Toolbar Buttons');
doc.table(['Button', 'What it does'], [
  ['Refresh', 'Re-reads the team list from the server.'],
  ['Add', 'Opens the blank team form.'],
], { widths: [22, 78] });

doc.callout('Organisation scope',
  'Teams belong to an organisation. You see only the teams in your own organisation, and the '
  + 'server refuses an attempt to edit or delete a team belonging to another one. A super '
  + 'administrator with no organisation of their own sees the teams that have none.');

/* ── 4 ─────────────────────────────────────────────────────────────────────── */
doc.h1('4. Creating an Agent Account');
doc.metaLine([ADMIN, WEB]);

doc.h2('4.1 Opening the Screen');
doc.p(
  'Sidebar > Agent > Agent Management. The heading reads "Agent Management" and the line '
  + 'beneath it reads "Manage agent users". This is the ordinary User Management screen locked to '
  + 'agents: it lists only accounts holding the Agent role, the Role field on the form is fixed to '
  + 'Agent and cannot be changed, and the user-type filter and the Organization field are hidden '
  + 'because neither applies.'
);

doc.h2('4.2 The Add Agent Form, Field by Field');
doc.p(
  'Press the Add button in the top right. The form slides in from the right with the title "Add '
  + 'New User". Fields marked with an asterisk on screen are required.'
);
doc.table(['Field', 'Required', 'Notes'], [
  ['First Name', 'Yes', 'Part of the name used to match referrals — see the warning below.'],
  ['Last Name', 'Yes', 'Part of the name used to match referrals.'],
  ['Middle Initial', 'No', 'A single character. Not used for referral matching.'],
  ['Username', 'Yes', 'Must be unique across all accounts. The agent may sign in with it.'],
  ['Email Address', 'Yes',
   'Must be unique and a valid address. The agent may sign in with it, and an application whose '
   + 'Referred By is exactly this address is credited to them.'],
  ['Contact Number', 'No', 'Digits, spaces, brackets, dashes and a leading plus are accepted.'],
  ['Role', 'Yes', 'Shown as a read-only box reading "Agent". It cannot be changed on this screen.'],
  ['Team', 'No',
   'A list of the teams you created in chapter 3. Leave it blank to make the agent a solo agent.'],
  ['Commission', 'Yes',
   'Pesos per approved referral. Pre-filled with 100.00. This is a RATE, not a balance.'],
  ['Quota', 'Yes',
   'Completed referrals per incentive cycle. Pre-filled with 10. A whole number in practice.'],
  ['Incentives', 'Yes',
   'Pesos paid once per completed quota. Pre-filled with 100.00. Also a rate, not a balance.'],
  ['Remarks', 'No', 'Free text kept on the agent balance record.'],
  ['Password', 'Yes', 'At least 8 characters. Checked as you type.'],
  ['Confirm Password', 'Yes', 'Must match. Shown only when creating, never when editing.'],
], { widths: [22, 12, 66] });

doc.h2('4.3 Saving, and What Happens Behind the Save');
doc.steps([
  'Press Save. A progress dialog reads "Creating User".',
  'The account is created with Active set on, so the agent can sign in straight away. There is '
  + 'no separate approval or email-verification step in this module.',
  'Because the role is Agent, an agent balance record is created at the same time, carrying the '
  + 'Commission, Quota, Incentives and Remarks you entered, with every earned figure at zero.',
  'A success dialog reads "New user has been created successfully" and the form closes after a '
  + 'moment. The new agent appears in the list.',
]);
doc.callout('This is the step that makes the account real',
  'The agent balance record created at this moment is what every other part of the module uses to '
  + 'decide who is an agent — commission settlement, the incentive job, achievement counting and '
  + 'the invoice run all define an agent as "a user who holds an agent balance". An account given '
  + 'the Agent role some other way, without that record, is invisible to all four.');

doc.h2('4.4 Errors You May See');
doc.table(['Message', 'Cause'], [
  ['already existed (under Username or Email Address)',
   'Another account already uses that username or address. Both must be unique system-wide.'],
  ['Min 8 chars', 'The password is too short.'],
  ['Mismatch', 'Confirm Password does not match Password.'],
  ['Required',
   'A required field is empty. On an agent this includes Commission, Quota and Incentives.'],
  ['Unauthorized. You can only update users within your organization.',
   'You tried to edit an account belonging to another organisation.'],
], { widths: [40, 60] });

doc.h2('4.5 The Name Rule — Read This Before Choosing a Name');
doc.p(
  'A customer is linked to their agent through the free-text Referred By field on the application, '
  + 'so the system has to decide by name whether a given referral belongs to a given agent. The '
  + 'rule is the same everywhere in the module — in commission settlement, in the incentive job, in '
  + 'achievement counting and on the invoice run — and it is deliberately tolerant:'
);
doc.bullets([
  ['Exact email match. ', 'If Referred By is exactly the agent’s email address, it belongs to them.'],
  ['Every word must appear. ', 'Otherwise, every word of the agent’s first name plus last name '
   + 'must appear as a whole word in Referred By. Case, full stops and commas are ignored, and '
   + 'extra whitespace is collapsed.'],
]);
doc.table(['Agent account name', 'Referred By value', 'Credited?'], [
  ['Sample Agent', 'Sample Agent', 'Yes'],
  ['Sample Agent', 'Sample Reyes Agent', 'Yes — extra words are allowed'],
  ['Sample Agent', 'sample.agent', 'Yes — the full stop is treated as a space'],
  ['Sample Agent', 'Sample Agents', 'No — "agents" is a different word'],
  ['Sample Agent', 'S. Agent', 'No — the word "sample" is missing'],
  ['Sample Agent', 'Agent Team', 'No — the word "sample" is missing'],
], { widths: [26, 34, 40] });
doc.callout('The commonest cause of unpaid commission',
  'A referral that names a TEAM rather than a person matches no agent at all. The job order '
  + 'approves normally, nothing is credited, and there is no error on screen. If several agents '
  + 'report missing commission at once, check whether the applications are being filled in with the '
  + 'team name in Referred By.');

/* ── 5 ─────────────────────────────────────────────────────────────────────── */
doc.h1('5. Managing an Existing Agent Account');
doc.metaLine([ADMIN, WEB]);

doc.h2('5.1 Finding an Agent');
doc.steps([
  'Open Agent Management. The list shows every agent in your organisation, newest arrangement '
  + 'first, with the role printed in small capitals beside each name.',
  'Type into the search box to filter. It searches the full name, the username and the email '
  + 'address at once.',
  'Click a row. The details panel opens on the right (or fills the screen on a phone).',
]);

doc.h2('5.2 The Details Panel');
doc.p(
  'The panel shows the account’s stored fields, including Account Status, which reads either '
  + 'Active or Inactive. Three controls sit in its header.'
);
doc.table(['Control', 'What it does'], [
  ['Edit',
   'Reopens the same form used to create the account, titled "Edit User", pre-filled with this '
   + 'agent’s values — including their own Commission, Quota, Incentives and Remarks. Password '
   + 'is optional here: leave it blank to keep the current one.'],
  ['Deactivate / Activate',
   'Toggles Account Status. The button reads Deactivate while the account is active and Activate '
   + 'while it is not. A confirmation is shown first.'],
  ['Close', 'Shuts the panel and returns to the list.'],
], { widths: [26, 74] });

doc.h2('5.3 Changing the Rates on an Existing Agent');
doc.p(
  'Editing Commission, Quota or Incentives changes the rates from that moment on. It does not '
  + 'restate anything already settled, and this is deliberate:'
);
doc.bullets([
  ['Approved job orders keep their rates. ',
   'When a job order is approved, the commission rate and incentive value in force at that '
   + 'instant are copied onto the job order itself. Every later calculation reads them from there, '
   + 'so raising a rate next month cannot silently increase money already paid.'],
  ['Incentive batches keep their rates. ',
   'A completed quota is paid at the rate carried by the referral that completed it.'],
  ['Invoices keep their figures. ',
   'An invoice already raised is a fixed document. The next one uses the new rate.'],
]);

doc.h2('5.4 Deactivating an Agent');
doc.p(
  'Deactivating an account stops the person signing in — the sign-in attempt is refused with a '
  + 'suspended-account message on both the Mobile Application and the Web Application. It does not remove their '
  + 'balance, their history, their unbilled quotas or their invoices, and it does not stop the '
  + 'weekly invoice run from including their referrals. Reactivate the account at any time with the '
  + 'same button.'
);
doc.callout('Deactivate rather than delete',
  'An agent’s balance, incentive ledger, payout history and invoices all point at their user '
  + 'account. Deactivating leaves every one of those readable and reconcilable; removing the '
  + 'account does not.');

doc.h2('5.5 Moving an Agent Between Teams');
doc.p(
  'Edit the agent and change the Team field. From the next invoice run onward their referrals are '
  + 'billed on the new team’s invoice. Invoices already issued to the old team are unchanged, '
  + 'and customers already billed to the old team can never be billed again to the new one — the '
  + 'database refuses it. Their commission, quota progress and achievements are personal and follow '
  + 'them across.'
);

/* ── 6 ─────────────────────────────────────────────────────────────────────── */
doc.h1('6. Roles, Permissions and Access');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('6.1 How Access Is Decided');
doc.p(
  'Every screen in both applications has a permission key, and every API endpoint is checked '
  + 'against the same key on the server. The menus only decide what to draw; the server decides '
  + 'what is allowed. Hiding a button is a convenience, never the protection — an agent who reached '
  + 'an administrator’s endpoint directly would still be refused.'
);

doc.h2('6.2 What the Agent Role Holds');
doc.p('An account on the seeded Agent role holds exactly these keys:');
doc.table(['Permission key', 'The screen it opens'], [
  ['agent-dashboard', 'The Agent Dashboard — the agent’s landing screen.'],
  ['agent-application', 'The customer application form.'],
  ['job-order', 'Job Order, filtered by the server and the app to the agent’s own referrals.'],
  ['work-order', 'Work Order.'],
  ['bonus-history',
   'The agent’s own payout, incentive and bonus history. Listed as "History" in both menus.'],
  ['agent-invoices',
   'The weekly referral invoices for the agent’s team, or their own if they have none. Web '
   + 'Application only — there is no invoice screen in the Mobile Application.'],
], { widths: [26, 74] });

doc.h2('6.3 What the Agent Role Does Not Hold');
doc.table(['Withheld key', 'Consequence'], [
  ['bonus-history.payout',
   'The Add button on the History screen is not drawn, and the API refuses a payout recorded by '
   + 'an agent. Agents cannot pay themselves.'],
  ['agent-payout and agent-payout.approve',
   'No access to the Agent Payout screen, and no ability to approve or reject any payout.'],
  ['agent-invoices.generate',
   'The agent can read invoices but cannot generate them.'],
  ['agent-invoices.status',
   'The agent sees each invoice’s status as a read-only badge rather than a dropdown.'],
  ['agent-management and team-agent',
   'No access to agent accounts or teams.'],
], { widths: [32, 68] });

doc.h2('6.4 Where Each Role Lands After Signing In');
doc.table(['Role', 'Landing screen'], [
  ['Agent', 'Agent Dashboard'],
  ['Administrator', 'Dashboard'],
  ['SuperAdmin', 'Dashboard'],
  ['Technician', 'Job Order'],
  ['Customer', 'Customer Dashboard'],
], { widths: [30, 70] });

doc.h2('6.5 Custom Roles');
doc.p(
  'Roles beyond the eight seeded ones carry their own list of keys, ticked in Role Management. To '
  + 'build a custom agent-like role, give it the six keys in 6.2. To build a restricted '
  + 'administrator, add agent-payout, agent-payout.approve, bonus-history.payout, agent-management, '
  + 'team-agent, agent-invoices.generate and agent-invoices.status as needed. The Mobile Application '
  + 'refreshes a signed-in user’s permissions once per launch, so a role edited while somebody '
  + 'is signed in takes effect on their next launch.'
);
doc.callout('Organisation scope applies on top of permissions',
  'Even with the right key, an administrator can only act on records in their own organisation. A '
  + 'super administrator, or a user with no organisation at all, may act on anything.');

/* ═════════════════════════════════════════════════════════════════════════════
   PART THREE — THE AGENT IN THE MOBILE APPLICATION
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Three', 'The Agent in the Mobile Application',
  'This part is written for agents. It walks the Mobile Application screen by screen, from signing '
  + 'in to reading every figure on the dashboard.');

/* ── 7 ─────────────────────────────────────────────────────────────────────── */
doc.h1('7. Signing In, Sessions and Signing Out');
doc.metaLine([AGENT, MOBILE]);

doc.h2('7.1 The Sign-In Screen');
doc.p('The sign-in screen has two fields and one button.');
doc.table(['Control', 'What to enter'], [
  ['Account No./Username/Email',
   'Any one of the three. An agent normally uses the username or the email address the '
   + 'administrator set on their account.'],
  ['Password', 'The password set when the account was created. The eye button reveals it.'],
  ['Sign in', 'Submits. A spinner replaces the label while the request is in flight.'],
  ['Forgot Password',
   'Opens a panel asking for the account number, email or username, and sends reset '
   + 'instructions.'],
], { widths: [30, 70] });

doc.h2('7.2 What Happens on a Successful Sign-In');
doc.steps([
  'The server checks the password, then checks that the account is active.',
  'It returns the account’s identity, its role, and the list of permission keys the role '
  + 'resolves to, together with the section the role should land on.',
  'The app stores a session token and the account details on the device.',
  'An agent lands on the Agent Dashboard.',
  'On every later launch the app asks the server once for a fresh permission list, so a role '
  + 'changed by an administrator takes effect without the agent having to sign in again.',
]);

doc.h2('7.3 Sign-In Messages');
doc.table(['Message', 'Meaning', 'What to do'], [
  ['Please enter your account number and mobile number',
   'One of the two fields is empty.',
   'Fill both in.'],
  ['Invalid credentials. Please try again.',
   'No account matches, or the password is wrong.',
   'Check the username or address, then the password. Use Forgot Password if needed.'],
  ['your account is suspended contact a support',
   'The account exists and the password is right, but Account Status is Inactive.',
   'Ask an administrator to reactivate the account — see 5.4.'],
  ['Login failed. Please try again.',
   'The server answered but not with a success.',
   'Retry; if it persists, report it with the time it happened.'],
], { widths: [30, 34, 36] });

doc.h2('7.4 Forgot Password');
doc.steps([
  'Press Forgot Password on the sign-in screen.',
  'Enter the account number, email address or username.',
  'Press the send button. A confirmation message is shown.',
  'The button is then locked for three minutes, counting down on screen, so a second request '
  + 'cannot be sent immediately. The countdown survives closing and reopening the app.',
]);

doc.h2('7.5 Sessions, Idle Time and Signing Out');
doc.bullets([
  ['Staying signed in. ',
   'The session is kept on the device, so reopening the app does not ask for the password again.'],
  ['Idle warning. ',
   'After a period of inactivity a warning appears before the session is ended, giving the chance '
   + 'to stay signed in.'],
  ['Session expired. ',
   'If the server rejects the stored session, a Session Expired notice appears and the app '
   + 'returns to sign-in. Nothing is lost — every figure is held on the server.'],
  ['Signing out. ',
   'Open Menu and use the sign-out control at the foot of the screen. This clears the stored '
   + 'session and every cached list on the device.'],
]);

/* ── 8 ─────────────────────────────────────────────────────────────────────── */
doc.h1('8. Finding Your Way Around the Mobile App');
doc.metaLine([AGENT, MOBILE]);

doc.h2('8.1 The Bottom Navigation Bar');
doc.p(
  'The bar at the foot of the screen is built from the permissions your account holds, so an agent '
  + 'sees a short bar. Where more entries qualify than fit, the bar shows the first few and an '
  + 'expandable grid holds the rest.'
);
doc.table(['Entry', 'Opens'], [
  ['Dashboard', 'The Agent Dashboard — chapter 10.'],
  ['Job Order', 'Your live referrals — chapter 12.'],
  ['Work Order', 'Work orders you are permitted to see.'],
  ['History', 'Your payout, incentive and bonus history — chapter 13.'],
  ['Menu', 'The Menu screen, always available to anyone signed in.'],
], { widths: [24, 76] });

doc.h2('8.2 The Menu Screen');
doc.p(
  'Menu shows your profile card at the top — your name, your username, your email address and your '
  + 'role in capitals — followed by the groups your role is allowed. For an agent that is a single '
  + 'group:'
);
doc.table(['Item', 'What it is'], [
  ['Notifications', 'Messages the system has sent you.'],
  ['About App', 'Version and build information.'],
  ['Release Notes', 'What changed in recent versions.'],
], { widths: [26, 74] });
doc.p(
  'The long administrator groups — Operations, Billing, Agent, Inventory, Configurations, Users, '
  + 'Logs and System — are drawn only for an administrator account, so an agent never sees them.'
);

doc.h2('8.3 Your Profile');
doc.p(
  'The agent module has no separate profile editor in the Mobile Application. Your name, username, email '
  + 'address, contact number and password are all held on your user account and are changed by an '
  + 'administrator on the Agent Management screen. Your identity is shown in three places:'
);
doc.bullets([
  ['On the dashboard card. ', 'Your initials, your name and your username, labelled "Agent ID".'],
  ['On the Menu screen. ', 'Your name, username, email address and role.'],
  ['On the application form. ', 'Your full name, pre-filled into Referred By.'],
]);

doc.h2('8.4 Access Restrictions You Will Notice');
doc.bullets([
  ['Job Order shows only your referrals. ',
   'The list is filtered to job orders whose Referred By matches your account, and further '
   + 'filtered to those still in flight. Completed ones are read on the History screens.'],
  ['You cannot record a payment. ',
   'The Add button on the History screen is not drawn for an agent.'],
  ['You cannot approve anything. ',
   'Approve and Reject appear only for an account holding the approval permission.'],
  ['Invoices are not in the Mobile Application. ',
   'Agents read their weekly referral invoices in the Web Application — chapter 17.'],
]);

/* ── 9 ─────────────────────────────────────────────────────────────────────── */
doc.h1('9. Submitting a Referral');
doc.metaLine([AGENT, BOTH_SYS]);

doc.h2('9.1 What a Referral Is');
doc.p(
  'A referral is a customer application carrying your name in its Referred By field. Submitting '
  + 'the application is the whole of the agent’s part; everything that follows — review, job '
  + 'order, installation, approval, commission — happens without further action from you.'
);

doc.h2('9.2 Opening the Form');
doc.steps([
  'On the Agent Dashboard, select the Applications tab on the card at the top.',
  'The card shows your submitted total and, beside it, a Form button.',
  'Press Form. The application form opens.',
]);
doc.p(
  'In the Web Application the same form is reached from the agent’s own dashboard, and '
  + 'closing or submitting it returns to the dashboard.'
);

doc.h2('9.3 The Form, Section by Section');
doc.h3('Customer details');
doc.table(['Field', 'Required', 'Notes'], [
  ['Email', 'Yes', 'The customer’s address.'],
  ['First Name', 'Yes', ''],
  ['Middle Initial', 'No', ''],
  ['Last Name', 'Yes', ''],
  ['Mobile', 'Yes', 'Format 09 followed by eight digits, as the hint under the field says.'],
  ['Secondary Mobile', 'No', 'Same format.'],
], { widths: [24, 12, 64] });

doc.h3('Installation address');
doc.table(['Field', 'Required', 'Notes'], [
  ['Region', 'Yes', 'Searchable picker. Choose this first — it fills the city list.'],
  ['City/Municipality', 'Yes', 'Disabled until a region is chosen.'],
  ['Barangay', 'Yes', 'Disabled until a city is chosen.'],
  ['Installation Address', 'Yes', 'House or unit number and street name.'],
  ['Landmark', 'Yes', ''],
  ['Referred By', 'No, but see below',
   'Pre-filled with your full name the moment the form opens. Leaving it alone is what credits '
   + 'the referral to you.'],
], { widths: [24, 16, 60] });

doc.h3('Plan selection');
doc.table(['Field', 'Required', 'Notes'], [
  ['Plan', 'Yes', 'Searchable picker listing the plans currently on offer.'],
], { widths: [24, 12, 64] });

doc.h3('Upload documents');
doc.p('JPG, PNG or PDF, up to 10 MB each.');
doc.table(['Document', 'Required', 'Notes'], [
  ['Government Valid ID (Primary)', 'Yes', 'The form refuses to submit without it.'],
  ['Proof of Billing', 'No', ''],
  ['Secondary Government Valid ID', 'No', ''],
  ['House Front Image', 'No', ''],
], { widths: [34, 12, 54] });

doc.h2('9.4 Submitting');
doc.steps([
  'Press Submit. The form checks that every required field is filled and that the primary ID has '
  + 'been attached.',
  'The application is created first, then the attached documents are uploaded against it.',
  'A confirmation reads "Application submitted successfully!".',
  'The form clears itself ready for the next one — but Referred By stays filled in with your '
  + 'name, so you do not have to re-enter it.',
]);
doc.table(['Message', 'Meaning'], [
  ['Missing Fields — Please fill in all required fields marked with *',
   'One of the required fields above is empty.'],
  ['Missing Document — Government Valid ID (Primary) is required.',
   'The primary ID has not been attached.'],
  ['Error, followed by the server’s own message',
   'The server refused the application. The message names the reason.'],
], { widths: [46, 54] });

doc.callout('Never clear Referred By',
  'If Referred By is emptied, or replaced with a team name, or with "None / Walk-in", the '
  + 'application is not yours as far as the system is concerned. It will be processed and installed '
  + 'normally, and it will earn you nothing — no commission, no quota progress, no achievement '
  + 'progress and no invoice line. There is no way to correct this afterwards from the Mobile Application.');

doc.h2('9.5 Referral Limits and Quotas');
doc.p(
  'There is no cap on how many referrals an agent may submit, and no minimum. The word "quota" in '
  + 'this module never means a limit — it means the number of completed referrals that make up one '
  + 'incentive cycle, and it is explained in chapter 15. Referrals beyond a quota are never wasted; '
  + 'they carry forward into the next cycle.'
);

/* ── 10 ────────────────────────────────────────────────────────────────────── */
doc.h1('10. The Agent Dashboard');
doc.metaLine([AGENT, BOTH_SYS]);

doc.p(
  'The Agent Dashboard is the landing screen for an agent in both applications and shows the same '
  + 'figures in both. It has three parts: the summary card, the achievement cards, and the cashout '
  + 'history list.'
);

doc.h2('10.1 The Summary Card');
doc.p(
  'The card carries your initials, your name and your username (labelled "Agent ID"), and one '
  + 'headline figure. Three tabs across the top choose which figure that is. A small eye button '
  + 'beside the caption masks every figure on the card, for reading it in public.'
);
doc.table(['Tab', 'Caption', 'The headline figure'], [
  ['Wallet', 'AVAILABLE BALANCE', 'Your total balance — see 10.2.'],
  ['Referrals', 'TOTAL REFERRALS',
   'Every referral of yours, whatever its state: In Progress plus Done plus Failed plus '
   + 'Reschedule.'],
  ['Applications', 'SUBMITTED', 'How many applications you have submitted, counted on the server.'],
], { widths: [20, 26, 54] });
doc.p(
  'Wallet and Referrals have a breakdown behind them; the chevron button beside the figure opens '
  + 'and closes it. Applications has nothing to break down, so it offers the Form button instead.'
);

doc.h2('10.2 The Wallet Breakdown');
doc.p('Opening the Wallet tab’s breakdown shows four lines.');
doc.table(['Line', 'What it is', 'In the total?'], [
  ['Incentives', 'Quota incentives awarded to you and not yet paid out.', 'Yes'],
  ['Commission',
   'Commission earned from job orders that have been approved, and not yet paid out.', 'Yes'],
  ['Bonus', 'Bonus credited to you by an administrator and not yet paid out.', 'Yes'],
  ['Achievement',
   'A lifetime total of achievement rewards you have claimed. Shown for reference only.', 'No'],
], { widths: [18, 62, 20] });
doc.callout('Why Achievement is not added in',
  'When you claim an achievement reward it is paid straight into your spendable balance, and the '
  + 'Achievement figure is credited as well purely as a running "rewards earned" record. Adding it '
  + 'to the headline would count the same money twice. The headline figure is Commission plus '
  + 'spendable balance plus Incentives plus Bonus.');

doc.h2('10.3 The Referrals Breakdown');
doc.p(
  'These four counts come from your own job order list and are grouped by onsite status. They are '
  + 'counts of referrals, not amounts of money.'
);
doc.table(['Line', 'Which job orders it counts'], [
  ['In Progress', 'Onsite status In Progress or Pending — the visit has not concluded.'],
  ['Done', 'Onsite status Done or Completed — the customer is onboarded.'],
  ['Failed', 'Onsite status Failed, Cancelled, Suspended or Disapproved.'],
  ['Reschedule', 'Onsite status Reschedule or Rescheduled.'],
], { widths: [22, 78] });

doc.h2('10.4 The Achievement Cards');
doc.p(
  'Below the summary card sits one achievement card at a time. Swipe left and right to move '
  + 'between Weekly and Monthly, or tap the dots beneath. Each card shows:'
);
doc.table(['Element', 'What it tells you'], [
  ['Title and description',
   'For example, "Onboard 25 referrals this week to earn PHP 1,000.00".'],
  ['Resets in',
   'A live countdown to the instant this tier’s count returns to zero. It counts down to the '
   + 'server’s clock, not the phone’s, so a phone set to the wrong time still shows the '
   + 'right moment.'],
  ['The gauge',
   'A dial whose centre reads how many referrals you have onboarded in this period, under the '
   + 'word "Onboarded".'],
  ['The progress bar',
   'Reads "n of target onboards" on the left and the percentage on the right.'],
  ['The line beneath it',
   'Either "Target reached" or "n more to go", with the reward amount on the right.'],
  ['Get Reward',
   'Appears only when the target has been reached and the reward has not yet been claimed for '
   + 'this period. See 10.5.'],
  ['Claimed this week / this month',
   'A green panel replacing the button once the reward has been taken.'],
], { widths: [26, 74] });
doc.callout('"This cycle" instead of "this week"',
  'If you claim a reward early, the period ends there and a fresh one of the same length starts '
  + 'immediately. The card then says "in this cycle" rather than "this week", because the cycle no '
  + 'longer lines up with the calendar. The countdown beside it is always the exact answer.');

doc.h2('10.5 Claiming an Achievement Reward');
doc.steps([
  'Reach the target within the period. The count on the gauge is bounded to the current period '
  + 'and is worked out by the server, not the phone.',
  'Press Get Reward. The amount is shown on the button.',
  'The server re-checks the entitlement before paying anything — the count on the button is never '
  + 'trusted.',
  'A dialog reads "Reward Claimed!" with the amount that was added to your balance.',
  'The card switches to "Claimed", and your balance and the Achievement figure both update.',
]);
doc.table(['Refusal message', 'Meaning'], [
  ['<tier> not reached yet (n of target onboarded between <dates>).',
   'Your count inside the current period is below the target. The message names the exact window '
   + 'it counted.'],
  ['<tier> has already been claimed for this period.',
   'The reward for this period is already taken. It opens again when the period turns.'],
], { widths: [44, 56] });
doc.callout('A referral can only earn a tier once',
  'The exact referrals that earned a claim are recorded against it. If an installation date is '
  + 'later edited backwards into a period you have already been paid for, those referrals are still '
  + 'skipped. A referral that earned a weekly reward can, however, still count toward a monthly one '
  + '— they are separate achievements.');

doc.h2('10.6 Cashout History');
doc.p(
  'The foot of the dashboard lists your five most recent payout records. Each row shows the '
  + 'reference number, the date, the amount, and the word POSTED. When there are none the list '
  + 'reads "No cashouts found".'
);
doc.p(
  'The full list, with statuses and every type of record, is on the History screen — chapter 13.'
);

doc.h2('10.7 Refreshing');
doc.p(
  'Pull the Mobile Application dashboard down to refresh it. In the Web Application, use the Refresh button beside '
  + 'the "Agent Dashboard" heading. The dashboard also reloads itself when an achievement period '
  + 'rolls over, so the new period appears without you doing anything.'
);

/* ═════════════════════════════════════════════════════════════════════════════
   PART FOUR — REFERRALS, JOB ORDERS AND EARNINGS
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Four', 'Referrals, Job Orders and Earnings',
  'How a referral turns into money. This part is shared: agents should read it to understand their '
  + 'figures, administrators to understand what they are approving.');

/* ── 11 ────────────────────────────────────────────────────────────────────── */
doc.h1('11. From Application to Customer');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('11.1 The Stages');
doc.table(['Stage', 'Who does it', 'What happens'], [
  ['Application submitted', 'Agent',
   'The customer’s details, address, plan and documents are recorded, with the agent’s '
   + 'name in Referred By.'],
  ['Application reviewed', 'Office staff',
   'The application is checked and, where an application visit is used, a survey is carried out.'],
  ['Moved to job order', 'Office staff',
   'A job order is raised against the application. From here on, everything the agent sees about '
   + 'this customer is the job order.'],
  ['Technician assigned', 'Coordinator', 'A technician and a schedule are attached to the job order.'],
  ['Visit carried out', 'Technician',
   'The technician records the outcome on site: Done, Reschedule or Failed.'],
  ['Job order approved', 'Administrator',
   'The job order is signed off. This is the moment the referring agent is paid their commission '
   + '— see chapter 14.'],
], { widths: [24, 20, 56] });

doc.h2('11.2 Referral Status as the Agent Sees It');
doc.p(
  'The agent never sees an application status of their own; they see the job order’s onsite '
  + 'status, which is what the dashboard tiles and the Job Order list are grouped by.'
);
doc.table(['Onsite status', 'Meaning for the agent'], [
  ['In Progress', 'The job is live. It appears on the agent’s Job Order screen.'],
  ['Reschedule', 'The visit has been moved. Still live, still on the Job Order screen.'],
  ['Done', 'The customer is installed and onboarded. This is what earns.'],
  ['Failed', 'The installation did not go ahead. It earns nothing.'],
], { widths: [22, 78] });

doc.h2('11.3 What a Referral Becoming a Customer Triggers');
doc.bullets([
  ['Achievement progress. ',
   'A job order reaching Done counts immediately toward the weekly and monthly achievement '
   + 'counts.'],
  ['Quota progress. ',
   'It also counts toward the incentive quota — and it counts as soon as the site has been '
   + 'pre-installed, without waiting for the technician to close the job. See 15.3.'],
  ['Commission. ',
   'Nothing is credited until an administrator approves the job order. Onsite status Done alone '
   + 'does not pay commission.'],
  ['Invoicing. ',
   'A referral installed inside a billing week is billed on that week’s invoice for the '
   + 'agent’s team, or for the agent alone if they have no team.'],
]);

/* ── 12 ────────────────────────────────────────────────────────────────────── */
doc.h1('12. Job Orders');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('12.1 What the Agent Sees on the Job Order Screen');
doc.p(
  'An agent opening Job Order sees a list built for them, not the office’s list with a filter '
  + 'over it:'
);
doc.bullets([
  ['Only your referrals. ',
   'Every row is a job order whose Referred By matches your account under the name rule in 4.5. '
   + 'An agent whose account carries neither a usable name nor an email address sees nothing at '
   + 'all, rather than everything.'],
  ['Only live work. ',
   'Job orders that are Done or Completed are left out — they belong to the History screen. What '
   + 'remains is the work still in flight.'],
  ['Newest first. ',
   'The list reads by recency, rather than by the technician’s queue order.'],
  ['No creation or assignment controls. ',
   'The controls for raising and assigning job orders are not drawn for an agent.'],
]);

doc.h2('12.2 Job Order Details');
doc.p('Opening a row shows the customer’s details as recorded, including:');
doc.bullets([
  ['Customer name and address. ', 'Name, installation address, barangay, city and region.'],
  ['Dates. ', 'When the job order was raised and, once installed, the installation date.'],
  ['Installation fee. ', 'The fee recorded against the job.'],
  ['Onsite status. ', 'In Progress, Reschedule, Done or Failed.'],
  ['Commission status. ',
   'Shown to an agent as Collected or Not Collected — see 12.3.'],
  ['Work Started. ',
   'A badge shown when the technician has started but not finished the job.'],
]);

doc.h2('12.3 Commission Status on a Job Order');
doc.table(['Stored value', 'Shown to an agent as', 'Meaning'], [
  ['(empty) or Unpaid', 'Not Collected',
   'The referral has not yet been settled with you, or has been settled but not yet paid out.'],
  ['Paid', 'Collected',
   'This referral has been included in a payout that was approved, or on an invoice that was '
   + 'settled. It can never be included in a second one.'],
], { widths: [22, 24, 54] });

doc.h2('12.4 Agent Actions on a Job Order');
doc.p(
  'There are none. An agent cannot edit a job order, reschedule it, mark it done, attach anything '
  + 'to it, or approve it. Those actions belong to technicians, coordinators and administrators. '
  + 'The agent’s Job Order screen is a window onto the progress of their referrals.'
);

doc.h2('12.5 Job Order Approval and What It Does for the Agent');
doc.p(
  'Approval is an administrator’s act, carried out on the Job Order screen in the Web Application. For '
  + 'the agent side it is the single most important event in the module. In one transaction it:'
);
doc.steps([
  'Locks the job order so two approvals cannot both act on it.',
  'Stops immediately if the job order has already been settled with an agent — approving twice '
  + 'credits nothing twice.',
  'Reads the application’s Referred By value and looks for an agent it matches, under the '
  + 'rule in 4.5.',
  'Reads that agent’s current commission rate and incentive value.',
  'Adds the commission to the agent’s earned commission figure.',
  'Writes both rates onto the job order itself, together with the time of settlement and the '
  + 'agent it was settled with, and sets the job order’s commission status to Paid.',
]);
doc.callout('Approval can succeed and pay nobody',
  'If Referred By is empty, names a team, or names nobody the system can match, the approval goes '
  + 'through and looks completely normal — but nothing is credited and no error is shown. The '
  + 'server records a warning naming the referral text when this happens, which is the only way to '
  + 'tell it apart from the settlement being unavailable. If an agent reports missing commission, '
  + 'this is the first thing to check.');

doc.h2('12.6 Restrictions and Conditions');
doc.table(['Condition', 'Effect'], [
  ['Job order already settled', 'Approving again changes nothing and credits nothing.'],
  ['No Referred By on the application', 'Approval proceeds; no agent is paid.'],
  ['Referred By matches no agent', 'Approval proceeds; no agent is paid; a warning is logged.'],
  ['Agent has no agent balance record',
   'The agent cannot be matched at all — the search only looks at users holding one.'],
  ['Agent’s commission rate is zero',
   'The job order is still stamped as settled, but nothing is added to the agent’s '
   + 'commission.'],
], { widths: [34, 66] });

/* ── 13 ────────────────────────────────────────────────────────────────────── */
doc.h1('13. The History Screen');
doc.metaLine([AGENT, BOTH_SYS]);

doc.h2('13.1 What It Shows');
doc.p(
  'History is the agent’s own record of money. Everything on it is scoped by the server to '
  + 'the signed-in agent: whatever is asked for, a non-administrator only ever receives their own '
  + 'rows.'
);

doc.h2('13.2 The Mobile History Screen');
doc.p('Bottom bar > History. The heading changes with the tab you are on.');
doc.table(['Tab', 'Heading', 'What it lists'], [
  ['Payouts', 'Commission History',
   'Payout records raised against you: the reference number, your name, the job orders covered, '
   + 'the date, who raised it and the amount.'],
  ['Incentives', 'Incentives History',
   'The quota incentives the scheduled job has awarded you, one row per referral counted, showing '
   + 'the job order, the batch number, the quota reached and the date processed.'],
  ['Bonus', 'Bonus History',
   'Bonus records, each tagged either Add Bonus or Payout.'],
], { widths: [18, 24, 58] });
doc.p('The controls above the list are the same on every tab:');
doc.table(['Control', 'What it does'], [
  ['Search history...', 'Filters the rows on screen.'],
  ['Filter',
   'Opens a Date Range panel with From and To pickers and a Clear link. The button is highlighted '
   + 'while a range is set.'],
  ['Download', 'Exports what is on screen to a PDF.'],
  ['Refresh', 'Re-reads the list from the server.'],
  ['Add',
   'Records a payout. Drawn only for an account holding the payout permission, so an agent does '
   + 'not see it.'],
], { widths: [24, 76] });
doc.p(
  'Amounts are signed by type: an incentive payout is shown in red with a minus, an added '
  + 'incentive in green with a plus, and a plain payout without a sign.'
);

doc.h2('13.3 Reading One Record');
doc.p('Tapping a row opens its details. A payout record shows:');
doc.table(['Field', 'Meaning'], [
  ['ID', 'The record’s number.'],
  ['Reference No.', 'The reference the payout was recorded under.'],
  ['Transaction Type', 'Payout or Add Incentives, on incentive records.'],
  ['Job Orders', 'The customers this payout settles, by name.'],
  ['Date Processed', 'When the record was raised.'],
  ['Processed By', 'The email address of whoever raised it.'],
  ['Agent Name', 'Whose record it is.'],
  ['Status', 'Pending, Approved or Rejected.'],
  ['Approved By', 'The approver’s email address, or "Not yet approved".'],
  ['Remarks', 'What was written when it was raised, plus any rejection reason.'],
  ['Proof of Payment', 'The attached image, opened full size by tapping it.'],
], { widths: [26, 74] });

doc.h2('13.4 The Referral History List');
doc.p(
  'The Mobile Application also carries a per-referral history view. It lists completed referrals rather '
  + 'than payouts, and each card shows the '
  + 'customer’s name, the date and address, the installation fee, the installation status and '
  + 'the commission status as Collected or Not Collected. Its controls are:'
);
doc.table(['Control', 'Options'], [
  ['Type', 'All Types, or Incentives.'],
  ['Status', 'All Status, Not Collected, or Collected. Shown on All Types only.'],
  ['Dates', 'From and To pickers, with Clear.'],
], { widths: [20, 80] });
doc.p(
  'Switching Type to Incentives regroups the list into incentive batches. Each batch header shows '
  + '"Incentive Batch #n", the date it was processed, a count in the form "customers / quota", and '
  + 'the amount earned. Tapping the header opens the batch to list, in order, the customers that '
  + 'made it up.'
);
doc.callout('Not currently on the menu',
  'This view is built into the app but no menu entry or tab currently opens it. The same '
  + 'information is available elsewhere: a referral’s Collected or Not Collected state is on '
  + 'the Job Order record, and the incentive batches are on the Incentives tab of the History '
  + 'screen. If you need it on the menu, raise it with whoever maintains the app.');

doc.h2('13.5 The Web History Screen');
doc.p(
  'In the Web Application an agent sees a sidebar entry called History, which opens the bonus history screen. '
  + 'It is a table with the columns ID, Ref Number, Type, Total Amount, Created By, Status and '
  + 'Approved By, with a search box and a date range. The Add button is drawn only for an account '
  + 'that may record payouts. Administrators reach the same screen as "Bonus History" inside the '
  + 'Agent group.'
);

/* ── 14 ────────────────────────────────────────────────────────────────────── */
doc.h1('14. The Commission System');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('14.1 How Commission Is Earned');
doc.p(
  'Commission is the per-referral part of the scheme. One approved job order earns the agent’s '
  + 'commission rate, once.'
);
doc.table(['Question', 'Answer'], [
  ['What earns it?', 'A job order being APPROVED by an administrator.'],
  ['How much?',
   'The referring agent’s own commission rate at the moment of approval. Where the agent has '
   + 'no rate of their own, the global billing configuration’s agent commission is used.'],
  ['Where does it go?',
   'The agent’s earned-commission figure, shown as "Commission" in the Wallet breakdown and '
   + 'on the administrator’s summary cards.'],
  ['Can it be earned twice?',
   'No. The job order is stamped as settled in the same transaction, and a stamped job order is '
   + 'skipped on any later approval.'],
], { widths: [26, 74] });

doc.h2('14.2 The Commission Calculation');
doc.p(
  'There is no formula beyond the rate itself. What makes commission look like a calculation is '
  + 'the way payouts and invoices add it up:'
);
doc.table(['Where', 'The figure shown'], [
  ['Wallet breakdown, Commission line',
   'The running total of commission earned from approved job orders, less anything already paid '
   + 'out.'],
  ['Commission payout form',
   'The count of the agent’s completed, unpaid job orders multiplied by their rate, shown as '
   + '"n × rate = total" and filled into the amount.'],
  ['Weekly invoice, line items',
   'One line per referred customer, priced at the rate of the agent who brought that customer in.'],
  ['Weekly invoice, commission total',
   'The sum of those lines. On a team whose members are on different rates, each customer still '
   + 'counts at their own agent’s rate.'],
], { widths: [30, 70] });

doc.h2('14.3 Commission Status');
doc.table(['Status', 'Where it appears', 'Meaning'], [
  ['(empty)', 'A new job order', 'Not yet settled with any agent.'],
  ['Paid', 'A settled or paid-out job order',
   'Either settled at approval, or included in an approved payout or a settled invoice. Excluded '
   + 'from any future payout.'],
  ['Not Collected', 'The agent’s screens', 'The agent-facing wording for anything not Paid.'],
  ['Collected', 'The agent’s screens', 'The agent-facing wording for Paid.'],
], { widths: [20, 30, 50] });

doc.h2('14.4 When Commission Becomes Payable');
doc.steps([
  'The job order is approved. The commission is now earned and appears in the agent’s Wallet.',
  'The week ends and the invoice run bills the referral on the weekly invoice for the agent’s '
  + 'team, or for the agent alone.',
  'An administrator records a payout against that invoice. Nothing has moved yet.',
  'An approver approves the payout. Only now does the money leave the agent’s balance, the '
  + 'invoice become Paid, and the job orders behind it become Collected.',
]);
doc.callout('Earned is not the same as paid',
  'Between approval of the job order and approval of the payout, the money sits in the '
  + 'agent’s Wallet as earned commission. It is real, it is theirs, and it is visible on both '
  + 'apps — but it has not been handed over. A payout that is never approved leaves no trace on the '
  + 'agent’s money at all.');

/* ── 15 ────────────────────────────────────────────────────────────────────── */
doc.h1('15. The Incentive System');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('15.1 The Idea in One Sentence');
doc.p(
  'Reaching the quota is what earns the incentive: every time an agent completes a full quota of '
  + 'referrals, they are paid the incentive value once — not once per referral inside it.'
);
doc.p('So the calculation is:');
doc.table(null, [
  ['Incentive earned', '=', 'number of completed quotas × the incentive value'],
], { widths: [30, 8, 62], fontSize: 10 });

doc.h2('15.2 The Three Settings');
doc.table(['Setting', 'Set where', 'What it does'], [
  ['Quota', 'Agent account',
   'How many completed referrals make up one cycle. Zero means the agent is not on the scheme and '
   + 'earns no incentive at all.'],
  ['Incentives', 'Agent account',
   'The peso amount paid for each completed cycle. Zero means the same as above.'],
  ['Incentive value snapshot', 'Written automatically',
   'The incentive value in force when a job order was approved, copied onto the job order. This is '
   + 'what a batch is actually paid at.'],
], { widths: [26, 22, 52] });

doc.h2('15.3 Which Referrals Count');
doc.p('A referral counts toward the quota when either of these is true:');
doc.bullets([
  ['Its onsite status is Done. ', 'The installation has finished.'],
  ['It is marked pre-installed. ',
   'Whatever the onsite status says. This lets a referral earn quota progress once the site has '
   + 'been pre-installed, rather than waiting for the technician to close the job — the '
   + 'agent’s part of the work is finished either way.'],
]);
doc.p(
  'Counting early cannot cause double counting. Once a referral has been taken into a completed '
  + 'quota it is recorded in the incentive ledger, and a recorded referral is never looked at '
  + 'again — so when the installation later flips to Done, nothing further happens.'
);

doc.h2('15.4 How Quota Progress Is Tracked');
doc.p(
  'A scheduled job runs over every agent and asks one question: which of this agent’s '
  + 'countable referrals are not yet in the incentive ledger? That set only ever grows until a '
  + 'quota completes.'
);
doc.bullets([
  ['A run never resets progress. ',
   'An agent on a quota of 5 who has two referrals today still has both tomorrow, counted toward '
   + 'the same quota, however many times the job runs in between.'],
  ['A run with too few referrals awards nothing. ',
   'It records the progress — for example 2 of 5 — and leaves every referral where it is.'],
  ['A completed quota consumes its referrals permanently. ',
   'Each one is written to the ledger inside the same transaction that pays it, tagged with the '
   + 'batch number of that cycle. From then on they can never be counted toward another quota.'],
]);

doc.h2('15.5 What Happens When the Quota Is Reached');
doc.steps([
  'The job counts how many full quotas the available referrals make up.',
  'Only the referrals that make up whole quotas are taken. Any remainder is left untouched.',
  'Each full cycle becomes one batch, numbered per agent and continuing upward across runs — '
  + 'batch 1, then 2, then 3, and so on.',
  'Each cycle is paid the incentive value once, at the rate carried by the referral that '
  + 'completed it. Because referrals are consumed oldest first, that is the most recent one in '
  + 'the batch.',
  'The referrals in the cycle are written to the ledger, and the agent’s incentive figure is '
  + 'increased by the total. Both happen in one transaction, so a referral can never be paid '
  + 'without being recorded.',
]);

doc.h2('15.6 Excess Referrals and Carry-Over');
doc.p(
  'Nothing is ever discarded for want of a full quota. Referrals beyond the last whole cycle stay '
  + 'out of the ledger on purpose, so they become the opening progress of the next quota.'
);

doc.h2('15.7 Worked Examples');
doc.p('In each example the agent is on a quota of 10 with an incentive value of PHP 100.00.');
doc.table(['Situation', 'What the job does'], [
  ['7 countable referrals',
   'No award. Progress is recorded as 7 of 10 and all seven are carried to the next run.'],
  ['10 countable referrals',
   'One cycle. PHP 100.00 awarded, all ten written to the ledger as batch 1, nothing carried.'],
  ['13 countable referrals',
   'One cycle. PHP 100.00 awarded on the first ten as batch 1; the remaining three are carried '
   + 'and become the opening progress of batch 2.'],
  ['23 countable referrals in one run',
   'Two cycles at once. PHP 200.00 awarded — PHP 100.00 as batch 1 and PHP 100.00 as batch 2 '
   + '— twenty referrals recorded, three carried.'],
  ['The three carried, plus seven new next week',
   'Ten again. One cycle, PHP 100.00, recorded as batch 3.'],
], { widths: [30, 70] });
doc.callout('The quota is not a target you can miss',
  'There is no deadline on a quota. An agent who brings in three referrals this month and seven '
  + 'next month completes exactly the same cycle as an agent who brings in ten in a week. Only '
  + 'achievements are time-bounded.');

doc.h2('15.8 Incentive History');
doc.p(
  'Every referral taken into a completed quota leaves a row in the incentive history, readable on '
  + 'the Incentives tab of the History screen and in the incentive batch view. Each row carries:'
);
doc.table(['Field', 'Meaning'], [
  ['Job Order', 'The referral that was counted.'],
  ['Batch', 'Which completed quota it belonged to. Batches number upward per agent.'],
  ['Quota Reached', 'The quota size in force when the cycle completed.'],
  ['Incentive Value',
   'The amount the cycle earned, recorded against the referral that completed it. The other '
   + 'referrals in the batch carry zero, so summing the column reproduces the balance exactly.'],
  ['Processed At',
   'When the quota was reached. This is what decides which weekly invoice bills it.'],
  ['Invoice',
   'The invoice that billed this completed quota, if any. Empty means earned but not yet billed.'],
], { widths: [24, 76] });

doc.h2('15.9 Incentive Generation and Payment');
doc.table(['Step', 'What happens', 'Who or what does it'], [
  ['Award', 'A completed quota increases the agent’s incentive figure.',
   'The scheduled incentive job.'],
  ['Bill', 'The completed quota is claimed by the weekly invoice covering the week it was '
   + 'awarded in, and stamped with that invoice.', 'The weekly invoice run.'],
  ['Pay', 'A payout is recorded against the invoice and approved, which moves the money out of '
   + 'the agent’s incentive figure.', 'An administrator, then an approver.'],
], { widths: [14, 56, 30] });
doc.callout('A quota is billed exactly once',
  'Claiming a completed quota stamps the invoice’s identity onto its ledger rows, and the '
  + 'claim only ever lands on rows that are still unstamped. A quota already billed cannot be '
  + 'billed again, and two invoice runs overlapping cannot both take the same one.');

/* ── 16 ────────────────────────────────────────────────────────────────────── */
doc.h1('16. Balance, Earnings and Bonuses');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('16.1 The Five Figures on an Agent');
doc.p(
  'An agent’s money is held in independent buckets. They are never mixed: each kind of '
  + 'transaction only ever moves its own bucket, which is what keeps the same money from being '
  + 'counted twice.'
);
doc.table(['Figure', 'What fills it', 'What empties it'], [
  ['Commission',
   'Approving a job order referred by this agent.',
   'An approved commission payout, or an approved All Balance payout.'],
  ['Incentives',
   'The incentive job awarding a completed quota. An administrator may also add incentives by '
   + 'hand.',
   'An approved incentive payout, or an approved All Balance payout.'],
  ['Bonus',
   'An administrator recording a bonus, once approved.',
   'An approved bonus payout, or an approved All Balance payout.'],
  ['Balance',
   'Claiming an achievement reward. This is the spendable bucket.',
   'An approved balance payout, or an approved All Balance payout.'],
  ['Achievement',
   'Claiming an achievement reward — credited alongside Balance as a lifetime record.',
   'Nothing. It is a running total, not a bucket, and is never paid out.'],
], { widths: [18, 44, 38] });

doc.h2('16.2 Total Balance');
doc.p(
  'The headline figure on the Wallet tab is Commission plus Balance plus Incentives plus Bonus. '
  + 'Achievement is deliberately left out, because a claimed reward has already been paid into '
  + 'Balance and would otherwise be counted twice.'
);

doc.h2('16.3 The Rate Fields Are Not Balances');
doc.callout('Commission means two different things',
  'On an agent’s record, "Commission" is the RATE one referral pays — a setting an '
  + 'administrator types in. In the Wallet, on the summary cards and in the payout form, '
  + '"Commission" is the amount EARNED from approved job orders. They are separate fields with the '
  + 'same label. The same applies to "Incentives": the field on the agent form is the rate per '
  + 'completed quota; the figure in the Wallet is what has been earned.');

doc.h2('16.4 How a Payout Moves the Buckets');
doc.p(
  'A payout only moves anything once it has been approved. What it moves depends on its type.'
);
doc.table(['Payout type', 'Effect on approval'], [
  ['Commission', 'Reduces the Commission figure by the amount.'],
  ['Add Incentives', 'Increases the Incentives figure by the amount.'],
  ['Incentive payout', 'Reduces the Incentives figure by the amount.'],
  ['Bonus', 'Increases the Bonus figure by the amount.'],
  ['Bonus payout', 'Reduces the Bonus figure by the amount.'],
  ['Balance', 'Reduces the Balance figure by the amount.'],
  ['All Balance',
   'Drains the buckets in order — Commission first, then Balance, then Incentives, then Bonus. '
   + 'Paying the full total empties them all; a smaller amount drains them in that order until it '
   + 'is used up.'],
  ['Achievement',
   'Recorded automatically when a reward is claimed, already approved. It never queues for '
   + 'approval, because the entitlement was checked when the reward was granted.'],
], { widths: [24, 76] });
doc.p('No bucket is ever driven below zero: a payout larger than a bucket empties it and stops.');

doc.h2('16.5 Balance History');
doc.p(
  'Every movement leaves a record. Between them, three lists account for every peso on an '
  + 'agent’s record:'
);
doc.table(['List', 'Where to read it', 'What it holds'], [
  ['Payout history', 'History > Payouts, or Agent Payout',
   'Commission, incentive, balance, All Balance and achievement records, with their approval '
   + 'state.'],
  ['Incentive history', 'History > Incentives',
   'One row per referral counted into a completed quota, with its batch and the invoice that '
   + 'billed it.'],
  ['Bonus history', 'History > Bonus, or Bonus History',
   'Bonus additions and bonus payouts, with their approval state.'],
], { widths: [20, 30, 50] });

doc.h2('16.6 Payment Records');
doc.p('Every payout record carries the evidence of the payment it represents:');
doc.table(['Field', 'What it holds'], [
  ['Reference Number', 'Generated automatically, or the invoice number when raised from an invoice.'],
  ['Total Amount', 'The peso figure paid.'],
  ['Proof of Payment', 'An uploaded image — a deposit slip or transfer receipt.'],
  ['Remarks', 'Free text describing the payment. A rejection reason is appended here.'],
  ['Job Orders', 'The referrals this payout settles, held so approval marks exactly those as paid.'],
  ['Created By', 'The email address of whoever raised it.'],
  ['Approved By', 'The email address of whoever approved or rejected it.'],
  ['Status', 'Pending, Approved or Rejected.'],
], { widths: [26, 74] });

/* ═════════════════════════════════════════════════════════════════════════════
   PART FIVE — INVOICES AND TEAMS
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Five', 'Weekly Referral Invoices and Teams',
  'The weekly invoice is the document that turns an agent’s earnings into something payable. '
  + 'This part explains how it is built, what is on it, and how teams differ from solo agents.');

/* ── 17 ────────────────────────────────────────────────────────────────────── */
doc.h1('17. The Weekly Referral Invoice');
doc.metaLine([BOTH, WEB]);

doc.h2('17.1 What It Is and When It Is Raised');
doc.p(
  'One referral invoice is raised for every team, and one for every solo agent, covering the '
  + 'calendar week that has just ended. The run happens automatically at midnight every Monday and '
  + 'bills Monday 00:00:00 to Sunday 23:59:59 of the previous week.'
);
doc.bullets([
  ['The current week is never billed. ',
   'It has not finished, and its work belongs to next week’s invoice.'],
  ['A late run corrects itself. ',
   'The window is calendar-aligned, so a catch-up run on the Wednesday still bills the same '
   + 'Monday-to-Sunday week the Monday run would have. Consecutive weeks abut exactly: no day is '
   + 'billed twice and none is skipped.'],
  ['Running it twice is safe. ',
   'An owner already invoiced for that week is skipped, and the database refuses a customer '
   + 'already billed to that owner. A repeat run creates nothing.'],
]);

doc.h2('17.2 Who an Invoice Is Addressed To');
doc.table(['Owner', 'Invoice type', 'Covers'], [
  ['A team', 'Team',
   'Every agent on that team, on one document. A team of five gets one invoice, not five.'],
  ['An agent with no team', 'Solo', 'That agent alone.'],
], { widths: [26, 18, 56] });

doc.h2('17.3 Which Referrals Are Billed');
doc.p('A referred customer appears on an invoice when all of these hold:');
doc.bullets([
  ['The job order is Done or Completed. ', 'An unfinished installation is not billed.'],
  ['The installation falls inside the billing week. ',
   'Measured from the installation date, falling back to when the job order was raised and then '
   + 'to when the record was created, so a completed referral is never silently missed.'],
  ['The Referred By value matches an agent belonging to this owner. ',
   'Under the same name rule as everywhere else. On a team invoice each customer stays attached '
   + 'to whoever actually brought them in.'],
  ['The customer has not already been billed to this owner. ',
   'Enforced twice — once when the invoice is built, and once by the database.'],
]);

doc.h2('17.4 The Figures on an Invoice');
doc.table(['Figure', 'How it is worked out'], [
  ['Total Clients Installed', 'The number of referred customers on the invoice.'],
  ['Unit Price',
   'The commission rate the lines are priced at. Where every line shares one rate, that rate; on '
   + 'a mixed-rate team, where no single figure is the truth, the owner’s own rate.'],
  ['Line total (per customer)',
   'The commission rate of the agent who referred that customer. Quantity is one per customer.'],
  ['Commission',
   'The sum of the line totals. On a single-rate team this is simply customers × rate.'],
  ['Incentive',
   'The completed quotas the incentive job awarded to this owner’s agents inside this '
   + 'billing week. Read from the incentive ledger, never recalculated — the incentive job is the '
   + 'only thing that can see progress accumulating across weeks.'],
  ['Installation Fee',
   'A fixed figure stated on the document for reference. It does NOT form part of what is owed.'],
  ['Subtotal', 'Incentive plus Commission.'],
], { widths: [26, 74] });

doc.callout('Two labels that read the other way round on the PDF',
  'On the printed invoice, TOTAL AMOUNT is the referral commission — the figure the customer table '
  + 'above it adds up to — and INCENTIVE is the completed-quota payout. In the on-screen detail '
  + 'panel the same two figures appear under the labels Commission and Total Amount respectively. '
  + 'The document and the screen are showing the same money; only the labels differ. SUBTOTAL is '
  + 'the sum of the two in both places.');

doc.h2('17.5 An Invoice Is Raised Even for a Quiet Week');
doc.p(
  'An owner can legitimately have referrals without an incentive, or an incentive without '
  + 'referrals — a quota can complete in a week whose own installations all fall in the next one. '
  + 'An invoice is raised whenever either exists. Only when both are empty is the owner skipped, '
  + 'and the run records that as "nothing billable this week" rather than as a fault.'
);

doc.h2('17.6 Invoice Numbers and Status');
doc.p(
  'Invoice numbers run in one sequence in the form ATSS-AGT-000001, taken from the highest number '
  + 'ever issued rather than a count of rows, so deleting an invoice cannot hand its number to a '
  + 'later one. The prefix is a configured value and is quoted here as the system currently '
  + 'prints it.'
);
doc.table(['Status', 'Meaning', 'Offered in the dropdown?'], [
  ['Generated', 'Where every invoice starts.', 'Yes'],
  ['Paid', 'Settled. Set by hand, or automatically when a payout naming it is approved.', 'Yes'],
  ['Unpaid', 'Marked outstanding by hand.', 'Yes'],
  ['Sent', 'A legacy status. Existing invoices keep it and display it correctly.', 'No'],
  ['Cancelled', 'A legacy status, handled the same way.', 'No'],
], { widths: [20, 56, 24] });

doc.h2('17.7 The Invoices Screen, Step by Step');
doc.p(
  'Web Application > Invoices (agents), or Agent > Invoices (administrators). The list is one '
  + 'column and the detail pane another, so opening a record narrows the list rather than covering '
  + 'it.'
);
doc.table(['Column', 'Shows'], [
  ['Invoice No.', 'The invoice number.'],
  ['Type', 'Team or Solo.'],
  ['Team / Agent', 'Who the invoice is addressed to.'],
  ['Invoice Date', 'The day it was raised.'],
  ['Billing Period', 'The week it covers.'],
  ['Customers', 'How many referred customers it bills.'],
  ['Total Amount', 'The incentive figure.'],
  ['Subtotal', 'Incentive plus commission.'],
  ['Status', 'A read-only badge, or an editable dropdown for an administrator.'],
], { widths: [22, 78] });
doc.p('The toolbar above the list carries four controls:');
doc.table(['Control', 'What it does'], [
  ['Search', 'Filters by invoice number, team name or agent name.'],
  ['Type filter', 'All types, Team, or Solo.'],
  ['Clear', 'Appears once a search or a type filter is set, and removes both.'],
  ['Download', 'Opens the bulk download dialog — see 17.9.'],
  ['Refresh', 'Re-reads the list.'],
], { widths: [22, 78] });
doc.p(
  'When there are no invoices the list reads "No invoices yet" with the note "Invoices are raised '
  + 'automatically every Monday for the week just ended."'
);

doc.h2('17.8 The Invoice Detail Pane');
doc.p(
  'Clicking a row opens the pane on the right. Drag its left edge to widen it. The header carries '
  + 'the invoice number, previous- and next-record arrows and a close button. The body lists:'
);
doc.table(['Row', 'Shows'], [
  ['Invoice No.', 'The invoice number.'],
  ['Type', 'Team or Solo.'],
  ['Team / Agent', 'The owner.'],
  ['Invoice Date', 'The day it was raised.'],
  ['Billing Period', 'Start and end dates.'],
  ['Total Clients Installed', 'The customer count.'],
  ['Unit Price', 'The rate the lines are priced at.'],
  ['Installation Fee', 'Stated for reference.'],
  ['Total Amount', 'The incentive figure.'],
  ['Commission', 'The referral commission total.'],
  ['Subtotal', 'The two added together.'],
  ['Status', 'Coloured by state — green for Paid, red for Cancelled, orange for Sent.'],
], { widths: [26, 74] });
doc.p(
  'Beneath that sits a collapsible "Referred Customers" section with a count badge, listing '
  + 'Customer, Referred By, Installed, Unit Price, Qty and Total. This is the line-by-line record '
  + 'of who was billed and who brought them in.'
);
doc.p('The pane’s action buttons are:');
doc.table(['Button', 'What it does', 'Who sees it'], [
  ['View PDF', 'Opens the rendered invoice.', 'Anyone who can see the invoice.'],
  ['Download PDF', 'Saves the rendered invoice.', 'Anyone who can see the invoice.'],
  ['Pay Out',
   'Opens the payout form pre-filled with this invoice’s number as the reference.',
   'Administrators.'],
], { widths: [22, 52, 26] });

doc.h2('17.9 Downloading Invoices');
doc.p(
  'The Download button in the toolbar opens a small dialog with two choices, and produces one PDF '
  + 'containing every invoice selected.'
);
doc.table(['Choice', 'What it downloads'], [
  ['Download all', 'Every invoice you are allowed to see.'],
  ['Specific date',
   'One billing week, chosen from a list the server supplies. The list is drawn from all your '
   + 'invoices, not just the page on screen, and each entry shows the week, how many invoices it '
   + 'holds and their combined subtotal.'],
], { widths: [26, 74] });
doc.p(
  'A single invoice is opened from its detail pane instead. The PDF is produced once and kept, '
  + 'and is re-rendered automatically if the document layout has moved on since — so an old '
  + 'invoice opened today prints in the current layout without anybody having to regenerate it.'
);

doc.h2('17.10 What Is on the Printed Invoice');
doc.table(['Section', 'Contents'], [
  ['Header',
   'The branded artwork, which currently carries the ATSS FIBER mark and the company’s '
   + 'contact details.'],
  ['Banner', 'The description line "BOOTH - REFERRAL", the invoice date and who it is billed to.'],
  ['Customer table',
   'DESCRIPTION, UNIT PRICE, QTY and TOTAL. On a team invoice each row carries a second line '
   + 'reading "referred by ..." naming the agent; a solo invoice has no such line, because the '
   + 'one agent is already in the heading.'],
  ['Totals block',
   'TOTAL CLIENT INSTALLED, INSTALLATION FEE, TOTAL AMOUNT, INCENTIVE and SUBTOTAL.'],
  ['Signature', 'A SIGNATURE line for sign-off.'],
  ['Pre-installation remarks',
   'Printed at the foot where any of the invoice’s job orders carry them, with the customer, '
   + 'when the note was recorded and by whom.'],
  ['Footer', 'The invoice number and the billing period, plus the company artwork.'],
], { widths: [26, 74] });
doc.p(
  'Page one holds fifteen customer rows on a solo invoice and ten on a team one, whose rows are '
  + 'taller because of the "referred by" line. Later pages hold eighteen. This is what keeps the '
  + 'totals block from being pushed onto a page of its own.'
);
doc.p(
  'Two sample invoices — one solo and one team — are kept alongside this manual as '
  + 'SAMPLE-Agent-Invoice-Solo.pdf and SAMPLE-Agent-Invoice-Team.pdf.'
);

doc.h2('17.11 Who Can See Which Invoices');
doc.p('Every invoice query is scoped before it runs, on the server, on every screen and endpoint:');
doc.table(['Signed in as', 'Sees'], [
  ['An agent in a team', 'That team’s invoices.'],
  ['An agent with no team', 'Their own invoices only.'],
  ['An administrator', 'Their organisation’s invoices.'],
  ['A super administrator', 'Everything.'],
], { widths: [30, 70] });
doc.callout('An agent cannot reach another team’s invoice',
  'The scope is applied inside a single method that every endpoint uses, so guessing an invoice '
  + 'number or an address is refused with "Invoice not found" rather than returning somebody '
  + 'else’s document.');

/* ── 18 ────────────────────────────────────────────────────────────────────── */
doc.h1('18. Teams and Solo Agents');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('18.1 What a Team Changes');
doc.table(['Aspect', 'Solo agent', 'Team agent'], [
  ['Invoice', 'One invoice addressed to them.',
   'One invoice per team, covering every member.'],
  ['Invoice lines', 'The customers they referred.',
   'The customers every member referred, each row naming who brought them in.'],
  ['Invoice rate', 'Their own commission rate.',
   'Each line at its own agent’s rate; the header Unit Price is the shared rate, or the '
   + 'owner’s where members differ.'],
  ['Commission', 'Personal.', 'Personal — a team does not pool commission.'],
  ['Quota and incentives', 'Personal.', 'Personal — each member has their own quota and progress.'],
  ['Achievements', 'Personal.', 'Personal.'],
  ['Balance', 'Personal.', 'Personal.'],
  ['What they see on Invoices', 'Their own.', 'The whole team’s.'],
  ['Payout', 'Settles their own invoices.',
   'A member’s All Balance payout settles the TEAM’S outstanding invoices, because that '
   + 'is the document their referrals were billed on.'],
], { widths: [20, 38, 42] });

doc.h2('18.2 Team Performance and Team Earnings');
doc.p(
  'There is no separate team dashboard, team balance or team performance screen. A team’s '
  + 'performance is read from its invoices: the customer count, the commission total and the '
  + 'incentive total on each weekly invoice, and the "Referred Customers" list that names who '
  + 'contributed what. Individual figures are read per agent on the Agent Payout screen.'
);

doc.h2('18.3 Assigning and Reassigning');
doc.p(
  'An agent is put into a team, moved between teams, or taken out of every team through the Team '
  + 'field on their own account — see 5.5. Creating and renaming teams themselves is done on the '
  + 'Team Agents screen — chapter 3.'
);

/* ═════════════════════════════════════════════════════════════════════════════
   PART SIX — ADMINISTERING THE MODULE IN THE WEB APPLICATION
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Six', 'Administering the Module in the Web Application',
  'The management side: recording payouts, approving them, generating and settling invoices, and '
  + 'the scheduled jobs that run in the background.');

/* ── 19 ────────────────────────────────────────────────────────────────────── */
doc.h1('19. The Agent Payout Screen');
doc.metaLine([ADMIN, WEB]);

doc.h2('19.1 Layout');
doc.p('Sidebar > Agent > Agent Payout. The screen has three regions.');
doc.table(['Region', 'Contents'], [
  ['Left sidebar',
   'A Date Range filter with From and To and a Clear link, then All Agents with a count, then '
   + 'every agent by name. Selecting one filters the whole screen to them. The sidebar’s '
   + 'width can be dragged.'],
  ['Summary cards',
   'Four cards shown once a single agent is selected: Commission, Incentives, Bonus and '
   + 'Achievement. These are the same four figures the payout form shows.'],
  ['Payout history table',
   'Every payout record for the selection, with the columns listed in 19.2.'],
], { widths: [24, 76] });
doc.p(
  'There is deliberately no Add button on this screen. A payout is raised from the agent invoice '
  + 'it settles, so its reference ties back to that document.'
);

doc.h2('19.2 The Payout History Columns');
doc.table(['Column', 'Shows'], [
  ['ID', 'The record’s number.'],
  ['Type', 'What kind of movement it is.'],
  ['Ref Number', 'The reference, which is the invoice number on an invoice payout.'],
  ['Total Amount', 'The peso figure.'],
  ['Job Orders', 'The customers the payout settles, by name.'],
  ['Created By', 'The email address of whoever raised it.'],
  ['Status', 'Pending, Approved or Rejected.'],
  ['Approved By', 'The email address of whoever signed it off.'],
], { widths: [22, 78] });
doc.p(
  'The toolbar carries a search box, a date filter on narrow screens, and a Column Visibility '
  + 'button with Select All and Deselect All. Columns can be reordered by dragging, and your '
  + 'arrangement is remembered in your own browser.'
);

doc.h2('19.3 Recording a Payout Against an Invoice');
doc.steps([
  'Open Invoices, find the invoice to settle and open its detail pane.',
  'Press Pay Out. The payout form opens with the agent and the invoice number already filled in, '
  + 'and the reference is read-only.',
  'Because this is an invoice payout, the form does not ask for the payout type, the amount, the '
  + 'proof or the remarks — you are recording that the invoice was settled, not entering a '
  + 'payment by hand. Those details are collected at approval instead.',
  'Press Save. The record is created as Pending. Nothing has moved: the agent’s balance is '
  + 'untouched and no job order is marked paid.',
]);

doc.h2('19.4 Recording a Payout by Hand');
doc.p(
  'Where a payout is entered directly rather than from an invoice, the form asks for everything.'
);
doc.table(['Field', 'Notes'], [
  ['Agent',
   'A searchable list grouped by team. Shown only when the form was not opened against a '
   + 'particular agent.'],
  ['Balance tiles',
   'Four read-only tiles above the fields — Commission, Incentives, Bonus and Achievement — '
   + 'showing what the selected agent currently holds.'],
  ['Payout Type',
   'One option: All Balance. It cashes out every bucket, so there is no partial settlement left '
   + 'to reconcile later.'],
  ['Reference Number', 'Generated automatically and read-only.'],
  ['Total Amount',
   'Filled in automatically with the agent’s whole balance and locked, because All Balance '
   + 'means exactly that.'],
  ['Proof', 'An image of the payment. Required.'],
  ['Remarks', 'Required.'],
], { widths: [24, 76] });
doc.p(
  'Save is disabled until an agent is chosen, an amount above zero exists and does not exceed the '
  + 'agent’s available total, and both a proof image and remarks are present.'
);

doc.h2('19.5 Approving a Payout');
doc.steps([
  'Open the payout record from the Agent Payout list. Approve and Reject appear in its detail '
  + 'pane, and only while the record is Pending.',
  'Press Approve. Because an invoice payout was recorded without them, the form now asks for the '
  + 'amount, the type, the proof and the remarks. They are written to the record before anything '
  + 'is applied, so the balance moves by the figure just entered.',
  'On approval the system, in one transaction: applies the movement to the agent’s buckets; '
  + 'marks the referrals the payout covers as paid; settles the invoice the reference names, or '
  + '— on an All Balance payout with no named invoice — every outstanding invoice for that '
  + 'owner; and records who approved it and when.',
  'The record moves to Approved and the approver’s email address appears under Approved By.',
]);
doc.table(['Refusal', 'Meaning'], [
  ['Only pending payouts can be approved. This one is approved.',
   'It has already been approved. This is what stops a balance being moved twice.'],
  ['Only pending payouts can be rejected. This one is rejected.',
   'It has already been closed.'],
  ['Unauthorized access to this payout',
   'The record belongs to another organisation.'],
  ['Payout record not found', 'The record does not exist.'],
], { widths: [46, 54] });

doc.h2('19.6 Rejecting a Payout');
doc.p(
  'Press Reject. The record is closed as Rejected, the rejection reason is appended to its '
  + 'remarks, and the approver is recorded. No balance is touched, no job order is marked paid and '
  + 'no invoice is settled. The confirmation reads "Payout rejected. No balance was changed."'
);
doc.callout('Why nothing happens until approval',
  'A payout that is never approved must leave no trace on the agent’s money. That is why the '
  + 'balance movement, the marking of job orders and the settling of invoices all happen at '
  + 'approval rather than when the record is raised — marking an invoice Paid at that point would '
  + 'settle it against a payment that may never happen.');

doc.h2('19.7 Recording Incentives and Bonuses by Hand');
doc.p(
  'Two further forms exist for adjustments outside the automatic machinery. Both create Pending '
  + 'records that move nothing until approved.'
);
doc.table(['Form', 'Reached from', 'Fields'], [
  ['Incentives',
   'The Add button on the incentive history view.',
   'Transaction Type (Payout, or Add Incentives), Reference Number (automatic), Total Amount, '
   + 'Proof and Remarks — all required.'],
  ['Bonus',
   'The Add button on Bonus History.',
   'Type (Bonus, or Bonus payout), Reference Number, Total Amount, Proof and Remarks — all '
   + 'required.'],
  ['Commission payout',
   'The Record Payout button on a team row, or the commission history view.',
   'Agent, Reference Number, an optional Start Date and End Date, a read-only list of the job '
   + 'orders referred by that agent, Total Amount (calculated as count × rate but editable), '
   + 'Proof of Payment and Remarks.'],
], { widths: [20, 32, 48] });
doc.p(
  'On the commission payout form the job order list is read-only and shows the completed job '
  + 'orders where the agent is the referrer and which have not already been paid. A badge above it '
  + 'reads the count and the rate, and a line beside the amount shows the arithmetic — for example '
  + '"12 × PHP 100 = PHP 1,200".'
);

/* ── 20 ────────────────────────────────────────────────────────────────────── */
doc.h1('20. Administering Invoices');
doc.metaLine([ADMIN, WEB]);

doc.h2('20.1 Generating Invoices by Hand');
doc.p(
  'The invoice run is scheduled, so generating by hand is a catch-up action rather than a routine '
  + 'one. It requires the invoice-generate permission; anybody else is refused with "Only an '
  + 'administrator can generate agent invoices."'
);
doc.steps([
  'Trigger a generation. The date you supply is treated as the generation date: the seven days '
  + 'BEFORE it are billed, exactly as the Monday run for that date would have produced.',
  'The run resolves every owner, works out what is billable, claims the incentives awarded inside '
  + 'the week, writes each invoice inside its own transaction, and renders the PDF.',
  'The result reports how many invoices were created and for which period.',
  'The run is logged, and the log names the person who pressed the button — a cron run has no '
  + 'equivalent, and it is the first thing anybody asks about an unexpected invoice.',
]);
doc.callout('Generating twice is harmless',
  'An owner already invoiced for the week is skipped and reported as such, and the database '
  + 'refuses a customer already billed to that owner. A second run creates nothing.');

doc.h2('20.2 Changing an Invoice Status');
doc.steps([
  'Find the invoice in the list. The Status cell is a dropdown for an administrator and a plain '
  + 'badge for everybody else.',
  'Choose Generated, Paid or Unpaid. The change saves immediately; a small spinner shows while it '
  + 'is in flight.',
  'An invoice already carrying a legacy status keeps it, and that status is added to its own '
  + 'dropdown so the control shows what the invoice actually says.',
]);
doc.p(
  'Anybody without the status permission is refused with "Only an administrator can change an '
  + 'invoice status."'
);

doc.h2('20.3 Settling Invoices Through a Payout');
doc.p('Approving a payout settles invoices in one of two ways:');
doc.table(['Case', 'What is settled'], [
  ['The payout’s reference matches an invoice number',
   'Exactly that invoice is marked Paid, and the job orders on its lines follow. This is the case '
   + 'for a payout raised from an invoice.'],
  ['An All Balance payout whose reference names no invoice',
   'Every outstanding invoice for that owner is marked Paid, together with the job orders on their '
   + 'lines. A team member’s payout therefore settles the team’s invoices.'],
], { widths: [38, 62] });
doc.p(
  'An invoice already Paid is left alone, so approving twice cannot restate it, and the count '
  + 'reported is what the approval actually changed rather than what it looked at.'
);

/* ── 21 ────────────────────────────────────────────────────────────────────── */
doc.h1('21. Scheduled Jobs and Automation');
doc.metaLine([ADMIN, WEB]);

doc.h2('21.1 What Runs Without Anybody Pressing Anything');
doc.table(['Job', 'When', 'What it does'], [
  ['Agent invoice generation', 'Every Monday at 00:00',
   'Raises one referral invoice per team and per solo agent for the week that has just ended, and '
   + 'renders each one to PDF.'],
  ['Agent incentive processing', 'On a schedule',
   'Counts each agent’s uncounted completed referrals and awards the incentive value once per '
   + 'full quota, recording every referral it consumes.'],
  ['Achievement period closing', 'Whenever an agent’s achievements are read',
   'Records each period that has ended, with what it finished on and the fact that nothing carried '
   + 'forward. A scheduled pass covers agents nobody opens.'],
], { widths: [26, 26, 48] });

doc.h2('21.2 Reading the Logs');
doc.p(
  'Both money-moving jobs write their own log, line by line, so a run can be read afterwards and '
  + 'reconciled.'
);
doc.table(['Log line', 'What it tells you'], [
  ['[AGENT] name (#id)', 'Which agent the block below belongs to.'],
  ['[CONFIG] Quota / Incentive Value / Current Incentives', 'The settings the run used.'],
  ['[SKIP] Quota or incentive value not configured', 'The agent earns no incentive — see 2.1.'],
  ['[SKIP] no matching user record', 'The balance record points at an account that is not there.'],
  ['[MATCH] Matching job orders via referred_by', 'The exact name variants it searched for.'],
  ['[QUERY] Countable / Already processed / New & countable',
   'How many referrals qualify, how many were already consumed, and how many are available.'],
  ['[PROGRESS] n/quota toward next incentive', 'Progress recorded; nothing awarded this run.'],
  ['[CARRY] Kept for the next run (not reset)',
   'The exact job orders carried forward. The same numbers should reappear next run.'],
  ['[BATCH n] +amount ... for job order ID(s)',
   'One completed quota: what it paid and which customers made it up.'],
  ['[AWARD] Incentives: before > after', 'The balance movement.'],
  ['SKIPPED: already invoiced for this week as ATSS-AGT-...',
   'A repeat invoice run finding the owner already billed.'],
  ['SKIPPED: nothing billable this week', 'No referrals and no incentives for that owner.'],
], { widths: [40, 60] });

doc.h2('21.3 The Settlement Diagnostic');
doc.p(
  'A read-only diagnostic exists for the commonest question in this module — why a particular job '
  + 'order did or did not settle a commission with its referring agent. It walks the exact same '
  + 'resolution the live settlement walks and explains each step, without changing anything. Ask '
  + 'your systems administrator to run it when a referral appears to have been missed.'
);

/* ═════════════════════════════════════════════════════════════════════════════
   PART SEVEN — REFERENCE
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Seven', 'Reference',
  'The two systems side by side, the end-to-end workflow in one place, troubleshooting, and the '
  + 'complete list of statuses and fields.');

/* ── 22 ────────────────────────────────────────────────────────────────────── */
doc.h1('22. Mobile Application versus the Web Application');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('22.1 What an Agent Can Do, Where');
doc.table(['Task', 'Mobile Application', 'Web Application'], [
  ['Sign in', 'Yes', 'Yes'],
  ['See the Agent Dashboard', 'Yes', 'Yes — the same figures'],
  ['Submit a customer application', 'Yes', 'Yes'],
  ['See their live job orders', 'Yes', 'Yes'],
  ['See work orders', 'Yes', 'Yes'],
  ['Read payout, incentive and bonus history', 'Yes', 'Yes'],
  ['See a referral marked Collected or Not Collected', 'Yes, on Job Order', 'Yes, on Job Order'],
  ['Claim an achievement reward', 'Yes', 'Yes'],
  ['Read their weekly referral invoices', 'No', 'Yes'],
  ['Download an invoice PDF', 'No', 'Yes'],
  ['Record a payout', 'No', 'No'],
  ['Approve anything', 'No', 'No'],
], { widths: [46, 26, 28] });

doc.h2('22.2 What an Administrator Can Do, Where');
doc.table(['Task', 'Mobile Application', 'Web Application'], [
  ['Create and edit teams', 'Yes — Menu > Agent > Team Agents', 'Yes'],
  ['Create and edit agent accounts', 'Yes — Menu > Agent > Agent Management', 'Yes'],
  ['Activate and deactivate an account', 'Yes', 'Yes'],
  ['Set commission, quota and incentive rates', 'Yes', 'Yes'],
  ['Record a commission, incentive or bonus payout', 'Yes', 'Yes'],
  ['Approve or reject a payout', 'No', 'Yes'],
  ['Generate weekly invoices', 'No', 'Yes'],
  ['Change an invoice status', 'No', 'Yes'],
  ['Download invoice PDFs', 'No', 'Yes'],
  ['Approve a job order', 'Yes', 'Yes'],
], { widths: [46, 30, 24] });

doc.h2('22.3 What Is Synchronised, and How');
doc.p(
  'Nothing is copied between the two applications, because there is nothing to copy: they are two '
  + 'windows onto one database. Every figure in this manual is held on the server and calculated '
  + 'there.'
);
doc.table(['Action', 'Where it becomes visible', 'How soon'], [
  ['An administrator creates an agent account',
   'The agent can sign in to either application.', 'Immediately.'],
  ['An administrator changes a commission or quota rate',
   'The agent’s next approved job order and next incentive cycle.',
   'Immediately for new work; settled work keeps its old rates.'],
  ['An administrator deactivates an account',
   'The agent’s next sign-in attempt is refused.',
   'Immediately. A session already open continues until it ends.'],
  ['An administrator changes a role’s permissions',
   'The agent’s menus and buttons.',
   'On the Mobile Application’s next launch; on the Web Application’s next sign-in.'],
  ['An agent submits an application',
   'Application Management for the office.', 'Immediately.'],
  ['An administrator approves a job order',
   'The agent’s Wallet, and the job order’s commission status.',
   'On the agent’s next refresh.'],
  ['The incentive job awards a quota',
   'The agent’s Incentives figure and their incentive history.',
   'On the agent’s next refresh.'],
  ['An agent claims an achievement reward',
   'Their balance, their Achievement total, and a payout record visible to administrators.',
   'Immediately.'],
  ['An administrator approves a payout',
   'The agent’s Wallet, their history, the invoice status, and the job orders’ '
   + 'commission status.',
   'On the agent’s next refresh.'],
], { widths: [30, 40, 30] });

doc.h2('22.4 Screens That Exist in Only One System');
doc.table(['Screen', 'Where', 'Note'], [
  ['Invoices', 'Web Application only',
   'Agents hold the invoice permission on both, but the Mobile Application has no invoice screen. '
   + 'Agents who need their invoice must use the Web Application.'],
  ['Per-referral history view with incentive batches',
   'Mobile Application only',
   'Built into the app but not currently reachable from its menu. The same information is on '
   + 'Job Order and the History screen in both systems.'],
  ['Bulk invoice download', 'Web Application only', 'Produces one PDF containing many invoices.'],
], { widths: [34, 20, 46] });

/* ── 23 ────────────────────────────────────────────────────────────────────── */
doc.h1('23. The Complete Workflow, End to End');
doc.metaLine([BOTH, BOTH_SYS]);

doc.p(
  'Every stage below is described in full earlier in this manual; this chapter puts them in one '
  + 'place so the whole journey can be read at once.'
);

doc.h2('23.1 Stage 1 — Account Creation');
doc.p(
  'An administrator opens Team Agents and creates the team if one is needed, then opens Agent '
  + 'Management and adds the account: name, username, email address, team, commission rate, quota, '
  + 'incentive value and password. Saving creates the user account AND the agent balance record '
  + 'that makes it an agent. See chapters 3 and 4.'
);

doc.h2('23.2 Stage 2 — Account Activation');
doc.p(
  'The account is created Active, so there is no separate activation step. Where an account has '
  + 'been deactivated, an administrator reactivates it from the details panel. Nothing else gates '
  + 'the agent: there is no approval queue and no email verification in this module. See 5.4.'
);

doc.h2('23.3 Stage 3 — Agent Sign-In');
doc.p(
  'The agent signs in to the Mobile Application with their username or email address and their '
  + 'password, and lands on the Agent Dashboard. Their permissions are refreshed from the server '
  + 'on each launch. See chapter 7.'
);

doc.h2('23.4 Stage 4 — Referral');
doc.p(
  'The agent opens the application form from the dashboard’s Applications tab, fills in the '
  + 'customer’s details, address, plan and documents, and submits. Referred By is pre-filled '
  + 'with the agent’s name and must be left as it is. See chapter 9.'
);

doc.h2('23.5 Stage 5 — Customer Processing');
doc.p(
  'The office reviews the application and moves it to a job order. The agent now sees it on their '
  + 'Job Order screen with the status In Progress, and it is counted in the Referrals breakdown on '
  + 'their dashboard. See chapters 11 and 12.'
);

doc.h2('23.6 Stage 6 — Job Order and Installation');
doc.p(
  'A technician is assigned and visits the address. The outcome is recorded on site: Done, '
  + 'Reschedule or Failed. A Done job order moves the agent’s referral count and begins '
  + 'counting toward their achievements. Where the site is marked pre-installed, quota progress '
  + 'starts even before the job is closed. See 15.3.'
);

doc.h2('23.7 Stage 7 — Job Order Approval');
doc.p(
  'An administrator approves the job order. In one transaction the referring agent is found, their '
  + 'commission is credited, the rates in force are copied onto the job order, and the job order '
  + 'is stamped as settled. This is the moment commission is earned. See 12.5.'
);

doc.h2('23.8 Stage 8 — Commission and Incentive');
doc.p(
  'Commission appears immediately in the agent’s Wallet. Separately, the scheduled incentive '
  + 'job counts the agent’s uncounted completed referrals and pays the incentive value once '
  + 'for every full quota, carrying any remainder forward. Achievement rewards run on their own '
  + 'weekly and monthly clocks and are claimed by the agent from the dashboard. See chapters 14, 15 '
  + 'and 10.5.'
);

doc.h2('23.9 Stage 9 — Balance');
doc.p(
  'The agent’s Wallet now holds Commission, Incentives, Bonus and Balance, with Achievement '
  + 'shown beside them as a lifetime total. The headline figure is the four that can actually be '
  + 'cashed out. See chapter 16.'
);

doc.h2('23.10 Stage 10 — Invoice');
doc.p(
  'At midnight on Monday the invoice run raises one invoice per team and per solo agent for the '
  + 'week that has just ended, listing every referral installed inside it and claiming every quota '
  + 'completed inside it. The invoice starts as Generated. See chapter 17.'
);

doc.h2('23.11 Stage 11 — Payment');
doc.p(
  'An administrator opens the invoice, presses Pay Out, and saves a Pending payout carrying the '
  + 'invoice number as its reference. An approver then approves it, supplying the amount, proof and '
  + 'remarks. At that instant the money leaves the agent’s buckets, the invoice becomes Paid, '
  + 'and the referrals behind it become Collected. See 19.5.'
);

doc.h2('23.12 The Whole Journey in One Table');
doc.table(['Stage', 'Who acts', 'System', 'What changes'], [
  ['Team created', 'Administrator', 'Web Application', 'A team exists.'],
  ['Agent account created', 'Administrator', 'Web Application', 'User account plus agent balance record.'],
  ['Agent signs in', 'Agent', 'Mobile', 'Session opened; dashboard shown.'],
  ['Application submitted', 'Agent', 'Mobile', 'Application created with Referred By set.'],
  ['Moved to job order', 'Office', 'Web Application', 'Job order raised; appears on the agent’s list.'],
  ['Technician assigned', 'Coordinator', 'Either', 'Schedule and technician attached.'],
  ['Visit recorded', 'Technician', 'Mobile', 'Onsite status set to Done, Reschedule or Failed.'],
  ['Job order approved', 'Administrator', 'Either',
   'Commission credited; rates snapshotted; job order stamped as settled.'],
  ['Quota completed', 'Scheduled job', 'Server',
   'Incentive credited; referrals consumed into a batch.'],
  ['Achievement claimed', 'Agent', 'Either', 'Reward paid into Balance and Achievement.'],
  ['Invoice raised', 'Scheduled job', 'Server',
   'Weekly invoice created as Generated, PDF rendered.'],
  ['Payout recorded', 'Administrator', 'Web Application', 'Pending record. Nothing moves.'],
  ['Payout approved', 'Approver', 'Web Application',
   'Buckets drained; invoice Paid; referrals Collected.'],
], { widths: [22, 16, 14, 48] });

/* ── 24 ────────────────────────────────────────────────────────────────────── */
doc.h1('24. Troubleshooting');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('24.1 Signing In');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['"Invalid credentials"',
   'Wrong username or address, or wrong password.',
   'Confirm the username and email address on the agent’s record in Agent Management. Use '
   + 'Forgot Password, or have an administrator set a new password by editing the account.'],
  ['"your account is suspended contact a support"',
   'Account Status is Inactive.',
   'An administrator opens Agent Management, selects the agent and presses Activate.'],
  ['Forgot Password does nothing',
   'The three-minute cooldown from a previous attempt is still running.',
   'Wait for the countdown on the button to finish.'],
  ['Signed in, but the dashboard is the wrong one',
   'The account does not hold the Agent role.',
   'Check the role on the account. Only the Agent role lands on the Agent Dashboard.'],
], { widths: [26, 30, 44] });

doc.h2('24.2 Access and Permissions');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['A menu entry is missing',
   'The role does not hold that permission key.',
   'Compare the role against 6.2 and 6.3 in Role Management.'],
  ['A permission was granted but nothing changed',
   'The client is still using the list it was given at sign-in.',
   'On mobile, close and relaunch the app. On the web, sign out and back in.'],
  ['"Unauthorized. You can only update users within your organization."',
   'The record belongs to another organisation.',
   'Have it changed by an administrator of that organisation, or by a super administrator.'],
  ['An agent cannot open Invoices on their phone',
   'There is no invoice screen in the Mobile Application.',
   'Use the Web Application — see 22.4.'],
], { widths: [26, 28, 46] });

doc.h2('24.3 Missing Referrals');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['A submitted application is not on the agent’s Job Order list',
   'It has not been moved to a job order yet, or it is already Done.',
   'Check Application Management. A Done referral is on the History screens, not Job Order.'],
  ['A referral never appears anywhere for the agent',
   'Referred By does not match the agent under the name rule.',
   'Open the application and compare Referred By against the agent’s first and last name — '
   + 'see 4.5. Correcting it lets later runs pick the referral up.'],
  ['Referrals appear for the wrong agent',
   'Two agents’ names overlap, so the tolerant match found the other one.',
   'Make the two account names distinct, and use the agent’s email address in Referred By '
   + 'where there is any doubt — an exact address match always wins.'],
  ['The agent’s Job Order list is completely empty',
   'The account has neither a usable name nor an email address.',
   'Fill in First Name, Last Name and Email Address on the account.'],
], { widths: [26, 28, 46] });

doc.h2('24.4 Quota and Incentives');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['Quota progress looks wrong or is stuck at zero',
   'Quota or Incentives is zero on the agent’s record, so the job skips them.',
   'Set both above zero in Agent Management. The log line reads "Quota or incentive value not '
   + 'configured".'],
  ['Progress seems to have been reset',
   'It has not. A completed quota consumes its referrals into a batch, so the count starts again '
   + 'from the remainder.',
   'Open the Incentives history: the consumed referrals are in a numbered batch, and the '
   + 'remainder is the current progress.'],
  ['Referrals were counted before the installation finished',
   'The site was marked pre-installed, which counts toward the quota deliberately.',
   'Nothing to do — see 15.3. The later flip to Done adds nothing further.'],
  ['An incentive was never awarded although the quota looks met',
   'Some of the referrals were already consumed by an earlier batch.',
   'Only referrals absent from the incentive ledger count. Check the batch numbers in the '
   + 'incentive history.'],
  ['The incentive was smaller than expected',
   'A batch pays the incentive value ONCE, not once per referral, and at the rate carried by the '
   + 'referral that completed it.',
   'Confirm the rate against the agent’s Incentives field and 15.5.'],
], { widths: [26, 32, 42] });

doc.h2('24.5 Missing Commission');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['A completed referral earned no commission',
   'The job order has not been approved yet. Done alone does not pay.',
   'Approve the job order — see 12.5.'],
  ['The job order was approved and still nothing was credited',
   'Referred By matched no agent, so the approval paid nobody.',
   'Check Referred By against 4.5, then ask for the settlement diagnostic to be run — see 21.3.'],
  ['Commission was credited but is zero',
   'The agent’s commission rate is zero and no global rate is configured.',
   'Set Commission on the agent’s record. Job orders already approved keep the rate they were '
   + 'settled at.'],
  ['A referral was paid at an old rate',
   'The rate in force at approval was copied onto the job order.',
   'This is intended. Changing a rate never restates settled work — see 5.3.'],
  ['A referral looks like it was paid twice',
   'It cannot be. A job order carrying a settlement stamp is skipped on any later approval.',
   'Confirm against the job order’s commission status, and the payout records naming it.'],
], { widths: [26, 32, 42] });

doc.h2('24.6 Balances');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['The Commission tile reads zero although work was approved',
   'The rate field and the earned figure are different fields with the same label.',
   'Read the Wallet breakdown, not the agent form. See 16.3.'],
  ['The total does not equal the four lines added up',
   'Achievement is shown for reference and is deliberately excluded.',
   'The total is Commission plus Balance plus Incentives plus Bonus. See 10.2.'],
  ['A payout was recorded but the balance did not move',
   'The payout is still Pending.',
   'Approve it. Nothing moves before approval.'],
  ['An All Balance payout left a figure behind',
   'The amount paid was smaller than the total, so the buckets drained in order and stopped.',
   'Check the order in 16.4 and record the remainder separately.'],
  ['A bucket cannot go below zero',
   'By design: a payout larger than a bucket empties it and stops.',
   'Nothing to do.'],
], { widths: [28, 30, 42] });

doc.h2('24.7 Job Orders and Payments');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['A job order does not appear on the commission payout form',
   'It is not Done, or its commission status is already Paid.',
   'Only completed, unpaid job orders are offered — a paid one can never be included twice.'],
  ['A payment is not reflected on the agent’s screen',
   'The payout has not been approved, or the screen has not been refreshed.',
   'Check the record’s status, then pull to refresh on mobile or press Refresh on the web.'],
  ['Approve and Reject are not shown',
   'You are on the Mobile Application, the record is not Pending, or the account lacks the approval '
   + 'permission.',
   'Payouts are approved in the Web Application only. There, a Pending record shows both buttons to an '
   + 'account holding agent-payout.approve.'],
  ['"Only pending payouts can be approved."',
   'It has already been approved or rejected.',
   'Nothing to do — this is the guard that stops a balance moving twice.'],
], { widths: [28, 30, 42] });

doc.h2('24.8 Invoices');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['No invoice was raised for a team',
   'Neither a billable referral nor an awarded incentive fell inside that week.',
   'The run records this as "nothing billable this week". Check the installation dates.'],
  ['A referral is missing from an invoice',
   'It was installed outside the billing week, it is not Done, its Referred By matches no member '
   + 'of that owner, or it was already billed to that owner.',
   'Work down that list in order. The Referred Customers section of a previous invoice will show '
   + 'whether it has already been billed.'],
  ['An incentive is missing from an invoice',
   'The quota was completed outside that billing week, or it has already been billed on another '
   + 'invoice.',
   'Check the Processed At date and the Invoice column in the incentive history.'],
  ['A quota shows as earned but has never been billed',
   'It was awarded outside every window that has been run, and the strict weekly window leaves it '
   + 'there.',
   'The invoice run reports unbilled quotas lying outside the period it is billing. Raise it with '
   + 'whoever runs the schedule.'],
  ['TOTAL AMOUNT on the PDF does not match Total Amount on screen',
   'The two labels are attached to opposite figures.',
   'Nothing is wrong — see the callout in 17.4. SUBTOTAL agrees in both places.'],
  ['The invoice PDF will not open',
   'The rendering failed, or the layout has moved on and it is being produced again.',
   'Try once more; the document is re-rendered on demand. If it persists, report the invoice '
   + 'number.'],
  ['An agent cannot see an invoice they expect',
   'It belongs to a different owner — for example the agent has since changed teams.',
   'An agent sees their current team’s invoices, or their own if they have none. See 17.11.'],
], { widths: [28, 32, 40] });

doc.h2('24.9 Achievements');
doc.table(['Problem', 'Likely cause', 'What to do'], [
  ['The count is lower than the agent expects',
   'It is bounded to the current period, and referrals that already earned this tier are skipped.',
   'Compare against the period the card names and the countdown beside it.'],
  ['"already been claimed for this period"',
   'The reward for this period is taken.',
   'Wait for the period to turn. The countdown says when.'],
  ['The card says "in this cycle" rather than "this week"',
   'The reward was claimed early, which ended the period there and started a fresh one.',
   'Nothing to do — see the callout in 10.4.'],
  ['The countdown looks wrong on one device',
   'The device clock is out.',
   'Nothing to do — the countdown is measured against the server’s clock and corrects '
   + 'itself.'],
], { widths: [28, 32, 40] });

/* ── 25 ────────────────────────────────────────────────────────────────────── */
doc.h1('25. Status and Field Reference');
doc.metaLine([BOTH, BOTH_SYS]);

doc.h2('25.1 Every Status in the Module');
doc.table(['Where', 'Values'], [
  ['Account Status', 'Active, Inactive'],
  ['Job order onsite status', 'In Progress, Reschedule, Done, Failed'],
  ['Job order commission status',
   'Empty or Unpaid (shown to agents as Not Collected), Paid (shown as Collected)'],
  ['Payout status', 'Pending, Approved, Rejected'],
  ['Bonus record status', 'Pending, Approved, Rejected'],
  ['Invoice status', 'Generated, Paid, Unpaid, and the legacy Sent and Cancelled'],
  ['Invoice type', 'Team, Solo'],
], { widths: [30, 70] });

doc.h2('25.2 Every Payout Type');
doc.table(['Type', 'Shown as', 'Moves'], [
  ['commission', 'Commission payout', 'Commission down'],
  ['incentives', 'Add Incentives', 'Incentives up'],
  ['incentives_payout', 'Incentive payout', 'Incentives down'],
  ['Bonus', 'Add Bonus', 'Bonus up'],
  ['Bonus_payout', 'Bonus payout', 'Bonus down'],
  ['balance', 'Balance payout', 'Balance down'],
  ['all', 'All Balance', 'Commission, then Balance, then Incentives, then Bonus'],
  ['achievement', 'Achievement reward', 'Balance and Achievement up; recorded already approved'],
], { widths: [24, 26, 50] });

doc.h2('25.3 The Fields on an Agent');
doc.table(['Field', 'Kind', 'Meaning'], [
  ['Commission', 'Rate', 'Pesos per approved referral.'],
  ['Quota', 'Count', 'Completed referrals per incentive cycle.'],
  ['Incentives', 'Rate', 'Pesos per completed quota.'],
  ['Remarks', 'Text', 'Notes kept against the agent’s record.'],
  ['Commission (Wallet)', 'Earned', 'Commission from approved job orders, not yet paid out.'],
  ['Incentives (Wallet)', 'Earned', 'Awarded quota incentives, not yet paid out.'],
  ['Bonus', 'Earned', 'Approved bonuses, not yet paid out.'],
  ['Balance', 'Earned', 'The spendable bucket, filled by achievement rewards.'],
  ['Achievement', 'Record', 'A lifetime total of rewards claimed. Never paid out.'],
  ['Team', 'Link', 'Which team the agent belongs to, or none.'],
  ['Account Status', 'Flag', 'Whether the account may sign in.'],
], { widths: [26, 14, 60] });

doc.h2('25.4 The Fields on a Weekly Invoice');
doc.table(['Field', 'Meaning'], [
  ['Invoice Number', 'ATSS-AGT- followed by a six-digit running number.'],
  ['Invoice Type', 'Team or Solo.'],
  ['Team / Agent', 'The owner, held as it was when the invoice was raised.'],
  ['Billing Period', 'Monday to Sunday of the week billed.'],
  ['Invoice Date', 'The day the invoice was raised.'],
  ['Total Clients Installed', 'The number of referred customers billed.'],
  ['Unit Price', 'The commission rate the lines are priced at.'],
  ['Installation Fee', 'Stated on the document; not part of what is owed.'],
  ['Commission', 'The sum of the line totals.'],
  ['Total Amount', 'The completed-quota incentive claimed for this week.'],
  ['Subtotal', 'Commission plus incentive.'],
  ['Status', 'Generated, Paid, Unpaid, or a legacy value.'],
], { widths: [26, 74] });

doc.h2('25.5 Where to Read Each Figure');
doc.table(['Figure', 'Agent reads it', 'Administrator reads it'], [
  ['Total balance', 'Dashboard > Wallet', 'Agent Payout > summary cards'],
  ['Commission earned', 'Dashboard > Wallet > Commission',
   'Agent Payout > Commission card'],
  ['Incentives earned', 'Dashboard > Wallet > Incentives',
   'Agent Payout > Incentives card'],
  ['Bonus', 'Dashboard > Wallet > Bonus', 'Agent Payout > Bonus card'],
  ['Achievement rewards', 'Dashboard > Wallet > Achievement',
   'Agent Payout > Achievement card'],
  ['Referral counts', 'Dashboard > Referrals', 'Job Order, filtered by referrer'],
  ['Quota progress', 'History > Incentives > batches', 'Incentive history'],
  ['Achievement progress', 'Dashboard > achievement cards', 'Not shown per agent'],
  ['Payout records', 'History > Payouts', 'Agent Payout'],
  ['Invoices', 'Web Application > Invoices', 'Agent > Invoices'],
], { widths: [24, 38, 38] });

doc.h2('25.6 Document Notes');
doc.small(
  'Amounts are written in this manual as PHP followed by the figure. The applications themselves '
  + 'print the peso sign instead; the two mean the same thing. Menu paths are written with a '
  + 'greater-than sign between the steps.'
);
doc.small(
  'This manual describes the Agent Module as implemented in the Mobile Application and the Web '
  + 'Application at the document date on the cover. Rates, quotas, incentive values, '
  + 'achievement targets, achievement rewards and the stated installation fee are configuration '
  + 'and may differ in your deployment; the figures quoted are the shipped defaults. Where this '
  + 'manual and the system disagree, the system is right and this manual needs updating.'
);

/* ── build ─────────────────────────────────────────────────────────────────── */
doc.buildToc();
doc.chrome();
const { pages } = doc.save(OUT);
console.log(`Wrote ${OUT} (${pages} pages)`);

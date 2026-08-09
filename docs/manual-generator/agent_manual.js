/*
 * Builds the SYNC Agent Module User Manual PDF.
 *
 * Written for the people who use the Agent Module, not for developers. It documents only
 * what each role can actually see and do in the Web Application and the Mobile Application,
 * and it contains no internal names of any kind. Keep it that way when you edit it.
 *
 * The manual is deliberately split by audience:
 *   Part One   — shared: what the module is, who does what, signing in
 *   Part Two   — the Agent role
 *   Part Three — the Administrator role
 *   Part Four  — shared reference
 *
 * Every chapter states the role it applies to on the line under its heading. If you add a
 * chapter, add that line too — the split is the point of this document.
 *
 *   node agent_manual.js [output.pdf] [date] [version] [preparedBy] [organization]
 */
const path = require('path');
const { Doc } = require('./render.js');

const OUT = process.argv[2] || path.join(__dirname, '..', '..', 'SYNC_Agent_Module_User_Manual.pdf');
const DATE = process.argv[3] || '8 August 2026';
const VERSION = process.argv[4] || '1.0';
const PREPARED_BY = process.argv[5] || 'SYNC Documentation Team';
const ORGANIZATION = process.argv[6] || 'SYNC';

const AGENT = 'Applies to: AGENT role';
const ADMIN = 'Applies to: ADMINISTRATOR role';
const BOTH = 'Applies to: BOTH roles';

const doc = new Doc({
  eyebrow: 'SYNC',
  title: 'Agent Module User Manual',
  subtitle: 'Agent Operations and System Usage Guide',
  blurb:
    'This manual explains the Agent Module of the SYNC System: what it is for, what every '
    + 'screen shows, what each button does, and how to carry out each task step by step. It is '
    + 'divided by role, so that what an Agent does and what an Administrator does are never '
    + 'confused with one another. It covers both the Web Application and the Mobile Application.',
  facts: [
    ['Document Title', 'SYNC Agent Module User Manual'],
    ['Subtitle', 'Agent Operations and System Usage Guide'],
    ['Version', VERSION],
    ['Document Date', DATE],
    ['Prepared By', PREPARED_BY],
    ['Organization', ORGANIZATION],
    ['Intended Audience', 'Agents, and Administrators who manage Agents'],
    ['Applies To', 'Web Application and Mobile Application'],
    ['How it is organised', 'Part Two is for Agents. Part Three is for Administrators.'],
  ],
  footNote:
    'Each chapter states the role it applies to directly under its heading. If a screen '
    + 'described here does not appear in your menu, your role does not have it — contact your '
    + 'administrator to confirm your account permissions.',
  runningHeader: 'SYNC Agent Module User Manual',
  runningFooter: 'Agent Operations and System Usage Guide',
});

doc.cover();

/* ═════════════════════════════════════════════════════════════════════════════
   PART ONE — ABOUT THE AGENT MODULE
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part One', 'About the Agent Module',
  'Read this part whatever your role. It explains what the module is for, sets out exactly '
  + 'which tasks belong to Agents and which belong to Administrators, and shows how to sign in '
  + 'and find your way around.');

/* ── 1. Introduction ──────────────────────────────────────────────────────── */
doc.h1('1. Introduction');
doc.metaLine([BOTH]);

doc.h2('1.1 What the Agent Module Is');
doc.p(
  'The Agent Module is the part of the SYNC System that deals with Agents and the customers '
  + 'they bring in. It covers the whole of that relationship: submitting a new customer, '
  + 'following the installation, calculating what the Agent has earned, and recording what has '
  + 'been paid out to them.'
);
doc.p(
  'The module is used by two different kinds of people, and this is the single most important '
  + 'thing to understand about it. Agents use it to submit referrals and to watch their own '
  + 'earnings. Administrators use it to set up Agent accounts and teams, and to record payouts. '
  + 'The two see different menus and different controls, even on screens that share a name.'
);

doc.h2('1.2 The Two Roles');
doc.table(['Role', 'Who they are', 'What the module gives them'], [
  ['Agent',
   'A person who introduces new customers to the business.',
   'A private view of their own referrals and their own earnings. They can submit applications '
   + 'and review records, but they cannot change operational data or record money movements.'],
  ['Administrator',
   'Office and management staff responsible for the Agent programme.',
   'A management view across all Agents: creating Agent accounts and teams, and recording '
   + 'commission, incentive and bonus transactions.'],
], { widths: [18, 30, 52] });
doc.callout('If you are unsure which you are',
  'Sign in and look at your menu. An Agent sees Dashboard, Job Order, Work Order and History. '
  + 'An Administrator sees a much longer menu that includes an Agent group containing Pay Out/In, '
  + 'Team Agents, Agent Management and Agent Payout. On a phone, your role is printed on a badge '
  + 'at the top of the Menu screen.');

doc.h2('1.3 Purpose of the Module');
doc.bullets([
  ['Bring in customers. ', 'Agents record new applications, which are credited to them automatically.'],
  ['Track installations. ', 'Both roles can follow a referral from submission through to completion.'],
  ['Calculate earnings. ', 'Commission, quota incentives, bonuses and milestone rewards are held against each Agent.'],
  ['Record payments. ', 'Administrators record what has been paid, and Agents can see it.'],
  ['Organise the programme. ', 'Administrators create Agent accounts and group them into teams.'],
]);

doc.h2('1.4 How the Module Fits Into the Overall Workflow');
doc.steps([
  'An Administrator creates the Agent account, and assigns it to a team where teams are used.',
  'The Agent submits a customer application. The referral is credited to that Agent.',
  'The office reviews the application and raises a job order for the installation.',
  'A coordinator assigns a technician and schedules the visit.',
  'The technician visits the address and records the outcome on site: Done, Reschedule or Failed.',
  'Completed referrals count towards the Agent\'s commission, quota incentives and onboarding milestones.',
  'An Administrator records the payout. The Agent sees it in their History.',
]);
doc.small('Steps 3, 4 and 5 sit outside the Agent Module and are covered by the operational procedures for those teams.');

/* ── 2. Roles and Responsibilities ────────────────────────────────────────── */
doc.h1('2. Roles and Responsibilities');
doc.metaLine([BOTH]);
doc.p(
  'This chapter is the definitive answer to "who does what". Everything later in the manual is '
  + 'consistent with the tables below. If you are ever unsure whether a task is yours, look here first.'
);

doc.h2('2.1 Task Responsibility Matrix');
doc.table(['Task', 'Agent', 'Administrator'], [
  ['Submit a customer application', 'Yes', 'Yes'],
  ['View their own referrals', 'Yes', 'Yes — for all Agents'],
  ['View another Agent\'s referrals', 'No', 'Yes'],
  ['Edit or update a job order', 'No', 'Yes'],
  ['Approve or reject a job order', 'No', 'Yes'],
  ['Assign or reassign a technician', 'No', 'Yes'],
  ['See installation photographs and documents', 'No', 'Yes'],
  ['Raise a work order', 'No', 'Yes'],
  ['View their own balances', 'Yes', 'Yes — for all Agents'],
  ['Claim an onboarding milestone reward', 'Yes', 'Yes — on an Agent\'s behalf'],
  ['Record a commission payout', 'No', 'Yes'],
  ['Add or pay out incentives', 'No', 'Yes'],
  ['Add or pay out a bonus', 'No', 'Yes'],
  ['Create or edit an Agent account', 'No', 'Yes'],
  ['Create, rename or delete an Agent team', 'No', 'Yes'],
  ['Export records they can see', 'Yes', 'Yes'],
], { widths: [46, 27, 27] });

doc.h2('2.2 What Each Role Sees in the Menu');
doc.table(['Menu entry', 'Agent', 'Administrator'], [
  ['Dashboard', 'Their own Agent Dashboard', 'The management dashboard'],
  ['Job Order', 'Their own active referrals only', 'All job orders'],
  ['Work Order', 'Work assigned to them only', 'All work orders'],
  ['History', 'Their own earnings records', '—'],
  ['Pay Out/In', '—', 'Commission, incentive and bonus records for all Agents'],
  ['Team Agents', '—', 'The list of Agent teams'],
  ['Agent Management', '—', 'Agent user accounts'],
  ['Agent Payout', '—', 'Payouts by Agent, with balances'],
  ['Affiliates', '—', 'Affiliate groups, on the Mobile Application'],
], { widths: [24, 38, 38] });
doc.callout('The same screen, two names',
  'The screen an Agent knows as History is the same screen an Administrator opens as Pay Out/In. '
  + 'An Agent sees only their own records and cannot record anything. An Administrator sees every '
  + 'Agent and can record transactions. This is the most common source of confusion, so the two '
  + 'views are documented separately: Chapter 10 for Agents, Chapter 19 for Administrators.');

doc.h2('2.3 Boundaries That Cannot Be Crossed');
doc.bullets([
  ['An Agent can never see another Agent\'s records. ', 'The system restricts every list and every total to the signed-in Agent, regardless of what is typed into a search or filter.'],
  ['An Agent can never change operational data. ', 'Job orders and work orders are read-only for Agents in both applications.'],
  ['An Agent can never award themselves money. ', 'Commission, incentive and bonus transactions are recorded by Administrators only.'],
  ['A milestone can never be claimed twice. ', 'The system re-checks the Agent\'s completed referrals on every claim and refuses a repeat.'],
  ['Records stay within an organisation. ', 'Administrators manage the Agents and teams belonging to their own organisation.'],
]);

/* ── 3. Signing in ────────────────────────────────────────────────────────── */
doc.h1('3. Signing In and Getting Around');
doc.metaLine([BOTH]);

doc.h2('3.1 Accessing the System');
doc.p(
  'On a computer, open the SYNC System address supplied by your administrator in a web browser. '
  + 'On a phone, open the SYNC Mobile Application. Both open on the sign-in screen.'
);

doc.h2('3.2 Credentials Required');
doc.table(['Field', 'What to enter'], [
  ['Account No./Username/Email',
   'Any one of the three identifiers issued with your account. All three are accepted in the same field.'],
  ['Password', 'The password issued to you, or the one you last set yourself.'],
]);

doc.h3('SECURE LOGIN');
doc.sub('Purpose');
doc.p('Verifies your credentials and opens the system with the menu your role is permitted to see.');
doc.sub('How to Use');
doc.steps([
  'Open the Web Application in a browser, or open the Mobile Application.',
  'Enter your account number, username or email address in the first field.',
  'Enter your password in the second field. Use the eye control at the end of the field to check what you typed.',
  'Select SECURE LOGIN.',
  'Wait while the button reads LOGGING IN. Do not select it a second time.',
]);
doc.sub('Expected Result');
doc.p(
  'An Agent lands on the Agent Dashboard with their balances and referral figures loaded. An '
  + 'Administrator lands on the management dashboard. In both cases the menu shows only what the '
  + 'role permits.'
);

doc.h3('Forgot Password?');
doc.sub('Purpose');
doc.p('Starts a password reset when you cannot sign in.');
doc.sub('How to Use');
doc.steps([
  'On the sign-in screen, select Forgot Password?.',
  'Enter your email address or account number.',
  'Submit the request and follow the instructions sent to you.',
  'Select Back to Login to return to the sign-in screen.',
]);
doc.sub('Expected Result');
doc.p(
  'A confirmation message is displayed and reset instructions are sent to the address held on '
  + 'your account. On the Mobile Application a short waiting period applies before a further '
  + 'request can be made.'
);

doc.h2('3.3 Moving Between Screens');
doc.table(['Where you are', 'How to move between screens'], [
  ['Web Application',
   'Use the navigation menu down the left of the window. Select an entry to open that screen. On '
   + 'a narrow window, open the menu using the menu control in the top bar. Administrator entries '
   + 'for this module are grouped together under Agent.'],
  ['Mobile Application',
   'Use the navigation bar across the bottom of the screen. Select Menu for the additional items. '
   + 'For Administrators, the Agent group in the Menu holds the management screens.'],
]);

doc.h2('3.4 Logging Out');
doc.h3('Logout');
doc.sub('Purpose');
doc.p('Ends your session and returns to the sign-in screen, so that nobody else can use your account.');
doc.sub('How to Use — Web Application');
doc.steps([
  'Locate Logout at the foot of the navigation menu on the left.',
  'Select Logout.',
]);
doc.sub('How to Use — Mobile Application');
doc.steps([
  'Select Menu in the bottom navigation bar.',
  'Select Sign out.',
  'Select Confirm in the message that appears, or Cancel to stay signed in.',
]);
doc.sub('Expected Result');
doc.p('Your session ends and the sign-in screen is displayed. You must sign in again to continue.');
doc.callout('Best practice',
  'Always log out on a shared or public computer. Closing the browser window alone does not '
  + 'guarantee that your session has ended.');

/* ═════════════════════════════════════════════════════════════════════════════
   PART TWO — THE AGENT ROLE
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Two', 'The Agent Role',
  'Everything an Agent can do, and nothing an Agent cannot. If you are an Agent, this part is '
  + 'your manual — you can work from it without reading Part Three at all. Where a task belongs '
  + 'to somebody else, it says so and tells you who to contact.');

/* ── 4. Agent Dashboard ───────────────────────────────────────────────────── */
doc.h1('4. Agent Dashboard');
doc.metaLine([AGENT]);
doc.p(
  'The Agent Dashboard is your home screen. It answers three questions at a glance: how much you '
  + 'have earned, how your referrals are progressing, and how close you are to your next milestone.'
);

doc.h2('4.1 Screen Layout');
doc.table(['Section', 'What it displays', 'Why it matters'], [
  ['Identity card',
   'Your initials, your name and your Agent ID.',
   'Confirms you are working in your own account before you submit anything.'],
  ['Balance figures',
   'Four figures: Incentives, Commission, Bonus and Achievement.',
   'Shows how your earnings are made up, not just the total.'],
  ['Referral figures',
   'Four counts: In Progress, Done, Failed and Reschedule.',
   'Shows the state of everything you have referred.'],
  ['Achievement panel',
   'A progress gauge towards 30 onboarded referrals, and the reward control when it is unlocked.',
   'Tracks your milestone and lets you claim the reward.'],
  ['Total Balance',
   'Your Commission, Incentives and Bonus figures added together.',
   'The amount recognised on your account.'],
  ['Cashout History',
   'Your five most recent payout records, each with a reference number, date and amount.',
   'Confirms that payouts have been recorded against your account.'],
], { widths: [22, 40, 38] });

doc.h2('4.2 Understanding Your Balance Figures');
doc.table(['Figure', 'What it represents', 'How it increases'], [
  ['Commission',
   'Your main spendable balance.',
   'Credited by an Administrator for completed referrals, and credited automatically when you '
   + 'claim an onboarding milestone reward.'],
  ['Incentives',
   'Rewards earned for reaching your referral quota.',
   'Added automatically each time your completed referrals reach a full quota batch.'],
  ['Bonus',
   'Discretionary amounts granted by the office.',
   'Added by an Administrator when a bonus is awarded to you.'],
  ['Achievement',
   'A lifetime record of milestone rewards you have claimed.',
   'Increases by the reward amount each time you claim a milestone. It is a record only; the '
   + 'money itself is added to your Commission figure.'],
], { widths: [18, 36, 46] });
doc.callout('Why Achievement is not added to Total Balance',
  'When you claim a milestone, the reward is paid into your Commission figure so that it can be '
  + 'paid out to you. The Achievement figure records how much you have earned from milestones '
  + 'over time. Adding both together would count the same reward twice, so Total Balance is the '
  + 'sum of Commission, Incentives and Bonus only.');

doc.h2('4.3 Understanding Your Referral Figures');
doc.table(['Figure', 'Meaning'], [
  ['In Progress', 'Referrals that have been raised for installation but not yet visited.'],
  ['Done', 'Referrals successfully installed. These count towards commission and milestones.'],
  ['Failed', 'Referrals that did not result in an installation.'],
  ['Reschedule', 'Referrals where a further visit is required.'],
]);

doc.h2('4.4 Dashboard Controls');

doc.h3('Refresh');
doc.sub('Purpose');
doc.p('Reloads your balances, referral figures, milestone status and cashout history from the system.');
doc.sub('How to Use');
doc.steps([
  'Open the Agent Dashboard.',
  'Select Refresh at the top right of the screen.',
  'Wait for the control to stop spinning.',
]);
doc.sub('Expected Result');
doc.p('Every figure on the dashboard is updated. Use it after submitting an application, or when you expect an Administrator to have recorded a payout.');

doc.h3('Show Referrals / Show Balances');
doc.sub('Purpose');
doc.p(
  'Turns the card over. One side shows your four balance figures; the other shows your four '
  + 'referral counts and your email address. The same control switches back.'
);
doc.sub('How to Use');
doc.steps([
  'Locate the circular control at the top right of the card.',
  'Select it to show your referral figures.',
  'Select it again to return to your balance figures.',
]);
doc.sub('Expected Result');
doc.p('The four figures on the card are replaced by the other set. Nothing is changed or saved; this control only changes what is displayed.');

doc.h3('Get Reward');
doc.sub('Purpose');
doc.p(
  'Claims the reward for an onboarding milestone you have reached. The control is only displayed '
  + 'when you have an unclaimed milestone, and it shows the reward amount on its face.'
);
doc.sub('How to Use');
doc.steps([
  'Check the achievement gauge. The control appears only when the milestone is complete.',
  'Confirm that the number of Done referrals is correct on the referral side of the card.',
  'Select Get Reward.',
  'Wait for the confirmation message. Do not select the control a second time while it is working.',
]);
doc.sub('Expected Result');
doc.p(
  'A message confirms that the reward has been added to your balance. Your Commission figure '
  + 'increases by the reward amount, your Achievement figure increases by the same amount as a '
  + 'record, and the gauge resets towards your next milestone. A milestone can only ever be '
  + 'claimed once.'
);
doc.callout('If the reward is refused',
  'The system re-checks your completed referrals when you claim. If the message says the '
  + 'milestone has not been reached, your Done count has not yet met the target — the gauge may '
  + 'be showing figures loaded earlier. Select Refresh and check again. If the message says the '
  + 'milestone has already been claimed, the reward is already on your account.');

doc.h3('Application Form');
doc.sub('Purpose');
doc.p('Opens the form used to submit a new customer application. This is the main way you add a referral.');
doc.sub('How to Use');
doc.steps([
  'Locate the Total Balance panel on the dashboard.',
  'Select Application Form.',
  'Complete the form as described in Chapter 6.',
]);
doc.sub('Expected Result');
doc.p('The Application Form opens with your name already recorded as the referrer. When you save or cancel, you are returned to the dashboard.');

doc.h2('4.5 Cashout History');
doc.p(
  'The Cashout History list at the foot of the dashboard shows your five most recent payout '
  + 'records. Each entry shows the reference number, the date it was recorded and the amount, '
  + 'marked POSTED. If no payouts have been recorded, the list reads "No cashouts found".'
);
doc.p('For the complete list, and for incentive and bonus records, open the History screen described in Chapter 10.');

/* ── 5. Agent Navigation ──────────────────────────────────────────────────── */
doc.h1('5. Agent Navigation');
doc.metaLine([AGENT]);
doc.p('These are the screens available to an Agent account. Any screen not listed here is not part of the Agent role.');

doc.h2('5.1 Dashboard');
doc.sub('Purpose');
doc.p('Your home screen: earnings, referral progress, milestone status and recent payouts.');
doc.sub('How to Access');
doc.steps(['Select Dashboard in the navigation menu.']);
doc.sub('Available Actions');
doc.bullets([
  'Refresh your figures.',
  'Switch the card between balances and referral counts.',
  'Claim a milestone reward when one is available.',
  'Open the Application Form.',
  'Review your five most recent payouts.',
]);

doc.h2('5.2 Job Order');
doc.sub('Purpose');
doc.p('Lists the referrals you have submitted that are currently being handled in the field.');
doc.sub('How to Access');
doc.steps(['Select Job Order in the navigation menu.']);
doc.sub('Available Actions');
doc.bullets([
  'Search and filter your referrals.',
  'Switch between the table view and the card view.',
  'Choose which columns are displayed.',
  'Open a referral to review its customer and visit information.',
  'Export the list you are viewing.',
]);
doc.small('Job orders are read-only for Agents. See Chapter 7.');

doc.h2('5.3 Work Order');
doc.sub('Purpose');
doc.p('Lists work orders that have been assigned to you by name or email address.');
doc.sub('How to Access');
doc.steps(['Select Work Order in the navigation menu.']);
doc.sub('Available Actions');
doc.bullets([
  'Search the work orders assigned to you.',
  'Filter by status.',
  'Switch between the table view and the card view.',
  'Open a work order to review its details.',
  'Export the list you are viewing.',
]);
doc.small('Agents cannot raise a new work order. The control used to add one is not shown to your role.');

doc.h2('5.4 History');
doc.sub('Purpose');
doc.p('The complete record of what you have earned and what has been paid out, across three tabs.');
doc.sub('How to Access');
doc.steps(['Select History in the navigation menu.']);
doc.sub('Available Actions');
doc.bullets([
  'Switch between Commission History, Incentives History and Bonus History.',
  'Search within the records displayed.',
  'Narrow the records to a date range.',
  'Choose which columns are displayed.',
  'Export the records to a PDF file.',
]);

doc.h2('5.5 Application Form');
doc.sub('Purpose');
doc.p('The form used to submit a new customer application under your name.');
doc.sub('How to Access');
doc.steps([
  'Open the Dashboard.',
  'Select Application Form in the Total Balance panel.',
]);

doc.h2('5.6 Menu (Mobile Application only)');
doc.sub('Purpose');
doc.p('Holds your profile summary, your notifications, application information and the sign-out control.');
doc.sub('How to Access');
doc.steps(['Select Menu in the bottom navigation bar.']);
doc.sub('Available Actions');
doc.bullets([
  ['Notifications. ', 'Open the list of messages sent to you.'],
  ['About App. ', 'View information about the application.'],
  ['Release Notes. ', 'View what has changed in the current version.'],
  ['Sign out. ', 'End your session.'],
]);

/* ── 6. Submitting applications ───────────────────────────────────────────── */
doc.h1('6. Submitting Customer Applications');
doc.metaLine([AGENT]);
doc.callout('Scope',
  'The Agent role does not include a customer directory. You cannot browse or search all '
  + 'customers of the business. You work with customer information in two places only: the '
  + 'Application Form, where you enter a new customer\'s details, and the Job Order screen, where '
  + 'you review the details of a customer you referred.');

doc.h2('6.1 The Application Form');
doc.p(
  'The Application Form is divided into four parts: the customer\'s details, the installation '
  + 'address, the plan, and the supporting documents. Fields marked with an asterisk are required.'
);

doc.h3('Customer Details');
doc.table(['Field', 'Required', 'What to enter'], [
  ['Email', 'Yes', 'The customer\'s email address. Used to contact them about the installation.'],
  ['First Name', 'Yes', 'The customer\'s given name.'],
  ['Middle Initial', 'No', 'A single letter, if the customer uses one.'],
  ['Last Name', 'Yes', 'The customer\'s surname.'],
  ['Mobile', 'Yes', 'An 11-digit mobile number. Digits only.'],
  ['Secondary Mobile', 'No', 'An alternative 11-digit contact number.'],
], { widths: [24, 14, 62] });

doc.h3('Installation Address');
doc.table(['Field', 'Required', 'What to enter'], [
  ['Region', 'Yes', 'Select the region from the list.'],
  ['City/Municipality', 'Yes', 'Select the city or municipality. The list depends on the region chosen.'],
  ['Barangay', 'Yes', 'Select the barangay. The list depends on the city chosen.'],
  ['Installation Address', 'Yes', 'The full street address where the service is to be installed.'],
  ['Landmark', 'No', 'A nearby landmark to help the technician find the address.'],
  ['Referred By', 'Read-only',
   'Your own name, filled in automatically. It cannot be edited — referrals you submit are always '
   + 'credited to your account.'],
], { widths: [24, 14, 62] });

doc.h3('Plan Selection');
doc.table(['Field', 'Required', 'What to enter'], [
  ['Plan', 'Yes', 'Select the plan the customer has agreed to. Type to narrow the list.'],
], { widths: [24, 14, 62] });

doc.h3('Upload Documents');
doc.p('Images may be JPG or PNG files of up to 10 MB each.');
doc.table(['Document', 'Required', 'Notes'], [
  ['Government Valid ID (Primary)', 'Yes', 'A clear photograph of the customer\'s primary identification.'],
  ['Government Valid ID (Secondary)', 'No', 'A second form of identification, if available.'],
  ['Proof of Billing', 'No', 'A recent bill showing the customer\'s address.'],
  ['House Front Picture', 'No', 'A photograph of the front of the property, to help the technician locate it.'],
], { widths: [34, 14, 52] });

doc.h2('6.2 Application Form Controls');

doc.h3('Save');
doc.sub('Purpose');
doc.p('Submits the completed application and credits the referral to your account.');
doc.sub('How to Use');
doc.steps([
  'Complete every field marked with an asterisk.',
  'Attach the primary government identification. Attach any other documents you have.',
  'Check the customer\'s name, mobile number and installation address once more.',
  'Select Save.',
  'Wait while the control reads Saving. Do not select it again.',
]);
doc.sub('Expected Result');
doc.p(
  'A message confirms that the application was submitted successfully, the form is cleared and '
  + 'you are returned to the Dashboard. The referral will appear on your Job Order screen once '
  + 'the office has raised a job order for it.'
);
doc.callout('If a required field is missing',
  'A message asks you to complete all required fields marked with an asterisk, and the fields '
  + 'concerned are highlighted. Nothing is submitted. Complete them and select Save again.');
doc.callout('If the documents fail to upload',
  'The application itself is still submitted, and a message tells you the documents could not be '
  + 'attached. Inform the office so the documents can be added to the application record.');

doc.h3('Cancel');
doc.sub('Purpose');
doc.p('Closes the Application Form without submitting anything.');
doc.sub('How to Use');
doc.steps(['Select Cancel at the top of the form.']);
doc.sub('Expected Result');
doc.p('The form closes and you return to the Dashboard. Anything you had typed is discarded.');

/* ── 7. Job orders (agent) ────────────────────────────────────────────────── */
doc.h1('7. Job Orders — Agent View');
doc.metaLine([AGENT]);
doc.p(
  'A job order is the installation record raised for a customer you referred. This screen lets '
  + 'you follow that installation through to completion.'
);

doc.h2('7.1 What You See');
doc.bullets([
  ['Your referrals only. ', 'The list contains only job orders credited to your account.'],
  ['Active work only. ', 'Only referrals still being handled in the field are listed — those In Progress and those awaiting a further visit. Completed and failed referrals are counted on your Dashboard.'],
]);
doc.callout('Why a referral disappears from the list',
  'When a technician marks the installation Done, the referral leaves your Job Order list. This '
  + 'is normal and does not mean anything is lost — the referral is counted under Done on your '
  + 'Dashboard and becomes eligible for commission.');

doc.h2('7.2 Columns Available to Agents');
doc.table(['Column', 'What it shows'], [
  ['Timestamp', 'When the job order was created.'],
  ['Referred By', 'The Agent credited with the referral — your own name.'],
  ['Full Name of Client', 'The customer\'s name.'],
  ['Contact Number', 'The customer\'s mobile number.'],
  ['Email Address', 'The customer\'s email address.'],
  ['Full Address of Client', 'The installation address.'],
  ['Installation Fee', 'The fee recorded for the installation.'],
  ['Billing Status', 'The billing state of the customer\'s account.'],
  ['Billing Day', 'The day of the month the customer is billed.'],
  ['Date Installed', 'The date the installation was completed, once it has been.'],
  ['Onsite Status', 'The current state of the visit. See Chapter 9.'],
]);

doc.h2('7.3 Opening a Job Order');
doc.h3('View Job Order Details');
doc.sub('Purpose');
doc.p('Opens the full record of a single referral so you can review its progress.');
doc.sub('How to Use');
doc.steps([
  'Open the Job Order screen.',
  'Locate the referral, using search or the filters if the list is long.',
  'Select the row in the table view, or the card in the card view.',
]);
doc.sub('Expected Result');
doc.p('The details panel opens showing the customer information, the address, the visit information and the current status.');

doc.h3('What Is Shown, and What Is Not');
doc.table(['Visible to Agents', 'Hidden from Agents'], [
  ['Customer name, contact number and email address', 'Equipment serial numbers and router model'],
  ['Full installation address and coordinates', 'Line, port and network assignment details'],
  ['Installation fee, billing status and billing day', 'Account username, address and connection settings'],
  ['Visit information, including who attended', 'All uploaded photographs and signed documents'],
  ['Onsite status, remarks and date installed', 'Identification documents and proof of billing'],
]);
doc.small(
  'Installation and identity documents are withheld from Agents to protect customer information. '
  + 'An Administrator can see them. If you need something from a document you submitted, ask the office.'
);

doc.h2('7.4 Available Actions');
doc.table(['Action', 'Agent', 'Who performs it instead'], [
  ['View a job order', 'Yes', '—'],
  ['Search and filter the list', 'Yes', '—'],
  ['Change the columns displayed', 'Yes', '—'],
  ['Export the list', 'Yes', '—'],
  ['Edit job order information', 'No', 'An Administrator, or the technician on site.'],
  ['Approve or reject a job order', 'No', 'An Administrator.'],
  ['Assign or change the technician', 'No', 'A coordinator.'],
  ['Change the onsite status', 'No', 'The technician, while on site.'],
  ['Reschedule a visit', 'No', 'A coordinator, at the technician\'s request.'],
], { widths: [36, 16, 48] });
doc.callout('Reporting a problem with a referral',
  'There is no report control on the Job Order screen. If a customer\'s details are wrong, if the '
  + 'address needs correcting, or if a visit has not taken place, contact your coordinator or the '
  + 'office directly and quote the customer\'s name and the date the job order was raised.');

doc.h2('7.5 Job Order Screen Controls');
doc.table(['Control', 'Function'], [
  ['All Job Orders', 'Clears the current filter selection and returns to the full list of your referrals.'],
  ['Back to Filters', 'On a narrow screen, returns from the list to the filter panel.'],
  ['Table', 'Displays the referrals as rows in a table. Best on a computer.'],
  ['Card', 'Displays each referral as a card. Best on a phone or narrow window.'],
  ['Column Visibility', 'Opens the list of columns so you can show or hide each one.'],
  ['Export to CSV', 'Saves the referrals currently listed to a spreadsheet file.'],
  ['First Page / Last Page', 'Jumps to the beginning or the end of a long list.'],
]);

/* ── 8. Work orders (agent) ───────────────────────────────────────────────── */
doc.h1('8. Work Orders — Agent View');
doc.metaLine([AGENT]);
doc.p(
  'The Work Order screen lists work orders that have been assigned to you personally, matched on '
  + 'your name or your email address. Work orders assigned to anybody else are not shown.'
);

doc.h2('8.1 Reviewing Assigned Work');
doc.sub('Purpose');
doc.p('Lets you see what has been allocated to you and what state it is in.');
doc.sub('How to Use');
doc.steps([
  'Select Work Order in the navigation menu.',
  'Use the search field, or filter by status, to find the entry you need.',
  'Select the row or card to open the work order and review its details.',
]);
doc.sub('Expected Result');
doc.p('The work order opens for review. The entry shows who it is assigned to, and its current status.');

doc.h2('8.2 What You Can and Cannot Do');
doc.table(['Action', 'Agent', 'Who performs it instead'], [
  ['View work assigned to you', 'Yes', '—'],
  ['Search, filter and export', 'Yes', '—'],
  ['Raise a new work order', 'No', 'An Administrator. The add control is not shown to Agents.'],
  ['Edit a work order', 'No', 'An Administrator.'],
  ['Assign work to somebody else', 'No', 'A coordinator.'],
], { widths: [36, 16, 48] });

doc.h2('8.3 What You Can See About Assignment');
doc.table(['Information', 'Where it appears', 'What it tells you'], [
  ['Assigned technician', 'Job order details, where recorded.', 'Who is responsible for carrying out the installation.'],
  ['Visit information', 'Job order details.', 'Who attended the address, and who accompanied them.'],
  ['Onsite status', 'Job Order list and details.', 'Whether the visit is still pending, needs repeating, or is finished.'],
  ['Onsite remarks', 'Job order details.', 'What the technician recorded about the visit.'],
  ['Date installed', 'Job Order list and details.', 'When the installation was completed.'],
], { widths: [24, 30, 46] });

doc.h2('8.4 Requesting a Change');
doc.steps([
  'Open the job order or work order concerned and note the customer\'s name and the date.',
  'Contact your coordinator or the office through your normal channel.',
  'State clearly what needs to change: a correction to the address, a different visit date, or a repeat visit.',
  'Check the record again afterwards to confirm the change has been made.',
]);

/* ── 9. Statuses ──────────────────────────────────────────────────────────── */
doc.h1('9. Job Order Statuses');
doc.metaLine([BOTH]);
doc.p(
  'The onsite status tells you where a referral has reached. It is set by the technician on site '
  + 'and by the office. Agents cannot change it; Administrators can.'
);

doc.h2('9.1 Status Reference');
doc.table(['Status', 'Meaning', 'What the Agent should do'], [
  ['In Progress',
   'The job order has been raised and the visit has not yet been completed.',
   'No action. Check back periodically. Make sure the customer is expecting the visit and is contactable.'],
  ['Reschedule',
   'The technician attended or attempted the visit and a further visit is required.',
   'Contact the customer to confirm they are available for the next visit, and inform your coordinator of anything that would prevent it.'],
  ['Done',
   'The installation was completed successfully.',
   'No action. The referral leaves the Agent\'s Job Order list, is counted under Done on the Dashboard, and becomes eligible for commission and milestone credit.'],
  ['Failed',
   'The visit did not result in an installation.',
   'No action is possible on the record. If the referral can still proceed, raise it with the office.'],
], { widths: [16, 38, 46] });

doc.h2('9.2 Where Each Status Appears');
doc.table(['Status', 'Agent\'s Job Order list', 'Agent Dashboard count'], [
  ['In Progress', 'Listed', 'In Progress'],
  ['Reschedule', 'Listed', 'Reschedule'],
  ['Done', 'Not listed', 'Done'],
  ['Failed', 'Not listed', 'Failed'],
], { widths: [34, 33, 33] });
doc.small('An Administrator sees job orders at every status, not only the active ones.');

doc.h2('9.3 Billing Status');
doc.p(
  'Separately from the onsite status, a job order carries a billing status describing the state '
  + 'of the customer\'s account once the service is live. It is shown as a column on the Job Order '
  + 'list and in the job order details. It is maintained by the billing team and requires no '
  + 'action from an Agent.'
);

/* ── 10. Agent earnings ───────────────────────────────────────────────────── */
doc.h1('10. Your Earnings and History');
doc.metaLine([AGENT]);
doc.callout('Scope',
  'This chapter describes the History screen as an Agent sees it: your own records, review only. '
  + 'The same screen is used by Administrators under the name Pay Out/In, where transactions can '
  + 'be recorded — that is Chapter 19.');

doc.h2('10.1 The History Screen');
doc.table(['Tab', 'What it lists'], [
  ['Commission History', 'Payouts recorded against your account, including milestone rewards.'],
  ['Incentives History', 'Quota incentives awarded to you automatically, one line per qualifying referral.'],
  ['Bonus History', 'Bonus amounts added or paid out by the office.'],
]);

doc.h2('10.2 Commission History Columns');
doc.table(['Column', 'What it shows'], [
  ['ID', 'The record number.'],
  ['Ref Number', 'The reference number of the payout. Quote this when querying a payment.'],
  ['Total Amount', 'The amount recorded.'],
  ['Job Orders', 'The customers the payout relates to, where recorded.'],
  ['Processed By', 'The Administrator who recorded the payout.'],
]);

doc.h2('10.3 Incentives History Columns');
doc.table(['Column', 'What it shows'], [
  ['ID', 'The record number.'],
  ['Agent', 'The Agent credited — your own name.'],
  ['Job Order', 'The completed referral that counted towards the quota.'],
  ['Batch', 'Which quota batch this referral belonged to. Batches are numbered from one upwards.'],
  ['Quota Reached', 'The number of completed referrals required for one incentive batch.'],
  ['Incentive Value', 'The amount awarded for completing that batch.'],
  ['Processed At', 'When the incentive was awarded.'],
]);
doc.p(
  'Incentives are awarded automatically — no Administrator action is needed. Each time your '
  + 'completed referrals reach a full quota, the incentive value is added to your Incentives '
  + 'figure and one line is recorded here for each referral in that batch. Referrals left over '
  + 'after a full batch carry forward towards the next one, so nothing is lost.'
);

doc.h2('10.4 Bonus History Columns');
doc.table(['Column', 'What it shows'], [
  ['ID', 'The record number.'],
  ['Ref Number', 'The reference number of the bonus record.'],
  ['Type', 'Whether the amount was added to your bonus figure or paid out from it.'],
  ['Total Amount', 'The amount concerned.'],
  ['Processed By', 'The Administrator who recorded it.'],
]);

doc.h2('10.5 Reviewing Your Records');
doc.h3('Open a Record');
doc.sub('Purpose');
doc.p('Shows the full detail of a single earnings or payout record.');
doc.sub('How to Use');
doc.steps([
  'Open the History screen and select the tab you need.',
  'Locate the record, using the search field or the date range if the list is long.',
  'Select the row.',
]);
doc.sub('Expected Result');
doc.p('The record opens for review, showing all recorded values including the remarks entered by the Administrator.');

doc.h3('Refresh Records');
doc.sub('Purpose');
doc.p('Reloads the earnings records from the system so that newly recorded payouts appear.');
doc.sub('How to Use');
doc.steps([
  'Open the History screen.',
  'Select Refresh Records in the toolbar.',
  'Wait for the control to stop spinning.',
]);
doc.sub('Expected Result');
doc.p('The list is reloaded. Any payout recorded since you opened the screen now appears.');
doc.callout('Agents do not record payouts',
  'Creating a payout record is an Administrator task, covered in Chapter 19. Your role on this '
  + 'screen is to review what has been recorded and to raise anything that looks wrong with the '
  + 'office, quoting the reference number.');

/* ── 11. Agent reporting ──────────────────────────────────────────────────── */
doc.h1('11. Reporting and Exports');
doc.metaLine([AGENT]);
doc.callout('Scope',
  'The Agent role does not include a report builder, and there is no form on which an Agent '
  + 'submits a periodic report. Agent reporting means producing a PDF or spreadsheet of the '
  + 'records you are entitled to see. Nothing is submitted to the office when you do this, so '
  + 'these actions can be repeated as often as you need.');

doc.h2('11.1 Producing an Earnings Report');
doc.h3('Export to PDF');
doc.sub('Purpose');
doc.p('Produces a PDF of the earnings records currently displayed on the History screen.');
doc.sub('How to Use');
doc.steps([
  'Open the History screen.',
  'Select the tab you want to report on: Commission History, Incentives History or Bonus History.',
  'Set the reporting period using the From and To date fields.',
  'Use Column Visibility to include only the columns you want to appear.',
  'Check that the records shown are the ones you expect.',
  'Select Export to PDF.',
]);
doc.sub('Expected Result');
doc.p('A PDF is produced containing the records currently displayed, using the columns you selected. Nothing on your account is changed.');

doc.h2('11.2 Producing a Referral Report');
doc.h3('Export to CSV');
doc.sub('Purpose');
doc.p('Produces a spreadsheet file of the referrals currently listed on the Job Order or Work Order screen.');
doc.sub('How to Use');
doc.steps([
  'Open the Job Order screen, or the Work Order screen.',
  'Apply any search or filter needed so that only the records you want are listed.',
  'Select Export to CSV.',
]);
doc.sub('Expected Result');
doc.p('A spreadsheet file is produced containing the listed records. It can be opened in any spreadsheet application.');

doc.h2('11.3 Selecting a Reporting Period');
doc.table(['Field', 'What it does'], [
  ['From', 'Excludes records dated before the date chosen.'],
  ['To', 'Excludes records dated after the date chosen.'],
  ['Clear', 'Removes both dates and restores the full list. Appears only when a date is set.'],
]);
doc.small('Leaving both dates empty reports on all records available to you.');

/* ── 12. Search and filtering ─────────────────────────────────────────────── */
doc.h1('12. Search and Filtering');
doc.metaLine([BOTH]);
doc.p(
  'Every list screen offers the same tools for narrowing what is displayed. They only change '
  + 'what you see — no record is altered by searching or filtering. The controls behave '
  + 'identically for both roles; only the records they search across differ.'
);

doc.h2('12.1 Search');
doc.table(['Control', 'What it does', 'When to use it'], [
  ['Search field',
   'Narrows the list to records containing what you type. Results update as you type; there is no '
   + 'separate search button to select.',
   'When you know part of a customer name, a reference number or an address.'],
  ['Clearing the search',
   'Delete the text in the field to restore the full list.',
   'When you have finished with a search and want everything back.'],
], { widths: [22, 46, 32] });
doc.callout('Search never widens access',
  'Searching applies only to the records your role already has. An Agent searching for another '
  + 'Agent\'s customer will find nothing, because those records are not in their list to begin with.');

doc.h2('12.2 Filters');
doc.p(
  'The Job Order screen offers a filter panel with a field for each part of a referral. Enter a '
  + 'value, or tick the entries you want, and the list narrows to matching records.'
);
doc.table(['Filter', 'Type', 'Use it to find'], [
  ['First Name / Last Name', 'Type a value', 'A referral by the customer\'s name.'],
  ['Contact Number', 'Type a value', 'A referral by the customer\'s mobile number.'],
  ['Applicant Email Address', 'Type a value', 'A referral by the customer\'s email address.'],
  ['Referred by', 'Type a value', 'Referrals credited to a particular Agent. Most useful to Administrators.'],
  ['Region / City / Barangay', 'Tick from a list', 'All referrals in a particular area.'],
  ['Choose Plan', 'Tick from a list', 'All referrals on a particular plan.'],
  ['Status', 'Tick from a list', 'Referrals at a particular stage.'],
  ['Billing Day', 'Type a value', 'Referrals billed on a given day of the month.'],
  ['Remarks', 'Type a value', 'Referrals with particular notes recorded against them.'],
], { widths: [28, 20, 52] });

doc.h2('12.3 Date Range');
doc.table(['Control', 'What it does', 'When to use it'], [
  ['From', 'Hides records dated before the date chosen.', 'To report on a period starting on a known date.'],
  ['To', 'Hides records dated after the date chosen.', 'To report on a period ending on a known date.'],
  ['Clear', 'Removes both dates. Appears only when a date has been set.', 'To return to the full list.'],
], { widths: [16, 48, 36] });

doc.h2('12.4 Resetting');
doc.table(['Control', 'What it does'], [
  ['All Job Orders', 'Clears the filter selection on the Job Order screen.'],
  ['All Agents', 'On the Agent Payout screen, returns from one Agent to the whole list.'],
  ['Clear', 'Removes the date range.'],
  ['Emptying the search field', 'Removes the search restriction on any list.'],
]);
doc.callout('If a list looks empty',
  'An empty list almost always means a filter, a search term or a date range is still applied '
  + 'from earlier. Clear all three before concluding that a record is missing.');

doc.h2('12.5 Sorting, Pagination and Columns');
doc.table(['Control', 'What it does'], [
  ['Column heading', 'Select to sort by that column; select again to reverse the order.'],
  ['Rows per page', 'Sets how many records appear on one page.'],
  ['Next / Previous', 'Moves forward or back one page.'],
  ['First Page / Last Page', 'Jumps to the beginning or the end of the list.'],
  ['Column Visibility', 'Chooses which columns appear, and therefore which appear in an export.'],
]);
doc.small('Your column selection is remembered for the next time you open the screen.');

/* ── 13. Notifications ────────────────────────────────────────────────────── */
doc.h1('13. Notifications');
doc.metaLine([BOTH]);
doc.p('Notifications tell you when something relevant to your work has happened, such as a referral being completed.');

doc.h2('13.1 Viewing Notifications — Web Application');
doc.h3('Notifications');
doc.sub('Purpose');
doc.p('Opens the list of recent messages. A badge on the control shows how many are unread.');
doc.sub('How to Use');
doc.steps([
  'Locate the bell control in the bar across the top of the window.',
  'Select it to open the notification panel.',
  'Read the list. Each entry shows its type, its message and when it arrived.',
  'Select the bell again, or select elsewhere, to close the panel.',
]);
doc.sub('Expected Result');
doc.p('The panel opens, headed Recent Notifications with the number held. Opening the panel clears the unread badge.');

doc.h3('Clear All');
doc.sub('Purpose');
doc.p('Empties the notification panel of everything currently listed.');
doc.sub('How to Use');
doc.steps([
  'Open the notification panel.',
  'Select Clear All at the top of the panel.',
]);
doc.sub('Expected Result');
doc.p('The listed notifications are removed from the panel. Only newer notifications will appear from that point on.');
doc.callout('Note',
  'Clear All removes the messages from your view only. It does not change any record, and it '
  + 'cannot be undone — read anything important before clearing.');

doc.h2('13.2 Viewing Notifications — Mobile Application');
doc.steps([
  'Select Menu in the bottom navigation bar.',
  'Select Notifications.',
  'Read the list.',
  'Close the panel to return to the Menu.',
]);

doc.h2('13.3 Notification Types');
doc.table(['Type', 'What it means', 'What to do'], [
  ['Job order completed',
   'An installation has been marked as finished.',
   'An Agent should check their Dashboard: the Done count and balances may have changed.'],
  ['General notice',
   'An operational message from the system or the office.',
   'Read it and act on it if it concerns one of your referrals.'],
], { widths: [24, 38, 38] });
doc.small('Notifications are informational. There is no reply or approval action to take within a notification.');

/* ── 14. Mobile (agent) ───────────────────────────────────────────────────── */
doc.h1('14. Mobile Application — Agent');
doc.metaLine([AGENT]);
doc.p(
  'The Mobile Application provides the same Agent functions as the Web Application, arranged for '
  + 'a phone. Everything recorded on the phone is immediately available on the computer, and the reverse.'
);

doc.h2('14.1 Signing In');
doc.steps([
  'Open the SYNC Mobile Application.',
  'Enter your account number, username or email address.',
  'Enter your password.',
  'Select SECURE LOGIN and wait while it reads LOGGING IN.',
]);
doc.small(
  'Forgot Password? starts a reset from the phone. APPLY NOW on the sign-in screen is for members '
  + 'of the public applying for service and is not part of Agent sign-in.'
);

doc.h2('14.2 Navigation');
doc.table(['Item', 'Opens'], [
  ['Dashboard', 'Your earnings, referral figures and milestone progress.'],
  ['Job Order', 'The referrals you have submitted that are still in the field.'],
  ['Work Order', 'The work orders assigned to you.'],
  ['History', 'Your commission, incentive and bonus records.'],
  ['Menu', 'Your profile, notifications, application information and sign out.'],
]);

doc.h2('14.3 Home / Dashboard');
doc.bullets([
  ['Identity card. ', 'Your initials, name and Agent ID, with the four balance figures beneath.'],
  ['Referral figures. ', 'The same card shows In Progress, Done, Failed and Reschedule counts on its other side.'],
  ['Achievement panel. ', 'The 30 Onboard Referrals gauge, with Get Reward when a milestone is unlocked.'],
  ['Total Balance. ', 'Your Commission, Incentives and Bonus added together, with the Application Form control beside it.'],
  ['Cashout History. ', 'Your most recent payout records.'],
]);
doc.p('Pull the screen downwards to reload the figures.');

doc.h2('14.4 Job Orders on Mobile');
doc.steps([
  'Select Job Order in the bottom navigation bar. The list of your active referrals opens immediately.',
  'Use the search field, or select Filters, to narrow the list.',
  'Select Filter by Status to show only referrals at a particular stage.',
  'Select a card to open the referral.',
  'Review the customer information, the address and the visit information.',
  'Check the status shown on the card. A referral that has been started in the field is marked Work Started.',
]);
doc.callout('Updating a job order from the phone',
  'Agents cannot update, complete or approve a job order on the phone, just as on the computer. '
  + 'On-site updates are recorded by the technician. If something needs to change, contact your coordinator.');

doc.h2('14.5 Submitting an Application on Mobile');
doc.steps([
  'Open the Dashboard.',
  'Select Application Form.',
  'Complete the customer details, the installation address and the plan.',
  'Attach the primary government identification, and any other documents. You may photograph a '
  + 'document directly or choose an existing image.',
  'Check the mobile number and the installation address once more.',
  'Select Save and wait while it reads Saving.',
]);
doc.p('A confirmation message is displayed and you are returned to the Dashboard. Select Cancel at any point to close the form without submitting.');

doc.h2('14.6 History on Mobile');
doc.steps([
  'Select History in the bottom navigation bar.',
  'Select the tab you need: Commission History, Incentives History or Bonus History.',
  'Set the date range, using Clear to remove it again.',
  'Use the search field to narrow the records further.',
  'Use the export control to produce a PDF of what is displayed.',
]);
doc.callout('An add control may appear here',
  'Recording a payout is an Administrator task. If an add control is visible to you on this '
  + 'screen, it is not part of your role — do not use it. Report anything you did not expect to '
  + 'see to your administrator.');

doc.h2('14.7 Profile and Menu');
doc.table(['Shown', 'Meaning'], [
  ['Name', 'The name held on your account, as it appears on referrals you submit.'],
  ['Account identifier', 'The account number or username you sign in with.'],
  ['Email address', 'The address held on your account.'],
  ['Role', 'Your role in the system, shown as a badge. For an Agent this reads AGENT.'],
  ['About App', 'Information about the application, including its version.'],
  ['Release Notes', 'What has changed in the current version.'],
]);
doc.small('Profile details are maintained by your administrator. If anything shown here is wrong, ask for it to be corrected — your name is used to credit your referrals.');

doc.h2('14.8 Logging Out on Mobile');
doc.steps([
  'Select Menu.',
  'Select Sign out.',
  'Select Confirm to end the session, or Cancel to stay signed in.',
]);

/* ── 15. Agent control reference ──────────────────────────────────────────── */
doc.h1('15. Agent Button and Control Reference');
doc.metaLine([AGENT]);
doc.p('Every control available to an Agent account, in both applications.');

doc.h2('15.1 Sign In and Session');
doc.table(['Control', 'Function', 'When to Use'], [
  ['SECURE LOGIN', 'Verifies your credentials and opens the system.', 'To start work.'],
  ['Forgot Password?', 'Starts a password reset.', 'When you cannot sign in.'],
  ['Back to Login', 'Returns from the password reset form to the sign-in screen.', 'To abandon a reset.'],
  ['Logout / Sign out', 'Ends your session.', 'When you have finished, and always on a shared device.'],
  ['Confirm / Cancel', 'Confirms or abandons signing out.', 'In the message shown when signing out on a phone.'],
], { widths: [22, 44, 34] });

doc.h2('15.2 Dashboard');
doc.table(['Control', 'Function', 'When to Use'], [
  ['Refresh', 'Reloads your balances, referral figures and cashout history.', 'After submitting an application, or when expecting a payout.'],
  ['Show Referrals / Show Balances', 'Turns the card between the balance figures and the referral counts.', 'To check referral progress without leaving the screen.'],
  ['Get Reward', 'Claims the reward for a completed onboarding milestone.', 'Only when the milestone is complete and the control is displayed.'],
  ['Application Form', 'Opens the form used to submit a new customer application.', 'Whenever you have a new referral to record.'],
], { widths: [22, 44, 34] });

doc.h2('15.3 Application Form');
doc.table(['Control', 'Function', 'When to Use'], [
  ['Save', 'Submits the application and credits the referral to you.', 'Once every required field is complete and checked.'],
  ['Cancel', 'Closes the form without submitting.', 'To abandon an application. Anything typed is discarded.'],
  ['Attach / choose image', 'Attaches a supporting document to the application.', 'For identification, proof of billing or a photograph of the property.'],
  ['Clear image', 'Removes an attached document so a different one can be chosen.', 'When the wrong file was attached.'],
], { widths: [22, 44, 34] });

doc.h2('15.4 Lists — Job Order and Work Order');
doc.table(['Control', 'Function', 'When to Use'], [
  ['Search', 'Narrows the list to matching records as you type.', 'When you know part of a name, number or address.'],
  ['Filters', 'Opens the panel of filter fields.', 'To narrow the list by area, plan, status or other detail.'],
  ['All Job Orders', 'Clears the filter selection.', 'To start again after filtering.'],
  ['Back to Filters', 'Returns from the list to the filter panel on a narrow screen.', 'To adjust a filter on a phone.'],
  ['Filter by Status', 'Restricts the list to one stage.', 'To see only referrals awaiting a further visit, for example.'],
  ['Table', 'Shows records as rows in a table.', 'On a computer, or when comparing many records.'],
  ['Card', 'Shows each record as a card.', 'On a phone, or when reading one record at a time.'],
  ['Column Visibility', 'Chooses which columns appear.', 'To simplify the table, or to set up an export.'],
  ['Export to CSV', 'Saves the listed records to a spreadsheet file.', 'To work with your referrals outside the system.'],
  ['Refresh List', 'Reloads the records from the system.', 'When you expect a status to have changed.'],
  ['First Page / Last Page', 'Jumps to the beginning or end of the list.', 'In a long list.'],
  ['Retry', 'Attempts to load the list again after a connection failure.', 'When the list could not be loaded.'],
  ['Relogin', 'Returns you to the sign-in screen when your session has expired.', 'When you are asked to sign in again.'],
], { widths: [22, 44, 34] });

doc.h2('15.5 History');
doc.table(['Control', 'Function', 'When to Use'], [
  ['Commission History', 'Shows payouts recorded against your account.', 'To check what has been paid.'],
  ['Incentives History', 'Shows quota incentives awarded to you.', 'To check how a quota batch was calculated.'],
  ['Bonus History', 'Shows bonus amounts added or paid out.', 'To check a bonus.'],
  ['Search', 'Narrows the records displayed.', 'When looking for a particular reference number.'],
  ['From / To', 'Restricts the records to a date range.', 'To report on a period.'],
  ['Clear', 'Removes the date range.', 'To return to the full list.'],
  ['Column Visibility', 'Chooses which columns appear.', 'To set up an export.'],
  ['Export to PDF', 'Produces a PDF of the records displayed.', 'To keep or share a record of your earnings.'],
  ['Refresh Records', 'Reloads the records from the system.', 'When expecting a newly recorded payout.'],
], { widths: [22, 44, 34] });

doc.h2('15.6 Controls Not Available to Agents');
doc.p('These exist in the system but belong to the Administrator role. They are listed so you know not to look for them.');
doc.table(['Control', 'Covered in'], [
  ['Add Work Order', 'Administrator procedures for work orders.'],
  ['Edit or update a job order', 'Administrator procedures for job orders.'],
  ['Approve or reject', 'Administrator procedures for job orders.'],
  ['Assign or reassign a technician', 'Coordination procedures.'],
  ['New Commission Payout / Add Record', 'Chapter 19.'],
  ['New Payout, on the Agent Payout screen', 'Chapter 20.'],
  ['Add, edit or delete an Agent team', 'Chapter 17.'],
  ['Create or edit an Agent account', 'Chapter 18.'],
]);

/* ── 16. Agent workflows ──────────────────────────────────────────────────── */
doc.h1('16. Agent Workflows');
doc.metaLine([AGENT]);

doc.h2('Workflow A1 — Signing In and Reaching Your Work');
doc.steps([
  'Open the Web Application in a browser, or the Mobile Application on your phone.',
  'Enter your account number, username or email address, and your password.',
  'Select SECURE LOGIN.',
  'The Agent Dashboard opens. Check your balance figures and your milestone progress.',
  'Use the navigation menu to open Job Order, Work Order or History as needed.',
]);

doc.h2('Workflow A2 — Submitting a New Referral');
doc.steps([
  'Open the Dashboard and select Application Form.',
  'Enter the customer\'s email address, first name, last name and mobile number.',
  'Select the region, then the city or municipality, then the barangay.',
  'Enter the full installation address, and a landmark if it will help the technician.',
  'Confirm that Referred By shows your own name. It cannot be edited.',
  'Select the plan the customer has agreed to.',
  'Attach the primary government identification, plus any other documents you have.',
  'Check the mobile number and the address once more.',
  'Select Save and wait for the confirmation message.',
  'Return to the Dashboard and select Refresh.',
]);

doc.h2('Workflow A3 — Finding a Referral');
doc.steps([
  'Select Job Order in the navigation menu.',
  'Type part of the customer\'s name, number or address into the search field.',
  'If more precision is needed, open the filters and narrow by area, plan or status.',
  'Select the row or card to open the referral.',
  'Review the customer information, the address, the visit information and the current status.',
  'Select All Job Orders when you have finished, to clear the filters for next time.',
]);

doc.h2('Workflow A4 — Following a Referral to Installation');
doc.steps([
  'Open Job Order and locate the referral.',
  'Check the onsite status. In Progress means the visit has not yet been completed.',
  'If the status is Reschedule, contact the customer to confirm availability for the next visit, '
  + 'and tell your coordinator anything that would prevent it.',
  'Check again after the expected visit date.',
  'When the referral no longer appears in the list, open the Dashboard and select Refresh.',
  'Confirm that the Done count has increased on the referral side of the card.',
]);

doc.h2('Workflow A5 — Claiming a Milestone Reward');
doc.steps([
  'Open the Dashboard and select Refresh so the figures are current.',
  'Check the achievement gauge and confirm the milestone is complete.',
  'Select Get Reward.',
  'Read the confirmation message.',
  'Confirm that your Commission figure has increased by the reward amount, and that Achievement records the same amount.',
]);

doc.h2('Workflow A6 — Checking Earnings and Producing a Statement');
doc.steps([
  'Select History in the navigation menu.',
  'Select Commission History to see payouts recorded against your account.',
  'Set the From and To dates for the period you want.',
  'Select Incentives History to see how any quota incentive was made up, batch by batch.',
  'Select Bonus History to see any bonus recorded.',
  'Use Column Visibility to include only the columns you need.',
  'Select Export to PDF to keep a copy.',
]);

/* ═════════════════════════════════════════════════════════════════════════════
   PART THREE — THE ADMINISTRATOR ROLE
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Three', 'The Administrator Role',
  'The management side of the Agent Module: setting up Agent accounts and teams, and recording '
  + 'commission, incentive and bonus transactions. Nothing in this part is available to an Agent '
  + 'account. If you are an Agent, you can skip it — it is here so you know who to contact and what '
  + 'they will do.');

/* ── 17. Administrator navigation ─────────────────────────────────────────── */
doc.h1('17. Administrator Navigation and Team Agents');
doc.metaLine([ADMIN]);

doc.h2('17.1 Where the Management Screens Are');
doc.p(
  'In the Web Application, the management screens for this module are grouped together under '
  + 'Agent in the navigation menu. In the Mobile Application they appear under Agent in the Menu.'
);
doc.table(['Menu entry', 'Purpose', 'Chapter'], [
  ['Pay Out/In', 'Record and review commission, incentive and bonus transactions for any Agent.', '19'],
  ['Team Agents', 'Create and maintain the Agent teams.', '17'],
  ['Agent Management', 'Create and maintain Agent user accounts.', '18'],
  ['Agent Payout', 'Review balances and payouts one Agent at a time, and record a payout.', '20'],
  ['Affiliates', 'Maintain affiliate groups. Available in the Mobile Application.', '21'],
], { widths: [24, 58, 18] });

doc.h2('17.2 Team Agents');
doc.p(
  'A team is a named grouping of Agents. The Team Agents screen lists the teams belonging to your '
  + 'organisation, showing when each was created and by whom.'
);
doc.table(['Column', 'What it shows'], [
  ['Team Name', 'The name of the team.'],
  ['Created At', 'The date the team was created.'],
  ['Created By', 'Who created it.'],
  ['Actions', 'The controls described below.'],
]);

doc.h3('Add');
doc.sub('Purpose');
doc.p('Creates a new Agent team.');
doc.sub('How to Use');
doc.steps([
  'Open Team Agents.',
  'Select the add control in the toolbar.',
  'Enter the Team Name. It is required.',
  'Save the dialog.',
]);
doc.sub('Expected Result');
doc.p('The team is created against your organisation and appears in the list, stamped with your name and today\'s date.');

doc.h3('Edit');
doc.sub('Purpose');
doc.p('Renames an existing team.');
doc.sub('How to Use');
doc.steps([
  'Locate the team in the list, using the search field if needed.',
  'Select the edit control on that row.',
  'Change the Team Name.',
  'Save the dialog.',
]);
doc.sub('Expected Result');
doc.p('The team name is updated in the list. Teams belonging to another organisation cannot be edited and will be refused.');

doc.h3('Delete');
doc.sub('Purpose');
doc.p('Removes a team.');
doc.sub('How to Use');
doc.steps([
  'Locate the team in the list.',
  'Select the delete control on that row.',
  'Confirm when asked whether you are sure.',
]);
doc.sub('Expected Result');
doc.p('The team is removed from the list. Teams belonging to another organisation cannot be deleted and will be refused.');
doc.callout('Before deleting a team',
  'Deletion cannot be undone. Check first whether Agents are still associated with the team, and '
  + 'rename it instead if the grouping is simply changing.');

doc.h3('Record Payout');
doc.sub('Purpose');
doc.p('Opens the payout dialog directly from a team row, so a payout can be recorded without leaving the screen.');
doc.sub('How to Use');
doc.steps([
  'Locate the team in the list.',
  'Select the payout control on that row.',
  'Complete the dialog as described in Chapter 20.',
]);
doc.sub('Expected Result');
doc.p('The payout is recorded and the Agent\'s balances are adjusted. The Agent will see it in their History.');

doc.h3('Search and Refresh');
doc.table(['Control', 'Function'], [
  ['Search team name', 'Narrows the list to teams whose name matches what you type.'],
  ['Refresh', 'Reloads the list of teams.'],
  ['First / Previous / Next / Last Page', 'Moves through a long list of teams.'],
]);

/* ── 18. Agent management ─────────────────────────────────────────────────── */
doc.h1('18. Agent Management');
doc.metaLine([ADMIN]);
doc.p(
  'Agent Management opens the user administration screen filtered to Agent accounts. This is '
  + 'where an Agent\'s account is created before they can sign in, and where their details are '
  + 'maintained afterwards.'
);

doc.h2('18.1 What This Screen Is For');
doc.bullets([
  ['Creating an Agent account. ', 'Until an account exists with the Agent role, the person cannot sign in or be credited with referrals.'],
  ['Maintaining details. ', 'Names and contact details are corrected here.'],
  ['Controlling access. ', 'The role held by the account determines everything the person can see and do.'],
]);
doc.callout('Why the name matters',
  'Referrals are credited to an Agent by the name held on their account, and work orders are '
  + 'matched to them by name or email address. If a name is recorded incorrectly, or is later '
  + 'changed, referrals and assignments may not be matched to that Agent. Check the spelling when '
  + 'creating the account, and inform the office before changing an established name.');

doc.h2('18.2 Working With Agent Accounts');
doc.steps([
  'Open Agent Management from the Agent group in the menu.',
  'Use the search field to find an existing account, or use the add control to create a new one.',
  'Complete the account details, including the person\'s name, contact details and the Agent role.',
  'Save the record.',
  'Confirm the new account appears in the list.',
]);
doc.small(
  'Agent Management follows the same conventions as the rest of user administration. Where your '
  + 'organisation has its own procedure for issuing accounts and passwords, follow that procedure.'
);

/* ── 19. Pay Out/In ───────────────────────────────────────────────────────── */
doc.h1('19. Pay Out / In');
doc.metaLine([ADMIN]);
doc.callout('The same screen an Agent calls History',
  'Pay Out/In and the Agent\'s History screen are one and the same. The difference is what each '
  + 'role gets. An Agent sees only their own records, and no control to record anything. An '
  + 'Administrator sees every Agent, and the controls to record transactions.');

doc.h2('19.1 The Three Tabs');
doc.table(['Tab', 'What it lists', 'What can be recorded'], [
  ['Commission History', 'Commission payouts for all Agents.', 'A commission payout.'],
  ['Incentives History', 'Quota incentives awarded automatically.', 'Nothing — this tab is a record of what the system awarded.'],
  ['Bonus History', 'Bonus amounts added and paid out.', 'A bonus addition, or a bonus payout.'],
], { widths: [24, 40, 36] });
doc.small('Incentives are calculated and awarded by the system. There is no add control on the Incentives tab.');

doc.h2('19.2 Recording a Commission Payout');
doc.h3('New Commission Payout / Add');
doc.sub('Purpose');
doc.p('Records that commission has been paid to an Agent, and reduces their commission balance accordingly.');
doc.sub('How to Use');
doc.steps([
  'Open Pay Out/In and select the Commission History tab.',
  'Select the add control to open the Commission Payout dialog.',
  'Select the Agent being paid.',
  'Optionally set a Start Date and End Date to limit which completed referrals are included.',
  'Check the Total Amount. It is calculated from the Agent\'s qualifying referrals and their commission rate, and can be adjusted.',
  'Attach the Proof of Payment. It is required.',
  'Enter Remarks describing the payment. They are required.',
  'Save the dialog.',
]);
doc.sub('Expected Result');
doc.p(
  'A commission record is created with an automatically generated Reference Number, the Agent\'s '
  + 'commission balance is reduced by the amount, and the referrals covered are marked as paid so '
  + 'they cannot be claimed twice. The Agent sees the record in their History.'
);
doc.table(['Field', 'Required', 'Notes'], [
  ['Reference Number', 'Yes', 'Generated automatically and cannot be edited.'],
  ['Start Date', 'No', 'Limits the referrals included to those installed on or after this date.'],
  ['End Date', 'No', 'Limits the referrals included to those installed on or before this date.'],
  ['Total Amount', 'Yes', 'Calculated for you, and adjustable.'],
  ['Proof of Payment', 'Yes', 'An image of the receipt or transfer confirmation.'],
  ['Remarks', 'Yes', 'A description of the payment.'],
], { widths: [24, 14, 62] });

doc.h2('19.3 Recording an Incentive Transaction');
doc.h3('Incentives Payout');
doc.sub('Purpose');
doc.p('Either pays out an Agent\'s accumulated incentives, or adds incentives to their balance manually.');
doc.sub('How to Use');
doc.steps([
  'Open Pay Out/In.',
  'Open the Incentives Payout dialog from the add control.',
  'Select the Agent.',
  'Choose the Transaction Type: Payout to pay incentives out, or Add Incentives to credit them.',
  'Check the Total Amount. For a payout it cannot exceed the incentives available.',
  'Attach the Proof and enter Remarks. Both are required.',
  'Save the dialog.',
]);
doc.sub('Expected Result');
doc.p(
  'A record is created and the Agent\'s Incentives figure moves accordingly — down for a payout, '
  + 'up for an addition. No other balance is affected.'
);

doc.h2('19.4 Recording a Bonus Transaction');
doc.h3('Bonus Payout');
doc.sub('Purpose');
doc.p('Either grants a bonus to an Agent, or records that a bonus has been paid out.');
doc.sub('How to Use');
doc.steps([
  'Open Pay Out/In and select the Bonus History tab.',
  'Select the add control to open the Bonus Payout dialog.',
  'Select the Agent.',
  'Choose the Transaction Type: Add Bonus to grant one, or Payout to record a payment.',
  'Enter the Total Amount. For a payout it cannot exceed the bonus available.',
  'Attach the Proof and enter Remarks. Both are required.',
  'Save the dialog.',
]);
doc.sub('Expected Result');
doc.p('A bonus record is created and the Agent\'s Bonus figure moves accordingly. No other balance is affected.');

doc.h2('19.5 Fields Common to Every Payout Dialog');
doc.table(['Field', 'Required', 'Notes'], [
  ['Agent', 'Yes', 'Who the transaction belongs to. Always confirm before saving.'],
  ['Reference Number', 'Yes', 'Generated automatically and cannot be edited. Quote it if the Agent queries the payment.'],
  ['Total Amount', 'Yes', 'The amount concerned.'],
  ['Proof', 'Yes', 'An image evidencing the payment.'],
  ['Remarks', 'Yes', 'A description of the transaction.'],
], { widths: [24, 14, 62] });
doc.callout('If the dialog refuses to save',
  'The message "Agent, reference number, amount, proof, and remarks are required" means one of '
  + 'those is missing. The message "Failed to upload proof of payment image" means the image did '
  + 'not upload — nothing has been recorded, so try again with a smaller or clearer image.');

/* ── 20. Agent Payout ─────────────────────────────────────────────────────── */
doc.h1('20. Agent Payout');
doc.metaLine([ADMIN]);
doc.p(
  'The Agent Payout screen is organised by Agent rather than by transaction. It is the quickest '
  + 'way to answer "what does this Agent currently hold, and what have we paid them?"'
);

doc.h2('20.1 Screen Layout');
doc.table(['Area', 'What it shows'], [
  ['Agent list', 'All Agents, with All Agents at the top to remove the restriction.'],
  ['Date filters', 'From and To fields limiting the records shown.'],
  ['Summary cards', 'For a selected Agent: Balance, Incentives and Bonus.'],
  ['Records table', 'The payout records for the selected Agent, or for everyone.'],
]);

doc.h2('20.2 Reviewing One Agent');
doc.steps([
  'Open Agent Payout.',
  'Select the Agent in the list on the left.',
  'Read the three summary cards to see what that Agent currently holds.',
  'Review the records table beneath, narrowing by date if needed.',
  'Select All Agents to return to the full view.',
]);

doc.h2('20.3 Recording a Payout');
doc.h3('New Payout / Add Record');
doc.sub('Purpose');
doc.p('Records a payment to the selected Agent against whichever balance is being settled.');
doc.sub('How to Use');
doc.steps([
  'Select the Agent in the list.',
  'Select New Payout.',
  'Choose the Payout Type. This decides which balance is reduced.',
  'Check the Total Amount. It is offered based on the balance chosen and can be adjusted.',
  'Attach the Proof and enter Remarks. Both are required.',
  'Save the dialog.',
]);
doc.sub('Expected Result');
doc.p('The payout is recorded with an automatically generated reference number, and the Agent\'s balances are reduced as set out below.');

doc.h2('20.4 Payout Types');
doc.table(['Payout Type', 'Which balance it reduces'], [
  ['Commission (Balance)', 'The commission balance only.'],
  ['Incentives', 'The incentives figure only.'],
  ['Bonus', 'The bonus figure only.'],
  ['All Balance', 'Everything owed: commission first, then incentives, then bonus.'],
]);
doc.callout('Choose the type carefully',
  'Each balance is separate, and the Payout Type decides which one is settled. Paying incentives '
  + 'reduces the incentives figure and leaves the commission balance untouched, and the reverse. '
  + 'Recording the wrong type leaves one balance overstated and another understated, so confirm '
  + 'the type and the Agent before saving.');

doc.h2('20.5 Other Controls');
doc.table(['Control', 'Function'], [
  ['All Agents', 'Removes the single-Agent restriction and shows every record.'],
  ['Date Filters', 'Opens the From and To fields.'],
  ['Column Visibility', 'Chooses which columns appear in the records table.'],
  ['Export to PDF', 'Produces a PDF of the records currently displayed.'],
  ['First Page / Last Page', 'Moves through a long list of records.'],
]);

/* ── 21. Affiliates ───────────────────────────────────────────────────────── */
doc.h1('21. Affiliates');
doc.metaLine([ADMIN]);
doc.p(
  'Affiliates are groups maintained alongside the Agent programme. The screen is reached from the '
  + 'Agent group in the Menu of the Mobile Application.'
);
doc.table(['Control', 'Function', 'When to Use'], [
  ['Edit Affiliate', 'Changes the details of an existing affiliate group.', 'When a group is renamed or its details change.'],
  ['Delete Affiliate', 'Removes an affiliate group.', 'When a group is no longer used. Check first that nothing depends on it.'],
], { widths: [22, 44, 34] });

/* ── 22. Administrator control reference and workflows ────────────────────── */
doc.h1('22. Administrator Control Reference');
doc.metaLine([ADMIN]);
doc.p('Controls available to an Administrator in the Agent Module, and not to an Agent.');
doc.table(['Control', 'Screen', 'Function'], [
  ['Add', 'Team Agents', 'Creates a new Agent team.'],
  ['Edit', 'Team Agents', 'Renames an existing team.'],
  ['Delete', 'Team Agents', 'Removes a team, after confirmation.'],
  ['Record Payout', 'Team Agents', 'Opens the payout dialog from a team row.'],
  ['Add / New Commission Payout', 'Pay Out/In', 'Records a commission payout for an Agent.'],
  ['Add', 'Pay Out/In — Bonus tab', 'Records a bonus addition or payout.'],
  ['New Payout / Add Record', 'Agent Payout', 'Records a payout against a chosen balance.'],
  ['All Agents', 'Agent Payout', 'Removes the single-Agent restriction.'],
  ['Date Filters', 'Agent Payout, Pay Out/In', 'Opens the From and To fields.'],
  ['Export to PDF', 'Agent Payout, Pay Out/In', 'Produces a PDF of the records displayed.'],
  ['Edit Affiliate', 'Affiliates', 'Changes an affiliate group.'],
  ['Delete Affiliate', 'Affiliates', 'Removes an affiliate group.'],
], { widths: [30, 26, 44] });

doc.h2('22.1 Administrator Workflows');

doc.h3('Workflow B1 — Setting Up a New Agent');
doc.steps([
  'Open Agent Management and create the user account, giving it the Agent role.',
  'Check the spelling of the name carefully — referrals are credited by name.',
  'Open Team Agents and create or select the team the Agent belongs to.',
  'Issue the credentials to the Agent through your organisation\'s normal process.',
  'Ask the Agent to sign in and confirm their Dashboard opens.',
]);

doc.h3('Workflow B2 — Paying an Agent\'s Commission');
doc.steps([
  'Open Pay Out/In and select the Commission History tab.',
  'Select the add control and choose the Agent.',
  'Set the Start Date and End Date for the period being settled.',
  'Check the Total Amount against the qualifying referrals.',
  'Attach the proof of payment and enter remarks identifying the period.',
  'Save, then confirm the record appears in the list with its reference number.',
]);

doc.h3('Workflow B3 — Settling Everything an Agent Is Owed');
doc.steps([
  'Open Agent Payout and select the Agent.',
  'Read the Balance, Incentives and Bonus summary cards and note the total.',
  'Select New Payout and choose the Payout Type All Balance.',
  'Check the Total Amount matches what you intend to pay.',
  'Attach the proof of payment and enter remarks.',
  'Save, then confirm all three summary cards have reduced as expected.',
]);

doc.h3('Workflow B4 — Answering an Agent\'s Query About a Payment');
doc.steps([
  'Ask the Agent for the reference number shown in their History.',
  'Open Pay Out/In, or Agent Payout with that Agent selected.',
  'Search for the reference number.',
  'Open the record and check the amount, the date, the remarks and the proof of payment.',
  'If the record is wrong, agree the correction with your supervisor before recording anything further.',
]);

doc.h3('Workflow B5 — Checking How an Incentive Was Calculated');
doc.steps([
  'Open Pay Out/In and select the Incentives History tab.',
  'Filter to the Agent concerned.',
  'Read the Batch, Quota Reached and Incentive Value columns.',
  'Confirm the number of lines matches the quota for that batch.',
  'Explain to the Agent that incentives are awarded automatically once a full quota is reached, '
  + 'and that any remainder carries forward.',
]);

/* ═════════════════════════════════════════════════════════════════════════════
   PART FOUR — REFERENCE
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Four', 'Shared Reference',
  'Guidance, troubleshooting, answers to common questions and a glossary. Entries are marked '
  + 'with the role they apply to wherever the answer differs.');

/* ── 23. Common mistakes ──────────────────────────────────────────────────── */
doc.h1('23. Common Mistakes to Avoid');
doc.metaLine([BOTH]);

doc.h2('23.1 For Agents');
doc.table(['Avoid', 'Why it matters'], [
  ['Selecting Save more than once while the form is submitting.',
   'The control reads Saving while it works. Selecting it again may create a duplicate application. Wait for the confirmation message.'],
  ['Submitting before checking the mobile number and address.',
   'These are used to contact the customer and to find the property. An error here causes a failed or rescheduled visit, which costs you the referral.'],
  ['Assuming a referral is lost when it leaves the Job Order list.',
   'Completed referrals are removed from the list by design. Check the Done count on your Dashboard.'],
  ['Selecting Get Reward repeatedly.',
   'A milestone can only be claimed once. Repeated attempts are refused. Select it once and wait for the message.'],
  ['Concluding a record is missing without clearing filters.',
   'A search term, a filter or a date range left from earlier is the usual cause of an empty list.'],
  ['Adding the Achievement figure to your Total Balance.',
   'The milestone reward is already included in your Commission figure. Achievement is a lifetime record, not a separate amount owed.'],
  ['Waiting for a job order control that does not exist.',
   'Agents do not approve, update or assign job orders. Contact your coordinator instead.'],
  ['Using an add control on the History screen.',
   'Recording payouts is an Administrator task. Report anything unexpected to your administrator.'],
], { widths: [40, 60] });

doc.h2('23.2 For Administrators');
doc.table(['Avoid', 'Why it matters'], [
  ['Recording a payout against the wrong Agent.',
   'The Agent selected in the dialog decides whose balance moves. Confirm the name before saving.'],
  ['Choosing the wrong Payout Type.',
   'Each balance is separate. The wrong type leaves one figure overstated and another understated.'],
  ['Recording a payout twice for the same period.',
   'The Agent\'s balance is reduced each time. Search for the period before recording a new payment.'],
  ['Saving without a proof of payment.',
   'Proof and remarks are required, and they are what allows a query to be answered months later.'],
  ['Deleting a team that is still in use.',
   'Deletion cannot be undone. Rename it instead if the grouping is simply changing.'],
  ['Changing an established Agent name without warning.',
   'Referrals and work assignments are matched by name. Changing it can break that matching.'],
  ['Expecting to record incentives manually on the Incentives tab.',
   'Incentives are awarded automatically when a quota is reached. That tab is a record, not an entry point.'],
], { widths: [40, 60] });

/* ── 24. Troubleshooting ──────────────────────────────────────────────────── */
doc.h1('24. Troubleshooting');
doc.metaLine([BOTH]);
doc.table(['Problem', 'Role', 'Possible Cause and Recommended Action'], [
  ['Cannot sign in.', 'Both',
   'Incorrect identifier or password, or the account is not active. Check for typing errors and '
   + 'that caps lock is off. Use Forgot Password?. If it still fails, contact your administrator.'],
  ['The menu is shorter than expected.', 'Both',
   'The menu shows only what your role permits. Compare it with the table in Chapter 2.2. If an '
   + 'entry you need is missing, your role does not have it.'],
  ['A referral does not appear on the Job Order screen.', 'Agent',
   'It has been completed or failed, no job order has been raised yet, or a filter is applied. '
   + 'Clear the search, filters and date range, then check the Dashboard counts.'],
  ['The list is empty.', 'Both',
   'A search term, filter or date range is still applied. Empty the search field, select All Job '
   + 'Orders or All Agents, and select Clear on any date range.'],
  ['Balances look wrong or out of date.', 'Both',
   'The figures were loaded before the most recent change. Select Refresh on the Dashboard, or '
   + 'Refresh Records on the History screen.'],
  ['An expected payout is not listed.', 'Agent',
   'It has not yet been recorded. Select Refresh Records. If it is still absent, contact the '
   + 'office and quote the period concerned.'],
  ['Get Reward is not displayed.', 'Agent',
   'No milestone is unlocked, or the one available has already been claimed. Check the Done count '
   + 'against the target, select Refresh and look again.'],
  ['Get Reward is refused.', 'Agent',
   'The milestone has not truly been reached, or it has already been claimed. The system re-checks '
   + 'completed referrals on every claim. Select Refresh and read the message.'],
  ['The application could not be submitted.', 'Agent',
   'A required field is incomplete or a value is in the wrong format. Read the message, complete '
   + 'the highlighted fields, and check the mobile number is 11 digits.'],
  ['The application saved but the documents did not.', 'Agent',
   'The upload did not complete. The application has been submitted — contact the office so the '
   + 'documents can be added to the record.'],
  ['A control cannot be selected.', 'Both',
   'The action is not permitted for your role, or a request is still processing. Check Chapter '
   + '15.6. If a control is greyed out, wait for the current action to finish.'],
  ['A payout dialog will not save.', 'Administrator',
   'A required field is missing, or the proof image failed to upload. Complete the Agent, amount, '
   + 'proof and remarks, and retry with a smaller image if needed.'],
  ['An Agent says their balance is wrong after a payout.', 'Administrator',
   'The wrong Payout Type may have been used. Open the record, check which balance was settled, '
   + 'and agree any correction with your supervisor before recording anything further.'],
  ['Referrals are not being credited to an Agent.', 'Administrator',
   'The name on the account may not match the name recorded on the referrals. Check the account '
   + 'in Agent Management for spelling.'],
  ['Information on the phone looks out of date.', 'Both',
   'The screen has not been reloaded, or the connection dropped. Pull the screen downwards to '
   + 'reload, check the signal, then select Retry if offered.'],
  ['Asked to sign in again unexpectedly.', 'Both',
   'The session has expired. Select Relogin if offered and sign in again.'],
], { widths: [26, 12, 62] });

/* ── 25. Best practices ───────────────────────────────────────────────────── */
doc.h1('25. Best Practices');
doc.metaLine([BOTH]);

doc.h2('25.1 For Agents — Accurate Data Entry');
doc.bullets([
  'Enter the customer\'s name as it appears on their identification.',
  'Check the mobile number digit by digit. It is the only reliable way the technician can reach the customer.',
  'Give the installation address in full, and add a landmark where the property is hard to find.',
  'Select the region, city and barangay from the lists rather than relying on the address text alone.',
  'Confirm the plan with the customer before you record it.',
]);

doc.h2('25.2 For Agents — Reviewing and Following Up');
doc.bullets([
  'Read the whole form once more before selecting Save, and confirm Referred By shows your name.',
  'Open each attached image and confirm it is readable and the right way up.',
  'Check your Job Order list regularly rather than waiting to be told of a change.',
  'Act on a Reschedule promptly — a delayed visit is the most common reason a referral is lost.',
  'Keep the customer informed while they wait for the installation.',
]);

doc.h2('25.3 For Administrators — Recording Money Accurately');
doc.bullets([
  'Confirm the Agent and the Payout Type before saving. Both decide whose balance moves and which one.',
  'Always attach a proof of payment and write remarks that identify the period being settled.',
  'Search for the period first, so the same payment is not recorded twice.',
  'Check the summary cards after saving, to confirm the balances moved as expected.',
  'Quote the reference number when discussing a payment with an Agent.',
]);

doc.h2('25.4 For Administrators — Managing Accounts and Teams');
doc.bullets([
  'Check the spelling of an Agent\'s name when creating the account — referrals are credited by name.',
  'Rename a team rather than deleting it when a grouping simply changes.',
  'Confirm nothing depends on a team or affiliate group before deleting it.',
  'Review Agent accounts periodically and deactivate those no longer in use.',
]);

doc.h2('25.5 For Everyone — Account Security');
doc.bullets([
  'Never share your password. Everything done under your account is attributed to you.',
  'Always log out on a shared or public device.',
  'Report any unrecognised record to your administrator at once.',
  'Report any control you can see but should not be able to use.',
]);

/* ── 26. FAQ ──────────────────────────────────────────────────────────────── */
doc.h1('26. Frequently Asked Questions');
doc.metaLine([BOTH]);

doc.h2('26.1 Questions About Roles');
[
  ['Who can record a payout?',
   'Administrators only. Agents can see payouts recorded against them but cannot create one.'],
  ['Why can an Agent not edit a job order?',
   'Job orders are read-only for Agents in both applications. On-site information is recorded by '
   + 'the technician and administrative changes are made by an Administrator.'],
  ['Can an Agent see another Agent\'s referrals or earnings?',
   'No. Every list and total is restricted to the signed-in Agent, whatever is typed into a search or filter.'],
  ['Why do History and Pay Out/In look different for different people?',
   'They are the same screen. An Agent sees only their own records and no add control; an '
   + 'Administrator sees all Agents and can record transactions.'],
  ['Who assigns the technician?',
   'A coordinator. Neither the Agent nor the Agent Module performs assignment.'],
].forEach(([q, a]) => { doc.h3(q); doc.p(a); });

doc.h2('26.2 Questions From Agents');
[
  ['How do I submit a new customer?',
   'Open the Dashboard and select Application Form. Complete the details, the address, the plan '
   + 'and the documents, then select Save.'],
  ['How do I find one of my referrals?',
   'Select Job Order, then type part of the customer\'s name, number or address into the search field.'],
  ['Why has a referral disappeared from my Job Order list?',
   'The list shows only referrals still in the field. Once installation is Done, or if it Failed, '
   + 'the referral leaves the list and is counted on your Dashboard instead.'],
  ['Why does Referred By show my name and refuse to change?',
   'Referrals you submit are always credited to your account, so the field is deliberately read-only.'],
  ['What is the difference between Commission, Incentives, Bonus and Achievement?',
   'Commission is your main spendable balance. Incentives are awarded automatically for reaching '
   + 'your quota. Bonus is granted by an Administrator. Achievement is a lifetime record of '
   + 'milestone rewards — the money itself is added to Commission.'],
  ['Why is Achievement not included in my Total Balance?',
   'Because the reward has already been added to your Commission figure. Counting it twice would '
   + 'overstate what you are owed.'],
  ['How are incentives calculated?',
   'Each time your completed referrals reach a full quota, one incentive is awarded automatically. '
   + 'Incentives History shows the batch, the quota reached and the value. Leftover referrals carry forward.'],
  ['Can I claim the same milestone twice?',
   'No. Each milestone can be claimed once. A second attempt is refused.'],
  ['Do I need to submit a report?',
   'No. There is no report for Agents to submit. Exporting your records produces a document for '
   + 'your own use and sends nothing to the office.'],
  ['A payout is missing from my history. What should I do?',
   'Select Refresh Records first. If it is still absent, contact the office and quote the period concerned.'],
].forEach(([q, a]) => { doc.h3(q); doc.p(a); });

doc.h2('26.3 Questions From Administrators');
[
  ['How do I set up a new Agent?',
   'Create the user account with the Agent role in Agent Management, then create or select their '
   + 'team in Team Agents. Workflow B1 sets out the full sequence.'],
  ['Which screen should I use to pay an Agent?',
   'Use Pay Out/In when working through transactions by type. Use Agent Payout when working '
   + 'through one Agent and settling what they hold.'],
  ['What does each Payout Type do?',
   'Commission (Balance) reduces the commission balance, Incentives reduces incentives, Bonus '
   + 'reduces bonus, and All Balance settles commission first, then incentives, then bonus.'],
  ['Can I record incentives manually?',
   'Incentives are awarded automatically when a quota is reached, so the Incentives tab has no add '
   + 'control. Use the Incentives Payout dialog to pay them out or to credit an adjustment.'],
  ['Why is an Agent not being credited with their referrals?',
   'Referrals are matched by the name on the Agent\'s account. Check the spelling in Agent Management.'],
  ['Can I delete a team that has Agents in it?',
   'The team can be deleted, but it cannot be undone. Rename it instead if the grouping is simply changing.'],
  ['An Agent says a payment is wrong. How do I check?',
   'Ask for the reference number, search for it in Pay Out/In or Agent Payout, and open the record '
   + 'to check the amount, date, remarks and proof of payment.'],
].forEach(([q, a]) => { doc.h3(q); doc.p(a); });

/* ── 27. Glossary ─────────────────────────────────────────────────────────── */
doc.h1('27. Glossary');
doc.metaLine([BOTH]);
doc.table(['Term', 'Meaning'], [
  ['Achievement', 'A lifetime record of the milestone rewards an Agent has claimed. The reward money itself is added to the Commission figure.'],
  ['Administrator', 'Office or management staff responsible for Agent accounts, teams and payouts.'],
  ['Affiliate', 'A group maintained alongside the Agent programme.'],
  ['Agent', 'A user who introduces new customers, follows those referrals to installation, and earns commission and incentives for them.'],
  ['Agent ID', 'The identifier shown on the Agent Dashboard card.'],
  ['Agent Module', 'The set of screens and functions covering Agents and their customers.'],
  ['Application', 'The record created when an Agent submits a new customer.'],
  ['Barangay', 'The smallest administrative area used in the installation address.'],
  ['Billing Day', 'The day of the month on which the customer is billed.'],
  ['Billing Status', 'The state of the customer\'s account for billing purposes.'],
  ['Bonus', 'A discretionary amount granted to an Agent by an Administrator.'],
  ['Cashout', 'A payout recorded against an Agent\'s account.'],
  ['Commission', 'An Agent\'s main spendable balance, earned from completed referrals and credited milestone rewards.'],
  ['Customer', 'The person receiving the service.'],
  ['Incentive', 'An amount awarded automatically each time an Agent\'s completed referrals reach a full quota.'],
  ['Installation Fee', 'The fee recorded against a job order for carrying out the installation.'],
  ['Job Order', 'The installation record raised for a customer, tracking the visit through to completion.'],
  ['Milestone', 'A target number of onboarded referrals which, once reached, unlocks a reward the Agent can claim.'],
  ['Mobile Application', 'The SYNC System used on a phone.'],
  ['Onboarded', 'A referral whose installation has been completed successfully.'],
  ['Onsite Status', 'The state of the installation visit: In Progress, Reschedule, Done or Failed.'],
  ['Payout Type', 'On a payout dialog, the setting that decides which balance is reduced.'],
  ['Plan', 'The service package the customer has agreed to.'],
  ['Proof of Payment', 'The image attached to a payout record evidencing the payment.'],
  ['Quota', 'The number of completed referrals required to earn one incentive.'],
  ['Referral', 'A customer introduced by an Agent.'],
  ['Referred By', 'The field recording which Agent a customer was referred by.'],
  ['Reference Number', 'The identifier generated for a payout record. Quote it when querying a payment.'],
  ['Reschedule', 'A status meaning a further visit is required.'],
  ['Role', 'What an account is permitted to do — in this manual, Agent or Administrator.'],
  ['SYNC System', 'The complete system, of which the Agent Module is one part.'],
  ['Team', 'A named grouping of Agents, maintained on the Team Agents screen.'],
  ['Technician', 'The person who visits the customer\'s address and carries out the installation.'],
  ['Total Balance', 'An Agent\'s Commission, Incentives and Bonus figures added together.'],
  ['Web Application', 'The SYNC System used on a computer, in a web browser.'],
  ['Work Order', 'A unit of work recorded in the system and assigned to a named person.'],
], { widths: [24, 76] });

/* ── finish ─────────────────────────────────────────────────────────────── */
doc.buildToc();
doc.chrome();
const { pages } = doc.save(OUT);
console.log(`Wrote ${OUT} — ${pages} pages.`);

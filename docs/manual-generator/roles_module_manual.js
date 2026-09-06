/*
 * Builds the SYNC Roles Module User Manual PDF.
 *
 * Covers Role Management as it is actually implemented in ATSS2_0/frontend and
 * enforced by ATSS2_0/backend: the role list, the role form and every field on
 * it, the permission grid and the rules that govern ticking it, how a role is
 * put on a user, and what each grantable page and action means.
 *
 * The product is branded SYNC in the document.
 *
 * Written for the people who use the module, not for developers. Screens,
 * buttons, fields, labels and refusal messages were read off the source before
 * they were written down. If a screen changes, edit this file.
 *
 *   node roles_module_manual.js [output.pdf] [date] [version] [preparedBy] [organization]
 */
const path = require('path');
const { Doc } = require('./render.js');

const OUT = process.argv[2] || path.join(__dirname, '..', 'SYNC_Roles_Module_Complete_User_Manual.pdf');
const DATE = process.argv[3] || '5 September 2026';
const VERSION = process.argv[4] || '1.0';
const PREPARED_BY = process.argv[5] || 'Documentation Team';
const ORGANIZATION = process.argv[6] || 'SYNC';

const ADMIN = 'Applies to: ADMINISTRATOR and SUPER ADMINISTRATOR';
const EVERY = 'Applies to: everybody who holds a role';
const WEB = 'System: Web Application';

const doc = new Doc({
  eyebrow: 'SYNC',
  title: 'Roles Module User Manual',
  subtitle: 'Role Management — Complete Operating Guide',
  blurb:
    'This manual documents the Roles Module end to end: what a role is and how SYNC decides what '
    + 'a signed-in user may see and do, how to read the Role Management list, every field on the '
    + 'role form and what to put in it, how the permission grid works and the rules that govern '
    + 'ticking it, how to build a role on top of one of the built-in roles, how a role is put on a '
    + 'user, and what every page and every button-level permission actually grants. Each screen, '
    + 'field and message described here was taken from the working system.',
  facts: [
    ['Document Title', 'SYNC Roles Module User Manual'],
    ['Subtitle', 'Role Management — Complete Operating Guide'],
    ['Version', VERSION],
    ['Document Date', DATE],
    ['Prepared By', PREPARED_BY],
    ['Organization', ORGANIZATION],
    ['Intended Audience',
     'Administrators and super administrators who decide who may use which part of SYNC'],
    ['Applies To', 'The Web Application. Roles are not created or edited in the Mobile Application'],
    ['How it is organised',
     'Part One explains how access works. Part Two is the list screen. Part Three is the role '
     + 'form, field by field. Part Four puts a role to work on real people. Part Five is '
     + 'reference for everybody.'],
  ],
  footNote:
    'Role Management sits under Users > Roles. If it does not appear in your menu, your own role '
    + 'does not hold it — ask a super administrator. Everything in this manual assumes you are '
    + 'signed in to the Web Application with an account that may manage roles.',
  runningHeader: 'SYNC Roles Module User Manual',
  runningFooter: 'Role Management',
});

doc.cover();

/* ═════════════════════════════════════════════════════════════════════════════
   PART ONE — UNDERSTANDING ROLES
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part One', 'Understanding Roles and Permissions',
  'Read this part before you create anything. It explains what a role is, how SYNC decides what '
  + 'a signed-in user may reach, and the difference between the roles that ship with the system '
  + 'and the ones you build yourself.');

/* ── 1 ─────────────────────────────────────────────────────────────────────── */
doc.h1('1. Introduction');
doc.metaLine([EVERY, WEB]);

doc.h2('1.1 What the Roles Module Is For');
doc.p(
  'Every person who signs in to SYNC holds exactly one role. That role is the whole answer to two '
  + 'questions: which screens appear in their menu, and which buttons appear on those screens. '
  + 'Change somebody’s role and you change what they can reach; change the role itself and you '
  + 'change it for everybody holding it.'
);
doc.p(
  'The Roles Module is where those roles are read, created, adjusted and removed. It does not '
  + 'create people — accounts are created in Users Management — and it does not hand a role to '
  + 'anybody. It defines what a role means. Putting a role on a person is one field on that '
  + 'person’s account, and Chapter 11 covers it.'
);

doc.h2('1.2 Where to Find It');
doc.table(['Item', 'Where'], [
  ['Menu path', 'Users > Roles'],
  ['Screen title', 'Role Management'],
  ['What it says under the title', 'Manage user roles and permissions'],
  ['Who can open it', 'Any account whose role holds the Roles Management page'],
  ['Where roles are assigned', 'Users > Users Management, on the Role field of a user'],
], { widths: [30, 70] });

doc.h2('1.3 The Words This Manual Uses');
doc.table(['Word', 'What it means here'], [
  ['Role', 'A named set of permissions. One person holds one role.'],
  ['Permission',
   'A single thing a role is allowed to do. Either opening a page, or using one control on a '
   + 'page.'],
  ['View',
   'The permission that opens a page and puts it in the menu. Without it, nothing else on that '
   + 'page matters.'],
  ['Action',
   'A permission for one button on a page — Add, Edit, Delete, Approve, Pay Out and so on. Each '
   + 'is granted separately from the page itself.'],
  ['System role',
   'One of the eight roles that ship with SYNC. They cannot be edited or deleted, and they are '
   + 'marked System in the list.'],
  ['Custom role', 'A role you created. It can be edited and deleted.'],
  ['Base role',
   'A system role that a custom role is built on top of. The custom role then holds everything '
   + 'that system role holds, plus whatever else you tick.'],
  ['Inherited',
   'A permission a role holds because its base role holds it, rather than because somebody '
   + 'ticked it.'],
], { widths: [22, 78] });

/* ── 2 ─────────────────────────────────────────────────────────────────────── */
doc.h1('2. How SYNC Decides What Somebody May Do');
doc.metaLine([EVERY, WEB]);

doc.h2('2.1 The Two Levels');
doc.p(
  'Permissions come in two levels, and they work together. The page level decides whether a '
  + 'screen exists for that user at all. The action level decides which of that screen’s controls '
  + 'are drawn once they are on it.'
);
doc.table(['Level', 'What it controls', 'Example'], [
  ['Page (View)',
   'The entry in the menu, and the screen itself.',
   'A role holding Job Order sees Job Order in the menu and can open it.'],
  ['Action',
   'One named button on that page. Leave it unticked and the button is not drawn.',
   'The same role without Approve can open Job Order and read it, but cannot approve one.'],
], { widths: [18, 40, 42] });
doc.p(
  'This is why the two are never granted together automatically in the direction you might '
  + 'expect. Ticking an action ticks its page for you, because a button on a page you cannot open '
  + 'would be pointless. Ticking a page does not tick its actions, because read-only access to a '
  + 'screen is a perfectly ordinary thing to want.'
);

doc.h2('2.2 The Menu Only Draws — the Server Decides');
doc.p(
  'Hiding a button is a convenience, not the protection. Every request SYNC makes is checked '
  + 'again on the server against the same permission before anything happens. Somebody who '
  + 'reached a screen they should not have would still be refused the moment they tried to use '
  + 'it. You do not need to hide a screen twice; granting the permission is the decision, and '
  + 'everything else follows from it.'
);
doc.callout('Organisation scope applies on top of permissions',
  'A permission says what kind of thing a role may do. It never widens whose records it may do it '
  + 'to. An administrator with every permission in the system still only acts on records '
  + 'belonging to their own organisation.');

doc.h2('2.3 When a Change Takes Effect');
doc.table(['Change', 'When the person sees it'], [
  ['You edit a role in Role Management',
   'On their next action in the Web Application. The server re-reads the role on every request, '
   + 'so access removed from a role is gone immediately, even mid-session.'],
  ['You move somebody to a different role',
   'Same — their next action. They do not have to sign out and back in.'],
  ['The menu itself',
   'Refreshes when the page is reloaded. Ask them to reload if an entry they should now have is '
   + 'not showing.'],
  ['The Mobile Application',
   'Refreshes a signed-in user’s permissions once per launch, so a role edited while somebody is '
   + 'signed in takes effect the next time they open the app.'],
], { widths: [34, 66] });

/* ── 3 ─────────────────────────────────────────────────────────────────────── */
doc.h1('3. The Two Kinds of Role');
doc.metaLine([ADMIN, WEB]);

doc.h2('3.1 System Roles');
doc.p(
  'Eight roles ship with SYNC. They cover the ordinary jobs people do, they are marked System in '
  + 'the list, and their row offers no Edit or Delete — it says Locked instead. Their access is '
  + 'fixed and maintained with the product, which means two useful things: they never drift, and '
  + 'when a new screen is added to SYNC the roles that ought to have it get it without anybody '
  + 'editing anything.'
);
doc.table(['System role', 'Who it is for', 'Lands on after signing in'], [
  ['SuperAdmin', 'Full access to everything, including screens added in future versions.',
   'Dashboard'],
  ['Administrator', 'Day-to-day running of the system.', 'Dashboard'],
  ['Head Technician', 'Supervising field work and applications.', 'Application'],
  ['Technician', 'Working the job orders assigned to them.', 'Job Order'],
  ['OSP', 'Outside plant work orders.', 'Work Order'],
  ['Inventory Staff', 'Stock and inventory categories.', 'Inventory'],
  ['Agent', 'Referring customers and reading their own earnings.', 'Agent Dashboard'],
  ['Customer', 'The customer’s own portal, bills and support.', 'Customer Portal'],
], { widths: [20, 52, 28] });
doc.small(
  'SuperAdmin is the only role that holds everything by definition rather than by list. That is '
  + 'why a page added to SYNC later is available to a SuperAdmin at once, and has to be ticked '
  + 'into any custom role that should also have it.'
);

doc.h2('3.2 Custom Roles');
doc.p(
  'Anything you create is a custom role. It carries its own list of ticked permissions, it can be '
  + 'edited whenever the job changes, and it can be deleted once nobody holds it. Create one '
  + 'whenever a real job in your organisation does not match a system role — a billing clerk who '
  + 'must not touch configuration, a supervisor who may approve payouts but not create users, a '
  + 'read-only auditor.'
);

doc.h2('3.3 Which One Should You Build?');
doc.table(['If the job is...', 'Do this'], [
  ['Exactly one of the eight', 'Use the system role. Do not copy it into a custom role.'],
  ['One of the eight, plus a little more',
   'Create a custom role, set Start From a System Role to that role, and tick only the extras. '
   + 'See Chapter 9.'],
  ['One of the eight, minus something',
   'Create a custom role with no base and tick the pages the job needs. A base cannot be '
   + 'narrowed — you cannot inherit a role and then take something away from it.'],
  ['Nothing like any of them',
   'Create a custom role with no base and tick every page and action by hand.'],
], { widths: [30, 70] });

/* ═════════════════════════════════════════════════════════════════════════════
   PART TWO — THE ROLE MANAGEMENT SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Two', 'The Role Management Screen',
  'What the list shows you, what each badge on it means, and which controls you will and will '
  + 'not see on it.');

/* ── 4 ─────────────────────────────────────────────────────────────────────── */
doc.h1('4. Reading the List');
doc.metaLine([ADMIN, WEB]);

doc.h2('4.1 The Columns');
doc.table(['Column', 'What it shows'], [
  ['Role Name',
   'The name of the role, with its badges beside it. This is the name that appears in the Role '
   + 'dropdown when somebody is given this role.'],
  ['Description',
   'Your own note about what the role is for. Shows "No description provided" when it was left '
   + 'empty.'],
  ['Last Updated', 'The date the role was last saved.'],
  ['Actions',
   'Edit and Delete for a custom role. For a system role, the word Locked.'],
], { widths: [22, 78] });

doc.h2('4.2 The Badges');
doc.table(['Badge', 'Meaning'], [
  ['System',
   'One of the eight built-in roles. It cannot be edited or deleted from this screen.'],
  ['<Role name> +',
   'A custom role built on a system role. The badge names the base — "Administrator +" means it '
   + 'holds everything an Administrator holds, plus its own extras. Hover it for the same '
   + 'explanation.'],
  ['No badge', 'A custom role that stands on its own, holding only what was ticked on it.'],
], { widths: [24, 76] });

doc.h2('4.3 Finding a Role');
doc.bullets([
  ['Search.', 'The search box filters on role name as you type.'],
  ['Page size.', 'Show 10, 25, 50 or 100 rows at a time; 25 to begin with.'],
  ['Paging.', 'First, previous, next and last, with the current page and total between them.'],
  ['Refresh.', 'The circular arrow beside the Add button re-reads the list from the server.'],
]);

doc.h2('4.4 Which Roles You Can See');
doc.p(
  'The list always shows the eight system roles. Alongside them it shows the custom roles '
  + 'belonging to your own organisation. Custom roles created in another organisation are not '
  + 'listed, and cannot be edited or deleted even if you know they exist.'
);

/* ── 5 ─────────────────────────────────────────────────────────────────────── */
doc.h1('5. The Controls on This Screen');
doc.metaLine([ADMIN, WEB]);

doc.h2('5.1 What Each One Does');
doc.table(['Control', 'Where', 'What it does'], [
  ['Add (plus)', 'Top right', 'Opens an empty role form. See Chapter 6.'],
  ['Refresh', 'Top right', 'Re-reads the list.'],
  ['Edit (pencil)', 'On a custom role’s row', 'Opens that role in the form for changes.'],
  ['Delete (bin)', 'On a custom role’s row',
   'Asks "Are you sure you want to delete this role?" and removes it if you confirm.'],
  ['Locked', 'On a system role’s row', 'Not a button. It marks the row as uneditable.'],
], { widths: [18, 24, 58] });

doc.h2('5.2 If a Control Is Not There');
doc.p(
  'Add, Edit and Delete are three separate permissions on the Roles Management page, and each '
  + 'button is only drawn when your own role holds the matching one. A missing button is not a '
  + 'fault — it means your role was not given that part of the page. Ask a super administrator if '
  + 'you believe you should have it.'
);
doc.table(['You cannot see', 'Your role is missing'], [
  ['The Roles entry in the menu at all', 'The Roles Management page itself'],
  ['The Add button', 'Add on Roles Management'],
  ['The Edit pencil', 'Edit on Roles Management'],
  ['The Delete bin', 'Delete on Roles Management'],
], { widths: [46, 54] });

/* ═════════════════════════════════════════════════════════════════════════════
   PART THREE — CREATING AND EDITING A ROLE
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Three', 'Creating and Editing a Role',
  'The role form, field by field: what to type, what to pick, how the permission grid behaves '
  + 'while you tick it, and what the system will refuse to save.');

/* ── 6 ─────────────────────────────────────────────────────────────────────── */
doc.h1('6. The Role Form, Field by Field');
doc.metaLine([ADMIN, WEB]);

doc.p(
  'Press Add to open an empty form titled Add New Role, or the pencil on a row to open that role '
  + 'as Edit Role. The two forms are identical. There are four things on it: a name, a '
  + 'description, a base role, and the permission grid.'
);

doc.h2('6.1 The Fields');
doc.table(['Field', 'Required', 'What to put in it'], [
  ['Role Name', 'Yes',
   'What the role will be called everywhere in SYNC, including the Role dropdown on a user. Up '
   + 'to 255 characters. It must be different from every other role name, the eight system roles '
   + 'included. Name it after the job, not the person: "Billing Clerk", not "Maria".'],
  ['Description', 'No',
   'A sentence saying what the role is for and who should hold it. It is shown in the list, and '
   + 'it is the only place the intention behind a role is recorded. Worth filling in.'],
  ['Start From a System Role', 'No',
   'Leave it on "None — pick every page by hand" to build the role from nothing. Pick one of the '
   + 'eight to inherit everything that role holds and then only add to it. See Chapter 9.'],
  ['Permissions', 'No, but a role with none can do nothing',
   'The grid of pages and actions. Tick View to give the page, and tick the actions beside it to '
   + 'give its buttons. See Chapters 7 and 8.'],
], { widths: [20, 14, 66] });

doc.h2('6.2 Things the Form Fills In For You');
doc.p(
  'You are not asked for these, and there is nothing to set. They are recorded so the list can '
  + 'show them and so a role stays inside your organisation.'
);
doc.table(['Recorded', 'From'], [
  ['Organisation', 'Your own. A role you create belongs to your organisation and stays there.'],
  ['Created by / updated by', 'The account that pressed Save.'],
  ['Last Updated', 'The moment you pressed Save. This is the date the list shows.'],
], { widths: [30, 70] });

doc.h2('6.3 Saving');
doc.p(
  'Save on a new role, Update on an existing one. If anything is wrong the form stays open and '
  + 'says why in red at the top — it repeats what the server said rather than a status code, so '
  + 'the message names the field. A blank name is marked Required under the box itself.'
);

/* ── 7 ─────────────────────────────────────────────────────────────────────── */
doc.h1('7. The Permission Grid');
doc.metaLine([ADMIN, WEB]);

doc.h2('7.1 How It Is Laid Out');
doc.p(
  'The grid has three columns and is grouped into sections — Dashboards, Billing, Operations, '
  + 'Agent, Inventory, Tools, Configurations, Users, Logs, Customer Portal and Settings. The '
  + 'sections are the same groupings the menu uses, so you tick a role in the shape the person '
  + 'will navigate it.'
);
doc.table(['Column', 'What it is'], [
  ['Page Name', 'The screen, written exactly as it appears in the menu.'],
  ['View',
   'One checkbox. Ticking it gives the role that page and puts it in their menu.'],
  ['Actions',
   'A checkbox per button on that page, each labelled as the button reads — Add, Edit, Delete, '
   + 'Approve, Pay Out, Generate and so on. A page with no named buttons has nothing here.'],
], { widths: [20, 80] });
doc.small(
  'The grid scrolls inside its own box, and lists every page in SYNC. A page added to the product '
  + 'appears here on its own, so there is never a screen that cannot be granted.'
);

doc.h2('7.2 Reading a Row');
doc.p(
  'Take Job Order. Ticking View puts Job Order in the menu and lets the role open it and read the '
  + 'list. Beside it sit Approve, Failed, Tech Edit, Admin Edit, Attachment and Pre Installed — '
  + 'six separate buttons, each granted or withheld on its own. A role with View and nothing else '
  + 'has a read-only Job Order screen. That is a legitimate and common setup.'
);

doc.h2('7.3 The Standard Three');
doc.p(
  'Most list screens — every Configurations page, and every page under Users — offer the same '
  + 'three actions. They always mean the same thing.'
);
doc.table(['Action', 'What it grants'], [
  ['Add', 'The plus button that creates a new record on that page.'],
  ['Edit', 'The pencil on a row, and the form it opens.'],
  ['Delete', 'The bin on a row, and the confirmation that follows it.'],
], { widths: [16, 84] });

/* ── 8 ─────────────────────────────────────────────────────────────────────── */
doc.h1('8. Rules the Grid Follows While You Tick It');
doc.metaLine([ADMIN, WEB]);

doc.p(
  'The grid is not a plain list of checkboxes. Four rules run while you work, and knowing them '
  + 'saves a lot of confusion later.'
);

doc.h2('8.1 Ticking an Action Ticks Its Page');
doc.p(
  'Tick Approve on Job Order without having ticked Job Order itself, and Job Order is ticked for '
  + 'you. A button on a page the role cannot open would grant nothing.'
);

doc.h2('8.2 Unticking a Page Clears Its Actions');
doc.p(
  'Untick Job Order and Approve, Failed, Tech Edit, Admin Edit, Attachment and Pre Installed all '
  + 'clear with it. Taking the screen away takes its buttons away; nothing is left behind to '
  + 'surprise you if the page is granted again later.'
);

doc.h2('8.3 Some Pairs Cannot Both Be Held');
doc.p(
  'Job Order and Service Order each have two different edit forms — one written for the '
  + 'technician who did the work, one for the administrator who checks it. A role uses one or the '
  + 'other, never both, so ticking one clears the other.'
);
doc.table(['On this page', 'These two exclude each other'], [
  ['Job Order', 'Tech Edit and Admin Edit'],
  ['Service Order', 'Tech Edit and Admin Edit'],
], { widths: [30, 70] });
doc.small(
  'If a base role already brings one of a pair in, the other is not offered at all. A role built '
  + 'on a base cannot give up half of what it inherited.'
);

doc.h2('8.4 Inherited Ticks Are Locked');
doc.p(
  'When the role has a base, everything the base grants shows already ticked, greyed out, and '
  + 'marked Inherited, with a note naming the base role. You cannot untick those — they are what '
  + 'the base means. You can only add to them.'
);

/* ── 9 ─────────────────────────────────────────────────────────────────────── */
doc.h1('9. Building a Role on Top of a System Role');
doc.metaLine([ADMIN, WEB]);

doc.h2('9.1 What "Start From a System Role" Does');
doc.p(
  'Pick one of the eight and the role you are building holds everything that role holds, without '
  + 'you ticking any of it. The grid fills in with those permissions locked and marked Inherited, '
  + 'and whatever you tick on top is added to them.'
);
doc.p(
  'The important part is that the inheritance stays live. The role does not take a copy of its '
  + 'base — it follows it. If a screen is added to SYNC later and the base role gets it, every '
  + 'role built on that base gets it too, with nobody editing anything. A copied list would have '
  + 'gone stale the day it was saved.'
);

doc.h2('9.2 Building One');
doc.steps([
  'Press Add and give the role a name and a description.',
  'Set Start From a System Role to the role the job is closest to. The grid fills in and the '
  + 'note under the picker names what has been inherited.',
  'Scroll the grid and tick only the extras. Anything already ticked and greyed is inherited and '
  + 'needs nothing from you.',
  'Press Save. The list now shows the role with a purple "<Base> +" badge naming its base.',
]);

doc.h2('9.3 Choosing SuperAdmin as the Base');
doc.p(
  'A role based on SuperAdmin inherits everything, including screens added in future versions. '
  + 'The form says so and there is nothing left to tick. Only do this deliberately: it produces a '
  + 'second unrestricted role under a different name.'
);

doc.h2('9.4 Changing or Removing the Base Later');
doc.table(['You do this', 'What happens'], [
  ['Switch to a different base role',
   'Anything you had ticked that the new base already grants stops being an extra, and anything '
   + 'that clashes with what the new base grants is dropped. What is left is still ticked.'],
  ['Set the base back to None',
   'The role becomes a standalone custom role. It keeps every permission that was ticked on it '
   + 'directly, and loses the inherited ones. Check the grid before saving — the role may now be '
   + 'much narrower than it looks.'],
], { widths: [30, 70] });
doc.callout('A system role is never itself a hybrid',
  'The eight built-in roles do not inherit from anything. Their access is fixed with the product, '
  + 'which is exactly why they are safe to build on.');

/* ── 10 ────────────────────────────────────────────────────────────────────── */
doc.h1('10. Editing and Deleting a Role');
doc.metaLine([ADMIN, WEB]);

doc.h2('10.1 Editing');
doc.steps([
  'Find the role and press the pencil on its row.',
  'Change the name, description, base role or ticks. The grid opens showing what the role '
  + 'genuinely holds today, so what you see is what it has.',
  'Press Update. Everybody holding that role is affected from their next action onward.',
]);
doc.callout('Editing a role changes it for everybody holding it',
  'There is no per-person exception. If one person needs something different, they need a '
  + 'different role — check the Users Management list first to see who holds this one.');

doc.h2('10.2 Deleting');
doc.p(
  'Press the bin and confirm. A role can only be deleted once nobody holds it: if anybody is '
  + 'still on it, SYNC refuses with "Cannot delete role that has assigned users". Move those '
  + 'people to another role first, then delete.'
);

doc.h2('10.3 What SYNC Will Refuse');
doc.table(['You try to', 'The message you get', 'Why'], [
  ['Edit a system role', 'System roles cannot be edited',
   'The eight built-in roles are fixed. Build a custom role on top of one instead.'],
  ['Delete a system role', 'System roles cannot be deleted', 'Same reason.'],
  ['Delete a role somebody holds', 'Cannot delete role that has assigned users',
   'Reassign them first.'],
  ['Reuse a name', 'The name is already taken',
   'Role names are unique across the whole system, system roles included.'],
  ['Edit a role from another organisation',
   'Unauthorized. You can only update roles within your organization.',
   'Roles belong to the organisation that created them.'],
], { widths: [24, 34, 42] });

/* ═════════════════════════════════════════════════════════════════════════════
   PART FOUR — PUTTING A ROLE TO WORK
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Four', 'Putting a Role to Work',
  'A role does nothing until somebody holds it. How to assign one, how to check it came out the '
  + 'way you meant, and three worked examples.');

/* ── 11 ────────────────────────────────────────────────────────────────────── */
doc.h1('11. Assigning a Role to a Person');
doc.metaLine([ADMIN, WEB]);

doc.h2('11.1 On a New Account');
doc.steps([
  'Go to Users > Users Management.',
  'Press Add and fill in the account: first name, last name, username, email address and a '
  + 'password of at least eight characters.',
  'Pick the role in the Role field. Every role is listed — the eight system roles and your own '
  + 'custom ones, by name.',
  'Save. The person can sign in immediately with what that role allows.',
]);

doc.h2('11.2 On an Existing Account');
doc.steps([
  'Go to Users > Users Management and open the person.',
  'Press Edit, change the Role field, and save. The password can be left blank to keep the '
  + 'current one.',
  'Their access changes on their next action. They do not need to sign out.',
]);

doc.h2('11.3 Where the Role Field Behaves Differently');
doc.table(['Screen', 'The Role field'], [
  ['Users Management', 'A dropdown of every role. This is the normal way to assign one.'],
  ['Agent Management',
   'Fixed to Agent and shown read-only. That screen exists to create agents, so it does not offer '
   + 'a choice — and it reveals the agent-only fields instead. Use Users Management if the person '
   + 'should hold some other role.'],
], { widths: [26, 74] });
doc.small(
  'A person holds one role at a time. To give somebody more than one job, build a role that covers '
  + 'both — that is what Start From a System Role is for.'
);

/* ── 12 ────────────────────────────────────────────────────────────────────── */
doc.h1('12. Checking a Role Came Out Right');
doc.metaLine([ADMIN, WEB]);

doc.h2('12.1 The Order to Work In');
doc.steps([
  'Write down the job in plain words first: which screens, and which buttons on them.',
  'Decide whether it is one of the eight, one of the eight plus extras, or something new '
  + '(Chapter 3.3).',
  'Create the role, tick it, and save.',
  'Assign it to one person as a trial rather than to the whole team.',
  'Have that person reload SYNC and walk the job end to end.',
  'Adjust the role and have them reload again. Repeat until the job runs clean.',
  'Move the rest of the team on to it.',
]);

doc.h2('12.2 What to Look For');
doc.table(['Symptom', 'What it means', 'Fix'], [
  ['A screen is missing from their menu', 'The page is not ticked.',
   'Tick View for that page.'],
  ['The screen opens but a button is missing', 'The page is ticked, the action is not.',
   'Tick that action beside the page.'],
  ['A tick will not come off', 'It is inherited from the base role.',
   'Change or remove the base — an inherited permission cannot be taken away on its own.'],
  ['They can see records but not the ones they expect',
   'Not a permission at all — organisation scope.',
   'Check the organisation on their account.'],
  ['Nothing changed after you saved', 'Their browser is still showing the old menu.',
   'Ask them to reload the page.'],
], { widths: [30, 34, 36] });

/* ── 13 ────────────────────────────────────────────────────────────────────── */
doc.h1('13. Three Worked Examples');
doc.metaLine([ADMIN, WEB]);

doc.h2('13.1 A Billing Clerk Who May Not Configure Anything');
doc.p('Start from nothing and tick only what the job needs.');
doc.table(['Page', 'View', 'Actions to tick'], [
  ['Customer', 'Yes', 'Transact, SO Request'],
  ['Transaction List', 'Yes', 'Approve'],
  ['Invoice', 'Yes', 'none'],
  ['Statements', 'Yes', 'none'],
  ['Overdue', 'Yes', 'none'],
  ['Payment Portal', 'Yes', 'none'],
], { widths: [30, 14, 56] });
doc.small(
  'Leave Base as None. Nothing under Configurations or Users is ticked, so those sections never '
  + 'appear in their menu.'
);

doc.h2('13.2 A Supervisor Who Signs Off Agent Payouts');
doc.p(
  'Closest to Administrator, plus the approval. Set Start From a System Role to Administrator, '
  + 'then tick the extras the job needs — for example Approve on Agent Payout, and Generate and '
  + 'Set Status on Agent Invoices. Everything an Administrator already holds comes in inherited '
  + 'and locked.'
);

doc.h2('13.3 A Read-Only Auditor');
doc.p(
  'Base None. Tick View on every page they must read and no actions at all. They will be able to '
  + 'open and search each screen and change nothing on it, anywhere.'
);
doc.callout('Grant the smallest set that lets the job be done',
  'It is easier to add a permission somebody turns out to need than to explain something they '
  + 'should not have been able to do. Start narrow and widen on request.');

/* ═════════════════════════════════════════════════════════════════════════════
   PART FIVE — REFERENCE
   ═══════════════════════════════════════════════════════════════════════════ */
doc.part('Part Five', 'Reference',
  'Every page you can grant, the actions each one offers, and what to do when something does '
  + 'not behave.');

/* ── 14 ────────────────────────────────────────────────────────────────────── */
doc.h1('14. Every Page You Can Grant');
doc.metaLine([ADMIN, WEB]);
doc.p(
  'Pages are listed in the grid’s own order, under the grid’s own section headings, and written '
  + 'as the grid writes them. "Add, Edit, Delete" means the standard three described in 7.3. A '
  + 'dash means the page has no separate buttons — holding the page is the whole of it.'
);

doc.h2('14.1 Dashboards');
doc.table(['Page', 'Actions it offers'], [
  ['Dashboard', '—'],
  ['Agent Dashboard', '—'],
  ['Monitoring', '—'],
  ['Support', '—'],
], { widths: [36, 64] });

doc.h2('14.2 Billing');
doc.table(['Page', 'Actions it offers'], [
  ['Customer', 'SO Request, Details Edit, Attachment, Transact'],
  ['Transaction List', 'Batch Approve, Approve, Revert Request'],
  ['Revert Requests', '—'],
  ['Payment Portal', '—'],
  ['Statements', '—'],
  ['Invoice', '—'],
  ['Overdue', '—'],
  ['SO Charge', '—'],
  ['DC Notice', '—'],
  ['Rebates', 'Add Rebate'],
  ['Staggered', 'Add Staggered'],
  ['Discounts', 'Add Discount'],
  ['SOA Generation', 'Manage'],
], { widths: [36, 64] });

doc.h2('14.3 Operations');
doc.table(['Page', 'Actions it offers'], [
  ['Application', 'Move to JO, Quick Status'],
  ['Job Order', 'Approve, Failed, Tech Edit, Admin Edit, Attachment, Pre Installed'],
  ['Service Order', 'Tech Edit, Admin Edit'],
  ['Radius Queue', '—'],
  ['Work Order', 'Manage'],
  ['LCP/NAP Location', '—'],
  ['SMS Blast', '—'],
  ['Reports', 'Manage, Delete'],
], { widths: [36, 64] });
doc.small(
  'On Work Order, Manage covers raising, reassigning and deleting a work order, as opposed to '
  + 'working the ones already assigned to you. On Reports, Manage covers scheduling and issuing; '
  + 'Delete is separate because a scheduled report is something other people rely on receiving.'
);

doc.h2('14.4 Agent');
doc.table(['Page', 'Actions it offers'], [
  ['Bonus History', 'Payout'],
  ['Agent Invoices', 'Generate, Set Status, Pay Out'],
  ['Agent Payout', 'Approve'],
  ['Agent Management', '—'],
  ['Team Agents', '—'],
], { widths: [36, 64] });
doc.small(
  'On Agent Invoices, Set Status changes an invoice by hand while Pay Out raises the payout that '
  + 'settles it — the money side, granted separately on purpose. Agent Management and Team Agents '
  + 'have no separate action ticks: holding either page carries its Add, Edit and Delete controls '
  + 'with it, so grant them only to people who should manage agents outright.'
);

doc.h2('14.5 Inventory, Tools and Settings');
doc.table(['Page', 'Actions it offers'], [
  ['Inventory', '—'],
  ['Inventory Category List', '—'],
  ['SmartOLT Tool', '—'],
  ['Mikrotik Radius Tool', '—'],
  ['Xendit Reconciliation', '—'],
  ['Billing Reconcile', '—'],
  ['Settings', '—'],
], { widths: [36, 64] });
doc.small(
  'The four Tools pages are grouped apart from Configurations because they do not describe the '
  + 'system, they act on it — each writes corrections into a live downstream. Grant them '
  + 'deliberately.'
);

doc.h2('14.6 Configurations');
doc.p('Every page in this section offers the standard three: Add, Edit and Delete.');
doc.table(['Page', 'Page', 'Page'], [
  ['Promo', 'Plan', 'Location'],
  ['LCP', 'NAP', 'Ports'],
  ['Router Models', 'Status Remarks', 'Usage Type'],
  ['VLAN Config', 'Payment Method', 'Work Category'],
  ['Radius Config', 'SmartOLT Config', 'SMS Config'],
  ['SMS Template', 'Email Templates', 'PPPoE Setup'],
  ['Concern Config', 'Billing Configurations', ''],
], { widths: [33, 33, 34] });

doc.h2('14.7 Users');
doc.table(['Page', 'Actions it offers'], [
  ['Users Management', 'Add, Edit, Delete'],
  ['Tech Users', 'Add, Edit, Delete'],
  ['Organization', 'Add, Edit, Delete'],
  ['Roles Management', 'Add, Edit, Delete'],
  ['Group Management', 'Add, Edit, Delete'],
], { widths: [36, 64] });
doc.callout('Roles Management is itself a permission',
  'Granting a role the Roles Management page with Add and Edit lets whoever holds it change what '
  + 'every other role may do — including their own. Treat it as the most powerful tick on the '
  + 'grid and give it to very few people.');

doc.h2('14.8 Logs');
doc.p('Read-only records. None of them offers a separate action.');
doc.table(['Page', 'Page'], [
  ['Disconnected Logs', 'Reconnection Logs'],
  ['SMS Logs', 'SMS Blast Logs'],
  ['Email Logs', 'Data Logs'],
  ['Expenses Log', 'Smart OLT Logs'],
  ['Radius Logs', 'System Logs'],
], { widths: [50, 50] });

doc.h2('14.9 Customer Portal');
doc.table(['Page', 'What it is'], [
  ['Customer Portal', 'The customer’s own dashboard.'],
  ['Customer Bills', 'The customer’s bills.'],
  ['Customer Support', 'The customer’s support screen.'],
  ['Agent Application Form', 'The customer application form an agent submits.'],
], { widths: [32, 68] });
doc.small(
  'These four belong to the Customer and Agent roles. There is rarely a reason to tick them into '
  + 'a staff role.'
);

/* ── 15 ────────────────────────────────────────────────────────────────────── */
doc.h1('15. Troubleshooting');
doc.metaLine([ADMIN, WEB]);

doc.h2('15.1 Access Problems');
doc.table(['Symptom', 'Cause', 'What to do'], [
  ['A screen is missing from somebody’s menu',
   'Their role does not hold that page.',
   'Edit the role and tick View for it, or move them to a role that has it.'],
  ['They can open a screen but a button is missing',
   'The page is granted, the action is not.',
   'Tick that action beside the page.'],
  ['They were refused after pressing something they could see',
   'The role was edited between the page loading and the button being pressed.',
   'Ask them to reload; the menu will then match what the role now holds.'],
  ['A whole section of the menu is missing',
   'None of the pages in that section is ticked. A section only appears when at least one page '
   + 'inside it does.',
   'Tick the pages they need.'],
  ['They see the right screens but the wrong records',
   'Organisation, not permission.',
   'Check the organisation on their account.'],
], { widths: [28, 34, 38] });

doc.h2('15.2 Problems With the Form');
doc.table(['Symptom', 'Cause', 'What to do'], [
  ['Required under Role Name', 'The name is empty.', 'Type a name.'],
  ['The name is rejected as taken',
   'Another role already uses it — possibly a system role, or one in another organisation you '
   + 'cannot see.',
   'Choose a different name.'],
  ['A checkbox will not untick', 'It is inherited from the base role.',
   'Change the base, or set it to None and tick what is needed by hand.'],
  ['A checkbox is greyed out and was never ticked',
   'The base role holds the permission it excludes — the Tech Edit and Admin Edit pair.',
   'Nothing to do. A role cannot hold both halves of that pair.'],
  ['Ticking one edit permission cleared the other',
   'Working as intended, for the same pair.',
   'Decide which of the two the job actually needs.'],
  ['The role saved but the person still cannot do the thing',
   'They hold a different role from the one you edited.',
   'Check the Role field on their account in Users Management.'],
], { widths: [28, 34, 38] });

doc.h2('15.3 Problems Deleting');
doc.table(['Symptom', 'Cause', 'What to do'], [
  ['Cannot delete role that has assigned users', 'Somebody still holds it.',
   'Reassign them in Users Management, then delete the role.'],
  ['No bin on the row', 'It is a system role, or your own role lacks Delete.',
   'System roles cannot be deleted at all. Otherwise ask a super administrator.'],
], { widths: [30, 32, 38] });

/* ── 16 ────────────────────────────────────────────────────────────────────── */
doc.h1('16. Quick Reference');
doc.metaLine([ADMIN, WEB]);

doc.h2('16.1 The Role Form at a Glance');
doc.table(['Field', 'Required', 'Notes'], [
  ['Role Name', 'Yes', 'Unique, up to 255 characters. Appears in the Role dropdown.'],
  ['Description', 'No', 'Shown in the list. Say what the role is for.'],
  ['Start From a System Role', 'No', 'None, or one of the eight. Inherits live, adds only.'],
  ['Permissions', 'No', 'View per page; an action per button. Only what you tick is stored.'],
], { widths: [24, 14, 62] });

doc.h2('16.2 Rules Worth Remembering');
doc.bullets([
  ['One role per person.', 'Cover two jobs by building a role, not by assigning two.'],
  ['System roles are fixed.', 'They cannot be edited or deleted. Build on top of them instead.'],
  ['Inheritance is live.', 'A role built on a base follows that base as the product grows.'],
  ['An inherited permission cannot be removed.', 'Change the base, or build without one.'],
  ['Editing a role affects everybody holding it.', 'Check who holds it before you save.'],
  ['A role in use cannot be deleted.', 'Reassign its users first.'],
  ['Names are unique everywhere.', 'Including the eight system roles.'],
  ['Permissions never widen organisation scope.',
   'Every role only ever acts on its own organisation’s records.'],
]);

doc.h2('16.3 Document Notes');
doc.small(
  'Menu paths are written with a greater-than sign between the steps: Users > Roles means the '
  + 'Roles entry inside the Users group of the menu.'
);
doc.small(
  'This manual describes Role Management as implemented in the Web Application at the document '
  + 'date on the cover. The set of pages and actions on the grid grows with the product, and the '
  + 'grid itself is always the current list. Where this manual and the system disagree, the '
  + 'system is right and this manual needs updating.'
);

/* ── build ─────────────────────────────────────────────────────────────────── */
doc.buildToc();
doc.chrome();
const { pages } = doc.save(OUT);
console.log(`Wrote ${OUT} (${pages} pages)`);

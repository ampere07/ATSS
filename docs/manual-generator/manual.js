/* Builds the SYNC User Guide PDF. */
const fs = require('fs');
const path = require('path');
const { Doc } = require('./render.js');
const { renderScreen, PURPOSE, friendlyRoles } = require('./screens.js');

const nav = JSON.parse(fs.readFileSync(path.join(__dirname, 'nav_data.json'), 'utf8'));
const ext = JSON.parse(fs.readFileSync(path.join(__dirname, 'manual_data.json'), 'utf8'));
const dlg = JSON.parse(fs.readFileSync(path.join(__dirname, 'dialog_data.json'), 'utf8'));

const OUT = process.argv[2] || path.join(__dirname, 'SYNC_User_Guide.pdf');
const DATE = process.argv[3] || '29 July 2026';

// section id -> component name
const webComp = {}; nav.web_routes.forEach(r => { webComp[r.section] = r.component; });
const mobComp = {}; nav.mobile_routes.forEach(r => { mobComp[r.section] = r.component; });



// ─────────────────────────────────────────────────────────────────────────────
const doc = new Doc({
  title: 'SYNC User Guide',
  subtitle: 'How to use it, screen by screen',
  blurb: 'A step-by-step tutorial for everyone who works in SYNC. Every screen in turn: '
       + 'how to open it, what to do on it, what each button does, how to filter the list, '
       + 'and every form it asks you to fill in.',
  facts: [
    ['Start here', 'Part 1 — signing in and where you land'],
    ['On a computer', 'Part 6 — every screen, one at a time'],
    ['On a phone', 'Part 7 — the same work with a thumb'],
    ['Taking applications', 'Part 4 — the form the public fills in'],
    ['Stuck on a control?', 'Part 5 — the buttons that appear on every screen'],
    ['Version', DATE],
  ],
  footNote: 'Each screen entry tells you what you need to be to open it. If a screen in this '
          + 'guide is not in your menu, your role does not have it — ask an administrator.',
  runningHeader: 'SYNC User Guide',
  runningFooter: 'How to use it, screen by screen',
});

doc.cover();

/* ── Part 3 — Sign in ───────────────────────────────────────────────────── */
doc.h1('1. Getting started');
doc.h2('1.1 Signing in');
doc.steps([
  'Open the site on a computer, or the app on your phone.',
  'Enter your e-mail address and password, and sign in.',
  'You land on your own home screen. The menu shows only the screens your job needs, so it will '
  + 'be shorter than the full list in this guide.',
]);
doc.h3('Where you start');
doc.table(['If you are', 'You land on'], [
  ['An administrator', 'Dashboard, with the day\'s figures'],
  ['An agent', 'Your own dashboard, showing your earnings and your referrals'],
  ['A technician', 'Job Order, already narrowed to the work assigned to you'],
  ['Outside-plant staff', 'Work Order, already narrowed to the work assigned to you'],
  ['Inventory staff', 'Inventory'],
  ['A head technician', 'Application'],
  ['A customer', 'Your own dashboard, showing what you owe'],
], { widths: [150, 317] });

doc.h2('1.2 Being signed out');
doc.p('You will not stay signed in for ever. What happens depends on where you are working.');
doc.table(['', 'On a computer', 'On a phone'], [
  ['You leave it idle', 'Nothing happens straight away.',
   'A warning appears after an hour and a half. Touch the screen and it goes away.'],
  ['You keep ignoring it', 'Eventually you are returned to the sign-in screen.',
   'You are signed out after two hours of doing nothing.'],
  ['You come back later', 'You may have to sign in again.',
   'Time away counts even with the app closed. Away too long, and you will be signed out.'],
], { widths: [96, 176, 195] });
doc.callout('Technicians: the evening reminder', 'If you are still timed in at 9:00 PM the app '
  + 'reminds you, and again at ten past. Time out, so your hours are recorded properly.');
doc.callout('Sharing a computer or a phone', 'Signing out clears everything you were looking at, so '
  + 'the next person cannot see your records. Always sign out on a shared device.');

/* ── Part 4 — Web navigation ────────────────────────────────────────────── */
doc.h1('2. Finding your way around');
doc.h2('2.1 The frame');
doc.p('Every screen sits in the same frame: a header strip across the top, a navigation sidebar '
    + 'down the left, and the screen itself filling the rest.');
doc.h3('Header controls');
doc.table(['Control', 'What it does'], [
  ['Hamburger (far left)', 'On a desktop, collapses the sidebar to an icon-only strip; hover an '
   + 'icon for its name. On a phone, slides the sidebar in and out.'],
  ['Sun / moon', 'Switches between light and dark themes. The choice is saved to your account, so '
   + 'it follows you to another browser.'],
  ['Bell', 'Recent activity — new applications and completed job orders — newest first. "Clear '
   + 'All" empties the list for you only. Desktop notifications appear if you allow them.'],
], { widths: [110, 357] });
doc.callout('Customers see a different header', 'Customer accounts get a simplified header with '
  + 'Dashboard, Bills and Support links and no sidebar at all.');

doc.h2('2.2 Sidebar map');
doc.p('The table below is the complete sidebar. Grouped entries expand when clicked; a group is '
    + 'hidden entirely when a role can see none of its children.');
{
  const rows = [];
  for (const item of nav.web_sidebar) {
    const roles = item.roles.length ? item.roles.join(', ') : 'all';
    if (item.children.length) {
      rows.push([{ content: item.label, styles: { fontStyle: 'bold' } },
                 `opens a group of ${item.children.length}`, friendlyRoles(roles)]);
      for (const c of item.children) {
        rows.push(['      ' + c.label, '', friendlyRoles(c.roles.join(', ') || 'all')]);
      }
    } else {
      rows.push([{ content: item.label, styles: { fontStyle: 'bold' } }, '', friendlyRoles(roles)]);
    }
  }
  doc.table(['In the menu', '', 'You see it if you are'], rows,
            { widths: [176, 104, 187], fontSize: 7.9 });
}

/* ── Part 5 — Mobile navigation ─────────────────────────────────────────── */
doc.h1('3. Using it on a phone');
doc.h2('3.1 The bottom bar');
doc.p('The mobile app has no top navigation. A floating rounded bar sits at the bottom of every '
    + 'screen and holds up to three destinations plus a "More" tab. Which destinations appear '
    + 'depends on your role; the active one is marked with a coloured pill that slides as you '
    + 'move between tabs.');
doc.bullets([
  ['Up to three tabs — ', 'the first destinations your role can reach.'],
  ['More — ', 'expands a panel showing every destination, grouped under headings, three per row. '
    + 'Tapping the dimmed background closes it.'],
  ['Menu — ', 'your profile, notifications, About App and Release Notes; administrators also get '
    + 'the full configuration list here.'],
]);

doc.h2('3.2 Destinations by group');
{
  const rows = [];
  for (const g of nav.mobile_sidebar) {
    rows.push([{ content: g.title, styles: { fontStyle: 'bold' } }, '']);
    for (const it of g.items) {
      rows.push(['      ' + it.label, friendlyRoles(it.roles.join(', ') || 'all')]);
    }
  }
  doc.table(['Where you can go', 'You see it if you are'], rows,
            { widths: [220, 247], fontSize: 7.9 });
}

doc.h2('3.3 The Menu tab');
doc.p('Every role sees Notifications, About App and Release Notes. Technicians additionally get '
    + 'Time In/Out. Administrators get the whole configuration tree, grouped as below.');
{
  const rows = nav.mobile_menu.map(g => [g.title, g.items.map(i => i.label).join(', ')]);
  doc.table(['Group', 'Entries'], rows, { widths: [88, 379], fontSize: 8 });
}

/* ── Part 6 — Public application site ───────────────────────────────────── */
doc.h1('4. The public application form');
doc.p('This is the sign-up form the public fills in to apply for a connection. Nobody needs an '
    + 'account to use it. A submission arrives in your Application queue straight away, ready to '
    + 'be worked exactly like one you keyed in yourself.');
doc.table(['Page', 'What it is for', 'Who can use it'], [
  ['The form', 'Applying for a connection', 'Anyone, with no sign-in'],
  ['Sign in', 'Staff getting to the dashboard', 'Anyone can try; you need an account to get in'],
  ['Dashboard', 'Seeing what came in, and restyling the form', 'Staff who have signed in'],
], { widths: [76, 200, 191] });

doc.h2('4.1 The application form');
doc.p('The form has two layouts and the office chooses which the public sees: a single long page, '
    + 'or a three-step wizard. The wizard shows a numbered progress strip along the top, and a '
    + 'step turns coloured as you complete it.');
doc.table(['Step', 'Heading', 'What is asked'], [
  ['1', 'Contact Info', 'E-mail, mobile number, first name, last name; optional middle initial '
   + 'and second mobile number.'],
  ['2', 'Installation Address', 'Region, city or municipality, barangay, the address itself, a '
   + 'landmark, and optionally a pin on the map.'],
  ['3', 'Plan & Documents', 'Plan, referrer, promo code, the supporting documents, and the '
   + 'privacy agreement.'],
], { widths: [30, 118, 319] });

doc.h3('What must be filled in');
doc.p('Each step is checked before it will let you move on. Anything missing or malformed is '
    + 'listed by name in a dialog, so the applicant is told exactly what to go back and fix.');
doc.table(['Step', 'Required', 'Rule'], [
  ['1', 'E-mail', 'Must contain an @ and a domain.'],
  ['1', 'Mobile', 'Must be 09 followed by nine digits.'],
  ['1', 'First name, last name', 'Must not be blank.'],
  ['2', 'Region, city, barangay', 'Chosen from the searchable lists, each narrowing the next.'],
  ['2', 'Installation address, landmark', 'Must not be blank.'],
  ['3', 'Plan', 'Chosen from the list of published plans.'],
  ['3', 'Primary government ID', 'Required whenever the office has that upload switched on.'],
  ['3', 'Privacy agreement', 'Must be ticked.'],
  ['3', 'Promo proof', 'Required only if a promo code was entered.'],
], { widths: [30, 152, 285] });

doc.h3('Picking the location on the map');
doc.steps([
  'Open the map. It opens centred on the service area with the covered radius drawn around it.',
  'Either drag the pin, or press Get My Location to use the device position.',
  'Press Confirm Location. The point is measured against the service area; if it falls outside, '
  + 'a notice appears and the point is refused, so an applicant cannot pin an address the network '
  + 'does not reach.',
  'Inside the area, the coordinates are written to the form and the map closes.',
]);

doc.h3('Attaching documents');
doc.p('Each slot has an Upload File button. On a phone it opens the rear camera directly, so the '
    + 'applicant can photograph a document there and then instead of hunting for a saved copy. An '
    + 'attached file shows a preview with a cross in the corner to remove it and start again. '
    + 'Which slots appear at all is decided by the office — see 6.3.');
doc.table(['Slot', 'Normally required'], [
  ['Primary government ID', 'Yes, when switched on'],
  ['Secondary government ID', 'No'],
  ['Proof of billing', 'No'],
  ['House front photograph', 'No'],
  ['Promo proof', 'Only when a promo code is entered'],
], { widths: [200, 267] });

doc.h3('Submitting');
doc.steps([
  'On the last step, press Submit. While it is working the button reads Submitting.',
  'If the anti-spam check is switched on, a small addition sum must be answered first. A wrong '
  + 'answer highlights the box and blocks the submission; Generate new question swaps the sum.',
  'On success a confirmation dialog appears and the application is queued for the office. The '
  + 'wording of that dialog is set by the office.',
]);
doc.callout('Terms and privacy', 'The terms and conditions and the privacy policy open in their '
  + 'own dialog from links on the form. Both texts are editable by the office, so they can be '
  + 'kept current without a code change.');

doc.h2('4.2 Staff sign-in');
doc.p('Sign in with a username and password. The button reads Logging in while it works, and a '
    + 'failed attempt shows a message rather than clearing the form. A successful sign-in stores a '
    + 'token and opens the dashboard; opening the dashboard without one sends you back here.');

doc.h2('4.3 Submissions dashboard and form designer');
doc.p('The dashboard has two jobs: showing what has come in, and letting the office restyle and '
    + 'reconfigure the public form without touching code.');
doc.h3('What it shows');
doc.bullets([
  ['Counters — ', 'total applications, and how many are pending, approved and rejected.'],
  ['Recent applications — ', 'the latest submissions, newest first.'],
  ['Brand name and logo — ', 'as they appear to the public.'],
  ['Logout — ', 'top right, with a confirmation.'],
]);
doc.h3('Editing the form');
doc.p('Edit puts the form into design mode; Cancel leaves without keeping the changes, and you '
    + 'are warned if there are unsaved ones. In design mode you can set:');
doc.table(['Setting', 'Effect'], [
  ['Layout', 'Single-page form, or the three-step wizard.'],
  ['Brand name and logo', 'The name and mark shown at the top of the public form.'],
  ['Background colour', 'The page behind the form.'],
  ['Form colour and opacity', 'The form panel itself, and how far the background shows through.'],
  ['Button colour', 'Every button, the progress strip and the map pin.'],
  ['Document slots', 'Whether proof of billing, primary ID, secondary ID and the house front '
   + 'photograph are asked for at all.'],
  ['Second mobile number', 'Whether the optional second number is offered.'],
  ['Anti-spam check', 'Whether the addition sum is required before submitting.'],
  ['Terms and conditions', 'The text behind the terms link.'],
  ['Privacy policy', 'The text behind the privacy link.'],
  ['Contact information', 'The contact block shown to applicants.'],
  ['Confirmation wording', 'The message in the dialog after a successful submission.'],
], { widths: [130, 337] });
doc.callout('Turning a slot off removes the requirement', 'The primary ID is only enforced while '
  + 'its slot is switched on. Switching a slot off removes both the upload and the check on it, so '
  + 'the form stays consistent with what is being asked for.');

/* ── Part 7 — Shared controls ───────────────────────────────────────────── */
doc.h1('5. Controls you will use on every screen');
doc.p('Most list screens in the web portal are built from the same parts. Learn them once and '
    + 'every list behaves predictably.');

doc.h2('5.1 Search');
doc.p('The search box scans every visible value in the row, not just one column. Spaces are '
    + 'ignored and case does not matter, so "juan dela cruz" matches "JuanDelaCruz". Searching '
    + 'also lifts the "hide finished work after a day" rule, so a technician can find an older '
    + 'completed job by name.');

doc.h2('5.2 The funnel filter');
doc.p('The funnel icon opens a panel listing every field you can filter on, sorted '
    + 'alphabetically, with the active ones marked. Pick a field and the panel shows the right '
    + 'kind of input for it. Filters combine with AND — a row must satisfy every active filter — '
    + 'and they stack on top of the search box and the status tiles.');
doc.table(['Field type', 'Input you get', 'How it matches'], [
  ['Text', 'A single text box', 'Case-insensitive "contains". Partial words match.'],
  ['Checklist', 'Tick boxes, built from the values actually in your data (plans, barangays, '
   + 'cities, regions, statuses, LCP, NAP, ports, VLANs)',
   'Exact match against any ticked value. Nothing ticked means the filter is off.'],
  ['Number', 'From and To boxes', 'Inclusive range. Either end can be left blank.'],
  ['Date', 'From and To date pickers', 'Inclusive range of whole days.'],
  ['Date and time', 'From and To date-and-time pickers', 'Inclusive range down to the minute.'],
], { widths: [72, 178, 217] });
doc.callout('Clearing filters', 'Emptying a field removes that filter rather than matching blank '
  + 'values. The funnel icon turns coloured while any filter is active, and an "All records" '
  + 'button resets the status tiles.');

doc.h2('5.3 Status tiles');
doc.p('Above or beside a list, tiles count the records in each status and act as one-click '
    + 'filters. The counts reflect what your search and filters have already narrowed down, not '
    + 'the whole table.');

doc.h2('5.4 Card view and table view');
doc.p('Lists offer both a card view and a table view. Table view adds column controls:');
doc.bullets([
  ['Column visibility — ', 'tick which columns to show; your choice is remembered per screen.'],
  ['Reorder — ', 'drag a column heading to move it.'],
  ['Resize — ', 'drag the divider between two headings.'],
  ['Sort — ', 'click a heading to sort; click again to reverse.'],
]);
doc.callout('Agents', 'Agents get a fixed column set on Job Order and no column-settings control, '
  + 'so the columns cannot be changed.');

doc.h2('5.5 Detail panels');
doc.p('Clicking a row opens its detail panel. Chevrons at the top step to the previous or next '
    + 'record in the filtered list without going back. A gear icon lets most roles choose which '
    + 'fields to show and in what order. Related records — applications, job orders, invoices, '
    + 'transactions — are listed at the bottom and can be opened from there.');

doc.h2('5.6 Export');
doc.p('The download icon exports what you are currently looking at — the filtered, searched set '
    + 'with your visible columns, not the whole table. Lists export to CSV; reports and payout '
    + 'histories export to PDF. Export is disabled while a list is empty or loading.');

doc.h2('5.7 Paging');
doc.p('Lists page in fixed sizes with first, previous, next and last controls, and a "showing X '
    + 'to Y of Z" readout. Changing a filter or the page size returns you to page 1.');

/* ── Part 10 — Portal screens, step by step ────────────────────────────── */
doc.h1('6. Every screen, step by step');
doc.p('This is the main part of the guide. It takes every screen in the menu, in menu order, and '
    + 'shows you how to work it: what the screen is for, how to open it, what to do on it in order, '
    + 'what each button does, what you can filter the list on, and every form it asks you to fill '
    + 'in — field by field, including which fields you cannot leave blank.');
doc.callout('If a screen here is not in your menu', 'Each entry says what you need to be to open '
  + 'it. Screens you have no need for are simply not shown to you, so do not worry if your menu is '
  + 'shorter than this list. Skip to the ones you recognise.');

let webIdx = 0;
for (const item of nav.web_sidebar) {
  webIdx += 1;
  const kids = item.children.length ? item.children : [item];
  const groupNo = `6.${webIdx}`;

  if (item.children.length) {
    doc.h2(`${groupNo} ${item.label}`);
    doc.small(`A group in the sidebar, visible to ${item.roles.join(', ') || 'all roles'}. `
            + `It expands to ${item.children.length} screens, covered below. The group is hidden `
            + `entirely from a role that can open none of them.`);
  } else {
    doc.h2(`${groupNo} ${item.label}`);
  }

  let kidNo = 0;
  for (const k of kids) {
    kidNo += 1;
    const numbered = item.children.length ? `${groupNo}.${kidNo}` : null;
    const menuPath = item.children.length
      ? `${item.label} > ${k.label}`
      : `${k.label} in the sidebar`;
    renderScreen(doc, ext, 'web', {
      id: k.id,
      label: k.label,
      roles: k.roles.join(', ') || 'all',
      component: webComp[k.id] || '',
      path: menuPath,
      numbered,
      dlg: dlg.web,
    });
  }
}

/* ── Part 11 — Mobile screens, step by step ────────────────────────────── */
doc.h1('7. Every screen on the phone, step by step');
doc.p('The same work, done on a phone. Where a screen appears in both places you are looking at '
    + 'exactly the same records — anything you change on the phone is there on the computer '
    + 'straight away, and the other way round. What differs is the handling, so these entries '
    + 'concentrate on that: what the bottom bar shows you, and how the list and the detail view '
    + 'take turns on a small screen.');

let mobIdx = 0;
for (const g of nav.mobile_sidebar) {
  mobIdx += 1;
  doc.h2(`7.${mobIdx} ${g.title}`);
  let n = 0;
  for (const it of g.items) {
    n += 1;
    renderScreen(doc, ext, 'mobile', {
      id: it.id,
      label: it.label,
      roles: it.roles.join(', ') || 'all',
      component: mobComp[it.id] || '',
      path: `the ${it.label} tab, or More then ${it.label}`,
      numbered: `7.${mobIdx}.${n}`,
      dlg: dlg.mobile,
    });
  }
}

doc.h2(`7.${mobIdx + 1} Screens you reach from Menu`);
doc.p('These are reached from Menu rather than the bottom bar. Notifications, About App and '
    + 'Release Notes are available to every role; the rest appear for administrators.');
{
  const rows = [];
  for (const g of nav.mobile_menu) {
    rows.push([{ content: g.title, styles: { fontStyle: 'bold' } }, '']);
    for (const it of g.items) {
      const e = ext.mobile.pages[mobComp[it.id] || ''];
      rows.push(['      ' + it.label,
                 (PURPOSE[it.id] || 'Configuration maintained from the Menu tab.')
                   + (e && e.caps.includes('search') ? ' Has a search box.' : '')]);
    }
  }
  doc.table(['Entry', 'What it is for'], rows, { widths: [120, 347], fontSize: 7.4 });
}

/* ── Part 12 — Statuses ─────────────────────────────────────────────────── */
doc.h1('8. Status words you will see');
doc.h2('8.1 Application status');
doc.table(['Value', 'Meaning'], [
  ['Pending', 'Received, not yet assessed.'],
  ['Scheduled', 'A survey or installation visit has been booked.'],
  ['Confirmed', 'Assessed and accepted.'],
  ['In Progress', 'Being worked on.'],
  ['No Facility', 'No infrastructure serves the address.'],
  ['No Slot', 'Infrastructure exists but the nearest NAP is full.'],
  ['Duplicate', 'The same enquiry already exists.'],
  ['Cancelled', 'Withdrawn or abandoned.'],
  ['Completed', 'Carried through to an installation.'],
], { widths: [92, 375] });

doc.h2('8.2 Job order visit status');
doc.table(['Value', 'Meaning', 'Visible to agents'], [
  ['In Progress', 'Scheduled or under way.', 'Yes'],
  ['Reschedule', 'Visited but needs another visit.', 'Yes'],
  ['Done', 'Installed. Counts as an onboarded referral and earns commission.',
   'No — moves to History'],
  ['Failed', 'Could not be installed.', 'No'],
], { widths: [72, 275, 120] });

doc.h2('8.3 Billing and commission status');
doc.table(['Where', 'Values'], [
  ['Job order billing status', 'In Progress, Done — plus Approved and Failed set by the approval step'],
  ['Commission status on a job order', 'Unpaid, shown to agents as "Not Collected"; Paid, shown '
   + 'as "Collected"'],
  ['Payout record type', 'commission, incentives, incentives_payout, bonus, Bonus_payout, achievement'],
], { widths: [150, 317] });

doc.buildToc();
doc.chrome();
const res = doc.save(OUT);
console.log(`pages=${res.pages}`);
console.log(`out=${OUT}`);

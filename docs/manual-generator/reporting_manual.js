/*
 * Builds the SYNC Reporting Module User Manual PDF.
 *
 * Written for the administrators who use the Reporting Module, not for developers.
 * It documents only what the shipped screens actually offer, and contains no
 * internal names of any kind. Keep it that way when you edit it.
 *
 * Facts this manual is built on (verified against the shipped screens):
 *   - Reports is available to Administrator and Super Administrator only.
 *     Deleting a report is restricted further, to Super Administrator.
 *   - The module schedules recurring reports. It does not collect a report typed
 *     in by a user: you define a report once and the system builds and emails it.
 *   - The screens offer: list, search, filter, choose columns, Auto Send master
 *     switch, refresh, add, download and (Super Administrator) delete.
 *   - There is NO edit, send-now, preview or regenerate control in either app.
 *     Do not document one.
 *   - Web offers 8 report types and 5 schedules; the mobile app offers 7 types
 *     and 4 schedules, and asks for Day on every schedule. Both are documented.
 *
 *   node reporting_manual.js [output.pdf] [date] [version] [preparedBy] [organization]
 */
const path = require('path');
const { Doc } = require('./render.js');

const OUT = process.argv[2] || path.join(__dirname, '..', '..', 'SYNC_Reporting_Module_User_Manual.pdf');
const DATE = process.argv[3] || '8 August 2026';
const VERSION = process.argv[4] || '1.0';
const PREPARED_BY = process.argv[5] || 'SYNC Documentation Team';
const ORGANIZATION = process.argv[6] || 'SYNC';

const doc = new Doc({
  eyebrow: 'SYNC',
  title: 'Reporting Module User Manual',
  subtitle: 'Reporting Operations and User Guide',
  blurb:
    'This manual explains the Reporting Module of the SYNC System: what it is for, what every '
    + 'screen shows, what each button and field does, and how to set up and manage scheduled '
    + 'reports step by step. It covers both the SYNC Web Application and the SYNC Mobile '
    + 'Application, and notes where the two differ.',
  facts: [
    ['Document Title', 'SYNC Reporting Module User Manual'],
    ['Subtitle', 'Reporting Operations and User Guide'],
    ['Version', VERSION],
    ['Document Date', DATE],
    ['Prepared By', PREPARED_BY],
    ['Organization', ORGANIZATION],
    ['Intended Audience', 'Administrators and Super Administrators'],
    ['Applies To', 'SYNC Web Application and SYNC Mobile Application'],
  ],
  footNote:
    'The Reporting Module is available to Administrator and Super Administrator accounts. If '
    + 'Reports does not appear in your menu, your account does not have access — contact your '
    + 'system administrator.',
  runningHeader: 'SYNC Reporting Module User Manual',
  runningFooter: 'Reporting Operations and User Guide',
});

doc.cover();

/* ─────────────────────────────────────────────────────────────────────────────
   1. INTRODUCTION
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('1. Introduction');

doc.h2('1.1 What the Reporting Module Is');
doc.p(
  'The Reporting Module is where recurring business reports are set up and managed. You define '
  + 'a report once — what it should cover, how often it should run, which period it should '
  + 'report on and who should receive it — and the SYNC System then builds that report and '
  + 'emails it to those recipients automatically, on the schedule you chose.'
);
doc.callout('Important — how this module works',
  'This is not a form on which you type up a report. You are not asked to enter figures or write '
  + 'a narrative. You create a report definition, and the system gathers the data, produces the '
  + 'document and sends it. Everything in this manual follows from that: "creating a report" '
  + 'means setting up a schedule, and "submitting" means saving that schedule.');

doc.h2('1.2 Purpose of the Reporting Module');
doc.bullets([
  ['Deliver information without being asked. ', 'Recipients receive the report on time, every time, with no one having to remember to produce it.'],
  ['Keep reporting consistent. ', 'Every occurrence uses the same definition, so figures are prepared the same way each period.'],
  ['Cover each period exactly once. ', 'Consecutive sends move forward through time without repeating or missing days.'],
  ['Keep a record. ', 'Each report shows when it was last sent, who created it and when.'],
  ['Stay in control. ', 'A single master switch pauses all automatic sending when needed.'],
]);

doc.h2('1.3 Who Uses the Reporting Module');
doc.table(['Role', 'What they can do'], [
  ['Administrator',
   'Open the Reporting Module, review every scheduled report, search and filter the list, create '
   + 'new scheduled reports, download a report document, and turn automatic sending on or off.'],
  ['Super Administrator',
   'Everything an Administrator can do, and in addition delete a scheduled report.'],
  ['All other roles',
   'No access. Reports does not appear in their menu.'],
], { widths: [26, 74] });

doc.h2('1.4 What Can Be Reported');
doc.p('A report covers one subject area, chosen when the report is created.');
doc.table(['Report Type', 'What it covers', 'Web', 'Mobile'], [
  ['Manual Transaction', 'Transactions recorded by staff.', 'Yes', 'Yes'],
  ['Payment Portal', 'Payments taken through the payment portal.', 'Yes', 'Yes'],
  ['Combined Transactions',
   'Manual transactions and payment-portal payments in one listing, with a Source column plus '
   + 'separate and combined totals.', 'Yes', 'No'],
  ['Inventory', 'Inventory records.', 'Yes', 'Yes'],
  ['Job Order', 'Job orders.', 'Yes', 'Yes'],
  ['Service Order', 'Service orders.', 'Yes', 'Yes'],
  ['Work Order', 'Work orders.', 'Yes', 'Yes'],
  ['Summary', 'A consolidated summary across billing, orders, inventory and subscribers.', 'Yes', 'Yes'],
], { widths: [24, 52, 12, 12] });
doc.small('Combined Transactions can only be chosen in the Web Application. A report of that type created on the web still runs and is delivered normally.');

doc.h2('1.5 Why Reporting Matters');
doc.bullets([
  'Recipients get the same information at the same time each period, without chasing anyone for it.',
  'Because each period is covered exactly once, figures can be compared between periods with confidence.',
  'Every document is dated and carries its reporting period, so there is no doubt what it covers.',
  'A report that fails to send is recorded rather than lost, and its period is retried.',
]);

doc.h2('1.6 How Reporting Fits Into the Overall Workflow');
doc.steps([
  'Day-to-day work is recorded elsewhere in the SYNC System — transactions, job orders, inventory movements and so on.',
  'An administrator creates a scheduled report describing what should be reported, how often, for what period and to whom.',
  'At the scheduled time the system builds the document from the data recorded up to that point.',
  'The document is emailed to every recipient on the report, each with their own copy attached.',
  'The report entry records when it was last sent, and the document can be downloaded from the list.',
  'The next occurrence covers the next period, continuing from where the last one finished.',
]);

/* ─────────────────────────────────────────────────────────────────────────────
   2. ACCESSING
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('2. Accessing the Reporting Module');

doc.h2('2.1 Signing In');
doc.steps([
  'Open the SYNC Web Application in a browser, or open the SYNC Mobile Application.',
  'Enter your account number, username or email address in the first field.',
  'Enter your password.',
  'Select SECURE LOGIN and wait while it reads LOGGING IN.',
]);
doc.p('You are taken to your dashboard. The menu shows only the sections your role is permitted to open.');

doc.h2('2.2 Opening the Reporting Module');
doc.table(['Application', 'How to open Reports'], [
  ['SYNC Web Application', 'Select Reports in the navigation menu down the left of the window.'],
  ['SYNC Mobile Application', 'Select Menu, then Reports under Operations.'],
]);
doc.callout('If Reports is not in your menu',
  'The Reporting Module is limited to Administrator and Super Administrator accounts. If you '
  + 'cannot see it, your account does not have access. Contact your system administrator rather '
  + 'than trying another route in.');

doc.h2('2.3 What You See When the Module Opens');
doc.p(
  'The module opens on the list of scheduled reports already set up. Each entry is one report '
  + 'definition, not one sent document. If nothing has been set up yet the list is empty and '
  + 'invites you to add the first one.'
);
doc.table(['Area', 'What it shows'], [
  ['Toolbar', 'The controls for adding, searching, filtering, choosing columns, switching automatic sending and refreshing.'],
  ['Warning banner', 'Shown only when automatic sending is switched off, to explain why nothing is being emailed.'],
  ['Report list', 'One row (or card, on a phone) per scheduled report.'],
  ['Row actions', 'Download, and Delete for Super Administrators.'],
  ['Pagination', 'Controls for moving through a long list.'],
]);

doc.h2('2.4 Navigation Within the Module');
doc.p(
  'The Reporting Module is a single screen. Everything is reached from that screen: the Add '
  + 'Report panel opens over it, the filter panel opens beside it, and both return you to the '
  + 'list when closed. There are no sub-pages to get lost in.'
);

/* ─────────────────────────────────────────────────────────────────────────────
   3. DASHBOARD
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('3. The Reporting Screen');

doc.h2('3.1 The Report List');
doc.p('Each entry describes one scheduled report. These are the columns available in the Web Application.');
doc.table(['Column', 'What it shows'], [
  ['ID', 'The reference number of the scheduled report.'],
  ['Report Name', 'The name given when the report was created.'],
  ['Report Type', 'The subject area the report covers.'],
  ['Schedule', 'How often the report runs.'],
  ['Time', 'The time of day the report is sent.'],
  ['Day', 'The day of the month it runs on, where the schedule uses one.'],
  ['Weekday', 'The weekday it runs on, where the schedule uses one.'],
  ['Month', 'The month it runs in, where the schedule uses one.'],
  ['Send To', 'The recipients who receive the report.'],
  ['Date Range', 'The reporting period configured when the report was created.'],
  ['Last Sent', 'When the report was last sent. Empty means it has not been sent yet.'],
  ['Created By', 'Who set the report up.'],
  ['Created At', 'When it was set up.'],
]);
doc.small('Not every column is shown by default. Use Toggle Columns to change which appear. On a phone each report is shown as a card carrying the key details instead of a wide table.');

doc.h2('3.2 Toolbar Controls');

doc.h3('Add');
doc.sub('Purpose');
doc.p('Opens the Add Report panel, where a new scheduled report is set up.');
doc.sub('How to Use');
doc.steps([
  'Open the Reporting Module.',
  'Select Add in the toolbar.',
  'Complete the panel as described in Chapter 4.',
]);
doc.sub('Expected Result');
doc.p('The Add Report panel opens over the list. Nothing is created until you save.');

doc.h3('Search');
doc.sub('Purpose');
doc.p('Narrows the list to reports matching what you type.');
doc.sub('How to Use');
doc.steps([
  'Select the search field, marked Search reports.',
  'Begin typing part of a report name or another detail.',
  'The list narrows as you type. There is no separate search button.',
  'Clear the field to restore the full list.',
]);
doc.sub('Expected Result');
doc.p('Only matching reports remain listed. No report is changed by searching.');

doc.h3('Filters');
doc.sub('Purpose');
doc.p('Opens a panel offering a filter for every column, so the list can be narrowed precisely.');
doc.sub('How to Use');
doc.steps([
  'Select Filters in the toolbar.',
  'Enter a value, or tick the entries you want, against the columns you wish to narrow by.',
  'Apply the filters and close the panel.',
]);
doc.sub('Expected Result');
doc.p(
  'The list narrows to matching reports and the Filters control shows how many filters are '
  + 'active, so an old filter cannot be left applied unnoticed. Hovering the control lists them.'
);

doc.h3('Toggle Columns');
doc.sub('Purpose');
doc.p('Chooses which columns appear in the list.');
doc.sub('How to Use');
doc.steps([
  'Select Toggle Columns in the toolbar.',
  'Tick the columns you want shown and untick those you do not.',
  'Select All to show every column, or Reset to return to the standard selection.',
  'Close the panel.',
]);
doc.sub('Expected Result');
doc.p('The list redraws with your chosen columns.');

doc.h3('Auto Send');
doc.sub('Purpose');
doc.p(
  'The master switch for the whole module. It shows Auto Send: On or Auto Send: Off, and '
  + 'controls whether any scheduled report is emailed at all.'
);
doc.sub('How to Use');
doc.steps([
  'Locate the Auto Send control in the toolbar and read its current state.',
  'Select it to switch automatic sending on or off.',
  'Read the confirmation message that appears.',
]);
doc.sub('Expected Result');
doc.p(
  'A message confirms Auto Send Enabled or Auto Send Disabled. When it is off, a warning banner '
  + 'appears above the list reading "Automatic sending is off. The schedules below are saved but '
  + 'no reports are being emailed. Turn Auto Send back on to resume."'
);
doc.callout('What switching it off does, and does not do',
  'Switching Auto Send off pauses delivery for every scheduled report at once. It does not delete '
  + 'or change any report, and it does not alter any schedule. When you switch it back on, '
  + 'sending resumes from that point — occurrences that fell while it was off are not sent '
  + 'retrospectively. Use it during maintenance or data corrections, and remember to switch it '
  + 'back on.');

doc.h3('Refresh');
doc.sub('Purpose');
doc.p('Reloads the list from the system.');
doc.sub('How to Use');
doc.steps([
  'Select Refresh in the toolbar.',
  'Wait for the control to stop spinning.',
]);
doc.sub('Expected Result');
doc.p('The list is reloaded, showing any newly created report and any updated Last Sent time.');
doc.small('In the Mobile Application you can also pull the list downwards to refresh it.');

doc.h2('3.3 Row Controls');

doc.h3('Download');
doc.sub('Purpose');
doc.p('Opens or downloads the report document most recently produced for that scheduled report.');
doc.sub('How to Use');
doc.steps([
  'Locate the report in the list.',
  'Select Download on that row or card.',
]);
doc.sub('Expected Result');
doc.p(
  'The report document opens or is saved, depending on your browser or device. If a report has '
  + 'never been sent there may be no document to download yet — check the Last Sent column first.'
);

doc.h3('Delete');
doc.sub('Purpose');
doc.p('Removes a scheduled report permanently, so it stops running.');
doc.sub('How to Use');
doc.steps([
  'Locate the report in the list.',
  'Select Delete on that row.',
  'Read the confirmation message and confirm the deletion.',
]);
doc.sub('Expected Result');
doc.p(
  'A message confirms the report has been deleted and it disappears from the list. It will not '
  + 'run again. Documents already emailed to recipients are unaffected.'
);
doc.callout('Restricted control',
  'Delete is available to Super Administrators only. Administrators see a Download column '
  + 'instead of an Actions column, and no Delete control. Deletion cannot be undone — if you '
  + 'only need to pause delivery, use the Auto Send switch instead.');

/* ─────────────────────────────────────────────────────────────────────────────
   4. CREATING A REPORT
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('4. Creating a Report');
doc.p(
  'Creating a report means setting up a schedule. This chapter describes the Web Application; '
  + 'Chapter 13 covers the differences on a phone.'
);

doc.h2('4.1 Procedure');
doc.steps([
  'Open the Reporting Module and select Add. The Add Report panel opens, headed "Add Report — Configure a new scheduled report".',
  'Enter a Report Name that will identify this report in the list.',
  'Choose the Report Type — the subject area the report should cover.',
  'Choose the Report Schedule — how often it should run.',
  'Complete whichever extra fields that schedule asks for. Only the relevant ones are shown.',
  'Set the Report Time — the time of day it should be sent.',
  'Set the reporting period using a quick range, or by entering the From and To dates.',
  'Enter the recipients in Send To.',
  'Check the Preview panel at the foot of the form, which summarises everything you have entered.',
  'Select Save.',
]);

doc.h2('4.2 Field Reference');
doc.table(['Field', 'Required', 'What to enter', 'Notes'], [
  ['Report Name', 'Yes',
   'A clear name, for example "Monthly Service Order Summary".',
   'At least 3 characters and no more than 255. This is how you will find the report later.'],
  ['Report Type', 'Yes',
   'The subject area the report should cover.',
   'See the table in Chapter 1.4. It cannot be changed afterwards.'],
  ['Report Schedule', 'Yes',
   'How often the report should run.',
   'Determines which further fields are asked for.'],
  ['Weekday', 'Only for Every Week',
   'The weekday the report should run on.',
   'Not shown for any other schedule.'],
  ['Month', 'Only for Every 3 Months and Every Year',
   'The month the report should run in.',
   'For a quarterly report this is the starting month.'],
  ['Day', 'Only for Every Month, Every 3 Months and Every Year',
   'The day of the month, from 1 to 31.',
   'Must be a whole number. Where a month is also chosen, the day cannot exceed the length of that month.'],
  ['Report Time', 'Yes',
   'The time of day the report should be sent.',
   'Interpreted in the reporting time zone, GMT+8.'],
  ['From', 'Yes', 'The first day of the reporting period.', 'See Chapter 5.'],
  ['To', 'Yes', 'The last day of the reporting period.', 'Cannot be earlier than From.'],
  ['Send To', 'Yes',
   'One or more recipient email addresses, for example "admin@company.com, ops@company.com".',
   'Separate several with commas. At least one valid address is required.'],
], { widths: [15, 20, 33, 32] });

doc.h2('4.3 Which Fields Each Schedule Asks For');
doc.table(['Schedule', 'Also asks for', 'When it runs'], [
  ['Every Day', 'Nothing further', 'Once a day, at the time you choose.'],
  ['Every Week', 'Weekday', 'Once a week, on the weekday you choose.'],
  ['Every Month', 'Day', 'Once a month, on the day of the month you choose.'],
  ['Every 3 Months (Quarterly)', 'Month and Day', 'In the starting month you choose, and every third month after it.'],
  ['Every Year', 'Month and Day', 'Once a year, on the month and day you choose.'],
], { widths: [26, 22, 52] });
doc.callout('Days beyond the length of a month',
  'A report set to run on day 31 still runs in shorter months: it runs on the last day instead — '
  + '30 April, and 28 or 29 February. It never runs twice in one month, and it never skips a '
  + 'month. The same applies to day 30 and day 29.');

doc.h2('4.4 The Preview Panel');
doc.p(
  'As you complete the form, a Preview panel at the foot of the panel lists what you have entered '
  + '— the name, type, schedule, day, time, recipients and date range. Read it before saving; it '
  + 'is the quickest way to catch a wrong schedule or a mistyped recipient.'
);

doc.h2('4.5 Saving');
doc.h3('Save');
doc.sub('Purpose');
doc.p('Creates the scheduled report and produces its first document.');
doc.sub('How to Use');
doc.steps([
  'Complete every required field.',
  'Read the Preview panel.',
  'Select Save at the top of the panel.',
  'Wait while the message reads "Saving the report and generating its first PDF". Do not select Save again.',
]);
doc.sub('Expected Result');
doc.p(
  'The report is created, the panel closes and the new report appears in the list. It will then '
  + 'run automatically on the schedule you chose, provided Auto Send is on.'
);
doc.callout('If a required field is missing',
  'The panel does not save. It tells you how many fields need attention and marks each one with '
  + 'the reason — for example "Report name is required.", "Choose which weekday the report should '
  + 'run on." or "The end date cannot be before the start date." Correct them and select Save '
  + 'again; the messages clear as you fix each field.');

doc.h3('Cancel');
doc.sub('Purpose');
doc.p('Closes the Add Report panel without creating anything.');
doc.sub('How to Use');
doc.steps(['Select Cancel at the top of the panel.']);
doc.sub('Expected Result');
doc.p('The panel closes and you return to the list. Everything you had entered is discarded.');

/* ─────────────────────────────────────────────────────────────────────────────
   5. REPORTING PERIOD
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('5. The Reporting Period');

doc.h2('5.1 What the Reporting Period Means');
doc.p(
  'The reporting period is the span of time the report covers — set with the From and To dates. '
  + 'It is separate from the schedule: the schedule decides WHEN the report is sent, the period '
  + 'decides WHAT it covers.'
);
doc.callout('The period sets the length, and the length repeats',
  'The From and To dates you enter are used for the first send. After that, what repeats is the '
  + 'LENGTH of that period, not the same dates. A report first covering 1–7 January covers 8–14 '
  + 'January on its next run, then 15–21 January, and so on. Each send picks up the day after the '
  + 'previous one finished, so consecutive reports neither repeat data nor leave a gap.');

doc.h2('5.2 Setting the Period');
doc.h3('Quick Ranges');
doc.sub('Purpose');
doc.p('Fills in From and To for you, for the most common periods.');
doc.sub('How to Use');
doc.steps([
  'In the Add Report panel, find the quick range buttons above the date fields.',
  'Select the range you want.',
  'Check that the From and To fields have been filled in as you expect.',
]);
doc.sub('Expected Result');
doc.p('The dates are set and the range you chose is highlighted. You can still adjust either date afterwards.');
doc.table(['Quick range (Web)', 'Period it sets'], [
  ['Today', 'The current day only — a one-day period.'],
  ['Last 7 days', 'A seven-day period ending today.'],
  ['Last 30 days', 'A thirty-day period ending today.'],
  ['Last 90 days', 'A ninety-day period ending today.'],
]);
doc.small('The Mobile Application offers the same four period lengths under the names Everyday, Weekly, Monthly and Quarterly.');

doc.h3('From and To');
doc.sub('Purpose');
doc.p('Set the reporting period exactly, when no quick range fits.');
doc.sub('How to Use');
doc.steps([
  'Select the From field and choose the first day of the period.',
  'Select the To field and choose the last day of the period.',
  'Check the Preview panel, which shows the period as "start to end".',
]);
doc.sub('Expected Result');
doc.p('The period is set. Both dates are required, and the end date cannot be earlier than the start date.');

doc.h2('5.3 How the Period Affects the Report');
doc.table(['If you set', 'The first report covers', 'Later reports cover'], [
  ['A one-day period', 'That single day.', 'One day at a time, moving forward.'],
  ['A seven-day period', 'Those seven days.', 'The next seven days, then the next seven, and so on.'],
  ['A one-month period', 'That month.', 'The following month, then the one after.'],
], { widths: [24, 34, 42] });
doc.p(
  'A report never covers dates in the future. If the next period would run past today, it is cut '
  + 'short at today, and the remainder is picked up on a later run. A report whose period has not '
  + 'started yet simply waits until it has.'
);

doc.h2('5.4 A Worked Example');
doc.steps([
  'You create a report on 10 March with the period 1 January to 7 January — a seven-day period — and the schedule Every Day at 08:00.',
  'The first send covers 1 to 7 January.',
  'The next morning it covers 8 to 14 January.',
  'The morning after that, 15 to 21 January. Each send moves on by seven days.',
  'This continues until the period reaches today, at which point each send covers the days since the last one.',
  'From then on the report simply stays current, covering the time elapsed since the previous send.',
]);

doc.h2('5.5 Restrictions');
doc.bullets([
  'Both From and To are required. A report cannot be created without a period.',
  'The end date cannot be earlier than the start date.',
  'The period cannot be changed after the report is created — see Chapter 11.',
  'A report never reports on dates later than today.',
]);

/* ─────────────────────────────────────────────────────────────────────────────
   6. REPORT DATA
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('6. Report Content');

doc.h2('6.1 What Determines the Content');
doc.p(
  'You do not enter the content of a report. It is assembled by the system from the records '
  + 'already held, using three of the settings you chose.'
);
doc.table(['Setting', 'What it determines'], [
  ['Report Type', 'Which subject area is gathered — transactions, orders, inventory, or a consolidated summary.'],
  ['Reporting Period', 'Which records are included: those falling inside the period being reported.'],
  ['Report Name', 'The name the document is identified by.'],
]);

doc.h2('6.2 What the Document Contains');
doc.bullets([
  ['A heading. ', 'The report name, the reporting period and when the document was produced, in the reporting time zone.'],
  ['The figures. ', 'Counts and totals for the subject area, calculated across every record in the period.'],
  ['A detail listing. ', 'The individual records behind those figures, for report types that list records.'],
]);
doc.callout('Very large detail listings',
  'Where a period contains a great many records, the document prints a capped number of detail '
  + 'rows so it stays a usable length. When that happens the document says how many records '
  + 'matched and how many it printed. The counts and totals are always calculated across every '
  + 'record in the period and are never affected by that cap.');

doc.h2('6.3 Who Receives It');
doc.p(
  'The report is emailed to every valid address in Send To. Each recipient receives their own '
  + 'copy of the document attached, so no recipient can miss the attachment because another '
  + 'received it first.'
);
doc.table(['Send To entry', 'What happens'], [
  ['A valid address', 'Receives the report.'],
  ['The same address twice, in any capitalisation', 'Receives one copy only, not two.'],
  ['An entry that is not a valid address', 'Is ignored, and recorded so it can be corrected. The report is still sent to the valid addresses.'],
  ['No valid address at all', 'Nothing is sent, and the attempt is recorded as failed.'],
]);

/* ─────────────────────────────────────────────────────────────────────────────
   7. SUBMITTING
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('7. Saving and Sending');

doc.h2('7.1 What "Submitting" Means Here');
doc.p(
  'There is no separate submission step. Saving the report is what puts it into service: from '
  + 'that moment it runs on its schedule and sends itself. Sending happens automatically at the '
  + 'scheduled time, not when you press a button.'
);

doc.h2('7.2 The Complete Procedure');
doc.steps([
  'Review every field in the Add Report panel.',
  'Verify the reporting period in the From and To fields.',
  'Verify the schedule, and the weekday, month or day it asks for.',
  'Verify the recipients in Send To.',
  'Read the Preview panel, which summarises all of the above.',
  'Select Save.',
  'Wait for the confirmation and for the panel to close.',
  'Find the new report in the list and confirm its details are correct.',
]);

doc.h2('7.3 What Happens After Saving');
doc.steps([
  'The scheduled report is created and appears in the list.',
  'A first document is produced immediately, which is why saving takes a moment.',
  'The report then waits for its next scheduled time.',
  'At that time, provided Auto Send is on, the document is built for the current period and emailed to every recipient.',
  'The Last Sent column is updated. Select Refresh to see it.',
  'The document can be downloaded from the list at any time.',
]);
doc.callout('Nothing will be sent while Auto Send is off',
  'A saved report is a live schedule, but the master switch overrides it. If the warning banner '
  + 'is showing above the list, no report is being emailed — including the one you just created. '
  + 'Switch Auto Send back on to resume.');

/* ─────────────────────────────────────────────────────────────────────────────
   8. STATUS
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('8. Report Status');
doc.p(
  'A scheduled report has no status field that you set. Its state is shown by the Auto Send '
  + 'switch and the Last Sent column, and the outcome of each individual send is recorded by the '
  + 'system.'
);

doc.h2('8.1 The State of a Scheduled Report');
doc.table(['State', 'How you can tell', 'What it means', 'What to do'], [
  ['Scheduled, not yet sent',
   'The report is listed and Last Sent is empty.',
   'The report is set up and waiting for its first scheduled time.',
   'Nothing. Check back after the scheduled time and select Refresh.'],
  ['Sending normally',
   'Last Sent shows a recent date and time.',
   'The report is running on its schedule.',
   'Nothing.'],
  ['Paused',
   'The warning banner is shown above the list.',
   'Automatic sending is off for every report. Schedules are saved but nothing is emailed.',
   'Switch Auto Send back on when you are ready to resume.'],
  ['Removed',
   'The report is no longer listed.',
   'A Super Administrator has deleted it. It will not run again.',
   'Create a new report if it is still needed.'],
], { widths: [18, 26, 30, 26] });

doc.h2('8.2 The Outcome of an Individual Send');
doc.p('Each scheduled occurrence is recorded with one of the following outcomes. These are kept by the system for review.');
doc.table(['Outcome', 'Meaning', 'What it means for you'], [
  ['Queued',
   'The document was produced and handed to the email queue for every recipient.',
   'The report is on its way. Last Sent updates.'],
  ['Skipped',
   'The occurrence was evaluated but there was no new period to report on yet.',
   'Normal, not an error. It happens when the period has caught up with today, or has not started yet.'],
  ['Failed',
   'The document could not be produced, or there was no valid recipient to send it to.',
   'The period is not lost — the same period is attempted again at the next occurrence. Check the recipients on the report.'],
], { widths: [16, 42, 42] });
doc.callout('A failed send does not lose the period',
  'When a send fails, the report does not move on. The next occurrence attempts the same period '
  + 'again, so no data goes unreported. This is why correcting a bad recipient address is usually '
  + 'all that is needed to put a failing report right.');

doc.h2('8.3 What You Can and Cannot Do');
doc.table(['Action', 'Available?'], [
  ['Create a scheduled report', 'Yes — Administrator and Super Administrator.'],
  ['Download the latest document', 'Yes.'],
  ['Pause all sending', 'Yes — the Auto Send switch.'],
  ['Pause one report on its own', 'No. Auto Send applies to every report at once.'],
  ['Change a report after creating it', 'No. See Chapter 11.'],
  ['Send a report immediately, out of schedule', 'No. There is no send-now control in either application.'],
  ['Delete a report', 'Yes — Super Administrator only.'],
]);

/* ─────────────────────────────────────────────────────────────────────────────
   9. VIEWING
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('9. Viewing Reports');

doc.h2('9.1 Reviewing the Scheduled Reports');
doc.steps([
  'Open the Reporting Module. Every scheduled report is listed.',
  'Use Toggle Columns to show the details you are interested in, such as Schedule, Date Range and Last Sent.',
  'Use Search or Filters to narrow a long list.',
  'Read the row to see how the report is configured and when it last went out.',
]);

doc.h2('9.2 Opening a Report Document');
doc.steps([
  'Find the report in the list.',
  'Check the Last Sent column. If it is empty, no document has been produced yet.',
  'Select Download on that row.',
]);
doc.p('The most recent document for that scheduled report opens or is saved.');

doc.h2('9.3 Checking Whether a Report Has Been Sent');
doc.table(['What you see in Last Sent', 'What it tells you'], [
  ['A date and time', 'The report was last sent then.'],
  ['Empty', 'The report has never been sent. Either its first scheduled time has not arrived, or Auto Send has been off since it was created.'],
]);
doc.small('Select Refresh before drawing a conclusion — the list shows the figures loaded when you opened the screen.');

doc.h2('9.4 Finding Out Whether a Report Already Exists');
doc.steps([
  'Open the Reporting Module.',
  'Type the subject area into the search field — for example "inventory".',
  'If nothing is found, clear the search and use Filters to narrow by Report Type instead.',
  'Read the Schedule, Date Range and Send To columns of anything found.',
  'If a report already covers that subject, schedule and audience, do not create a second one.',
]);

/* ─────────────────────────────────────────────────────────────────────────────
   10. DUPLICATES
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('10. Avoiding Duplicate Reports');
doc.callout('Read this chapter before creating a report',
  'The system protects thoroughly against sending the same report twice for the same scheduled '
  + 'moment. It does NOT stop you creating two similar scheduled reports. That is the one '
  + 'duplication risk that rests with you.');

doc.h2('10.1 What the System Prevents Automatically');
doc.bullets([
  ['The same occurrence is never sent twice. ', 'Each scheduled moment is claimed before anything is sent, so a repeated or overlapping run cannot email it again.'],
  ['A late send is not a second send. ', 'If a scheduled moment is missed, it is still sent shortly afterwards — but under its original scheduled moment, so it counts as that one occurrence.'],
  ['The same period is never reported twice. ', 'Each send continues from the day after the previous one finished, so no date is ever covered by two documents.'],
  ['One recipient is never emailed twice. ', 'The same address entered more than once, in any capitalisation, receives a single copy.'],
]);

doc.h2('10.2 What You Must Prevent Yourself');
doc.p(
  'Nothing stops two scheduled reports being created with the same type, schedule and recipients. '
  + 'If that happens, both run and recipients receive two similar documents each period. The '
  + 'system regards them as two separate reports, because that is what they are.'
);

doc.h2('10.3 When a Report Should Be Considered to Already Exist');
doc.p('Treat a report as already existing when you find one matching all four of these:');
doc.table(['Check', 'Where to look'], [
  ['The same subject area', 'Report Type column.'],
  ['The same frequency', 'Schedule column, with Time, Day, Weekday or Month.'],
  ['A comparable period length', 'Date Range column.'],
  ['The same or overlapping recipients', 'Send To column.'],
]);

doc.h2('10.4 What to Do Instead of Creating a Second Report');
doc.steps([
  'Search the list before you create anything.',
  'If a matching report exists, use it. Download its latest document to confirm it covers what you need.',
  'If the recipients need to change, note that a report cannot be edited: a Super Administrator must delete it and a new one must be created with the corrected details.',
  'If you genuinely need a different frequency or a different audience, give the new report a name that makes the difference obvious, so the two are not confused later.',
]);
doc.callout('If duplicates have already been created',
  'Recipients will be receiving two similar documents each period. Ask a Super Administrator to '
  + 'delete the report you do not want. Deleting stops it immediately; documents already emailed '
  + 'are unaffected.');

/* ─────────────────────────────────────────────────────────────────────────────
   11. EDITING
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('11. Changing a Report');
doc.callout('Scheduled reports cannot be edited',
  'Neither the SYNC Web Application nor the SYNC Mobile Application provides a control to open or '
  + 'change a scheduled report after it has been created. There is no Edit control on any row, '
  + 'and selecting a row does not open it for changes. Everything about a report — its name, '
  + 'type, schedule, time, period and recipients — is fixed when it is created.');

doc.h2('11.1 How to Change a Report in Practice');
doc.steps([
  'Open the Reporting Module and find the report that needs changing.',
  'Note every one of its settings: name, type, schedule, time, day or weekday or month, date range and recipients.',
  'Select Add and create a new report with the corrected settings.',
  'Confirm the new report appears in the list and is configured as you intended.',
  'Ask a Super Administrator to delete the old report, so recipients do not receive both.',
]);
doc.callout('Do these in this order',
  'Create the replacement first and confirm it is right, then delete the old one. Deleting first '
  + 'risks leaving no report in place if the replacement cannot be created immediately.');

doc.h2('11.2 What Can Be Changed Without Recreating');
doc.table(['Change needed', 'Possible without recreating?'], [
  ['Pause all reporting temporarily', 'Yes — switch Auto Send off, then on again later.'],
  ['Change which columns you see in the list', 'Yes — Toggle Columns. This affects only your view.'],
  ['Change the report name, type, schedule, period or recipients', 'No. Create a replacement and delete the original.'],
  ['Stop one report permanently', 'Yes — a Super Administrator deletes it.'],
]);

/* ─────────────────────────────────────────────────────────────────────────────
   12. SEARCH AND FILTERS
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('12. Search, Filters and the List');

doc.h2('12.1 Search');
doc.sub('Purpose');
doc.p('Narrows the list to reports matching what you type.');
doc.sub('How to Use');
doc.steps([
  'Select the field marked Search reports.',
  'Type part of a report name or another detail.',
  'Clear the field to restore the full list. On a phone, select Clear search.',
]);
doc.sub('Expected Result');
doc.p('Only matching reports remain listed. Nothing is changed.');

doc.h2('12.2 Column Filters');
doc.sub('Purpose');
doc.p('Narrows the list precisely, using a filter for each column.');
doc.sub('How to Use');
doc.steps([
  'Select Filters. The panel opens, headed Report Filters.',
  'Enter a value against a column, or tick the entries you want.',
  'Apply the filters and close the panel.',
  'Note the number shown on the Filters control — that is how many filters are active.',
]);
doc.sub('Expected Result');
doc.p('The list narrows accordingly and the Filters control shows the active count.');
doc.table(['Filter by', 'Useful for finding'], [
  ['Report Name', 'A report whose name you partly remember.'],
  ['Report Type', 'Every report covering one subject area.'],
  ['Schedule', 'Every report of one frequency, such as all monthly reports.'],
  ['Weekday or Month', 'Reports tied to a particular weekday or month.'],
  ['Time or Day', 'Reports that run at a given time or on a given day of the month.'],
  ['Send To', 'Every report going to a particular recipient.'],
  ['Date Range', 'Reports configured for a particular period.'],
  ['Created By or Created At', 'Reports set up by a particular person, or at a particular time.'],
]);

doc.h2('12.3 Choosing Columns');
doc.sub('Purpose');
doc.p('Controls which columns are displayed.');
doc.sub('How to Use');
doc.steps([
  'Select Toggle Columns.',
  'Tick or untick each column.',
  'Select All to show everything, or Reset to return to the standard selection.',
]);
doc.sub('Expected Result');
doc.p('The list redraws with your chosen columns.');

doc.h2('12.4 Sorting and Pagination');
doc.table(['Control', 'Purpose', 'How to use'], [
  ['Column heading', 'Orders the list by that column.', 'Select the heading; select it again to reverse the order.'],
  ['Next and Previous', 'Moves through a long list one page at a time.', 'Select the control beneath the list.'],
  ['Page indicator', 'Shows which entries you are viewing.', 'Read it to judge how much of the list remains.'],
]);

doc.h2('12.5 Clearing Everything');
doc.steps([
  'Empty the search field.',
  'Open Filters and clear any filter still applied — the count on the Filters control tells you whether any remain.',
  'Select Refresh to reload the list.',
]);
doc.callout('If a report seems to be missing',
  'A search term or a filter left applied from earlier is by far the most common cause. Clear '
  + 'both before concluding that a report has been deleted.');

/* ─────────────────────────────────────────────────────────────────────────────
   13. MOBILE
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('13. Reporting on the Mobile Application');
doc.p(
  'The SYNC Mobile Application offers the same module in a form suited to a phone. Reports '
  + 'created on a phone behave exactly as those created on a computer.'
);

doc.h2('13.1 Opening the Module');
doc.steps([
  'Open the SYNC Mobile Application and sign in.',
  'Select Menu.',
  'Select Reports under Operations.',
]);
doc.p('The list of scheduled reports opens, each shown as a card.');

doc.h2('13.2 The Mobile Screen');
doc.table(['Control', 'Purpose'], [
  ['Add', 'Opens the Add Report panel.'],
  ['Search reports', 'Narrows the list as you type.'],
  ['Clear search', 'Restores the full list. Shown when a search has found nothing.'],
  ['Refresh', 'Reloads the list. You can also pull the list downwards.'],
  ['Download', 'Opens the most recent document for that report.'],
]);
doc.small('If no reports exist, the screen reads "No report data available. Tap + Add to create one."');

doc.h2('13.3 Creating a Report on a Phone');
doc.steps([
  'Select Add.',
  'Enter the Report Name.',
  'Choose the Report Type.',
  'Choose the Report Schedule.',
  'Enter the Day of the month.',
  'Enter the Report Time. The field is labelled with the reporting time zone, GMT+8.',
  'Enter the recipients in Send To.',
  'Select one of the quick ranges to set the reporting period.',
  'Check the preview beneath the form.',
  'Select Save, or Cancel to close without creating anything.',
]);

doc.h2('13.4 Differences From the Web Application');
doc.p('The mobile form is a simplified version. Where the two differ, the Web Application offers more.');
doc.table(['Aspect', 'Web Application', 'Mobile Application'], [
  ['Report types', 'Eight, including Combined Transactions.', 'Seven. Combined Transactions is not offered.'],
  ['Schedules', 'Five, including Every Week.', 'Four. Every Week is not offered.'],
  ['Day field', 'Asked for only when the schedule needs it.', 'Asked for on every schedule, and always required.'],
  ['Weekday and Month fields', 'Shown when the schedule needs them.', 'Not offered.'],
  ['Reporting period', 'Quick ranges plus From and To date fields.', 'Quick ranges only: Everyday, Weekly, Monthly, Quarterly.'],
  ['Filters and Toggle Columns', 'Available.', 'Not available. Search only.'],
  ['Auto Send switch', 'Available.', 'Not available. Use the Web Application.'],
  ['Delete', 'Available to Super Administrators.', 'Not available.'],
], { widths: [22, 39, 39] });
doc.callout('When to use the Web Application instead',
  'Use a computer to create a weekly report, a Combined Transactions report, a report needing an '
  + 'exact From and To period, or to switch Auto Send or delete a report. The phone is best for '
  + 'checking what is scheduled, downloading a recent document, and creating a straightforward '
  + 'daily, monthly, quarterly or yearly report while away from a desk.');

doc.h2('13.5 Completing the Day Field on a Phone');
doc.p(
  'The mobile form asks for Day whatever schedule you choose, and will not save without it. For '
  + 'a daily report the value has no effect on when the report runs — a daily report runs every '
  + 'day regardless — but the field must still be completed. Enter a valid day of the month, from '
  + '1 to 31, to proceed.'
);
doc.callout('If the form will not save',
  'The message "Please complete all required fields, including selecting a quick date range" '
  + 'means something is missing. The two most commonly overlooked are the Day field and the quick '
  + 'range — selecting a quick range is what sets the reporting period on a phone.');

/* ─────────────────────────────────────────────────────────────────────────────
   14. WEB
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('14. Reporting on the Web Application');
doc.p('The Web Application offers the module in full. This chapter is the end-to-end path through it.');

doc.h2('14.1 Navigation');
doc.steps([
  'Sign in to the SYNC Web Application.',
  'Select Reports in the navigation menu on the left.',
  'The list of scheduled reports opens.',
]);

doc.h2('14.2 The Full Workflow');
doc.steps([
  'Search or filter the list first, to confirm the report you need does not already exist.',
  'Select Add.',
  'Enter the Report Name and choose the Report Type.',
  'Choose the Report Schedule, then complete whichever of Weekday, Month or Day it asks for.',
  'Set the Report Time.',
  'Set the reporting period with a quick range, or with the From and To fields.',
  'Enter the recipients in Send To.',
  'Read the Preview panel.',
  'Select Save and wait for the panel to close.',
  'Find the new report in the list and check its row.',
  'Confirm Auto Send is on, so the report will actually be emailed.',
  'After the first scheduled time, select Refresh and check the Last Sent column.',
]);

doc.h2('14.3 Reviewing History');
doc.p(
  'The list is the history: each row carries Last Sent, Created By and Created At. Download '
  + 'retrieves the most recent document for a report. There is no separate archive of every '
  + 'document ever sent — recipients hold those in their email.'
);

/* ─────────────────────────────────────────────────────────────────────────────
   15. REVIEW
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('15. Reviewing Before You Save');
doc.p('Because a report cannot be edited once created, the few moments spent checking the panel are the most valuable in the whole process.');

doc.h2('15.1 Review Checklist');
doc.table(['Check', 'How to verify', 'Why it matters'], [
  ['The report does not already exist',
   'Search the list before selecting Add.',
   'Two similar reports mean recipients receive two documents every period.'],
  ['The name identifies the report',
   'Read it as a stranger would.',
   'The name is how the report is found later, and how duplicates are spotted.'],
  ['The type is the right subject area',
   'Check the Report Type field.',
   'It cannot be changed afterwards.'],
  ['The schedule is the frequency you intend',
   'Check the Schedule field and whichever of Weekday, Month or Day it asks for.',
   'A wrong schedule sends at the wrong frequency, or on the wrong day.'],
  ['The time is correct',
   'Check Report Time, remembering it is in GMT+8.',
   'Reports sent at an unhelpful hour tend to be ignored.'],
  ['The period is the length you intend',
   'Check From and To, and read the Preview.',
   'The LENGTH of this period is what repeats on every later send.'],
  ['Every recipient is correct',
   'Read Send To one address at a time.',
   'A mistyped address is ignored, and that person never receives the report.'],
  ['The Preview matches your intention',
   'Read the Preview panel in full.',
   'It is the last chance to catch an error before the report goes live.'],
], { widths: [26, 34, 40] });

/* ─────────────────────────────────────────────────────────────────────────────
   16. WORKFLOWS
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('16. Common Reporting Workflows');

doc.h2('Workflow 1 — Create a New Scheduled Report');
doc.steps([
  'Open Reports.',
  'Search the list to confirm a similar report does not already exist.',
  'Select Add.',
  'Enter the name, choose the type and choose the schedule.',
  'Complete the weekday, month or day the schedule asks for, and set the time.',
  'Set the reporting period.',
  'Enter the recipients.',
  'Read the Preview panel.',
  'Select Save.',
  'Confirm the report appears in the list, and that Auto Send is on.',
]);

doc.h2('Workflow 2 — Check an Existing Report');
doc.steps([
  'Open Reports.',
  'Search for the report by name, or filter by Report Type.',
  'Use Toggle Columns to show Schedule, Date Range and Last Sent.',
  'Read the row to confirm how it is configured and when it last went out.',
  'Select Download to review the most recent document.',
]);

doc.h2('Workflow 3 — Check Whether a Report Already Exists');
doc.steps([
  'Open Reports.',
  'Select Filters and narrow by Report Type.',
  'Add a filter on Schedule if several reports cover that type.',
  'Review the Send To column of anything found.',
  'If a report matches on type, frequency, period and recipients, use it rather than creating another.',
]);

doc.h2('Workflow 4 — Confirm a Report Was Sent');
doc.steps([
  'Open Reports and select Refresh.',
  'Find the report and read the Last Sent column.',
  'If it is empty or older than expected, check whether the warning banner is showing — automatic sending may be off.',
  'If Auto Send is on and Last Sent is still not updating, check the recipients on that report.',
]);

doc.h2('Workflow 5 — Pause and Resume All Reporting');
doc.steps([
  'Open Reports in the Web Application.',
  'Select the Auto Send control and switch it off.',
  'Confirm the warning banner appears above the list.',
  'Carry out the maintenance or data correction.',
  'Select Auto Send again to switch it back on.',
  'Confirm the banner has gone.',
]);

doc.h2('Workflow 6 — Correct a Report That Was Set Up Wrongly');
doc.steps([
  'Open Reports and note every setting of the report concerned.',
  'Select Add and create a replacement with the corrected settings.',
  'Confirm the replacement appears in the list and is correct.',
  'Ask a Super Administrator to delete the original.',
  'Confirm only the replacement remains.',
]);

/* ─────────────────────────────────────────────────────────────────────────────
   17. TROUBLESHOOTING
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('17. Troubleshooting');
doc.table(['Problem', 'Possible Cause', 'Recommended Solution'], [
  ['Reports does not appear in the menu.',
   'The account is not an Administrator or Super Administrator.',
   'Contact your system administrator. The module cannot be reached another way.'],
  ['The report cannot be saved.',
   'A required field is missing or invalid.',
   'Read the message on each marked field. The most commonly missed are the weekday, month or day the schedule asks for, and the recipients.'],
  ['"The end date cannot be before the start date."',
   'From and To are the wrong way round.',
   'Correct the dates so the period runs forwards.'],
  ['"Not a valid email address."',
   'A recipient is mistyped, or separators are missing.',
   'Check each address and separate several with commas.'],
  ['"February only has 28 days" or similar.',
   'The chosen day does not exist in the chosen month.',
   'Choose a day within that month\'s length, or a different month.'],
  ['No reports are being emailed at all.',
   'Automatic sending is switched off.',
   'Look for the warning banner above the list and switch Auto Send back on.'],
  ['One report is not being emailed, but others are.',
   'That report has no valid recipient, or its document cannot be produced.',
   'Check its Send To value. Because a failed period is retried, correcting the recipients is usually enough.'],
  ['Last Sent is empty on a new report.',
   'The first scheduled time has not arrived yet, or Auto Send was off.',
   'Select Refresh after the scheduled time, and confirm Auto Send is on.'],
  ['Download produces nothing.',
   'The report has never been sent, so no document exists yet.',
   'Check Last Sent. Wait until the report has run at least once.'],
  ['A report cannot be found in the list.',
   'A search term or filter is still applied, or it was deleted.',
   'Clear the search, clear the filters and select Refresh.'],
  ['There is no Edit control on a report.',
   'Scheduled reports cannot be changed after creation.',
   'Create a replacement with the correct settings and have the original deleted. See Chapter 11.'],
  ['There is no Delete control on a report.',
   'Deleting is restricted to Super Administrators.',
   'Ask a Super Administrator to delete it.'],
  ['Recipients are receiving two similar reports.',
   'Two scheduled reports have been created for the same purpose.',
   'Identify both in the list and have the unwanted one deleted.'],
  ['A weekly report cannot be created on a phone.',
   'The mobile form does not offer Every Week.',
   'Create it in the Web Application.'],
  ['The mobile form insists on a Day for a daily report.',
   'The mobile form asks for Day on every schedule.',
   'Enter any valid day from 1 to 31. It does not affect when a daily report runs.'],
], { widths: [28, 30, 42] });

/* ─────────────────────────────────────────────────────────────────────────────
   18. FAQ
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('18. Frequently Asked Questions');

[
  ['How do I create a report?',
   'Open Reports, select Add, complete the panel — name, type, schedule, time, reporting period '
   + 'and recipients — and select Save. The report then runs on its schedule.'],
  ['Do I type the contents of the report myself?',
   'No. You describe what should be reported and how often. The system gathers the data and '
   + 'produces the document.'],
  ['How do I select a reporting period?',
   'Use one of the quick ranges, or enter the From and To dates yourself in the Web Application. '
   + 'Both dates are required.'],
  ['Does the report keep sending the same dates forever?',
   'No. The length of the period repeats, not the dates. Each send continues from the day after '
   + 'the previous one finished.'],
  ['Can I submit more than one report for the same period?',
   'The system will never send the same scheduled occurrence twice, and never reports the same '
   + 'dates twice within one report. It does not, however, stop you creating two similar '
   + 'scheduled reports — search the list first.'],
  ['How do I know whether my report was sent?',
   'Select Refresh and read the Last Sent column. A date and time there means it has gone out.'],
  ['Can I edit a report after saving it?',
   'No. There is no edit control in either application. Create a replacement with the correct '
   + 'settings and ask a Super Administrator to delete the original.'],
  ['What should I do if I entered incorrect information?',
   'Create a corrected report first, confirm it is right, then have the incorrect one deleted so '
   + 'recipients do not receive both.'],
  ['Why is the Save button not working?',
   'A required field is missing or invalid. The panel tells you how many fields need attention '
   + 'and marks each with the reason.'],
  ['Can I send a report immediately, outside its schedule?',
   'No. There is no send-now control. Reports are sent at their scheduled time.'],
  ['Can I pause one report without stopping the others?',
   'No. The Auto Send switch pauses every scheduled report at once. To stop one permanently, a '
   + 'Super Administrator must delete it.'],
  ['What happens to occurrences that fall while Auto Send is off?',
   'They are not sent, and they are not sent retrospectively when it is switched back on. '
   + 'Sending resumes from that point.'],
  ['What happens if a scheduled send is missed?',
   'A send missed by a short period is still delivered shortly afterwards, recorded against its '
   + 'original scheduled moment so it counts as one occurrence, not two.'],
  ['What happens if the report fails to send?',
   'The period is not lost. The same period is attempted again at the next occurrence, so no data '
   + 'goes unreported.'],
  ['One recipient never receives the report. Why?',
   'Their address is probably not valid, in which case it is ignored while the others still '
   + 'receive it. Check the Send To value on that report.'],
  ['Does everyone get their own copy of the attachment?',
   'Yes. Each recipient receives their own copy.'],
  ['How do I find an old report?',
   'Search by name, or use Filters to narrow by type, schedule or recipient. Then select Download '
   + 'for the most recent document.'],
  ['Why can I not delete a report?',
   'Deleting is restricted to Super Administrators.'],
  ['Why does the phone ask for a Day even for a daily report?',
   'The mobile form asks for it on every schedule. Enter any valid day from 1 to 31 — it does not '
   + 'affect when a daily report runs.'],
  ['Which time zone is the report time in?',
   'The reporting time zone, GMT+8. The mobile form states this on the field label.'],
].forEach(([q, a]) => { doc.h3(q); doc.p(a); });

/* ─────────────────────────────────────────────────────────────────────────────
   19. BEST PRACTICES
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('19. Reporting Best Practices');

doc.h2('19.1 Before Creating a Report');
doc.bullets([
  'Search the list first. Creating a duplicate is the easiest mistake to make and the most annoying for recipients.',
  'Agree the recipients before you start, since they cannot be changed afterwards.',
  'Decide the frequency and the period length together — the period length repeats on every send.',
  'Give the report a name that says what it covers and how often, so it is recognisable in a long list.',
]);

doc.h2('19.2 While Completing the Form');
doc.bullets([
  'Complete the fields in order; the schedule you choose decides what is asked for next.',
  'Read the Preview panel before saving. It is quicker than re-reading the whole form.',
  'Check each recipient address individually. An invalid one is simply ignored.',
  'Remember the time is in GMT+8, and choose an hour when recipients will actually see it.',
]);

doc.h2('19.3 After Saving');
doc.bullets([
  'Confirm the report appears in the list with the settings you intended.',
  'Confirm Auto Send is on, or nothing will be emailed.',
  'After the first scheduled time, select Refresh and check Last Sent.',
  'Download the first document and read it, to confirm it covers what you expected.',
]);

doc.h2('19.4 Ongoing');
doc.bullets([
  'Review the list periodically and have reports that are no longer needed deleted.',
  'If you switch Auto Send off, switch it back on as soon as the work is finished.',
  'Investigate a Last Sent date that has stopped advancing.',
  'Keep the number of scheduled reports to those genuinely read — unread reports train recipients to ignore them.',
]);

/* ─────────────────────────────────────────────────────────────────────────────
   20. REFERENCE
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('20. Button and Field Reference');

doc.h2('20.1 Buttons and Controls');
doc.table(['Control', 'Function', 'When to Use'], [
  ['Add', 'Opens the Add Report panel.', 'To set up a new scheduled report.'],
  ['Save', 'Creates the scheduled report and produces its first document.', 'Once every field is complete and the Preview has been checked.'],
  ['Cancel', 'Closes the Add Report panel without creating anything.', 'To abandon a report. Everything entered is discarded.'],
  ['Search reports', 'Narrows the list as you type.', 'To find a report by name or detail.'],
  ['Clear search', 'Restores the full list on a phone.', 'When a search has found nothing.'],
  ['Filters', 'Opens a filter for every column, and shows how many are active.', 'To narrow a long list precisely.'],
  ['Toggle Columns', 'Chooses which columns appear.', 'To show or hide detail in the list.'],
  ['All', 'Shows every column.', 'When reviewing a report in full.'],
  ['Reset', 'Returns to the standard column selection.', 'After showing every column.'],
  ['Auto Send', 'Switches automatic sending on or off for every report.', 'To pause all reporting during maintenance, and to resume it.'],
  ['Refresh', 'Reloads the list.', 'To pick up a new report or an updated Last Sent time.'],
  ['Download', 'Opens the most recent document for that report.', 'To read or keep a copy of what was sent.'],
  ['Delete', 'Removes a scheduled report permanently.', 'Super Administrators only, when a report is no longer wanted.'],
  ['Quick range', 'Fills in the reporting period for you.', 'When a standard period length fits.'],
  ['Next and Previous', 'Move through a long list.', 'When the list runs to several pages.'],
], { widths: [20, 42, 38] });

doc.h2('20.2 Fields');
doc.table(['Field', 'Purpose', 'Required', 'What to Enter'], [
  ['Report Name', 'Identifies the report in the list.', 'Yes', 'A clear name of 3 to 255 characters.'],
  ['Report Type', 'The subject area the report covers.', 'Yes', 'One of the types listed in Chapter 1.4.'],
  ['Report Schedule', 'How often the report runs.', 'Yes', 'Every Day, Every Week, Every Month, Every 3 Months or Every Year.'],
  ['Weekday', 'The weekday a weekly report runs on.', 'Only for Every Week', 'A weekday from Monday to Sunday.'],
  ['Month', 'The month the report runs in.', 'Only for Every 3 Months and Every Year', 'A month from January to December. For quarterly reports this is the starting month.'],
  ['Day', 'The day of the month the report runs on.', 'Only for Every Month, Every 3 Months and Every Year', 'A whole number from 1 to 31, within the length of the chosen month.'],
  ['Report Time', 'The time of day the report is sent.', 'Yes', 'A time, interpreted in GMT+8.'],
  ['From', 'The first day of the reporting period.', 'Yes', 'A date.'],
  ['To', 'The last day of the reporting period.', 'Yes', 'A date on or after the start date.'],
  ['Send To', 'Who receives the report.', 'Yes', 'One or more email addresses, separated by commas.'],
], { widths: [14, 26, 20, 40] });
doc.small('On a phone the Day field is required for every schedule, and the reporting period is set with a quick range rather than From and To fields.');

/* ─────────────────────────────────────────────────────────────────────────────
   21. CHECKLIST
   ───────────────────────────────────────────────────────────────────────── */
doc.h1('21. User Checklist');
doc.p('Work through this before selecting Save. A scheduled report cannot be edited afterwards.');

doc.h2('21.1 Before Saving');
doc.bullets([
  '☐  I have searched the list and no similar report already exists.',
  '☐  The report name identifies what this report covers and how often.',
  '☐  The report type is the correct subject area.',
  '☐  The schedule is the frequency I intend.',
  '☐  The weekday, month or day the schedule asked for is correct.',
  '☐  The report time is correct, remembering it is GMT+8.',
  '☐  The reporting period is the length I intend.',
  '☐  Every recipient address is correct and separated by commas.',
  '☐  The Preview panel matches my intention.',
]);

doc.h2('21.2 After Saving');
doc.bullets([
  '☐  The new report appears in the list.',
  '☐  Its row shows the settings I intended.',
  '☐  Auto Send is on, so the report will actually be emailed.',
  '☐  After the first scheduled time, Last Sent shows a date.',
  '☐  I have downloaded the first document and confirmed it covers what I expected.',
  '☐  No duplicate report is present in the list.',
]);

/* ── finish ─────────────────────────────────────────────────────────────── */
doc.buildToc();
doc.chrome();
const { pages } = doc.save(OUT);
console.log(`Wrote ${OUT} — ${pages} pages.`);

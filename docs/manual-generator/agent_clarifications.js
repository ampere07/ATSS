/*
 * Builds the Agent Module clarifications PDF — the answers to the questions
 * raised about Quota, Commission, Incentives, Team and account creation.
 *
 * Every answer was checked against the shipped behaviour before being written
 * down. Where the confirmed behaviour is narrower than the short answer given
 * in discussion, the entry says so plainly rather than smoothing it over.
 *
 *   node agent_clarifications.js [output.pdf] [date] [version] [preparedBy] [organization]
 */
const path = require('path');
const { Doc } = require('./render.js');

const OUT = process.argv[2] || path.join(__dirname, '..', '..', 'SYNC_Agent_Module_Clarifications.pdf');
const DATE = process.argv[3] || '8 August 2026';
const VERSION = process.argv[4] || '1.0';
const PREPARED_BY = process.argv[5] || 'SYNC Documentation Team';
const ORGANIZATION = process.argv[6] || 'SYNC';

const doc = new Doc({
  eyebrow: 'SYNC',
  title: 'Agent Module — Clarifications',
  subtitle: 'Answers on Quota, Commission, Incentives and Teams',
  blurb:
    'This document answers the eleven questions raised about the Agent Module: how Quota and '
    + 'Commission are calculated, what the Incentives figure represents, what a Team is for, and '
    + 'which values are required when an Agent account is created. Each answer states the '
    + 'confirmed behaviour of the system, and flags the few points that need a decision or a '
    + 'small change.',
  facts: [
    ['Document Title', 'SYNC Agent Module — Clarifications'],
    ['Subject', 'Quota, Commission, Incentives, Teams, Account Creation'],
    ['Version', VERSION],
    ['Document Date', DATE],
    ['Prepared By', PREPARED_BY],
    ['Organization', ORGANIZATION],
    ['Questions Answered', '11'],
    ['Status', 'Confirmed against current system behaviour'],
  ],
  footNote:
    'Answers marked "Needs a decision" or "Needs a small change" are the only items that are not '
    + 'already settled. Everything else describes how the system behaves today.',
  runningHeader: 'SYNC Agent Module — Clarifications',
  runningFooter: 'Answers on Quota, Commission, Incentives and Teams',
});

doc.cover();

/* ─────────────────────────────────────────────────────────────────────────── */
doc.h1('Summary of Answers');
doc.p('The short version of all eleven answers. Each is explained in full in the sections that follow.');

doc.table(['#', 'Question', 'Answer'], [
  ['1', 'Is Quota a count or a peso amount?',
   'A COUNT of completed referrals. Not pesos. The 0.00 on screen is a display format only.'],
  ['2', 'Can Quota accept whole numbers only?',
   'Yes. It is already treated as a whole number internally; the input should be changed to match.'],
  ['3', 'What happens if Quota is left at 0?',
   'No error. Incentives are simply switched off for that Agent — they still earn commission.'],
  ['4', 'Is Commission a flat amount per client?',
   'Yes. A flat peso amount for each completed referral. It is not a percentage of the plan.'],
  ['5', 'Does changing a rate affect past referrals?',
   'Already-paid referrals are never recalculated. Completed referrals NOT YET paid will be paid '
   + 'at the new rate — see section 5.'],
  ['6', 'Is Incentives an amount per batch, or a balance?',
   'Both names are in use. The value you configure is the amount per completed quota batch; the '
   + 'Incentives shown on the payout screens is the accumulated balance.'],
  ['7', 'Can the balance be edited directly, and is it logged?',
   'It cannot be edited directly. It only moves through a recorded transaction, and every one '
   + 'records who made it and when.'],
  ['8', 'What is a Team used for?',
   'Grouping Agents for statistics and reporting. It does not affect access or how anyone is paid.'],
  ['9', 'What happens to an Agent if their Team is renamed or deleted?',
   'Renaming is safe — the Agent follows it. Deleting leaves the Agent with no working team, and '
   + 'nothing else about them changes.'],
  ['10', 'Why are Quota and Incentives required at account creation?',
   'They are deliberately required so an Agent is never created half-configured. Defaults can be '
   + 'added — see section 10.'],
  ['11', 'What starting values should a new Agent get?',
   'To be agreed with the administrators. A suggested starting point is in section 11.'],
], { widths: [5, 33, 62] });

/* ═════════════════════════════════════════════════════════════════════════════
   QUOTA
   ═══════════════════════════════════════════════════════════════════════════ */
doc.h1('Quota');

doc.h2('1. Is Quota a count of completed referrals, or a peso amount?');
doc.metaLine(['Asked: "Count ba ng completed referrals \'to, or peso amount? Ang display kasi 0.00 pero sa glossary, quota = number of completed referrals."']);

doc.sub('Answer');
doc.p(
  'Quota is a COUNT of completed referrals. It is not a peso amount. The glossary is correct — '
  + 'the 0.00 you are seeing on screen is a display format, not the meaning of the value.'
);

doc.sub('Why it shows 0.00');
doc.p(
  'The Quota field is presented as a money-style input with two decimal places, which is why an '
  + 'empty or zero value renders as 0.00. The value behind it is used strictly as a whole number: '
  + 'the system counts how many of the Agent\'s referrals have been completed and compares that '
  + 'count against the Quota. No peso amount is involved at any point in that comparison.'
);

doc.sub('How the three fields work together');
doc.table(['Field', 'What it is', 'Example'], [
  ['Quota', 'How many completed referrals make one batch. A count.', '5 referrals'],
  ['Incentives Value', 'The peso amount awarded for completing one batch.', '₱500.00'],
  ['Commission', 'The peso amount earned for each completed referral.', '₱400.00'],
], { widths: [22, 54, 24] });
doc.p(
  'So an Agent with a Quota of 5 and an Incentives Value of ₱500.00 earns ₱500.00 each time five '
  + 'more of their referrals are completed — regardless of what those referrals were worth.'
);
doc.callout('In short',
  'Quota answers "how many?". Incentives Value answers "how much?". Only the second one is money.');

doc.h2('2. If it is a count, can the input accept whole numbers only?');
doc.metaLine(['Asked: "Kung count, pwede bang whole numbers na lang ang input?"']);

doc.sub('Answer');
doc.p(
  'Yes. The value is already handled as a whole number everywhere it is used — anything after the '
  + 'decimal point is discarded before the comparison is made. Restricting the input to whole '
  + 'numbers changes nothing about how the system calculates; it only stops a confusing value '
  + 'being typed in the first place.'
);

doc.sub('What the change involves');
doc.bullets([
  'The Quota input steps in whole numbers instead of hundredths, so 5 cannot become 5.50.',
  'The placeholder reads 0 rather than 0.00, which removes the impression that it is money.',
  'A minimum of 0 is enforced, since a negative quota has no meaning.',
]);
doc.small(
  'This is a small front-end change on the Agent account form. It is safe to apply on its own: '
  + 'existing values are unaffected, because a stored 5.00 is already read as 5.'
);
doc.callout('Status — needs a small change',
  'Confirmed as safe and worth doing. It has not been applied yet; it is listed in the Action '
  + 'Items at the end of this document.');

doc.h2('3. What happens if Quota is left at 0?');
doc.metaLine(['Asked: "Anong mangyayari kung 0 ang naiwan — naka-disable lang ang incentives, or magkaka-error?"']);

doc.sub('Answer');
doc.p(
  'Nothing breaks. There is no error, and nothing is skipped for that Agent other than incentives '
  + 'themselves. A Quota of 0 simply means the Agent is not on an incentive scheme: they continue '
  + 'to earn commission on every completed referral exactly as normal.'
);

doc.sub('What the system does');
doc.steps([
  'The incentive run reads the Agent\'s Quota and Incentives Value.',
  'If either is 0 or blank, the Agent is passed over and recorded as skipped — a normal outcome, not a failure.',
  'No incentive is awarded and the Agent\'s Incentives figure stays where it is.',
  'Commission, bonuses and achievement rewards are all unaffected.',
]);
doc.table(['Quota', 'Incentives Value', 'Result'], [
  ['0 or blank', 'Any', 'No incentives. Commission still earned normally.'],
  ['Any', '0 or blank', 'No incentives. Commission still earned normally.'],
  ['5', '₱500.00', 'Incentives awarded, ₱500.00 for every 5 completed referrals.'],
], { widths: [16, 22, 62] });
doc.callout('Safe by design',
  'Leaving Quota at 0 is a valid way to put an Agent on commission only. It is not an error state '
  + 'and it needs no correction.');

/* ═════════════════════════════════════════════════════════════════════════════
   COMMISSION
   ═══════════════════════════════════════════════════════════════════════════ */
doc.h1('Commission');

doc.h2('4. Is Commission a flat amount per client?');
doc.metaLine(['Asked: "Confirm lang — flat 100.00 per client \'yan, tama? So per completed referral, hindi percentage ng plan."']);

doc.sub('Answer');
doc.p(
  'Correct. Commission is a flat peso amount for each completed referral. It is not a percentage, '
  + 'and it does not vary with the plan the customer signed up for.'
);

doc.sub('How a commission payout is calculated');
doc.steps([
  'The system finds the Agent\'s referrals that have been completed and not yet paid.',
  'It counts them.',
  'It multiplies that count by the Agent\'s Commission rate.',
  'The result is offered as the payout total, which can still be adjusted before saving.',
]);
doc.p(
  'So an Agent on a ₱100.00 rate with 12 completed, unpaid referrals is offered ₱1,200.00 — '
  + 'whether those twelve customers took the cheapest plan or the most expensive one.'
);
doc.callout('Plan value is not part of the calculation',
  'The plan a customer chooses affects what the business bills that customer. It has no bearing '
  + 'on what the Agent earns for referring them.');

doc.h2('5. If we change an Agent\'s rate, does it affect past referrals?');
doc.metaLine(['Asked: "Kapag binago natin ang rate ng isang agent, apektado ba ang past referrals niya na hindi pa nababayaran, or forward-looking lang?"']);

doc.callout('Please read this one in full',
  'The short answer given in discussion was "forward-looking only". That is right for referrals '
  + 'that have already been paid, but not for referrals that are completed and still awaiting '
  + 'payment. The distinction matters, so it is set out carefully below.');

doc.sub('Answer');
doc.table(['Referral', 'Affected by a rate change?', 'Why'], [
  ['Already paid out',
   'No, never.',
   'A payout is a record of what was actually paid. It is never recalculated, and changing the '
   + 'rate afterwards does not alter it.'],
  ['Completed but not yet paid',
   'YES — it will be paid at the new rate.',
   'The payout total is worked out at the moment you record the payout, using whatever the rate '
   + 'is at that time. A referral completed last month but still unpaid is included at today\'s rate.'],
  ['Not yet completed',
   'Yes, it will use the new rate.',
   'It has not been counted for payment at all yet.'],
], { widths: [22, 26, 52] });

doc.sub('What this means in practice');
doc.p(
  'The rate is applied when the money is paid, not when the referral was made. So a backlog of '
  + 'unpaid referrals will all be settled at whatever the rate happens to be on the day you pay them.'
);

doc.sub('Recommended practice');
doc.steps([
  'Before changing an Agent\'s rate, open Agent Payout and check whether they have completed referrals still unpaid.',
  'If they do, record the payout FIRST, at the old rate. That settles the backlog correctly.',
  'Confirm the payout appears in the history with the expected total.',
  'Then change the rate. Everything from that point on uses the new one.',
]);
doc.callout('If the rate has already been changed with a backlog outstanding',
  'The referrals in that backlog will be paid at the new rate. If that is not what was intended, '
  + 'adjust the payout amount by hand before saving, and record the reason in the Remarks field so '
  + 'the record explains itself later.');

/* ═════════════════════════════════════════════════════════════════════════════
   INCENTIVES
   ═══════════════════════════════════════════════════════════════════════════ */
doc.h1('Incentives');

doc.h2('6. Is Incentives an amount per completed batch, or the Agent\'s running balance?');
doc.metaLine(['Asked: "Amount per completed quota batch ba \'to, or running balance ng agent? Kasi sa Agent Payout screen, balance ang ibig sabihin ng Incentives."']);

doc.sub('Answer');
doc.p(
  'Both readings are correct, because the word Incentives is used for two different things in two '
  + 'different places. This is the source of the confusion, and it is worth being precise about.'
);
doc.table(['Where you see it', 'What it means', 'Type'], [
  ['On the Agent account form, as Incentives Value',
   'The amount awarded for completing ONE quota batch. A setting you choose.',
   'Rate'],
  ['On the Agent Payout and History screens, as Incentives',
   'The total the Agent has accumulated from incentives and not yet been paid. A running balance.',
   'Balance'],
], { widths: [34, 50, 16] });

doc.sub('How one becomes the other');
doc.steps([
  'The Agent\'s completed referrals reach a full quota batch.',
  'The Incentives Value for one batch is added to the Agent\'s Incentives balance.',
  'That happens automatically — no one records it by hand.',
  'The balance grows with each further batch, and falls when an incentives payout is recorded.',
]);
doc.p(
  'For example, an Agent with a Quota of 5 and an Incentives Value of ₱500.00 who completes 15 '
  + 'referrals earns three batches. Their Incentives balance reads ₱1,500.00 until it is paid out.'
);
doc.callout('Leftover referrals are not lost',
  'If the Agent has 17 completed referrals against a quota of 5, three batches are awarded and the '
  + 'remaining two carry forward toward the next batch. Nothing is discarded.');

doc.h2('7. If it is a balance, are we editing the Agent\'s money directly? Is that logged?');
doc.metaLine(['Asked: "Kung balance, ibig sabihin nadi-directly edit natin ang pera ng agent dito na walang payout record. Sinasadya ba, and naka-log ba kung sino nag-edit?"']);

doc.sub('Answer');
doc.p(
  'No — the balance cannot be edited directly, and there is no screen that lets anyone type a new '
  + 'figure into it. Every movement of an Agent\'s money happens through a recorded transaction, '
  + 'and every one of those records who made it and when.'
);

doc.sub('The only ways a balance can move');
doc.table(['Movement', 'How it happens', 'Recorded as'], [
  ['Incentive earned', 'Automatically, when a quota batch completes.', 'An entry in Incentives History, one line per qualifying referral.'],
  ['Commission paid', 'An administrator records a commission payout.', 'An entry in Commission History with a reference number.'],
  ['Bonus added or paid', 'An administrator records a bonus transaction.', 'An entry in Bonus History.'],
  ['Milestone reward', 'The Agent claims a completed milestone.', 'A claim record plus an entry in Commission History.'],
], { widths: [20, 34, 46] });

doc.sub('What every transaction records');
doc.bullets([
  'A reference number, so the payment can be traced.',
  'The amount, and which balance it moved.',
  'Who recorded it — the administrator\'s own name, not a shared system account.',
  'When it was recorded.',
  'Remarks, and a proof-of-payment image, both of which are required on payout transactions.',
]);
doc.callout('The answer to "is it deliberate?"',
  'Yes. Balances are deliberately read-only, so that the figure an Agent sees can always be '
  + 'explained by the list of transactions behind it. Adjusting an Agent\'s balance is done by '
  + 'recording a bonus, which leaves exactly that kind of explanation.');

/* ═════════════════════════════════════════════════════════════════════════════
   TEAM
   ═══════════════════════════════════════════════════════════════════════════ */
doc.h1('Team');

doc.h2('8. What is a Team actually used for?');
doc.metaLine(['Asked: "Saan ba talaga ginagamit ang Team — reporting, payout grouping, or access? \'Named grouping\' lang ang sabi ng manual."']);

doc.sub('Answer');
doc.p(
  'A Team is used for grouping Agents together for statistics and reporting. That is its whole '
  + 'purpose. It is a label for analysis, not a control.'
);
doc.table(['Does a Team affect...', 'Answer'], [
  ['Statistics and reporting', 'Yes. This is what it is for — seeing how a group of Agents is performing together.'],
  ['What an Agent can see or open', 'No. Access is governed entirely by the Agent role, not by team membership.'],
  ['How commission or incentives are calculated', 'No. Every rate is held against the individual Agent.'],
  ['How payouts are made', 'No. Payouts are recorded per Agent, never per team.'],
  ['Which referrals are credited to an Agent', 'No. Referrals are credited by the Agent\'s own name.'],
], { widths: [40, 60] });
doc.callout('In short',
  'Changing an Agent\'s team changes how they are grouped in reporting. It changes nothing about '
  + 'their access, their rates, their referrals or their money.');

doc.h2('9. What happens to an Agent if their Team is renamed or deleted?');
doc.metaLine(['Asked: "Anong mangyayari sa agent kung ma-delete o ma-rename ang team niya?"']);

doc.sub('Answer — renaming');
doc.p(
  'Renaming is completely safe. An Agent is attached to the team itself rather than to its name, '
  + 'so the Agent simply moves with it and shows the new name from then on. Nothing else about the '
  + 'Agent changes, and nothing needs to be reassigned.'
);

doc.sub('Answer — deleting');
doc.p(
  'The Agent is left without a working team, and nothing else about them is affected. They keep '
  + 'their account, their access, their rates, their referrals, their balances and their full '
  + 'history. In reporting they will no longer appear under that team, because it no longer exists.'
);
doc.table(['After the team is deleted', 'State'], [
  ['The Agent\'s account', 'Unchanged and still able to sign in.'],
  ['Their commission, quota and incentives rates', 'Unchanged.'],
  ['Their balances and transaction history', 'Unchanged.'],
  ['Their referrals', 'Unchanged and still credited to them.'],
  ['Their team', 'No longer resolves to anything. Effectively team-less.'],
]);
doc.callout('One housekeeping point',
  'Deleting a team does not automatically clear the team setting on the Agents that belonged to '
  + 'it, so those Agents keep pointing at a team that is no longer there. Nothing malfunctions, '
  + 'but they will not group tidily in reporting until they are reassigned. The tidy sequence is '
  + 'to move the Agents to their new team FIRST, then delete the empty one.');

/* ═════════════════════════════════════════════════════════════════════════════
   GENERAL
   ═══════════════════════════════════════════════════════════════════════════ */
doc.h1('Account Creation');

doc.h2('10. Why are Quota and Incentives required at account creation?');
doc.metaLine(['Asked: "Bakit required ang Quota at Incentives sa account creation kahit hindi pa alam ang values? Pwede kayang may default?"']);

doc.sub('Answer');
doc.p(
  'They are required deliberately. The intention is that an Agent\'s terms are settled at the '
  + 'moment the account is created, so no Agent is ever left half-configured — earning referrals '
  + 'against rates nobody has agreed. Requiring the fields forces that conversation to happen up front.'
);
doc.p(
  'Three fields are required together for an Agent account: Commission, Quota and Incentives Value.'
);

doc.sub('Can they have defaults?');
doc.p(
  'Yes. Adding sensible defaults is straightforward and does not weaken the intent — the fields '
  + 'stay required, they simply arrive pre-filled with a value that can be accepted or overwritten. '
  + 'That removes the awkward case of having to invent a number just to get past the form.'
);
doc.table(['Option', 'Effect', 'Recommendation'], [
  ['Leave as is',
   'Every value must be typed for every new Agent.',
   'Works, but slows down account creation and invites guessed values.'],
  ['Pre-fill with defaults',
   'The form opens with agreed starting values already in place, still editable.',
   'Recommended. Keeps the fields required while making the common case quick.'],
  ['Make them optional',
   'An Agent can be created with no terms at all.',
   'Not recommended. This is the situation the current rule exists to prevent.'],
], { widths: [20, 40, 40] });
doc.callout('Status — needs a decision',
  'Adding defaults is agreed in principle. What the defaults should be is question 11, and that '
  + 'needs sign-off before the change is made.');

doc.h2('11. What starting values do you recommend for a new Agent?');
doc.metaLine(['Asked: "Anong recommended starting values para sa bagong agent?"']);

doc.sub('Answer');
doc.p(
  'This is a commercial decision rather than a system one, and it needs to be agreed with the '
  + 'administrators before it is set. The system imposes no particular values and will accept '
  + 'whatever is decided.'
);

doc.sub('What to consider for each field');
doc.table(['Field', 'What to decide', 'Notes'], [
  ['Commission',
   'The flat peso amount per completed referral.',
   'This is the figure Agents will care about most. It is applied when a payout is recorded, so '
   + 'see section 5 before changing it later.'],
  ['Quota',
   'How many completed referrals earn one incentive.',
   'A whole number. Set it to 0 if new Agents should start on commission only.'],
  ['Incentives Value',
   'The peso amount for completing one quota batch.',
   'Set it to 0 alongside a Quota of 0 if incentives are not offered at the start.'],
], { widths: [18, 32, 50] });

doc.sub('A safe starting point, if one is needed');
doc.p(
  'If the terms for a particular Agent have not been agreed yet, creating them on commission only '
  + 'is the safest default: a Commission rate at the standard figure, with Quota and Incentives '
  + 'Value both at 0. As section 3 explains, that is a valid configuration — the Agent earns '
  + 'commission normally and simply has no incentive scheme until one is set.'
);
doc.callout('Status — needs a decision',
  'The actual figures are for the administrators to confirm. Once agreed, they can be applied as '
  + 'the pre-filled defaults described in section 10.');

/* ═════════════════════════════════════════════════════════════════════════════
   ACTION ITEMS
   ═══════════════════════════════════════════════════════════════════════════ */
doc.h1('Action Items');
doc.p(
  'Nine of the eleven questions describe behaviour that already works as intended and need no '
  + 'action. These are the three that do.'
);

doc.table(['#', 'Item', 'Type', 'Owner'], [
  ['1',
   'Change the Quota input to accept whole numbers only, with a placeholder of 0 instead of 0.00 '
   + 'and a minimum of 0. Removes the impression that Quota is a peso amount.',
   'Small change',
   'Development'],
  ['2',
   'Agree the starting Commission, Quota and Incentives Value for a new Agent, then apply them as '
   + 'pre-filled defaults on the account form.',
   'Decision, then small change',
   'Administrators, then Development'],
  ['3',
   'Adopt the practice of recording any outstanding commission payout BEFORE changing an Agent\'s '
   + 'rate, so a backlog is settled at the rate it was earned under.',
   'Process',
   'Administrators'],
], { widths: [5, 55, 20, 20] });

doc.h2('Points worth noting, no action required');
doc.bullets([
  ['Quota showing 0.00. ', 'Cosmetic only. The value is used as a whole number regardless of how it is displayed.'],
  ['Quota of 0. ', 'A valid configuration meaning commission only, not an error to be corrected.'],
  ['Two meanings of "Incentives". ', 'The configured rate and the accumulated balance are different figures with the same label. Both are correct in their own screen.'],
  ['Deleting a team. ', 'Harmless to the Agent, but reassign Agents first so reporting stays tidy.'],
]);

/* ── finish ─────────────────────────────────────────────────────────────── */
doc.buildToc();
doc.chrome();
const { pages } = doc.save(OUT);
console.log(`Wrote ${OUT} — ${pages} pages.`);

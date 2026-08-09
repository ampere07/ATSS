# SYNC manuals — generator

Regenerates the SYNC PDF manuals from the current source tree, so they do not drift as the
apps change.

| Manual | Output | Built by |
|---|---|---|
| SYNC User Guide — every screen, every role | `../SYNC_User_Guide.pdf` | `manual.js` |
| SYNC Agent Module User Manual — the Agent role only | `../../SYNC_Agent_Module_User_Manual.pdf` | `agent_manual.js` |
| SYNC Reporting Module User Manual — scheduled reports | `../../SYNC_Reporting_Module_User_Manual.pdf` | `reporting_manual.js` |

Both are written for the people who use SYNC, not for developers. They contain no
architecture, no internal names and no notes about how they were produced — just how to work
each screen. Keep it that way when you edit them.

## Regenerate the Agent Module manual

```sh
cd docs/manual-generator
node agent_manual.js                      # writes ../../SYNC_Agent_Module_User_Manual.pdf
```

Arguments are optional, in order: output path, document date, version, prepared-by,
organization. For example:

```sh
node agent_manual.js ../../SYNC_Agent_Module_User_Manual.pdf "8 August 2026" 1.0 \
     "Documentation Team" "Your Organization"
```

`agent_manual.js` is hand-written narrative — it documents only what an Agent account can
reach, so it is not regenerated from the extracts. When the Agent screens change, edit it.

## Regenerate the Reporting Module manual

```sh
cd docs/manual-generator
node reporting_manual.js                  # writes ../../SYNC_Reporting_Module_User_Manual.pdf
```

Takes the same optional arguments as `agent_manual.js`: output path, date, version,
prepared-by, organization.

Also hand-written. It documents the Reports screen as Administrators and Super
Administrators actually see it — note that the shipped screens offer no edit, send-now,
preview or regenerate control, and the manual says so. Do not add one to the manual
without adding it to the product first.

## Regenerate the full User Guide

```sh
cd docs/manual-generator
python extract.py            # buttons, columns, statuses, filter fields, capabilities -> manual_data.json
python extract_nav.py        # both sidebars + section routing                      -> nav_data.json
python extract_dialogs.py    # dialog fields, types, choices, refusal messages      -> dialog_data.json
node   manual.js ../SYNC_User_Guide.pdf "29 July 2026"
```

Arguments to `manual.js` are optional: output path, then the date printed on the cover and
in the page footer.

## Requirements

- Python 3 (standard library only)
- Node, plus the staff portal's `node_modules` installed — `render.js` borrows `jspdf` and
  `jspdf-autotable` from there rather than adding its own dependencies.

## Files

| File | Purpose |
|---|---|
| `extract.py` | Scans `pages/`, `modals/`, `components/` and `filter/` in all three clients (staff portal, mobile app, public application site). Pulls labelled controls, list column definitions, status option lists, funnel-filter fields and per-screen imports. |
| `extract_nav.py` | Pulls the portal sidebar tree with role access, the mobile bottom-nav groups and Menu groups, and the `section -> component` routing from each client's `Dashboard.tsx`. |
| `render.js` | Small flowing-document layout engine over jsPDF: headings, paragraphs, bullets, numbered steps, tables, callouts, running header/footer, and a generated table of contents. |
| `extract_dialogs.py` | Opens every dialog and pulls its title, each field's label, control type, required marker and choice list, plus the exact wording of every validation message it can show. Falls back to a React Native pattern for the mobile dialogs, which use `<Text>` captions rather than `<label>`. |
| `screens.js` | The per-screen walkthrough generator used by Parts 10 and 11. Holds the curated one-line purpose for each section, the description of each named button, and the rules that turn a screen's detected capabilities into numbered steps. |
| `manual.js` | The full User Guide — narrative content plus everything built from the two JSON extracts. |
| `agent_manual.js` | The Agent Module User Manual. Hand-written, covering only the screens and controls an Agent account can reach. |
| `reporting_manual.js` | The Reporting Module User Manual. Hand-written, covering scheduled reports for Administrators and Super Administrators. |

## When the apps change

Re-running the two extractors picks up new screens, filter fields, columns and controls
automatically, and Parts 2, 3, 6 and 7 of the guide update themselves — including the
numbered walkthroughs, which are assembled from each screen's detected capabilities rather
than written by hand.

Add a new screen and it appears with a generated walkthrough. Give it a one-line purpose in
`PURPOSE` in `screens.js`, or it falls back to a generic configuration-screen sentence. If it
introduces a control the extractor does not know, add a marker to `CAPS` in `extract.py` and a
step for it in `stepsFor` in `screens.js`.

Add a dialog and it appears inside the entry for the screen that opens it, provided it labels them with `<label>`
on the web or a `<Text>` caption on mobile. Validation messages are picked up from
`newErrors.field = '...'`, `missing.push('...')` and `setError('...')`.

The hand-written parts (1, 4, 5, 8) are in in `manual.js` and need editing when a
flow actually changes. Every screen entry, and every form inside it, is generated.

"""Extract buttons, filters, columns and statuses from all three SYNC clients.

Output: manual_data.json  — reviewed by hand before it is turned into the PDF.
"""
import json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WEB = os.path.join(ROOT, "ATSS2_0/frontend/src")     # staff web portal
MOB = os.path.join(ROOT, "MOBILEAPP/frontend/src")   # mobile app
APP = os.path.join(ROOT, "APPLY/frontend/src")       # public application site

def read(p):
    try:
        with open(p, encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return ""

# ── filter definitions: export const allColumns: Column[] = [ {..}, ]  ─────────
FILTER_ENTRY = re.compile(
    r"\{\s*key:\s*'([^']+)'\s*,\s*label:\s*'([^']*)'\s*(?:,\s*dataType:\s*'([^']*)')?",
)

def extract_filters(base):
    out = {}
    fdir = os.path.join(base, "filter")
    if not os.path.isdir(fdir):
        return out
    for name in sorted(os.listdir(fdir)):
        if not name.endswith(".tsx"):
            continue
        src = read(os.path.join(fdir, name))
        m = re.search(r"export const allColumns[^=]*=\s*\[(.*?)\n\];", src, re.S)
        if not m:
            continue
        rows = []
        for key, label, dtype in FILTER_ENTRY.findall(m.group(1)):
            rows.append({"key": key, "label": label, "type": dtype or "varchar"})
        if rows:
            out[name.replace(".tsx", "")] = rows
    return out

# ── table column definitions inside a page ────────────────────────────────────
COLDEF = re.compile(
    r"const\s+(\w*[Cc]olumns\w*)\s*(?::[^=]+)?=\s*\[(.*?)\n\s*\];", re.S)

def extract_columns(path):
    src = read(path)
    out = {}
    for var, body in COLDEF.findall(src):
        rows = []
        for m in re.finditer(r"\{\s*key:\s*'([^']+)'\s*,\s*label:\s*'([^']*)'", body):
            rows.append({"key": m.group(1), "label": m.group(2)})
        if rows:
            out[var] = rows
    return out

# ── button-ish labels ─────────────────────────────────────────────────────────
# <span>Label</span>, title="Label", >Label< immediately inside a <button ...>
BTN_BLOCK = re.compile(r"<button\b(.*?)</button>", re.S)
TITLE_ATTR = re.compile(r'title=(?:"([^"]{2,40})"|\{[\'"]([^\'"]{2,40})[\'"]\})')
SPAN_TXT = re.compile(r"<span[^>]*>\s*([A-Z][A-Za-z0-9 /&.()\-\+]{1,34})\s*</span>")
BARE_TXT = re.compile(r">\s*([A-Z][A-Za-z0-9 /&.()\-\+]{2,34})\s*<")

NOISE = {"true", "false", "null", "undefined"}

# Labels written as a conditional: {loading ? 'Saving...' : 'Save'}
TERNARY = re.compile(r"\?\s*'([^']{2,34})'\s*:\s*'([^']{2,34})'")
# Labels written as {'Text'} or {"Text"}
BRACED = re.compile(r">\s*\{\s*'([A-Z][^']{1,33})'\s*\}\s*<")

BAD = re.compile(r"^(https?:|[a-z]+[A-Z]|\d+$)")   # urls, camelCase identifiers, bare numbers

def _harvest(block):
    """Every plausible human label inside one clickable block."""
    out = []
    for m in SPAN_TXT.finditer(block):
        out.append(m.group(1))
    for m in BARE_TXT.finditer(block):
        out.append(m.group(1))
    for m in BRACED.finditer(block):
        out.append(m.group(1))
    for m in TERNARY.finditer(block):
        out.append(m.group(1)); out.append(m.group(2))
    for m in TITLE_ATTR.finditer(block):
        out.append(m.group(1) or m.group(2) or "")
    for m in re.finditer(r'aria-label="([^"]{2,34})"', block):
        out.append(m.group(1))
    return out

def extract_buttons(path):
    src = read(path)
    labels = []
    blocks = list(BTN_BLOCK.findall(src))
    for tag in ("Pressable", "TouchableOpacity"):
        blocks += re.findall(rf"<{tag}\b(.*?)</{tag}>", src, re.S)
    for block in blocks:
        # Ignore nested markup deeper than the control itself where possible
        for raw in _harvest(block):
            lbl = re.sub(r"\s+", " ", raw).strip(" .")
            if not lbl or len(lbl) < 2 or len(lbl) > 34:
                continue
            if lbl.lower() in NOISE or BAD.match(lbl):
                continue
            if not re.match(r"^[A-Z0-9]", lbl):
                continue
            labels.append(lbl)
    seen, uniq = set(), []
    for l in labels:
        k = l.lower()
        if k not in seen:
            seen.add(k); uniq.append(l)
    return uniq

# ── modals / components a page pulls in ───────────────────────────────────────
# Capture the module path of every import, whatever the clause shape:
#   import X from '..'            import { a, b } from '..'
#   import X, { a } from '..'     import * as X from '..'
IMPORT_RE = re.compile(r"from\s+'([^']+)'")

def extract_imports(path, kinds=("modals", "components", "filter")):
    src = read(path)
    out = []
    for spec in IMPORT_RE.findall(src):
        for k in kinds:
            if f"/{k}/" in spec or spec.startswith(f"../{k}/"):
                out.append(spec.rsplit("/", 1)[-1])
    return sorted(set(out))

# ── status option lists ──────────────────────────────────────────────────────
def extract_statuses(path):
    src = read(path)
    out = {}
    for m in re.finditer(r"const\s+(\w*[Ss]tatus\w*)\s*(?::[^=]+)?=\s*\[(.*?)\];", src, re.S):
        vals = re.findall(r"value:\s*'([^']+)'", m.group(2))
        if not vals:
            vals = re.findall(r"'([a-z][a-z ._-]{2,30})'", m.group(2))
        if vals:
            out[m.group(1)] = sorted(set(vals))
    return out

# ── per-screen capabilities ───────────────────────────────────────────────────
# Each flag is a marker that is only present when the screen really has the feature,
# so the generated walkthroughs never claim a control that is not there.
CAPS = {
    "search":     [r"GlobalSearch", r"setSearchQuery", r"setSearchTerm"],
    "funnel":     [r"FunnelFilter"],
    "viewToggle": [r"displayMode", r"'card'\s*\|\s*'table'", r"setDisplayMode"],
    "columns":    [r"setVisibleColumns", r"visibleColumns"],
    "reorder":    [r"setColumnOrder", r"draggedColumn"],
    "resize":     [r"columnWidths", r"resizingColumn"],
    "sort":       [r"setSortColumn", r"sortDirection"],
    "export":     [r"exportToCSV", r"exportToPDF"],
    "paging":     [r"setCurrentPage"],
    "pageSize":   [r"setItemsPerPage", r"itemsPerPage"],
    "detail":     [r"Details\b"],
    "refresh":    [r"silentRefresh", r"refresh[A-Z]\w+", r"RefreshCw", r"handleRefresh"],
    "realtime":   [r"pusherService", r"from '\.\./services/pusherService'", r"socketService"],
    "statusTiles":[r"statusItems", r"statusFilter", r"statusCounts"],
    "dateRange":  [r"dateFrom", r"dateInstalledFrom"],
    "related":    [r"RelatedData", r"fetchRelatedData"],
    "org":        [r"currentUserOrgId", r"organization_id"],
    "attachments":[r"AttachmentModal"],
    "approve":    [r"shouldShowApproveButton", r"handleApprove"],
    "mobileSplit":[r"mobileView", r"mobileViewMode"],
}

CREATE_RE = re.compile(r"^(Add|New|Create|Generate|Open|Assign|Request|Upload|Import)\b", re.I)
DESTRUCT_RE = re.compile(r"^(Delete|Remove|Revert|Cancel|Clear|Reset|Disconnect)\b", re.I)

def extract_caps(path, buttons):
    src = read(path)
    caps = []
    for name, pats in CAPS.items():
        if any(re.search(p, src) for p in pats):
            caps.append(name)
    if any(CREATE_RE.match(b) for b in buttons):
        caps.append("create")
    if any(DESTRUCT_RE.match(b) for b in buttons):
        caps.append("destructive")
    return sorted(caps)

def scan(base, subdir, recurse=False):
    d = os.path.join(base, subdir)
    res = {}
    if not os.path.isdir(d):
        return res
    if recurse:
        names = []
        for cur, _dirs, files in os.walk(d):
            for f in files:
                names.append(os.path.relpath(os.path.join(cur, f), d))
        names.sort()
    else:
        names = sorted(os.listdir(d))
    for name in names:
        if not name.endswith((".tsx", ".ts")) or name.endswith(".d.ts"):
            continue
        p = os.path.join(d, name)
        if not os.path.isfile(p):
            continue
        btns = extract_buttons(p)
        entry = {
            "lines": read(p).count("\n") + 1,
            "buttons": btns,
            "columns": extract_columns(p),
            "imports": extract_imports(p),
            "statuses": extract_statuses(p),
            "caps": extract_caps(p, btns),
        }
        key = name.replace(".tsx", "").replace(".ts", "").replace("\\", "/")
        res[key] = entry
    return res

data = {
    "web": {
        "filters": extract_filters(WEB),
        "pages": scan(WEB, "pages"),
        "modals": scan(WEB, "modals"),
        "components": scan(WEB, "components"),
    },
    "mobile": {
        "filters": extract_filters(MOB),
        "pages": scan(MOB, "pages"),
        "modals": scan(MOB, "modals"),
        "components": scan(MOB, "components"),
    },
    # The public application site keeps its shared controls in nested component folders.
    "apply": {
        "filters": extract_filters(APP),
        "pages": scan(APP, "pages"),
        "modals": {},
        "components": scan(APP, "components", recurse=True),
    },
}

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "manual_data.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1)

for side in ("web", "mobile", "apply"):
    s = data[side]
    print(f"{side}: filters={len(s['filters'])} pages={len(s['pages'])} "
          f"modals={len(s['modals'])} components={len(s['components'])}")
    print(f"  filter fields total = {sum(len(v) for v in s['filters'].values())}")
    print(f"  buttons total       = {sum(len(p['buttons']) for p in s['pages'].values())}")
    print(f"  column defs total   = {sum(len(p['columns']) for p in s['pages'].values())}")
print("wrote", out)

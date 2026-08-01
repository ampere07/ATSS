"""Extract the inside of every dialog: its title, its fields (label, type, required,
choices, whether it is read-only) and the validation messages it can show.

Output: dialog_data.json
"""
import json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WEB = os.path.join(ROOT, "ATSS2_0/frontend/src/modals")
MOB = os.path.join(ROOT, "MOBILEAPP/frontend/src/modals")

def read(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()

TAG = re.compile(r"<[^>]+>")
WS = re.compile(r"\s+")

def strip_tags(s):
    return WS.sub(" ", TAG.sub(" ", s)).strip()

# ── title ─────────────────────────────────────────────────────────────────────
def find_title(src, fname):
    for pat in (r"<h2[^>]*>(.*?)</h2>", r"<h3[^>]*>(.*?)</h3>"):
        m = re.search(pat, src, re.S)
        if m:
            t = strip_tags(m.group(1))
            # Drop JSX conditionals that leak in, e.g. "{editing ? 'Edit' : 'New'} Plan"
            t = re.sub(r"\{[^}]*\}", "", t).strip(" :")
            if 2 < len(t) < 60 and not re.search(r"[${}`|]", t) and re.search(r"\w\s*\w", t):
                return t
    # Fall back to the file name — a stray title= attribute on some icon button
    # is not the dialog's name.
    n = fname.replace(".tsx", "")
    n = re.sub(r"Modal$", "", n)
    n = re.sub(r"([a-z])([A-Z])", r"\1 \2", n)
    return n.replace("JO ", "Job order ").replace("SO ", "Service order ")

# ── field types ───────────────────────────────────────────────────────────────
CONTROL_TAG = re.compile(
    r"<(SearchableField|SearchablePicker|select|textarea|input|TextInput)\b", re.I)

TYPE_BY_ATTR = {
    "file": "File upload", "checkbox": "Tick box", "radio": "Option",
    "date": "Date", "datetime-local": "Date and time", "number": "Number",
    "email": "E-mail", "tel": "Phone number", "password": "Password",
}

def control_type(after):
    """Classify the control that comes FIRST after a label.

    Taking the earliest tag matters: a text input followed later by an unrelated
    <select> must not be reported as a choice field.
    """
    win = after[:600]
    m = CONTROL_TAG.search(win)
    if not m:
        return None, ""
    tag = m.group(1).lower()
    # The attributes of this tag only, up to its closing bracket.
    attrs = win[m.end(): win.find(">", m.end()) + 1 or m.end() + 300]
    span = win[m.start(): m.start() + 400]

    if tag in ("searchablefield", "searchablepicker"):
        return "Searchable list", span
    if tag == "select":
        return "Choice", span
    if tag == "textarea":
        return "Long text", span
    a = re.search(r'type=[\"\']([a-z-]+)[\"\']', attrs)
    if a and a.group(1) in TYPE_BY_ATTR:
        return TYPE_BY_ATTR[a.group(1)], span
    return "Text", span

LABEL = re.compile(r"<label\b[^>]*>(.*?)</label>", re.S)

def extract_fields(src):
    fields, seen = [], set()
    for m in LABEL.finditer(src):
        inner = m.group(1)
        raw_label = strip_tags(inner)
        required = ("text-red-500" in inner or "text-red-600" in inner
                    or raw_label.rstrip().endswith("*"))
        label = raw_label.replace("*", "").strip(" :")
        label = re.sub(r"\{[^}]*\}", "", label).strip(" :")
        if not label or len(label) > 46 or not re.match(r"^[A-Za-z(]", label):
            continue
        after = src[m.end():]
        ctype, span = control_type(after)
        if not ctype:
            continue
        # A ternary between the label and the control means the field is rendered
        # differently depending on context (e.g. locked for an agent-only dialog).
        gap = after[:after.find("<") if after.find("<") > 0 else 0]
        conditional = bool(re.search(r"\?\s*\(\s*$", gap))
        # Only this control's own markup decides read-only.
        readonly = bool(re.search(r"readOnly\b|disabled=\{true\}", span))
        choices, dynamic = [], False
        if ctype == "Choice":
            end = after.find("</select>")
            block = after[:end if end != -1 else 1400]
            raw = [strip_tags(o) for o in
                   re.findall(r"<option[^>]*>(.*?)</option>", block, re.S)]
            for c in raw:
                if not c or len(c) > 34:
                    continue
                if c.startswith("{"):
                    dynamic = True       # options come from a lookup table
                else:
                    choices.append(c)
            choices = choices[:10]
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        fields.append({
            "label": label,
            "type": ctype,
            "required": required,
            "readonly": readonly,
            "choices": choices,
            "dynamic": dynamic,
            "conditional": conditional,
        })
    return fields

# ── validation messages ───────────────────────────────────────────────────────
def extract_rules(src):
    rules = []
    for m in re.finditer(r"newErrors\.(\w+)\s*=\s*'([^']+)'", src):
        rules.append({"field": m.group(1), "message": m.group(2)})
    for m in re.finditer(r"errors\.(\w+)\s*=\s*'([^']+)'", src):
        rules.append({"field": m.group(1), "message": m.group(2)})
    for m in re.finditer(r"missing\.push\('([^']+)'\)", src):
        rules.append({"field": "", "message": m.group(1) + " is required"})
    for m in re.finditer(r"(?:setError|setErrorMessage|alert)\(\s*'([^']{8,90})'", src):
        rules.append({"field": "", "message": m.group(1)})
    # de-duplicate, keep order
    out, seen = [], set()
    for r in rules:
        k = (r["field"], r["message"])
        if k not in seen:
            seen.add(k); out.append(r)
    return out[:14]

BTN = re.compile(r"<button\b(.*?)</button>", re.S)
BTN_TXT = re.compile(r">\s*([A-Z][A-Za-z0-9 /&.()\-\+]{1,28})\s*<")

def extract_buttons(src):
    labels = []
    for block in BTN.findall(src):
        for m in BTN_TXT.finditer(block):
            labels.append(WS.sub(" ", m.group(1)).strip())
        for m in re.finditer(r"\?\s*'([^']{2,28})'\s*:\s*'([^']{2,28})'", block):
            labels += [m.group(1), m.group(2)]
    for tag in ("Pressable", "TouchableOpacity"):
        for block in re.findall(rf"<{tag}\b(.*?)</{tag}>", src, re.S):
            for m in re.finditer(r">\s*([A-Z][A-Za-z0-9 /&.()\-\+]{1,28})\s*<", block):
                labels.append(m.group(1).strip()); break
    out, seen = [], set()
    for l in labels:
        if l.lower() in seen or len(l) < 2:
            continue
        seen.add(l.lower()); out.append(l)
    return out[:12]

# ── React Native fallback ─────────────────────────────────────────────────────
# The mobile dialogs have no <label>; a field is a <Text> caption followed by an input.
RN_LABEL = re.compile(r"<Text\b[^>]*>\s*([A-Z][^<{]{1,44}?)\s*</Text>", re.S)

def extract_fields_rn(src):
    fields, seen = [], set()
    for m in RN_LABEL.finditer(src):
        raw = WS.sub(" ", m.group(1)).strip()
        required = raw.rstrip().endswith("*")
        label = raw.replace("*", "").strip(" :")
        if not label or len(label) > 44 or not re.match(r"^[A-Z]", label):
            continue
        win = src[m.end(): m.end() + 420]
        if re.search(r"<SearchablePicker|<Picker\b", win):
            ctype = "Searchable list"
        elif re.search(r"<DateTimePicker\b", win):
            ctype = "Date"
        elif re.search(r"<Switch\b", win):
            ctype = "Toggle"
        elif re.search(r"<TextInput\b", win):
            ctype = "Long text" if re.search(r"multiline", win) else "Text"
            if re.search(r'keyboardType=[\"\']numeric', win):
                ctype = "Number"
            elif re.search(r'keyboardType=[\"\']email', win):
                ctype = "E-mail"
        else:
            continue
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        fields.append({"label": label, "type": ctype, "required": required,
                       "readonly": bool(re.search(r"editable=\{false\}", win)),
                       "choices": [], "dynamic": False, "conditional": False})
    return fields

def scan(folder, rn=False):
    res = {}
    if not os.path.isdir(folder):
        return res
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".tsx"):
            continue
        src = read(os.path.join(folder, name))
        fields = extract_fields(src)
        if rn and not fields:
            fields = extract_fields_rn(src)
        res[name.replace(".tsx", "")] = {
            "title": find_title(src, name),
            "fields": fields,
            "rules": extract_rules(src),
            "buttons": extract_buttons(src),
            "uploads": len(re.findall(r'type="file"', src)),
        }
    return res

data = {"web": scan(WEB), "mobile": scan(MOB, rn=True)}

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dialog_data.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1)

for side in ("web", "mobile"):
    d = data[side]
    withf = [k for k, v in d.items() if v["fields"]]
    print(f"{side}: dialogs={len(d)}  with fields={len(withf)}  "
          f"fields={sum(len(v['fields']) for v in d.values())}  "
          f"rules={sum(len(v['rules']) for v in d.values())}")
print("wrote", out)

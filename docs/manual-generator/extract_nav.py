"""Extract the navigation trees and section->component routing for the two staff clients."""
import json, os, re

ROOT = r"c:/Users/raven/Documents/GitHub/ATSS"
WEB = os.path.join(ROOT, "ATSS2_0/frontend/src")
MOB = os.path.join(ROOT, "MOBILEAPP/frontend/src")

def read(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()

ITEM = re.compile(
    r"\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']*)'"
    r"(?:[^}]*?allowedRoles:\s*\[([^\]]*)\])?"
    r"(?:[^}]*?allowedRoleIds:\s*\[([^\]]*)\])?",
    re.S)

def roles_of(s):
    return [x.strip().strip("'\"") for x in s.split(",") if x.strip()] if s else []

def web_sidebar():
    src = read(os.path.join(WEB, "pages/Sidebar.tsx"))
    block = re.search(r"const menuItems: MenuItem\[\] = \[(.*?)\n  \];", src, re.S).group(1)
    # Split top-level entries by tracking brace depth
    items, depth, cur = [], 0, ""
    for ch in block:
        if ch == "{":
            depth += 1
        if depth > 0:
            cur += ch
        if ch == "}":
            depth -= 1
            if depth == 0:
                items.append(cur); cur = ""
    out = []
    for raw in items:
        m = ITEM.search(raw)
        if not m:
            continue
        parent = {"id": m.group(1), "label": m.group(2),
                  "roles": roles_of(m.group(3)), "children": []}
        kids = re.search(r"children:\s*\[(.*)\]", raw, re.S)
        if kids:
            for km in ITEM.finditer(kids.group(1)):
                if km.group(1) == parent["id"]:
                    continue
                parent["children"].append({"id": km.group(1), "label": km.group(2),
                                           "roles": roles_of(km.group(3))})
        out.append(parent)
    return out

def mobile_sidebar():
    src = read(os.path.join(MOB, "pages/Sidebar.tsx"))
    block = re.search(r"const navGroups: NavGroup\[\] = \[(.*?)\n  \];", src, re.S).group(1)
    groups = []
    for gm in re.finditer(r"title:\s*'([^']+)',\s*items:\s*\[(.*?)\n\s*\],", block, re.S):
        items = []
        for m in ITEM.finditer(gm.group(2)):
            items.append({"id": m.group(1), "label": m.group(2),
                          "roles": roles_of(m.group(3)),
                          "roleIds": sorted({x.strip("'\" ") for x in roles_of(m.group(4))},
                                            key=lambda s: (len(s), s))})
        groups.append({"title": gm.group(1), "items": items})
    return groups

def mobile_menu():
    src = read(os.path.join(MOB, "pages/Menu.tsx"))
    groups = []
    for gm in re.finditer(r"title:\s*'([^']+)',\s*\n\s*items:\s*\[(.*?)\n\s*\]", src, re.S):
        ids = re.findall(r"\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']*)'", gm.group(2))
        if ids:
            groups.append({"title": gm.group(1),
                           "items": [{"id": i, "label": l} for i, l in ids]})
    return groups

SWITCH = re.compile(r"case\s*'([^']+)':\s*\n\s*return\s*<([A-Za-z0-9_]+)")

def routing(path):
    return [{"section": s, "component": c} for s, c in SWITCH.findall(read(path))]

data = {
    "web_sidebar": web_sidebar(),
    "web_routes": routing(os.path.join(WEB, "pages/Dashboard.tsx")),
    "mobile_sidebar": mobile_sidebar(),
    "mobile_menu": mobile_menu(),
    "mobile_routes": routing(os.path.join(MOB, "pages/Dashboard.tsx")),
}

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nav_data.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1)

print("web sidebar top-level:", len(data["web_sidebar"]),
      "children:", sum(len(i["children"]) for i in data["web_sidebar"]))
print("web routes:", len(data["web_routes"]))
print("mobile nav groups:", len(data["mobile_sidebar"]),
      "items:", sum(len(g["items"]) for g in data["mobile_sidebar"]))
print("mobile menu groups:", len(data["mobile_menu"]),
      "items:", sum(len(g["items"]) for g in data["mobile_menu"]))
print("mobile routes:", len(data["mobile_routes"]))
print("wrote", out)

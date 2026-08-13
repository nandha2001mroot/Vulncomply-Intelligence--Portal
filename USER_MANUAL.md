# 📘 VulnComply Intelligence — User Manual

> How to use every feature, effectively. ~10 min read.

---

## 1 · First run

1. Open `index.html` (or your hosted URL). You land on the **Dashboard**.
2. Sidebar = modules. Top-right = theme toggle + **⌘** (command palette).
3. Press **Ctrl+K** anytime. Ships with a 12-CVE demo + 120 controls so everything works offline.

---

## 2 · The 60-second tour

| Page | What it does |
|---|---|
| **Dashboard** | posture at a glance + **⚡ Today's Focus** (top-5 to patch) + risk gauge |
| **Vulnerabilities** | triage queue: filter/sort by Priority, CVSS, EPSS, KEV, SLA |
| **CVE Search** | look up any CVE (local + live NVD) |
| **Compliance** | score vs 120 controls; category breakdown; recommendations |
| **Controls** | assess each control with evidence/owner/date |
| **ATT&CK & Concealment** | how they attack vs how they hide |
| **Vendor Roll-Up** | which vendors drive your risk |
| **Remediation Board** | kanban: Open / In Progress / Remediated |
| **Threat Globe** | 3D real-time attack map |
| **Reports** | Executive / Vulnerability / Compliance → JSON/CSV/Excel/HTML |
| **Settings** | theme, SLA targets, live toggles, import/export |

---

## 3 · Core workflows

### A · Triage a CVE (2 min)
1. **CVE Search** → enter ID → **View**.
2. Read **Priority → SLA → Mitigating Controls** in that order.
3. Click a mitigating control → **Assess** it (or confirm in place).
4. **🎫 Copy Ticket** for your tracker; **Mark Remediated** when done.

### B · Run a compliance assessment (first time)
1. **Controls** → filter Category → assess each with evidence.
2. Watch **Compliance Score** climb and **Risk** fall on the Dashboard.

### C · Build the weekly queue
1. **Vulnerabilities** → sort by **Priority**; work P1→P2; watch **SLA** for overdue.
2. Track on the **Remediation Board**.

### D · Report to leadership
1. **Reports → Executive** → export, or use **Executive Narrative → Generate → Copy**.

---

## 4 · Feature details

- **Today's Focus**: top-5 by KEV + EPSS + SLA-overdue + severity. **Done** = mark remediated.
- **Priority (P1–P5)**: multi-factor (KEV, EPSS, CVSS, exploit, asset). Hover/explanation tells you *why*.
- **SLA**: configurable days per severity (Settings). Shows `Overdue Nd / Due in Nd / Remediated`.
- **CVE details**: CVSS 3.1, EPSS, KEV, priority, SLA, mitigating controls, remediation, 🎫 ticket.
- **Threat Globe**: drag=rotate, scroll=zoom, **War Room**=full-screen, chips filter attack type, 24h timeline below.
- **Command palette (Ctrl+K)**: type CVE / control / page / action; ↑↓ + Enter.
- **Deep links**: `#/cve/…`, `#/control/…`, `#/live` — share or bookmark.

---

## 5 · Data in / out

- **Export**: Settings → JSON / CSV / Excel(.xls) / HTML.
- **Import**: JSON (backups) / CSV (auto-detects vulnerabilities vs assessments).
- Everything lives in **your browser**; **Clear All Data** resets.

---

## 6 · Shortcuts

| Key | Action |
|---|---|
| `Ctrl/⌘+K` | command palette |
| `Enter` | run search |
| `↑/↓/Enter` | navigate palette |
| `Esc` | close modal/palette |

---

## 7 · Troubleshooting

| Symptom | Fix |
|---|---|
| Dark text dim | hard-refresh (`Ctrl+Shift+R`) |
| Search slow | unknown CVE hits live NVD once (~≤5s) then caches; local = instant |
| Map blank | needs WebGL/network; offline shows fallback + feed still works |
| Data lost | `localStorage` is per-browser; use Export/Import to move/backup |

---

## 8 · Glossary

**CVSS** severity 0–10 · **EPSS** exploitation likelihood 0–1 · **KEV** CISA known-exploited ·
**SLA** your remediation deadline · **P1–P5** priority tiers.

---

> 💡 **Tip:** make it a daily habit — open Dashboard, clear **Today's Focus**, done.
<div align="center">

# 🛡️ VulnComply Intelligence

### *Vulnerability & Compliance Intelligence Portal*

**One privacy-first, client-side platform for CVE exploit intelligence, vulnerability
prioritization, security-compliance assessment, and real-time threat mapping.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-emerald.svg)](#)
[![Static](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-critical.svg)](#)
[![No-Backend](https://img.shields.io/badge/backend-none-brightgreen.svg)](#)
[![GitHub%20Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-181717?logo=github)](#)

<p>
  <a href="#-quick-start"><b>Quick Start</b></a> •
  <a href="#-features"><b>Features</b></a> •
  <a href="#-live-demo"><b>Demo</b></a> •
  <a href="#-architecture"><b>Architecture</b></a> •
  <a href="#-deployment"><b>Deploy</b></a> •
  <a href="#-docs"><b>Docs</b></a>
</p>

</div>

---

> **🔒 Privacy-first by design** — 100% client-side. No backend, no database, no API keys,
> no telemetry. Everything you enter stays in **your browser**.

---

## ✨ Why VulnComply?

Security teams drown in CVEs. VulnComply answers the **three questions that matter**:

| ❓ Question | 🧠 How VulnComply answers |
|---|---|
| **What's dangerous?** | CVE search + CVSS 3.1 + EPSS + CISA KEV + exploit intel |
| **How exposed am I?** | Asset context + live 3D threat globe + priority scoring |
| **What do I fix first?** | P1–P5 priority, SLA/overdue, kanban board, compliance gaps |

---

## 🚀 Quick Start

```bash
# 1 · Clone
git clone https://github.com/<you>/vulncomply-intelligence.git
cd vulncomply-intelligence

# 2 · Run (any static server)
python3 -m http.server 8000        # or: npx serve · php -S localhost:8000

# 3 · Open
# http://localhost:8000
```

> 💡 **No build step, no install, no keys.** You can even double-click `index.html`.

---

## 🎯 Features

<details open>
<summary><b>🧨 Vulnerability Intelligence</b></summary>

- 🔍 CVE search (local + **live NVD**, cached & timeout-safe)
- 🧮 **CVSS v3.1** engine — parse, calculate, visualize vectors
- 📈 **EPSS** exploitation likelihood + percentile
- 🚨 **CISA KEV** status, due dates, ransomware links
- 💥 Exploit maturity + MITRE ATT&CK technique mapping
- 🎯 **P1–P5 multi-factor priority** with plain-English explanations
</details>

<details open>
<summary><b>🧾 Compliance & Risk</b></summary>

- 📋 **120 security controls** across 8 domains (CIS / NIST / ISO 27001 / MS-baseline *aligned*)
- ✅ Assess with evidence, owner, remediation date
- 📊 Weighted compliance scoring + per-category & per-framework breakdowns
- 🔗 **Control ↔ CVE linkage** (see what each control mitigates)
- 🗂️ **Kanban remediation board** + **SLA / overdue tracking**
- 🧮 Unified **0–100 Enterprise Risk Score** (60% vuln + 40% compliance)
</details>

<details open>
<summary><b>🌐 Real-Time Threat Map</b></summary>

- 🌍 3D rotating globe (Three.js) with animated attack arcs
- 📡 **Live** `ipsum` threat feed + `ipwho.is` geo (key-less), KEV fallback offline
- 🎛️ Attack-type filters (RCE / Phishing / DDoS / …) + 24h timeline
- 🖥️ **War-Room** full-screen mode
</details>

<details open>
<summary><b>⚡ Productivity</b></summary>

- 🎯 **Today's Focus** — top-5 to patch today, one-click done
- 📝 **Auto executive narrative** with copy-to-clipboard
- 🎫 **Copy-as-ticket** (Jira / ServiceNow-ready) for CVEs & controls
- ⌨️ **Ctrl+K command palette**, deep-links, saved state
- 📤 Export **JSON / CSV / Excel / HTML** · Import **JSON / CSV**
</details>

---

## 🧩 ATT&CK & Concealment

A dual-view matrix: **Enterprise ATT&CK** (how they attack, from *your* CVEs) and the
**Concealment Matrix** (how they hide — 13 OpSec tactics, 🔴 Technical / 🟠 Behavioral / 🔵 Physical),
with category filters, search, and expandable sub-technique counts.

---

## 🏗️ Architecture

```
vulncomply-intelligence/
├── index.html                  # SPA shell (dark/light, sidebar, palette, modals)
├── css/        style.css · responsive.css
├── data/       (optional) demo datasets
└── js/
    ├── app.js                  # router + all page renderers (v3.1)
    ├── live-data.js            # timed + cached live fetch (NVD/KEV/EPSS)
    ├── vulnerability/  cvss · epss · kev · priority · cve-search · sla · attack
    ├── compliance/     controls-data · scoring · mitigation
    ├── reports/        report-engine
    ├── storage/        storage (localStorage)
    ├── utils/          formatters · validators
    └── ui/  feature4 · concealment · threat-globe · fast-details · productivity · data-io
```

**Data flow (the whole point):**

```
CVE Intel → Vulnerability Risk → Asset Context → Compliance Impact → Remediation → Enterprise Risk
```

---

## 🌱 Live Data Sources (key-less, CORS-enabled)

| Source | What | Fallback |
|---|---|---|
| NVD | CVE details / recent | demo data |
| CISA KEV | known-exploited catalog | demo data |
| FIRST EPSS | exploitation probability | demo data |
| `ipsum` + `ipwho.is` | live attack sources + geo | KEV simulation |

> Offline / air-gapped? Everything degrades gracefully to bundled demo data.

---

## 🚢 Deployment

<details>
<summary><b>GitHub Pages (recommended)</b></summary>

1. Push to GitHub → **Settings → Pages** → *Deploy from branch* → `main` / `/ (root)`.
2. `.github/workflows/deploy.yml` automates it.
3. Visit `https://<you>.github.io/vulncomply-intelligence/`.
</details>

<details>
<summary><b>Any static host / on-prem</b></summary>

Netlify · Vercel · Cloudflare Pages · S3+CloudFront · nginx/Apache/IIS — just serve the folder.
See [`INTEGRATION.md`](INTEGRATION.md) for an nginx + CSP snippet and SOC-embedding (iframe / deep-links).
</details>

---

## 📚 Docs

| Doc | Purpose |
|---|---|
| [`USER_MANUAL.md`](USER_MANUAL.md) | Step-by-step guide to use every feature |
| [`INTEGRATION.md`](INTEGRATION.md) | Embed/deploy in your environment |
| [`LICENSE`](LICENSE) | MIT |

---

## 🧪 Testing & Trust

- Deterministic **CVSS 3.1** math, weighted compliance scoring, and priority model.
- No `eval` / dynamic code; imported data is sanitized; HTML-escaped output.
- Add a `#/tests` harness (roadmap) to self-verify the math in-browser.

---

## 🗺️ Roadmap

- [ ] PWA + Service Worker (installable, offline)
- [ ] ATT&CK coverage heatmap from passed controls
- [ ] Asset inventory + per-asset risk roll-up
- [ ] Assessment diff (before/after)
- [ ] i18n + full a11y pass

---

## 🤝 Contributing

Fork → branch → commit → PR. Keep it **client-side**, dependency-light, and honest
(label demo/simulated data clearly). Issues & ideas welcome.

---

## 👤 Author

**Nandha Kumar M** — Senior Cybersecurity Engineer
[LinkedIn ↗](https://www.linkedin.com/in/nandha-kumar-m-952342159/)

---

## ⚖️ License

MIT © 2025 Nandha Kumar M — free for personal & commercial use. See [`LICENSE`](LICENSE).

---

## ⚠️ Disclaimer

VulnComply provides **security intelligence & assessment support**. It does not replace
professional vulnerability assessment, vendor advisories, penetration testing, or compliance
audits. Framework mappings are *aligned/inspired*, not official certifications.
Threat-map arcs are illustrative (live public feeds + KEV-derived simulation).

---

<div align="center">

**Built with ❤️ for defenders — because "patch everything" isn't a strategy.**

</div>
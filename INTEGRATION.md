# 🔌 VulnComply Intelligence — Integration Guide

> **100% client-side.** No backend, no database, no API keys, no telemetry.
> Integration = *hosting static files* + (optionally) feeding data / embedding.

---

## 1 · Architecture at a glance

- **Static site**: HTML + CSS + vanilla ES6 JS. No build step.
- **State**: browser `localStorage` (per user/device). Nothing leaves the browser.
- **Live data (optional, key-less, CORS-enabled)** with graceful offline fallback:

| Source | Endpoint | Key | Purpose |
|---|---|---|---|
| NVD | `https://services.nvd.nist.gov/rest/json/cves/2.0` | No | CVE details / recent |
| CISA KEV | `…/feeds/known_exploited_vulnerabilities.json` | No | known-exploited catalog |
| FIRST EPSS | `https://api.first.org/epss/epss?cve=…` | No | exploitation probability |
| `ipsum` | `raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt` | No | live malicious source IPs |
| `ipwho.is` | `https://ipwho.is/{ip}` | No | IP geolocation |

Offline / air-gapped → everything degrades to bundled demo data.

---

## 2 · Deploy options

### A · GitHub Pages (recommended, free)
1. Push repo → **Settings → Pages** → *Deploy from branch* → `main` / `/ (root)`.
2. `.github/workflows/deploy.yml` automates it.
3. Open `https://<org>.github.io/<repo>/`.

### B · Any static host
Netlify · Vercel · Cloudflare Pages · AWS S3+CloudFront · Azure Static Web Apps —
connect the repo or upload the folder.

### C · On-prem / air-gapped (nginx example)
```nginx
server {
  listen 80;
  server_name vulncomply.internal;
  root /var/www/vulncomply-intelligence;
  index index.html;
  add_header Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com; img-src 'self' data: https://*.basemaps.cartocdn.com; connect-src 'self' https://services.nvd.nist.gov https://www.cisa.gov https://api.first.org https://ipwho.is https://raw.githubusercontent.com https://api.allorigins.win;";
}
```
Fully offline: serve locally or open `index.html`; live features disable gracefully.

---

## 3 · Feeding it YOUR data

| Method | Where | Notes |
|---|---|---|
| **Import JSON** | Settings → Data Management | backups / assessments |
| **Import CSV** | Settings → Data Management | auto-detects Vulnerabilities vs Control-Assessments CSV |
| **Live CVE** | CVE Search | live NVD, cached |
| **Extend dataset** | `js/vulnerability/cve-search.js` | embedded demo CVEs |

Assessments, evidence, SLA, remediation, asset context all persist in `localStorage`;
export via **Settings → Export** (JSON / CSV / Excel / HTML).

---

## 4 · Embedding into your SOC / portal

- **iframe** (dashboards, SOAR, wiki):
  ```html
  <iframe src="https://your-host/#/live" style="width:100%;height:640px;border:0"></iframe>
  ```
- **Deep links** (tickets / SOAR / reports):
  - CVE detail → `https://your-host/#/cve/CVE-2021-44228`
  - Control → `https://your-host/#/control/EP-008`
  - Threat globe → `https://your-host/#/live`
- **Egress to SIEM / CMDB**: export **JSON / CSV / Excel / HTML** and ingest downstream.
- **Copy-as-ticket**: 🎫 button produces Jira/ServiceNow-ready text.

---

## 5 · Security review checklist

- ✅ No telemetry / accounts / backend; data stays client-side.
- ✅ Imported data sanitized; no `eval`/dynamic code; HTML-escaped output.
- ✅ CDN assets via SRI-capable CDNs; CSP header recommended (above).
- ⚠️ `localStorage` is per-browser — not a shared team DB.
- ⚠️ Live feeds subject to CORS / rate limits; degrades to demo data.

---

## 6 · Limitations

- Client-side only → no central/shared state across users.
- Live enrichment needs internet; air-gapped = demo data.
- Not a scanner — it consumes/visualizes data you provide or public feeds.
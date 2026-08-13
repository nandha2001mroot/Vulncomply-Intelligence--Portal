# VulnComply Intelligence

**Vulnerability & Compliance Intelligence Portal**

A professional, open-source cybersecurity platform combining CVE exploit intelligence, vulnerability prioritization, security compliance assessment, and unified risk scoring.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-success.svg)

## Overview

VulnComply Intelligence is a client-side security intelligence platform that helps security professionals:

- **Analyze CVEs** with CVSS, EPSS, and CISA KEV data
- **Prioritize vulnerabilities** using multi-factor risk scoring
- **Assess compliance** against CIS, NIST, ISO 27001, and Microsoft baselines
- **Track remediation** with evidence management
- **Generate reports** in HTML, JSON, and CSV formats
- **Correlate vulnerabilities** with compliance gaps

### Key Differentiators

- **Privacy-First**: All data stays in your browser (no backend required)
- **No API Keys**: Works completely offline with demo datasets
- **Multi-Factor Prioritization**: Beyond CVSS - considers EPSS, KEV, exploit maturity, asset context
- **Compliance Correlation**: Links vulnerability risk to control gaps
- **Enterprise UI**: Professional dashboard inspired by SIEM and vulnerability management platforms
- **GitHub Pages Ready**: Deploy instantly without build tools

## Features

### Vulnerability Intelligence

- **CVE Search**: Search by CVE ID, vendor, product, keyword, CWE
- **CVSS v3.1**: Parse and calculate CVSS scores with visual indicators
- **EPSS Integration**: Exploit prediction scoring with percentile ranking
- **CISA KEV**: Known Exploited Vulnerabilities tracking with due dates
- **Exploit Intelligence**: Public exploit references, maturity levels
- **Vendor Advisories**: Direct links to vendor security bulletins

### Vulnerability Prioritization

Multi-factor priority scoring (0-100) considering:
- CISA KEV status (highest weight)
- EPSS score and percentile
- CVSS base score
- Exploit availability and maturity
- Ransomware association
- Asset criticality
- Internet exposure

Priority Levels:
- **P1 - Emergency** (80-100): Immediate action required
- **P2 - Critical** (60-79): Address within 24 hours
- **P3 - High** (40-59): Address within 7 days
- **P4 - Medium** (20-39): Address within 30 days
- **P5 - Low** (0-19): Standard monitoring

### Security Compliance

**120 Meaningful Controls** across 8 categories:

- **Identity** (15 controls): MFA, privileged accounts, password policies
- **Endpoint Security** (20 controls): Defender, firewall, EDR, BitLocker
- **Windows Hardening** (20 controls): SMBv1, PowerShell, RDP, LSA protection
- **Vulnerability Management** (15 controls): Patch management, KEV remediation
- **Network Security** (15 controls): Firewall, segmentation, VPN
- **Application Security** (12 controls): Allowlisting, macros, browser security
- **Data Protection** (13 controls): Encryption, backup, DLP
- **Monitoring** (10 controls): Logging, SIEM, alerting, incident response

### Unified Risk Scoring

**Enterprise Security Risk Score (0-100)** combining:
- Vulnerability Risk (60% weight)
- Compliance Risk (40% weight)
- KEV exposure
- Critical asset context
- Failed controls

## Installation

### Option 1: GitHub Pages (Recommended)

1. Fork or clone this repository
2. Enable GitHub Pages in repository settings
3. Select branch (main/master) and folder (root)
4. Access at `https://yourusername.github.io/vulncomply-intelligence/`

### Option 2: Local Development

```bash
git clone https://github.com/yourusername/vulncomply-intelligence.git
cd vulncomply-intelligence
python -m http.server 8000
# Open http://localhost:8000
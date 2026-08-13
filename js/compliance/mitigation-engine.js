/**
 * VulnComply Intelligence - Control <-> CVE Linkage Engine
 * Maps vulnerabilities to the controls that mitigate them (and vice-versa).
 * Curated for known CVEs + heuristic for any live NVD CVE.
 * @author Nandha Kumar M | @license MIT
 */
class MitigationEngine {
    constructor() {
        // [controlId, strength, how-it-mitigates]
        this.curated = {
            "CVE-2024-3094": [["VM-004","primary","Software inventory detects unexpected liblzma"],["VM-005","primary","Flag/remove untrusted builds"],["MN-009","supporting","Anomaly detection spots backdoor behavior"],["AS-001","supporting","Allowlisting blocks unapproved libraries"]],
            "CVE-2024-27198": [["VM-002","primary","Patch critical auth bypass"],["VM-003","primary","KEV-listed - remediate fast"],["ID-001","supporting","MFA limits abused admin sessions"],["NS-011","supporting","Isolate build servers"]],
            "CVE-2023-44487": [["EP-011","primary","Apply vendor HTTP/2 patches"],["NS-001","primary","Firewall/rate-limiting absorbs flood"],["NS-009","supporting","Monitoring detects rapid-reset"]],
            "CVE-2023-4966": [["VM-002","primary","Patch Citrix"],["VM-003","primary","KEV-listed"],["NS-011","primary","Isolate ADC in DMZ"],["ID-001","supporting","MFA protects sessions"],["DP-002","supporting","Encrypt in transit"]],
            "CVE-2023-22515": [["VM-002","primary","Patch Confluence"],["VM-003","primary","KEV-listed"],["ID-006","supporting","Least privilege limits impact"],["NS-011","supporting","Isolate wiki"]],
            "CVE-2023-23397": [["EP-011","primary","Patch Outlook"],["WH-013","primary","Block legacy NTLM"],["NS-008","primary","Egress-filter outbound NTLM"],["ID-001","supporting","MFA limits hash reuse"]],
            "CVE-2023-46805": [["VM-002","primary","Patch Ivanti"],["VM-003","primary","KEV-listed"],["NS-003","primary","Harden remote access"],["ID-001","primary","MFA blocks bypassed auth"]],
            "CVE-2023-27997": [["VM-002","primary","Patch FortiOS"],["VM-003","primary","KEV-listed"],["NS-004","primary","Harden VPN"],["NS-001","supporting","Perimeter filtering"]],
            "CVE-2023-0669": [["VM-002","primary","Patch GoAnywhere"],["VM-003","primary","KEV-listed"],["NS-011","primary","Isolate MFT"],["DP-007","supporting","DLP limits exfil"]],
            "CVE-2021-44228": [["VM-002","primary","Patch Log4j"],["VM-003","primary","KEV-listed"],["EP-011","primary","Patch mgmt"],["NS-008","primary","Egress-filter LDAP/JNDI"],["AS-001","supporting","Allowlisting"],["EP-006","supporting","EDR detects post-exploit"]],
            "CVE-2020-1472": [["EP-011","primary","Patch Netlogon"],["VM-002","primary","Patch DCs"],["ID-007","primary","Protect DA accounts"],["EP-014","supporting","Credential Guard"]],
            "CVE-2019-0708": [["EP-011","primary","Patch RDP"],["WH-007","primary","Disable/restrict RDP"],["WH-008","primary","Enforce NLA"],["NS-001","supporting","Block 3389 at perimeter"]]
        };
    }
    controlById(id) { return (window.VC_CONTROLS || []).find(c => c.id === id) || null; }

    getControlsForCve(cve) {
        const raw = this.curated[cve.id] || this.heuristic(cve);
        const map = {};
        raw.forEach(r => { const [cid, strength, how] = r; if (!map[cid] || strength === 'primary') map[cid] = { id: cid, strength, how }; });
        return Object.values(map).map(m => { const c = this.controlById(m.id); return { id: m.id, name: c ? c.name : m.id, category: c ? c.category : '', strength: m.strength, how: m.how }; })
            .sort((a, b) => (a.strength === b.strength ? 0 : (a.strength === 'primary' ? -1 : 1)));
    }

    getCvesForControl(controlId) {
        const all = window.cveSearch ? window.cveSearch.cveData : [];
        return all.filter(c => this.getControlsForCve(c).some(l => l.id === controlId));
    }

    /* Heuristic mapping for any (live) CVE based on CVSS / CWE / exploitation */
    heuristic(cve) {
        const out = [];
        const sev = (cve.cvss && cve.cvss.baseScore) || 0;
        const av = cve.cvss && cve.cvss.attackVector;
        const cw = (cve.cwe || []).join(',');
        if (sev >= 7) out.push(['VM-002', 'primary', 'Patch critical/high vulnerabilities promptly']);
        out.push(['VM-001', 'supporting', 'Continuous scanning to detect this weakness']);
        if (cve.knownExploitation) out.push(['VM-003', 'primary', 'Track & remediate known-exploited vulns']);
        if (av === 'Network') out.push(['NS-001', 'supporting', 'Perimeter firewall reduces exposure']);
        if (/502|94|77|78|20|506/.test(cw)) out.push(['AS-001', 'primary', 'Allowlisting blocks unapproved code'], ['EP-016', 'supporting', 'Exploit protection mitigates code execution']);
        if (/287|288|863|269|285/.test(cw)) out.push(['ID-001', 'primary', 'MFA limits abused credentials'], ['ID-006', 'supporting', 'Least privilege limits blast radius']);
        if (/119|120|122|416|787|125/.test(cw)) out.push(['EP-016', 'primary', 'Exploit protection mitigates memory corruption'], ['EP-006', 'supporting', 'EDR detects post-exploitation']);
        if (/200|201|202/.test(cw)) out.push(['DP-002', 'supporting', 'Encrypt data in transit'], ['DP-007', 'supporting', 'DLP limits disclosure impact']);
        if (/400|770/.test(cw)) out.push(['NS-009', 'primary', 'Monitoring detects flood/DoS'], ['NS-001', 'supporting', 'Firewall rate limiting']);
        if (cve.exploitAvailable) out.push(['EP-006', 'supporting', 'EDR detects active exploitation']);
        return out.slice(0, 8);
    }
}
window.MitigationEngine = new MitigationEngine();
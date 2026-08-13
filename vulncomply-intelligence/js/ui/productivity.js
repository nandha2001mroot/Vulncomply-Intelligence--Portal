/**
 * VulnComply Intelligence - Productivity Pack
 * #1 Today's Focus  #2 Executive Narrative  #3 Copy-as-Ticket
 * @author Nandha Kumar M | @license MIT
 */
(function () {
    const esc = s => Formatters.escapeHtml(s);

    /* ---------- #1 Today's Focus ---------- */
    function focusList() {
        const out = [];
        window.cveSearch.cveData.forEach(c => {
            if (window.SlaEngine.evaluate(c).status === 'remediated') return;
            const epss = window.EpssEngine.getEpss(c.id);
            const sla = window.SlaEngine.evaluate(c);
            const kev = window.KevEngine.isKev(c.id);
            let s = 0; const why = [];
            if (kev) { s += 40; why.push('KEV'); }
            if (epss && epss.score >= 0.5) { s += 25; why.push('High EPSS'); } else if (epss && epss.score >= 0.2) { s += 15; why.push('EPSS'); }
            if (sla.status === 'overdue') { s += 20; why.push('Overdue'); } else if (sla.status === 'due-soon') { s += 10; why.push('Due soon'); }
            if (c.severity === 'Critical') { s += 15; why.push('Critical'); } else if (c.severity === 'High') { s += 8; why.push('High'); }
            if (c.exploitAvailable) { s += 5; why.push('Exploit'); }
            if (s > 0) out.push({ cve: c, score: s, why });
        });
        return out.sort((a, b) => b.score - a.score).slice(0, 5);
    }
    function focusHTML() {
        const list = focusList();
        if (!list.length) return '';
        return `<div class="card" style="margin-bottom:20px;border-left:4px solid var(--danger-color)">
        <div class="card-header"><h3 class="card-title"><i class="bi bi-lightning-charge-fill" style="color:var(--warning-color)"></i> Today's Focus — patch these first</h3><span class="badge badge-critical">${list.length}</span></div>
        ${list.map(x => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)">
            <div style="flex:1;min-width:0">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><a href="#" onclick="window.app.showCveDetails('${x.cve.id}');return false"><strong>${x.cve.id}</strong></a><span class="badge badge-${String(x.cve.severity).toLowerCase()}">${x.cve.severity}</span>${x.why.map(w => `<span class="badge badge-info">${w}</span>`).join('')}</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${esc(Formatters.truncate(x.cve.title, 70))}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
                <button class="btn btn-sm btn-outline" onclick="window.appProductivity.ticket('${x.cve.id}')" title="Copy as ticket"><i class="bi bi-ticket-perforated"></i></button>
                <button class="btn btn-sm btn-success" onclick="window.appProductivity.done('${x.cve.id}')"><i class="bi bi-check2"></i> Done</button>
            </div>
        </div>`).join('')}
        </div>`;
    }
    function injectFocus() {
        const pc = document.getElementById('currentPage'); if (!pc) return;
        const mg = pc.querySelector('.metrics-grid'); if (mg) mg.insertAdjacentHTML('beforebegin', focusHTML());
    }
    function done(id) { window.app.markRemediated(id); window.app.renderDashboard(document.getElementById('currentPage')); }

    /* ---------- #2 Executive Narrative ---------- */
    function genNarrative() {
        const app = window.app;
        const risk = app.calculateUnifiedRiskScore();
        const comp = app.getComplianceStats();
        const stats = window.cveSearch.getStatistics();
        const focus = focusList();
        const a = app.storage ? window.storage.getComplianceAssessment() : {};
        const recs = window.ComplianceScoringEngine.generateRecommendations(app.controlsData, (a && a.controls) || {}).slice(0, 3);
        const top = focus.slice(0, 3).map(x => x.cve.id).join(', ') || 'none identified';
        return `As of ${new Date().toLocaleDateString()}, our enterprise security risk stands at ${risk.score}/100 (${risk.level}), driven primarily by ${stats.kevCount} CISA Known-Exploited vulnerabilities and ${stats.critical} critical CVEs; the top items requiring immediate action are ${top}. Security compliance is at ${comp.score}% (${comp.failed} failed, ${comp.partial} partial controls), with the weakest areas being ${Object.entries((window.ComplianceScoringEngine.calculateScore(app.controlsData, (a && a.controls) || {}).categoryScores || {})).sort((x, y) => x[1].score - y[1].score).slice(0, 2).map(x => x[0]).join(' and ') || 'n/a'}. Recommended next steps: ${recs.map(r => r.controlName).join('; ') || 'continue monitoring'}. Vulnerability risk contributes ${risk.vulnRisk}/100 and compliance risk ${risk.complianceRisk}/100 to the overall score.`;
    }
    function narrativeCard() {
        return `<div class="card" style="margin-top:16px"><div class="card-header"><h3 class="card-title"><i class="bi bi-file-earmark-text"></i> Executive Narrative (auto-written)</h3><button class="btn btn-sm btn-primary" onclick="window.appProductivity.genNarr()"><i class="bi bi-magic"></i> Generate</button></div>
        <div id="narrBox" style="display:none"><textarea class="form-textarea" id="narrText" style="min-height:120px" readonly></textarea><div style="margin-top:8px;display:flex;gap:8px"><button class="btn btn-sm btn-success" onclick="window.appProductivity.copyNarr()"><i class="bi bi-clipboard-check"></i> Copy</button></div></div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Generates a leadership-ready summary from your live risk, compliance, and focus data.</p></div>`;
    }
    function genNarr() { const b = document.getElementById('narrBox'); const t = document.getElementById('narrText'); t.value = genNarrative(); b.style.display = 'block'; }
    function copyNarr() { copyText(document.getElementById('narrText').value, 'Narrative copied'); }

    /* ---------- #3 Copy-as-Ticket ---------- */
    function cveTicket(id) {
        const c = window.cveSearch.getCveById(id); if (!c) return;
        const p = window.PriorityEngine.calculatePriority(c, window.storage.getAssetContext(id));
        const sla = window.SlaEngine.evaluate(c);
        const epss = window.EpssEngine.getEpss(id);
        return `[${p.priorityCode}] ${c.id} - ${c.title}
Priority: ${p.priority} (score ${p.score}/100)
Severity: ${c.severity} | CVSS: ${c.cvss ? c.cvss.baseScore : 'N/A'} | EPSS: ${epss ? epss.score.toFixed(3) : 'N/A'}
CISA KEV: ${window.KevEngine.isKev(id) ? 'YES' : 'No'} | Exploit: ${c.exploitAvailable ? 'Available' : 'None'} | SLA: ${sla.label}
Product: ${c.vendor} ${c.product}
Summary: ${c.description}
Remediation: ${c.remediation}
Reference: ${c.vendorAdvisory || 'https://nvd.nist.gov/vuln/detail/' + id}
-- Generated by VulnComply Intelligence`;
    }
    function controlTicket(id) {
        const c = (window.app.controlsData || []).find(x => x.id === id); if (!c) return '';
        const a = window.storage.getControlAssessment(id) || {};
        return `[Control ${c.severity}] ${c.id} - ${c.name}
Framework: ${c.framework} | Category: ${c.category}
Status: ${a.status || 'Not Assessed'} | Owner: ${a.owner || 'Unassigned'} | Remediate by: ${a.remediationDate || 'TBD'}
Finding: ${c.description}
Action: ${c.recommendation}
Evidence: ${a.evidence || 'None'}
-- Generated by VulnComply Intelligence`;
    }
    function copyText(text, msg) {
        const done = () => window.app.showToast('Copied', msg || 'Copied to clipboard', 'success');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallback());
        else fallback();
        function fallback() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { } ta.remove(); }
    }
    function ticket(id) { copyText(cveTicket(id), id + ' ticket copied'); }
    function ticketControl(id) { copyText(controlTicket(id), id + ' ticket copied'); }

    /* ---------- wire into app ---------- */
    function wrapApp() {
        const app = window.app; if (!app || app.__prodWrapped) return; app.__prodWrapped = true;
        // #1 focus on dashboard
        const oDash = app.renderDashboard.bind(app);
        app.renderDashboard = function (c, ...a) { const r = oDash(c, ...a); injectFocus(); return r; };
        // #2 narrative on reports
        const oRep = app.renderReportsPage.bind(app);
        app.renderReportsPage = function (c, ...a) { const r = oRep(c, ...a); c.insertAdjacentHTML('beforeend', narrativeCard()); return r; };
        // #3 ticket button on CVE modal
        const oShow = app.showCveDetails.bind(app);
        app.showCveDetails = async function (id, ...a) { const r = await oShow(id, ...a); const f = document.getElementById('modalFooter'); if (f && !f.querySelector('[data-tkt]')) f.insertAdjacentHTML('afterbegin', `<button data-tkt class="btn btn-outline" onclick="window.appProductivity.ticket('${id}')"><i class="bi bi-ticket-perforated"></i> Copy Ticket</button>`); return r; };
        // #3 ticket button on control assess modal
        const oAssess = app.assessControl.bind(app);
        app.assessControl = function (id, ...a) { const r = oAssess(id, ...a); const f = document.getElementById('modalFooter'); if (f && !f.querySelector('[data-tkt]')) f.insertAdjacentHTML('afterbegin', `<button data-tkt class="btn btn-outline" onclick="window.appProductivity.ticketControl('${id}')"><i class="bi bi-ticket-perforated"></i> Copy Ticket</button>`); return r; };
    }

    document.addEventListener('DOMContentLoaded', wrapApp);
    window.appProductivity = { done, ticket, ticketControl, genNarr, copyNarr };
})();
/**
 * VulnComply Intelligence - Extended Data I/O (Excel/CSV/HTML export + CSV import)
 * @author Nandha Kumar M | @license MIT
 */
(function () {
    const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

    /* ---------- builders ---------- */
    function vulnRows() {
        return window.cveSearch.cveData.map(c => {
            const p = window.PriorityEngine.calculatePriority(c, window.storage.getAssetContext(c.id));
            const s = window.SlaEngine.evaluate(c);
            const e = window.EpssEngine.getEpss(c.id);
            return [c.id, c.title, c.severity, c.cvss ? c.cvss.baseScore : '', e ? e.score.toFixed(4) : '', window.KevEngine.isKev(c.id) ? 'YES' : 'No', p.priorityCode, s.label];
        });
    }
    function assessRows() {
        const a = window.storage.getComplianceAssessment().controls || {};
        return (window.app.controlsData || []).map(c => {
            const x = a[c.id] || {};
            return [c.id, c.name, c.category, c.framework, c.severity, x.status || 'Not Assessed', x.owner || '', x.remediationDate || '', (x.evidence || '').replace(/\n/g, ' ')];
        });
    }
    function assetRows() {
        return Object.entries(window.storage.getAllAssetContexts()).map(([id, x]) => [id, x.assetName || '', x.businessCriticality || '', x.internetExposed ? 'Yes' : 'No', x.owner || '']);
    }
    function remRows() {
        return Object.entries(window.storage.getAllRemediationItems()).map(([id, x]) => [id, x.status || '', x.date || '']);
    }

    /* ---------- CSV ---------- */
    function exportCSV() {
        const L = [];
        L.push('# VULNERABILITIES'); L.push(['CVE', 'Title', 'Severity', 'CVSS', 'EPSS', 'KEV', 'Priority', 'SLA'].map(q).join(','));
        vulnRows().forEach(r => L.push(r.map(q).join(',')));
        L.push('', '# CONTROL ASSESSMENTS'); L.push(['ID', 'Name', 'Category', 'Framework', 'Severity', 'Status', 'Owner', 'RemediationDate', 'Evidence'].map(q).join(','));
        assessRows().forEach(r => L.push(r.map(q).join(',')));
        L.push('', '# ASSET CONTEXT'); L.push(['CVE', 'Asset', 'Criticality', 'InternetExposed', 'Owner'].map(q).join(','));
        assetRows().forEach(r => L.push(r.map(q).join(',')));
        L.push('', '# REMEDIATION'); L.push(['CVE', 'Status', 'Date'].map(q).join(','));
        remRows().forEach(r => L.push(r.map(q).join(',')));
        download(L.join('\n'), 'vulncomply-data.csv', 'text/csv');
        window.app.showToast('Exported', 'CSV downloaded', 'success');
    }

    /* ---------- Excel (.xls via HTML tables) ---------- */
    function exportExcel() {
        const tbl = (title, head, rows) => `<h3>${title}</h3><table border="1"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${String(c == null ? '' : c).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}</table><br>`;
        const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>` +
            tbl('Vulnerabilities', ['CVE', 'Title', 'Severity', 'CVSS', 'EPSS', 'KEV', 'Priority', 'SLA'], vulnRows()) +
            tbl('Control Assessments', ['ID', 'Name', 'Category', 'Framework', 'Severity', 'Status', 'Owner', 'RemediationDate', 'Evidence'], assessRows()) +
            tbl('Asset Context', ['CVE', 'Asset', 'Criticality', 'InternetExposed', 'Owner'], assetRows()) +
            tbl('Remediation', ['CVE', 'Status', 'Date'], remRows()) + `</body></html>`;
        download(html, 'vulncomply-data.xls', 'application/vnd.ms-excel');
        window.app.showToast('Exported', 'Excel (.xls) downloaded', 'success');
    }

    /* ---------- HTML report ---------- */
    function exportHTML() {
        const risk = window.app.calculateUnifiedRiskScore();
        const comp = window.app.getComplianceStats();
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VulnComply Data Export</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#1e293b}h1{color:#0ea5e9}table{border-collapse:collapse;width:100%;margin:12px 0;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#e2e8f0}.m{display:inline-block;margin:6px;padding:10px 14px;background:#f1f5f9;border-radius:6px}</style></head><body>
<h1>VulnComply Intelligence — Data Export</h1><p>Generated ${new Date().toLocaleString()} · Author Nandha Kumar M · MIT</p>
<div><span class="m"><strong>Risk:</strong> ${risk.score}/100 (${risk.level})</span><span class="m"><strong>Compliance:</strong> ${comp.score}%</span><span class="m"><strong>Tracked CVEs:</strong> ${window.cveSearch.cveData.length}</span><span class="m"><strong>KEV:</strong> ${window.KevEngine.count}</span></div>
<h2>Vulnerabilities</h2><table><tr><th>CVE</th><th>Title</th><th>Severity</th><th>CVSS</th><th>EPSS</th><th>KEV</th><th>Priority</th><th>SLA</th></tr>${vulnRows().map(r => `<tr>${r.map(c => `<td>${String(c).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}</table>
<h2>Control Assessments</h2><table><tr><th>ID</th><th>Name</th><th>Category</th><th>Framework</th><th>Severity</th><th>Status</th><th>Owner</th><th>RemediateBy</th></tr>${assessRows().map(r => `<tr>${r.slice(0, 8).map(c => `<td>${String(c).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}</table>
</body></html>`;
        download(html, 'vulncomply-export.html', 'text/html');
        window.app.showToast('Exported', 'HTML report downloaded', 'success');
    }

    function download(content, name, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    /* ---------- CSV import (auto-detect) ---------- */
    function parseCSV(text) {
        const rows = []; let cur = [], field = '', inQ = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += ch; }
            else if (ch === '"') inQ = true;
            else if (ch === ',') { cur.push(field); field = ''; }
            else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; cur.push(field); field = ''; if (cur.some(x => x.trim() !== '')) rows.push(cur); cur = []; }
            else field += ch;
        }
        cur.push(field); if (cur.some(x => x.trim() !== '')) rows.push(cur);
        return rows;
    }
    function importCSVFile(file) {
        const reader = new FileReader();
        reader.onload = ev => {
            const rows = parseCSV(ev.target.result).filter(r => !String(r[0]).startsWith('#'));
            if (!rows.length) { window.app.showToast('Import Failed', 'Empty CSV', 'error'); return; }
            const head = rows[0].map(h => h.trim());
            let added = 0;
            if (head[0] === 'CVE' && head.includes('Severity')) {
                rows.slice(1).forEach(r => {
                    const id = r[0]; if (!id || window.cveSearch.getCveById(id)) return;
                    window.cveSearch.cveData.push({ id, title: r[1] || id, severity: r[2] || 'Medium', cvss: r[3] ? { baseScore: parseFloat(r[3]), severity: r[2] } : null, vendor: 'Imported', product: r[1] || '', knownExploitation: r[5] === 'YES', remediation: '' });
                    added++;
                });
            } else if (head[0] === 'ID' && head.includes('Status')) {
                rows.slice(1).forEach(r => { window.storage.saveControlAssessment(r[0], { status: r[5] || 'Not Assessed', owner: r[6] || '', remediationDate: r[7] || '', evidence: r[8] || '' }); added++; });
            } else { window.app.showToast('Import Failed', 'Unrecognized CSV header (use an exported CSV)', 'error'); return; }
            window.app.showToast('Import Complete', `${added} rows imported`, 'success');
            window.app.renderSettingsPage(document.getElementById('currentPage'));
        };
        reader.readAsText(file);
    }
    function pickCSV() { const i = document.createElement('input'); i.type = 'file'; i.accept = '.csv,text/csv'; i.onchange = e => { if (e.target.files[0]) importCSVFile(e.target.files[0]); }; i.click(); }

    /* ---------- Settings card ---------- */
    function settingsCard() {
        return `<div class="card mt-2"><div class="card-header"><h3 class="card-title">Data Management — Extended Export / Import</h3></div>
        <div class="form-label">Export all data</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <button class="btn btn-sm btn-outline" onclick="window.app.exportAllData()"><i class="bi bi-filetype-json"></i> JSON</button>
            <button class="btn btn-sm btn-outline" onclick="window.appDataIO.csv()"><i class="bi bi-filetype-csv"></i> CSV</button>
            <button class="btn btn-sm btn-outline" onclick="window.appDataIO.excel()"><i class="bi bi-file-earmark-excel"></i> Excel</button>
            <button class="btn btn-sm btn-outline" onclick="window.appDataIO.html()"><i class="bi bi-filetype-html"></i> HTML</button>
        </div>
        <div class="form-label">Import</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" onclick="window.app.importData()"><i class="bi bi-upload"></i> Import JSON</button>
            <button class="btn btn-sm btn-outline" onclick="window.appDataIO.pick()"><i class="bi bi-upload"></i> Import CSV</button>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:10px">CSV import auto-detects a Vulnerabilities CSV or a Control-Assessments CSV (use an exported file as the template). Excel export produces an .xls that Excel/LibreOffice open directly.</p></div>`;
    }
    function wrapApp() {
        const app = window.app; if (!app || app.__ioWrapped) return; app.__ioWrapped = true;
        const oSet = app.renderSettingsPage.bind(app);
        app.renderSettingsPage = function (c, ...a) { const r = oSet(c, ...a); c.insertAdjacentHTML('beforeend', settingsCard()); return r; };
    }
    document.addEventListener('DOMContentLoaded', wrapApp);
    window.appDataIO = { csv: exportCSV, excel: exportExcel, html: exportHTML, pick: pickCSV };
})();
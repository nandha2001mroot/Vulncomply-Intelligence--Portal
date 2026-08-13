/**
 * VulnComply Intelligence - Fast Search + Fast Details (progressive, cached)
 * @author Nandha Kumar M | @license MIT
 */
(function () {
    const cache = {};
    const esc = s => Formatters.escapeHtml(s);

    async function getCveFast(id) {
        let c = window.cveSearch.getCveById(id); if (c) return c;
        if (cache['cve:' + id] !== undefined) return cache['cve:' + id];
        const d = await window.LiveData.fetchJson('https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=' + encodeURIComponent(id));
        let out = null;
        if (d && d.vulnerabilities && d.vulnerabilities.length) { out = window.cveSearch.mapNvdToCve(d.vulnerabilities[0].cve); if (out && !window.cveSearch.cveData.find(x => x.id === out.id)) window.cveSearch.cveData.push(out); }
        cache['cve:' + id] = out; return out;
    }
    async function getEpssFast(id) {
        let e = window.EpssEngine.getEpss(id); if (e) return e;
        if (cache['epss:' + id] !== undefined) return cache['epss:' + id];
        const d = await window.LiveData.fetchJson('https://api.first.org/epss/epss?cve=' + encodeURIComponent(id));
        let out = null; if (d && d.data && d.data.length) out = { score: parseFloat(d.data[0].epss), percentile: parseFloat(d.data[0].percentile) };
        cache['epss:' + id] = out; return out;
    }

    function renderResults(results, live) {
        return `<div class="card"><div class="card-header"><h3 class="card-title">Search Results (${results.length}) ${live ? '<span class="badge badge-info">LIVE NVD</span>' : ''}</h3></div><div class="card-body"><div class="table-container"><table class="data-table"><thead><tr><th>CVE</th><th>Title</th><th>Severity</th><th>CVSS</th><th>Published</th><th>Actions</th></tr></thead><tbody>${results.map(cve => `<tr><td><a href="#" onclick="window.app.showCveDetails('${cve.id}');return false">${cve.id}</a></td><td>${esc(Formatters.truncate(cve.title, 50))}</td><td><span class="badge badge-${String(cve.severity).toLowerCase()}">${cve.severity}</span></td><td>${cve.cvss ? Formatters.formatCvss(cve.cvss.baseScore) : 'N/A'}</td><td>${Formatters.formatDate(cve.publishedDate)}</td><td><button class="btn btn-sm btn-primary" onclick="window.app.showCveDetails('${cve.id}')"><i class="bi bi-eye"></i> View</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
    }

    function buildBody(app, cve, epss, epssLive) {
        const kevInfo = window.KevEngine.getKevInfo(cve.id);
        const priority = window.PriorityEngine.calculatePriority(cve, window.storage.getAssetContext(cve.id));
        const cvssDetails = cve.cvss ? window.CvssEngine.parseAndCalculate(cve.cvss.vector) : null;
        return `
        <div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0">${cve.id}</h2><div style="display:flex;gap:8px"><span class="badge badge-${String(cve.severity).toLowerCase()}">${cve.severity}</span>${kevInfo ? '<span class="badge badge-kev">KNOWN EXPLOITED</span>' : ''}${cve.source === 'live-nvd' ? '<span class="badge badge-info">LIVE NVD</span>' : ''}</div></div>
        <h3 style="margin-bottom:8px">${esc(cve.title)}</h3><p style="color:var(--text-secondary);line-height:1.6">${esc(cve.description)}</p></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
            <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Published</div><div style="font-weight:600">${Formatters.formatDate(cve.publishedDate)}</div></div>
            <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Vendor</div><div style="font-weight:600">${esc(cve.vendor)}</div></div>
            <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Product</div><div style="font-weight:600">${esc(cve.product)}</div></div>
            <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Last Modified</div><div style="font-weight:600">${Formatters.formatDate(cve.lastModifiedDate)}</div></div>
        </div>
        ${cvssDetails ? `<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">CVSS v3.1 Score</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:32px;font-weight:700;color:${app.getCvssColor(cvssDetails.score)}">${cvssDetails.score}</div><span class="badge badge-${String(cvssDetails.severity).toLowerCase()}">${cvssDetails.severity}</span></div><div style="font-size:12px;color:var(--text-muted);font-family:monospace">${cvssDetails.vector}</div><div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:12px"><div><strong>Attack Vector:</strong> ${cvssDetails.descriptions.attackVector}</div><div><strong>Complexity:</strong> ${cvssDetails.descriptions.attackComplexity}</div><div><strong>Privileges:</strong> ${cvssDetails.descriptions.privilegesRequired}</div><div><strong>User Interaction:</strong> ${cvssDetails.descriptions.userInteraction}</div></div></div></div>` : ''}
        ${epss ? `<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">EPSS Intelligence ${epssLive ? '<span class="badge badge-info">LIVE</span>' : ''}</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>EPSS Score:</span><strong>${Formatters.formatEpss(epss.score)}</strong></div><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Percentile:</span><strong>${Formatters.formatPercentile(epss.percentile)}</strong></div><div style="margin-top:12px;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px"><strong>Interpretation:</strong> ${window.EpssEngine.getRiskInterpretation(epss.score, epss.percentile)}</div></div></div>` : ''}
        ${kevInfo ? `<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">CISA Known Exploited Vulnerability</h3><div style="padding:16px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);border-radius:var(--radius-md)"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Date Added:</span><strong>${Formatters.formatDate(kevInfo.dateAdded)}</strong></div><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Due Date:</span><strong>${Formatters.formatDate(kevInfo.dueDate)}</strong></div><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Ransomware:</span><strong>${kevInfo.knownRansomwareCampaign === 'Known' ? 'YES' : 'Unknown'}</strong></div><div style="margin-top:12px"><strong>Required Action:</strong><p style="margin-top:4px;font-size:13px">${esc(kevInfo.requiredAction)}</p></div></div></div>` : ''}
        <div style="margin-bottom:20px"><h3 style="margin-bottom:12px">Priority Assessment</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:32px;font-weight:700">${priority.score}/100</div><span class="priority-badge priority-${priority.priorityCode.toLowerCase()}">${priority.priority}</span></div><div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">${priority.explanation}</div>${priority.factors.length ? `<div style="font-size:12px"><strong>Risk Factors:</strong><ul style="margin-top:8px;padding-left:20px">${priority.factors.slice(0, 5).map(f => `<li style="margin-bottom:4px">${f.reason}</li>`).join('')}</ul></div>` : ''}</div></div>
        ${app.slaSection(cve)}
        ${app.mitigationSection(cve)}
        <div style="margin-bottom:20px"><h3 style="margin-bottom:12px">Remediation</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><p style="margin:0">${esc(cve.remediation)}</p>${cve.vendorAdvisory ? `<div style="margin-top:12px"><a href="${cve.vendorAdvisory}" target="_blank" rel="noopener" class="btn btn-sm btn-primary"><i class="bi bi-link-45deg"></i> Vendor Advisory</a></div>` : ''}</div></div>`;
    }

    function wrapApp() {
        const app = window.app; if (!app || app.__fastWrapped) return; app.__fastWrapped = true;

        // PROGRESSIVE SEARCH: local instant, live bounded+cached
        app.performCveSearch = async function () {
            const inp = document.getElementById('cveSearchInput'); const q = (inp ? inp.value : '').trim();
            if (q.length < 2) { app.showToast('Invalid Search', 'Enter at least 2 characters', 'warning'); return; }
            const btn = document.getElementById('cveSearchBtn'); if (btn) btn.disabled = true;
            const resEl = document.getElementById('cveSearchResults');
            const local = window.cveSearch.search(q);
            if (local.length) { window.storage.saveCveSearch(q, local); resEl.innerHTML = renderResults(local, false); if (btn) btn.disabled = false; return; }
            resEl.innerHTML = '<div class="card"><div class="text-center" style="padding:30px"><i class="bi bi-hourglass-split" style="font-size:28px;animation:spin 1s linear infinite;display:inline-block"></i><p style="margin-top:10px;color:var(--text-secondary)">Querying live NVD…</p></div></div>';
            let live = null;
            if (Validators.isValidCveId(q)) { const c = await getCveFast(q); if (c) live = [c]; }
            else { const n = await window.cveSearch.searchLiveKeyword(q); if (n > 0) live = window.cveSearch.search(q); }
            window.storage.saveCveSearch(q, live || []);
            if (live && live.length) { resEl.innerHTML = renderResults(live, true); app.showToast('Search Complete', `Found ${live.length} (live NVD)`, 'success'); }
            else resEl.innerHTML = '<div class="card"><div class="empty-state"><i class="bi bi-search"></i><h3>No Results Found</h3><p>No vulnerabilities match "' + esc(q) + '" (live NVD unavailable or no match)</p></div></div>';
            if (btn) btn.disabled = false;
        };

        // INSTANT DETAILS: spinner first, parallel cached fetches
        app.showCveDetails = async function (cveId) {
            app.showModal(cveId, '<div class="text-center" style="padding:40px"><i class="bi bi-hourglass-split" style="font-size:32px;animation:spin 1s linear infinite;display:inline-block"></i><p style="margin-top:12px;color:var(--text-secondary)">Loading threat intelligence…</p></div>', '<button class="btn btn-secondary" onclick="window.app.closeModal()">Close</button>');
            app.replaceHash('cve/' + cveId);
            const [cve, epss] = await Promise.all([getCveFast(cveId), getEpssFast(cveId)]);
            if (!cve) { app.showToast('Error', 'CVE not found (offline or does not exist)', 'error'); app.closeModal(); return; }
            const epssLive = !!epss && !window.EpssEngine.getEpss(cveId);
            document.getElementById('modalBody').innerHTML = buildBody(app, cve, epss, epssLive);
            document.getElementById('modalFooter').innerHTML = `<button class="btn btn-secondary" onclick="window.app.closeModal()">Close</button><button class="btn btn-primary" onclick="window.app.showAssetContextModal('${cveId}')"><i class="bi bi-hdd"></i> Asset Context</button>`;
        };

        if (!document.getElementById('spinCss')) { const st = document.createElement('style'); st.id = 'spinCss'; st.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'; document.head.appendChild(st); }
    }
    document.addEventListener('DOMContentLoaded', wrapApp);
})();
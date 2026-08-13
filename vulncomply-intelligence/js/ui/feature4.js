/**
 * VulnComply Intelligence - Feature #4 add-on
 * MITRE ATT&CK view + Vendor Roll-Up + Kanban Remediation Board
 * @author Nandha Kumar M | @license MIT
 */
(function () {
    const PAGES = { attack: 'MITRE ATT&CK', vendors: 'Vendor Roll-Up', board: 'Remediation Board' };
    const KSTATUSES = ['Open', 'In Progress', 'Remediated'];
    const esc = s => Formatters.escapeHtml(s);

    function injectCss() {
        if (document.getElementById('f4css')) return;
        const st = document.createElement('style'); st.id = 'f4css';
        st.textContent = `.attack-matrix{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}.attack-col{min-width:170px;flex:1;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px}.attack-tactic{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--primary-light);margin-bottom:8px}.attack-tech{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;margin-bottom:6px;padding:8px 10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);cursor:pointer;font-size:12px}.attack-tech:hover{border-color:var(--primary-color)}.attack-tech .t-id{font-weight:600}.attack-tech .t-count{background:var(--primary-color);color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700}
.kanban{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.kcol{background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:12px;min-height:300px}.kcol-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-weight:700}.kcard{background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:8px;padding:10px;margin-bottom:10px}.kcard .krow{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.kmove{display:flex;gap:6px;margin-top:8px}.kmove button{flex:1}@media(max-width:900px){.kanban{grid-template-columns:1fr}}`;
        document.head.appendChild(st);
    }

    function getStatus(cve) { const all = window.storage.getAllRemediationItems(); const r = all[cve.id]; return (r && r.status) || 'Open'; }
    function setStatus(cve, status) { window.storage.saveRemediationItem(cve.id, { status: status, date: new Date().toISOString() }); }

    /* ===== ATT&CK ===== */
    function renderAttack(pc) {
        const matrix = window.AttackEngine.getMatrix(window.cveSearch.cveData);
        pc.innerHTML = `<div class="page-header"><h2>MITRE ATT&CK View</h2><p>Techniques observed across your tracked vulnerabilities</p></div>
        <div class="attack-matrix">${matrix.map(g => `<div class="attack-col"><div class="attack-tactic">${esc(g.tactic)}</div>${g.techs.map(t => `<button class="attack-tech" title="${esc(t.name)}" onclick="window.appFeature4.showTech('${t.id}')"><span class="t-id">${t.id}</span><span class="t-count">${t.count}</span></button>`).join('')}</div>`).join('')}</div>
        <p style="margin-top:12px;font-size:12px;color:var(--text-muted)">Click a technique to see the CVEs that use it.</p>`;
    }
    function showTech(t) {
        const cves = window.AttackEngine.getCvesForTechnique(window.cveSearch.cveData, t);
        const meta = window.AttackEngine.meta(t);
        window.app.showModal(`${t} · ${meta.name}`, `
        <p style="margin-bottom:12px;color:var(--text-secondary)">Tactic: <strong>${esc(meta.tactic)}</strong> • ${cves.length} linked CVE(s)</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${cves.map(c => `<button class="filter-chip" onclick="window.app.showCveFromControl('${c.id}')">${c.id}</button>`).join('') || '<span class="text-muted">None</span>'}</div>`,
            '<button class="btn btn-secondary" onclick="window.app.closeModal()">Close</button>');
    }

    /* ===== VENDOR ROLL-UP ===== */
    function renderVendors(pc) {
        const map = {};
        window.cveSearch.cveData.forEach(c => {
            const v = c.vendor || 'Unknown';
            map[v] = map[v] || { vendor: v, count: 0, critical: 0, high: 0, kev: 0, exploits: 0, cvssSum: 0, maxPriority: 0 };
            const m = map[v];
            m.count++;
            if (c.severity === 'Critical') m.critical++;
            if (c.severity === 'High') m.high++;
            if (c.knownExploitation || window.KevEngine.isKev(c.id)) m.kev++;
            if (c.exploitAvailable) m.exploits++;
            if (c.cvss) m.cvssSum += c.cvss.baseScore;
            const p = window.PriorityEngine.calculatePriority(c).score; if (p > m.maxPriority) m.maxPriority = p;
        });
        const rows = Object.values(map).sort((a, b) => (b.critical - a.critical) || (b.count - a.count));
        pc.innerHTML = `<div class="page-header"><h2>Vendor Roll-Up</h2><p>Which vendors contribute the most risk</p></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Vendor</th><th>CVEs</th><th>Critical</th><th>High</th><th>KEV</th><th>Exploits</th><th>Avg CVSS</th><th>Max Priority</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><strong>${esc(r.vendor)}</strong></td><td>${r.count}</td><td><span class="badge badge-critical">${r.critical}</span></td><td>${r.high}</td><td>${r.kev}</td><td>${r.exploits}</td><td>${r.count ? (r.cvssSum / r.count).toFixed(1) : '0'}</td><td>${r.maxPriority}</td><td><button class="btn btn-sm btn-outline" onclick="window.appFeature4.viewVendor('${esc(r.vendor)}')"><i class="bi bi-eye"></i> View</button></td></tr>`).join('')}
        </tbody></table></div>`;
    }
    function viewVendor(v) { window.app.navigate('cve-search'); setTimeout(() => { const sb = document.getElementById('cveSearchInput'); if (sb) { sb.value = v; window.app.performCveSearch(); } }, 150); }

    /* ===== KANBAN BOARD ===== */
    function renderBoard(pc) {
        const cves = window.cveSearch.cveData;
        pc.innerHTML = `<div class="page-header"><div class="page-header-row"><div><h2>Remediation Board</h2><p>Track remediation workflow across your tracked CVEs</p></div></div></div>
        <div class="kanban">${KSTATUSES.map(s => {
            const items = cves.filter(c => getStatus(c) === s);
            return `<div class="kcol"><div class="kcol-head"><span>${s}</span><span class="badge ${s === 'Remediated' ? 'badge-passed' : s === 'In Progress' ? 'badge-medium' : 'badge-failed'}">${items.length}</span></div>
            ${items.map(c => {
                const pr = window.PriorityEngine.calculatePriority(c);
                return `<div class="kcard"><div style="display:flex;justify-content:space-between;align-items:center"><strong>${c.id}</strong>${window.SlaEngine ? window.app.slaBadge(c) : ''}</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${esc(Formatters.truncate(c.title, 60))}</div><div class="krow"><span class="badge badge-${String(c.severity).toLowerCase()}">${c.severity}</span><span class="priority-badge priority-${pr.priorityCode.toLowerCase()}">${pr.priorityCode}</span></div><div class="kmove">${KSTATUSES.filter(x => x !== s).map(x => `<button class="btn btn-sm btn-secondary" onclick="window.appFeature4.move('${c.id}','${x}')">${x === 'Remediated' ? '✓ ' : x === 'In Progress' ? '▶ ' : '◀ '}${x}</button>`).join('')}</div></div>`;
            }).join('') || '<div class="text-muted" style="font-size:12px">No items</div>'}</div>`;
        }).join('')}</div>`;
    }
    function move(id, status) {
        const cve = window.cveSearch.getCveById(id);
        setStatus(cve, status);
        window.app.showToast('Board Updated', `${id} → ${status}`, 'success');
        renderBoard(document.getElementById('currentPage'));
    }

    /* ===== Wire into app ===== */
    function renderPage(p, pc) {
        if (p === 'attack') renderAttack(pc);
        else if (p === 'vendors') renderVendors(pc);
        else if (p === 'board') renderBoard(pc);
    }
    function addNav() {
        const nav = document.querySelector('.sidebar-nav');
        if (!nav || document.getElementById('f4nav')) return;
        const sec = document.createElement('div');
        sec.className = 'nav-section'; sec.id = 'f4nav';
        sec.innerHTML = `<div class="nav-section-title">Intelligence</div>
        <a href="#" class="nav-item" data-page="attack"><i class="bi bi-diagram-3"></i><span>MITRE ATT&CK</span></a>
        <a href="#" class="nav-item" data-page="vendors"><i class="bi bi-buildings"></i><span>Vendor Roll-Up</span></a>
        <a href="#" class="nav-item" data-page="board"><i class="bi bi-kanban"></i><span>Remediation Board</span></a>`;
        nav.appendChild(sec);
        sec.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', e => {
            e.preventDefault();
            window.app.navigate(item.getAttribute('data-page'));
            document.getElementById('sidebar').classList.remove('active');
        }));
    }
    function wrapApp() {
        const app = window.app; if (!app || app.__f4Wrapped) return; app.__f4Wrapped = true;
        const origIsPage = app.isPage.bind(app);
        app.isPage = p => origIsPage(p) || !!PAGES[p];
        const origTitle = app.getPageTitle.bind(app);
        app.getPageTitle = p => PAGES[p] || origTitle(p);
        const origLoad = app.loadPage.bind(app);
        app.loadPage = function (p, ...a) {
            if (PAGES[p]) {
                this.currentPage = p;
                document.getElementById('pageTitle').textContent = PAGES[p];
                const pc = document.getElementById('currentPage');
                this.destroyCharts();
                renderPage(p, pc);
                return;
            }
            return origLoad(p, ...a);
        };
    }

    document.addEventListener('DOMContentLoaded', () => { injectCss(); addNav(); wrapApp(); });
    window.appFeature4 = { showTech, viewVendor, move };
})();
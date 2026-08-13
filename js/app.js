/**
 * VulnComply Intelligence - Main Application Controller
 * Real-Time + Linkage + Deep-Links + Command Palette + SLA/Overdue
 * @author Nandha Kumar M | @license MIT | v3.1.0
 */
class VulnComplyApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.theme = localStorage.getItem('theme') || 'dark';
        this.controlsData = [];
        this.controlsLoaded = false;
        this.charts = {};
        this.paletteList = [];
        this.paletteSel = 0;
    }

    async init() {
        this.applyTheme();
        this.setupNavigation();
        this.setupGlobalSearch();
        this.setupThemeToggle();
        this.setupMobileMenu();
        this.setupModalHandlers();
        this.setupRouter();
        this.injectPaletteCss();
        this.buildPalette();
        this.loadAllData();
        this.routeFromHash();
        this.checkFirstRun();
        this.refreshLiveData(false);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = this.theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    }
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) { this.navigate(page); document.getElementById('sidebar').classList.remove('active'); }
            });
        });
    }
    setActiveNavByPage(page) { document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.getAttribute('data-page') === page)); }
    navigate(page) {
        this.setActiveNavByPage(page);
        if (location.hash !== '#/' + page) location.hash = '/' + page;
        else this.routeFromHash();
    }
    setupRouter() { window.addEventListener('hashchange', () => this.routeFromHash()); }
    isPage(p) { return ['dashboard', 'vulnerabilities', 'cve-search', 'compliance', 'controls', 'reports', 'history', 'about', 'settings'].includes(p); }
    routeFromHash() {
        const h = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
        if (!h) { this.setActiveNavByPage('dashboard'); this.loadPage('dashboard'); return; }
        const idx = h.indexOf('/');
        const seg = idx === -1 ? h : h.slice(0, idx);
        const param = idx === -1 ? '' : decodeURIComponent(h.slice(idx + 1));
        if (seg === 'cve' && param) { this.setActiveNavByPage('vulnerabilities'); this.loadPage('vulnerabilities'); this.showCveDetails(param); }
        else if (seg === 'control' && param) { this.setActiveNavByPage('controls'); this.loadPage('controls'); this.assessControl(param); }
        else if (this.isPage(seg)) { this.setActiveNavByPage(seg); this.loadPage(seg); }
        else { this.setActiveNavByPage('dashboard'); this.loadPage('dashboard'); }
    }
    replaceHash(h) { history.replaceState(null, '', '#/' + h); }

    setupGlobalSearch() {
        const si = document.getElementById('globalSearch');
        if (si) si.addEventListener('keypress', e => {
            if (e.key === 'Enter') { const q = e.target.value.trim(); if (q.length >= 2) { this.navigate('cve-search'); setTimeout(() => { const sb = document.getElementById('cveSearchInput'); if (sb) { sb.value = q; this.performCveSearch(); } }, 150); } }
        });
    }
    setupThemeToggle() { const tb = document.getElementById('themeToggle'); if (tb) tb.addEventListener('click', () => this.toggleTheme()); }
    setupMobileMenu() { const mb = document.getElementById('mobileMenuBtn'), sb = document.getElementById('sidebar'); if (mb && sb) mb.addEventListener('click', () => sb.classList.toggle('active')); }
    setupModalHandlers() {
        const ov = document.getElementById('modalOverlay'), cb = document.getElementById('modalClose');
        if (cb) cb.addEventListener('click', () => this.closeModal());
        if (ov) ov.addEventListener('click', e => { if (e.target === ov) this.closeModal(); });
    }
    toggleTheme() { this.theme = this.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('theme', this.theme); this.applyTheme(); this.showToast('Theme Changed', `${this.theme.charAt(0).toUpperCase() + this.theme.slice(1)} mode activated`, 'info'); }

    loadAllData() {
        this.controlsData = (window.VC_CONTROLS && window.VC_CONTROLS.length) ? window.VC_CONTROLS : [];
        this.controlsLoaded = true;
    }

    async refreshLiveData(notify) {
        if (notify) this.showToast('Live Data', 'Fetching live CISA KEV catalog...', 'info');
        const ok = await window.KevEngine.refreshLive();
        if (this.currentPage === 'dashboard') this.renderDashboard(document.getElementById('currentPage'));
        if (notify) this.showToast('Live Data', ok ? `Loaded ${window.KevEngine.count} live KEV entries` : 'Live KEV unavailable - using demo data', ok ? 'success' : 'warning');
        return ok;
    }
    setLiveConfig(key, val) {
        if (window.LiveData) {
            window.LiveData.config[key] = val;
            window.LiveData.saveConfig();
            this.showToast('Live Data', `${key === 'enabled' ? 'Live data' : 'CORS proxy'} ${val ? 'enabled' : 'disabled'}`, 'info');
            if (key === 'enabled' && val) this.refreshLiveData(true);
        }
    }

    loadPage(pageName) {
        this.currentPage = pageName;
        document.getElementById('pageTitle').textContent = this.getPageTitle(pageName);
        const pc = document.getElementById('currentPage');
        this.destroyCharts();
        const pages = {
            dashboard: () => this.renderDashboard(pc),
            vulnerabilities: () => this.renderVulnerabilitiesPage(pc),
            'cve-search': () => this.renderCveSearchPage(pc),
            compliance: () => this.renderCompliancePage(pc),
            controls: () => this.renderControlsPage(pc),
            reports: () => this.renderReportsPage(pc),
            history: () => this.renderHistoryPage(pc),
            about: () => this.renderAboutPage(pc),
            settings: () => this.renderSettingsPage(pc)
        };
        (pages[pageName] || pages.dashboard)();
    }
    destroyCharts() { Object.keys(this.charts).forEach(k => { if (this.charts[k] && this.charts[k].destroy) this.charts[k].destroy(); }); this.charts = {}; }
    getPageTitle(p) { const t = { dashboard: 'Security Dashboard', vulnerabilities: 'Vulnerability Intelligence', 'cve-search': 'CVE Search', compliance: 'Security Compliance', controls: 'Security Controls', reports: 'Reports', history: 'History', about: 'About', settings: 'Settings' }; return t[p] || 'VulnComply Intelligence'; }
    checkFirstRun() { if (!localStorage.getItem('firstRun')) { localStorage.setItem('firstRun', 'true'); setTimeout(() => this.showToast('Welcome to VulnComply Intelligence', 'Your data stays in your browser. No backend required.', 'info'), 1000); } }

    showToast(title, message, type = 'info') {
        const c = document.getElementById('toastContainer'); if (!c) return;
        const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
        const t = document.createElement('div'); t.className = `toast ${type}`;
        t.innerHTML = `<i class="bi ${icons[type]} toast-icon"></i><div class="toast-content"><div class="toast-title">${Formatters.escapeHtml(title)}</div><div class="toast-message">${Formatters.escapeHtml(message)}</div></div><button class="toast-close" onclick="this.parentElement.remove()"><i class="bi bi-x-lg"></i></button>`;
        c.appendChild(t); setTimeout(() => t.remove(), 5000);
    }
    showModal(title, bodyHtml, footerHtml = '') { document.getElementById('modalTitle').textContent = title; document.getElementById('modalBody').innerHTML = bodyHtml; document.getElementById('modalFooter').innerHTML = footerHtml; document.getElementById('modalOverlay').classList.add('active'); }
    closeModal() { document.getElementById('modalOverlay').classList.remove('active'); this.replaceHash(this.currentPage); }

    /* ===== COMMAND PALETTE ===== */
    injectPaletteCss() {
        if (document.getElementById('cmdkCss')) return;
        const st = document.createElement('style'); st.id = 'cmdkCss';
        st.textContent = `.cmdk-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:none;align-items:flex-start;justify-content:center;padding-top:12vh}.cmdk-overlay.active{display:flex}.cmdk{width:min(640px,92vw);background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}.cmdk-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border-color)}.cmdk-head i{color:var(--text-muted)}.cmdk-head input{flex:1;background:none;border:none;outline:none;color:var(--text-primary);font-size:15px}.cmdk-head kbd{font-size:11px;color:var(--text-muted);border:1px solid var(--border-color);border-radius:4px;padding:2px 6px}.cmdk-list{max-height:50vh;overflow-y:auto}.cmdk-item{display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer}.cmdk-item i{color:var(--primary-color)}.cmdk-item.active{background:var(--bg-tertiary)}.cmdk-txt{flex:1;min-width:0}.cmdk-label{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cmdk-sub{font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cmdk-group{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}.cmdk-empty{padding:24px;text-align:center;color:var(--text-muted)}`;
        document.head.appendChild(st);
    }
    buildPalette() {
        if (document.getElementById('cmdk')) return;
        const ov = document.createElement('div'); ov.id = 'cmdk'; ov.className = 'cmdk-overlay';
        ov.innerHTML = `<div class="cmdk"><div class="cmdk-head"><i class="bi bi-search"></i><input id="cmdkInput" placeholder="Search pages, CVEs, controls, actions..."/><kbd>esc</kbd></div><div class="cmdk-list" id="cmdkList"></div></div>`;
        document.body.appendChild(ov);
        ov.addEventListener('click', e => { if (e.target === ov) this.closePalette(); });
        document.getElementById('cmdkInput').addEventListener('input', e => this.renderPalette(e.target.value));
        document.getElementById('cmdkInput').addEventListener('keydown', e => this.paletteOnKey(e));
        const actions = document.querySelector('.header-actions');
        if (actions) { const b = document.createElement('button'); b.className = 'theme-toggle'; b.title = 'Command Palette (Ctrl+K)'; b.innerHTML = '<i class="bi bi-command"></i>'; b.onclick = () => this.openPalette(); actions.prepend(b); }
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.openPalette(); }
        });
    }
    openPalette() { const ov = document.getElementById('cmdk'); ov.classList.add('active'); const i = document.getElementById('cmdkInput'); i.value = ''; this.renderPalette(''); i.focus(); }
    closePalette() { const ov = document.getElementById('cmdk'); if (ov) ov.classList.remove('active'); }
    paletteOnKey(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); this.paletteSel = Math.min(this.paletteSel + 1, this.paletteList.length - 1); this.paintPalette(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this.paletteSel = Math.max(this.paletteSel - 1, 0); this.paintPalette(); }
        else if (e.key === 'Enter') { e.preventDefault(); if (this.paletteList[this.paletteSel]) this.paletteList[this.paletteSel].run(); this.closePalette(); }
        else if (e.key === 'Escape') { this.closePalette(); }
    }
    paletteItems(q) {
        q = (q || '').toLowerCase(); const out = [];
        const has = s => !q || String(s).toLowerCase().includes(q);
        ['dashboard', 'vulnerabilities', 'cve-search', 'compliance', 'controls', 'reports', 'history', 'about', 'settings'].forEach(p => { if (has(p)) out.push({ group: 'Pages', icon: 'bi-window', label: p.replace(/-/g, ' '), sub: 'Go to page', run: () => this.navigate(p) }); });
        [{ label: 'toggle theme', icon: 'bi-circle-half', run: () => this.toggleTheme() },
         { label: 'refresh live data', icon: 'bi-arrow-clockwise', run: () => this.refreshLiveData(true) },
         { label: 'export all data', icon: 'bi-download', run: () => this.exportAllData() }
        ].forEach(a => { if (has(a.label)) out.push({ group: 'Actions', icon: a.icon, label: a.label, sub: 'Run action', run: a.run }); });
        (window.cveSearch ? window.cveSearch.cveData : []).forEach(c => { if (has(c.id) || has(c.title) || has(c.vendor)) out.push({ group: 'CVEs', icon: 'bi-shield-exclamation', label: c.id, sub: c.title, run: () => { this.navigate('vulnerabilities'); this.showCveDetails(c.id); } }); });
        (this.controlsData || []).forEach(c => { if (has(c.id) || has(c.name)) out.push({ group: 'Controls', icon: 'bi-list-check', label: c.id + ' · ' + c.name, sub: c.category, run: () => { this.navigate('controls'); this.assessControl(c.id); } }); });
        return out.slice(0, 12);
    }
    renderPalette(q) { this.paletteList = this.paletteItems(q); this.paletteSel = 0; this.paintPalette(); }
    paintPalette() {
        const list = document.getElementById('cmdkList'); if (!list) return;
        if (!this.paletteList.length) { list.innerHTML = '<div class="cmdk-empty">No matches</div>'; return; }
        list.innerHTML = this.paletteList.map((it, i) => `<div class="cmdk-item ${i === this.paletteSel ? 'active' : ''}" data-i="${i}"><i class="bi ${it.icon}"></i><div class="cmdk-txt"><div class="cmdk-label">${Formatters.escapeHtml(it.label)}</div><div class="cmdk-sub">${Formatters.escapeHtml(it.sub || it.group)}</div></div><span class="cmdk-group">${it.group}</span></div>`).join('');
        list.querySelectorAll('.cmdk-item').forEach(el => {
            el.addEventListener('click', () => { this.paletteList[+el.dataset.i].run(); this.closePalette(); });
            el.addEventListener('mousemove', () => { if (this.paletteSel !== +el.dataset.i) { this.paletteSel = +el.dataset.i; this.paintPalette(); } });
        });
    }

    /* ===== DASHBOARD ===== */
    renderDashboard(container) {
        const stats = window.cveSearch.getStatistics();
        const compliance = this.getComplianceStats();
        const risk = this.calculateUnifiedRiskScore();
        const kevLive = window.KevEngine.source === 'live';
        const sla = window.SlaEngine.summary(window.cveSearch.cveData);
        container.innerHTML = `
        <div class="page-header"><div class="page-header-row"><div><h2>Security Overview</h2><p>Real-time vulnerability and compliance intelligence</p></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge ${kevLive ? 'badge-passed' : 'badge-medium'}">KEV: ${kevLive ? 'LIVE' : 'DEMO'} (${window.KevEngine.count})</span>
            <button class="btn btn-sm btn-outline" onclick="window.app.refreshLiveData(true)"><i class="bi bi-arrow-clockwise"></i> Refresh Live</button>
        </div></div>
        <div class="data-freshness"><i class="bi bi-info-circle"></i><span>${kevLive ? 'Live CISA KEV catalog loaded' : 'Demo Dataset'} • Last Updated: ${window.KevEngine.lastUpdated || '2025-01-15'}</span></div></div>
        <div class="metrics-grid">
            <div class="metric-card"><div class="metric-icon primary"><i class="bi bi-shield-exclamation"></i></div><div class="metric-info"><div class="metric-label">Total CVEs Analyzed</div><div class="metric-value">${stats.total}</div></div></div>
            <div class="metric-card"><div class="metric-icon critical"><i class="bi bi-exclamation-diamond-fill"></i></div><div class="metric-info"><div class="metric-label">Critical Vulnerabilities</div><div class="metric-value">${stats.critical}</div></div></div>
            <div class="metric-card"><div class="metric-icon danger"><i class="bi bi-bug-fill"></i></div><div class="metric-info"><div class="metric-label">KEV Catalog Size</div><div class="metric-value">${window.KevEngine.count}</div></div></div>
            <div class="metric-card"><div class="metric-icon warning"><i class="bi bi-graph-up-arrow"></i></div><div class="metric-info"><div class="metric-label">High EPSS Score</div><div class="metric-value">${stats.highEpssCount}</div></div></div>
            <div class="metric-card"><div class="metric-icon ${compliance.score >= 80 ? 'success' : 'warning'}"><i class="bi bi-check-circle-fill"></i></div><div class="metric-info"><div class="metric-label">Compliance Score</div><div class="metric-value">${compliance.score}%</div></div></div>
            <div class="metric-card"><div class="metric-icon danger"><i class="bi bi-x-circle-fill"></i></div><div class="metric-info"><div class="metric-label">Failed Controls</div><div class="metric-value">${compliance.failed}</div></div></div>
            <div class="metric-card"><div class="metric-icon danger"><i class="bi bi-calendar-x"></i></div><div class="metric-info"><div class="metric-label">SLA Overdue</div><div class="metric-value">${sla.overdue}</div></div></div>
            <div class="metric-card"><div class="metric-icon warning"><i class="bi bi-hourglass-split"></i></div><div class="metric-info"><div class="metric-label">Due Soon</div><div class="metric-value">${sla.dueSoon}</div></div></div>
            <div class="metric-card"><div class="metric-icon warning"><i class="bi bi-code-slash"></i></div><div class="metric-info"><div class="metric-label">Exploits Available</div><div class="metric-value">${stats.exploitAvailable}</div></div></div>
            <div class="metric-card"><div class="metric-icon critical"><i class="bi bi-shield-lock-fill"></i></div><div class="metric-info"><div class="metric-label">Ransomware Risk</div><div class="metric-value">${stats.ransomwareAssociated}</div></div></div>
        </div>
        <div class="grid-2 mb-3">
            <div class="card"><div class="card-header"><h3 class="card-title">Vulnerability Severity</h3></div><div class="card-body"><div class="chart-container"><canvas id="severityChart"></canvas></div></div></div>
            <div class="card"><div class="card-header"><h3 class="card-title">Enterprise Risk Score</h3><span class="badge badge-${risk.level === 'Critical' ? 'critical' : risk.level === 'High' ? 'high' : risk.level === 'Elevated' ? 'medium' : 'low'}">${risk.level}</span></div>
            <div class="card-body">
                <div style="text-align:center;margin-bottom:20px"><div class="score-gauge" style="margin:0 auto"><svg width="120" height="120"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-tertiary)" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="${risk.color}" stroke-width="10" stroke-dasharray="${(risk.score / 100) * 314} 314" stroke-linecap="round"/></svg><div class="score-gauge-text"><span class="score-gauge-value" style="color:${risk.color}">${risk.score}</span><span class="score-gauge-label">Risk Score</span></div></div></div>
                <div style="margin-top:20px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Vulnerability Risk</span><span style="color:${this.getRiskColor(risk.vulnRisk)}">${risk.vulnRisk}/100</span></div><div class="progress-bar"><div class="progress-fill ${risk.vulnRisk > 70 ? 'danger' : risk.vulnRisk > 40 ? 'warning' : 'success'}" style="width:${risk.vulnRisk}%"></div></div></div>
                <div style="margin-top:12px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Compliance Risk</span><span style="color:${this.getRiskColor(risk.complianceRisk)}">${risk.complianceRisk}/100</span></div><div class="progress-bar"><div class="progress-fill ${risk.complianceRisk > 70 ? 'danger' : risk.complianceRisk > 40 ? 'warning' : 'success'}" style="width:${risk.complianceRisk}%"></div></div></div>
                <div style="margin-top:16px;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:12px"><strong>Calculation:</strong> 60% Vulnerability + 40% Compliance</div>
            </div></div>
        </div>
        <div class="grid-2">
            <div class="card"><div class="card-header"><h3 class="card-title">Framework Compliance</h3></div><div class="card-body"><div class="chart-container"><canvas id="frameworkChart"></canvas></div></div></div>
            <div class="card"><div class="card-header"><h3 class="card-title">Recent Activity</h3></div><div class="card-body" id="recentActivity"></div></div>
        </div>`;
        this.renderDashboardCharts(stats);
        this.renderRecentActivity();
    }
    getComplianceStats() {
        const a = window.storage.getComplianceAssessment(), c = a.controls || {};
        let passed = 0, failed = 0, partial = 0, total = 0;
        Object.values(c).forEach(x => { if (x.status === 'Passed') passed++; if (x.status === 'Failed') failed++; if (x.status === 'Partially Compliant') partial++; total++; });
        return { score: total > 0 ? Math.round(((passed + partial * 0.5) / total) * 100) : 0, passed, failed, partial, total };
    }
    calculateUnifiedRiskScore() {
        const stats = window.cveSearch.getStatistics(), comp = this.getComplianceStats();
        let vr = 0;
        if (stats.critical > 5) vr += 30; else if (stats.critical > 2) vr += 20; else if (stats.critical > 0) vr += 10;
        if (stats.kevCount > 3) vr += 25; else if (stats.kevCount > 1) vr += 15; else if (stats.kevCount > 0) vr += 10;
        if (stats.highEpssCount > 5) vr += 20; else if (stats.highEpssCount > 2) vr += 10;
        if (stats.exploitAvailable > 5) vr += 15; else if (stats.exploitAvailable > 0) vr += 5;
        vr = Math.min(100, vr);
        const cr = 100 - comp.score, overall = Math.round((vr * 0.6) + (cr * 0.4));
        window.storage.saveRiskScore(overall);
        return { score: overall, level: this.getRiskLevel(overall), color: this.getRiskColor(overall), vulnRisk: vr, complianceRisk: cr };
    }
    getRiskLevel(s) { if (s >= 81) return 'Critical'; if (s >= 61) return 'High'; if (s >= 41) return 'Elevated'; if (s >= 21) return 'Moderate'; return 'Low'; }
    getRiskColor(s) { if (s >= 81) return '#dc2626'; if (s >= 61) return '#ef4444'; if (s >= 41) return '#f59e0b'; if (s >= 21) return '#06b6d4'; return '#10b981'; }
    renderDashboardCharts(stats) {
        setTimeout(() => {
            const sc = document.getElementById('severityChart');
            if (sc && window.Chart) this.charts.severity = new Chart(sc, { type: 'doughnut', data: { labels: ['Critical', 'High', 'Medium', 'Low'], datasets: [{ data: [stats.critical, stats.high, stats.medium, stats.low], backgroundColor: ['#dc2626', '#ef4444', '#f59e0b', '#10b981'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } } });
            const fc = document.getElementById('frameworkChart');
            if (fc && window.Chart) this.charts.framework = new Chart(fc, { type: 'bar', data: { labels: ['CIS-aligned', 'Windows Security', 'NIST-inspired', 'ISO 27001-inspired'], datasets: [{ label: 'Compliance %', data: [75, 82, 68, 71], backgroundColor: '#0ea5e9', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } } });
        }, 100);
    }
    renderRecentActivity() {
        const c = document.getElementById('recentActivity'); if (!c) return;
        const h = window.storage.getCveSearchHistory().slice(0, 5);
        if (!h.length) { c.innerHTML = '<div class="empty-state"><i class="bi bi-clock-history"></i><h3>No Recent Activity</h3><p>Your search history will appear here.</p></div>'; return; }
        c.innerHTML = h.map(i => `<div style="padding:12px;border-bottom:1px solid var(--border-color)"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:500">${Formatters.escapeHtml(i.query)}</div><div style="font-size:12px;color:var(--text-muted)">${i.results} results • ${Formatters.timeAgo(i.timestamp)}</div></div><i class="bi bi-search" style="color:var(--text-muted)"></i></div></div>`).join('');
    }

    /* ===== VULNERABILITIES ===== */
    renderVulnerabilitiesPage(container) {
        const stats = window.cveSearch.getStatistics(), vulns = window.cveSearch.paginate(1);
        container.innerHTML = `
        <div class="page-header"><div class="page-header-row"><div><h2>Vulnerability Intelligence</h2><p>Analyze and prioritize vulnerabilities with multi-factor scoring</p></div><button class="btn btn-primary" onclick="window.app.showExportModal()"><i class="bi bi-download"></i> Export</button></div></div>
        <div class="data-freshness"><i class="bi bi-info-circle"></i><span>${stats.total} vulnerabilities • KEV: ${window.KevEngine.source === 'live' ? 'LIVE' : 'DEMO'}</span></div>
        <div class="filter-bar">
            <div class="filter-group"><label class="filter-label">Severity:</label><select class="filter-select" id="severityFilter" onchange="window.app.applyVulnFilter()"><option value="all">All</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
            <div class="filter-chip" id="kevFilter" onclick="window.app.toggleFilter('kevOnly')"><i class="bi bi-bug"></i> KEV Only</div>
            <div class="filter-chip" id="exploitFilter" onclick="window.app.toggleFilter('exploitOnly')"><i class="bi bi-code-slash"></i> Exploit Available</div>
            <div class="filter-chip" id="highEpssFilter" onclick="window.app.toggleFilter('highEpss')"><i class="bi bi-graph-up"></i> High EPSS</div>
        </div>
        <div class="table-container"><table class="data-table"><thead><tr><th onclick="window.app.sortVulns('id')">CVE <i class="bi bi-arrow-down-up"></i></th><th onclick="window.app.sortVulns('product')">Product</th><th onclick="window.app.sortVulns('severity')">Severity</th><th onclick="window.app.sortVulns('cvss')">CVSS</th><th onclick="window.app.sortVulns('epss')">EPSS</th><th>KEV</th><th onclick="window.app.sortVulns('priority')">Priority</th><th>SLA</th><th>Actions</th></tr></thead><tbody id="vulnerabilitiesTable">${this.renderVulnerabilityRows(vulns)}</tbody></table></div>
        <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center"><div style="color:var(--text-secondary);font-size:13px">Showing ${vulns.length} of ${window.cveSearch.filteredData.length}</div><div id="pagination"></div></div>`;
        this.renderPagination();
    }
    renderVulnerabilityRows(vulns) {
        return vulns.map(cve => {
            const epss = window.EpssEngine.getEpss(cve.id), kev = window.KevEngine.isKev(cve.id);
            const priority = window.PriorityEngine.calculatePriority(cve, window.storage.getAssetContext(cve.id));
            return `<tr><td><a href="#" onclick="window.app.showCveDetails('${cve.id}');return false">${cve.id}</a></td><td>${Formatters.escapeHtml(cve.product)}</td><td><span class="badge badge-${String(cve.severity).toLowerCase()}">${cve.severity}</span></td><td>${cve.cvss ? Formatters.formatCvss(cve.cvss.baseScore) : 'N/A'}</td><td>${epss ? Formatters.formatEpss(epss.score) : 'N/A'}</td><td>${kev ? '<span class="badge badge-kev">YES</span>' : '<span class="text-muted">No</span>'}</td><td><span class="priority-badge priority-${priority.priorityCode.toLowerCase()}">${priority.priorityCode}</span></td><td>${this.slaBadge(cve)}</td><td><div class="table-actions"><button class="table-action-btn" onclick="window.app.showCveDetails('${cve.id}')" title="View"><i class="bi bi-eye"></i></button><button class="table-action-btn" onclick="window.app.showAssetContextModal('${cve.id}')" title="Asset"><i class="bi bi-hdd"></i></button></div></td></tr>`;
        }).join('');
    }
    renderPagination() {
        const c = document.getElementById('pagination'); if (!c) return;
        const tp = window.cveSearch.getTotalPages(), cp = window.cveSearch.currentPage;
        if (tp <= 1) { c.innerHTML = ''; return; }
        let html = '<div style="display:flex;gap:4px">';
        if (cp > 1) html += `<button class="btn btn-sm btn-secondary" onclick="window.app.goToPage(${cp - 1})">Prev</button>`;
        for (let i = 1; i <= tp; i++) { if (i === cp) html += `<button class="btn btn-sm btn-primary">${i}</button>`; else if (i === 1 || i === tp || (i >= cp - 1 && i <= cp + 1)) html += `<button class="btn btn-sm btn-secondary" onclick="window.app.goToPage(${i})">${i}</button>`; }
        if (cp < tp) html += `<button class="btn btn-sm btn-secondary" onclick="window.app.goToPage(${cp + 1})">Next</button>`;
        c.innerHTML = html + '</div>';
    }
    goToPage(p) { window.cveSearch.currentPage = p; document.getElementById('vulnerabilitiesTable').innerHTML = this.renderVulnerabilityRows(window.cveSearch.paginate(p)); this.renderPagination(); }
    applyVulnFilter() { window.cveSearch.setFilter('severity', document.getElementById('severityFilter').value); window.cveSearch.currentPage = 1; document.getElementById('vulnerabilitiesTable').innerHTML = this.renderVulnerabilityRows(window.cveSearch.paginate(1)); this.renderPagination(); }
    toggleFilter(f) { const cur = window.cveSearch.currentFilters[f] || false; window.cveSearch.setFilter(f, !cur); const chip = document.getElementById(f + 'Filter'); if (chip) chip.classList.toggle('active', !cur); window.cveSearch.currentPage = 1; document.getElementById('vulnerabilitiesTable').innerHTML = this.renderVulnerabilityRows(window.cveSearch.paginate(1)); this.renderPagination(); }
    sortVulns(field) { const dir = window.cveSearch.sortField === field && window.cveSearch.sortDirection === 'desc' ? 'asc' : 'desc'; window.cveSearch.sort(field, dir); window.cveSearch.currentPage = 1; document.getElementById('vulnerabilitiesTable').innerHTML = this.renderVulnerabilityRows(window.cveSearch.paginate(1)); }

    /* ===== CVE SEARCH ===== */
    renderCveSearchPage(container) {
        container.innerHTML = `<div class="page-header"><h2>CVE Search</h2><p>Search local dataset + live NVD by CVE ID, vendor, product, or keyword</p></div>
        <div class="card mb-3"><div class="card-body"><div class="form-group"><label class="form-label">Search Query</label><input type="text" class="form-input" id="cveSearchInput" placeholder="Enter CVE ID (e.g., CVE-2021-44228), vendor, product..." onkeypress="if(event.key==='Enter')window.app.performCveSearch()"></div><button class="btn btn-primary" id="cveSearchBtn" onclick="window.app.performCveSearch()"><i class="bi bi-search"></i> Search</button></div></div>
        <div id="cveSearchResults"></div>`;
    }
    async performCveSearch() {
        const q = document.getElementById('cveSearchInput').value.trim();
        if (!q || q.length < 2) { this.showToast('Invalid Search', 'Please enter at least 2 characters', 'warning'); return; }
        const btn = document.getElementById('cveSearchBtn');
        if (btn) btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching...';
        const { results, live, liveNote } = await window.cveSearch.smartSearch(q);
        if (btn) btn.innerHTML = '<i class="bi bi-search"></i> Search';
        window.storage.saveCveSearch(q, results);
        const c = document.getElementById('cveSearchResults');
        if (!results.length) {
            c.innerHTML = `<div class="card"><div class="empty-state"><i class="bi bi-search"></i><h3>No Results Found</h3><p>No vulnerabilities match "${Formatters.escapeHtml(q)}"</p>${liveNote ? `<p style="margin-top:8px;font-size:12px;color:var(--text-muted)">${Formatters.escapeHtml(liveNote)}</p>` : ''}</div></div>`;
            return;
        }
        c.innerHTML = `<div class="card"><div class="card-header"><h3 class="card-title">Search Results (${results.length}) ${live ? '<span class="badge badge-info">LIVE NVD</span>' : ''}</h3></div><div class="card-body"><div class="table-container"><table class="data-table"><thead><tr><th>CVE</th><th>Title</th><th>Severity</th><th>CVSS</th><th>Published</th><th>Actions</th></tr></thead><tbody>${results.map(cve => `<tr><td><a href="#" onclick="window.app.showCveDetails('${cve.id}');return false">${cve.id}</a></td><td>${Formatters.truncate(cve.title, 50)}</td><td><span class="badge badge-${String(cve.severity).toLowerCase()}">${cve.severity}</span></td><td>${cve.cvss ? Formatters.formatCvss(cve.cvss.baseScore) : 'N/A'}</td><td>${Formatters.formatDate(cve.publishedDate)}</td><td><button class="btn btn-sm btn-primary" onclick="window.app.showCveDetails('${cve.id}')"><i class="bi bi-eye"></i> View</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
        this.showToast('Search Complete', `Found ${results.length} vulnerabilities${live ? ' (live NVD)' : ''}`, 'success');
    }

    /* ===== CVE DETAILS ===== */
    async showCveDetails(cveId) {
        let cve = window.cveSearch.getCveById(cveId);
        if (!cve) cve = await window.cveSearch.searchLiveNvd(cveId);
        if (!cve) { this.showToast('Error', 'CVE not found', 'error'); return; }
        this.replaceHash('cve/' + cveId);
        let epss = window.EpssEngine.getEpss(cveId); let epssLive = false;
        if (!epss) { epss = await window.EpssEngine.getLiveEpss(cveId); epssLive = !!epss; }
        const kevInfo = window.KevEngine.getKevInfo(cveId);
        const priority = window.PriorityEngine.calculatePriority(cve, window.storage.getAssetContext(cveId));
        const cvssDetails = cve.cvss ? window.CvssEngine.parseAndCalculate(cve.cvss.vector) : null;
        const body = `
        <div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0">${cve.id}</h2><div style="display:flex;gap:8px"><span class="badge badge-${String(cve.severity).toLowerCase()}">${cve.severity}</span>${kevInfo ? '<span class="badge badge-kev">KNOWN EXPLOITED</span>' : ''}${cve.source === 'live-nvd' ? '<span class="badge badge-info">LIVE NVD</span>' : ''}</div></div>
        <h3 style="margin-bottom:8px">${Formatters.escapeHtml(cve.title)}</h3><p style="color:var(--text-secondary);line-height:1.6">${Formatters.escapeHtml(cve.description)}</p></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
            <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Published</div><div style="font-weight:600">${Formatters.formatDate(cve.publishedDate)}</div></div>
            <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Vendor</div><div style="font-weight:600">${Formatters.escapeHtml(cve.vendor)}</div></div>
            <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Product</div><div style="font-weight:600">${Formatters.escapeHtml(cve.product)}</div></div>
            <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Last Modified</div><div style="font-weight:600">${Formatters.formatDate(cve.lastModifiedDate)}</div></div>
        </div>
        ${cvssDetails ? `<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">CVSS v3.1 Score</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:32px;font-weight:700;color:${this.getCvssColor(cvssDetails.score)}">${cvssDetails.score}</div><span class="badge badge-${String(cvssDetails.severity).toLowerCase()}">${cvssDetails.severity}</span></div><div style="font-size:12px;color:var(--text-muted);font-family:monospace">${cvssDetails.vector}</div><div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:12px"><div><strong>Attack Vector:</strong> ${cvssDetails.descriptions.attackVector}</div><div><strong>Complexity:</strong> ${cvssDetails.descriptions.attackComplexity}</div><div><strong>Privileges:</strong> ${cvssDetails.descriptions.privilegesRequired}</div><div><strong>User Interaction:</strong> ${cvssDetails.descriptions.userInteraction}</div></div></div></div>` : ''}
        ${epss ? `<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">EPSS Intelligence ${epssLive ? '<span class="badge badge-info">LIVE</span>' : ''}</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>EPSS Score:</span><strong>${Formatters.formatEpss(epss.score)}</strong></div><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Percentile:</span><strong>${Formatters.formatPercentile(epss.percentile)}</strong></div><div style="margin-top:12px;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px"><strong>Interpretation:</strong> ${window.EpssEngine.getRiskInterpretation(epss.score, epss.percentile)}</div></div></div>` : ''}
        ${kevInfo ? `<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">CISA Known Exploited Vulnerability ${window.KevEngine.source === 'live' ? '<span class="badge badge-passed">LIVE</span>' : ''}</h3><div style="padding:16px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);border-radius:var(--radius-md)"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Date Added:</span><strong>${Formatters.formatDate(kevInfo.dateAdded)}</strong></div><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Due Date:</span><strong>${Formatters.formatDate(kevInfo.dueDate)}</strong></div><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Ransomware:</span><strong>${kevInfo.knownRansomwareCampaign === 'Known' ? 'YES' : 'Unknown'}</strong></div><div style="margin-top:12px"><strong>Required Action:</strong><p style="margin-top:4px;font-size:13px">${Formatters.escapeHtml(kevInfo.requiredAction)}</p></div></div></div>` : ''}
        <div style="margin-bottom:20px"><h3 style="margin-bottom:12px">Priority Assessment</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:32px;font-weight:700">${priority.score}/100</div><span class="priority-badge priority-${priority.priorityCode.toLowerCase()}">${priority.priority}</span></div><div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">${priority.explanation}</div>${priority.factors.length ? `<div style="font-size:12px"><strong>Risk Factors:</strong><ul style="margin-top:8px;padding-left:20px">${priority.factors.slice(0, 5).map(f => `<li style="margin-bottom:4px">${f.reason}</li>`).join('')}</ul></div>` : ''}</div></div>
        ${this.slaSection(cve)}
        ${this.mitigationSection(cve)}
        <div style="margin-bottom:20px"><h3 style="margin-bottom:12px">Remediation</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><p style="margin:0">${Formatters.escapeHtml(cve.remediation)}</p>${cve.vendorAdvisory ? `<div style="margin-top:12px"><a href="${cve.vendorAdvisory}" target="_blank" rel="noopener" class="btn btn-sm btn-primary"><i class="bi bi-link-45deg"></i> Vendor Advisory</a></div>` : ''}</div></div>`;
        this.showModal(cve.id, body, `<button class="btn btn-secondary" onclick="window.app.closeModal()">Close</button><button class="btn btn-primary" onclick="window.app.showAssetContextModal('${cveId}')"><i class="bi bi-hdd"></i> Asset Context</button>`);
    }
    getCvssColor(s) { if (s >= 9) return '#dc2626'; if (s >= 7) return '#ef4444'; if (s >= 4) return '#f59e0b'; if (s >= 0.1) return '#10b981'; return '#64748b'; }

    showAssetContextModal(cveId) {
        const ex = window.storage.getAssetContext(cveId);
        this.showModal('Asset Context', `
        <p style="margin-bottom:16px">Associate asset context with ${cveId} to improve priority scoring.</p>
        <div class="form-group"><label class="form-label">Asset Name</label><input type="text" class="form-input" id="assetName" value="${ex ? Formatters.escapeHtml(ex.assetName || '') : ''}" placeholder="e.g., Web Server 01"></div>
        <div class="form-group"><label class="form-label">Business Criticality</label><select class="form-select" id="businessCriticality"><option value="Low" ${ex && ex.businessCriticality === 'Low' ? 'selected' : ''}>Low</option><option value="Medium" ${ex && ex.businessCriticality === 'Medium' ? 'selected' : ''}>Medium</option><option value="High" ${ex && ex.businessCriticality === 'High' ? 'selected' : ''}>High</option><option value="Critical" ${ex && ex.businessCriticality === 'Critical' ? 'selected' : ''}>Critical</option></select></div>
        <div class="form-group"><label class="form-check"><input type="checkbox" id="internetExposed" ${ex && ex.internetExposed ? 'checked' : ''}><span>Internet Exposed</span></label></div>
        <div class="form-group"><label class="form-label">Owner</label><input type="text" class="form-input" id="assetOwner" value="${ex ? Formatters.escapeHtml(ex.owner || '') : ''}" placeholder="e.g., IT Security Team"></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="assetNotes" placeholder="Additional context...">${ex ? Formatters.escapeHtml(ex.notes || '') : ''}</textarea></div>`,
            `<button class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>${ex ? `<button class="btn btn-danger" onclick="window.app.removeAssetContext('${cveId}')">Remove</button>` : ''}<button class="btn btn-primary" onclick="window.app.saveAssetContext('${cveId}')">Save</button>`);
    }
    saveAssetContext(cveId) {
        window.storage.saveAssetContext(cveId, { assetName: document.getElementById('assetName').value, businessCriticality: document.getElementById('businessCriticality').value, internetExposed: document.getElementById('internetExposed').checked, owner: document.getElementById('assetOwner').value, notes: document.getElementById('assetNotes').value });
        this.closeModal(); this.showToast('Asset Context Saved', 'Priority score updated', 'success');
        if (this.currentPage === 'vulnerabilities') this.renderVulnerabilitiesPage(document.getElementById('currentPage'));
    }
    removeAssetContext(cveId) { window.storage.removeAssetContext(cveId); this.closeModal(); this.showToast('Asset Context Removed', 'Context deleted', 'info'); if (this.currentPage === 'vulnerabilities') this.renderVulnerabilitiesPage(document.getElementById('currentPage')); }

    /* ===== COMPLIANCE ===== */
    renderCompliancePage(container) {
        const assessment = window.storage.getComplianceAssessment(), controls = assessment.controls || {};
        const result = window.ComplianceScoringEngine.calculateScore(this.controlsData, controls);
        container.innerHTML = `
        <div class="page-header"><div class="page-header-row"><div><h2>Security Compliance</h2><p>Assess security posture against ${this.controlsData.length} controls</p></div><button class="btn btn-primary" onclick="window.app.showExportComplianceModal()"><i class="bi bi-download"></i> Export Report</button></div></div>
        <div class="metrics-grid">
            <div class="metric-card"><div class="metric-icon ${result.overallScore >= 80 ? 'success' : result.overallScore >= 60 ? 'warning' : 'danger'}"><i class="bi bi-check-circle-fill"></i></div><div class="metric-info"><div class="metric-label">Compliance Score</div><div class="metric-value">${result.overallScore}%</div><div style="font-size:12px;color:${result.scoreLevel.color};margin-top:4px">${result.scoreLevel.level}</div></div></div>
            <div class="metric-card"><div class="metric-icon success"><i class="bi bi-check2"></i></div><div class="metric-info"><div class="metric-label">Passed</div><div class="metric-value">${result.breakdown.passed}</div></div></div>
            <div class="metric-card"><div class="metric-icon danger"><i class="bi bi-x"></i></div><div class="metric-info"><div class="metric-label">Failed</div><div class="metric-value">${result.breakdown.failed}</div></div></div>
            <div class="metric-card"><div class="metric-icon warning"><i class="bi bi-dash-circle"></i></div><div class="metric-info"><div class="metric-label">Partial</div><div class="metric-value">${result.breakdown.partial}</div></div></div>
            <div class="metric-card"><div class="metric-icon secondary"><i class="bi bi-question-circle"></i></div><div class="metric-info"><div class="metric-label">Not Assessed</div><div class="metric-value">${result.breakdown.notAssessed}</div></div></div>
        </div>
        <div class="grid-2 mb-3">
            <div class="card"><div class="card-header"><h3 class="card-title">Category Breakdown</h3></div><div class="card-body">${Object.entries(result.categoryScores).map(([cat, d]) => `<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-weight:500">${cat}</span><span style="font-weight:600">${Math.round(d.score)}%</span></div><div class="progress-bar"><div class="progress-fill ${d.score >= 80 ? 'success' : d.score >= 60 ? 'warning' : 'danger'}" style="width:${d.score}%"></div></div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">${d.passed} passed, ${d.failed} failed of ${d.count}</div></div>`).join('')}</div></div>
            <div class="card"><div class="card-header"><h3 class="card-title">Top Recommendations</h3></div><div class="card-body">${this.renderTopRecommendations(controls)}</div></div>
        </div>
        <div class="card"><div class="card-header"><h3 class="card-title">Framework Compliance</h3></div><div class="card-body"><div class="chart-container"><canvas id="complianceFrameworkChart"></canvas></div></div></div>`;
        this.renderComplianceFrameworkChart();
    }
    renderTopRecommendations(controls) {
        const recs = window.ComplianceScoringEngine.generateRecommendations(this.controlsData, controls).slice(0, 5);
        if (!recs.length) return '<div class="empty-state"><i class="bi bi-check-circle"></i><p>No recommendations. All assessed controls passed.</p></div>';
        return recs.map((r, i) => `<div style="padding:12px;border-bottom:1px solid var(--border-color);${i === recs.length - 1 ? 'border-bottom:none' : ''}"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px"><div style="font-weight:600">${Formatters.escapeHtml(r.controlName)}</div><span class="badge badge-${r.severity.toLowerCase()}">${r.severity}</span></div><div style="font-size:12px;color:var(--text-secondary)">${r.type}</div><div style="font-size:12px;margin-top:4px">${Formatters.escapeHtml(r.recommendation)}</div></div>`).join('');
    }
    renderComplianceFrameworkChart() {
        setTimeout(() => {
            const ctx = document.getElementById('complianceFrameworkChart');
            if (!ctx || !window.Chart) return;
            const assessment = window.storage.getComplianceAssessment();
            const fwScores = window.ComplianceScoringEngine.calculateFrameworkScores(this.controlsData, assessment.controls || {});
            this.charts.compFw = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(fwScores), datasets: [{ label: 'Compliance %', data: Object.values(fwScores).map(v => v.overallScore), backgroundColor: '#0ea5e9', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }, y: { ticks: { color: '#94a3b8' }, grid: { display: false } } } } });
        }, 100);
    }
    showExportComplianceModal() {
        this.showModal('Export Compliance Report', '<p style="margin-bottom:16px">Export compliance report:</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><button class="btn btn-outline" onclick="window.app.exportComplianceReport(\'json\')"><i class="bi bi-filetype-json"></i> JSON</button><button class="btn btn-outline" onclick="window.app.exportComplianceReport(\'html\')"><i class="bi bi-filetype-html"></i> HTML</button><button class="btn btn-outline" onclick="window.app.exportComplianceReport(\'csv\')"><i class="bi bi-filetype-csv"></i> CSV</button></div>', '<button class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>');
    }
    exportComplianceReport(format) {
        const assessment = window.storage.getComplianceAssessment(), controls = assessment.controls || {};
        const result = window.ComplianceScoringEngine.calculateScore(this.controlsData, controls);
        const recs = window.ComplianceScoringEngine.generateRecommendations(this.controlsData, controls);
        const failed = this.controlsData.filter(c => controls[c.id] && controls[c.id].status === 'Failed');
        const report = window.ReportEngine.generateComplianceReport({ overallScore: result.overallScore, scoreLevel: result.scoreLevel, breakdown: result.breakdown, categoryScores: result.categoryScores, failedControls: failed, recommendations: recs });
        if (format === 'json') window.ReportEngine.exportToJSON(report);
        else if (format === 'html') window.ReportEngine.exportToHTML(report);
        else if (format === 'csv') window.ReportEngine.exportToCSV(failed.map(c => ({ ID: c.id, Name: c.name, Category: c.category, Framework: c.framework, Severity: c.severity, Status: controls[c.id].status, Recommendation: c.recommendation })), 'compliance-failed-controls');
        this.closeModal(); this.showToast('Report Exported', `Downloaded as ${format.toUpperCase()}`, 'success');
    }

    /* ===== CONTROLS ===== */
    renderControlsPage(container) {
        const assessment = window.storage.getComplianceAssessment();
        container.innerHTML = `
        <div class="page-header"><div class="page-header-row"><div><h2>Security Controls</h2><p>Assess ${this.controlsData.length} security controls across multiple frameworks</p></div></div></div>
        <div class="filter-bar">
            <div class="filter-group"><label class="filter-label">Framework:</label><select class="filter-select" id="frameworkFilter" onchange="window.app.filterControls()"><option value="all">All</option><option value="CIS-aligned">CIS-aligned</option><option value="Windows Security">Windows Security</option><option value="NIST-inspired">NIST-inspired</option><option value="ISO 27001-inspired">ISO 27001-inspired</option><option value="Microsoft Baseline-aligned">Microsoft Baseline-aligned</option></select></div>
            <div class="filter-group"><label class="filter-label">Category:</label><select class="filter-select" id="categoryFilter" onchange="window.app.filterControls()"><option value="all">All</option><option value="Identity">Identity</option><option value="Endpoint Security">Endpoint Security</option><option value="Windows Hardening">Windows Hardening</option><option value="Vulnerability Management">Vulnerability Management</option><option value="Network Security">Network Security</option><option value="Application Security">Application Security</option><option value="Data Protection">Data Protection</option><option value="Monitoring">Monitoring</option></select></div>
            <div class="filter-group"><label class="filter-label">Status:</label><select class="filter-select" id="statusFilter" onchange="window.app.filterControls()"><option value="all">All</option><option value="Passed">Passed</option><option value="Failed">Failed</option><option value="Partially Compliant">Partial</option><option value="Not Assessed">Not Assessed</option><option value="Risk Accepted">Risk Accepted</option></select></div>
        </div>
        <div id="controlsList">${this.renderControlsList(this.controlsData, assessment.controls || {})}</div>`;
    }
    renderControlsList(controls, assessments) {
        if (!controls.length) return '<div class="empty-state"><i class="bi bi-list-check"></i><h3>No Controls Found</h3><p>Ensure js/compliance/controls-data.js is loaded.</p></div>';
        return controls.map(c => {
            const a = assessments[c.id], status = a ? a.status : 'Not Assessed';
            const statusClass = status.toLowerCase().replace(/\s+/g, '-');
            const linked = window.MitigationEngine.getCvesForControl(c.id).length;
            return `<div class="card mb-2"><div style="display:flex;justify-content:space-between;align-items:start"><div style="flex:1"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap"><span style="font-weight:600;font-size:15px">${c.id}</span><span class="badge badge-${c.severity.toLowerCase()}">${c.severity}</span><span class="badge badge-info">${c.framework}</span><span class="badge badge-not-assessed">${c.category}</span>${linked ? `<span class="badge badge-high">${linked} linked CVE${linked > 1 ? 's' : ''}</span>` : ''}</div><div style="font-weight:600;font-size:16px;margin-bottom:8px">${Formatters.escapeHtml(c.name)}</div><p style="color:var(--text-secondary);margin-bottom:8px;font-size:13px">${Formatters.escapeHtml(c.description)}</p>${a && a.evidence ? `<div style="font-size:12px;color:var(--text-muted)"><strong>Evidence:</strong> ${Formatters.escapeHtml(a.evidence)}</div>` : ''}</div><div style="display:flex;flex-direction:column;align-items:end;gap:8px"><span class="badge badge-${statusClass}">${status}</span><button class="btn btn-sm btn-primary" onclick="window.app.assessControl('${c.id}')"><i class="bi bi-pencil"></i> Assess</button></div></div></div>`;
        }).join('');
    }
    filterControls() {
        const fw = document.getElementById('frameworkFilter').value, cat = document.getElementById('categoryFilter').value, st = document.getElementById('statusFilter').value;
        let filtered = this.controlsData;
        if (fw !== 'all') filtered = filtered.filter(c => c.framework === fw);
        if (cat !== 'all') filtered = filtered.filter(c => c.category === cat);
        if (st !== 'all') { const a = window.storage.getComplianceAssessment().controls || {}; filtered = filtered.filter(c => { const x = a[c.id]; return (x ? x.status : 'Not Assessed') === st; }); }
        document.getElementById('controlsList').innerHTML = this.renderControlsList(filtered, window.storage.getComplianceAssessment().controls || {});
    }
    assessControl(controlId) {
        const control = this.controlsData.find(c => c.id === controlId);
        if (!control) return;
        this.replaceHash('control/' + controlId);
        const ex = window.storage.getControlAssessment(controlId);
        this.showModal('Assess Control', `
        <div style="margin-bottom:16px"><div style="font-size:12px;color:var(--text-muted)">${control.id} • ${control.framework} • ${control.category}</div><h3 style="margin:8px 0">${Formatters.escapeHtml(control.name)}</h3><p style="color:var(--text-secondary)">${Formatters.escapeHtml(control.description)}</p></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="controlStatus"><option value="Not Assessed" ${ex && ex.status === 'Not Assessed' ? 'selected' : ''}>Not Assessed</option><option value="Passed" ${ex && ex.status === 'Passed' ? 'selected' : ''}>Passed</option><option value="Failed" ${ex && ex.status === 'Failed' ? 'selected' : ''}>Failed</option><option value="Partially Compliant" ${ex && ex.status === 'Partially Compliant' ? 'selected' : ''}>Partially Compliant</option><option value="Risk Accepted" ${ex && ex.status === 'Risk Accepted' ? 'selected' : ''}>Risk Accepted</option></select></div>
        <div class="form-group"><label class="form-label">Evidence / Notes</label><textarea class="form-textarea" id="controlEvidence" placeholder="Enter evidence, ticket numbers, or notes...">${ex ? Formatters.escapeHtml(ex.evidence || '') : ''}</textarea></div>
        <div class="form-group"><label class="form-label">Owner</label><input type="text" class="form-input" id="controlOwner" value="${ex ? Formatters.escapeHtml(ex.owner || '') : ''}" placeholder="Responsible person or team"></div>
        <div class="form-group"><label class="form-label">Remediation Date</label><input type="date" class="form-input" id="controlRemediationDate" value="${ex ? ex.remediationDate || '' : ''}"></div>
        ${this.controlCveSection(controlId)}
        <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);margin-top:16px"><strong>Recommendation:</strong><p style="margin-top:4px;font-size:13px">${Formatters.escapeHtml(control.recommendation)}</p></div>`,
            `<button class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button><button class="btn btn-primary" onclick="window.app.saveControlAssessment('${controlId}')">Save Assessment</button>`);
    }
    saveControlAssessment(controlId) {
        window.storage.saveControlAssessment(controlId, { status: document.getElementById('controlStatus').value, evidence: document.getElementById('controlEvidence').value, owner: document.getElementById('controlOwner').value, remediationDate: document.getElementById('controlRemediationDate').value });
        this.closeModal(); this.showToast('Assessment Saved', 'Control assessment saved', 'success');
        if (this.currentPage === 'controls') this.renderControlsPage(document.getElementById('currentPage'));
    }

    /* ===== LINKAGE ===== */
    mitigationSection(cve) {
        const links = window.MitigationEngine.getControlsForCve(cve);
        if (!links.length) return '';
        return `<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">Mitigating Controls</h3><div style="display:flex;flex-wrap:wrap;gap:8px">${links.map(l => `<button class="filter-chip" title="${Formatters.escapeHtml(l.how)}" onclick="window.app.gotoControl('${l.id}')"><i class="bi bi-shield-check"></i> ${l.id} · ${Formatters.escapeHtml(l.name)} ${l.strength === 'primary' ? '<span class="badge badge-high">Primary</span>' : '<span class="badge badge-info">Supporting</span>'}</button>`).join('')}</div><p style="margin-top:8px;font-size:12px;color:var(--text-muted)">Click a control to review or assess it.</p></div>`;
    }
    controlCveSection(controlId) {
        const cves = window.MitigationEngine.getCvesForControl(controlId);
        if (!cves.length) return '';
        return `<div style="margin-top:16px"><strong>Addresses these tracked CVEs:</strong><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${cves.map(c => `<button class="filter-chip" onclick="window.app.showCveFromControl('${c.id}')">${c.id}</button>`).join('')}</div></div>`;
    }
    gotoControl(controlId) {
        this.closeModal();
        this.navigate('controls');
        setTimeout(() => this.assessControl(controlId), 150);
    }
    showCveFromControl(cveId) { this.closeModal(); this.navigate('vulnerabilities'); this.showCveDetails(cveId); }

    /* ===== SLA / OVERDUE ===== */
    slaBadge(cve) { const e = window.SlaEngine.evaluate(cve); return `<span class="badge ${window.SlaEngine.badgeClass(e.status)}">${e.label}</span>`; }
    slaSection(cve) {
        const e = window.SlaEngine.evaluate(cve);
        const days = window.SlaEngine.slaDays(cve);
        const kev = window.KevEngine.getKevInfo(cve.id);
        return `<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">Remediation SLA</h3><div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Status:</span><span class="badge ${window.SlaEngine.badgeClass(e.status)}">${e.label}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>SLA Target:</span><strong>${kev && kev.dueDate ? 'CISA KEV due ' + Formatters.formatDate(kev.dueDate) : days + ' days (' + cve.severity + ')'}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Days Since Published:</span><strong>${e.daysSince || 0}</strong></div>
        <div style="margin-top:12px;display:flex;gap:8px">${e.status !== 'remediated' ? `<button class="btn btn-sm btn-success" onclick="window.app.markRemediated('${cve.id}')"><i class="bi bi-check2"></i> Mark Remediated</button>` : `<button class="btn btn-sm btn-secondary" onclick="window.app.reopenCve('${cve.id}')"><i class="bi bi-arrow-counterclockwise"></i> Reopen</button>`}</div>
        </div></div>`;
    }
    markRemediated(id) { window.storage.saveRemediationItem(id, { status: 'Remediated', date: new Date().toISOString() }); this.showToast('Remediated', id + ' marked as remediated', 'success'); if (this.currentPage === 'vulnerabilities') this.renderVulnerabilitiesPage(document.getElementById('currentPage')); }
    reopenCve(id) { window.storage.removeRemediationItem(id); this.showToast('Reopened', id + ' reopened', 'info'); if (this.currentPage === 'vulnerabilities') this.renderVulnerabilitiesPage(document.getElementById('currentPage')); }
    saveSlaConfig() { const cfg = {}; ['Critical', 'High', 'Medium', 'Low'].forEach(s => { const el = document.getElementById('sla_' + s); if (el) cfg[s] = parseInt(el.value) || 0; }); window.SlaEngine.save(cfg); this.showToast('SLA Updated', 'SLA targets saved', 'success'); this.renderSettingsPage(document.getElementById('currentPage')); }

    /* ===== REPORTS ===== */
    renderReportsPage(container) {
        container.innerHTML = `<div class="page-header"><h2>Reports</h2><p>Generate and export security reports</p></div>
        <div class="grid-3">
            <div class="card"><div class="card-header"><h3 class="card-title"><i class="bi bi-building"></i> Executive Report</h3></div><p style="color:var(--text-secondary);margin-bottom:16px">High-level overview of enterprise security posture including risk scores and top recommendations.</p><button class="btn btn-primary" onclick="window.app.generateReport('executive')"><i class="bi bi-file-earmark-text"></i> Generate</button></div>
            <div class="card"><div class="card-header"><h3 class="card-title"><i class="bi bi-shield-exclamation"></i> Vulnerability Report</h3></div><p style="color:var(--text-secondary);margin-bottom:16px">Detailed vulnerability analysis with CVSS, EPSS, KEV data and prioritization.</p><button class="btn btn-primary" onclick="window.app.generateReport('vulnerability')"><i class="bi bi-file-earmark-text"></i> Generate</button></div>
            <div class="card"><div class="card-header"><h3 class="card-title"><i class="bi bi-check2-square"></i> Compliance Report</h3></div><p style="color:var(--text-secondary);margin-bottom:16px">Compliance assessment results with framework scores and recommendations.</p><button class="btn btn-primary" onclick="window.app.generateReport('compliance')"><i class="bi bi-file-earmark-text"></i> Generate</button></div>
        </div>`;
    }
    generateReport(type) {
        const stats = window.cveSearch.getStatistics(), comp = this.getComplianceStats(), risk = this.calculateUnifiedRiskScore();
        let report;
        if (type === 'executive') { const a = window.storage.getComplianceAssessment(); const recs = window.ComplianceScoringEngine.generateRecommendations(this.controlsData, a.controls || {}); report = window.ReportEngine.generateExecutiveReport({ riskScore: risk.score, totalVulns: stats.total, criticalVulns: stats.critical, complianceScore: comp.score, kevCount: window.KevEngine.count, topRisks: [{ factor: 'KEV Exposure', score: stats.kevCount }, { factor: 'Critical Vulns', score: stats.critical }], recommendations: recs.slice(0, 5) }); }
        else if (type === 'vulnerability') { report = window.ReportEngine.generateVulnerabilityReport({ statistics: stats, vulnerabilities: window.cveSearch.cveData, kevCount: window.KevEngine.count, highEpssCount: stats.highEpssCount }); }
        else if (type === 'compliance') { const a = window.storage.getComplianceAssessment(); const result = window.ComplianceScoringEngine.calculateScore(this.controlsData, a.controls || {}); const recs = window.ComplianceScoringEngine.generateRecommendations(this.controlsData, a.controls || {}); const failed = this.controlsData.filter(c => a.controls[c.id] && a.controls[c.id].status === 'Failed'); report = window.ReportEngine.generateComplianceReport({ overallScore: result.overallScore, scoreLevel: result.scoreLevel, breakdown: result.breakdown, categoryScores: result.categoryScores, failedControls: failed, recommendations: recs }); }
        window.currentReport = report; window.currentReportType = type;
        this.showModal('Report Generated', `<p style="margin-bottom:16px">Report generated successfully. Choose export format:</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><button class="btn btn-outline" onclick="window.app.exportReport('json','${type}')"><i class="bi bi-filetype-json"></i> JSON</button><button class="btn btn-outline" onclick="window.app.exportReport('html','${type}')"><i class="bi bi-filetype-html"></i> HTML</button><button class="btn btn-outline" onclick="window.app.exportReport('csv','${type}')"><i class="bi bi-filetype-csv"></i> CSV</button></div><div style="margin-top:16px;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:12px"><strong>Report:</strong> ${report.title}<br><strong>Generated:</strong> ${Formatters.formatDateTime(report.generatedAt)}</div>`, '<button class="btn btn-secondary" onclick="window.app.closeModal()">Close</button>');
    }
    exportReport(format, type) {
        const report = window.currentReport; if (!report) return;
        if (format === 'json') window.ReportEngine.exportToJSON(report);
        else if (format === 'html') window.ReportEngine.exportToHTML(report);
        else if (format === 'csv') {
            if (type === 'vulnerability') window.ReportEngine.exportToCSV(window.cveSearch.cveData.map(c => ({ CVE: c.id, Title: c.title, Severity: c.severity, CVSS: c.cvss ? c.cvss.baseScore : '', Vendor: c.vendor, Product: c.product, Published: c.publishedDate, KEV: c.knownExploitation ? 'Yes' : 'No' })), 'vulnerabilities');
            else if (type === 'compliance') { const a = window.storage.getComplianceAssessment(); window.ReportEngine.exportToCSV(this.controlsData.map(c => ({ ID: c.id, Name: c.name, Category: c.category, Framework: c.framework, Severity: c.severity, Status: a.controls[c.id] ? a.controls[c.id].status : 'Not Assessed' })), 'compliance-controls'); }
        }
        this.showToast('Export Complete', `Downloaded as ${format.toUpperCase()}`, 'success');
    }

    /* ===== HISTORY ===== */
    renderHistoryPage(container) {
        const sh = window.storage.getCveSearchHistory(), rh = window.storage.getRiskScoreHistory();
        container.innerHTML = `<div class="page-header"><div class="page-header-row"><div><h2>History</h2><p>View previous searches and risk score history</p></div><button class="btn btn-danger" onclick="window.app.clearHistory()"><i class="bi bi-trash"></i> Clear All</button></div></div>
        <div class="grid-2">
            <div class="card"><div class="card-header"><h3 class="card-title">Search History</h3></div><div class="card-body">${!sh.length ? '<div class="empty-state"><i class="bi bi-search"></i><p>No search history</p></div>' : sh.map(h => `<div style="padding:12px;border-bottom:1px solid var(--border-color)"><div style="font-weight:500">${Formatters.escapeHtml(h.query)}</div><div style="font-size:12px;color:var(--text-muted)">${h.results} results • ${Formatters.timeAgo(h.timestamp)}</div></div>`).join('')}</div></div>
            <div class="card"><div class="card-header"><h3 class="card-title">Risk Score History</h3></div><div class="card-body">${!rh.length ? '<div class="empty-state"><i class="bi bi-graph-up"></i><p>No risk score history</p></div>' : rh.slice(0, 10).map(h => `<div style="padding:12px;border-bottom:1px solid var(--border-color)"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:600;color:${this.getRiskColor(h.score)}">${h.score}/100</div><div style="font-size:12px;color:var(--text-muted)">${Formatters.timeAgo(h.timestamp)}</div></div><div style="font-size:12px;color:var(--text-secondary)">${this.getRiskLevel(h.score)}</div></div>`).join('')}</div></div>
        </div>`;
    }
    clearHistory() { if (confirm('Clear all history? This cannot be undone.')) { window.storage.remove('cveSearchHistory'); window.storage.remove('riskScoreHistory'); this.renderHistoryPage(document.getElementById('currentPage')); this.showToast('History Cleared', 'All history deleted', 'success'); } }

    /* ===== ABOUT ===== */
    renderAboutPage(container) {
        container.innerHTML = `<div class="page-header"><h2>About VulnComply Intelligence</h2><p>Professional vulnerability and compliance intelligence platform</p></div>
        <div class="grid-2">
            <div class="card"><div class="card-header"><h3 class="card-title">Project Overview</h3></div><p style="color:var(--text-secondary);line-height:1.8">VulnComply Intelligence is an open-source cybersecurity platform combining CVE exploit intelligence, vulnerability prioritization, security compliance assessment, and unified risk scoring with real-time data, control-to-CVE linkage, deep-links, a command palette and SLA/overdue tracking.</p><h4 style="margin-top:16px">Key Features</h4><ul style="color:var(--text-secondary);padding-left:20px;line-height:2"><li>CVE Search with CVSS v3.1, EPSS, and CISA KEV</li><li>Live NVD lookup for any real CVE (no API key)</li><li>Live CISA KEV catalog + live FIRST EPSS</li><li>Multi-factor vulnerability prioritization (P1-P5)</li><li>120 security controls across 8 categories</li><li>Control-to-CVE mitigation linkage</li><li>Deep-links + Ctrl+K command palette</li><li>SLA / overdue tracking with remediation workflow</li><li>Unified enterprise risk scoring (0-100)</li><li>Report generation (HTML, JSON, CSV)</li><li>Privacy-first architecture (no backend)</li></ul></div>
            <div class="card"><div class="card-header"><h3 class="card-title">Technology Stack</h3></div><ul style="color:var(--text-secondary);padding-left:20px;line-height:2"><li><strong>HTML5:</strong> Semantic markup</li><li><strong>CSS3:</strong> Modern CSS with variables</li><li><strong>JavaScript ES6+:</strong> Vanilla JS modules</li><li><strong>Bootstrap 5:</strong> UI components (CDN)</li><li><strong>Bootstrap Icons:</strong> Icon library (CDN)</li><li><strong>Chart.js:</strong> Data visualization (CDN)</li><li><strong>LocalStorage:</strong> Client-side persistence</li></ul><div style="margin-top:16px;padding:12px;background:rgba(14,165,233,.1);border:1px solid rgba(14,165,233,.3);border-radius:var(--radius-md);font-size:13px"><strong>Privacy Model:</strong> All data stays in your browser. No backend, no telemetry, no API keys required.</div></div>
        </div>
        <div class="card mt-2"><div class="card-header"><h3 class="card-title">Author & License</h3></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px"><div><h4>Author</h4><p style="color:var(--text-secondary);margin-bottom:8px"><strong>Nandha Kumar M</strong></p><p style="color:var(--text-secondary)">Senior Cybersecurity Engineer</p><a href="https://www.linkedin.com/in/nandha-kumar-m-952342159/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;margin-top:8px"><i class="bi bi-linkedin"></i> LinkedIn Profile</a></div><div><h4>License</h4><p style="color:var(--text-secondary);margin-bottom:8px"><strong>MIT License</strong></p><p style="color:var(--text-secondary)">Free for personal and commercial use.</p></div></div></div>
        <div class="card mt-2"><div class="card-header"><h3 class="card-title">Disclaimer</h3></div><p style="color:var(--text-secondary);line-height:1.8;font-size:13px">This tool provides security intelligence and assessment support. Results depend on data quality and user-provided context. It does not replace professional vulnerability assessment, vendor advisories, penetration testing, or compliance audits.</p><p style="color:var(--text-secondary);line-height:1.8;font-size:13px;margin-top:12px"><strong>Framework Alignments:</strong> "CIS-aligned" - Inspired by CIS Critical Security Controls. "NIST-inspired" - Reference-aligned with NIST CSF. "ISO 27001-inspired" - Reference-aligned with ISO 27001. "Microsoft baseline-aligned" - Inspired by Microsoft security baselines.</p><p style="color:var(--text-muted);font-size:12px;margin-top:12px;font-style:italic">This tool does not claim official certification or endorsement from any standards organization.</p></div>`;
    }

    /* ===== SETTINGS ===== */
    renderSettingsPage(container) {
        const usage = window.storage.getUsage ? window.storage.getUsage() : { used: 0, formatted: '0 B' };
        const liveOn = window.LiveData ? window.LiveData.config.enabled : true;
        const proxyOn = window.LiveData ? window.LiveData.config.useProxy : true;
        container.innerHTML = `<div class="page-header"><h2>Settings</h2><p>Configure application preferences</p></div>
        <div class="grid-2">
            <div class="card"><div class="card-header"><h3 class="card-title">Appearance</h3></div><div class="form-group"><label class="form-label">Theme</label><div style="display:flex;gap:8px"><button class="btn btn-sm ${this.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.setTheme('dark')"><i class="bi bi-moon-stars-fill"></i> Dark</button><button class="btn btn-sm ${this.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.setTheme('light')"><i class="bi bi-sun-fill"></i> Light</button></div></div></div>
            <div class="card"><div class="card-header"><h3 class="card-title">Data Management</h3></div><div style="margin-bottom:16px"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Storage Used: <strong>${usage.formatted}</strong></div><div class="progress-bar"><div class="progress-fill primary" style="width:${Math.min((usage.used / 5000000) * 100, 100)}%"></div></div></div><div style="display:flex;flex-direction:column;gap:8px"><button class="btn btn-outline" onclick="window.app.exportAllData()"><i class="bi bi-download"></i> Export All Data</button><button class="btn btn-outline" onclick="window.app.importData()"><i class="bi bi-upload"></i> Import Data</button><button class="btn btn-danger" onclick="window.app.clearAllData()"><i class="bi bi-trash"></i> Clear All Data</button></div></div>
        </div>
        <div class="card mt-2"><div class="card-header"><h3 class="card-title">Remediation SLA Targets (days)</h3></div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${['Critical', 'High', 'Medium', 'Low'].map(s => `<div class="form-group"><label class="form-label">${s}</label><input type="number" class="form-input" id="sla_${s}" value="${window.SlaEngine.config[s]}"></div>`).join('')}</div>
            <button class="btn btn-primary" onclick="window.app.saveSlaConfig()"><i class="bi bi-save"></i> Save SLA</button>
        </div>
        <div class="card mt-2"><div class="card-header"><h3 class="card-title">Live Data (Real-Time)</h3><span class="badge ${window.KevEngine.source === 'live' ? 'badge-passed' : 'badge-medium'}">${window.KevEngine.source === 'live' ? 'LIVE' : 'DEMO'}</span></div>
            <div class="form-group"><label class="form-check"><input type="checkbox" ${liveOn ? 'checked' : ''} onchange="window.app.setLiveConfig('enabled', this.checked)"><span>Enable live data (NVD / CISA KEV / FIRST EPSS)</span></label></div>
            <div class="form-group"><label class="form-check"><input type="checkbox" ${proxyOn ? 'checked' : ''} onchange="window.app.setLiveConfig('useProxy', this.checked)"><span>Use CORS proxy fallback (if direct fetch is blocked)</span></label></div>
            <button class="btn btn-primary" onclick="window.app.refreshLiveData(true)"><i class="bi bi-arrow-clockwise"></i> Refresh Live KEV</button>
            <p style="margin-top:12px;font-size:12px;color:var(--text-muted)">Live sources: NVD (CVE), CISA KEV catalog, FIRST EPSS. Falls back to demo data automatically when offline or blocked.</p>
        </div>
        <div class="card mt-2"><div class="card-header"><h3 class="card-title">Data Freshness</h3></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px"><div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">CVE Data</div><div style="font-weight:600">${window.cveSearch.lastUpdated || '2025-01-15'}</div><div style="font-size:11px;color:var(--text-muted)">Demo + Live NVD • ${window.cveSearch.cveData.length} loaded</div></div><div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">EPSS Data</div><div style="font-weight:600">${window.EpssEngine.source === 'live' ? 'LIVE' : 'Demo + Live'}</div><div style="font-size:11px;color:var(--text-muted)">FIRST EPSS</div></div><div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">KEV Data</div><div style="font-weight:600">${window.KevEngine.source === 'live' ? 'LIVE' : 'Demo'}</div><div style="font-size:11px;color:var(--text-muted)">${window.KevEngine.count} entries</div></div><div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Controls</div><div style="font-weight:600">${this.controlsData.length} controls</div><div style="font-size:11px;color:var(--text-muted)">8 categories</div></div></div></div>`;
    }
    setTheme(theme) { this.theme = theme; localStorage.setItem('theme', theme); this.applyTheme(); this.renderSettingsPage(document.getElementById('currentPage')); this.showToast('Theme Updated', `${theme.charAt(0).toUpperCase() + theme.slice(1)} mode activated`, 'success'); }
    exportAllData() {
        const data = window.storage.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = `vulncomply-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        this.showToast('Export Complete', 'All data exported', 'success');
    }
    importData() {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const data = JSON.parse(ev.target.result);
                    const sanitized = Validators.sanitizeImportedData(data);
                    const result = window.storage.importAll(sanitized);
                    if (result.success) { this.showToast('Import Complete', `${result.imported} items imported`, 'success'); this.renderSettingsPage(document.getElementById('currentPage')); }
                    else this.showToast('Import Failed', result.error, 'error');
                } catch (err) { this.showToast('Import Failed', 'Invalid JSON file', 'error'); }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    clearAllData() { if (confirm('Clear ALL data? This includes all assessments, searches, and settings. Cannot be undone.')) { window.storage.clear(); this.showToast('Data Cleared', 'All local data deleted', 'success'); setTimeout(() => window.location.reload(), 1000); } }
    showExportModal() {
        this.showModal('Export Vulnerability Data', '<p style="margin-bottom:16px">Export vulnerability data:</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><button class="btn btn-outline" onclick="window.app.exportVulnData(\'json\')"><i class="bi bi-filetype-json"></i> JSON</button><button class="btn btn-outline" onclick="window.app.exportVulnData(\'html\')"><i class="bi bi-filetype-html"></i> HTML</button><button class="btn btn-outline" onclick="window.app.exportVulnData(\'csv\')"><i class="bi bi-filetype-csv"></i> CSV</button></div>', '<button class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>');
    }
    exportVulnData(format) {
        const stats = window.cveSearch.getStatistics();
        if (format === 'json') { const blob = new Blob([JSON.stringify({ statistics: stats, vulnerabilities: window.cveSearch.cveData }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `vulnerabilities-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
        else if (format === 'html') { const report = window.ReportEngine.generateVulnerabilityReport({ statistics: stats, vulnerabilities: window.cveSearch.cveData, kevCount: window.KevEngine.count, highEpssCount: stats.highEpssCount }); window.ReportEngine.exportToHTML(report); }
        else if (format === 'csv') window.ReportEngine.exportToCSV(window.cveSearch.cveData.map(c => ({ CVE: c.id, Title: c.title, Severity: c.severity, CVSS: c.cvss ? c.cvss.baseScore : '', Vendor: c.vendor, Product: c.product, Published: c.publishedDate, KEV: c.knownExploitation ? 'Yes' : 'No' })), 'vulnerabilities');
        this.closeModal(); this.showToast('Export Complete', `Downloaded as ${format.toUpperCase()}`, 'success');
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new VulnComplyApp(); window.app.init(); });
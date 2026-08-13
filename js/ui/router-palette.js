/**
 * VulnComply Intelligence - Deep-Linking Router + Command Palette (add-on)
 * Wraps the running app; no changes to app.js required.
 * @author Nandha Kumar M | @license MIT
 */
(function () {
    const PAGES = ['dashboard', 'vulnerabilities', 'cve-search', 'compliance', 'controls', 'reports', 'history', 'about', 'settings'];
    let programmatic = null;

    function setHash(h) { programmatic = '#/' + h; location.hash = '/' + h; }
    function replaceHash(h) { history.replaceState(null, '', '#/' + h); }
    function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

    function routeFromHash() {
        const app = window.app; if (!app) return;
        const h = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
        if (!h) { app.loadPage('dashboard'); return; }
        const idx = h.indexOf('/');
        const seg = idx === -1 ? h : h.slice(0, idx);
        const param = idx === -1 ? '' : decodeURIComponent(h.slice(idx + 1));
        if (seg === 'cve' && param) { app.loadPage('vulnerabilities'); app.showCveDetails(param); }
        else if (seg === 'control' && param) { app.loadPage('controls'); app.assessControl(param); }
        else if (PAGES.includes(seg)) { app.loadPage(seg); }
        else app.loadPage('dashboard');
    }

    function wrapApp() {
        const app = window.app; if (!app || app.__routerWrapped) return; app.__routerWrapped = true;
        const origLoad = app.loadPage.bind(app);
        app.loadPage = function (p, ...a) { const r = origLoad(p, ...a); setHash(p); return r; };
        const origShow = app.showCveDetails.bind(app);
        app.showCveDetails = function (id, ...a) { const r = origShow(id, ...a); replaceHash('cve/' + id); return r; };
        const origAssess = app.assessControl.bind(app);
        app.assessControl = function (id, ...a) { const r = origAssess(id, ...a); replaceHash('control/' + id); return r; };
        const origClose = app.closeModal.bind(app);
        app.closeModal = function (...a) { const r = origClose(...a); replaceHash(app.currentPage); return r; };
        window.addEventListener('hashchange', () => {
            if (programmatic && location.hash === programmatic) { programmatic = null; return; }
            programmatic = null; routeFromHash();
        });
        routeFromHash(); // honor initial / shared hash
    }

    /* ===== Command Palette ===== */
    let items = [], sel = 0;
    function openPalette() { const ov = document.getElementById('cmdk'); if (!ov) return; ov.classList.add('active'); const i = document.getElementById('cmdkInput'); i.value = ''; renderPalette(''); i.focus(); }
    function closePalette() { const ov = document.getElementById('cmdk'); if (ov) ov.classList.remove('active'); }
    function onKey(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); paint(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
        else if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) items[sel].run(); closePalette(); }
    }
    function paletteItems(q) {
        q = (q || '').toLowerCase(); const app = window.app; const out = [];
        const has = s => !q || String(s).toLowerCase().includes(q);
        PAGES.forEach(p => { if (has(p)) out.push({ group: 'Pages', icon: 'bi-window', label: p.replace(/-/g, ' '), sub: 'Go to page', run: () => app.loadPage(p) }); });
        [{ label: 'toggle theme', icon: 'bi-circle-half', run: () => app.toggleTheme() },
         { label: 'refresh live data', icon: 'bi-arrow-clockwise', run: () => app.refreshLiveData(true) },
         { label: 'export all data', icon: 'bi-download', run: () => app.exportAllData() }
        ].forEach(a => { if (has(a.label)) out.push({ group: 'Actions', icon: a.icon, label: a.label, sub: 'Run action', run: a.run }); });
        (window.cveSearch ? window.cveSearch.cveData : []).forEach(c => { if (has(c.id) || has(c.title) || has(c.vendor)) out.push({ group: 'CVEs', icon: 'bi-shield-exclamation', label: c.id, sub: c.title, run: () => { app.loadPage('vulnerabilities'); app.showCveDetails(c.id); } }); });
        (app.controlsData || []).forEach(c => { if (has(c.id) || has(c.name)) out.push({ group: 'Controls', icon: 'bi-list-check', label: c.id + ' · ' + c.name, sub: c.category, run: () => { app.loadPage('controls'); app.assessControl(c.id); } }); });
        return out.slice(0, 12);
    }
    function renderPalette(q) { items = paletteItems(q); sel = 0; paint(); }
    function paint() {
        const list = document.getElementById('cmdkList'); if (!list) return;
        if (!items.length) { list.innerHTML = '<div class="cmdk-empty">No matches</div>'; return; }
        list.innerHTML = items.map((it, i) => `<div class="cmdk-item ${i === sel ? 'active' : ''}" data-i="${i}"><i class="bi ${it.icon}"></i><div class="cmdk-txt"><div class="cmdk-label">${escapeHtml(it.label)}</div><div class="cmdk-sub">${escapeHtml(it.sub || it.group)}</div></div><span class="cmdk-group">${it.group}</span></div>`).join('');
        list.querySelectorAll('.cmdk-item').forEach(el => {
            el.addEventListener('click', () => { items[+el.dataset.i].run(); closePalette(); });
            el.addEventListener('mousemove', () => { if (sel !== +el.dataset.i) { sel = +el.dataset.i; paint(); } });
        });
    }
    function buildPalette() {
        if (document.getElementById('cmdk')) return;
        const ov = document.createElement('div');
        ov.id = 'cmdk'; ov.className = 'cmdk-overlay';
        ov.innerHTML = `<div class="cmdk"><div class="cmdk-head"><i class="bi bi-search"></i><input id="cmdkInput" placeholder="Search pages, CVEs, controls, actions..."/><kbd>esc</kbd></div><div class="cmdk-list" id="cmdkList"></div></div>`;
        document.body.appendChild(ov);
        ov.addEventListener('click', e => { if (e.target === ov) closePalette(); });
        document.getElementById('cmdkInput').addEventListener('input', e => renderPalette(e.target.value));
        document.getElementById('cmdkInput').addEventListener('keydown', onKey);
        const actions = document.querySelector('.header-actions');
        if (actions) { const b = document.createElement('button'); b.className = 'theme-toggle'; b.title = 'Command Palette (Ctrl+K)'; b.innerHTML = '<i class="bi bi-command"></i>'; b.onclick = openPalette; actions.prepend(b); }
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
            else if (e.key === 'Escape') { closePalette(); }
        });
    }
    function injectCss() {
        const st = document.createElement('style');
        st.textContent = `.cmdk-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:none;align-items:flex-start;justify-content:center;padding-top:12vh}.cmdk-overlay.active{display:flex}.cmdk{width:min(640px,92vw);background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}.cmdk-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border-color)}.cmdk-head i{color:var(--text-muted)}.cmdk-head input{flex:1;background:none;border:none;outline:none;color:var(--text-primary);font-size:15px}.cmdk-head kbd{font-size:11px;color:var(--text-muted);border:1px solid var(--border-color);border-radius:4px;padding:2px 6px}.cmdk-list{max-height:50vh;overflow-y:auto}.cmdk-item{display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer}.cmdk-item i{color:var(--primary-color)}.cmdk-item.active{background:var(--bg-tertiary)}.cmdk-txt{flex:1;min-width:0}.cmdk-label{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cmdk-sub{font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cmdk-group{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}.cmdk-empty{padding:24px;text-align:center;color:var(--text-muted)}`;
        document.head.appendChild(st);
    }

    document.addEventListener('DOMContentLoaded', () => { injectCss(); buildPalette(); wrapApp(); });
})();
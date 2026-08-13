/**
 * VulnComply Intelligence - ATT&CK & Concealment (unified page, v2)
 * Toggle between Enterprise ATT&CK (attack) and Concealment Matrix (hide).
 * 🔴 Technical · 🟠 Behavioral · 🔵 Physical
 * @author Nandha Kumar M | @license MIT
 */
(function () {
    const CAT_COLOR = { Technical: '#a83a32', Behavioral: '#c96f1a', Physical: '#1f6fd0' };
    const T = (id, name, cat, techs) => ({ id, name, cat, techs });
    const DATA = [
        T('TA:03', 'Anonymous browsing', 'Technical', [
            ['Anonymous Internet connection', 22], ['Anonymous search engine', 1], ['Anti-censorship', 2], ['Anti-fingerprinting', 27], ['Bypass human verification', 2], ['Domain fronting', 0], ['Privacy-conscious alternatives', 4]]),
        T('TA:04', 'Anonymous communication', 'Technical', [
            ['Anonymity protocols', 3], ['Anonymize RPC requests', 0], ['Anonymous email', 9], ['Anonymous instant messaging', 8], ['Anonymous phone number', 8], ['Anonymous support', 0], ['Anonymous tablet', 6], ['Anonymously buy phone', 0], ['Anonymously buy VPN services', 0], ['Proxy', 4], ['Remote Desktop Protocol (RDP)', 1], ['Rent phone numbers', 0], ['Anonymous file sharing', 0]]),
        T('TA:05', 'Anonymous cryptocurrency', 'Technical', [
            ['Anonymous mixer', 1], ['Anonymously buy cryptocurrency', 1], ['Cleaning coins', 1], ['Converting', 1], ['Privacy coins', 1], ['Privacy-preserving cryptocurrency', 2]]),
        T('TA:06', 'Anonymous hosting', 'Technical', [
            ['Bulletproof hosting', 2], ['DMCA ignored', 0], ['Fake servers', 1], ['No-KYC', 1], ['No-log service', 0], ['Offshore hosting', 1], ['Secure hosting', 6], ['Selfhosting', 3], ['BGP-level network infrastructure security', 4]]),
        T('TA:07', 'Anonymous identity', 'Technical', [
            ['Bouncing servers', 0], ['Counter surveillance', 1], ['Emulation', 2], ['Hide DNS requests', 3], ['Leak protection', 69], ['Masking', 4], ['Mix networks', 0], ['Route traffic through Tor', 0], ['Secure identity', 42], ['Temporary phone numbers', 0], ['Virtual Private Network (VPN)', 15], ['Virtualization', 14], ['Anonymous traveling', 0]]),
        T('TA:08', 'Anonymous transactions', 'Technical', [
            ['Buy with cash', 4], ['Cash by mail', 0], ['Cryptocurrency', 27], ['Gift cards', 2]]),
        T('TA:09', 'Data obfuscation', 'Technical', [
            ['Conceal text', 1], ['Steganography', 2]]),
        T('TA:10', 'Physical security', 'Physical', [
            ['Avoid home address for delivery', 3], ['Secure physical storage', 5], ['Shredding', 0], ['Surveillance detection', 3]]),
        T('TA:11', 'Plausible deniability', 'Physical', [
            ['Anti-forensics', 5], ['Encryption', 42], ['Hidden volume', 5], ['Live operating system', 2], ['Physical destruction', 8], ['Sanitization', 12], ['Selfdestruction', 3], ['Wipe traces', 23]]),
        T('TA:12', 'Reduce attack surface', 'Technical', [
            ['Automatic updates', 0], ['Breach detection', 4], ['Decentralization', 14], ['Disable scripts', 2], ['Hardening', 67], ['Identity detox', 1], ['Isolation', 17], ['Prevent hardware access', 0], ['Removal services', 1], ['Restrict permissions', 6], ['Secure hardware', 2], ['Secure operating system', 9], ['Tracking evasion', 1], ['Tracking reduction', 1], ['Wired-only', 0], ['Disposable services', 0], ['Pre-emptive data minimisation', 2]]),
        T('TA:14', 'Risk management', 'Behavioral', [
            ['Monitoring', 3], ['Network monitoring', 5], ['Threat modeling', 9]]),
        T('TA:15', 'Secure behavior', 'Behavioral', [
            ['Add randomness', 3], ['Avoid biometrics', 1], ['Avoid cross-contamination', 1], ['Avoid five-eyes jurisdiction', 0], ['Avoid proprietary software', 3], ['Avoid routines', 2], ['Avoid stylometry', 6], ['Backups', 10], ['Blending in', 1], ['Consistency', 0], ['Deception', 7], ['Disguise', 4], ['Identify scams', 4], ['Password', 22], ['Practice discipline', 0], ['Psychology', 0], ['Silence', 3], ['Situational awareness', 62], ['Vendor vetting', 4], ['Verify integrity', 9], ['Open Source Software (OSS)', 1], ['Avoid bookmarked darknet markets', 0], ['Avoid leaving DNA', 0], ['Compartmentalization', 1], ['Selfeducation', 0]]),
        T('TA:16', 'Tamper protection', 'Behavioral', [
            ['Honeypots', 0], ['Qube templates', 2], ['Secure message signing', 0], ['Tamper-evident hardware', 15], ['Tamper-evident software', 5], ['Tamper-evident storage', 2], ['Tamper detection', 0]])
    ];

    let curView = localStorage.getItem('atkView') || 'enterprise';
    let curCat = 'All', curQuery = '', expanded = new Set();
    const esc = s => Formatters.escapeHtml(s);

    function injectCss() {
        if (document.getElementById('concealCss')) return;
        const st = document.createElement('style'); st.id = 'concealCss';
        st.textContent = `.cm-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.cm-cat{padding:6px 14px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);cursor:pointer;font-size:12px}.cm-cat.active{outline:2px solid var(--primary-color)}.cm-cat .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}.cm-stats{font-size:12px;color:var(--text-muted);margin-bottom:12px}.cm-matrix{display:flex;gap:12px;overflow-x:auto;padding-bottom:10px}.cm-col{min-width:200px;flex:1}.cm-head{border-radius:6px 6px 0 0;padding:10px;color:#fff}.cm-head .tid{font-size:10px;opacity:.8;letter-spacing:1px}.cm-head .tname{font-weight:700;font-size:13px}.cm-head .tcount{font-size:10px;opacity:.85}.cm-tech{background:var(--bg-card);border:1px solid var(--border-color);border-left-width:3px;border-radius:4px;margin-top:6px;padding:8px 10px;font-size:12px;display:flex;justify-content:space-between;align-items:center;gap:8px}.cm-tech .sub{display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px}.cm-tech .plus{cursor:pointer;color:var(--text-muted)}.cm-sub{background:var(--bg-tertiary);border:1px dashed var(--border-color);border-radius:4px;margin-top:4px;padding:6px 8px;font-size:11px;color:var(--text-muted)}`;
        document.head.appendChild(st);
    }

    /* ===== Enterprise ATT&CK (attack) ===== */
    function renderEnterprise(el) {
        const matrix = window.AttackEngine.getMatrix(window.cveSearch.cveData);
        el.innerHTML = `
        <div class="cm-stats">${matrix.length} tactics observed · derived from your tracked CVEs · click a technique for linked CVEs</div>
        <div class="attack-matrix">${matrix.map(g => `
            <div class="attack-col"><div class="attack-tactic">${esc(g.tactic)}</div>
            ${g.techs.map(t => `<button class="attack-tech" title="${esc(t.name)}" onclick="window.appFeature4.showTech('${t.id}')"><span class="t-id">${t.id}</span><span class="t-count">${t.count}</span></button>`).join('')}
            </div>`).join('')}</div>
        <div class="card" style="margin-top:14px"><div style="font-size:12px;color:var(--text-muted)"><i class="bi bi-info-circle"></i> Enterprise ATT&CK maps <strong>how attackers attack</strong>, aggregated from the techniques referenced by your tracked vulnerabilities.</div></div>`;
    }

    /* ===== Concealment Matrix (hide) ===== */
    function visible() {
        return DATA
            .filter(t => curCat === 'All' || t.cat === curCat)
            .map(t => ({ ...t, techs: t.techs.filter(x => !curQuery || x[0].toLowerCase().includes(curQuery)) }))
            .filter(t => t.techs.length);
    }
    function stats(v) { let techs = 0, subs = 0; v.forEach(t => { techs += t.techs.length; t.techs.forEach(x => subs += x[1]); }); return { tactics: v.length, techs, subs }; }
    function renderConceal(el) {
        const v = visible(); const s = stats(v);
        el.innerHTML = `
        <div class="cm-bar">
            <span style="font-size:12px;color:var(--text-muted)">CATEGORY</span>
            ${['All', 'Technical', 'Behavioral', 'Physical'].map(c => `<button class="cm-cat ${curCat === c ? 'active' : ''}" onclick="window.appConceal.setCat('${c}')">${c !== 'All' ? `<span class="dot" style="background:${CAT_COLOR[c]}"></span>` : ''}${c}</button>`).join('')}
            <div style="margin-left:auto" class="search-bar"><i class="bi bi-search"></i><input id="cmSearch" placeholder="Search techniques & subtechniques..." value="${esc(curQuery)}" oninput="window.appConceal.setQuery(this.value)"></div>
        </div>
        <div class="cm-stats">${s.tactics} tactics · ${s.techs} techniques · ${s.subs} subtechniques visible</div>
        <div class="cm-matrix">${v.map(t => `
            <div class="cm-col">
                <div class="cm-head" style="background:${CAT_COLOR[t.cat]}"><div class="tid">${t.id}</div><div class="tname">${esc(t.name)}</div><div class="tcount">${t.techs.length} techniques</div></div>
                ${t.techs.map((x, i) => {
                    const key = t.id + ':' + i;
                    return `<div>
                        <div class="cm-tech" style="border-left-color:${CAT_COLOR[t.cat]}"><span>${esc(x[0])}</span><span class="sub">${x[1]} <span class="plus" onclick="window.appConceal.toggle('${key}')">${expanded.has(key) ? '−' : '+'}</span></span></div>
                        ${expanded.has(key) ? `<div class="cm-sub">${x[1]} sub-technique${x[1] === 1 ? '' : 's'} documented across 200+ clear/dark-web OpSec guides.</div>` : ''}
                    </div>`;
                }).join('')}
            </div>`).join('')}</div>
        <div class="card" style="margin-top:14px"><div style="font-size:12px;color:var(--text-muted)"><i class="bi bi-info-circle"></i> <strong>Legend:</strong> 🔴 Technical ·  Behavioral ·  Physical. Concealment maps <strong>how attackers hide</strong>.</div></div>`;
    }

    /* ===== Page shell + toggle ===== */
    function renderAttackPage(pc) {
        pc.innerHTML = `
        <div class="page-header"><div class="page-header-row">
            <div><h2>ATT&CK & Concealment</h2><p>How attackers attack (enterprise ATT&CK) vs how they hide (concealment OpSec)</p></div>
            <div class="cm-bar" style="margin:0">
                <button class="cm-cat ${curView === 'enterprise' ? 'active' : ''}" onclick="window.appConceal.setView('enterprise')"><i class="bi bi-crosshair"></i> Enterprise ATT&CK</button>
                <button class="cm-cat ${curView === 'concealment' ? 'active' : ''}" onclick="window.appConceal.setView('concealment')"><i class="bi bi-incognito"></i> Concealment Matrix</button>
            </div>
        </div></div>
        <div id="atkBody"></div>`;
        renderBody();
    }
    function renderBody() {
        const el = document.getElementById('atkBody'); if (!el) return;
        if (curView === 'enterprise') renderEnterprise(el); else renderConceal(el);
    }

    function setView(v) { curView = v; localStorage.setItem('atkView', v); renderAttackPage(document.getElementById('currentPage')); }
    function setCat(c) { curCat = c; renderBody(); }
    function setQuery(q) { curQuery = (q || '').toLowerCase(); renderBody(); }
    function toggle(key) { expanded.has(key) ? expanded.delete(key) : expanded.add(key); renderBody(); }

    function renameNav() {
        const nav = document.querySelector('.nav-item[data-page="attack"] span');
        if (nav) nav.textContent = 'ATT&CK & Concealment';
    }
    function wrapApp() {
        const app = window.app; if (!app || app.__concealWrapped) return; app.__concealWrapped = true;
        const origTitle = app.getPageTitle.bind(app);
        app.getPageTitle = p => p === 'attack' ? 'ATT&CK & Concealment' : origTitle(p);
        const origLoad = app.loadPage.bind(app);
        app.loadPage = function (p, ...a) {
            if (p === 'attack') { this.currentPage = p; document.getElementById('pageTitle').textContent = 'ATT&CK & Concealment'; const pc = document.getElementById('currentPage'); this.destroyCharts(); renderAttackPage(pc); return; }
            return origLoad(p, ...a);
        };
    }

    document.addEventListener('DOMContentLoaded', () => { injectCss(); renameNav(); wrapApp(); });
    window.appConceal = { setView, setCat, setQuery, toggle };
})();
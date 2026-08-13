/**
 * VulnComply Intelligence - Real-Time Global Threat Map (v3)
 * + Attack-type filtering + 24h attack timeline (Chart.js).
 * Live: ipsum feed + ipwho.is geo. Fallback: KEV simulation. Illustrative.
 * @author Nandha Kumar M | @license MIT
 */
(function () {
    const TYPES = ['RCE', 'Phishing', 'DDoS', 'Malware', 'Brute-force', 'C2'];
    const TYPE_COLOR = { RCE: '#ef4444', Phishing: '#f59e0b', DDoS: '#8b5cf6', Malware: '#ec4899', 'Brute-force': '#f97316', C2: '#38bdf8' };
    const CITIES = [
        { n: 'New York', c: [40.7128, -74.0060] }, { n: 'London', c: [51.5074, -0.1278] }, { n: 'Moscow', c: [55.7558, 37.6173] },
        { n: 'Beijing', c: [39.9042, 116.4074] }, { n: 'Tokyo', c: [35.6762, 139.6503] }, { n: 'Sydney', c: [-33.8688, 151.2093] },
        { n: 'São Paulo', c: [-23.5505, -46.6333] }, { n: 'Mumbai', c: [19.0760, 72.8777] }, { n: 'Frankfurt', c: [50.1109, 8.6821] }, { n: 'Singapore', c: [1.3521, 103.8198] }
    ];
    const VENDOR_LOC = { 'Microsoft': { c: [47.6740, -122.1215], city: 'Redmond' }, 'Citrix': { c: [26.1004, -80.3998], city: 'Ft Lauderdale' }, 'Fortinet': { c: [37.4060, -121.9754], city: 'Sunnyvale' }, 'Ivanti': { c: [40.5382, -111.8695], city: 'Utah' }, 'Atlassian': { c: [-33.8688, 151.2093], city: 'Sydney' }, 'JetBrains': { c: [50.0755, 14.4378], city: 'Prague' }, 'Apache': { c: [37.7749, -122.4194], city: 'San Francisco' }, 'Oracle': { c: [37.4220, -122.0841], city: 'Redwood City' } };
    const ACTOR_REGIONS = { 'APT28': { c: [55.7558, 37.6173], label: 'Moscow (APT28)' }, 'APT29': { c: [55.8304, 49.0661], label: 'Kazan (APT29)' }, 'Lazarus': { c: [39.0392, 125.7625], label: 'Pyongyang (Lazarus)' }, 'APT41': { c: [30.5728, 104.0668], label: 'Chengdu (APT41)' }, 'Hafnium': { c: [39.9042, 116.4074], label: 'Beijing (Hafnium)' }, 'Ransomware': { c: [52.2297, 21.0122], label: 'E-Europe (Ransomware)' }, 'CyberCrime': { c: [50.4501, 30.5234], label: 'E-Europe (Cybercrime)' }, 'Opportunistic': { c: [40.7128, -74.0060], label: 'Unknown' } };
    const ATTRIBUTION = { 'CVE-2024-3094': 'APT29', 'CVE-2024-27198': 'APT28', 'CVE-2023-4966': 'Ransomware', 'CVE-2023-22515': 'CyberCrime', 'CVE-2023-23397': 'APT29', 'CVE-2023-46805': 'APT41', 'CVE-2023-27997': 'APT41', 'CVE-2023-0669': 'Ransomware', 'CVE-2021-44228': 'CyberCrime', 'CVE-2020-1472': 'APT28', 'CVE-2019-0708': 'APT28' };

    let scene, camera, renderer, globe, atmosphere, arcsGroup, dotsGroup, tlChart = null;
    let arcs = [], isRotating = true, isPaused = false, animFrame = null;
    let lastSpawn = 0, totalEvents = 0, liveMode = false, curType = 'All';
    let sources = [], geoCache = {}, geoPending = {}, countryCount = {}, timeline = [];
    const HOME = [40.7128, -74.0060];
    const esc = s => Formatters.escapeHtml(s);

    function latLonToVec3(lat, lon, r = 1) { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); }

    /* ===== attack-type derivation (illustrative) ===== */
    function typeForLevel(l) { const r = Math.random(); if (l >= 4) return r < 0.5 ? 'C2' : 'RCE'; if (l === 3) return r < 0.5 ? 'Brute-force' : 'DDoS'; return r < 0.5 ? 'Malware' : 'Phishing'; }
    function typeForCve(c) { const cw = (c.cwe || []).join(','); if (/502|94|77|78|119|120|122|416|787|125/.test(cw)) return 'RCE'; if (/400|770/.test(cw)) return 'DDoS'; if (/506|505/.test(cw)) return 'Malware'; if (/79|287|288|863/.test(cw)) return 'Phishing'; return TYPES[Math.floor(Math.random() * 4)]; }

    /* ===== 24h timeline ===== */
    function seedTimeline() {
        timeline = []; const nowH = new Date().getUTCHours();
        for (let i = 0; i < 24; i++) {
            const h = (nowH - 23 + i + 24) % 24;
            const diurnal = 0.5 + 0.5 * Math.sin((h - 6) / 24 * 2 * Math.PI);
            const o = {}; TYPES.forEach((t, ti) => { const w = [1.2, 0.8, 0.7, 1.0, 0.9, 0.8][ti]; o[t] = Math.round((8 + diurnal * 20) * w + Math.random() * 6); });
            timeline.push({ h, o });
        }
    }
    function bumpTimeline(type) {
        const nowH = new Date().getUTCHours();
        const bucket = timeline[timeline.length - 1];
        if (bucket && bucket.h === nowH) bucket.o[type] = (bucket.o[type] || 0) + 1;
        else timeline.push({ h: nowH, o: { [type]: 1 } });
        if (timeline.length > 24) timeline.shift();
    }
    function renderTimeline() {
        const el = document.getElementById('atkTimeline'); if (!el || !window.Chart) return;
        if (tlChart) tlChart.destroy();
        const labels = timeline.map(t => String(t.h).padStart(2, '0') + ':00');
        const shown = curType === 'All' ? TYPES : [curType];
        tlChart = new Chart(el, {
            type: 'bar',
            data: { labels, datasets: shown.map(t => ({ label: t, data: timeline.map(b => b.o[t] || 0), backgroundColor: TYPE_COLOR[t], stack: 's' })) },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { stacked: true, ticks: { color: '#94a3b8', maxTicksLimit: 12 }, grid: { display: false } }, y: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } } } }
        });
    }

    /* ===== live feed ===== */
    async function loadSources() {
        try {
            const r = await fetch('https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt');
            if (!r.ok) throw 0;
            const txt = await r.text();
            sources = txt.split('\n').map(l => l.split('\t')).filter(p => p.length >= 2 && /^\d+\.\d+\.\d+\.\d+$/.test(p[0])).map(p => ({ ip: p[0], level: parseInt(p[1]) || 1 }));
            liveMode = sources.length > 0;
        } catch (e) { liveMode = false; }
        updateModeBadge();
    }
    function geo(ip, cb) { if (geoCache[ip]) return cb(geoCache[ip]); if (geoPending[ip]) return; geoPending[ip] = 1; fetch('https://ipwho.is/' + ip).then(r => r.json()).then(d => { geoPending[ip] = 0; if (d && d.latitude !== undefined) { const g = { lat: d.latitude, lon: d.longitude, country: d.country || 'Unknown' }; geoCache[ip] = g; cb(g); } }).catch(() => { geoPending[ip] = 0; }); }

    function createArc(start, end, severity) {
        const color = severity === 'Critical' ? 0xff3b3b : severity === 'High' ? 0xff7a29 : severity === 'Medium' ? 0xfbbf24 : 0x4ade80;
        const mid = start.clone().add(end).multiplyScalar(0.5); mid.normalize().multiplyScalar(1 + start.distanceTo(end) * 0.35);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
        arcsGroup.add(line);
        const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshBasicMaterial({ color })); pulse.position.copy(start); scene.add(pulse);
        return { curve, line, pulse, progress: 0, duration: 1.6 + Math.random() * 1.4, startTime: performance.now(), alive: true };
    }
    function pushFeed(src, dst, type, sev, live) {
        const el = document.getElementById('threatFeed'); if (!el) return;
        if (curType !== 'All' && type !== curType) return;
        const item = document.createElement('div'); item.className = 'threat-feed-item';
        item.innerHTML = `<span class="src">[${esc(src)}]</span> → <span class="dst">${esc(dst)}</span> <span class="cve">${esc(type)}</span> <span style="color:${sev === 'Critical' ? '#f87171' : '#fbbf24'}">(${sev})</span>${live ? ' <span style="color:#4ade80">●</span>' : ''}`;
        el.insertBefore(item, el.firstChild); while (el.children.length > 14) el.removeChild(el.lastChild);
    }
    function updateModeBadge() { const el = document.getElementById('modeBadge'); if (el) el.innerHTML = liveMode ? '<span style="color:#4ade80">● LIVE ATTACK FEED (ipsum)</span>' : '<span style="color:#fbbf24">● SIMULATED (KEV-derived)</span>'; }
    function updateStats() {
        const el = document.getElementById('hudStats'); if (!el) return;
        el.innerHTML = `<div><div class="hud-stat">${totalEvents}</div><div class="hud-stat-label">EVENTS</div></div><div><div class="hud-stat">${arcs.filter(a => a.alive).length}</div><div class="hud-stat-label">ACTIVE</div></div><div><div class="hud-stat">${Object.keys(countryCount).length}</div><div class="hud-stat-label">COUNTRIES</div></div>`;
        const tc = document.getElementById('topCountries'); if (tc) tc.textContent = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).join(', ') || '—';
    }

    function spawnLiveAttack() {
        if (!sources.length) return;
        const s = sources[Math.floor(Math.random() * sources.length)];
        const type = typeForLevel(s.level);
        if (curType !== 'All' && type !== curType) return;
        geo(s.ip, g => {
            arcs.push(createArc(latLonToVec3(g.lat, g.lon, 1.01), latLonToVec3(HOME[0], HOME[1], 1.01), s.level >= 4 ? 'Critical' : s.level >= 3 ? 'High' : 'Medium'));
            totalEvents++; countryCount[g.country] = (countryCount[g.country] || 0) + 1;
            bumpTimeline(type); pushFeed(`${g.country} (${s.ip})`, 'YOUR SOC', type, s.level >= 4 ? 'Critical' : 'High', true);
            updateStats();
        });
    }
    function spawnSimAttack() {
        const kevList = Object.keys(window.KevEngine.kevData || {}); if (!kevList.length) return;
        const cveId = kevList[Math.floor(Math.random() * kevList.length)];
        const kev = window.KevEngine.getKevInfo(cveId); if (!kev) return;
        const cve = window.cveSearch.getCveById(cveId) || {};
        const type = typeForCve(cve);
        if (curType !== 'All' && type !== curType) return;
        const dst = VENDOR_LOC[kev.vendorProject] || VENDOR_LOC['Microsoft'];
        const actor = ACTOR_REGIONS[ATTRIBUTION[cveId] || 'Opportunistic'];
        arcs.push(createArc(latLonToVec3(actor.c[0], actor.c[1], 1.01), latLonToVec3(dst.c[0], dst.c[1], 1.01), cve.severity || 'Critical'));
        totalEvents++; countryCount[actor.label.split(' ')[0]] = (countryCount[actor.label.split(' ')[0]] || 0) + 1;
        bumpTimeline(type); pushFeed(actor.label, dst.city, type, cve.severity || 'Critical', false);
        updateStats();
    }

    function createGlobe() {
        globe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), new THREE.MeshPhongMaterial({ color: 0x0a1628, emissive: 0x050a14, shininess: 5, transparent: true, opacity: 0.95 })); scene.add(globe);
        const g = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.4 });
        for (let lat = -80; lat <= 80; lat += 20) { const p = []; for (let lon = 0; lon <= 360; lon += 5) p.push(latLonToVec3(lat, lon - 180, 1.001)); scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), g)); }
        for (let lon = -180; lon < 180; lon += 20) { const p = []; for (let lat = -90; lat <= 90; lat += 5) p.push(latLonToVec3(lat, lon, 1.001)); scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), g)); }
        dotsGroup = new THREE.Group();
        CITIES.forEach(c => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80 })); d.position.copy(latLonToVec3(c.c[0], c.c[1], 1.01)); dotsGroup.add(d); });
        scene.add(dotsGroup);
        atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 64), new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 vN;void main(){float i=pow(0.7-dot(vN,vec3(0,0,1)),2.);gl_FragColor=vec4(0.3,0.7,1.,1.)*i;}', blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true })); scene.add(atmosphere);
    }

    function animate(now) {
        animFrame = requestAnimationFrame(animate); if (!scene || !renderer) return;
        if (isRotating && !isPaused) [globe, atmosphere, arcsGroup, dotsGroup].forEach(o => o.rotation.y += 0.0012);
        arcs.forEach(a => { if (!a.alive) return; a.progress = Math.min((now - a.startTime) / 1000 / a.duration, 1); a.pulse.position.copy(a.curve.getPoint(a.progress)); if (a.progress >= 1) { a.alive = false; arcsGroup.remove(a.line); scene.remove(a.pulse); a.line.geometry.dispose(); a.line.material.dispose(); a.pulse.geometry.dispose(); a.pulse.material.dispose(); } });
        arcs = arcs.filter(a => a.alive);
        if (now - lastSpawn > (liveMode ? 500 : 1100)) { lastSpawn = now; liveMode ? spawnLiveAttack() : spawnSimAttack(); }
        const pulse = Math.sin(now * 0.003) * 0.5 + 0.5; dotsGroup.children.forEach(d => d.scale.setScalar(0.8 + pulse * 0.4));
        renderer.render(scene, camera);
    }

    function initGlobe(container) {
        if (!window.THREE) { container.innerHTML = '<div class="globe-webgl-fallback">WEBGL NOT AVAILABLE</div>'; return false; }
        scene = new THREE.Scene(); const w = container.clientWidth, h = container.clientHeight;
        camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000); camera.position.z = 2.8;
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor(0, 0); container.appendChild(renderer.domElement);
        scene.add(new THREE.AmbientLight(0x404060, 0.5)); const k = new THREE.DirectionalLight(0xffffff, 0.8); k.position.set(5, 3, 5); scene.add(k);
        arcsGroup = new THREE.Group(); scene.add(arcsGroup);
        createGlobe();
        let drag = false, lx = 0;
        renderer.domElement.addEventListener('mousedown', e => { drag = true; lx = e.clientX; });
        window.addEventListener('mouseup', () => drag = false);
        window.addEventListener('mousemove', e => { if (!drag) return; const dx = e.clientX - lx; [globe, atmosphere, arcsGroup, dotsGroup].forEach(o => o.rotation.y += dx * 0.005); lx = e.clientX; });
        renderer.domElement.addEventListener('wheel', e => { e.preventDefault(); camera.position.z = Math.max(1.8, Math.min(5, camera.position.z + e.deltaY * 0.002)); }, { passive: false });
        window.addEventListener('resize', () => { if (!renderer) return; const w2 = container.clientWidth, h2 = container.clientHeight; camera.aspect = w2 / h2; camera.updateProjectionMatrix(); renderer.setSize(w2, h2); });
        return true;
    }

    function renderTypeChips() {
        const el = document.getElementById('typeChips'); if (!el) return;
        el.innerHTML = ['All', ...TYPES].map(t => `<button class="cm-cat ${curType === t ? 'active' : ''}" onclick="window.appLiveOps.setType('${t}')">${t !== 'All' ? `<span class="dot" style="background:${TYPE_COLOR[t]}"></span>` : ''}${t}</button>`).join('');
    }
    function setType(t) { curType = t; renderTypeChips(); renderTimeline(); }

    function renderLive(pc) {
        pc.innerHTML = `
        <div class="page-header"><div class="page-header-row">
            <div><h2>Global Threat Intelligence</h2><p>Real-time attack map · live ipsum feed + ipwho.is geo · KEV fallback</p></div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span id="modeBadge" class="badge" style="background:rgba(10,22,40,.8);border:1px solid #4ade80"></span><button class="btn btn-sm btn-danger" onclick="window.appLiveOps.toggleWarRoom()"><i class="bi bi-fullscreen"></i> War Room</button></div></div>
            <div class="cm-bar" id="typeChips" style="margin-top:8px"></div></div>
        <div class="globe-wrap">
            <div class="scanline"></div>
            <div class="globe-hud hud-tl"><div class="hud-title">⬢ GLOBAL THREAT ACTIVITY</div><div class="hud-sub" id="hudClock"></div><div class="hud-sub" style="margin-top:4px">TOP SOURCES: <span id="topCountries">—</span></div></div>
            <div class="globe-hud hud-tr"><div class="hud-stat-row" id="hudStats"></div></div>
            <div class="globe-hud hud-bl"><div class="hud-sub" style="margin-bottom:4px">LIVE ATTACK FEED</div><div class="threat-feed" id="threatFeed"></div></div>
            <div class="globe-hud hud-br"><button class="hud-btn" onclick="window.appLiveOps.toggleRotation()">ROTATE</button><button class="hud-btn" onclick="window.appLiveOps.resetView()">RESET</button></div>
        </div>
        <div class="card" style="margin-top:16px"><div class="card-header"><h3 class="card-title">Attack Volume — last 24h <span id="tlFilter" class="badge badge-info"></span></h3></div><div style="height:220px"><canvas id="atkTimeline"></canvas></div></div>
        <div class="card" style="margin-top:16px"><div style="font-size:12px;color:var(--text-muted)"><i class="bi bi-info-circle"></i> <strong>Sources:</strong> LIVE streams real known-malicious IPs (ipsum) geolocated via ipwho.is; offline falls back to KEV-derived simulation. Attack-type & timeline are illustrative.</div></div>`;
        renderTypeChips();
        seedTimeline();
        const container = pc.querySelector('.globe-wrap');
        if (!initGlobe(container)) return;
        loadSources();
        animate(performance.now());
        renderTimeline();
        document.getElementById('tlFilter').textContent = curType === 'All' ? 'ALL TYPES' : curType;
        setInterval(() => { updateClock(); renderTimeline(); document.getElementById('tlFilter').textContent = curType === 'All' ? 'ALL TYPES' : curType; }, 2000);
        updateClock(); updateStats(); updateModeBadge();
    }
    function updateClock() { const el = document.getElementById('hudClock'); if (el) el.textContent = 'UTC ' + new Date().toISOString().substr(11, 8); }
    function toggleRotation() { isRotating = !isRotating; }
    function resetView() { if (!globe) return; [globe, atmosphere, arcsGroup, dotsGroup].forEach(o => o.rotation.y = 0); camera.position.z = 2.8; }
    function toggleWarRoom() { const on = document.body.classList.toggle('warroom'); if (on) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); else if (document.fullscreenElement) document.exitFullscreen(); setTimeout(() => { if (renderer) { const w = document.querySelector('.globe-wrap').clientWidth, h = document.querySelector('.globe-wrap').clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); } }, 250); }
    function cleanup() { if (animFrame) cancelAnimationFrame(animFrame); animFrame = null; if (tlChart) { tlChart.destroy(); tlChart = null; } arcs = []; if (renderer) { renderer.dispose(); renderer.domElement.remove(); renderer = null; } scene = globe = atmosphere = arcsGroup = dotsGroup = null; }

    function addNav() { const nav = document.querySelector('.sidebar-nav'); if (!nav || document.getElementById('globeNav')) return; const s = document.createElement('div'); s.className = 'nav-section'; s.id = 'globeNav'; s.innerHTML = `<div class="nav-section-title">Monitoring</div><a href="#" class="nav-item" data-page="live"><i class="bi bi-globe-americas"></i><span>Threat Globe</span></a>`; nav.appendChild(s); s.querySelector('.nav-item').addEventListener('click', e => { e.preventDefault(); window.app.navigate('live'); document.getElementById('sidebar').classList.remove('active'); }); }
    function wrapApp() { const app = window.app; if (!app || app.__globeWrapped) return; app.__globeWrapped = true; const oI = app.isPage.bind(app); app.isPage = p => oI(p) || p === 'live'; const oT = app.getPageTitle.bind(app); app.getPageTitle = p => p === 'live' ? 'Global Threat Intelligence' : oT(p); const oL = app.loadPage.bind(app); app.loadPage = function (p, ...a) { if (p !== 'live') { cleanup(); document.body.classList.remove('warroom'); if (document.fullscreenElement) document.exitFullscreen(); } if (p === 'live') { this.currentPage = p; document.getElementById('pageTitle').textContent = 'Global Threat Intelligence'; const pc = document.getElementById('currentPage'); this.destroyCharts(); renderLive(pc); return; } return oL(p, ...a); }; }

    document.addEventListener('DOMContentLoaded', () => { addNav(); wrapApp(); });
    window.appLiveOps = { toggleRotation, resetView, toggleWarRoom, cleanup, setType };
})();
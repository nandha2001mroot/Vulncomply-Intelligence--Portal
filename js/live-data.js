/**
 * VulnComply Intelligence - Live Data Fetcher (timeouts + cache)
 * @author Nandha Kumar M | @license MIT
 */
class LiveDataManager {
    constructor() {
        this.config = { enabled: true, useProxy: true };
        this.status = { nvd: 'idle', kev: 'idle', epss: 'idle' };
        this._mem = {};
        this.TTL = 15 * 60 * 1000; // 15 min localStorage cache
        this.loadConfig();
    }
    loadConfig() { if (window.storage) { const c = window.storage.get('liveConfig'); if (c) this.config = Object.assign(this.config, c); } }
    saveConfig() { if (window.storage) window.storage.set('liveConfig', this.config); }
    isEnabled() { return !!this.config.enabled; }

    _lsGet(key) {
        try { const raw = localStorage.getItem('vc_fc_' + key); if (!raw) return null; const o = JSON.parse(raw); if (Date.now() - o.t > this.TTL) { localStorage.removeItem('vc_fc_' + key); return null; } return o.d; } catch (e) { return null; }
    }
    _lsSet(key, data) { try { localStorage.setItem('vc_fc_' + key, JSON.stringify({ t: Date.now(), d: data })); } catch (e) { /* quota */ } }

    async _timed(url, ms) {
        try {
            const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
            const r = await fetch(url, { signal: ctl.signal, headers: { 'Accept': 'application/json' } });
            clearTimeout(t); if (r.ok) return await r.json();
        } catch (e) { }
        if (this.config.useProxy) {
            try {
                const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
                const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url), { signal: ctl.signal });
                clearTimeout(t); if (r.ok) return await r.json();
            } catch (e) { }
        }
        return null;
    }

    async fetchJson(url) {
        if (!this.isEnabled()) return null;
        if (this._mem[url]) return this._mem[url];
        const ls = this._lsGet(url); if (ls) { this._mem[url] = ls; return ls; }
        const data = await this._timed(url, 5000);
        if (data) { this._mem[url] = data; this._lsSet(url, data); }
        return data;
    }
}
window.LiveData = new LiveDataManager();
/**
 * VulnComply Intelligence - LocalStorage Manager
 * @author Nandha Kumar M | @license MIT
 */
class StorageManager {
    constructor() { this.prefix = 'vulncomply_'; }
    set(k, v) { try { localStorage.setItem(this.prefix + k, JSON.stringify(v)); return true; } catch(e) { return false; } }
    get(k, d = null) { try { const v = localStorage.getItem(this.prefix + k); return v ? JSON.parse(v) : d; } catch(e) { return d; } }
    remove(k) { localStorage.removeItem(this.prefix + k); }
    clear() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(this.prefix)) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
    }
    getKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(this.prefix)) keys.push(k.substring(this.prefix.length));
        }
        return keys;
    }
    exportAll() { const data = {}; this.getKeys().forEach(k => { data[k] = this.get(k); }); return data; }
    importAll(data) {
        try { let count = 0; Object.keys(data).forEach(k => { if (this.set(k, data[k])) count++; }); return { success: true, imported: count }; }
        catch(e) { return { success: false, error: e.message }; }
    }
    saveCveSearch(q, r) {
        const h = this.get('cveSearchHistory', []);
        h.unshift({ query: q, results: r.length, timestamp: new Date().toISOString() });
        if (h.length > 50) h.pop();
        this.set('cveSearchHistory', h);
    }
    getCveSearchHistory() { return this.get('cveSearchHistory', []); }
    saveAssetContext(cveId, ctx) { const c = this.get('assetContexts', {}); c[cveId] = {...ctx, updatedAt: new Date().toISOString()}; this.set('assetContexts', c); }
    getAssetContext(cveId) { return (this.get('assetContexts', {}))[cveId] || null; }
    getAllAssetContexts() { return this.get('assetContexts', {}); }
    removeAssetContext(cveId) { const c = this.get('assetContexts', {}); delete c[cveId]; this.set('assetContexts', c); }
    saveComplianceAssessment(a) { this.set('complianceAssessment', {...a, updatedAt: new Date().toISOString()}); }
    getComplianceAssessment() { return this.get('complianceAssessment', { controls: {}, score: 0, updatedAt: null }); }
    saveControlAssessment(id, a) { const c = this.getComplianceAssessment(); c.controls[id] = {...a, updatedAt: new Date().toISOString()}; this.saveComplianceAssessment(c); }
    getControlAssessment(id) { return (this.getComplianceAssessment()).controls[id] || null; }
    saveRemediationItem(cveId, r) { const i = this.get('remediationItems', {}); i[cveId] = {...r, updatedAt: new Date().toISOString()}; this.set('remediationItems', i); }
    getAllRemediationItems() { return this.get('remediationItems', {}); }
    removeRemediationItem(cveId) { const i = this.get('remediationItems', {}); delete i[cveId]; this.set('remediationItems', i); }
    saveRiskScore(s) {
        const h = this.get('riskScoreHistory', []);
        h.unshift({ score: s, timestamp: new Date().toISOString() });
        if (h.length > 100) h.pop();
        this.set('riskScoreHistory', h);
    }
    getRiskScoreHistory() { return this.get('riskScoreHistory', []); }
    getUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(this.prefix)) total += localStorage.getItem(k).length;
        }
        return { used: total, formatted: this.formatBytes(total) };
    }
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024, sizes = ['B','KB','MB','GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
window.storage = new StorageManager();
/**
 * VulnComply Intelligence - Validators Utility
 * @author Nandha Kumar M | @license MIT
 */
const Validators = {
    isValidCveId(id) { return id && /^CVE-\d{4}-\d{4,}$/i.test(id.trim()); },
    isValidJson(s) { try { JSON.parse(s); return true; } catch(e) { return false; } },
    isValidScore(s, min = 0, max = 100) { const n = parseFloat(s); return !isNaN(n) && n >= min && n <= max; },
    isValidDate(d) { if (!d) return false; const date = new Date(d); return date instanceof Date && !isNaN(date); },
    validateCveData(d) {
        const e = [];
        if (!d.id || !this.isValidCveId(d.id)) e.push('Invalid CVE ID');
        if (!d.severity) e.push('Missing severity');
        if (d.cvss && d.cvss.baseScore && !this.isValidScore(d.cvss.baseScore, 0, 10)) e.push('Invalid CVSS');
        return { valid: e.length === 0, errors: e };
    },
    sanitizeImportedData(data) {
        const s = (o) => {
            if (typeof o === 'string') return o.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/on\w+\s*=/gi, '');
            if (Array.isArray(o)) return o.map(s);
            if (o && typeof o === 'object') { const r = {}; for (const k in o) if (o.hasOwnProperty(k)) r[k] = s(o[k]); return r; }
            return o;
        };
        return s(data);
    }
};
window.Validators = Validators;
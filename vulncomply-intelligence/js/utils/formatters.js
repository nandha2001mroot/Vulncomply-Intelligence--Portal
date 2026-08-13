/**
 * VulnComply Intelligence - Formatters Utility
 * @author Nandha Kumar M | @license MIT
 */
const Formatters = {
    formatDate(d) {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'});
    },
    formatDateTime(d) {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    },
    formatNumber(n) { return (n || 0).toLocaleString('en-US'); },
    formatPercent(v, d = 1) { return v ? `${(v * 100).toFixed(d)}%` : '0%'; },
    formatEpss(s) { return s ? s.toFixed(4) : 'N/A'; },
    formatCvss(s) { return s ? s.toFixed(1) : 'N/A'; },
    daysSince(d) { return d ? Math.floor((new Date() - new Date(d)) / 86400000) : 0; },
    timeAgo(d) {
        if (!d) return 'N/A';
        const s = Math.floor((new Date() - new Date(d)) / 1000);
        const i = {year:31536000,month:2592000,week:604800,day:86400,hour:3600,minute:60};
        for (const [u, v] of Object.entries(i)) {
            const n = Math.floor(s / v);
            if (n >= 1) return `${n} ${u}${n > 1 ? 's' : ''} ago`;
        }
        return 'Just now';
    },
    truncate(s, l = 100) { return s && s.length > l ? s.substring(0, l) + '...' : (s || ''); },
    escapeHtml(s) {
        if (!s) return '';
        return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }
};
window.Formatters = Formatters;
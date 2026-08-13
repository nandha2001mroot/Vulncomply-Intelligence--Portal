/**
 * VulnComply Intelligence - Report Generation Engine
 * @author Nandha Kumar M | @license MIT
 */
class ReportEngine {
    constructor() { this.generatedAt = null; }
    async generateReport(type, data) {
        this.generatedAt = new Date().toISOString();
        switch(type) {
            case 'executive': return this.generateExecutiveReport(data);
            case 'vulnerability': return this.generateVulnerabilityReport(data);
            case 'compliance': return this.generateComplianceReport(data);
            default: throw new Error('Unknown report type');
        }
    }
    generateExecutiveReport(data) {
        return {title:'Executive Security Report', generatedAt:this.generatedAt, author:'Nandha Kumar M', project:'VulnComply Intelligence',
            summary:{overallRisk:data.riskScore||0, riskLevel:this.getRiskLevel(data.riskScore||0), totalVulnerabilities:data.totalVulns||0, criticalVulnerabilities:data.criticalVulns||0, complianceScore:data.complianceScore||0, kevExposure:data.kevCount||0},
            topRisks:data.topRisks||[], recommendations:data.recommendations||[],
            disclaimer:'This tool provides security intelligence and assessment support. Results depend on data quality and user-provided context. It does not replace professional vulnerability assessment, vendor advisories, penetration testing, or compliance audits.'};
    }
    generateVulnerabilityReport(data) {
        return {title:'Vulnerability Intelligence Report', generatedAt:this.generatedAt, author:'Nandha Kumar M', project:'VulnComply Intelligence',
            statistics:data.statistics||{}, vulnerabilities:data.vulnerabilities||[], kevExposure:data.kevCount||0, highEpss:data.highEpssCount||0,
            disclaimer:'This tool provides security intelligence and assessment support.'};
    }
    generateComplianceReport(data) {
        return {title:'Security Compliance Report', generatedAt:this.generatedAt, author:'Nandha Kumar M', project:'VulnComply Intelligence',
            overallScore:data.overallScore||0, scoreLevel:data.scoreLevel||{}, breakdown:data.breakdown||{}, categoryScores:data.categoryScores||{},
            failedControls:data.failedControls||[], recommendations:data.recommendations||[],
            disclaimer:'This tool provides security intelligence and assessment support.'};
    }
    getRiskLevel(s) { if (s>=81) return 'Critical'; if (s>=61) return 'High'; if (s>=41) return 'Elevated'; if (s>=21) return 'Moderate'; return 'Low'; }
    exportToJSON(report) {
        const blob = new Blob([JSON.stringify(report,null,2)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${report.title.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    exportToCSV(data, filename) {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]);
        const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${String(row[h]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], {type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    exportToHTML(report) {
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${report.title}</title>
<style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}h1{color:#0ea5e9}.section{margin:20px 0;padding:15px;border:1px solid #ddd;border-radius:8px}.metric{display:inline-block;margin:10px;padding:10px;background:#f5f5f5;border-radius:4px}.disclaimer{margin-top:30px;padding:15px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;font-size:12px}</style></head>
<body><h1>${report.title}</h1><p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p><p>Project: VulnComply Intelligence | Author: Nandha Kumar M</p>
${this.renderReportContent(report)}
<div class="disclaimer"><strong>Disclaimer:</strong> ${report.disclaimer}</div></body></html>`;
        const blob = new Blob([html], {type:'text/html'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${report.title.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    renderReportContent(report) {
        let html = '';
        if (report.summary) {
            html += '<div class="section"><h2>Executive Summary</h2>';
            html += `<div class="metric"><strong>Overall Risk:</strong> ${report.summary.overallRisk}/100 (${report.summary.riskLevel})</div>`;
            html += `<div class="metric"><strong>Total Vulnerabilities:</strong> ${report.summary.totalVulnerabilities}</div>`;
            html += `<div class="metric"><strong>Critical:</strong> ${report.summary.criticalVulnerabilities}</div>`;
            html += `<div class="metric"><strong>Compliance:</strong> ${report.summary.complianceScore}%</div>`;
            html += `<div class="metric"><strong>KEV Exposure:</strong> ${report.summary.kevExposure}</div></div>`;
        }
        if (report.overallScore !== undefined) {
            html += `<div class="section"><h2>Compliance Score</h2><div class="metric"><strong>Score:</strong> ${report.overallScore}% (${report.scoreLevel.level})</div>`;
            if (report.breakdown) {
                html += `<div class="metric"><strong>Passed:</strong> ${report.breakdown.passed}</div>`;
                html += `<div class="metric"><strong>Failed:</strong> ${report.breakdown.failed}</div>`;
                html += `<div class="metric"><strong>Partial:</strong> ${report.breakdown.partial}</div>`;
            }
            html += '</div>';
        }
        if (report.recommendations && report.recommendations.length > 0) {
            html += '<div class="section"><h2>Recommendations</h2><ol>';
            report.recommendations.slice(0,10).forEach(r => { html += `<li><strong>${r.controlName||r.factor}:</strong> ${r.recommendation||r.reason}</li>`; });
            html += '</ol></div>';
        }
        return html;
    }
}
window.ReportEngine = new ReportEngine();
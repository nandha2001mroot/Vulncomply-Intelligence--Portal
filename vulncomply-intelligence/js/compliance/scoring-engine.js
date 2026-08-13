/**
 * VulnComply Intelligence - Compliance Scoring Engine
 * @author Nandha Kumar M | @license MIT
 */
class ComplianceScoringEngine {
    constructor() {
        this.statusPoints = {'Passed':1.0,'Partially Compliant':0.5,'Failed':0.0,'Not Assessed':null,'Risk Accepted':0.75};
    }
    calculateScore(controls, assessments) {
        let totalWeight = 0, earnedPoints = 0, assessedControls = 0;
        const breakdown = {passed:0, failed:0, partial:0, notAssessed:0, riskAccepted:0};
        const categoryScores = {};
        controls.forEach(c => {
            const a = assessments[c.id];
            const status = a ? a.status : 'Not Assessed';
            const weight = c.weight || 1;
            if (status === 'Not Assessed') { breakdown.notAssessed++; return; }
            totalWeight += weight; assessedControls++;
            const pts = this.statusPoints[status] || 0;
            earnedPoints += weight * pts;
            if (status === 'Passed') breakdown.passed++;
            else if (status === 'Failed') breakdown.failed++;
            else if (status === 'Partially Compliant') breakdown.partial++;
            else if (status === 'Risk Accepted') breakdown.riskAccepted++;
            if (!categoryScores[c.category]) categoryScores[c.category] = {totalWeight:0, earnedPoints:0, count:0, passed:0, failed:0};
            categoryScores[c.category].totalWeight += weight;
            categoryScores[c.category].earnedPoints += weight * pts;
            categoryScores[c.category].count++;
            if (status === 'Passed') categoryScores[c.category].passed++;
            if (status === 'Failed') categoryScores[c.category].failed++;
        });
        const overallScore = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0;
        Object.keys(categoryScores).forEach(cat => {
            const c = categoryScores[cat];
            c.score = c.totalWeight > 0 ? (c.earnedPoints / c.totalWeight) * 100 : 0;
            c.complianceRate = c.count > 0 ? (c.passed / c.count) * 100 : 0;
        });
        return {overallScore: Math.round(overallScore*10)/10, scoreLevel: this.getScoreLevel(overallScore), breakdown, assessedControls, totalControls: controls.length, categoryScores, totalWeight, earnedPoints};
    }
    getScoreLevel(s) {
        if (s >= 90) return {level:'Excellent', color:'#10b981'};
        if (s >= 75) return {level:'Good', color:'#0ea5e9'};
        if (s >= 60) return {level:'Needs Improvement', color:'#f59e0b'};
        if (s >= 40) return {level:'Poor', color:'#ef4444'};
        return {level:'Critical', color:'#dc2626'};
    }
    calculateFrameworkScores(controls, assessments) {
        const frameworks = {};
        controls.forEach(c => {
            if (!frameworks[c.framework]) frameworks[c.framework] = {controls:[], assessments:{}};
            frameworks[c.framework].controls.push(c);
            if (assessments[c.id]) frameworks[c.framework].assessments[c.id] = assessments[c.id];
        });
        const scores = {};
        Object.keys(frameworks).forEach(f => { scores[f] = this.calculateScore(frameworks[f].controls, frameworks[f].assessments); });
        return scores;
    }
    calculateRiskScore(r) {
        const cR = 100 - r.overallScore;
        const fW = r.assessedControls > 0 ? (r.breakdown.failed / r.assessedControls) * 100 : 0;
        return Math.min(100, (cR * 0.6) + (fW * 0.4));
    }
    generateRecommendations(controls, assessments) {
        const recs = [];
        controls.forEach(c => {
            const a = assessments[c.id];
            if (!a) return;
            if (a.status === 'Failed') {
                recs.push({controlId:c.id, controlName:c.name, category:c.category, severity:c.severity, type:'Critical Gap', recommendation:c.recommendation, priority: c.severity==='Critical'?1:c.severity==='High'?2:3});
            } else if (a.status === 'Partially Compliant') {
                recs.push({controlId:c.id, controlName:c.name, category:c.category, severity:c.severity, type:'Improvement Needed', recommendation:`Complete: ${c.recommendation}`, priority: c.severity==='Critical'?2:c.severity==='High'?3:4});
            }
        });
        return recs.sort((a, b) => a.priority - b.priority);
    }
}
window.ComplianceScoringEngine = new ComplianceScoringEngine();
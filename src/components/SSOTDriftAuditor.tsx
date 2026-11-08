import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck2,
  Sparkles,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  Copy,
  Download,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { getDocModalsTranslations } from '../locales/docModalsLocale';
import {
  SSOTDriftIssue,
  SSOTAuditSummary,
  analyzeSSOTDriftLocally,
  applySSOTReconciliation
} from '../utils/ssotDriftEngine';

interface SSOTDriftAuditorProps {
  content: string;
  onUpdateContent: (newContent: string) => void;
  onJumpToLine?: (line: number) => void;
  onClose: () => void;
  apiKey?: string;
  model?: string;
  isDarkTheme?: boolean;
}

export const SSOTDriftAuditor: React.FC<SSOTDriftAuditorProps> = ({
  content,
  onUpdateContent,
  onJumpToLine,
  onClose,
  apiKey,
  model,
  isDarkTheme = true
}) => {
  const { language } = useLanguage();
  const t = getDocModalsTranslations(language).driftAuditor;
  const [filterType, setFilterType] = useState<string>('all');
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<SSOTAuditSummary>(() =>
    analyzeSSOTDriftLocally(content)
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [isInfographicExpanded, setIsInfographicExpanded] = useState<boolean>(true);

  // Synchronize local audit whenever content changes
  useEffect(() => {
    if (!isAiScanning) {
      setAuditResult(analyzeSSOTDriftLocally(content));
    }
  }, [content, isAiScanning]);

  // Fast local re-scan
  const handleLocalRescan = () => {
    const res = analyzeSSOTDriftLocally(content);
    setAuditResult(res);
  };

  // Deep AI Audit scan
  const handleDeepAiScan = async () => {
    setIsAiScanning(true);
    try {
      const resp = await fetch('/api/ssot/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: content,
          apiKey,
          model: model || 'gemini-3.1-pro-preview'
        })
      });

      if (!resp.ok) {
        throw new Error('AI Scan request failed');
      }

      const data = await resp.json();
      if (data.fallbackToLocal || !data.issues) {
        // Fallback to local heuristic
        handleLocalRescan();
      } else {
        setAuditResult({
          score: data.score ?? 85,
          status: data.status ?? 'healthy',
          criticalCount: data.criticalCount ?? 0,
          warningCount: data.warningCount ?? 0,
          infoCount: data.infoCount ?? 0,
          issues: data.issues || [],
          analyzedAt: data.analyzedAt || new Date().toLocaleTimeString(),
          isAiEnhanced: true
        });
      }
    } catch {
      handleLocalRescan();
    } finally {
      setIsAiScanning(false);
    }
  };

  // Apply single reconciliation
  const handleApplyFix = (issue: SSOTDriftIssue) => {
    if (!issue.reconciliationPatch) return;
    const updated = applySSOTReconciliation(content, issue.reconciliationPatch);
    onUpdateContent(updated);

    // Mark as dismissed and re-run quick scan on new content
    setDismissedIds((prev) => new Set([...prev, issue.id]));
    setTimeout(() => {
      const refreshed = analyzeSSOTDriftLocally(updated);
      setAuditResult(refreshed);
    }, 50);
  };

  // Apply all reconciliations
  const handleApplyAllFixes = () => {
    let current = content;
    const applicableIssues = auditResult.issues.filter(
      (iss) => !dismissedIds.has(iss.id) && iss.reconciliationPatch
    );

    applicableIssues.forEach((iss) => {
      if (iss.reconciliationPatch) {
        current = applySSOTReconciliation(current, iss.reconciliationPatch);
      }
    });

    onUpdateContent(current);
    const newDismissed = new Set(dismissedIds);
    applicableIssues.forEach((iss) => newDismissed.add(iss.id));
    setDismissedIds(newDismissed);

    setTimeout(() => {
      setAuditResult(analyzeSSOTDriftLocally(current));
    }, 50);
  };

  // Dismiss issue
  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  // Copy Markdown Report
  const handleCopyReport = () => {
    const activeIssues = auditResult.issues.filter((iss) => !dismissedIds.has(iss.id));
    const reportMd = `# ${t.reportTitle}
- **${t.reportDate}**: ${auditResult.analyzedAt}
- **${t.reportScore}**: ${t.reportScoreValue(auditResult.score)}
- **${t.reportCount}**: ${t.reportCountValue(activeIssues.length, auditResult.criticalCount, auditResult.warningCount)}

## ${t.reportIssuesHeading}
${
  activeIssues.length === 0
    ? t.reportNoIssues
    : activeIssues
        .map(
          (iss, idx) => `### ${idx + 1}. [${iss.severity === 'critical' ? t.severityCritical : iss.severity === 'warning' ? t.severityWarning : t.severityInfo}] ${iss.title}
- **${t.reportLocation}**: ${t.reportLine(iss.location.line)} (\`${iss.location.text}\`)
- **${t.reportDescription}**: ${iss.description}
- **${t.reportFix}**: ${iss.suggestedFix}
`
        )
        .join('\n')
}
`;
    navigator.clipboard.writeText(reportMd);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Export structured CSV Report
  const handleExportCsv = () => {
    const active = auditResult.issues.filter((iss) => !dismissedIds.has(iss.id));
    const escapeCsv = (str: string | number | undefined) => {
      if (str === undefined || str === null) return '""';
      const formatted = String(str).replace(/"/g, '""');
      return `"${formatted}"`;
    };

    const isEn = language === 'en';
    const headers = isEn
      ? ['ID', 'Severity', 'Category', 'Title', 'Line', 'Excerpt', 'Description', 'Suggested Fix', 'Patch Available']
      : ['아이디', '심각도', '구분', '제목', '행번호', '발췌문', '설명', '권장해결방안', '자동화해가능여부'];

    const metaRows = [
      [escapeCsv(isEn ? '# Document Conformance Audit Report' : '# 기준 문서 적합성 검사 분석 보고서')],
      [escapeCsv(isEn ? `# Audited At: ${auditResult.analyzedAt}` : `# 점검 일시: ${auditResult.analyzedAt}`)],
      [escapeCsv(isEn ? `# Conformance Score: ${auditResult.score} / 100` : `# 적합성 점수: ${auditResult.score} / 100점`)],
      [escapeCsv(isEn ? `# Status: ${statusConfig.label}` : `# 진단 판정: ${statusConfig.label}`)],
      [escapeCsv(isEn ? `# Total Issues: ${active.length}` : `# 감지 불일치: ${active.length}건`)],
      ['']
    ];

    const dataRows = active.map((iss) => {
      const severityLabel =
        iss.severity === 'critical'
          ? t.severityCritical
          : iss.severity === 'warning'
          ? t.severityWarning
          : t.severityInfo;

      const typeLabel = (() => {
        switch (iss.type) {
          case 'timeline':
            return t.categoryTimeline;
          case 'metric':
            return t.categoryMetric;
          case 'task':
            return t.categoryTask;
          case 'ambiguity':
            return t.categoryAmbiguity;
          default:
            return iss.type;
        }
      })();

      return [
        escapeCsv(iss.id),
        escapeCsv(severityLabel),
        escapeCsv(typeLabel),
        escapeCsv(iss.title),
        escapeCsv(iss.location.line),
        escapeCsv(iss.location.text || ''),
        escapeCsv(iss.description),
        escapeCsv(iss.suggestedFix),
        escapeCsv(iss.reconciliationPatch ? (isEn ? 'Yes' : '가능') : (isEn ? 'No' : '불가'))
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        ...metaRows.map((r) => r.join(',')),
        headers.join(','),
        ...dataRows.map((r) => r.join(','))
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadLink.href = url;
    downloadLink.download = `ssot_conformance_report_${timestamp}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  // Filter issues
  const visibleIssues = useMemo(() => {
    return auditResult.issues.filter((iss) => {
      if (dismissedIds.has(iss.id)) return false;
      if (filterType === 'all') return true;
      if (filterType === 'critical') return iss.severity === 'critical';
      if (filterType === 'warning') return iss.severity === 'warning';
      return iss.type === filterType;
    });
  }, [auditResult.issues, dismissedIds, filterType]);

  const statusConfig = {
    pristine: {
      dot: 'bg-emerald-400',
      color: 'text-emerald-400',
      label: t.statusPristine
    },
    healthy: {
      dot: 'bg-sky-400',
      color: 'text-sky-400',
      label: t.statusHealthy
    },
    warning: {
      dot: 'bg-amber-400',
      color: 'text-amber-400',
      label: t.severityWarning
    },
    critical: {
      dot: 'bg-rose-400',
      color: 'text-rose-400',
      label: t.severityCritical
    }
  }[auditResult.status];

  // Active non-dismissed issues
  const activeIssues = useMemo(() => {
    return auditResult.issues.filter((iss) => !dismissedIds.has(iss.id));
  }, [auditResult.issues, dismissedIds]);

  // Reconcilable issues count
  const reconcilableCount = useMemo(() => {
    return activeIssues.filter((iss) => Boolean(iss.reconciliationPatch)).length;
  }, [activeIssues]);

  // Document total line count
  const totalDocLines = useMemo(() => {
    return content ? content.split('\n').length : 0;
  }, [content]);

  // Conformance Pie Chart Data
  const pieData = useMemo(() => {
    const critical = activeIssues.filter((i) => i.severity === 'critical').length;
    const warning = activeIssues.filter((i) => i.severity === 'warning').length;
    const info = activeIssues.filter((i) => i.severity === 'info').length;

    if (activeIssues.length === 0 || auditResult.score === 100) {
      return [{ name: '적합', value: 100, color: '#10b981' }];
    }

    const healthyShare = Math.max(1, auditResult.score);
    const criticalShare = critical * 25;
    const warningShare = warning * 12;
    const infoShare = info * 5;

    return [
      { name: '적합', value: healthyShare, color: '#10b981' },
      { name: '치명적', value: criticalShare, color: '#f43f5e' },
      { name: '주의', value: warningShare, color: '#fbbf24' },
      { name: '권고', value: infoShare, color: '#38bdf8' }
    ].filter((item) => item.value > 0);
  }, [activeIssues, auditResult.score]);

  // Category Conformance Rate Data for BarChart
  const categoryChartData = useMemo(() => {
    const categories = [
      { key: 'timeline', label: t.categoryTimeline },
      { key: 'metric', label: t.categoryMetric },
      { key: 'task', label: t.categoryTask },
      { key: 'ambiguity', label: t.categoryAmbiguity }
    ];

    return categories.map(({ key, label }) => {
      const inType = activeIssues.filter((i) => i.type === key);
      const crit = inType.filter((i) => i.severity === 'critical').length;
      const warn = inType.filter((i) => i.severity === 'warning').length;
      const inf = inType.filter((i) => i.severity === 'info').length;
      const categoryScore = Math.max(0, 100 - crit * 40 - warn * 20 - inf * 8);

      return {
        name: label,
        score: categoryScore,
        issueCount: inType.length
      };
    });
  }, [activeIssues, t]);

  const renderCustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#121214] border border-[#222226] p-2 rounded shadow-xl text-xs font-mono">
          <div className="text-zinc-200 font-semibold">{data.name}</div>
          <div className="text-indigo-400 mt-0.5">
            {t.conformanceRate}: {data.score}%
          </div>
          {data.issueCount > 0 ? (
            <div className="text-amber-400 text-[10px] mt-0.5">
              미해결: {data.issueCount}건
            </div>
          ) : (
            <div className="text-emerald-400 text-[10px] mt-0.5">
              정상 무결
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[#121214] border-l border-[#222226] w-88 md:w-96 shrink-0 shadow-2xl z-30 select-none text-zinc-200">
      {/* Header */}
      <div className="px-5 py-4 bg-[#121214] border-b border-[#222226] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-1.5">
              {t.title}
              {auditResult.isAiEnhanced && (
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-sans">
                  {t.aiBadge}
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyReport}
            className="px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] rounded-md transition flex items-center gap-1 text-xs border border-[#222226] cursor-pointer"
            title={t.copyReportTitle}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedReport ? t.copied : t.report}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] rounded-md transition flex items-center gap-1 text-xs border border-[#222226] cursor-pointer"
            title={t.exportReportTitle}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportReport}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] transition cursor-pointer"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Health Score Overview Card */}
      <div className="p-4 bg-[#09090b] border-b border-[#222226] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-100 font-mono">{auditResult.score}</span>
            <span className="text-xs text-zinc-400 font-mono">{t.scoreSuffix}</span>
          </div>

          <div className="flex items-center px-2.5 py-1 rounded-md bg-white/[0.04] border border-[#222226] text-xs text-zinc-300">
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-[#18181b] rounded-full overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-500 ${
              auditResult.score >= 85
                ? 'bg-emerald-500'
                : auditResult.score >= 60
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${auditResult.score}%` }}
          />
        </div>

        {/* Quick Counters */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          <div className="bg-[#121214] border border-[#222226] p-2 rounded-md text-center">
            <div className="text-zinc-400 text-[11px] mb-0.5">
              <span>{t.severityCritical}</span>
            </div>
            <span className="font-semibold text-zinc-100 text-xs">{auditResult.criticalCount}</span>
          </div>
          <div className="bg-[#121214] border border-[#222226] p-2 rounded-md text-center">
            <div className="text-zinc-400 text-[11px] mb-0.5">
              <span>{t.severityWarning}</span>
            </div>
            <span className="font-semibold text-zinc-100 text-xs">{auditResult.warningCount}</span>
          </div>
          <div className="bg-[#121214] border border-[#222226] p-2 rounded-md text-center">
            <div className="text-zinc-400 text-[11px] mb-0.5">
              <span>{t.severityInfo}</span>
            </div>
            <span className="font-semibold text-zinc-100 text-xs">{auditResult.infoCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleDeepAiScan}
            disabled={isAiScanning}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium py-1.5 px-2.5 rounded-md text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            title={t.aiScanTitle}
          >
            {isAiScanning && (
              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
            )}
            <span>{isAiScanning ? t.aiScanning : t.aiScanTitle}</span>
          </button>

          <button
            type="button"
            onClick={handleLocalRescan}
            className="bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 py-1.5 px-3 rounded-md text-xs transition flex items-center justify-center border border-[#222226] cursor-pointer"
            title={t.rescan}
          >
            <span>{t.rescan}</span>
          </button>

          {auditResult.issues.some((i) => !dismissedIds.has(i.id) && i.reconciliationPatch) && (
            <button
              type="button"
              onClick={handleApplyAllFixes}
              className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-2.5 rounded-md text-xs transition flex items-center justify-center gap-1 font-medium cursor-pointer shadow-xs"
              title={t.applyAllTitle}
            >
              <Check className="w-3 h-3" />
              <span>{t.applyAll}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        className="px-3 py-2 bg-[#121214] border-b border-[#222226] flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none text-xs"
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {[
          { id: 'all', label: t.filterAll },
          { id: 'critical', label: t.filterCritical },
          { id: 'timeline', label: t.filterTimeline },
          { id: 'metric', label: t.filterMetric },
          { id: 'task', label: t.filterTask },
          { id: 'ambiguity', label: t.filterAmbiguity }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-2 py-1 rounded-md transition shrink-0 cursor-pointer text-xs whitespace-nowrap ${
              filterType === tab.id
                ? 'bg-white/[0.08] text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Issues List & Infographic Card */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 select-text">
        {/* Infographic Summary Card */}
        <div className="p-3.5 rounded-lg border border-[#222226] bg-[#121214] space-y-3">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200">
                {t.infographicTitle}
              </span>
              <span className="text-[10px] font-mono text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#222226]">
                {t.conformanceRate} {auditResult.score}%
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsInfographicExpanded(!isInfographicExpanded)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title={t.toggleInfographic}
            >
              {isInfographicExpanded ? '접기' : '펼치기'}
            </button>
          </div>

          {isInfographicExpanded && (
            <>
              {/* Infographic Visual Body: Donut + 4 Key Stat Badges */}
              <div className="flex items-center gap-3">
                {/* Donut Chart with Score in Center */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <PieChart width={96} height={96}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-zinc-100 font-mono leading-none">
                      {auditResult.score}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
                      {t.conformanceRate}
                    </span>
                  </div>
                </div>

                {/* 4 Key Stat Badges Grid */}
                <div className="grid grid-cols-2 gap-1.5 flex-1 text-[11px] font-mono">
                  <div className="bg-[#09090b] border border-[#222226] p-2 rounded-md">
                    <div className="text-zinc-500 text-[10px]">검사 라인</div>
                    <div className="font-semibold text-zinc-200 mt-0.5">
                      {t.totalLinesScanned(totalDocLines)}
                    </div>
                  </div>
                  <div className="bg-[#09090b] border border-[#222226] p-2 rounded-md">
                    <div className="text-zinc-500 text-[10px]">진단 판정</div>
                    <div className="font-semibold text-zinc-200 mt-0.5 truncate">
                      {statusConfig.label}
                    </div>
                  </div>
                  <div className="bg-[#09090b] border border-[#222226] p-2 rounded-md">
                    <div className="text-zinc-500 text-[10px]">감지 불일치</div>
                    <div className="font-semibold text-zinc-200 mt-0.5">
                      {activeIssues.length}건
                    </div>
                  </div>
                  <div className="bg-[#09090b] border border-[#222226] p-2 rounded-md">
                    <div className="text-zinc-500 text-[10px]">자동 화해</div>
                    <div className="font-semibold text-indigo-400 mt-0.5">
                      {t.reconcilableCount(reconcilableCount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Conformance Bar Chart */}
              <div className="pt-2 border-t border-[#222226]">
                <div className="text-[11px] text-zinc-400 font-mono mb-1.5 flex items-center justify-between">
                  <span>영역별 적합 지표</span>
                  <span className="text-[10px] text-zinc-500">최대 100%</span>
                </div>
                <div className="w-full h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 4, right: 6, left: 6, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#a1a1aa', fontSize: 10 }}
                        axisLine={{ stroke: '#222226' }}
                        tickLine={false}
                      />
                      <YAxis domain={[0, 100]} hide={true} />
                      <RechartsTooltip
                        content={renderCustomBarTooltip}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      />
                      <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                        {categoryChartData.map((entry, index) => (
                          <Cell
                            key={`bar-${index}`}
                            fill={
                              entry.score >= 85
                                ? '#6366f1'
                                : entry.score >= 60
                                ? '#fbbf24'
                                : '#f43f5e'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dynamic Insight Banner */}
              <div className="p-2 rounded bg-[#09090b] border border-[#222226] text-[11px] leading-relaxed">
                <span className={activeIssues.length === 0 ? 'text-emerald-400' : 'text-zinc-300'}>
                  {activeIssues.length === 0
                    ? t.perfectHealthInsight
                    : t.issuesFoundInsight(activeIssues.length)}
                </span>
              </div>
            </>
          )}
        </div>

        {visibleIssues.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center p-4 text-zinc-400">
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-[#222226] flex items-center justify-center mb-3">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-xs font-medium text-zinc-200 mb-1">
              {t.emptyTitle}
            </h4>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              {t.emptyDesc}
            </p>
          </div>
        ) : (
          visibleIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-3 rounded-lg border border-[#222226] bg-[#121214] hover:border-[#333338] transition space-y-2.5"
            >
              {/* Issue Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h4 className="text-xs font-medium text-zinc-200 truncate">{issue.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-400 shrink-0 font-medium border border-[#222226]">
                    {issue.severity === 'critical' ? t.severityCritical : issue.severity === 'warning' ? t.severityWarning : t.severityInfo}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {issue.location.line > 0 && (
                    <button
                      type="button"
                      onClick={() => onJumpToLine?.(issue.location.line)}
                      className="text-[10px] font-mono bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer border border-[#222226]"
                      title={t.jumpToLine}
                    >
                      <span>{t.lineLabel(issue.location.line)}</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismiss(issue.id)}
                    className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition cursor-pointer"
                    title={t.dismiss}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-400 leading-relaxed">
                {issue.description}
              </p>

              {/* Location Snippet */}
              {issue.location.text && (
                <div className="bg-[#09090b] border border-[#222226] rounded-md p-2 font-mono text-[11px] text-zinc-400 truncate">
                  <span className="text-zinc-500 mr-1 select-none">{t.excerpt}</span>
                  <span className="text-amber-200/90">{issue.location.text}</span>
                </div>
              )}

              {/* Suggested Fix and Reconciliation Patch */}
              <div className="bg-[#09090b] border border-[#222226] rounded-md p-2.5 space-y-2">
                <div className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{t.suggestedFixHeading}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {issue.suggestedFix}
                </p>

                {issue.reconciliationPatch && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#222226]">
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 truncate">
                      <Check className="w-3 h-3 shrink-0" />
                      {t.patchReady}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyFix(issue)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-2.5 py-1 rounded-md transition flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                      title={t.applyFixTitle}
                    >
                      <span>{t.applyFix}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer info */}
      <div className="p-2.5 bg-[#09090b] border-t border-[#222226] flex items-center justify-between text-[11px] text-zinc-500 shrink-0 font-mono">
        <span>{t.lastChecked(auditResult.analyzedAt)}</span>
        <span>{t.engineName}</span>
      </div>
    </div>
  );
};

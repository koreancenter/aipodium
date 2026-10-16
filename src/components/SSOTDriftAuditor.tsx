import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Coins,
  CheckSquare,
  HelpCircle,
  FileCheck2,
  Sparkles,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  Zap,
  ExternalLink,
  Layers,
  Copy,
  ChevronRight
} from 'lucide-react';
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
  const [filterType, setFilterType] = useState<string>('all');
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<SSOTAuditSummary>(() =>
    analyzeSSOTDriftLocally(content)
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

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
    const reportMd = `# 🛡️ SSOT 무결성 감사 보고서 (Audit Report)
- **일시**: ${auditResult.analyzedAt}
- **무결성 점수**: ${auditResult.score} / 100점 (${auditResult.status.toUpperCase()})
- **총 감지 항목**: ${activeIssues.length}건 (위험: ${auditResult.criticalCount}, 주의: ${auditResult.warningCount})

## 📋 감지된 불일치 내역
${
  activeIssues.length === 0
    ? '- 감지된 불일치가 없습니다. 문서가 단일 진실 공급원 기준을 충족합니다.'
    : activeIssues
        .map(
          (iss, idx) => `### ${idx + 1}. [${iss.severity.toUpperCase()}] ${iss.title}
- **위치**: ${iss.location.line}행 (\`${iss.location.text}\`)
- **설명**: ${iss.description}
- **권장 조치**: ${iss.suggestedFix}
`
        )
        .join('\n')
}
`;
    navigator.clipboard.writeText(reportMd);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
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
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      label: '무결점 (Pristine)'
    },
    healthy: {
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/30',
      label: '양호 (Healthy)'
    },
    warning: {
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      label: '주의 필요 (Review Needed)'
    },
    critical: {
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      label: '심각한 정합성 위배 (Critical Drift)'
    }
  }[auditResult.status];

  const getTypeIcon = (type: SSOTDriftIssue['type']) => {
    switch (type) {
      case 'timeline':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'metric':
        return <Coins className="w-3.5 h-3.5 text-rose-400" />;
      case 'task':
        return <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />;
      case 'ambiguity':
        return <HelpCircle className="w-3.5 h-3.5 text-orange-400" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-l border-[#222226] w-88 md:w-96 shrink-0 shadow-2xl z-30 select-none">
      {/* Header */}
      <div className="p-3 bg-[#1a1b24] border-b border-[#222226] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
            {auditResult.status === 'critical' ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              SSOT Guard Inspector
              {auditResult.isAiEnhanced && (
                <span className="text-[0.5625rem] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1 py-0.2 rounded font-mono">
                  AI DEEP
                </span>
              )}
            </h3>
            <p className="text-[0.625rem] text-slate-400">단일 진실 공급원 정합성 및 무결성 감사</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Health Score Overview Card */}
      <div className="p-3 bg-[#161720] border-b border-[#222226] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{auditResult.score}</span>
            <span className="text-xs text-slate-400 font-mono">/ 100점</span>
          </div>

          <div
            className={`px-2 py-0.5 rounded-sm border text-[0.625rem] font-bold ${statusConfig.bg} ${statusConfig.color}`}
          >
            {statusConfig.label}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#252838] rounded-sm overflow-hidden mb-2.5">
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
        <div className="grid grid-cols-3 gap-1.5 text-[0.625rem] font-mono">
          <div className="bg-[#121214] border border-[#222226] p-1.5 rounded text-center">
            <span className="text-slate-400 block text-[0.5625rem]">위험 (Critical)</span>
            <span className="font-bold text-rose-400 text-xs">{auditResult.criticalCount}</span>
          </div>
          <div className="bg-[#121214] border border-[#222226] p-1.5 rounded text-center">
            <span className="text-slate-400 block text-[0.5625rem]">주의 (Warning)</span>
            <span className="font-bold text-amber-400 text-xs">{auditResult.warningCount}</span>
          </div>
          <div className="bg-[#121214] border border-[#222226] p-1.5 rounded text-center">
            <span className="text-slate-400 block text-[0.5625rem]">권고 (Info)</span>
            <span className="font-bold text-sky-400 text-xs">{auditResult.infoCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <button
            type="button"
            onClick={handleDeepAiScan}
            disabled={isAiScanning}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-1 px-2 rounded text-[0.6875rem] transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            title="Gemini 신경망을 통한 정밀 심층 정합성 검사"
          >
            {isAiScanning ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-indigo-200" />
            )}
            <span>{isAiScanning ? '심층 분석 중...' : 'AI 정밀 스캔'}</span>
          </button>

          <button
            type="button"
            onClick={handleLocalRescan}
            className="bg-[#242736] hover:bg-[#2e3246] text-slate-200 py-1 px-2 rounded text-[0.6875rem] transition flex items-center justify-center gap-1 border border-[#373b52] cursor-pointer"
            title="로컬 즉시 휴리스틱 재검사"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>즉시 재검사</span>
          </button>

          {auditResult.issues.some((i) => !dismissedIds.has(i.id) && i.reconciliationPatch) && (
            <button
              type="button"
              onClick={handleApplyAllFixes}
              className="bg-emerald-600 hover:bg-emerald-500 text-white py-1 px-2 rounded text-[0.6875rem] transition flex items-center justify-center gap-1 font-semibold cursor-pointer shadow-xs"
              title="모든 해결 권장안을 문서에 일괄 반영"
            >
              <Check className="w-3 h-3" />
              <span>일괄 해결</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-1.5 bg-[#14151d] border-b border-[#222226] flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none text-[0.625rem]">
        {[
          { id: 'all', label: '전체' },
          { id: 'critical', label: '위험' },
          { id: 'timeline', label: '타임라인' },
          { id: 'metric', label: '수치/예산' },
          { id: 'task', label: '태스크' },
          { id: 'ambiguity', label: '모호성' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-2 py-0.5 rounded-sm transition shrink-0 cursor-pointer ${
              filterType === tab.id
                ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto shrink-0">
          <button
            type="button"
            onClick={handleCopyReport}
            className="p-1 text-slate-400 hover:text-white transition flex items-center gap-1 text-[0.5625rem]"
            title="마크다운 감사 보고서 클립보드 복사"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedReport ? '복사됨!' : '리포트'}</span>
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 select-text">
        {visibleIssues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
              <FileCheck2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 mb-1">
              정합성 불일치가 감지되지 않았습니다
            </h4>
            <p className="text-[0.6875rem] text-slate-400 max-w-xs leading-relaxed">
              현재 필터 기준 문서가 단일 진실 공급원(SSOT) 표준을 온전히 준수하고 있습니다.
            </p>
          </div>
        ) : (
          visibleIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-2.5 rounded-lg border bg-[#181924] transition hover:border-[#434863] ${
                issue.severity === 'critical'
                  ? 'border-rose-500/40'
                  : issue.severity === 'warning'
                  ? 'border-amber-500/30'
                  : 'border-[#222226]'
              }`}
            >
              {/* Issue Header */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {getTypeIcon(issue.type)}
                  <h4 className="text-xs font-bold text-slate-200 truncate">{issue.title}</h4>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {issue.location.line > 0 && (
                    <button
                      type="button"
                      onClick={() => onJumpToLine?.(issue.location.line)}
                      className="text-[0.5625rem] font-mono bg-[#252838] hover:bg-indigo-600 text-slate-300 hover:text-white px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                      title="에디터에서 해당 위치로 이동"
                    >
                      <span>L{issue.location.line}</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismiss(issue.id)}
                    className="text-slate-500 hover:text-slate-300 p-0.5 transition cursor-pointer"
                    title="이 항목 무시"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-[0.6875rem] text-slate-300 leading-relaxed mb-2">
                {issue.description}
              </p>

              {/* Location Snippet */}
              {issue.location.text && (
                <div className="bg-[#101117] border border-[#252838] rounded p-1.5 mb-2 font-mono text-[0.625rem] text-slate-400 truncate">
                  <span className="text-slate-500 mr-1 select-none">문서 발췌:</span>
                  <span className="text-amber-200/90">{issue.location.text}</span>
                </div>
              )}

              {/* Suggested Fix and Reconciliation Patch */}
              <div className="bg-[#1b1e2e] border border-indigo-500/20 rounded p-2">
                <div className="text-[0.625rem] text-indigo-300 font-semibold mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>권장 해결 방안</span>
                </div>
                <p className="text-[0.625rem] text-slate-300 mb-2 leading-normal">
                  {issue.suggestedFix}
                </p>

                {issue.reconciliationPatch && (
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-indigo-500/20">
                    <span className="text-[0.5625rem] text-emerald-400 font-mono flex items-center gap-0.5 truncate">
                      <Check className="w-2.5 h-2.5 shrink-0" />
                      패치 준비 완료
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyFix(issue)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[0.625rem] font-semibold px-2 py-0.8 rounded transition flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                      title="해결안을 본문 에디터에 즉시 치환 반영합니다."
                    >
                      <span>해결안 즉시 반영</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer info */}
      <div className="p-2 bg-[#14151d] border-t border-[#222226] flex items-center justify-between text-[0.5625rem] text-slate-500 shrink-0 font-mono">
        <span>최근 점검: {auditResult.analyzedAt}</span>
        <span>Living SSOT Guard v2.0</span>
      </div>
    </div>
  );
};

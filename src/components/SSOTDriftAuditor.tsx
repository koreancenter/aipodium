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
    const reportMd = `# 문서 정합성 검사 보고서
- **점검 일시**: ${auditResult.analyzedAt}
- **정합성 점수**: ${auditResult.score} / 100점
- **감지 항목**: 총 ${activeIssues.length}건 (치명적: ${auditResult.criticalCount}, 주의: ${auditResult.warningCount})

## 감지된 불일치 내역
${
  activeIssues.length === 0
    ? '- 감지된 불일치가 없습니다. 문서가 단일 진실 공급원 기준을 충족합니다.'
    : activeIssues
        .map(
          (iss, idx) => `### ${idx + 1}. [${iss.severity === 'critical' ? '치명적' : iss.severity === 'warning' ? '주의' : '권고'}] ${iss.title}
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
      dot: 'bg-emerald-400',
      color: 'text-emerald-400',
      label: '일관성 우수'
    },
    healthy: {
      dot: 'bg-sky-400',
      color: 'text-sky-400',
      label: '양호'
    },
    warning: {
      dot: 'bg-amber-400',
      color: 'text-amber-400',
      label: '주의'
    },
    critical: {
      dot: 'bg-rose-400',
      color: 'text-rose-400',
      label: '치명적'
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
    <div className="flex flex-col h-full bg-[#121214] border-l border-[#222226] w-88 md:w-96 shrink-0 shadow-2xl z-30 select-none text-zinc-200">
      {/* Header */}
      <div className="px-5 py-4 bg-[#121214] border-b border-[#222226] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-1.5">
              문서 정합성 검사
              {auditResult.isAiEnhanced && (
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-sans">
                  인공지능 정밀
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">단일 진실 공급원 정합성 및 무결성 검사</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Health Score Overview Card */}
      <div className="p-4 bg-[#09090b] border-b border-[#222226] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-100 font-mono">{auditResult.score}</span>
            <span className="text-xs text-zinc-400 font-mono">/ 100점</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-[#222226] text-xs text-zinc-300">
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
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
            <div className="flex items-center justify-center gap-1 text-zinc-400 text-[11px] mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>치명적</span>
            </div>
            <span className="font-semibold text-zinc-100 text-xs">{auditResult.criticalCount}</span>
          </div>
          <div className="bg-[#121214] border border-[#222226] p-2 rounded-md text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-400 text-[11px] mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>주의</span>
            </div>
            <span className="font-semibold text-zinc-100 text-xs">{auditResult.warningCount}</span>
          </div>
          <div className="bg-[#121214] border border-[#222226] p-2 rounded-md text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-400 text-[11px] mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>권고</span>
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
            title="인공지능 정밀 검사"
          >
            {isAiScanning ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-indigo-200" />
            )}
            <span>{isAiScanning ? '심층 분석 중...' : '인공지능 정밀 검사'}</span>
          </button>

          <button
            type="button"
            onClick={handleLocalRescan}
            className="bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 py-1.5 px-2.5 rounded-md text-xs transition flex items-center justify-center gap-1 border border-[#222226] cursor-pointer"
            title="즉시 재검사"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>즉시 재검사</span>
          </button>

          {auditResult.issues.some((i) => !dismissedIds.has(i.id) && i.reconciliationPatch) && (
            <button
              type="button"
              onClick={handleApplyAllFixes}
              className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-2.5 rounded-md text-xs transition flex items-center justify-center gap-1 font-medium cursor-pointer shadow-xs"
              title="모든 권장 수정사항을 문서에 일괄 반영합니다"
            >
              <Check className="w-3 h-3" />
              <span>일괄 해결</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 bg-[#121214] border-b border-[#222226] flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none text-xs">
        {[
          { id: 'all', label: '전체' },
          { id: 'critical', label: '치명적' },
          { id: 'timeline', label: '타임라인' },
          { id: 'metric', label: '수치 및 예산' },
          { id: 'task', label: '작업 항목' },
          { id: 'ambiguity', label: '모호성' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-2.5 py-1 rounded-md transition shrink-0 cursor-pointer text-xs ${
              filterType === tab.id
                ? 'bg-white/[0.08] text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto shrink-0">
          <button
            type="button"
            onClick={handleCopyReport}
            className="px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] rounded-md transition flex items-center gap-1 text-xs"
            title="마크다운 검사 보고서 복사"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedReport ? '복사 완료' : '보고서'}</span>
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 select-text">
        {visibleIssues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-[#222226] flex items-center justify-center mb-3">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-xs font-medium text-zinc-200 mb-1">
              정합성 불일치가 감지되지 않았습니다
            </h4>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              현재 필터 기준 문서가 단일 진실 공급원 기준을 충족하고 있습니다.
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
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      issue.severity === 'critical'
                        ? 'bg-rose-500'
                        : issue.severity === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-sky-400'
                    }`}
                  />
                  <h4 className="text-xs font-medium text-zinc-200 truncate">{issue.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-400 shrink-0 font-medium border border-[#222226]">
                    {issue.severity === 'critical' ? '치명적' : issue.severity === 'warning' ? '주의' : '권고'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {issue.location.line > 0 && (
                    <button
                      type="button"
                      onClick={() => onJumpToLine?.(issue.location.line)}
                      className="text-[10px] font-mono bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer border border-[#222226]"
                      title="해당 줄로 이동"
                    >
                      <span>{issue.location.line}줄</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismiss(issue.id)}
                    className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition cursor-pointer"
                    title="무시"
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
                  <span className="text-zinc-500 mr-1 select-none">문서 발췌:</span>
                  <span className="text-amber-200/90">{issue.location.text}</span>
                </div>
              )}

              {/* Suggested Fix and Reconciliation Patch */}
              <div className="bg-[#09090b] border border-[#222226] rounded-md p-2.5 space-y-2">
                <div className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>권장 해결 방안</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {issue.suggestedFix}
                </p>

                {issue.reconciliationPatch && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#222226]">
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 truncate">
                      <Check className="w-3 h-3 shrink-0" />
                      수정 패치 준비 완료
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyFix(issue)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-2.5 py-1 rounded-md transition flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                      title="해결안을 본문에 즉시 치환 반영합니다"
                    >
                      <span>즉시 반영</span>
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
        <span>최근 점검: {auditResult.analyzedAt}</span>
        <span>문서 정합성 검사 엔진</span>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Target,
  DollarSign,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  GitCompare,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  ArrowUpRight
} from 'lucide-react';
import {
  CriticPersonaId,
  CriticReviewResult,
  CouncilReviewSummary,
  evaluateDocumentLocally
} from '../utils/criticsEngine';
import { GhostDiffModal } from './GhostDiffModal';

export interface CouncilOfCriticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  apiKey?: string;
  model?: string;
  onApplyRevisions: (revisedDoc: string) => void;
  onJumpToLine?: (lineNumber: number) => void;
}

export const CouncilOfCriticsModal: React.FC<CouncilOfCriticsModalProps> = ({
  isOpen,
  onClose,
  content,
  apiKey,
  model,
  onApplyRevisions,
  onJumpToLine
}) => {
  const [activePersona, setActivePersona] = useState<CriticPersonaId>('pm');
  const [summary, setSummary] = useState<CouncilReviewSummary>(() => evaluateDocumentLocally(content));
  const [isLoading, setIsLoading] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Recalculate local heuristic audit on content change
  useEffect(() => {
    if (isOpen && content) {
      setSummary(evaluateDocumentLocally(content));
    }
  }, [isOpen, content]);

  // Request deep AI audit from server
  const handleRunAiAudit = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/critics/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: content,
          apiKey: apiKey || '',
          model: model || 'gemini-3.1-pro-preview'
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (!data.fallbackToLocal && data.critics && data.critics.length > 0) {
          setSummary({
            ...data,
            analyzedAt: new Date().toLocaleTimeString(),
            isAiEnhanced: true
          });
          return;
        }
      }
    } catch {
      // Ignore and retain local evaluation
    } finally {
      setIsLoading(false);
    }

    // Local evaluation fallback
    setSummary(evaluateDocumentLocally(content));
  };

  const currentCritic: CriticReviewResult | undefined = summary.critics.find(
    (c) => c.persona === activePersona
  );

  const handleCopyReport = async () => {
    let report = `# 전문가 위원회 다면 평가 보고서\n\n`;
    report += `- **종합 준비도 지수**: ${summary.overallScore}점 / 100점 (${summary.readinessRating})\n`;
    report += `- **식별된 위험 요인**: 치명적 ${summary.criticalCount}건, 주의 ${summary.warningCount}건\n`;
    report += `- **점검 일시**: ${summary.analyzedAt}\n\n`;

    summary.critics.forEach((c) => {
      report += `## ${c.title} · ${c.name} ${c.role}\n`;
      report += `- **판정**: ${c.verdict} (점수: ${c.score}점)\n`;
      if (c.strengths.length > 0) {
        report += `- **강점**: ${c.strengths.join(', ')}\n`;
      }
      report += `\n### 주요 지적 사항 및 보완 권고:\n`;
      c.issues.forEach((issue, idx) => {
        const sevLabel = issue.severity === 'critical' ? '치명적' : issue.severity === 'warning' ? '주의' : '권고';
        report += `${idx + 1}. **[${sevLabel}] ${issue.title}**\n`;
        report += `   - 현상: ${issue.description}\n`;
        report += `   - 조치 권고: ${issue.recommendation}\n`;
      });
      report += `\n---\n\n`;
    });

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="bg-[#121214] border border-[#222226] rounded-xl shadow-2xl flex flex-col w-full max-w-5xl h-[88vh] overflow-hidden text-zinc-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#121214] border-b border-[#222226]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-zinc-100">
                  전문가 위원회 다면 평가
                </h2>
                {summary.isAiEnhanced && (
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    인공지능 정밀 분석
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                기획, 보안, 재무, 아키텍처 4인의 다각도 관점에서 문서를 검증합니다.
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[#18181b] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Council Score & Overall Readiness Banner */}
          <div className="px-6 py-3 bg-[#09090b] border-b border-[#222226] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">종합 준비도:</span>
                <span className="text-sm font-mono font-bold text-zinc-100">
                  {summary.overallScore} / 100점
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-[#222226] text-xs text-zinc-300">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      summary.overallScore >= 85
                        ? 'bg-emerald-400'
                        : summary.overallScore >= 60
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span>{summary.readinessRating}</span>
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="flex items-center gap-1 text-zinc-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> 치명적 {summary.criticalCount}
                </span>
                <span className="flex items-center gap-1 text-zinc-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 주의 {summary.warningCount}
                </span>
              </div>
            </div>

            {/* Quick Actions in Banner */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunAiAudit}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-[#222226] text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="인공지능 다각도 정밀 검사 재실행"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{isLoading ? '분석 진행 중...' : '인공지능 정밀 검사'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDiffModalOpen(true)}
                className="px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-[#222226] text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                title="권고 개정안 차이 비교"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>개정안 비교 검토</span>
              </button>
            </div>
          </div>

          {/* Persona Tabs & Main Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Sidebar: 4 Critics Selector */}
            <div className="w-full md:w-60 bg-[#09090b] border-b md:border-b-0 md:border-r border-[#222226] p-2.5 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
              {summary.critics.map((critic) => {
                const isSelected = activePersona === critic.persona;
                const Icon =
                  critic.persona === 'pm'
                    ? Target
                    : critic.persona === 'security'
                    ? Shield
                    : critic.persona === 'cfo'
                    ? DollarSign
                    : Cpu;

                return (
                  <button
                    key={critic.persona}
                    type="button"
                    onClick={() => setActivePersona(critic.persona)}
                    className={`text-left p-2.5 rounded-lg transition flex items-center justify-between gap-2 cursor-pointer shrink-0 md:shrink border ${
                      isSelected
                        ? 'bg-white/[0.08] border-[#222226] text-white'
                        : 'border-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{critic.role}</div>
                        <div className="text-[11px] text-zinc-400 truncate">{critic.name}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-medium text-zinc-300">
                        {critic.score}점
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Pane: Selected Critic Findings & Recommendations */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#121214] space-y-4">
              {currentCritic && (
                <>
                  {/* Critic Profile Card */}
                  <div className="p-4 rounded-lg bg-[#09090b] border border-[#222226] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-medium text-zinc-100">
                          {currentCritic.title}
                        </h3>
                        <span className="text-xs text-zinc-400">
                          · {currentCritic.name} {currentCritic.role}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-zinc-400 font-medium">검토 판정:</span>
                        <span className="text-zinc-200 font-medium">
                          {currentCritic.verdict}
                        </span>
                      </div>
                    </div>

                    {/* Strengths summary */}
                    {currentCritic.strengths.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-zinc-400 text-xs">인정된 강점:</span>
                        {currentCritic.strengths.map((str, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-[#222226] text-zinc-300 text-xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{str}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Issues & Recommendations List (Flat rows with single border-b border-[#222226] py-3.5) */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-zinc-400 pb-2 border-b border-[#222226]">
                      <span>핵심 지적 사항 및 시정 조치 권고 · 총 {currentCritic.issues.length}건</span>
                    </div>

                    {currentCritic.issues.length === 0 ? (
                      <div className="py-12 text-center text-zinc-400 space-y-2">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                        <div className="text-xs font-medium text-zinc-200">
                          이 관점에서는 중대한 결함이 발견되지 않았습니다
                        </div>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                          현재 작성된 내용이 해당 영역의 기준 및 요구사항을 온전히 충족하고 있습니다.
                        </p>
                      </div>
                    ) : (
                      currentCritic.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className="border-b border-[#222226] py-4 space-y-2 last:border-b-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  issue.severity === 'critical'
                                    ? 'bg-rose-500'
                                    : issue.severity === 'warning'
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                              />
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-300 border border-[#222226] font-medium shrink-0">
                                {issue.severity === 'critical'
                                  ? '치명적'
                                  : issue.severity === 'warning'
                                  ? '주의'
                                  : '권고'}
                              </span>
                              <h4 className="text-xs font-medium text-zinc-100 truncate">{issue.title}</h4>
                            </div>

                            {issue.targetLine && onJumpToLine && (
                              <button
                                type="button"
                                onClick={() => {
                                  onJumpToLine(issue.targetLine!);
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono flex items-center gap-1 transition cursor-pointer border border-[#222226]"
                                title="해당 줄로 이동"
                              >
                                <span>{issue.targetLine}줄</span>
                                <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {issue.description}
                          </p>

                          <div className="text-xs text-zinc-300 pt-1 flex items-start gap-1.5">
                            <span className="text-indigo-400 font-medium shrink-0">권장 조치:</span>
                            <span className="text-zinc-400">{issue.recommendation}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-[#09090b] border-t border-[#222226] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-1.5 rounded-md border border-[#222226] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사 완료' : '종합 평가 보고서 복사'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md hover:bg-[#18181b] text-zinc-400 hover:text-zinc-200 text-xs font-medium transition cursor-pointer"
              >
                닫기
              </button>

              <button
                type="button"
                onClick={() => setIsDiffModalOpen(true)}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>개정안 비교 검토 및 적용</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ghost Diff Modal */}
      <GhostDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        originalContent={content}
        proposedContent={summary.revisedDocument}
        title="비평가 위원회 권고 개정안 차이 비교"
        sourceLabel="위원회 권고 개정안"
        onApplyRevisions={(revised) => {
          onApplyRevisions(revised);
          setIsDiffModalOpen(false);
          onClose();
        }}
        onAppendRevisions={(revised) => {
          // Append as appendix
          onApplyRevisions(content + '\n\n' + revised);
          setIsDiffModalOpen(false);
          onClose();
        }}
      />
    </>
  );
};

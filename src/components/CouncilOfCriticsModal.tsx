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
    let report = `# 🏛️ 다각도 비평가 위원회 종합 감사 보고서 (Council of Critics Audit)\n\n`;
    report += `- **종합 준비도 지수**: ${summary.overallScore}점 / 100점 (${summary.readinessRating})\n`;
    report += `- **식별된 위험 요인**: 치명적 결함 ${summary.criticalCount}건, 주의 경고 ${summary.warningCount}건\n`;
    report += `- **감사 일시**: ${summary.analyzedAt} ${summary.isAiEnhanced ? '(Gemini AI 심층 분석 적용)' : '(로컬 정밀 진단)'}\n\n`;

    summary.critics.forEach((c) => {
      report += `## ${c.title} (${c.name} - ${c.role})\n`;
      report += `- **판정**: ${c.verdict} (점수: ${c.score}점)\n`;
      if (c.strengths.length > 0) {
        report += `- **강점**: ${c.strengths.join(', ')}\n`;
      }
      report += `\n### 주요 지적 사항 및 보완 권고:\n`;
      c.issues.forEach((issue, idx) => {
        report += `${idx + 1}. **[${issue.severity.toUpperCase()}] ${issue.title}**\n`;
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
          className="bg-[#161722] border border-[#2e3142] rounded-xl shadow-2xl flex flex-col w-full max-w-5xl h-[88vh] overflow-hidden text-slate-100"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#11121c] border-b border-[#2e3142]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-100">
                    다각도 비평가 위원회 종합 감사 (Council of Critics)
                  </h2>
                  {summary.isAiEnhanced && (
                    <span className="text-[0.625rem] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      AI 심층 분석 적용
                    </span>
                  )}
                </div>
                <p className="text-[0.6875rem] text-slate-400">
                  기획(PM), 보안, 재무(CFO), 아키텍처 4인의 적대적 다각도 관점에서 문서를 검증합니다.
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-[#2e3142] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Council Score & Overall Readiness Banner */}
          <div className="px-4 py-2.5 bg-[#141520] border-b border-[#2e3142] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">종합 준비도:</span>
                <span
                  className={`text-sm font-mono font-extrabold px-2 py-0.5 rounded-sm border ${
                    summary.overallScore >= 85
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : summary.overallScore >= 60
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {summary.overallScore} / 100점
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    summary.readinessRating === '출시 준비 완료'
                      ? 'bg-emerald-950 text-emerald-300'
                      : summary.readinessRating === '조건부 보완 권고'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-rose-950 text-rose-300'
                  }`}
                >
                  {summary.readinessRating}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-rose-400 font-mono font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> 치명적 {summary.criticalCount}
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-mono font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> 주의 {summary.warningCount}
                </span>
              </div>
            </div>

            {/* Quick Actions in Banner */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunAiAudit}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-md bg-[#242636] hover:bg-[#2f3248] text-slate-200 hover:text-white border border-[#3b3e55] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Gemini AI를 통한 다각도 심층 감사 재실행"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{isLoading ? '감사 진행 중...' : 'AI 정밀 감사 실행'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDiffModalOpen(true)}
                className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="비평가 위원회가 권고한 보완책이 반영된 개정안을 현재 문서와 비교 검토합니다"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>보완 개정안 Diff 검토</span>
              </button>
            </div>
          </div>

          {/* Persona Tabs & Main Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Sidebar: 4 Critics Selector */}
            <div className="w-full md:w-64 bg-[#12131c] border-b md:border-b-0 md:border-r border-[#2e3142] p-2 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto">
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
                    className={`text-left p-2.5 rounded-lg transition flex items-center justify-between gap-2.5 cursor-pointer shrink-0 md:shrink border ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-xs'
                        : 'border-transparent hover:bg-[#1c1e2d] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[#212332] text-slate-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{critic.role}</div>
                        <div className="text-[0.6875rem] text-slate-400 truncate">{critic.name}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[0.6875rem] font-mono font-bold px-1.5 py-0.5 rounded ${
                          critic.score >= 80
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : critic.score >= 60
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {critic.score}점
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Pane: Selected Critic Findings & Recommendations */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#141520] space-y-4">
              {currentCritic && (
                <>
                  {/* Critic Profile Card */}
                  <div className="p-3.5 rounded-xl bg-[#1a1c2a] border border-[#2e3142] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-100">
                          {currentCritic.title}
                        </h3>
                        <span className="text-xs text-slate-400">
                          ({currentCritic.name} · {currentCritic.role})
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-slate-400 font-medium">검토 판정:</span>
                        <span
                          className={`font-bold px-2 py-0.2 rounded text-[0.6875rem] ${
                            currentCritic.verdict === '승인'
                              ? 'bg-emerald-950 text-emerald-300'
                              : currentCritic.verdict === '조건부 승인'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {currentCritic.verdict}
                        </span>
                      </div>
                    </div>

                    {/* Strengths summary */}
                    {currentCritic.strengths.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-slate-400 text-[0.6875rem]">인정된 강점:</span>
                        {currentCritic.strengths.map((str, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 text-[0.6875rem] flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{str}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Issues & Recommendations List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                      <span>핵심 지적 사항 및 시정 조치 권고 ({currentCritic.issues.length}건)</span>
                    </div>

                    {currentCritic.issues.length === 0 ? (
                      <div className="p-8 text-center rounded-xl bg-[#181926] border border-[#2e3142] text-slate-400 space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                        <div className="text-sm font-semibold text-slate-200">
                          이 관점에서는 중대한 결함이 발견되지 않았습니다.
                        </div>
                        <p className="text-xs text-slate-500">
                          현재 작성된 내용이 해당 영역의 거버넌스 및 요구사항을 충족하고 있습니다.
                        </p>
                      </div>
                    ) : (
                      currentCritic.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`p-3.5 rounded-xl border transition ${
                            issue.severity === 'critical'
                              ? 'bg-rose-950/15 border-rose-500/30'
                              : issue.severity === 'warning'
                              ? 'bg-amber-950/15 border-amber-500/30'
                              : 'bg-indigo-950/15 border-indigo-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[0.625rem] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                                  issue.severity === 'critical'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : issue.severity === 'warning'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-indigo-500/20 text-indigo-300'
                                }`}
                              >
                                {issue.severity === 'critical'
                                  ? '치명적'
                                  : issue.severity === 'warning'
                                  ? '경고'
                                  : '권고'}
                              </span>
                              <h4 className="text-xs font-bold text-slate-100">{issue.title}</h4>
                            </div>

                            {issue.targetLine && onJumpToLine && (
                              <button
                                type="button"
                                onClick={() => {
                                  onJumpToLine(issue.targetLine!);
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded bg-[#202230] hover:bg-[#2b2d42] text-slate-300 text-[0.6875rem] font-mono flex items-center gap-1 transition cursor-pointer"
                                title="에디터의 해당 행으로 포커스 이동"
                              >
                                <span>L{issue.targetLine} 이동</span>
                                <ArrowUpRight className="w-3 h-3 text-slate-400" />
                              </button>
                            )}
                          </div>

                          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                            {issue.description}
                          </p>

                          <div className="mt-2.5 p-2 rounded-lg bg-[#11121c] border border-[#2e3142]/60 text-xs flex items-start gap-2">
                            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-indigo-300">시정 방안: </span>
                              <span className="text-slate-300">{issue.recommendation}</span>
                            </div>
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
          <div className="px-4 py-3 bg-[#11121c] border-t border-[#2e3142] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-1.5 rounded-lg border border-[#2e3142] bg-[#1a1c2a] hover:bg-[#282a38] text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '보고서 복사 완료!' : '종합 감사 보고서 클립보드 복사'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md border border-[#2e3142] hover:bg-[#282a38] text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                닫기
              </button>

              <button
                type="button"
                onClick={() => setIsDiffModalOpen(true)}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-950 cursor-pointer"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>비평 반영 개정안 비교 검토 및 적용</span>
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
        sourceLabel="Council of Critics Revision"
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

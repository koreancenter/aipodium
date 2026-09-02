import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Check,
  FileText,
  Copy,
  CheckCheck,
  Send,
  Zap
} from 'lucide-react';

export interface VibePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  fullContent: string;
  onApplyResult: (newSnippet: string, mode: 'replace' | 'insertBelow' | 'fullReplace') => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  selectedModel?: string;
  provider?: string;
  cloudApiKey?: string;
  localEndpointAddress?: string;
  aiParameters?: Record<string, unknown>;
}

export const VIBE_QUICK_PRESETS = [
  {
    icon: '📝',
    label: '핵심 요약',
    prompt: '여기에 있는 글들을 핵심 3~5줄로 명확하게 요약해 줘.',
    target: 'replace' as const
  },
  {
    icon: '📈',
    label: '2030 추이 분석 및 시트 확장',
    prompt: '여기에 있는 데이터를 바탕으로 2030년까지의 성장 추이, 연평균 성장률(CAGR), 분기별 예측치를 분석하여 수식(=SUM, =AVG)이 포함된 ```spreadsheet 블록으로 확장해 줘.',
    target: 'insertBelow' as const
  },
  {
    icon: '📊',
    label: '스마트 스프레드시트로 변환',
    prompt: '선택한 텍스트 또는 표 데이터를 수식과 차트가 내장된 ```spreadsheet 블록으로 완벽히 변환해 줘.',
    target: 'replace' as const
  },
  {
    icon: '💼',
    label: '비즈니스 정중체 리라이팅',
    prompt: '전문적이고 격식 있는 비즈니스 문서/보고서 표준 어조(개조식, 간결 명확한 문체)로 리라이팅해 줘.',
    target: 'replace' as const
  },
  {
    icon: '🎯',
    label: '실행 과제 & 체크리스트',
    prompt: '선택된 내용을 바탕으로 담당자, 기한, 마일스톤이 포함된 구체적인 실행 과제(Action Items) 체크리스트(- [ ] ...)로 재구성해 줘.',
    target: 'insertBelow' as const
  },
  {
    icon: '🌐',
    label: '영문 번역 & 대조표',
    prompt: '선택된 내용을 고품질 비즈니스 영문으로 번역하고, 국문과 영문 대조 표 형식으로 정리해 줘.',
    target: 'insertBelow' as const
  },
  {
    icon: '🔍',
    label: '모순점 & 누락 보완',
    prompt: '문서의 논리적 모순, 누락된 핵심 요구사항, 수치 오류를 면밀히 점검하고 완벽하게 보완 및 첨삭해 줘.',
    target: 'replace' as const
  }
];

export const VibePromptModal: React.FC<VibePromptModalProps> = ({
  isOpen,
  onClose,
  selectedText,
  fullContent,
  onApplyResult,
  onToast,
  selectedModel = 'gemini-2.5-flash',
  provider = 'cloud',
  cloudApiKey,
  localEndpointAddress,
  aiParameters
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [applyMode, setApplyMode] = useState<'replace' | 'insertBelow' | 'fullReplace'>('replace');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'diff' | 'result' | 'raw'>('diff');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasSelection = selectedText && selectedText.trim().length > 0;

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setGeneratedResult('');
      setPrompt('');
      setApplyMode(hasSelection ? 'replace' : 'fullReplace');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen, hasSelection]);

  if (!isOpen) return null;

  const handleExecuteVibe = async (customPromptToRun?: string) => {
    const finalPrompt = customPromptToRun || prompt;
    if (!finalPrompt.trim()) {
      onToast('AI에게 요청할 바이브 프롬프트를 입력하세요.', 'warn');
      return;
    }

    setIsLoading(true);
    setGeneratedResult('');

    const targetContext = hasSelection ? selectedText : fullContent;

    const systemPrompt = `당신은 지능형 문서 및 스프레드시트 통합 에디터 'Vibe Canvas'의 수석 에디터 AI입니다.
사용자가 선택한 문서/데이터 블록(또는 전체 문서)에 대해 사용자의 자연어 지시("바이브")에 따라 고품질의 완성도 높은 결과를 생성하세요.

[사용자 요청 지시사항]:
${finalPrompt}

[선택된 원본 텍스트/데이터]:
${targetContext}

[전체 문서 맥락 참조]:
${fullContent.substring(0, 3000)}

[출력 규칙]:
1. 만약 사용자가 스프레드시트/표/수식/추이 분석 생성을 요청하면, 반드시 아래와 같은 포맷의 \`\`\`spreadsheet 블록을 생성하세요:
\`\`\`spreadsheet
{
  "title": "시트 제목",
  "columns": ["구분", "2024", "2025", "2030 (E)", "성장률"],
  "rows": [
    ["매출", 100, 150, 500, "=D1/B1*100"],
    ["합계", "=SUM(B1:B1)", "=SUM(C1:C1)", "=SUM(D1:D1)", ""]
  ],
  "showChart": true,
  "chartType": "bar"
}
\`\`\`
2. 일반 글, 요약, 리라이팅 요청인 경우 완결성 있는 마크다운 형식으로 작성하세요.
3. 불필요한 메타 설명 없이, 에디터에 즉시 삽입될 수 있는 순수 콘텐츠 본문만 깔끔하게 출력하세요.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: systemPrompt,
          model: selectedModel,
          provider,
          apiKey: provider === 'cloud' ? cloudApiKey : undefined,
          endpoint: provider === 'local' ? localEndpointAddress : undefined,
          parameters: aiParameters,
          history: []
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || data.text || '';
        if (reply.trim()) {
          setGeneratedResult(reply.trim());
          onToast('✨ Vibe AI 편집 결과가 생성되었습니다!', 'success');
        } else {
          onToast('결과가 비어 있습니다. 프롬프트를 다시 시도해 주세요.', 'warn');
        }
      } else {
        onToast('AI 서버 응답 오류가 발생했습니다.', 'error');
      }
    } catch (err) {
      console.error('Vibe execution error:', err);
      onToast('AI 연결 실패: 네트워크 또는 API 키를 확인하세요.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedResult) return;
    onApplyResult(generatedResult, applyMode);
    onToast('✅ Vibe Canvas에 성공적으로 반영되었습니다!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-100 select-none">
      <div className="relative w-full max-w-4xl bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-200 font-sans">
        
        {/* Minimal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition cursor-pointer z-10"
          title="닫기 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. MODAL HEADER */}
        <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#27272a] border border-[#3f3f46] text-[#38bdf8]">
              <Sparkles className="w-4 h-4 text-[#38bdf8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-normal text-slate-300">Vibe Prompt</h3>
                <span className="text-[0.625rem] px-2 py-0.5 rounded bg-[#27272a] text-[#38bdf8] border border-[#3f3f46] font-mono">
                  Alt + V
                </span>
              </div>
              <p className="text-xs text-slate-400">
                선택한 텍스트 또는 문서 전체에 대해 AI에게 자연어로 편집/가공을 요청합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 2. BODY CONTENT */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* Target Selection Preview Card */}
          <div className="p-3 bg-[#27272a]/60 border border-[#3f3f46] rounded">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-normal">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>
                  {hasSelection
                    ? `선택된 블록 (${selectedText.split('\n').length}줄, ${selectedText.length}자)`
                    : '선택 영역 없음 (전체 문서 대상 가공)'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[0.625rem] text-slate-400">적용 방식:</span>
                <select
                  value={applyMode}
                  onChange={(e) => setApplyMode(e.target.value as 'replace' | 'insertBelow' | 'fullReplace')}
                  className="bg-[#18181b] border border-[#3f3f46] text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-[#38bdf8]"
                >
                  {hasSelection && <option value="replace">선택 영역 교체 (Replace)</option>}
                  <option value="insertBelow">선택 영역 아래에 삽입 (Insert Below)</option>
                  <option value="fullReplace">전체 문서 교체 (Full Replace)</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-300 font-mono max-h-24 overflow-y-auto bg-[#18181b] p-2.5 rounded border border-[#3f3f46] whitespace-pre-wrap select-text leading-relaxed">
              {hasSelection
                ? selectedText
                : fullContent.length > 300
                ? `${fullContent.substring(0, 300)}...`
                : fullContent || '(문서 내용이 비어 있습니다)'}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-xs text-slate-400 font-normal mb-2 block">
              빠른 프리셋 (Quick Presets)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {VIBE_QUICK_PRESETS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setPrompt(item.prompt);
                    setApplyMode(hasSelection ? item.target : 'fullReplace');
                    handleExecuteVibe(item.prompt);
                  }}
                  className="p-2.5 bg-[#27272a]/60 hover:bg-[#27272a] border border-[#3f3f46] hover:border-[#38bdf8] rounded text-left transition group shadow-sm flex flex-col gap-1 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-xs font-normal text-slate-200 group-hover:text-[#38bdf8] truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[0.625rem] text-slate-400 line-clamp-2 leading-tight">
                    {item.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Prompt Input Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
                <Zap className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>자연어 프롬프트 지시</span>
              </label>
              <span className="text-[0.625rem] text-slate-500 font-mono">
                Enter: 즉시 실행
              </span>
            </div>

            <div className="relative">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleExecuteVibe();
                  }
                }}
                placeholder="예: '여기에 있는 데이터를 분석해서 2030년까지 연평균 성장률과 함께 스프레드시트 표로 확장해 줘'"
                rows={3}
                className="w-full bg-[#18181b] border border-[#3f3f46] focus:border-[#38bdf8] rounded p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none leading-relaxed transition font-sans"
              />

              <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isLoading || !prompt.trim()}
                  onClick={() => handleExecuteVibe()}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    isLoading || !prompt.trim()
                      ? 'bg-[#27272a] text-slate-500 cursor-not-allowed border border-[#3f3f46]'
                      : 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
                      <span>AI 생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>실행</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 3. GENERATED RESULT & DIFF PREVIEW */}
          {generatedResult && (
            <div className="p-4 bg-[#18181b] border border-[#3f3f46] rounded space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-400">
                    <CheckCheck className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-normal text-emerald-300">생성된 AI 결과</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedResult);
                      onToast('클립보드에 복사되었습니다.', 'success');
                    }}
                    className="p-1 px-2 rounded bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 text-xs font-mono flex items-center gap-1 border border-[#3f3f46] cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>복사</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-3 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-xs font-medium flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>문서에 반영</span>
                  </button>
                </div>
              </div>

              {/* Result Preview Box */}
              <div className="max-h-60 overflow-y-auto p-3 bg-[#27272a]/60 rounded border border-[#3f3f46] text-xs font-mono text-slate-200 whitespace-pre-wrap select-text leading-relaxed">
                {generatedResult}
              </div>
            </div>
          )}

        </div>

        {/* 4. MODAL FOOTER */}
        <div className="px-6 py-3 bg-[#18181b] border-t border-[#27272a] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>단축키: Alt + V</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-[#27272a] transition cursor-pointer"
            >
              닫기 (Esc)
            </button>
            {generatedResult && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>문서에 반영</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

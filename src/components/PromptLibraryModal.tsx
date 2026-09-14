import React, { useState, useMemo } from 'react';
import {
  Settings,
  X,
  Plus,
  Edit3,
  Trash2,
  Play,
  Search,
  Check,
  Sparkles,
  FileText,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { PromptTemplate } from './PreferencesModal';

export const DEFAULT_SYSTEM_PROMPTS: PromptTemplate[] = [
  {
    id: 'system-1',
    title: 'Code Review (보안 및 성능)',
    description: '코드의 잠재적 버그, 가독성, 성능 병목, 보안 취약점을 점검합니다.',
    body: '제시된 코드의 가독성, 시간/공간 복잡도, 예외 처리, 타입 안정성, 보안 취약점을 꼼꼼히 점검하고 구체적인 개선 코드와 이유를 단계별로 설명해 주세요.\n\n[코드]:\n'
  },
  {
    id: 'system-2',
    title: 'Unit Test Generator',
    description: '주어진 코드의 엣지 케이스 및 핵심 기능 검증을 위한 테스트 코드를 작성합니다.',
    body: '다음 코드에 대한 종합적인 단위 테스트(Unit Test) 스위트를 작성해 주세요. 정상 동작 케이스뿐만 아니라 경계값(Edge cases), 에러 핸들링, 비동기 처리에 대한 테스트를 포함해 주세요.\n\n[코드]:\n'
  },
  {
    id: 'system-3',
    title: 'Markdown Refactor',
    description: '긴 글이나 대화 내용을 명확한 계층형 마크다운으로 깔끔하게 정리합니다.',
    body: '다음 내용을 분석하여 핵심 요약, 주요 항목별 상세 설명, 결론 및 실행 과제(To-Do)로 구조화된 마크다운 문서로 변환해 주세요.\n\n[내용]:\n'
  },
  {
    id: 'system-4',
    title: 'SSOT 기획서 & 요구사항 명세서 (PRD)',
    description: '기능 구현을 위한 체계적인 프로덕트 요구사항 정의서(PRD) 템플릿입니다.',
    body: '다음 기능 아이디어에 대한 PRD 문서를 작성해 주세요.\n1. 배경 및 문제 정의\n2. 핵심 목표 및 비목표(Non-goals)\n3. 사용자 스토리 및 유저 플로우\n4. 기술적 요구사항 및 데이터 모델\n5. 성공 지표(KPI)\n\n[아이디어]:\n'
  }
];

export interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts?: PromptTemplate[];
  onSavePrompts?: (prompts: PromptTemplate[]) => void;
  onApplyPrompt: (promptBody: string) => void;
  onToast?: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  isOpen,
  onClose,
  prompts,
  onSavePrompts,
  onApplyPrompt,
  onToast = () => {}
}) => {
  const [internalPrompts, setInternalPrompts] = useState<PromptTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('aipodium_custom_prompts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SYSTEM_PROMPTS;
  });

  const activePrompts = prompts && prompts.length > 0 ? prompts : internalPrompts;

  const persistPrompts = (updated: PromptTemplate[]) => {
    setInternalPrompts(updated);
    try {
      localStorage.setItem('aipodium_custom_prompts', JSON.stringify(updated));
    } catch {}
    if (onSavePrompts) {
      onSavePrompts(updated);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [promptForm, setPromptForm] = useState({ title: '', description: '', body: '' });

  // Filter prompts by search query
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return activePrompts;
    const q = searchQuery.toLowerCase();
    return activePrompts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.body.toLowerCase().includes(q)
    );
  }, [activePrompts, searchQuery]);

  const handleSaveForm = () => {
    if (!promptForm.title.trim() || !promptForm.body.trim()) {
      onToast('제목과 프롬프트 본문을 모두 입력해주세요.', 'warn');
      return;
    }

    if (isAddingPrompt) {
      const newPrompt: PromptTemplate = {
        id: `prompt-${Date.now()}`,
        title: promptForm.title.trim(),
        description: promptForm.description.trim(),
        body: promptForm.body.trim()
      };
      const updated = [...activePrompts, newPrompt];
      persistPrompts(updated);
      onToast(`✓ 새 프롬프트 "${newPrompt.title}"이(가) 추가되었습니다.`, 'success');
    } else if (editingPrompt) {
      const updated = activePrompts.map((p) =>
        p.id === editingPrompt.id
          ? {
              ...p,
              title: promptForm.title.trim(),
              description: promptForm.description.trim(),
              body: promptForm.body.trim()
            }
          : p
      );
      persistPrompts(updated);
      onToast(`✓ 프롬프트 "${promptForm.title}"이(가) 수정되었습니다.`, 'success');
    }

    setEditingPrompt(null);
    setIsAddingPrompt(false);
    setPromptForm({ title: '', description: '', body: '' });
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`"${title}" 프롬프트를 삭제하시겠습니까?`)) {
      const updated = activePrompts.filter((p) => p.id !== id);
      persistPrompts(updated);
      onToast(`프롬프트가 삭제되었습니다.`, 'info');
    }
  };

  const startAdd = () => {
    setIsAddingPrompt(true);
    setEditingPrompt(null);
    setPromptForm({ title: '', description: '', body: '' });
  };

  const startEdit = (p: PromptTemplate) => {
    setEditingPrompt(p);
    setIsAddingPrompt(false);
    setPromptForm({
      title: p.title,
      description: p.description || '',
      body: p.body
    });
  };

  const handleCopyBody = (body: string) => {
    navigator.clipboard.writeText(body);
    onToast('프롬프트 본문이 클립보드에 복사되었습니다.', 'info');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="prompt-library-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs text-xs"
        onClick={onClose}
      >
        <motion.div
          id="prompt-library-modal-container"
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.15 }}
          className="bg-[#1e202b] border border-[#2e3142] rounded-xl shadow-2xl w-full max-w-xl h-[520px] max-h-[88vh] flex flex-col overflow-hidden text-slate-200 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#2e3142] bg-[#1e202b] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-xs text-slate-200 tracking-wide flex items-center gap-1.5">
                    <span>프롬프트 관리</span>
                  </h2>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#121318] text-[#818cf8] border border-[#2e3142]">
                    {activePrompts.length}개 저장됨
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  신규 등록, 수정, 삭제하고 상단 [편집] &gt; [프롬프트 주입] 서브메뉴에서 즉시 주입하세요.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#282a38] rounded-md transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Action Bar */}
          <div className="px-4 py-2.5 border-b border-[#2e3142] bg-[#121318] flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목, 설명, 프롬프트 내용 검색..."
                className="w-full bg-[#16171e] border border-[#2e3142] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#6366f1] outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!(isAddingPrompt || editingPrompt) && (
              <button
                type="button"
                onClick={startAdd}
                className="px-3 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 프롬프트 추가</span>
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-[#121318]">
            {isAddingPrompt || editingPrompt ? (
              /* Add/Edit Form */
              <div className="bg-[#1e202b] border border-[#2e3142] rounded-lg p-4 space-y-3 animate-in fade-in duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-[#2e3142]">
                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAddingPrompt ? '새 프롬프트 템플릿 작성' : '프롬프트 템플릿 수정'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPrompt(false);
                      setEditingPrompt(null);
                    }}
                    className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-[#282a38] transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">프롬프트 제목 *</label>
                  <input
                    type="text"
                    value={promptForm.title}
                    onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })}
                    placeholder="예: 코드 검토 (보안 및 성능)"
                    className="w-full bg-[#121318] border border-[#2e3142] rounded-md px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-[#6366f1] transition"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">간단한 설명 / 서브 레이블</label>
                  <input
                    type="text"
                    value={promptForm.description}
                    onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                    placeholder="예: 보안 취약점 점검 및 최적화 리팩토링 제안"
                    className="w-full bg-[#121318] border border-[#2e3142] rounded-md px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-[#6366f1] transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">프롬프트 본문 (삽입될 지시문 내용) *</label>
                  <textarea
                    rows={6}
                    value={promptForm.body}
                    onChange={(e) => setPromptForm({ ...promptForm, body: e.target.value })}
                    placeholder="에디터 또는 AI 채팅창에 원터치로 삽입할 프롬프트 상세 내용을 입력하세요..."
                    className="w-full bg-[#121318] border border-[#2e3142] rounded-md p-3 text-xs font-mono text-slate-200 outline-none focus:border-[#6366f1] resize-none leading-relaxed transition"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2e3142]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPrompt(false);
                      setEditingPrompt(null);
                    }}
                    className="px-3 py-1.5 bg-[#282a38] hover:bg-[#323648] text-slate-300 rounded-md text-xs transition cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveForm}
                    disabled={!promptForm.title.trim() || !promptForm.body.trim()}
                    className="px-4 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>저장 완료</span>
                  </button>
                </div>
              </div>
            ) : filteredPrompts.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16 text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                <p className="text-xs font-medium text-slate-400">
                  {searchQuery ? '검색 결과와 일치하는 프롬프트가 없습니다.' : '등록된 프롬프트 템플릿이 없습니다.'}
                </p>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-indigo-400 hover:underline text-xs cursor-pointer"
                  >
                    검색어 지우기
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startAdd}
                    className="mt-3 text-[#818cf8] hover:underline text-xs cursor-pointer inline-flex items-center gap-1.5 bg-[#1e202b] px-3 py-1.5 rounded-md border border-[#2e3142]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>첫 번째 템플릿 만들기</span>
                  </button>
                )}
              </div>
            ) : (
              /* List of Prompts */
              <div className="space-y-2">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-3 bg-[#1e202b] border border-[#2e3142] rounded-md hover:border-[#6366f1]/50 transition flex items-start justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200">{prompt.title}</span>
                        {prompt.description && (
                          <span className="text-[10px] text-slate-400 bg-[#121318] px-2 py-0.5 rounded-sm border border-[#2e3142] truncate max-w-[200px]">
                            {prompt.description}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1.5 line-clamp-2 bg-[#121318] p-2 rounded-md border border-[#2e3142]/60 select-all">
                        {prompt.body}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPrompt(prompt.body);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-md bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-xs"
                        title="이 프롬프트를 즉시 주입하고 닫기"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>주입</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyBody(prompt.body)}
                        className="p-1.5 rounded-md bg-[#282a38] hover:bg-[#323648] text-slate-300 hover:text-white transition cursor-pointer"
                        title="프롬프트 복사"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(prompt)}
                        className="p-1.5 rounded-md hover:bg-[#282a38] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="수정"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(prompt.id, prompt.title)}
                        className="p-1.5 rounded-md hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#2e3142] bg-[#121318] flex items-center justify-between shrink-0 text-slate-400 text-[11px]">
            <span>💡 상단 [편집] &gt; [프롬프트 주입] 서브메뉴에서 1클릭으로 바로 주입할 수 있습니다.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-md bg-[#282a38] hover:bg-[#323648] text-slate-200 transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

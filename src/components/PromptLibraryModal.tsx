import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Edit3,
  Trash2,
  Play,
  Search,
  Check,
  FileText,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { PromptTemplate } from './PreferencesModal';

export const DEFAULT_SYSTEM_PROMPTS: PromptTemplate[] = [
  {
    id: 'system-1',
    title: '코드 검토 및 성능 분석',
    description: '코드의 잠재적 오류, 가독성, 성능 병목, 보안 취약점을 종합 점검합니다.',
    body: '제시된 코드의 가독성, 시간 및 공간 복잡도, 예외 처리, 타입 안정성, 보안 취약점을 꼼꼼히 점검하고 구체적인 개선 코드와 이유를 단계별로 설명해 주세요.\n\n[코드]:\n'
  },
  {
    id: 'system-2',
    title: '단위 테스트 생성기',
    description: '주어진 코드의 경계 조건 및 핵심 기능 검증을 위한 테스트 코드를 작성합니다.',
    body: '다음 코드에 대한 종합적인 단위 테스트 스위트를 작성해 주세요. 정상 동작 케이스뿐만 아니라 경계값, 예외 처리, 비동기 처리에 대한 테스트를 포함해 주세요.\n\n[코드]:\n'
  },
  {
    id: 'system-3',
    title: '마크다운 구조화 및 정제',
    description: '긴 글이나 대화 내용을 명확한 계층형 마크다운 양식으로 정돈합니다.',
    body: '다음 내용을 분석하여 핵심 요약, 주요 항목별 상세 설명, 결론 및 실행 과제로 구조화된 마크다운 문서로 변환해 주세요.\n\n[내용]:\n'
  },
  {
    id: 'system-4',
    title: '기준 기획서 및 요구사항 명세서',
    description: '기능 구현을 위한 체계적인 프로덕트 요구사항 명세서 템플릿입니다.',
    body: '다음 기능 아이디어에 대한 기획 명세서 문서를 작성해 주세요.\n1. 배경 및 문제 정의\n2. 핵심 목표 및 제외 항목\n3. 사용자 시나리오 및 흐름\n4. 기술적 요구사항 및 데이터 구조\n5. 성공 지표\n\n[아이디어]:\n'
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
      onToast(`새 프롬프트 "${newPrompt.title}"이(가) 추가되었습니다.`, 'success');
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
      onToast(`프롬프트 "${promptForm.title}"이(가) 수정되었습니다.`, 'success');
    }

    setEditingPrompt(null);
    setIsAddingPrompt(false);
    setPromptForm({ title: '', description: '', body: '' });
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`"${title}" 프롬프트를 삭제하시겠습니까?`)) {
      const updated = activePrompts.filter((p) => p.id !== id);
      persistPrompts(updated);
      onToast('프롬프트가 삭제되었습니다.', 'info');
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
          className="bg-[#121214] border border-[#222226] rounded-xl shadow-2xl w-full max-w-xl h-[520px] max-h-[88vh] flex flex-col overflow-hidden text-zinc-200 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#222226] bg-[#121214] flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-zinc-100">프롬프트 관리</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-[#222226]">
                  {activePrompts.length}개 저장됨
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                자주 사용하는 지시문 템플릿을 등록하고 에디터에 즉시 적용하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Action Bar */}
          <div className="px-6 py-2.5 border-b border-[#222226] bg-[#09090b] flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목, 설명, 프롬프트 내용 검색..."
                className="w-full bg-[#0c0c0e] border border-[#222226] rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-[#6366f1] outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!(isAddingPrompt || editingPrompt) && (
              <button
                type="button"
                onClick={startAdd}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 프롬프트 추가</span>
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-[#09090b] custom-scrollbar">
            {isAddingPrompt || editingPrompt ? (
              /* Add/Edit Form */
              <div className="p-6 bg-[#121214] border-b border-[#222226] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
                  <span className="text-xs font-medium text-zinc-200">
                    {isAddingPrompt ? '새 프롬프트 템플릿 작성' : '프롬프트 템플릿 수정'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPrompt(false);
                      setEditingPrompt(null);
                    }}
                    className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-medium">프롬프트 제목</label>
                  <input
                    type="text"
                    value={promptForm.title}
                    onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })}
                    placeholder="예: 코드 검토 및 성능 분석"
                    className="w-full bg-[#09090b] border border-[#222226] rounded-md px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#6366f1] transition-colors"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-medium">설명</label>
                  <input
                    type="text"
                    value={promptForm.description}
                    onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                    placeholder="예: 보안 취약점 점검 및 최적화 리팩토링 제안"
                    className="w-full bg-[#09090b] border border-[#222226] rounded-md px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#6366f1] transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-medium">프롬프트 본문</label>
                  <textarea
                    rows={6}
                    value={promptForm.body}
                    onChange={(e) => setPromptForm({ ...promptForm, body: e.target.value })}
                    placeholder="에디터 또는 AI 대화창에 삽입할 프롬프트 상세 내용을 입력하세요..."
                    className="w-full bg-[#09090b] border border-[#222226] rounded-md p-3 text-xs font-mono text-zinc-200 outline-none focus:border-[#6366f1] resize-none leading-relaxed transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#222226]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPrompt(false);
                      setEditingPrompt(null);
                    }}
                    className="px-3.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 rounded-md text-xs transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveForm}
                    disabled={!promptForm.title.trim() || !promptForm.body.trim()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </button>
                </div>
              </div>
            ) : filteredPrompts.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16 text-zinc-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-60" />
                <p className="text-xs font-medium text-zinc-400">
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
                    className="mt-3 text-zinc-200 hover:bg-white/[0.08] text-xs cursor-pointer inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-md border border-[#222226] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>첫 번째 템플릿 만들기</span>
                  </button>
                )}
              </div>
            ) : (
              /* Flat List of Prompts */
              <div className="divide-y divide-[#222226]">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="border-b border-[#222226] py-3.5 px-6 hover:bg-white/[0.02] flex items-start justify-between gap-3 group transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-200">{prompt.title}</span>
                        {prompt.description && (
                          <span className="text-[11px] text-zinc-400 truncate max-w-[280px]">
                            {prompt.description}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 font-mono mt-1 leading-relaxed">
                        {prompt.body}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPrompt(prompt.body);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-xs text-zinc-200 transition-colors cursor-pointer flex items-center gap-1"
                        title="에디터에 프롬프트 삽입"
                      >
                        <Play className="w-3 h-3 fill-current text-zinc-400" />
                        <span>주입</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyBody(prompt.body)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="프롬프트 복사"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(prompt)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="수정"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(prompt.id, prompt.title)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
          <div className="px-6 py-3 border-t border-[#222226] bg-[#121214] flex items-center justify-between shrink-0 text-zinc-400 text-xs">
            <span>상단 메뉴의 프롬프트 주입 기능으로 빠르게 삽입할 수 있습니다.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs transition-colors cursor-pointer font-medium"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

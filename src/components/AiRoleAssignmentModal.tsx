import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bot,
  Wand2,
  Layers,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Check,
  RotateCcw,
  Sliders,
  Cpu,
  ExternalLink
} from 'lucide-react';
import type { AiRoleModels } from '../types';
import { DEFAULT_AI_ROLE_MODELS } from '../types';

export interface ModelOptionItem {
  id: string;
  name: string;
  desc?: string;
  group: 'cloud' | 'local';
}

export interface AiRoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleModels: AiRoleModels;
  onSaveRoleModels: (newRoleModels: AiRoleModels) => void;
  availableModels: ModelOptionItem[];
  onToast: (message: string, type?: 'success' | 'warn' | 'info' | 'error') => void;
  onOpenAiEngineSettings?: () => void;
}

interface RoleRowMeta {
  key: keyof AiRoleModels;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_METAS: RoleRowMeta[] = [
  {
    key: 'chat',
    title: '대화 및 질의',
    shortDesc: '좌측 패널 대화 및 코드 상담',
    icon: Bot
  },
  {
    key: 'ghostWriter',
    title: '인라인 보조',
    shortDesc: '에디터 실시간 문장 및 코드 자동 완성',
    icon: Wand2
  },
  {
    key: 'architect',
    title: '기획 및 종합',
    shortDesc: '통합 마크다운 문서 자동 생성',
    icon: Layers
  },
  {
    key: 'critic',
    title: '품질 검수 및 감사',
    shortDesc: '문서 모순점 및 누락 항목 정밀 검사',
    icon: ShieldCheck
  }
];

export const AiRoleAssignmentModal: React.FC<AiRoleAssignmentModalProps> = ({
  isOpen,
  onClose,
  roleModels,
  onSaveRoleModels,
  availableModels,
  onToast,
  onOpenAiEngineSettings
}) => {
  const [localRoles, setLocalRoles] = useState<AiRoleModels>(() => ({
    ...DEFAULT_AI_ROLE_MODELS,
    ...roleModels
  }));

  // Sync state whenever modal opens or external prop updates
  useEffect(() => {
    if (isOpen) {
      setLocalRoles({
        ...DEFAULT_AI_ROLE_MODELS,
        ...roleModels
      });
    }
  }, [isOpen, roleModels]);

  // Clean model option list ensuring selected models always exist
  const completeModelList = useMemo(() => {
    const list = [...availableModels];
    const ensureModel = (id: string) => {
      if (id && !list.some((m) => m.id === id)) {
        list.push({
          id,
          name: id,
          desc: '',
          group: 'cloud'
        });
      }
    };
    ensureModel(localRoles.chat);
    ensureModel(localRoles.ghostWriter);
    ensureModel(localRoles.architect);
    ensureModel(localRoles.critic);
    return list;
  }, [availableModels, localRoles]);

  if (!isOpen) return null;

  const handleApplyPreset = (type: 'balanced' | 'deep' | 'local') => {
    if (type === 'balanced') {
      setLocalRoles({
        chat: 'gemini-3.8-flash',
        ghostWriter: 'gemini-3.1-flash-lite',
        architect: 'gemini-3.1-pro-preview',
        critic: 'gemini-3.1-pro-preview'
      });
      onToast('초고속 균형형 프리셋이 적용되었습니다.', 'info');
    } else if (type === 'deep') {
      setLocalRoles({
        chat: 'gemini-3.1-pro-preview',
        ghostWriter: 'gemini-3.8-flash',
        architect: 'gemini-3.1-pro-preview',
        critic: 'deepseek-r1'
      });
      onToast('심층 추론 특화형 프리셋이 적용되었습니다.', 'info');
    } else if (type === 'local') {
      const localModels = availableModels.filter((m) => m.group === 'local');
      if (localModels.length === 0) {
        onToast('감지된 로컬 Ollama 모델이 없습니다. 엔진 설정에서 연결을 확인하세요.', 'warn');
        return;
      }
      const primaryLocal = localModels[0]?.id || 'llama-3.3-70b';
      const coderLocal = localModels.find((m) => /coder|code|qwen/i.test(m.id))?.id || primaryLocal;
      const liteLocal = localModels.find((m) => /lite|mini|8b|7b|small/i.test(m.id))?.id || primaryLocal;
      setLocalRoles({
        chat: primaryLocal,
        ghostWriter: liteLocal,
        architect: coderLocal,
        critic: primaryLocal
      });
      onToast('로컬 모델 독립형 프리셋이 적용되었습니다.', 'info');
    }
  };

  const handleSave = () => {
    onSaveRoleModels(localRoles);
    onToast('역할별 AI 모델 지정이 성공적으로 저장되었습니다.', 'success');
    onClose();
  };

  const handleReset = () => {
    setLocalRoles(DEFAULT_AI_ROLE_MODELS);
    onToast('기본 권장 모델 배치로 초기화되었습니다.', 'info');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#1e202b] border border-[#2e3142] rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e3142] bg-[#16171e] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-[#6366f1]">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-medium text-slate-100">역할별 AI 모델 지정</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-normal">
                  작업별 최적화
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                대화, 인라인 보조, 기획, 검수 등 작업 성격에 맞게 AI 모델을 개별 배치합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAiEngineSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiEngineSettings();
                }}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#121318] hover:bg-[#282a38] border border-[#2e3142] rounded-md transition cursor-pointer font-normal"
                title="공급자 API 키 및 로컬 서버 연결 관리"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>엔진 공급자 관리</span>
                <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#282a38] rounded-md transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact Preset Strip */}
        <div className="px-5 py-2 bg-[#121318] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="text-[11px] font-normal text-slate-300">권장 프리셋:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPreset('balanced')}
              className="px-2.5 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-[#1e202b] hover:bg-[#282a38] border border-[#2e3142] transition cursor-pointer font-normal"
            >
              초고속 균형형
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('deep')}
              className="px-2.5 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-[#1e202b] hover:bg-[#282a38] border border-[#2e3142] transition cursor-pointer font-normal"
            >
              심층 추론 특화형
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('local')}
              className="px-2.5 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-[#1e202b] hover:bg-[#282a38] border border-[#2e3142] transition cursor-pointer font-normal"
            >
              로컬 독립형
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#282a38] rounded transition cursor-pointer"
              title="기본 설정으로 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Content Area: VS Code / JetBrains Compact Flat List */}
        <div className="flex-1 overflow-y-auto px-5 py-1 bg-[#1e202b] min-h-0">
          <div className="divide-y divide-white/[0.06]">
            {ROLE_METAS.map((meta) => {
              const Icon = meta.icon;
              const currentModelId = localRoles[meta.key];

              return (
                <div
                  key={meta.key}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 transition"
                >
                  {/* 좌측: 아이콘 + 역할명 + 1줄 설명 */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-md bg-[#16171e] border border-[#2e3142] flex items-center justify-center text-indigo-400 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-baseline gap-2.5 min-w-0">
                      <span className="text-xs font-medium text-slate-200 shrink-0">{meta.title}</span>
                      <span className="text-[11px] text-slate-400 truncate font-normal">{meta.shortDesc}</span>
                    </div>
                  </div>

                  {/* 우측: 드롭다운 */}
                  <div className="w-full sm:w-60 shrink-0">
                    <div className="relative">
                      <select
                        value={currentModelId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalRoles((prev) => ({ ...prev, [meta.key]: val }));
                        }}
                        className="w-full bg-[#121318] text-xs text-slate-200 border border-[#2e3142] hover:border-[#6366f1] focus:border-[#6366f1] rounded-md px-2.5 py-1.5 outline-none appearance-none cursor-pointer pr-8 font-sans transition font-normal truncate"
                      >
                        <optgroup label="클라우드 모델" className="bg-[#121318] text-indigo-400 font-medium">
                          {completeModelList
                            .filter((m) => m.group === 'cloud')
                            .map((m) => {
                              const cleanName = m.name.replace(/\s*\([^)]*\)/g, '').trim();
                              return (
                                <option key={m.id} value={m.id} className="bg-[#121318] text-slate-200 font-normal py-1">
                                  {cleanName}
                                </option>
                              );
                            })}
                        </optgroup>
                        {completeModelList.some((m) => m.group === 'local') && (
                          <optgroup label="로컬 모델" className="bg-[#121318] text-sky-400 font-medium">
                            {completeModelList
                              .filter((m) => m.group === 'local')
                              .map((m) => {
                                const cleanName = m.name.replace(/\s*\([^)]*\)/g, '').trim();
                                return (
                                  <option key={m.id} value={m.id} className="bg-[#121318] text-slate-200 font-normal py-1">
                                    {cleanName}
                                  </option>
                                );
                              })}
                          </optgroup>
                        )}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#2e3142] bg-[#16171e] shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block font-normal">
            지정된 모델은 각 기능 실행 시 자동으로 호출됩니다.
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs text-slate-300 hover:text-white hover:bg-[#282a38] border border-[#2e3142] transition cursor-pointer font-normal"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-[#6366f1] hover:bg-[#5558e6] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>역할 모델 저장</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

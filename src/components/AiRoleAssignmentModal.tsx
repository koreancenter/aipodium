import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';
import type { AiRoleModels } from '../types';
import { DEFAULT_AI_ROLE_MODELS } from '../types';
import { getModelDisplayName as getConfigDisplayName } from '../config/models.config';

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
}

const ROLE_METAS: RoleRowMeta[] = [
  {
    key: 'chat',
    title: '대화 및 질의',
    shortDesc: '좌측 패널 대화 및 코드 상담'
  },
  {
    key: 'ghostWriter',
    title: '인라인 보조',
    shortDesc: '에디터 실시간 문장 및 코드 자동 완성'
  },
  {
    key: 'architect',
    title: '기획 및 종합',
    shortDesc: '통합 마크다운 문서 자동 생성'
  },
  {
    key: 'ssot',
    title: 'SSOT 생성',
    shortDesc: 'SSOT 마스터 문서 생성 및 종합'
  },
  {
    key: 'critic',
    title: '품질 검수 및 감사',
    shortDesc: '문서 모순점 및 누락 항목 정밀 검사'
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

  const [openDropdownKey, setOpenDropdownKey] = useState<keyof AiRoleModels | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state whenever modal opens or external prop updates
  useEffect(() => {
    if (isOpen) {
      setLocalRoles({
        ...DEFAULT_AI_ROLE_MODELS,
        ...roleModels
      });
      setOpenDropdownKey(null);
    }
  }, [isOpen, roleModels]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownKey(null);
      }
    };
    if (openDropdownKey) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [openDropdownKey]);

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
    ensureModel(localRoles.ssot || DEFAULT_AI_ROLE_MODELS.ssot);
    ensureModel(localRoles.critic);
    return list;
  }, [availableModels, localRoles]);

  const getModelDisplayName = (id: string) => {
    const found = completeModelList.find((m) => m.id === id);
    if (!found) return getConfigDisplayName(id);
    return found.name.replace(/\s*\([^)]*\)/g, '').trim();
  };

  if (!isOpen) return null;

  const handleApplyPreset = (type: 'balanced' | 'deep' | 'local') => {
    if (type === 'balanced') {
      setLocalRoles({
        chat: 'gemini-3.8-flash',
        ghostWriter: 'gemini-3.1-flash-lite',
        architect: 'gemini-3.1-pro-preview',
        ssot: 'gemini-3.1-pro-preview',
        critic: 'gemini-3.1-pro-preview'
      });
      onToast('초고속 균형형 프리셋이 적용되었습니다.', 'info');
    } else if (type === 'deep') {
      setLocalRoles({
        chat: 'gemini-3.1-pro-preview',
        ghostWriter: 'gemini-3.8-flash',
        architect: 'gemini-3.1-pro-preview',
        ssot: 'gemini-3.1-pro-preview',
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
        ssot: coderLocal,
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

  const cloudModels = completeModelList.filter((m) => m.group === 'cloud');
  const localModels = completeModelList.filter((m) => m.group === 'local');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#121214] border border-[#222226] rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#222226] bg-[#0c0c0e] shrink-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-medium text-slate-100">역할별 AI 모델 지정</h2>
            <HelpTooltip
              side="bottom"
              align="left"
              content="대화, 인라인 보조, 기획, 검수 등 작업 성격에 맞게 AI 모델을 개별 배치합니다."
            />
          </div>

          <div className="flex items-center gap-2">
            {onOpenAiEngineSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiEngineSettings();
                }}
                className="hidden sm:inline-flex items-center px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#09090b] hover:bg-[#18181b] border border-[#222226] rounded-md transition cursor-pointer font-normal"
                title="공급자 API 키 및 로컬 서버 연결 관리"
              >
                엔진 공급자 관리
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#18181b] rounded-md transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact Preset Strip */}
        <div className="px-5 py-2 bg-[#09090b] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0 flex-wrap text-xs">
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-[11px] font-normal text-slate-300">권장 프리셋:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPreset('balanced')}
              className="px-2.5 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] border border-[#222226] transition cursor-pointer font-normal"
            >
              초고속 균형형
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('deep')}
              className="px-2.5 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] border border-[#222226] transition cursor-pointer font-normal"
            >
              심층 추론 특화형
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('local')}
              className="px-2.5 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] border border-[#222226] transition cursor-pointer font-normal"
            >
              로컬 독립형
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-[#18181b] rounded transition cursor-pointer font-normal"
              title="기본 설정으로 초기화"
            >
              초기화
            </button>
          </div>
        </div>

        {/* Main Content Area: Compact IDE Row List with Obsidian Gray Custom Dropdown */}
        <div
          ref={dropdownRef}
          className="flex-1 overflow-y-auto px-5 py-3 bg-[#121214] min-h-0 space-y-2 pb-16"
        >
          {ROLE_METAS.map((meta, index) => {
            const currentModelId = localRoles[meta.key] || DEFAULT_AI_ROLE_MODELS[meta.key];
            const isDropdownOpen = openDropdownKey === meta.key;
            // For the last two items, pop upward if needed so it stays cleanly within view
            const openUpward = index >= 3;

            return (
              <div
                key={meta.key}
                className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition"
              >
                {/* 좌측: 역할명 + 1줄 설명 */}
                <div className="flex items-baseline gap-3 min-w-0 flex-1">
                  <span className="text-xs font-medium text-slate-200 shrink-0 w-28 text-left">{meta.title}</span>
                  <span className="text-[11px] text-slate-400 truncate font-normal">{meta.shortDesc}</span>
                </div>

                {/* 우측: 디자인 헌법 호버 하이라이트가 적용된 커스텀 드롭다운 */}
                <div className="w-full sm:w-60 shrink-0 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdownKey(isDropdownOpen ? null : meta.key);
                    }}
                    className={`w-full h-8 bg-[#09090b] text-xs text-slate-200 border rounded-md px-2.5 flex items-center justify-between transition cursor-pointer text-left focus:outline-none ${
                      isDropdownOpen
                        ? 'border-[#6366f1] bg-[#18181b]'
                        : 'border-[#222226] hover:border-[#333338] hover:bg-[#18181b]'
                    }`}
                  >
                    <span className="truncate font-sans leading-none">
                      {getModelDisplayName(currentModelId)}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform duration-150 ${
                        isDropdownOpen ? 'rotate-180 text-indigo-400' : ''
                      }`}
                    />
                  </button>

                  {/* 드롭다운 옵션 레이어: 회색(#18181b) 마우스 호버 하이라이트 */}
                  {isDropdownOpen && (
                    <div
                      className={`absolute right-0 ${
                        openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                      } w-full bg-[#121214] border border-[#222226] rounded-md shadow-2xl p-1 text-xs text-slate-200 z-50 max-h-56 overflow-y-auto`}
                    >
                      {/* 클라우드 모델 섹션 */}
                      <div className="px-2 py-1 text-[10px] font-medium text-slate-400">
                        클라우드 모델
                      </div>
                      <div className="space-y-0.5">
                        {cloudModels.map((m) => {
                          const cleanName = m.name.replace(/\s*\([^)]*\)/g, '').trim();
                          const isSelected = m.id === currentModelId;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setLocalRoles((prev) => ({ ...prev, [meta.key]: m.id }));
                                setOpenDropdownKey(null);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#18181b] text-indigo-300 font-medium'
                                  : 'text-slate-300 hover:bg-[#18181b] hover:text-slate-100'
                              }`}
                            >
                              <span className="truncate">{cleanName}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* 로컬 모델 섹션 */}
                      {localModels.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-[#222226]">
                          <div className="px-2 py-1 text-[10px] font-medium text-slate-400">
                            로컬 모델
                          </div>
                          <div className="space-y-0.5">
                            {localModels.map((m) => {
                              const cleanName = m.name.replace(/\s*\([^)]*\)/g, '').trim();
                              const isSelected = m.id === currentModelId;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setLocalRoles((prev) => ({ ...prev, [meta.key]: m.id }));
                                    setOpenDropdownKey(null);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition cursor-pointer flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-[#18181b] text-indigo-300 font-medium'
                                      : 'text-slate-300 hover:bg-[#18181b] hover:text-slate-100'
                                  }`}
                                >
                                  <span className="truncate">{cleanName}</span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1.5" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#222226] bg-[#0c0c0e] shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block font-normal">
            지정된 모델은 각 기능 실행 시 자동으로 호출됩니다.
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs text-slate-300 hover:text-white hover:bg-[#18181b] border border-[#222226] transition cursor-pointer font-normal"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-[#6366f1] hover:bg-[#5558e6] transition cursor-pointer shadow-xs"
            >
              역할 모델 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Zap, ChevronDown, Search, SlidersHorizontal, RefreshCw, Star, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchOllamaTags } from '../config/models.config';
import {
  appendModelIfMissing,
  getModelSelectorLabel,
  isModelSelected,
  normalizeModelId,
  normalizeModelIds,
} from '../utils/modelSelectorUtils';

export interface ModelOptionItem {
  id: string;
  name: string;
  desc?: string;
  group: 'cloud' | 'local';
}

export const DEFAULT_LOCAL_TAGS = ['qwen2.5:latest', 'llama3.2:latest', 'deepseek-r1:latest'];

export interface InlineModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  selectedMultiModels: string[];
  onSelectMultiModels: (models: string[]) => void;
  mode: 'single' | 'routing' | 'multi';
  onModeChange: (mode: 'single' | 'routing' | 'multi') => void;
  availableChatModels: ModelOptionItem[];
  onOpenRoleModal?: () => void;
  onShowToast?: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  onSelectProvider?: (provider: 'cloud' | 'local-pc' | 'local-server') => void;
  onRefreshOllama?: () => Promise<any> | void;
  localEndpoint?: string;
  onSelectDefaultLocalTag?: (tag: string) => void;
}

const DEFAULT_PINNED_MODELS = ['gemini-2.5-flash'];

export const InlineModelSelector: React.FC<InlineModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  selectedMultiModels,
  onSelectMultiModels,
  mode,
  onModeChange,
  availableChatModels,
  onOpenRoleModal,
  onShowToast,
  onSelectProvider,
  onRefreshOllama,
  localEndpoint = 'http://localhost:11434',
  onSelectDefaultLocalTag,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'cloud' | 'local'>('all');
  const [isRefetching, setIsRefetching] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Normalize legacy model IDs and keep single mode to exactly one selected model.
  useEffect(() => {
    const normalizedSelectedModel = normalizeModelId(selectedModel);
    if (normalizedSelectedModel !== selectedModel) {
      onSelectModel('gemini-2.5-flash');
    }

    const normalizedMultiModels = normalizeModelIds(selectedMultiModels);
    const nextMultiModels = mode === 'single'
      ? [normalizedSelectedModel]
      : normalizedMultiModels;
    if (
      nextMultiModels.length !== selectedMultiModels.length ||
      nextMultiModels.some((modelId, index) => modelId !== selectedMultiModels[index])
    ) {
      onSelectMultiModels(nextMultiModels);
    }
  }, [mode, selectedModel, selectedMultiModels, onSelectModel, onSelectMultiModels]);

  // Pinned favorites loaded from localStorage
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aipodium_pinned_models');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PINNED_MODELS;
  });

  const savePinnedIds = (ids: string[]) => {
    setPinnedIds(ids);
    try {
      localStorage.setItem('aipodium_pinned_models', JSON.stringify(ids));
    } catch {}
  };

  const handleTogglePin = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (pinnedIds.includes(modelId)) {
      updated = pinnedIds.filter((id) => id !== modelId);
      onShowToast?.('즐겨찾기에서 해제되었습니다.', 'info');
    } else {
      updated = [...pinnedIds, modelId];
      onShowToast?.('즐겨찾기에 고정되었습니다.', 'success');
    }
    savePinnedIds(updated);
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Model name resolver
  const getModelName = (id: string): string => {
    const cleanId = normalizeModelId(id);
    const found = availableChatModels.find((m) => m.id === cleanId || m.id === id);
    if (found) return found.name;
    if (cleanId === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
    if (cleanId === 'gemini-2.5-pro') return 'Gemini 2.5 Pro';
    if (cleanId === 'Qwen2.5-0.5B-Instruct') return 'Qwen2.5-0.5B-Instruct';
    return cleanId;
  };

  // Active models state calculation
  const activeModelIds = mode === 'single'
    ? [selectedModel]
    : selectedMultiModels.length > 0
      ? selectedMultiModels
      : [selectedModel];

  const primaryModelId = activeModelIds[0] || 'gemini-2.5-flash';
  const primaryModelName = getModelName(primaryModelId);

  const activeCount = activeModelIds.length;
  const hasMultipleModels = mode !== 'single' && activeCount >= 2;

  const chipLabel = getModelSelectorLabel(mode, activeCount, primaryModelName);

  // Check if a model is currently checked
  const isChecked = (modelId: string): boolean => {
    return isModelSelected(modelId, selectedModel, selectedMultiModels, mode);
  };

  // Toggle selection for a model
  const handleModelToggle = (modelId: string) => {
    const cleanId = normalizeModelId(modelId);
    const currentlyChecked = isChecked(cleanId);
    const currentSelection = normalizeModelIds(
      selectedMultiModels.length > 0 ? selectedMultiModels : [selectedModel]
    );

    if (currentlyChecked) {
      if (currentSelection.length <= 1) {
        onShowToast?.('최소 1개 이상의 모델을 선택해야 합니다.', 'warn');
        return;
      }
      const updated = currentSelection.filter((id) => id !== cleanId && id !== modelId);
      onSelectMultiModels(updated);
      onSelectModel(updated[0]);
    } else {
      const updated = Array.from(new Set([...currentSelection, cleanId]));
      onSelectMultiModels(updated);
      if (currentSelection.length === 0) onSelectModel(cleanId);
    }
  };

  const handleModeSelect = (nextMode: 'single' | 'multi' | 'routing') => {
    if (nextMode === 'single') {
      const nextModel = mode === 'single' ? selectedModel : activeModelIds[0];
      onSelectModel(nextModel);
      onSelectMultiModels([nextModel]);
    } else {
      onSelectMultiModels(Array.from(new Set(activeModelIds)));
    }
    onModeChange(nextMode);
  };

  // Filtered lists
  const query = searchQuery.trim().toLowerCase();
  const filterFn = (m: ModelOptionItem) => {
    if (!query) return true;
    return m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query);
  };

  const filteredModels = useMemo(
    () => availableChatModels.filter(filterFn),
    [availableChatModels, query]
  );

  // Pinned models at the top
  const pinnedList = useMemo(() => {
    return filteredModels.filter((m) => pinnedIds.includes(m.id));
  }, [filteredModels, pinnedIds]);

  // Remaining models below (excluding pinned to prevent duplicates)
  const remainingCloudList = useMemo(() => {
    return filteredModels.filter((m) => m.group === 'cloud' && !pinnedIds.includes(m.id));
  }, [filteredModels, pinnedIds]);

  const remainingLocalList = useMemo(() => {
    return filteredModels.filter((m) => m.group === 'local' && !pinnedIds.includes(m.id));
  }, [filteredModels, pinnedIds]);

  // Re-fetch tags from local Ollama endpoint (/api/tags or http://localhost:11434/api/tags)
  const handleRefetchTags = async () => {
    setIsRefetching(true);
    try {
      if (onRefreshOllama) {
        await onRefreshOllama();
      } else {
        const ep = (localEndpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
        const tags = await fetchOllamaTags(ep);
        if (tags && tags.length > 0) {
          onShowToast?.(`✓ 로컬 Ollama 모델 ${tags.length}개가 감지되었습니다.`, 'success');
        } else {
          onShowToast?.('⚠️ 감지된 로컬 모델이 없습니다. 기본 태그를 확인하세요.', 'info');
        }
      }
    } catch {
      onShowToast?.('태그 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsRefetching(false);
    }
  };

  // Switch to Local AI (Ollama) tab & trigger immediate tag re-fetch
  const handleSelectLocalAiTab = async () => {
    setSelectedTab('local');
    if (onSelectProvider) {
      onSelectProvider('local-pc');
    }
    await handleRefetchTags();
  };

  // Handle selecting one of the default fallback tags
  const handleSelectDefaultTag = (tag: string) => {
    if (onSelectDefaultLocalTag) {
      onSelectDefaultLocalTag(tag);
    }
    if (onSelectProvider) {
      onSelectProvider('local-pc');
    }
    if (mode === 'single') {
      onSelectModel(tag);
      onSelectMultiModels([tag]);
    } else {
      const currentSelection = selectedMultiModels.length > 0
        ? selectedMultiModels
        : [selectedModel];
      const { modelIds, added } = appendModelIfMissing(currentSelection, tag);
      if (!added) {
        onShowToast?.(`'${tag}' 모델은 이미 선택되어 있습니다.`, 'info');
        return;
      }
      onSelectMultiModels(modelIds);
    }
    onShowToast?.(`'${tag}' 로컬 모델이 선택되었습니다.`, 'success');
  };

  // Detected local Ollama models (excluding browser WebLLM)
  const detectedOllamaModels = useMemo(() => {
    return availableChatModels.filter(
      (m) => m.group === 'local' && m.id !== 'Qwen2.5-0.5B-Instruct'
    );
  }, [availableChatModels]);

  // Render fallback prompt with refresh button & default tags
  const renderFallbackLocalAiPrompt = () => (
    <div className="px-2 py-1.5 text-xs space-y-2">
      <span className="text-zinc-400 text-[11px] leading-snug">
        감지된 Ollama 모델이 없습니다.
      </span>

      <div className="pt-2 border-t border-white/[0.06]">
        <div className="text-[10px] text-zinc-400 mb-1.5 font-medium">
          사용 가능한 기본 태그:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_LOCAL_TAGS.map((tag) => {
            const checked = isChecked(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleSelectDefaultTag(tag)}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer flex items-center gap-1.5 ${
                  checked
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-medium'
                    : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                }`}
                title={`'${tag}' 모델 선택`}
              >
                <span>{tag}</span>
                {checked && <span className="text-[10px] text-indigo-400">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Render flat VS Code-style QuickPick row
  function renderModelRow(m: ModelOptionItem) {
    const checked = isChecked(m.id);
    const isPinned = pinnedIds.includes(m.id);

    return (
      <div
        key={`model-row-${m.id}`}
        onClick={() => {
          if (mode === 'single') {
            onSelectModel(m.id);
            onSelectMultiModels([m.id]);
          } else {
            handleModelToggle(m.id);
          }
        }}
        className={`model-row-item group w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-white/[0.06] rounded-md cursor-pointer text-xs select-none transition-colors ${
          checked ? 'bg-white/[0.06] text-white' : 'text-zinc-300 hover:text-zinc-100'
        }`}
      >
        {mode !== 'single' && (
          <span
            aria-hidden="true"
            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              checked ? 'border-indigo-400 bg-indigo-500/20' : 'border-zinc-600 group-hover:border-zinc-400'
            }`}
          >
            {checked && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
          </span>
        )}

        {/* Center: Model Name only (flat horizontal row, normal font) */}
        <div className={`flex items-center min-w-0 flex-1 ${mode === 'single' ? '' : 'mx-2.5'}`}>
          <span className={`truncate font-normal text-xs ${checked ? 'text-white' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
            {m.name}
          </span>
        </div>

        {mode === 'single' && checked && (
          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mr-2" />
        )}

        {/* Right: Favorite toggle */}
        <button
          type="button"
          onClick={(e) => handleTogglePin(m.id, e)}
          className={`p-0.5 hover:text-amber-400 transition cursor-pointer shrink-0 flex items-center justify-center ${
            isPinned
              ? 'text-amber-400'
              : 'text-zinc-500 hover:text-zinc-300 opacity-40 group-hover:opacity-100'
          }`}
          title={isPinned ? '즐겨찾기 고정 해제' : '즐겨찾기에 고정'}
        >
          <Star className="w-3.5 h-3.5 stroke-[1.5]" fill={isPinned ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-1 select-none">
      {/* 1. Compact Model Select Trigger Button (Flat IDE style, no nested box) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-6 max-w-[220px] px-1.5 rounded text-[0.6875rem] font-normal flex items-center gap-1.5 transition-colors cursor-pointer ${
          isOpen
            ? 'bg-white/[0.08] text-indigo-300'
            : hasMultipleModels
            ? 'text-indigo-300 hover:text-indigo-200 hover:bg-white/[0.06]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
        }`}
        title={`AI 모델 선택: ⚡ ${chipLabel} (클릭하여 열기)`}
      >
        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="truncate text-left font-normal">{chipLabel}</span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Popover UI (anchored bottom-up with fixed 380px height to prevent vertical jitter) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute bottom-full left-0 mb-2 z-50 w-[340px] h-[380px] flex flex-col bg-[#16161a] border border-white/10 rounded-xl shadow-2xl overflow-hidden text-xs font-normal"
          >
            {/* Header slot (Search input + Tab bar) */}
            <div className="shrink-0 p-2.5 border-b border-white/5 space-y-2 bg-[#09090b]/40">
              {/* Search / Filter Input */}
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="모델 검색..."
                  className="w-full bg-transparent text-xs font-normal text-zinc-200 placeholder:text-zinc-500 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-zinc-400 hover:text-zinc-200 text-[0.6875rem] font-normal px-1 cursor-pointer"
                  >
                    지우기
                  </button>
                )}
                {onOpenRoleModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenRoleModal();
                    }}
                    className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition shrink-0 cursor-pointer"
                    title="역할별 AI 모델 지정"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center rounded-md border border-white/[0.08] bg-[#09090b]/70 p-0.5">
                {([
                  ['single', '싱글'],
                  ['multi', '멀티'],
                  ['routing', '라우팅'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleModeSelect(value)}
                    aria-pressed={mode === value}
                    className={`flex-1 h-6 rounded-sm text-[11px] transition-colors cursor-pointer ${
                      mode === value
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Category tabs */}
              <div className="flex items-center select-none pt-0.5 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedTab('all')}
                  className={`px-2.5 py-1 text-xs transition cursor-pointer border-b-2 ${
                    selectedTab === 'all'
                      ? 'border-indigo-500 text-white font-medium'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('cloud')}
                  className={`px-2.5 py-1 text-xs transition cursor-pointer border-b-2 ${
                    selectedTab === 'cloud'
                      ? 'border-indigo-500 text-white font-medium'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  클라우드
                </button>
                <button
                  type="button"
                  onClick={handleSelectLocalAiTab}
                  className={`px-2.5 py-1 text-xs transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
                    selectedTab === 'local'
                      ? 'border-indigo-500 text-white font-medium'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="로컬 AI · Ollama 선택 및 태그 새로고침"
                >
                  <span>로컬 AI · Ollama</span>
                  <RefreshCw className={`w-2.5 h-2.5 text-indigo-400 ${isRefetching ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Scrollable Model Lists flex viewport */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-transparent">
              {/* TAB: LOCAL ONLY */}
              {selectedTab === 'local' && (
                <div className="space-y-1">
                  {pinnedList.filter((m) => m.group === 'local').map((m) => renderModelRow(m))}
                  {remainingLocalList.map((m) => renderModelRow(m))}
                  {detectedOllamaModels.length === 0 && renderFallbackLocalAiPrompt()}
                  {detectedOllamaModels.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between px-2">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {detectedOllamaModels.length}개 로컬 모델 감지됨
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: CLOUD ONLY */}
              {selectedTab === 'cloud' && (
                <div className="space-y-1">
                  {pinnedList.filter((m) => m.group === 'cloud').map((m) => renderModelRow(m))}
                  {remainingCloudList.map((m) => renderModelRow(m))}
                  {filteredModels.filter((m) => m.group === 'cloud').length === 0 && (
                    <div className="py-8 text-center text-zinc-500 text-xs font-normal">
                      검색된 클라우드 모델이 없습니다.
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ALL */}
              {selectedTab === 'all' && (
                <div className="space-y-1">
                  {/* Pinned favorites first */}
                  {pinnedList.map((m) => renderModelRow(m))}

                  {/* Remaining Cloud Models */}
                  {remainingCloudList.map((m) => renderModelRow(m))}

                  {remainingLocalList.some((m) => m.id === 'Qwen2.5-0.5B-Instruct') && (
                    <div className="mt-1">
                      <div className="px-2 py-0.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        브라우저 내장 AI · WebGPU
                      </div>
                      {remainingLocalList
                        .filter((m) => m.id === 'Qwen2.5-0.5B-Instruct')
                        .map((m) => renderModelRow(m))}
                    </div>
                  )}

                  {(remainingLocalList.some((m) => m.id !== 'Qwen2.5-0.5B-Instruct') ||
                    detectedOllamaModels.length === 0) && (
                    <div className="mt-1">
                      <div className="px-2 py-0.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        로컬 AI · Ollama
                      </div>
                      {remainingLocalList
                        .filter((m) => m.id !== 'Qwen2.5-0.5B-Instruct')
                        .map((m) => renderModelRow(m))}
                      {detectedOllamaModels.length === 0 && renderFallbackLocalAiPrompt()}
                    </div>
                  )}

                  {filteredModels.length === 0 && (
                    <div className="py-8 text-center text-zinc-500 text-xs font-normal">
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer slot (Selection counter) */}
            <div className="shrink-0 px-3 py-2 border-t border-white/5 text-xs text-zinc-400 flex items-center justify-between bg-[#09090b]/50">
              <span className="font-normal">
                {mode === 'single'
                  ? `싱글 모드 · ${primaryModelName}`
                  : mode === 'multi'
                    ? `멀티 비교 · ${activeCount}개 모델 선택됨`
                    : `자동 라우팅 · ${activeCount}개 후보 모델`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

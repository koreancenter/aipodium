import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Zap, ChevronDown, Search, SlidersHorizontal, RefreshCw, Star, Check, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchOllamaTags, DEFAULT_FALLBACK_MODELS, getModelDisplayName } from '../config/models.config';
import { useAuth } from '../context/AuthContext';
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
  vendor?: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'ollama' | 'webllm';
  tier?: string;
  hasApiKey?: boolean;
}

export const DEFAULT_LOCAL_TAGS = ['qwen2.5:latest', 'llama3.2:latest', 'deepseek-r1:latest'];

export interface InlineModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  selectedMultiModels: string[];
  onSelectMultiModels: (models: string[]) => void;
  mode: 'single' | 'routing' | 'multi';
  onModeChange: (mode: 'single' | 'routing' | 'multi') => void;
  availableChatModels?: ModelOptionItem[];
  onOpenRoleModal?: () => void;
  onOpenSettings?: (tab?: string) => void;
  onShowToast?: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  provider?: 'cloud' | 'local-pc' | 'local-server' | 'webllm';
  onSelectProvider?: (provider: 'cloud' | 'local-pc' | 'local-server') => void;
  onRefreshOllama?: () => Promise<any> | void;
  localEndpoint?: string;
  onSelectDefaultLocalTag?: (tag: string) => void;
  apiKeys?: Record<string, string>;
}

const DEFAULT_PINNED_MODELS = ['gemini-2.5-flash'];

export const getVendorForModel = (modelId: string): string => {
  const m = (modelId || '').toLowerCase();
  if (m.startsWith('gpt-') || m.startsWith('o3-') || m.includes('openai')) return 'openai';
  if (m.startsWith('claude-') || m.includes('anthropic')) return 'anthropic';
  if (m.startsWith('deepseek-') || m.includes('deepseek')) return 'deepseek';
  if (m.startsWith('llama-') || m.startsWith('groq-') || m.includes('groq')) return 'groq';
  if (m.includes('qwen') || m.includes('webllm')) return 'webllm';
  if (m.includes(':') || m.includes('ollama')) return 'ollama';
  return 'gemini';
};

export const getVendorDisplayName = (vendor: string): string => {
  switch (vendor) {
    case 'gemini': return 'Google Gemini';
    case 'openai': return 'OpenAI';
    case 'anthropic': return 'Anthropic';
    case 'deepseek': return 'DeepSeek';
    case 'groq': return 'Groq Cloud';
    default: return vendor;
  }
};

export const InlineModelSelector: React.FC<InlineModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  selectedMultiModels,
  onSelectMultiModels,
  mode,
  onModeChange,
  availableChatModels = [],
  onOpenRoleModal,
  onOpenSettings,
  onShowToast,
  onSelectProvider,
  onRefreshOllama,
  localEndpoint = 'http://localhost:11434',
  onSelectDefaultLocalTag,
  apiKeys: propsApiKeys,
}) => {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'cloud' | 'local'>('all');
  const [isRefetching, setIsRefetching] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Effective multi-provider API keys
  const effectiveApiKeys = useMemo<Record<string, string>>(() => {
    return {
      ...(auth?.apiKeys || {}),
      ...(propsApiKeys || {}),
    };
  }, [auth?.apiKeys, propsApiKeys]);

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

  // Base unified model list ensuring all cloud vendors are represented
  const allResolvedModels = useMemo<ModelOptionItem[]>(() => {
    const list: ModelOptionItem[] = [...availableChatModels];
    DEFAULT_FALLBACK_MODELS.forEach((dm) => {
      if (!list.some((m) => m.id === dm.id)) {
        const v = dm.vendor || (getVendorForModel(dm.id) as any);
        const hasKey = dm.group === 'cloud'
          ? Boolean(effectiveApiKeys[v]?.trim())
          : true;
        list.push({
          id: dm.id,
          name: dm.name,
          desc: dm.desc,
          group: dm.group,
          vendor: v,
          tier: dm.tier,
          hasApiKey: hasKey
        });
      }
    });
    return list;
  }, [availableChatModels, effectiveApiKeys]);

  // Model name resolver
  const getModelName = (id: string): string => {
    const cleanId = normalizeModelId(id);
    const found = allResolvedModels.find((m) => m.id === cleanId || m.id === id);
    if (found) return found.name;
    return getModelDisplayName(cleanId);
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
      if (auth?.setDefaultModel) {
        auth.setDefaultModel(updated[0]);
      }
    } else {
      const updated = Array.from(new Set([...currentSelection, cleanId]));
      onSelectMultiModels(updated);
      if (currentSelection.length === 0) {
        onSelectModel(cleanId);
        if (auth?.setDefaultModel) {
          auth.setDefaultModel(cleanId);
        }
      }
    }
  };

  const handleModeSelect = (nextMode: 'single' | 'multi' | 'routing') => {
    if (nextMode === 'single') {
      const nextModel = mode === 'single' ? selectedModel : activeModelIds[0];
      onSelectModel(nextModel);
      if (auth?.setDefaultModel) {
        auth.setDefaultModel(nextModel);
      }
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
    return (
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query) ||
      (m.desc && m.desc.toLowerCase().includes(query))
    );
  };

  const filteredModels = useMemo(
    () => allResolvedModels.filter(filterFn),
    [allResolvedModels, query]
  );

  // Pinned models at the top
  const pinnedList = useMemo(() => {
    return filteredModels.filter((m) => pinnedIds.includes(m.id));
  }, [filteredModels, pinnedIds]);

  // Remaining Cloud Models sorted by key availability
  const remainingCloudList = useMemo(() => {
    const list = filteredModels.filter((m) => m.group === 'cloud' && !pinnedIds.includes(m.id));
    return [...list].sort((a, b) => {
      const vendorA = a.vendor || getVendorForModel(a.id);
      const vendorB = b.vendor || getVendorForModel(b.id);
      const hasKeyA = Boolean(effectiveApiKeys[vendorA]?.trim());
      const hasKeyB = Boolean(effectiveApiKeys[vendorB]?.trim());
      if (hasKeyA && !hasKeyB) return -1;
      if (!hasKeyA && hasKeyB) return 1;
      return 0;
    });
  }, [filteredModels, pinnedIds, effectiveApiKeys]);

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
        감지된 로컬 모델이 없습니다.
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
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                  checked
                    ? 'bg-indigo-500/20 text-indigo-200 font-medium'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200'
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

  // Render flat QuickPick row
  function renderModelRow(m: ModelOptionItem) {
    const checked = isChecked(m.id);
    const isPinned = pinnedIds.includes(m.id);
    const vendor = m.vendor || getVendorForModel(m.id);
    const isCloud = m.group === 'cloud';

    // Provider API key status: check if valid key is registered
    const hasKey = isCloud
      ? Boolean(effectiveApiKeys[vendor]?.trim())
      : true;

    return (
      <div
        key={`model-row-${m.id}`}
        onClick={() => {
          if (!hasKey) {
            onShowToast?.(`${getVendorDisplayName(vendor)} API 키가 등록되지 않았습니다. 환경설정에서 키를 입력해주세요.`, 'warn');
            if (onOpenSettings) {
              setIsOpen(false);
              onOpenSettings('ai-engine');
            } else if (onOpenRoleModal) {
              setIsOpen(false);
              onOpenRoleModal();
            }
            return;
          }

          if (mode === 'single') {
            onSelectModel(m.id);
            if (auth?.setDefaultModel) {
              auth.setDefaultModel(m.id);
            }
            onSelectMultiModels([m.id]);
          } else {
            handleModelToggle(m.id);
          }
        }}
        className={`model-row-item group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs select-none transition-all ${
          checked
            ? 'bg-indigo-500/[0.09] text-indigo-200 font-medium'
            : !hasKey
              ? 'text-zinc-400 opacity-50 hover:opacity-80 hover:bg-white/[0.04]'
              : 'text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.05]'
        }`}
      >
        {/* Minimalist 14px toggle circle for Multi/Routing mode (no bulky radio in single mode) */}
        {mode !== 'single' && (
          <span
            aria-hidden="true"
            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mr-2 transition-colors ${
              checked
                ? 'border-indigo-500 bg-indigo-500'
                : 'border-zinc-600 group-hover:border-zinc-400'
            }`}
          >
            {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </span>
        )}

        {/* Center: Model Name and Role Description */}
        <div className="flex items-center min-w-0 flex-1 gap-2">
          <span
            className={`truncate text-xs ${
              checked
                ? 'text-indigo-200 font-medium'
                : !hasKey
                  ? 'text-zinc-400'
                  : 'text-zinc-300 group-hover:text-zinc-100 font-normal'
            }`}
          >
            {m.name}
          </span>
          {m.desc && (
            <span className="text-[10px] text-zinc-500 tracking-tight font-mono shrink-0">
              {m.desc}
            </span>
          )}
          {!hasKey && (
            <div
              className="ml-auto flex items-center pr-1 shrink-0"
              title="설정에서 API 키 등록 필요"
            >
              <KeyRound className="w-3 h-3 text-zinc-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Right: Check icon for selected Single model */}
        {mode === 'single' && checked && (
          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1.5" />
        )}

        {/* Right: Favorite star toggle */}
        <button
          type="button"
          onClick={(e) => handleTogglePin(m.id, e)}
          className={`p-1 hover:text-amber-400 transition-colors cursor-pointer shrink-0 ml-1 flex items-center justify-center ${
            isPinned
              ? 'text-amber-400'
              : 'text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity'
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
      {/* 1. Compact Model Select Trigger Button (Flat IDE style) */}
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

      {/* Popover UI */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute bottom-full left-0 mb-2 z-50 w-[370px] h-[380px] flex flex-col bg-[#121214] border border-[#222226] backdrop-blur-md rounded-xl shadow-2xl overflow-hidden text-xs font-normal"
          >
            {/* Header slot (Search input + Mode switcher + Tab bar) */}
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
                {(onOpenSettings || onOpenRoleModal) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (onOpenSettings) {
                        onOpenSettings('ai-engine');
                      } else if (onOpenRoleModal) {
                        onOpenRoleModal();
                      }
                    }}
                    className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-colors shrink-0 cursor-pointer"
                    title="AI 엔진 및 공급자 설정 열기"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Segmented Mode Control (싱글 | 멀티 | 라우팅) */}
              <div className="bg-[#0c0c0e] p-0.5 rounded-lg border border-white/[0.06] flex items-center">
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
                    className={`flex-1 h-6 rounded-md text-[11px] transition-all cursor-pointer ${
                      mode === value
                        ? 'bg-white/[0.08] text-zinc-100 font-medium shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-300 transition-colors'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Category tabs */}
              <div className="flex items-center select-none pt-1 border-t border-white/[0.06] gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTab('all')}
                  className={`px-3 py-1 text-xs transition-colors cursor-pointer border-b ${
                    selectedTab === 'all'
                      ? 'border-indigo-500/80 text-zinc-100 font-medium'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('cloud')}
                  className={`px-3 py-1 text-xs transition-colors cursor-pointer border-b ${
                    selectedTab === 'cloud'
                      ? 'border-indigo-500/80 text-zinc-100 font-medium'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  클라우드
                </button>
                <button
                  type="button"
                  onClick={handleSelectLocalAiTab}
                  className={`px-3 py-1 text-xs transition-colors cursor-pointer border-b flex items-center gap-1.5 ${
                    selectedTab === 'local'
                      ? 'border-indigo-500/80 text-zinc-100 font-medium'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="로컬 AI 선택 및 태그 새로고침"
                >
                  <span>로컬 AI</span>
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
                  {/* Quick settings link for missing API keys */}
                  <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between px-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        if (onOpenSettings) onOpenSettings('ai-engine');
                        else if (onOpenRoleModal) onOpenRoleModal();
                      }}
                      className="text-[11px] text-zinc-400 hover:text-indigo-300 transition-colors cursor-pointer font-normal flex items-center gap-1"
                    >
                      <span>+ 공급자 키 관리 및 등록</span>
                    </button>
                  </div>
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
                      <div className="px-2.5 py-1 text-[10px] text-zinc-500 font-medium select-none">
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
                      <div className="px-2.5 py-1 text-[10px] text-zinc-500 font-medium select-none">
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
              <span className="font-normal text-[11px] text-zinc-400">
                {mode === 'single'
                  ? `싱글 모드 · ${primaryModelName}`
                  : mode === 'multi'
                    ? `멀티 비교 · ${activeCount}개 모델 선택됨`
                    : `자동 라우팅 · ${activeCount}개 후보 모델`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenSettings) onOpenSettings('ai-engine');
                  else if (onOpenRoleModal) onOpenRoleModal();
                }}
                className="text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer font-normal flex items-center gap-1"
                title="공급자 키 관리 및 설정"
              >
                <span>+ 공급자 키 관리 및 등록</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

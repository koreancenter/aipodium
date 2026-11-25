import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  Star,
  Check,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchOllamaTags, DEFAULT_FALLBACK_MODELS, getModelDisplayName } from '../config/models.config';
import { useAuth } from '../context/AuthContext';
import {
  getModelSelectorLabel,
  isModelSelected,
  normalizeModelId,
  normalizeModelIds,
  type ModelSelectionMode,
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

export interface InlineModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  selectedMultiModels: string[];
  onSelectMultiModels: (models: string[]) => void;
  mode: ModelSelectionMode;
  onModeChange: (mode: ModelSelectionMode) => void;
  availableChatModels?: ModelOptionItem[];
  onOpenRoleModal?: () => void;
  onOpenSettings?: (tab?: string) => void;
  onShowToast?: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  provider?: 'cloud' | 'local-pc' | 'local-server' | 'webllm';
  onSelectProvider?: (provider: 'cloud' | 'local-pc' | 'local-server') => void;
  onRefreshOllama?: () => Promise<unknown> | void;
  localEndpoint?: string;
  onSelectDefaultLocalTag?: (tag: string) => void;
  apiKeys?: Record<string, string>;
}

export type LuxuryModelPickerPopoverProps = InlineModelSelectorProps;

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

export const getModelTierBadge = (m: ModelOptionItem): string | null => {
  const id = m.id.toLowerCase();
  if (id.includes('flash-lite')) return 'Lite';
  if (id.includes('flash')) return 'Fast';
  if (id.includes('pro')) return 'Pro';
  if (id.includes('o3-mini') || id.includes('reasoner') || id.includes('r1')) return 'Reasoning';
  if (id.includes('gpt-4o-mini') || id.includes('haiku') || id.includes('8b')) return 'Fast';
  if (id.includes('gpt-4o') || id.includes('sonnet')) return 'Omni';
  if (id.includes('deepseek-chat')) return 'General';
  if (id.includes('70b')) return 'LPU';
  if (m.group === 'local') {
    if (m.vendor === 'webllm' || id.includes('webllm') || id.includes('qwen2.5-0.5b')) return 'WebGPU';
    return 'Local';
  }
  if (m.tier) {
    if (m.tier.includes('Fast')) return 'Fast';
    if (m.tier.includes('Depth') || m.tier.includes('Pro')) return 'Pro';
    if (m.tier.includes('Reasoning')) return 'Reasoning';
  }
  return null;
};

export const getModelDescription = (m: ModelOptionItem): string => {
  const id = m.id.toLowerCase();
  if (id === 'gemini-2.5-flash') return '일상 대화 및 빠른 요약 전용';
  if (id === 'gemini-2.5-pro') return '복잡한 코드 분석 및 심층 논리 추론';
  if (id === 'gemini-2.5-flash-lite') return '초경량 초고속 실시간 응답';
  if (id === 'gpt-4o') return '플래그십 멀티모달 고성능 추론';
  if (id === 'gpt-4o-mini') return '경제적인 고속 경량화 추론';
  if (id === 'o3-mini') return '수학 및 과학 심층 논리 추론';
  if (id === 'claude-3.5-sonnet') return '고난도 코딩 및 시스템 아키텍처 분석';
  if (id === 'claude-3.5-haiku') return '초고속 실시간 응답 및 텍스트 처리';
  if (id === 'deepseek-chat') return '오픈 아키텍처 범용 코딩 및 대화';
  if (id === 'deepseek-reasoner') return '단계별 강화학습 심층 추론';
  if (id === 'llama-3.3-70b-versatile') return 'Groq LPU 초고속 하드웨어 가속 추론';
  if (id === 'llama-3.1-8b-instant') return 'Groq 초경량 즉각 응답 추론';
  if (id === 'qwen2.5-0.5b-instruct') return 'WebGPU 브라우저 내장 인메모리 실행';
  if (m.desc) return m.desc;
  if (m.group === 'local') return '로컬 설치 및 브라우저 오프라인 추론';
  return '클라우드 인텔리전스 모델';
};

interface NavigableModelEntry {
  key: string;
  id: string;
  item: ModelOptionItem;
}

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
  apiKeys: propsApiKeys,
}) => {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'cloud' | 'local'>('all');
  const [isRefetching, setIsRefetching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Multi-provider API keys
  const effectiveApiKeys = useMemo<Record<string, string>>(() => {
    return {
      ...(auth?.apiKeys || {}),
      ...(propsApiKeys || {}),
    };
  }, [auth?.apiKeys, propsApiKeys]);

  // Normalize model IDs
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

  // Dynamic boundary alignment: ensures popover never overflows chat panel bounds or overlaps resizers
  const [popoverShift, setPopoverShift] = useState<number>(0);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const alignPopover = () => {
      const buttonEl = buttonRef.current;
      const popoverEl = popoverRef.current;
      if (!buttonEl) return;

      const buttonRect = buttonEl.getBoundingClientRect();
      const popoverWidth = popoverEl?.offsetWidth || 340;

      const containerEl =
        document.getElementById('chat-panel-container') ||
        buttonEl.closest<HTMLElement>('#universal-prompt-input-container, section, [style*="width"]') ||
        buttonEl.closest<HTMLElement>('.relative.shrink-0') ||
        (document.getElementById('chat-resizer-handle')?.previousElementSibling as HTMLElement | null);

      const containerRect = containerEl?.getBoundingClientRect();
      const margin = 16;

      if (containerRect && containerRect.width > 0) {
        const buttonLeftInContainer = buttonRect.left - containerRect.left;
        const maxRightInContainer = containerRect.width - margin;
        const popoverRightInContainer = buttonLeftInContainer + popoverWidth;

        if (popoverRightInContainer > maxRightInContainer) {
          const delta = maxRightInContainer - popoverRightInContainer;
          const minDelta = margin - buttonLeftInContainer;
          setPopoverShift(Math.max(delta, minDelta));
        } else {
          const minDelta = margin - buttonLeftInContainer;
          setPopoverShift(Math.max(0, minDelta));
        }
      } else {
        const rightEdge = buttonRect.left + popoverWidth;
        const maxRight = window.innerWidth - margin;
        if (rightEdge > maxRight) {
          setPopoverShift(maxRight - rightEdge);
        } else {
          setPopoverShift(0);
        }
      }
    };

    alignPopover();
    window.addEventListener('resize', alignPopover);

    const containerEl =
      document.getElementById('chat-panel-container') ||
      buttonRef.current?.closest<HTMLElement>('section');

    let ro: ResizeObserver | null = null;
    if (containerEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        alignPopover();
      });
      ro.observe(containerEl);
    }

    return () => {
      window.removeEventListener('resize', alignPopover);
      ro?.disconnect();
    };
  }, [isOpen]);

  // Base unified model list
  const allResolvedModels = useMemo<ModelOptionItem[]>(() => {
    const list: ModelOptionItem[] = [...availableChatModels];
    DEFAULT_FALLBACK_MODELS.forEach((dm) => {
      if (!list.some((m) => m.id === dm.id)) {
        const v = (dm.vendor || getVendorForModel(dm.id)) as ModelOptionItem['vendor'];
        const hasKey = dm.group === 'cloud'
          ? Boolean(effectiveApiKeys[v || '']?.trim())
          : true;
        list.push({
          id: dm.id,
          name: dm.name,
          desc: dm.desc,
          group: dm.group,
          vendor: v,
          tier: dm.tier,
          hasApiKey: hasKey,
        });
      }
    });
    return list;
  }, [availableChatModels, effectiveApiKeys]);

  // Helper to determine if a model has an active key or is local
  const isModelAvailable = useCallback((m: ModelOptionItem): boolean => {
    if (m.group === 'local') return true;
    const vendor = m.vendor || getVendorForModel(m.id);
    const key = effectiveApiKeys[vendor]?.trim();
    return Boolean(key) || Boolean(m.hasApiKey);
  }, [effectiveApiKeys]);

  // Model name resolver
  const getModelName = (id: string): string => {
    const cleanId = normalizeModelId(id);
    const found = allResolvedModels.find((m) => m.id === cleanId || m.id === id);
    if (found) return found.name;
    return getModelDisplayName(cleanId);
  };

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

  const isChecked = useCallback((modelId: string): boolean => {
    return isModelSelected(modelId, selectedModel, selectedMultiModels, mode);
  }, [selectedModel, selectedMultiModels, mode]);

  const handleModelToggle = useCallback((modelId: string) => {
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
  }, [isChecked, selectedMultiModels, selectedModel, onShowToast, onSelectMultiModels, onSelectModel, auth]);

  const handleModeSelect = (nextMode: ModelSelectionMode) => {
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
  const filterFn = useCallback((m: ModelOptionItem) => {
    if (!query) return true;
    return (
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query) ||
      Boolean(m.desc && m.desc.toLowerCase().includes(query))
    );
  }, [query]);

  const filteredModels = useMemo(
    () => allResolvedModels.filter(filterFn),
    [allResolvedModels, filterFn]
  );

  // Ready-to-use available models only
  const availableModels = useMemo(() => {
    return filteredModels.filter((m) => isModelAvailable(m));
  }, [filteredModels, isModelAvailable]);

  // Tab-specific filtered available lists
  const pinnedList = useMemo(() => {
    return availableModels.filter((m) => pinnedIds.includes(m.id));
  }, [availableModels, pinnedIds]);

  const remainingCloudList = useMemo(() => {
    return availableModels.filter((m) => m.group === 'cloud' && !pinnedIds.includes(m.id));
  }, [availableModels, pinnedIds]);

  const remainingLocalList = useMemo(() => {
    return availableModels.filter((m) => m.group === 'local' && !pinnedIds.includes(m.id));
  }, [availableModels, pinnedIds]);

  const webgpuLocalList = useMemo(() => {
    return remainingLocalList.filter((m) => m.id === 'Qwen2.5-0.5B-Instruct');
  }, [remainingLocalList]);

  const ollamaLocalList = useMemo(() => {
    return remainingLocalList.filter((m) => m.id !== 'Qwen2.5-0.5B-Instruct');
  }, [remainingLocalList]);

  const detectedOllamaModels = useMemo(() => {
    return availableChatModels.filter(
      (m) => m.group === 'local' && m.id !== 'Qwen2.5-0.5B-Instruct'
    );
  }, [availableChatModels]);

  const hasAnyConfiguredCloud = useMemo(() => {
    return allResolvedModels.some((m) => m.group === 'cloud' && isModelAvailable(m));
  }, [allResolvedModels, isModelAvailable]);

  const openSettingsPanel = useCallback(() => {
    setIsOpen(false);
    if (onOpenSettings) {
      onOpenSettings('ai-engine');
    } else if (onOpenRoleModal) {
      onOpenRoleModal();
    }
  }, [onOpenSettings, onOpenRoleModal]);

  const handleRefetchTags = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsRefetching(true);
    try {
      if (onRefreshOllama) {
        await onRefreshOllama();
      } else {
        const ep = (localEndpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
        const tags = await fetchOllamaTags(ep);
        if (tags && tags.length > 0) {
          onShowToast?.(`로컬 Ollama 모델 ${tags.length}개가 감지되었습니다.`, 'success');
        } else {
          onShowToast?.('감지된 로컬 Ollama 모델이 없습니다.', 'info');
        }
      }
    } catch {
      onShowToast?.('태그 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsRefetching(false);
    }
  };

  const handleSelectLocalAiTab = async () => {
    setSelectedTab('local');
    if (onSelectProvider) {
      onSelectProvider('local-pc');
    }
    await handleRefetchTags();
  };

  const handleSelectModelItem = useCallback((m: ModelOptionItem) => {
    if (mode === 'single') {
      onSelectModel(m.id);
      if (auth?.setDefaultModel) {
        auth.setDefaultModel(m.id);
      }
      onSelectMultiModels([m.id]);
    } else {
      handleModelToggle(m.id);
    }
  }, [mode, onSelectModel, auth, onSelectMultiModels, handleModelToggle]);

  // Flat ordered list of visible interactive rows for keyboard navigation
  const navigableEntries = useMemo<NavigableModelEntry[]>(() => {
    const entries: NavigableModelEntry[] = [];

    if (selectedTab === 'local') {
      pinnedList
        .filter((m) => m.group === 'local')
        .forEach((m) => entries.push({ key: `model:${m.id}`, id: m.id, item: m }));
      webgpuLocalList.forEach((m) =>
        entries.push({ key: `model:${m.id}`, id: m.id, item: m })
      );
      ollamaLocalList.forEach((m) =>
        entries.push({ key: `model:${m.id}`, id: m.id, item: m })
      );
    } else if (selectedTab === 'cloud') {
      pinnedList
        .filter((m) => m.group === 'cloud')
        .forEach((m) => entries.push({ key: `model:${m.id}`, id: m.id, item: m }));
      remainingCloudList.forEach((m) =>
        entries.push({ key: `model:${m.id}`, id: m.id, item: m })
      );
    } else {
      pinnedList.forEach((m) =>
        entries.push({ key: `model:${m.id}`, id: m.id, item: m })
      );
      remainingCloudList.forEach((m) =>
        entries.push({ key: `model:${m.id}`, id: m.id, item: m })
      );
      webgpuLocalList.forEach((m) =>
        entries.push({ key: `model:${m.id}`, id: m.id, item: m })
      );
      if (detectedOllamaModels.length > 0) {
        ollamaLocalList.forEach((m) =>
          entries.push({ key: `model:${m.id}`, id: m.id, item: m })
        );
      }
    }

    return entries;
  }, [
    selectedTab,
    pinnedList,
    remainingCloudList,
    webgpuLocalList,
    ollamaLocalList,
    detectedOllamaModels.length,
  ]);

  const entryIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    navigableEntries.forEach((entry, idx) => map.set(entry.key, idx));
    return map;
  }, [navigableEntries]);

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery, selectedTab, isOpen]);

  useEffect(() => {
    if (activeIndex >= navigableEntries.length && navigableEntries.length > 0) {
      setActiveIndex(navigableEntries.length - 1);
    }
  }, [activeIndex, navigableEntries.length]);

  useEffect(() => {
    if (!isOpen) return;
    const current = navigableEntries[activeIndex];
    if (!current) return;
    const el = rowRefs.current.get(current.key);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, navigableEntries]);

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (navigableEntries.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % navigableEntries.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + navigableEntries.length) % navigableEntries.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = navigableEntries[activeIndex];
      if (target?.item) {
        handleSelectModelItem(target.item);
      }
    }
  };

  const registerRowRef = (key: string) => (el: HTMLDivElement | null) => {
    if (el) {
      rowRefs.current.set(key, el);
    } else {
      rowRefs.current.delete(key);
    }
  };

  const renderEmptyState = (
    message: string = '연결된 클라우드 모델이 없습니다',
    showSettingsButton: boolean = true
  ) => (
    <div className="py-7 px-3 text-center flex flex-col items-center justify-center space-y-2.5">
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
      {showSettingsButton && (
        <button
          type="button"
          onClick={openSettingsPanel}
          className="px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-[var(--text-main)] text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
        >
          API 키 등록하기
        </button>
      )}
    </div>
  );

  // Unified 36px (h-9) single-line command row
  function renderSingleLineRow(options: {
    rowKey: string;
    id: string;
    title: string;
    rightLabel: string | null;
    onSelect: () => void;
    allowPin?: boolean;
  }) {
    const {
      rowKey,
      id,
      title,
      rightLabel,
      onSelect,
      allowPin = true,
    } = options;

    const checked = isChecked(id);
    const isPinned = pinnedIds.includes(id);
    const navIdx = entryIndexByKey.get(rowKey);
    const isKeyboardFocused = navIdx !== undefined && navIdx === activeIndex;

    return (
      <div
        key={rowKey}
        ref={registerRowRef(rowKey)}
        onMouseEnter={() => {
          if (navIdx !== undefined) setActiveIndex(navIdx);
        }}
        onClick={onSelect}
        className={`group h-9 px-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-150 select-none ${
          isKeyboardFocused || checked
            ? 'bg-white/[0.07]'
            : 'hover:bg-white/[0.04]'
        }`}
      >
        {/* Left: Compact selection indicator + single-line model title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
            {mode !== 'single' ? (
              <div
                className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-colors ${
                  checked
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[#0F172A]'
                    : 'border-white/20 group-hover:border-white/35 bg-transparent'
                }`}
              >
                {checked && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
              </div>
            ) : checked ? (
              <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            ) : null}
          </div>

          <span
            className="text-[12.5px] font-medium text-[var(--text-main)] truncate"
            title={title}
          >
            {title}
          </span>
        </div>

        {/* Right: Unboxed monospace engine/tier tag + hover-revealed favorite star */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {rightLabel && (
            <span className="text-[11px] font-mono text-[var(--text-tertiary)] tabular-nums">
              {rightLabel}
            </span>
          )}
          {allowPin && (
            <button
              type="button"
              onClick={(e) => handleTogglePin(id, e)}
              className={`p-0.5 rounded transition-opacity cursor-pointer flex items-center justify-center shrink-0 ${
                isPinned
                  ? 'text-amber-400/90 opacity-100'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] opacity-0 group-hover:opacity-100'
              }`}
              title={isPinned ? '즐겨찾기 고정 해제' : '즐겨찾기 고정'}
              aria-label={isPinned ? '즐겨찾기 고정 해제' : '즐겨찾기 고정'}
            >
              <Star className="w-3 h-3 stroke-[1.5]" fill={isPinned ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderModelRow(m: ModelOptionItem) {
    return renderSingleLineRow({
      rowKey: `model:${m.id}`,
      id: m.id,
      title: m.name,
      rightLabel: getModelTierBadge(m),
      onSelect: () => handleSelectModelItem(m),
      allowPin: true,
    });
  }

  function renderLocalOllamaSection(localModels: ModelOptionItem[], showEmptyRow: boolean) {
    const hasDetected = detectedOllamaModels.length > 0;
    if (hasDetected && localModels.length === 0) return null;
    if (!hasDetected && !showEmptyRow) return null;

    return (
      <div className="mt-1">
        <div className="px-3 pt-2.5 pb-1 flex items-center justify-between select-none">
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
            로컬 AI · Ollama
          </span>
          <div className="flex items-center gap-1.5">
            {hasDetected && (
              <span className="text-[10.5px] text-[var(--text-tertiary)] tabular-nums">
                {detectedOllamaModels.length}개 연결됨
              </span>
            )}
            <button
              type="button"
              onClick={handleRefetchTags}
              className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-main)] hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="로컬 Ollama 모델 새로고침"
              aria-label="로컬 Ollama 모델 새로고침"
            >
              <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin text-[var(--accent-primary)]' : ''}`} />
            </button>
          </div>
        </div>

        {hasDetected ? (
          <div className="space-y-0.5">
            {localModels.map((m) => renderModelRow(m))}
          </div>
        ) : (
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2">
            <span className="text-[11.5px] text-[var(--text-tertiary)] truncate">
              감지된 로컬 Ollama 모델 없음
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefetchTags}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isRefetching ? 'animate-spin text-[var(--accent-primary)]' : ''}`} />
                <span>새로고침</span>
              </button>
              {(onOpenSettings || onOpenRoleModal) && (
                <>
                  <span className="text-white/15">·</span>
                  <button
                    type="button"
                    onClick={openSettingsPanel}
                    className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  >
                    연결 설정
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-1 select-none overflow-visible">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-6 max-w-[220px] px-2 rounded-md text-[0.6875rem] font-normal flex items-center gap-1.5 transition-colors cursor-pointer ${
          isOpen
            ? 'bg-white/[0.08] text-[var(--accent-primary)]'
            : hasMultipleModels
            ? 'text-[var(--accent-primary)] hover:bg-white/[0.06]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-white/[0.06]'
        }`}
        title={`AI 모델 선택: ${chipLabel} (클릭하여 열기)`}
      >
        <span className="truncate text-left font-normal">{chipLabel}</span>
        <ChevronDown
          className={`w-3 h-3 text-[var(--text-secondary)] shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
          }`}
        />
      </button>

      {/* Precision Command Palette Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.985 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{ left: `${popoverShift}px` }}
            onWheel={(e) => e.stopPropagation()}
            onKeyDown={handlePaletteKeyDown}
            className="absolute bottom-full mb-2 z-50 w-[340px] min-w-[340px] max-w-[340px] h-auto max-h-[360px] flex flex-col bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.09] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] rounded-xl overflow-hidden text-xs font-normal before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-px before:pointer-events-none before:z-10 before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent"
          >
            {/* 1. Borderless Command Search Row */}
            <div className="shrink-0 px-3.5 py-2.5 border-b border-white/[0.06] flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="모델 검색..."
                className="flex-1 min-w-0 bg-transparent text-[12.5px] font-normal text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-main)] text-[10.5px] px-1 cursor-pointer transition-colors shrink-0"
                >
                  지우기
                </button>
              )}
              {(onOpenSettings || onOpenRoleModal) && (
                <button
                  type="button"
                  onClick={openSettingsPanel}
                  className="p-1 -mr-1 text-[var(--text-tertiary)] hover:text-[var(--text-main)] hover:bg-white/[0.05] rounded-md transition-colors shrink-0 cursor-pointer"
                  title="AI 엔진 및 설정 열기"
                  aria-label="AI 엔진 및 설정 열기"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Slim Sub-Header: Left Filter Tabs & Right Segmented Mode Switcher */}
            <div className="shrink-0 px-3.5 py-1.5 border-b border-white/[0.06] flex items-center justify-between gap-2 select-none">
              {/* Left Filter Tabs */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedTab('all')}
                  className={`text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                    selectedTab === 'all'
                      ? 'text-[var(--text-main)] font-medium'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('cloud')}
                  className={`text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                    selectedTab === 'cloud'
                      ? 'text-[var(--text-main)] font-medium'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  클라우드
                </button>
                <button
                  type="button"
                  onClick={handleSelectLocalAiTab}
                  className={`text-[11px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedTab === 'local'
                      ? 'text-[var(--text-main)] font-medium'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                  title="로컬 AI 선택 및 새로고침"
                >
                  <span>로컬 AI</span>
                  {isRefetching && (
                    <RefreshCw className="w-2.5 h-2.5 text-[var(--accent-primary)] animate-spin" />
                  )}
                </button>
              </div>

              {/* Right Mode Switcher */}
              <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-md shrink-0">
                {([
                  ['single', '단일'],
                  ['multi', '비교'],
                  ['routing', '라우팅'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleModeSelect(value)}
                    aria-pressed={mode === value}
                    className={`px-2 py-0.5 rounded-[4px] text-[10.5px] transition-colors cursor-pointer whitespace-nowrap ${
                      mode === value
                        ? 'bg-white/[0.08] text-[var(--text-main)] font-medium'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Scrollable Single-Line Model List Viewport */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-2 space-y-0.5 bg-transparent">
              {/* TAB: LOCAL ONLY */}
              {selectedTab === 'local' && (
                <div className="space-y-0.5">
                  {pinnedList.filter((m) => m.group === 'local').map((m) => renderModelRow(m))}
                  {webgpuLocalList.map((m) => renderModelRow(m))}
                  {renderLocalOllamaSection(ollamaLocalList, !query)}
                  {query &&
                    pinnedList.filter((m) => m.group === 'local').length === 0 &&
                    remainingLocalList.length === 0 &&
                    renderEmptyState('일치하는 로컬 모델이 없습니다.', false)}
                </div>
              )}

              {/* TAB: CLOUD ONLY */}
              {selectedTab === 'cloud' && (
                <div className="space-y-0.5">
                  {pinnedList.filter((m) => m.group === 'cloud').map((m) => renderModelRow(m))}
                  {remainingCloudList.map((m) => renderModelRow(m))}
                  {availableModels.filter((m) => m.group === 'cloud').length === 0 &&
                    renderEmptyState(
                      query && hasAnyConfiguredCloud
                        ? '일치하는 클라우드 모델이 없습니다.'
                        : '연결된 클라우드 모델이 없습니다',
                      !query || !hasAnyConfiguredCloud
                    )}
                </div>
              )}

              {/* TAB: ALL */}
              {selectedTab === 'all' && (
                <div className="space-y-0.5">
                  {pinnedList.map((m) => renderModelRow(m))}
                  {remainingCloudList.map((m) => renderModelRow(m))}

                  {webgpuLocalList.length > 0 && (
                    <div className="mt-1">
                      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between select-none">
                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                          브라우저 내장 AI · WebGPU
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {webgpuLocalList.map((m) => renderModelRow(m))}
                      </div>
                    </div>
                  )}

                  {detectedOllamaModels.length > 0 && renderLocalOllamaSection(ollamaLocalList, false)}

                  {availableModels.length === 0 &&
                    renderEmptyState(
                      query ? '일치하는 모델이 없습니다.' : '연결된 클라우드 모델이 없습니다',
                      !query
                    )}
                </div>
              )}
            </div>

            {/* 4. De-duplicated Minimal Utility Footer */}
            <div className="shrink-0 px-3.5 py-2 border-t border-white/[0.06] flex items-center justify-between select-none">
              <button
                type="button"
                onClick={openSettingsPanel}
                className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                API 키 관리 ↗
              </button>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono tabular-nums">
                ↑↓ · ↵ 선택
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const LuxuryModelPickerPopover = InlineModelSelector;
export default InlineModelSelector;

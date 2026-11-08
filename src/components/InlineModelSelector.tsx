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
  appendModelIfMissing,
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

export const DEFAULT_LOCAL_TAGS = ['qwen2.5:latest', 'llama3.2:latest', 'deepseek-r1:latest'];

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
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

      // Locate surrounding panel container (prioritizing explicit chat-panel-container)
      const containerEl =
        document.getElementById('chat-panel-container') ||
        buttonEl.closest<HTMLElement>('#universal-prompt-input-container, section, [style*="width"]') ||
        buttonEl.closest<HTMLElement>('.relative.shrink-0') ||
        (document.getElementById('chat-resizer-handle')?.previousElementSibling as HTMLElement | null);

      const containerRect = containerEl?.getBoundingClientRect();
      const margin = 16; // 16px clean breathing room from panel border and resizer handle

      if (containerRect && containerRect.width > 0) {
        // Distance from container left to button left
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

  const isChecked = (modelId: string): boolean => {
    return isModelSelected(modelId, selectedModel, selectedMultiModels, mode);
  };

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
  const filterFn = (m: ModelOptionItem) => {
    if (!query) return true;
    return (
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query) ||
      Boolean(m.desc && m.desc.toLowerCase().includes(query))
    );
  };

  const filteredModels = useMemo(
    () => allResolvedModels.filter(filterFn),
    [allResolvedModels, query]
  );

  // Split into available and unconfigured models
  const availableModels = useMemo(() => {
    return filteredModels.filter((m) => isModelAvailable(m));
  }, [filteredModels, isModelAvailable]);

  const unconfiguredModels = useMemo(() => {
    return filteredModels.filter((m) => !isModelAvailable(m));
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

  // Tab-specific unconfigured lists
  const tabUnconfiguredList = useMemo(() => {
    if (selectedTab === 'cloud') {
      return unconfiguredModels.filter((m) => m.group === 'cloud');
    }
    if (selectedTab === 'local') {
      return unconfiguredModels.filter((m) => m.group === 'local');
    }
    return unconfiguredModels;
  }, [unconfiguredModels, selectedTab]);

  const handleRefetchTags = async () => {
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
          onShowToast?.('감지된 로컬 모델이 없습니다. 기본 태그를 확인하세요.', 'info');
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

  const detectedOllamaModels = useMemo(() => {
    return availableChatModels.filter(
      (m) => m.group === 'local' && m.id !== 'Qwen2.5-0.5B-Instruct'
    );
  }, [availableChatModels]);

  // Clean 2-line plain text notice without nested dark boxes
  const renderFallbackLocalAiPrompt = () => (
    <div className="px-3 py-2 space-y-1.5 text-xs select-none">
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        감지된 로컬 모델이 없습니다.
        <br />
        <span className="text-zinc-500">Ollama 실행 상태 또는 기본 태그를 확인하세요.</span>
      </p>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {DEFAULT_LOCAL_TAGS.map((tag) => {
          const checked = isChecked(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleSelectDefaultTag(tag)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
                checked
                  ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 font-medium'
                  : 'hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
              }`}
              title={`'${tag}' 모델 선택`}
            >
              <span>{tag}</span>
              {checked && <Check className="w-2.5 h-2.5 text-indigo-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderEmptyState = (message: string = '사용 가능한 AI 모델이 없습니다.') => (
    <div className="py-7 px-3 text-center flex flex-col items-center justify-center space-y-2.5">
      <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          if (onOpenSettings) onOpenSettings('ai-engine');
          else if (onOpenRoleModal) onOpenRoleModal();
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:text-indigo-200 text-xs transition-colors cursor-pointer"
      >
        <span>API 키 설정하기</span>
      </button>
    </div>
  );

  function renderModelRow(m: ModelOptionItem, isConfigured: boolean = true) {
    const checked = isChecked(m.id);
    const isPinned = pinnedIds.includes(m.id);
    const vendor = m.vendor || getVendorForModel(m.id);
    const tierBadge = getModelTierBadge(m);

    return (
      <div
        key={`model-row-${m.id}`}
        onClick={() => {
          if (!isConfigured) {
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
        className={`group py-2 px-3 hover:bg-white/[0.05] rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-150 select-none ${
          checked
            ? 'bg-white/[0.08] text-zinc-100'
            : !isConfigured
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-300 hover:text-zinc-100'
        }`}
      >
        {/* Left: Checkmark / Checkbox + Model name + micro tag */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
            {mode !== 'single' ? (
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                  checked
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-zinc-700 group-hover:border-zinc-500 bg-transparent'
                }`}
              >
                {checked && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
              </div>
            ) : checked ? (
              <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : null}
          </div>

          <span
            className={`text-xs font-medium truncate ${
              checked
                ? 'text-white'
                : !isConfigured
                  ? 'text-zinc-500'
                  : 'text-zinc-200 group-hover:text-white'
            }`}
            title={m.name}
          >
            {m.name}
          </span>

          {tierBadge && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-400 font-mono tracking-tight shrink-0">
              {tierBadge}
            </span>
          )}
        </div>

        {/* Right: Star Icon for favorites */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={(e) => handleTogglePin(m.id, e)}
            className={`p-1 transition-opacity cursor-pointer flex items-center justify-center shrink-0 ${
              isPinned
                ? 'text-zinc-300 opacity-100'
                : 'text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100'
            }`}
            title={isPinned ? '즐겨찾기 고정 해제' : '즐겨찾기 고정'}
          >
            <Star className="w-3.5 h-3.5 stroke-[1.5]" fill={isPinned ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    );
  }

  // Render flat collapsible unconfigured models accordion
  const renderUnconfiguredAccordion = () => {
    if (tabUnconfiguredList.length === 0) return null;
    return (
      <div className="mt-2 pt-2 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={() => setShowUnconfigured((prev) => !prev)}
          className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer select-none rounded hover:bg-white/[0.02]"
        >
          <span>키 설정 필요 모델 ({tabUnconfiguredList.length}개)</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-150 ${
              showUnconfigured ? 'rotate-180 text-zinc-400' : ''
            }`}
          />
        </button>
        {showUnconfigured && (
          <div className="mt-1 space-y-0.5 opacity-70">
            {tabUnconfiguredList.map((m) => renderModelRow(m, false))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative inline-flex items-center gap-1 select-none overflow-visible">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-6 max-w-[220px] px-2 rounded-md text-[0.6875rem] font-normal flex items-center gap-1.5 transition-colors cursor-pointer ${
          isOpen
            ? 'bg-white/[0.08] text-indigo-300'
            : hasMultipleModels
            ? 'text-indigo-300 hover:text-indigo-200 hover:bg-white/[0.06]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
        }`}
        title={`AI 모델 선택: ${chipLabel} (클릭하여 열기)`}
      >
        <span className="truncate text-left font-normal">{chipLabel}</span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Strict Sizing & Positioning: w-[340px] min-w-[340px] max-w-[340px] absolute bottom-full mb-2 z-50 shadow-2xl */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ left: `${popoverShift}px` }}
            onWheel={(e) => e.stopPropagation()}
            className="absolute bottom-full mb-2 z-50 w-[340px] min-w-[340px] max-w-[340px] h-[400px] flex flex-col bg-[#0f1015]/95 border border-white/[0.07] backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden text-xs font-normal"
          >
            {/* Header: Slim search bar + Simple text filter tabs & Mode switcher */}
            <div className="shrink-0 border-b border-white/[0.07] bg-[#09090b]/60 p-2 space-y-1.5">
              {/* Search input: py-1.5 px-3 bg-white/[0.03] rounded-lg text-xs */}
              <div className="flex items-center gap-2 py-1.5 px-3 bg-white/[0.03] rounded-lg text-xs border border-white/[0.04]">
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="모델 검색..."
                  className="w-full bg-transparent text-xs font-normal text-zinc-100 placeholder:text-zinc-600 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-zinc-500 hover:text-zinc-300 text-[10px] font-normal px-1 cursor-pointer transition-colors"
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
                    className="p-0.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] rounded transition-colors shrink-0 cursor-pointer"
                    title="AI 엔진 및 설정 열기"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Simple text filter tabs (전체, 클라우드, 로컬 AI) + Mode switcher */}
              <div className="flex items-center justify-between px-1 select-none gap-2">
                {/* Simple text tabs */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTab('all')}
                    className={`text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                      selectedTab === 'all'
                        ? 'text-zinc-100 font-medium'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTab('cloud')}
                    className={`text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                      selectedTab === 'cloud'
                        ? 'text-zinc-100 font-medium'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    클라우드
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectLocalAiTab}
                    className={`text-[11px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                      selectedTab === 'local'
                        ? 'text-zinc-100 font-medium'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="로컬 AI 선택 및 새로고침"
                  >
                    <span>로컬 AI</span>
                    {isRefetching && <RefreshCw className="w-2.5 h-2.5 text-indigo-400 animate-spin" />}
                  </button>
                </div>

                {/* Mode switcher */}
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 shrink-0">
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
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                        mode === value
                          ? 'bg-white/[0.08] text-zinc-100 font-medium'
                          : 'hover:text-zinc-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Model Lists flex viewport (Flat layout without nested cards) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-transparent">
              {/* TAB: LOCAL ONLY */}
              {selectedTab === 'local' && (
                <div className="space-y-0.5">
                  {pinnedList.filter((m) => m.group === 'local').map((m) => renderModelRow(m))}
                  {remainingLocalList.map((m) => renderModelRow(m))}
                  {detectedOllamaModels.length === 0 && renderFallbackLocalAiPrompt()}
                  {detectedOllamaModels.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between px-3">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {detectedOllamaModels.length}개 로컬 모델 감지됨
                      </span>
                    </div>
                  )}
                  {renderUnconfiguredAccordion()}
                </div>
              )}

              {/* TAB: CLOUD ONLY */}
              {selectedTab === 'cloud' && (
                <div className="space-y-0.5">
                  {pinnedList.filter((m) => m.group === 'cloud').map((m) => renderModelRow(m))}
                  {remainingCloudList.map((m) => renderModelRow(m))}
                  {availableModels.filter((m) => m.group === 'cloud').length === 0 && (
                    renderEmptyState('사용 가능한 클라우드 모델이 없습니다.')
                  )}
                  {renderUnconfiguredAccordion()}
                </div>
              )}

              {/* TAB: ALL */}
              {selectedTab === 'all' && (
                <div className="space-y-0.5">
                  {pinnedList.map((m) => renderModelRow(m))}
                  {remainingCloudList.map((m) => renderModelRow(m))}

                  {remainingLocalList.some((m) => m.id === 'Qwen2.5-0.5B-Instruct') && (
                    <div className="mt-1">
                      <div className="px-3 pt-2 pb-1 text-[10px] text-zinc-500 font-medium select-none">
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
                      <div className="px-3 pt-2 pb-1 text-[10px] text-zinc-500 font-medium select-none">
                        로컬 AI · Ollama
                      </div>
                      {remainingLocalList
                        .filter((m) => m.id !== 'Qwen2.5-0.5B-Instruct')
                        .map((m) => renderModelRow(m))}
                      {detectedOllamaModels.length === 0 && renderFallbackLocalAiPrompt()}
                    </div>
                  )}

                  {availableModels.length === 0 && (
                    renderEmptyState('사용 가능한 AI 모델이 없습니다.')
                  )}

                  {renderUnconfiguredAccordion()}
                </div>
              )}
            </div>

            {/* Bottom Bar: Clean 1-line status footer */}
            <div className="shrink-0 text-[11px] text-zinc-400 py-2 px-3 border-t border-white/[0.06] flex items-center justify-between select-none">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0" />
                <span className="font-normal text-[11px] text-zinc-300 truncate">
                  {mode === 'single'
                    ? `단일 추론 · ${primaryModelName}`
                    : mode === 'multi'
                      ? `교차 비교 · ${activeCount}개 선택됨`
                      : `스마트 라우팅 · ${activeCount}개 후보 모델`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const LuxuryModelPickerPopover = InlineModelSelector;
export default InlineModelSelector;

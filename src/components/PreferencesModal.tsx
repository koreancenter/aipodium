import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  X,
  Palette,
  Bot,
  Save,
  Check,
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Play,
  ShieldCheck,
  RotateCcw,
  Globe,
  Cloud,
  Server,
  Github,
  Cpu,
  Sparkles,
  Key,
  PlugZap,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Activity,
  Code2,
  Scale,
  RefreshCw,
  Ghost,
  Languages,
  Lock,
  AlertTriangle,
  ArrowRight,
  HardDrive,
  Database,
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SecuritySettings, SecurityConfig, DEFAULT_SECURITY_CONFIG } from './SecuritySettings';
import { googleDriveService, GoogleUserProfile } from '../services/googleDriveService';
import type { RemoteConfig } from './RemoteWorkspaceModal';
import type { GithubConfig } from './GithubIntegrationModal';

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  body: string;
}

export interface AiInferenceParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
  systemInstruction: string;
  streamEnabled: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';
}

export const DEFAULT_AI_PARAMETERS: AiInferenceParameters = {
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 4096,
  presencePenalty: 0.0,
  frequencyPenalty: 0.0,
  systemInstruction: '당신은 AI Podium의 전문 어시스턴트이자 숙련된 소프트웨어 엔지니어 및 테크니컬 라이터입니다. 사용자의 질문에 체계적이고 정확하며 친절하게 답변하세요.',
  streamEnabled: true,
  reasoningEffort: 'medium'
};

export * from '../utils/themeManager';
import { applyThemeToDocument } from '../utils/themeManager';

export interface UserPreferences {
  baseTheme?: string;
  themeAccent?: string;
  themeMode?: string;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  compactness: 'dense' | 'spacious';
  defaultModel: string;
  aiPersona: {
    name: string;
    role: string;
    systemInstruction: string;
  };
  customPrompts: PromptTemplate[];
  security?: SecurityConfig;
  // Ghost Writer preferences
  ghostWriterLevel?: 'off' | '100' | '70' | '50' | '30';
  ghostWriterModel?: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  baseTheme: 'emerald',
  themeAccent: 'emerald',
  themeMode: 'standard',
  fontSize: 'md',
  compactness: 'dense',
  defaultModel: 'gemini-3.7-flash',
  ghostWriterLevel: 'off',
  ghostWriterModel: 'gemini-3.7-flash',
  aiPersona: {
    name: 'Podium Assistant',
    role: 'Professional Software Engineer',
    systemInstruction: 'You are an expert AI coding assistant and tech lead inside the AI Podium IDE. Always provide concise, accurate, and production-ready code. Explain complex architectures clearly.'
  },
  customPrompts: [
    {
      id: 'p-1',
      title: 'Code Review',
      description: '보안 및 성능 관점에서 코드 리뷰',
      body: 'Please review the following code for any security vulnerabilities, performance bottlenecks, and adherence to best practices. Provide specific recommendations.'
    },
    {
      id: 'p-2',
      title: 'Unit Test Generator',
      description: 'Jest/React Testing Library 단위 테스트 생성',
      body: 'Write comprehensive unit tests for the following component/function using Jest and React Testing Library. Cover edge cases and error states.'
    }
  ],
  security: DEFAULT_SECURITY_CONFIG
};

const CLOUD_MODEL_OPTIONS = [
  {
    group: 'Google Gemini',
    models: [
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (권장)' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (고성능)' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (초고속)' }
    ]
  },
  {
    group: 'DeepSeek & 오픈소스',
    models: [
      { id: 'deepseek-r1', name: 'DeepSeek R1 (추론)' },
      { id: 'deepseek-v3', name: 'DeepSeek V3 (671B)' },
      { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder 32B' }
    ]
  },
  {
    group: 'OpenAI & Anthropic',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' }
    ]
  }
];

const DEFAULT_LOCAL_MODEL_OPTIONS = [
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B (Ollama / vLLM)' },
  { id: 'deepseek-r1-8b-local', name: 'DeepSeek R1 8B (Ollama Local)' },
  { id: 'deepseek-r1', name: 'DeepSeek R1 70B (Server / Cluster)' },
  { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder (32B / 7B)' },
  { id: 'mistral-7b-local', name: 'Mistral 7B Instruct' },
  { id: 'gemma2:9b', name: 'Gemma 2 9B' },
  { id: 'custom', name: '직접 입력 (Custom Model)' }
];

export interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ai-engine' | 'persona' | 'prompts' | 'theme' | 'integrations' | 'security' | 'ghost-writer';
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  onApplyPrompt: (promptBody: string) => void;
  modelOptions?: { id: string; name: string; tier: string }[];
  
  // AI Engine & Provider props
  provider?: 'cloud' | 'local-pc' | 'local-server';
  onSelectProvider?: (provider: 'cloud' | 'local-pc' | 'local-server') => void;
  selectedModel?: string;
  onSelectModel?: (modelId: string, modelName?: string) => void;
  currentApiKey?: string;
  onUpdateApiKey?: (key: string) => void;
  currentEndpoint?: string;
  onUpdateEndpoint?: (endpoint: string) => void;
  isVerified?: boolean;
  onVerify?: () => void;
  isVerifying?: boolean;
  aiParameters?: AiInferenceParameters;
  onSaveParameters?: (params: AiInferenceParameters) => void;

  onToast?: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  onWipeAllData?: () => void;
  
  // Integrations & Accounts props
  googleUser?: GoogleUserProfile | null;
  onOpenGoogleAccount?: () => void;
  workspaceRootType?: 'local' | 'gdrive' | 'remote' | 'github';
  onOpenGoogleDrive?: () => void;
  remoteConfig?: RemoteConfig | null;
  onOpenRemoteSSH?: () => void;
  githubConfig?: GithubConfig | null;
  onOpenGithub?: () => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'ai-engine',
  preferences,
  onSave,
  onApplyPrompt,
  modelOptions,
  provider = 'cloud',
  onSelectProvider,
  selectedModel = 'gemini-3.7-flash',
  onSelectModel,
  currentApiKey = '',
  onUpdateApiKey = (_k: string) => {},
  currentEndpoint = 'http://localhost:11434',
  onUpdateEndpoint = (_e: string) => {},
  isVerified = false,
  onVerify = () => {},
  isVerifying = false,
  aiParameters,
  onSaveParameters,
  onToast = (_m: string, _t?: 'info' | 'success' | 'warn' | 'error') => {},
  onWipeAllData = () => {},
  googleUser = null,
  onOpenGoogleAccount,
  workspaceRootType = 'local',
  onOpenGoogleDrive,
  remoteConfig = null,
  onOpenRemoteSSH,
  githubConfig = null,
  onOpenGithub
}) => {
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);
  const [activeTab, setActiveTab] = useState<'ai-engine' | 'persona' | 'prompts' | 'theme' | 'integrations' | 'security' | 'ghost-writer'>('ai-engine');

  // AI Engine State
  const [localProviderType, setLocalProviderType] = useState<'cloud' | 'local'>(
    provider === 'cloud' ? 'cloud' : 'local'
  );
  const [localApiKeyInput, setLocalApiKeyInput] = useState<string>(currentApiKey);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [localEndpointInput, setLocalEndpointInput] = useState<string>(currentEndpoint || 'http://localhost:11434');
  const [localSelectedModel, setLocalSelectedModel] = useState<string>(selectedModel);
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [isAdvancedParamsOpen, setIsAdvancedParamsOpen] = useState<boolean>(false);

  // Google Auth Token Status State
  const [googleTokenStatus, setGoogleTokenStatus] = useState<'connected' | 'expired' | 'disconnected'>('disconnected');
  const [googleExpiresAt, setGoogleExpiresAt] = useState<number | null>(null);

  // Auto-discovered local models
  const [discoveredModels, setDiscoveredModels] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingLocalModels, setIsLoadingLocalModels] = useState<boolean>(false);

  // AI Inference Parameters State
  const [localAiParams, setLocalAiParams] = useState<AiInferenceParameters>(() => {
    if (aiParameters) return aiParameters;
    try {
      const saved = localStorage.getItem('ai_podium_parameters');
      if (saved) return { ...DEFAULT_AI_PARAMETERS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_AI_PARAMETERS;
  });

  // Prompt Edit State
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [promptForm, setPromptForm] = useState({ title: '', description: '', body: '' });

  // Function to fetch available local Ollama models
  const fetchLocalModels = useCallback(async (endpointUrl: string) => {
    const cleanEndpoint = endpointUrl.trim().replace(/\/+$/, '');
    if (!cleanEndpoint) {
      setDiscoveredModels([]);
      return;
    }

    setIsLoadingLocalModels(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${cleanEndpoint}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.models) && data.models.length > 0) {
          const formatted = data.models.map((m: { name: string }) => ({
            id: m.name,
            name: `${m.name} (Ollama)`
          }));
          setDiscoveredModels(formatted);
          return;
        }
      }
      setDiscoveredModels([]);
    } catch {
      setDiscoveredModels([]);
    } finally {
      setIsLoadingLocalModels(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLocalPrefs({
        ...DEFAULT_PREFERENCES,
        ...preferences,
        aiPersona: { ...DEFAULT_PREFERENCES.aiPersona, ...(preferences.aiPersona || {}) },
        customPrompts: preferences.customPrompts || DEFAULT_PREFERENCES.customPrompts,
        security: { ...DEFAULT_SECURITY_CONFIG, ...(preferences.security || {}) }
      });
      setActiveTab(initialTab || 'ai-engine');
      setLocalProviderType(provider === 'cloud' ? 'cloud' : 'local');
      setLocalApiKeyInput(currentApiKey);
      setLocalEndpointInput(currentEndpoint || 'http://localhost:11434');
      setLocalSelectedModel(selectedModel);

      if (aiParameters) {
        setLocalAiParams(aiParameters);
      } else {
        try {
          const saved = localStorage.getItem('ai_podium_parameters');
          if (saved) setLocalAiParams({ ...DEFAULT_AI_PARAMETERS, ...JSON.parse(saved) });
        } catch {
          // ignore
        }
      }

      if (provider !== 'cloud' && currentEndpoint) {
        fetchLocalModels(currentEndpoint);
      }

      const tokenStat = googleDriveService.getTokenStatus();
      setGoogleTokenStatus(tokenStat);
      setGoogleExpiresAt(googleDriveService.getTokenExpiresAt());

      setEditingPrompt(null);
      setIsAddingPrompt(false);
    }
  }, [isOpen, initialTab, preferences, provider, currentApiKey, currentEndpoint, selectedModel, aiParameters, fetchLocalModels, googleUser]);

  useEffect(() => {
    if (isOpen) {
      applyThemeToDocument(
        localPrefs.compactness || 'dense',
        localPrefs.fontSize || 'md'
      );
    } else {
      applyThemeToDocument(
        preferences.compactness || 'dense',
        preferences.fontSize || 'md'
      );
    }
  }, [isOpen, localPrefs.compactness, localPrefs.fontSize, preferences]);

  if (!isOpen) return null;

  const handleSwitchProvider = (type: 'cloud' | 'local') => {
    setLocalProviderType(type);
    if (type === 'cloud') {
      if (localSelectedModel.includes('local') || localSelectedModel.includes('llama') || localSelectedModel === 'custom') {
        setLocalSelectedModel('gemini-3.7-flash');
      }
    } else {
      if (localSelectedModel.includes('gemini') || localSelectedModel.includes('gpt') || localSelectedModel.includes('claude')) {
        setLocalSelectedModel('llama-3.3-70b');
      }
      if (localEndpointInput) {
        fetchLocalModels(localEndpointInput);
      }
    }
  };

  // Preset Handlers
  const handleApplyPreset = (preset: 'precision' | 'balanced' | 'creative') => {
    if (preset === 'precision') {
      setLocalAiParams((prev) => ({
        ...prev,
        temperature: 0.2,
        topP: 0.85,
        maxTokens: 4096
      }));
      onToast('🎯 정밀/코딩 모드 적용 (온도 0.20, 토큰 4,096)', 'info');
    } else if (preset === 'creative') {
      setLocalAiParams((prev) => ({
        ...prev,
        temperature: 1.2,
        topP: 0.95,
        maxTokens: 8192
      }));
      onToast('✨ 창의적 모드 적용 (온도 1.20, 토큰 8,192)', 'info');
    } else {
      setLocalAiParams((prev) => ({
        ...prev,
        temperature: 0.7,
        topP: 0.95,
        maxTokens: 4096
      }));
      onToast('⚖️ 균형 기본 모드 적용 (온도 0.70, 토큰 4,096)', 'info');
    }
  };

  const getActivePreset = (): 'precision' | 'balanced' | 'creative' | 'custom' => {
    if (Math.abs(localAiParams.temperature - 0.2) < 0.05 && localAiParams.topP <= 0.9) return 'precision';
    if (Math.abs(localAiParams.temperature - 1.2) < 0.05 && localAiParams.maxTokens >= 8000) return 'creative';
    if (Math.abs(localAiParams.temperature - 0.7) < 0.05 && localAiParams.maxTokens === 4096) return 'balanced';
    return 'custom';
  };

  const currentPreset = getActivePreset();

  // Combine discovered models with default local models
  const localModelOptions = [
    ...discoveredModels,
    ...DEFAULT_LOCAL_MODEL_OPTIONS.filter(
      (m) => !discoveredModels.some((dm) => dm.id === m.id)
    )
  ];

  const handleSave = () => {
    // 1. Save general preferences
    onSave(localPrefs);

    // 2. Save Provider & Connection
    const targetProvider = localProviderType === 'cloud' ? 'cloud' : 'local-pc';
    if (onSelectProvider) {
      onSelectProvider(targetProvider);
    }
    if (onUpdateApiKey) {
      onUpdateApiKey(localApiKeyInput.trim());
    }
    if (onUpdateEndpoint) {
      onUpdateEndpoint(localEndpointInput.trim() || 'http://localhost:11434');
    }

    // 3. Save Active Model
    const modelToSet = localSelectedModel === 'custom' && customModelInput.trim() ? customModelInput.trim() : localSelectedModel;
    if (onSelectModel) {
      onSelectModel(modelToSet);
    }

    // 4. Save AI Inference Parameters
    try {
      localStorage.setItem('ai_podium_parameters', JSON.stringify(localAiParams));
    } catch {
      // ignore
    }
    if (onSaveParameters) {
      onSaveParameters(localAiParams);
    }

    onToast('✓ 환경 설정 및 AI 엔진 설정이 저장되었습니다.', 'success');
    onClose();
  };

  const handleTriggerVerify = () => {
    if (localProviderType === 'cloud') {
      const key = localApiKeyInput.trim();
      if (!key) {
        onToast('API Key를 입력해주세요.', 'warn');
        return;
      }
      onUpdateApiKey(key);
      if (onSelectProvider) onSelectProvider('cloud');
    } else {
      const ep = localEndpointInput.trim() || 'http://localhost:11434';
      onUpdateEndpoint(ep);
      if (onSelectProvider) onSelectProvider('local-pc');
    }
    onVerify();
  };

  const handleSavePrompt = () => {
    if (!promptForm.title || !promptForm.body) return;

    if (isAddingPrompt) {
      const newPrompt: PromptTemplate = {
        id: `p-${Date.now()}`,
        ...promptForm
      };
      setLocalPrefs({ ...localPrefs, customPrompts: [...localPrefs.customPrompts, newPrompt] });
    } else if (editingPrompt) {
      setLocalPrefs({
        ...localPrefs,
        customPrompts: localPrefs.customPrompts.map((p) =>
          p.id === editingPrompt.id ? { ...p, ...promptForm } : p
        )
      });
    }
    setEditingPrompt(null);
    setIsAddingPrompt(false);
    setPromptForm({ title: '', description: '', body: '' });
  };

  const handleDeletePrompt = (id: string) => {
    setLocalPrefs({
      ...localPrefs,
      customPrompts: localPrefs.customPrompts.filter((p) => p.id !== id)
    });
  };

  const handleEditPrompt = (prompt: PromptTemplate) => {
    setEditingPrompt(prompt);
    setIsAddingPrompt(false);
    setPromptForm({ title: prompt.title, description: prompt.description, body: prompt.body });
  };

  const startAddingPrompt = () => {
    setIsAddingPrompt(true);
    setEditingPrompt(null);
    setPromptForm({ title: '', description: '', body: '' });
  };

  return (
    <AnimatePresence>
      <div
        id="preferences-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs text-xs"
        onClick={onClose}
      >
        <motion.div
          id="preferences-modal-container"
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.15 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-3xl h-[600px] max-h-[90vh] flex flex-col overflow-hidden text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#27272a] text-[#38bdf8] border border-[#3f3f46]">
                <Settings className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="font-semibold text-xs text-slate-200 tracking-wide">
                  환경 설정
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#27272a] rounded transition cursor-pointer"
              title="닫기 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-56 bg-[#18181b] border-r border-[#27272a] p-2 flex flex-col gap-1 shrink-0 select-none overflow-y-auto min-h-0">
              {/* TAB: AI Engine & Provider */}
              <button
                type="button"
                onClick={() => setActiveTab('ai-engine')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'ai-engine'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Cpu className="w-3.5 h-3.5 shrink-0 text-[#38bdf8]" />
                  <span className="truncate">AI 엔진 설정</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e1e24] text-slate-400 border border-[#2e3142]/60 shrink-0 ml-1">
                  {localProviderType === 'cloud' ? '클라우드' : '로컬'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('persona')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'persona'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">페르소나</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ghost-writer')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'ghost-writer'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Ghost className="w-3.5 h-3.5 shrink-0 text-[#38bdf8]" />
                  <span className="truncate">고스트 라이터</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ml-1 ${
                    localPrefs.ghostWriterLevel && localPrefs.ghostWriterLevel !== 'off'
                      ? 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30 font-semibold'
                      : 'bg-[#1e1e24] text-slate-500 border-[#2e3142]/60'
                  }`}
                >
                  {localPrefs.ghostWriterLevel && localPrefs.ghostWriterLevel !== 'off'
                    ? `${localPrefs.ghostWriterLevel}%`
                    : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('prompts')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'prompts'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">프롬프트</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e1e24] text-slate-400 border border-[#2e3142]/60 shrink-0 ml-1">
                  {localPrefs.customPrompts?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('theme')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'theme'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">테마 및 레이아웃</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e1e24] text-slate-400 border border-[#2e3142]/60 shrink-0 ml-1">
                  {localPrefs.compactness === 'dense' ? '조밀' : '여유'}
                </span>
              </button>

              {(() => {
                const isGoogleConnected = googleTokenStatus === 'connected' && !!googleUser;
                const isGithubConnected = !!(githubConfig?.owner && githubConfig?.repo) || !!githubConfig?.token;
                const isSshConnected = !!remoteConfig?.host;
                const connectedCount = [isGoogleConnected, isGithubConnected, isSshConnected].filter(Boolean).length;
                return (
                  <button
                    type="button"
                    onClick={() => setActiveTab('integrations')}
                    className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                      activeTab === 'integrations'
                        ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">계정 연동</span>
                    </div>
                    {connectedCount > 0 ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shrink-0 ml-1">
                        {connectedCount} 연결
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e1e24] text-slate-500 border border-[#2e3142]/60 shrink-0 ml-1">
                        미연결
                      </span>
                    )}
                  </button>
                );
              })()}

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">보안 및 볼트</span>
                </div>
              </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-5 bg-[#18181b] min-h-0">
              {/* TAB 0: AI Engine & Provider */}
              {activeTab === 'ai-engine' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 1. Mode Switcher: Cloud API vs Local Ollama */}
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#27272a]/60">
                    <label className="text-xs font-medium text-slate-300">엔진 제공자</label>
                    <div className="inline-flex p-0.5 bg-[#18181b] border border-[#27272a] rounded-md">
                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('cloud')}
                        className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          localProviderType === 'cloud'
                            ? 'bg-[#27272a] text-white shadow-xs font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-[#38bdf8]" />
                        <span>클라우드 API</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('local')}
                        className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          localProviderType === 'local'
                            ? 'bg-[#27272a] text-white shadow-xs font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Server className="w-3 h-3 text-[#38bdf8]" />
                        <span>로컬 Ollama / 프라이빗 서버</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Provider Specific Credentials / Endpoint */}
                  {localProviderType === 'cloud' ? (
                    <div className="space-y-3 divide-y divide-[#27272a]/60">
                      {/* Cloud API Key */}
                      <div className="pt-2 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <span>API 키</span>
                            {isVerified && provider === 'cloud' ? (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-mono">
                                <CheckCircle className="w-2.5 h-2.5" /> 인증됨
                              </span>
                            ) : null}
                          </label>
                        </div>

                        <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                          <div className="relative flex-1">
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              value={localApiKeyInput}
                              onChange={(e) => setLocalApiKeyInput(e.target.value)}
                              placeholder="AIzaSy... 또는 sk-..."
                              className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#38bdf8] rounded px-3 pr-8 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                            >
                              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleTriggerVerify}
                            disabled={isVerifying}
                            className="px-3 py-1.5 rounded bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <PlugZap className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                            <span>{isVerifying ? '검증 중' : '검증'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Cloud Model Selector */}
                      <div className="pt-3 flex items-center justify-between gap-4">
                        <label className="text-xs font-medium text-slate-300">기본 모델</label>
                        <div className="relative max-w-sm w-full">
                          <select
                            value={localSelectedModel}
                            onChange={(e) => setLocalSelectedModel(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#38bdf8] rounded px-3 py-1.5 text-xs text-zinc-200 outline-none transition appearance-none cursor-pointer pr-8"
                          >
                            {CLOUD_MODEL_OPTIONS.map((grp) => (
                              <optgroup key={grp.group} label={grp.group} className="bg-[#18181b] text-zinc-400 font-semibold">
                                {grp.models.map((m) => (
                                  <option key={m.id} value={m.id} className="bg-[#18181b] text-zinc-200 py-1 font-normal">
                                    {m.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 divide-y divide-[#27272a]/60">
                      {/* Local Endpoint */}
                      <div className="pt-2 flex items-center justify-between gap-4">
                        <label className="text-xs font-medium text-slate-300">엔드포인트 URL</label>
                        <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                          <input
                            type="text"
                            value={localEndpointInput}
                            onChange={(e) => setLocalEndpointInput(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="flex-1 bg-[#18181b] border border-[#27272a] focus:border-[#38bdf8] rounded px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={handleTriggerVerify}
                            disabled={isVerifying}
                            className="px-3 py-1.5 rounded bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <PlugZap className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                            <span>{isVerifying ? '연결 중' : '검증'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Local Model Selector */}
                      <div className="pt-3 flex items-center justify-between gap-4">
                        <label className="text-xs font-medium text-slate-300">로컬 모델</label>
                        <div className="relative max-w-sm w-full">
                          <select
                            value={localSelectedModel}
                            onChange={(e) => setLocalSelectedModel(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#38bdf8] rounded px-3 py-1.5 text-xs text-zinc-200 outline-none transition appearance-none cursor-pointer pr-8"
                          >
                            {localModelOptions.map((m) => (
                              <option key={m.id} value={m.id} className="bg-[#18181b] text-zinc-200 py-1">
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Inference Mode Presets */}
                  <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#27272a]/60">
                    <label className="text-xs font-medium text-slate-300">추론 프리셋</label>
                    <div className="inline-flex p-0.5 bg-[#18181b] border border-[#27272a] rounded-md">
                      {[
                        { id: 'precision', label: '정밀·코드' },
                        { id: 'balanced', label: '균형' },
                        { id: 'creative', label: '창의적' }
                      ].map((p) => {
                        const isSelected = currentPreset === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleApplyPreset(p.id as any)}
                            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#27272a] text-white shadow-xs font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Collapsible Advanced Parameters */}
                  <div className="pt-2 border-t border-[#27272a]/60">
                    <button
                      type="button"
                      onClick={() => setIsAdvancedParamsOpen(!isAdvancedParamsOpen)}
                      className="w-full flex items-center justify-between py-2 text-slate-400 hover:text-slate-200 transition cursor-pointer text-xs font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>세부 생성 파라미터</span>
                      </span>
                      {isAdvancedParamsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isAdvancedParamsOpen && (
                      <div className="mt-2 space-y-3 pt-2 divide-y divide-[#27272a]/40 animate-in fade-in duration-150">
                        {/* Temperature Slider */}
                        <div className="pt-2 flex items-center justify-between gap-4">
                          <span className="text-xs text-slate-300">Temperature</span>
                          <div className="flex items-center gap-3 w-64">
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.05"
                              value={localAiParams.temperature}
                              onChange={(e) =>
                                setLocalAiParams((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                              }
                              className="w-full accent-[#0284c7] cursor-pointer h-1.5 bg-[#27272a] rounded appearance-none"
                            />
                            <span className="font-mono text-xs font-semibold text-[#38bdf8] w-10 text-right">
                              {localAiParams.temperature.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Top-P Slider */}
                        <div className="pt-2 flex items-center justify-between gap-4">
                          <span className="text-xs text-slate-300">Top-P</span>
                          <div className="flex items-center gap-3 w-64">
                            <input
                              type="range"
                              min="0.05"
                              max="1.0"
                              step="0.05"
                              value={localAiParams.topP}
                              onChange={(e) =>
                                setLocalAiParams((prev) => ({ ...prev, topP: parseFloat(e.target.value) }))
                              }
                              className="w-full accent-[#0284c7] cursor-pointer h-1.5 bg-[#27272a] rounded appearance-none"
                            />
                            <span className="font-mono text-xs font-semibold text-[#38bdf8] w-10 text-right">
                              {localAiParams.topP.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Max Tokens Slider */}
                        <div className="pt-2 flex items-center justify-between gap-4">
                          <span className="text-xs text-slate-300">Max Tokens</span>
                          <div className="flex items-center gap-3 w-64">
                            <input
                              type="range"
                              min="512"
                              max="16384"
                              step="512"
                              value={localAiParams.maxTokens}
                              onChange={(e) =>
                                setLocalAiParams((prev) => ({ ...prev, maxTokens: parseInt(e.target.value, 10) }))
                              }
                              className="w-full accent-[#0284c7] cursor-pointer h-1.5 bg-[#27272a] rounded appearance-none"
                            />
                            <span className="font-mono text-xs font-semibold text-[#38bdf8] w-10 text-right">
                              {localAiParams.maxTokens}
                            </span>
                          </div>
                        </div>

                        {/* Streaming Checkbox */}
                        <div className="pt-2 flex items-center justify-between gap-4">
                          <span className="text-xs text-slate-300">스트리밍 응답</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localAiParams.streamEnabled}
                              onChange={(e) =>
                                setLocalAiParams((prev) => ({ ...prev, streamEnabled: e.target.checked }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0284c7]"></div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 1: AI Persona */}
              {activeTab === 'persona' && (
                <div className="space-y-4 animate-in fade-in duration-150 flex flex-col h-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Row 1: AI Name */}
                    <div className="bg-[#1c1d24] border border-[#27272a] rounded-lg p-3">
                      <label className="text-xs font-semibold text-slate-200 block mb-1">어시스턴트 이름</label>
                      <p className="text-[11px] text-slate-400 mb-2">대화 및 시스템 출력 시 호칭</p>
                      <input
                        type="text"
                        value={localPrefs.aiPersona.name}
                        onChange={(e) =>
                          setLocalPrefs({
                            ...localPrefs,
                            aiPersona: { ...localPrefs.aiPersona, name: e.target.value }
                          })
                        }
                        placeholder="Podium Assistant"
                        className="w-full bg-[#141417] border border-[#2e3142] rounded px-3 py-1.5 text-xs text-zinc-200 focus:border-[#38bdf8] outline-none transition"
                      />
                    </div>

                    {/* Row 2: Role / Tone */}
                    <div className="bg-[#1c1d24] border border-[#27272a] rounded-lg p-3">
                      <label className="text-xs font-semibold text-slate-200 block mb-1">역할 및 어조</label>
                      <p className="text-[11px] text-slate-400 mb-2">응답의 전문성 및 커뮤니케이션 톤</p>
                      <input
                        type="text"
                        value={localPrefs.aiPersona.role}
                        onChange={(e) =>
                          setLocalPrefs({
                            ...localPrefs,
                            aiPersona: { ...localPrefs.aiPersona, role: e.target.value }
                          })
                        }
                        placeholder="Professional Software Engineer"
                        className="w-full bg-[#141417] border border-[#2e3142] rounded px-3 py-1.5 text-xs text-zinc-200 focus:border-[#38bdf8] outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Row 3: System Instruction */}
                  <div className="bg-[#1c1d24] border border-[#27272a] rounded-lg p-3.5 flex-1 flex flex-col min-h-[260px]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-200 block">시스템 지침 (System Instructions)</label>
                        <p className="text-[11px] text-slate-400">AI가 코드 작성 및 질의응답 시 최우선 준수할 규칙</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setLocalPrefs({
                            ...localPrefs,
                            aiPersona: {
                              ...localPrefs.aiPersona,
                              systemInstruction: DEFAULT_PREFERENCES.aiPersona.systemInstruction
                            }
                          })
                        }
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition px-2 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46]/50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>기본값 복원</span>
                      </button>
                    </div>
                    <textarea
                      value={localPrefs.aiPersona.systemInstruction}
                      onChange={(e) =>
                        setLocalPrefs({
                          ...localPrefs,
                          aiPersona: { ...localPrefs.aiPersona, systemInstruction: e.target.value }
                        })
                      }
                      className="w-full flex-1 min-h-[160px] bg-[#141417] border border-[#2e3142] rounded p-3 text-xs font-mono text-zinc-200 focus:border-[#38bdf8] outline-none transition resize-none leading-relaxed"
                      placeholder="AI에게 전달할 프롬프트 지침 입력..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Custom Prompts Library */}
              {activeTab === 'prompts' && (
                <div className="space-y-3 animate-in fade-in duration-150 flex flex-col h-full">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272a]/60 shrink-0">
                    <span className="text-xs font-medium text-slate-300">프롬프트 라이브러리</span>
                    {!(isAddingPrompt || editingPrompt) && (
                      <button
                        type="button"
                        onClick={startAddingPrompt}
                        className="px-2.5 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium rounded flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>추가</span>
                      </button>
                    )}
                  </div>

                  {isAddingPrompt || editingPrompt ? (
                    <div className="bg-[#18181b] border border-[#27272a] rounded p-3 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#27272a]">
                        <span className="text-xs font-semibold text-[#38bdf8]">
                          {isAddingPrompt ? '새 프롬프트 작성' : '프롬프트 수정'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPrompt(false);
                            setEditingPrompt(null);
                          }}
                          className="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 font-medium">제목</label>
                        <input
                          type="text"
                          value={promptForm.title}
                          onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })}
                          placeholder="예: Code Reviewer"
                          className="w-full bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-[#38bdf8]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 font-medium">설명</label>
                        <input
                          type="text"
                          value={promptForm.description}
                          onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                          placeholder="템플릿의 용도"
                          className="w-full bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-[#38bdf8]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 font-medium">프롬프트 내용</label>
                        <textarea
                          rows={4}
                          value={promptForm.body}
                          onChange={(e) => setPromptForm({ ...promptForm, body: e.target.value })}
                          placeholder="AI에게 전달할 메시지 내용..."
                          className="w-full bg-[#18181b] border border-[#27272a] rounded p-2 text-xs font-mono text-slate-200 outline-none focus:border-[#38bdf8] resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPrompt(false);
                            setEditingPrompt(null);
                          }}
                          className="px-3 py-1 bg-[#27272a] hover:bg-[#3f3f46] text-slate-300 rounded text-xs transition cursor-pointer"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePrompt}
                          disabled={!promptForm.title || !promptForm.body}
                          className="px-3 py-1 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white rounded text-xs font-medium transition cursor-pointer"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                      {localPrefs.customPrompts.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                          <p className="text-xs">등록된 프롬프트 템플릿이 없습니다.</p>
                          <button
                            type="button"
                            onClick={startAddingPrompt}
                            className="mt-2 text-[#38bdf8] hover:underline text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>첫 번째 템플릿 만들기</span>
                          </button>
                        </div>
                      ) : (
                        localPrefs.customPrompts.map((prompt) => (
                          <div
                            key={prompt.id}
                            className="p-3 bg-[#18181b] border border-[#27272a] rounded hover:border-[#3f3f46] transition flex items-start justify-between gap-3 group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-slate-200">{prompt.title}</span>
                                {prompt.description && (
                                  <span className="text-[10px] text-slate-400 bg-[#27272a] px-1.5 py-0.5 rounded border border-[#27272a] truncate">
                                    {prompt.description}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono mt-1.5 line-clamp-2 bg-[#18181b] p-2 rounded border border-[#27272a]/60">
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
                                className="p-1.5 rounded bg-[#27272a] hover:bg-[#0284c7] text-[#38bdf8] hover:text-white transition cursor-pointer"
                                title="이 프롬프트 즉시 대화창에 삽입"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditPrompt(prompt)}
                                className="p-1.5 rounded hover:bg-[#27272a] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                                title="수정"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePrompt(prompt.id)}
                                className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Theme & Layout */}
              {activeTab === 'theme' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="divide-y divide-[#2A2D3D]">
                    {/* 1. UI Font Size Segmented Control */}
                    <div className="py-3 flex items-center justify-between gap-4 first:pt-0">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">글꼴 크기</div>
                        <div className="text-[0.6875rem] text-slate-400">에디터 및 인터페이스 텍스트 크기</div>
                      </div>
                      <div className="inline-flex p-0.5 bg-[#121318] border border-[#2e3142] rounded-md">
                        {[
                          { id: 'sm', label: '작게' },
                          { id: 'md', label: '보통' },
                          { id: 'lg', label: '크게' },
                          { id: 'xl', label: '아주 크게' }
                        ].map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              const updated = { ...localPrefs, fontSize: id as any };
                              setLocalPrefs(updated);
                              applyThemeToDocument(updated.compactness, id as any);
                            }}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                              localPrefs.fontSize === id
                                ? 'bg-[#6366f1] text-white shadow-xs font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Layout Compactness Segmented Control */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">레이아웃 밀도</div>
                        <div className="text-[0.6875rem] text-slate-400">화면 요소들의 여백 간격</div>
                      </div>
                      <div className="inline-flex p-0.5 bg-[#121318] border border-[#2e3142] rounded-md">
                        {[
                          { id: 'dense', label: '조밀하게' },
                          { id: 'spacious', label: '여유롭게' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              const updated = { ...localPrefs, compactness: item.id as any };
                              setLocalPrefs(updated);
                              applyThemeToDocument(item.id as any, updated.fontSize);
                            }}
                            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                              localPrefs.compactness === item.id
                                ? 'bg-[#6366f1] text-white shadow-xs font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Integrations & Accounts */}
              {activeTab === 'integrations' && (
                <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272a]/60">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200">외부 계정 및 작업 영역 연동</h3>
                      <p className="text-[11px] text-slate-400">클라우드 드라이브, 깃허브 및 원격 서버 작업 환경을 연결합니다.</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {/* Item 1: Google Account (Drive + Workspace Unified) */}
                    {(() => {
                      const isConnected = googleTokenStatus === 'connected' && !!googleUser;
                      const isExpired = googleTokenStatus === 'expired';
                      const isDriveMounted = workspaceRootType === 'gdrive';

                      return (
                        <div className="bg-[#1c1d24] border border-[#27272a] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#38bdf8]/30 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#27272a] flex items-center justify-center shrink-0 border border-[#3f3f46]/40 text-[#38bdf8]">
                              <Globe className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-slate-200">Google 계정</span>
                                {isConnected ? (
                                  <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-semibold">
                                    연결됨
                                  </span>
                                ) : isExpired ? (
                                  <span className="text-[10px] text-amber-300 font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-semibold">
                                    토큰 만료
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-[#27272a] border border-[#3f3f46]/40">
                                    미연결
                                  </span>
                                )}
                                {isConnected && isDriveMounted && (
                                  <span className="text-[10px] text-cyan-400 font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                                    드라이브 마운트됨
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {isConnected && googleUser ? (
                                  <span className="font-mono text-slate-300">{googleUser.email}</span>
                                ) : (
                                  'Google Drive 파일 동기화 및 Docs · Sheets · Calendar 연동'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {isConnected ? (
                              <>
                                <button
                                  type="button"
                                  onClick={onOpenGoogleDrive}
                                  className="px-2.5 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer border border-[#3f3f46]/50 flex items-center gap-1.5 whitespace-nowrap"
                                  title="Google Drive 작업 영역 폴더 선택"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>드라이브 선택</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={onOpenGoogleAccount}
                                  className="px-2.5 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer border border-[#3f3f46]/50 flex items-center gap-1.5 whitespace-nowrap"
                                  title="Google 계정 및 권한 설정"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-[#38bdf8]" />
                                  <span>계정 관리</span>
                                </button>
                              </>
                            ) : isExpired ? (
                              <button
                                type="button"
                                onClick={onOpenGoogleAccount}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition cursor-pointer border border-amber-500 flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>토큰 재인증</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={onOpenGoogleAccount}
                                className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer border border-[#3f3f46]/50 flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-[#38bdf8]" />
                                <span>Google 로그인</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Item 2: GitHub */}
                    {(() => {
                      const isConnected = !!(githubConfig?.owner && githubConfig?.repo);
                      const hasPat = !!githubConfig?.token;

                      return (
                        <div className="bg-[#1c1d24] border border-[#27272a] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#38bdf8]/30 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#27272a] flex items-center justify-center shrink-0 border border-[#3f3f46]/40 text-purple-400">
                              <Github className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-slate-200">GitHub</span>
                                {isConnected ? (
                                  <span className="text-[10px] text-purple-400 font-mono px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 font-semibold">
                                    연결됨
                                  </span>
                                ) : hasPat ? (
                                  <span className="text-[10px] text-cyan-400 font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                                    PAT 등록됨
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-[#27272a] border border-[#3f3f46]/40">
                                    미연결
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {isConnected ? (
                                  <span className="font-mono text-purple-300">{githubConfig?.owner}/{githubConfig?.repo}</span>
                                ) : (
                                  '원격 저장소 커밋, 푸시, 브랜치 관리 및 동기화'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={onOpenGithub}
                              className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer border border-[#3f3f46]/50 flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Github className="w-3.5 h-3.5 text-purple-400" />
                              <span>{isConnected ? '저장소 관리' : '연결 설정'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Item 3: Remote SSH / SFTP */}
                    {(() => {
                      const isConnected = !!remoteConfig?.host;

                      return (
                        <div className="bg-[#1c1d24] border border-[#27272a] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#38bdf8]/30 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#27272a] flex items-center justify-center shrink-0 border border-[#3f3f46]/40 text-[#38bdf8]">
                              <Server className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-slate-200">원격 SSH / SFTP</span>
                                {isConnected ? (
                                  <span className="text-[10px] text-sky-400 font-mono px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 font-semibold">
                                    연결됨
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-[#27272a] border border-[#3f3f46]/40">
                                    미연결
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {isConnected ? (
                                  <span className="font-mono text-sky-300">
                                    {remoteConfig?.username || 'root'}@{remoteConfig?.host}:{remoteConfig?.port || 22}
                                  </span>
                                ) : (
                                  '원격 리눅스 서버 터미널 및 SFTP 파일 시스템 탐색'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={onOpenRemoteSSH}
                              className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer border border-[#3f3f46]/50 flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Server className="w-3.5 h-3.5 text-[#38bdf8]" />
                              <span>{isConnected ? '서버 관리' : '서버 설정'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 5: Security & Vault */}
              {activeTab === 'security' && (
                <SecuritySettings
                  securityConfig={localPrefs.security || DEFAULT_SECURITY_CONFIG}
                  onUpdateSecurityConfig={(newSec) => setLocalPrefs({ ...localPrefs, security: newSec })}
                  currentApiKey={currentApiKey}
                  onUpdateApiKey={onUpdateApiKey}
                  currentEndpoint={currentEndpoint}
                  onUpdateEndpoint={onUpdateEndpoint}
                  onToast={onToast}
                  onWipeAllData={onWipeAllData}
                />
              )}

              {/* TAB 6: Ghost Writer Mode */}
              {activeTab === 'ghost-writer' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-3.5 divide-y divide-[#27272a]/60">
                    {/* Mode & Level Selection */}
                    <div className="flex items-center justify-between gap-4 pt-1 first:pt-0">
                      <label className="text-xs font-medium text-slate-300">작동 수준</label>
                      <div className="flex rounded bg-[#18181b] p-0.5 border border-[#27272a]">
                        {[
                          { id: 'off', label: '사용 안 함' },
                          { id: '30', label: '30%' },
                          { id: '50', label: '50%' },
                          { id: '70', label: '70%' },
                          { id: '100', label: '100%' },
                        ].map((lvl) => {
                          const isSelected = (!localPrefs.ghostWriterLevel && lvl.id === 'off') || localPrefs.ghostWriterLevel === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => setLocalPrefs({ ...localPrefs, ghostWriterLevel: lvl.id as any })}
                              className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#27272a] text-[#38bdf8] shadow-xs'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {lvl.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Translation Model Selection */}
                    <div className="flex items-center justify-between gap-4 pt-3">
                      <label className="text-xs font-medium text-slate-300">번역 모델</label>
                      <select
                        value={localPrefs.ghostWriterModel || 'gemini-3.7-flash'}
                        onChange={(e) => setLocalPrefs({ ...localPrefs, ghostWriterModel: e.target.value })}
                        className="w-64 bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-[#38bdf8] transition cursor-pointer"
                      >
                        <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                        <option value="deepseek-r1">DeepSeek R1</option>
                        <option value="qwen-2.5-coder">Qwen 2.5 Coder 32B</option>
                        <option value="llama-3.3-70b">Llama 3.3 70B</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#27272a] bg-[#18181b] flex justify-between items-center shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>설정은 로컬 스토리지에 안전하게 저장됩니다</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition cursor-pointer rounded hover:bg-[#27272a]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>저장 및 적용</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

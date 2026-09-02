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

export interface UserPreferences {
  themeAccent: string;
  themeMode: 'dark' | 'high-contrast' | 'slate';
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
  themeAccent: 'indigo',
  themeMode: 'dark',
  fontSize: 'md',
  compactness: 'dense',
  defaultModel: 'gemini-2.5-flash',
  ghostWriterLevel: 'off',
  ghostWriterModel: 'gemini-2.5-flash',
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
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (권장)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (고성능)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
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
  selectedModel = 'gemini-2.5-flash',
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
      document.documentElement.dataset.themeMode = localPrefs.themeMode;
      document.documentElement.dataset.compactness = localPrefs.compactness;

      const sizeMap = { sm: '14px', md: '16px', lg: '18px', xl: '20px' };
      document.documentElement.style.fontSize = sizeMap[localPrefs.fontSize] || '16px';
    } else {
      document.documentElement.dataset.themeMode = preferences.themeMode;
      document.documentElement.dataset.compactness = preferences.compactness;

      const sizeMap = { sm: '14px', md: '16px', lg: '18px', xl: '20px' };
      document.documentElement.style.fontSize = sizeMap[preferences.fontSize] || '16px';
    }
  }, [isOpen, localPrefs.themeMode, localPrefs.compactness, localPrefs.fontSize, preferences]);

  if (!isOpen) return null;

  const handleSwitchProvider = (type: 'cloud' | 'local') => {
    setLocalProviderType(type);
    if (type === 'cloud') {
      if (localSelectedModel.includes('local') || localSelectedModel.includes('llama') || localSelectedModel === 'custom') {
        setLocalSelectedModel('gemini-2.5-flash');
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

  const accents = [
    { id: 'indigo', name: 'Indigo', colorClass: 'bg-indigo-500' },
    { id: 'emerald', name: 'Emerald', colorClass: 'bg-emerald-500' },
    { id: 'rose', name: 'Rose', colorClass: 'bg-rose-500' },
    { id: 'amber', name: 'Amber', colorClass: 'bg-amber-500' },
    { id: 'blue', name: 'Blue', colorClass: 'bg-blue-500' },
    { id: 'purple', name: 'Purple', colorClass: 'bg-purple-500' }
  ];

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
          className="bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl w-full max-w-3xl h-[600px] flex flex-col overflow-hidden text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#27272a] text-[#38bdf8] border border-[#3f3f46]">
                <Settings className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-semibold text-xs text-slate-200 tracking-wide">
                Settings (환경 설정)
              </h2>
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
            <div className="w-52 bg-[#18181b] border-r border-[#27272a] p-2 flex flex-col gap-0.5 shrink-0 select-none overflow-y-auto">
              {/* TAB: AI Engine & Provider */}
              <button
                type="button"
                onClick={() => setActiveTab('ai-engine')}
                className={`w-full flex items-center justify-start text-left gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'ai-engine'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 shrink-0 text-[#38bdf8]" />
                <span className="truncate">AI Engine & Provider</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('persona')}
                className={`w-full flex items-center justify-start text-left gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'persona'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <Bot className="w-3.5 h-3.5 shrink-0" />
                <span>AI Persona</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ghost-writer')}
                className={`w-full flex items-center justify-start text-left gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'ghost-writer'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <Ghost className="w-3.5 h-3.5 shrink-0 text-[#38bdf8]" />
                <span className="flex-1 truncate">Ghost Writer</span>
                {localPrefs.ghostWriterLevel && localPrefs.ghostWriterLevel !== 'off' && (
                  <span className="px-1 py-0.2 text-[9px] font-mono bg-[#27272a] text-[#38bdf8] rounded border border-[#3f3f46]">
                    {localPrefs.ghostWriterLevel}%
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('prompts')}
                className={`w-full flex items-center justify-start text-left gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'prompts'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Prompt Library</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('theme')}
                className={`w-full flex items-center justify-start text-left gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'theme'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" />
                <span>Theme & Layout</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('integrations')}
                className={`w-full flex items-center justify-start text-left gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'integrations'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>Integrations & Accounts</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center justify-start text-left gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-[#27272a] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Security & Vault</span>
              </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-5 bg-[#18181b]">
              {/* TAB 0: AI Engine & Provider */}
              {activeTab === 'ai-engine' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 1. Mode Switcher: Cloud API vs Local Ollama */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-200">Engine Provider Mode</label>
                      <span className="text-[11px] text-zinc-400">클라우드 API 또는 로컬 서버 선택</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-[#202023] p-1 rounded border border-[#27272a]">
                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('cloud')}
                        className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded text-xs font-medium transition cursor-pointer ${
                          localProviderType === 'cloud'
                            ? 'bg-[#0284c7] text-white shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a]'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Cloud API (Gemini / OpenAI)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('local')}
                        className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded text-xs font-medium transition cursor-pointer ${
                          localProviderType === 'local'
                            ? 'bg-[#0284c7] text-white shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a]'
                        }`}
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>Local Ollama / Private Server</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Provider Specific Credentials / Endpoint */}
                  {localProviderType === 'cloud' ? (
                    <div className="space-y-3 p-3 bg-[#202023]/60 border border-[#27272a] rounded">
                      {/* Cloud API Key */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-[#38bdf8]" />
                            <span>Cloud API Key</span>
                          </label>
                          {isVerified && provider === 'cloud' ? (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-mono">
                              <CheckCircle className="w-2.5 h-2.5" /> 인증됨
                            </span>
                          ) : (
                            <a
                              href="https://aistudio.google.com/app/apikey"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#38bdf8] hover:underline flex items-center gap-0.5 text-[11px]"
                            >
                              <span>Google AI Studio 키 무료 발급</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              value={localApiKeyInput}
                              onChange={(e) => setLocalApiKeyInput(e.target.value)}
                              placeholder="Google AI Studio (AIzaSy...) 또는 OpenAI API Key"
                              className="w-full bg-[#18181b] border border-[#3f3f46] focus:border-[#38bdf8] rounded px-3 pr-8 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 outline-none transition"
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
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                          <span>Active Model (활성 클라우드 모델)</span>
                        </label>
                        <div className="relative">
                          <select
                            value={localSelectedModel}
                            onChange={(e) => setLocalSelectedModel(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#3f3f46] focus:border-[#38bdf8] rounded px-3 py-1.5 text-xs text-zinc-200 outline-none transition appearance-none cursor-pointer pr-8"
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
                    <div className="space-y-3 p-3 bg-[#202023]/60 border border-[#27272a] rounded">
                      {/* Local Endpoint */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5 text-[#38bdf8]" />
                            <span>Local Endpoint (IP / URL)</span>
                          </label>
                          {isVerified && provider !== 'cloud' ? (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-mono">
                              <CheckCircle className="w-2.5 h-2.5" /> 연결됨
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-mono">
                              <ShieldCheck className="w-2.5 h-2.5" /> 검증 대기
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={localEndpointInput}
                            onChange={(e) => setLocalEndpointInput(e.target.value)}
                            placeholder="http://localhost:11434 또는 http://IP:포트"
                            className="flex-1 bg-[#18181b] border border-[#3f3f46] focus:border-[#38bdf8] rounded px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 outline-none transition"
                          />

                          <button
                            type="button"
                            onClick={() => setLocalEndpointInput('http://localhost:11434')}
                            className="px-2.5 py-1.5 rounded bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 border border-[#3f3f46] text-xs font-mono transition cursor-pointer"
                            title="기본 로컬호스트 주소로 재설정"
                          >
                            localhost
                          </button>

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
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5 text-[#38bdf8]" />
                            <span>Active Local Model (로컬 모델 선택)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            {discoveredModels.length > 0 && (
                              <span className="text-[10px] text-emerald-400 font-mono">
                                ✓ {discoveredModels.length}개 탐지됨
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => fetchLocalModels(localEndpointInput)}
                              disabled={isLoadingLocalModels}
                              className="text-zinc-400 hover:text-[#38bdf8] flex items-center gap-1 text-[11px] cursor-pointer"
                              title="Ollama 모델 목록 새로고침"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${isLoadingLocalModels ? 'animate-spin' : ''}`} />
                              <span>태그 새로고침</span>
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <select
                            value={localSelectedModel}
                            onChange={(e) => setLocalSelectedModel(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#3f3f46] focus:border-[#38bdf8] rounded px-3 py-1.5 text-xs text-zinc-200 outline-none transition appearance-none cursor-pointer pr-8"
                          >
                            {localModelOptions.map((m) => (
                              <option key={m.id} value={m.id} className="bg-[#18181b] text-zinc-200 py-1">
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {localSelectedModel === 'custom' && (
                          <input
                            type="text"
                            value={customModelInput}
                            onChange={(e) => setCustomModelInput(e.target.value)}
                            placeholder="Ollama/vLLM 모델명 직접 입력 (예: gemma2:9b)"
                            className="w-full bg-[#18181b] border border-[#3f3f46] focus:border-[#38bdf8] rounded px-3 py-1.5 text-xs font-mono text-zinc-200 outline-none mt-1.5"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Inference Mode Presets */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Inference Preset (추론 프리셋)</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        T: {localAiParams.temperature.toFixed(2)} / Tok: {localAiParams.maxTokens >= 1024 ? `${localAiParams.maxTokens / 1024}k` : localAiParams.maxTokens}
                      </span>
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('precision')}
                        className={`p-2 rounded border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                          currentPreset === 'precision'
                            ? 'bg-[#27272a] border-[#38bdf8] text-[#38bdf8] font-semibold'
                            : 'bg-[#202023]/60 border-[#27272a] text-zinc-300 hover:bg-[#27272a] hover:text-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-semibold text-xs">
                          <Code2 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Precision / Code</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">정밀·코드 작성 (T: 0.20)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset('balanced')}
                        className={`p-2 rounded border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                          currentPreset === 'balanced'
                            ? 'bg-[#27272a] border-[#38bdf8] text-[#38bdf8] font-semibold'
                            : 'bg-[#202023]/60 border-[#27272a] text-zinc-300 hover:bg-[#27272a] hover:text-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-semibold text-xs">
                          <Scale className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Balanced</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">균형 권장값 (T: 0.70)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset('creative')}
                        className={`p-2 rounded border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                          currentPreset === 'creative'
                            ? 'bg-[#27272a] border-[#38bdf8] text-[#38bdf8] font-semibold'
                            : 'bg-[#202023]/60 border-[#27272a] text-zinc-300 hover:bg-[#27272a] hover:text-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-semibold text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Creative</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">창의적 아이디어 (T: 1.20)</span>
                      </button>
                    </div>
                  </div>

                  {/* 4. Collapsible Advanced Parameters Accordion */}
                  <div className="pt-1 border-t border-[#27272a]">
                    <button
                      type="button"
                      onClick={() => setIsAdvancedParamsOpen(!isAdvancedParamsOpen)}
                      className="w-full flex items-center justify-between py-2 px-3 rounded bg-[#202023] hover:bg-[#27272a] border border-[#27272a] text-zinc-300 hover:text-zinc-100 transition cursor-pointer text-xs font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Advanced Parameters (세부 생성 파라미터 조절)</span>
                      </span>
                      {isAdvancedParamsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </button>

                    {isAdvancedParamsOpen && (
                      <div className="mt-2 space-y-2.5 p-3 bg-[#202023]/60 rounded border border-[#27272a] animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-[10px] text-zinc-400 font-medium">개별 파라미터 슬라이더</span>
                          <button
                            type="button"
                            onClick={() => {
                              setLocalAiParams(DEFAULT_AI_PARAMETERS);
                              onToast('파라미터가 기본값으로 복원되었습니다.', 'info');
                            }}
                            className="px-2 py-0.5 rounded bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 border border-[#3f3f46] transition flex items-center gap-1 text-[10px] font-medium cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>초기화</span>
                          </button>
                        </div>

                        {/* Temperature Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-300">Temperature</span>
                            <span className="font-mono text-xs font-semibold text-[#38bdf8]">
                              {localAiParams.temperature.toFixed(2)}
                            </span>
                          </div>
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
                          <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                            <span>0.0 (결정론적/정밀)</span>
                            <span>1.0 (균형)</span>
                            <span>2.0 (창의적)</span>
                          </div>
                        </div>

                        {/* Top-P Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-300">Top-P Sampling</span>
                            <span className="font-mono text-xs font-semibold text-sky-400">
                              {localAiParams.topP.toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="1.0"
                            step="0.05"
                            value={localAiParams.topP}
                            onChange={(e) =>
                              setLocalAiParams((prev) => ({ ...prev, topP: parseFloat(e.target.value) }))
                            }
                            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-[#27272a] rounded appearance-none"
                          />
                        </div>

                        {/* Max Tokens Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-300">Max Output Tokens</span>
                            <span className="font-mono text-xs font-semibold text-amber-400">
                              {localAiParams.maxTokens.toLocaleString()}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="512"
                            max="16384"
                            step="512"
                            value={localAiParams.maxTokens}
                            onChange={(e) =>
                              setLocalAiParams((prev) => ({ ...prev, maxTokens: parseInt(e.target.value, 10) }))
                            }
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#27272a] rounded appearance-none"
                          />
                        </div>

                        {/* System Instruction */}
                        <div className="space-y-1 pt-1">
                          <label className="text-xs text-zinc-300 flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-emerald-400" />
                            <span>System Instruction</span>
                          </label>
                          <textarea
                            rows={2}
                            value={localAiParams.systemInstruction}
                            onChange={(e) =>
                              setLocalAiParams((prev) => ({ ...prev, systemInstruction: e.target.value }))
                            }
                            placeholder="AI 어시스턴트 역할 및 지침"
                            className="w-full bg-[#18181b] border border-[#3f3f46] focus:border-[#38bdf8] rounded p-2 text-xs text-zinc-200 outline-none leading-normal resize-y font-mono"
                          />
                        </div>

                        {/* Flags: Streaming & Reasoning */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2 rounded bg-[#18181b] border border-[#27272a] flex items-center justify-between">
                            <span className="text-xs text-zinc-300">스트리밍 생성</span>
                            <button
                              type="button"
                              onClick={() =>
                                setLocalAiParams((prev) => ({ ...prev, streamEnabled: !prev.streamEnabled }))
                              }
                              className={`w-8 h-4 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                                localAiParams.streamEnabled ? 'bg-[#0284c7] justify-end' : 'bg-[#27272a] justify-start'
                              }`}
                            >
                              <div className="w-3 h-3 rounded-full bg-white shadow-xs"></div>
                            </button>
                          </div>

                          <div className="p-2 rounded bg-[#18181b] border border-[#27272a] flex items-center justify-between">
                            <span className="text-xs text-zinc-300">추론 강도</span>
                            <select
                              value={localAiParams.reasoningEffort}
                              onChange={(e) =>
                                setLocalAiParams((prev) => ({
                                   ...prev,
                                  reasoningEffort: e.target.value as 'low' | 'medium' | 'high'
                                }))
                              }
                              className="bg-[#18181b] border border-[#3f3f46] rounded px-2 py-0.5 text-xs text-[#38bdf8] font-medium outline-none cursor-pointer"
                            >
                              <option value="low">낮음 (Fast)</option>
                              <option value="medium">보통 (Default)</option>
                              <option value="high">높음 (Deep)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 1: AI Persona */}
              {activeTab === 'persona' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-3.5 divide-y divide-[#27272a]">
                    {/* Row 1: AI Name */}
                    <div className="flex items-center justify-between gap-4 pt-2 first:pt-0">
                      <div>
                        <div className="text-xs font-semibold text-zinc-200">AI Name (어시스턴트 이름)</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">채팅 및 상단 바에 표시될 어시스턴트 이름</div>
                      </div>
                      <input
                        type="text"
                        value={localPrefs.aiPersona.name}
                        onChange={(e) =>
                          setLocalPrefs({
                            ...localPrefs,
                            aiPersona: { ...localPrefs.aiPersona, name: e.target.value }
                          })
                        }
                        placeholder="예: Podium Assistant"
                        className="w-64 bg-[#18181b] border border-[#3f3f46] rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:border-[#38bdf8] outline-none transition"
                      />
                    </div>

                    {/* Row 2: Role / Tone */}
                    <div className="flex items-center justify-between gap-4 pt-3.5">
                      <div>
                        <div className="text-xs font-semibold text-zinc-200">Role & Tone (역할 및 어조)</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">응답 스타일 및 전문가 역할 정의</div>
                      </div>
                      <input
                        type="text"
                        value={localPrefs.aiPersona.role}
                        onChange={(e) =>
                          setLocalPrefs({
                            ...localPrefs,
                            aiPersona: { ...localPrefs.aiPersona, role: e.target.value }
                          })
                        }
                        placeholder="예: Professional Software Engineer"
                        className="w-64 bg-[#18181b] border border-[#3f3f46] rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:border-[#38bdf8] outline-none transition"
                      />
                    </div>

                    {/* Row 3: System Instruction */}
                    <div className="space-y-2 pt-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-zinc-200">System Instruction (시스템 지침)</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">기본 AI 행동 규칙 및 서식 가이드라인</div>
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
                          className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>기본값 복원</span>
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        value={localPrefs.aiPersona.systemInstruction}
                        onChange={(e) =>
                          setLocalPrefs({
                            ...localPrefs,
                            aiPersona: { ...localPrefs.aiPersona, systemInstruction: e.target.value }
                          })
                        }
                        className="w-full bg-[#18181b] border border-[#3f3f46] rounded p-2.5 text-xs font-mono text-zinc-200 focus:border-[#38bdf8] outline-none transition resize-none leading-relaxed"
                        placeholder="AI에게 전달할 프롬프트 지침 입력..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Custom Prompts Library */}
              {activeTab === 'prompts' && (
                <div className="space-y-3.5 animate-in fade-in duration-150 flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-[#27272a] pb-2 shrink-0">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Prompt Library (프롬프트 템플릿)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        자주 사용하는 커스텀 프롬프트를 저장하고 대화창에 바로 적용합니다.
                      </p>
                    </div>
                    {!(isAddingPrompt || editingPrompt) && (
                      <button
                        type="button"
                        onClick={startAddingPrompt}
                        className="px-2.5 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium rounded flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>추가</span>
                      </button>
                    )}
                  </div>

                  {isAddingPrompt || editingPrompt ? (
                    <div className="bg-[#27272a]/30 border border-[#27272a] rounded p-3.5 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#27272a]">
                        <span className="text-xs font-semibold text-[#38bdf8]">
                          {isAddingPrompt ? '새 프롬프트 템플릿 작성' : '프롬프트 템플릿 수정'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPrompt(false);
                            setEditingPrompt(null);
                          }}
                          className="text-slate-400 hover:text-white p-0.5 rounded transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-medium">제목 (Title)</label>
                        <input
                          type="text"
                          value={promptForm.title}
                          onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })}
                          placeholder="예: Code Reviewer"
                          className="w-full bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-[#38bdf8]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-medium">설명 (Description)</label>
                        <input
                          type="text"
                          value={promptForm.description}
                          onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                          placeholder="템플릿의 용도를 간단히 설명하세요"
                          className="w-full bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-[#38bdf8]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-medium">프롬프트 본문 (Body)</label>
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
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
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
                            className="p-3 bg-[#27272a]/30 border border-[#27272a] rounded hover:border-slate-600 transition flex items-start justify-between gap-3 group"
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
                              <p className="text-[11px] text-slate-400 font-mono mt-1.5 line-clamp-2 bg-[#18181b] p-2 rounded border border-[#27272a]">
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
                                className="p-1.5 rounded bg-[#0284c7]/20 hover:bg-[#0284c7] text-[#38bdf8] hover:text-white transition cursor-pointer"
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
                  <div className="border-b border-[#27272a] pb-2">
                    <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>Theme & Layout Customization (테마 및 화면 밀도)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      색상 테마, 폰트 크기 및 작업 영역 밀도를 취향에 맞게 조정합니다.
                    </p>
                  </div>

                  {/* Accent Color Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300">Accent Color (강조 색상)</label>
                    <div className="grid grid-cols-6 gap-2">
                      {accents.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setLocalPrefs({ ...localPrefs, themeAccent: acc.id })}
                          className={`flex items-center justify-center gap-1.5 p-2 rounded border transition cursor-pointer ${
                            localPrefs.themeAccent === acc.id
                              ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50'
                              : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a]'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full ${acc.colorClass}`} />
                          <span className="text-[11px] font-medium text-slate-300">{acc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Mode */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium text-slate-300">Visual Mode (화면 대비 모드)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, themeMode: 'dark' })}
                        className={`p-2.5 rounded border text-left transition cursor-pointer ${
                          localPrefs.themeMode === 'dark'
                            ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="font-medium text-xs text-slate-200">Dark (기본)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">VS Code Slate 다크 톤</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, themeMode: 'slate' })}
                        className={`p-2.5 rounded border text-left transition cursor-pointer ${
                          localPrefs.themeMode === 'slate'
                            ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="font-medium text-xs text-slate-200">OLED Black</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">완전한 블랙 (0% 빛 반사)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, themeMode: 'high-contrast' })}
                        className={`p-2.5 rounded border text-left transition cursor-pointer ${
                          localPrefs.themeMode === 'high-contrast'
                            ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="font-medium text-xs text-slate-200">High Contrast</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">선명한 외곽선 및 고대비</div>
                      </button>
                    </div>
                  </div>

                  {/* UI Font Size */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium text-slate-300">UI Font Size (글꼴 크기)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setLocalPrefs({ ...localPrefs, fontSize: size })}
                          className={`p-2 rounded border text-center transition cursor-pointer uppercase text-xs font-medium ${
                            localPrefs.fontSize === size
                              ? 'bg-[#27272a] border-[#38bdf8] text-white ring-1 ring-[#38bdf8]/50'
                              : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                          }`}
                        >
                          {size} ({size === 'sm' ? '14px' : size === 'md' ? '16px' : size === 'lg' ? '18px' : '20px'})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Layout Compactness */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium text-slate-300">Layout Compactness (레이아웃 밀도)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, compactness: 'dense' })}
                        className={`p-2.5 rounded border text-left transition cursor-pointer ${
                          localPrefs.compactness === 'dense'
                            ? 'bg-[#27272a] border-[#38bdf8] text-white ring-1 ring-[#38bdf8]/50'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="font-medium text-xs text-slate-200">Dense (컴팩트 - 권장)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">화면을 최대한 효율적으로 활용</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, compactness: 'spacious' })}
                        className={`p-2.5 rounded border text-left transition cursor-pointer ${
                          localPrefs.compactness === 'spacious'
                            ? 'bg-[#27272a] border-[#38bdf8] text-white ring-1 ring-[#38bdf8]/50'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="font-medium text-xs text-slate-200">Spacious (여유로운 여백)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">터치 및 큰 모니터에 적합한 넓은 패딩</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Integrations & Accounts */}
              {activeTab === 'integrations' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-[#27272a] pb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Central Account Authentication Manager (원격 작업 공간 및 인증 관리)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Google Workspace OAuth, Google Drive, GitHub 저장소, 원격 SSH 서버 인증 토큰 및 작업 공간 연결을 중앙에서 통합 관리합니다.
                      </p>
                    </div>
                    <span className="text-[10px] bg-[#27272a] text-[#38bdf8] border border-[#27272a] px-2 py-0.5 rounded font-mono shrink-0">
                      Central Auth Hub
                    </span>
                  </div>

                  {/* 1. Remote Workspace Authentication Cards */}
                  <div className="space-y-2.5">
                    {/* Google Workspace & OAuth Account */}
                    <div className={`p-3 rounded border transition ${
                      googleTokenStatus === 'connected' && googleUser
                        ? 'bg-[#27272a]/30 border-[#27272a]'
                        : googleTokenStatus === 'expired'
                        ? 'bg-amber-950/20 border-amber-800/50'
                        : 'bg-[#27272a]/20 border-[#27272a]'
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded bg-[#0284c7]/20 text-[#38bdf8] flex items-center justify-center shrink-0 border border-[#0284c7]/30">
                            <Cloud className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-xs text-slate-200">Google Workspace & OAuth</span>
                              {googleTokenStatus === 'connected' && googleUser ? (
                                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded font-mono flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> 연결됨 ({googleUser.email})
                                </span>
                              ) : googleTokenStatus === 'expired' ? (
                                <span className="text-[10px] text-amber-300 bg-amber-950/90 border border-amber-600/80 px-1.5 py-0.2 rounded font-mono flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> 토큰 만료 (재인증 필요)
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 bg-[#27272a] border border-[#27272a] px-1.5 py-0.2 rounded font-mono">
                                  미연결
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {googleTokenStatus === 'connected' && googleUser
                                ? `인증 계정: ${googleUser.name || googleUser.email} (Google Calendar, Drive, Docs 통합 권한 활성)`
                                : googleTokenStatus === 'expired'
                                ? '보안 토큰이 만료되었습니다. Google Drive 및 Workspace 연동을 위해 재인증이 필요합니다.'
                                : 'Google Calendar, Drive SSOT, Docs 등과 실시간 연동을 위한 OAuth 2.0 세션'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onOpenGoogleAccount}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                            googleTokenStatus === 'expired'
                              ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white border-[#27272a]'
                          }`}
                        >
                          <KeyRound className="w-3 h-3 text-[#38bdf8]" />
                          <span>
                            {googleTokenStatus === 'connected' && googleUser
                              ? '계정 관리'
                              : googleTokenStatus === 'expired'
                              ? '토큰 재인증'
                              : 'Google 로그인'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Google Drive Workspace (OAuth Dependent) */}
                    {(() => {
                      const isOAuthReady = googleTokenStatus === 'connected' && !!googleUser;
                      return (
                        <div className={`p-3 rounded border transition ${
                          isOAuthReady
                            ? 'bg-[#27272a]/30 border-[#27272a]'
                            : 'bg-[#27272a]/10 border-dashed border-[#27272a] opacity-70'
                        }`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border ${
                                isOAuthReady
                                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-[#27272a] text-slate-500 border-[#27272a]'
                              }`}>
                                <Globe className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-xs text-slate-200">Google Drive 작업 공간 (Cloud SSOT)</span>
                                  {isOAuthReady ? (
                                    workspaceRootType === 'gdrive' ? (
                                      <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded font-mono flex items-center gap-1">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> 현재 탐색기 활성 마운트
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-1.5 py-0.2 rounded font-mono">
                                        연결 가능 (대기)
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded font-mono flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" /> OAuth 로그인 선행 필요
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                  {isOAuthReady
                                    ? 'Google Drive 폴더를 파일 탐색기 작업 디렉토리로 마운트하여 실시간 동기화합니다.'
                                    : 'Google Workspace & OAuth 로그인이 먼저 완료되어야 Drive 작업 공간을 마운트할 수 있습니다.'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={isOAuthReady ? onOpenGoogleDrive : onOpenGoogleAccount}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                                isOAuthReady
                                  ? 'bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white border-[#27272a]'
                                  : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border-amber-800/60'
                              }`}
                            >
                              {isOAuthReady ? (
                                <>
                                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                                  <span>폴더 선택 (Drive Picker)</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>OAuth 로그인 필요</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* GitHub Repository Sync */}
                    <div className="p-3 bg-[#27272a]/30 border border-[#27272a] rounded flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                          <Github className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-xs text-slate-200">GitHub Repository Sync</span>
                            {githubConfig?.owner && githubConfig?.repo ? (
                              <span className="text-[10px] text-purple-400 bg-purple-950/80 border border-purple-800/80 px-1.5 py-0.2 rounded font-mono flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> 연결됨 ({githubConfig.owner}/{githubConfig.repo})
                              </span>
                            ) : githubConfig?.token ? (
                              <span className="text-[10px] text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-1.5 py-0.2 rounded font-mono">
                                PAT 등록됨 (저장소 미선택)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 bg-[#27272a] border border-[#27272a] px-1.5 py-0.2 rounded font-mono">
                                미연결
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {githubConfig?.repo
                              ? `${githubConfig.owner}/${githubConfig.repo} (${githubConfig.branch || 'main'}) 브랜치 동기화`
                              : 'GitHub Personal Access Token (PAT)을 이용한 저장소 파일 양방향 동기화 및 커밋'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenGithub}
                        className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer shrink-0 border border-[#27272a] flex items-center gap-1.5"
                      >
                        <Github className="w-3 h-3 text-purple-400" />
                        <span>GitHub 설정</span>
                      </button>
                    </div>

                    {/* Remote SSH / SFTP Workspace */}
                    <div className="p-3 bg-[#27272a]/30 border border-[#27272a] rounded flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-sky-600/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                          <Server className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-xs text-slate-200">Remote SSH / SFTP Workspace</span>
                            {remoteConfig?.host ? (
                              <span className="text-[10px] text-sky-400 bg-sky-950/80 border border-sky-800/80 px-1.5 py-0.2 rounded font-mono flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> 연결됨 ({remoteConfig.host}:{remoteConfig.port || 22})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 bg-[#27272a] border border-[#27272a] px-1.5 py-0.2 rounded font-mono">
                                미연결
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {remoteConfig?.host
                              ? `원격 서버: ${remoteConfig.username}@${remoteConfig.host}:${remoteConfig.port || 22} (${remoteConfig.rootPath})`
                              : '원격 리눅스 서버 / GPU 클러스터의 디렉토리를 파일 탐색기로 직접 마운트'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenRemoteSSH}
                        className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer shrink-0 border border-[#27272a] flex items-center gap-1.5"
                      >
                        <Server className="w-3 h-3 text-[#38bdf8]" />
                        <span>SSH 설정</span>
                      </button>
                    </div>
                  </div>

                  {/* Secure Token Storage Notice */}
                  <div className="bg-[#27272a]/30 border border-[#27272a] rounded p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded bg-[#27272a] text-[#38bdf8] border border-[#27272a] mt-0.5 shrink-0">
                          <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-slate-200 flex items-center gap-2 flex-wrap">
                            <span>보안 볼트 및 자격 증명 안전 보관 안내 (Client-Side Secure Vault)</span>
                            <span className="text-[10px] bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded font-mono">
                              AES-GCM 암호화 격리
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            모든 SSH 개인키/비밀번호, GitHub PAT 토큰, Google OAuth 세션 및 LLM API 키는 서버로 전송되지 않으며, 사용자 브라우저 로컬 샌드박스의 암호화 볼트에 안전하게 격리 보관됩니다.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className="px-2.5 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#38bdf8] hover:text-white rounded text-xs font-medium transition cursor-pointer shrink-0 border border-[#27272a] flex items-center gap-1"
                        title="Security & Vault 탭으로 이동"
                      >
                        <span>보안 설정</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
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
                  <div className="border-b border-[#27272a] pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Ghost className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Ghost Writer Mode (고스트 라이터 영작 연습 모드)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        한국어 프롬프트를 영어로 번역하고 타이핑 가이드 연습을 지원하는 기능입니다. 기본값은 "Off(사용 안 함)"이며 필요 시 설정할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  {/* Mode & Level Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">
                        작동 모드 및 난이도 수준
                      </label>
                      <span className="text-[11px] text-slate-400">
                        현재 상태: <strong className={localPrefs.ghostWriterLevel && localPrefs.ghostWriterLevel !== 'off' ? 'text-[#38bdf8]' : 'text-slate-500'}>
                          {localPrefs.ghostWriterLevel === 'off' || !localPrefs.ghostWriterLevel ? '사용 안 함 (Off)' : `${localPrefs.ghostWriterLevel}% 난이도`}
                        </strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Option: Off (Default) */}
                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, ghostWriterLevel: 'off' })}
                        className={`p-3 rounded border text-left transition cursor-pointer flex flex-col justify-between ${
                          localPrefs.ghostWriterLevel === 'off' || !localPrefs.ghostWriterLevel
                            ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-slate-200 flex items-center gap-1.5">
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            <span>사용 안 함 (Off - 기본값)</span>
                          </span>
                          {(localPrefs.ghostWriterLevel === 'off' || !localPrefs.ghostWriterLevel) && (
                            <span className="text-[10px] text-[#38bdf8] font-medium">선택됨</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          일반 단일 입력창으로 작동합니다. 영어권 사용자 및 번역 기능이 불필요한 환경에 최적화됩니다.
                        </p>
                      </button>

                      {/* Option: 50% (Recommended) */}
                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, ghostWriterLevel: '50' })}
                        className={`p-3 rounded border text-left transition cursor-pointer flex flex-col justify-between ${
                          localPrefs.ghostWriterLevel === '50'
                            ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-slate-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>50% 균형 가이드 (권장)</span>
                          </span>
                          {localPrefs.ghostWriterLevel === '50' && (
                            <span className="text-[10px] text-[#38bdf8] font-medium">선택됨</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          단어의 절반이 블랭크 처리되어 한국어 프롬프트를 바탕으로 균형 잡힌 실전 영작 연습이 가능합니다.
                        </p>
                      </button>

                      {/* Option: 70% (Beginner) */}
                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, ghostWriterLevel: '70' })}
                        className={`p-3 rounded border text-left transition cursor-pointer flex flex-col justify-between ${
                          localPrefs.ghostWriterLevel === '70'
                            ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-slate-200 flex items-center gap-1.5">
                            <Languages className="w-3.5 h-3.5 text-emerald-400" />
                            <span>70% 지원 가이드 (초급)</span>
                          </span>
                          {localPrefs.ghostWriterLevel === '70' && (
                            <span className="text-[10px] text-[#38bdf8] font-medium">선택됨</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          대부분의 철자가 고스트 텍스트로 미리 보여져 영어 타이핑과 빠른 문장 완성이 쉽습니다.
                        </p>
                      </button>

                      {/* Option: 30% (Challenging) */}
                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, ghostWriterLevel: '30' })}
                        className={`p-3 rounded border text-left transition cursor-pointer flex flex-col justify-between ${
                          localPrefs.ghostWriterLevel === '30'
                            ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-slate-200 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-purple-400" />
                            <span>30% 최소 힌트 (도전)</span>
                          </span>
                          {localPrefs.ghostWriterLevel === '30' && (
                            <span className="text-[10px] text-[#38bdf8] font-medium">선택됨</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          단어의 첫 글자 위주로만 힌트가 제공되어 능동적인 영작 기억력을 훈련할 수 있습니다.
                        </p>
                      </button>

                      {/* Option: 100% (Full Answer) */}
                      <button
                        type="button"
                        onClick={() => setLocalPrefs({ ...localPrefs, ghostWriterLevel: '100' })}
                        className={`p-3 rounded border text-left transition cursor-pointer flex flex-col justify-between sm:col-span-2 ${
                          localPrefs.ghostWriterLevel === '100'
                            ? 'bg-[#27272a] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-slate-200 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                            <span>100% 전체 정답 표시 (Full Answer Overlay)</span>
                          </span>
                          {localPrefs.ghostWriterLevel === '100' && (
                            <span className="text-[10px] text-[#38bdf8] font-medium">선택됨</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          영작 문장 전체를 그대로 보여주며 타이핑하거나 바로 전송할 수 있습니다.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Translation Model Selection */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>번역 및 영작 추론 모델</span>
                    </label>
                    <select
                      value={localPrefs.ghostWriterModel || 'gemini-2.5-flash'}
                      onChange={(e) => setLocalPrefs({ ...localPrefs, ghostWriterModel: e.target.value })}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded p-2 text-xs text-slate-200 outline-none focus:border-[#38bdf8] transition cursor-pointer"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (⚡ 초고속 / 크레딧 절약 권장)</option>
                      <option value="deepseek-r1">DeepSeek R1 (🧠 심층 추론 영작)</option>
                      <option value="qwen-2.5-coder">Qwen 2.5 Coder 32B (💻 코드/기술 프롬프트 특화)</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (💎 최고 품질 심층 번역)</option>
                      <option value="llama-3.3-70b">Llama 3.3 70B (🏠 로컬 Ollama 무료 번역)</option>
                    </select>
                  </div>

                  {/* Guide Info */}
                  <div className="p-3 bg-[#27272a]/30 border border-[#27272a] rounded space-y-1.5 text-xs text-slate-400 leading-relaxed">
                    <div className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>Ghost Writer 기능 안내</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                      <li>Ghost Writer를 켜면 채팅창이 한국어 프롬프트 입력과 영작 캔버스로 2분할됩니다.</li>
                      <li>한국어 입력 후 <kbd className="px-1.5 py-0.5 bg-[#27272a] text-slate-300 rounded text-[10px] font-mono border border-[#27272a]">Enter</kbd>를 누르면 영어 고스트 텍스트가 자동 생성됩니다.</li>
                      <li>단축키 <kbd className="px-1.5 py-0.5 bg-[#27272a] text-slate-300 rounded text-[10px] font-mono border border-[#27272a]">Tab</kbd>으로 전체 문장을 한 번에 자동 완성할 수 있습니다.</li>
                      <li>영어 사용자의 경우 <strong>사용 안 함 (Off)</strong>으로 설정하시면 깔끔한 표준 입력창으로 유지됩니다.</li>
                    </ul>
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

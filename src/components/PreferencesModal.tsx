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
  Server,
  Github,
  Cpu,
  Sparkles,
  PlugZap,
  Eye,
  EyeOff,
  CheckCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Ghost,
  KeyRound,
  FolderOpen,
  Database,
  ExternalLink,
  Copy,
  Terminal,
  CheckCheck,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SecuritySettings, SecurityConfig, DEFAULT_SECURITY_CONFIG } from './SecuritySettings';
import { StorageSettings } from './StorageSettings';
import { googleDriveService, GoogleUserProfile } from '../services/googleDriveService';
import type { RemoteConfig } from './RemoteWorkspaceModal';
import type { GithubConfig } from './GithubIntegrationModal';
import { fetchOllamaInstalledModels } from '../services/documentConverterService';
import { HelpTooltip } from './HelpTooltip';
import {
  VENDOR_MODELS_MAP,
  CLOUD_MODEL_OPTIONS,
  DEFAULT_LOCAL_MODEL_OPTIONS,
  fetchOllamaTags,
  fetchProviderActiveModels,
  ModelSpec,
  MODEL_SPECS,
  getModelSpec,
  DEFAULT_FALLBACK_MODELS
} from '../config/models.config';

export type { ModelSpec };
export {
  MODEL_SPECS,
  getModelSpec,
  DEFAULT_FALLBACK_MODELS,
  VENDOR_MODELS_MAP,
  CLOUD_MODEL_OPTIONS,
  DEFAULT_LOCAL_MODEL_OPTIONS,
  fetchOllamaTags,
  fetchProviderActiveModels
};

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
import type { AiRoleModels } from '../types';
import { DEFAULT_AI_ROLE_MODELS } from '../types';

export interface UserPreferences {
  baseTheme?: string;
  themeAccent?: string;
  themeMode?: string;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  compactness: 'dense' | 'spacious';
  defaultModel: string;
  roleModels?: AiRoleModels;
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
  // Multi-vendor BYOK keys
  apiKeys?: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
    deepseek?: string;
    groq?: string;
  };
  googleSearchGrounding?: boolean;
  // PDF Parsing Engine Config
  pdfParser?: {
    engine: 'fast' | 'gemini' | 'ollama';
    ollamaEndpoint?: string;
    ollamaModel?: string;
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  baseTheme: 'emerald',
  themeAccent: 'emerald',
  themeMode: 'standard',
  fontSize: 'md',
  compactness: 'dense',
  defaultModel: 'gemini-2.5-flash',
  roleModels: DEFAULT_AI_ROLE_MODELS,
  ghostWriterLevel: 'off',
  ghostWriterModel: 'gemini-2.5-flash',
  apiKeys: {
    gemini: '',
    openai: '',
    anthropic: '',
    deepseek: '',
    groq: ''
  },
  googleSearchGrounding: false,
  pdfParser: {
    engine: 'fast',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'llama3.2-vision'
  },
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

export interface CloudVendorMeta {
  id: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq';
  name: string;
  badge: string;
  isRecommended?: boolean;
  signupUrl: string;
  signupLabel: string;
  guide: string;
  placeholder: string;
  defaultModel: string;
}

export const CLOUD_VENDORS: CloudVendorMeta[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: '추천',
    isRecommended: true,
    signupUrl: 'https://aistudio.google.com/apikey',
    signupLabel: 'API 키 발급',
    guide: 'Google AI Studio에서 구글 계정으로 로그인 후 무료 API 키를 발급받을 수 있습니다. 안정적인 고속 쿼리를 지원합니다.',
    placeholder: 'AIzaSy...',
    defaultModel: 'gemini-2.5-flash'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: '공식 API',
    signupUrl: 'https://platform.openai.com/api-keys',
    signupLabel: 'API 키 발급',
    guide: 'OpenAI 콘솔에서 발급받은 API 키로 GPT-4o 및 최신 모델을 직접 연동합니다.',
    placeholder: 'sk-proj-... 또는 sk-...',
    defaultModel: 'gpt-4o'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    badge: 'Claude 연동',
    signupUrl: 'https://console.anthropic.com/settings/keys',
    signupLabel: 'API 키 발급',
    guide: 'Anthropic 콘솔에서 발급받은 API 키로 Claude 3.5 모델을 연동합니다.',
    placeholder: 'sk-ant-...',
    defaultModel: 'claude-3.5-sonnet'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: '초저비용 추론',
    signupUrl: 'https://platform.deepseek.com/api_keys',
    signupLabel: 'API 키 발급',
    guide: 'DeepSeek 오픈 플랫폼에서 R1 추론 모델 및 V3 API 키를 생성하여 사용할 수 있습니다.',
    placeholder: 'sk-...',
    defaultModel: 'deepseek-r1'
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    badge: '초고속 LPU',
    signupUrl: 'https://console.groq.com/keys',
    signupLabel: 'API 키 발급',
    guide: 'Groq 콘솔에서 Llama 3.3 초고속 추론용 무료 API 키를 발급받을 수 있습니다.',
    placeholder: 'gsk_...',
    defaultModel: 'llama-3.3-70b-versatile'
  }
];

export interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ai-engine' | 'persona' | 'integrations' | 'storage' | 'security' | 'ghost-writer' | 'theme' | 'prompts';
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  onApplyPrompt?: (promptBody: string) => void;
  modelOptions?: { id: string; name: string; tier?: string; desc?: string; group?: string }[];
  
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
  onVerify?: (vendor?: string, key?: string) => void;
  isVerifying?: boolean;
  aiParameters?: AiInferenceParameters;
  onSaveParameters?: (params: AiInferenceParameters) => void;
  onUpdateDiscoveredModels?: (models: { id: string; name: string }[]) => void;
  initialDiscoveredModels?: { id: string; name: string }[];

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
  onOpenRoleAssignment?: () => void;
  dynamicModelsMap?: Record<string, { id: string; name: string }[]>;
  onUpdateDynamicModels?: (vendor: string, models: { id: string; name: string }[]) => void;
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
  onUpdateDiscoveredModels,
  initialDiscoveredModels,
  onToast = (_m: string, _t?: 'info' | 'success' | 'warn' | 'error') => {},
  onWipeAllData = () => {},
  googleUser = null,
  onOpenGoogleAccount,
  workspaceRootType = 'local',
  onOpenGoogleDrive,
  remoteConfig = null,
  onOpenRemoteSSH,
  githubConfig = null,
  onOpenGithub,
  onOpenRoleAssignment,
  dynamicModelsMap,
  onUpdateDynamicModels
}) => {
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);
  const [activeTab, setActiveTab] = useState<'ai-engine' | 'persona' | 'integrations' | 'storage' | 'security' | 'ghost-writer'>(() => {
    if (initialTab === 'theme' || initialTab === 'prompts') return 'ai-engine';
    return initialTab || 'ai-engine';
  });

  // AI Engine State
  const [localProviderType, setLocalProviderType] = useState<'cloud' | 'local'>(
    provider === 'cloud' ? 'cloud' : 'local'
  );
  const [selectedVendor, setSelectedVendor] = useState<'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq'>('gemini');
  const [localApiKeyInput, setLocalApiKeyInput] = useState<string>(currentApiKey);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [localEndpointInput, setLocalEndpointInput] = useState<string>(currentEndpoint || 'http://localhost:11434');
  const [localSelectedModel, setLocalSelectedModel] = useState<string>(selectedModel);
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [isAdvancedParamsOpen, setIsAdvancedParamsOpen] = useState<boolean>(false);
  const [localGoogleGrounding, setLocalGoogleGrounding] = useState<boolean>(preferences.googleSearchGrounding ?? false);
  const [vendorActiveModels, setVendorActiveModels] = useState<Record<string, { id: string; name: string }[]>>(() => {
    return dynamicModelsMap || {};
  });

  useEffect(() => {
    if (dynamicModelsMap) {
      setVendorActiveModels((prev) => ({ ...prev, ...dynamicModelsMap }));
    }
  }, [dynamicModelsMap]);



  // Local AI (Ollama) CORS Diagnostics State
  const [isCorsGuideOpen, setIsCorsGuideOpen] = useState<boolean>(false);
  const [corsStatus, setCorsStatus] = useState<'idle' | 'testing' | 'success' | 'blocked' | 'offline'>('idle');
  const [corsDetails, setCorsDetails] = useState<string>('');
  const [corsCopiedCmd, setCorsCopiedCmd] = useState<string | null>(null);
  const [corsOsTab, setCorsOsTab] = useState<'powershell' | 'windows-persist' | 'unix' | 'lmstudio'>('powershell');

  // Google Auth Token Status State
  const [googleTokenStatus, setGoogleTokenStatus] = useState<'connected' | 'expired' | 'disconnected'>('disconnected');

  // Auto-discovered local models
  const [discoveredModels, setDiscoveredModels] = useState<{ id: string; name: string }[]>(() => {
    if (initialDiscoveredModels && initialDiscoveredModels.length > 0) return initialDiscoveredModels;
    try {
      const saved = localStorage.getItem('aipodium_discovered_models');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

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

  // PDF Parser Engine State
  const [pdfParserEngine, setPdfParserEngine] = useState<'fast' | 'gemini' | 'ollama'>(
    preferences.pdfParser?.engine || 'fast'
  );
  const [pdfOllamaEndpoint, setPdfOllamaEndpoint] = useState<string>(
    preferences.pdfParser?.ollamaEndpoint || currentEndpoint || 'http://localhost:11434'
  );
  const [pdfOllamaModel, setPdfOllamaModel] = useState<string>(
    preferences.pdfParser?.ollamaModel || 'llama3.2-vision'
  );
  const [pdfCustomModel, setPdfCustomModel] = useState<string>('');
  const [discoveredPdfModels, setDiscoveredPdfModels] = useState<string[]>([]);
  const [isCheckingPdfOllama, setIsCheckingPdfOllama] = useState<boolean>(false);

  const handleRefreshOllamaPdfModels = async () => {
    setIsCheckingPdfOllama(true);
    try {
      const models = await fetchOllamaInstalledModels(pdfOllamaEndpoint);
      if (models && models.length > 0) {
        setDiscoveredPdfModels(models);
      }
    } finally {
      setIsCheckingPdfOllama(false);
    }
  };

  // Function to run CORS diagnostic for Local Ollama
  const runCorsDiagnostic = useCallback(async (ep?: string) => {
    const targetUrl = (ep || localEndpointInput || 'http://localhost:11434').trim().replace(/\/+$/, '');
    setCorsStatus('testing');
    setCorsDetails('로컬 Ollama 엔드포인트에 접속 및 CORS 헤더를 확인하고 있습니다...');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${targetUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const count = Array.isArray(data?.models) ? data.models.length : 0;
        setCorsStatus('success');
        setCorsDetails(`연결 성공! ${count}개 로컬 모델이 감지되었으며 브라우저 CORS가 정상 허용되어 있습니다.`);
        onToast(`✓ 로컬 Ollama 정상 연결 확인! (${count}개 모델 감지)`, 'success');
      } else {
        setCorsStatus('blocked');
        setCorsDetails(`서버는 응답했으나 HTTP ${res.status} 오류가 발생했습니다. CORS 정책 및 설정을 확인하세요.`);
        onToast(`⚠️ HTTP ${res.status}: CORS 접근이 제한되었습니다.`, 'warn');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setCorsStatus('offline');
        setCorsDetails('응답 시간 초과 (3.5초). Ollama 프로세스가 실행 중이지 않거나 주소가 다릅니다.');
        onToast('⚠️ Ollama 프로세스가 응답하지 않습니다.', 'warn');
      } else {
        setCorsStatus('blocked');
        setCorsDetails('브라우저 CORS 보안 정책에 의해 직접 연결이 차단되었습니다. OLLAMA_ORIGINS="*" 허용이 필요합니다.');
        onToast('⚠️ 브라우저 CORS 차단 감지: OLLAMA_ORIGINS="*" 허용이 필요합니다.', 'error');
      }
    }
  }, [localEndpointInput, onToast]);

  // Function to fetch available local Ollama models
  const fetchLocalModels = useCallback(async (endpointUrl: string) => {
    const cleanEndpoint = endpointUrl.trim().replace(/\/+$/, '');
    if (!cleanEndpoint) {
      setDiscoveredModels([]);
      return;
    }

    try {
      const tags = await fetchOllamaTags(cleanEndpoint);
      if (tags && tags.length > 0) {
        const formatted = tags.map((m) => ({
          id: m.id,
          name: m.name
        }));
        setDiscoveredModels(formatted);
        try {
          localStorage.setItem('aipodium_discovered_models', JSON.stringify(formatted));
        } catch {}
        onUpdateDiscoveredModels?.(formatted);
        return;
      }
      setDiscoveredModels([]);
    } catch {
      setDiscoveredModels([]);
    }
  }, [onUpdateDiscoveredModels]);

  useEffect(() => {
    if (isOpen) {
      const initialApiKeys = preferences.apiKeys || {
        gemini: currentApiKey || '',
        openai: '',
        anthropic: '',
        deepseek: '',
        groq: ''
      };
      if (currentApiKey && !initialApiKeys.gemini) {
        initialApiKeys.gemini = currentApiKey;
      }

      setLocalPrefs({
        ...DEFAULT_PREFERENCES,
        ...preferences,
        apiKeys: initialApiKeys,
        aiPersona: { ...DEFAULT_PREFERENCES.aiPersona, ...(preferences.aiPersona || {}) },
        customPrompts: preferences.customPrompts || DEFAULT_PREFERENCES.customPrompts,
        security: { ...DEFAULT_SECURITY_CONFIG, ...(preferences.security || {}) }
      });
      setLocalGoogleGrounding(preferences.googleSearchGrounding ?? false);

      const targetTab = (initialTab === 'prompts' || initialTab === 'theme') ? 'ai-engine' : (initialTab || 'ai-engine');
      setActiveTab(targetTab);
      setLocalProviderType(provider === 'cloud' ? 'cloud' : 'local');

      // Determine initial vendor based on selected model
      let detectedVendor: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' = 'gemini';
      if (selectedModel.startsWith('gpt-') || selectedModel.startsWith('o3-')) {
        detectedVendor = 'openai';
      } else if (selectedModel.startsWith('claude-')) {
        detectedVendor = 'anthropic';
      } else if (selectedModel.startsWith('deepseek-')) {
        detectedVendor = 'deepseek';
      } else if (selectedModel.startsWith('llama-') || selectedModel.startsWith('groq-')) {
        detectedVendor = 'groq';
      }
      setSelectedVendor(detectedVendor);
      const keyForVendor = initialApiKeys[detectedVendor] || currentApiKey || '';
      setLocalApiKeyInput(keyForVendor);

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

  const handleSelectVendor = (vendorId: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq') => {
    // 1. Save current key into localPrefs.apiKeys
    const updatedApiKeys = {
      ...(localPrefs.apiKeys || {}),
      [selectedVendor]: localApiKeyInput.trim()
    };
    setLocalPrefs((prev) => ({
      ...prev,
      apiKeys: updatedApiKeys
    }));
    // 2. Switch vendor
    setSelectedVendor(vendorId);
    // 3. Load vendor's existing key
    const existingKey = updatedApiKeys[vendorId] || '';
    setLocalApiKeyInput(existingKey);
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
  // If actual models were discovered from Ollama, populate with user's actual installed models instead of static mock tags
  const localModelOptions = discoveredModels.length > 0
    ? [
        ...discoveredModels,
        { id: 'custom', name: '직접 입력' }
      ]
    : DEFAULT_LOCAL_MODEL_OPTIONS;

  const handleSave = () => {
    // 1. Save general preferences with updated defaultModel & apiKeys & grounding
    const modelToSet = localSelectedModel === 'custom' && customModelInput.trim() ? customModelInput.trim() : localSelectedModel;
    const updatedApiKeys = {
      ...(localPrefs.apiKeys || {}),
      [selectedVendor]: localApiKeyInput.trim()
    };
    const updatedPrefs: UserPreferences = {
      ...localPrefs,
      defaultModel: modelToSet,
      apiKeys: updatedApiKeys,
      googleSearchGrounding: localGoogleGrounding,
      pdfParser: {
        engine: pdfParserEngine,
        ollamaEndpoint: pdfOllamaEndpoint.trim() || 'http://localhost:11434',
        ollamaModel:
          pdfOllamaModel === 'custom' && pdfCustomModel.trim()
            ? pdfCustomModel.trim()
            : pdfOllamaModel,
      },
    };
    onSave(updatedPrefs);

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

    // 3. Save Active Model & Discovered Models
    if (onSelectModel) {
      onSelectModel(modelToSet);
    }
    if (onUpdateDiscoveredModels) {
      onUpdateDiscoveredModels(discoveredModels);
    }
    try {
      localStorage.setItem('aipodium_discovered_models', JSON.stringify(discoveredModels));
    } catch {
      // ignore
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

  const handleTriggerVerify = async () => {
    if (localProviderType === 'cloud') {
      const key = localApiKeyInput.trim();
      if (!key) {
        onToast(`${selectedVendor.toUpperCase()} API Key를 입력해주세요.`, 'warn');
        return;
      }
      onUpdateApiKey(key);
      if (onSelectProvider) onSelectProvider('cloud');
      
      try {
        const models = await fetchProviderActiveModels(selectedVendor, key);
        if (models && models.length > 0) {
          const simplified = models.map((m) => ({ id: m.id, name: m.name }));
          setVendorActiveModels((prev) => ({
            ...prev,
            [selectedVendor]: simplified
          }));
          onUpdateDynamicModels?.(selectedVendor, simplified);
        }
      } catch (err) {
        console.warn('동적 모델 목록 조회 실패:', err);
      }

      onVerify(selectedVendor, key);
    } else {
      const ep = localEndpointInput.trim() || 'http://localhost:11434';
      onUpdateEndpoint(ep);
      if (onSelectProvider) onSelectProvider('local-pc');
      await fetchLocalModels(ep);
      runCorsDiagnostic(ep);
      onVerify('local', ep);
    }
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
          className="bg-[#121214] border border-[#222226] rounded-xl shadow-2xl w-full max-w-4xl h-[630px] max-h-[92vh] flex flex-col overflow-hidden text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#222226] bg-[#121214] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#18181b] text-indigo-400 border border-[#222226]">
                <Settings className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="font-medium text-xs text-slate-200 tracking-wide">
                  환경 설정
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#18181b] rounded transition cursor-pointer"
              title="닫기"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-52 bg-[#0c0c0e] border-r border-[#222226] p-2 flex flex-col gap-1 shrink-0 select-none overflow-y-auto min-h-0">
              {/* TAB: AI Engine & Provider */}
              <button
                type="button"
                onClick={() => setActiveTab('ai-engine')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'ai-engine'
                    ? 'bg-[#18181b] text-indigo-300 font-medium border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Cpu className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'ai-engine' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">AI 엔진 설정</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#09090b] text-slate-400 border border-[#222226] shrink-0 ml-1 font-normal">
                  {localProviderType === 'cloud' ? '클라우드' : '로컬'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('persona')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'persona'
                    ? 'bg-[#18181b] text-indigo-300 font-medium border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Bot className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'persona' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">페르소나</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ghost-writer')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'ghost-writer'
                    ? 'bg-[#18181b] text-indigo-300 font-medium border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Ghost className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'ghost-writer' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">고스트 라이터</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ml-1 ${
                    localPrefs.ghostWriterLevel && localPrefs.ghostWriterLevel !== 'off'
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 font-medium'
                      : 'bg-[#09090b] text-slate-500 border-[#222226] font-normal'
                  }`}
                >
                  {localPrefs.ghostWriterLevel && localPrefs.ghostWriterLevel !== 'off'
                    ? `${localPrefs.ghostWriterLevel}%`
                    : 'OFF'}
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
                        ? 'bg-[#18181b] text-indigo-300 font-medium border-l-2 border-indigo-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'integrations' ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="truncate">계정 연동</span>
                    </div>
                    {connectedCount > 0 ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium shrink-0 ml-1">
                        {connectedCount}개 연결
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#09090b] text-slate-500 border border-[#222226] font-normal shrink-0 ml-1">
                        미연결
                      </span>
                    )}
                  </button>
                );
              })()}

              <button
                type="button"
                onClick={() => setActiveTab('storage')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'storage'
                    ? 'bg-[#18181b] text-indigo-300 font-medium border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Database className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'storage' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">저장소 및 DB</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#09090b] text-slate-400 border border-[#222226] font-normal shrink-0 ml-1">
                  로컬 DB
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-[#18181b] text-indigo-300 font-medium border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'security' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">보안 및 볼트</span>
                </div>
              </button>

              {/* System Status & Environment Info Widget */}
              <div className="mt-auto pt-3 border-t border-[#222226]/60 px-2 py-1.5 text-[11px] text-slate-400 space-y-1.5 select-none">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-normal">빌드 환경</span>
                  <span className="font-mono text-indigo-300 font-normal">v2.4.0 (IDE)</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-normal">데이터 보존</span>
                  <span className="font-mono text-emerald-400 flex items-center gap-1 font-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    로컬 암호화
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-[#121214] min-h-0">
              {/* TAB 0: AI Engine & Provider */}
              {activeTab === 'ai-engine' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 1. Mode Switcher (Top-Left): Cloud API vs Local Ollama */}
                  <div className="flex items-center">
                    <div className="inline-flex p-0.5 bg-[#09090b] border border-[#222226] rounded-md">
                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('cloud')}
                        className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center gap-1.5 ${
                          localProviderType === 'cloud'
                            ? 'bg-[#18181b] text-white font-medium border border-[#222226]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>클라우드 API</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('local')}
                        className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center gap-1.5 ${
                          localProviderType === 'local'
                            ? 'bg-[#18181b] text-white font-medium border border-[#222226]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Server className="w-3.5 h-3.5 text-indigo-400" />
                        <span>로컬 Ollama</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Provider Specific Credentials / Endpoint */}
                  {localProviderType === 'cloud' ? (
                    <div className="bg-[#0c0c0e] border border-[#222226] rounded-md overflow-hidden">
                      {/* BYOK Multi-Vendor Tabs - Flat Bottom-Border Tabs */}
                      <div className="flex items-stretch border-b border-[#222226] bg-[#09090b]/70">
                        {CLOUD_VENDORS.map((v) => {
                          const isSelected = selectedVendor === v.id;
                          const hasKey = !!(localPrefs.apiKeys?.[v.id] || (v.id === selectedVendor && localApiKeyInput.trim()));
                          const vendorShort = v.id === 'gemini' ? 'Google' : v.id === 'openai' ? 'OpenAI' : v.id === 'anthropic' ? 'Anthropic' : v.id === 'deepseek' ? 'DeepSeek' : 'Groq';
                          const vendorSub = v.id === 'gemini' ? '선택' : v.id === 'openai' ? 'GPT-4o' : v.id === 'anthropic' ? 'Claude' : v.id === 'deepseek' ? 'R1·V3' : '초고속 LPU';
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleSelectVendor(v.id)}
                              className={`flex-1 py-2.5 px-1.5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 relative -mb-[1px] border-b-2 ${
                                isSelected
                                  ? 'border-indigo-500 text-white font-medium bg-[#121214]/60'
                                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#18181b]/30'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-normal">
                                <span>{vendorShort}</span>
                                {hasKey && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="키 등록됨" />
                                )}
                              </div>
                              <span className={`text-[10px] leading-tight ${isSelected ? 'text-indigo-300 font-normal' : 'text-slate-500 font-normal'}`}>
                                {vendorSub}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Vendor Body Configuration */}
                      {(() => {
                        const currentVendorMeta = CLOUD_VENDORS.find((v) => v.id === selectedVendor) || CLOUD_VENDORS[0];
                        return (
                          <div className="p-3.5 space-y-3.5">
                            {/* API Key Row */}
                            <div className="flex items-center gap-2.5">
                              <label className="text-xs font-medium text-slate-300 w-14 shrink-0">API 키</label>
                              <div className="relative flex-1">
                                <input
                                  type={showApiKey ? 'text' : 'password'}
                                  value={localApiKeyInput}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalApiKeyInput(val);
                                    setLocalPrefs((prev) => ({
                                      ...prev,
                                      apiKeys: {
                                        ...(prev.apiKeys || {}),
                                        [selectedVendor]: val
                                      }
                                    }));
                                  }}
                                  placeholder={`${currentVendorMeta.name} API 키 입력`}
                                  className="w-full bg-[#09090b] border border-[#222226] focus:border-indigo-500 rounded-md px-3 pr-8 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 outline-none transition"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                                  title={showApiKey ? '숨기기' : '표시'}
                                >
                                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={handleTriggerVerify}
                                disabled={isVerifying}
                                className="btn-secondary text-xs shrink-0"
                              >
                                <PlugZap className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                                <span>{isVerifying ? '검증 중' : '검증'}</span>
                              </button>

                              <a
                                href={currentVendorMeta.signupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary text-xs shrink-0"
                                title={currentVendorMeta.guide}
                              >
                                <span>{currentVendorMeta.signupLabel}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Model Selection (Inline Row with Dropdown & Role Assignment Button) */}
                            {(() => {
                              const spec = getModelSpec(localSelectedModel);
                              const contextStr = spec.contextTokens >= 1_000_000
                                ? `${spec.contextTokens / 1_000_000}M`
                                : `${Math.round(spec.contextTokens / 1_000)}K`;
                              const badgeClean = spec.badge ? spec.badge.replace(' 제공', '') : '';
                              const specText = `${contextStr} 컨텍스트 · 입 $${spec.inputCostPer1M.toFixed(spec.inputCostPer1M < 0.01 ? 3 : 2)} / 출 $${spec.outputCostPer1M.toFixed(2)}${badgeClean ? ` (${badgeClean})` : ''}`;

                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5">
                                    <label className="text-xs font-medium text-slate-300 w-14 shrink-0">모델</label>

                                    <div className="relative flex-1">
                                      <select
                                        value={localSelectedModel}
                                        onChange={(e) => setLocalSelectedModel(e.target.value)}
                                        className="w-full bg-[#09090b] border border-[#222226] hover:border-indigo-500/50 rounded-md px-3 py-1.5 text-xs text-slate-200 outline-none appearance-none cursor-pointer pr-8 font-normal"
                                      >
                                        {((vendorActiveModels[selectedVendor] && vendorActiveModels[selectedVendor].length > 0)
                                          ? vendorActiveModels[selectedVendor]
                                          : (VENDOR_MODELS_MAP[selectedVendor] || DEFAULT_FALLBACK_MODELS.filter((m) => m.vendor === selectedVendor))
                                        ).map((m) => (
                                          <option key={m.id} value={m.id} className="bg-[#09090b] text-slate-200 py-1 font-normal">
                                            {m.name}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>

                                    {onOpenRoleAssignment && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onOpenRoleAssignment();
                                        }}
                                        className="btn-secondary text-xs shrink-0"
                                        title="역할별 AI 모델 지정"
                                      >
                                        <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                                        <span>역할별 모델 지정</span>
                                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Model Spec Line: 12px text-zinc-400 directly below dropdown */}
                                  <div className="pl-[66px]">
                                    <p className="text-[12px] text-zinc-400 font-normal">
                                      {specText}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Search Grounding for Gemini */}
                            {selectedVendor === 'gemini' && (
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-normal text-slate-300 truncate">실시간 구글 검색 연동</span>
                                  <HelpTooltip
                                    side="bottom"
                                    align="right"
                                    content="구글 검색 도구를 연동하여 최신 웹 기술 정보를 실시간으로 검색하고 답변에 출처 링크를 포함합니다. (Gemini 모델 전용)"
                                  />
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={localGoogleGrounding}
                                    onChange={(e) => setLocalGoogleGrounding(e.target.checked)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-7 h-4 bg-[#18181b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-[#0c0c0e] border border-[#222226] rounded-md p-3 space-y-2.5">
                      {/* Local Endpoint & Model Selector (2-Column Grid) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Endpoint */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={localEndpointInput}
                            onChange={(e) => setLocalEndpointInput(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="flex-1 bg-[#09090b] border border-[#222226] focus:border-indigo-500 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleTriggerVerify}
                            disabled={isVerifying}
                            className="btn-secondary text-xs"
                          >
                            <PlugZap className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                            <span>{isVerifying ? '연결 중' : '검증'}</span>
                          </button>
                        </div>

                        {/* Local Model Selector */}
                        <div className="relative flex items-center bg-[#09090b] border border-[#222226] rounded-md px-2.5 py-1">
                          <span className="text-[11px] font-normal text-slate-400 shrink-0 mr-1.5">로컬 모델</span>
                          <select
                            value={localSelectedModel}
                            onChange={(e) => setLocalSelectedModel(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-200 outline-none appearance-none cursor-pointer pr-5 truncate text-right font-normal"
                          >
                            {localModelOptions.map((m) => (
                              <option key={m.id} value={m.id} className="bg-[#09090b] text-slate-200 py-1 text-left">
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Local AI Free Indicator */}
                      <div className="flex items-center justify-between bg-[#09090b] border border-[#222226] rounded-md px-2.5 py-1.5 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 font-medium">로컬 하드웨어 추론:</span>
                          <span className="text-emerald-400 font-mono font-medium">토큰 비용 무료</span>
                          <span className="text-[#222226]">|</span>
                          <span className="text-slate-400">외부 네트워크 전송 없음 - 로컬 보안 보장</span>
                        </div>
                        <span className="badge-success text-[10px] px-1.5 py-0.5 rounded-sm">
                          무제한 토큰
                        </span>
                      </div>

                      {localSelectedModel === 'custom' && (
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-normal text-slate-400 shrink-0">커스텀 모델명:</label>
                          <input
                            type="text"
                            value={customModelInput}
                            onChange={(e) => setCustomModelInput(e.target.value)}
                            placeholder="예: llama3:latest 또는 mistral"
                            className="flex-1 bg-[#09090b] border border-[#222226] focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-slate-200 outline-none transition"
                          />
                        </div>
                      )}

                      {/* CORS Diagnostic & 1-Line Accordion Guide */}
                      <div className="pt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setIsCorsGuideOpen((prev) => !prev)}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            <Terminal className="w-3.5 h-3.5 text-amber-400" />
                            <span>CORS 설정 가이드 보기</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isCorsGuideOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => runCorsDiagnostic()}
                            disabled={corsStatus === 'testing'}
                            className="btn-secondary text-[11px]"
                          >
                            <RotateCcw className={`w-3 h-3 ${corsStatus === 'testing' ? 'animate-spin' : ''}`} />
                            <span>{corsStatus === 'testing' ? '진단 중...' : 'CORS 자가진단'}</span>
                          </button>
                        </div>

                        {/* Diagnostic Result Banner (Always shown when active) */}
                        {corsStatus !== 'idle' && (
                          <div
                            className={`p-2 rounded border text-xs leading-relaxed flex items-start gap-1.5 ${
                              corsStatus === 'success'
                                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                                : corsStatus === 'blocked'
                                ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                                : corsStatus === 'offline'
                                ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                                : 'bg-[#09090b] border-[#222226] text-slate-300'
                            }`}
                          >
                            {corsStatus === 'success' ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-normal">{corsDetails}</p>
                            </div>
                          </div>
                        )}

                        {/* Collapsible Accordion Content for CORS Commands */}
                        {isCorsGuideOpen && (
                          <div className="p-2.5 bg-[#09090b] border border-[#222226] rounded space-y-2 text-xs animate-in fade-in duration-100">
                            <div className="flex items-center justify-between border-b border-[#222226] pb-1">
                              <div className="flex gap-1">
                                {[
                                  { id: 'powershell', label: 'Windows 파워셸' },
                                  { id: 'windows-persist', label: 'Windows 영구 변수' },
                                  { id: 'unix', label: 'macOS 및 Linux' },
                                  { id: 'lmstudio', label: 'LM Studio' }
                                ].map((tab) => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setCorsOsTab(tab.id as any)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-normal transition cursor-pointer ${
                                      corsOsTab === tab.id
                                        ? 'bg-[#18181b] text-white font-medium border border-[#222226]'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Command Box */}
                            {(() => {
                              let cmdText = '';
                              if (corsOsTab === 'powershell') {
                                cmdText = `$env:OLLAMA_ORIGINS="*" ; ollama serve`;
                              } else if (corsOsTab === 'windows-persist') {
                                cmdText = `[System.Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', '*', 'User')`;
                              } else if (corsOsTab === 'unix') {
                                cmdText = `OLLAMA_ORIGINS="*" ollama serve`;
                              } else {
                                cmdText = `Developer 탭 -> Local Server -> Enable CORS 체크 활성화`;
                              }

                              const isCopied = corsCopiedCmd === cmdText;

                              return (
                                <div className="flex items-center justify-between bg-[#0c0c0e] border border-[#222226] rounded px-2.5 py-1 font-mono text-xs text-indigo-300">
                                  <span className="select-all truncate mr-2">{cmdText}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(cmdText);
                                      setCorsCopiedCmd(cmdText);
                                      onToast('명령어가 클립보드에 복사되었습니다.', 'success');
                                      setTimeout(() => setCorsCopiedCmd(null), 2500);
                                    }}
                                    className="btn-secondary text-[11px]"
                                  >
                                    {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                    <span>{isCopied ? '복사됨' : '복사'}</span>
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Inference Mode Presets & Advanced Parameters (Inline Row) */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1">
                        <label className="text-xs font-medium text-slate-300">추론 모드</label>
                        <HelpTooltip
                          side="top"
                          content="코딩이나 정밀 분석에는 '정밀·코드'를, 일반 용도에는 '균형', 창의적 아이디어 발상에는 '창의적'을 권장합니다."
                        />
                      </div>
                      <div className="inline-flex p-0.5 bg-[#09090b] border border-[#222226] rounded-md">
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
                              className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#18181b] text-white font-medium border border-[#222226]'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAdvancedParamsOpen(!isAdvancedParamsOpen)}
                      className="btn-secondary text-xs"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                      <span>세부 파라미터</span>
                      {isAdvancedParamsOpen ? (
                        <ChevronUp className="w-3 h-3 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* 4. Collapsible Advanced Parameters (Clean Spaced Rows without inner dividers) */}
                  {isAdvancedParamsOpen && (
                    <div className="bg-[#0c0c0e] border border-[#222226] rounded-md px-3.5 py-1.5 animate-in fade-in duration-150">
                      {/* Temperature Row */}
                      <div className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="sm:w-48 shrink-0 flex items-center justify-between sm:justify-start gap-1.5">
                          <span className="text-xs font-normal text-slate-300">온도 (Temperature)</span>
                          <HelpTooltip
                            side="top"
                            content="값이 낮을수록 결정적이고 일관된 답변을 생성하며, 높을수록 창의적이고 다양한 표현을 시도합니다."
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={localAiParams.temperature}
                            onChange={(e) =>
                              setLocalAiParams((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                            }
                            className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-[#18181b] rounded appearance-none"
                          />
                          <span className="w-14 text-right font-mono text-xs font-medium text-indigo-300 shrink-0">
                            {localAiParams.temperature.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Max Tokens Row */}
                      <div className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="sm:w-48 shrink-0 flex items-center justify-between sm:justify-start gap-1.5">
                          <span className="text-xs font-normal text-slate-300">최대 출력 토큰</span>
                          <HelpTooltip
                            side="top"
                            content="한 번의 질의에 AI가 생성할 수 있는 최대 토큰 수입니다."
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                          <input
                            type="range"
                            min="512"
                            max="16384"
                            step="512"
                            value={localAiParams.maxTokens}
                            onChange={(e) =>
                              setLocalAiParams((prev) => ({ ...prev, maxTokens: parseInt(e.target.value, 10) }))
                            }
                            className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-[#18181b] rounded appearance-none"
                          />
                          <span className="w-14 text-right font-mono text-xs font-medium text-indigo-300 shrink-0">
                            {localAiParams.maxTokens}
                          </span>
                        </div>
                      </div>

                      {/* Top-P Row */}
                      <div className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="sm:w-48 shrink-0 flex items-center justify-between sm:justify-start gap-1.5">
                          <span className="text-xs font-normal text-slate-300">표본 추출 확률 (Top-P)</span>
                          <HelpTooltip
                            side="top"
                            content="누적 확률 분포 상위 P 범위 내의 토큰 중에서만 다음 단어를 선택합니다."
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                          <input
                            type="range"
                            min="0.05"
                            max="1.0"
                            step="0.05"
                            value={localAiParams.topP}
                            onChange={(e) =>
                              setLocalAiParams((prev) => ({ ...prev, topP: parseFloat(e.target.value) }))
                            }
                            className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-[#18181b] rounded appearance-none"
                          />
                          <span className="w-14 text-right font-mono text-xs font-medium text-indigo-300 shrink-0">
                            {localAiParams.topP.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Streaming Checkbox Row */}
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-normal text-slate-300">스트리밍 실시간 응답</span>
                          <HelpTooltip
                            side="top"
                            content="답변이 생성되는 즉시 화면에 한 글자씩 실시간으로 표시합니다."
                          />
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localAiParams.streamEnabled}
                            onChange={(e) =>
                              setLocalAiParams((prev) => ({ ...prev, streamEnabled: e.target.checked }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-7 h-4 bg-[#18181b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 5. PDF 문서 파싱 엔진 (Flat Form Field) */}
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-medium text-slate-200">
                          PDF 문서 파싱 엔진
                        </span>
                        <HelpTooltip
                          side="top"
                          title="PDF 파싱 엔진 안내"
                          content="PDF 파일을 에디터로 불러올 때 사용할 방식을 지정합니다. 기본 브라우저 파서는 즉시 텍스트를 추출하며, 로컬 AI 파서는 제목, 표, 목록 구조를 정밀한 마크다운으로 재구성합니다."
                        />
                      </div>

                      {/* Parser Selector Segments */}
                      <div className="inline-flex p-0.5 bg-[#09090b] border border-[#222226] rounded-md shrink-0">
                        <button
                          type="button"
                          onClick={() => setPdfParserEngine('fast')}
                          className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center gap-1.5 ${
                            pdfParserEngine === 'fast'
                              ? 'bg-[#18181b] text-white font-medium border border-[#222226]'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>기본 브라우저 고속 파서</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPdfParserEngine('gemini')}
                          className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center gap-1.5 ${
                            pdfParserEngine === 'gemini'
                              ? 'bg-[#18181b] text-white font-medium border border-[#222226]'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>클라우드 AI 정밀 파서</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPdfParserEngine('ollama')}
                          className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center gap-1.5 ${
                            pdfParserEngine === 'ollama'
                              ? 'bg-[#18181b] text-white font-medium border border-[#222226]'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Server className="w-3 h-3 text-sky-400" />
                          <span>로컬 AI 구조화 파서</span>
                        </button>
                      </div>
                    </div>

                    {/* Ollama Local AI Options */}
                    {pdfParserEngine === 'ollama' && (
                      <div className="pt-1.5 space-y-2 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={pdfOllamaEndpoint}
                              onChange={(e) => setPdfOllamaEndpoint(e.target.value)}
                              placeholder="http://localhost:11434"
                              className="flex-1 bg-[#09090b] border border-[#222226] focus:border-indigo-500 rounded px-2.5 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleRefreshOllamaPdfModels}
                              disabled={isCheckingPdfOllama}
                              className="btn-secondary text-xs"
                              title="설치된 로컬 Ollama 모델 목록 새로고침"
                            >
                              <RotateCcw className={`w-3 h-3 ${isCheckingPdfOllama ? 'animate-spin' : ''}`} />
                              <span>확인</span>
                            </button>
                          </div>

                          <div className="relative">
                            <select
                              value={pdfOllamaModel}
                              onChange={(e) => setPdfOllamaModel(e.target.value)}
                              className="w-full bg-[#09090b] border border-[#222226] focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-slate-200 outline-none transition appearance-none cursor-pointer pr-6 truncate"
                            >
                              <optgroup label="추천 파싱 모델">
                                <option value="llama3.2-vision">ollama/llama3.2-vision - 서식 및 비전 추천</option>
                                <option value="deepseek-ocr">ollama/deepseek-ocr - 표 및 문서 특화</option>
                                <option value="qwen3.5">ollama/qwen3.5 - 다국어 양식 특화</option>
                                <option value="qwen2.5-coder">ollama/qwen2.5-coder - 코드 및 기술 분석 특화</option>
                                <option value="deepseek-r1:8b">ollama/deepseek-r1:8b - DeepSeek R1</option>
                                <option value="llama3.2:latest">ollama/llama3.2:latest - Llama 3.2</option>
                              </optgroup>
                              {discoveredPdfModels.length > 0 && (
                                <optgroup label="내 PC에 설치된 Ollama 모델">
                                  {discoveredPdfModels.map((m) => (
                                    <option key={m} value={m}>
                                      {m} - 로컬 설치됨
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <option value="custom">직접 입력 - 사용자 보유 모델</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {pdfOllamaModel === 'custom' && (
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-normal text-slate-400 shrink-0">커스텀 모델 태그:</label>
                            <input
                              type="text"
                              value={pdfCustomModel}
                              onChange={(e) => setPdfCustomModel(e.target.value)}
                              placeholder="예: llava:latest 또는 mistral:instruct"
                              className="flex-1 bg-[#09090b] border border-[#222226] focus:border-indigo-500 rounded px-2.5 py-1 text-xs font-mono text-slate-200 outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 1: AI Persona */}
              {activeTab === 'persona' && (
                <div className="space-y-4 animate-in fade-in duration-150 flex flex-col h-full">
                  {/* Row 1: Top 2 Fields in a 2-column grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
                    {/* Field 1: Assistant Name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-zinc-400 font-medium">어시스턴트 이름</label>
                        <HelpTooltip
                          content="대화창 및 시스템 출력 시 표시될 AI의 호칭입니다."
                        />
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
                        placeholder="Podium Assistant"
                        className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md px-3 py-2 text-xs text-slate-200 outline-none transition placeholder:text-slate-600"
                      />
                    </div>

                    {/* Field 2: Role / Tone */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-zinc-400 font-medium">역할 및 어조</label>
                        <HelpTooltip
                          content="AI 답변의 전문성 및 전반적인 커뮤니케이션 톤앤매너를 결정합니다."
                        />
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
                        placeholder="소프트웨어 엔지니어 및 기술 작가"
                        className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md px-3 py-2 text-xs text-slate-200 outline-none transition placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Row 2: System Instruction (Single Flat Textarea) */}
                  <div className="flex-1 flex flex-col min-h-0 space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-zinc-400 font-medium">시스템 프롬프트 지침</label>
                        <HelpTooltip
                          content="AI가 코드 작성, 번역 및 질의응답 시 최우선으로 준수해야 할 기본 지침입니다."
                        />
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
                        className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
                      className="w-full flex-1 min-h-[360px] bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md p-3 text-xs font-mono text-slate-200 outline-none transition resize-none leading-relaxed placeholder:text-slate-600"
                      placeholder="AI에게 전달할 프롬프트 지침 입력..."
                    />
                  </div>
                </div>
              )}

              {/* TAB: Integrations & Accounts */}
              {activeTab === 'integrations' && (
                <div className="bg-[#0c0c0e] border border-[#222226] rounded-md p-3.5 space-y-2 animate-in fade-in duration-150 text-xs">
                  {/* Item 1: Google Drive On-Demand & Workspace Integration */}
                  {(() => {
                    const isConnected = googleTokenStatus === 'connected' && !!googleUser;
                    const isExpired = googleTokenStatus === 'expired';

                    return (
                      <div className="flex items-center justify-between py-2 border-b border-white/[0.06] gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-[#18181b] text-indigo-400 border border-[#222226] flex items-center justify-center shrink-0">
                            <Globe className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-slate-200">구글 드라이브</span>
                              {isConnected ? (
                                <span className="badge-success text-[10px] px-1.5 py-0.5 rounded-sm font-mono flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  연동됨
                                </span>
                              ) : isExpired ? (
                                <span className="badge-warning text-[10px] px-1.5 py-0.5 rounded-sm font-mono">
                                  토큰 만료
                                </span>
                              ) : (
                                <span className="badge-muted text-[10px] px-1.5 py-0.5 rounded-sm font-mono">
                                  단독 연동 가능
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {isConnected && googleUser ? (
                                <span className="font-mono text-slate-300">
                                  {googleUser.email}
                                </span>
                              ) : (
                                '문서 불러오기 및 저장을 위한 온디맨드 연동'
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isConnected ? (
                            <>
                              <button
                                type="button"
                                onClick={onOpenGoogleDrive}
                                className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                                title="Google Drive 파일 탐색 모달 열기"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                                <span>드라이브 탐색</span>
                              </button>
                              <button
                                type="button"
                                onClick={onOpenGoogleAccount}
                                className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                                title="Google 계정 및 연결 관리"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                                <span>계정 관리</span>
                              </button>
                            </>
                          ) : isExpired ? (
                            <button
                              type="button"
                              onClick={onOpenGoogleDrive || onOpenGoogleAccount}
                              className="bg-zinc-800/80 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-amber-500/40 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>토큰 재인증 및 열기</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onOpenGoogleDrive || onOpenGoogleAccount}
                              className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                              title="Google OAuth 연동을 시작합니다."
                            >
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span>구글 드라이브 연결</span>
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
                      <div className="flex items-center justify-between py-2 border-b border-white/[0.06] gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-[#18181b] text-purple-400 border border-[#222226] flex items-center justify-center shrink-0">
                            <Github className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-slate-200">GitHub</span>
                              {isConnected ? (
                                <span className="badge-success text-[10px] px-1.5 py-0.5 rounded-sm font-mono flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  연결됨
                                </span>
                              ) : hasPat ? (
                                <span className="badge-warning text-[10px] px-1.5 py-0.5 rounded-sm font-mono">
                                  토큰 등록됨
                                </span>
                              ) : (
                                <span className="badge-muted text-[10px] px-1.5 py-0.5 rounded-sm font-mono">
                                  미연결
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {isConnected ? (
                                <span className="font-mono text-purple-300">{githubConfig?.owner}/{githubConfig?.repo}</span>
                              ) : (
                                '원격 저장소 커밋, 푸시, 브랜치 관리 및 동기화'
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={onOpenGithub}
                            className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Github className="w-3.5 h-3.5 text-slate-400" />
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
                      <div className="flex items-center justify-between py-2 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-[#18181b] text-indigo-400 border border-[#222226] flex items-center justify-center shrink-0">
                            <Server className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-slate-200">원격 서버</span>
                              {isConnected ? (
                                <span className="badge-success text-[10px] px-1.5 py-0.5 rounded-sm font-mono flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  연결됨
                                </span>
                              ) : (
                                <span className="badge-muted text-[10px] px-1.5 py-0.5 rounded-sm font-mono">
                                  미연결
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {isConnected ? (
                                <span className="font-mono text-indigo-300">
                                  {remoteConfig?.username || 'root'}@{remoteConfig?.host}:{remoteConfig?.port || 22}
                                </span>
                              ) : (
                                '원격 리눅스 서버 터미널 및 SFTP 파일 시스템 탐색'
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={onOpenRemoteSSH}
                            className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Server className="w-3.5 h-3.5 text-slate-400" />
                            <span>{isConnected ? '서버 관리' : '서버 설정'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB: Storage & IndexedDB */}
              {activeTab === 'storage' && (
                <StorageSettings
                  onToast={onToast}
                  onWipeAllData={onWipeAllData}
                />
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
                  <div className="space-y-3.5 divide-y divide-[#222226]">
                    {/* Mode & Level Selection */}
                    <div className="flex items-center justify-between gap-4 pt-1 first:pt-0">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-slate-300">작동 수준</label>
                        <HelpTooltip
                          title="고스트 라이터 수준"
                          content="에디터에서 문서를 작성하는 동안 백그라운드에서 실시간 번역 및 문맥 완성을 제안하는 강도입니다."
                        />
                      </div>
                      <div className="flex rounded bg-[#09090b] p-0.5 border border-[#222226]">
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
                                  ? 'bg-[#18181b] text-indigo-300 font-medium shadow-xs border border-indigo-500/40'
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
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-slate-300">번역 모델</label>
                        <HelpTooltip
                          title="고스트 라이터 전용 모델"
                          content="실시간 문장 생성 및 다국어 번역을 전담할 경량 고속 모델을 선택합니다."
                        />
                      </div>
                      <select
                        value={localPrefs.ghostWriterModel || (modelOptions && modelOptions[0]?.id) || 'gemini-2.5-flash'}
                        onChange={(e) => setLocalPrefs({ ...localPrefs, ghostWriterModel: e.target.value })}
                        className="w-64 bg-[#09090b] border border-[#222226] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition cursor-pointer"
                      >
                        {(() => {
                          const opts = modelOptions && modelOptions.length > 0 ? modelOptions : DEFAULT_FALLBACK_MODELS;
                          const cloudOpts = opts.filter((m) => (m as any).group !== 'local');
                          const localOpts = opts.filter((m) => (m as any).group === 'local');

                          if (cloudOpts.length > 0 && localOpts.length > 0) {
                            return (
                              <>
                                <optgroup label="클라우드 모델">
                                  {cloudOpts.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="로컬 모델">
                                  {localOpts.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </>
                            );
                          }

                          return opts.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#222226] bg-[#121214] flex justify-between items-center shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>설정은 브라우저 로컬 저장소에 안전하게 보존됩니다</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>저장 및 적용</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

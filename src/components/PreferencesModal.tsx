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
import type { GithubConfig } from './GithubIntegrationModal';
import { fetchOllamaInstalledModels } from '../services/documentConverterService';
import { HelpTooltip } from './HelpTooltip';
import { CustomSelectDropdown } from './CustomSelectDropdown';
import {
  verifyGeminiApiKey,
  verifyGeminiApiKeyDetailed,
  isValidGeminiKeyFormat
} from '../services/aiPodiumIntegration';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getSettingsTranslations } from '../locales/settingsLocale';
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
    placeholder: 'AIzaSy... 또는 AQ.Ab...',
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

export type PreferencesTab = 'ai' | 'ai-engine' | 'persona' | 'integrations' | 'storage' | 'security' | 'ghost-writer' | 'language';

export interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PreferencesTab | 'theme' | 'prompts';
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
  workspaceRootType?: 'local' | 'gdrive' | 'github';
  onOpenGoogleDrive?: () => void;
  githubConfig?: GithubConfig | null;
  onOpenGithub?: () => void;
  onOpenRoleAssignment?: () => void;
  dynamicModelsMap?: Record<string, { id: string; name: string }[]>;
  onUpdateDynamicModels?: (vendor: string, models: { id: string; name: string }[]) => void;
  apiKeys?: Record<string, string>;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'ai',
  preferences,
  onSave,
  onApplyPrompt,
  modelOptions,
  apiKeys: apiKeysProp,
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
  githubConfig = null,
  onOpenGithub,
  onOpenRoleAssignment,
  dynamicModelsMap,
  onUpdateDynamicModels
}) => {
  const auth = useAuth();
  const { language, preference: languagePreference, setPreference: setLanguagePreference } = useLanguage();
  const st = getSettingsTranslations(language);
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);
  const [activeTab, setActiveTab] = useState<PreferencesTab>('ai');

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
    setCorsDetails(st.cors.checking);
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
        setCorsDetails(st.cors.success(count));
        onToast(st.cors.successToast(count), 'success');
      } else {
        setCorsStatus('blocked');
        setCorsDetails(st.cors.httpError(res.status));
        onToast(st.cors.httpToast(res.status), 'warn');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setCorsStatus('offline');
        setCorsDetails(st.cors.timeout);
        onToast(st.cors.timeoutToast, 'warn');
      } else {
        setCorsStatus('blocked');
        setCorsDetails(st.cors.blocked);
        onToast(st.cors.blockedToast, 'error');
      }
    }
  }, [localEndpointInput, onToast, st]);

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
      const initialApiKeys = {
        gemini: currentApiKey || auth.getApiKey('gemini') || '',
        openai: auth.getApiKey('openai') || '',
        anthropic: auth.getApiKey('anthropic') || '',
        deepseek: auth.getApiKey('deepseek') || '',
        groq: auth.getApiKey('groq') || '',
        ...(auth.apiKeys || {}),
        ...(apiKeysProp || {}),
        ...(preferences.apiKeys || {})
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

      let targetTab: PreferencesTab = 'ai';
      if (initialTab === 'persona') targetTab = 'persona';
      else if (initialTab === 'integrations') targetTab = 'integrations';
      else if (initialTab === 'storage') targetTab = 'storage';
      else if (initialTab === 'security') targetTab = 'security';
      else if (initialTab === 'ghost-writer') targetTab = 'ghost-writer';
      else if (initialTab === 'language') targetTab = 'language';
      else targetTab = 'ai';

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
    // 1. Sanitize and save current key into localPrefs.apiKeys
    const rawKey = localApiKeyInput;
    const sanitizedKey = rawKey.trim();
    const updatedApiKeys = {
      ...(localPrefs.apiKeys || {}),
      [selectedVendor]: sanitizedKey
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
    // 4. If current model does not belong to the selected vendor, switch to vendor default model
    const vendorMeta = CLOUD_VENDORS.find((v) => v.id === vendorId);
    if (vendorMeta && vendorMeta.defaultModel) {
      const vendorModels = (vendorActiveModels[vendorId] && vendorActiveModels[vendorId].length > 0)
        ? vendorActiveModels[vendorId]
        : (VENDOR_MODELS_MAP[vendorId] || DEFAULT_FALLBACK_MODELS.filter((m) => m.vendor === vendorId));
      const modelBelongsToVendor = vendorModels.some((m) => m.id === localSelectedModel);
      if (!modelBelongsToVendor) {
        setLocalSelectedModel(vendorMeta.defaultModel);
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
      onToast(st.toasts.precise, 'info');
    } else if (preset === 'creative') {
      setLocalAiParams((prev) => ({
        ...prev,
        temperature: 1.2,
        topP: 0.95,
        maxTokens: 8192
      }));
      onToast(st.toasts.creative, 'info');
    } else {
      setLocalAiParams((prev) => ({
        ...prev,
        temperature: 0.7,
        topP: 0.95,
        maxTokens: 4096
      }));
      onToast(st.toasts.balanced, 'info');
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
    const rawKey = localApiKeyInput;
    const sanitizedKey = rawKey.trim();
    const updatedApiKeys = {
      ...(localPrefs.apiKeys || {}),
      [selectedVendor]: sanitizedKey
    };

    auth.setApiKeys(updatedApiKeys);
    if (auth.setDefaultModel) {
      auth.setDefaultModel(modelToSet);
    }

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
    if (selectedVendor === 'gemini' && onUpdateApiKey) {
      onUpdateApiKey(sanitizedKey);
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

    onToast(st.toasts.saved, 'success');
    onClose();
  };

  const handleTriggerVerify = async () => {
    if (localProviderType === 'cloud') {
      const rawKey = localApiKeyInput;
      const sanitizedKey = rawKey.trim();
      if (!sanitizedKey) {
        onToast(`${selectedVendor.toUpperCase()} API Key를 입력해주세요.`, 'warn');
        return;
      }

      if (selectedVendor === 'gemini') {
        if (!isValidGeminiKeyFormat(sanitizedKey)) {
          onToast('⚠️ 올바른 Gemini API 키 형식을 입력해 주세요.', 'warn');
          return;
        }
        try {
          const diag = await verifyGeminiApiKeyDetailed(sanitizedKey);
          if (!diag.valid) {
            const errDetail = diag.errorMessage || (diag.statusCode ? `HTTP ${diag.statusCode}` : '인증 실패');
            console.error(`Gemini verification error: ${errDetail}`);
            onToast(`⚠️ API 검증 실패: ${errDetail}`, 'error');
            return;
          }
        } catch (err: any) {
          console.error('Gemini Key verification failed:', err);
          onToast(`⚠️ API 검증 실패: ${err?.message || '네트워크 오류'}`, 'error');
          return;
        }
      }

      await auth.setApiKey(selectedVendor, sanitizedKey);
      setLocalPrefs((prev) => ({
        ...prev,
        apiKeys: {
          ...(prev.apiKeys || {}),
          [selectedVendor]: sanitizedKey
        }
      }));

      if (selectedVendor === 'gemini' && onUpdateApiKey) {
        onUpdateApiKey(sanitizedKey);
      }
      if (onSelectProvider) onSelectProvider('cloud');
      
      try {
        const models = await fetchProviderActiveModels(selectedVendor, sanitizedKey);
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

      onVerify(selectedVendor, sanitizedKey);
    } else {
      const ep = (localEndpointInput || 'http://localhost:11434').trim().replace(/\/+$/, '');
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
          className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-4xl h-[630px] max-h-[92vh] flex flex-col overflow-hidden text-zinc-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] bg-[#121214] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" />
              <h2 className="font-medium text-xs text-zinc-200 tracking-wide">
                {st.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] rounded transition cursor-pointer"
              title={st.close}
              aria-label={st.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-52 bg-[#0c0c0e] border-r border-white/[0.08] p-2 flex flex-col gap-1 shrink-0 select-none overflow-y-auto min-h-0">
              {/* TAB: AI Engine & Provider */}
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  (activeTab === 'ai' || activeTab === 'ai-engine')
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate">{st.tabs.ai}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 shrink-0 ml-1 font-normal">
                  {localProviderType === 'cloud' ? st.badges.cloud : st.badges.local}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('persona')}
                className={`w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'persona'
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate">{st.tabs.persona}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ghost-writer')}
                className={`w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'ghost-writer'
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate">{st.tabs.ghostWriter}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 shrink-0 ml-1 font-normal">
                  {localPrefs.ghostWriterLevel && localPrefs.ghostWriterLevel !== 'off'
                    ? `${localPrefs.ghostWriterLevel}%`
                    : 'OFF'}
                </span>
              </button>

              {(() => {
                const isGoogleConnected = googleTokenStatus === 'connected' && !!googleUser;
                const isGithubConnected = !!(githubConfig?.owner && githubConfig?.repo) || !!githubConfig?.token;
                const connectedCount = [isGoogleConnected, isGithubConnected].filter(Boolean).length;
                return (
                  <button
                    type="button"
                    onClick={() => setActiveTab('integrations')}
                    className={`w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                      activeTab === 'integrations'
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="truncate">{st.tabs.integrations}</span>
                    {connectedCount > 0 ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-normal shrink-0 ml-1">
                        {st.badges.connected(connectedCount)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-500 font-normal shrink-0 ml-1">
                        {st.badges.disconnected}
                      </span>
                    )}
                  </button>
                );
              })()}

              <button
                type="button"
                onClick={() => setActiveTab('storage')}
                className={`w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'storage'
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate">{st.tabs.storage}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 font-normal shrink-0 ml-1">
                  {st.badges.localDb}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate">{st.tabs.security}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('language')}
                className={`w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'language'
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{st.tabs.language}</span>
                </span>
              </button>

              {/* System Status & Environment Info Widget */}
              <div className="mt-auto pt-3 border-t border-white/[0.08] px-2 py-1.5 text-[11px] text-zinc-400 space-y-1.5 select-none">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500 font-normal">{st.status.build}</span>
                  <span className="font-mono text-zinc-300 font-normal">v2.4.0</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500 font-normal">{st.status.retention}</span>
                  <span className="font-mono text-zinc-300 flex items-center gap-1.5 font-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {st.status.encrypted}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 min-w-0 overflow-y-auto p-6 bg-[#16161a]">
              {/* TAB 0: AI Engine & Provider (Default fallback if not any other tab) */}
              {activeTab === 'language' && (
                <section className="max-w-xl space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-white/[0.06] pb-3">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {st.languagePanel.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {st.languagePanel.description}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {([
                      {
                        value: 'system',
                        title: st.languagePanel.systemTitle,
                        description: st.languagePanel.systemDescription
                      },
                      {
                        value: 'ko',
                        title: '한국어',
                        description: st.languagePanel.koDescription
                      },
                      {
                        value: 'en',
                        title: 'English',
                        description: st.languagePanel.enDescription
                      }
                    ] as const).map((option) => (
                      <label
                        key={option.value}
                        className="flex items-start gap-3 rounded-md border border-white/[0.08] bg-[#0c0c0e] p-3 hover:bg-white/[0.03] cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="app-language"
                          value={option.value}
                          checked={languagePreference === option.value}
                          onChange={() => setLanguagePreference(option.value)}
                          className="mt-0.5 accent-indigo-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-zinc-200">{option.title}</span>
                          <span className="mt-1 block text-[11px] leading-relaxed text-zinc-500">{option.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {(activeTab === 'ai' || activeTab === 'ai-engine' || !['persona', 'integrations', 'storage', 'security', 'ghost-writer', 'language'].includes(activeTab)) && (
                <div className="space-y-0 animate-in fade-in duration-150">
                  {/* 1. Mode Switcher: Cloud API vs Local Ollama */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
                    <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                      <span>{st.body.engineMode}</span>
                      <HelpTooltip
                        side="bottom"
                        content={st.body.engineModeHelp}
                      />
                    </div>
                    <div className="inline-flex p-0.5 bg-[#09090b] border border-white/10 rounded-md">
                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('cloud')}
                        className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center justify-center ${
                          localProviderType === 'cloud'
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>{st.body.cloudApi}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('local')}
                        className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center justify-center ${
                          localProviderType === 'local'
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>{st.body.localOllama}</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Provider Specific Credentials / Endpoint */}
                  {localProviderType === 'cloud' ? (
                    <div>
                      {/* BYOK Multi-Vendor Tabs - Flat Single Row */}
                      <div className="flex items-stretch border-b border-white/[0.06]">
                        {CLOUD_VENDORS.map((v) => {
                          const isSelected = selectedVendor === v.id;
                          const hasKey = !!(localPrefs.apiKeys?.[v.id] || (v.id === selectedVendor && localApiKeyInput.trim()));
                          const vendorShort = v.id === 'gemini' ? 'Google' : v.id === 'openai' ? 'OpenAI' : v.id === 'anthropic' ? 'Anthropic' : v.id === 'deepseek' ? 'DeepSeek' : 'Groq';
                          const vendorSub = v.id === 'gemini' ? st.body.vendorSubGemini : v.id === 'openai' ? 'GPT-4o' : v.id === 'anthropic' ? 'Claude' : v.id === 'deepseek' ? 'R1·V3' : st.body.vendorSubGroq;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleSelectVendor(v.id)}
                              className={`flex-1 py-2.5 px-1.5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 relative border-b-2 ${
                                isSelected
                                  ? 'border-indigo-500 text-white font-medium bg-white/[0.04]'
                                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-normal">
                                <span>{vendorShort}</span>
                                {hasKey && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={st.body.keyRegistered} />
                                )}
                              </div>
                              <span className={`text-[10px] leading-tight ${isSelected ? 'text-indigo-300 font-normal' : 'text-zinc-500 font-normal'}`}>
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
                          <div>
                            {/* API Key Row */}
                            <div className="py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-4">
                              <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                                <span>{st.body.apiKeyLabel(currentVendorMeta.name)}</span>
                                <HelpTooltip
                                  side="bottom"
                                  content={st.body.apiKeyHelp}
                                />
                              </div>
                              <div className="flex items-center gap-2 max-w-md w-full justify-end">
                                <div className="relative flex-1 max-w-xs">
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
                                    placeholder={st.body.apiKeyPlaceholder(currentVendorMeta.name)}
                                    className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md px-3 pr-8 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                    title={showApiKey ? st.body.hide : st.body.show}
                                  >
                                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleTriggerVerify}
                                  disabled={isVerifying}
                                  className="px-2.5 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                                >
                                  <span>{isVerifying ? st.body.verifying : st.body.verify}</span>
                                </button>

                                <a
                                  href={currentVendorMeta.signupUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
                                  title={st.vendors[currentVendorMeta.id as keyof typeof st.vendors]?.guide ?? currentVendorMeta.guide}
                                >
                                  <span>{st.body.getApiKey}</span>
                                </a>
                              </div>
                            </div>

                            {/* Model Selection Row */}
                            {(() => {
                              const spec = getModelSpec(localSelectedModel);
                              const contextStr = spec.contextTokens >= 1_000_000
                                ? `${spec.contextTokens / 1_000_000}M`
                                : `${Math.round(spec.contextTokens / 1_000)}K`;
                              const badgeClean = spec.badge ? spec.badge.replace(' 제공', '') : '';
                              const specText = st.body.modelSpec(contextStr, spec.inputCostPer1M.toFixed(spec.inputCostPer1M < 0.01 ? 3 : 2), spec.outputCostPer1M.toFixed(2), badgeClean);

                              return (
                                <div className="py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-4">
                                  <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                                    <span>{st.body.defaultModel}</span>
                                    <HelpTooltip
                                      side="bottom"
                                      content={specText || st.body.defaultModelHelp}
                                    />
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="min-w-[200px]">
                                      <CustomSelectDropdown
                                        value={localSelectedModel}
                                        onChange={(val) => setLocalSelectedModel(val)}
                                        options={(vendorActiveModels[selectedVendor] && vendorActiveModels[selectedVendor].length > 0
                                          ? vendorActiveModels[selectedVendor]
                                          : (VENDOR_MODELS_MAP[selectedVendor] || DEFAULT_FALLBACK_MODELS.filter((m) => m.vendor === selectedVendor))
                                        ).map((m) => ({ id: m.id, name: m.name }))}
                                      />
                                    </div>

                                    {onOpenRoleAssignment && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onOpenRoleAssignment();
                                        }}
                                        className="px-2.5 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
                                        title={st.body.roleModelsTitle}
                                      >
                                        <span>{st.body.roleModels}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Search Grounding for Gemini */}
                            {selectedVendor === 'gemini' && (
                              <div className="py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-4">
                                <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                                  <span>{st.body.googleSearch}</span>
                                  <HelpTooltip
                                    side="bottom"
                                    align="right"
                                    content={st.body.googleSearchHelp}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLocalGoogleGrounding(!localGoogleGrounding)}
                                  title={localGoogleGrounding ? st.body.googleSearchOff : st.body.googleSearchOn}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    localGoogleGrounding ? 'bg-indigo-600' : 'bg-white/10'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                      localGoogleGrounding ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div>
                      {/* Local Endpoint Row */}
                      <div className="py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-4">
                        <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                          <span>{st.body.ollamaEndpoint}</span>
                          <HelpTooltip
                            side="bottom"
                            content={st.body.ollamaEndpointHelp}
                          />
                        </div>
                        <div className="flex items-center gap-2 max-w-md w-full justify-end">
                          <input
                            type="text"
                            value={localEndpointInput}
                            onChange={(e) => setLocalEndpointInput(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="max-w-xs w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleTriggerVerify}
                            disabled={isVerifying}
                            className="px-2.5 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                          >
                            <span>{isVerifying ? st.body.connecting : st.body.verify}</span>
                          </button>
                        </div>
                      </div>

                      {/* Local Model Selector Row */}
                      <div className="py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-4">
                        <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                          <span>{st.body.localModel}</span>
                          <HelpTooltip
                            side="bottom"
                            content={st.body.localModelHelp}
                          />
                        </div>
                        <div className="min-w-[220px]">
                          <CustomSelectDropdown
                            value={localSelectedModel}
                            onChange={(val) => setLocalSelectedModel(val)}
                            options={localModelOptions.map((m) => ({ id: m.id, name: m.name }))}
                          />
                        </div>
                      </div>

                      {localSelectedModel === 'custom' && (
                        <div className="py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-4">
                          <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                            <span>{st.body.customTag}</span>
                            <HelpTooltip
                              side="bottom"
                              content={st.body.customTagHelp}
                            />
                          </div>
                          <input
                            type="text"
                            value={customModelInput}
                            onChange={(e) => setCustomModelInput(e.target.value)}
                            placeholder={st.body.customTagPlaceholder}
                            className="max-w-xs w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md px-3 py-1.5 text-xs text-zinc-200 outline-none transition"
                          />
                        </div>
                      )}

                      {/* CORS Diagnostic & Guide Row */}
                      <div className="py-3.5 border-b border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setIsCorsGuideOpen((prev) => !prev)}
                            className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            <span>{st.body.corsGuide}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${isCorsGuideOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => runCorsDiagnostic()}
                            disabled={corsStatus === 'testing'}
                            className="px-2.5 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                          >
                            <span>{corsStatus === 'testing' ? st.body.diagnosing : st.body.corsDiagnose}</span>
                          </button>
                        </div>

                        {/* Diagnostic Result */}
                        {corsStatus !== 'idle' && (
                          <div
                            className={`p-2.5 rounded-md border text-xs leading-relaxed flex items-start gap-2 ${
                              corsStatus === 'success'
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                                : corsStatus === 'blocked'
                                ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                                : corsStatus === 'offline'
                                ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                                : 'bg-[#09090b] border-white/10 text-zinc-300'
                            }`}
                          >
                            {corsStatus === 'success' ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <p className="font-normal">{corsDetails}</p>
                          </div>
                        )}

                        {/* Collapsible Accordion Content for CORS Commands */}
                        {isCorsGuideOpen && (
                          <div className="p-3 bg-[#09090b] border border-white/10 rounded-md space-y-2 text-xs">
                            <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                              <div className="flex gap-1">
                                {[
                                  { id: 'powershell', label: st.body.osPowershell },
                                  { id: 'windows-persist', label: st.body.osWindowsPersist },
                                  { id: 'unix', label: st.body.osUnix },
                                  { id: 'lmstudio', label: 'LM Studio' }
                                ].map((tab) => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setCorsOsTab(tab.id as any)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-normal transition cursor-pointer ${
                                      corsOsTab === tab.id
                                        ? 'bg-white/10 text-white font-medium'
                                        : 'text-zinc-400 hover:text-zinc-200'
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
                                cmdText = st.body.lmStudioCors;
                              }

                              const isCopied = corsCopiedCmd === cmdText;

                              return (
                                <div className="flex items-center justify-between bg-[#0c0c0e] border border-white/10 rounded-md px-3 py-1.5 font-mono text-xs text-indigo-300">
                                  <span className="select-all truncate mr-2">{cmdText}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(cmdText);
                                      setCorsCopiedCmd(cmdText);
                                      onToast(st.body.copied, 'success');
                                      setTimeout(() => setCorsCopiedCmd(null), 2500);
                                    }}
                                    className="px-2 py-1 rounded text-[11px] text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <span>{isCopied ? st.body.copiedShort : st.body.copy}</span>
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Inference Mode Presets */}
                  <div className="py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-4">
                    <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                      <span>{st.body.inferenceMode}</span>
                      <HelpTooltip
                        side="top"
                        content={st.body.inferenceModeHelp}
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="inline-flex p-0.5 bg-[#09090b] border border-white/10 rounded-md">
                        {[
                          { id: 'precision', label: st.body.presetPrecise },
                          { id: 'balanced', label: st.body.presetBalanced },
                          { id: 'creative', label: st.body.presetCreative }
                        ].map((p) => {
                          const isSelected = currentPreset === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleApplyPreset(p.id as any)}
                              className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer ${
                                isSelected
                                  ? 'bg-white/10 text-white font-medium'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAdvancedParamsOpen(!isAdvancedParamsOpen)}
                        className="px-2.5 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{st.body.detailParams}</span>
                        {isAdvancedParamsOpen ? (
                          <ChevronUp className="w-3 h-3 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-zinc-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 4. Collapsible Advanced Parameters */}
                  {isAdvancedParamsOpen && (
                    <div className="py-3.5 border-b border-white/[0.06] space-y-3">
                      {/* Temperature Row */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="w-48 shrink-0 flex items-center gap-1.5">
                          <span className="text-xs text-zinc-300">{st.body.temperature}</span>
                          <HelpTooltip
                            side="top"
                            content={st.body.temperatureHelp}
                          />
                        </div>
                        <div className="flex-1 max-w-sm flex items-center gap-3">
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
                          <span className="w-12 text-right font-mono text-xs font-medium text-zinc-300 shrink-0">
                            {localAiParams.temperature.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Max Tokens Row */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="w-48 shrink-0 flex items-center gap-1.5">
                          <span className="text-xs text-zinc-300">{st.body.maxTokens}</span>
                          <HelpTooltip
                            side="top"
                            content={st.body.maxTokensHelp}
                          />
                        </div>
                        <div className="flex-1 max-w-sm flex items-center gap-3">
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
                          <span className="w-12 text-right font-mono text-xs font-medium text-zinc-300 shrink-0">
                            {localAiParams.maxTokens}
                          </span>
                        </div>
                      </div>

                      {/* Top-P Row */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="w-48 shrink-0 flex items-center gap-1.5">
                          <span className="text-xs text-zinc-300">{st.body.topP}</span>
                          <HelpTooltip
                            side="top"
                            content={st.body.topPHelp}
                          />
                        </div>
                        <div className="flex-1 max-w-sm flex items-center gap-3">
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
                          <span className="w-12 text-right font-mono text-xs font-medium text-zinc-300 shrink-0">
                            {localAiParams.topP.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Streaming Checkbox Row */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-300">{st.body.streaming}</span>
                          <HelpTooltip
                            side="top"
                            content={st.body.streamingHelp}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setLocalAiParams((prev) => ({ ...prev, streamEnabled: !prev.streamEnabled }))}
                          title={localAiParams.streamEnabled ? st.body.streamingOff : st.body.streamingOn}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            localAiParams.streamEnabled ? 'bg-indigo-600' : 'bg-white/10'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                              localAiParams.streamEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5. PDF parsing engine */}
                  <div className="py-3.5 border-b border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                        <span>{st.body.pdfEngine}</span>
                        <HelpTooltip
                          side="top"
                          title={st.body.pdfEngineTitle}
                          content={st.body.pdfEngineHelp}
                        />
                      </div>

                      {/* Parser Selector Segments */}
                      <div className="inline-flex p-0.5 bg-[#09090b] border border-white/10 rounded-md shrink-0">
                        <button
                          type="button"
                          onClick={() => setPdfParserEngine('fast')}
                          className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center justify-center ${
                            pdfParserEngine === 'fast'
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>{st.body.pdfBrowser}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPdfParserEngine('gemini')}
                          className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center justify-center ${
                            pdfParserEngine === 'gemini'
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>{st.body.pdfCloud}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPdfParserEngine('ollama')}
                          className={`px-3 py-1 rounded text-xs font-normal transition cursor-pointer flex items-center justify-center ${
                            pdfParserEngine === 'ollama'
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>{st.body.pdfLocal}</span>
                        </button>
                      </div>
                    </div>

                    {/* Ollama Local AI Options */}
                    {pdfParserEngine === 'ollama' && (
                      <div className="pt-2 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={pdfOllamaEndpoint}
                              onChange={(e) => setPdfOllamaEndpoint(e.target.value)}
                              placeholder="http://localhost:11434"
                              className="flex-1 bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleRefreshOllamaPdfModels}
                              disabled={isCheckingPdfOllama}
                              className="px-2.5 py-1 rounded text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors inline-flex items-center justify-center cursor-pointer"
                              title={st.body.refreshModels}
                            >
                              <span>{isCheckingPdfOllama ? st.body.checking : st.body.check}</span>
                            </button>
                          </div>

                          <div className="w-full">
                            <CustomSelectDropdown
                              value={pdfOllamaModel}
                              onChange={(val) => setPdfOllamaModel(val)}
                              groups={[
                                {
                                  label: st.body.recommendedParsers,
                                  options: [
                                    { id: 'llama3.2-vision', name: st.body.parserVision },
                                    { id: 'deepseek-ocr', name: st.body.parserOcr },
                                    { id: 'qwen3.5', name: st.body.parserQwen },
                                    { id: 'qwen2.5-coder', name: st.body.parserCoder },
                                    { id: 'deepseek-r1:8b', name: 'ollama/deepseek-r1:8b · DeepSeek R1' },
                                    { id: 'llama3.2:latest', name: 'ollama/llama3.2:latest · Llama 3.2' },
                                  ]
                                },
                                ...(discoveredPdfModels.length > 0 ? [{
                                  label: st.body.installedOllama,
                                  options: discoveredPdfModels.map((m) => ({ id: m, name: st.body.installedSuffix(m) }))
                                }] : []),
                                {
                                  options: [
                                    { id: 'custom', name: st.body.customOwned }
                                  ]
                                }
                              ]}
                            />
                          </div>
                        </div>

                        {pdfOllamaModel === 'custom' && (
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-normal text-zinc-400 shrink-0">{st.body.customTagColon}</label>
                            <input
                              type="text"
                              value={pdfCustomModel}
                              onChange={(e) => setPdfCustomModel(e.target.value)}
                              placeholder={st.body.pdfTagPlaceholder}
                              className="flex-1 bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 outline-none"
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
                        <label className="text-xs text-zinc-300 font-medium">{st.body.assistantName}</label>
                        <HelpTooltip
                          content={st.body.assistantNameHelp}
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
                        className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600"
                      />
                    </div>

                    {/* Field 2: Role / Tone */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-zinc-300 font-medium">{st.body.roleTone}</label>
                        <HelpTooltip
                          content={st.body.roleToneHelp}
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
                        placeholder={st.body.rolePlaceholder}
                        className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Row 2: System Instruction (Single Flat Textarea) */}
                  <div className="flex-1 flex flex-col min-h-0 space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-zinc-300 font-medium">{st.body.systemPrompt}</label>
                        <HelpTooltip
                          content={st.body.systemPromptHelp}
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
                        className="px-2.5 py-1 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors inline-flex items-center justify-center cursor-pointer"
                      >
                        <span>{st.body.restoreDefault}</span>
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
                      className="w-full flex-1 min-h-[360px] bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded-md p-3 text-xs font-mono text-zinc-200 outline-none transition resize-none leading-relaxed placeholder:text-zinc-600"
                      placeholder={st.body.systemPromptPlaceholder}
                    />
                  </div>
                </div>
              )}

              {/* TAB: Integrations & Accounts */}
              {activeTab === 'integrations' && (
                <div className="divide-y divide-white/[0.06] animate-in fade-in duration-150">
                  {/* Item 1: Google Drive On-Demand & Workspace Integration */}
                  {(() => {
                    const isConnected = googleTokenStatus === 'connected' && !!googleUser;
                    const isExpired = googleTokenStatus === 'expired';

                    return (
                      <div className="py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-zinc-200">{st.body.googleDrive}</span>
                          <HelpTooltip
                            side="bottom"
                            content={st.body.googleDriveHelp}
                          />
                          {isConnected && googleUser && (
                            <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[200px]">
                              {googleUser.email}
                            </span>
                          )}
                          {isConnected && (
                            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-normal shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>{st.body.linked}</span>
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-[11px] text-amber-400 font-normal shrink-0">
                              {st.body.tokenExpired}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isConnected ? (
                            <>
                              <button
                                type="button"
                                onClick={onOpenGoogleDrive}
                                className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
                                title={st.body.openDrivePicker}
                              >
                                <span>{st.body.browseDrive}</span>
                              </button>
                              <button
                                type="button"
                                onClick={onOpenGoogleAccount}
                                className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
                                title={st.body.manageGoogle}
                              >
                                <span>{st.body.manageAccount}</span>
                              </button>
                            </>
                          ) : isExpired ? (
                            <button
                              type="button"
                              onClick={onOpenGoogleDrive || onOpenGoogleAccount}
                              className="px-3 py-1.5 rounded-md text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
                            >
                              <span>{st.body.reauth}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onOpenGoogleDrive || onOpenGoogleAccount}
                              className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
                              title={st.body.startOauth}
                            >
                              <span>{st.body.connectDrive}</span>
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
                      <div className="py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-zinc-200">GitHub</span>
                          <HelpTooltip
                            side="bottom"
                            content={st.body.githubHelp}
                          />
                          {isConnected && (
                            <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[200px]">
                              {githubConfig?.repo?.includes('/')
                                ? githubConfig.repo
                                : (githubConfig?.owner ? `${githubConfig.owner}/${githubConfig.repo}` : githubConfig?.repo)}
                            </span>
                          )}
                          {isConnected && (
                            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-normal shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>{st.body.connected}</span>
                            </span>
                          )}
                          {!isConnected && hasPat && (
                            <span className="text-[11px] text-amber-400 font-normal shrink-0">
                              {st.body.tokenRegistered}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={onOpenGithub}
                            className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
                          >
                            <span>{isConnected ? st.body.manageRepo : st.body.connectSettings}</span>
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
                <div className="divide-y divide-white/[0.06] animate-in fade-in duration-150">
                  {/* Mode & Level Selection */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                      <span>{st.body.ghostLevel}</span>
                      <HelpTooltip
                        title={st.body.ghostLevelTitle}
                        content={st.body.ghostLevelHelp}
                      />
                    </div>
                    <div className="inline-flex p-0.5 bg-[#09090b] border border-white/10 rounded-md shrink-0">
                      {[
                        { id: 'off', label: st.body.off },
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
                            className={`px-2.5 py-1 text-xs font-normal rounded transition cursor-pointer ${
                              isSelected
                                ? 'bg-white/10 text-white font-medium'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {lvl.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Translation Model Selection */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0">
                      <span>{st.body.translationModel}</span>
                      <HelpTooltip
                        title={st.body.ghostModelTitle}
                        content={st.body.ghostModelHelp}
                      />
                    </div>
                    <div className="min-w-[220px]">
                      {(() => {
                        const opts = modelOptions && modelOptions.length > 0 ? modelOptions : DEFAULT_FALLBACK_MODELS;
                        const cloudOpts = opts.filter((m) => (m as any).group !== 'local');
                        const localOpts = opts.filter((m) => (m as any).group === 'local');
                        const currentVal = localPrefs.ghostWriterModel || (modelOptions && modelOptions[0]?.id) || 'gemini-2.5-flash';

                        return (
                          <CustomSelectDropdown
                            value={currentVal}
                            onChange={(val) => setLocalPrefs({ ...localPrefs, ghostWriterModel: val })}
                            groups={cloudOpts.length > 0 && localOpts.length > 0 ? [
                              {
                                label: st.body.cloudModels,
                                options: cloudOpts.map((m) => ({ id: m.id, name: m.name }))
                              },
                              {
                                label: st.body.localModels,
                                options: localOpts.map((m) => ({ id: m.id, name: m.name }))
                              }
                            ] : [
                              {
                                options: opts.map((m) => ({ id: m.id, name: m.name }))
                              }
                            ]}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.08] bg-[#121214] flex justify-between items-center shrink-0">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{st.body.footerNote}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                {st.body.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{st.body.saveApply}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

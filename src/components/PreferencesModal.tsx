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
  Search,
  Zap,
  FileText,
  Coins,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SecuritySettings, SecurityConfig, DEFAULT_SECURITY_CONFIG } from './SecuritySettings';
import { StorageSettings } from './StorageSettings';
import { googleDriveService, GoogleUserProfile } from '../services/googleDriveService';
import type { RemoteConfig } from './RemoteWorkspaceModal';
import type { GithubConfig } from './GithubIntegrationModal';
import { fetchOllamaInstalledModels } from '../services/documentConverterService';
import { HelpTooltip } from './HelpTooltip';

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
    engine: 'fast' | 'ollama';
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
  defaultModel: 'gemini-3.8-flash',
  ghostWriterLevel: 'off',
  ghostWriterModel: 'gemini-3.8-flash',
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
    badge: '무료 추천',
    isRecommended: true,
    signupUrl: 'https://aistudio.google.com/apikey',
    signupLabel: 'API 키 발급 ↗',
    guide: 'Google AI Studio에서 구글 계정으로 로그인 후 무료 API 키를 발급받을 수 있습니다. 안정적인 고속 쿼리를 지원합니다.',
    placeholder: 'AIzaSy...',
    defaultModel: 'gemini-3.8-flash'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: '공식 API',
    signupUrl: 'https://platform.openai.com/api-keys',
    signupLabel: 'API 키 발급 ↗',
    guide: 'OpenAI 콘솔에서 발급받은 API 키로 GPT-4o 및 최신 모델을 직접 연동합니다.',
    placeholder: 'sk-proj-... 또는 sk-...',
    defaultModel: 'gpt-4o'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    badge: 'Claude 연동',
    signupUrl: 'https://console.anthropic.com/settings/keys',
    signupLabel: 'API 키 발급 ↗',
    guide: 'Anthropic 콘솔에서 발급받은 API 키로 Claude 3.5 모델을 연동합니다.',
    placeholder: 'sk-ant-...',
    defaultModel: 'claude-3.5-sonnet'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: '초저비용 추론',
    signupUrl: 'https://platform.deepseek.com/api_keys',
    signupLabel: 'API 키 발급 ↗',
    guide: 'DeepSeek 오픈 플랫폼에서 R1 추론 모델 및 V3 API 키를 생성하여 사용할 수 있습니다.',
    placeholder: 'sk-...',
    defaultModel: 'deepseek-r1'
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    badge: '초고속 LPU',
    signupUrl: 'https://console.groq.com/keys',
    signupLabel: 'API 키 발급 ↗',
    guide: 'Groq 콘솔에서 Llama 3.3 초고속 추론용 무료 API 키를 발급받을 수 있습니다.',
    placeholder: 'gsk_...',
    defaultModel: 'llama-3.3-70b-versatile'
  }
];

const CLOUD_MODEL_OPTIONS = [
  {
    group: 'Google Gemini',
    models: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (추천)' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' }
    ]
  },
  {
    group: 'DeepSeek 및 오픈소스',
    models: [
      { id: 'deepseek-r1', name: 'DeepSeek R1 (추론)' },
      { id: 'deepseek-v3', name: 'DeepSeek V3' },
      { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder 32B' }
    ]
  },
  {
    group: 'OpenAI 및 Anthropic',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' }
    ]
  }
];

export interface ModelSpec {
  name: string;
  contextWindow: string; // e.g. "1M", "128K"
  contextTokens: number;
  inputCostPer1M: number; // in USD
  outputCostPer1M: number; // in USD
  badge: string; // e.g. "무료 티어 제공", "초저비용"
  badgeColor: string; // Tailwind class
  description: string;
}

export const MODEL_SPECS: Record<string, ModelSpec> = {
  'gemini-3.8-flash': {
    name: 'Gemini 3.8 Flash',
    contextWindow: '100만 토큰',
    contextTokens: 1000000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    badge: '무료 티어 제공',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'AI Studio 분당 무료 요청(RPM) 제공, 초대용량 1M 컨텍스트 지원'
  },
  'gemini-3.1-pro-preview': {
    name: 'Gemini 3.1 Pro',
    contextWindow: '200만 토큰',
    contextTokens: 2000000,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
    badge: '복합 추론 특화',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    description: '초대형 2M 컨텍스트 지원 및 복잡한 코드·문서 논리 추론'
  },
  'gemini-3.1-flash-lite': {
    name: 'Gemini 3.1 Flash-Lite',
    contextWindow: '100만 토큰',
    contextTokens: 1000000,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    badge: '극초저비용 고속',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    description: '경량 초고속 응답 속도 및 최소 비용 단가'
  },
  'deepseek-r1': {
    name: 'DeepSeek R1',
    contextWindow: '6.4만 토큰',
    contextTokens: 64000,
    inputCostPer1M: 0.55,
    outputCostPer1M: 2.19,
    badge: '심층 추론 엔진',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'OpenAI o1급 추론 알고리즘 탑재, 높은 가성비'
  },
  'deepseek-v3': {
    name: 'DeepSeek V3',
    contextWindow: '6.4만 토큰',
    contextTokens: 64000,
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
    badge: '초저비용 범용',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: '초당 처리량 극대화 및 파격적인 저렴한 토큰 단가'
  },
  'qwen-2.5-coder': {
    name: 'Qwen 2.5 Coder 32B',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.20,
    outputCostPer1M: 0.60,
    badge: '코딩 특화 오픈소스',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: '프로그래밍 코드 분석, 리팩토링, 디버깅 최적화'
  },
  'gpt-4o': {
    name: 'GPT-4o',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    badge: '플래그십 모델',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description: 'OpenAI 대표 올라운드 멀티모달 모델, 우수한 성능'
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    badge: '가성비 고속',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: '경량 고속 텍스트 생성 및 경제적인 일상 질의'
  },
  'claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    contextWindow: '20만 토큰',
    contextTokens: 200000,
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    badge: '최상위 코딩·작문',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: '탁월한 한국어 작문력과 복잡한 프런트엔드 아키텍처 코딩'
  },
  'llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B (Groq)',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
    badge: '초당 300+ 토큰',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    description: 'Groq LPU 기반 실시간 수준의 초고속 토큰 스트리밍'
  }
};

export const getModelSpec = (modelId: string): ModelSpec => {
  if (MODEL_SPECS[modelId]) return MODEL_SPECS[modelId];
  // Fallbacks by prefix
  if (modelId.startsWith('gemini')) return MODEL_SPECS['gemini-3.8-flash'];
  if (modelId.startsWith('deepseek-r1')) return MODEL_SPECS['deepseek-r1'];
  if (modelId.startsWith('deepseek')) return MODEL_SPECS['deepseek-v3'];
  if (modelId.startsWith('gpt-4o-mini')) return MODEL_SPECS['gpt-4o-mini'];
  if (modelId.startsWith('gpt-')) return MODEL_SPECS['gpt-4o'];
  if (modelId.startsWith('claude')) return MODEL_SPECS['claude-3.5-sonnet'];
  if (modelId.startsWith('llama')) return MODEL_SPECS['llama-3.3-70b-versatile'];
  return {
    name: modelId,
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.50,
    outputCostPer1M: 1.50,
    badge: '표준 API',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    description: '범용 LLM 모델'
  };
};

const DEFAULT_LOCAL_MODEL_OPTIONS = [
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
  { id: 'deepseek-r1-8b-local', name: 'DeepSeek R1 8B (로컬)' },
  { id: 'deepseek-r1', name: 'DeepSeek R1 70B (서버)' },
  { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder' },
  { id: 'mistral-7b-local', name: 'Mistral 7B Instruct' },
  { id: 'gemma2:9b', name: 'Gemma 2 9B' },
  { id: 'custom', name: '직접 입력' }
];

export interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ai-engine' | 'persona' | 'integrations' | 'storage' | 'security' | 'ghost-writer' | 'theme' | 'prompts';
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  onApplyPrompt?: (promptBody: string) => void;
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
  selectedModel = 'gemini-3.8-flash',
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
  onOpenGithub
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

  // Token Indicator & Simulation State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [simInputTokens, setSimInputTokens] = useState<number>(2500); // approx 1 request or document
  const [simOutputTokens, setSimOutputTokens] = useState<number>(800); // approx response
  const [simCallCount, setSimCallCount] = useState<number>(50); // queries/month

  // Local AI (Ollama) CORS Diagnostics State
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
  const [pdfParserEngine, setPdfParserEngine] = useState<'fast' | 'ollama'>(
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
          try {
            localStorage.setItem('aipodium_discovered_models', JSON.stringify(formatted));
          } catch {}
          onUpdateDiscoveredModels?.(formatted);
          return;
        }
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
        setLocalSelectedModel('gemini-3.8-flash');
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
    // 4. Update default model if appropriate
    const vendorMeta = CLOUD_VENDORS.find((v) => v.id === vendorId);
    if (vendorMeta && vendorMeta.defaultModel) {
      if (vendorId === 'gemini' && !localSelectedModel.startsWith('gemini-')) {
        setLocalSelectedModel('gemini-3.8-flash');
      } else if (vendorId === 'openai' && !localSelectedModel.startsWith('gpt-')) {
        setLocalSelectedModel('gpt-4o');
      } else if (vendorId === 'anthropic' && !localSelectedModel.startsWith('claude-')) {
        setLocalSelectedModel('claude-3.5-sonnet');
      } else if (vendorId === 'deepseek' && !localSelectedModel.startsWith('deepseek-')) {
        setLocalSelectedModel('deepseek-r1');
      } else if (vendorId === 'groq' && !localSelectedModel.startsWith('llama-')) {
        setLocalSelectedModel('llama-3.3-70b-versatile');
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

  const handleTriggerVerify = () => {
    if (localProviderType === 'cloud') {
      const key = localApiKeyInput.trim();
      if (!key) {
        onToast(`${selectedVendor.toUpperCase()} API Key를 입력해주세요.`, 'warn');
        return;
      }
      onUpdateApiKey(key);
      if (onSelectProvider) onSelectProvider('cloud');
      onVerify(selectedVendor, key);
    } else {
      const ep = localEndpointInput.trim() || 'http://localhost:11434';
      onUpdateEndpoint(ep);
      if (onSelectProvider) onSelectProvider('local-pc');
      fetchLocalModels(ep);
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
          className="bg-[#1e202b] border border-[#2e3142] rounded-xl shadow-2xl w-full max-w-4xl h-[630px] max-h-[92vh] flex flex-col overflow-hidden text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#2e3142] bg-[#1e202b] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#282a38] text-indigo-400 border border-[#2e3142]">
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
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#282a38] rounded transition cursor-pointer"
              title="닫기"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-52 bg-[#16171e] border-r border-[#2e3142] p-2 flex flex-col gap-1 shrink-0 select-none overflow-y-auto min-h-0">
              {/* TAB: AI Engine & Provider */}
              <button
                type="button"
                onClick={() => setActiveTab('ai-engine')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'ai-engine'
                    ? 'bg-[#282a38] text-indigo-300 font-semibold border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#282a38]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Cpu className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'ai-engine' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">AI 엔진 설정</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#121318] text-slate-400 border border-[#2e3142] shrink-0 ml-1">
                  {localProviderType === 'cloud' ? '클라우드' : '로컬'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('persona')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'persona'
                    ? 'bg-[#282a38] text-indigo-300 font-semibold border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#282a38]/50'
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
                    ? 'bg-[#282a38] text-indigo-300 font-semibold border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#282a38]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Ghost className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'ghost-writer' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">고스트 라이터</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ml-1 ${
                    localPrefs.ghostWriterLevel && localPrefs.ghostWriterLevel !== 'off'
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 font-semibold'
                      : 'bg-[#121318] text-slate-500 border-[#2e3142]'
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
                        ? 'bg-[#282a38] text-indigo-300 font-semibold border-l-2 border-indigo-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#282a38]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'integrations' ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="truncate">계정 연동</span>
                    </div>
                    {connectedCount > 0 ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shrink-0 ml-1">
                        {connectedCount}개 연결
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#121318] text-slate-500 border border-[#2e3142] shrink-0 ml-1">
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
                    ? 'bg-[#282a38] text-indigo-300 font-semibold border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#282a38]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Database className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'storage' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">저장소 및 DB</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#121318] text-slate-400 border border-[#2e3142] shrink-0 ml-1">
                  로컬 DB
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-[#282a38] text-indigo-300 font-semibold border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#282a38]/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'security' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">보안 및 볼트</span>
                </div>
              </button>

              {/* System Status & Environment Info Widget */}
              <div className="mt-auto pt-3 border-t border-[#2e3142]/60 px-2 py-1.5 text-[11px] text-slate-400 space-y-1.5 select-none">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">빌드 환경</span>
                  <span className="font-mono text-indigo-300 font-semibold">v2.4.0 (IDE)</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">데이터 보존</span>
                  <span className="font-mono text-emerald-400 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    로컬 암호화
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-[#1e202b] min-h-0">
              {/* TAB 0: AI Engine & Provider */}
              {activeTab === 'ai-engine' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* 1. Mode Switcher: Cloud API vs Local Ollama */}
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#2e3142]">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <label className="text-xs font-semibold text-slate-200">엔진 제공자</label>
                    </div>
                    <div className="inline-flex p-0.5 bg-[#121318] border border-[#2e3142] rounded-md">
                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('cloud')}
                        className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          localProviderType === 'cloud'
                            ? 'bg-[#282a38] text-white shadow-xs font-semibold border border-[#2e3142]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>클라우드 API</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchProvider('local')}
                        className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          localProviderType === 'local'
                            ? 'bg-[#282a38] text-white shadow-xs font-semibold border border-[#2e3142]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Server className="w-3 h-3 text-indigo-400" />
                        <span>로컬 Ollama / 서버</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Provider Specific Credentials / Endpoint */}
                  {localProviderType === 'cloud' ? (
                    <div className="bg-[#16171e] border border-[#2e3142] rounded-xl overflow-hidden shadow-xs">
                      {/* BYOK Multi-Vendor Tabs - Flat Bottom-Border Tabs */}
                      <div className="flex items-stretch border-b border-[#2e3142] bg-[#121318]/70">
                        {CLOUD_VENDORS.map((v) => {
                          const isSelected = selectedVendor === v.id;
                          const hasKey = !!(localPrefs.apiKeys?.[v.id] || (v.id === selectedVendor && localApiKeyInput.trim()));
                          const vendorShort = v.id === 'gemini' ? 'Google' : v.id === 'openai' ? 'OpenAI' : v.id === 'anthropic' ? 'Anthropic' : v.id === 'deepseek' ? 'DeepSeek' : 'Groq';
                          const vendorSub = v.id === 'gemini' ? '무료 추천' : v.id === 'openai' ? 'GPT-4o' : v.id === 'anthropic' ? 'Claude' : v.id === 'deepseek' ? 'R1·V3' : '초고속 LPU';
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleSelectVendor(v.id)}
                              className={`flex-1 py-2.5 px-1.5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 relative -mb-[1px] border-b-2 ${
                                isSelected
                                  ? 'border-indigo-500 text-white font-semibold bg-[#1e202b]/60'
                                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#282a38]/30'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-xs">
                                <span>{vendorShort}</span>
                                {hasKey && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="키 등록됨" />
                                )}
                              </div>
                              <span className={`text-[10px] leading-tight ${isSelected ? 'text-indigo-300 font-medium' : 'text-slate-500'}`}>
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
                          <div className="p-3.5 space-y-3">
                            {/* API Key Row */}
                            <div className="flex items-center gap-2">
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
                                  placeholder={`${currentVendorMeta.name} API 키 입력 (${currentVendorMeta.placeholder})`}
                                  className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded-md px-3 pr-8 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
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
                                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                              >
                                <PlugZap className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                                <span>{isVerifying ? '검증 중' : '검증'}</span>
                              </button>

                              <a
                                href={currentVendorMeta.signupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-md bg-[#282a38] hover:bg-[#323548] text-indigo-300 hover:text-indigo-200 text-xs font-medium transition flex items-center gap-1 shrink-0 border border-indigo-500/30 cursor-pointer shadow-xs whitespace-nowrap"
                                title={currentVendorMeta.guide}
                              >
                                <span>{currentVendorMeta.signupLabel}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Unified Model Console (Model + Search + Token Spec + Simulator) */}
                            {(() => {
                              const spec = getModelSpec(localSelectedModel);
                              const singleCostUSD = (simInputTokens * (spec.inputCostPer1M / 1_000_000)) + (simOutputTokens * (spec.outputCostPer1M / 1_000_000));
                              const totalCostUSD = singleCostUSD * simCallCount;
                              const krwRate = 1420;
                              const totalCostKRW = Math.round(totalCostUSD * krwRate);

                              return (
                                <div className="bg-[#121318] border border-[#2e3142] rounded-lg overflow-hidden transition">
                                  {/* Row 1: Model Selector & Real-Time Google Search Grounding */}
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-[#2e3142]">
                                    {/* Left: Model selector */}
                                    <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2">
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[11px] font-medium text-slate-400">기본 모델</span>
                                        <HelpTooltip
                                          side="bottom"
                                          title="기본 모델 선택"
                                          content="질의응답, 문서 번역 및 코드 제안에 기본으로 사용할 AI 모델을 지정합니다."
                                        />
                                      </div>
                                      <div className="relative flex-1 min-w-0">
                                        <select
                                          value={localSelectedModel}
                                          onChange={(e) => setLocalSelectedModel(e.target.value)}
                                          className="w-full bg-transparent text-xs text-slate-200 outline-none appearance-none cursor-pointer pr-5 truncate text-right font-medium"
                                        >
                                          {CLOUD_MODEL_OPTIONS.map((grp) => (
                                            <optgroup key={grp.group} label={grp.group} className="bg-[#16171e] text-slate-400 font-semibold text-left">
                                              {grp.models.map((m) => (
                                                <option key={m.id} value={m.id} className="bg-[#121318] text-slate-200 py-1 font-normal text-left">
                                                  {m.name}
                                                </option>
                                              ))}
                                            </optgroup>
                                          ))}
                                        </select>
                                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                      </div>
                                    </div>

                                    {/* Right: Search Grounding Toggle */}
                                    <div className="sm:w-60 flex items-center justify-between gap-2 px-3 py-2 bg-[#121318]">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Search className="w-3 h-3 text-indigo-400 shrink-0" />
                                        <span className="text-[11px] font-medium text-slate-300 truncate">실시간 구글 검색 연동</span>
                                        <HelpTooltip
                                          side="bottom"
                                          align="right"
                                          title="실시간 구글 검색 연동"
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
                                        <div className="w-7 h-4 bg-[#282a38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                      </label>
                                    </div>
                                  </div>

                                  {/* Row 2: Token Spec Strip with Simulator Icon Button */}
                                  <div className="border-t border-[#2e3142] px-3 py-2 flex items-center justify-between gap-3 text-[11px] bg-[#16171e]/50">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
                                      <div className="flex items-center gap-1 text-slate-400 font-medium shrink-0">
                                        <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span>토큰 지표:</span>
                                      </div>

                                      {/* Context Window */}
                                      <span className="text-slate-300 font-mono shrink-0">
                                        컨텍스트 <strong className="text-slate-100 font-semibold">{spec.contextWindow}</strong>
                                      </span>

                                      <span className="text-[#2e3142] shrink-0">|</span>

                                      {/* Input Rate */}
                                      <span className="text-slate-400 shrink-0">
                                        입력 <strong className="text-indigo-300 font-mono font-medium">${spec.inputCostPer1M.toFixed(3)}</strong>/1M
                                      </span>

                                      <span className="text-[#2e3142] shrink-0">|</span>

                                      {/* Output Rate */}
                                      <span className="text-slate-400 shrink-0">
                                        출력 <strong className="text-indigo-300 font-mono font-medium">${spec.outputCostPer1M.toFixed(2)}</strong>/1M
                                      </span>

                                      {/* Characteristic Badge */}
                                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border shrink-0 ${spec.badgeColor}`}>
                                        {spec.badge}
                                      </span>
                                    </div>

                                    {/* Simulation Toggle Icon Button with Tooltip */}
                                    <div className="relative group shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setIsSimulatorOpen((v) => !v)}
                                        className={`p-1.5 rounded transition flex items-center justify-center cursor-pointer border ${
                                          isSimulatorOpen
                                            ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-xs'
                                            : 'bg-[#1e202b] hover:bg-[#282a38] text-slate-400 hover:text-indigo-300 border-[#2e3142]'
                                        }`}
                                        aria-label="소비 시뮬레이터"
                                      >
                                        <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                                      </button>
                                      {/* Floating Tooltip */}
                                      <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:flex items-center px-2 py-1 bg-[#121318] border border-[#2e3142] rounded text-[10px] text-slate-200 whitespace-nowrap shadow-xl z-50 pointer-events-none">
                                        <span>{isSimulatorOpen ? '시뮬레이터 닫기' : '소비 시뮬레이터 (예상 비용 계산)'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Row 3: Expandable Simulation Panel (Clean Flat Tray) */}
                                  <AnimatePresence>
                                    {isSimulatorOpen && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden border-t border-[#2e3142] bg-[#121318]"
                                      >
                                        <div className="p-3 space-y-3">
                                          {/* Panel Header */}
                                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
                                            <div className="flex items-center gap-1.5">
                                              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                                              <span>토큰 소비 및 예상 비용 시뮬레이터</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => setIsSimulatorOpen(false)}
                                              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#282a38] transition cursor-pointer"
                                              title="닫기"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>

                                          {/* Simulator Controls Grid - Clean Sliders */}
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {/* Input Tokens */}
                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                <span>질의/문서 입력 토큰</span>
                                                <span className="font-mono text-indigo-300 font-semibold">{simInputTokens.toLocaleString()} t</span>
                                              </div>
                                              <input
                                                type="range"
                                                min="500"
                                                max="30000"
                                                step="500"
                                                value={simInputTokens}
                                                onChange={(e) => setSimInputTokens(Number(e.target.value))}
                                                className="w-full h-1 bg-[#282a38] rounded appearance-none cursor-pointer accent-indigo-500"
                                              />
                                              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                                <span>단문(500)</span>
                                                <span>문서·코드(10k)</span>
                                                <span>대용량(30k)</span>
                                              </div>
                                            </div>

                                            {/* Output Tokens */}
                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                <span>AI 응답 생성 토큰</span>
                                                <span className="font-mono text-indigo-300 font-semibold">{simOutputTokens.toLocaleString()} t</span>
                                              </div>
                                              <input
                                                type="range"
                                                min="200"
                                                max="8000"
                                                step="200"
                                                value={simOutputTokens}
                                                onChange={(e) => setSimOutputTokens(Number(e.target.value))}
                                                className="w-full h-1 bg-[#282a38] rounded appearance-none cursor-pointer accent-indigo-500"
                                              />
                                              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                                <span>간결(200)</span>
                                                <span>표준(1.5k)</span>
                                                <span>장문(8k)</span>
                                              </div>
                                            </div>

                                            {/* Monthly Call Count */}
                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                <span>월간 예상 요청 횟수</span>
                                                <span className="font-mono text-indigo-300 font-semibold">{simCallCount.toLocaleString()} 회</span>
                                              </div>
                                              <input
                                                type="range"
                                                min="10"
                                                max="1000"
                                                step="10"
                                                value={simCallCount}
                                                onChange={(e) => setSimCallCount(Number(e.target.value))}
                                                className="w-full h-1 bg-[#282a38] rounded appearance-none cursor-pointer accent-indigo-500"
                                              />
                                              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                                <span>라이트(10)</span>
                                                <span>데일리(100)</span>
                                                <span>헤비(1,000)</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Simulation Result Banner - Flat Row */}
                                          <div className="flex items-center justify-between flex-wrap gap-2 pt-2.5 border-t border-[#2e3142]/80 text-xs">
                                            <div className="flex items-center gap-2">
                                              <span className="text-slate-400 font-medium">1회 호출당:</span>
                                              <span className="font-mono text-slate-200">
                                                약 ${(singleCostUSD).toFixed(4)} <span className="text-[10px] text-slate-500">({Math.round(singleCostUSD * krwRate * 10) / 10}원)</span>
                                              </span>
                                              <span className="text-[#2e3142]">|</span>
                                              <span className="text-slate-400 font-medium">1회 소모 토큰:</span>
                                              <span className="font-mono text-indigo-300 font-semibold">
                                                {(simInputTokens + simOutputTokens).toLocaleString()} 토큰
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <span className="text-slate-400 font-medium">월 {simCallCount}회 예상 비용:</span>
                                              <span className="font-mono font-bold text-amber-400 text-sm">
                                                ${totalCostUSD.toFixed(2)}
                                              </span>
                                              <span className="text-[11px] font-mono text-slate-400">
                                                (약 {totalCostKRW.toLocaleString()}원)
                                              </span>
                                              {spec.badge === '무료 티어 제공' && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                  AI Studio 무료 분량 내 0원
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-2.5 space-y-2">
                      {/* Local Endpoint & Model Selector (2-Column Grid) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Endpoint */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={localEndpointInput}
                            onChange={(e) => setLocalEndpointInput(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="flex-1 bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleTriggerVerify}
                            disabled={isVerifying}
                            className="px-2.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                          >
                            <PlugZap className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                            <span>{isVerifying ? '연결 중' : '검증'}</span>
                          </button>
                        </div>

                        {/* Local Model Selector */}
                        <div className="relative flex items-center bg-[#121318] border border-[#2e3142] rounded px-2.5 py-1">
                          <span className="text-[11px] font-medium text-slate-400 shrink-0 mr-1.5">로컬 모델</span>
                          <select
                            value={localSelectedModel}
                            onChange={(e) => setLocalSelectedModel(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-200 outline-none appearance-none cursor-pointer pr-5 truncate text-right font-medium"
                          >
                            {localModelOptions.map((m) => (
                              <option key={m.id} value={m.id} className="bg-[#121318] text-slate-200 py-1 text-left">
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Local AI Free Indicator */}
                      <div className="flex items-center justify-between bg-[#121318] border border-[#2e3142] rounded px-2.5 py-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <Coins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-slate-300 font-medium">로컬 하드웨어 추론:</span>
                          <span className="text-emerald-300 font-mono font-semibold">토큰 비용 $0.00 (100% 무료)</span>
                          <span className="text-[#2e3142]">|</span>
                          <span className="text-slate-400">네트워크 데이터 외부 전송 없음 (프라이버시 보장)</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-medium">
                          무제한 토큰
                        </span>
                      </div>

                      {localSelectedModel === 'custom' && (
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-medium text-slate-400 shrink-0">커스텀 모델명:</label>
                          <input
                            type="text"
                            value={customModelInput}
                            onChange={(e) => setCustomModelInput(e.target.value)}
                            placeholder="예: llama3:latest 또는 mistral"
                            className="flex-1 bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-slate-200 outline-none transition"
                          />
                        </div>
                      )}

                      {/* CORS Diagnostic & 1-Click Terminal Helper */}
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-slate-200">CORS 연결 진단 및 명령어 설정</span>
                            <HelpTooltip
                              side="bottom"
                              align="left"
                              title="CORS(교차 출처) 허용 안내"
                              content="웹 브라우저 보안 정책상 외부 웹앱에서 localhost 서비스로 접근하려면 CORS 허용 환경 변수가 설정되어 있어야 합니다."
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => runCorsDiagnostic()}
                            disabled={corsStatus === 'testing'}
                            className="px-2 py-0.5 rounded bg-[#282a38] hover:bg-[#323548] text-slate-300 hover:text-white text-[11px] font-medium transition flex items-center gap-1 cursor-pointer border border-[#2e3142]"
                          >
                            <RotateCcw className={`w-3 h-3 ${corsStatus === 'testing' ? 'animate-spin' : ''}`} />
                            <span>{corsStatus === 'testing' ? '진단 중...' : 'CORS 자가진단'}</span>
                          </button>
                        </div>

                        {/* Diagnostic Result Banner */}
                        {corsStatus !== 'idle' && (
                          <div
                            className={`p-2 rounded border text-xs leading-relaxed flex items-start gap-1.5 ${
                              corsStatus === 'success'
                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                                : corsStatus === 'blocked'
                                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                                : corsStatus === 'offline'
                                ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                                : 'bg-[#121318] border-[#2e3142] text-slate-300'
                            }`}
                          >
                            {corsStatus === 'success' ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-semibold">{corsDetails}</p>
                            </div>
                          </div>
                        )}

                        {/* OS-based Command Tabs */}
                        <div className="flex items-center justify-between border-b border-[#2e3142] pb-1">
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
                                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                                  corsOsTab === tab.id
                                    ? 'bg-[#282a38] text-white font-semibold border border-[#2e3142]'
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
                            cmdText = `Developer 탭 -> Local Server -> [Enable CORS] 체크 활성화`;
                          }

                          const isCopied = corsCopiedCmd === cmdText;

                          return (
                            <div className="flex items-center justify-between bg-[#121318] border border-[#2e3142] rounded px-2.5 py-1 font-mono text-xs text-indigo-300">
                              <span className="select-all truncate mr-2">{cmdText}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(cmdText);
                                  setCorsCopiedCmd(cmdText);
                                  onToast('명령어가 클립보드에 복사되었습니다.', 'success');
                                  setTimeout(() => setCorsCopiedCmd(null), 2500);
                                }}
                                className="px-2 py-0.5 rounded bg-[#282a38] hover:bg-[#323548] text-slate-300 hover:text-white text-[11px] font-sans font-medium transition flex items-center gap-1 shrink-0 cursor-pointer border border-[#2e3142]"
                              >
                                {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                <span>{isCopied ? '복사됨' : '복사'}</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* 3. Inference Mode Presets & Advanced Parameters (Inline Row) */}
                  <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-[#2e3142]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1">
                        <label className="text-xs font-medium text-slate-300">추론 프리셋</label>
                        <HelpTooltip
                          side="top"
                          title="추론 프리셋 안내"
                          content="코딩이나 정밀 분석에는 '정밀·코드'를, 일반 용도에는 '균형', 창의적 아이디어 발상에는 '창의적'을 권장합니다."
                        />
                      </div>
                      <div className="inline-flex p-0.5 bg-[#121318] border border-[#2e3142] rounded-md">
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
                                  ? 'bg-[#282a38] text-white shadow-xs font-semibold border border-[#2e3142]'
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
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#16171e] hover:bg-[#282a38] text-slate-300 hover:text-white border border-[#2e3142] text-xs font-medium transition cursor-pointer shrink-0"
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

                  {/* 4. Collapsible Advanced Parameters */}
                  {isAdvancedParamsOpen && (
                    <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-2.5 space-y-2 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Temperature Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">온도 (Temp)</span>
                            <span className="font-mono font-semibold text-indigo-300">{localAiParams.temperature.toFixed(2)}</span>
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
                            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#282a38] rounded appearance-none"
                          />
                        </div>

                        {/* Top-P Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">표본 확률 (Top-P)</span>
                            <span className="font-mono font-semibold text-indigo-300">{localAiParams.topP.toFixed(2)}</span>
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
                            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#282a38] rounded appearance-none"
                          />
                        </div>

                        {/* Max Tokens Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">최대 토큰</span>
                            <span className="font-mono font-semibold text-indigo-300">{localAiParams.maxTokens}</span>
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
                            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#282a38] rounded appearance-none"
                          />
                        </div>
                      </div>

                      {/* Streaming Checkbox */}
                      <div className="pt-1 border-t border-[#2e3142]/60 flex items-center justify-between">
                        <span className="text-xs text-slate-300">스트리밍 실시간 응답 활성화</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localAiParams.streamEnabled}
                            onChange={(e) =>
                              setLocalAiParams((prev) => ({ ...prev, streamEnabled: e.target.checked }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-7 h-4 bg-[#282a38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 5. PDF 가져오기 파싱 엔진 설정 (Compact Segment Card) */}
                  <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          PDF 가져오기 파싱 엔진
                        </span>
                        <HelpTooltip
                          side="top"
                          title="PDF 파싱 엔진 안내"
                          content="PDF 파일을 에디터로 불러올 때 사용할 방식을 지정합니다. 고속 브라우저 파서는 즉시 텍스트를 추출하며, 로컬 AI 파서는 제목, 표, 목록 구조를 정밀한 마크다운으로 재구성합니다."
                        />
                      </div>

                      {/* Parser Selector Segments */}
                      <div className="inline-flex p-0.5 bg-[#121318] border border-[#2e3142] rounded-md shrink-0">
                        <button
                          type="button"
                          onClick={() => setPdfParserEngine('fast')}
                          className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                            pdfParserEngine === 'fast'
                              ? 'bg-[#282a38] text-white shadow-xs font-semibold border border-indigo-500'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>기본 브라우저 고속 파서</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPdfParserEngine('ollama')}
                          className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                            pdfParserEngine === 'ollama'
                              ? 'bg-[#282a38] text-white shadow-xs font-semibold border border-indigo-500'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Server className="w-3 h-3 text-indigo-400" />
                          <span>로컬 AI 구조화 파서</span>
                        </button>
                      </div>
                    </div>

                    {/* Ollama Local AI Options */}
                    {pdfParserEngine === 'ollama' && (
                      <div className="pt-2 border-t border-[#2e3142] space-y-2 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={pdfOllamaEndpoint}
                              onChange={(e) => setPdfOllamaEndpoint(e.target.value)}
                              placeholder="http://localhost:11434"
                              className="flex-1 bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-2.5 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleRefreshOllamaPdfModels}
                              disabled={isCheckingPdfOllama}
                              className="px-2 py-1 rounded bg-[#282a38] hover:bg-[#323548] text-xs text-indigo-300 font-medium transition flex items-center gap-1 shrink-0 cursor-pointer border border-[#2e3142]"
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
                              className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-slate-200 outline-none transition appearance-none cursor-pointer pr-6 truncate"
                            >
                              <optgroup label="추천 파싱 모델">
                                <option value="llama3.2-vision">ollama/llama3.2-vision (추천 / 서식·비전)</option>
                                <option value="deepseek-ocr">ollama/deepseek-ocr (DeepSeek OCR / 표·문서)</option>
                                <option value="qwen3.5">ollama/qwen3.5 (Qwen 3.5 / 다국어 양식)</option>
                                <option value="qwen2.5-coder">ollama/qwen2.5-coder (Qwen 2.5 / 코드·기술)</option>
                                <option value="deepseek-r1:8b">ollama/deepseek-r1:8b (DeepSeek R1)</option>
                                <option value="llama3.2:latest">ollama/llama3.2:latest (Llama 3.2)</option>
                              </optgroup>
                              {discoveredPdfModels.length > 0 && (
                                <optgroup label="내 PC에 설치된 Ollama 모델">
                                  {discoveredPdfModels.map((m) => (
                                    <option key={m} value={m}>
                                      {m} (로컬 설치됨)
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <option value="custom">직접 입력 (사용자 보유 모델)</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {pdfOllamaModel === 'custom' && (
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-medium text-slate-400 shrink-0">커스텀 모델 태그:</label>
                            <input
                              type="text"
                              value={pdfCustomModel}
                              onChange={(e) => setPdfCustomModel(e.target.value)}
                               placeholder="예: llava:latest 또는 mistral:instruct"
                              className="flex-1 bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-2.5 py-1 text-xs font-mono text-slate-200 outline-none"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Row 1: AI Name */}
                    <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-xs font-semibold text-slate-200">어시스턴트 이름</label>
                        <HelpTooltip
                          title="어시스턴트 이름"
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
                        className="w-full bg-[#121318] border border-[#2e3142] rounded px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none transition"
                      />
                    </div>

                    {/* Row 2: Role / Tone */}
                    <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-xs font-semibold text-slate-200">역할 및 어조</label>
                        <HelpTooltip
                          title="역할 및 어조"
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
                        className="w-full bg-[#121318] border border-[#2e3142] rounded px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Row 3: System Instruction */}
                  <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3.5 flex-1 flex flex-col min-h-[260px]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-slate-200">시스템 프롬프트 지침</label>
                        <HelpTooltip
                          title="시스템 프롬프트 지침"
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
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition px-2 py-1 rounded bg-[#282a38] hover:bg-[#323548] border border-[#2e3142]"
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
                      className="w-full flex-1 min-h-[160px] bg-[#121318] border border-[#2e3142] rounded p-3 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none transition resize-none leading-relaxed"
                      placeholder="AI에게 전달할 프롬프트 지침 입력..."
                    />
                  </div>
                </div>
              )}

              {/* TAB: Integrations & Accounts */}
              {activeTab === 'integrations' && (
                <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2e3142]">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-semibold text-slate-200">외부 계정 및 작업 영역 연동</h3>
                      <HelpTooltip
                        title="외부 계정 연동 안내"
                        content="클라우드 저장소(구글 드라이브), 원격 저장소(GitHub), 리눅스 서버(SSH/SFTP)와 연동하여 어디서나 작업을 이어갈 수 있습니다."
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {/* Item 1: Google Drive On-Demand & Workspace Integration */}
                    {(() => {
                      const isConnected = googleTokenStatus === 'connected' && !!googleUser;
                      const isExpired = googleTokenStatus === 'expired';

                      return (
                        <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#282a38] flex items-center justify-center shrink-0 border border-[#2e3142] text-indigo-400">
                              <Globe className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-slate-200">구글 드라이브</span>
                                {isConnected ? (
                                  <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    연동됨
                                  </span>
                                ) : isExpired ? (
                                  <span className="text-[10px] text-amber-300 font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-semibold">
                                    토큰 만료
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-[#121318] border border-[#2e3142]">
                                    단독 연동 가능
                                  </span>
                                )}
                                <span className="text-[10px] text-indigo-300 font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                                  단독 권한 연동
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                {isConnected && googleUser ? (
                                  <span className="font-mono text-slate-300">
                                    {googleUser.email}
                                  </span>
                                ) : (
                                  '게스트 모드와 무관하게 문서 불러오기 및 저장을 위한 온디맨드 연동'
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
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition cursor-pointer border border-indigo-500 flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                                  title="Google Drive 파일 탐색 모달 열기"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-white" />
                                  <span>드라이브 탐색</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={onOpenGoogleAccount}
                                  className="px-2.5 py-1.5 bg-[#282a38] hover:bg-[#323548] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer border border-[#2e3142] flex items-center gap-1.5 whitespace-nowrap"
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
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition cursor-pointer border border-amber-500 flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>토큰 재인증 및 열기</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={onOpenGoogleDrive || onOpenGoogleAccount}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition cursor-pointer border border-indigo-500 flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                                title="Google OAuth 연동을 시작합니다."
                              >
                                <Globe className="w-3.5 h-3.5 text-white" />
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
                        <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#282a38] flex items-center justify-center shrink-0 border border-[#2e3142] text-purple-400">
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
                                    토큰 등록됨
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-[#121318] border border-[#2e3142]">
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
                              className="px-3 py-1.5 bg-[#282a38] hover:bg-[#323548] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer border border-[#2e3142] flex items-center gap-1.5 whitespace-nowrap"
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
                        <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#282a38] flex items-center justify-center shrink-0 border border-[#2e3142] text-indigo-400">
                              <Server className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-slate-200">원격 서버</span>
                                {isConnected ? (
                                  <span className="text-[10px] text-indigo-300 font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 font-semibold">
                                    연결됨
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-[#121318] border border-[#2e3142]">
                                    미연결
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
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

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={onOpenRemoteSSH}
                              className="px-3 py-1.5 bg-[#282a38] hover:bg-[#323548] text-slate-200 hover:text-white rounded text-xs font-medium transition cursor-pointer border border-[#2e3142] flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Server className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{isConnected ? '서버 관리' : '서버 설정'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
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
                  <div className="space-y-3.5 divide-y divide-[#2e3142]">
                    {/* Mode & Level Selection */}
                    <div className="flex items-center justify-between gap-4 pt-1 first:pt-0">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-slate-300">작동 수준</label>
                        <HelpTooltip
                          title="고스트 라이터 수준"
                          content="에디터에서 문서를 작성하는 동안 백그라운드에서 실시간 번역 및 문맥 완성을 제안하는 강도입니다."
                        />
                      </div>
                      <div className="flex rounded bg-[#121318] p-0.5 border border-[#2e3142]">
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
                                  ? 'bg-[#282a38] text-indigo-300 font-semibold shadow-xs border border-indigo-500/40'
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
                        value={localPrefs.ghostWriterModel || 'gemini-3.8-flash'}
                        onChange={(e) => setLocalPrefs({ ...localPrefs, ghostWriterModel: e.target.value })}
                        className="w-64 bg-[#121318] border border-[#2e3142] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition cursor-pointer"
                      >
                        <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
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
          <div className="px-5 py-3 border-t border-[#2e3142] bg-[#1e202b] flex justify-between items-center shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>설정은 브라우저 로컬 저장소에 안전하게 보존됩니다</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition cursor-pointer rounded hover:bg-[#282a38] border border-[#2e3142]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
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

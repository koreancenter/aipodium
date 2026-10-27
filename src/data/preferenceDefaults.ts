import { DEFAULT_AI_ROLE_MODELS, AiRoleModels } from '../types';
import { SecurityConfig } from '../components/SecuritySettings';

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

export type PreferencesTab = 'appearance' | 'editor' | 'ai-engine' | 'roles' | 'parameters' | 'prompts' | 'integrations' | 'security' | 'storage' | 'about';

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
  aiPersona: {
    name: 'AI 오케스트라 마스터',
    role: '전략적 솔루션 아키텍트 및 수석 엔지니어',
    systemInstruction: '당신은 AI Podium의 총괄 오케스트라 마스터입니다. 다각도의 논리적 추론과 핵심 위주의 명쾌한 한국어로 사용자의 기획 및 개발을 보조하세요.'
  },
  customPrompts: [],
  security: {
    isEncryptionEnabled: false,
    hasMasterPasscode: false,
    autoLockMinutes: 0,
    lockOnStartup: false,
    clearSessionOnClose: false,
  },
  googleSearchGrounding: false,
  pdfParser: {
    engine: 'fast',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'llama3.2-vision'
  }
};

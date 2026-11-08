import { SecurityConfig, DEFAULT_SECURITY_CONFIG } from '../components/SecuritySettings';
import type { AiRoleModels } from '../types';
import { DEFAULT_AI_ROLE_MODELS } from '../types';

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
  ghostWriterLevel?: 'off' | '100' | '70' | '50' | '30';
  ghostWriterModel?: string;
  apiKeys?: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
    deepseek?: string;
    groq?: string;
  };
  googleSearchGrounding?: boolean;
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

export type PreferencesTab = 'ai' | 'ai-engine' | 'persona' | 'integrations' | 'storage' | 'security' | 'ghost-writer' | 'language';

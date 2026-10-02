/**
 * Universal AI Engine Types & Interfaces
 * Standalone decoupled types for AI Podium core communications layer.
 */

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiInferenceUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}

export interface AiGroundingSource {
  title?: string;
  url?: string;
  snippet?: string;
}

export interface AiInferenceResult {
  fullText: string;
  usage?: AiInferenceUsage;
  groundingSources?: AiGroundingSource[];
}

export interface AiInferenceOptions {
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  apiKey?: string;
  endpoint?: string;
  systemInstruction?: string;
  editorContent?: string;
  googleSearchGrounding?: boolean;
  onChunk: (deltaText: string) => void;
  signal?: AbortSignal;
  userSecret?: string;
  [key: string]: any;
}

export interface AiModelInfo {
  id: string;
  name: string;
  group?: 'cloud' | 'local' | 'webllm';
  description?: string;
}

export interface AiProviderAdapter {
  isAvailable(): Promise<boolean>;
  getModels(): Promise<{ id: string; name: string }[]>;
  stream(options: AiInferenceOptions): Promise<{
    fullText: string;
    usage?: { promptTokens: number; completionTokens: number };
    groundingSources?: AiGroundingSource[];
  }>;
}

export type AiProviderType = 'cloud' | 'local-pc' | 'local-server' | 'webllm' | string;

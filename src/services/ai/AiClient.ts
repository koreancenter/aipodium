/**
 * AiClient - Unified AI Engine Facade
 * Provides unified access to all AI provider adapters (Cloud, Local PC/Ollama, Browser WebLLM).
 */

import type {
  AiProviderAdapter,
  AiProviderType,
  AiInferenceOptions,
<<<<<<< HEAD
  AiInferenceResult
=======
  AiInferenceResult,
  AiDomainProfile
>>>>>>> main
} from './types';
import { CloudAdapter } from './adapters/CloudAdapter';
import { OllamaAdapter } from './adapters/OllamaAdapter';
import { WebLlmAdapter } from './adapters/WebLlmAdapter';
<<<<<<< HEAD
=======
import { applyAiDomainProfile } from './profiles';
>>>>>>> main

export class AiClient {
  private adapters: Map<string, AiProviderAdapter> = new Map();

  constructor() {
    this.registerAdapter('cloud', new CloudAdapter());
    this.registerAdapter('local-pc', new OllamaAdapter());
    this.registerAdapter('local-server', new OllamaAdapter());
    this.registerAdapter('webllm', new WebLlmAdapter());
  }

  registerAdapter(provider: string, adapter: AiProviderAdapter): void {
    this.adapters.set(provider.toLowerCase(), adapter);
  }

  getAdapter(provider: string): AiProviderAdapter {
    const key = (provider || 'cloud').toLowerCase();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      // Default fallback to cloud
      return this.adapters.get('cloud') || new CloudAdapter();
    }
    return adapter;
  }

  /**
   * Universal streaming completion facade.
   * Routes the prompt and options to the appropriate adapter.
   */
  async streamCompletion(
    provider: AiProviderType,
<<<<<<< HEAD
    options: AiInferenceOptions
  ): Promise<AiInferenceResult> {
    const adapter = this.getAdapter(provider);
    return adapter.stream(options);
=======
    options: AiInferenceOptions,
    profile?: AiDomainProfile
  ): Promise<AiInferenceResult> {
    const adapter = this.getAdapter(provider);
    return adapter.stream(profile ? applyAiDomainProfile(options, profile) : options);
>>>>>>> main
  }

  /**
   * Retrieves available models for the given provider.
   */
  async getAvailableModels(provider: AiProviderType): Promise<{ id: string; name: string }[]> {
    const adapter = this.getAdapter(provider);
    return adapter.getModels();
  }

  /**
   * Checks whether the specified provider is active/reachable.
   */
  async checkAvailability(provider: AiProviderType): Promise<boolean> {
    const adapter = this.getAdapter(provider);
    return adapter.isAvailable();
  }

  /**
   * Lightweight translation helper using the active AI provider adapter or cloud default.
   */
  async translateText(
    text: string,
    targetLanguage: string = 'ko',
    provider: AiProviderType = 'cloud',
    model?: string,
    apiKey?: string
  ): Promise<string> {
    const isTargetKorean = targetLanguage.toLowerCase().startsWith('ko');
    const systemPrompt = isTargetKorean
      ? '당신은 전문 다국어 번역 비서입니다. 사용자가 제공하는 텍스트를 가장 자연스럽고 명확한 표준 한국어로 충실하게 직독직해 및 의역하여 번역하세요. 설명이나 부연 설명 없이 오직 번역된 본문만을 출력하세요.'
      : `You are an expert translator. Translate the given text into fluent, natural ${targetLanguage}. Output only the translation without any explanations.`;
<<<<<<< HEAD

    let resultText = '';
    const res = await this.streamCompletion(provider, {
      model: model || (provider === 'cloud' ? 'gemini-2.5-flash' : undefined),
=======
    const availableModels = provider === 'cloud'
      ? []
      : await this.getAvailableModels(provider);
    const selectedModel = model?.trim() || (provider === 'cloud' ? 'gemini-2.5-flash' : availableModels[0]?.id);
    if (!selectedModel) {
      throw new Error(`No model is available for provider "${provider}".`);
    }

    let resultText = '';
    const res = await this.streamCompletion(provider, {
      model: selectedModel,
>>>>>>> main
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      apiKey,
      onChunk: (chunk) => {
        resultText += chunk;
      }
    });

    return resultText.trim() || res.fullText.trim();
  }
}
<<<<<<< HEAD

// Export singleton instance
export const aiClient = new AiClient();
=======
>>>>>>> main

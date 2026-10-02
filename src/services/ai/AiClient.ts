/**
 * AiClient - Unified AI Engine Facade
 * Provides unified access to all AI provider adapters (Cloud, Local PC/Ollama, Browser WebLLM).
 */

import type {
  AiProviderAdapter,
  AiProviderType,
  AiInferenceOptions,
  AiInferenceResult
} from './types';
import { CloudAdapter } from './adapters/CloudAdapter';
import { OllamaAdapter } from './adapters/OllamaAdapter';
import { WebLlmAdapter } from './adapters/WebLlmAdapter';

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
    options: AiInferenceOptions
  ): Promise<AiInferenceResult> {
    const adapter = this.getAdapter(provider);
    return adapter.stream(options);
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
}

// Export singleton instance
export const aiClient = new AiClient();

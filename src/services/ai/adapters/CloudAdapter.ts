/**
 * Cloud Adapter for AI Podium
 * Handles Gemini / OpenAI / Anthropic SSE streaming requests, auth headers, and API key decryption.
 */

import type {
  AiProviderAdapter,
  AiInferenceOptions,
  AiInferenceResult,
  AiChatMessage
} from '../types';
import { getEphemeralDecryptedApiKey } from '../../aiEngineCore';

export class CloudAdapter implements AiProviderAdapter {
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/health', { method: 'GET' });
      return res.ok;
    } catch {
      return true; // Assume server is up in SPA environment
    }
  }

  async getModels(): Promise<{ id: string; name: string }[]> {
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (고속 범용)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (심층 추론·코드 특화)' },
      { id: 'gpt-4o', name: 'GPT-4o (OpenAI)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (OpenAI)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Anthropic)' },
    ];
  }

  async stream(options: AiInferenceOptions): Promise<AiInferenceResult> {
    let resolvedApiKey = options.apiKey ? options.apiKey.trim() : '';

    if (!resolvedApiKey) {
      try {
        const decrypted = await getEphemeralDecryptedApiKey(
          this.inferVendorFromModel(options.model),
          options.userSecret
        );
        if (decrypted) {
          resolvedApiKey = decrypted.trim();
        }
      } catch {}
    }

    // Determine message payload
    const userMsg = options.messages.filter((m) => m.role === 'user').pop();
    const promptText = userMsg?.content || '';

    const payload = {
      message: promptText,
      messages: options.messages,
      editorContent: options.editorContent,
      model: options.model,
      parameters: {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
      },
      apiKey: resolvedApiKey || undefined,
      systemInstruction: options.systemInstruction,
      googleSearchGrounding: options.googleSearchGrounding ?? false,
      stream: true,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
    };

    if (resolvedApiKey) {
      headers['x-goog-api-key'] = resolvedApiKey;
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers,
      signal: options.signal,
      body: JSON.stringify(payload),
    });

    const isSSE = res.headers.get('content-type')?.includes('text/event-stream');
    let fullText = '';
    let finalUsage: { promptTokens: number; completionTokens: number } | undefined;
    let finalGrounding: any[] | undefined;

    if (isSSE && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (parsed.chunk) {
                fullText += parsed.chunk;
                options.onChunk(parsed.chunk);
              }
              if (parsed.done) {
                if (parsed.usage) finalUsage = parsed.usage;
                if (parsed.groundingSources) finalGrounding = parsed.groundingSources;
              }
              if (parsed.error) {
                const errPiece = `\n\n⚠️ ${parsed.error}`;
                fullText += errPiece;
                options.onChunk(errPiece);
              }
            } catch {}
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        try {
          const parsed = JSON.parse(buffer.trim().slice(6));
          if (parsed.chunk) {
            fullText += parsed.chunk;
            options.onChunk(parsed.chunk);
          }
          if (parsed.done) {
            if (parsed.usage) finalUsage = parsed.usage;
            if (parsed.groundingSources) finalGrounding = parsed.groundingSources;
          }
        } catch {}
      }

      return {
        fullText,
        usage: finalUsage,
        groundingSources: finalGrounding,
      };
    }

    // Non-SSE or JSON fallback response
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const vendor = this.inferVendorFromModel(options.model);
      const errorMsg = `💡 **AI 엔진 안내**: ${data.error || '응답을 생성할 수 없습니다.'}\n\n*설정([Ctrl+,])의 [AI 엔진 설정]에서 **${vendor.toUpperCase()} API 키**를 등록하거나, 상단 모드를 [Local PC (Ollama)]로 전환하여 사용할 수 있습니다.*`;
      options.onChunk(errorMsg);
      return { fullText: errorMsg };
    }

    const text = data.text || '';
    options.onChunk(text);
    return {
      fullText: text,
      usage: data.usage,
      groundingSources: data.groundingSources,
    };
  }

  private inferVendorFromModel(model: string): string {
    const m = (model || '').toLowerCase();
    if (m.includes('gemini')) return 'gemini';
    if (m.includes('gpt') || m.includes('o1') || m.includes('o3')) return 'openai';
    if (m.includes('claude')) return 'anthropic';
    return 'gemini';
  }
}

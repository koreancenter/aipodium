/**
 * Ollama Adapter for AI Podium
 * Handles local endpoint discovery (/api/tags) and streaming chat completions.
 */

import type {
  AiProviderAdapter,
  AiInferenceOptions,
  AiInferenceResult
} from '../types';

export class OllamaAdapter implements AiProviderAdapter {
  private defaultEndpoint: string;

  constructor(defaultEndpoint: string = 'http://localhost:11434') {
    this.defaultEndpoint = defaultEndpoint;
  }

  private getCleanEndpoint(override?: string): string {
    return (override || this.defaultEndpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  }

  async isAvailable(endpoint?: string): Promise<boolean> {
    const cleanEndpoint = this.getCleanEndpoint(endpoint);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${cleanEndpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getModels(endpoint?: string): Promise<{ id: string; name: string }[]> {
    const cleanEndpoint = this.getCleanEndpoint(endpoint);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${cleanEndpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.models)) {
          return data.models.map((m: any) => ({
            id: m.name || m.model,
            name: `${m.name || m.model} (로컬 Ollama)`,
          }));
        }
      }
    } catch {}

    // Fallback recommended models if tags query is unreachable
    return [
      { id: 'llama3.3:latest', name: 'Llama 3.3 70B (로컬 권장)' },
      { id: 'qwen2.5-coder:latest', name: 'Qwen 2.5 Coder (코드 특화)' },
      { id: 'deepseek-r1:latest', name: 'DeepSeek R1 (추론 특화)' },
      { id: 'gemma2:9b', name: 'Gemma 2 9B (경량 고속)' },
    ];
  }

  async stream(options: AiInferenceOptions): Promise<AiInferenceResult> {
    const cleanEndpoint = this.getCleanEndpoint(options.endpoint);

    // Prepare system and user messages
    const sysMsgs = options.messages.filter((m) => m.role === 'system');
    const nonSysMsgs = options.messages.filter((m) => m.role !== 'system');

    let combinedSystem = options.systemInstruction || '';
    if (sysMsgs.length > 0) {
      combinedSystem = combinedSystem
        ? `${combinedSystem}\n\n${sysMsgs.map((m) => m.content).join('\n\n')}`
        : sysMsgs.map((m) => m.content).join('\n\n');
    }
    if (options.editorContent) {
      combinedSystem = combinedSystem
        ? `${combinedSystem}\n\n[Editor Context]\n${options.editorContent}`
        : `[Editor Context]\n${options.editorContent}`;
    }

    const formattedMessages = [
      ...(combinedSystem ? [{ role: 'system' as const, content: combinedSystem }] : []),
      ...nonSysMsgs,
    ];

    let controller: AbortController | undefined;
    let signal = options.signal;
    let timeoutId: any;

    if (!signal) {
      controller = new AbortController();
      signal = controller.signal;
      timeoutId = setTimeout(() => controller?.abort(), 60000);
    }

    try {
      const res = await fetch(`${cleanEndpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model: options.model,
          messages: formattedMessages,
          stream: true,
          options: {
            temperature: options.temperature,
            top_p: options.topP,
            num_predict: options.maxTokens,
          },
        }),
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      let fullText = '';
      let promptTokens = 0;
      let completionTokens = 0;

      if (res.body) {
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
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              const piece = parsed?.message?.content || parsed?.response;
              if (piece) {
                fullText += piece;
                options.onChunk(piece);
              }
              if (parsed?.prompt_eval_count) promptTokens = parsed.prompt_eval_count;
              if (parsed?.eval_count) completionTokens = parsed.eval_count;
            } catch {}
          }
        }

        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            const piece = parsed?.message?.content || parsed?.response;
            if (piece) {
              fullText += piece;
              options.onChunk(piece);
            }
            if (parsed?.prompt_eval_count) promptTokens = parsed.prompt_eval_count;
            if (parsed?.eval_count) completionTokens = parsed.eval_count;
          } catch {}
        }
      }

      return {
        fullText,
        usage: { promptTokens, completionTokens },
      };
    } catch (e: any) {
      if (timeoutId) clearTimeout(timeoutId);
      const isAbort = e?.name === 'AbortError';
      const isCors = e?.message?.includes('Failed to fetch') || e?.name === 'TypeError';

      let errorMsg = '';
      if (isCors) {
        errorMsg = `⚠️ **로컬 Ollama 연결 차단 (브라우저 CORS 제한)**\n\n브라우저 보안 정책으로 인해 로컬 Ollama(\`${cleanEndpoint}\`) 호출이 차단되었습니다.\n\n### 🛠️ 즉시 해결 방법 (CORS 허용 실행):\n**Windows (PowerShell):**\n\`\`\`powershell\n$env:OLLAMA_ORIGINS="*" ; ollama serve\n\`\`\`\n\n**macOS / Linux:**\n\`\`\`bash\nOLLAMA_ORIGINS="*" ollama serve\n\`\`\`\n\n💡 *Tip: 상단 톱니바퀴 [설정] -> [AI 엔진 설정]에서 **[CORS 자가진단]**을 실행하여 정상 연결 여부를 확인할 수 있습니다.*`;
      } else if (isAbort) {
        errorMsg = `⚠️ **로컬 Ollama 응답 시간 초과 (60초)**\n\n모델 추론 시간이 60초를 초과했습니다. 더 가벼운 양자화 모델을 사용하거나 로컬 리소스를 확인하세요.`;
      } else {
        errorMsg = `⚠️ **로컬 Ollama 호출 실패**: ${e.message}\n\n*터미널에서 'OLLAMA_ORIGINS="*" ollama serve' 실행 여부 및 로컬 모델 설치 상태를 확인하세요.*`;
      }

      options.onChunk(errorMsg);
      return { fullText: errorMsg };
    }
  }
}

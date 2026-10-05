/**
 * WebLLM Adapter for AI Podium
 * Encapsulates Web Worker lifecycle, model weight loading progress, and WebGPU in-browser inference.
 */

import type {
  AiProviderAdapter,
  AiInferenceOptions,
  AiInferenceResult
} from '../types';
import {
  WEB_LLM_MODEL_ID,
  WEB_LLM_MODEL_DISPLAY_NAME,
  isWebGPUSupported,
  initWebLLMEngine,
  getLoadedWebLLMEngine,
  streamWebLLMCompletion
} from '../../../utils/webllmService';

export class WebLlmAdapter implements AiProviderAdapter {
  private onInitProgress?: (report: { progress: number; text: string }) => void;

  constructor(onInitProgress?: (report: { progress: number; text: string }) => void) {
    this.onInitProgress = onInitProgress;
  }

  setInitProgressCallback(cb?: (report: { progress: number; text: string }) => void): void {
    this.onInitProgress = cb;
  }

  async isAvailable(): Promise<boolean> {
    return isWebGPUSupported();
  }

  async getModels(): Promise<{ id: string; name: string }[]> {
    return [
      {
        id: WEB_LLM_MODEL_ID,
        name: WEB_LLM_MODEL_DISPLAY_NAME,
      },
    ];
  }

  async stream(options: AiInferenceOptions): Promise<AiInferenceResult> {
    if (!isWebGPUSupported()) {
      const errorMsg = '⚠️ 현재 브라우저가 WebGPU 가속을 지원하지 않습니다. Chrome/Edge 최신 버전을 권장합니다.';
      options.onChunk(errorMsg);
      return { fullText: errorMsg };
    }

    // Ensure engine is loaded
    if (!getLoadedWebLLMEngine()) {
      options.onChunk('브라우저 WebLLM 엔진을 초기화하는 중입니다. 완료 후 답변이 이어집니다...\n\n');
      try {
        await initWebLLMEngine((report) => {
          if (this.onInitProgress) {
            this.onInitProgress({
              progress: Math.round(report.progress * 100),
              text: report.text,
            });
          }
        });
      } catch (err: any) {
        const errorMsg = `⚠️ WebLLM 모델 초기화 실패: ${err?.message || '가중치 다운로드 오류'}`;
        options.onChunk(errorMsg);
        return { fullText: errorMsg };
      }
    }

    // Build system message
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

    const messagesForWebLlm: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      ...(combinedSystem ? [{ role: 'system' as const, content: combinedSystem }] : []),
      ...nonSysMsgs,
    ];

    let fullText = '';
    try {
      fullText = await streamWebLLMCompletion(
        messagesForWebLlm,
        (delta: string) => {
          options.onChunk(delta);
        },
        options.temperature ?? 0.35
      );
      return { fullText };
    } catch (err: any) {
      const errorMsg = `⚠️ WebLLM 추론 실패: ${err?.message || '실행 오류'}`;
      options.onChunk(errorMsg);
      return { fullText: errorMsg };
    }
  }
}

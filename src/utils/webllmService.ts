import { CreateWebWorkerMLCEngine, type WebWorkerMLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';

export const WEB_LLM_MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
export const WEB_LLM_MODEL_DISPLAY_NAME = 'Qwen2.5-0.5B (브라우저 로컬 WebGPU)';

export const WEB_LLM_KOREAN_GUARDRAIL_SYSTEM_PROMPT =
  '당신은 AI Podium 데스크톱의 AI 지식 비서입니다. 모든 답변은 군더더기 없는 정확한 한국어 존댓말(~해요, ~합니다)로 작성하세요. 복잡한 미사여구를 피하고 핵심만 1~3문장의 짧은 단문으로 답하세요. 확실하지 않은 지식은 지어내지 말고 상단 AI 엔진 설정을 통한 대형 모델 사용을 권장하세요.';

let engineInstance: WebWorkerMLCEngine | null = null;
let currentWorker: Worker | null = null;

export function isWebGPUSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof (navigator as unknown as { gpu?: unknown }).gpu !== 'undefined';
}

export async function getWebGPUDevice(): Promise<boolean> {
  if (!isWebGPUSupported()) return false;
  try {
    const gpu = (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu;
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export async function initWebLLMEngine(
  onProgress?: (report: InitProgressReport) => void
): Promise<WebWorkerMLCEngine> {
  if (engineInstance) {
    return engineInstance;
  }

  // Create standard Vite Web Worker
  const worker = new Worker(
    new URL('../workers/webllm.worker.ts', import.meta.url),
    { type: 'module' }
  );
  currentWorker = worker;

  engineInstance = await CreateWebWorkerMLCEngine(
    worker,
    WEB_LLM_MODEL_ID,
    {
      initProgressCallback: (report: InitProgressReport) => {
        if (onProgress) {
          onProgress(report);
        }
      },
      logLevel: 'WARN',
      appConfig: {
        model_list: [
          {
            model: 'https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
            model_id: WEB_LLM_MODEL_ID,
            model_lib:
              'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Qwen2.5-0.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',
            overrides: {
              context_window_size: 2048,
              conv_config: {
                system_message: WEB_LLM_KOREAN_GUARDRAIL_SYSTEM_PROMPT,
              },
            },
          },
        ],
      },
    }
  );

  return engineInstance;
}

export function getLoadedWebLLMEngine(): WebWorkerMLCEngine | null {
  return engineInstance;
}

export function terminateWebLLMEngine(): void {
  if (engineInstance) {
    try {
      engineInstance.unload();
    } catch {
      // ignore
    }
    engineInstance = null;
  }
  if (currentWorker) {
    currentWorker.terminate();
    currentWorker = null;
  }
}

export async function streamWebLLMCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onChunk: (delta: string) => void,
  temperature = 0.35
): Promise<string> {
  if (!engineInstance) {
    throw new Error('브라우저 WebLLM 엔진이 초기화되지 않았습니다.');
  }

  // Clamping temperature between 0.3 ~ 0.4 to prevent hallucinations and awkward phrasing in 0.5B model
  const clampedTemperature = Math.min(0.4, Math.max(0.3, temperature ?? 0.35));

  // Ensure Korean guardrail system prompt is strictly injected at the beginning of the messages
  const sanitizedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  const existingSystemMsgs = messages.filter((m) => m.role === 'system');
  const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

  if (existingSystemMsgs.length > 0) {
    const extraContext = existingSystemMsgs.map((m) => m.content).join('\n\n');
    sanitizedMessages.push({
      role: 'system',
      content: `${WEB_LLM_KOREAN_GUARDRAIL_SYSTEM_PROMPT}\n\n[추가 참조 지침 및 문서 맥락]\n${extraContext}`,
    });
  } else {
    sanitizedMessages.push({
      role: 'system',
      content: WEB_LLM_KOREAN_GUARDRAIL_SYSTEM_PROMPT,
    });
  }

  sanitizedMessages.push(...nonSystemMsgs);

  const completion = await engineInstance.chat.completions.create({
    messages: sanitizedMessages,
    temperature: clampedTemperature,
    stream: true,
  });

  let fullResponse = '';
  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      fullResponse += delta;
      onChunk(delta);
    }
  }

  return fullResponse;
}

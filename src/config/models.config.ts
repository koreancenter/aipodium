/**
 * AI Podium 중앙 집중식 AI 모델 설정 및 동적 로더
 * models.config.ts / models.config.js
 */

export interface ModelItem {
  id: string;
  name: string;
  desc: string;
  group: 'cloud' | 'local';
  vendor?: 'gemini' | 'ollama' | 'webllm' | 'openai' | 'anthropic' | 'deepseek' | 'groq';
  tier?: string;
  contextWindow?: string;
  isDefault?: boolean;
}

/**
 * 기본 대표 모델 배열 (상수 폴백 모델)
 * 실제 실행 가능한 모델만 유지:
 * - Gemini: gemini-2.5-flash (기본), gemini-2.5-pro
 * - WebLLM: Qwen2.5-0.5B-Instruct
 * - Ollama: 로컬 태그 조회 기반 동적 추가 (오프라인 시 비움)
 */
export const DEFAULT_FALLBACK_MODELS: ModelItem[] = [
  // Google Gemini Cloud
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    desc: '초고속 종합',
    group: 'cloud',
    vendor: 'gemini',
    tier: '⚡ Ultra Fast • 무료 티어',
    contextWindow: '100만 토큰',
    isDefault: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    desc: '고성능·추론',
    group: 'cloud',
    vendor: 'gemini',
    tier: '💎 Premium Depth',
    contextWindow: '200만 토큰',
  },
  // WebLLM (Browser Local)
  {
    id: 'Qwen2.5-0.5B-Instruct',
    name: 'Qwen2.5-0.5B-Instruct',
    desc: '브라우저 WebGPU',
    group: 'local',
    vendor: 'webllm',
    tier: '🌐 Browser In-Memory • 무료',
    contextWindow: '3.2만 토큰',
  },
];

/**
 * Provider별 등록 시 지원되는 공식 활성 모델 카탈로그
 */
export const VENDOR_ACTIVE_MODELS: Record<string, Array<{ id: string; name: string; desc: string }>> = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: '초고속 종합' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: '고성능·추론' },
  ],
};

/**
 * 하위 호환성을 위한 Provider별 모델 목록 맵 (PreferencesModal 등에서 사용)
 */
export const VENDOR_MODELS_MAP: Record<string, { id: string; name: string }[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  ],
};

/**
 * 기본 로컬 Ollama/WebLLM 모델 선택 옵션
 */
export const DEFAULT_LOCAL_MODEL_OPTIONS: { id: string; name: string }[] = [
  { id: 'Qwen2.5-0.5B-Instruct', name: 'Qwen2.5-0.5B-Instruct (WebLLM)' },
  { id: 'custom', name: '직접 입력' },
];

/**
 * 클라우드 모델 그룹화 옵션
 */
export const CLOUD_MODEL_OPTIONS = [
  {
    group: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash - 추천' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    ],
  },
];

/**
 * 로컬 Ollama (`localhost:11434/api/tags`)에서 실제 풀(pull)된 모델 목록 조회
 */
export async function fetchOllamaTags(endpoint = 'http://localhost:11434'): Promise<ModelItem[]> {
  const cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${cleanEndpoint}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (data && Array.isArray(data.models)) {
      return data.models.map((m: any) => {
        const rawName = m.name || m.model || 'unknown';
        const tag = rawName.split(':')[1] || '';
        const sizeGb = m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)}GB` : '';
        return {
          id: rawName,
          name: rawName,
          desc: [tag, sizeGb, '로컬 설치'].filter(Boolean).join(' • '),
          group: 'local',
          vendor: 'ollama',
          tier: '🏠 Local GPU • 0 Credits',
        };
      });
    }
    return [];
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * Provider 및 API 키 등록 상태에 따른 동적 활성 모델 목록 취합
 */
export async function fetchProviderActiveModels(
  vendor: string,
  apiKey: string
): Promise<ModelItem[]> {
  if (!apiKey || !apiKey.trim()) {
    return [];
  }

  try {
    const res = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor, apiKey: apiKey.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.models) && data.models.length > 0) {
        return data.models.map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          desc: m.desc || `${vendor.toUpperCase()} 공식 모델`,
          group: 'cloud',
          vendor: vendor as any,
          tier: m.tier || 'API 활성화',
        }));
      }
    }
  } catch {}

  const catalog = VENDOR_ACTIVE_MODELS[vendor] || [];
  return catalog.map((m) => ({
    id: m.id,
    name: m.name,
    desc: m.desc,
    group: 'cloud',
    vendor: vendor as any,
    tier: 'API 활성화',
  }));
}

/**
 * 상단 퀵 메뉴 및 빠른 전환용 추천 모델 배열
 */
export const RECOMMENDED_QUICK_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
];

/**
 * 모델 ID -> 표시명 표준 매핑
 */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'Qwen2.5-0.5B-Instruct': 'Qwen2.5-0.5B-Instruct',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': 'Qwen2.5-0.5B-Instruct',
  'gemini-3.8-flash': 'Gemini 2.5 Flash',
  'gemini-3.1-pro-preview': 'Gemini 2.5 Pro',
  'gemini-3.1-pro': 'Gemini 2.5 Pro',
  'gemini-3.1-flash-lite': 'Gemini 2.5 Flash',
};

export function getModelDisplayName(modelId: string): string {
  if (!modelId) return 'Gemini 2.5 Flash';
  if (MODEL_DISPLAY_NAMES[modelId]) return MODEL_DISPLAY_NAMES[modelId];
  const found = DEFAULT_FALLBACK_MODELS.find((m) => m.id === modelId);
  if (found) return found.name;
  return modelId;
}

/**
 * 모델별 상세 스펙 및 단가 명세
 */
export interface ModelSpec {
  name: string;
  contextWindow: string;
  contextTokens: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  badge: string;
  badgeColor: string;
  description: string;
}

export const MODEL_SPECS: Record<string, ModelSpec> = {
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    contextWindow: '100만 토큰',
    contextTokens: 1000000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    badge: '무료 티어 제공',
    badgeColor: 'badge-success',
    description: 'AI Studio 분당 무료 요청 제공, 초대용량 1M 컨텍스트 지원'
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    contextWindow: '200만 토큰',
    contextTokens: 2000000,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
    badge: '복합 추론 특화',
    badgeColor: 'badge-muted',
    description: '초대형 2M 컨텍스트 지원 및 복잡한 코드와 학술 문서 논리 추론'
  },
  'Qwen2.5-0.5B-Instruct': {
    name: 'Qwen2.5-0.5B-Instruct',
    contextWindow: '3.2만 토큰',
    contextTokens: 32000,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    badge: '브라우저 로컬',
    badgeColor: 'badge-success',
    description: 'WebGPU 기반 브라우저 내 인메모리 로컬 실행, 외부 통신 없음'
  },
};

export const getModelSpec = (modelId: string): ModelSpec => {
  if (MODEL_SPECS[modelId]) return MODEL_SPECS[modelId];
  if (modelId.startsWith('gemini-2.5-pro')) return MODEL_SPECS['gemini-2.5-pro'];
  if (modelId.startsWith('gemini')) return MODEL_SPECS['gemini-2.5-flash'];
  if (modelId.includes('Qwen') || modelId.includes('webllm')) return MODEL_SPECS['Qwen2.5-0.5B-Instruct'];
  return {
    name: modelId,
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    badge: '로컬 모델',
    badgeColor: 'badge-muted',
    description: '설치된 로컬 실행 모델'
  };
};


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
 * 공급자별 기본 클라우드 모델 정의 (Single Source of Truth)
 */
export const DEFAULT_CLOUD_MODELS_BY_VENDOR: Record<string, ModelItem[]> = {
  gemini: [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      desc: 'Fast · 일상/요약',
      group: 'cloud',
      vendor: 'gemini',
      tier: '⚡ Ultra Fast • 무료 티어',
      contextWindow: '100만 토큰',
      isDefault: true,
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      desc: 'Reasoning · 심층/설계',
      group: 'cloud',
      vendor: 'gemini',
      tier: '💎 Premium Depth',
      contextWindow: '200만 토큰',
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite',
      desc: 'Light · 초고속',
      group: 'cloud',
      vendor: 'gemini',
      tier: '⚡ Lightweight',
      contextWindow: '100만 토큰',
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      desc: 'Omni · 고성능',
      group: 'cloud',
      vendor: 'openai',
      tier: '🌟 Flagship Omni',
      contextWindow: '12.8만 토큰',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini',
      desc: 'Fast · 경량화',
      group: 'cloud',
      vendor: 'openai',
      tier: '⚡ Efficient Fast',
      contextWindow: '12.8만 토큰',
    },
    {
      id: 'o3-mini',
      name: 'o3-mini',
      desc: 'Reasoning · 심층 추론',
      group: 'cloud',
      vendor: 'openai',
      tier: '🧠 Advanced Reasoning',
      contextWindow: '20만 토큰',
    },
  ],
  anthropic: [
    {
      id: 'claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      desc: 'Advanced · 코드/설계',
      group: 'cloud',
      vendor: 'anthropic',
      tier: '🎯 Elite Coding',
      contextWindow: '20만 토큰',
    },
    {
      id: 'claude-3.5-haiku',
      name: 'Claude 3.5 Haiku',
      desc: 'Fast · 초고속 응답',
      group: 'cloud',
      vendor: 'anthropic',
      tier: '⚡ Instant Response',
      contextWindow: '20만 토큰',
    },
  ],
  deepseek: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek V3',
      desc: 'General · 범용/코딩',
      group: 'cloud',
      vendor: 'deepseek',
      tier: '🌐 Ultra Cost-Effective',
      contextWindow: '6.4만 토큰',
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek R1',
      desc: 'Reasoning · 심층 추론',
      group: 'cloud',
      vendor: 'deepseek',
      tier: '🧠 Open Reasoning',
      contextWindow: '6.4만 토큰',
    },
  ],
  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B (Groq)',
      desc: 'Ultra Fast · 초고속 LPU',
      group: 'cloud',
      vendor: 'groq',
      tier: '⚡ LPU Inference',
      contextWindow: '12.8만 토큰',
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B (Groq)',
      desc: 'Instant · 즉각 응답',
      group: 'cloud',
      vendor: 'groq',
      tier: '⚡ Instant LPU',
      contextWindow: '12.8만 토큰',
    },
  ],
};

/**
 * 기본 대표 모델 배열 (상수 폴백 모델)
 */
export const DEFAULT_FALLBACK_MODELS: ModelItem[] = [
  ...DEFAULT_CLOUD_MODELS_BY_VENDOR.gemini,
  ...DEFAULT_CLOUD_MODELS_BY_VENDOR.openai,
  ...DEFAULT_CLOUD_MODELS_BY_VENDOR.anthropic,
  ...DEFAULT_CLOUD_MODELS_BY_VENDOR.deepseek,
  ...DEFAULT_CLOUD_MODELS_BY_VENDOR.groq,
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
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Fast · 일상/요약' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Reasoning · 심층/설계' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', desc: 'Light · 초고속' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', desc: 'Omni · 고성능' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini', desc: 'Fast · 경량화' },
    { id: 'o3-mini', name: 'o3-mini', desc: 'Reasoning · 심층 추론' },
  ],
  anthropic: [
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Advanced · 코드/설계' },
    { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', desc: 'Fast · 초고속 응답' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3', desc: 'General · 범용/코딩' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1', desc: 'Reasoning · 심층 추론' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', desc: 'Ultra Fast · 초고속 LPU' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)', desc: 'Instant · 즉각 응답' },
  ],
};

/**
 * 하위 호환성을 위한 Provider별 모델 목록 맵 (PreferencesModal 등에서 사용)
 */
export const VENDOR_MODELS_MAP: Record<string, { id: string; name: string }[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
    { id: 'o3-mini', name: 'o3-mini' },
  ],
  anthropic: [
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)' },
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
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
    ],
  },
  {
    group: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
      { id: 'o3-mini', name: 'o3-mini' },
    ],
  },
  {
    group: 'Anthropic',
    models: [
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
    ],
  },
  {
    group: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1' },
    ],
  },
  {
    group: 'Groq Cloud',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)' },
    ],
  },
];

/**
 * 로컬 Ollama (`localhost:11434/api/tags`)에서 실제 풀(pull)된 모델 목록 조회
 */
export async function fetchOllamaTags(endpoint = 'http://localhost:11434'): Promise<ModelItem[]> {
  const cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    let res: Response | null = null;
    try {
      res = await fetch(`${cleanEndpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
    } catch {
      try {
        res = await fetch(`/api/tags?endpoint=${encodeURIComponent(cleanEndpoint)}`, {
          method: 'GET',
          signal: controller.signal,
        });
      } catch {
        res = null;
      }
    }

    clearTimeout(timer);

    if (!res || !res.ok) {
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

  const catalog = VENDOR_ACTIVE_MODELS[vendor] || DEFAULT_CLOUD_MODELS_BY_VENDOR[vendor] || [];
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
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'deepseek-chat', name: 'DeepSeek V3' },
];

/**
 * 모델 ID -> 표시명 표준 매핑
 */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o mini',
  'o3-mini': 'o3-mini',
  'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3.5-haiku': 'Claude 3.5 Haiku',
  'deepseek-chat': 'DeepSeek V3',
  'deepseek-reasoner': 'DeepSeek R1',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B (Groq)',
  'llama-3.1-8b-instant': 'Llama 3.1 8B (Groq)',
  'Qwen2.5-0.5B-Instruct': 'Qwen2.5-0.5B-Instruct',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': 'Qwen2.5-0.5B-Instruct',
  'gemini-3.8-flash': 'Gemini 2.5 Flash',
  'gemini-3.1-pro-preview': 'Gemini 2.5 Pro',
  'gemini-3.1-pro': 'Gemini 2.5 Pro',
  'gemini-3.1-flash-lite': 'Gemini 2.5 Flash Lite',
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
    badge: 'Fast · 일상/요약',
    badgeColor: 'badge-success',
    description: 'AI Studio 분당 무료 요청 제공, 초대용량 1M 컨텍스트 지원'
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    contextWindow: '200만 토큰',
    contextTokens: 2000000,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
    badge: 'Reasoning · 심층/설계',
    badgeColor: 'badge-muted',
    description: '초대형 2M 컨텍스트 지원 및 복잡한 코드와 학술 문서 논리 추론'
  },
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    contextWindow: '100만 토큰',
    contextTokens: 1000000,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    badge: 'Light · 초고속',
    badgeColor: 'badge-success',
    description: '초경량 초고속 모델, 빠른 레이턴시 응답'
  },
  'gpt-4o': {
    name: 'GPT-4o',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    badge: 'Omni · 고성능',
    badgeColor: 'badge-muted',
    description: 'OpenAI 플래그십 옴니 모델, 다방면 고성능 추론'
  },
  'gpt-4o-mini': {
    name: 'GPT-4o mini',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    badge: 'Fast · 경량화',
    badgeColor: 'badge-success',
    description: 'OpenAI 고효율 경량 모델, 경제적인 고속 추론'
  },
  'o3-mini': {
    name: 'o3-mini',
    contextWindow: '20만 토큰',
    contextTokens: 200000,
    inputCostPer1M: 1.10,
    outputCostPer1M: 4.40,
    badge: 'Reasoning · 심층 추론',
    badgeColor: 'badge-muted',
    description: '수학, 코딩, 과학 분야 심층 추론 특화'
  },
  'claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    contextWindow: '20만 토큰',
    contextTokens: 200000,
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    badge: 'Advanced · 코드/설계',
    badgeColor: 'badge-muted',
    description: 'Anthropic 최상위 모델, 코딩 및 기술 분석 최고 수준'
  },
  'claude-3.5-haiku': {
    name: 'Claude 3.5 Haiku',
    contextWindow: '20만 토큰',
    contextTokens: 200000,
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    badge: 'Fast · 초고속 응답',
    badgeColor: 'badge-success',
    description: '가장 빠른 속도와 경제적인 비용의 Claude 모델'
  },
  'deepseek-chat': {
    name: 'DeepSeek V3',
    contextWindow: '6.4만 토큰',
    contextTokens: 64000,
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
    badge: 'General · 범용/코딩',
    badgeColor: 'badge-success',
    description: '초저비용 671B 범용 MoE 오픈 아키텍처 모델'
  },
  'deepseek-reasoner': {
    name: 'DeepSeek R1',
    contextWindow: '6.4만 토큰',
    contextTokens: 64000,
    inputCostPer1M: 0.55,
    outputCostPer1M: 2.19,
    badge: 'Reasoning · 심층 추론',
    badgeColor: 'badge-muted',
    description: '강화학습 기반 오픈 추론 모델, 고난도 논리 문제 해결'
  },
  'llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B (Groq)',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
    badge: 'Ultra Fast · 초고속 LPU',
    badgeColor: 'badge-success',
    description: 'Groq LPU 기반 초당 300+ 토큰의 초고속 Llama 3.3 추론'
  },
  'llama-3.1-8b-instant': {
    name: 'Llama 3.1 8B (Groq)',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.05,
    outputCostPer1M: 0.08,
    badge: 'Instant · 즉각 응답',
    badgeColor: 'badge-success',
    description: 'Groq 하드웨어 가속 초경량 모델, 거의 실시간 생성'
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
  if (modelId.startsWith('gemini-2.5-flash-lite')) return MODEL_SPECS['gemini-2.5-flash-lite'];
  if (modelId.startsWith('gemini')) return MODEL_SPECS['gemini-2.5-flash'];
  if (modelId.startsWith('gpt-4o-mini')) return MODEL_SPECS['gpt-4o-mini'];
  if (modelId.startsWith('gpt-4o')) return MODEL_SPECS['gpt-4o'];
  if (modelId.startsWith('o3')) return MODEL_SPECS['o3-mini'];
  if (modelId.startsWith('claude-3.5-haiku')) return MODEL_SPECS['claude-3.5-haiku'];
  if (modelId.startsWith('claude')) return MODEL_SPECS['claude-3.5-sonnet'];
  if (modelId.startsWith('deepseek-reasoner') || modelId.includes('r1')) return MODEL_SPECS['deepseek-reasoner'];
  if (modelId.startsWith('deepseek')) return MODEL_SPECS['deepseek-chat'];
  if (modelId.includes('groq') || modelId.startsWith('llama-3.3')) return MODEL_SPECS['llama-3.3-70b-versatile'];
  if (modelId.startsWith('llama-3.1')) return MODEL_SPECS['llama-3.1-8b-instant'];
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

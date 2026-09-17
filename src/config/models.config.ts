/**
 * AI Podium 중앙 집중식 AI 모델 설정 및 동적 로더
 * models.config.ts / models.config.js
 */

export interface ModelItem {
  id: string;
  name: string;
  desc: string;
  group: 'cloud' | 'local';
  vendor?: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'ollama' | 'webllm';
  tier?: string;
  contextWindow?: string;
  isDefault?: boolean;
}

/**
 * 기본 대표 모델 배열 (상수 폴백 모델)
 * Provider 연결 전 또는 오프라인 상태에서 안전하게 노출되는 기본 모델 목록
 */
export const DEFAULT_FALLBACK_MODELS: ModelItem[] = [
  // Google Gemini Cloud
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    desc: '초고속 종합',
    group: 'cloud',
    vendor: 'gemini',
    tier: '⚡ Ultra Fast • 1x Credits',
    contextWindow: '100만 토큰',
    isDefault: true,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    desc: '고성능·추론',
    group: 'cloud',
    vendor: 'gemini',
    tier: '💎 Premium Depth • 3x Credits',
    contextWindow: '200만 토큰',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    desc: '초저지연',
    group: 'cloud',
    vendor: 'gemini',
    tier: '⚡ Lightning Fast • 0.5x Credits',
    contextWindow: '100만 토큰',
  },
  // DeepSeek Cloud
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    desc: '심층 추론',
    group: 'cloud',
    vendor: 'deepseek',
    tier: '🧠 High Reasoning • 2x Credits',
    contextWindow: '6.4만 토큰',
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    desc: '가성비 코딩',
    group: 'cloud',
    vendor: 'deepseek',
    tier: '⚖️ Balanced • 1x Credits',
    contextWindow: '6.4만 토큰',
  },
  // OpenAI Cloud
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    desc: '플래그십',
    group: 'cloud',
    vendor: 'openai',
    tier: '🌟 Flagship • 2.5x Credits',
    contextWindow: '12.8만 토큰',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    desc: '고속 경량',
    group: 'cloud',
    vendor: 'openai',
    tier: '⚡ Fast • 0.5x Credits',
    contextWindow: '12.8만 토큰',
  },
  // Anthropic Cloud
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    desc: '정밀 코딩',
    group: 'cloud',
    vendor: 'anthropic',
    tier: '🎯 Precision • 2x Credits',
    contextWindow: '20만 토큰',
  },
  // Groq Cloud
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Groq',
    desc: '초고속 LPU',
    group: 'cloud',
    vendor: 'groq',
    tier: '⚡ LPU Fast • 1x Credits',
    contextWindow: '12.8만 토큰',
  },
  // 기본 로컬 폴백 (Ollama 미연결 시 예비 표시)
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    desc: 'Ollama 로컬',
    group: 'local',
    vendor: 'ollama',
    tier: '🏠 Free (0 Credits)',
    contextWindow: '12.8만 토큰',
  },
  {
    id: 'qwen-2.5-coder',
    name: 'Qwen 2.5 Coder',
    desc: '32B 로컬',
    group: 'local',
    vendor: 'ollama',
    tier: '💻 Code Specialist • Free',
    contextWindow: '3.2만 토큰',
  },
];

/**
 * Provider별 등록 시 지원되는 공식 활성 모델 카탈로그
 */
export const VENDOR_ACTIVE_MODELS: Record<string, Array<{ id: string; name: string; desc: string }>> = {
  gemini: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', desc: '초고속 종합' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: '고성능·추론' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', desc: '초저지연' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', desc: '플래그십 옴니' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: '고속 경량' },
    { id: 'o3-mini', name: 'o3-mini', desc: '심층 추론' },
  ],
  anthropic: [
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: '정밀 코딩 및 분석' },
    { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', desc: '초경량 고속' },
  ],
  deepseek: [
    { id: 'deepseek-r1', name: 'DeepSeek R1', desc: '심층 추론 모델' },
    { id: 'deepseek-v3', name: 'DeepSeek V3', desc: '가성비 종합 모델' },
    { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder 32B', desc: '코딩 특화' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', desc: 'Groq LPU 초고속' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', desc: 'Groq 고속 MoE' },
  ],
};

/**
 * 하위 호환성을 위한 Provider별 모델 목록 맵 (PreferencesModal 등에서 사용)
 */
export const VENDOR_MODELS_MAP: Record<string, { id: string; name: string }[]> = {
  gemini: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o3-mini', name: 'o3-mini' },
  ],
  anthropic: [
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
  ],
  deepseek: [
    { id: 'deepseek-r1', name: 'DeepSeek R1' },
    { id: 'deepseek-v3', name: 'DeepSeek V3' },
    { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder 32B' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  ],
};

/**
 * 기본 로컬 Ollama 모델 선택 옵션
 */
export const DEFAULT_LOCAL_MODEL_OPTIONS: { id: string; name: string }[] = [
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
  { id: 'deepseek-r1-8b-local', name: 'DeepSeek R1 8B (로컬)' },
  { id: 'deepseek-r1', name: 'DeepSeek R1 70B (서버)' },
  { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder' },
  { id: 'mistral-7b-local', name: 'Mistral 7B Instruct' },
  { id: 'gemma2:9b', name: 'Gemma 2 9B' },
  { id: 'custom', name: '직접 입력' },
];

/**
 * 클라우드 모델 그룹화 옵션
 */
export const CLOUD_MODEL_OPTIONS = [
  {
    group: 'Google Gemini',
    models: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash - 추천' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
    ],
  },
  {
    group: 'DeepSeek 및 오픈소스',
    models: [
      { id: 'deepseek-r1', name: 'DeepSeek R1 - 심층 추론' },
      { id: 'deepseek-v3', name: 'DeepSeek V3' },
      { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder 32B' },
    ],
  },
  {
    group: 'OpenAI 및 Anthropic',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o3-mini', name: 'o3-mini' },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
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
          name: `${rawName} (Ollama)`,
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

  // 서버의 /api/models 엔드포인트를 호출하거나, 등록된 Provider별 최신 공식 모델 카탈로그를 동적으로 주입
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

  // 백엔드 실패 또는 오프라인 시 VENDOR_ACTIVE_MODELS 기반 반환
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
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'deepseek-r1', name: 'DeepSeek R1' },
  { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder' },
];

/**
 * 모델 ID -> 표시명 표준 매핑
 */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemini-3.8-flash': 'Gemini 3.8 Flash',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'gemini-3.1-pro': 'Gemini 3.1 Pro',
  'gemini-3.1-flash-lite': 'Gemini 3.1 Flash-Lite',
  'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'deepseek-r1': 'DeepSeek R1',
  'deepseek-v3': 'DeepSeek V3',
  'qwen-2.5-coder': 'Qwen 2.5 Coder',
  'qwen2.5-coder-32b': 'Qwen 2.5 Coder',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.3-70b': 'Llama 3.3 70B',
};

export function getModelDisplayName(modelId: string): string {
  if (!modelId) return 'Gemini 3.8 Flash';
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
  'gemini-3.8-flash': {
    name: 'Gemini 3.8 Flash',
    contextWindow: '100만 토큰',
    contextTokens: 1000000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    badge: '무료 티어 제공',
    badgeColor: 'badge-success',
    description: 'AI Studio 분당 무료 요청 제공, 초대용량 1M 컨텍스트 지원'
  },
  'gemini-3.1-pro-preview': {
    name: 'Gemini 3.1 Pro',
    contextWindow: '200만 토큰',
    contextTokens: 2000000,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
    badge: '복합 추론 특화',
    badgeColor: 'badge-muted',
    description: '초대형 2M 컨텍스트 지원 및 복잡한 코드와 학술 문서 논리 추론'
  },
  'gemini-3.1-flash-lite': {
    name: 'Gemini 3.1 Flash-Lite',
    contextWindow: '100만 토큰',
    contextTokens: 1000000,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    badge: '초고속 경량',
    badgeColor: 'badge-muted',
    description: '경량 초고속 응답 속도 및 최소 비용 단가'
  },
  'deepseek-r1': {
    name: 'DeepSeek R1',
    contextWindow: '6.4만 토큰',
    contextTokens: 64000,
    inputCostPer1M: 0.55,
    outputCostPer1M: 2.19,
    badge: '심층 추론 엔진',
    badgeColor: 'badge-muted',
    description: '심층 추론 알고리즘 탑재 및 높은 가성비'
  },
  'deepseek-v3': {
    name: 'DeepSeek V3',
    contextWindow: '6.4만 토큰',
    contextTokens: 64000,
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
    badge: '초저비용 범용',
    badgeColor: 'badge-muted',
    description: '초당 처리량 극대화 및 합리적인 토큰 단가'
  },
  'qwen-2.5-coder': {
    name: 'Qwen 2.5 Coder 32B',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.20,
    outputCostPer1M: 0.60,
    badge: '코딩 특화',
    badgeColor: 'badge-muted',
    description: '프로그래밍 코드 분석, 리팩토링, 디버깅 최적화'
  },
  'gpt-4o': {
    name: 'GPT-4o',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    badge: '플래그십 모델',
    badgeColor: 'badge-muted',
    description: '대표 올라운드 멀티모달 모델, 우수한 종합 성능'
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    badge: '가성비 고속',
    badgeColor: 'badge-muted',
    description: '경량 고속 텍스트 생성 및 경제적인 일상 질의'
  },
  'claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    contextWindow: '20만 토큰',
    contextTokens: 200000,
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    badge: '고급 분석 및 작문',
    badgeColor: 'badge-muted',
    description: '탁월한 작문력과 복잡한 프런트엔드 아키텍처 코딩'
  },
  'llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B',
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
    badge: '초고속 스트리밍',
    badgeColor: 'badge-muted',
    description: 'Groq LPU 기반 실시간 수준의 초고속 토큰 스트리밍'
  }
};

export const getModelSpec = (modelId: string): ModelSpec => {
  if (MODEL_SPECS[modelId]) return MODEL_SPECS[modelId];
  if (modelId.startsWith('gemini')) return MODEL_SPECS['gemini-3.8-flash'];
  if (modelId.startsWith('deepseek-r1')) return MODEL_SPECS['deepseek-r1'];
  if (modelId.startsWith('deepseek')) return MODEL_SPECS['deepseek-v3'];
  if (modelId.startsWith('gpt-4o-mini')) return MODEL_SPECS['gpt-4o-mini'];
  if (modelId.startsWith('gpt-')) return MODEL_SPECS['gpt-4o'];
  if (modelId.startsWith('claude')) return MODEL_SPECS['claude-3.5-sonnet'];
  if (modelId.startsWith('llama')) return MODEL_SPECS['llama-3.3-70b-versatile'];
  return {
    name: modelId,
    contextWindow: '12.8만 토큰',
    contextTokens: 128000,
    inputCostPer1M: 0.50,
    outputCostPer1M: 1.50,
    badge: '사용자 지정',
    badgeColor: 'badge-muted',
    description: '외부 연동 모델'
  };
};


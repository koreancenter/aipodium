import type { AiDomainProfile, AiInferenceOptions } from '../types';

export const AI_DOMAIN_PROFILES: readonly AiDomainProfile[] = [
  {
    id: 'document-summary',
    name: '문서 요약',
    systemPrompt:
      '문서 요약 전문가로서 원문의 핵심 주장, 근거, 결론을 빠짐없이 구분해 간결하게 요약하세요. 원문에 없는 사실을 덧붙이지 말고, 불확실한 내용은 불확실하다고 표시하세요.',
    temperature: 0.2,
    recommendedModel: 'gemini-2.5-flash',
    responseFormat: 'markdown',
  },
  {
    id: 'schedule-management',
    name: '일정 관리',
    systemPrompt:
      '일정 관리 도우미로서 요청에 포함된 날짜, 시간, 담당자, 마감일을 정확히 정리하세요. 시간대나 날짜가 불명확하면 임의로 추정하지 말고 확인이 필요한 항목으로 구분하세요. JSON 객체는 events 배열과 needsClarification 배열을 포함해야 합니다. events의 각 항목은 title, start, end, assignee, deadline, notes 필드를 포함하고, 확인할 수 없는 값은 null로 작성하세요. needsClarification에는 사용자가 확인해야 할 내용을 문자열로 담으세요.',
    temperature: 0.2,
    recommendedModel: 'gemini-2.5-flash',
    responseFormat: 'json',
  },
];

export function getAiDomainProfile(id: string): AiDomainProfile | undefined {
  return AI_DOMAIN_PROFILES.find((profile) => profile.id === id);
}

export function applyAiDomainProfile(
  options: AiInferenceOptions,
  profile: AiDomainProfile
): AiInferenceOptions {
  const outputInstruction = profile.responseFormat === 'json'
    ? '응답은 유효한 JSON만 출력하세요. 마크다운 코드 펜스나 JSON 외의 설명은 포함하지 마세요.'
    : profile.responseFormat === 'markdown'
      ? '응답은 읽기 쉬운 마크다운으로 작성하세요.'
      : '';
  const profileInstruction = [profile.systemPrompt, outputInstruction]
    .filter(Boolean)
    .join('\n\n');
  const systemInstruction = [options.systemInstruction, profileInstruction]
    .filter((instruction): instruction is string => Boolean(instruction?.trim()))
    .join('\n\n');

  return {
    ...options,
    model: options.model || profile.recommendedModel || '',
    temperature: options.temperature ?? profile.temperature,
    responseFormat: options.responseFormat ?? profile.responseFormat,
    systemInstruction: systemInstruction || undefined,
  };
}

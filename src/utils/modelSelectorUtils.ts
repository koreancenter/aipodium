export type ModelSelectionMode = 'single' | 'multi' | 'routing';

export function normalizeModelId(modelId: string): string {
  return modelId === 'gemini-3.8-flash' ? 'gemini-2.5-flash' : modelId;
}

export function normalizeModelIds(modelIds: string[]): string[] {
  return Array.from(new Set(modelIds.map(normalizeModelId)));
}

export function appendModelIfMissing(modelIds: string[], modelId: string): {
  modelIds: string[];
  added: boolean;
} {
  const normalizedIds = normalizeModelIds(modelIds);
  const normalizedModelId = normalizeModelId(modelId);
  if (normalizedIds.includes(normalizedModelId)) {
    return { modelIds: normalizedIds, added: false };
  }
  return { modelIds: [...normalizedIds, normalizedModelId], added: true };
}

export function isModelSelected(
  modelId: string,
  selectedModel: string,
  selectedMultiModels: string[],
  mode: ModelSelectionMode
): boolean {
  const target = normalizeModelId(modelId);
  const selection = mode === 'single'
    ? [selectedModel]
    : selectedMultiModels.length > 0
      ? selectedMultiModels
      : [selectedModel];
  return normalizeModelIds(selection).includes(target);
}

export function getModelSelectorLabel(
  mode: ModelSelectionMode,
  activeCount: number,
  primaryModelName: string
): string {
  if (mode === 'routing') return `자동 라우팅 ${activeCount}`;
  if (mode === 'multi' && activeCount >= 2) {
    return `${primaryModelName} +${activeCount - 1}`;
  }
  return primaryModelName;
}

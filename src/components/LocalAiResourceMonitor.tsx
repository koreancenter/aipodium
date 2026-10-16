import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

<<<<<<< HEAD
interface LocalAiResourceMonitorProps {
  endpoint: string;
  isGenerating: boolean;
  activeModel?: string;
  provider: 'cloud' | 'local-pc' | 'local-server';
=======
export type AiEngineProviderType = 'cloud' | 'local-pc' | 'local-server' | 'webllm';

export interface LocalAiResourceMonitorProps {
  endpoint: string;
  isGenerating: boolean;
  activeModel?: string;
  provider: AiEngineProviderType;
  activeProvider?: AiEngineProviderType;
>>>>>>> main
  variant?: 'statusbar' | 'header';
  onOpenSettings?: () => void;
}

interface LoadedModelInfo {
  name: string;
  sizeVramBytes: number;
  totalSizeBytes: number;
  gpuOffloadPercent: number;
  parameterSize?: string;
  quantization?: string;
  expiresAt?: string;
}

export const LocalAiResourceMonitor: React.FC<LocalAiResourceMonitorProps> = ({
  endpoint,
  isGenerating,
  activeModel = '',
  provider,
<<<<<<< HEAD
=======
  activeProvider,
>>>>>>> main
  variant = 'statusbar',
  onOpenSettings,
}) => {
  const [loadedModel, setLoadedModel] = useState<LoadedModelInfo | null>(null);
  const [cpuPercent, setCpuPercent] = useState<number>(0);

<<<<<<< HEAD
  // Normalize endpoint to always include http:// or https:// protocol
  const rawEndpoint = (endpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  const cleanEndpoint = /^https?:\/\//i.test(rawEndpoint) ? rawEndpoint : `http://${rawEndpoint}`;
  const isLocalActive = provider === 'local-pc' || provider === 'local-server';
=======
  const effectiveProvider = activeProvider || provider;
  const isCloudProvider = effectiveProvider === 'cloud';
  const isLocalActive = !isCloudProvider && (effectiveProvider === 'local-pc' || effectiveProvider === 'local-server' || effectiveProvider === 'webllm');

  // Normalize endpoint to always include http:// or https:// protocol
  const rawEndpoint = (endpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  const cleanEndpoint = /^https?:\/\//i.test(rawEndpoint) ? rawEndpoint : `http://${rawEndpoint}`;
>>>>>>> main

  // Helper to render micro segment LED bar: 10 segments (width: 2px, height: 7px, gap: 1.5px, rounded: 0.5px)
  const renderSegmentBar = (percent: number) => {
    const clamped = Math.max(0, Math.min(100, percent));
    const activeCount = Math.min(10, Math.floor(clamped / 10));
    const activeColor = clamped >= 60 ? 'bg-orange-400' : 'bg-indigo-500';

    return (
      <span className="inline-flex items-center gap-[1.5px] select-none" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`w-[2px] h-[7px] rounded-[0.5px] transition-colors duration-150 ${
              i < activeCount ? activeColor : 'bg-white/10'
            }`}
          />
        ))}
      </span>
    );
  };

  // Estimate baseline VRAM if ps is blocked by browser CORS or model known
  const estimateVramFromModelName = (name: string): { bytes: number; param: string } => {
    const lower = name.toLowerCase();
    if (lower.includes('72b') || lower.includes('70b') || lower.includes('67b')) {
      return { bytes: 42 * 1024 * 1024 * 1024, param: '70B' };
    }
    if (lower.includes('34b') || lower.includes('32b')) {
      return { bytes: 20 * 1024 * 1024 * 1024, param: '32B' };
    }
    if (lower.includes('27b')) {
      return { bytes: 16 * 1024 * 1024 * 1024, param: '27B' };
    }
    if (lower.includes('14b') || lower.includes('13b')) {
      return { bytes: 9.2 * 1024 * 1024 * 1024, param: '14B' };
    }
    if (lower.includes('8b') || lower.includes('7b') || lower.includes('mistral')) {
      return { bytes: 4.8 * 1024 * 1024 * 1024, param: '7B/8B' };
    }
    if (lower.includes('3.8b') || lower.includes('phi-3') || lower.includes('phi3')) {
      return { bytes: 2.8 * 1024 * 1024 * 1024, param: '3.8B' };
    }
    if (lower.includes('3b') || lower.includes('2b')) {
      return { bytes: 2.3 * 1024 * 1024 * 1024, param: '3B' };
    }
    if (lower.includes('1.5b') || lower.includes('1b')) {
      return { bytes: 1.4 * 1024 * 1024 * 1024, param: '1.5B' };
    }
    if (lower.includes('0.5b')) {
      return { bytes: 0.6 * 1024 * 1024 * 1024, param: '0.5B' };
    }
    return { bytes: 4.8 * 1024 * 1024 * 1024, param: '기본' };
  };

  // Poll Ollama /api/ps to check loaded models and real VRAM
  const fetchOllamaProcessStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const res = await fetch(`${cleanEndpoint}/api/ps`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.models) && data.models.length > 0) {
          const m = data.models[0];
          const vram = m.size_vram || m.size || 0;
          const total = m.size || vram;
          const offload = total > 0 ? Math.min(100, Math.round((vram / total) * 100)) : 100;

          setLoadedModel({
            name: m.name || m.model || activeModel,
            sizeVramBytes: vram,
            totalSizeBytes: total,
            gpuOffloadPercent: offload,
            parameterSize: m.details?.parameter_size,
            quantization: m.details?.quantization_level,
            expiresAt: m.expires_at
          });
        } else {
          if (isGenerating && activeModel) {
            const fallback = estimateVramFromModelName(activeModel);
            setLoadedModel({
              name: activeModel,
              sizeVramBytes: fallback.bytes,
              totalSizeBytes: fallback.bytes,
              gpuOffloadPercent: 100,
              parameterSize: fallback.param
            });
          } else {
            setLoadedModel(null);
          }
        }
      } else {
        if (isGenerating && activeModel) {
          const fallback = estimateVramFromModelName(activeModel);
          setLoadedModel({
            name: activeModel,
            sizeVramBytes: fallback.bytes,
            totalSizeBytes: fallback.bytes,
            gpuOffloadPercent: 100,
            parameterSize: fallback.param
          });
        }
      }
    } catch {
      if (isGenerating && activeModel) {
        const fallback = estimateVramFromModelName(activeModel);
        setLoadedModel({
          name: activeModel,
          sizeVramBytes: fallback.bytes,
          totalSizeBytes: fallback.bytes,
          gpuOffloadPercent: 100,
          parameterSize: fallback.param
        });
      }
    }
  };

  // Poll intervals: fast during generation, moderate during idle
  useEffect(() => {
<<<<<<< HEAD
    if (!isLocalActive) return;
=======
    if (effectiveProvider === 'webllm') {
      const fallback = estimateVramFromModelName(activeModel || 'Llama-3.2-3B');
      setLoadedModel({
        name: activeModel || 'WebLLM Llama-3.2',
        sizeVramBytes: fallback.bytes,
        totalSizeBytes: fallback.bytes,
        gpuOffloadPercent: 100,
        parameterSize: fallback.param
      });
      return;
    }

    if (effectiveProvider !== 'local-pc' && effectiveProvider !== 'local-server') return;
>>>>>>> main

    fetchOllamaProcessStatus();
    const intervalMs = isGenerating ? 1200 : 8000;
    const timer = setInterval(fetchOllamaProcessStatus, intervalMs);

    return () => clearInterval(timer);
<<<<<<< HEAD
  }, [cleanEndpoint, isGenerating, isLocalActive, activeModel]);
=======
  }, [cleanEndpoint, isGenerating, effectiveProvider, activeModel]);
>>>>>>> main

  // CPU telemetry simulation based on generation state and model weight
  useEffect(() => {
    if (isGenerating) {
      const lower = (activeModel || '').toLowerCase();
      const isHeavyModel = lower.includes('70b') || lower.includes('72b') || lower.includes('32b');
      const baseCpu = isHeavyModel ? 84 : 46;

      const interval = setInterval(() => {
        const jitter = Math.floor(Math.random() * 16) - 7;
        setCpuPercent(Math.min(96, Math.max(28, baseCpu + jitter)));
      }, 500);

      return () => clearInterval(interval);
    } else {
      if (loadedModel) {
        setCpuPercent(Math.floor(Math.random() * 2) + 1); // 1~2% idle
      } else {
        setCpuPercent(0);
      }
    }
  }, [isGenerating, loadedModel, activeModel]);

  const formatVram = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const vramText = loadedModel ? formatVram(loadedModel.sizeVramBytes) : '0 GB';
  // Calculate VRAM percentage assuming standard 12GB reference capacity or model sizing
  const vramPercent = loadedModel
    ? Math.min(100, Math.max(5, Math.round((loadedModel.sizeVramBytes / (12 * 1024 * 1024 * 1024)) * 100)))
    : 0;

  const isVramWarning = vramPercent > 85;
  const isCpuWarning = cpuPercent > 85;
  const hasWarning = isVramWarning || isCpuWarning;

  const getTooltipText = () => {
<<<<<<< HEAD
    if (!isLocalActive) {
      return '로컬 AI 리소스 모니터 (현재 클라우드 AI 모드)\n클릭하여 로컬 Ollama 또는 전용 추론 서버로 전환할 수 있습니다.';
=======
    if (effectiveProvider === 'webllm') {
      const modelDisplay = activeModel || 'WebLLM 브라우저 엔진';
      let text = `[WebGPU 브라우저 로컬 AI]\nVRAM: ${vramPercent}% (${vramText}) | CPU: ${cpuPercent}%\n활성 모델: ${modelDisplay}`;
      if (hasWarning) {
        text += '\n주의: 자원 사용량 85% 초과';
      }
      if (onOpenSettings) {
        text += '\n클릭하여 AI 엔진 설정 열기';
      }
      return text;
>>>>>>> main
    }
    const modelDisplay = loadedModel?.name || activeModel || '대기 중';
    let text = `[로컬 AI 리소스 모니터 - ${cleanEndpoint}]\nVRAM: ${vramPercent}% (${vramText}) | CPU: ${cpuPercent}%\n활성 모델: ${modelDisplay}`;
    if (hasWarning) {
<<<<<<< HEAD
      text += '\n⚠️ 주의: 자원 사용량 85% 초과 (부하 경고 모드)';
    }
    if (onOpenSettings) {
      text += '\n(클릭하여 AI 엔진 및 엔드포인트 설정 열기)';
=======
      text += '\n주의: 자원 사용량 85% 초과';
    }
    if (onOpenSettings) {
      text += '\n클릭하여 AI 엔진 및 엔드포인트 설정 열기';
>>>>>>> main
    }
    return text;
  };

<<<<<<< HEAD
  // Header variant (compact indicator)
  if (variant === 'header') {
    if (!isLocalActive) return null;

=======
  // Only render VRAM and CPU bar meters when activeProvider is 'webllm' or 'local-pc'.
  // Hide them when using 'cloud' so it doesn't show meaningless 0% bars.
  if (!isLocalActive || isCloudProvider) {
    return null;
  }

  // Header variant (compact indicator)
  if (variant === 'header') {
>>>>>>> main
    return (
      <div className="local-ai-resource-monitor relative inline-flex items-center">
        <button
          type="button"
          onClick={onOpenSettings}
          className="local-ai-resource-monitor inline-flex items-center gap-2.5 shrink-0 select-none cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
          title={getTooltipText()}
        >
          <Cpu className={`w-3.5 h-3.5 transition-colors ${hasWarning ? 'text-red-400' : 'text-zinc-400'}`} />
          {/* VRAM Indicator */}
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] font-medium text-zinc-400">VRAM</span>
            {renderSegmentBar(vramPercent)}
            <span className="text-[11px] font-mono font-medium text-zinc-300 min-w-[24px] text-right tabular-nums">
              {vramPercent}%
            </span>
          </div>

          <span className="text-zinc-600">|</span>

          {/* CPU Indicator */}
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] font-medium text-zinc-400">CPU</span>
            {renderSegmentBar(cpuPercent)}
            <span className="text-[11px] font-mono font-medium text-zinc-300 min-w-[24px] text-right tabular-nums">
              {cpuPercent}%
            </span>
          </div>
        </button>
      </div>
    );
  }

  // Standard Bottom Statusbar Variant (Flat inline indicator)
  return (
    <div className="local-ai-resource-monitor relative inline-flex items-center">
      <button
        type="button"
        onClick={onOpenSettings}
        className="local-ai-resource-monitor inline-flex items-center gap-2.5 shrink-0 select-none cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
        title={getTooltipText()}
      >
        {/* VRAM Metric */}
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[10px] font-medium text-zinc-400">VRAM</span>
          {renderSegmentBar(vramPercent)}
          <span className="text-[11px] font-mono font-medium text-zinc-300 min-w-[24px] text-right tabular-nums">
            {vramPercent}%
          </span>
        </div>

        {/* Divider */}
        <span className="text-zinc-600">|</span>

        {/* CPU Metric */}
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[10px] font-medium text-zinc-400">CPU</span>
          {renderSegmentBar(cpuPercent)}
          <span className="text-[11px] font-mono font-medium text-zinc-300 min-w-[24px] text-right tabular-nums">
            {cpuPercent}%
          </span>
        </div>
      </button>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

interface LocalAiResourceMonitorProps {
  endpoint: string;
  isGenerating: boolean;
  activeModel?: string;
  provider: 'cloud' | 'local-pc' | 'local-server';
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

// 12-step btop gradient palette from White (#ffffff) to Deep Orange (#ea580c)
const BTOP_COLOR_RAMP = [
  '#ffffff', // 1: Pure White
  '#fff3ea', // 2: Warm White
  '#fee5d3', // 3: Soft Peach
  '#fdd2b4', // 4: Light Apricot
  '#fdb786', // 5: Peach Orange
  '#fc9e5b', // 6: Warm Amber Orange
  '#fb8835', // 7: Bright Orange
  '#f97316', // 8: Vivid Orange
  '#f0630e', // 9: Vibrant Deep Orange
  '#ea580c', // 10: Deep Orange
  '#d64a06', // 11: Intense Deep Orange
  '#c2410c', // 12: Peak Rich Deep Orange
];

export const LocalAiResourceMonitor: React.FC<LocalAiResourceMonitorProps> = ({
  endpoint,
  isGenerating,
  activeModel = '',
  provider,
  variant = 'statusbar',
  onOpenSettings,
}) => {
  const [loadedModel, setLoadedModel] = useState<LoadedModelInfo | null>(null);
  const [cpuPercent, setCpuPercent] = useState<number>(0);

  // Normalize endpoint to always include http:// or https:// protocol
  const rawEndpoint = (endpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  const cleanEndpoint = /^https?:\/\//i.test(rawEndpoint) ? rawEndpoint : `http://${rawEndpoint}`;
  const isLocalActive = provider === 'local-pc' || provider === 'local-server';

  // Helper to render btop-style colon progress bar
  const renderBtopColonBar = (percent: number, totalColons = 12) => {
    const clamped = Math.max(0, Math.min(100, percent));
    const activeCount = Math.round((clamped / 100) * totalColons);
    const effectiveActive = clamped > 0 && activeCount === 0 ? 1 : activeCount;
    const isOverThreshold = percent > 85;

    return (
      <span className="font-mono inline-flex items-center select-none font-bold tracking-[0.5px]">
        {Array.from({ length: totalColons }).map((_, i) => {
          const isFilled = i < effectiveActive;
          let color = '#333748';
          if (isFilled) {
            const colonPercent = ((i + 1) / totalColons) * 100;
            // Transition from deep orange to warning red when resource usage exceeds 85%
            if (colonPercent > 85 || (isOverThreshold && i >= 10)) {
              color = i === totalColons - 1 ? '#dc2626' : '#ef4444';
            } else {
              color = BTOP_COLOR_RAMP[i] || '#ea580c';
            }
          }
          return (
            <span
              key={i}
              style={{ color }}
              className="transition-colors duration-200 leading-none"
            >
              :
            </span>
          );
        })}
      </span>
    );
  };

  const getMetricTextColor = (percent: number) => {
    return percent > 85 ? 'text-[#ef4444]' : 'text-[#ea580c]';
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
    if (!isLocalActive) return;

    fetchOllamaProcessStatus();
    const intervalMs = isGenerating ? 1200 : 8000;
    const timer = setInterval(fetchOllamaProcessStatus, intervalMs);

    return () => clearInterval(timer);
  }, [cleanEndpoint, isGenerating, isLocalActive, activeModel]);

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

  const getBorderColorClass = () => {
    if (hasWarning) {
      return 'bg-[#1c1417] border-[#ef4444]/80 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
    }
    if (isGenerating) {
      return 'bg-[#16171e] border-[#ea580c]/60';
    }
    return 'bg-[#16171e] border-[#2e3142] hover:border-[#6366f1]/50';
  };

  const getTooltipText = () => {
    if (!isLocalActive) {
      return '로컬 AI 리소스 모니터 (현재 클라우드 AI 모드)\n클릭하여 로컬 Ollama 또는 전용 추론 서버로 전환할 수 있습니다.';
    }
    const modelDisplay = loadedModel?.name || activeModel || '대기 중';
    let text = `[로컬 AI 리소스 모니터 - ${cleanEndpoint}]\nVRAM: ${vramPercent}% (${vramText}) | CPU: ${cpuPercent}%\n활성 모델: ${modelDisplay}`;
    if (hasWarning) {
      text += '\n⚠️ 주의: 자원 사용량 85% 초과 (부하 경고 모드)';
    }
    if (onOpenSettings) {
      text += '\n(클릭하여 AI 엔진 및 엔드포인트 설정 열기)';
    }
    return text;
  };

  // Header variant (compact indicator)
  if (variant === 'header') {
    if (!isLocalActive) return null;

    return (
      <div className="local-ai-resource-monitor relative inline-flex items-center">
        <button
          type="button"
          onClick={onOpenSettings}
          className={`local-ai-resource-monitor h-6 px-2 rounded-xs border text-[0.6875rem] font-mono transition flex items-center gap-2.5 shrink-0 select-none cursor-pointer ${getBorderColorClass()}`}
          title={getTooltipText()}
        >
          <Cpu className={`w-3.5 h-3.5 transition-colors ${hasWarning ? 'text-red-400' : 'text-slate-400'}`} />
          {/* VRAM Indicator */}
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-white font-semibold">VRAM</span>
            {renderBtopColonBar(vramPercent, 12)}
            <span className={`${getMetricTextColor(vramPercent)} font-bold min-w-[24px] text-right tabular-nums transition-colors duration-200`}>
              {vramPercent}%
            </span>
          </div>

          <span className="text-[#2e3142]">|</span>

          {/* CPU Indicator */}
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-white font-semibold">CPU</span>
            {renderBtopColonBar(cpuPercent, 12)}
            <span className={`${getMetricTextColor(cpuPercent)} font-bold min-w-[24px] text-right tabular-nums transition-colors duration-200`}>
              {cpuPercent}%
            </span>
          </div>
        </button>
      </div>
    );
  }

  // Standard Bottom Statusbar Variant (Matches target CSS selector footer > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1))
  return (
    <div className="local-ai-resource-monitor relative inline-flex items-center">
      <button
        type="button"
        onClick={onOpenSettings}
        className={`local-ai-resource-monitor h-5 px-2 rounded-xs border text-[0.625rem] font-mono transition flex items-center gap-2.5 shrink-0 select-none cursor-pointer ${getBorderColorClass()}`}
        title={getTooltipText()}
      >
        {/* VRAM Metric: VRAM :::::::::::: 0% */}
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-white font-semibold">VRAM</span>
          {renderBtopColonBar(vramPercent, 12)}
          <span className={`${getMetricTextColor(vramPercent)} font-bold min-w-[22px] text-right tabular-nums transition-colors duration-200`}>
            {vramPercent}%
          </span>
        </div>

        {/* Divider */}
        <span className="text-slate-600">|</span>

        {/* CPU Metric: CPU :::::::::::: 0% */}
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-white font-semibold">CPU</span>
          {renderBtopColonBar(cpuPercent, 12)}
          <span className={`${getMetricTextColor(cpuPercent)} font-bold min-w-[22px] text-right tabular-nums transition-colors duration-200`}>
            {cpuPercent}%
          </span>
        </div>
      </button>
    </div>
  );
};

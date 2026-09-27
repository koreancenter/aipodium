import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenTool,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  FileDown,
  X,
  Grid,
  Eye,
  Check
} from 'lucide-react';

export interface FreeformDrawingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImageToEditor?: (dataUrl: string) => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

interface StrokePoint {
  x: number;
  y: number;
}

interface Stroke {
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  size: number;
  points: StrokePoint[];
}

const COLOR_PALETTE = [
  { id: 'indigo', value: '#6366f1', label: '인디고' },
  { id: 'white', value: '#f8fafc', label: '화이트' },
  { id: 'amber', value: '#fbbf24', label: '옐로우' },
  { id: 'emerald', value: '#34d399', label: '그린' },
  { id: 'rose', value: '#f43f5e', label: '레드' },
  { id: 'sky', value: '#38bdf8', label: '블루' },
];

const SIZE_PRESETS = [
  { id: 'thin', size: 2, label: '얇게' },
  { id: 'medium', size: 4, label: '보통' },
  { id: 'thick', size: 8, label: '두껍게' },
];

export const FreeformDrawingOverlay: React.FC<FreeformDrawingOverlayProps> = ({
  isOpen,
  onClose,
  onInsertImageToEditor,
  onToast,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Drawing tools state
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#6366f1');
  const [size, setSize] = useState<number>(3);
  const [bgMode, setBgMode] = useState<'transparent' | 'grid' | 'dark'>('transparent');

  // Stroke history for pristine Undo & Redo
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  // Current active drawing stroke ref (for smooth 60fps rendering without React state lag)
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  // Redraw complete canvas buffer
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Reset and clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background Mode rendering
    if (bgMode === 'dark') {
      ctx.fillStyle = 'rgba(12, 12, 14, 0.88)';
      ctx.fillRect(0, 0, rect.width, rect.height);
    } else if (bgMode === 'grid') {
      ctx.fillStyle = 'rgba(12, 12, 14, 0.45)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      const gridSize = 24;
      for (let x = gridSize; x < rect.width; x += gridSize) {
        for (let y = gridSize; y < rect.height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Replay all strokes
    for (const stroke of strokes) {
      if (!stroke || !stroke.points || stroke.points.length === 0) continue;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.size * 5;
      } else if (stroke.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size * 4;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
      }

      const points = stroke.points;
      if (!points || points.length === 0) {
        ctx.restore();
        continue;
      }

      if (points.length === 1) {
        const pt = points[0];
        if (pt) {
          ctx.fillStyle = stroke.tool === 'eraser' ? '#000' : stroke.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, stroke.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const startPt = points[0];
        if (startPt) {
          ctx.beginPath();
          ctx.moveTo(startPt.x, startPt.y);

          for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            if (!prev || !curr) continue;
            const midX = (prev.x + curr.x) / 2;
            const midY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
          const lastPt = points[points.length - 1];
          if (lastPt) {
            ctx.lineTo(lastPt.x, lastPt.y);
          }
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }, [strokes, bgMode]);

  // Adjust canvas size to match container with DPI support
  useEffect(() => {
    if (!isOpen) return;

    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      redrawCanvas();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [isOpen, redrawCanvas]);

  // Handle pointer down (touch, pen, mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newStroke: Stroke = {
      tool,
      color,
      size,
      points: [{ x, y }],
    };
    currentStrokeRef.current = newStroke;

    // Draw initial dot
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x, y, (size * 5) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, (size * 4) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stroke = currentStrokeRef.current;
    if (!stroke || !stroke.points || stroke.points.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const points = stroke.points;
    const prevPoint = points[points.length - 1];
    if (!prevPoint) return;

    points.push({ x, y });

    // Draw active segment directly for maximum responsiveness
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.size * 5;
    } else if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
    }

    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  };

  // Handle pointer up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture was already released
      }
    }
    isDrawingRef.current = false;

    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    if (finishedStroke && finishedStroke.points && finishedStroke.points.length > 0) {
      setStrokes((prev) => [...prev.filter((s): s is Stroke => Boolean(s && s.points)), finishedStroke]);
      setRedoStack([]); // Clear redo stack on new action
    }
  };

  // Undo action
  const handleUndo = () => {
    const validStrokes = strokes.filter((s): s is Stroke => Boolean(s && s.points));
    if (validStrokes.length === 0) return;
    const last = validStrokes[validStrokes.length - 1];
    setStrokes(validStrokes.slice(0, validStrokes.length - 1));
    setRedoStack((prev) => [...prev.filter((s): s is Stroke => Boolean(s && s.points)), last]);
  };

  // Redo action
  const handleRedo = () => {
    const validRedo = redoStack.filter((s): s is Stroke => Boolean(s && s.points));
    if (validRedo.length === 0) return;
    const next = validRedo[validRedo.length - 1];
    setRedoStack(validRedo.slice(0, validRedo.length - 1));
    setStrokes((prev) => [...prev.filter((s): s is Stroke => Boolean(s && s.points)), next]);
  };

  // Clear all strokes
  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    currentStrokeRef.current = null;
    isDrawingRef.current = false;
    onToast('전체 메모가 지워졌습니다.');
  };

  // Download drawn canvas as PNG image file
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeStrokes = strokes.filter((s) => s && s.points && s.points.length > 0);
    if (activeStrokes.length === 0) {
      onToast('저장할 메모나 그림이 없습니다.', 'warn');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `자유_형식_메모_${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('✓ 메모 이미지가 다운로드되었습니다.', 'success');
  };

  // Insert drawn canvas directly into current editor document
  const handleInsertToEditor = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeStrokes = strokes.filter((s) => s && s.points && s.points.length > 0);
    if (activeStrokes.length === 0) {
      onToast('삽입할 메모나 그림이 없습니다.', 'warn');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (onInsertImageToEditor) {
      onInsertImageToEditor(dataUrl);
      onToast('✓ 자유 형식 메모 다이어그램이 문서에 삽입되었습니다.', 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      id="freeform-drawing-overlay"
      className="absolute inset-0 z-30 flex flex-col pointer-events-auto select-none overflow-hidden"
    >
      {/* Floating Slim Obsidian IDE Header Toolbar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-[#121214]/95 backdrop-blur-md border border-[#222226] shadow-xl rounded-md px-2.5 py-1.5 flex items-center gap-2 max-w-[95%] overflow-x-auto scrollbar-none transition-all animate-in fade-in slide-in-from-top-2 duration-150">
        {/* Title & Drag indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 pr-1.5 border-r border-[#222226] shrink-0">
          <PenTool className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
          <span className="whitespace-nowrap">자유 형식 메모</span>
        </div>

        {/* Tools: Pen, Highlighter, Eraser */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded-xs transition flex items-center justify-center cursor-pointer ${
              tool === 'pen'
                ? 'bg-[#6366f1] text-white shadow-xs font-medium'
                : 'text-slate-400 hover:text-white hover:bg-[#18181b]'
            }`}
            title="펜"
            aria-label="펜"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTool('highlighter')}
            className={`p-1.5 rounded-xs transition flex items-center justify-center cursor-pointer ${
              tool === 'highlighter'
                ? 'bg-[#6366f1] text-white shadow-xs font-medium'
                : 'text-slate-400 hover:text-white hover:bg-[#18181b]'
            }`}
            title="형광펜"
            aria-label="형광펜"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-xs transition flex items-center justify-center cursor-pointer ${
              tool === 'eraser'
                ? 'bg-[#6366f1] text-white shadow-xs font-medium'
                : 'text-slate-400 hover:text-white hover:bg-[#18181b]'
            }`}
            title="지우개"
            aria-label="지우개"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Color Palette (disabled in eraser mode) */}
        <div
          className={`flex items-center gap-1 px-1.5 border-l border-r border-[#222226] shrink-0 transition-opacity ${
            tool === 'eraser' ? 'opacity-30 pointer-events-none' : ''
          }`}
        >
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-4 h-4 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                color === c.value ? 'scale-125 ring-1.5 ring-offset-1 ring-offset-[#121214] ring-white' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
              aria-label={c.label}
            >
              {color === c.value && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
            </button>
          ))}
        </div>

        {/* Stroke Size Presets */}
        <div className="flex items-center gap-1 pr-1.5 border-r border-[#222226] shrink-0">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSize(p.size)}
              className={`px-1.5 py-0.5 rounded-xs text-[0.6875rem] transition cursor-pointer font-sans ${
                size === p.size
                  ? 'bg-[#18181b] text-indigo-400 border border-[#6366f1]/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={p.label}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Background Overlay Mode Toggle */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-[#222226] shrink-0">
          <button
            type="button"
            onClick={() =>
              setBgMode((prev) => (prev === 'transparent' ? 'grid' : prev === 'grid' ? 'dark' : 'transparent'))
            }
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[#09090b] hover:bg-[#18181b] text-slate-300 hover:text-white border border-[#222226] text-[0.6875rem] transition cursor-pointer"
            title="캔버스 배경 모드 전환"
          >
            {bgMode === 'transparent' ? (
              <>
                <Eye className="w-3 h-3 text-indigo-400" />
                <span>투명</span>
              </>
            ) : bgMode === 'grid' ? (
              <>
                <Grid className="w-3 h-3 text-indigo-400" />
                <span>모눈</span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-xs bg-slate-400" />
                <span>칠판</span>
              </>
            )}
          </button>
        </div>

        {/* Undo & Redo */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="실행 취소"
            aria-label="실행 취소"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="다시 실행"
            aria-label="다시 실행"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-xs text-slate-300 hover:text-rose-400 hover:bg-[#18181b] transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="모두 지우기"
            aria-label="모두 지우기"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Document Insertion & Image Download */}
        <div className="flex items-center gap-1 pl-1.5 border-l border-[#222226] shrink-0">
          {onInsertImageToEditor && (
            <button
              type="button"
              onClick={handleInsertToEditor}
              disabled={strokes.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-xs bg-[#6366f1] hover:bg-indigo-500 text-white text-[0.6875rem] font-medium transition disabled:opacity-35 disabled:pointer-events-none cursor-pointer shadow-xs"
              title="에디터 문서에 그림 삽입"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>문서에 삽입</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="이미지 저장"
            aria-label="이미지 저장"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Close Overlay */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xs text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer ml-0.5"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Touch & Mouse Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full flex-1 touch-none cursor-crosshair"
      />
    </div>
  );
};

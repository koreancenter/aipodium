import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Folder,
  Sparkles,
  Save,
  Check,
  RotateCcw,
  Eye,
  Edit3,
  Columns,
  Type,
  Bold,
  Italic,
  List,
  CheckSquare,
  Quote,
  Minus,
  Star,
  ArrowLeft,
  FileSpreadsheet,
  Code
} from 'lucide-react';
import { VibeCanvasConfig } from './SSOTGeneratorModal';
import { InlineSpreadsheetBlock, SpreadsheetData } from './InlineSpreadsheetBlock';
import { InlineContextMenu } from './InlineContextMenu';

export interface VibeCanvasWorkspaceProps {
  config: VibeCanvasConfig;
  initialContent?: string;
  fileName: string;
  targetFolder: string;
  onSaveToProjectFolder: (savedContent: string, fileName: string, folder: string) => void;
  onExit: () => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  renderMarkdownToHtml: (md: string) => string;
  isGeneratingAi?: boolean;
}

interface ParsedDocumentSegment {
  type: 'markdown' | 'spreadsheet';
  content: string;
  spreadsheetData?: SpreadsheetData;
  blockIndex: number;
  rawStart?: number;
  rawEnd?: number;
}

export const VibeCanvasWorkspace: React.FC<VibeCanvasWorkspaceProps> = ({
  config,
  initialContent = '',
  fileName,
  targetFolder,
  onSaveToProjectFolder,
  onExit,
  onToast,
  renderMarkdownToHtml,
  isGeneratingAi = false
}) => {
  const [content, setContent] = useState<string>(
    initialContent ||
      `# ${fileName.replace(/\.md$/i, '')} (SSOT 마스터 문서)\n\n## 1. 개요 및 비전\n본 문서는 프로젝트의 단일 진실 공급원(SSOT)으로 기능하는 Smart Document Canvas입니다. 워드프로세서의 서술형 문서와 스프레드시트의 수식/데이터 연산 기능이 완벽히 통합되어 있습니다.\n\n## 2. 2024-2030 성장 지표 및 재무 추이 분석\n아래의 스프레드시트 블록은 인라인으로 직접 셀을 수정하거나 수식(=SUM, =AVG)을 입력할 수 있으며, 실시간 차트가 연동됩니다.\n\n\`\`\`spreadsheet\n{\n  "title": "2024-2030 연도별 매출 및 영업이익 추이",\n  "columns": ["구분", "2024 실적", "2025 전망", "2027 (E)", "2030 (E)", "성장률(%)"],\n  "rows": [\n    ["매출액 (억원)", 120, 185, 450, 1200, "=E1/B1*100"],\n    ["영업이익 (억원)", 18, 32, 95, 310, "=E2/B2*100"],\n    ["R&D 투자 (억원)", 25, 40, 90, 220, "=E3/B3*100"],\n    ["고객사 수 (개)", 45, 80, 210, 650, "=E4/B4*100"]\n  ],\n  "showChart": true,\n  "chartType": "bar"\n}\n\`\`\`\n\n## 3. 핵심 추진 전략 및 마일스톤\n- [x] AI Podium Smart Document Engine 통합 완료\n- [ ] 2025 하반기 엔터프라이즈 멀티모달 파이프라인 출시\n- [ ] 2030 글로벌 시장 점유율 25% 달성\n\n> **안내:** 텍스트를 마우스로 드래그하고 **Alt + V**를 누르면 AI 바이브 프롬프트를 통해 즉시 요약하거나 2030년 추이 분석을 실행할 수 있습니다.\n`
  );

  const [currentFileName, setCurrentFileName] = useState<string>(fileName);
  const [editorMode, setEditorMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [pageWidth, setPageWidth] = useState<'standard' | 'wide' | 'full'>('standard');
  const [canvasTheme, setCanvasTheme] = useState<'paper' | 'dark'>('paper');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string>('');

  // Selection & Vibe Modal state
  const [selectedText, setSelectedText] = useState<string>('');
  const [isVibeModalOpen, setIsVibeModalOpen] = useState<boolean>(false);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  // Slash commands state
  const [showSlashMenu, setShowSlashMenu] = useState<boolean>(false);
  const [slashQuery, setSlashQuery] = useState<string>('');
  const [slashMenuIndex, setSlashMenuIndex] = useState<number>(0);
  const slashItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll slash command into view
  useEffect(() => {
    if (showSlashMenu && slashItemRefs.current[slashMenuIndex]) {
      slashItemRefs.current[slashMenuIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto'
      });
    }
  }, [slashMenuIndex, showSlashMenu]);

  useEffect(() => {
    setSlashMenuIndex(0);
  }, [slashQuery]);

  // Auto-save detection
  useEffect(() => {
    setIsSaved(false);
  }, [content, currentFileName]);

  const handleSave = useCallback(() => {
    onSaveToProjectFolder(content, currentFileName, targetFolder);
    setIsSaved(true);
    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTimestamp(now);
    onToast(`⭐ '${currentFileName}' 문서가 '${targetFolder}' 폴더에 SSOT로 확정 저장되었습니다!`, 'success');
  }, [content, currentFileName, targetFolder, onSaveToProjectFolder, onToast]);

  // Global Keyboard shortcuts: Ctrl+S (Save), Alt+V (Vibe Prompt)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        // Capture active selection if textarea has focus
        if (textareaRef.current) {
          const el = textareaRef.current;
          const sel = el.value.substring(el.selectionStart, el.selectionEnd);
          if (sel.trim()) setSelectedText(sel.trim());
        }
        setIsVibeModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Handle Mouse Selection in Textarea or Preview to show Floating Vibe Badge
  const handleTextareaSelect = () => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value.substring(start, end);
    if (text.trim().length > 3) {
      setSelectedText(text.trim());
      // Show floating badge near top of textarea
      setSelectionPosition({ x: 20, y: 40 });
      setIsVibeModalOpen(true);
    } else {
      setSelectionPosition(null);
    }
  };

  // Insert syntax into textarea
  const insertSyntax = (before: string, after: string = '', defaultPlaceholder: string = '') => {
    if (!textareaRef.current) {
      setContent((prev) => prev + `\n${before}${defaultPlaceholder}${after}\n`);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selText = el.value.substring(start, end) || defaultPlaceholder;
    const replacement = `${before}${selText}${after}`;

    const newFullText = el.value.substring(0, start) + replacement + el.value.substring(end);
    setContent(newFullText);

    setTimeout(() => {
      el.focus();
      const newPos = start + before.length + selText.length;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Insert Interactive Spreadsheet Block
  const handleInsertSpreadsheetBlock = (
    title: string = '2024-2030 연도별 지표 및 추이 분석',
    customData?: Partial<SpreadsheetData>
  ) => {
    const defaultData: SpreadsheetData = {
      title,
      columns: ['구분', '2024 실적', '2025 전망', '2027 (E)', '2030 (E)', '성장률(%)'],
      rows: [
        ['매출액 (억원)', 120, 185, 450, 1200, '=E1/B1*100'],
        ['영업이익 (억원)', 18, 32, 95, 310, '=E2/B2*100'],
        ['순이익 (억원)', 12, 22, 70, 240, '=E3/B3*100'],
        ['합계', '=SUM(B1:B3)', '=SUM(C1:C3)', '=SUM(D1:D3)', '=SUM(E1:E3)', '']
      ],
      showChart: true,
      chartType: 'bar',
      ...customData
    };

    const blockJson = JSON.stringify(defaultData, null, 2);
    const blockMd = `\n\`\`\`spreadsheet\n${blockJson}\n\`\`\`\n`;
    insertSyntax(blockMd, '', '');
    onToast('📊 스마트 인터랙티브 스프레드시트 블록이 삽입되었습니다!', 'success');
  };

  // Convert existing Markdown Tables into Spreadsheet Blocks
  const handleConvertMarkdownTablesToSheets = () => {
    const tableRegex = /\n\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    let matchCount = 0;
    const newContent = content.replace(tableRegex, (_match, headerLine, rowsBlock) => {
      matchCount++;
      const columns = headerLine.split('|').map((c: string) => c.trim()).filter(Boolean);
      const rows = rowsBlock
        .trim()
        .split('\n')
        .map((r: string) => {
          return r
            .split('|')
            .map((c: string) => {
              const val = c.trim();
              const num = Number(val);
              return !isNaN(num) && val !== '' ? num : val;
            })
            .filter((_, idx, arr) => idx > 0 && idx < arr.length);
        });

      const sheetData: SpreadsheetData = {
        title: `스마트 변환 데이터 시트 ${matchCount}`,
        columns,
        rows,
        showChart: true,
        chartType: 'bar'
      };

      return `\n\`\`\`spreadsheet\n${JSON.stringify(sheetData, null, 2)}\n\`\`\`\n`;
    });

    if (matchCount > 0) {
      setContent(newContent);
      onToast(`🎉 ${matchCount}개의 마크다운 표가 수식/차트 지원 스마트 스프레드시트로 변환되었습니다!`, 'success');
    } else {
      onToast('변환할 일반 마크다운 표가 발견되지 않았습니다. /sheet로 새 시트를 삽입해 보세요.', 'info');
    }
  };

  // Parse Document into mixed segments (Markdown text + Embedded Spreadsheet blocks)
  const parsedSegments = useMemo<ParsedDocumentSegment[]>(() => {
    const segments: ParsedDocumentSegment[] = [];
    const regex = /```(?:spreadsheet|sheet)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let blockIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'markdown',
          content: content.substring(lastIndex, match.index),
          blockIndex: blockIndex++
        });
      }

      let parsedSheet: SpreadsheetData | null = null;
      try {
        parsedSheet = JSON.parse(match[1]);
      } catch {
        parsedSheet = null;
      }

      if (parsedSheet) {
        segments.push({
          type: 'spreadsheet',
          content: match[1],
          spreadsheetData: parsedSheet,
          blockIndex: blockIndex++,
          rawStart: match.index,
          rawEnd: regex.lastIndex
        });
      } else {
        segments.push({
          type: 'markdown',
          content: match[0],
          blockIndex: blockIndex++
        });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      segments.push({
        type: 'markdown',
        content: content.substring(lastIndex),
        blockIndex: blockIndex++
      });
    }

    return segments;
  }, [content]);

  // Update specific spreadsheet block when user edits cells inside the interactive block
  const handleUpdateSpreadsheetBlock = (blockIdx: number, newData: SpreadsheetData) => {
    let currentMatchCount = 0;
    const regex = /```(?:spreadsheet|sheet)\n([\s\S]*?)```/g;

    const newFullContent = content.replace(regex, (fullMatch, jsonStr) => {
      try {
        JSON.parse(jsonStr);
        if (currentMatchCount === blockIdx) {
          currentMatchCount++;
          return `\`\`\`spreadsheet\n${JSON.stringify(newData, null, 2)}\n\`\`\``;
        }
      } catch {
        // ignore
      }
      currentMatchCount++;
      return fullMatch;
    });

    setContent(newFullContent);
  };

  // Apply Vibe AI Result to the document
  const handleApplyVibeResult = (
    resultSnippet: string,
    mode: 'replace' | 'insertBelow' | 'fullReplace'
  ) => {
    if (mode === 'fullReplace') {
      setContent(resultSnippet);
      return;
    }

    if (mode === 'replace' && selectedText) {
      setContent((prev) => prev.replace(selectedText, resultSnippet));
    } else if (mode === 'insertBelow' && selectedText) {
      setContent((prev) => prev.replace(selectedText, `${selectedText}\n\n${resultSnippet}`));
    } else {
      setContent((prev) => `${prev}\n\n${resultSnippet}\n`);
    }
  };

  // Slash commands definitions
  const SLASH_COMMANDS = [
    {
      cmd: '/sheet',
      label: '📊 스마트 스프레드시트 블록',
      desc: '수식(=SUM, =AVG), 실시간 차트가 내장된 대화형 시트 삽입',
      action: () => handleInsertSpreadsheetBlock('2024-2030 분기별 실적 및 추이 분석')
    },
    {
      cmd: '/vibe',
      label: '✨ Vibe AI 프롬프트 실행',
      desc: '블록을 지정하고 원하는 바이브("요약해 줘", "2030 추이 분석") 지시 (Alt+V)',
      action: () => setIsVibeModalOpen(true)
    },
    {
      cmd: '/forecast',
      label: '📈 2030년 추이 분석 및 예측 시트',
      desc: '2024~2030년 연평균 성장률(CAGR)과 예측 모델 시트 생성',
      action: () =>
        handleInsertSpreadsheetBlock('2024-2030 중장기 추이 분석 및 예측 모델', {
          columns: ['핵심 지표', '2024', '2026 (E)', '2028 (E)', '2030 (E)', 'CAGR(%)'],
          rows: [
            ['글로벌 시장 규모(억원)', 5000, 7800, 13000, 24000, '=E1/B1*100'],
            ['당사 예상 점유율(%)', 2.4, 5.8, 12.5, 25.0, '=E2/B2*100'],
            ['목표 매출액(억원)', 120, 450, 1625, 6000, '=E3/B3*100'],
            ['예상 영업이익률(%)', 15.0, 21.0, 28.0, 35.0, '']
          ],
          chartType: 'line'
        })
    },
    {
      cmd: '/table',
      label: '📋 기본 마크다운 데이터 표',
      desc: '일반 텍스트 기반 3열 마크다운 테이블 삽입',
      action: () => insertSyntax('| 구분 | 항목명 | 설명 | 비고 |\n|---|---|---|---|\n| 01 | 주요 기능 | 상세 내용 기술 | 완료 |\n', '', '')
    },
    {
      cmd: '/callout',
      label: '💡 중요 안내 콜아웃 박스',
      desc: '강조 및 주요 공지용 인용 블록 삽입',
      action: () => insertSyntax('> **중요 공지:** ', '\n', '여기에 핵심 공지 내용을 입력하세요.')
    },
    {
      cmd: '/todo',
      label: '☑️ 마일스톤 체크리스트',
      desc: '진행 현황 파악을 위한 할 일 체크리스트 삽입',
      action: () => insertSyntax('- [ ] ', '\n- [ ] 다음 마일스톤\n', '1단계 개발 및 검증')
    },
    {
      cmd: '/h1',
      label: 'H1 대제목',
      desc: '문서의 주요 챕터 대제목 (# 제목)',
      action: () => insertSyntax('# ', '\n', '새 섹션 제목')
    },
    {
      cmd: '/h2',
      label: 'H2 중제목',
      desc: '하위 서브 섹션 제목 (## 소제목)',
      action: () => insertSyntax('## ', '\n', '하위 상세 항목')
    }
  ];

  const filteredSlashCommands = SLASH_COMMANDS.filter((c) =>
    c.cmd.toLowerCase().includes(slashQuery.toLowerCase()) ||
    c.label.toLowerCase().includes(slashQuery.toLowerCase())
  );

  const getWidthClass = () => {
    if (pageWidth === 'standard') return 'max-w-4xl';
    if (pageWidth === 'wide') return 'max-w-6xl';
    return 'max-w-full';
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950 text-slate-100 overflow-hidden relative select-none">
      
      {/* 1. TOP VIBE CANVAS MASTER HEADER & SSOT TOOLBAR */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20 shadow-md">
        
        {/* Left: Branding, Title, Folder & SSOT Status */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onExit}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1 text-xs shrink-0"
            title="일반 3패널 에디터로 복귀"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">에디터 복귀</span>
          </button>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Vibe Canvas Logo Badge (Word + Spreadsheet Unified) */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gradient-to-r from-indigo-950 to-violet-950 border border-indigo-500/60 text-indigo-200 text-xs font-bold shrink-0 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Vibe Canvas</span>
            <span className="text-[0.625rem] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-mono font-semibold">
              Word + Sheet
            </span>
          </div>

          {/* Editable Document Title */}
          <div className="relative flex items-center min-w-0 max-w-[240px] sm:max-w-[320px]">
            <input
              type="text"
              value={currentFileName}
              onChange={(e) => setCurrentFileName(e.target.value)}
              placeholder="SSOT 파일명..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none transition truncate"
              title="SSOT 문서 파일명 수정"
            />
          </div>

          {/* Target Project Folder Pill */}
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 text-[0.6875rem] font-mono shrink-0">
            <Folder className="w-3 h-3 text-amber-400" />
            <span>{targetFolder}</span>
          </div>

          {/* Status Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 text-[0.6875rem] font-medium shrink-0">
            {isSaved ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80 font-mono">
                <Check className="w-3 h-3" />
                <span>SSOT 확정됨 ({lastSavedTimestamp})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80 font-mono animate-pulse">
                <Star className="w-3 h-3 text-amber-400" />
                <span>SSOT 작성 중...</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: View mode, Vibe prompt button, Width, Theme & Primary Save */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Global Vibe AI Prompt Launch Button (Alt+V) */}
          <button
            type="button"
            onClick={() => {
              if (textareaRef.current) {
                const el = textareaRef.current;
                const sel = el.value.substring(el.selectionStart, el.selectionEnd);
                if (sel.trim()) setSelectedText(sel.trim());
              }
              setIsVibeModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 via-indigo-600 to-violet-600 hover:from-amber-500 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 transition cursor-pointer"
            title="문서 블럭 또는 전체를 AI 바이브 프롬프트로 편집 (Alt + V)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Vibe AI 편집</span>
            <span className="hidden sm:inline text-[0.625rem] bg-black/30 px-1 rounded font-mono">Alt+V</span>
          </button>

          {/* View Mode Tabs (Edit / Split / Preview) */}
          <div className="flex bg-slate-950 border border-slate-800 rounded p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setEditorMode('edit')}
              className={`p-1 px-2 rounded transition flex items-center gap-1 text-xs ${
                editorMode === 'edit'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="코드/마크다운 원본 편집기"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">작성</span>
            </button>

            <button
              type="button"
              onClick={() => setEditorMode('split')}
              className={`p-1 px-2 rounded transition flex items-center gap-1 text-xs ${
                editorMode === 'split'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="분할 보기 (워드 + 인터랙티브 스프레드시트 실시간 렌더링)"
            >
              <Columns className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">분할 뷰</span>
            </button>

            <button
              type="button"
              onClick={() => setEditorMode('preview')}
              className={`p-1 px-2 rounded transition flex items-center gap-1 text-xs ${
                editorMode === 'preview'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="완성된 스마트 문서 프리뷰 모드"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">문서 뷰</span>
            </button>
          </div>

          {/* Canvas Page Width Selector */}
          <div className="hidden sm:flex bg-slate-950 border border-slate-800 rounded p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPageWidth('standard')}
              className={`px-1.5 py-0.5 rounded text-[0.6875rem] font-mono transition ${
                pageWidth === 'standard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="A4 표준 용지 너비 (820px)"
            >
              A4
            </button>
            <button
              type="button"
              onClick={() => setPageWidth('wide')}
              className={`px-1.5 py-0.5 rounded text-[0.6875rem] font-mono transition ${
                pageWidth === 'wide' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="와이드 너비 (1080px)"
            >
              와이드
            </button>
            <button
              type="button"
              onClick={() => setPageWidth('full')}
              className={`px-1.5 py-0.5 rounded text-[0.6875rem] font-mono transition ${
                pageWidth === 'full' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="전체 화면 너비 (100%)"
            >
              전체
            </button>
          </div>

          {/* Canvas Theme Toggle (Paper vs Studio Dark) */}
          <button
            type="button"
            onClick={() => setCanvasTheme(canvasTheme === 'paper' ? 'dark' : 'paper')}
            className={`px-2 py-1 rounded text-xs border transition flex items-center gap-1 font-medium ${
              canvasTheme === 'paper'
                ? 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-white'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="용지 뷰 테마 변경 (워드프로세서 백색 용지 / 다크 스튜디오)"
          >
            <span>{canvasTheme === 'paper' ? '📄 용지 모드' : '🌙 다크 모드'}</span>
          </button>

          {/* Primary Action Button: Save & Finalize SSOT */}
          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg font-semibold text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer group shrink-0"
            title="현재 작성된 문서를 프로젝트 폴더에 SSOT 마스터로 확정 저장 (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-amber-300" />
            <span>SSOT 저장 및 확정</span>
          </button>
        </div>
      </div>

      {/* 2. SUB FORMATTING TOOLBAR & SMART SPREADSHEET SHORTCUTS */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-3 py-1 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none shrink-0 z-10">
        
        {/* Word + Sheet compound tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* Smart Sheet Insert Button */}
          <button
            type="button"
            onClick={() => handleInsertSpreadsheetBlock('2024-2030 분기별 실적 및 추이 분석')}
            className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-700/80 transition flex items-center gap-1 font-semibold text-xs shadow-xs"
            title="수식 및 차트가 내장된 스마트 스프레드시트 블록 삽입 (/sheet)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>스마트 시트 삽입 (/sheet)</span>
          </button>

          {/* Convert Markdown Tables to Smart Sheets */}
          <button
            type="button"
            onClick={handleConvertMarkdownTablesToSheets}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 transition flex items-center gap-1 text-xs"
            title="문서 내 모든 마크다운 표를 수식/차트 지원 스마트 스프레드시트로 자동 변환"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">표 ➔ 스마트 시트 변환</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Heading buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 text-xs text-slate-300 divide-x divide-slate-800">
            <button
              type="button"
              onClick={() => insertSyntax('# ', '', '제목 1')}
              className="px-1.5 py-0.5 hover:bg-slate-800 hover:text-white font-bold transition"
              title="Heading 1 (# 제목)"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('## ', '', '제목 2')}
              className="px-1.5 py-0.5 hover:bg-slate-800 hover:text-white font-bold transition"
              title="Heading 2 (## 소제목)"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('### ', '', '제목 3')}
              className="px-1.5 py-0.5 hover:bg-slate-800 hover:text-white font-bold transition"
              title="Heading 3 (### 상세 항목)"
            >
              H3
            </button>
          </div>

          {/* Basic text styling */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => insertSyntax('**', '**', '강조 텍스트')}
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition"
              title="굵게 (Bold **텍스트**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('*', '*', '기울임 텍스트')}
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition"
              title="기울임 (Italic *텍스트*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('- ', '', '목록 항목')}
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition"
              title="글머리 기호 목록 (- 항목)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('- [ ] ', '', '할 일 항목')}
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition"
              title="체크리스트 (- [ ] 작업)"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('> **안내:** ', '', '중요 안내 내용')}
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition"
              title="콜아웃/인용문 (> 인용문)"
            >
              <Quote className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => insertSyntax('\n---\n', '', '')}
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition"
              title="가로 구분선 (---)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live stats & shortcut tip */}
        <div className="flex items-center gap-2 text-[0.6875rem] text-slate-400 font-mono">
          <span>줄: {content.split('\n').length}</span>
          <span>|</span>
          <span>글자: {content.length}</span>
          <span>|</span>
          <span className="text-amber-300 font-bold hidden md:inline">
            ✨ 드래그 후 Alt+V로 AI 바이브 편집
          </span>
        </div>
      </div>

      {/* 3. COMPOUND SMART CANVAS WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative p-3 sm:p-6 bg-slate-950/90 justify-center">
        
        <div className={`w-full ${getWidthClass()} h-full flex flex-col transition-all duration-200 relative`}>
          
          {/* AI Generating Indicator Banner */}
          {isGeneratingAi && (
            <div className="mb-3 px-4 py-2 rounded-lg bg-indigo-950/90 border border-indigo-500/60 flex items-center justify-between text-xs text-indigo-200 animate-pulse shadow-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="font-semibold">AI가 SSOT 자료를 통합 분석하여 스마트 문서를 스트리밍 중입니다...</span>
              </div>
              <span className="text-[0.625rem] font-mono text-indigo-300">Live Streaming</span>
            </div>
          )}

          

          {/* SPLIT VIEW MODE: Left Editor + Right Interactive Word & Sheet Canvas */}
          {editorMode === 'split' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-0">
              
              {/* Left Column: Markdown & Spreadsheet Code Editor */}
              <div className="flex flex-col h-full min-h-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
                <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>마크다운 & 스프레드시트 편집기</span>
                  </div>
                  <span className="text-[0.625rem] text-slate-500 font-mono">/ 입력 시 빠른 명령</span>
                </div>
                
                <div className="flex-1 p-3 overflow-hidden flex flex-col bg-slate-950 relative">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      // Check for slash commands
                      const val = e.target.value;
                      const cursorPos = e.target.selectionStart;
                      const lastLine = val.substring(0, cursorPos).split('\n').pop() || '';
                      if (lastLine.startsWith('/')) {
                        setShowSlashMenu(true);
                        setSlashQuery(lastLine.substring(1));
                      } else {
                        setShowSlashMenu(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (showSlashMenu && filteredSlashCommands.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSlashMenuIndex((prev) => (prev + 1) % filteredSlashCommands.length);
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSlashMenuIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
                          return;
                        }
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();
                          if (filteredSlashCommands[slashMenuIndex]) {
                            setShowSlashMenu(false);
                            filteredSlashCommands[slashMenuIndex].action();
                          }
                          return;
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowSlashMenu(false);
                          return;
                        }
                      }
                    }}
                    onSelect={handleTextareaSelect}
                    placeholder="# Vibe Canvas SSOT 문서를 작성하거나 /sheet 로 스프레드시트를 삽입하세요..."
                    className="w-full h-full bg-transparent text-slate-100 font-mono text-xs leading-[1.6] focus:outline-none resize-none overflow-y-auto"
                    spellCheck="false"
                  />

                  {/* Slash Command Autocomplete Popup Menu */}
                  {showSlashMenu && (
                    <div className="absolute left-4 top-12 z-40 w-72 bg-slate-900 border border-indigo-500/60 rounded-xl shadow-2xl overflow-hidden animate-fade-in text-xs select-none">
                      <div className="px-3 py-1.5 bg-indigo-950/80 border-b border-indigo-800/60 text-[0.6875rem] font-bold text-indigo-300 flex items-center justify-between">
                        <span>빠른 삽입 명령어 (Slash Commands)</span>
                        <span className="text-[0.5625rem] font-mono text-slate-400">↑↓ 이동 · ↵ 선택 · Esc 취소</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-800/40 custom-scrollbar">
                        {filteredSlashCommands.map((cmdItem, idx) => (
                          <button
                            key={cmdItem.cmd}
                            ref={(el) => {
                              slashItemRefs.current[idx] = el;
                            }}
                            type="button"
                            onClick={() => {
                              // Replace the slash query with the command action
                              setShowSlashMenu(false);
                              cmdItem.action();
                            }}
                            onMouseEnter={() => setSlashMenuIndex(idx)}
                            className={`w-full p-2 text-left rounded-lg transition flex flex-col gap-0.5 ${
                              slashMenuIndex === idx
                                ? 'bg-indigo-600 text-white'
                                : 'hover:bg-slate-800 text-slate-200'
                            }`}
                          >
                            <span className="font-semibold">{cmdItem.label}</span>
                            <span className="text-[0.625rem] text-slate-400 line-clamp-1">{cmdItem.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Formatted Smart Document View (Word + Interactive Spreadsheet Blocks) */}
              <div
                className={`flex flex-col h-full min-h-0 border rounded-xl overflow-hidden shadow-2xl transition-colors ${
                  canvasTheme === 'paper'
                    ? 'bg-slate-100 text-slate-900 border-slate-300'
                    : 'bg-slate-900 text-slate-100 border-slate-800'
                }`}
              >
                <div
                  className={`px-3 py-1.5 border-b flex items-center justify-between text-xs font-semibold ${
                    canvasTheme === 'paper'
                      ? 'bg-slate-200/90 text-slate-800 border-slate-300'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-sky-500" />
                    <span>실시간 스마트 캔버스 (Word + Spreadsheet Unified)</span>
                  </div>
                  <span className="text-[0.625rem] opacity-70 font-mono">Live Compound View</span>
                </div>

                {/* Render Mixed Segments */}
                <div className="flex-1 p-6 overflow-y-auto leading-normal select-text markdown-preview prose prose-invert max-w-none">
                  {parsedSegments.map((seg, idx) => {
                    if (seg.type === 'spreadsheet' && seg.spreadsheetData) {
                      return (
                        <InlineSpreadsheetBlock
                          key={idx}
                          initialData={seg.spreadsheetData}
                          isDarkTheme={canvasTheme === 'dark'}
                          onChangeData={(newData) => handleUpdateSpreadsheetBlock(idx, newData)}
                          onVibeAnalyze={(dataToAnalyze, vibePrompt) => {
                            setSelectedText(JSON.stringify(dataToAnalyze, null, 2));
                            setIsVibeModalOpen(true);
                          }}
                        />
                      );
                    }
                    return (
                      <div
                        key={idx}
                        dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(seg.content) }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* EDIT ONLY MODE */}
          {editorMode === 'edit' && (
            <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  <span>Vibe Canvas 풀 편집기 (Full Edit Mode)</span>
                </div>
                <span className="text-[0.6875rem] text-slate-500 font-mono">단축키: Ctrl + S (저장) / Alt + V (바이브)</span>
              </div>
              <div className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col bg-slate-950">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onSelect={handleTextareaSelect}
                  placeholder="# Vibe Canvas SSOT 문서를 작성하세요..."
                  className="w-full h-full bg-transparent text-slate-100 font-mono text-xs sm:text-sm leading-[1.6] focus:outline-none resize-none overflow-y-auto"
                  spellCheck="false"
                />
              </div>
            </div>
          )}

          {/* PREVIEW ONLY (Full Word Document View) */}
          {editorMode === 'preview' && (
            <div className="flex-1 flex justify-center overflow-y-auto h-full min-h-0">
              <div
                className={`w-full ${getWidthClass()} min-h-full rounded-xl shadow-2xl p-6 sm:p-10 leading-normal border transition-colors select-text markdown-preview prose prose-invert max-w-none ${
                  canvasTheme === 'paper'
                    ? 'bg-white text-slate-900 border-slate-200'
                    : 'bg-slate-900 text-slate-100 border-slate-800'
                }`}
              >
                {parsedSegments.map((seg, idx) => {
                  if (seg.type === 'spreadsheet' && seg.spreadsheetData) {
                    return (
                      <InlineSpreadsheetBlock
                        key={idx}
                        initialData={seg.spreadsheetData}
                        isDarkTheme={canvasTheme === 'dark'}
                        readOnly={false}
                        onChangeData={(newData) => handleUpdateSpreadsheetBlock(idx, newData)}
                      />
                    );
                  }
                  return (
                    <div
                      key={idx}
                      dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(seg.content) }}
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 4. GLOBAL IN-PLACE VIBE AI PROMPT MODAL */}
      

    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ChevronDown,
  Check,
  Zap
} from 'lucide-react';

export interface VibeCanvasConfig {
  selectedFolder: string;
  selectedFiles: string[];
  designTone: 'professional' | 'minimal' | 'technical' | string;
  docTitle: string;
  autoGenerateWithAi?: boolean;
  instruction?: string;
  templateDoc?: string;
  model?: string;
  provider?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  desc?: string;
  group: 'cloud' | 'local';
}

export interface SSOTGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolder?: string;
  availableFolders: string[];
  filesByFolder: Record<string, string[]>;
  availableTemplates?: string[];
  onGenerate: (config: VibeCanvasConfig) => void;
  availableModels?: ModelOption[];
  currentModel?: string;
  currentProvider?: string;
}

interface MentionItem {
  id: string;
  label: string;
  tag: string;
  desc: string;
}

const DEFAULT_FALLBACK_MODEL_OPTIONS: ModelOption[] = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', desc: '초고속 종합 및 요약', group: 'cloud' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: '고성능 심층 분석', group: 'cloud' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: '대규모 컨텍스트 분석', group: 'cloud' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: '균형 잡힌 경량 모델', group: 'cloud' },
  { id: 'qwen2.5:7b', name: 'Qwen 2.5 (7B)', desc: '로컬 고성능 모델', group: 'local' },
  { id: 'llama3.2:latest', name: 'Llama 3.2 (3B)', desc: '로컬 경량 모델', group: 'local' }
];

// Clean sanitized helper for filenames without consecutive underscores
const sanitizeFolderName = (name: string): string => {
  if (!name) return '프로젝트_마스터문서';
  const clean = name
    .trim()
    .replace(/[^\w가-힣\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean ? `${clean}_마스터문서` : '프로젝트_마스터문서';
};

export const SSOTGeneratorModal: React.FC<SSOTGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialFolder = '',
  availableFolders,
  filesByFolder,
  availableTemplates,
  onGenerate,
  availableModels,
  currentModel,
  currentProvider
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [docBaseName, setDocBaseName] = useState<string>('프로젝트_마스터문서');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFilePicker, setShowFilePicker] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // AI Model Selection State
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.8-flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);

  // Custom Dropdown Open States (matching Main Menu design)
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState<boolean>(false);
  const folderDropdownRef = useRef<HTMLDivElement | null>(null);

  // Template Dropdown Open State
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState<boolean>(false);
  const templateDropdownRef = useRef<HTMLDivElement | null>(null);

  // Mention State
  const [showMentionPopup, setShowMentionPopup] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionActiveIndex, setMentionActiveIndex] = useState<number>(0);
  const [mentionMatchStart, setMentionMatchStart] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const modelOptions = (availableModels && availableModels.length > 0)
    ? availableModels
    : DEFAULT_FALLBACK_MODEL_OPTIONS;

  // Workspace Markdown Template List
  const allMarkdownTemplates = useMemo(() => {
    if (availableTemplates && availableTemplates.length > 0) {
      return Array.from(new Set(availableTemplates)).sort();
    }
    const set = new Set<string>();
    Object.values(filesByFolder).forEach((list) => {
      list.forEach((f) => {
        if (f.endsWith('.md')) set.add(f);
      });
    });
    return Array.from(set).sort();
  }, [availableTemplates, filesByFolder]);

  // Close custom dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(e.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      const folder = initialFolder || (availableFolders.length > 0 ? availableFolders[0] : 'Main Project');
      setSelectedFolder(folder);
      setSelectedTemplate('');
      setDocBaseName(sanitizeFolderName(folder));

      const files = folder && filesByFolder[folder] ? filesByFolder[folder] : [];
      setSelectedFiles(files);
      setShowFilePicker(false);

      // Default Prompt
      setCustomPrompt('선택된 소스 문서들의 핵심 내용을 종합하여 프로젝트의 명확한 기준이 되는 마스터 문서로 작성해 줘.');

      // Bind initial model: currentModel or active role model or fallback
      const initialModel = currentModel || (modelOptions[0]?.id) || 'gemini-3.8-flash';
      setSelectedModelId(initialModel);

      setIsFolderDropdownOpen(false);
      setIsTemplateDropdownOpen(false);
      setIsModelDropdownOpen(false);
      setShowMentionPopup(false);
    }
  }, [isOpen, initialFolder, availableFolders, filesByFolder, currentModel]);

  // Handle folder change
  const handleFolderChange = (newFolder: string) => {
    setSelectedFolder(newFolder);
    const files = newFolder && filesByFolder[newFolder] ? filesByFolder[newFolder] : [];
    setSelectedFiles(files);
    setDocBaseName(sanitizeFolderName(newFolder));
    setIsFolderDropdownOpen(false);
  };

  const handleToggleFile = (fname: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fname) ? prev.filter((f) => f !== fname) : [...prev, fname]
    );
  };

  const currentFolderFiles = selectedFolder && filesByFolder[selectedFolder] ? filesByFolder[selectedFolder] : [];

  const fileMentions: MentionItem[] = currentFolderFiles.map((f) => ({
    id: f,
    label: f,
    tag: `@${f}`,
    desc: '소스 파일'
  }));

  const filteredMentions = mentionQuery
    ? fileMentions.filter((m) =>
        m.label.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        m.tag.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : fileMentions;

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setCustomPrompt(val);

    const textBeforeCursor = val.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && !/\s/.test(textBeforeCursor.slice(atIndex + 1))) {
      const q = textBeforeCursor.slice(atIndex + 1);
      setMentionQuery(q);
      setMentionMatchStart(atIndex);
      setShowMentionPopup(true);
      setMentionActiveIndex(0);
    } else {
      setShowMentionPopup(false);
    }
  };

  const insertMention = (item: MentionItem) => {
    if (mentionMatchStart === -1 || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const before = customPrompt.slice(0, mentionMatchStart);
    const after = customPrompt.slice(cursor);
    const inserted = `${item.tag} `;
    const updated = before + inserted + after;

    setCustomPrompt(updated);
    setShowMentionPopup(false);

    if (!selectedFiles.includes(item.id)) {
      setSelectedFiles((prev) => [...prev, item.id]);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = before.length + inserted.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionPopup || filteredMentions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionActiveIndex((prev) => (prev + 1) % filteredMentions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionActiveIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredMentions[mentionActiveIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMentionPopup(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFiles = selectedFiles.length > 0 ? selectedFiles : currentFolderFiles;
    const cleanBase = docBaseName.trim().replace(/\.md$/i, '') || '프로젝트_마스터문서';
    const finalTitle = `${cleanBase}.md`;

    const selectedModelObj = modelOptions.find((m) => m.id === selectedModelId);
    const resolvedProvider = selectedModelObj?.group === 'local'
      ? (currentProvider && currentProvider.startsWith('local') ? currentProvider : 'local-pc')
      : 'cloud';

    let finalInstruction = customPrompt.trim();
    if (selectedTemplate && selectedTemplate.trim() !== '') {
      finalInstruction += `\n\n반드시 첨부된 [${selectedTemplate}]의 헤딩 구조, 목차 순서, 표 서식을 엄격히 복제하여 본문을 채우세요.`;
    }

    onGenerate({
      selectedFolder: selectedFolder || 'Main Project',
      selectedFiles: finalFiles,
      designTone: 'professional',
      docTitle: finalTitle,
      autoGenerateWithAi: true,
      instruction: finalInstruction,
      templateDoc: selectedTemplate && selectedTemplate.trim() !== '' ? selectedTemplate : undefined,
      model: selectedModelId,
      provider: resolvedProvider
    });
  };

  if (!isOpen) return null;

  const folderOptions = Array.from(new Set([selectedFolder, ...availableFolders])).filter(Boolean);

  const selectedModelObj = modelOptions.find((m) => m.id === selectedModelId);
  const displayModelLabel = selectedModelObj
    ? `${selectedModelObj.name} (${selectedModelObj.group === 'local' ? '로컬' : '클라우드'})`
    : selectedModelId;

  const cloudModels = modelOptions.filter((m) => m.group === 'cloud');
  const localModels = modelOptions.filter((m) => m.group === 'local');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-sans">
      <div className="relative bg-[#121214] border border-[#222226] rounded-xl max-w-[620px] w-full p-6 shadow-2xl space-y-4 text-slate-200 flex flex-col">
        
        {/* Minimal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-[#18181b] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-0.5 border-b border-[#222226] pb-3">
          <h2 className="text-base font-semibold text-slate-200 tracking-tight">
            기준 문서 생성기
          </h2>
          <p className="text-xs text-slate-400">
            선택한 소스 파일들과 작성 지시사항을 바탕으로 마스터 기준 문서를 생성합니다.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Target Folder and Format Template Grid (1:1 Ratio) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Folder */}
            <div className="space-y-1.5 relative" ref={folderDropdownRef}>
              <div className="flex items-center justify-between h-5">
                <label className="text-xs text-slate-300 font-medium">
                  대상 소스 폴더
                </label>
                {currentFolderFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFilePicker((prev) => !prev)}
                    className="text-[0.6875rem] text-indigo-300 hover:text-indigo-200 font-normal flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{showFilePicker ? '숨기기' : `${selectedFiles.length}/${currentFolderFiles.length}개`}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showFilePicker ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setIsFolderDropdownOpen((prev) => !prev);
                  setIsTemplateDropdownOpen(false);
                }}
                className="w-full h-8 bg-[#09090b] border border-[#222226] rounded-md px-2.5 text-xs text-slate-200 hover:bg-[#18181b] hover:border-[#333338] flex items-center justify-between transition cursor-pointer text-left focus:outline-none focus:border-[#6366f1]"
              >
                <span className="truncate font-sans leading-none">
                  {selectedFolder} ({filesByFolder[selectedFolder]?.length || 0}개 파일)
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isFolderDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu (absolute top-full, isolated from layout flow) */}
              {isFolderDropdownOpen && (
                <div className="absolute top-full left-0 w-full z-50 mt-1 shadow-2xl bg-[#1c1c21] border border-white/[0.12] rounded-xl overflow-hidden max-h-48 overflow-y-auto p-1 text-xs text-slate-200 divide-y divide-[#222226]/50">
                  <div className="space-y-0.5 pb-0.5">
                    {folderOptions.map((f) => {
                      const isCurrent = f === selectedFolder;
                      const count = filesByFolder[f] ? filesByFolder[f].length : 0;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => handleFolderChange(f)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                            isCurrent
                              ? 'bg-white/[0.08] text-white font-medium'
                              : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{f} ({count}개 파일)</span>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Format Baseline Template (Optional) */}
            <div className="space-y-1.5 relative" ref={templateDropdownRef}>
              <div className="flex items-center justify-between h-5">
                <label className="text-xs text-slate-300 font-medium">
                  포맷 기준 템플릿 (선택)
                </label>
                {selectedTemplate && (
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('')}
                    className="text-[0.6875rem] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    해제
                  </button>
                )}
              </div>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setIsTemplateDropdownOpen((prev) => !prev);
                  setIsFolderDropdownOpen(false);
                }}
                className="w-full h-8 bg-[#09090b] border border-[#222226] rounded-md px-2.5 text-xs text-slate-200 hover:bg-[#18181b] hover:border-[#333338] flex items-center justify-between transition cursor-pointer text-left focus:outline-none focus:border-[#6366f1]"
              >
                <span className="truncate font-sans leading-none">
                  {selectedTemplate ? selectedTemplate : '템플릿 없음 (기본 요약 양식)'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu (absolute top-full, isolated from layout flow) */}
              {isTemplateDropdownOpen && (
                <div className="absolute top-full left-0 w-full z-50 mt-1 shadow-2xl bg-[#1c1c21] border border-white/[0.12] rounded-xl overflow-hidden max-h-48 overflow-y-auto p-1 text-xs text-slate-200 divide-y divide-[#222226]/50">
                  <div className="space-y-0.5 pb-0.5">
                    {/* Default Option: No Template */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate('');
                        setIsTemplateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                        !selectedTemplate
                          ? 'bg-white/[0.08] text-white font-medium'
                          : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span className="truncate">템플릿 없음 (기본 요약 양식)</span>
                      {!selectedTemplate && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>

                    {/* Workspace Markdown Documents */}
                    {allMarkdownTemplates.map((tpl) => {
                      const isSelected = selectedTemplate === tpl;
                      return (
                        <button
                          key={tpl}
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(tpl);
                            setIsTemplateDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-white/[0.08] text-white font-medium'
                              : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <span className="truncate font-mono">{tpl}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Filename - Full Width Single Row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between h-5">
              <label className="text-xs text-slate-300 font-medium">
                저장 파일명
              </label>
            </div>
            <div className="flex items-center w-full h-8 bg-[#09090b] border border-[#222226] rounded-md overflow-hidden focus-within:border-[#6366f1] transition">
              <input
                type="text"
                value={docBaseName}
                onChange={(e) => setDocBaseName(e.target.value.replace(/\.md$/i, ''))}
                placeholder="프로젝트_마스터문서"
                className="flex-1 h-full bg-transparent px-2.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none min-w-0"
              />
              <span className="h-full bg-[#121214] border-l border-[#222226] px-2 flex items-center text-xs text-slate-400 font-mono select-none shrink-0">
                .md
              </span>
            </div>
          </div>

          {/* Collapsible Detailed File Picker */}
          {showFilePicker && currentFolderFiles.length > 0 && (
            <div className="bg-[#09090b] border border-[#222226] rounded-md p-2.5 space-y-1.5 max-h-28 overflow-y-auto">
              <div className="text-[0.6875rem] text-slate-400 font-normal px-0.5">
                포함할 소스 파일 선택:
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {currentFolderFiles.map((file) => {
                  const isChecked = selectedFiles.includes(file);
                  return (
                    <label
                      key={file}
                      className={`flex items-center gap-1.5 p-1.5 rounded-md text-[0.6875rem] border cursor-pointer transition ${
                        isChecked
                          ? 'border-[#6366f1] bg-[#6366f1]/20 text-white'
                          : 'border-[#222226] bg-[#0c0c0e] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFile(file)}
                        className="rounded-sm border-[#222226] bg-[#09090b] text-[#6366f1] focus:ring-0 w-3 h-3"
                      />
                      <span className="truncate font-mono">{file}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt & Instructions */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300 font-medium">
                작성 지시사항 및 프롬프트
              </label>
              <span className="text-[0.6875rem] bg-[#09090b] text-indigo-300 border border-[#222226] px-1.5 py-0.5 rounded-sm font-mono select-none">
                @ 멘션 태그 지원
              </span>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={customPrompt}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                rows={5}
                placeholder="폴더 내 파일들을 바탕으로 어떤 마스터 문서를 만들지 지시사항을 입력하세요. (@를 누르면 소스 파일을 빠르게 호출할 수 있습니다.)"
                className="w-full bg-[#09090b] border border-[#222226] rounded-md p-3 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#6366f1] transition resize-none leading-relaxed min-h-[120px]"
              />

              {/* Interactive @ Mention Dropdown */}
              {showMentionPopup && filteredMentions.length > 0 && (
                <div className="absolute left-0 bottom-full mb-1 w-full bg-[#121214] border border-[#222226] rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 p-1 divide-y divide-[#222226]">
                  <div className="px-2.5 py-1.5 text-xs font-medium text-slate-400 flex items-center justify-between bg-[#09090b] rounded-t-md">
                    <span>멘션 선택 · 방향키 탐색 및 엔터 삽입</span>
                    <span className="text-xs text-indigo-400 font-mono">@{mentionQuery}</span>
                  </div>
                  <div className="py-1 space-y-0.5">
                    {filteredMentions.map((item, idx) => {
                      const isActive = idx === mentionActiveIndex;
                      return (
                        <div
                          key={`file_${item.id}`}
                          onClick={() => insertMention(item)}
                          className={`px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-between transition ${
                            isActive
                              ? 'bg-[#6366f1] text-white'
                              : 'hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs font-mono font-medium truncate">
                              {item.tag}
                            </span>
                            <span className="text-[0.6875rem] opacity-70 truncate">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-[0.625rem] opacity-60 ml-2 shrink-0 font-mono">
                            파일
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer with Model Selector & Action Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#222226]">
            {/* Left: Model Selector */}
            <div className="relative" ref={modelDropdownRef}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5 shrink-0 select-none">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                  <span>구동 모델:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen((prev) => !prev)}
                  className="h-8 bg-[#09090b] border border-[#222226] rounded-md px-2.5 text-xs text-slate-200 hover:bg-[#18181b] hover:border-[#333338] flex items-center gap-2 cursor-pointer transition max-w-[260px] focus:outline-none focus:border-[#6366f1]"
                >
                  <span className="truncate font-sans font-medium">
                    {selectedModelObj?.name || selectedModelId}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181b] border border-[#222226] text-slate-400 shrink-0 font-medium">
                    {selectedModelObj?.group === 'local' ? '로컬' : '클라우드'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dropdown Options Popup (absolute, bottom-full so it doesn't push modal height) */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 bottom-full mb-1.5 w-64 max-h-56 overflow-y-auto bg-[#121214] border border-[#222226] rounded-lg shadow-xl p-1 z-50 divide-y divide-[#222226]/50">
                  {cloudModels.length > 0 && (
                    <div className="space-y-0.5 pb-1">
                      <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 select-none">
                        클라우드 모델
                      </div>
                      <div className="space-y-0.5">
                        {cloudModels.map((m) => {
                          const isSelected = selectedModelId === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedModelId(m.id);
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#6366f1]/15 text-[#818cf8] font-medium'
                                  : 'text-slate-300 hover:bg-[#18181b] hover:text-white'
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#6366f1] shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {localModels.length > 0 && (
                    <div className="space-y-0.5 pt-1">
                      <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 select-none">
                        로컬 모델
                      </div>
                      <div className="space-y-0.5">
                        {localModels.map((m) => {
                          const isSelected = selectedModelId === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedModelId(m.id);
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#6366f1]/15 text-[#818cf8] font-medium'
                                  : 'text-slate-300 hover:bg-[#18181b] hover:text-white'
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#6366f1] shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-[#18181b] transition whitespace-nowrap cursor-pointer shrink-0"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white transition shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                title="선택된 소스 문서들을 분석 종합하여 맞춤형 기준 문서를 생성합니다"
              >
                <span>기준 문서 생성</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

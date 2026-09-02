import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Folder,
  FileText,
  Sparkles,
  Briefcase,
  Cpu,
  Clock,
  BookOpen,
  Layers,
  ChevronDown,
  Plus,
  Trash2,
  BookmarkPlus,
  Check,
  Edit2
} from 'lucide-react';

export interface VibeCanvasConfig {
  selectedFolder: string;
  selectedFiles: string[];
  templateFormat: string;
  designTone: 'professional' | 'technical' | 'modern' | 'concise';
  docTitle: string;
  autoGenerateWithAi?: boolean;
  instruction?: string;
}

export interface DocTemplatePreset {
  id: string;
  tag: string;
  name: string;
  shortLabel: string;
  desc: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  structureSnippet: string;
  defaultPrompt: string;
  isCustom?: boolean;
}

export const DOC_TEMPLATES: DocTemplatePreset[] = [
  {
    id: 'master_ssot',
    tag: '@마스터_SSOT',
    name: '통합 마스터 SSOT (Master SSOT)',
    shortLabel: 'Master SSOT',
    desc: '프로젝트 전체를 아우르는 단일 진실 공급원 통합 표준',
    icon: Layers,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    defaultPrompt: '선택된 모든 폴더와 마크다운 파일의 핵심 내용을 통합하여 전체 프로젝트의 기준이 되는 마스터 SSOT 문서로 만들어 줘.',
    structureSnippet: `# 🌟 [프로젝트명] Master SSOT (Single Source of Truth)

> **안내:** 본 문서는 프로젝트의 모든 AI 가공(슬라이드, 시트, 인보이스, 일정)의 기준이 되는 최상위 단일 진실 공급원입니다.

## 1. 프로젝트 비전 및 목표 (Vision & Objectives)

## 2. 시스템 및 비즈니스 구조 (Core Architecture & Structure)

## 3. 핵심 데이터 및 업무 프로세스 (Key Data & Operations)

## 4. 마일스톤 및 릴리즈 현황 (Milestones & Deliverables)
`
  },
  {
    id: 'prd',
    tag: '@기획서_PRD',
    name: '제품 기획서 (PRD)',
    shortLabel: 'PRD',
    desc: '제품 비전, 타겟 사용자, 핵심 기능 명세 및 KPI',
    icon: Briefcase,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    borderColor: 'border-indigo-500/30 hover:border-indigo-500/60',
    defaultPrompt: '선택된 문서들을 종합하여 명확한 비전과 기능 명세를 담은 표준 제품 기획서(PRD) 형태로 정리해 줘.',
    structureSnippet: `# [프로젝트명] 제품 기획서 (PRD)

## 1. 개요 및 배경 (Overview & Background)
- **문서 버전:** 1.0.0 (SSOT)
- **작성일:** {DATE}
- **목표:** 

## 2. 타겟 사용자 및 핵심 가치 (Target Audience & Value Proposition)

## 3. 핵심 기능 요구사항 명세 (Functional Specifications)
| ID | 기능명 | 우선순위 | 상세 설명 | 상태 |
|---|---|---|---|---|
| F-01 | 핵심 기능 | P0 (High) | 설명 작성 | 검토중 |

## 4. 유저 시나리오 및 흐름 (User Flow & Scenarios)

## 5. 성공 지표 및 KPI (Success Metrics & KPIs)
- 활성 사용자 및 전환율 목표

## 6. 마일스톤 및 릴리즈 계획 (Milestones & Release Plan)
`
  },
  {
    id: 'architecture',
    tag: '@기술설계서_Architecture',
    name: '기술 설계서 (Tech Spec)',
    shortLabel: 'Technical Spec',
    desc: '시스템 컴포넌트 구조, 데이터 모델, API 명세 및 보안',
    icon: Cpu,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 hover:bg-sky-500/20',
    borderColor: 'border-sky-500/30 hover:border-sky-500/60',
    defaultPrompt: '선택된 파일의 기술 명세와 구조를 분석하여 일관된 기술 아키텍처 설계서로 작성해 줘.',
    structureSnippet: `# [시스템명] 기술 아키텍처 설계서

## 1. 시스템 아키텍처 개요 (System Architecture)
- **설계 원칙:** High Availability, Loose Coupling, Single Source of Truth (SSOT)

## 2. 모듈 및 컴포넌트 구성 (Module Breakdown)
\`\`\`
[Client Layer] <---> [API Gateway] <---> [Microservices] <---> [Storage/DB]
\`\`\`

## 3. 데이터베이스 및 스키마 명세 (Data Models & Schemas)

## 4. 핵심 API 엔드포인트 명세 (API Endpoints)
- \`POST /api/v1/resource\` : 설명

## 5. 보안, 인증 및 암호화 (Security & Authentication)
- AES-256 / JWT / PBKDF2 암호화 적용

## 6. 배포 및 인프라 파이프라인 (Deployment & Infra)
`
  },
  {
    id: 'minutes',
    tag: '@회의록_Minutes',
    name: '회의록 (Meeting Notes)',
    shortLabel: 'Meeting Notes',
    desc: '회의 개요, 주요 논의 안건, 결정 사항 및 Action Items',
    icon: Clock,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 hover:bg-violet-500/20',
    borderColor: 'border-violet-500/30 hover:border-violet-500/60',
    defaultPrompt: '회의 내용과 논의된 메모들을 정리하여 결정 사항과 액션 아이템이 분명한 회의록으로 만들어 줘.',
    structureSnippet: `# [회의명] 회의록 (Meeting Minutes)

- **일시:** {DATE}
- **참석자:** 
- **회의 목적:** 

## 1. 논의 안건 (Agenda Items)

## 2. 주요 논의 내용 및 결과 (Discussion Details)

## 3. 최종 결정 사항 (Key Decisions Made)
- [x] 결정 항목 1

## 4. 담당자별 실행 과제 (Action Items)
| 담당자 | 실행 항목 (Action Item) | 마감 기한 | 상태 |
|---|---|---|---|
| 담당자A | 작업 내용 | 기한 | 진행중 |
`
  },
  {
    id: 'manual',
    tag: '@제품매뉴얼_Manual',
    name: '사용자 매뉴얼 (User Manual)',
    shortLabel: 'User Manual',
    desc: '제품 개요, 시작 가이드, 기능 상세 가이드 및 FAQ',
    icon: BookOpen,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10 hover:bg-teal-500/20',
    borderColor: 'border-teal-500/30 hover:border-teal-500/60',
    defaultPrompt: '선택된 파일의 기능과 사용법을 누구나 쉽게 따라 할 수 있는 제품 가이드/매뉴얼 형태로 작성해 줘.',
    structureSnippet: `# [제품명] 사용자 및 운영 매뉴얼 (User Manual)

## 1. 제품 소개 및 개요 (Introduction)

## 2. 시작하기 (Quick Start Guide)
1. 설치 및 환경 구성
2. 초기 설정

## 3. 주요 기능 상세 사용법 (Core Feature Walkthrough)

## 4. 자주 묻는 질문 (FAQ & Troubleshooting)
`
  }
];

const TEMPLATES_STORAGE_KEY = 'podium_ssot_templates_v1';

export interface SSOTGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolder?: string;
  initialTemplate?: string;
  availableFolders: string[];
  filesByFolder: Record<string, string[]>;
  onGenerate: (config: VibeCanvasConfig) => void;
}

interface MentionItem {
  id: string;
  label: string;
  tag: string;
  type: 'template' | 'file';
  desc: string;
}

// Clean sanitized helper for filenames without consecutive underscores
const sanitizeFolderName = (name: string): string => {
  if (!name) return 'project_SSOT';
  const clean = name
    .trim()
    .replace(/[^\w가-힣\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean ? `${clean}_SSOT` : 'project_SSOT';
};

export const SSOTGeneratorModal: React.FC<SSOTGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialFolder = '',
  initialTemplate = 'master_ssot',
  availableFolders,
  filesByFolder,
  onGenerate,
}) => {
  // Load templates from localStorage or fallback
  const [templates, setTemplates] = useState<DocTemplatePreset[]>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DOC_TEMPLATES;
  });

  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [templateFormat, setTemplateFormat] = useState<string>('master_ssot');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [docBaseName, setDocBaseName] = useState<string>('project_SSOT');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFilePicker, setShowFilePicker] = useState<boolean>(false);

  // Template Direct CRUD Form states
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [templateNameInput, setTemplateNameInput] = useState<string>('');
  const [templateTagInput, setTemplateTagInput] = useState<string>('');
  const [templateDescInput, setTemplateDescInput] = useState<string>('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Mention State
  const [showMentionPopup, setShowMentionPopup] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionActiveIndex, setMentionActiveIndex] = useState<number>(0);
  const [mentionMatchStart, setMentionMatchStart] = useState<number>(-1);
  
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Save templates to localStorage
  const persistTemplates = (newTemplates: DocTemplatePreset[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(newTemplates));
    } catch (e) {
      console.warn('Failed to save templates to localStorage', e);
    }
  };

  // Sync initial folder and title when modal opens
  useEffect(() => {
    if (isOpen) {
      const folder = initialFolder || (availableFolders.length > 0 ? availableFolders[0] : 'Main Project');
      setSelectedFolder(folder);
      
      // Determine initial template
      const targetTmplId = initialTemplate || 'master_ssot';
      const matched = templates.find((t) => t.id === targetTmplId || t.tag === targetTmplId) || templates[0] || DOC_TEMPLATES[0];
      setTemplateFormat(matched.id);
      
      // Default prompt populated with template's preset
      setCustomPrompt(matched.defaultPrompt || '');
      setDocBaseName(sanitizeFolderName(folder));
      
      const files = folder && filesByFolder[folder] ? filesByFolder[folder] : [];
      setSelectedFiles(files);
      setShowFilePicker(false);
      setShowMentionPopup(false);
      setShowForm(false);
      setIsEditMode(false);
      setSavedSuccessMsg(null);
    }
  }, [isOpen, initialFolder, initialTemplate, availableFolders, filesByFolder, templates]);

  // Update files when folder selection changes
  const handleFolderChange = (newFolder: string) => {
    setSelectedFolder(newFolder);
    const files = newFolder && filesByFolder[newFolder] ? filesByFolder[newFolder] : [];
    setSelectedFiles(files);
    setDocBaseName(sanitizeFolderName(newFolder));
  };

  // Handle template selection change from dropdown -> updates prompt with template preset
  const handleTemplateChange = (tmplId: string) => {
    setTemplateFormat(tmplId);
    const selected = templates.find((t) => t.id === tmplId) || DOC_TEMPLATES.find((t) => t.id === tmplId);
    if (selected) {
      setCustomPrompt(selected.defaultPrompt || selected.structureSnippet || '');
    }
    // Close inline form on template switch if open
    if (showForm) {
      setShowForm(false);
      setIsEditMode(false);
    }
  };

  const handleToggleFile = (fname: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fname) ? prev.filter((f) => f !== fname) : [...prev, fname]
    );
  };

  const activeTemplate = templates.find((t) => t.id === templateFormat) || templates[0] || DOC_TEMPLATES[0];

  // Trigger [+ 추가]
  const handleOpenAddForm = () => {
    if (showForm && !isEditMode) {
      setShowForm(false);
      return;
    }
    setIsEditMode(false);
    setTemplateNameInput('');
    setTemplateTagInput('');
    setTemplateDescInput('');
    setShowForm(true);
  };

  // Trigger [✏️ 수정] - Now enabled for ALL templates
  const handleOpenEditForm = () => {
    if (!activeTemplate) return;
    if (showForm && isEditMode) {
      setShowForm(false);
      setIsEditMode(false);
      return;
    }
    setIsEditMode(true);
    setTemplateNameInput(activeTemplate.name);
    setTemplateTagInput(activeTemplate.tag.replace(/^@/, ''));
    setTemplateDescInput(activeTemplate.desc || '');
    setShowForm(true);
  };

  // Trigger [🗑️ 삭제] - Now enabled for ALL templates
  const handleDeleteActiveTemplate = () => {
    if (!activeTemplate) return;
    const deletedName = activeTemplate.name;
    let updated = templates.filter((t) => t.id !== activeTemplate.id);
    
    // If all templates were deleted, restore DOC_TEMPLATES default
    if (updated.length === 0) {
      updated = DOC_TEMPLATES;
    }

    persistTemplates(updated);
    
    // Reset to first available template
    const fallback = updated[0];
    setTemplateFormat(fallback.id);
    setCustomPrompt(fallback.defaultPrompt || fallback.structureSnippet || '');
    setShowForm(false);
    setIsEditMode(false);

    setSavedSuccessMsg(`'${deletedName}' 템플릿이 삭제되었습니다.`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Save (Create or Edit) Template
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const name = templateNameInput.trim();
    if (!name) return;

    let tag = templateTagInput.trim();
    if (!tag) {
      tag = `@${name.replace(/\s+/g, '_')}`;
    } else if (!tag.startsWith('@')) {
      tag = `@${tag}`;
    }

    if (isEditMode && activeTemplate) {
      // Update existing template (default or custom)
      const updated = templates.map((t) => {
        if (t.id === activeTemplate.id) {
          return {
            ...t,
            name,
            tag,
            shortLabel: name.slice(0, 12),
            desc: templateDescInput.trim() || '수정된 템플릿',
            defaultPrompt: customPrompt.trim() || t.defaultPrompt,
            structureSnippet: customPrompt.trim() || t.structureSnippet
          };
        }
        return t;
      });
      persistTemplates(updated);
      setSavedSuccessMsg(`'${name}' 템플릿이 수정되었습니다.`);
    } else {
      // Create new custom template
      const id = `custom_${Date.now()}`;
      const newTmpl: DocTemplatePreset = {
        id,
        tag,
        name,
        shortLabel: name.slice(0, 12),
        desc: templateDescInput.trim() || '사용자 지정 커스텀 템플릿',
        defaultPrompt: customPrompt.trim() || '선택된 소스 파일들을 기반으로 이 템플릿 양식에 맞춰 작성해 줘.',
        structureSnippet: customPrompt.trim() || `# ${name}\n\n## 1. 개요\n\n## 2. 세부 내용`,
        isCustom: true
      };

      const updated = [...templates, newTmpl];
      persistTemplates(updated);
      setTemplateFormat(id);
      setSavedSuccessMsg(`'${name}' 템플릿이 추가되었습니다.`);
    }

    setTemplateNameInput('');
    setTemplateTagInput('');
    setTemplateDescInput('');
    setShowForm(false);
    setIsEditMode(false);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  const currentFolderFiles = selectedFolder && filesByFolder[selectedFolder] ? filesByFolder[selectedFolder] : [];

  // Mention Items Aggregator (Templates + Current Folder Files)
  const templateMentions: MentionItem[] = templates.map((t) => ({
    id: t.id,
    label: t.name,
    tag: t.tag,
    type: 'template',
    desc: t.desc
  }));

  const fileMentions: MentionItem[] = currentFolderFiles.map((f) => ({
    id: f,
    label: f,
    tag: `@${f}`,
    type: 'file',
    desc: '소스 파일'
  }));

  const allMentions: MentionItem[] = [...templateMentions, ...fileMentions];
  const filteredMentions = mentionQuery
    ? allMentions.filter((m) =>
        m.label.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        m.tag.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        m.desc.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : allMentions;

  // Handle Textarea Change & Mention Detection
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setCustomPrompt(val);

    // Look back from cursor to find @
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
    
    // If user mentioned a template, sync base template format
    if (item.type === 'template') {
      setTemplateFormat(item.id);
    } else if (item.type === 'file') {
      // Ensure file is selected in file list
      if (!selectedFiles.includes(item.id)) {
        setSelectedFiles((prev) => [...prev, item.id]);
      }
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFiles = selectedFiles.length > 0 ? selectedFiles : currentFolderFiles;
    
    // Find matching template tag
    const matched = templates.find((t) => t.id === templateFormat || t.tag === templateFormat) || templates[0] || DOC_TEMPLATES[0];

    // Clean final title with .md extension
    const cleanBase = docBaseName.trim().replace(/\.md$/i, '') || 'project_SSOT';
    const finalTitle = `${cleanBase}.md`;

    onGenerate({
      selectedFolder: selectedFolder || 'Main Project',
      selectedFiles: finalFiles,
      templateFormat: matched.tag,
      designTone: 'professional',
      docTitle: finalTitle,
      autoGenerateWithAi: true,
      instruction: customPrompt.trim() || matched.defaultPrompt
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100 font-sans">
      <div className="relative bg-[#18181b] border border-[#27272a] rounded-lg max-w-[540px] w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 flex flex-col">
        
        {/* Minimal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
          title="닫기 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-1">
          <h2 className="text-base font-normal text-slate-300">SSOT Document Starter</h2>
          <p className="text-xs text-slate-400">
            소스 파일들을 결합하여 단일 진실 공급원(SSOT) 문서를 빌드합니다.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Target Folder / Source Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
                <Folder className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>대상 소스 폴더</span>
              </label>
              {currentFolderFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFilePicker((prev) => !prev)}
                  className="text-xs text-[#38bdf8] hover:underline font-normal flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{showFilePicker ? '파일 숨기기' : `세부 파일 (${selectedFiles.length}/${currentFolderFiles.length})`}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFilePicker ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            <select
              value={selectedFolder}
              onChange={(e) => handleFolderChange(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition cursor-pointer"
            >
              {Array.from(new Set([selectedFolder, ...availableFolders])).filter(Boolean).map((f) => {
                const count = filesByFolder[f] ? filesByFolder[f].length : 0;
                return (
                  <option key={f} value={f} className="bg-[#18181b] text-slate-200">
                    📁 {f} ({count}개 소스)
                  </option>
                );
              })}
            </select>

            {/* Detailed File Picker Accordion */}
            {showFilePicker && currentFolderFiles.length > 0 && (
              <div className="bg-[#27272a]/60 border border-[#3f3f46] rounded p-2.5 space-y-1.5 max-h-28 overflow-y-auto mt-1">
                <div className="text-[0.6875rem] text-slate-400 font-normal px-0.5">
                  포함할 소스 파일 선택:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {currentFolderFiles.map((file) => {
                    const isChecked = selectedFiles.includes(file);
                    return (
                      <label
                        key={file}
                        className={`flex items-center gap-1.5 p-1.5 rounded text-[0.6875rem] border cursor-pointer transition ${
                          isChecked
                            ? 'border-[#38bdf8] bg-[#27272a] text-white'
                            : 'border-[#3f3f46] bg-[#18181b] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleFile(file)}
                          className="rounded border-[#3f3f46] bg-[#18181b] text-[#0284c7] focus:ring-0 w-3 h-3"
                        />
                        <FileText className="w-3 h-3 shrink-0 text-[#38bdf8]" />
                        <span className="truncate font-mono">{file}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Customizable Template System */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
                <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>기본 템플릿 양식</span>
              </label>
              <div className="flex items-center gap-1.5">
                {savedSuccessMsg && (
                  <span className="text-xs text-emerald-400 flex items-center gap-0.5 mr-1">
                    <Check className="w-3 h-3" />
                    {savedSuccessMsg}
                  </span>
                )}
                
                {/* Direct Button 1: [+ 추가] */}
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className={`text-xs px-2 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                    showForm && !isEditMode
                      ? 'bg-[#0284c7] text-white border-[#38bdf8]'
                      : 'bg-[#27272a] text-slate-300 border-[#3f3f46] hover:bg-[#3f3f46]'
                  }`}
                  title="현재 지시사항을 새 템플릿으로 저장"
                >
                  <Plus className="w-3 h-3" />
                  <span>추가</span>
                </button>

                {/* Direct Button 2: [수정] */}
                <button
                  type="button"
                  onClick={handleOpenEditForm}
                  className={`text-xs px-2 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                    showForm && isEditMode
                      ? 'bg-[#0284c7] text-white border-[#38bdf8]'
                      : 'bg-[#27272a] text-slate-300 border-[#3f3f46] hover:bg-[#3f3f46]'
                  }`}
                  title="선택된 템플릿 이름/태그/설명 수정"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>수정</span>
                </button>

                {/* Direct Button 3: [삭제] */}
                <button
                  type="button"
                  onClick={handleDeleteActiveTemplate}
                  className="text-xs px-2 py-0.5 rounded border transition bg-[#27272a] text-slate-300 border-[#3f3f46] hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-800 cursor-pointer flex items-center gap-1"
                  title="선택된 템플릿 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>삭제</span>
                </button>
              </div>
            </div>

            {/* 1-Line Clean Dropdown */}
            <div>
              <select
                value={templateFormat}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition cursor-pointer"
              >
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id} className="bg-[#18181b] text-slate-200">
                    {tmpl.name} — {tmpl.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Inline Form for Add & Edit */}
            {showForm && (
              <div className="bg-[#27272a]/80 border border-[#38bdf8]/50 rounded p-3 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#3f3f46]">
                  <span className="text-xs text-slate-200 font-medium flex items-center gap-1.5">
                    <BookmarkPlus className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>{isEditMode ? `'${activeTemplate.name}' 템플릿 수정` : '새 커스텀 템플릿 등록'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setIsEditMode(false);
                    }}
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] text-slate-400 block">템플릿 이름 *</label>
                    <input
                      type="text"
                      value={templateNameInput}
                      onChange={(e) => setTemplateNameInput(e.target.value)}
                      placeholder="예: API 명세서, 보안 점검표"
                      className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#38bdf8]"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] text-slate-400 block">멘션 태그 (선택)</label>
                    <input
                      type="text"
                      value={templateTagInput}
                      onChange={(e) => setTemplateTagInput(e.target.value)}
                      placeholder="API_Spec"
                      className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#38bdf8] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[0.6875rem] text-slate-400 block">간단 설명</label>
                  <input
                    type="text"
                    value={templateDescInput}
                    onChange={(e) => setTemplateDescInput(e.target.value)}
                    placeholder="템플릿의 용도나 특징을 간략히 적어주세요."
                    className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[0.6875rem] text-slate-400">
                    * 현재 지시사항 내용이 기본 프롬프트로 저장됩니다.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setIsEditMode(false);
                      }}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveForm}
                      disabled={!templateNameInput.trim()}
                      className="px-3 py-1 rounded text-xs font-medium bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-40 text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>{isEditMode ? '수정 완료' : '저장하기'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Priority & Spacious Textarea */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>추가 지시사항 (Custom Prompt)</span>
              </label>
              <kbd className="text-[0.6875rem] bg-[#27272a] text-[#38bdf8] border border-[#3f3f46] px-1.5 py-0.5 rounded font-mono">
                @ 멘션 지원
              </kbd>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={customPrompt}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                rows={5}
                placeholder="적용할 지시사항을 입력하거나, '@'를 눌러 템플릿/문서를 불러올 수 있습니다."
                className="w-full bg-[#18181b] border border-[#3f3f46] rounded p-3 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#38bdf8] transition resize-none leading-relaxed min-h-[120px]"
              />

              {/* Interactive @ Mention Dropdown */}
              {showMentionPopup && filteredMentions.length > 0 && (
                <div className="absolute left-0 bottom-full mb-1 w-full bg-[#18181b] border border-[#3f3f46] rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 p-1 divide-y divide-[#27272a]">
                  <div className="px-2.5 py-1.5 text-xs font-medium text-slate-400 flex items-center justify-between bg-[#27272a]/80 rounded-t">
                    <span>멘션 선택 (↑↓ 탐색, Enter 삽입)</span>
                    <span className="text-xs text-[#38bdf8] font-mono">@{mentionQuery}</span>
                  </div>
                  <div className="py-1 space-y-0.5">
                    {filteredMentions.map((item, idx) => {
                      const isHighlighted = idx === mentionActiveIndex;
                      return (
                        <button
                          key={item.tag + idx}
                          type="button"
                          onClick={() => insertMention(item)}
                          onMouseEnter={() => setMentionActiveIndex(idx)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
                            isHighlighted
                              ? 'bg-[#0284c7] text-white'
                              : 'hover:bg-[#27272a] text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {item.type === 'template' ? (
                              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                            )}
                            <span className="text-xs font-mono font-medium truncate">
                              {item.tag}
                            </span>
                            <span className="text-xs text-slate-400 truncate">
                              ({item.label})
                            </span>
                          </div>
                          <span className="text-[0.6875rem] text-slate-400 shrink-0 ml-2">
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Saved Filename Field */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
              <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>저장 파일명</span>
            </label>
            <div className="flex items-center w-full bg-[#18181b] border border-[#3f3f46] rounded overflow-hidden focus-within:border-[#38bdf8] transition">
              <input
                type="text"
                value={docBaseName}
                onChange={(e) => setDocBaseName(e.target.value.replace(/\.md$/i, ''))}
                placeholder="project_SSOT"
                className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="bg-[#27272a] border-l border-[#3f3f46] px-3 py-2 text-xs text-slate-400 font-mono select-none">
                .md
              </div>
            </div>
          </div>

          {/* 6. Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-[#27272a] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded text-xs font-medium bg-[#0284c7] hover:bg-[#0369a1] text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate SSOT</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
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
  BarChart3,
  ListOrdered
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
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  structureSnippet: string;
  defaultPrompt: string;
}

export const DOC_TEMPLATES: DocTemplatePreset[] = [
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
  },
  {
    id: 'master_ssot',
    tag: '@마스터_SSOT',
    name: '통합 마스터 SSOT',
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
  }
];

export interface SSOTGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolder?: string;
  initialTemplate?: string;
  availableFolders: string[];
  filesByFolder: Record<string, string[]>;
  onGenerate: (config: VibeCanvasConfig) => void;
}

export const SSOTGeneratorModal: React.FC<SSOTGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialFolder = '',
  initialTemplate = 'prd',
  availableFolders,
  filesByFolder,
  onGenerate,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>(initialFolder || availableFolders[0] || '');
  const [templateFormat, setTemplateFormat] = useState<string>(initialTemplate);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('project_SSOT.md');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFilePicker, setShowFilePicker] = useState<boolean>(false);

  // Sync initial folder and title when modal opens
  useEffect(() => {
    if (isOpen) {
      const folder = initialFolder || availableFolders[0] || '';
      setSelectedFolder(folder);
      setTemplateFormat(initialTemplate || 'prd');
      setCustomPrompt('');
      const sanitizedFolder = folder.replace(/[^\w\-_]/g, '_').toLowerCase();
      setDocTitle(sanitizedFolder ? `${sanitizedFolder}_SSOT.md` : 'project_SSOT.md');
      
      const files = folder && filesByFolder[folder] ? filesByFolder[folder] : [];
      setSelectedFiles(files);
      setShowFilePicker(false);
    }
  }, [isOpen, initialFolder, initialTemplate, availableFolders, filesByFolder]);

  // Update files when folder selection changes
  const handleFolderChange = (newFolder: string) => {
    setSelectedFolder(newFolder);
    const files = newFolder && filesByFolder[newFolder] ? filesByFolder[newFolder] : [];
    setSelectedFiles(files);
    const sanitizedFolder = newFolder.replace(/[^\w\-_]/g, '_').toLowerCase();
    setDocTitle(sanitizedFolder ? `${sanitizedFolder}_SSOT.md` : 'project_SSOT.md');
  };

  const handleToggleFile = (fname: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fname) ? prev.filter((f) => f !== fname) : [...prev, fname]
    );
  };

  const currentFolderFiles = selectedFolder && filesByFolder[selectedFolder] ? filesByFolder[selectedFolder] : [];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFiles = selectedFiles.length > 0 ? selectedFiles : currentFolderFiles;
    
    // Find matching template tag
    const matched = DOC_TEMPLATES.find((t) => t.id === templateFormat || t.tag === templateFormat) || DOC_TEMPLATES[0];

    onGenerate({
      selectedFolder: selectedFolder || 'Main Project',
      selectedFiles: finalFiles,
      templateFormat: matched.tag,
      designTone: 'professional',
      docTitle: docTitle.trim() || 'project_SSOT.md',
      autoGenerateWithAi: true,
      instruction: customPrompt.trim() || matched.defaultPrompt
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-[540px] overflow-hidden flex flex-col animate-scale-in">
        
        {/* 1. Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>✨ SSOT 마스터 문서 생성</span>
              </h2>
              <p className="text-[0.6875rem] text-slate-400">
                선택한 소스 파일들을 합성하여 표준 SSOT 캔버스를 구축합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800"
            title="닫기 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-5 space-y-4">
            
            {/* 2. Target Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[0.75rem] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>대상 폴더 / 소스 선택</span>
                </label>
                {currentFolderFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFilePicker((prev) => !prev)}
                    className="text-[0.6875rem] text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                  >
                    {showFilePicker ? '파일 목록 숨기기' : `세부 파일 선택 (${selectedFiles.length}/${currentFolderFiles.length})`}
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedFolder}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium cursor-pointer"
                >
                  {availableFolders.map((f) => {
                    const count = filesByFolder[f] ? filesByFolder[f].length : 0;
                    return (
                      <option key={f} value={f}>
                        📁 {f} ({count}개 파일)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Detailed File Picker Accordion */}
              {showFilePicker && currentFolderFiles.length > 0 && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-1.5 animate-fade-in max-h-32 overflow-y-auto">
                  <div className="text-[0.6875rem] text-slate-400 font-medium px-1">
                    합성에 포함할 파일:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {currentFolderFiles.map((file) => {
                      const isChecked = selectedFiles.includes(file);
                      return (
                        <label
                          key={file}
                          className={`flex items-center gap-2 p-1.5 rounded text-[0.6875rem] border cursor-pointer transition ${
                            isChecked
                              ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleFile(file)}
                            className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 w-3 h-3"
                          />
                          <FileText className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate">{file}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Template Selector */}
            <div className="space-y-1.5">
              <label className="text-[0.75rem] font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>템플릿 양식 선택</span>
              </label>

              {/* Compact Pill / Grid Selector */}
              <div className="grid grid-cols-2 gap-2">
                {DOC_TEMPLATES.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = templateFormat === tmpl.id || templateFormat === tmpl.tag;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setTemplateFormat(tmpl.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 shadow-sm shadow-indigo-500/20 text-white'
                          : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-500'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">
                          {tmpl.shortLabel}
                        </div>
                        <div className="text-[0.625rem] text-slate-500 truncate">
                          {tmpl.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Custom Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-[0.75rem] font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>추가 지시사항 (선택)</span>
                </span>
                <span className="text-[0.625rem] text-slate-500 font-normal">Optional</span>
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                placeholder="강조하고 싶은 특정 기능이나 포맷팅 요구사항을 입력하세요 (예: MVP 1차 범위 명시, 결제 모듈 API 명세 집중)"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* 5. Document Name Field */}
            <div className="space-y-1.5">
              <label className="text-[0.75rem] font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>저장될 파일명</span>
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="project_SSOT.md"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
            </div>

          </div>

          {/* 6. Footer */}
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ SSOT 생성하기</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export interface FileNode {
  name: string;
  content: string;
}

export interface FileTreeFolder {
  name: string;
  files: FileNode[];
  isOpen: boolean;
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  size: string;
  url?: string;
  content?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  model?: string;
  attachments?: ChatAttachment[];
  translatedText?: string;
  originalText?: string;
  ghostWriterLevel?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
    costEstimate?: string;
  };
  groundingSources?: {
    title: string;
    url: string;
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  deletedAt?: string;
  messages: ChatMessage[];
  fileName?: string;
  editorContent?: string;
  editorTab?: 'edit' | 'split' | 'preview';
}

export interface ProjectEvent {
  id: string;
  title: string;
  date: string;
  type: 'milestone' | 'meeting' | 'deadline' | 'task';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  notes?: string;
}

export interface MentionItem {
  id: string;
  type: 'folder' | 'file';
  name: string;
  detail: string;
  folder?: string;
  path?: string;
}

export type GhostWriterLevel = 'off' | '100' | '70' | '50' | '30';

export interface ToastInfo {
  message: string;
  type?: 'success' | 'warn' | 'info' | 'error';
}

export type MenuType = 'file' | 'edit' | 'view' | 'ssot' | 'pdf' | 'settings' | 'ai' | 'window' | 'help' | null;

export interface RecentAiChange {
  file: string;
  source: string;
  timestamp: string;
  preview: string;
}

export interface AiRoleModels {
  chat: string;        // 대화 및 질의
  ghostWriter: string; // 인라인 보조
  architect: string;   // 기획 및 종합
  critic: string;      // 품질 검수 및 감사
}

export const DEFAULT_AI_ROLE_MODELS: AiRoleModels = {
  chat: 'gemini-3.8-flash',
  ghostWriter: 'gemini-3.1-flash-lite',
  architect: 'gemini-3.1-pro-preview',
  critic: 'gemini-3.1-pro-preview'
};

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

export type MenuType = 'file' | 'edit' | 'view' | 'ai' | 'window' | 'help' | null;

export interface RecentAiChange {
  file: string;
  source: string;
  timestamp: string;
  preview: string;
}

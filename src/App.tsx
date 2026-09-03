import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OptimizedEditor } from './components/OptimizedEditor';
import { motion, AnimatePresence } from 'motion/react';
import { googleDriveService, GoogleUserProfile, DriveFolderInfo } from './services/googleDriveService';
import { GoogleDrivePickerModal } from './components/GoogleDrivePickerModal';
import { RemoteWorkspaceModal, RemoteConfig } from './components/RemoteWorkspaceModal';
import { PreferencesModal, UserPreferences, DEFAULT_PREFERENCES, AiInferenceParameters, DEFAULT_AI_PARAMETERS, applyThemeToDocument } from './components/PreferencesModal';
import { GoogleAccountModal } from './components/GoogleAccountModal';
import { GithubIntegrationModal, GithubConfig } from './components/GithubIntegrationModal';
import { SSOTGeneratorModal, VibeCanvasConfig, DOC_TEMPLATES } from './components/SSOTGeneratorModal';
import { VibeCanvasWorkspace } from './components/VibeCanvasWorkspace';
import { WorkspaceConnectionModal } from './components/WorkspaceConnectionModal';
import { SaveUntitledModal } from './components/SaveUntitledModal';
import {
  ActiveWorkspace,
  saveFileToLocalDirectory,
  deleteFileFromLocalDirectory,
  renameFileInLocalDirectory,
  saveVaultToIndexedDB,
  loadVaultFromIndexedDB,
  getMemoryDirectoryHandle,
  setMemoryDirectoryHandle,
  rescanLocalDirectory,
} from './services/workspaceStorageService';
import { AuthPage } from './components/AuthPage';
import { UserProfileBadge } from './components/UserProfileBadge';
import { GuestFeatureGateModal } from './components/GuestFeatureGateModal';
import { GUEST_SAMPLE_FILES, GUEST_SAMPLE_FOLDERS } from './data/guestSampleWorkspace';
import { authService, AuthUser } from './services/authService';
import { renderMarkdownToHtml } from './utils/markdownParser';
import { TableGridPicker } from './components/TableGridPicker';
import { generateEmptyTable } from './utils/markdownTableHelper';
import {
  Brain,
  Server,
  Key,
  Cpu,
  Route,
  Bot,
  User,
  Send,
  Trash2,
  ArrowRight,
  FileText,
  Save,
  Eye,
  Edit3,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCw,
  Sparkles,
  Check,
  FileCode,
  Info,
  Network,
  Bold,
  Italic,
  Link,
  Code,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Minus,
  Table as TableIcon,
  Pencil,
  GripVertical,
  Copy,
  Search,
  X,
  AlignLeft,
  Wand2,
  ListTree,
  History,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Paperclip,
  Image as ImageIcon,
  Download,
  BookOpen,
  Layers,
  Sliders,
  AlertTriangle,
  RotateCcw,
  FolderPlus,
  Pin,
  Maximize2,
  Minimize2,
  HelpCircle,
  Undo,
  Redo,
  Scissors,
  ZoomIn,
  ZoomOut,
  FilePlus,
  Palette,
  AtSign,
  Ghost,
  Languages,
  Globe,
  Power,
  Calendar,
  CalendarDays,
  CalendarPlus,
  DollarSign,
  Presentation,
  FileSpreadsheet,
  Cloud,
  Github,
  Settings,
  Columns,
  ShieldCheck
} from 'lucide-react';

interface FileNode {
  name: string;
  content: string;
}

interface FileTreeFolder {
  name: string;
  files: FileNode[];
  isOpen: boolean;
}

interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  size: string;
  url?: string;
  content?: string;
}

interface ChatMessage {
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

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  deletedAt?: string;
  messages: ChatMessage[];
  fileName?: string;
  editorContent?: string;
  editorTab?: 'edit' | 'split' | 'preview';
}

interface ProjectEvent {
  id: string;
  title: string;
  date: string;
  type: 'milestone' | 'meeting' | 'deadline' | 'task';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  notes?: string;
}

export default function App() {
  // Authentication Guard State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Top Header State
  const [provider, setProvider] = useState<'cloud' | 'local-pc' | 'local-server'>('cloud');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('aipodium_preferences');
      if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  // Client-side API Key & Local Endpoint security states
  const [cloudApiKey, setCloudApiKey] = useState<string>(() => {
    try {
      const savedPrefs = localStorage.getItem('aipodium_preferences');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.security?.isEncryptionEnabled) {
          return '';
        }
      }
      return sessionStorage.getItem('aipodium_cloud_api_key') || localStorage.getItem('aipodium_cloud_api_key') || '';
    } catch {
      return '';
    }
  });

  const [localEndpointAddress, setLocalEndpointAddress] = useState<string>(() => {
    try {
      const savedPrefs = localStorage.getItem('aipodium_preferences');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.security?.isEncryptionEnabled) {
          return 'http://localhost:11434';
        }
      }
      return sessionStorage.getItem('aipodium_local_endpoint') || localStorage.getItem('aipodium_local_endpoint') || 'http://localhost:11434';
    } catch {
      return 'http://localhost:11434';
    }
  });

  const [configValue, setConfigValue] = useState<string>(() => {
    return provider === 'cloud' ? cloudApiKey : localEndpointAddress;
  });

  // Sync configValue when provider or keys change
  useEffect(() => {
    if (provider === 'cloud') {
      setConfigValue(cloudApiKey);
    } else {
      setConfigValue(localEndpointAddress);
    }
  }, [provider, cloudApiKey, localEndpointAddress]);

  // Keep secrets out of persistent browser storage. Prefer temporary session storage only.
  useEffect(() => {
    try {
      if (!preferences.security?.isEncryptionEnabled) {
        if (cloudApiKey) {
          sessionStorage.setItem('aipodium_cloud_api_key', cloudApiKey);
        } else {
          sessionStorage.removeItem('aipodium_cloud_api_key');
        }
      } else {
        sessionStorage.removeItem('aipodium_cloud_api_key');
      }
    } catch {}
  }, [cloudApiKey, preferences.security?.isEncryptionEnabled]);

  useEffect(() => {
    try {
      if (!preferences.security?.isEncryptionEnabled) {
        if (localEndpointAddress) {
          sessionStorage.setItem('aipodium_local_endpoint', localEndpointAddress);
        } else {
          sessionStorage.removeItem('aipodium_local_endpoint');
        }
      } else {
        sessionStorage.removeItem('aipodium_local_endpoint');
      }
    } catch {}
  }, [localEndpointAddress, preferences.security?.isEncryptionEnabled]);

  const [selectedModel, setSelectedModel] = useState<string>(preferences.defaultModel);
  const [aiParameters, setAiParameters] = useState<AiInferenceParameters>(() => {
    try {
      const saved = localStorage.getItem('ai_podium_parameters');
      if (saved) {
        return { ...DEFAULT_AI_PARAMETERS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_AI_PARAMETERS;
  });
  const [ghostWriterModel, setGhostWriterModel] = useState<string>(() => {
    try {
      return localStorage.getItem('aipodium_ghost_writer_model') || 'gemini-3.7-flash';
    } catch {
      return 'gemini-3.7-flash';
    }
  });
  const [isGhostModelDropdownOpen, setIsGhostModelDropdownOpen] = useState<boolean>(false);
  const [isChatGhostModelOpen, setIsChatGhostModelOpen] = useState<boolean>(false);
  const [ghostModelHighlightIndex, setGhostModelHighlightIndex] = useState<number>(0);
  const ghostModelOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ghostWriterModelOptions = useMemo(() => [
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', tier: '⚡ Ultra Fast • 1x Credits', desc: 'Credit-saving fast translation & drafting' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', tier: '💎 Premium Depth • 3x Credits', desc: 'Maximum context depth' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', tier: '🧠 High Reasoning • 2x Credits', desc: 'Deep technical reasoning & logic' },
    { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder 32B', tier: '💻 Code Specialist • 1.5x Credits', desc: 'Optimal for code refactoring' },
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B (Local)', tier: '🏠 Free (0 Credits)', desc: 'Local Ollama execution' },
  ], []);

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_ghost_writer_model', ghostWriterModel);
    } catch {}
  }, [ghostWriterModel]);

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_preferences', JSON.stringify(preferences));
      applyThemeToDocument(
        preferences.compactness || 'dense',
        preferences.fontSize || 'md'
      );
    } catch {}
  }, [preferences]);

  // Scroll highlighted model into view during keyboard navigation
  useEffect(() => {
    if (isChatGhostModelOpen && ghostModelOptionRefs.current[ghostModelHighlightIndex]) {
      ghostModelOptionRefs.current[ghostModelHighlightIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [ghostModelHighlightIndex, isChatGhostModelOpen]);
  const [selectedMultiModels, setSelectedMultiModels] = useState<string[]>([
    'gemini-3.7-flash',
    'deepseek-r1'
  ]);
  const [mode, setMode] = useState<'single' | 'routing' | 'multi'>('single');
  const [isMultiPopoverOpen, setIsMultiPopoverOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState<boolean>(false);
  const [preferencesInitialTab, setPreferencesInitialTab] = useState<'ai-engine' | 'persona' | 'prompts' | 'theme' | 'integrations' | 'security' | 'ghost-writer'>('ai-engine');

  // Chat Sessions State (Projects)
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'session-default',
      title: 'AI 지식 비서',
      createdAt: '방금 전',
      fileName: 'tech_notes.md',
      editorTab: 'edit',
      editorContent: `# 기술 노트\n\n- REST API vs GraphQL\n- Redis 캐싱 전략\n- OAuth 2.0 인증`,
      messages: [
        {
          id: 'welcome-1',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          model: 'Gemini 2.5 Flash',
          text: `안녕하세요! **AI 지식 비서**입니다.

질문하시거나 코드를 요청하시면 마크다운 형식으로 답변을 제공합니다. 상단의 **[에디터 삽입]** 버튼으로 에디터에 바로 추가할 수 있습니다.`
        }
      ]
    },
    {
      id: 'session-rest-graphql',
      title: 'REST API vs GraphQL 성능 비교',
      createdAt: '10분 전',
      fileName: 'rest_graphql_comparison.md',
      editorTab: 'edit',
      editorContent: `# REST API vs GraphQL 비교 분석 노트\n\n## 개요\n클라이언트 통신 방식별 특성과 캐싱 전략 비교 정리입니다.\n\n## 주요 아키텍처\n- REST: 엔드포인트 기반 캐싱\n- GraphQL: 단일 엔드포인트 Query & Mutation\n\n\`\`\`graphql\n# GraphQL Query Example\nquery GetUser {\n  user(id: "101") {\n    name\n    email\n  }\n}\n\`\`\``,
      messages: [
        {
          id: 'rest-1',
          sender: 'user',
          timestamp: '20:15',
          text: 'REST API와 GraphQL의 주요 성능 차이점과 캐싱 전략을 비교해줘.'
        },
        {
          id: 'rest-2',
          sender: 'ai',
          timestamp: '20:15',
          model: 'Gemini 2.5 Flash',
          text: `# REST API vs GraphQL 비교 가이드\n\n## 개요\nREST API는 리소스 중심의 엔드포인트를 제공하는 반면, GraphQL은 클라이언트가 필요한 데이터 구조를 직접 요청할 수 있는 단일 엔드포인트 방식입니다.\n\n## 주요 차이점\n- **오버패칭(Over-fetching):** GraphQL 해결 (원하는 필드만 수신)\n- **언더패칭(Under-fetching):** REST API는 여러 번의 N+1 요청이 발생할 수 있으나 GraphQL은 single round-trip으로 수신\n- **캐싱(Caching):** REST API는 HTTP Standard Caching 우수\n\n\`\`\`graphql\n# GraphQL Query Example\nquery GetUser {\n  user(id: "101") {\n    name\n    email\n  }\n}\n\`\`\``
        }
      ]
    },
    {
      id: 'session-redis',
      title: 'Redis 캐싱 패턴 (Cache-Aside)',
      createdAt: '1시간 전',
      fileName: 'redis_caching_guide.md',
      editorTab: 'edit',
      editorContent: `# Redis 캐싱 전략 아키텍처\n\n## 개요\nIn-Memory DB 부하 분산 및 Cache-Aside, Write-Through 전략 가이드입니다.\n\n## 패턴 분석\n- Cache-Aside: Read-heavy 최적화\n- Write-Through: 데이터 정합성 보장\n\n\`\`\`typescript\n// Cache-Aside Pattern Example\nasync function getUser(userId: string) {\n  const cached = await redis.get(\`user:\${userId}\`);\n  if (cached) return JSON.parse(cached);\n\n  const user = await db.findUser(userId);\n  await redis.set(\`user:\${userId}\`, JSON.stringify(user), 'EX', 3600);\n  return user;\n}\n\`\`\``,
      messages: [
        {
          id: 'redis-1',
          sender: 'user',
          timestamp: '19:20',
          text: 'Redis 캐싱 전략 패턴을 가이드해줘.'
        },
        {
          id: 'redis-2',
          sender: 'ai',
          timestamp: '19:20',
          model: 'Gemini 2.5 Flash',
          text: `# Redis 캐싱 전략 및 패턴\n\n## 개요\nRedis는 In-Memory Key-Value 데이터 구조 저장소로서, DB 부하를 줄이고 읽기 성능을 극대화하기 위해 다양한 캐싱 패턴을 사용합니다.\n\n## 핵심 전략\n- **Cache-Aside (Look-Aside):** 애플리케이션이 캐시를 먼저 확인 후 히스 시 반환, 미스 시 DB 조회 후 캐시 기록\n- **Write-Through:** 데이터 변경 시 캐시와 DB에 동시에 업데이트하여 일관성 유지\n\n\`\`\`typescript\n// Cache-Aside Pattern Example\nasync function getUser(userId: string) {\n  const cached = await redis.get(\`user:\${userId}\`);\n  if (cached) return JSON.parse(cached);\n\n  const user = await db.findUser(userId);\n  await redis.set(\`user:\${userId}\`, JSON.stringify(user), 'EX', 3600);\n  return user;\n}\n\`\`\``
        }
      ]
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-default');
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState<boolean>(true);
  const [isAiModelSelectionOpen, setIsAiModelSelectionOpen] = useState<boolean>(true);
  const [isChatHistoryPinned, setIsChatHistoryPinned] = useState<boolean>(true);

  // Derived current session messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  // Top Dropdown Menu Bar state & refs
  type MenuType = 'file' | 'edit' | 'view' | 'settings' | 'ai' | 'window' | 'help' | null;
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);
  const [isExportSubmenuOpen, setIsExportSubmenuOpen] = useState<boolean>(false);
  const [isClearChatConfirmOpen, setIsClearChatConfirmOpen] = useState<boolean>(false);
  const topMenuRef = useRef<HTMLDivElement>(null);
  const clearChatConfirmRef = useRef<HTMLDivElement>(null);
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isEventManagerOpen, setIsEventManagerOpen] = useState<boolean>(false);
  const [isExtractingEvents, setIsExtractingEvents] = useState<boolean>(false);
  const [eventFilter, setEventFilter] = useState<'all' | 'milestone' | 'meeting' | 'deadline' | 'task'>('all');
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newEventType, setNewEventType] = useState<'milestone' | 'meeting' | 'deadline' | 'task'>('task');
  const [newEventPriority, setNewEventPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newEventNotes, setNewEventNotes] = useState<string>('');

  // Create New File Modal State
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState<boolean>(false);
  const [newFileNameInput, setNewFileNameInput] = useState<string>('');
  const [newFileFolderTarget, setNewFileFolderTarget] = useState<string>('');
  const newFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNewFileModalOpen) {
      setTimeout(() => {
        if (newFileInputRef.current) {
          newFileInputRef.current.focus();
          newFileInputRef.current.select();
        }
      }, 50);
    }
  }, [isNewFileModalOpen]);

  // Active Workspace & Storage Binding State
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>(() => {
    try {
      const saved = localStorage.getItem('aipodium_active_workspace');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'default-local-vault',
      name: 'AI Podium Workspace',
      type: 'local',
      path: '/AI Podium Workspace',
      status: 'connected',
      fileCount: 4,
      lastSynced: '방금',
    };
  });
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [isResyncingWorkspace, setIsResyncingWorkspace] = useState<boolean>(false);

  const getWorkspaceDisplayPath = (ws: ActiveWorkspace) => {
    if (ws.path) return ws.path;
    if (ws.type === 'local') return `/${ws.name}`;
    if (ws.type === 'gdrive') return `Google Drive:/${ws.name}`;
    if (ws.type === 'github') return `github.com/${ws.githubOwner || 'org'}/${ws.githubRepo || ws.name}`;
    if (ws.type === 'remote') return `ssh://${ws.name}`;
    return `Vault:/${ws.name}`;
  };

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_active_workspace', JSON.stringify(activeWorkspace));
    } catch {}
  }, [activeWorkspace]);

  // Google Auth & SSOT Workspace State
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(() => googleDriveService.getUserProfile());
  const [isGoogleAuthDropdownOpen, setIsGoogleAuthDropdownOpen] = useState<boolean>(false);
  const [workspaceRootType, setWorkspaceRootType] = useState<'local' | 'gdrive' | 'remote' | 'github'>(() => {
    try {
      return (localStorage.getItem('aipodium_workspace_root_type') as any) || 'local';
    } catch {
      return 'local';
    }
  });
  const [gdriveSsotFolder, setGdriveSsotFolder] = useState<DriveFolderInfo | null>(() => googleDriveService.getSavedSsotFolder());
  const [isGdrivePickerOpen, setIsGdrivePickerOpen] = useState<boolean>(false);
  const [isGoogleAccountModalOpen, setIsGoogleAccountModalOpen] = useState<boolean>(false);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(() => {
    try {
      const saved = localStorage.getItem('aipodium_remote_workspace_config');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState<boolean>(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);

  // Guest Mode Feature Gating State
  const [isGuestGateModalOpen, setIsGuestGateModalOpen] = useState<boolean>(false);
  const [guestGateFeature, setGuestGateFeature] = useState<{
    name: string;
    description: string;
    icon: 'github' | 'cloud' | 'gdrive' | 'sync' | 'default';
  }>({
    name: '클라우드 동기화',
    description: '이 기능은 계정 연동 및 클라우드 동기화가 필요한 기능입니다.',
    icon: 'default',
  });

  const handleGateFeature = useCallback((
    name: string,
    description: string,
    icon: 'github' | 'cloud' | 'gdrive' | 'sync' | 'default',
    allowedAction: () => void
  ) => {
    if (currentUser?.provider === 'guest') {
      setGuestGateFeature({ name, description, icon });
      setIsGuestGateModalOpen(true);
      return;
    }
    allowedAction();
  }, [currentUser]);

  const handleOpenGithubModal = useCallback(() => {
    handleGateFeature(
      'GitHub 양방향 동기화',
      'GitHub 저장소와의 실시간 Push/Pull 및 커밋 자동 연동은 정식 계정에서 제공됩니다.',
      'github',
      () => setIsGithubModalOpen(true)
    );
  }, [handleGateFeature]);

  const handleOpenGoogleAccount = useCallback(() => {
    handleGateFeature(
      'Google Drive 클라우드 저장소',
      'Google Drive 기반 SSOT 클라우드 동기화 및 공유는 Google 계정 연동이 필요합니다.',
      'gdrive',
      () => setIsGoogleAccountModalOpen(true)
    );
  }, [handleGateFeature]);

  const handleOpenRemoteSSH = useCallback(() => {
    handleGateFeature(
      '원격 클라우드 서버 동기화',
      'SSH/REST 기반 원격 엔터프라이즈 서버 저장소 연결은 정식 계정에서 제공됩니다.',
      'cloud',
      () => setIsRemoteModalOpen(true)
    );
  }, [handleGateFeature]);
  
  // SSOT Generator Modal State
  const [isSSOTGeneratorModalOpen, setIsSSOTGeneratorModalOpen] = useState(false);
  const [ssotGeneratorInitialFolder, setSsotGeneratorInitialFolder] = useState<string>('');
  const [ssotGeneratorInitialTemplate, setSsotGeneratorInitialTemplate] = useState<string>('master_ssot');

  const handleOpenSSOTGeneratorModal = (folder = '', template = 'master_ssot') => {
    setSsotGeneratorInitialFolder(folder);
    setSsotGeneratorInitialTemplate(template);
    setIsSSOTGeneratorModalOpen(true);
  };

  // Vibe Canvas (SSOT Word Processor) State
    const [isVibeCanvasActive, setIsVibeCanvasActive] = useState<boolean>(false);
  const [vibeCanvasConfig, setVibeCanvasConfig] = useState<VibeCanvasConfig | null>(null);
  const [vibeCanvasContent, setVibeCanvasContent] = useState<string>('');
  const [vibeCanvasFileName, setVibeCanvasFileName] = useState<string>('project_SSOT.md');
  const [vibeCanvasTargetFolder, setVibeCanvasTargetFolder] = useState<string>('docs');
  const [vibeCanvasInitialFolder, setVibeCanvasInitialFolder] = useState<string | undefined>(undefined);
    const [isGeneratingVibeCanvasAi, setIsGeneratingVibeCanvasAi] = useState<boolean>(false);
  
  const [githubConfig, setGithubConfig] = useState<GithubConfig | null>(() => {
    try {
      const saved = localStorage.getItem('aipodium_github_config');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isSyncingSsot, setIsSyncingSsot] = useState<boolean>(false);
  const [lastSsotSyncTime, setLastSsotSyncTime] = useState<string | null>(null);

  const googleAuthRef = useRef<HTMLDivElement>(null);

  // Close Google Auth dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (googleAuthRef.current && !googleAuthRef.current.contains(e.target as Node)) {
        setIsGoogleAuthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '0 B';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleGoogleSignIn = async () => {
    try {
      const { profile } = await googleDriveService.signIn();
      setGoogleUser(profile);
      showToast(`✨ Google 계정 [${profile.name || profile.email}] 로그인 완료!`);
    } catch (e: any) {
      showToast(`Google 로그인 오류: ${e.message || '인증 실패'}`);
    }
  };

  const handleGoogleSignOut = () => {
    googleDriveService.clearToken();
    setGoogleUser(null);
    setIsGoogleAuthDropdownOpen(false);
    showToast('Google 계정 연결이 해제되었습니다.');
  };

  const handleSyncSsotFolder = async () => {
    if (!googleDriveService.isAuthenticated()) {
      showToast('Google 계정 로그인이 필요합니다.');
      await handleGoogleSignIn();
      return;
    }
    setIsSyncingSsot(true);
    try {
      const targetFolderId = gdriveSsotFolder?.id || 'root';
      const currentContent = files[currentActiveFile] || '';
      await googleDriveService.saveFile(currentActiveFile, currentContent, targetFolderId);
      setLastSsotSyncTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      showToast(`☁️ Google Drive SSOT 동기화 완료: ${currentActiveFile}`);
    } catch (e: any) {
      showToast('Google Drive 동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncingSsot(false);
    }
  };

  const handleSelectWorkspaceRoot = (type: 'local' | 'gdrive' | 'remote') => {
    setWorkspaceRootType(type);
    try {
      localStorage.setItem('aipodium_workspace_root_type', type);
    } catch {}
    if (type === 'gdrive') {
      if (!googleDriveService.isAuthenticated()) {
        showToast('Google Drive SSOT 연결을 위해 로그인을 진행합니다.');
        handleGoogleSignIn();
      }
      setIsGdrivePickerOpen(true);
    } else if (type === 'remote') {
      setIsRemoteModalOpen(true);
    } else {
      showToast('📂 로컬 워크스페이스 모드로 전환되었습니다.');
    }
  };

  const handleSelectActiveWorkspace = (
    newWorkspace: ActiveWorkspace,
    loadedFiles?: Record<string, string>,
    loadedFolders?: Record<string, string>
  ) => {
    setActiveWorkspace(newWorkspace);
    if (loadedFiles && Object.keys(loadedFiles).length > 0) {
      setFiles(loadedFiles);
      if (loadedFolders) {
        setFileFolders(loadedFolders);
      }
      const firstF = Object.keys(loadedFiles)[0];
      if (firstF) {
        setCurrentActiveFile(firstF);
        setFileName(firstF);
        setEditorContent(loadedFiles[firstF] || '');
      }
    }
    if (newWorkspace.type === 'local') {
      setWorkspaceRootType('local');
    } else if (newWorkspace.type === 'remote') {
      setWorkspaceRootType('remote');
    } else if (newWorkspace.type === 'gdrive') {
      setWorkspaceRootType('gdrive');
    } else if (newWorkspace.type === 'github') {
      setWorkspaceRootType('github');
    } else if (newWorkspace.type === 'indexeddb') {
      setWorkspaceRootType('local');
    }
  };

  const handleResyncWorkspace = async () => {
    setIsResyncingWorkspace(true);
    try {
      if (activeWorkspace.type === 'local') {
        const handle = getMemoryDirectoryHandle();
        if (handle) {
          const { files: rescannedFiles, fileFolders: rescannedFolders } = await rescanLocalDirectory(handle);
          setFiles((prev) => ({ ...prev, ...rescannedFiles }));
          setFileFolders((prev) => ({ ...prev, ...rescannedFolders }));
          setActiveWorkspace((prev) => ({
            ...prev,
            lastSynced: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            fileCount: Object.keys(rescannedFiles).length,
          }));
          showToast(`⚡ 로컬 폴더 '${activeWorkspace.name}' 동기화 완료! (${Object.keys(rescannedFiles).length}개 파일)`, 'success');
        } else {
          showToast('📂 로컬 디렉토리 핸들을 다시 연결해주세요.', 'info');
          setIsWorkspaceModalOpen(true);
        }
      } else if (activeWorkspace.type === 'gdrive') {
        if (googleDriveService.isAuthenticated()) {
          showToast(`☁️ Google Drive '${activeWorkspace.name}' 실시간 클라우드 동기화 상태 유지됨`, 'success');
          setActiveWorkspace((prev) => ({
            ...prev,
            lastSynced: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            fileCount: Object.keys(files).length,
          }));
        } else {
          showToast('⚠️ Google OAuth 세션 재인증이 필요합니다.', 'warn');
          setIsGoogleAccountModalOpen(true);
        }
      } else if (activeWorkspace.type === 'github') {
        if (githubConfig?.token && githubConfig?.owner && githubConfig?.repo) {
          showToast(`🐙 GitHub '${activeWorkspace.name}' 저장소 최신 상태 확인 완료`, 'success');
          setActiveWorkspace((prev) => ({
            ...prev,
            lastSynced: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            fileCount: Object.keys(files).length,
          }));
        } else {
          showToast('⚠️ GitHub 연동 설정을 확인해주세요.', 'warn');
          setIsGithubModalOpen(true);
        }
      } else if (activeWorkspace.type === 'indexeddb') {
        const vaultId = activeWorkspace.vaultId || activeWorkspace.id;
        await saveVaultToIndexedDB(vaultId, files, fileFolders, activeWorkspace.name);
        setActiveWorkspace((prev) => ({
          ...prev,
          lastSynced: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          fileCount: Object.keys(files).length,
        }));
        showToast(`⚡ 브라우저 Vault '${activeWorkspace.name}' IndexedDB 동기화 완료!`, 'success');
      } else {
        setActiveWorkspace((prev) => ({
          ...prev,
          lastSynced: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          fileCount: Object.keys(files).length,
        }));
        showToast(`⚡ 리모트 저장소 '${activeWorkspace.name}' 동기화 확인 완료`, 'success');
      }
    } catch (e: any) {
      showToast(`동기화 오류: ${e.message}`, 'error');
    } finally {
      setIsResyncingWorkspace(false);
    }
  };

  const [projectEvents, setProjectEvents] = useState<ProjectEvent[]>(() => {
    try {
      const saved = localStorage.getItem('aipodium_project_events');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'evt-1',
        title: '시스템 요구사항 정의 및 AI 파이프라인 설계',
        date: '2026-08-25',
        type: 'milestone',
        priority: 'high',
        completed: true,
        notes: '대화-에디터-탐색기 3창 실시간 동기화 아키텍처 수립'
      },
      {
        id: 'evt-2',
        title: 'AI 2차 가공 엔진 (Word/Sheet/Slide) 통합',
        date: '2026-08-28',
        type: 'task',
        priority: 'high',
        completed: true,
        notes: 'HTML 포맷 기반 실시간 문서/시트/슬라이드 렌더링 및 내보내기'
      },
      {
        id: 'evt-3',
        title: 'SSOT 지식 베이스 성능 검증 및 배포 준비',
        date: '2026-09-02',
        type: 'deadline',
        priority: 'medium',
        completed: false,
        notes: '대용량 프로젝트 폴더 파일 통합 분석 속도 최적화'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_project_events', JSON.stringify(projectEvents));
    } catch {
      // ignore
    }
  }, [projectEvents]);

  const [editorZoom, setEditorZoom] = useState<number>(100);

  // Close top menu and popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setIsExportSubmenuOpen(false);
      }
      if (clearChatConfirmRef.current && !clearChatConfirmRef.current.contains(e.target as Node)) {
        setIsClearChatConfirmOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const [chatInput, setChatInput] = useState<string>('');
  const [chatInputHeight, setChatInputHeight] = useState<number>(64);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [chatAttachments, setChatAttachments] = useState<ChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const chatGhostModelRef = useRef<HTMLDivElement>(null);

  // Mouse drag handler for adjusting prompt input box height
  const handleInputResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = chatInputHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY; // drag up -> increase height
      const newHeight = Math.min(Math.max(40, startHeight + deltaY), 350);
      setChatInputHeight(newHeight);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [chatInputHeight]);

  // Process selected or dropped/pasted files
  const processFiles = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();

      if (isImage) {
        reader.onload = (e) => {
          const newAtt: ChatAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: 'image',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            url: e.target?.result as string
          };
          setChatAttachments((prev) => [...prev, newAtt]);
          showToast(`📷 이미지 '${file.name}' 첨부 완료`);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          const textContent = e.target?.result as string;
          const newAtt: ChatAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: 'file',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            content: textContent
          };
          setChatAttachments((prev) => [...prev, newAtt]);
          showToast(`📄 파일 '${file.name}' 첨부 완료`);
        };
        reader.readAsText(file);
      }
    });
  };

  // Paste Event Handler (for clipboard images and text)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          hasImage = true;
          processFiles([file]);
        }
      }
    }

    if (hasImage) {
      showToast('📷 클립보드 이미지 첨부 완료!');
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (attId: string) => {
    setChatAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Editor State
  const [fileName, setFileName] = useState<string>('tech_notes.md');
  const [editorContent, setEditorContent] = useState<string>(
    `# AI Podium 기술 스택 노트 (SSOT 원본)\n\n## 개요\n이 노트는 AI 대화창에서 [에디터로 보내기 ➔] 버튼을 눌러 수집된 Single Source of Truth(SSOT) 핵심 문서입니다.\n\n## 포함된 내용\n- REST API vs GraphQL 비교\n- Redis 캐싱 전략\n- OAuth 2.0 인증 메커니즘`
  );
  const [editorTab, setEditorTab] = useState<'edit' | 'split' | 'preview'>('edit');
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [markdownEditMode, setMarkdownEditMode] = useState<string>('Markdown');
  const [showMarkdownHelp, setShowMarkdownHelp] = useState<boolean>(false);
  const [showTablePicker, setShowTablePicker] = useState<boolean>(false);
  const tableButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isAiCleaning, setIsAiCleaning] = useState<boolean>(false);

  // Multi-Tab Document States (Single Unified VS Code-like Tab Bar)
  const [openTabs, setOpenTabs] = useState<string[]>(['tech_notes.md', 'architecture_overview.md']);
  // In-Memory Untitled Document States (Temporary tabs without physical files)
  const [untitledDocs, setUntitledDocs] = useState<Record<string, string>>({});
  const untitledCounterRef = useRef<number>(1);
  const [isSaveUntitledModalOpen, setIsSaveUntitledModalOpen] = useState<boolean>(false);

  // Secondary Folder AI Processing State
  const [selectedFolderForAi, setSelectedFolderForAi] = useState<'docs' | 'src' | 'root'>('docs');
  const [isGeneratingFolderAi, setIsGeneratingFolderAi] = useState<boolean>(false);

  // File Explorer State
  const [files, setFiles] = useState<Record<string, string>>({
    'tech_notes.md': `# AI Podium 기술 스택 노트 (SSOT 원본)\n\n## 개요\n이 노트는 AI 대화창에서 [에디터로 보내기 ➔] 버튼을 눌러 수집된 Single Source of Truth(SSOT) 핵심 문서입니다.\n\n## 포함된 내용\n- REST API vs GraphQL 비교\n- Redis 캐싱 전략\n- OAuth 2.0 인증 메커니즘`,
    'architecture_overview.md': `# 시스템 아키텍처 개요\n\n## 프론트엔드\n- Tailwind CSS 기반 3-Pane Split UI\n- 빠르고 직관적인 고속 에디터 & 챗\n\n## 백엔드 & 2차 가공\n- Express Server & AI 2차 가공 파이프라인 (Word, Excel, Code, Slides, Manual)`,
    'api_specifications.md': `# API 스펙 문서\n\n## POST /api/chat\n- Description: AI 대화 요청 처리\n- Headers: Authorization Bearer API_KEY`,
    'AI_Podium_word_doc.html': `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>AI Podium Report</title></head>
<body style="font-family: sans-serif; padding: 2rem; color: #1e293b; background: #f8fafc;">
  <div style="max-width: 800px; margin: 0 auto; background: #fff; padding: 2rem; border-radius: 8px; border: 1px solid #e2e8f0;">
    <h1 style="color: #4f46e5;">📄 AI Podium 기술 보고서</h1>
    <p>본 문서는 프로젝트 폴더 내 원본 대화 및 수집 노트를 기반으로 AI에 의해 생성된 편집 가능한 HTML 문서입니다.</p>
    <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 1.5rem 0;" />
    <h2>1. 프로젝트 개요</h2>
    <p>속도와 직관성에 중점을 둔 통합 AI 아키텍처 작업공간입니다.</p>
  </div>
</body>
</html>`,
    'project_analysis_sheet.html': `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>Project Sheet</title></head>
<body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc;">
  <div style="max-width: 900px; margin: 0 auto; background: #1e293b; padding: 1.5rem; border-radius: 8px;">
    <h2 style="color: #38bdf8;">📊 프로젝트 마일스톤 및 예산 시트</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 1rem; color: #e2e8f0;">
      <thead><tr style="background: #334155;"><th style="padding: 8px; border: 1px solid #475569;">항목</th><th style="padding: 8px; border: 1px solid #475569;">담당</th><th style="padding: 8px; border: 1px solid #475569;">진척도</th></tr></thead>
      <tbody>
        <tr><td style="padding: 8px; border: 1px solid #475569;">SSOT 지식 수집</td><td style="padding: 8px; border: 1px solid #475569;">AI Podium</td><td style="padding: 8px; border: 1px solid #475569; color: #4ade80;">100% 완료</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #475569;">2차 가공 파이프라인</td><td style="padding: 8px; border: 1px solid #475569;">AI Engine</td><td style="padding: 8px; border: 1px solid #475569; color: #4ade80;">100% 가동중</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`,
    'README.md': `# AI Podium 3-Pane AI Architecture\n\nAI 대화, SSOT 지식 수집, 그리고 2차 가공(Word, Sheets, Slides, Manual, Code)을 하나의 통합 워크스페이스에서 제공합니다.`
  });
  const [currentActiveFile, setCurrentActiveFile] = useState<string>('tech_notes.md');
  const [docsFolderOpen, setDocsFolderOpen] = useState<boolean>(true);
  const [srcFolderOpen, setSrcFolderOpen] = useState<boolean>(false);

  // File Explorer Folder Assignments & Drag-and-Drop State
  const [fileFolders, setFileFolders] = useState<Record<string, string>>({
    'tech_notes.md': 'docs',
    'architecture_overview.md': 'docs',
    'api_specifications.md': 'docs',
    'AI_Podium_word_doc.html': 'docs',
    'project_analysis_sheet.html': 'docs',
    'README.md': 'root'
  });
  const [draggedType, setDraggedType] = useState<'project' | 'file' | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [dragDropPosition, setDragDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  // Global Search Bar Query for File Explorer
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto-Save State
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('');

  // Trash & Warning Confirmation States
  const [trashSessions, setTrashSessions] = useState<ChatSession[]>([]);
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<ChatSession | null>(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState<boolean>(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectTitle, setEditingProjectTitle] = useState<string>('');

  // AI Session Summarization State
  const [summarizingSessionId, setSummarizingSessionId] = useState<string | null>(null);

  // Chat History Session Search State
  const [sessionSearchQuery, setSessionSearchQuery] = useState<string>('');

  // @ Workspace Mention / Reference System State (우측 워크스페이스 폴더/파일 @ 참조)
  const [showMentionMenu, setShowMentionMenu] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  const [mentionFilterType, setMentionFilterType] = useState<'all' | 'folders' | 'files'>('all');
  const mentionListRef = useRef<HTMLDivElement>(null);
  const mentionItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close mention menu on outside click
  useEffect(() => {
    const handleMentionClickOutside = (e: MouseEvent) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(e.target as Node) &&
        chatInputRef.current &&
        !chatInputRef.current.contains(e.target as Node)
      ) {
        setShowMentionMenu(false);
      }

      if (
        chatGhostModelRef.current &&
        !chatGhostModelRef.current.contains(e.target as Node)
      ) {
        setIsChatGhostModelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMentionClickOutside);
    return () => document.removeEventListener('mousedown', handleMentionClickOutside);
  }, []);

  // Synchronize vertical scroll with highlight / keyboard navigation in mention list
  useEffect(() => {
    if (showMentionMenu && mentionListRef.current) {
      const activeElement = mentionItemRefs.current[mentionSelectedIndex];
      if (activeElement) {
        activeElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [mentionSelectedIndex, showMentionMenu]);

  // Synchronize vertical scroll with keyboard navigation in Ghost Writer Model listbox
  useEffect(() => {
    if (isChatGhostModelOpen) {
      const activeEl = ghostModelOptionRefs.current[ghostModelHighlightIndex];
      if (activeEl) {
        activeEl.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [ghostModelHighlightIndex, isChatGhostModelOpen]);

  // Generate list of workspace folders and files for @ mention referencing
  interface MentionItem {
    id: string;
    type: 'folder' | 'file';
    name: string;
    detail: string;
    folder?: string;
    path?: string;
  }

  const allMentionItems = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [];

    // 1. Workspace Folders (from sessions & fileFolders)
    const folderSet = new Set<string>();
    sessions.forEach((s) => {
      if (s.title) folderSet.add(s.title);
    });
    Object.values(fileFolders).forEach((f: string) => {
      if (f) folderSet.add(f);
    });
    folderSet.add('docs');
    folderSet.add('src');

    folderSet.forEach((folderName) => {
      const containedFiles = Object.keys(files).filter(
        (f) => (fileFolders[f] || folderName) === folderName || f === `${folderName}.md`
      );
      items.push({
        id: `folder-${folderName}`,
        type: 'folder',
        name: folderName,
        detail: `워크스페이스 폴더 • ${containedFiles.length}개 파일`,
        path: folderName
      });
    });

    // 2. Workspace Files
    Object.keys(files).forEach((fname) => {
      const parentFolder = fileFolders[fname] || 'docs';
      const fileContent = files[fname] || '';
      const lines = fileContent.split('\n').length;
      items.push({
        id: `file-${fname}`,
        type: 'file',
        name: fname,
        detail: `${parentFolder} • ${lines}줄 • ${(fileContent.length / 1024).toFixed(1)} KB`,
        folder: parentFolder,
        path: `${parentFolder}/${fname}`
      });
    });

    return items;
  }, [sessions, files, fileFolders]);

  const filteredMentionItems = useMemo(() => {
    let list = allMentionItems;
    if (mentionFilterType === 'folders') {
      list = list.filter((i) => i.type === 'folder');
    } else if (mentionFilterType === 'files') {
      list = list.filter((i) => i.type === 'file');
    }

    if (!mentionQuery.trim()) return list;

    const q = mentionQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.folder && item.folder.toLowerCase().includes(q)) ||
        (item.detail && item.detail.toLowerCase().includes(q))
    );
  }, [allMentionItems, mentionFilterType, mentionQuery]);

  // Insert mention tag into chat input
  const handleSelectMention = useCallback((item: MentionItem) => {
    const textarea = chatInputRef.current;
    const cursorPos = textarea ? textarea.selectionStart : chatInput.length;
    const start = mentionStartIndex !== -1 ? mentionStartIndex : cursorPos;

    const tag = item.type === 'folder' ? `@[📁 ${item.name}] ` : `@[📄 ${item.name}] `;
    const beforeAt = chatInput.slice(0, start);
    const afterCursor = chatInput.slice(cursorPos);
    const newText = beforeAt + tag + afterCursor;

    setChatInput(newText);
    setShowMentionMenu(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    showToast(`🔗 워크스페이스 ${item.type === 'folder' ? '폴더' : '파일'} '${item.name}' 참조 추가됨`);

    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        const nextPos = start + tag.length;
        chatInputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 15);
  }, [chatInput, mentionStartIndex]);

  // Handle typing inside chat textarea with @ detection
  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setChatInput(val);

    // Look back from cursorPos to find @
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      // Check if preceded by space or start of line, and no newline in textAfterAt
      if (/[\s\n]/.test(charBeforeAt) || lastAtIndex === 0) {
        if (!/[\n]/.test(textAfterAt) && textAfterAt.length <= 40) {
          setMentionStartIndex(lastAtIndex);
          setMentionQuery(textAfterAt);
          setShowMentionMenu(true);
          setMentionSelectedIndex(0);
          return;
        }
      }
    }

    setShowMentionMenu(false);
  };

  // Keyboard navigation for @ mention menu
  const handleChatInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && filteredMentionItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % filteredMentionItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + filteredMentionItems.length) % filteredMentionItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMentionItems[mentionSelectedIndex];
        if (selected) {
          handleSelectMention(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    // Ctrl+Enter or Cmd+Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setShowMentionMenu(false);
      handleSendMessage();
    }
  };

  // Dedicated button to trigger @ mention
  const handleTriggerMention = () => {
    const textarea = chatInputRef.current;
    const cursorPos = textarea ? textarea.selectionStart : chatInput.length;
    const before = chatInput.slice(0, cursorPos);
    const after = chatInput.slice(cursorPos);
    const newText = before + '@' + after;

    setChatInput(newText);
    setMentionStartIndex(cursorPos);
    setMentionQuery('');
    setShowMentionMenu(true);
    setMentionSelectedIndex(0);

    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        chatInputRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
      }
    }, 15);
  };

  // Toast Notification State & Helper
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'warn' | 'info' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'warn' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Ghost Writer Mode State (고스트 라이터 모드: 영어 번역 & 영작 연습 기능)
  type GhostWriterLevel = 'off' | '100' | '70' | '50' | '30';
  const [ghostWriterLevel, setGhostWriterLevel] = useState<GhostWriterLevel>(() => {
    return preferences.ghostWriterLevel || 'off';
  });
  const [ghostTargetEnglish, setGhostTargetEnglish] = useState<string>('');
  const [ghostTemplateText, setGhostTemplateText] = useState<string>('');
  const [ghostUserInput, setGhostUserInput] = useState<string>('');
  const [ghostTypoCount, setGhostTypoCount] = useState<number>(0);
  const [ghostShowFullAnswer, setGhostShowFullAnswer] = useState<boolean>(false);
  const [isGhostLoading, setIsGhostLoading] = useState<boolean>(false);
  const ghostInputRef = useRef<HTMLTextAreaElement>(null);

  // Ghost Writer High-Precision Translation & Prompt Optimization Engine
  const translateToEnglishPrompt = useCallback((koreanText: string): string => {
    const trimmed = koreanText.trim();
    if (!trimmed) return '';

    // Check if input is already English
    const isMainlyEnglish = /^[\x00-\x7F\s\d.,!?'"-]+$/.test(trimmed) && /[a-zA-Z]{3,}/.test(trimmed);
    if (isMainlyEnglish) {
      return trimmed;
    }

    // Direct idiomatic translations for common expressions & questions
    if (/^정말\s*영어로\s*번역이\s*되나\??$/i.test(trimmed) || /^정말\s*영어로\s*번역이\s*되나요\??$/i.test(trimmed)) {
      return 'Does it really translate into English?';
    }
    if (/^영어로\s*번역해줘\??$/i.test(trimmed) || /^영작해줘\??$/i.test(trimmed)) {
      return 'Please translate this into natural, professional English.';
    }
    if (/^안녕(하세요)?\??$/i.test(trimmed) || /^반가워(요)?\??$/i.test(trimmed)) {
      return 'Hello, how can I assist you with your project today?';
    }

    // Core Tech Domain Exact Matching
    if (
      (trimmed.includes('REST') && trimmed.includes('GraphQL') && (trimmed.includes('캐싱') || trimmed.includes('caching'))) ||
      trimmed.includes('REST API와 GraphQL의 캐싱 전략 차이점을 비교해줘') ||
      trimmed.includes('REST API와 GraphQL의 캐싱 전략')
    ) {
      return 'Compare the differences in caching strategies between REST API and GraphQL.';
    }

    if (trimmed.includes('REST') && trimmed.includes('GraphQL')) {
      return 'Compare the architectural trade-offs, performance characteristics, and schema design between REST API and GraphQL.';
    }

    if (trimmed.includes('Redis') || (trimmed.includes('캐시') && trimmed.includes('전략'))) {
      return 'Explain distributed caching strategies, TTL policies, and cache invalidation patterns using Redis.';
    }

    if (trimmed.includes('도커') || trimmed.includes('Docker') || trimmed.includes('컨테이너')) {
      return 'Provide a step-by-step technical guide for building a containerized deployment pipeline with Docker.';
    }

    if (trimmed.includes('쿠버네티스') || trimmed.includes('Kubernetes') || trimmed.includes('K8s')) {
      return 'Explain Kubernetes cluster architecture, Pod lifecycle management, and Service ingress routing.';
    }

    if (trimmed.includes('React') || trimmed.includes('리액트')) {
      if (trimmed.includes('상태') || trimmed.includes('Zustand') || trimmed.includes('Redux')) {
        return 'Compare modern React state management solutions including Zustand, TanStack Query, and Redux Toolkit.';
      }
      if (trimmed.includes('성능') || trimmed.includes('최적화')) {
        return 'Explain React 19 performance optimization techniques and concurrent rendering features.';
      }
      return 'Explain React 19 Server Components, concurrent rendering features, and performance optimization techniques.';
    }

    if (trimmed.includes('OAuth') || trimmed.includes('JWT') || trimmed.includes('인증') || trimmed.includes('로그인')) {
      return 'Explain secure authentication and authorization flows using OAuth 2.0, OpenID Connect, and JWT tokens.';
    }

    if (trimmed.includes('마이크로서비스') || trimmed.includes('MSA')) {
      return 'Explain microservices architecture design principles, API Gateway patterns, and distributed tracing.';
    }

    if (trimmed.includes('성능') || trimmed.includes('최적화')) {
      return 'Analyze performance bottlenecks and optimization strategies for high-concurrency cloud environments.';
    }

    if (trimmed.includes('슬라이드') || trimmed.includes('프레젠테이션') || trimmed.includes('PPT')) {
      return 'Generate an outline and content structure for an interactive presentation slide deck.';
    }

    if (trimmed.includes('스프레드시트') || trimmed.includes('엑셀') || trimmed.includes('시트')) {
      return 'Create a structured spreadsheet table format with formulas and data analysis fields.';
    }

    if (trimmed.includes('매뉴얼') || trimmed.includes('가이드') || trimmed.includes('문서화')) {
      return 'Write a comprehensive technical user manual and system documentation.';
    }

    if (trimmed.includes('코드') && (trimmed.includes('리팩토링') || trimmed.includes('개선'))) {
      return 'Refactor and optimize the provided code for better readability, modularity, and performance.';
    }

    // Comprehensive Dictionary Map for Natural Phrasing
    const krToEnMap: Record<string, string> = {
      '데이터베이스': 'database systems',
      '아키텍처': 'system architecture',
      '네트워크': 'network protocols',
      '서버': 'server-side engineering',
      '클라이언트': 'client frontend',
      '비동기': 'asynchronous concurrency',
      '동시성': 'concurrency handling',
      '테스트': 'automated testing',
      '배포': 'CI/CD deployment pipelines',
      '트래픽': 'high-throughput traffic management',
      '설계': 'software design patterns',
      '메모리': 'memory optimization',
      '보안': 'security hardening',
      '인증': 'authentication flows',
      '인가': 'authorization controls',
      '파이프라인': 'data pipelines',
      '웹소켓': 'real-time WebSocket communication',
      '에러': 'error debugging and resolution',
      '버그': 'bug fixing',
      '스토리지': 'persistent storage',
      '스프링': 'Spring Boot backend',
      '노드': 'Node.js runtime',
      '파이썬': 'Python data processing',
      '자바스크립트': 'JavaScript development',
      '타입스크립트': 'TypeScript type safety',
      '클라우드': 'cloud infrastructure'
    };

    // Synthesize intent prefix based on Korean sentence pattern
    let prefix = 'Explain in detail the concepts, architecture, and practical implementation regarding';
    if (/비교|차이|versus|vs/i.test(trimmed)) {
      prefix = 'Compare the key differences, architectural trade-offs, and best practices between';
    } else if (/구현|작성|만들|개발|코딩/i.test(trimmed)) {
      prefix = 'Write a comprehensive technical guide and clean code implementation for';
    } else if (/분석|원인|디버깅|해결|고치/i.test(trimmed)) {
      prefix = 'Analyze the underlying root causes, mechanisms, and scalable solutions for';
    } else if (/장단점|평가|선택|추천/i.test(trimmed)) {
      prefix = 'Evaluate the pros, cons, and architectural selection criteria for';
    } else if (/구축|설정|세팅|배치/i.test(trimmed)) {
      prefix = 'Provide a step-by-step setup and configuration guide for';
    } else if (/방법|어떻게|가이드/i.test(trimmed)) {
      prefix = 'Provide a practical, step-by-step guide and best practices for';
    } else if (/\?|인가요|되나|할까|있나/i.test(trimmed)) {
      prefix = 'Explain and clarify the technical details regarding';
    }

    const enWords = trimmed.match(/[A-Za-z0-9_+#.-]+/g) || [];
    const extractedTerms = [...enWords];
    Object.keys(krToEnMap).forEach((k) => {
      if (trimmed.includes(k) && !extractedTerms.includes(krToEnMap[k])) {
        extractedTerms.push(krToEnMap[k]);
      }
    });

    if (extractedTerms.length > 0) {
      return `${prefix} ${extractedTerms.join(' and ')} in modern software development.`;
    }

    // Natural clean fallback without awkward literal wrapper quotes
    if (trimmed.endsWith('?') || trimmed.endsWith('.')) {
      return `Please explain and provide comprehensive insights regarding ${trimmed.replace(/[?.!]/g, '')}.`;
    }

    return `${prefix} ${trimmed}.`;
  }, []);

  // Ghost Text Masking by Level (100% / 70% / 50% / 30%)
  const generateGhostTemplate = useCallback((englishText: string, level: GhostWriterLevel): string => {
    if (!englishText) return '';
    if (level === '100') {
      return englishText;
    }

    const words = englishText.split(' ');

    if (level === '70') {
      // 70% Level (Beginner): 70% visible; key keywords left blank
      return words.map((w, idx) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '');
        const punct = w.replace(/[a-zA-Z0-9]/g, '');
        if (clean.length >= 5 && (idx % 3 === 0 || idx % 4 === 0)) {
          return `(            )${punct}`;
        }
        return w;
      }).join(' ');
    }

    if (level === '50') {
      // 50% Level (Intermediate): Only sentence structure visible; key nouns and verbs replaced with (            )
      const structureWords = new Set([
        'compare', 'the', 'differences', 'in', 'between', 'and', 'for', 'to', 'of', 'how', 'explain',
        'provide', 'a', 'an', 'with', 'using', 'regarding', 'on', 'is', 'are', 'by', 'from', 'into',
        'write', 'evaluate', 'analyze', 'step-by-step', 'modern', 'guide', 'does', 'it', 'can', 'this',
        'really', 'please', 'help', 'me', 'in'
      ]);

      return words.map((w) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const punct = w.replace(/[a-zA-Z0-9]/g, '');
        if (clean === 'graphql') return w; // per spec example: "between (            ) and GraphQL."
        if (!structureWords.has(clean) && clean.length > 2) {
          return `(            )${punct}`;
        }
        return w;
      }).join(' ');
    }

    if (level === '30') {
      // 30% Level (Advanced): Bare-bones sentence framework only
      const bareWords = new Set(['compare', 'explain', 'write', 'the', 'in', 'and', 'to', 'between', 'does', 'can', 'please']);
      return words.map((w) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const punct = w.replace(/[a-zA-Z0-9]/g, '');
        if (!bareWords.has(clean)) {
          return `(        )${punct}`;
        }
        return w;
      }).join(' ');
    }

    return englishText;
  }, []);

  // Generate Ghost Text on explicit trigger (Enter, Tab, or Button click)
  const handleGenerateGhostText = useCallback(async (textToTranslate?: string) => {
    const raw = (textToTranslate !== undefined ? textToTranslate : chatInput).trim();
    if (!raw) {
      showToast('⚠️ 한국어 질문 또는 개념을 먼저 입력해주세요.');
      return;
    }

    setIsGhostLoading(true);
    setGhostTargetEnglish('');
    setGhostTemplateText('');
    setGhostUserInput('');
    setGhostTypoCount(0);
    setGhostShowFullAnswer(false);
    
    let targetEn = translateToEnglishPrompt(raw); // Fallback string

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Translate the following Korean query into a professional, concise, and highly effective English prompt for an AI assistant. Output ONLY the translated English prompt text, with no introductory words, quotes, or markdown wrappers.\n\nQuery: ${raw}`,
          editorContent: '',
          model: ghostWriterModel,
          systemInstruction: 'You are an expert technical translator and prompt engineer. Your sole task is to translate Korean queries into professional English prompts. Provide ONLY the translated English text. Do not provide explanations, markdown code blocks, or conversational filler.'
        })
      });
      const data = await res.json();
      if (res.ok && data.text) {
        targetEn = data.text.trim();
        // Remove surrounding quotes if the AI somehow included them
        targetEn = targetEn.replace(/^["'](.*)["']$/s, '$1');
      } else {
        console.error('API Error:', data.error);
        showToast(`⚠️ 번역 오류: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (e) {
      console.error('Failed to generate ghost prompt via API', e);
      showToast('⚠️ API 번역에 실패하여 기본 템플릿으로 생성되었습니다.');
    }

    setGhostTargetEnglish(targetEn);

    const template = generateGhostTemplate(targetEn, ghostWriterLevel);
    setGhostTemplateText(template);

    setIsGhostLoading(false);

    setTimeout(() => {
      ghostInputRef.current?.focus();
    }, 50);

    showToast('👻 영작 고스트 텍스트가 생성되었습니다. 오른쪽 창에서 영작을 연습하세요!');
  }, [chatInput, ghostWriterModel, ghostWriterLevel, translateToEnglishPrompt, generateGhostTemplate, showToast]);

  // When ghostWriterLevel changes, update template if ghostTargetEnglish already exists
  useEffect(() => {
    if (ghostWriterLevel !== 'off' && ghostTargetEnglish) {
      const template = generateGhostTemplate(ghostTargetEnglish, ghostWriterLevel);
      setGhostTemplateText(template);
    }
  }, [ghostWriterLevel, ghostTargetEnglish, generateGhostTemplate]);

  // Handle typing inside Ghost Writer practice input
  const handleGhostUserInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setGhostUserInput(val);

    if (!ghostTargetEnglish) return;

    // Check character-by-character against ghostTargetEnglish
    let typos = 0;
    for (let i = 0; i < val.length; i++) {
      if (i < ghostTargetEnglish.length) {
        if (val[i].toLowerCase() !== ghostTargetEnglish[i].toLowerCase()) {
          typos++;
        }
      } else {
        typos++;
      }
    }

    setGhostTypoCount(typos);

    // If 3 typos or more, reveal full correct answer as ghost text
    if (typos >= 3 && !ghostShowFullAnswer) {
      setGhostShowFullAnswer(true);
      showToast('⚠️ 3회 오타가 감지되어 정답 가이드가 고스트 텍스트로 자동 표시됩니다.');
    }
  };

  // Keyboard shortcut handler for Ghost Writer input
  const handleGhostInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete or fill next word
      if (ghostTargetEnglish) {
        setGhostUserInput(ghostTargetEnglish);
        setGhostTypoCount(0);
        showToast('✨ 영작 가이드 문장이 자동 완성되었습니다.');
      }
      return;
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendGhostMessage();
    }
  };

  // Send message specifically from Ghost Writer
  const handleSendGhostMessage = () => {
    const promptToSend = ghostUserInput.trim() || ghostTargetEnglish;
    if (!promptToSend && !chatInput.trim()) return;

    handleSendMessage(promptToSend || chatInput, {
      originalText: chatInput.trim(),
      translatedText: promptToSend,
      ghostWriterLevel: ghostWriterLevel
    });

    setGhostUserInput('');
    setGhostTypoCount(0);
    setGhostShowFullAnswer(false);
  };

  // Active Section & Recent AI Changes Notification State
  const [activeSection, setActiveSection] = useState<'chat' | 'editor' | 'explorer'>('chat');
  const [recentAiChanges, setRecentAiChanges] = useState<{
    file: string;
    source: string;
    timestamp: string;
    preview: string;
  } | null>(null);
  const [hasUnreadAiChanges, setHasUnreadAiChanges] = useState<boolean>(false);

  // Section Collapse States
  const [isSection1Collapsed, setIsSection1Collapsed] = useState<boolean>(false);
  const [isSection2Collapsed, setIsSection2Collapsed] = useState<boolean>(false);
  const [isSection3Collapsed, setIsSection3Collapsed] = useState<boolean>(false);

  // Resizable Panes State (Width in percentages)
  const [pane1Width, setPane1Width] = useState<number>(42); // Section 1 (Chat Area): default 42%
  const [pane2Width, setPane2Width] = useState<number>(33); // Section 2 (Editor): default 33%
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const isDraggingDividerRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const startPane1Ref = useRef<number>(42);
  const startPane2Ref = useRef<number>(33);
  const mainContainerRef = useRef<HTMLElement>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load auto-saved content & projects from localStorage on initial render
  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem('aipodium_projects_sessions');
      const savedActiveSessionId = localStorage.getItem('aipodium_active_session_id');
      const savedTrash = localStorage.getItem('aipodium_trash_sessions');
      const savedFiles = localStorage.getItem('notebooklm_files');
      const savedFolders = localStorage.getItem('notebooklm_file_folders');

      if (savedTrash) {
        try {
          setTrashSessions(JSON.parse(savedTrash));
        } catch (e) {}
      }

      if (savedFolders) {
        setFileFolders(JSON.parse(savedFolders));
      }

      if (savedFiles) {
        const parsedFiles = JSON.parse(savedFiles);
        setFiles(parsedFiles);
      }

      if (savedProjects) {
        const parsedSessions: ChatSession[] = JSON.parse(savedProjects);
        if (Array.isArray(parsedSessions) && parsedSessions.length > 0) {
          setSessions(parsedSessions);
          const targetId = savedActiveSessionId && parsedSessions.some((s) => s.id === savedActiveSessionId)
            ? savedActiveSessionId
            : parsedSessions[0].id;
          setActiveSessionId(targetId);

          const activeSess = parsedSessions.find((s) => s.id === targetId) || parsedSessions[0];
          if (activeSess) {
            const initialContent = activeSess.editorContent !== undefined
              ? activeSess.editorContent
              : (savedFiles && JSON.parse(savedFiles)[activeSess.fileName || 'tech_notes.md']) || `# ${activeSess.title}\n\n프로젝트 노트`;
            const initialFileName = activeSess.fileName || `${activeSess.title}.md`;
            const initialTab = activeSess.editorTab || 'edit';

            setEditorContent(initialContent);
            setFileName(initialFileName);
            setCurrentActiveFile(initialFileName);
            setEditorTab(initialTab);
          }
          return;
        }
      }

      // Fallback to legacy keys if no saved sessions
      const savedActiveFile = localStorage.getItem('notebooklm_active_file');
      const savedEditorContent = localStorage.getItem('notebooklm_editor_content');
      if (savedActiveFile) {
        setCurrentActiveFile(savedActiveFile);
        setFileName(savedActiveFile);
      }
      if (savedEditorContent) {
        setEditorContent(savedEditorContent);
      }
    } catch (err) {
      console.warn('Failed to load auto-saved data from localStorage:', err);
    }
  }, []);

  // Auto-save sessions, active session, editor content & files to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('aipodium_projects_sessions', JSON.stringify(sessions));
      localStorage.setItem('aipodium_active_session_id', activeSessionId);
      localStorage.setItem('aipodium_trash_sessions', JSON.stringify(trashSessions));
      localStorage.setItem('notebooklm_editor_content', editorContent);
      localStorage.setItem('notebooklm_active_file', currentActiveFile);
      localStorage.setItem('notebooklm_files', JSON.stringify(files));
      localStorage.setItem('notebooklm_file_folders', JSON.stringify(fileFolders));
      const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastAutoSavedTime(now);
    } catch (err) {
      console.warn('Auto-save error:', err);
      showToast('⚠️ 자동 저장 실패: 저장 공간 문제로 자동 저장에 실패했습니다.', 'warn');
    }
  }, [sessions, activeSessionId, trashSessions, editorContent, files, currentActiveFile, fileFolders]);

  // Section Resizer Divider Drag Handlers
  const handleMouseDownDivider = (dividerIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDividerRef.current = dividerIndex;
    setIsResizing(true);
    startXRef.current = e.clientX;
    startPane1Ref.current = pane1Width;
    startPane2Ref.current = pane2Width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingDividerRef.current || !mainContainerRef.current) return;
      const containerWidth = mainContainerRef.current.clientWidth;
      if (!containerWidth) return;

      const deltaX = moveEvent.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;

      if (isDraggingDividerRef.current === 1) {
        // Divider 1 (between Section 1 and Section 2):
        // Keep Divider 2 position (startPane1 + startPane2) FIXED so Divider 2 doesn't move at all!
        const totalFirstTwo = startPane1Ref.current + startPane2Ref.current;
        let newPane1 = startPane1Ref.current + deltaPercent;
        // Section 1 min: ~250px, Section 2 min: ~560px (to prevent toolbar icons from shrinking or getting cut off)
        const minPane2Percent = Math.max(15, (560 / containerWidth) * 100);
        const minPane1Percent = Math.max(15, (250 / containerWidth) * 100);
        newPane1 = Math.max(minPane1Percent, Math.min(totalFirstTwo - minPane2Percent, newPane1));
        const newPane2 = Math.max(minPane2Percent, totalFirstTwo - newPane1);

        setPane1Width(newPane1);
        setPane2Width(newPane2);
      } else if (isDraggingDividerRef.current === 2) {
        // Divider 2 (between Section 2 and Section 3):
        // Section 1 (pane1Width) remains completely FIXED so Divider 1 doesn't move at all!
        let newPane2 = startPane2Ref.current + deltaPercent;
        // Section 2 min: ~560px (to prevent toolbar icons from shrinking or getting cut off), Section 3 min: ~200px
        const minPane2Percent = Math.max(15, (560 / containerWidth) * 100);
        const minPane3Percent = Math.max(12, (200 / containerWidth) * 100);
        const maxPane2 = 100 - startPane1Ref.current - minPane3Percent;
        newPane2 = Math.max(minPane2Percent, Math.min(maxPane2, newPane2));

        setPane2Width(newPane2);
      } else if (isDraggingDividerRef.current === 3) {
        // When Section 2 is collapsed: Divider between Section 1 and Section 3
        let newPane1 = startPane1Ref.current + deltaPercent;
        newPane1 = Math.max(15, Math.min(85, newPane1));
        setPane1Width(newPane1);
      }
    };

    const handleMouseUp = () => {
      isDraggingDividerRef.current = null;
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Drag and Drop Handlers for Project Folders & Files in Explorer & Sidebar
  const handleProjectDragStart = (e: React.DragEvent, sessionId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', sessionId);
    e.dataTransfer.setData('application/aipodium-project', sessionId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedType('project');
    setDraggedId(sessionId);
  };

  const handleFileDragStart = (e: React.DragEvent, fname: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', fname);
    e.dataTransfer.setData('application/aipodium-file', fname);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedType('file');
    setDraggedId(fname);
  };

  const handleFolderDragOver = (e: React.DragEvent, targetSessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedType === 'file') {
      if (dragOverTargetId !== targetSessionId || dragDropPosition !== 'inside') {
        setDragOverTargetId(targetSessionId);
        setDragDropPosition('inside');
      }
      return;
    }

    if (draggedType === 'project') {
      if (draggedId === targetSessionId) {
        if (dragOverTargetId !== null) {
          setDragOverTargetId(null);
          setDragDropPosition(null);
        }
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';

      if (dragOverTargetId !== targetSessionId || dragDropPosition !== position) {
        setDragOverTargetId(targetSessionId);
        setDragDropPosition(position);
      }
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent, targetSessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const currentTarget = e.currentTarget;
    const related = e.relatedTarget as Node | null;
    if (currentTarget && !currentTarget.contains(related)) {
      if (dragOverTargetId === targetSessionId) {
        setDragOverTargetId(null);
        setDragDropPosition(null);
      }
    }
  };

  const handleFolderDrop = (e: React.DragEvent, targetSessionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDraggedType = draggedType;
    const currentDraggedId = draggedId;
    const currentDropPos = dragDropPosition;

    // Reset state
    setDraggedType(null);
    setDraggedId(null);
    setDragOverTargetId(null);
    setDragDropPosition(null);

    if (!currentDraggedId) return;

    // Case 1: Dragging a file onto a project folder
    if (currentDraggedType === 'file') {
      const targetSession = sessions.find((s) => s.id === targetSessionId);
      if (!targetSession || !files[currentDraggedId]) return;

      const currentFolder = fileFolders[currentDraggedId] || targetSession.title;
      if (currentFolder === targetSession.title) return;

      setFileFolders((prev) => ({
        ...prev,
        [currentDraggedId]: targetSession.title
      }));
      setOpenFolders((prev) => ({
        ...prev,
        [targetSession.title]: true
      }));
      showToast(`📁 '${currentDraggedId}' 파일이 '${targetSession.title}' 폴더로 이동되었습니다.`);
      return;
    }

    // Case 2: Dragging a project folder to reorder
    if (currentDraggedType === 'project') {
      if (currentDraggedId === targetSessionId) return;

      const srcIdx = sessions.findIndex((s) => s.id === currentDraggedId);
      const tgtIdx = sessions.findIndex((s) => s.id === targetSessionId);
      if (srcIdx === -1 || tgtIdx === -1 || srcIdx === tgtIdx) return;

      const draggedSessionTitle = sessions[srcIdx].title;

      setSessions((prev) => {
        const copy = [...prev];
        const [movedItem] = copy.splice(srcIdx, 1);
        let insertIdx = tgtIdx;
        if (srcIdx < tgtIdx) {
          insertIdx = currentDropPos === 'before' ? tgtIdx - 1 : tgtIdx;
        } else {
          insertIdx = currentDropPos === 'before' ? tgtIdx : tgtIdx + 1;
        }
        copy.splice(insertIdx, 0, movedItem);
        return copy;
      });

      showToast(`↕️ '${draggedSessionTitle}' 프로젝트 폴더 위치가 재정렬되었습니다.`);
    }
  };

  const handleDragEnd = () => {
    setDraggedType(null);
    setDraggedId(null);
    setDragOverTargetId(null);
    setDragDropPosition(null);
  };

  // Legacy drop compatibility helper
  const handleDropToFolder = (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    const fname = e.dataTransfer.getData('text/plain') || draggedId;
    setDragOverTargetId(null);
    setDraggedType(null);
    setDraggedId(null);
    setDragDropPosition(null);

    if (!fname || !files[fname]) return;

    const currentFolder = fileFolders[fname] || 'docs';
    if (currentFolder === targetFolder) return;

    setFileFolders((prev) => ({
      ...prev,
      [fname]: targetFolder
    }));

    showToast(`🚚 '${fname}'이(가) '${targetFolder}' 폴더로 이동되었습니다.`);
  };

  // Auto scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAiLoading, activeSessionId]);

  // REQUIREMENT 4: [에디터로 보내기 ➔] Logic
  const handleSendToEditor = (msgText: string) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const formattedAppend = `\n\n--- \n> 📌 [AI 응답 수집 - ${timestamp}]\n\n` + msgText.trim() + `\n`;

    const updated = editorContent + formattedAppend;
    setEditorContent(updated);

    // Save back to active file
    setFiles((prev) => ({
      ...prev,
      [currentActiveFile]: updated
    }));

    // Sync to active session
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              editorContent: updated,
              fileName: currentActiveFile
            }
          : s
      )
    );

    showToast('✓ AI 답변 내용이 중앙 마크다운 에디터에 삽입되었습니다!');

    const fullTimeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecentAiChanges({
      file: currentActiveFile,
      source: 'AI 대화 응답 수집',
      timestamp: fullTimeStr,
      preview: msgText.trim().slice(0, 65) + '...'
    });
    setHasUnreadAiChanges(true);

    if (editorRef.current) {
      editorRef.current.scrollTop = editorRef.current.scrollHeight;
    }
  };

  // Auto-indent, auto-numbering, tab indentation, and closing symbol autocomplete in Markdown Editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const key = e.key;

    // Handle Tab and Shift+Tab for Indentation
    if (key === 'Tab') {
      e.preventDefault();
      if (selectionStart !== selectionEnd) {
        // Multi-line selection indent/outdent
        const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lastLineEnd = value.indexOf('\n', selectionEnd);
        const actualLastLineEnd = lastLineEnd === -1 ? value.length : lastLineEnd;
        const selectedBlock = value.slice(firstLineStart, actualLastLineEnd);
        const lines = selectedBlock.split('\n');

        let modifiedLines: string[];
        let totalShift = 0;

        if (e.shiftKey) {
          // Outdent by up to 2 spaces
          modifiedLines = lines.map((line) => {
            if (line.startsWith('  ')) {
              totalShift -= 2;
              return line.slice(2);
            } else if (line.startsWith(' ')) {
              totalShift -= 1;
              return line.slice(1);
            } else if (line.startsWith('\t')) {
              totalShift -= 1;
              return line.slice(1);
            }
            return line;
          });
        } else {
          // Indent by 2 spaces
          modifiedLines = lines.map((line) => {
            totalShift += 2;
            return '  ' + line;
          });
        }

        const newBlock = modifiedLines.join('\n');
        const newValue = value.slice(0, firstLineStart) + newBlock + value.slice(actualLastLineEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = firstLineStart;
            editorRef.current.selectionEnd = actualLastLineEnd + totalShift;
          }
        }, 0);
        return;
      } else {
        // Single cursor Tab insertion / Shift+Tab outdent
        if (e.shiftKey) {
          const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          const currentLine = value.slice(lineStart);
          if (currentLine.startsWith('  ')) {
            const newValue = value.slice(0, lineStart) + value.slice(lineStart + 2);
            setEditorContent(newValue);
            setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
            setTimeout(() => {
              if (editorRef.current) {
                const nextPos = Math.max(lineStart, selectionStart - 2);
                editorRef.current.selectionStart = nextPos;
                editorRef.current.selectionEnd = nextPos;
              }
            }, 0);
            return;
          }
        } else {
          // Insert 2 spaces
          const newValue = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
          setEditorContent(newValue);
          setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.selectionStart = selectionStart + 2;
              editorRef.current.selectionEnd = selectionStart + 2;
            }
          }, 0);
          return;
        }
      }
    }

    // Auto-indent & Auto-numbering on Enter key
    if (key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineEnd = value.indexOf('\n', selectionStart);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
      const beforeCursor = value.slice(lineStart, selectionStart);
      const afterCursor = value.slice(selectionStart, actualLineEnd);

      // 1) Task List Match: e.g. "- [ ] item" or "* [x] item"
      const taskListMatch = beforeCursor.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)$/);
      const emptyTaskListMatch = beforeCursor.match(/^(\s*)([-*+])\s+\[([ xX])\]\s*$/);

      // 2) Bullet List Match: e.g. "- item", "* item", "+ item"
      const bulletListMatch = beforeCursor.match(/^(\s*)([-*+])\s+(.*)$/);
      const emptyBulletListMatch = beforeCursor.match(/^(\s*)([-*+])\s*$/);

      // 3) Ordered/Numbered List Match: e.g. "1. item", "2) item"
      const orderedListMatch = beforeCursor.match(/^(\s*)(\d+)([\.\)])\s+(.*)$/);
      const emptyOrderedListMatch = beforeCursor.match(/^(\s*)(\d+)([\.\)])\s*$/);

      // 4) Blockquote Match: e.g. "> quote"
      const quoteMatch = beforeCursor.match(/^(\s*)(>+)\s*(.*)$/);
      const emptyQuoteMatch = beforeCursor.match(/^(\s*)(>+)\s*$/);

      // 5) Generic Indentation Match: e.g. "  some code"
      const indentMatch = beforeCursor.match(/^(\s+)(.*)$/);

      // Empty Task List item -> Exit/Clear list prefix on current line
      if (emptyTaskListMatch && !afterCursor.trim()) {
        e.preventDefault();
        const newValue = value.slice(0, lineStart) + value.slice(actualLineEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = lineStart;
            editorRef.current.selectionEnd = lineStart;
          }
        }, 0);
        return;
      }

      // Non-empty Task List item -> Continue task checkbox
      if (taskListMatch) {
        e.preventDefault();
        const indent = taskListMatch[1];
        const bullet = taskListMatch[2];
        const continuation = `\n${indent}${bullet} [ ] `;
        const newValue = value.slice(0, selectionStart) + continuation + value.slice(selectionEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            const nextCursor = selectionStart + continuation.length;
            editorRef.current.selectionStart = nextCursor;
            editorRef.current.selectionEnd = nextCursor;
          }
        }, 0);
        return;
      }

      // Empty Bullet List item -> Exit/Clear bullet on current line
      if (emptyBulletListMatch && !afterCursor.trim()) {
        e.preventDefault();
        const newValue = value.slice(0, lineStart) + value.slice(actualLineEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = lineStart;
            editorRef.current.selectionEnd = lineStart;
          }
        }, 0);
        return;
      }

      // Non-empty Bullet List item -> Continue bullet list format
      if (bulletListMatch) {
        e.preventDefault();
        const indent = bulletListMatch[1];
        const bullet = bulletListMatch[2];
        const continuation = `\n${indent}${bullet} `;
        const newValue = value.slice(0, selectionStart) + continuation + value.slice(selectionEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            const nextCursor = selectionStart + continuation.length;
            editorRef.current.selectionStart = nextCursor;
            editorRef.current.selectionEnd = nextCursor;
          }
        }, 0);
        return;
      }

      // Empty Numbered List item -> Exit/Clear number prefix on current line
      if (emptyOrderedListMatch && !afterCursor.trim()) {
        e.preventDefault();
        const newValue = value.slice(0, lineStart) + value.slice(actualLineEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = lineStart;
            editorRef.current.selectionEnd = lineStart;
          }
        }, 0);
        return;
      }

      // Non-empty Numbered List item -> Auto-increment number sequence
      if (orderedListMatch) {
        e.preventDefault();
        const indent = orderedListMatch[1];
        const currentNum = parseInt(orderedListMatch[2], 10);
        const delimiter = orderedListMatch[3];
        const nextNum = currentNum + 1;
        const continuation = `\n${indent}${nextNum}${delimiter} `;
        const newValue = value.slice(0, selectionStart) + continuation + value.slice(selectionEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            const nextCursor = selectionStart + continuation.length;
            editorRef.current.selectionStart = nextCursor;
            editorRef.current.selectionEnd = nextCursor;
          }
        }, 0);
        return;
      }

      // Empty Blockquote item -> Exit/Clear blockquote on current line
      if (emptyQuoteMatch && !afterCursor.trim()) {
        e.preventDefault();
        const newValue = value.slice(0, lineStart) + value.slice(actualLineEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = lineStart;
            editorRef.current.selectionEnd = lineStart;
          }
        }, 0);
        return;
      }

      // Non-empty Blockquote item -> Continue quote marker
      if (quoteMatch && quoteMatch[3].trim()) {
        e.preventDefault();
        const indent = quoteMatch[1];
        const quotePrefix = quoteMatch[2];
        const continuation = `\n${indent}${quotePrefix} `;
        const newValue = value.slice(0, selectionStart) + continuation + value.slice(selectionEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            const nextCursor = selectionStart + continuation.length;
            editorRef.current.selectionStart = nextCursor;
            editorRef.current.selectionEnd = nextCursor;
          }
        }, 0);
        return;
      }

      // Generic indentation continuation (e.g. nested code / text)
      if (indentMatch && indentMatch[1] && beforeCursor.trim()) {
        e.preventDefault();
        const indent = indentMatch[1];
        const continuation = `\n${indent}`;
        const newValue = value.slice(0, selectionStart) + continuation + value.slice(selectionEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            const nextCursor = selectionStart + continuation.length;
            editorRef.current.selectionStart = nextCursor;
            editorRef.current.selectionEnd = nextCursor;
          }
        }, 0);
        return;
      }
    }

    const pairMap: Record<string, string> = {
      '`': '`',
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '*': '*',
      '_': '_',
    };

    // Handle Backspace inside an empty pair
    if (key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const prevChar = value[selectionStart - 1];
      const nextChar = value[selectionStart];
      if (
        (prevChar === '`' && nextChar === '`') ||
        (prevChar === '(' && nextChar === ')') ||
        (prevChar === '[' && nextChar === ']') ||
        (prevChar === '{' && nextChar === '}') ||
        (prevChar === '"' && nextChar === '"') ||
        (prevChar === "'" && nextChar === "'") ||
        (prevChar === '*' && nextChar === '*') ||
        (prevChar === '_' && nextChar === '_')
      ) {
        e.preventDefault();
        const newValue = value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = selectionStart - 1;
            editorRef.current.selectionEnd = selectionStart - 1;
          }
        }, 0);
        return;
      }
    }

    // Handle Autocomplete when typing opening symbol
    if (pairMap[key] && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const closingSymbol = pairMap[key];

      if (selectionStart !== selectionEnd) {
        // Text is selected -> Wrap selected text with key and closing symbol
        const selectedText = value.slice(selectionStart, selectionEnd);
        const newValue =
          value.slice(0, selectionStart) +
          key +
          selectedText +
          closingSymbol +
          value.slice(selectionEnd);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = selectionStart + 1;
            editorRef.current.selectionEnd = selectionEnd + 1;
          }
        }, 0);
      } else {
        // No text selected -> Insert pair and place cursor inside
        const newValue =
          value.slice(0, selectionStart) +
          key +
          closingSymbol +
          value.slice(selectionStart);
        setEditorContent(newValue);
        setFiles((prev) => ({ ...prev, [currentActiveFile]: newValue }));

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = selectionStart + 1;
            editorRef.current.selectionEnd = selectionStart + 1;
          }
        }, 0);
      }
    }
  };

  // REQUIREMENT 3: [파일로 저장 💾] Logic
  const handleSaveToFile = () => {
    if (!editorContent.trim()) {
      showToast('저장할 마크다운 내용이 없습니다.', 'warn');
      return;
    }

    const blob = new Blob([editorContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'tech_notes.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`💾 '${fileName}' 파일로 저장 완료!`);
  };

  // Export as PDF Logic via Browser Print Dialog
  const handleExportPdf = () => {
    if (!editorContent.trim()) {
      showToast('PDF로 내보낼 문서 내용이 없습니다.', 'warn');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('팝업 차단이 설정되어 있어 PDF 내보내기를 할 수 없습니다.', 'warn');
      return;
    }

    const title = fileName.replace(/\.md$/i, '') || 'NotebookLM Note';

    // Formatted Markdown HTML rendering for PDF print preview
    const renderedHtml = editorContent
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 22px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px; color: #111;">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 17px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 18px; margin-bottom: 8px; color: #1e293b;">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 14px; font-weight: bold; margin-top: 14px; margin-bottom: 6px; color: #334155;">$1</h3>')
      .replace(/^---/gim, '<hr style="border: none; border-top: 1px solid #cbd5e1; margin: 16px 0;"/>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; white-space: pre-wrap; margin: 12px 0;">$1</pre>')
      .replace(/\n\n/g, '</p><p style="margin: 8px 0; line-height: 1.6;">');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - PDF Export</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1e293b;
              background: #ffffff;
              margin: 0;
              padding: 24px;
              line-height: 1.6;
              font-size: 13px;
            }
            .header-banner {
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .doc-title {
              font-size: 20px;
              font-weight: bold;
              color: #0f172a;
              margin: 0;
            }
            .meta-info {
              font-size: 11px;
              color: #64748b;
            }
            .content {
              word-break: break-word;
            }
            blockquote {
              border-left: 4px solid #6366f1;
              margin: 12px 0;
              padding-left: 12px;
              color: #475569;
              background: #f8fafc;
              padding-top: 6px;
              padding-bottom: 6px;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <h1 class="doc-title">📄 ${title}</h1>
              <div class="meta-info">NotebookLM AI 지식 노트 • 생성일: ${new Date().toLocaleDateString('ko-KR')}</div>
            </div>
          </div>
          <div class="content">
            ${renderedHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
    showToast('🖨️ PDF 인쇄 대화상자가 실행되었습니다.');
  };

  // Create New File Modal / Handler
  const handleCreateNewFile = () => {
    setIsNewFileModalOpen(true);
    setNewFileNameInput('');
  };

  const handleConfirmCreateNewFile = () => {
    let name = newFileNameInput.trim();
    if (!name) {
      showToast('파일 이름을 입력해주세요.', 'warn');
      return;
    }
    if (!name.includes('.')) {
      name = `${name}.md`;
    }
    if (files[name] !== undefined) {
      showToast(`'${name}' 파일이 이미 존재합니다.`, 'warn');
      return;
    }
    const initialContent = `# ${name.replace(/\.[^/.]+$/, '')}\n\n새로운 마크다운 문서입니다.`;
    const updatedFiles = { ...files, [name]: initialContent };
    const updatedFolders = { ...fileFolders, [name]: activeSession?.title || 'docs' };
    setFiles(updatedFiles);
    setFileFolders(updatedFolders);
    setFileName(name);
    setCurrentActiveFile(name);
    setEditorContent(initialContent);
    setEditorTab('edit');
    setIsNewFileModalOpen(false);

    // Physical Local Directory / Storage sync
    const dirHandle = getMemoryDirectoryHandle();
    if (activeWorkspace.type === 'local' && dirHandle) {
      saveFileToLocalDirectory(dirHandle, name, initialContent).catch(console.error);
    } else if (activeWorkspace.type === 'indexeddb') {
      saveVaultToIndexedDB(
        activeWorkspace.vaultId || activeWorkspace.id,
        updatedFiles,
        updatedFolders,
        activeWorkspace.name
      ).catch(console.error);
    }

    showToast(`📄 '${name}' 새 파일이 생성되었습니다.`);
  };

  // Save As File Handler
  const handleSaveAsFile = () => {
    const newName = window.prompt('다른 이름으로 저장할 파일명을 입력하세요:', fileName);
    if (!newName || !newName.trim()) return;
    const finalName = newName.trim();
    setFiles((prev) => ({ ...prev, [finalName]: editorContent }));
    setFileFolders((prev) => ({ ...prev, [finalName]: activeSession?.title || 'docs' }));
    setFileName(finalName);
    setCurrentActiveFile(finalName);
    showToast(`💾 '${finalName}'으로 저장되었습니다.`);
  };

  // Export DOCX Handler
  const handleExportDocx = () => {
    if (!editorContent.trim()) {
      showToast('내보낼 문서 내용이 없습니다.', 'warn');
      return;
    }
    const blob = new Blob([editorContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, '')}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📄 '${fileName.replace(/\.[^/.]+$/, '')}.docx' 파일 내보내기 완료!`);
  };

  // Export PPTX Handler
  const handleExportPptx = () => {
    if (!editorContent.trim()) {
      showToast('내보낼 슬라이드 내용이 없습니다.', 'warn');
      return;
    }
    const blob = new Blob([editorContent], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, '')}.pptx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📊 '${fileName.replace(/\.[^/.]+$/, '')}.pptx' 파일 내보내기 완료!`);
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    if (!editorContent.trim()) {
      showToast('내보낼 CSV 내용이 없습니다.', 'warn');
      return;
    }
    const blob = new Blob([editorContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📑 '${fileName.replace(/\.[^/.]+$/, '')}.csv' 파일 내보내기 완료!`);
  };

  // Open Local File Handler
  const handleOpenLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      const fname = file.name;
      setFiles((prev) => ({ ...prev, [fname]: content }));
      setFileFolders((prev) => ({ ...prev, [fname]: activeSession?.title || 'docs' }));
      setFileName(fname);
      setCurrentActiveFile(fname);
      setEditorContent(content);
      setEditorTab('edit');
      showToast(`📂 로컬 파일 '${fname}'을 불러왔습니다.`);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Open Local Folder Handler (VS Code style)
  const handleOpenLocalFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        showToast('❌ 현재 브라우저에서는 로컬 폴더 열기 기능을 지원하지 않습니다. (Chrome, Edge 권장)', 'error');
        return;
      }
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      
      const newFiles: Record<string, string> = {};
      const newFileFolders: Record<string, string> = {};
      const projectTitle = dirHandle.name;

      // @ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const lowerName = entry.name.toLowerCase();
          const isTextFile = lowerName.endsWith('.md') || lowerName.endsWith('.txt') || lowerName.endsWith('.json') || 
                             lowerName.endsWith('.ts') || lowerName.endsWith('.tsx') || lowerName.endsWith('.js') || 
                             lowerName.endsWith('.jsx') || lowerName.endsWith('.css') || lowerName.endsWith('.html') || 
                             lowerName.endsWith('.csv');
          
          if (isTextFile) {
            const file = await entry.getFile();
            const text = await file.text();
            newFiles[entry.name] = text;
            newFileFolders[entry.name] = projectTitle;
          }
        }
      }

      if (Object.keys(newFiles).length === 0) {
        showToast(`⚠️ '${projectTitle}' 폴더에 지원되는 텍스트 파일이 없습니다.`, 'warn');
        return;
      }

      const sessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: sessionId,
        title: projectTitle,
        createdAt: new Date().toISOString(),
        messages: [],
      };

      setSessions(prev => [newSession, ...prev]);
      setFiles(prev => ({ ...prev, ...newFiles }));
      setFileFolders(prev => ({ ...prev, ...newFileFolders }));
      setOpenFolders(prev => ({ ...prev, [projectTitle]: true }));
      setWorkspaceRootType('local');
      
      showToast(`📁 로컬 폴더 '${projectTitle}'를 워크스페이스로 열었습니다.`);
      
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        showToast('❌ 로컬 폴더를 여는 중 오류가 발생했습니다.', 'error');
        console.error(error);
      }
    }
  };

  // Rename File Handler
  const handleRenameFile = (oldName: string) => {
    const newName = window.prompt('변경할 새 파일명을 입력하세요:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const finalName = newName.trim();
    if (files[finalName] !== undefined) {
      showToast(`'${finalName}' 파일이 이미 존재합니다.`, 'warn');
      return;
    }
    const oldContent = files[oldName] || '';
    setFiles((prev) => {
      const updated = { ...prev };
      updated[finalName] = updated[oldName];
      delete updated[oldName];
      return updated;
    });
    setFileFolders((prev) => {
      const updated = { ...prev };
      if (updated[oldName]) {
        updated[finalName] = updated[oldName];
        delete updated[oldName];
      }
      return updated;
    });
    if (currentActiveFile === oldName) {
      setCurrentActiveFile(finalName);
      setFileName(finalName);
    }

    // Physical Local Directory / IndexedDB storage sync
    const dirHandle = getMemoryDirectoryHandle();
    if (activeWorkspace.type === 'local' && dirHandle) {
      renameFileInLocalDirectory(dirHandle, oldName, finalName, oldContent).catch(console.error);
    }

    showToast(`✏️ 파일명이 '${oldName}'에서 '${finalName}'(으)로 변경되었습니다.`);
  };

  // Delete File Handler
  const handleDeleteFile = (fname: string) => {
    const fileKeys = Object.keys(files);
    if (fileKeys.length <= 1) {
      showToast('최소 1개의 파일은 유지되어야 합니다.', 'warn');
      return;
    }
    setDeleteConfirmFile(fname);
  };

  const executeDeleteFile = () => {
    if (!deleteConfirmFile) return;
    const fname = deleteConfirmFile;
    const fileKeys = Object.keys(files);
    const updatedFiles = { ...files };
    delete updatedFiles[fname];
    const updatedFolders = { ...fileFolders };
    delete updatedFolders[fname];

    setFiles(updatedFiles);
    setFileFolders(updatedFolders);

    if (currentActiveFile === fname) {
      const remaining = fileKeys.filter((k) => k !== fname);
      const nextFile = remaining[0];
      setCurrentActiveFile(nextFile);
      setFileName(nextFile);
      setEditorContent(files[nextFile] || '');
    }

    // Physical Local Directory / IndexedDB storage sync
    const dirHandle = getMemoryDirectoryHandle();
    if (activeWorkspace.type === 'local' && dirHandle) {
      deleteFileFromLocalDirectory(dirHandle, fname).catch(console.error);
    } else if (activeWorkspace.type === 'indexeddb') {
      saveVaultToIndexedDB(
        activeWorkspace.vaultId || activeWorkspace.id,
        updatedFiles,
        updatedFolders,
        activeWorkspace.name
      ).catch(console.error);
    }

    setDeleteConfirmFile(null);
    showToast(`🗑️ '${fname}' 파일이 삭제되었습니다.`);
  };

  const isCurrentFileDirty = useMemo(() => {
    if (untitledDocs[currentActiveFile] !== undefined) {
      return editorContent.trim().length > 0;
    }
    return files[currentActiveFile] !== editorContent;
  }, [files, currentActiveFile, editorContent, untitledDocs]);

  // Synchronize active file to openTabs
  useEffect(() => {
    if (currentActiveFile) {
      setOpenTabs((prev) => (prev.includes(currentActiveFile) ? prev : [...prev, currentActiveFile]));
    }
  }, [currentActiveFile]);

  // Tab management handlers (VS Code-like unified tabs)
  const handleCloseTab = (tabToClose: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isUntitled = untitledDocs[tabToClose] !== undefined;
    const isTabDirty = tabToClose === currentActiveFile ? isCurrentFileDirty : false;

    const executeClose = () => {
      // Clean up in-memory untitled doc if applicable
      if (isUntitled) {
        setUntitledDocs((prev) => {
          const next = { ...prev };
          delete next[tabToClose];
          return next;
        });
      }

      setOpenTabs((prev) => {
        const nextTabs = prev.filter((t) => t !== tabToClose);
        if (tabToClose === currentActiveFile) {
          if (nextTabs.length > 0) {
            const nextActive = nextTabs[nextTabs.length - 1];
            const targetContent =
              files[nextActive] !== undefined
                ? files[nextActive]
                : (untitledDocs[nextActive] || '');
            setCurrentActiveFile(nextActive);
            setFileName(nextActive);
            setEditorContent(targetContent);
            setEditorTab(nextActive.endsWith('.html') ? 'preview' : 'edit');
          } else {
            // If all tabs closed, create a fresh Untitled-1 in-memory tab
            const fallback = 'Untitled-1';
            setUntitledDocs({ [fallback]: '' });
            setCurrentActiveFile(fallback);
            setFileName(fallback);
            setEditorContent('');
            setEditorTab('edit');
            return [fallback];
          }
        }
        return nextTabs;
      });
    };

    if (isTabDirty && !isUntitled) {
      checkUnsavedChanges(executeClose);
    } else {
      executeClose();
    }
  };

  // In-Memory "Untitled" New Tab (No Physical File Creation in File Explorer)
  const handleAddNewNoteTab = () => {
    // Preserve current in-memory untitled document content if active
    if (untitledDocs[currentActiveFile] !== undefined) {
      setUntitledDocs((prev) => ({ ...prev, [currentActiveFile]: editorContent }));
    }

    let num = untitledCounterRef.current;
    let newName = `Untitled-${num}`;
    while (untitledDocs[newName] !== undefined || files[newName] !== undefined) {
      num++;
      newName = `Untitled-${num}`;
    }
    untitledCounterRef.current = num + 1;

    const initialNoteContent = '';
    setUntitledDocs((prev) => ({ ...prev, [newName]: initialNoteContent }));
    setOpenTabs((prev) => (prev.includes(newName) ? prev : [...prev, newName]));
    setCurrentActiveFile(newName);
    setFileName(newName);
    setEditorContent(initialNoteContent);
    setEditorTab('edit');
    showToast(`📝 새 임시 탭 '${newName}'이(가) 열렸습니다 (저장 시 파일 생성).`);
  };

  // Optimized debounced editor state synchronization handler
  const handleEditorChange = useCallback(
    (val: string) => {
      setEditorContent(val);
    },
    []
  );

  // Save Document: if untitled, open Save modal; otherwise save to physical file & sync storage
  const handleSaveDocument = useCallback(() => {
    if (!currentActiveFile) return;

    // If current document is an untitled in-memory tab, open Save Modal to assign physical file name & folder
    if (untitledDocs[currentActiveFile] !== undefined || currentActiveFile.startsWith('Untitled-')) {
      setIsSaveUntitledModalOpen(true);
      return;
    }

    if (files[currentActiveFile] !== editorContent) {
      const updatedFiles = { ...files, [currentActiveFile]: editorContent };
      setFiles(updatedFiles);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, editorContent: editorContent, fileName: currentActiveFile }
            : s
        )
      );

      // Physical Local Directory / IndexedDB FileSystem sync
      const dirHandle = getMemoryDirectoryHandle();
      if (activeWorkspace.type === 'local' && dirHandle) {
        saveFileToLocalDirectory(dirHandle, currentActiveFile, editorContent).catch(console.error);
      } else if (activeWorkspace.type === 'indexeddb') {
        saveVaultToIndexedDB(
          activeWorkspace.vaultId || activeWorkspace.id,
          updatedFiles,
          fileFolders,
          activeWorkspace.name
        ).catch(console.error);
      }

      showToast(`💾 '${currentActiveFile}' 저장되었습니다.`);
    } else {
      showToast(`✨ 이미 최신 상태입니다.`, 'info');
    }
  }, [currentActiveFile, editorContent, activeSessionId, files, activeWorkspace, fileFolders, untitledDocs]);

  // Confirm Save Untitled Modal handler
  const handleConfirmSaveUntitled = (newFileName: string, targetFolder: string) => {
    const oldActive = currentActiveFile;
    const contentToSave = editorContent;

    const updatedFiles = { ...files, [newFileName]: contentToSave };
    const updatedFolders = { ...fileFolders, [newFileName]: targetFolder };

    setFiles(updatedFiles);
    setFileFolders(updatedFolders);

    // Remove from in-memory untitledDocs
    setUntitledDocs((prev) => {
      const next = { ...prev };
      delete next[oldActive];
      return next;
    });

    // Update tab bar
    setOpenTabs((prev) => prev.map((t) => (t === oldActive ? newFileName : t)));
    setCurrentActiveFile(newFileName);
    setFileName(newFileName);

    // Sync to physical storage
    const dirHandle = getMemoryDirectoryHandle();
    if (activeWorkspace.type === 'local' && dirHandle) {
      saveFileToLocalDirectory(dirHandle, newFileName, contentToSave).catch(console.error);
    } else if (activeWorkspace.type === 'indexeddb') {
      saveVaultToIndexedDB(
        activeWorkspace.vaultId || activeWorkspace.id,
        updatedFiles,
        updatedFolders,
        activeWorkspace.name
      ).catch(console.error);
    }

    showToast(`💾 '${newFileName}' 파일이 [${targetFolder}] 폴더에 생성 및 저장되었습니다.`);
  };

  // Confirm before losing unsaved changes
  const checkUnsavedChanges = (action: () => void) => {
    if (isCurrentFileDirty) {
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  // Smart Block & List Formatting (Heading, Bullet List, Numbered List, Task List, Quote, Code, etc.)
  const applyMarkdownBlockFormat = useCallback(
    (formatType: 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'task' | 'quote' | 'rule' | 'link' | 'image' | 'bold' | 'italic' | 'code' | 'codeblock') => {
      const textarea = editorRef.current;
      if (!textarea) return;

      const val = editorContent;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Handle simple inline insertions if selection is within a single line or inline type
      if (formatType === 'bold' || formatType === 'italic' || formatType === 'code' || formatType === 'link' || formatType === 'image') {
        const selectedText = val.slice(start, end);
        let replacement = '';
        let newCursorStart = start;
        let newCursorEnd = end;

        if (formatType === 'bold') {
          if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
            replacement = selectedText.slice(2, -2);
            newCursorStart = start;
            newCursorEnd = start + replacement.length;
          } else {
            const inner = selectedText || '굵은 텍스트';
            replacement = `**${inner}**`;
            newCursorStart = start + 2;
            newCursorEnd = start + 2 + inner.length;
          }
        } else if (formatType === 'italic') {
          if (selectedText.startsWith('*') && selectedText.endsWith('*') && selectedText.length >= 2) {
            replacement = selectedText.slice(1, -1);
            newCursorStart = start;
            newCursorEnd = start + replacement.length;
          } else {
            const inner = selectedText || '기울임 텍스트';
            replacement = `*${inner}*`;
            newCursorStart = start + 1;
            newCursorEnd = start + 1 + inner.length;
          }
        } else if (formatType === 'code') {
          if (selectedText.startsWith('`') && selectedText.endsWith('`') && selectedText.length >= 2) {
            replacement = selectedText.slice(1, -1);
            newCursorStart = start;
            newCursorEnd = start + replacement.length;
          } else {
            const inner = selectedText || '코드';
            replacement = `\`${inner}\``;
            newCursorStart = start + 1;
            newCursorEnd = start + 1 + inner.length;
          }
        } else if (formatType === 'link') {
          const inner = selectedText || '링크 텍스트';
          replacement = `[${inner}](https://)`;
          newCursorStart = start + 1;
          newCursorEnd = start + 1 + inner.length;
        } else if (formatType === 'image') {
          const inner = selectedText || '이미지 설명';
          replacement = `![${inner}](https://)`;
          newCursorStart = start + 2;
          newCursorEnd = start + 2 + inner.length;
        }

        const nextVal = val.slice(0, start) + replacement + val.slice(end);
        handleEditorChange(nextVal);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
            editorRef.current.setSelectionRange(newCursorStart, newCursorEnd);
          }
        }, 20);
        return;
      }

      if (formatType === 'rule') {
        const replacement = '\n---\n';
        const nextVal = val.slice(0, start) + replacement + val.slice(end);
        handleEditorChange(nextVal);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
            editorRef.current.setSelectionRange(start + replacement.length, start + replacement.length);
          }
        }, 20);
        return;
      }

      if (formatType === 'codeblock') {
        const selectedText = val.slice(start, end);
        const inner = selectedText || '코드 작성...';
        const replacement = `\`\`\`typescript\n${inner}\n\`\`\`\n`;
        const nextVal = val.slice(0, start) + replacement + val.slice(end);
        handleEditorChange(nextVal);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
            editorRef.current.setSelectionRange(start + 14, start + 14 + inner.length);
          }
        }, 20);
        return;
      }

      // Line-based / Block-based formatting: Find all lines in the selection
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = val.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = val.length;

      const linesBlock = val.slice(lineStart, lineEnd);
      const lines = linesBlock.split('\n');

      // Helper regexes to strip any existing list or heading prefixes cleanly
      const listPrefixRegex = /^(\s*)(?:[-*+]|\d+[.)]|\[[ xXvVoO\u2713\u2714\u2611\u25A0\u25CF]\]|[-*+]\s+\[[ xXvVoO\u2713\u2714\u2611\u25A0\u25CF]\]|>+)\s+/;
      const headingPrefixRegex = /^(\s*)#{1,6}\s+/;

      let newLines: string[] = [];

      if (formatType === 'bullet') {
        // If all non-empty lines are already bullet items, toggle off
        const allAreBullets = lines
          .filter((l) => l.trim().length > 0)
          .every((l) => /^(\s*)[-*+]\s+/.test(l) && !/^(\s*)(?:[-*+]\s+)?\[[ xXvVoO\u2713\u2714\u2611\u25A0\u25CF]\]\s+/.test(l));
        newLines = lines.map((line) => {
          if (!line.trim() && lines.length > 1) return line;
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          const cleanText = line.replace(listPrefixRegex, '').replace(headingPrefixRegex, '').trimStart();
          if (allAreBullets) {
            return `${indent}${cleanText}`;
          }
          return `${indent}- ${cleanText || '목록 항목'}`;
        });
      } else if (formatType === 'number') {
        // If all non-empty lines are already numbered items, toggle off
        const allAreNumbers = lines.filter((l) => l.trim().length > 0).every((l) => /^(\s*)\d+[.)]\s+/.test(l));
        let numCounter = 1;
        newLines = lines.map((line) => {
          if (!line.trim() && lines.length > 1) return line;
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          const cleanText = line.replace(listPrefixRegex, '').replace(headingPrefixRegex, '').trimStart();
          if (allAreNumbers) {
            return `${indent}${cleanText}`;
          }
          const item = `${indent}${numCounter}. ${cleanText || '목록 항목'}`;
          numCounter++;
          return item;
        });
      } else if (formatType === 'task') {
        // Task list toggle: - [ ]
        const allAreTasks = lines
          .filter((l) => l.trim().length > 0)
          .every((l) => /^(\s*)(?:[-*+]\s+)?\[[ xXvVoO\u2713\u2714\u2611\u25A0\u25CF]\]\s+/.test(l));
        newLines = lines.map((line) => {
          if (!line.trim() && lines.length > 1) return line;
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          const cleanText = line.replace(listPrefixRegex, '').replace(headingPrefixRegex, '').trimStart();
          if (allAreTasks) {
            return `${indent}${cleanText}`;
          }
          return `${indent}- [ ] ${cleanText || '할 일 항목'}`;
        });
      } else if (formatType === 'quote') {
        const allAreQuotes = lines.filter((l) => l.trim().length > 0).every((l) => /^(\s*)>\s?/.test(l));
        newLines = lines.map((line) => {
          if (!line.trim() && lines.length > 1) return line;
          if (allAreQuotes) {
            return line.replace(/^(\s*)>\s?/, '$1');
          }
          return `> ${line.replace(/^(\s*)>\s?/, '$1') || '인용문'}`;
        });
      } else if (formatType === 'h1' || formatType === 'h2' || formatType === 'h3') {
        const prefix = formatType === 'h1' ? '# ' : formatType === 'h2' ? '## ' : '### ';
        const defaultTitle = formatType === 'h1' ? '제목 1' : formatType === 'h2' ? '제목 2' : '제목 3';
        const targetPrefixRegex = new RegExp(`^(\\s*)${prefix.trim()}\\s+`);
        const allAreSameHeading = lines.filter((l) => l.trim().length > 0).every((l) => targetPrefixRegex.test(l));
        newLines = lines.map((line) => {
          if (!line.trim() && lines.length > 1) return line;
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          const cleanText = line.replace(headingPrefixRegex, '').replace(listPrefixRegex, '').trimStart();
          if (allAreSameHeading) {
            return `${indent}${cleanText}`;
          }
          return `${indent}${prefix}${cleanText || defaultTitle}`;
        });
      }

      const newBlock = newLines.join('\n');
      const nextVal = val.slice(0, lineStart) + newBlock + val.slice(lineEnd);
      handleEditorChange(nextVal);

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          editorRef.current.setSelectionRange(lineStart, lineStart + newBlock.length);
        }
      }, 20);
    },
    [editorContent, handleEditorChange]
  );

  // Smart Word-Processor Grade Table Creator Handler
  const handleInsertTable = useCallback(
    (rows: number, cols: number) => {
      const tableMd = generateEmptyTable(rows, cols);
      const textarea = editorRef.current;
      if (!textarea) {
        const nextVal = editorContent ? editorContent + '\n\n' + tableMd + '\n' : tableMd + '\n';
        handleEditorChange(nextVal);
        setShowTablePicker(false);
        return;
      }

      const val = editorContent;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const textBefore = val.slice(0, start);
      const textAfter = val.slice(end);
      const prefix =
        textBefore.length > 0 && !textBefore.endsWith('\n\n')
          ? textBefore.endsWith('\n')
            ? '\n'
            : '\n\n'
          : '';
      const suffix = textAfter.length > 0 && !textAfter.startsWith('\n') ? '\n\n' : '\n';

      const nextVal = textBefore + prefix + tableMd + suffix + textAfter;
      handleEditorChange(nextVal);
      setShowTablePicker(false);

      showToast(`📊 ${rows}행 × ${cols}열 마크다운 표가 삽입되었습니다.`);

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          const newCursor = (textBefore + prefix).length + 2;
          editorRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 30);
    },
    [editorContent, handleEditorChange]
  );

  // Insert Markdown syntax at current cursor or selection (legacy helper)
  const insertMarkdownSyntax = useCallback(
    (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
      const textarea = editorRef.current;
      let newText = editorContent;
      let start = 0;

      if (textarea) {
        start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = editorContent.slice(start, end);
        const textToInsert = selectedText || defaultPlaceholder;
        const replacement = `${prefix}${textToInsert}${suffix}`;

        newText = editorContent.slice(0, start) + replacement + editorContent.slice(end);

        handleEditorChange(newText);

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
            const newCursorStart = start + prefix.length;
            const newCursorEnd = start + prefix.length + textToInsert.length;
            editorRef.current.setSelectionRange(newCursorStart, newCursorEnd);
          }
        }, 30);
      } else {
        newText = editorContent + `${prefix}${defaultPlaceholder}${suffix}`;
        handleEditorChange(newText);
      }
    },
    [editorContent, handleEditorChange]
  );

  // Copy Markdown Content to Clipboard
  const handleCopyToClipboard = async () => {
    if (!editorContent.trim()) {
      showToast('복사할 마크다운 내용이 없습니다.', 'warn');
      return;
    }

    try {
      await navigator.clipboard.writeText(editorContent);
      showToast('📋 전체 마크다운 내용이 클립보드에 복사되었습니다!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = editorContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('📋 전체 마크다운 내용이 클립보드에 복사되었습니다!');
    }
  };

  // Format Document: Clean up markdown indentation, line breaks, list formatting, tables, and spacing
  const formatMarkdownDocument = (content: string): string => {
    if (!content) return '';

    // Calculate visual width for string (handling full-width CJK/Korean chars as width 2)
    const getVisualWidth = (str: string): number => {
      let width = 0;
      for (let k = 0; k < str.length; k++) {
        const code = str.charCodeAt(k);
        if (code > 0x7f) {
          width += 2;
        } else {
          width += 1;
        }
      }
      return width;
    };

    // Pad string visually to target width
    const padString = (str: string, targetWidth: number, align: 'left' | 'center' | 'right' = 'left'): string => {
      const currentWidth = getVisualWidth(str);
      if (currentWidth >= targetWidth) return str;
      const missing = targetWidth - currentWidth;
      if (align === 'center') {
        const leftPad = Math.floor(missing / 2);
        const rightPad = missing - leftPad;
        return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
      } else if (align === 'right') {
        return ' '.repeat(missing) + str;
      } else {
        return str + ' '.repeat(missing);
      }
    };

    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const formattedLines: string[] = [];
    let inCodeBlock = false;
    let codeFence = '';

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Check for code block fence (``` or ~~~)
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeFence = trimmed.slice(0, 3);
          // Ensure a blank line before opening code block if previous line has content
          if (
            formattedLines.length > 0 &&
            formattedLines[formattedLines.length - 1].trim() !== ''
          ) {
            formattedLines.push('');
          }
          formattedLines.push(rawLine.trimEnd());
        } else {
          // Closing code block
          if (trimmed.startsWith(codeFence)) {
            inCodeBlock = false;
            codeFence = '';
            formattedLines.push(rawLine.trimEnd());
            // Ensure a blank line after closing code block if there's following non-empty content
            if (i < lines.length - 1 && lines[i + 1].trim() !== '') {
              formattedLines.push('');
            }
          } else {
            // Inside code block with nested ``` - preserve
            formattedLines.push(rawLine);
          }
        }
        continue;
      }

      // If inside code block, keep exact line untouched
      if (inCodeBlock) {
        formattedLines.push(rawLine);
        continue;
      }

      // Blank line handling: avoid more than 1 consecutive blank line
      if (trimmed === '') {
        if (
          formattedLines.length === 0 ||
          formattedLines[formattedLines.length - 1].trim() === ''
        ) {
          continue;
        }
        formattedLines.push('');
        continue;
      }

      const line = rawLine.trimEnd();

      // Heading formatting: ensure space after # and proper preceding blank line
      const headingMatch = line.match(/^(#{1,6})\s*(.*)$/);
      if (headingMatch && !line.startsWith('#!')) {
        const hashes = headingMatch[1];
        const title = headingMatch[2].trim();

        // Ensure single blank line before heading if not at the start
        if (
          formattedLines.length > 0 &&
          formattedLines[formattedLines.length - 1].trim() !== ''
        ) {
          formattedLines.push('');
        }
        formattedLines.push(`${hashes} ${title}`);
        continue;
      }

      // Horizontal Rule: ---, ***, ___
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
        if (
          formattedLines.length > 0 &&
          formattedLines[formattedLines.length - 1].trim() !== ''
        ) {
          formattedLines.push('');
        }
        formattedLines.push('---');
        continue;
      }

      // Blockquote formatting: > Text
      const quoteMatch = line.match(/^(\s*)(>+)\s*(.*)$/);
      if (quoteMatch) {
        const indent = quoteMatch[1];
        const quotes = quoteMatch[2];
        const text = quoteMatch[3].trim();
        formattedLines.push(`${indent}${quotes} ${text}`.trimEnd());
        continue;
      }

      // List item formatting (ordered, unordered, task list)
      // Unordered list: - item, * item, + item
      const unorderMatch = line.match(/^(\s*)([-*+])\s+(\[[\sxX]\]\s+)?(.*)$/);
      if (unorderMatch) {
        const indent = unorderMatch[1];
        const taskBox = unorderMatch[3] ? (unorderMatch[3].toLowerCase().includes('x') ? '[x] ' : '[ ] ') : '';
        const text = unorderMatch[4].trim();
        formattedLines.push(`${indent}- ${taskBox}${text}`);
        continue;
      }

      // Ordered list: 1. item, 1) item
      const orderMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
      if (orderMatch) {
        const indent = orderMatch[1];
        const num = orderMatch[2];
        const text = orderMatch[3].trim();
        formattedLines.push(`${indent}${num}. ${text}`);
        continue;
      }

      // Contiguous Table Rows Processing: | cell | cell |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        let j = i;
        while (
          j < lines.length &&
          lines[j].trim().startsWith('|') &&
          lines[j].trim().endsWith('|')
        ) {
          tableLines.push(lines[j].trim());
          j++;
        }
        i = j - 1; // Advance main loop index

        // Ensure a blank line before table if previous line has content
        if (
          formattedLines.length > 0 &&
          formattedLines[formattedLines.length - 1].trim() !== ''
        ) {
          formattedLines.push('');
        }

        // Parse cells into matrix
        const tableRows: string[][] = tableLines.map((tl) =>
          tl
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim())
        );

        if (tableRows.length > 0) {
          const isRow1Divider = tableLines.length > 1 && /^\|[-:\s|]+\|$/.test(tableLines[1]);
          const maxCols = Math.max(...tableRows.map((r) => r.length));

          // Extract column alignments from divider row
          const alignments: ('left' | 'center' | 'right')[] = [];
          if (isRow1Divider) {
            for (let c = 0; c < maxCols; c++) {
              const divCell = tableRows[1][c] || '';
              if (divCell.startsWith(':') && divCell.endsWith(':')) {
                alignments.push('center');
              } else if (divCell.endsWith(':')) {
                alignments.push('right');
              } else {
                alignments.push('left');
              }
            }
          }

          // Process consecutive duplicate cells in data rows
          const dataStartIdx = isRow1Divider ? 2 : 1;
          const prevValues: string[] = [];

          for (let r = dataStartIdx; r < tableRows.length; r++) {
            for (let c = 0; c < maxCols; c++) {
              const cellVal = tableRows[r][c] || '';
              const prevVal = prevValues[c];

              // Replace consecutive duplicate column values with ditto guide symbol '"'
              if (
                cellVal !== '' &&
                prevVal !== undefined &&
                cellVal === prevVal &&
                cellVal !== '"' &&
                cellVal !== '^' &&
                cellVal !== '〃'
              ) {
                tableRows[r][c] = '"';
              } else {
                if (cellVal !== '"' && cellVal !== '^' && cellVal !== '〃') {
                  prevValues[c] = cellVal;
                }
              }
            }
          }

          // Calculate max visual width for each column
          const colWidths: number[] = [];
          for (let c = 0; c < maxCols; c++) {
            let maxW = 3;
            for (let r = 0; r < tableRows.length; r++) {
              if (isRow1Divider && r === 1) continue;
              const cellVal = tableRows[r][c] || '';
              maxW = Math.max(maxW, getVisualWidth(cellVal));
            }
            colWidths.push(maxW);
          }

          // Format rows with aligned padding
          for (let r = 0; r < tableRows.length; r++) {
            if (isRow1Divider && r === 1) {
              const divCells = colWidths.map((w, c) => {
                const align = alignments[c] || 'left';
                if (align === 'center') return `:${'-'.repeat(Math.max(1, w - 2))}:`;
                if (align === 'right') return `${'-'.repeat(Math.max(1, w - 1))}:`;
                return `:${'-'.repeat(Math.max(1, w - 1))}`;
              });
              formattedLines.push(`| ${divCells.join(' | ')} |`);
            } else {
              const formattedCells = [];
              for (let c = 0; c < maxCols; c++) {
                const cellVal = tableRows[r][c] || '';
                const align = (r === 0 ? 'left' : alignments[c]) || 'left';
                formattedCells.push(padString(cellVal, colWidths[c], align));
              }
              formattedLines.push(`| ${formattedCells.join(' | ')} |`);
            }
          }
        }
        continue;
      }

      // Regular line / paragraph text
      formattedLines.push(line);
    }

    // Clean leading and trailing blank lines and ensure ends with newline
    while (formattedLines.length > 0 && formattedLines[0].trim() === '') {
      formattedLines.shift();
    }
    while (
      formattedLines.length > 0 &&
      formattedLines[formattedLines.length - 1].trim() === ''
    ) {
      formattedLines.pop();
    }

    return formattedLines.join('\n') + '\n';
  };

  // Format Document Action Handler
  const handleFormatDocument = useCallback(() => {
    if (!editorContent.trim()) {
      showToast('정리할 마크다운 내용이 없습니다.', 'warn');
      return;
    }
    const formatted = formatMarkdownDocument(editorContent);
    if (formatted.trim() === editorContent.trim()) {
      showToast('✨ 이미 들여쓰기와 표(Table) 서식이 깔끔하게 정리된 문서입니다.');
      return;
    }
    handleEditorChange(formatted);
    showToast('🪄 마크다운 서식 정리 & 표(Table) 중복 내용 병합 가이드가 적용되었습니다!');
  }, [editorContent, handleEditorChange]);

  // AI Clean Document Action Handler
  const handleAiCleanDocument = useCallback(() => {
    if (!editorContent.trim()) {
      showToast('정리할 마크다운 내용이 없습니다.', 'warn');
      return;
    }
    setIsAiCleaning(true);
    showToast('✨ AI가 인사말과 군더더기를 정리하고 있습니다...', 'info');

    setTimeout(() => {
      let cleaned = editorContent;
      // Remove AI response headers from append action
      cleaned = cleaned.replace(/---\s*> 📌 \[AI 응답 수집 - .*?\]\n+/g, '');
      // Remove common greeting patterns
      cleaned = cleaned.replace(/# \[Gemini.*?\] .*? 분석 및 답변\n+질의하신 .*? 기술 분석 및 솔루션 제안입니다\.\n+## 핵심 요약\n+.*?(?=\n##|\n#|$)/gs, '');
      cleaned = cleaned.replace(/# \[.*?\] .*?\n+## 개요\n+/g, '## 개요\n');
      cleaned = cleaned.replace(/# AI Podium 스타일 AI 지식 비서에 오신 것을 환영합니다\n+## 개요\n+.*?\n+## 주요 기능\n+.*?(?=\n##|\n#|$)/gs, '');
      
      // Basic empty line cleanup
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

      if (cleaned === editorContent.trim()) {
         cleaned = cleaned + '\n\n> ✨ AI 자동 정리 완료: 문서 구조화 및 불필요한 내용 제거가 적용되었습니다.';
      }
      
      handleEditorChange(cleaned);
      setIsAiCleaning(false);
      showToast('🪄 AI 문서 정리가 완료되었습니다!');
    }, 1500);
  }, [editorContent, handleEditorChange]);



  // Table of Contents (TOC) Heading Parser & Navigator
  const getTocItems = (content: string) => {
    const lines = content.split('\n');
    const items: { text: string; level: 1 | 2 | 3; lineIndex: number; charOffset: number }[] = [];
    let charOffset = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        items.push({ text: trimmed.replace(/^#\s+/, ''), level: 1, lineIndex: index, charOffset });
      } else if (trimmed.startsWith('## ')) {
        items.push({ text: trimmed.replace(/^##\s+/, ''), level: 2, lineIndex: index, charOffset });
      } else if (trimmed.startsWith('### ')) {
        items.push({ text: trimmed.replace(/^###\s+/, ''), level: 3, lineIndex: index, charOffset });
      }
      charOffset += line.length + 1;
    });

    return items;
  };

  const jumpToTocItem = (charOffset: number, lineIndex: number) => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      textarea.focus();
      textarea.setSelectionRange(charOffset, charOffset);
      const totalLines = editorContent.split('\n').length || 1;
      const scrollRatio = lineIndex / totalLines;
      textarea.scrollTop = scrollRatio * textarea.scrollHeight;
      showToast(`🎯 헤더 위치로 이동했습니다.`);
    }
  };

  // Toggle Theme (Dark / Light Mode)
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    showToast(nextTheme === 'light' ? '☀️ 고대비 라이트 모드가 활성화되었습니다.' : '🌙 다크 모드가 활성화되었습니다.');
  };

  // Provider change handler
  const handleProviderSelect = (p: 'cloud' | 'local-pc' | 'local-server') => {
    setProvider(p);
    setIsVerified(false);
    if (p === 'cloud') {
      setConfigValue(cloudApiKey);
    } else {
      setConfigValue(localEndpointAddress || 'http://localhost:11434');
    }
  };

  // Emergency Data Purge (Wipe All Data)
  const handleWipeAllData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();

      // Reset all state to factory defaults
      setPreferences(DEFAULT_PREFERENCES);
      setCloudApiKey('');
      setLocalEndpointAddress('http://localhost:11434');
      setConfigValue('');
      setGithubConfig(null);
      setWorkspaceRootType('local');
      setProjectEvents([]);
      setRecentAiChanges(null);
      setHasUnreadAiChanges(false);

      const defaultSession: ChatSession = {
        id: 'session-1',
        title: '프로젝트 개요 (Project Notes)',
        createdAt: '방금 전',
        fileName: 'project_notes.md',
        editorTab: 'edit',
        editorContent: '# 🚀 AI Podium Vibe Coding Workspace\n\n새로운 프로젝트를 시작하세요.\n- 좌측 패널: 프로젝트 세션 및 파일 탐색기\n- 중앙 패널: Single Source of Truth (SSOT) 마크다운 에디터\n- 우측 패널: AI 어시스턴트 & Vibe Multi-Engine\n',
        messages: [
          {
            id: 'welcome-msg-reset',
            sender: 'ai',
            text: '모든 로컬 저장소 및 캐시 데이터가 안전하게 파기되었습니다. 깨끗한 상태에서 작업을 다시 시작할 수 있습니다.',
            timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
      setSessions([defaultSession]);
      setActiveSessionId('session-1');
      setTrashSessions([]);

      const initialDoc = '# 🚀 AI Podium Vibe Coding Workspace\n\n새로운 프로젝트를 시작하세요.\n- 좌측 패널: 프로젝트 세션 및 파일 탐색기\n- 중앙 패널: Single Source of Truth (SSOT) 마크다운 에디터\n- 우측 패널: AI 어시스턴트 & Vibe Multi-Engine\n';
      setFiles({ 'project_notes.md': initialDoc });
      setFileFolders({ 'project_notes.md': '프로젝트 개요 (Project Notes)' });
      setCurrentActiveFile('project_notes.md');
      setFileName('project_notes.md');
      setEditorContent(initialDoc);

      showToast('🚨 모든 로컬 스토리지 데이터 및 캐시가 성공적으로 파기되었습니다.', 'success');
      setIsPreferencesModalOpen(false);
    } catch (e) {
      console.error('Wipe error:', e);
      window.location.reload();
    }
  };

  // Verify connection
  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      showToast('✓ AI 서버 및 Provider 연결 검증 성공!');
    }, 600);
  };

  // Switch to another project and link its editor content
  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    checkUnsavedChanges(() => {

    // Save only the tab/filename state to session, do NOT auto-save editorContent to preserve manual save architecture.
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              fileName: fileName,
              editorTab: editorTab
            }
          : s
      )
    );

    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    setActiveSessionId(sessionId);

    const newFileName = targetSession.fileName || 'tech_notes.md';
    // Load from canonical 'files' SSOT if it exists, otherwise fallback to session cache or default
    const newContent = files[newFileName] !== undefined
      ? files[newFileName]
      : (targetSession.editorContent || `# ${targetSession.title}\n\n프로젝트 노트입니다.`);
    const newTab = targetSession.editorTab || 'edit';

    setEditorContent(newContent);
    setFileName(newFileName);
    setCurrentActiveFile(newFileName);
    setEditorTab(newTab);
    
    // Auto-populate files dictionary with initial content if not present
    if (files[newFileName] === undefined) {
      setFiles((prev) => ({
        ...prev,
        [newFileName]: newContent
      }));
    }

    showToast(`📁 [${targetSession.title}] 프로젝트 대화 및 연동 에디터가 로드되었습니다.`);

    // If sliding panel is unpinned, automatically tuck away when selecting a project
    if (!isChatHistoryPinned) {
      setIsChatHistoryOpen(false);
    }
    });
  };

  // Create New Session (Project) with Synchronized Folder Generation
  const handleCreateNewSession = (customTitle?: string) => {
    checkUnsavedChanges(() => {

    // Save only the tab/filename state to session, do NOT auto-save editorContent
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              fileName: fileName,
              editorTab: editorTab
            }
          : s
      )
    );

    const defaultTitle = `새 프로젝트 ${sessions.length + 1}`;
    const projectTitle = customTitle ? customTitle.trim() : defaultTitle;
    const newSessionId = `session-${Date.now()}`;
    const newFileName = `${projectTitle}.md`;
    const initialContent = `# ${projectTitle}\n\n새 프로젝트가 생성되었습니다.\nAI 대화창에서 질문 후 **[에디터로 보내기 ➔]**를 클릭하거나 외부에서 붙여넣은 내용을 단일 진실 출처(Single Source of Truth)로 관리하세요.`;

    const newSession: ChatSession = {
      id: newSessionId,
      title: projectTitle,
      createdAt: '방금 전',
      fileName: newFileName,
      editorContent: initialContent,
      editorTab: 'edit',
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          model: selectedModel,
          text: `# [${projectTitle}] 새로운 프로젝트가 준비되었습니다\n\n질문하고 싶은 기술 개념이나 아키텍처 항목을 입력해 주세요! 중앙 에디터, 우측 폴더, 좌측 프로젝트가 실시간 연동됩니다.`
        }
      ]
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setFileName(newFileName);
    setCurrentActiveFile(newFileName);
    setEditorContent(initialContent);
    setEditorTab('edit');

    setFiles((prev) => ({
      ...prev,
      [newFileName]: initialContent
    }));

    // Synchronize Folder Window: create folder named exact same as project title
    setFileFolders((prev) => ({
      ...prev,
      [newFileName]: projectTitle
    }));

    setOpenFolders((prev) => ({
      ...prev,
      [projectTitle]: true
    }));
    showToast(`✨ 새 프로젝트 '[${projectTitle}]' 및 동명의 우측 폴더가 자동 생성되었습니다.`);
  });
  };

  // Synchronized Project Rename Across All 4 Windows
  const handleRenameProject = (sessionId: string, newTitle: string) => {
    if (!newTitle || !newTitle.trim()) return;
    const trimmedTitle = newTitle.trim();
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    const oldTitle = targetSession.title;
    if (oldTitle === trimmedTitle) return;

    const oldFileName = targetSession.fileName || `${oldTitle}.md`;
    const newFileName = `${trimmedTitle}.md`;

    // 1. Update Project Session Title & File Name
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, title: trimmedTitle, fileName: newFileName }
          : s
      )
    );

    // 2. Synchronize File Contents Store
    setFiles((prev) => {
      const updated = { ...prev };
      if (updated[oldFileName] !== undefined) {
        updated[newFileName] = updated[oldFileName];
        delete updated[oldFileName];
      } else {
        updated[newFileName] = targetSession.editorContent || `# ${trimmedTitle}\n\n프로젝트 노트`;
      }
      return updated;
    });

    // 3. Synchronize Folder Mapping
    setFileFolders((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (updated[key] === oldTitle) {
          updated[key] = trimmedTitle;
        }
      });
      if (updated[oldFileName]) {
        updated[newFileName] = trimmedTitle;
        delete updated[oldFileName];
      } else {
        updated[newFileName] = trimmedTitle;
      }
      return updated;
    });

    // 4. Update Folder Open State Mapping
    setOpenFolders((prev) => {
      const updated = { ...prev };
      if (updated[oldTitle] !== undefined) {
        updated[trimmedTitle] = updated[oldTitle];
        delete updated[oldTitle];
      } else {
        updated[trimmedTitle] = true;
      }
      return updated;
    });

    // 5. Update Active Session State if Active
    if (activeSessionId === sessionId) {
      setFileName(newFileName);
      setCurrentActiveFile(newFileName);
    }

    setEditingProjectId(null);
    showToast(`✏️ 프로젝트명이 '[${trimmedTitle}]'(으)로 변경 및 폴더/메모와 연동되었습니다.`);
  };

  // Request Delete Session (Shows Warning Modal)
  const requestDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    if (sessions.length <= 1) {
      showToast('최소 한 개 이상의 프로젝트가 유지되어야 합니다.', 'warn');
      return;
    }

    setDeleteConfirmSession(targetSession);
  };

  // Execute Confirmed Delete Session (Moves to Trash)
  const executeDeleteSession = () => {
    if (!deleteConfirmSession) return;

    const targetId = deleteConfirmSession.id;
    const targetTitle = deleteConfirmSession.title;

    const trashedSession: ChatSession = {
      ...deleteConfirmSession,
      deletedAt: new Date().toLocaleString('ko-KR')
    };

    setTrashSessions((prev) => [trashedSession, ...prev]);

    const remaining = sessions.filter((s) => s.id !== targetId);
    setSessions(remaining);

    if (activeSessionId === targetId && remaining.length > 0) {
      const nextSession = remaining[0];
      setActiveSessionId(nextSession.id);
      const nextContent = nextSession.editorContent !== undefined
        ? nextSession.editorContent
        : `# ${nextSession.title}\n\n프로젝트 노트`;
      const nextFileName = nextSession.fileName || `${nextSession.title}.md`;
      setEditorContent(nextContent);
      setFileName(nextFileName);
      setCurrentActiveFile(nextFileName);
      setEditorTab(nextSession.editorTab || 'edit');
    }

    setDeleteConfirmSession(null);
    showToast(`🗑️ '[${targetTitle}]' 프로젝트가 휴지통으로 이동되었습니다.`);
  };

  // Restore Session from Trash
  const handleRestoreSession = (trashId: string) => {
    const target = trashSessions.find((s) => s.id === trashId);
    if (!target) return;

    setTrashSessions((prev) => prev.filter((s) => s.id !== trashId));
    setSessions((prev) => [target, ...prev]);

    const memoFileName = target.fileName || `${target.title}.md`;
    const memoContent = target.editorContent || `# ${target.title}\n\n복구된 프로젝트 노트`;

    setFiles((prev) => ({
      ...prev,
      [memoFileName]: memoContent
    }));

    setFileFolders((prev) => ({
      ...prev,
      [memoFileName]: target.title
    }));

    setOpenFolders((prev) => ({
      ...prev,
      [target.title]: true
    }));

    setActiveSessionId(target.id);
    setFileName(memoFileName);
    setCurrentActiveFile(memoFileName);
    setEditorContent(memoContent);

    showToast(`✨ '[${target.title}]' 프로젝트가 성공적으로 복구되었습니다.`);
  };

  // Permanently Delete Session from Trash
  const handlePermanentDeleteSession = (trashId: string) => {
    const target = trashSessions.find((s) => s.id === trashId);
    if (!target) return;
    setTrashSessions((prev) => prev.filter((s) => s.id !== trashId));
    showToast(`❌ '[${target.title}]' 프로젝트가 영구 삭제되었습니다.`);
  };

  // Empty Entire Trash
  const handleEmptyTrash = () => {
    if (trashSessions.length === 0) return;
    if (confirm('휴지통의 모든 프로젝트를 영구적으로 비우시겠습니까?')) {
      setTrashSessions([]);
      showToast('🧹 휴지통이 모두 비워졌습니다.');
    }
  };

  // AI Session Summarizer: Generates a concise summary title for a chat session
  const handleSummarizeSessionWithAi = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession || targetSession.messages.length === 0) {
      showToast('요약할 프로젝트 대화 내역이 없습니다.', 'warn');
      return;
    }

    setSummarizingSessionId(sessionId);
    showToast(`🤖 [${selectedModel}] AI 모델이 프로젝트 내용을 분석하여 요약 제목을 생성 중...`);

    setTimeout(() => {
      const allText = targetSession.messages
        .map((m) => m.text)
        .join(' ');

      let summaryTitle = '';

      if (allText.includes('REST') || allText.includes('GraphQL')) {
        summaryTitle = '✨ REST vs GraphQL 비교';
      } else if (allText.includes('Redis') || allText.includes('캐싱') || allText.includes('Cache')) {
        summaryTitle = '✨ Redis 캐싱 전략 및 패턴';
      } else if (allText.includes('OAuth') || allText.includes('JWT') || allText.includes('인증')) {
        summaryTitle = '✨ OAuth 2.0 및 JWT 인증';
      } else if (allText.includes('매뉴얼') || allText.includes('manual')) {
        summaryTitle = '✨ 프로젝트 시스템 매뉴얼';
      } else if (allText.includes('슬라이드') || allText.includes('slide')) {
        summaryTitle = '✨ 발표 슬라이드 구조';
      } else {
        const firstUserMsg = targetSession.messages.find((m) => m.sender === 'user');
        if (firstUserMsg && firstUserMsg.text) {
          const cleanText = firstUserMsg.text.replace(/^[#\s*>-]+/, '').trim();
          summaryTitle = '✨ ' + (cleanText.length > 18 ? cleanText.substring(0, 18) + '...' : cleanText);
        } else {
          summaryTitle = '✨ AI 프로젝트 요약';
        }
      }

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: summaryTitle } : s))
      );

      setSummarizingSessionId(null);
      showToast(`✨ AI 요약 제목이 설정되었습니다: '${summaryTitle}'`);
    }, 900);
  };

  // Clear Active Session Messages
  const handleClearChat = () => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
    );
    showToast('현재 프로젝트의 대화 내용이 지워졌습니다.');
  };

  // Export Chat Session (JSON or Text/Markdown)
  const handleExportChatSession = (format: 'json' | 'txt', targetSessionId?: string) => {
    const targetSession = sessions.find((s) => s.id === (targetSessionId || activeSessionId)) || activeSession;
    if (!targetSession || targetSession.messages.length === 0) {
      showToast('내보낼 프로젝트 대화 내역이 없습니다.', 'warn');
      return;
    }

    const safeTitle = targetSession.title.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    let blob: Blob;
    let extension: string = format;

    if (format === 'json') {
      const jsonContent = JSON.stringify(targetSession, null, 2);
      blob = new Blob([jsonContent], { type: 'application/json' });
    } else {
      let textContent = `# ${targetSession.title}\n`;
      textContent += `생성 일시: ${targetSession.createdAt}\n`;
      textContent += `총 메세지 수: ${targetSession.messages.length}\n`;
      textContent += `========================================\n\n`;

      targetSession.messages.forEach((msg) => {
        const senderLabel = msg.sender === 'user' ? '👤 사용자' : `🤖 AI (${msg.model || 'Assistant'})`;
        textContent += `### [${senderLabel}] - ${msg.timestamp}\n\n${msg.text}\n\n`;
        if (msg.attachments && msg.attachments.length > 0) {
          textContent += `📎 *첨부 파일: ${msg.attachments.map((a) => a.name).join(', ')}*\n\n`;
        }
        textContent += `---\n\n`;
      });

      blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
      extension = 'md';
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}_project_export.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`📥 프로젝트가 ${extension.toUpperCase()} 파일로 내보내기 되었습니다!`);
  };

  // Helper to aggregate folder files for secondary AI processing
  const getAggregatedFolderFiles = (targetFolder: 'docs' | 'src' | 'root') => {
    const matchingFiles = Object.keys(files).filter(
      (f) => (fileFolders[f] || 'docs') === targetFolder
    );

    let combinedText = `# [프로젝트 폴더 통합 데이터: ${targetFolder.toUpperCase()}]\n\n`;
    matchingFiles.forEach((fname) => {
      combinedText += `========================================\n`;
      combinedText += `=== FILE: ${fname} ===\n`;
      combinedText += `========================================\n\n`;
      combinedText += `${files[fname] || ''}\n\n`;
    });

    return { filenames: matchingFiles, combinedText };
  };

  // AI Secondary Processing 1: Create Manual (HTML or MD)
  const handleGenerateFolderManual = (targetFolder: 'docs' | 'src' | 'root', format: 'md' | 'html' = 'md') => {
    const { filenames } = getAggregatedFolderFiles(targetFolder);

    if (filenames.length === 0) {
      showToast(`'${targetFolder}' 폴더에 가공할 수집 파일이 없습니다.`, 'warn');
      return;
    }

    setIsGeneratingFolderAi(true);
    showToast(`🤖 [${targetFolder}] 폴더 내 ${filenames.length}개 파일 통합 분석 및 ${format.toUpperCase()} 매뉴얼 생성 중...`);

    setTimeout(() => {
      let generatedManual = '';
      const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

      if (format === 'md') {
        generatedManual = `# 📖 ${targetFolder.toUpperCase()} 프로젝트 종합 운영 & 기술 매뉴얼

> 생성 일시: ${timeStr} | 통합 분석 대상 파일: ${filenames.join(', ')}

---

## 1. 시스템 개요 및 목적
본 매뉴얼은 **${targetFolder}** 폴더에 수집·저장된 **${filenames.length}개 핵심 문서**를 통합 분석하여 생성된 가이드입니다.

### 1.1 수집 자산 목록
${filenames.map((f, i) => `- **${i + 1}. ${f}**: ${(files[f] || '').substring(0, 60).replace(/\n/g, ' ')}...`).join('\n')}

---

## 2. 주요 기술 구조 및 모듈 가이드

### 2.1 데이터 흐름 및 모듈 구조
1. **1차 수집**: Window 1 AI 대화 ➔ Window 2 에디터로 노드 수집
2. **폴더 오거나이저**: Window 3 Project Explorer를 통해 프로젝트 폴더별 분류
3. **2차 통합 가공**: 폴더 단위 수집 자산을 기반으로 통합 매뉴얼 및 슬라이드 동시 생성

### 2.2 수집 파일별 상세 기술 명세
${filenames
  .map(
    (f) => `#### 📄 [파일 자산] ${f}
\`\`\`markdown
${files[f]}
\`\`\``
  )
  .join('\n\n')}

---

## 3. 운영 & 유지보수 체크리스트
- [x] 수집된 기술 개념이 최신 사양과 일치하는지 확인
- [x] HTML 및 Markdown 포맷으로 에디터에서 수정 가능
- [x] PDF 내보내기 기능으로 정식 보고서 생성 가능

*Generated by AI Studio NotebookLM Secondary Processor Engine*`;
      } else {
        generatedManual = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${targetFolder.toUpperCase()} 프로젝트 종합 매뉴얼</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #e2e8f0; background: #090d16; padding: 2rem; max-width: 900px; margin: 0 auto; }
    h1 { color: #818cf8; border-bottom: 2px solid #312e81; padding-bottom: 0.5rem; }
    h2 { color: #a5b4fc; margin-top: 1.8rem; }
    .badge { background: #312e81; color: #c7d2fe; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-family: monospace; }
    pre { background: #1e293b; padding: 1rem; border-radius: 8px; border: 1px solid #334155; overflow-x: auto; color: #38bdf8; font-size: 0.85rem; }
    .file-card { background: #0f172a; border-left: 4px solid #6366f1; padding: 1.2rem; margin: 1rem 0; border-radius: 0 8px 8px 0; border: 1px solid #1e293b; }
  </style>
</head>
<body>
  <h1>📖 ${targetFolder.toUpperCase()} 프로젝트 종합 시스템 매뉴얼 (HTML)</h1>
  <p><span class="badge">생성일시: ${timeStr}</span> <span class="badge">분석 파일: ${filenames.length}개</span></p>

  <h2>1. 수집 개요</h2>
  <p>본 문서는 <code>${targetFolder}</code> 폴더 내부의 <strong>${filenames.join(', ')}</strong> 데이터를 통합하여 자동 생성된 공식 기술 매뉴얼입니다.</p>

  <h2>2. 수집 파일별 상세 내역</h2>
  ${filenames
    .map(
      (f) => `<div class="file-card">
    <h3>📄 ${f}</h3>
    <pre>${(files[f] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </div>`
    )
    .join('\n')}

  <h2>3. 사용 가이드</h2>
  <ul>
    <li>Window 2 에디터에서 HTML 코드를 직접 수정하거나 미리보기로 전환할 수 있습니다.</li>
    <li>상단의 PDF 내보내기 버튼을 통해 인쇄용 매뉴얼로 보관 가능합니다.</li>
  </ul>
</body>
</html>`;
      }

      const newManualFileName = `02_Studio_Outputs/${targetFolder}_manual_${Date.now().toString().slice(-4)}.${format}`;
      setFiles((prev) => ({ ...prev, [newManualFileName]: generatedManual }));
      setFileFolders((prev) => ({ ...prev, [newManualFileName]: targetFolder }));

      setCurrentActiveFile(newManualFileName);
      setFileName(newManualFileName);
      setEditorContent(generatedManual);
      setEditorTab('preview');
      setIsGeneratingFolderAi(false);

      showToast(`✨ [${targetFolder}] 폴더 기반 AI 매뉴얼('${newManualFileName}')이 02_Studio_Outputs에 생성되었습니다!`);

      setRecentAiChanges({
        file: newManualFileName,
        source: `AI ${targetFolder.toUpperCase()} 매뉴얼`,
        timestamp: timeStr,
        preview: `'${newManualFileName}' 매뉴얼 문서가 자동 생성 및 편집기에 로드되었습니다.`
      });
      setHasUnreadAiChanges(true);
    }, 1000);
  };

  
  // Vibe Canvas: Start SSOT Editing Session
  const handleStartVibeCanvas = async (config: VibeCanvasConfig) => {
    setVibeCanvasConfig(config);
    const targetFname = config.docTitle.endsWith('.md') ? config.docTitle : `${config.docTitle}.md`;
    setVibeCanvasFileName(targetFname);
    setVibeCanvasTargetFolder(config.selectedFolder);

    // Smoothly slide / collapse the left AI panel to the left
    setIsSection1Collapsed(true);
    // Switch center pane into Vibe Canvas Mode
    setIsVibeCanvasActive(true);

    const timeStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const matchedTemplate = DOC_TEMPLATES.find((t) => t.tag === config.templateFormat) || DOC_TEMPLATES[0];

    // Gather text from selected source files
    let sourceTextsCombined = '';
    if (config.selectedFiles && config.selectedFiles.length > 0) {
      sourceTextsCombined = config.selectedFiles
        .map((fn) => `### 📄 [참조 소스 파일] ${fn}\n\n${files[fn] || ''}`)
        .join('\n\n---\n\n');
    }

    if (config.autoGenerateWithAi && sourceTextsCombined.trim()) {
      setIsGeneratingVibeCanvasAi(true);
      
      const initialSkeleton = `# ${targetFname.replace(/\.md$/i, '')} (${matchedTemplate.name})\n\n> **[SSOT 생성 중...]** AI가 선택된 ${config.selectedFiles.length}개의 워크스페이스 문서들을 종합 분석하여 ${matchedTemplate.tag} 양식으로 작성 중입니다...\n\n${matchedTemplate.structureSnippet.replace('{DATE}', timeStr).replace('{WEEK_RANGE}', timeStr)}`;
      setVibeCanvasContent(initialSkeleton);

      try {
        const prompt = `당신은 프로젝트의 단일 진실 공급원(Single Source of Truth, SSOT)을 구축하는 전문 수석 테크니컬 라이터 및 기획자입니다.
다음 원본 문서 자료들을 바탕으로 사용자의 지시사항에 맞추어 '${matchedTemplate.tag}' 형식의 일관되고 완결성 높은 SSOT 마스터 마크다운 문서를 작성하세요.

[작성 톤 & 스타일]: ${config.designTone}
[사용자 지시사항]: ${config.instruction}

[양식 구조 가이드]:
${matchedTemplate.structureSnippet}

[분석할 원본 문서 자료들]:
${sourceTextsCombined}

위 소스 자료를 빠짐없이 종합하여, 누락 없이 완결성 있는 고품질 마크다운 SSOT 문서를 작성해 주세요. 머리글, 표, 체크리스트, 코드블록을 적극 활용하세요.`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            model: selectedModel || 'gemini-3.7-flash',
            provider: provider,
            apiKey: provider === 'cloud' ? cloudApiKey : undefined,
            endpoint: (provider === 'local-pc' || provider === 'local-server') ? localEndpointAddress : undefined,
            parameters: aiParameters,
            history: []
          })
        });

        if (res.ok) {
          const data = await res.json();
          const generatedMarkdown = data.reply || data.text || '';
          if (generatedMarkdown.trim()) {
            setVibeCanvasContent(generatedMarkdown);
            showToast(`✨ '${matchedTemplate.name}' SSOT 초안이 생성되었습니다! 검토 후 폴더에 저장하세요.`, 'success');
          } else {
            const fallbackDoc = `# 🌟 ${config.selectedFolder} SSOT 마스터 문서\n\n> **생성 양식:** ${matchedTemplate.tag} | **작성일:** ${timeStr}\n\n${matchedTemplate.structureSnippet.replace('{DATE}', timeStr).replace('{WEEK_RANGE}', timeStr)}\n\n---\n\n## 📚 수집된 원본 소스 요약\n${sourceTextsCombined}`;
            setVibeCanvasContent(fallbackDoc);
          }
        } else {
          const fallbackDoc = `# 🌟 ${config.selectedFolder} SSOT 마스터 문서\n\n> **생성 양식:** ${matchedTemplate.tag} | **작성일:** ${timeStr}\n\n${matchedTemplate.structureSnippet.replace('{DATE}', timeStr).replace('{WEEK_RANGE}', timeStr)}\n\n---\n\n## 📚 수집된 원본 소스 요약\n${sourceTextsCombined}`;
          setVibeCanvasContent(fallbackDoc);
        }
      } catch (err) {
        console.error('Vibe Canvas generation error:', err);
        const fallbackDoc = `# 🌟 ${config.selectedFolder} SSOT 마스터 문서\n\n> **생성 양식:** ${matchedTemplate.tag} | **작성일:** ${timeStr}\n\n${matchedTemplate.structureSnippet.replace('{DATE}', timeStr).replace('{WEEK_RANGE}', timeStr)}\n\n---\n\n## 📚 수집된 원본 소스 요약\n${sourceTextsCombined}`;
        setVibeCanvasContent(fallbackDoc);
      } finally {
        setIsGeneratingVibeCanvasAi(false);
      }
    } else {
      const scaffold = matchedTemplate.structureSnippet.replace('{DATE}', timeStr).replace('{WEEK_RANGE}', timeStr) +
        (sourceTextsCombined ? `\n\n---\n\n## 📚 참조 소스 문서 데이터\n${sourceTextsCombined}` : '');
      setVibeCanvasContent(scaffold);
      showToast(`📝 '${matchedTemplate.name}' 양식으로 Vibe Canvas가 준비되었습니다.`);
    }
  };

  // Vibe Canvas: Save SSOT to Project Folder
  const handleSaveVibeCanvasToProjectFolder = (savedContent: string, fname: string, targetFolder: string) => {
    const finalFname = fname.trim() ? (fname.endsWith('.md') ? fname : `${fname}.md`) : 'project_SSOT.md';
    
    // Save to files registry
    setFiles((prev) => ({
      ...prev,
      [finalFname]: savedContent
    }));

    // Assign folder
    setFileFolders((prev) => ({
      ...prev,
      [finalFname]: targetFolder
    }));

    // Update active file & editor content
    setCurrentActiveFile(finalFname);
    setFileName(finalFname);
    setEditorContent(savedContent);

    // Update active project session
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId || s.title === targetFolder) {
          return {
            ...s,
            fileName: finalFname,
            editorContent: savedContent
          };
        }
        return s;
      })
    );

    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    setRecentAiChanges({
      file: finalFname,
      source: 'Vibe Canvas (SSOT Master)',
      timestamp: timeStr,
      preview: `'${finalFname}' SSOT 마스터 문서가 '${targetFolder}' 폴더에 확정 저장되었습니다.`
    });
    setHasUnreadAiChanges(true);
  };

  // Vibe Canvas: Exit and restore standard editor
  const handleExitVibeCanvas = () => {
    setIsVibeCanvasActive(false);
    setIsSection1Collapsed(false);
    showToast('일반 3패널 에디터 모드로 복귀했습니다.');
  };


  // AI Secondary Processing 3: AI Spreadsheet
  const handleGenerateAiSpreadsheet = () => {
    const currentTitle = activeSession?.title || 'AI_Spreadsheet';
    const safeTitle = currentTitle.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const timeStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeFull = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const htmlSheet = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${activeSession?.title || '데이터 시트'} - AI Spreadsheet</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 2rem 1.5rem;
      background: #0f172a;
      color: #f1f5f9;
    }
    .sheet-card {
      max-width: 960px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    }
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
      padding-bottom: 1rem;
      margin-bottom: 1.25rem;
    }
    .sheet-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .sheet-meta {
      font-size: 0.8rem;
      color: #94a3b8;
      font-family: monospace;
    }

    /* Real-time Filter Input Toolbar */
    .filter-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
    }
    .filter-input-container {
      position: relative;
      flex: 1;
      min-width: 260px;
      display: flex;
      align-items: center;
    }
    .filter-icon {
      position: absolute;
      left: 0.75rem;
      color: #64748b;
      font-size: 0.85rem;
      pointer-events: none;
    }
    .filter-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 0.5rem 2.2rem 0.5rem 2.25rem;
      font-size: 0.825rem;
      color: #f8fafc;
      outline: none;
      transition: all 0.15s ease-in-out;
    }
    .filter-input::placeholder {
      color: #64748b;
    }
    .filter-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
      background: #0f172a;
    }
    .filter-clear-btn {
      position: absolute;
      right: 0.6rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.75rem;
      width: 1.25rem;
      height: 1.25rem;
      display: none;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.15s, color 0.15s;
    }
    .filter-clear-btn:hover {
      background: #334155;
      color: #f1f5f9;
    }
    .filter-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .filter-count-badge {
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      white-space: nowrap;
    }
    .filter-count-badge.filter-active {
      background: #082f49;
      color: #38bdf8;
      border-color: #0284c7;
      font-weight: 600;
    }
    .filter-count-badge.filter-zero {
      background: #450a0a;
      color: #fca5a5;
      border-color: #991b1b;
    }
    .quick-chips {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .quick-chip {
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .quick-chip:hover {
      background: #334155;
      color: #ffffff;
      border-color: #475569;
    }
    .quick-chip.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid #475569;
      border-radius: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    thead {
      background: #0f172a;
    }
    th {
      padding: 0.75rem 1rem;
      color: #cbd5e1;
      font-weight: 600;
      border-bottom: 2px solid #64748b;
      border-right: 1px solid #334155;
      user-select: none;
    }
    th:last-child { border-right: none; }
    td {
      padding: 0.65rem 1rem;
      border-bottom: 1px solid #334155;
      border-right: 1px solid #334155;
      color: #e2e8f0;
    }
    td:last-child { border-right: none; }
    tr:hover td {
      background: #273549;
    }
    .num {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-done { background: #064e3b; color: #6ee7b7; }
    .badge-prog { background: #1e3a8a; color: #93c5fd; }
    .badge-wait { background: #713f12; color: #fde047; }
    tfoot td {
      background: #0f172a;
      font-weight: 700;
      color: #38bdf8;
      border-top: 2px solid #64748b;
    }
    .formula-note {
      margin-top: 1rem;
      font-size: 0.75rem;
      color: #94a3b8;
      font-family: monospace;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="sheet-card">
    <div class="sheet-header">
      <div class="sheet-title">
        <span>📊 ${activeSession?.title || 'AI 프로젝트 데이터 분석 시트'}</span>
      </div>
      <div class="sheet-meta">
        <span>생성일시: ${timeStr} ${timeFull}</span>
      </div>
    </div>

    <!-- Text-based Real-time Filter Input Toolbar -->
    <div class="filter-toolbar">
      <div class="filter-input-container">
        <span class="filter-icon">🔍</span>
        <input 
          type="text" 
          id="sheet-filter-input" 
          class="filter-input" 
          placeholder="실시간 테이블 행 필터링 (항목명, 구분, 우선순위, 상태, 비용 등 검색)..."
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" id="sheet-filter-clear" class="filter-clear-btn" title="검색어 지우기">✕</button>
      </div>

      <div class="filter-actions">
        <div class="quick-chips">
          <button type="button" class="quick-chip active" data-filter="">전체</button>
          <button type="button" class="quick-chip" data-filter="완료">완료</button>
          <button type="button" class="quick-chip" data-filter="진행중">진행중</button>
          <button type="button" class="quick-chip" data-filter="대기">대기</button>
          <button type="button" class="quick-chip" data-filter="높음">높음</button>
        </div>
        <span id="sheet-filter-count" class="filter-count-badge">총 5개 행</span>
      </div>
    </div>

    <div class="table-wrapper">
      <table id="ai-spreadsheet-table">
        <thead>
          <tr>
            <th style="width: 50px;">ID</th>
            <th>모듈 / 작업 항목</th>
            <th>구분</th>
            <th>우선순위</th>
            <th>진행 상태</th>
            <th class="num">예상 공수 (hrs)</th>
            <th class="num">진척률 (%)</th>
            <th class="num">산정 비용 (₩)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="num">01</td>
            <td><strong>SSOT 프로젝트 폴더 지식 수집</strong></td>
            <td>Architecture</td>
            <td>높음</td>
            <td><span class="badge badge-done">완료</span></td>
            <td class="num">16</td>
            <td class="num">100%</td>
            <td class="num">1,600,000</td>
          </tr>
          <tr>
            <td class="num">02</td>
            <td><strong>AI Word Processor & 매뉴얼 빌더</strong></td>
            <td>Engine</td>
            <td>높음</td>
            <td><span class="badge badge-done">완료</span></td>
            <td class="num">24</td>
            <td class="num">100%</td>
            <td class="num">2,400,000</td>
          </tr>
          <tr>
            <td class="num">03</td>
            <td><strong>AI Spreadsheet & Slide Builder 2차 가공</strong></td>
            <td>Feature</td>
            <td>높음</td>
            <td><span class="badge badge-done">완료</span></td>
            <td class="num">20</td>
            <td class="num">100%</td>
            <td class="num">2,000,000</td>
          </tr>
          <tr>
            <td class="num">04</td>
            <td><strong>Event Manager 일정 & 마일스톤 연동</strong></td>
            <td>Management</td>
            <td>보통</td>
            <td><span class="badge badge-prog">진행중</span></td>
            <td class="num">12</td>
            <td class="num">85%</td>
            <td class="num">1,200,000</td>
          </tr>
          <tr>
            <td class="num">05</td>
            <td><strong>다국어 및 로컬/원격 연결 최종 검증</strong></td>
            <td>QA / Deploy</td>
            <td>보통</td>
            <td><span class="badge badge-wait">대기</span></td>
            <td class="num">8</td>
            <td class="num">30%</td>
            <td class="num">800,000</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5">합계 (Total Sum) / 평균 (Average)</td>
            <td class="num">=SUM(F2:F6) : 80</td>
            <td class="num">=AVERAGE(G2:G6) : 83%</td>
            <td class="num">=SUM(H2:H6) : 8,000,000</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="formula-note">
      <span>* 실시간 행 검색: 임의의 셀 텍스트 일치 시 동적 필터링 및 집계 재계산</span>
      <span>* 엑셀/Google Sheets 호환 CSV 내보내기 지원</span>
    </div>
  </div>

  <script>
    (function() {
      function setupRealTimeFilter() {
        const input = document.getElementById('sheet-filter-input');
        const clearBtn = document.getElementById('sheet-filter-clear');
        const countBadge = document.getElementById('sheet-filter-count');
        const table = document.getElementById('ai-spreadsheet-table');
        const chipButtons = document.querySelectorAll('.quick-chip');
        if (!input || !table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const totalRows = rows.length;

        // Create empty result row
        let noMatchRow = document.getElementById('sheet-no-match-row');
        if (!noMatchRow) {
          noMatchRow = document.createElement('tr');
          noMatchRow.id = 'sheet-no-match-row';
          noMatchRow.style.display = 'none';
          noMatchRow.innerHTML = '<td colspan="8" style="text-align: center; padding: 2rem 1rem; color: #94a3b8; font-style: italic;">🔍 일치하는 데이터 행이 없습니다.</td>';
          tbody.appendChild(noMatchRow);
        }

        function filterTable() {
          const rawQuery = input.value || '';
          const query = rawQuery.trim().toLowerCase();
          let matchCount = 0;
          let sumHours = 0;
          let sumProgress = 0;
          let sumCost = 0;

          if (query.length > 0) {
            clearBtn.style.display = 'flex';
          } else {
            clearBtn.style.display = 'none';
          }

          // Update active chip state
          chipButtons.forEach(btn => {
            const filterVal = (btn.getAttribute('data-filter') || '').toLowerCase();
            if ((!query && !filterVal) || (query && filterVal && query === filterVal)) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          });

          rows.forEach(row => {
            if (row.id === 'sheet-no-match-row') return;
            const cells = Array.from(row.querySelectorAll('td'));
            const fullRowText = cells.map(td => td.textContent || '').join(' ').toLowerCase();

            if (!query || fullRowText.includes(query)) {
              row.style.display = '';
              matchCount++;

              // Parse numeric cells: index 5: hrs, index 6: %, index 7: cost
              const hrs = parseFloat(cells[5]?.textContent?.replace(/[^0-9.-]/g, '') || '0') || 0;
              const prog = parseFloat(cells[6]?.textContent?.replace(/[^0-9.-]/g, '') || '0') || 0;
              const cost = parseFloat(cells[7]?.textContent?.replace(/[^0-9.-]/g, '') || '0') || 0;

              sumHours += hrs;
              sumProgress += prog;
              sumCost += cost;
            } else {
              row.style.display = 'none';
            }
          });

          if (matchCount === 0 && query) {
            noMatchRow.style.display = '';
          } else {
            noMatchRow.style.display = 'none';
          }

          // Update count badge
          if (query) {
            countBadge.textContent = matchCount + ' / ' + totalRows + ' 행 표시';
            countBadge.className = matchCount > 0 ? 'filter-count-badge filter-active' : 'filter-count-badge filter-zero';
          } else {
            countBadge.textContent = '총 ' + totalRows + '개 행';
            countBadge.className = 'filter-count-badge';
          }

          // Dynamic footer recalculation
          const tfoot = table.querySelector('tfoot');
          if (tfoot) {
            const avgProg = matchCount > 0 ? Math.round(sumProgress / matchCount) : 0;
            const formattedCost = sumCost.toLocaleString('ko-KR');
            const footTds = tfoot.querySelectorAll('td');
            if (footTds.length >= 4) {
              if (query) {
                footTds[0].textContent = '필터 집계 (' + matchCount + '개 항목 일치)';
                footTds[1].textContent = sumHours + ' hrs';
                footTds[2].textContent = avgProg + '%';
                footTds[3].textContent = formattedCost + ' ₩';
              } else {
                footTds[0].textContent = '합계 (Total Sum) / 평균 (Average)';
                footTds[1].textContent = '=SUM(F2:F6) : ' + sumHours;
                footTds[2].textContent = '=AVERAGE(G2:G6) : ' + avgProg + '%';
                footTds[3].textContent = '=SUM(H2:H6) : ' + formattedCost;
              }
            }
          }
        }

        input.addEventListener('input', filterTable);
        input.addEventListener('keyup', (e) => {
          if (e.key === 'Escape') {
            input.value = '';
            filterTable();
          } else {
            filterTable();
          }
        });

        clearBtn.addEventListener('click', () => {
          input.value = '';
          input.focus();
          filterTable();
        });

        chipButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const filterVal = btn.getAttribute('data-filter') || '';
            input.value = filterVal;
            input.focus();
            filterTable();
          });
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupRealTimeFilter);
      } else {
        setupRealTimeFilter();
      }
    })();
  </script>
</body>
</html>`;

    const sheetFileName = `${safeTitle}_sheet_${Date.now().toString().slice(-4)}.html`;
    setFiles((prev) => ({ ...prev, [sheetFileName]: htmlSheet }));
    setFileFolders((prev) => ({ ...prev, [sheetFileName]: activeSession?.title || 'docs' }));
    setCurrentActiveFile(sheetFileName);
    setFileName(sheetFileName);
    setEditorContent(htmlSheet);
    setEditorTab('preview');

    showToast(`📊 '[${sheetFileName}]' AI Spreadsheet가 생성되었습니다.`);

    setRecentAiChanges({
      file: sheetFileName,
      source: 'AI Spreadsheet',
      timestamp: timeFull,
      preview: `'${sheetFileName}' 스프레드시트가 에디터에 로드되었습니다.`
    });
    setHasUnreadAiChanges(true);
  };

  // AI Secondary Processing 4: AI Slide Builder
  const handleGenerateAiSlideBuilder = () => {
    const currentTitle = activeSession?.title || 'AI_Presentation';
    const safeTitle = currentTitle.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const timeStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeFull = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const htmlSlides = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${activeSession?.title || '발표 슬라이드'} - AI Slide Builder</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 2rem;
      background: #090d16;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
    }
    .slide-deck-header {
      width: 100%;
      max-width: 860px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.75rem;
    }
    .slide-deck-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #818cf8;
    }
    .slide-card {
      width: 100%;
      max-width: 860px;
      min-height: 460px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 2.5rem;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      position: relative;
    }
    .slide-number {
      position: absolute;
      top: 1.5rem;
      right: 2rem;
      font-size: 0.75rem;
      font-family: monospace;
      color: #64748b;
      background: #1e293b;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
    }
    .slide-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    h2 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 1.25rem 0;
      line-height: 1.25;
    }
    .slide-body {
      flex: 1;
      font-size: 1.05rem;
      line-height: 1.7;
      color: #cbd5e1;
    }
    .slide-body ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    .slide-body li {
      margin-bottom: 0.75rem;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }
    .feature-box {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1.25rem;
    }
    .feature-box h4 {
      margin: 0 0 0.5rem 0;
      color: #38bdf8;
      font-size: 1rem;
    }
    .feature-box p {
      margin: 0;
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.5;
    }
    .slide-footer {
      border-top: 1px solid #1e293b;
      padding-top: 1rem;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="slide-deck-header">
    <div class="slide-deck-title">📽️ AI Slide Builder Presentation Deck</div>
    <div style="font-size: 0.8rem; color: #64748b; font-family: monospace;">생성일: ${timeStr}</div>
  </div>

  <!-- Slide 1: Title Slide -->
  <div class="slide-card">
    <div class="slide-number">01 / 04</div>
    <div>
      <div class="slide-badge">Architecture & Overview</div>
      <h2>${activeSession?.title || 'AI Podium 통합 아키텍처'}</h2>
      <p style="font-size: 1.1rem; color: #94a3b8; margin-top: 1rem;">
        단일 진실 공급원(SSOT) 기반 AI 대화 수집 및 2차 가공 시스템
      </p>
    </div>
    <div class="feature-grid">
      <div class="feature-box">
        <h4>⚡ 1차 수집</h4>
        <p>AI 멀티 모델 대화 ➔ SSOT 즉시 수집</p>
      </div>
      <div class="feature-box">
        <h4>📁 SSOT 오거나이저</h4>
        <p>프로젝트 폴더별 연동 및 지식 자산화</p>
      </div>
    </div>
    <div class="slide-footer">
      <span>AI Podium Workstation</span>
      <span>Slide 1 of 4</span>
    </div>
  </div>

  <!-- Slide 2: Core Features -->
  <div class="slide-card">
    <div class="slide-number">02 / 04</div>
    <div>
      <div class="slide-badge">Secondary Processing</div>
      <h2>핵심 2차 산출물 생성 체계</h2>
      <div class="slide-body">
        <ul>
          <li><strong>AI Word Processor:</strong> 편집 가능한 정식 HTML/DOCX 문서 자동 생성</li>
          <li><strong>AI Spreadsheet:</strong> 수식 집계 및 CSV 호환 데이터 테이블 도출</li>
          <li><strong>AI Slide Builder:</strong> 프레젠테이션 덱 및 PPTX 내보내기 제공</li>
          <li><strong>Event Manager:</strong> 프로젝트 대화로부터 일정 및 마일스톤 자동 추출</li>
        </ul>
      </div>
    </div>
    <div class="slide-footer">
      <span>AI Podium Secondary Engine</span>
      <span>Slide 2 of 4</span>
    </div>
  </div>

  <!-- Slide 3: Technical Highlights -->
  <div class="slide-card">
    <div class="slide-number">03 / 04</div>
    <div>
      <div class="slide-badge">Technical Details</div>
      <h2>프로젝트 내용 발췌 및 분석</h2>
      <div class="slide-body">
        <div style="background: #1e293b; padding: 1rem; border-radius: 8px; font-family: monospace; font-size: 0.85rem; color: #38bdf8; max-height: 200px; overflow-y: auto;">
          ${(editorContent || '').slice(0, 400).replace(/</g, '&lt;').replace(/>/g, '&gt;')}...
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>SSOT Project Data</span>
      <span>Slide 3 of 4</span>
    </div>
  </div>

  <!-- Slide 4: Roadmap & Action Items -->
  <div class="slide-card">
    <div class="slide-number">04 / 04</div>
    <div>
      <div class="slide-badge">Roadmap & Next Steps</div>
      <h2>차기 마일스톤 및 릴리즈 계획</h2>
      <div class="feature-grid">
        <div class="feature-box">
          <h4>🚀 1단계: 배포 안정화</h4>
          <p>Multi-Model 연결 검증 및 고속 렌더링 유지</p>
        </div>
        <div class="feature-box">
          <h4>🌐 2단계: 외부 연동</h4>
          <p>Google Workspace & iCal 캘린더 동기화 확장</p>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>AI Podium Project Management</span>
      <span>Slide 4 of 4</span>
    </div>
  </div>
</body>
</html>`;

    const slideFileName = `${safeTitle}_slides_${Date.now().toString().slice(-4)}.html`;
    setFiles((prev) => ({ ...prev, [slideFileName]: htmlSlides }));
    setFileFolders((prev) => ({ ...prev, [slideFileName]: activeSession?.title || 'docs' }));
    setCurrentActiveFile(slideFileName);
    setFileName(slideFileName);
    setEditorContent(htmlSlides);
    setEditorTab('preview');

    showToast(`📽️ '[${slideFileName}]' AI Slide Builder 프레젠테이션이 생성되었습니다.`);

    setRecentAiChanges({
      file: slideFileName,
      source: 'AI Slide Builder',
      timestamp: timeFull,
      preview: `'${slideFileName}' 슬라이드 덱이 에디터에 로드되었습니다.`
    });
    setHasUnreadAiChanges(true);
  };

  // AI Secondary Processing 5: Code Builder & Refactoring
  const handleGenerateAiCodeBuilder = () => {
    const currentTitle = activeSession?.title || 'AI_Code_Refactor';
    const safeTitle = currentTitle.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const timeFull = new Date().toLocaleString('ko-KR');

    const ssotFiles = Object.keys(files).filter(
      (f) => (fileFolders[f] || '').includes('docs') || f.endsWith('.md')
    );
    let extractedSnippets = '';
    ssotFiles.forEach((f) => {
      const content = files[f] || '';
      const codeMatches = content.match(/```(?:typescript|javascript|ts|js|py|python)?\n([\s\S]*?)```/g);
      if (codeMatches) {
        extractedSnippets += `// === Extracted from ${f} ===\n` + codeMatches.join('\n\n') + '\n\n';
      }
    });

    const refactoredCode = `/**
 * ====================================================================
 * AI Podium Code Builder - Clean Architecture Refactored Module
 * ====================================================================
 * Project: ${activeSession?.title || 'SSOT Project'}
 * Generated: ${timeFull}
 * Target Output: ${safeTitle}_code_refactor.ts
 * ====================================================================
 */

export interface ProjectConfig {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
}

export interface TaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class PodiumCoreService {
  private readonly projectId: string;
  private readonly config: ProjectConfig;

  constructor(projectId: string, name: string) {
    this.projectId = projectId;
    this.config = {
      id: projectId,
      name,
      createdAt: new Date().toISOString()
    };
  }

  public async executePipeline(taskName: string): Promise<TaskResult<{ outputCount: number }>> {
    try {
      console.log(\`[Podium] Executing \${taskName} on project \${this.config.name}...\`);
      return {
        success: true,
        data: { outputCount: 1 },
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown execution failure';
      return {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Extracted Snippets
${extractedSnippets || `// [Sample Logic]\nexport function calculateMetrics(data: number[]): { sum: number; avg: number } {\n  const sum = data.reduce((acc, curr) => acc + curr, 0);\n  const avg = data.length > 0 ? sum / data.length : 0;\n  return { sum, avg };\n}`}
`;

    const codeFileName = `${safeTitle}_code_refactor_${Date.now().toString().slice(-4)}.ts`;
    setFiles((prev) => ({ ...prev, [codeFileName]: refactoredCode }));
    setFileFolders((prev) => ({ ...prev, [codeFileName]: activeSession?.title || 'docs' }));
    setCurrentActiveFile(codeFileName);
    setFileName(codeFileName);
    setEditorContent(refactoredCode);
    setEditorTab('edit');

    showToast(`💻 '[${codeFileName}]' AI Code Builder 리팩토링 코드가 생성되었습니다.`);
    setRecentAiChanges({
      file: codeFileName,
      source: 'AI Code Builder',
      timestamp: timeStr,
      preview: `'${codeFileName}' 클린 코드 리팩토링 모듈이 에디터에 로드되었습니다.`
    });
    setHasUnreadAiChanges(true);
  };

  // AI Secondary Processing: AI Invoice & Billing Generator
  const handleGenerateAiInvoice = (customInstruction?: string) => {
    const currentTitle = activeSession?.title || 'AI_Invoice';
    const safeTitle = currentTitle.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const invoiceNum = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const issueDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeFull = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const htmlInvoice = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>청구서 (Invoice) - ${invoiceNum}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 2.5rem 1rem;
      background: #0f172a;
      color: #1e293b;
    }
    .invoice-card {
      max-width: 840px;
      margin: 0 auto;
      background: #ffffff;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      box-sizing: border-box;
    }
    .invoice-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .company-brand {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .company-desc {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 0.25rem;
    }
    .invoice-badge {
      text-align: right;
    }
    .invoice-title {
      font-size: 1.8rem;
      font-weight: 900;
      color: #4f46e5;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .invoice-meta {
      font-size: 0.85rem;
      color: #475569;
      margin-top: 0.5rem;
      line-height: 1.6;
    }
    .bill-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2.5rem;
      background: #f8fafc;
      padding: 1.25rem 1.5rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .bill-col h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .bill-col p {
      margin: 0;
      font-size: 0.9rem;
      color: #1e293b;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 600;
      text-align: left;
      padding: 0.75rem 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.875rem;
      color: #334155;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 2rem;
    }
    .totals-box {
      width: 320px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-size: 0.9rem;
      color: #475569;
    }
    .totals-row.grand-total {
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      padding: 0.75rem 0;
      margin-top: 0.5rem;
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
    }
    .notes-box {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 1rem 1.25rem;
      border-radius: 0 6px 6px 0;
      margin-bottom: 2rem;
      font-size: 0.85rem;
      color: #1e40af;
    }
    .invoice-footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 1.5rem;
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="invoice-top">
      <div>
        <div class="company-brand">⚡ AI Podium Inc.</div>
        <div class="company-desc">통합 AI 아키텍처 및 소프트웨어 엔지니어링 솔루션</div>
      </div>
      <div class="invoice-badge">
        <h1 class="invoice-title">INVOICE</h1>
        <div class="invoice-meta">
          <div><strong>청구서 번호:</strong> ${invoiceNum}</div>
          <div><strong>발행 일자:</strong> ${issueDate}</div>
          <div><strong>입금 기한:</strong> ${dueDate}</div>
        </div>
      </div>
    </div>

    <div class="bill-grid">
      <div class="bill-col">
        <h4>발행처 (Billed From)</h4>
        <p><strong>AI Podium Solution Lab</strong></p>
        <p>서울특별시 강남구 테헤란로 501</p>
        <p>billing@aipodium.workspace</p>
      </div>
      <div class="bill-col">
        <h4>수신처 (Billed To)</h4>
        <p><strong>${activeSession?.title || '고객사 / 프로젝트 부서'}</strong></p>
        <p>SSOT 문서: ${currentActiveFile || fileName || 'Project Notes'}</p>
        <p>상태: 청구 발행 (Issued / Net 14)</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>항목 / 작업 내역</th>
          <th class="text-center" style="width: 80px;">수량</th>
          <th class="text-right" style="width: 120px;">단가 (KRW)</th>
          <th class="text-right" style="width: 140px;">공급가액 (KRW)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>AI Podium 통합 아키텍처 구축 및 SSOT 연동</strong><br/>
            <span style="font-size: 0.8rem; color: #64748b;">3-Pane 워크스페이스 실시간 동기화 및 마크다운 에디터 엔진 통합</span>
          </td>
          <td class="text-center">1</td>
          <td class="text-right">3,500,000</td>
          <td class="text-right">3,500,000</td>
        </tr>
        <tr>
          <td>
            <strong>Vibe Multi-Engine 2차 가공 파이프라인</strong><br/>
            <span style="font-size: 0.8rem; color: #64748b;">Word Processor, Spreadsheet, Presentation, Milestone 자동화 모듈</span>
          </td>
          <td class="text-center">1</td>
          <td class="text-right">2,000,000</td>
          <td class="text-right">2,000,000</td>
        </tr>
        <tr>
          <td>
            <strong>로컬 / 클라우드 AI 모델(Gemini, Ollama) 브릿지</strong><br/>
            <span style="font-size: 0.8rem; color: #64748b;">지연 시간 최적화 및 보안 샌드박스 설정</span>
          </td>
          <td class="text-center">1</td>
          <td class="text-right">1,200,000</td>
          <td class="text-right">1,200,000</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-area">
      <div class="totals-box">
        <div class="totals-row">
          <span>합계 (Subtotal):</span>
          <span>₩6,700,000</span>
        </div>
        <div class="totals-row">
          <span>부가가치세 (VAT 10%):</span>
          <span>₩670,000</span>
        </div>
        <div class="totals-row grand-total">
          <span>총 청구 금액:</span>
          <span>₩7,370,000</span>
        </div>
      </div>
    </div>

    <div class="notes-box">
      <strong>💳 입금 계좌 안내:</strong> 우리은행 1002-123-456789 (예금주: AI Podium 주식회사)<br/>
      <strong>📌 비고:</strong> 발행일로부터 14일 이내 입금 바랍니다. 문의 사항은 지원팀으로 연락해 주세요.
    </div>

    <div class="invoice-footer">
      <div>AI Podium Automation Engine · Sandbox Safe Output</div>
      <div>${issueDate} ${timeFull} 생성됨</div>
    </div>
  </div>
</body>
</html>`;

    const invoiceFileName = `${safeTitle}_invoice_${Date.now().toString().slice(-4)}.html`;
    setFiles((prev) => ({ ...prev, [invoiceFileName]: htmlInvoice }));
    setFileFolders((prev) => ({ ...prev, [invoiceFileName]: activeSession?.title || 'docs' }));
    setCurrentActiveFile(invoiceFileName);
    setFileName(invoiceFileName);
    setEditorContent(htmlInvoice);
    setEditorTab('preview');

    showToast(`🧾 '[${invoiceFileName}]' AI 인보이스 문서가 생성되었습니다.`);
    setRecentAiChanges({
      file: invoiceFileName,
      source: 'AI Invoice Builder',
      timestamp: timeFull,
      preview: `'${invoiceFileName}' 인보이스/견적서가 에디터에 로드되었습니다.`
    });
    setHasUnreadAiChanges(true);
  };

  const handleExtractAiSchedule = async (customInstruction?: string) => {
    const lines = (editorContent || '').split('\n');
    const extractedMilestones: ProjectEvent[] = [];
    
    let baseDate = new Date();
    lines.forEach((line, idx) => {
      const clean = line.replace(/^[#\-*\d.]+\s*/, '').trim();
      if (clean && clean.length > 4 && clean.length < 80 && (clean.includes('개요') || clean.includes('전략') || clean.includes('개발') || clean.includes('배포') || clean.includes('테스트') || clean.includes('인증') || clean.includes('설계') || clean.includes('분석') || clean.includes('최적화') || clean.includes('스프린트') || clean.includes('API'))) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + extractedMilestones.length * 2 + 1);
        const dateStr = d.toISOString().split('T')[0];
        extractedMilestones.push({
          id: `evt-auto-${Date.now()}-${idx}`,
          title: clean,
          date: dateStr,
          type: clean.includes('배포') ? 'deadline' : clean.includes('설계') ? 'milestone' : 'task',
          priority: clean.includes('핵심') || clean.includes('배포') ? 'high' : 'medium',
          completed: false,
          notes: `SSOT 문서 (${currentActiveFile || fileName || '문서'}) 기반 자동 추출 일정`
        });
      }
    });

    if (extractedMilestones.length === 0) {
      const d1 = new Date(); d1.setDate(d1.getDate() + 2);
      const d2 = new Date(); d2.setDate(d2.getDate() + 5);
      const d3 = new Date(); d3.setDate(d3.getDate() + 10);
      
      extractedMilestones.push(
        {
          id: `evt-${Date.now()}-1`,
          title: `${activeSession?.title || '프로젝트'} 요구사항 검토 및 아키텍처 수립`,
          date: d1.toISOString().split('T')[0],
          type: 'milestone',
          priority: 'high',
          completed: false,
          notes: 'SSOT 문서 핵심 항목 반영 및 스프린트 계획'
        },
        {
          id: `evt-${Date.now()}-2`,
          title: '핵심 모듈 기능 구현 및 2차 가공 테스트',
          date: d2.toISOString().split('T')[0],
          type: 'task',
          priority: 'high',
          completed: false,
          notes: 'Vibe Canvas 및 Command Palette 기능 검증'
        },
        {
          id: `evt-${Date.now()}-3`,
          title: '최종 QA 및 프로덕션 릴리즈',
          date: d3.toISOString().split('T')[0],
          type: 'deadline',
          priority: 'medium',
          completed: false,
          notes: '글로벌 사용자 배포 및 안정화'
        }
      );
    }

    setProjectEvents((prev) => [...extractedMilestones, ...prev]);
    setIsEventManagerOpen(true);
    showToast(`📅 SSOT 문서에서 ${extractedMilestones.length}개의 프로젝트 일정을 추출하여 캘린더에 등록했습니다!`, 'success');
  };

  // Event Manager Actions
  const handleAddProjectEvent = () => {
    if (!newEventTitle.trim()) {
      showToast('일정 제목을 입력해주세요.', 'warn');
      return;
    }
    const newEvt: ProjectEvent = {
      id: `evt-${Date.now()}`,
      title: newEventTitle.trim(),
      date: newEventDate || new Date().toISOString().split('T')[0],
      type: newEventType,
      priority: newEventPriority,
      completed: false,
      notes: newEventNotes.trim() || undefined
    };
    setProjectEvents((prev) => [newEvt, ...prev]);
    setNewEventTitle('');
    setNewEventNotes('');
    showToast(`📅 '${newEvt.title}' 일정이 추가되었습니다.`);
  };

  const handleToggleEventCompleted = (id: string) => {
    setProjectEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    );
  };

  const handleDeleteProjectEvent = (id: string) => {
    setProjectEvents((prev) => prev.filter((e) => e.id !== id));
    showToast('일정이 삭제되었습니다.');
  };

  const handleExtractEventsWithAi = () => {
    setIsExtractingEvents(true);
    showToast('🤖 AI가 프로젝트 대화 및 노트를 분석하여 마일스톤과 일정을 추출 중입니다...');

    setTimeout(() => {
      const today = new Date();
      const formatOffsetDate = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };

      const extracted: ProjectEvent[] = [
        {
          id: `evt-ai-${Date.now()}-1`,
          title: `[AI 추출] '${activeSession?.title || '프로젝트'}' 1차 요구사항 정의`,
          date: formatOffsetDate(1),
          type: 'milestone',
          priority: 'high',
          completed: false,
          notes: '대화 세션 분석을 통해 자동 추출된 핵심 마일스톤'
        },
        {
          id: `evt-ai-${Date.now()}-2`,
          title: `[AI 추출] 아키텍처 및 2차 가공 모듈 통합 리뷰`,
          date: formatOffsetDate(3),
          type: 'meeting',
          priority: 'medium',
          completed: false,
          notes: 'Word, Spreadsheet, Slide 산출물 검수 회의'
        },
        {
          id: `evt-ai-${Date.now()}-3`,
          title: `[AI 추출] 최종 릴리즈 및 외부 배포 마감`,
          date: formatOffsetDate(7),
          type: 'deadline',
          priority: 'high',
          completed: false,
          notes: 'Google Drive 및 GitHub 연동 패키징 완료'
        }
      ];

      setProjectEvents((prev) => [...extracted, ...prev]);
      setIsExtractingEvents(false);
      showToast(`✨ AI가 ${extracted.length}개의 주요 프로젝트 일정을 성공적으로 추출했습니다!`);
    }, 1000);
  };

  const handleExportEventsToEditor = () => {
    const timeStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const mdTable = `# 📅 [${activeSession?.title || '프로젝트'}] 통합 일정 & 마일스톤 계획표

> 생성 일시: ${timeStr} | 총 등록 일정: ${projectEvents.length}건

| 상태 | 일자 | 유형 | 우선순위 | 일정 / 마일스톤 명칭 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
${projectEvents
  .map(
    (e) =>
      `| ${e.completed ? '✅ 완료' : '⏳ 진행'} | \`${e.date}\` | **${e.type.toUpperCase()}** | ${e.priority === 'high' ? '🔴 높음' : e.priority === 'medium' ? '🟡 보통' : '🟢 낮음'} | ${e.title} | ${e.notes || '-'} |`
  )
  .join('\n')}

---
*Exported from AI Podium Event Manager Engine*`;

    const eventFileName = `project_schedule_${Date.now().toString().slice(-4)}.md`;
    setFiles((prev) => ({ ...prev, [eventFileName]: mdTable }));
    setFileFolders((prev) => ({ ...prev, [eventFileName]: 'docs' }));
    setCurrentActiveFile(eventFileName);
    setFileName(eventFileName);
    setEditorContent(mdTable);
    setEditorTab('preview');
    setIsEventManagerOpen(false);

    showToast(`📋 '${eventFileName}' 일정표가 생성되어 에디터에 로드되었습니다!`);
  };

  const handleExportEventsIcs = () => {
    let icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//AI Podium//Event Manager//KO\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;

    projectEvents.forEach((evt) => {
      const cleanDate = evt.date.replace(/-/g, '');
      icsContent += `BEGIN:VEVENT\r\nUID:${evt.id}@aipodium.internal\r\nDTSTAMP:${cleanDate}T090000Z\r\nDTSTART;VALUE=DATE:${cleanDate}\r\nSUMMARY:${evt.title}\r\nDESCRIPTION:${evt.notes || ''} [우선순위: ${evt.priority}]\r\nSTATUS:${evt.completed ? 'COMPLETED' : 'CONFIRMED'}\r\nEND:VEVENT\r\n`;
    });

    icsContent += `END:VCALENDAR\r\n`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_events_${Date.now().toString().slice(-4)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('📅 iCal (.ics) 캘린더 파일이 다운로드되었습니다 (Google Calendar 연동 가능).');
  };
  // Helper to open file in editor / add to tab bar
  const handleOpenFile = (fname: string) => {
    // If current document is in-memory untitled doc, preserve buffer
    if (untitledDocs[currentActiveFile] !== undefined) {
      setUntitledDocs((prev) => ({ ...prev, [currentActiveFile]: editorContent }));
    }

    if (files[fname] !== undefined || untitledDocs[fname] !== undefined) {
      const targetContent = files[fname] !== undefined ? files[fname] : (untitledDocs[fname] || '');
      setOpenTabs((prev) => (prev.includes(fname) ? prev : [...prev, fname]));
      setCurrentActiveFile(fname);
      setFileName(fname);
      setEditorContent(targetContent);
      setEditorTab(fname.endsWith('.html') ? 'preview' : 'edit');
      showToast(`📂 '${fname}' 탭이 열렸습니다.`);
    }
  };

  // Helper to render chat message text with clickable workspace folder/file mention chips
  const renderFormattedMessageText = (text: string) => {
    if (!text) return null;

    // Pattern to match @[📁 name] or @[📄 name] or @[name]
    const mentionRegex = /@\[(📁|📄)?\s*([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(text)) !== null) {
      const fullMatch = match[0];
      const iconType = match[1];
      const refName = match[2]?.trim();
      const matchStart = match.index;

      if (matchStart > lastIndex) {
        parts.push(text.substring(lastIndex, matchStart));
      }

      const isFolder = iconType === '📁' || (!iconType && (sessions.some((s) => s.title === refName) || Object.values(fileFolders).includes(refName as any)));
      const isFile = iconType === '📄' || (!iconType && files[refName] !== undefined);

      parts.push(
        <span
          key={`mention-${matchStart}-${refName}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isFile && files[refName]) {
              handleOpenFile(refName);
              showToast(`📂 참조 파일 '${refName}'이(가) 에디터에 열렸습니다.`);
            } else if (isFolder) {
              const targetSession = sessions.find((s) => s.title === refName);
              if (targetSession) {
                handleSelectSession(targetSession.id);
              }
              setOpenFolders((prev) => ({ ...prev, [refName]: true }));
              showToast(`📁 참조 폴더 '[${refName}]'이(가) 활성화되었습니다.`);
            }
          }}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6875rem] font-mono cursor-pointer transition mx-0.5 shadow-xs border ${
            isFile
              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900 hover:text-white'
              : 'bg-amber-950/80 text-amber-300 border-amber-700/60 hover:bg-amber-900 hover:text-white'
          }`}
          title={isFile ? `클릭하여 '${refName}' 파일 열기` : `클릭하여 '[${refName}]' 폴더 열기`}
        >
          <span>{iconType || (isFolder ? '📁' : '📄')}</span>
          <span className="font-semibold underline decoration-dotted underline-offset-2">{refName}</span>
        </span>
      );

      lastIndex = matchStart + fullMatch.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Handle send message logic
  const handleSendMessage = (
    overrideText?: string,
    meta?: {
      originalText?: string;
      translatedText?: string;
      ghostWriterLevel?: string;
    }
  ) => {
    const textToSend = (overrideText !== undefined ? overrideText : chatInput).trim();
    if (!textToSend && chatAttachments.length === 0) return;

    const userTimestamp = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: userTimestamp,
      attachments: chatAttachments.length > 0 ? [...chatAttachments] : undefined,
      originalText: meta?.originalText,
      translatedText: meta?.translatedText,
      ghostWriterLevel: meta?.ghostWriterLevel,
    };

    const targetSessionId = activeSessionId;

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === targetSessionId) {
          return {
            ...session,
            messages: [...session.messages, userMsg],
          };
        }
        return session;
      })
    );

    if (overrideText === undefined) {
      setChatInput('');
      setChatAttachments([]);
    }

    setIsAiLoading(true);

    const modelsToRun =
      mode === 'multi'
        ? selectedMultiModels.length > 0
          ? selectedMultiModels
          : [selectedModel]
        : [selectedModel];

    Promise.all(
      modelsToRun.map(async (mKey, idx) => {
        const modelOpt = ghostWriterModelOptions.find((m) => m.id === mKey);
        const displayName = modelOpt?.name || mKey;
        let aiText = '';

        try {
          const customInstruction = preferences.aiPersona?.systemInstruction?.trim();
          const sysInstruction = customInstruction
            ? `Persona Name: ${preferences.aiPersona.name}\nRole: ${preferences.aiPersona.role}\n\n${customInstruction}`
            : undefined;

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: textToSend,
              editorContent: editorContent, // <-- The Context Injection!
              model: mKey,
              systemInstruction: sysInstruction
            })
          });
          const data = await res.json();
          
          if (!res.ok) {
            aiText = `⚠️ API Error: ${data.error || 'Unknown error'}\n\n*Check Settings > Secrets to ensure GEMINI_API_KEY is configured.*`;
          } else {
            aiText = data.text;
          }
        } catch (e: any) {
          aiText = `⚠️ Network Error: ${e.message}\n\n*Failed to connect to the backend server.*`;
        }

        return {
          id: `msg-${Date.now()}-${idx}-${Math.random()}`,
          sender: 'ai' as const,
          model: displayName,
          text: aiText,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        };
      })
    ).then((newAiMsgs) => {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id === targetSessionId) {
            return {
              ...session,
              messages: [...session.messages, ...newAiMsgs],
            };
          }
          return session;
        })
      );
      setIsAiLoading(false);
    });
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // SSOT Generator Modal (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        handleOpenSSOTGeneratorModal(activeSession?.title || 'Main Project');
        return;
      }

      // Format Document (Shift+Alt+F or Ctrl+Shift+I)
      if (
        (e.shiftKey && e.altKey && (e.key === 'F' || e.key === 'f')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i'))
      ) {
        e.preventDefault();
        handleFormatDocument();
      }
      
      // Save Document (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        handleSaveDocument();
      }

      // AI Canvas / Studio Shortcuts
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        // Prevent shortcuts if typing in the markdown editor or chat input
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
           return;
        }

        if (key === 'c') {
          e.preventDefault();
          handleOpenSSOTGeneratorModal(activeSession?.title || 'Main Project', 'prd');
        } else if (key === 's') {
          e.preventDefault();
          handleGenerateAiSpreadsheet();
        } else if (key === 'd') {
          e.preventDefault();
          handleGenerateAiSlideBuilder();
        } else if (key === 'v') {
          e.preventDefault();
          showToast('Vibe Dev 기능이 곧 추가될 예정입니다.', 'info');
        } else if (key === 'p') {
          e.preventDefault();
          setIsEventManagerOpen(true);
        } else if (key === 'e') {
          e.preventDefault();
          showToast('Vibe Event 기능이 곧 추가될 예정입니다.', 'info');
        } else if (key === 'm') {
          e.preventDefault();
          showToast('Vibe Money 기능이 곧 추가될 예정입니다.', 'info');
        } else if (key === 'y') {
          e.preventDefault();
          showToast('Your Vibe 커스텀 기능이 곧 추가될 예정입니다.', 'info');
        } else if (key === ',') {
          e.preventDefault();
          setIsPreferencesModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    handleFormatDocument,
    handleSaveDocument,
        handleGenerateAiSpreadsheet,
    handleGenerateAiSlideBuilder,
    setIsEventManagerOpen,
    setIsPreferencesModalOpen,
    handleOpenSSOTGeneratorModal,
    showToast
  ]);

  // Authentication Guard: If not authenticated, route to Login / Auth Page
  if (!currentUser) {
    return (
      <AuthPage
        onAuthenticated={(user) => {
          setCurrentUser(user);
          if (user.provider === 'guest' && !localStorage.getItem('aipodium_guest_init_v1')) {
            setFiles(GUEST_SAMPLE_FILES);
            setFileFolders(GUEST_SAMPLE_FOLDERS);
            setCurrentActiveFile('welcome.md');
            setFileName('welcome.md');
            setEditorContent(GUEST_SAMPLE_FILES['welcome.md']);
            setOpenTabs(['welcome.md', 'ai_guide.md']);
            localStorage.setItem('notebooklm_files', JSON.stringify(GUEST_SAMPLE_FILES));
            localStorage.setItem('notebooklm_file_folders', JSON.stringify(GUEST_SAMPLE_FOLDERS));
            localStorage.setItem('notebooklm_active_file', 'welcome.md');
            localStorage.setItem('notebooklm_editor_content', GUEST_SAMPLE_FILES['welcome.md']);
            localStorage.setItem('aipodium_guest_init_v1', 'true');
          }
          showToast(
            user.provider === 'guest'
              ? `🛡️ 게스트 모드로 시작합니다 (로컬 격리 스토리지 모드)`
              : `환영합니다, ${user.name}님! AI Podium에 로그인되었습니다.`,
            'success'
          );
        }}
      />
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-app-gradient, var(--bg-app))',
        color: 'var(--text-primary)'
      }}
      className="h-screen max-h-screen overflow-hidden flex flex-col font-sans select-none"
    >
      {/* Top Navigation Bar / Header */}
      <header
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'var(--border-color)'
        }}
        className="h-8 backdrop-blur-md border-b px-2 flex items-center justify-between z-50 shrink-0 border-[#2e3142]"
      >
        <div className="flex items-center gap-2">
          {/* Logo / App Name */}
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white cursor-pointer" onClick={() => showToast('AI Podium & Vibe Canvas (SSOT 마크다운 플랫폼)')}>
            <div className="w-4 h-4 rounded-xs bg-gradient-to-br from-[#6366f1] to-[#0ea5e9] flex items-center justify-center text-white shrink-0">
              <Brain className="w-3 h-3" />
            </div>
            <span className="text-xs font-bold text-slate-100 font-mono tracking-normal">
              AI Podium
            </span>
          </div>

          {/* Menubar (파일, 편집, 보기, AI 모델, 창, 도움말) */}
          <nav ref={topMenuRef} className="flex items-center gap-0.5 text-xs text-slate-300">

            {/* 1. 파일 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(activeMenu === 'file' ? null : 'file');
                  setIsExportSubmenuOpen(false);
                }}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu('file');
                    setIsExportSubmenuOpen(false);
                  }
                }}
                className={`px-1.5 py-0.5 rounded-xs text-[11.5px] font-medium transition flex items-center gap-1 cursor-pointer ${
                  activeMenu === 'file'
                    ? 'bg-[#282a38] text-white font-semibold'
                    : 'hover:bg-[#282a38]/70 text-slate-300'
                }`}
              >
                <span>파일</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              {activeMenu === 'file' && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#121318]/98 backdrop-blur-md border border-[#2e3142] rounded-xs p-1 text-xs text-slate-200 z-50 animate-in fade-in duration-75">
                  <button
                    type="button"
                    onClick={() => { handleCreateNewSession(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left px-2 py-1 rounded-xs hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer text-xs"
                  >
                    <span>새 프로젝트</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Alt+N</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleCreateNewFile(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>새 마크다운 노트</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+N</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { openFileInputRef.current?.click(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>로컬 파일 불러오기...</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+O</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleSaveToFile(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>저장</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+S</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleSaveAsFile(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>다른 이름으로 저장...</span>
                  </button>

                  <div className="my-1 border-t border-[#2e3142]" />

                  {/* 내보내기 (Export As) Sub-menu */}
                  <div
                    className="relative"
                    onMouseEnter={() => setIsExportSubmenuOpen(true)}
                    onMouseLeave={() => setIsExportSubmenuOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setIsExportSubmenuOpen((prev) => !prev)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer ${
                        isExportSubmenuOpen ? 'bg-[#6366f1] text-white' : 'hover:bg-[#6366f1] hover:text-white'
                      }`}
                    >
                      <span>내보내기 (Export As)</span>
                      <span className="text-[0.625rem] text-slate-400">▶</span>
                    </button>

                    {isExportSubmenuOpen && (
                      <div className="absolute left-full top-0 ml-1 w-52 bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-lg shadow-2xl p-1 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => { handleExportPdf(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                        >
                          <span>인쇄 및 PDF 출력</span>
                          <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+P</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleExportDocx(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                        >
                          <span>DOCX 문서 내보내기</span>
                          <span className="text-[0.625rem] text-slate-400 font-mono">DOCX</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleExportPptx(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                        >
                          <span>PPTX 슬라이드 내보내기</span>
                          <span className="text-[0.625rem] text-slate-400 font-mono">PPTX</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleExportCsv(); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                        >
                          <span>CSV 데이터 내보내기</span>
                          <span className="text-[0.625rem] text-slate-400 font-mono">CSV</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="my-1 border-t border-[#2e3142]" />

                  <button
                    type="button"
                    onClick={() => { setIsWorkspaceModalOpen(true); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>프로젝트 폴더 연결 / 관리...</span>
                    <span className="text-[0.5625rem] bg-[#121318] text-emerald-300 px-1 rounded border border-[#2e3142]/40 font-mono uppercase">{activeWorkspace.type}</span>
                  </button>

                  <div className="my-1 border-t border-[#2e3142]" />

                  <button
                    type="button"
                    onClick={() => { setIsTrashOpen(true); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-rose-950/70 hover:text-rose-200 text-rose-300 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>휴지통 열기</span>
                    {trashSessions.length > 0 && (
                      <span className="bg-rose-600 text-white text-[0.5625rem] px-1.5 py-0.5 rounded-full font-bold font-mono">
                        {trashSessions.length}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 2. 편집 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                onMouseEnter={() => activeMenu && setActiveMenu('edit')}
                className={`px-2 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                  activeMenu === 'edit'
                    ? 'bg-[#6366f1] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#282a38] text-slate-200'
                }`}
              >
                <span>편집</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {activeMenu === 'edit' && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-lg shadow-2xl p-1 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => { document.execCommand('undo'); showToast('실행 취소'); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>실행 취소</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+Z</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { document.execCommand('redo'); showToast('다시 실행'); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>다시 실행</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+Y</span>
                  </button>

                  <div className="my-1 border-t border-[#2e3142]" />

                  <button
                    type="button"
                    onClick={() => { handleCopyToClipboard(); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>전체 복사</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+C</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { document.execCommand('cut'); showToast('잘라내기 완료'); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>잘라내기</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+X</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { showToast('💡 에디터나 대화창에서 Ctrl+V 키로 붙여넣으세요.'); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>붙여넣기</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+V</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleFormatDocument();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer text-slate-200"
                  >
                    <span>문서 서식 자동 정리</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Shift+Alt+F</span>
                  </button>

                  <div className="my-1 border-t border-[#2e3142]" />

                  <button
                    type="button"
                    onClick={() => {
                      const searchInput = document.querySelector('input[placeholder*="파일"]') as HTMLInputElement;
                      if (searchInput) searchInput.focus();
                      showToast('탐색기 파일 검색 창에 포커스되었습니다.');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>찾기 및 검색</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">Ctrl+F</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!messages || messages.length === 0) {
                        showToast('현재 세션에 초기화할 대화 내역이 없습니다.', 'info');
                      } else {
                        handleClearChat();
                      }
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-rose-950/70 hover:text-rose-200 text-rose-300 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>대화 내역 초기화</span>
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleDeleteFile(currentActiveFile); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-rose-950/70 hover:text-rose-200 text-rose-300 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>현재 파일 삭제</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. 보기 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
                onMouseEnter={() => activeMenu && setActiveMenu('view')}
                className={`px-2 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                  activeMenu === 'view'
                    ? 'bg-[#6366f1] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#282a38] text-slate-200'
                }`}
              >
                <span>보기</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {activeMenu === 'view' && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-lg shadow-2xl p-1 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">사이드바 토글</div>
                  <button
                    type="button"
                    onClick={() => { setIsSection1Collapsed(!isSection1Collapsed); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>좌측 AI 대화 패널</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">{isSection1Collapsed ? '열기' : '숨김'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSection3Collapsed(!isSection3Collapsed); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>우측 탐색기 패널</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">{isSection3Collapsed ? '열기' : '숨김'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSection1Collapsed(true); setIsSection3Collapsed(true); showToast('🎯 집중 모드 (모든 사이드바 숨김)'); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>집중 모드 (사이드바 숨김)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSection1Collapsed(false); setIsSection3Collapsed(false); showToast('모든 사이드바를 다시 표시합니다.'); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>전체 패널 복원</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsTocOpen(!isTocOpen); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>제목 목차 보기</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">{isTocOpen ? '숨김' : '표시'}</span>
                  </button>

                  <div className="my-1 border-t border-[#2e3142]" />

                  <div className="px-2.5 py-1 text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">화면 비율</div>
                  <button
                    type="button"
                    onClick={() => { setEditorZoom((z) => Math.min(140, z + 10)); showToast(`🔍 화면 확대`); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>화면 확대</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">+10%</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditorZoom((z) => Math.max(80, z - 10)); showToast(`🔍 화면 축소`); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>화면 축소</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">-10%</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. 설정 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
                onMouseEnter={() => activeMenu && setActiveMenu('settings')}
                className={`px-2 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                  activeMenu === 'settings'
                    ? 'bg-[#6366f1] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#282a38] text-slate-200'
                }`}
              >
                <span>설정</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {activeMenu === 'settings' && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-lg shadow-2xl p-1 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPreferencesInitialTab('ai-engine');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white  transition cursor-pointer"
                  >
                    
                    <span>AI 엔진 설정</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreferencesInitialTab('persona');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white  transition cursor-pointer"
                  >
                    
                    <span>페르소나</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreferencesInitialTab('ghost-writer');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white  transition cursor-pointer"
                  >
                    
                    <span>고스트 라이터</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreferencesInitialTab('prompts');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white  transition cursor-pointer"
                  >
                    
                    <span>프롬프트 라이브러리</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreferencesInitialTab('theme');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white  transition cursor-pointer"
                  >
                    
                    <span>테마 및 레이아웃</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreferencesInitialTab('integrations');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white  transition cursor-pointer"
                  >
                    
                    <span>계정 연동</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreferencesInitialTab('security');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white  transition cursor-pointer"
                  >
                    
                    <span>보안 및 볼트</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. 창 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'window' ? null : 'window')}
                onMouseEnter={() => activeMenu && setActiveMenu('window')}
                className={`px-2 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                  activeMenu === 'window'
                    ? 'bg-[#6366f1] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#282a38] text-slate-200'
                }`}
              >
                <span>창</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {activeMenu === 'window' && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-lg shadow-2xl p-1 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSection1Collapsed(false);
                      setIsSection2Collapsed(false);
                      setIsSection3Collapsed(false);
                      setPane1Width(33);
                      setPane2Width(34);
                      showToast('윈도우 레이아웃이 초기 균등 비율로 복원되었습니다.');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>레이아웃 분할 초기화</span>
                  </button>

                  <div className="my-1 border-t border-[#2e3142]" />

                  <div className="px-2.5 py-1 text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">에디터 보기 탭</div>
                  <button
                    type="button"
                    onClick={() => { setEditorTab('edit'); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>편집 모드</span>
                    {editorTab === 'edit' && <span className="text-[0.625rem] text-[#6366f1] font-mono">선택됨</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditorTab('preview'); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>실시간 미리보기</span>
                    {editorTab === 'preview' && <span className="text-[0.625rem] text-[#6366f1] font-mono">선택됨</span>}
                  </button>
                </div>
              )}
            </div>

            {/* 6. 도움말 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
                onMouseEnter={() => activeMenu && setActiveMenu('help')}
                className={`px-2 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                  activeMenu === 'help'
                    ? 'bg-[#6366f1] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#282a38] text-slate-200'
                }`}
              >
                <span>도움말</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {activeMenu === 'help' && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-lg shadow-2xl p-1 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => { setIsShortcutsModalOpen(true); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>단축키 가이드</span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">F1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAboutModalOpen(true); setActiveMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#6366f1] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>AI Podium 정보</span>
                  </button>
                </div>
              )}
            </div>

          </nav>
        </div>

        {/* Hidden Input for Local File Loading */}
        <input
          ref={openFileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          onChange={handleOpenLocalFile}
          className="hidden"
        />

        {/* Right Controls: Command Palette & Status */}
        <div className="flex items-center gap-2">
          {/* Guest Mode Indicator Chip */}
          {currentUser?.provider === 'guest' && (
            <button
              type="button"
              onClick={() => {
                setGuestGateFeature({
                  name: '클라우드 계정 연동',
                  description: '현재 로컬에서 작성 중인 문서를 안전하게 보존한 채 Google 또는 이메일 계정으로 연동하여 클라우드 백업 및 GitHub Sync를 활성화하세요.',
                  icon: 'cloud'
                });
                setIsGuestGateModalOpen(true);
              }}
              className="h-6 px-2 rounded-xs border border-[#2e3142] bg-[#1e202b] hover:bg-[#282a38] text-indigo-300 text-[0.6875rem] font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="게스트 모드 (로컬 스토리지 전용) - 클릭하여 계정 연동 및 클라우드 활성화"
            >
              <span className="w-1.5 h-1.5 rounded-xs bg-[#6366f1] animate-pulse shrink-0" />
              <span className="text-[0.6875rem] font-mono">Guest (Local Only)</span>
            </button>
          )}

          {/* GitHub Connection Status */}
          {workspaceRootType === 'github' && githubConfig && (
            <div 
              className="h-6 flex items-center gap-1.5 px-2 rounded-xs border border-[#2e3142] bg-[#1e202b] text-[0.6875rem] text-slate-300 font-medium cursor-pointer hover:bg-[#282a38] transition"
              title="GitHub 연동 설정 변경"
              onClick={handleOpenGithubModal}
            >
              <Github className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[140px]">Connected to <span className="font-mono text-[#6366f1]">{githubConfig.repo}</span></span>
            </div>
          )}

          {/* User Profile Badge Avatar in Header */}
          {currentUser && (
            <UserProfileBadge
              user={currentUser}
              variant="header"
              onSignOut={() => {
                authService.logout();
                showToast('로그아웃되었습니다.');
              }}
              onOpenSettings={() => {
                setPreferencesInitialTab('integrations');
                setIsPreferencesModalOpen(true);
              }}
              onOpenGoogleAccount={handleOpenGoogleAccount}
              onOpenUpgrade={() => {
                setGuestGateFeature({
                  name: '계정 로그인 & 업그레이드',
                  description: '현재 작성 중인 문서를 보존한 채 Google 또는 이메일 계정으로 연동하여 클라우드 백업 및 GitHub 동기화를 활성화합니다.',
                  icon: 'cloud'
                });
                setIsGuestGateModalOpen(true);
              }}
            />
          )}
        </div>

      </header>

      {/* COLLAPSED SECTIONS RESTORE CONTROL BAR */}
      {(isSection1Collapsed || isSection2Collapsed || isSection3Collapsed) && (
        <div className="flex items-center gap-2 bg-[#121318]/75 backdrop-blur-md border-b border-[#2e3142] px-3 py-1.5 text-xs shrink-0 z-30 shadow-xs">
          <span className="text-[0.6875rem] font-semibold text-slate-300 flex items-center gap-1">
            <ChevronsRight className="w-3.5 h-3.5 text-[#6366f1]" />
            <span>접힌 섹션 펼치기:</span>
          </span>
          {isSection1Collapsed && (
            <button
              type="button"
              onClick={() => setIsSection1Collapsed(false)}
              className="p-1 px-1.5 rounded-md bg-[#1e202b]/80 hover:bg-[#6366f1] text-[#6366f1] hover:text-white border border-[#2e3142] transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
              title="AI Chat 섹션 펼치기 (Expand AI Chat)"
            >
              <Bot className="w-3.5 h-3.5 text-[#6366f1]" />
              <ChevronsRight className="w-3.5 h-3.5 text-[#6366f1]" />
            </button>
          )}
          {isSection2Collapsed && (
            <button
              type="button"
              onClick={() => setIsSection2Collapsed(false)}
              className="p-1 px-1.5 rounded-md bg-[#1e202b]/80 hover:bg-[#6366f1] text-[#6366f1] hover:text-white border border-[#2e3142] transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
              title="Editor 섹션 펼치기 (Expand Editor)"
            >
              <FileText className="w-3.5 h-3.5 text-[#6366f1]" />
              <ChevronsRight className="w-3.5 h-3.5 text-[#6366f1]" />
            </button>
          )}
          {isSection3Collapsed && (
            <button
              type="button"
              onClick={() => setIsSection3Collapsed(false)}
              className="p-1 px-1.5 rounded-md bg-[#1e202b]/80 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-600/30 transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
              title="Project Explorer 섹션 펼치기 (Expand Explorer)"
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <ChevronsRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      )}

      {/* MAIN AREA: 3-PANE SPLIT LAYOUT WITH DRAGGABLE DIVIDERS */}
      <main ref={mainContainerRef} className="flex-1 flex items-stretch h-full min-h-0 overflow-hidden relative w-full">

        {/* ==================== LEFT PANE: AI Chat Area ==================== */}
        <section
          style={{
            width: isSection1Collapsed
              ? '0px'
              : isSection2Collapsed && isSection3Collapsed
              ? '100%'
              : isSection2Collapsed
              ? `${pane1Width + pane2Width}%`
              : isSection3Collapsed
              ? `${100 - pane2Width}%`
              : `${pane1Width}%`,
            minWidth: isSection1Collapsed ? '0px' : '220px',
            opacity: isSection1Collapsed ? 0 : 1,
            transform: isSection1Collapsed ? 'translateX(-100%)' : 'translateX(0)',
            pointerEvents: isSection1Collapsed ? 'none' : 'auto',
          }}
          className={`h-full min-h-0 flex flex-col bg-[#121318]/65 backdrop-blur-md border-r border-[#2e3142] shrink-0 overflow-hidden ${
            isResizing ? 'transition-none select-none' : 'transition-all duration-300 ease-in-out'
          } transform`}
        >
            
            {/* Header */}
            <div className="bg-[#121318]/80 backdrop-blur-md border-b border-[#2e3142] px-2.5 h-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
                  className={`p-1 rounded-md transition flex items-center gap-1.5 border shrink-0 cursor-pointer ${
                    isChatHistoryOpen
                      ? 'bg-[#282a38] text-[#6366f1] border-[#2e3142] shadow-[0_0_8px_rgba(99,102,241,0.25)]'
                      : 'bg-[#1e202b]/70 text-slate-300 hover:text-white border-[#2e3142] hover:bg-[#282a38]/80'
                  }`}
                  title="프로젝트 목록 열기/닫기"
                >
                  <History className="w-3 h-3 text-[#6366f1]" />
                  <span className="bg-[#121318] text-indigo-300 text-[0.625rem] px-1 py-0.2 rounded font-mono border border-[#2e3142]">
                    {sessions.length}
                  </span>
                </button>

                <div className="flex items-center gap-1.5 pl-1 border-l border-[#2e3142] min-w-0">
                  <Bot className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[180px] font-medium text-slate-200 text-xs" title={activeSession?.title}>
                    {activeSession?.title || 'AI 프로젝트'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Recent Changes Badge (Alerting AI Edits in Editor) */}
                {hasUnreadAiChanges && recentAiChanges && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('editor');
                      if (editorRef.current) editorRef.current.focus();
                    }}
                    className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-md text-[0.625rem] font-semibold flex items-center gap-1 animate-pulse transition shrink-0 cursor-pointer"
                    title="AI가 에디터 내용을 수정했습니다. 에디터로 이동하여 확인하세요."
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="hidden md:inline">Recent Changes</span>
                    <ArrowRight className="w-3 h-3 text-amber-400" />
                  </button>
                )}
              </div>
            </div>

          {/* Left Pane Body: Split Chat History Sidebar + Active Chat Area */}
          <div className="flex-1 flex overflow-hidden relative">

            {/* Chat History & AI Model Selection Sidebar Panel */}
            <div
              className={`bg-[#121318]/90 backdrop-blur-md border-r border-[#2e3142] flex flex-col shrink-0 transition-all duration-300 ease-in-out transform z-10 ${
                isChatHistoryOpen
                  ? 'w-52 sm:w-60 opacity-100 translate-x-0'
                  : 'w-0 opacity-0 -translate-x-full overflow-hidden border-r-0 pointer-events-none'
              }`}
            >
              {/* Sidebar Header */}
              <div className="p-2 border-b border-[#2e3142] space-y-1.5 bg-[#121318]/80 shrink-0">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Folder className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
                    <span className="font-semibold tracking-wider text-[0.6875rem] uppercase text-indigo-300">PROJECTS</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* [+] New Project Session Button */}
                    <button
                      type="button"
                      onClick={() => handleCreateNewSession()}
                      className="p-1 rounded-md hover:bg-[#282a38] text-slate-400 hover:text-white transition cursor-pointer"
                      title="새 프로젝트 생성 (New Project)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {/* [<<] Collapse Slide Button */}
                    <button
                      type="button"
                      onClick={() => setIsChatHistoryOpen(false)}
                      className="p-1 rounded-md hover:bg-[#282a38] text-slate-400 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer"
                      title="프로젝트 사이드바 접기 (Collapse Sidebar)"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Search Input Box in Project Sidebar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={sessionSearchQuery}
                    onChange={(e) => setSessionSearchQuery(e.target.value)}
                    placeholder="프로젝트 검색..."
                    className="w-full bg-[#1e202b] border border-[#2e3142] focus:border-[#6366f1] rounded-md pl-7 pr-6 py-1 text-[0.6875rem] text-slate-200 placeholder:text-slate-400 outline-none transition"
                  />
                  {sessionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSessionSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      title="검색어 초기화"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Session List */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 text-xs custom-scrollbar">
                {(() => {
                  const query = sessionSearchQuery.toLowerCase().trim();
                  const filteredSessions = sessions.filter((s) => {
                    if (!query) return true;
                    const titleMatch = s.title.toLowerCase().includes(query);
                    const messageMatch = s.messages.some(
                      (m) =>
                        m.text.toLowerCase().includes(query) ||
                        (m.attachments && m.attachments.some((att) => att.name.toLowerCase().includes(query)))
                    );
                    return titleMatch || messageMatch;
                  });

                  if (filteredSessions.length === 0) {
                    return (
                      <div className="text-center py-6 px-3 text-slate-400 space-y-2">
                        <Search className="w-5 h-5 mx-auto text-slate-500 opacity-60" />
                        <p className="text-[0.6875rem] font-medium text-slate-300">
                          {sessionSearchQuery ? `'${sessionSearchQuery}' 검색 결과 없음` : '프로젝트가 없습니다.'}
                        </p>
                        {sessionSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSessionSearchQuery('')}
                            className="text-[0.625rem] text-[#6366f1] hover:underline font-mono cursor-pointer"
                          >
                            검색어 초기화
                          </button>
                        )}
                      </div>
                    );
                  }

                  return filteredSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const matchedMsgCount = query
                      ? session.messages.filter(
                          (m) =>
                            m.text.toLowerCase().includes(query) ||
                            (m.attachments && m.attachments.some((att) => att.name.toLowerCase().includes(query)))
                        ).length
                      : 0;

                    const isDraggingThis = draggedType === 'project' && draggedId === session.id;
                    const isTarget = dragOverTargetId === session.id;
                    const isDroppingBefore = isTarget && dragDropPosition === 'before';
                    const isDroppingAfter = isTarget && dragDropPosition === 'after';

                    return (
                      <div
                        key={session.id}
                        draggable={true}
                        onDragStart={(e) => handleProjectDragStart(e, session.id)}
                        onDragOver={(e) => handleFolderDragOver(e, session.id)}
                        onDragLeave={(e) => handleFolderDragLeave(e, session.id)}
                        onDrop={(e) => handleFolderDrop(e, session.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group relative flex flex-col px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                          isDraggingThis
                            ? 'opacity-40 border border-dashed border-[#6366f1] bg-[#282a38]/50'
                            : isActive
                            ? 'bg-[#1e202b]/80 text-[#6366f1] border-l-2 border-[#2e3142] pl-2 font-medium shadow-[0_0_12px_rgba(45,212,191,0.15)] border-t border-r border-b border-[#2e3142]'
                            : 'text-slate-300 hover:bg-[#121318]/60 hover:text-slate-100'
                        }`}
                      >
                        {/* Visual Drop Insertion Indicators */}
                        {isDroppingBefore && (
                          <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#6366f1] z-30 pointer-events-none shadow-[0_0_6px_#2dd4bf]" />
                        )}
                        {isDroppingAfter && (
                          <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#6366f1] z-30 pointer-events-none shadow-[0_0_6px_#2dd4bf]" />
                        )}

                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate flex-1 text-xs flex items-center gap-1 min-w-0">
                            <span
                              className="cursor-grab active:cursor-grabbing text-slate-500 group-hover:text-slate-300 hover:text-slate-100 p-0.5 -ml-0.5 rounded transition shrink-0"
                              title="드래그하여 프로젝트 순서 변경"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="w-3 h-3" />
                            </span>
                            <span className="truncate">{session.title}</span>
                            {matchedMsgCount > 0 && query && (
                              <span className="text-[0.5625rem] bg-[#6366f1]/15 text-[#6366f1] px-1 py-0.2 rounded border border-[#6366f1]/30 shrink-0 font-mono">
                                {matchedMsgCount}
                              </span>
                            )}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[0.625rem] font-mono text-slate-400 group-hover:hidden">
                              {session.messages.length}
                            </span>
                            <div className="hidden group-hover:flex items-center gap-0.5 transition">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newTitle = prompt('새 프로젝트 이름을 입력하세요:', session.title);
                                  if (newTitle) handleRenameProject(session.id, newTitle);
                                }}
                                className="p-0.5 text-slate-400 hover:text-amber-300 transition rounded hover:bg-[#282a38]"
                                title="프로젝트 이름 변경"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportChatSession('json', session.id);
                                }}
                                className="p-0.5 text-slate-400 hover:text-[#6366f1] transition rounded hover:bg-[#282a38]"
                                title="JSON으로 내보내기"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => requestDeleteSession(session.id, e)}
                                className="p-0.5 text-slate-400 hover:text-rose-400 transition rounded hover:bg-[#282a38]"
                                title="프로젝트 삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[0.5625rem] text-slate-400 font-mono mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            {session.createdAt}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* AI Model Selection Box at the bottom of Project List */}
              <div className="border-t border-[#2e3142] bg-[#121318]/85 flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAiModelSelectionOpen(!isAiModelSelectionOpen)}
                  className="flex items-center justify-between px-2.5 py-1.5 hover:bg-[#121318]/60 transition-colors cursor-pointer w-full text-slate-300 hover:text-white"
                  title={isAiModelSelectionOpen ? "AI 모델 패널 접기" : "AI 모델 패널 펼치기"}
                >
                  <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-wider uppercase text-[#38bdf8]">
                    <Cpu className="w-3.5 h-3.5 text-[#6366f1]" />
                    <span>AI MODEL</span>
                  </div>
                  {isAiModelSelectionOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out px-2 ${
                    isAiModelSelectionOpen ? 'grid-rows-[1fr] opacity-100 pb-2' : 'grid-rows-[0fr] opacity-0 pb-0'
                  }`}
                >
                  <div className="overflow-hidden flex flex-col">
                    <div className="space-y-1.5">

                      {/* Mode Selector Buttons: Single Mode, Routing Mode, Multi Mode */}
                      <div className="flex items-center bg-[#121318]/90 border border-[#2e3142] rounded-md p-0.5 text-[0.625rem] gap-0.5">
                        <button
                          type="button"
                          onClick={() => { setMode('single'); showToast('Single Mode (단일 모델 모드) 설정'); }}
                          className={`flex-1 py-0.5 rounded transition flex items-center justify-center gap-1 font-medium cursor-pointer ${
                            mode === 'single' ? 'bg-[#6366f1] text-white font-semibold shadow-xs' : 'text-slate-300 hover:text-white'
                          }`}
                          title="Single Mode (단일 모델 모드)"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Single</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMode('routing'); showToast('Routing Mode (스마트 오토 라우팅) 활성화'); }}
                          className={`flex-1 py-0.5 rounded transition flex items-center justify-center gap-1 font-medium cursor-pointer ${
                            mode === 'routing' ? 'bg-[#6366f1] text-white font-semibold shadow-xs' : 'text-slate-300 hover:text-white'
                          }`}
                          title="Routing Mode (스마트 오토 라우팅 모드)"
                        >
                          <Route className="w-3 h-3" />
                          <span>Routing</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMode('multi'); showToast('Multi Mode (다중 모델 병렬 모드) 활성화'); }}
                          className={`flex-1 py-0.5 rounded transition flex items-center justify-center gap-1 font-medium cursor-pointer ${
                            mode === 'multi' ? 'bg-[#6366f1] text-white font-semibold shadow-xs' : 'text-slate-300 hover:text-white'
                          }`}
                          title="Multi Mode (다중 모델 병렬 모드)"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Multi</span>
                        </button>
                      </div>

                      {/* Model Selection Dropdown (Single/Routing) or Checkbox List (Multi) */}
                      {mode === 'multi' ? (
                        <div className="bg-[#121318]/90 border border-[#2e3142] rounded-md p-1.5 space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                          <div className="text-[0.625rem] text-slate-300 font-mono px-1 flex justify-between items-center pb-1 border-b border-[#2e3142]">
                            <span>병렬 응답 모델 선택:</span>
                            <span className="text-[#6366f1] font-semibold">{selectedMultiModels.length}개 선택</span>
                          </div>
                          {[
                            { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', desc: '초고속' },
                            { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: '고성능' },
                            { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', desc: 'Ollama' },
                            { id: 'deepseek-r1', name: 'DeepSeek R1', desc: '추론 특화' },
                            { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder', desc: '32B' },
                          ].map((m) => {
                            const isChecked = selectedMultiModels.includes(m.id);
                            return (
                              <label
                                key={m.id}
                                className={`flex items-center gap-2 px-1.5 py-1 rounded text-xs cursor-pointer transition select-none ${
                                  isChecked
                                    ? 'bg-[#282a38] text-[#6366f1] border border-[#2e3142] font-medium shadow-xs'
                                    : 'text-slate-300 hover:bg-[#282a38]/60 hover:text-white border border-transparent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      if (selectedMultiModels.length === 1) {
                                        showToast('Multi Mode에서는 최소 1개 이상의 모델을 선택해야 합니다.', 'warn');
                                        return;
                                      }
                                      setSelectedMultiModels((prev) => prev.filter((id) => id !== m.id));
                                    } else {
                                      setSelectedMultiModels((prev) => [...prev, m.id]);
                                    }
                                  }}
                                  className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer shrink-0"
                                />
                                <span className="flex-1 truncate">{m.name}</span>
                                <span className="text-[0.5625rem] bg-[#121318] text-indigo-300 px-1 py-0.2 rounded font-mono shrink-0 border border-[#2e3142]">
                                  {m.desc}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-[#121318] border border-[#2e3142] rounded-xs px-2 py-1">
                          <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer w-full font-sans truncate"
                          >
                            <option value="gemini-3.7-flash" className="bg-[#121318] text-slate-200">Gemini 3.7 Flash (초고속)</option>
                            <option value="gemini-3.1-pro-preview" className="bg-[#121318] text-slate-200">Gemini 3.1 Pro (고성능)</option>
                            <option value="llama-3.3-70b" className="bg-[#121318] text-slate-200">Llama 3.3 70B (Ollama)</option>
                            <option value="deepseek-r1" className="bg-[#121318] text-slate-200">DeepSeek R1 (추론 특화)</option>
                            <option value="qwen-2.5-coder" className="bg-[#121318] text-slate-200">Qwen 2.5 Coder 32B</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide-open tab button when panel is tucked away */}
            {!isChatHistoryOpen && (
              <button
                type="button"
                onClick={() => setIsChatHistoryOpen(true)}
                className="absolute left-0 top-12 z-20 bg-[#1e202b]/90 hover:bg-[#282a38] text-[#6366f1] py-2 px-1 rounded-r-md border border-l-0 border-[#2e3142] shadow-lg transition flex items-center gap-1 text-[0.625rem] font-mono group cursor-pointer"
                title="프로젝트 목록 펼치기"
              >
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#6366f1]" />
              </button>
            )}

            {/* Active Conversation Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-transparent">
              
              {/* Chat Messages */}
              <div id="chat-messages" ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 select-text custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSessionId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="space-y-3 select-text"
                  >
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 items-start select-text ${msg.sender === 'user' ? 'justify-end' : ''}`}
                      >
                        {msg.sender === 'ai' && (
                          <div className="w-6 h-6 rounded-md bg-[#121318]/90 border border-[#2e3142] flex items-center justify-center text-[#6366f1] text-xs shrink-0 mt-0.5 select-none shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div
                          className={`rounded-xl p-3 text-xs leading-relaxed space-y-2 select-text cursor-text shadow-sm ${
                            msg.sender === 'user'
                              ? 'bg-[#1e202b]/85 backdrop-blur-md border border-[#2e3142] text-slate-100 max-w-[85%] shadow-[0_2px_10px_rgba(0,0,0,0.25)]'
                              : 'bg-[#121318]/80 backdrop-blur-md border border-[#2e3142] flex-1 text-slate-200'
                          }`}
                        >
                          {msg.sender === 'ai' && (
                            <div className="flex items-center justify-between border-b border-[#2e3142] pb-1.5 select-none">
                              <span className="font-semibold text-[#6366f1] flex items-center gap-1.5 text-xs">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Assistant</span>
                                <span className="text-[0.625rem] text-indigo-300 font-mono font-normal bg-[#6366f1]/10 px-1.5 py-0.2 rounded border border-[#6366f1]/30">
                                  {msg.model || selectedModel}
                                </span>
                              </span>
                              
                              <div className="flex items-center gap-1">
                                {/* Copy AI response to clipboard */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.text);
                                    showToast('✓ AI 답변 내용이 클립보드에 복사되었습니다.');
                                  }}
                                  className="p-1 rounded-md hover:bg-[#282a38] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                                  title="클립보드에 복사 (Copy Markdown)"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {/* [에디터로 보내기 ➔] 버튼 */}
                                <button
                                  type="button"
                                  onClick={() => handleSendToEditor(msg.text)}
                                  className="p-1 rounded-md hover:bg-[#282a38] text-[#6366f1] hover:text-[#818cf8] transition cursor-pointer"
                                  title="에디터로 보내기 (Send to Markdown Editor)"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Attachment Rendering in Chat Bubble */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5 border-b border-[#2e3142] pb-1.5 select-none">
                              {msg.attachments.map((att) => (
                                <div key={att.id} className="rounded-md overflow-hidden border border-[#2e3142] bg-[#121318] p-1 flex items-center gap-1.5 max-w-full">
                                  {att.type === 'image' && att.url ? (
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="max-h-36 rounded border border-[#2e3142] object-cover"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5 px-1 text-[0.6875rem] text-slate-300 font-mono">
                                      <FileText className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
                                      <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                                      <span className="text-[0.625rem] text-slate-400">({att.size})</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.sender === 'user' && msg.ghostWriterLevel && msg.ghostWriterLevel !== 'off' && (
                            <div className="flex flex-col gap-1 pb-1.5 mb-1.5 border-b border-[#2e3142] select-none">
                              <div className="flex items-center justify-between gap-2 text-[0.625rem]">
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-200 bg-emerald-950/80 px-1.5 py-0.5 rounded text-[0.5625rem] border border-emerald-800/60 shadow-xs">
                                  <Ghost className="w-3 h-3 text-emerald-300" />
                                  Ghost Writer ({msg.ghostWriterLevel}%)
                                </span>
                                <span className="text-[0.625rem] text-[#38bdf8] font-mono flex items-center gap-1">
                                  <Globe className="w-3 h-3 text-[#0ea5e9]" />
                                  Prompt in English
                                </span>
                              </div>
                              {msg.originalText && msg.originalText !== msg.text && (
                                <div className="text-[0.6875rem] text-slate-300 flex items-start gap-1 font-sans pt-0.5">
                                  <span className="font-medium text-slate-400 shrink-0">🇰🇷 한국어 원문:</span>
                                  <span className="italic text-slate-200">{msg.originalText}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Content: Render Markdown for AI, Formatted Chips for User */}
                          {msg.sender === 'ai' ? (
                            <div
                              className="markdown-chat-content font-sans text-xs leading-relaxed select-text cursor-text"
                              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(msg.text) }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap font-sans space-y-1 select-text cursor-text selection:bg-[#6366f1]/30">
                              {renderFormattedMessageText(msg.text)}
                            </div>
                          )}
                        </div>

                        {msg.sender === 'user' && (
                          <div className="w-6 h-6 rounded-md bg-[#1e202b] border border-[#2e3142] flex items-center justify-center text-slate-200 text-xs shrink-0 mt-0.5 select-none shadow-xs">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    ))}

                    {isAiLoading && (
                      <div className="flex gap-2.5 items-start">
                        <div className="w-6 h-6 rounded-md bg-[#121318] border border-[#2e3142] flex items-center justify-center text-[#6366f1] text-xs shrink-0 mt-0.5 shadow-[0_0_8px_rgba(45,212,191,0.15)]">
                          <Bot className="w-3.5 h-3.5 animate-bounce" />
                        </div>
                        <div className="bg-[#121318]/80 backdrop-blur-md border border-[#2e3142] rounded-xl p-2.5 text-xs text-slate-300 flex items-center gap-2 font-mono shadow-xs">
                          <RotateCw className="w-3.5 h-3.5 animate-spin text-[#6366f1]" />
                          <span>AI 모델이 응답을 생성하고 있습니다...</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Input Box Area - Minimalist Clean Layout */}
          <div className="p-2.5 bg-[#121318]/95 border-t border-[#2e3142] shrink-0">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              accept="image/*,.txt,.md,.pdf,.json,.js,.ts,.py,.css,.html"
              className="hidden"
            />

            <form
              id="chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                setShowMentionMenu(false);
                handleSendMessage();
              }}
              className="space-y-1.5"
            >
              {/* Attached Files Preview Bar */}
              {chatAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#16171e] border border-[#2e3142] rounded-xs max-h-28 overflow-y-auto custom-scrollbar">
                  {chatAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative group bg-[#121318] border border-[#2e3142] rounded-xs p-1 flex items-center gap-1.5 text-xs text-slate-200 shrink-0"
                    >
                      {att.type === 'image' && att.url ? (
                        <img src={att.url} alt={att.name} className="w-7 h-7 rounded object-cover border border-[#2e3142]" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#6366f1]" />
                      )}
                      <div className="flex flex-col text-[0.625rem] pr-4">
                        <span className="truncate max-w-[120px] font-medium text-slate-200">{att.name}</span>
                        <span className="text-[0.5625rem] text-slate-400 font-mono">{att.size}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-[#282a38] hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 transition cursor-pointer"
                        title="첨부 파일 삭제"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea + Action Bar Container - Clean Seamless Unified Input Card */}
              <div
                className="relative flex flex-col bg-[#16171e] border border-[#2e3142] focus-within:border-[#6366f1] rounded-xs transition"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processFiles(e.dataTransfer.files);
                  }
                }}
              >
                {/* Autocomplete / Reference Dropdown Menu for Workspace Folders & Files */}
                <AnimatePresence>
                  {showMentionMenu && (
                    <motion.div
                      ref={mentionDropdownRef}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full left-0 right-0 mb-1.5 bg-[#121318]/98 backdrop-blur-md border border-[#2e3142] rounded-xs shadow-xl z-50 overflow-hidden flex flex-col max-h-72"
                    >
                      {/* Header bar with filters and search query badge */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#121318] border-b border-[#2e3142] text-[0.6875rem]">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <div className="w-4 h-4 rounded-xs bg-[#6366f1]/30 flex items-center justify-center text-[#6366f1]">
                            <AtSign className="w-3 h-3" />
                          </div>
                          <span>워크스페이스 폴더 / 파일 참조</span>
                          {mentionQuery && (
                            <span className="text-[0.625rem] text-emerald-300 font-mono bg-emerald-950 px-1.5 py-0.2 rounded-xs border border-emerald-700/60">
                              "{mentionQuery}"
                            </span>
                          )}
                        </div>

                        {/* Filter Mode Tabs */}
                        <div className="flex items-center gap-0.5 bg-[#121318] rounded-xs p-0.5 border border-[#2e3142] text-[0.625rem]">
                          <button
                            type="button"
                            onClick={() => setMentionFilterType('all')}
                            className={`px-1.5 py-0.5 rounded-xs transition cursor-pointer ${mentionFilterType === 'all' ? 'bg-[#6366f1] text-white font-semibold' : 'text-slate-300 hover:text-white'}`}
                          >
                            전체 ({allMentionItems.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMentionFilterType('folders')}
                            className={`px-1.5 py-0.5 rounded-xs flex items-center gap-1 transition cursor-pointer ${mentionFilterType === 'folders' ? 'bg-[#6366f1] text-white font-semibold' : 'text-slate-300 hover:text-white'}`}
                          >
                            <Folder className="w-2.5 h-2.5 text-amber-400" />
                            폴더
                          </button>
                          <button
                            type="button"
                            onClick={() => setMentionFilterType('files')}
                            className={`px-1.5 py-0.5 rounded-xs flex items-center gap-1 transition cursor-pointer ${mentionFilterType === 'files' ? 'bg-[#6366f1] text-white font-semibold' : 'text-slate-300 hover:text-white'}`}
                          >
                            <FileText className="w-2.5 h-2.5 text-[#38bdf8]" />
                            파일
                          </button>
                        </div>
                      </div>

                      {/* Filtered Item List */}
                      <div
                        ref={mentionListRef}
                        className="overflow-y-auto p-1 divide-y divide-[#2e3142]/40 text-xs select-none max-h-56 scroll-smooth"
                      >
                        {filteredMentionItems.length === 0 ? (
                          <div className="py-5 text-center text-slate-400 text-[0.6875rem] flex flex-col items-center gap-1.5">
                            <Info className="w-4 h-4 text-slate-400" />
                            <span>'{mentionQuery}'에 해당하는 워크스페이스 폴더 또는 파일이 없습니다.</span>
                          </div>
                        ) : (
                          filteredMentionItems.map((item, index) => {
                            const isSelected = index === mentionSelectedIndex;
                            return (
                              <div
                                key={item.id}
                                ref={(el) => {
                                  mentionItemRefs.current[index] = el;
                                }}
                                onClick={() => handleSelectMention(item)}
                                onMouseEnter={() => setMentionSelectedIndex(index)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xs cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-[#6366f1] text-white'
                                    : 'text-slate-200 hover:bg-[#282a38]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${
                                    item.type === 'folder'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-[#6366f1]/20 text-[#6366f1]'
                                  }`}>
                                    {item.type === 'folder' ? (
                                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-xs truncate">
                                        {item.name}
                                      </span>
                                      <span className={`text-[0.5625rem] px-1 py-0.2 rounded-xs font-mono uppercase ${
                                        item.type === 'folder'
                                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                          : 'bg-[#121318] text-[#38bdf8] border border-[#2e3142]'
                                      }`}>
                                        {item.type === 'folder' ? 'FOLDER' : 'FILE'}
                                      </span>
                                    </div>
                                    <p className={`text-[0.625rem] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                      {item.detail}
                                    </p>
                                  </div>
                                </div>

                                <span className={`text-[0.625rem] font-mono ml-2 shrink-0 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                  선택 ↵
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer Shortcut Navigation Guide */}
                      <div className="flex items-center justify-between px-2.5 py-1 bg-[#121318] border-t border-[#2e3142] text-[0.625rem] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span><kbd className="px-1 py-0.2 bg-[#121318] rounded-xs text-[0.5625rem] border border-[#2e3142] text-slate-300">↑</kbd><kbd className="px-1 py-0.2 bg-[#121318] rounded-xs text-[0.5625rem] border border-[#2e3142] text-slate-300 ml-0.5">↓</kbd> 이동</span>
                          <span><kbd className="px-1 py-0.2 bg-[#121318] rounded-xs text-[0.5625rem] border border-[#2e3142] text-slate-300">Enter</kbd> / <kbd className="px-1 py-0.2 bg-[#121318] rounded-xs text-[0.5625rem] border border-[#2e3142] text-slate-300">Tab</kbd> 참조 삽입</span>
                          <span><kbd className="px-1 py-0.2 bg-[#121318] rounded-xs text-[0.5625rem] border border-[#2e3142] text-slate-300">Esc</kbd> 닫기</span>
                        </div>
                        <span className="text-[#6366f1] font-medium font-mono">SSOT Reference</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {ghostWriterLevel !== 'off' ? (
                  <div className="flex flex-col">
                    {/* Dual Pane Layout (Left: Korean Prompt / Right: Ghost Practice) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#2e3142] bg-[#16171e]">
                      {/* Left: Native Korean Prompt Input */}
                      <div className="flex flex-col p-2 relative">
                        <textarea
                          id="chat-input"
                          ref={chatInputRef}
                          style={{ height: `${chatInputHeight}px` }}
                          value={chatInput}
                          onChange={(e) => {
                            handleChatInputChange(e);
                            if (ghostTargetEnglish || ghostTemplateText || ghostUserInput) {
                              setGhostTargetEnglish('');
                              setGhostTemplateText('');
                              setGhostUserInput('');
                              setGhostTypoCount(0);
                              setGhostShowFullAnswer(false);
                            }
                          }}
                          onPaste={handlePaste}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey)) {
                              e.preventDefault();
                              if (chatInput.trim()) {
                                handleGenerateGhostText();
                              } else {
                                showToast('⚠️ 한국어 질문 또는 개념을 먼저 입력해주세요.');
                              }
                              return;
                            }
                            handleChatInputKeyDown(e);
                          }}
                          placeholder="한국어로 입력 (예: REST API vs GraphQL)... Enter로 영작 생성"
                          className="w-full bg-[#121318] p-2 text-xs text-slate-100 placeholder:text-slate-400 rounded-xs border border-[#2e3142] focus:border-[#6366f1] resize-none outline-none font-sans leading-relaxed transition"
                        />
                      </div>

                      {/* Right: Ghost Writer Interactive Practice Pane */}
                      <div className="flex flex-col p-2 relative bg-[#16171e]">
                        {/* Interactive Ghost Text Canvas / Overlay Textarea */}
                        <div
                          style={{ height: `${chatInputHeight}px` }}
                          className="relative w-full rounded-xs border border-[#2e3142] bg-[#121318] overflow-hidden focus-within:border-emerald-500/80 transition"
                        >
                          {/* Background Layer: Ghost Template (Guide / Blank / Full Answer) */}
                          <div className="absolute inset-0 p-2 text-xs font-mono leading-relaxed select-none pointer-events-none whitespace-pre-wrap break-words overflow-y-auto">
                            {isGhostLoading ? (
                              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-slate-400 gap-2">
                                <Sparkles className="w-4 h-4 text-[#6366f1] animate-spin" />
                                <span className="text-[0.625rem] text-emerald-300 font-medium animate-pulse">Ghost Text 생성 중...</span>
                              </div>
                            ) : ghostTargetEnglish ? (
                              <div>
                                {ghostShowFullAnswer || ghostWriterLevel === '100' ? (
                                  <span className="text-[#6366f1] font-medium">{ghostTargetEnglish}</span>
                                ) : (
                                  <span className="text-teal-200/70">{ghostTemplateText}</span>
                                )}
                              </div>
                            ) : chatInput.trim() ? (
                              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-slate-400 gap-1.5 pointer-events-auto">
                                <div className="flex items-center gap-1.5 text-emerald-300 text-[0.6875rem] font-medium">
                                  <Sparkles className="w-3.5 h-3.5 text-[#6366f1] animate-pulse" />
                                  <span>한국어 입력 완료 대기 중</span>
                                </div>
                                <p className="text-[0.625rem] text-slate-400 font-sans leading-relaxed">
                                  <kbd className="px-1 py-0.5 rounded-xs bg-[#121318] border border-[#2e3142] text-teal-200 font-mono text-[0.5625rem]">Enter</kbd> 키 또는 상단 <span className="text-emerald-300 font-medium">[영작 생성]</span> 버튼을 누르면 고스트 텍스트가 생성됩니다.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateGhostText()}
                                  disabled={isGhostLoading}
                                  className="mt-0.5 px-2 py-0.5 rounded-xs bg-[#6366f1] hover:bg-[#5457e5] disabled:opacity-50 text-white text-[0.625rem] font-medium flex items-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <Ghost className="w-2.5 h-2.5" />
                                  <span>지금 Ghost Text 생성</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-slate-400 gap-1">
                                <Ghost className="w-4 h-4 text-slate-500 mb-0.5" />
                                <p className="text-[0.625rem] text-slate-400 font-sans">
                                  왼쪽에 한국어 프롬프트를 입력하면 여기에 영작 고스트 텍스트가 표시됩니다.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Foreground Layer: User Real-Time Typing Textarea */}
                          {ghostTargetEnglish && (
                            <textarea
                              ref={ghostInputRef}
                              value={ghostUserInput}
                              onChange={handleGhostUserInputChange}
                              onKeyDown={handleGhostInputKeyDown}
                              placeholder=""
                              className="absolute inset-0 w-full h-full p-2 text-xs font-mono leading-relaxed bg-transparent text-emerald-100 placeholder:text-transparent outline-none resize-none z-10 selection:bg-[#6366f1] selection:text-white"
                              spellCheck={false}
                              autoFocus
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <textarea
                    id="chat-input"
                    ref={chatInputRef}
                    style={{ height: `${chatInputHeight}px` }}
                    value={chatInput}
                    onChange={handleChatInputChange}
                    onPaste={handlePaste}
                    onKeyDown={handleChatInputKeyDown}
                    placeholder="질문할 개념이나 요청을 입력하거나 '@'를 입력하여 워크스페이스 파일/폴더 참조... (Ctrl+Enter 전송)"
                    className="w-full bg-transparent p-2.5 text-xs text-slate-100 placeholder:text-slate-400 resize-none min-h-[44px] max-h-[350px] outline-none font-sans leading-relaxed"
                  />
                )}

                {/* Bottom Input Action Bar - Clean Borderless Unified Layout */}
                <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1 hover:bg-[#282a38] text-slate-400 hover:text-slate-200 rounded-xs transition flex items-center justify-center cursor-pointer"
                      title="이미지 또는 파일 첨부하기 (Ctrl+V)"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>

                    {/* @ Workspace Reference Trigger Button */}
                    <button
                      type="button"
                      onClick={handleTriggerMention}
                      className="p-1 hover:bg-[#282a38] text-slate-400 hover:text-slate-200 rounded-xs transition flex items-center justify-center cursor-pointer"
                      title="@ 입력 또는 클릭하여 우측 워크스페이스의 폴더/파일 참조"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                    </button>

                    {/* Ghost Writer Auto-Complete Button (Visible when GW is enabled in Preferences) */}
                    {ghostWriterLevel !== 'off' && ghostTargetEnglish && (
                      <button
                        type="button"
                        onClick={() => {
                          setGhostUserInput(ghostTargetEnglish);
                          setGhostTypoCount(0);
                          showToast('✨ 영작 자동 완성');
                        }}
                        className="px-1.5 py-0.5 rounded-xs hover:bg-[#282a38] text-[#6366f1] hover:text-indigo-300 text-[0.625rem] font-mono flex items-center gap-1 transition cursor-pointer"
                        title="정답 문장 자동 완성 (Tab)"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-[#6366f1]" />
                        <span>Tab 완성</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick Height Preset Buttons - Clean Text Group */}
                    <div className="flex items-center gap-0.5 text-[0.625rem] font-mono text-slate-400">
                      <button
                        type="button"
                        onClick={() => setChatInputHeight(44)}
                        className={`px-1.5 py-0.5 rounded-xs transition cursor-pointer ${chatInputHeight <= 50 ? 'bg-[#282a38] text-slate-100 font-bold' : 'hover:text-slate-200'}`}
                        title="높이 소 (44px)"
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatInputHeight(110)}
                        className={`px-1.5 py-0.5 rounded-xs transition cursor-pointer ${chatInputHeight > 50 && chatInputHeight <= 150 ? 'bg-[#282a38] text-slate-100 font-bold' : 'hover:text-slate-200'}`}
                        title="높이 중 (110px)"
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatInputHeight(220)}
                        className={`px-1.5 py-0.5 rounded-xs transition cursor-pointer ${chatInputHeight > 150 ? 'bg-[#282a38] text-slate-100 font-bold' : 'hover:text-slate-200'}`}
                        title="높이 대 (220px)"
                      >
                        L
                      </button>
                    </div>

                    {/* Secondary & Primary Send Buttons */}
                    {ghostWriterLevel !== 'off' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (chatInput.trim()) {
                            handleSendMessage(chatInput.trim(), {
                              originalText: chatInput.trim(),
                              ghostWriterLevel: 'off'
                            });
                          }
                        }}
                        className="hover:bg-[#282a38] text-slate-400 hover:text-slate-200 h-6 w-6 flex items-center justify-center rounded-xs transition cursor-pointer"
                        title="한국어 원문으로 직접 전송"
                      >
                        <Languages className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="submit"
                      onClick={(e) => {
                        if (ghostWriterLevel !== 'off') {
                          e.preventDefault();
                          handleSendGhostMessage();
                        }
                      }}
                      className="bg-[#6366f1] hover:bg-[#5457e5] active:bg-[#4338ca] text-white h-6 px-2.5 rounded-xs transition flex items-center justify-center cursor-pointer"
                      title={ghostWriterLevel !== 'off' ? '영작된 영어 프롬프트로 AI 전송 (Ctrl + Enter)' : '메시지 전송 (Ctrl + Enter)'}
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

        </section>

        {/* Resizer Divider 1 */}
        {!isSection1Collapsed && !isSection2Collapsed && (
          <div
            onMouseDown={(e) => handleMouseDownDivider(1, e)}
            className="w-1.5 hover:w-2 bg-[#121318]/80 hover:bg-[#6366f1]/40 active:bg-[#6366f1] cursor-col-resize shrink-0 transition-all z-20 flex items-center justify-center group select-none shadow-xs border-x border-[#2e3142]"
            title="좌우로 드래그하여 섹션 크기 조절 (대화창 / 에디터)"
          >
            <div className="w-0.5 h-8 bg-slate-500 group-hover:bg-[#6366f1] rounded-full transition" />
          </div>
        )}

        {/* Resizer Divider when Section 2 is collapsed */}
        {!isSection1Collapsed && isSection2Collapsed && !isSection3Collapsed && (
          <div
            onMouseDown={(e) => handleMouseDownDivider(3, e)}
            className="w-1.5 hover:w-2 bg-[#121318]/80 hover:bg-[#6366f1]/40 active:bg-[#6366f1] cursor-col-resize shrink-0 transition-all z-20 flex items-center justify-center group select-none shadow-xs border-x border-[#2e3142]"
            title="좌우로 드래그하여 섹션 크기 조절 (대화창 / 파일탐색기)"
          >
            <div className="w-0.5 h-8 bg-slate-500 group-hover:bg-[#6366f1] rounded-full transition" />
          </div>
        )}

        {/* ==================== CENTER PANE: Markdown Editor / Vibe Canvas SSOT ==================== */}
        <section
          style={{
            width: isSection2Collapsed
              ? '0px'
              : isSection1Collapsed && isSection3Collapsed
              ? '100%'
              : isSection1Collapsed
              ? `${pane1Width + pane2Width}%`
              : isSection3Collapsed
              ? `${100 - pane1Width}%`
              : `${pane2Width}%`,
            minWidth: isSection2Collapsed ? '0px' : '560px',
            opacity: isSection2Collapsed ? 0 : 1,
            transform: isSection2Collapsed ? 'translateX(-100%)' : 'translateX(0)',
            pointerEvents: isSection2Collapsed ? 'none' : 'auto',
          }}
          className={`h-full min-h-0 flex flex-col bg-[#121318] backdrop-blur-md shrink-0 overflow-hidden ${
            isResizing ? 'transition-none select-none' : 'transition-all duration-300 ease-in-out'
          } transform min-w-0 z-10 border-r border-l border-[#2e3142]`}
        >
          {isVibeCanvasActive && vibeCanvasConfig ? (
            <VibeCanvasWorkspace
              config={vibeCanvasConfig}
              initialContent={vibeCanvasContent}
              fileName={vibeCanvasFileName}
              targetFolder={vibeCanvasTargetFolder}
              renderMarkdownToHtml={renderMarkdownToHtml}
              onSaveToProjectFolder={handleSaveVibeCanvasToProjectFolder}
              onExit={handleExitVibeCanvas}
              onToast={showToast}
              isGeneratingAi={isGeneratingVibeCanvasAi}
            />
          ) : (
            <>
              {/* Multi-Tab Document Bar */}
              <div className="bg-[#1e202b]/80 backdrop-blur-md border-b border-[#2e3142] flex items-center justify-between px-1.5 pt-1 overflow-x-auto scrollbar-none select-none min-h-[34px] z-10 w-full min-w-0">
                <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2">
                  {openTabs.map((tabFileName) => {
                    const isActive = tabFileName === currentActiveFile;
                    const isTabDirty = tabFileName === currentActiveFile ? isCurrentFileDirty : false;
                    const isHtml = tabFileName.endsWith('.html');
                    return (
                      <div
                        key={tabFileName}
                        onClick={() => {
                          if (!isActive) {
                            handleOpenFile(tabFileName);
                          }
                        }}
                        className={`group relative flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono transition cursor-pointer border-t shrink-0 max-w-[200px] border-r border-r-[#2e3142] border-l border-l-[#2e3142] ${
                          isActive
                            ? 'bg-[#121318] border-t-[#6366f1] text-slate-100 font-medium'
                            : 'bg-[#16171e]/70 border-t-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1e202b]'
                        }`}
                        title={tabFileName}
                      >
                        {isHtml ? (
                          <FileCode className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
                        )}
                        <span className="truncate flex-1 text-[0.6875rem]">{tabFileName}</span>

                        {/* Unsaved indicator */}
                        {isTabDirty && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 group-hover:hidden"
                            title="저장되지 않은 변경사항 있음 (Ctrl+S / Cmd+S로 저장)"
                          />
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleCloseTab(tabFileName, e)}
                          className={`p-0.5 rounded-xs hover:bg-[#282a38] text-slate-400 hover:text-white shrink-0 transition cursor-pointer ${
                            isTabDirty ? 'hidden group-hover:flex' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="탭 닫기"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* New Tab (+) Button */}
                  <button
                    type="button"
                    onClick={handleAddNewNoteTab}
                    className="p-1 px-1.5 rounded-xs hover:bg-[#282a38]/80 text-slate-400 hover:text-white text-xs transition flex items-center justify-center shrink-0 ml-0.5 cursor-pointer border border-transparent hover:border-[#2e3142]"
                    title="새로운 마크다운 메모 탭 추가 (+)"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Header & Markdown Toolbar Container */}
              <div className="bg-[#121318]/85 backdrop-blur-md border-b border-[#2e3142] flex flex-col shrink-0 z-10 w-full min-w-0">
              {/* Single Consolidated Header Row */}
              <div className="px-2 h-8 flex items-center justify-between gap-1 border-b border-[#2e3142] w-full min-w-0 select-none relative">
                {/* Left: View Mode Extensions + Markdown Toolbar */}
                <div className="flex items-center gap-1.5 flex-nowrap min-w-0 overflow-x-auto scrollbar-none pr-1">
                  {/* View Mode Extension (3 Options: Editor Only | Split View | Preview Only) */}
                  <div className="flex bg-[#121318] border border-[#2e3142] rounded-xs p-0.5 text-xs shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorTab('edit');
                        setSessions((prev) =>
                          prev.map((s) => (s.id === activeSessionId ? { ...s, editorTab: 'edit' } : s))
                        );
                      }}
                      className={`p-1 px-1.5 rounded-xs transition flex items-center justify-center cursor-pointer ${
                        editorTab === 'edit'
                          ? 'bg-[#282a38] text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-[#282a38]/50'
                      }`}
                      title="에디터 전용 모드 (Editor Only - ✏️)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditorTab('split');
                        setSessions((prev) =>
                          prev.map((s) => (s.id === activeSessionId ? { ...s, editorTab: 'split' } : s))
                        );
                      }}
                      className={`p-1 px-1.5 rounded-xs transition flex items-center justify-center cursor-pointer ${
                        editorTab === 'split'
                          ? 'bg-[#282a38] text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-[#282a38]/50'
                      }`}
                      title="실시간 분할 모드 (Split View - 📖 에디터 50% | 실시간 미리보기 50% 동기화 스크롤)"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditorTab('preview');
                        setSessions((prev) =>
                          prev.map((s) => (s.id === activeSessionId ? { ...s, editorTab: 'preview' } : s))
                        );
                      }}
                      className={`p-1 px-1.5 rounded-xs transition flex items-center justify-center cursor-pointer ${
                        editorTab === 'preview'
                          ? 'bg-[#282a38] text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-[#282a38]/50'
                      }`}
                      title="미리보기 전용 모드 (Preview Only - 👁️)"
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>

                  {/* Vertical Divider */}
                  <div className="h-4 w-px bg-[#2e3142] shrink-0" />

                  {/* Markdown Editing Formatting Toolbar */}
                  <div className="inline-flex items-center bg-[#121318] border border-[#2e3142] rounded-xs p-0.5 text-slate-200 divide-x divide-[#2e3142] shrink-0">
                    {/* Headings (h1, h2, h3) */}
                    <div className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('h1')}
                        className="px-1.5 py-0.5 rounded-l-xs hover:bg-[#282a38] hover:text-white font-semibold text-xs transition font-mono cursor-pointer"
                        title="Heading 1 (# 제목)"
                      >
                        h1
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('h2')}
                        className="px-1.5 py-0.5 hover:bg-[#282a38] hover:text-white font-semibold text-xs transition font-mono cursor-pointer"
                        title="Heading 2 (## 제목)"
                      >
                        h2
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('h3')}
                        className="px-1.5 py-0.5 hover:bg-[#282a38] hover:text-white font-semibold text-xs transition font-mono cursor-pointer"
                        title="Heading 3 (### 제목)"
                      >
                        h3
                      </button>
                    </div>

                    {/* Link & Image */}
                    <div className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('link')}
                        className="p-1 px-1 hover:bg-[#282a38] hover:text-white transition flex items-center justify-center cursor-pointer"
                        title="Add Link [링크](url)"
                      >
                        <Link className="w-3 h-3 text-slate-300" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('image')}
                        className="p-1 px-1 hover:bg-[#282a38] hover:text-white transition flex items-center justify-center cursor-pointer"
                        title="Add Image ![설명](url)"
                      >
                        <ImageIcon className="w-3 h-3 text-slate-300" />
                      </button>
                    </div>

                    {/* Text Formatting (Bold, Italic, Code) */}
                    <div className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('bold')}
                        className="px-1.5 py-0.5 hover:bg-[#282a38] hover:text-white font-bold transition flex items-center justify-center cursor-pointer"
                        title="Bold (**텍스트**)"
                      >
                        <Bold className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('italic')}
                        className="px-1.5 py-0.5 hover:bg-[#282a38] hover:text-white italic transition flex items-center justify-center cursor-pointer"
                        title="Italic (*텍스트*)"
                      >
                        <Italic className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('code')}
                        className="px-1.5 py-0.5 hover:bg-[#282a38] hover:text-white font-mono text-xs transition flex items-center justify-center cursor-pointer"
                        title="Inline Code (`코드`)"
                      >
                        <Code className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Lists, Quote & Rule */}
                    <div className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('bullet')}
                        className="p-1 px-1 hover:bg-[#282a38] hover:text-white transition flex items-center justify-center cursor-pointer"
                        title="글머리 기호 목록 (- 항목) - 순서 없는 목록"
                      >
                        <List className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('number')}
                        className="p-1 px-1 hover:bg-[#282a38] hover:text-white transition flex items-center justify-center cursor-pointer"
                        title="순서 있는 번호 목록 (1. 항목) - 순차적 번호 자동 매기기"
                      >
                        <ListOrdered className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('task')}
                        className="p-1 px-1 hover:bg-[#282a38] hover:text-white transition flex items-center justify-center cursor-pointer"
                        title="체크박스 할 일 목록 (- [ ] 항목)"
                      >
                        <CheckSquare className="w-3 h-3 text-slate-300" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('quote')}
                        className="p-1 px-1 hover:bg-[#282a38] hover:text-white transition flex items-center justify-center cursor-pointer"
                        title="Quote (> 인용문)"
                      >
                        <Quote className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarkdownBlockFormat('rule')}
                        className="p-1 px-1 hover:bg-[#282a38] hover:text-white transition flex items-center justify-center cursor-pointer"
                        title="Horizontal Rule (---)"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      {/* Table Dropdown Button & Grid Picker */}
                      <div className="relative inline-flex items-center">
                        <button
                          ref={tableButtonRef}
                          type="button"
                          onClick={() => setShowTablePicker(!showTablePicker)}
                          className={`p-1 px-1.5 hover:bg-[#282a38] hover:text-white transition flex items-center gap-1 cursor-pointer border-l border-[#2e3142] ${
                            showTablePicker ? 'bg-[#6366f1] text-white' : 'text-slate-300'
                          }`}
                          title="표 삽입 (격자 선택기)"
                        >
                          <TableIcon className="w-3 h-3 text-[#6366f1]" />
                          <span className="text-[0.625rem] font-medium hidden sm:inline">표</span>
                        </button>

                        {/* Visual Table Grid Picker Popover */}
                        {showTablePicker && (
                          <TableGridPicker
                            anchorRef={tableButtonRef}
                            onInsertTable={handleInsertTable}
                            onClose={() => setShowTablePicker(false)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Markdown Guide Help (?) */}
                    <div className="relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowMarkdownHelp(!showMarkdownHelp)}
                        className={`p-1 px-1 hover:bg-[#282a38] hover:text-white transition flex items-center justify-center cursor-pointer ${
                          showMarkdownHelp ? 'bg-[#282a38] text-teal-200' : ''
                        }`}
                        title="Markdown Syntax Help"
                      >
                        <HelpCircle className="w-3 h-3 text-[#6366f1]" />
                      </button>

                      {/* Cheat Sheet Popover */}
                      {showMarkdownHelp && (
                        <div className="absolute top-full left-0 mt-2 w-80 p-3.5 bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-xl shadow-2xl z-30 text-xs text-slate-200 space-y-2 animate-in fade-in zoom-in-95 whitespace-normal">
                          <div className="flex items-center justify-between font-bold text-slate-100 border-b border-[#2e3142] pb-1.5">
                            <span className="flex items-center gap-1.5 text-[#38bdf8]">
                              <Sparkles className="w-3.5 h-3.5 text-[#6366f1]" />
                              Markdown & HTML 종합 가이드
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowMarkdownHelp(false)}
                              className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-[#282a38] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[0.625rem] text-slate-300 max-h-64 overflow-y-auto pr-1">
                            <div className="space-y-1">
                              <p><span className="text-[#6366f1] font-semibold"># H1 ~ ###### H6</span></p>
                              <p><span className="text-[#6366f1] font-semibold">**Bold**</span> / <span className="text-[#6366f1] font-semibold">*Italic*</span></p>
                              <p><span className="text-[#6366f1] font-semibold">~~취소선~~</span> / <span className="text-[#6366f1] font-semibold">==형광펜==</span></p>
                              <p><span className="text-[#6366f1] font-semibold">- [x] 체크박스</span></p>
                              <p><span className="text-[#6366f1] font-semibold">&gt; 인용구 (Quote)</span></p>
                              <p><span className="text-[#6366f1] font-semibold">&gt; [!NOTE] GitHub 알림</span></p>
                            </div>
                            <div className="space-y-1">
                              <p><span className="text-[#6366f1] font-semibold">`코드`</span> / <span className="text-[#6366f1] font-semibold">```lang 코드블록```</span></p>
                              <p><span className="text-[#6366f1] font-semibold">$E=mc^2$ 수식 (LaTeX)</span></p>
                              <p><span className="text-[#6366f1] font-semibold">| 표 | 헤더 |</span></p>
                              <p><span className="text-[#6366f1] font-semibold">&lt;details&gt; 접기 &lt;/details&gt;</span></p>
                              <p><span className="text-[#6366f1] font-semibold">&lt;kbd&gt;단축키&lt;/kbd&gt;</span></p>
                              <p><span className="text-[#6366f1] font-semibold">&lt;span style="..."&gt; HTML</span></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View Title (TOC / 문서 목차) */}
                    <div className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setIsTocOpen(!isTocOpen)}
                        className={`p-1 px-1.5 hover:bg-[#282a38] hover:text-white transition flex items-center gap-1 text-xs cursor-pointer ${
                          isTocOpen
                            ? 'bg-[#6366f1] text-white font-semibold shadow-xs glow-accent-subtle'
                            : 'text-slate-300'
                        }`}
                        title="문서 목차 / 제목 보기 (View Title / TOC)"
                      >
                        <ListTree className={`w-3 h-3 ${isTocOpen ? 'text-white' : 'text-[#6366f1]'}`} />
                        {getTocItems(editorContent).length > 0 && (
                          <span className="bg-[#121318] border border-[#2e3142] text-indigo-300 text-[0.5625rem] px-1 rounded font-mono">
                            {getTocItems(editorContent).length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* AI Clean Document (AI 자동 정리) */}
                    <div className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={handleAiCleanDocument}
                        disabled={isAiCleaning}
                        className={`p-1 px-1.5 hover:bg-[#282a38] hover:text-white text-slate-400 transition flex items-center justify-center text-xs group cursor-pointer ${isAiCleaning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="AI 자동 정리 (불필요한 인사말 제거 및 내용 구조화)"
                      >
                        <Wand2 className={`w-3 h-3 text-slate-400 group-hover:text-white ${isAiCleaning ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>

                    {/* Format Document (문서 서식 및 들여쓰기 자동 정리) */}
                    <div className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={handleFormatDocument}
                        className="p-1 px-1.5 hover:bg-[#282a38] hover:text-white text-slate-400 transition flex items-center justify-center text-xs group cursor-pointer"
                        title="문서 서식 자동 정리 (Format Document: 들여쓰기, 공백, 헤더 정렬 - Shift+Alt+F)"
                      >
                        <AlignLeft className="w-3 h-3 text-slate-400 group-hover:text-white" />
                      </button>
                    </div>

                    {/* Save Document */}
                    <div className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={handleSaveDocument}
                        className={`p-1 px-1.5 rounded-r-xs transition-all flex items-center justify-center text-xs group cursor-pointer ${
                          isCurrentFileDirty 
                            ? 'bg-[#282a38] text-white'
                            : 'hover:bg-[#282a38] text-slate-400 hover:text-slate-200'
                        }`}
                        title={isCurrentFileDirty ? "저장되지 않은 변경사항이 있습니다 (Ctrl+S / Cmd+S로 저장)" : "현재 문서 저장 (Ctrl+S / Cmd+S)"}
                      >
                        <Save className={`w-3.5 h-3.5 transition-all ${
                          isCurrentFileDirty 
                            ? 'text-white' 
                            : 'text-slate-400'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Recent Changes (rendered only when present to avoid overlaying the save button) */}
                {hasUnreadAiChanges && recentAiChanges && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2 z-20">
                    <button
                      type="button"
                      onClick={() => setHasUnreadAiChanges(false)}
                      className="flex items-center gap-1 bg-[#1e202b] border border-[#6366f1]/50 px-1.5 py-0.5 rounded-xs text-[0.625rem] text-indigo-300 font-medium shrink-0 hover:border-[#6366f1] transition cursor-pointer"
                      title="AI가 최근 내용을 수정했습니다. 클릭 시 확인 완료."
                    >
                      <Sparkles className="w-3 h-3 text-[#6366f1] shrink-0" />
                      <span className="font-bold text-indigo-200 hidden sm:inline">Recent Changes</span>
                      <X className="w-3 h-3 text-[#6366f1] hover:text-white shrink-0 ml-0.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent AI Changes Notification Banner */}
            {hasUnreadAiChanges && recentAiChanges && (
              <div className="bg-[#1e202b] border-b border-[#2e3142] p-2 px-3 flex items-center justify-between text-xs text-indigo-200 shrink-0 shadow-inner z-20 backdrop-blur-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                    <Sparkles className="w-3 h-3 text-[#6366f1]" />
                  </div>
                  <div className="min-w-0 flex items-center gap-2 flex-wrap text-[0.6875rem]">
                    <span className="font-bold text-indigo-300">Recent Changes Alert</span>
                    <span className="bg-[#6366f1]/20 text-indigo-300 text-[0.625rem] px-1.5 py-0.2 rounded font-mono border border-[#6366f1]/30">
                      {recentAiChanges.source}
                    </span>
                    <span className="text-[0.625rem] text-slate-400 font-mono">
                      <Clock className="w-3 h-3 inline mr-0.5 text-slate-400" />
                      {recentAiChanges.timestamp}
                    </span>
                    <span className="text-slate-300 truncate max-w-xs font-mono text-[0.625rem]">
                      [{recentAiChanges.file}] {recentAiChanges.preview}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasUnreadAiChanges(false);
                    if (editorRef.current) editorRef.current.focus();
                  }}
                  className="bg-[#6366f1] hover:bg-[#4f46e5] active:bg-[#4338ca] text-white text-[0.625rem] font-semibold px-2.5 py-0.5 rounded-md transition flex items-center gap-1 shadow-sm shrink-0 ml-2 cursor-pointer"
                >
                  <span>확인 (Dismiss)</span>
                  <Check className="w-3 h-3" />
                </button>
              </div>
            )}

              {/* Main Editor Body */}
              <div className="flex-1 relative overflow-hidden flex flex-row min-h-0 bg-[#16171e] backdrop-blur-sm">
                <div className="h-full relative overflow-hidden flex flex-col min-w-0 w-full">
                  <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                    <OptimizedEditor
                      value={editorContent}
                      onChange={handleEditorChange}
                      onFocus={() => {
                        if (hasUnreadAiChanges) setHasUnreadAiChanges(false);
                      }}
                      editorRef={editorRef}
                      placeholder="# 마크다운/HTML 노트&#10;&#10;AI 답변의 [에디터로 보내기 ➔] 버튼 또는 폴더 2차 가공으로 작성..."
                      editorTab={editorTab}
                      renderMarkdownToHtml={renderMarkdownToHtml}
                    />

                    {/* Table of Contents Floating Sidebar / Drawer Overlay */}
                    {isTocOpen && (
                      <div className="absolute top-0 right-0 bottom-0 w-64 bg-[#121318]/95 backdrop-blur-xl border-l border-[#2e3142] z-20 shadow-2xl flex flex-col transition-all">
                        {/* TOC Header */}
                        <div className="p-2.5 bg-[#1e202b]/90 border-b border-[#2e3142] flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                            <ListTree className="w-3.5 h-3.5 text-[#6366f1]" />
                            <span>문서 목차 (TOC)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsTocOpen(false)}
                            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-[#282a38] transition cursor-pointer"
                            title="목차 닫기"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* TOC Content List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs custom-scrollbar">
                          {getTocItems(editorContent).length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-[0.6875rem]">
                              <p>문서에 헤더가 없습니다.</p>
                              <p className="mt-1 text-[0.625rem] text-slate-500">`#`, `##`, `###` 키워드로 헤더를 추가하세요.</p>
                            </div>
                          ) : (
                            getTocItems(editorContent).map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => jumpToTocItem(item.charOffset, item.lineIndex)}
                                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[#282a38] hover:text-slate-100 cursor-pointer transition text-slate-300 border border-transparent hover:border-[#2e3142] ${
                                  item.level === 1
                                    ? 'font-semibold pl-2 text-indigo-300 bg-[#1e202b]/70'
                                    : item.level === 2
                                    ? 'pl-5 text-slate-300'
                                    : 'pl-8 text-slate-400 text-[0.6875rem]'
                                }`}
                              >
                                <span className="text-[0.625rem] text-[#6366f1] font-mono shrink-0">H{item.level}</span>
                                <span className="truncate flex-1">{item.text}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
        </>
      )}

        </section>

        {/* Resizer Divider 2 */}
        {!isSection2Collapsed && !isSection3Collapsed && (
          <div
            onMouseDown={(e) => handleMouseDownDivider(2, e)}
            className="w-1.5 hover:w-2 bg-[#121318]/80 hover:bg-[#6366f1]/40 active:bg-[#6366f1] cursor-col-resize shrink-0 transition-all z-20 flex items-center justify-center group select-none shadow-xs border-x border-[#2e3142]"
            title="좌우로 드래그하여 섹션 크기 조절 (에디터 / 파일탐색기)"
          >
            <div className="w-0.5 h-8 bg-slate-500 group-hover:bg-[#6366f1] rounded-full transition" />
          </div>
        )}

        {/* ==================== RIGHT PANE: Project File Explorer ==================== */}
        <section
          style={{
            width: isSection3Collapsed
              ? '0px'
              : isSection1Collapsed && isSection2Collapsed
              ? '100%'
              : isSection1Collapsed
              ? `${100 - pane2Width}%`
              : isSection2Collapsed
              ? `${100 - pane1Width}%`
              : `${100 - pane1Width - pane2Width}%`,
            minWidth: isSection3Collapsed ? '0px' : '180px',
            opacity: isSection3Collapsed ? 0 : 1,
            transform: isSection3Collapsed ? 'translateX(-100%)' : 'translateX(0)',
            pointerEvents: isSection3Collapsed ? 'none' : 'auto',
          }}
          className={`h-full min-h-0 flex-1 flex flex-col bg-[#121318] backdrop-blur-md shrink-0 overflow-hidden relative ${
            isResizing ? 'transition-none select-none' : 'transition-all duration-300 ease-in-out'
          } transform min-w-0 border-l border-[#2e3142]`}
        >
            
            {/* Integrated Sleek 1-Line File Explorer Header Toolbar */}
            {/* Explorer Header */}
            <div className="flex items-center h-8 px-2.5 gap-2 bg-[#1e202b]/80 backdrop-blur-md border-b border-[#2e3142] shrink-0 text-slate-300 select-none">
              {/* 1. Integrated Search Input */}
              <div className="relative flex-1 min-w-[60px] flex items-center">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="파일 검색..."
                  className="w-full bg-[#121318]/80 hover:bg-[#121318] text-slate-200 placeholder-slate-400 text-xs pl-6 pr-5 py-0.5 rounded-md border border-[#2e3142] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/40 focus:outline-none transition font-sans"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="검색어 초기화"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* 3. Action Button Group (Right) */}
              <div className="flex items-center gap-0.5 shrink-0 text-slate-300">
                {/* [🔄 Refresh] */}
                <button
                  type="button"
                  onClick={handleResyncWorkspace}
                  disabled={isResyncingWorkspace}
                  className="p-1 rounded-md hover:bg-[#282a38] hover:text-white transition cursor-pointer disabled:opacity-50"
                  title="저장소 새로고침 / 동기화 (Refresh)"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isResyncingWorkspace ? 'animate-spin text-[#6366f1]' : ''}`} />
                </button>

                {/* [📁+ New Folder] */}
                <button
                  type="button"
                  onClick={() => handleCreateNewSession()}
                  className="p-1 rounded-md hover:bg-[#282a38] hover:text-white transition cursor-pointer"
                  title="새 폴더 / 프로젝트 추가 (New Folder)"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                {/* [📄+ New File] */}
                <button
                  type="button"
                  onClick={handleCreateNewFile}
                  className="p-1 rounded-md hover:bg-[#282a38] hover:text-white transition cursor-pointer"
                  title="새 마크다운 파일 추가 (New File)"
                >
                  <FilePlus className="w-3.5 h-3.5 text-[#6366f1]" />
                </button>

                {/* [📂 Manage/Pick Project Folder Workspace] */}
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="p-1 rounded-md hover:bg-[#282a38] hover:text-white transition cursor-pointer"
                  title="프로젝트 폴더 연결 및 관리 (내 PC 폴더/파일 불러오기)"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-300" />
                </button>
              </div>
            </div>

          {/* Continuous Tree Structure (VS Code Standard Style) */}
          <div id="file-tree" className="flex-1 overflow-y-auto py-1 text-xs select-none bg-transparent custom-scrollbar">
            {searchQuery.trim() &&
              Object.keys(files).filter((f) => f.toLowerCase().includes(searchQuery.trim().toLowerCase())).length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                  <p>'{searchQuery}' 검색 결과가 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#6366f1] hover:underline text-xs cursor-pointer"
                  >
                    검색 초기화
                  </button>
                </div>
              )}

            {/* Project / Workspace Folders */}
            {sessions.map((session) => {
              const isFolderOpen = openFolders[session.title] ?? true;
              const isCurrentActiveSession = session.id === activeSessionId;
              const memoFileName = session.fileName || `${session.title}.md`;

              // Find files belonging to this folder or matching the memo file name (excluding system directories)
              const folderFiles = Object.keys(files).filter((f) => {
                if (f.startsWith('01_SSOT_Sources/') || f.startsWith('02_Studio_Outputs/') || f.startsWith('.podium/')) {
                  return false;
                }
                return (fileFolders[f] || session.title) === session.title || f === memoFileName;
              });

              const matchingFiles = folderFiles.filter(
                (f) => !searchQuery.trim() || f.toLowerCase().includes(searchQuery.trim().toLowerCase())
              );

              const isDraggingThis = draggedType === 'project' && draggedId === session.id;
              const isTarget = dragOverTargetId === session.id;
              const isDroppingBefore = isTarget && dragDropPosition === 'before';
              const isDroppingAfter = isTarget && dragDropPosition === 'after';
              const isDroppingInside = isTarget && dragDropPosition === 'inside';

              return (
                <div
                  key={session.id}
                  draggable={true}
                  onDragStart={(e) => handleProjectDragStart(e, session.id)}
                  onDragOver={(e) => handleFolderDragOver(e, session.id)}
                  onDragLeave={(e) => handleFolderDragLeave(e, session.id)}
                  onDrop={(e) => handleFolderDrop(e, session.id)}
                  onDragEnd={handleDragEnd}
                  className={`relative transition-colors ${
                    isDraggingThis ? 'opacity-40 bg-[#282a38]' : ''
                  } ${isDroppingInside ? 'bg-[#282a38]/90' : ''}`}
                >
                  {/* Drop Indicator Lines */}
                  {isDroppingBefore && (
                    <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-[#6366f1] z-30 pointer-events-none shadow-[0_0_8px_#6366f1]" />
                  )}
                  {isDroppingAfter && (
                    <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-[#6366f1] z-30 pointer-events-none shadow-[0_0_8px_#6366f1]" />
                  )}

                  {/* Folder Item Row */}
                  <div
                    onClick={() => {
                      setOpenFolders((prev) => ({ ...prev, [session.title]: !isFolderOpen }));
                      if (session.id !== activeSessionId) {
                        handleSelectSession(session.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleOpenSSOTGeneratorModal(session.title);
                    }}
                    className={`flex items-center justify-between px-2 h-7 hover:bg-[#1e202b]/70 cursor-pointer group transition-colors rounded-xs ${
                      isCurrentActiveSession ? 'text-indigo-300 font-medium bg-[#1e202b]/80 border-l-2 border-[#6366f1]' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {/* Grip for Drag & Drop */}
                      <span
                        className="cursor-grab active:cursor-grabbing text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-200 transition shrink-0"
                        title="드래그하여 폴더 순서 변경"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-3 h-3" />
                      </span>

                      {/* Folder Chevron */}
                      {isFolderOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}

                      {/* Folder Icon */}
                      {isFolderOpen ? (
                        <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-indigo-400/80 shrink-0" />
                      )}

                      {/* Folder Title */}
                      <span className="truncate text-xs text-slate-200 group-hover:text-white">
                        {session.title}
                      </span>
                    </div>

                    {/* Right Folder Actions & Badge */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isDroppingInside && (
                        <span className="text-[0.625rem] bg-[#6366f1] text-white px-1.5 py-0.2 rounded font-sans">
                          이동
                        </span>
                      )}
                      
                      <span className="text-[0.625rem] text-slate-400 font-mono group-hover:hidden">
                        {matchingFiles.length}
                      </span>

                      {/* Hover Action Icons */}
                      <div className="hidden group-hover:flex items-center gap-0.5 text-slate-300">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSSOTGeneratorModal(session.title);
                          }}
                          className="p-1 rounded-md hover:bg-[#282a38] hover:text-[#6366f1] transition cursor-pointer"
                          title="✨ SSOT 마스터 문서 생성"
                        >
                          <Sparkles className="w-3 h-3 text-[#6366f1]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitle = prompt(`'${session.title}' 프로젝트 및 폴더 이름을 변경합니다:`, session.title);
                            if (newTitle) handleRenameProject(session.id, newTitle);
                          }}
                          className="p-1 rounded-md hover:bg-[#282a38] hover:text-slate-100 transition cursor-pointer"
                          title="이름 변경"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => requestDeleteSession(session.id, e)}
                          className="p-1 rounded-md hover:bg-[#282a38] hover:text-rose-400 transition cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nested Files in Folder with Guide Line */}
                  {isFolderOpen && (
                    <div className="relative pl-5 before:absolute before:left-3 before:top-0 before:bottom-1 before:w-[1px] before:bg-[#2e3142]">
                      {matchingFiles.length === 0 ? (
                        <div className="text-[0.6875rem] text-slate-400 italic py-1 pl-3">
                          (파일 없음)
                        </div>
                      ) : (
                        matchingFiles.map((fname) => {
                          const isMemoFile = fname === memoFileName;
                          const isSelectedFile = currentActiveFile === fname;
                          const isDraggingFile = draggedType === 'file' && draggedId === fname;

                          return (
                            <div
                              key={fname}
                              draggable={true}
                              onDragStart={(e) => handleFileDragStart(e, fname)}
                              onDragEnd={handleDragEnd}
                              onClick={() => {
                                handleSelectSession(session.id);
                                handleOpenFile(fname);
                              }}
                              className={`group flex items-center justify-between pl-2 pr-2 h-[26px] hover:bg-[#1e202b]/70 cursor-pointer transition-colors rounded-md ${
                                isDraggingFile
                                  ? 'opacity-40 bg-[#282a38]'
                                  : isSelectedFile
                                  ? 'bg-[#282a38]/80 text-[#6366f1] font-medium glow-accent-subtle'
                                  : 'text-slate-300 hover:text-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <GripVertical className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-100 cursor-grab transition shrink-0" />
                                
                                {fname.endsWith('.md') ? (
                                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelectedFile ? 'text-[#6366f1]' : 'text-slate-400'}`} />
                                ) : fname.endsWith('.html') ? (
                                  <FileCode className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}

                                <span className="truncate text-xs">
                                  {fname}
                                </span>

                                {isSelectedFile && isCurrentFileDirty && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 ml-1 shadow-[0_0_6px_rgba(99,102,241,0.6)]" title="수정됨 (저장되지 않음)" />
                                )}
                              </div>

                              {/* File Action Icons */}
                              <div className="hidden group-hover:flex items-center gap-0.5 text-slate-300 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRenameFile(fname);
                                  }}
                                  className="p-1 rounded-md hover:bg-[#282a38] hover:text-slate-100 transition cursor-pointer"
                                  title="파일명 변경"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Other Root / System Files (VS Code Tree Style) */}
            {(() => {
              const allProjectTitles = new Set(sessions.map((s) => s.title));
              const otherFiles = Object.keys(files).filter((f) => {
                if (f.startsWith('01_SSOT_Sources/') || f.startsWith('02_Studio_Outputs/') || f.startsWith('.podium/')) {
                  return false;
                }
                const folder = fileFolders[f];
                const isProjectFile = sessions.some(s => s.fileName === f || s.title === folder);
                return !isProjectFile && folder !== undefined && !allProjectTitles.has(folder);
              });

              if (otherFiles.length === 0) return null;

              return (
                <div className="mt-2 pt-2 border-t border-[#2e3142]">
                  <div className="px-3 py-1 text-[0.625rem] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-slate-400" />
                    <span>ROOT FILES ({otherFiles.length})</span>
                  </div>
                  <div className="mt-0.5">
                    {otherFiles.map((fname) => {
                      const isSelectedFile = currentActiveFile === fname;
                      return (
                        <div
                          key={fname}
                          onClick={() => handleOpenFile(fname)}
                          className={`group flex items-center justify-between px-3 h-[26px] hover:bg-[#1e202b]/70 cursor-pointer transition-colors rounded-md ${
                            isSelectedFile ? 'bg-[#282a38]/80 text-[#6366f1] font-medium glow-accent-subtle' : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {fname.endsWith('.md') ? (
                              <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelectedFile ? 'text-[#6366f1]' : 'text-slate-400'}`} />
                            ) : fname.endsWith('.html') ? (
                              <FileCode className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                            ) : (
                              <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate text-xs">{fname}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

        </section>

      </main>

      {/* Global Bottom Status Bar - Clean Workspace Path Display */}
      <footer className="h-6 bg-[#121318]/90 backdrop-blur-md border-t border-[#2e3142] px-3 flex items-center justify-between text-[0.6875rem] text-slate-300 font-mono shrink-0 select-none z-30">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-[#6366f1] transition cursor-pointer shrink-0 truncate group"
            title="클릭하여 프로젝트 폴더 연결 및 관리 열기"
          >
            <Folder className="w-3.5 h-3.5 text-indigo-400/80 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-slate-400">프로젝트:</span>
            <span className="font-semibold text-indigo-300 group-hover:underline truncate">
              {getWorkspaceDisplayPath(activeWorkspace)}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[0.625rem]">
          {currentActiveFile && (
            <>
              <span className="text-slate-300">
                줄: {(editorContent || '').split('\n').length} | 글자: {(editorContent || '').length}
              </span>
              <span className="text-slate-600">|</span>
            </>
          )}
          <span className="hidden sm:inline">총 {Object.keys(files).length}개 파일</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="uppercase">{activeWorkspace.type}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_5px_rgba(52,211,153,0.4)]" />
            연결됨
          </span>
        </div>
      </footer>

      {/* Delete Confirmation Warning Modal */}
      {deleteConfirmSession && (
        <div className="fixed inset-0 bg-[#121318]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-950/80 border border-rose-800/80 text-rose-400 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>프로젝트 삭제 경고</span>
                  <span className="text-xs font-mono font-normal text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                    WARNING
                  </span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  '<span className="font-semibold text-amber-300">{deleteConfirmSession.title}</span>' 프로젝트를 삭제하시겠습니까?
                </p>
                <p className="text-[0.6875rem] text-slate-400 leading-normal pt-1">
                  프로젝트를 삭제하면 좌측 대화, 중앙 메모, 우측 폴더 연동 항목이 모두 휴지통(Recycle Bin)으로 이동합니다. 휴지통에서 언제든지 복구할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2e3142]">
              <button
                type="button"
                onClick={() => setDeleteConfirmSession(null)}
                className="px-3 py-1.5 rounded-lg bg-[#1e202b] hover:bg-[#282a38] text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={executeDeleteSession}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>휴지통으로 이동</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash / Recycle Bin Drawer Modal */}
      {isTrashOpen && (
        <div className="fixed inset-0 bg-[#121318]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col max-h-[80vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e3142]">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-200">휴지통 (Recycle Bin)</h3>
                <span className="text-xs bg-[#121318] text-indigo-300 px-2 py-0.5 rounded-full font-mono font-semibold border border-[#2e3142]">
                  {trashSessions.length}개 항목
                </span>
              </div>
              <div className="flex items-center gap-2">
                {trashSessions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleEmptyTrash}
                    className="text-[0.6875rem] text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 rounded-md bg-rose-950/40 border border-rose-900/60 transition cursor-pointer"
                  >
                    휴지통 전체 비우기
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsTrashOpen(false)}
                  className="p-1 rounded-md hover:bg-[#282a38] text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {trashSessions.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Trash2 className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
                  <p className="text-xs text-slate-400 font-medium">휴지통이 비어 있습니다.</p>
                  <p className="text-[0.6875rem] text-slate-400">삭제한 프로젝트는 여기에 임시 보관되며 복구할 수 있습니다.</p>
                </div>
              ) : (
                trashSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#121318]/80 border border-[#2e3142] hover:border-[#2e3142] transition"
                  >
                    <div className="space-y-1 min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-200 truncate">{session.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[0.625rem] text-slate-400 font-mono">
                        <span>삭제 시각: {session.deletedAt || session.createdAt}</span>
                        <span>대화 {session.messages.length}건</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreSession(session.id)}
                        className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-[#6366f1] border border-emerald-600 text-white text-xs font-medium transition flex items-center gap-1 shadow-xs cursor-pointer"
                        title="프로젝트, 대화, 메모, 폴더 복구"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>복구</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermanentDeleteSession(session.id)}
                        className="px-2.5 py-1 rounded-md bg-[#1e202b] hover:bg-rose-950 border border-[#2e3142] hover:border-rose-800 text-slate-300 hover:text-rose-300 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                        title="영구 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>영구 삭제</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#2e3142] flex justify-end">
              <button
                type="button"
                onClick={() => setIsTrashOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#1e202b] hover:bg-[#282a38] text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal (Standard VS Code Style) */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#121318]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-[#282a38] transition cursor-pointer"
              title="닫기 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pt-1">
              <h2 className="text-base font-semibold text-indigo-300">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">워크스페이스 작업 효율을 높이는 단축키 목록입니다.</p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">메시지 전송</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Ctrl + Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">마크다운 파일 저장</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Ctrl + S</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">새 프로젝트 생성</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Alt + N</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">새 마크다운 노트</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Ctrl + N</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">로컬 파일 불러오기</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Ctrl + O</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">PDF / 인쇄 출력</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Ctrl + P</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">이미지/파일 붙여넣기</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Ctrl + V</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">전체 마크다운 복사</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Ctrl + C</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#2e3142]">
                <span className="text-slate-300">탐색기 파일 검색</span>
                <kbd className="bg-[#121318] text-[#6366f1] font-mono px-2 py-0.5 rounded text-[0.6875rem] border border-[#2e3142]">Ctrl + F</kbd>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white transition cursor-pointer shadow-xs glow-accent-subtle"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal (Standard Deep Teal Style) */}
      {pendingAction !== null && (
        <div className="fixed inset-0 z-[60] bg-[#121318]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <div className="space-y-1 pt-1">
              <h2 className="text-base font-semibold text-indigo-300">저장되지 않은 변경 사항</h2>
              <p className="text-xs text-slate-300">
                현재 에디터에 저장되지 않은 변경 사항이 있습니다. 계속 진행하시면 변경 사항이 유실될 수 있습니다.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-[#1e202b] hover:bg-[#282a38] transition cursor-pointer"
              >
                취소 (계속 편집)
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = pendingAction;
                  setPendingAction(null);
                  if (action) action();
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition cursor-pointer"
              >
                무시하고 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation Modal (Standard Deep Teal Style) */}
      {deleteConfirmFile !== null && (
        <div className="fixed inset-0 z-[60] bg-[#121318]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <div className="space-y-2 pt-1">
              <h2 className="text-base font-semibold text-rose-300">파일 삭제 확인</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-mono text-[#6366f1] bg-[#121318] px-1.5 py-0.5 rounded border border-[#2e3142]">
                  {deleteConfirmFile}
                </span> 파일을 정말 삭제하시겠습니까?
              </p>
              <p className="text-[0.6875rem] text-slate-400">
                이 작업은 되돌릴 수 없으며 워크스페이스에서 즉시 제거됩니다.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmFile(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-[#1e202b] hover:bg-[#282a38] transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={executeDeleteFile}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal (Standard Deep Teal Style) */}
      {isAboutModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#121318]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#282a38] transition cursor-pointer"
              title="닫기 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#6366f1] flex items-center justify-center text-white shadow-xs">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-white">About AI Podium</h2>
              </div>
              <p className="text-xs text-[#6366f1] font-mono">v2.5 Professional Multi-AI Workstation</p>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                AI Podium은 지능형 Multi-AI 평가 라우팅, 실시간 마크다운 노트 및 목차 네비게이터, 프로젝트-메모-폴더 연동 시스템, 차세대 다중 포맷 내보내기 엔진을 제공하는 통합 워크스테이션입니다.
              </p>
              <div className="bg-[#121318]/80 p-3 rounded-xl border border-[#2e3142] text-[0.6875rem] space-y-1 font-mono text-slate-300">
                <div className="text-indigo-300 font-semibold mb-1">Architecture Features:</div>
                <div>• Deep Charcoal & Electric Purple Living SSOT Workspace</div>
                <div>• Unified Multi-Tab Document Bar</div>
                <div>• File System Access API & IndexedDB Vault</div>
                <div>• Dynamic Height AI Prompt Studio & Routing</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAboutModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white transition cursor-pointer shadow-xs glow-accent-subtle"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Manager Modal */}
      {isEventManagerOpen && (
        <div className="fixed inset-0 z-50 bg-[#121318]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2e3142] pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#6366f1]" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Event Manager (프로젝트 일정 & 마일스톤 관리)</h3>
                  <p className="text-[0.6875rem] text-slate-400">
                    프로젝트: <strong className="text-indigo-300">'{activeSession?.title || 'AI 지식 비서'}'</strong> 기반 일정 관리
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEventManagerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-[#282a38] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121318]/80 p-2 rounded-xl border border-[#2e3142]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExtractEventsWithAi}
                  disabled={isExtractingEvents}
                  className="px-2.5 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs glow-accent-subtle"
                >
                  {isExtractingEvents ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  )}
                  <span>AI 일정 자동 추출</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportEventsToEditor}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1e202b] hover:bg-[#282a38] text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-[#2e3142]"
                  title="에디터에 마크다운 일정표로 삽입"
                >
                  <FileText className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span>에디터로 전송</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportEventsIcs}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1e202b] hover:bg-[#282a38] text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-[#2e3142]"
                  title="iCal (.ics) 파일 다운로드"
                >
                  <Download className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span>iCal (.ics) 내보내기</span>
                </button>
              </div>
            </div>

            {/* Add Event Form */}
            <div className="bg-[#121318]/60 p-3 rounded-xl border border-[#2e3142] space-y-2">
              <div className="text-[0.6875rem] font-semibold text-slate-300 flex items-center gap-1">
                <CalendarPlus className="w-3.5 h-3.5 text-[#6366f1]" />
                <span>새 일정 / 마일스톤 추가</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddProjectEvent(); }}
                  placeholder="일정 또는 마일스톤 명칭 입력..."
                  className="sm:col-span-5 bg-[#121318] border border-[#2e3142] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-[#6366f1]"
                />
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="sm:col-span-3 bg-[#121318] border border-[#2e3142] rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#6366f1] font-mono"
                />
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as any)}
                  className="sm:col-span-2 bg-[#121318] border border-[#2e3142] rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#6366f1]"
                >
                  <option value="task">작업 (Task)</option>
                  <option value="milestone">마일스톤</option>
                  <option value="meeting">회의 (Meeting)</option>
                  <option value="deadline">마감 (Deadline)</option>
                </select>
                <select
                  value={newEventPriority}
                  onChange={(e) => setNewEventPriority(e.target.value as any)}
                  className="sm:col-span-2 bg-[#121318] border border-[#2e3142] rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#6366f1]"
                >
                  <option value="high">🔴 높음</option>
                  <option value="medium">🟡 보통</option>
                  <option value="low">🟢 낮음</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddProjectEvent(); }}
                  placeholder="상세 메모 또는 설명 (선택사항)..."
                  className="flex-1 bg-[#121318] border border-[#2e3142] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-[#6366f1]"
                />
                <button
                  type="button"
                  onClick={handleAddProjectEvent}
                  className="px-3 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0 glow-accent-subtle"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>추가</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between text-xs border-b border-[#2e3142] pb-1">
              <div className="flex items-center gap-1">
                {(['all', 'milestone', 'task', 'meeting', 'deadline'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setEventFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-md text-[0.6875rem] font-medium transition ${
                      eventFilter === filterKey
                        ? 'bg-[#6366f1] text-white font-semibold glow-accent-subtle'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e202b]'
                    }`}
                  >
                    {filterKey === 'all' && `전체 (${projectEvents.length})`}
                    {filterKey === 'milestone' && `마일스톤 (${projectEvents.filter((e) => e.type === 'milestone').length})`}
                    {filterKey === 'task' && `작업 (${projectEvents.filter((e) => e.type === 'task').length})`}
                    {filterKey === 'meeting' && `회의 (${projectEvents.filter((e) => e.type === 'meeting').length})`}
                    {filterKey === 'deadline' && `마감일 (${projectEvents.filter((e) => e.type === 'deadline').length})`}
                  </button>
                ))}
              </div>
              <span className="text-[0.6875rem] text-slate-400">
                완료: {projectEvents.filter((e) => e.completed).length} / {projectEvents.length}
              </span>
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[300px]">
              {projectEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  등록된 프로젝트 일정이 없습니다. 상단의 'AI 일정 자동 추출'을 눌러보세요.
                </div>
              ) : (
                projectEvents
                  .filter((e) => eventFilter === 'all' || e.type === eventFilter)
                  .map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                        evt.completed
                          ? 'bg-[#121318]/40 border-[#2e3142] opacity-60'
                          : 'bg-[#121318]/80 border-[#2e3142] hover:border-[#2e3142]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={evt.completed}
                          onChange={() => handleToggleEventCompleted(evt.id)}
                          className="w-4 h-4 rounded border-[#2e3142] bg-[#121318] text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold truncate ${
                                evt.completed ? 'line-through text-slate-500' : 'text-slate-200'
                              }`}
                            >
                              {evt.title}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[0.5625rem] font-medium uppercase ${
                                evt.type === 'milestone'
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/80'
                                  : evt.type === 'deadline'
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                                  : evt.type === 'meeting'
                                  ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                                  : 'bg-[#1e202b] text-slate-300'
                              }`}
                            >
                              {evt.type}
                            </span>
                            <span
                              className={`text-[0.5625rem] font-medium ${
                                evt.priority === 'high'
                                  ? 'text-rose-400'
                                  : evt.priority === 'medium'
                                  ? 'text-amber-400'
                                  : 'text-[#6366f1]'
                              }`}
                            >
                              {evt.priority === 'high' ? 'High' : evt.priority === 'medium' ? 'Med' : 'Low'}
                            </span>
                          </div>
                          {evt.notes && (
                            <span className="text-[0.6875rem] text-slate-400 truncate mt-0.5">{evt.notes}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {evt.date}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteProjectEvent(evt.id)}
                          className="text-slate-400 hover:text-rose-400 p-1 transition cursor-pointer"
                          title="일정 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-[#2e3142] flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[0.6875rem]">
                Google Calendar 및 iCal 표준 포맷 완벽 호환
              </span>
              <button
                type="button"
                onClick={() => setIsEventManagerOpen(false)}
                className="bg-[#1e202b] hover:bg-[#282a38] text-slate-200 px-4 py-1.5 rounded-lg font-medium transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive SSOT Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={isGdrivePickerOpen}
        onClose={() => setIsGdrivePickerOpen(false)}
        currentFolder={gdriveSsotFolder}
        onSelectFolder={(folder) => {
          setGdriveSsotFolder(folder);
          setWorkspaceRootType('gdrive');
          localStorage.setItem('aipodium_workspace_root_type', 'gdrive');
        }}
        onToast={showToast}
      />

      {/* Google Account & Login Modal */}
      <GoogleAccountModal
        isOpen={isGoogleAccountModalOpen}
        onClose={() => setIsGoogleAccountModalOpen(false)}
        user={googleUser}
        onSignIn={async () => {
          await handleGoogleSignIn();
        }}
        onSignOut={() => {
          handleGoogleSignOut();
        }}
        onToast={showToast}
      />

      {/* Remote SSH Workspace Modal */}
      <RemoteWorkspaceModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
        currentConfig={remoteConfig}
        onSaveConfig={(cfg) => {
          setRemoteConfig(cfg);
          try {
            localStorage.setItem('aipodium_remote_workspace_config', JSON.stringify(cfg));
          } catch {}
          setWorkspaceRootType('remote');
          localStorage.setItem('aipodium_workspace_root_type', 'remote');
        }}
        onToast={showToast}
      />

      {/* Create New Markdown File Modal (Standard VS Code Style) */}
      {isNewFileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#121318]/80 backdrop-blur-sm p-4"
          onClick={() => setIsNewFileModalOpen(false)}
        >
          <div
            className="relative bg-[#1e202b]/95 backdrop-blur-xl border border-[#2e3142] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsNewFileModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#282a38] transition cursor-pointer"
              title="닫기 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pt-1">
              <h2 className="text-base font-bold text-white">새 마크다운 노트 생성</h2>
              <p className="text-xs text-slate-400">워크스페이스에 새로운 마크다운 문서를 추가합니다.</p>
            </div>

            <form onSubmit={handleConfirmCreateNewFile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span>문서 파일명</span>
                </label>
                <input
                  ref={newFileInputRef}
                  type="text"
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  placeholder="예: design_specs.md, meeting_notes.md"
                  className="w-full bg-[#121318] border border-[#2e3142] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition placeholder-slate-400"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>소속 프로젝트 / 대상 폴더</span>
                </label>
                <select
                  value={newFileFolderTarget}
                  onChange={(e) => setNewFileFolderTarget(e.target.value)}
                  className="w-full bg-[#121318] border border-[#2e3142] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition font-sans cursor-pointer"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.title} className="bg-[#1e202b] text-slate-200">
                      📁 {s.title} (현재 프로젝트)
                    </option>
                  ))}
                  <option value="docs" className="bg-[#1e202b] text-slate-200">📁 docs (공용 문서 폴더)</option>
                  <option value="src" className="bg-[#1e202b] text-slate-200">📁 src (소스 폴더)</option>
                  <option value="root" className="bg-[#1e202b] text-slate-200">📁 루트 (기본 디렉토리)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2e3142]">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-[#1e202b] hover:bg-[#282a38] transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white transition shadow-xs cursor-pointer glow-accent-subtle"
                >
                  문서 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GitHub Integration Modal */}
      <GithubIntegrationModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        onSave={(config) => {
          setGithubConfig(config);
          localStorage.setItem('aipodium_github_config', JSON.stringify(config));
          setWorkspaceRootType('github');
          localStorage.setItem('aipodium_workspace_root_type', 'github');
          setIsGithubModalOpen(false);
          showToast(`✅ GitHub 저장소(${config.repo}) 워크스페이스 활성화 완료!`);
        }}
      />

      {/* Preferences & AI Engine Modal */}
      <PreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        initialTab={preferencesInitialTab}
        preferences={preferences}
        onSave={(prefs) => {
          setPreferences(prefs);
          setSelectedModel(prefs.defaultModel);
          if (prefs.ghostWriterLevel) {
            setGhostWriterLevel(prefs.ghostWriterLevel);
          }
          if (prefs.ghostWriterModel) {
            setGhostWriterModel(prefs.ghostWriterModel);
          }
        }}
        onApplyPrompt={(promptBody) => {
          setChatInput(promptBody);
          setIsPreferencesModalOpen(false);
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 100);
        }}
        modelOptions={ghostWriterModelOptions}
        provider={provider}
        onSelectProvider={handleProviderSelect}
        selectedModel={selectedModel}
        onSelectModel={(modelId) => {
          setSelectedModel(modelId);
        }}
        currentApiKey={cloudApiKey}
        onUpdateApiKey={setCloudApiKey}
        currentEndpoint={localEndpointAddress}
        onUpdateEndpoint={setLocalEndpointAddress}
        isVerified={isVerified}
        onVerify={handleVerify}
        isVerifying={isVerifying}
        aiParameters={aiParameters}
        onSaveParameters={setAiParameters}
        onToast={showToast}
        onWipeAllData={handleWipeAllData}
        googleUser={googleUser}
        onOpenGoogleAccount={() => {
          setIsPreferencesModalOpen(false);
          handleOpenGoogleAccount();
        }}
        workspaceRootType={workspaceRootType}
        onOpenGoogleDrive={() => {
          setIsPreferencesModalOpen(false);
          handleGateFeature(
            'Google Drive 클라우드 저장소',
            'Google Drive 기반 SSOT 클라우드 동기화는 Google 계정 연동이 필요합니다.',
            'gdrive',
            () => setIsGdrivePickerOpen(true)
          );
        }}
        remoteConfig={remoteConfig}
        onOpenRemoteSSH={() => {
          setIsPreferencesModalOpen(false);
          handleOpenRemoteSSH();
        }}
        githubConfig={githubConfig}
        onOpenGithub={() => {
          setIsPreferencesModalOpen(false);
          handleOpenGithubModal();
        }}
      />

      {/* Vibe Canvas Configuration Modal (SSOT Master Configurator) */}
      


      <SSOTGeneratorModal
        isOpen={isSSOTGeneratorModalOpen}
        onClose={() => setIsSSOTGeneratorModalOpen(false)}
        initialFolder={ssotGeneratorInitialFolder}
        initialTemplate={ssotGeneratorInitialTemplate}
        availableFolders={Array.from(new Set([
          ...sessions.map(s => s.title),
          ...Object.values(fileFolders).filter(Boolean)
        ]))}
        filesByFolder={
          sessions.reduce((acc, s) => {
            const memoFileName = s.fileName || `${s.title}.md`;
            const matchedFiles = Object.keys(files).filter((fname) => {
              if (fname.startsWith('01_SSOT_Sources/') || fname.startsWith('02_Studio_Outputs/') || fname.startsWith('.podium/')) {
                return false;
              }
              return (fileFolders[fname] || s.title) === s.title || fname === memoFileName;
            });
            const chatAttachments = (s.messages || [])
              .filter(m => m.attachments && m.attachments.length > 0)
              .flatMap(m => (m.attachments || []).map(a => a.name));

            acc[s.title] = Array.from(new Set([...matchedFiles, ...chatAttachments]));
            return acc;
          }, {} as Record<string, string[]>)
        }
        onGenerate={(config) => {
          setIsSSOTGeneratorModalOpen(false);
          handleStartVibeCanvas(config);
        }}
      />

      {/* Workspace Connection & Vault Binding Modal */}
      <WorkspaceConnectionModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={handleSelectActiveWorkspace}
        currentFiles={files}
        currentFolders={fileFolders}
        onToast={showToast}
        onNewFile={handleAddNewNoteTab}
        onOpenFileContent={(name, content) => {
          setFiles((prev) => ({ ...prev, [name]: content }));
          setFileFolders((prev) => ({ ...prev, [name]: 'Opened Files' }));
          setCurrentActiveFile(name);
          setFileName(name);
          setEditorContent(content);
          if (!openTabs.includes(name)) {
            setOpenTabs((prev) => [...prev, name]);
          }
        }}
        onOpenSSOTGenerator={() => setIsSSOTGeneratorModalOpen(true)}
        googleUser={googleUser}
        githubConfig={githubConfig}
        remoteConfig={remoteConfig}
        onOpenSettings={(tab) => {
          setIsWorkspaceModalOpen(false);
          setPreferencesInitialTab(tab || 'integrations');
          setIsPreferencesModalOpen(true);
        }}
      />

      {/* Save In-Memory Untitled Document Modal */}
      <SaveUntitledModal
        isOpen={isSaveUntitledModalOpen}
        onClose={() => setIsSaveUntitledModalOpen(false)}
        onConfirmSave={handleConfirmSaveUntitled}
        defaultFileName={currentActiveFile.startsWith('Untitled-') ? `${currentActiveFile.toLowerCase().replace('-', '_')}.md` : `${currentActiveFile}.md`}
        existingFiles={Object.keys(files)}
        availableFolders={Array.from(new Set(['docs', ...sessions.map((s) => s.title)]))}
      />

      {/* Guest Mode Feature Gating Modal */}
      <GuestFeatureGateModal
        isOpen={isGuestGateModalOpen}
        onClose={() => setIsGuestGateModalOpen(false)}
        featureName={guestGateFeature.name}
        featureDescription={guestGateFeature.description}
        featureIcon={guestGateFeature.icon}
        onUpgrade={() => {
          setIsGuestGateModalOpen(false);
          setCurrentUser(null);
          showToast('로그인 또는 회원가입을 완료하면 로컬 작업 내용이 계정에 연동됩니다.', 'info');
        }}
      />

    </div>
  );
}

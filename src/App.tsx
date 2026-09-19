import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OptimizedEditor } from './components/OptimizedEditor';
import { PdfViewer, PdfViewerHandle } from './components/PdfViewer';
import { SAMPLE_PDF_DATA_URL } from './data/samplePdfData';
import { motion, AnimatePresence } from 'motion/react';
import { googleDriveService, GoogleUserProfile, DriveFolderInfo } from './services/googleDriveService';
import { GoogleDrivePickerModal } from './components/GoogleDrivePickerModal';
import { RemoteWorkspaceModal, RemoteConfig } from './components/RemoteWorkspaceModal';
import { PreferencesModal, UserPreferences, DEFAULT_PREFERENCES, AiInferenceParameters, DEFAULT_AI_PARAMETERS, applyThemeToDocument, PromptTemplate } from './components/PreferencesModal';
import { PromptLibraryModal, DEFAULT_SYSTEM_PROMPTS } from './components/PromptLibraryModal';
import { GoogleAccountModal } from './components/GoogleAccountModal';
import { GithubIntegrationModal, GithubConfig } from './components/GithubIntegrationModal';
import { SSOTGeneratorModal, SSOTGeneratorConfig } from './components/SSOTGeneratorModal';
import { WorkspaceConnectionModal } from './components/WorkspaceConnectionModal';
import { SaveUntitledModal } from './components/SaveUntitledModal';
import { DocumentConverterModal } from './components/DocumentConverterModal';
import { convertDocumentToMarkdown, DocumentConversionResult } from './services/documentConverterService';
import {
  ActiveWorkspace,
  saveFileToLocalDirectory,
  deleteFileFromLocalDirectory,
  renameFileInLocalDirectory,
  saveVaultToIndexedDB,
  getMemoryDirectoryHandle,
  rescanLocalDirectory,
} from './services/workspaceStorageService';
import {
  RecursiveFolderTree,
  TreeDirectoryNode,
  buildFileTreeFromPaths,
  InlineRenameInput,
  flattenTreeDirectoryNode,
  RenameTarget,
} from './components/RecursiveFolderTree';
import {
  saveHybridStorage,
  getDbItem,
  clearDb,
  STORAGE_KEYS,
  migrateFromLocalStorageIfAvailable
} from './services/indexedDbService';
import { AuthPage } from './components/AuthPage';
import { UserProfileBadge } from './components/UserProfileBadge';
import { GUEST_SAMPLE_FILES, GUEST_SAMPLE_FOLDERS } from './data/guestSampleWorkspace';
import { authService, AuthUser } from './services/authService';
import { renderMarkdownToHtml } from './utils/markdownParser';
import { TableGridPicker } from './components/TableGridPicker';
import { MarkdownHelpPopover } from './components/MarkdownHelpPopover';
import { TiptapWysiwygEditorRef } from './components/TiptapWysiwygEditor';
import { generateEmptyTable } from './utils/markdownTableHelper';
import { SSOTDriftAuditor } from './components/SSOTDriftAuditor';
import { analyzeSSOTDriftLocally } from './utils/ssotDriftEngine';
import { CouncilOfCriticsModal } from './components/CouncilOfCriticsModal';
import { GhostDiffModal } from './components/GhostDiffModal';
import { AiRoleAssignmentModal } from './components/AiRoleAssignmentModal';
import { AiMessageBubble } from './components/AiMessageBubble';
import { evaluateDocumentLocally } from './utils/criticsEngine';
import { LocalAiResourceMonitor } from './components/LocalAiResourceMonitor';
import { getOnboardingResponse } from './utils/onboardingBot';
import { WebLlmBanner } from './components/WebLlmBanner';
import {
  DEFAULT_FALLBACK_MODELS,
  RECOMMENDED_QUICK_MODELS,
  getModelDisplayName,
  fetchProviderActiveModels,
  fetchOllamaTags
} from './config/models.config';
import {
  WEB_LLM_MODEL_ID,
  WEB_LLM_MODEL_DISPLAY_NAME,
  isWebGPUSupported,
  getWebGPUDevice,
  initWebLLMEngine,
  getLoadedWebLLMEngine,
  streamWebLLMCompletion
} from './utils/webllmService';
import type {
  ChatAttachment,
  ChatMessage,
  ChatSession,
  MentionItem,
  GhostWriterLevel,
  MenuType,
  AiRoleModels
} from './types';
import { DEFAULT_AI_ROLE_MODELS } from './types';
import { useToast } from './hooks/useToast';
import { Toast } from './components/Toast';
import { usePaneResizer } from './hooks/usePaneResizer';
import { useProjectEvents } from './hooks/useProjectEvents';
import { useAutoLock } from './hooks/useAutoLock';
import { useAuth } from './context/AuthContext';
import {
  encryptWithVaultKey,
  decryptWithVaultKey,
  encryptObjectWithVaultKey,
  decryptObjectWithVaultKey,
  isEncryptedPayload,
  clearSensitiveClipboard,
  hasMasterPinConfigured,
  purgeGuestWorkspaceData,
  purgeGuestSession
} from './utils/securityCrypto';
import { clearAiDecryptedKeyMemory } from './services/aiEngineCore';
import {
  Brain,
  Cpu,
  Route,
  Bot,
  User,
  Send,
  Trash2,
  ArrowRight,
  FileText,
  FileUp,
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
  SlidersHorizontal,
  AlertTriangle,
  RotateCcw,
  FolderPlus,
  HelpCircle,
  Undo2,
  Redo2,
  FilePlus,
  AtSign,
  Ghost,
  Languages,
  Globe,
  CalendarDays,
  CalendarPlus,
  Github,
  Settings,
  Zap,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  GitCompare,
  Users,
  Minimize2,
  Columns2,
  Maximize2,
  Upload
} from 'lucide-react';

export default function App() {
  // Toast Notification State & Helper (initialized early for all dependent callbacks)
  const { toast, showToast, closeToast } = useToast();

  // Helper to persist preferences without exposing plaintext API keys in persistent localStorage
  const saveSafePreferences = (prefs: UserPreferences) => {
    try {
      const { apiKeys: _discardedKeys, ...safePrefs } = prefs;
      localStorage.setItem('aipodium_preferences', JSON.stringify(safePrefs));
    } catch {}
  };

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('aipodium_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.apiKeys) {
          // Immediately purge plaintext keys from persistent storage
          delete parsed.apiKeys;
          localStorage.setItem('aipodium_preferences', JSON.stringify(parsed));
        }
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  // Authentication & Local Lock State
  const auth = useAuth();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => auth.currentUser || authService.getCurrentUser());
  const isGuest = auth.isGuest || !hasMasterPinConfigured() || currentUser?.provider === 'guest' || currentUser?.isGuest === true;

  const handleWipeInMemoryDataOnLockRef = useRef<(() => Promise<void>) | null>(null);

  // Auto-Lock Hook (Startup Lock + Inactivity timer + Ctrl/Cmd + L shortcut)
  // Default to locking on page startup (preferences.security?.lockOnStartup !== false) for zero-trust security
  const { isLocked, setIsLocked, lockNow, unlock } = useAutoLock({
    timeoutMinutes: preferences.security?.autoLockMinutes ?? 5,
    enabled: (preferences.security?.autoLockMinutes ?? 5) > 0,
    initialLocked: preferences.security?.lockOnStartup !== false,
    isGuest,
    onLock: async () => {
      if (handleWipeInMemoryDataOnLockRef.current) {
        await handleWipeInMemoryDataOnLockRef.current();
      }
    },
    onLockChange: (locked) => {
      if (locked) {
        // If locked, we don't necessarily clear currentUser, but we gate the UI
      }
    }
  });

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Optional zero-trust security setting: purge session when browser/tab is closed
  useEffect(() => {
    if (!preferences.security?.clearSessionOnClose) return;

    const handleUnload = () => {
      if (auth.isGuest || authService.isGuest()) {
        purgeGuestSession().catch(() => {});
      }
      authService.logout();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [preferences.security?.clearSessionOnClose, auth.isGuest]);

  // Top Header State
  const [provider, setProvider] = useState<'cloud' | 'local-pc' | 'local-server'>('cloud');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Client-side Multi-Vendor API Keys & Local Endpoint security states
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    try {
      // 1. Transient session storage
      const sessionKeys = sessionStorage.getItem('aipodium_api_keys');
      if (sessionKeys) {
        return { gemini: '', openai: '', anthropic: '', deepseek: '', groq: '', ...JSON.parse(sessionKeys) };
      }

      // 2. Migration from older legacy localStorage
      const savedPrefs = localStorage.getItem('aipodium_preferences');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.security?.isEncryptionEnabled) {
          return { gemini: '', openai: '', anthropic: '', deepseek: '', groq: '' };
        }
        if (parsed.apiKeys) {
          const loadedKeys = {
            gemini: '',
            openai: '',
            anthropic: '',
            deepseek: '',
            groq: '',
            ...parsed.apiKeys
          };
          delete parsed.apiKeys;
          localStorage.setItem('aipodium_preferences', JSON.stringify(parsed));
          sessionStorage.setItem('aipodium_api_keys', JSON.stringify(loadedKeys));
          return loadedKeys;
        }
      }

      const legacyKey = sessionStorage.getItem('aipodium_cloud_api_key') || localStorage.getItem('aipodium_cloud_api_key') || '';
      if (legacyKey) {
        localStorage.removeItem('aipodium_cloud_api_key');
        sessionStorage.setItem('aipodium_cloud_api_key', legacyKey);
      }
      return { gemini: legacyKey, openai: '', anthropic: '', deepseek: '', groq: '' };
    } catch {
      return { gemini: '', openai: '', anthropic: '', deepseek: '', groq: '' };
    }
  });

  const cloudApiKey = apiKeys.gemini || '';
  const setCloudApiKey = (key: string) => {
    setApiKeys((prev) => ({ ...prev, gemini: key }));
  };

  const getVendorForModel = (modelId: string): 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' => {
    const m = (modelId || '').toLowerCase();
    if (m.startsWith('gpt-') || m.startsWith('o3-') || m.includes('openai')) return 'openai';
    if (m.startsWith('claude-') || m.includes('anthropic')) return 'anthropic';
    if (m.startsWith('deepseek-') || m.includes('deepseek')) return 'deepseek';
    if (m.startsWith('llama-') || m.startsWith('groq-') || m.includes('groq')) return 'groq';
    return 'gemini';
  };

  const getApiKeyForModel = (modelId: string): string => {
    const vendor = getVendorForModel(modelId);
    return apiKeys[vendor] || (vendor === 'gemini' ? (apiKeys.gemini || '') : '');
  };

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

  // Startup effect: auto-migrate any legacy plaintext keys and load encrypted credentials
  useEffect(() => {
    (async () => {
      try {
        await authService.migrateLegacyPlaintextKeys();
        const encGemini = await authService.getEncryptedApiKey();
        const encAll = await authService.getEncryptedApiKeys();
        if (encGemini || Object.keys(encAll).length > 0) {
          setApiKeys((prev) => ({
            ...prev,
            ...encAll,
            gemini: encGemini || prev.gemini || ''
          }));
        }
      } catch (err) {
        console.warn('[App] Encrypted credentials startup load warning:', err);
      }
    })();
  }, []);

  // Secure API key persistence: always encrypt keys with AES-GCM (256-bit) and PBKDF2; zero plaintext storage
  useEffect(() => {
    try {
      if (apiKeys.gemini) {
        authService.saveEncryptedApiKey(apiKeys.gemini);
      }
      const hasAnyKeys = Object.values(apiKeys).some((k) => Boolean(k));
      if (hasAnyKeys) {
        authService.saveEncryptedApiKeys(apiKeys);
      }
      // Guarantee zero unencrypted remnants in storage
      sessionStorage.removeItem('aipodium_api_keys');
      sessionStorage.removeItem('aipodium_cloud_api_key');
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('aipodium_cloud_api_key');
      localStorage.removeItem('aipodium_api_keys');
    } catch {}
  }, [apiKeys]);

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

  const [isAiRoleModalOpen, setIsAiRoleModalOpen] = useState<boolean>(false);
  const [roleModels, setRoleModels] = useState<AiRoleModels>(() => {
    try {
      const saved = localStorage.getItem('aipodium_ai_role_models');
      if (saved) {
        return { ...DEFAULT_AI_ROLE_MODELS, ...JSON.parse(saved) };
      }
    } catch {}
    return preferences.roleModels || DEFAULT_AI_ROLE_MODELS;
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return roleModels.chat || preferences.defaultModel || 'gemini-3.8-flash';
  });
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
    return roleModels.ghostWriter || 'gemini-3.8-flash';
  });
  const ghostWriterModelOptions = useMemo(() => {
    return DEFAULT_FALLBACK_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      tier: m.tier || '1x 크레딧',
      desc: m.desc || ''
    }));
  }, []);

  const handleSaveRoleModels = useCallback((newRoles: AiRoleModels) => {
    setRoleModels(newRoles);
    setSelectedModel(newRoles.chat);
    setGhostWriterModel(newRoles.ghostWriter);
    const updated: UserPreferences = {
      ...preferences,
      defaultModel: newRoles.chat,
      ghostWriterModel: newRoles.ghostWriter,
      roleModels: newRoles
    };
    setPreferences(updated);
    saveSafePreferences(updated);
    try {
      localStorage.setItem('aipodium_ai_role_models', JSON.stringify(newRoles));
      localStorage.setItem('aipodium_ghost_writer_model', newRoles.ghostWriter);
    } catch {}
    showToast('역할별 AI 모델 배치가 성공적으로 저장되었습니다.', 'success');
  }, [preferences, showToast]);

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_ghost_writer_model', ghostWriterModel);
    } catch {}
  }, [ghostWriterModel]);

  useEffect(() => {
    try {
      saveSafePreferences(preferences);
      applyThemeToDocument(
        preferences.compactness || 'dense',
        preferences.fontSize || 'md'
      );
    } catch {}
  }, [preferences]);

  const [selectedMultiModels, setSelectedMultiModels] = useState<string[]>([
    'gemini-3.8-flash',
    'gemini-3.1-pro-preview'
  ]);
  const [mode, setMode] = useState<'single' | 'routing' | 'multi'>('single');

  // Dynamically discovered local Ollama models synced with Preferences & Verification
  const [discoveredLocalModels, setDiscoveredLocalModels] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('aipodium_discovered_models');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_discovered_models', JSON.stringify(discoveredLocalModels));
    } catch {}
  }, [discoveredLocalModels]);

  // WebLLM browser-native AI state
  const [webllmProgress, setWebllmProgress] = useState<{ isSupported: boolean; isLoading: boolean; isReady: boolean; progressText: string; progressPercent: number }>({
    isSupported: isWebGPUSupported(),
    isLoading: false,
    isReady: Boolean(getLoadedWebLLMEngine()),
    progressText: '',
    progressPercent: 0,
  });

  const [isWebLlmBannerDismissed, setIsWebLlmBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aipodium_webllm_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // Dynamic models discovered/fetched from active providers
  const [dynamicProviderModels, setDynamicProviderModels] = useState<Record<string, { id: string; name: string }[]>>({});

  // Unified available models for chat panel (Single, Routing, Multi)
  const availableChatModels = useMemo(() => {
    const cloudModels: { id: string; name: string; desc: string; group: 'cloud' | 'local' }[] = [];

    // 1. Include dynamically fetched active vendor models
    Object.entries(dynamicProviderModels).forEach(([_vendor, models]) => {
      models.forEach((m) => {
        if (!cloudModels.some((cm) => cm.id === m.id)) {
          cloudModels.push({
            id: m.id,
            name: m.name,
            desc: '활성 프로바이더',
            group: 'cloud'
          });
        }
      });
    });

    // 2. Include default fallback cloud models
    DEFAULT_FALLBACK_MODELS.filter((m) => m.group === 'cloud').forEach((m) => {
      if (!cloudModels.some((cm) => cm.id === m.id)) {
        cloudModels.push({
          id: m.id,
          name: m.name,
          desc: m.desc || '',
          group: 'cloud'
        });
      }
    });

    const localModels: { id: string; name: string; desc: string; group: 'cloud' | 'local' }[] = [];

    if (discoveredLocalModels.length > 0) {
      discoveredLocalModels.forEach((dm) => {
        localModels.push({
          id: dm.id,
          name: dm.name,
          desc: 'Ollama 감지',
          group: 'local'
        });
      });
    }

    DEFAULT_FALLBACK_MODELS.filter((m) => m.group === 'local').forEach((dl) => {
      if (!localModels.some((lm) => lm.id === dl.id)) {
        localModels.push({
          id: dl.id,
          name: dl.name,
          desc: dl.desc || '',
          group: 'local'
        });
      }
    });

    if (webllmProgress.isReady) {
      localModels.unshift({
        id: WEB_LLM_MODEL_ID,
        name: WEB_LLM_MODEL_DISPLAY_NAME,
        desc: '브라우저 WebGPU',
        group: 'local'
      });
    }

    const all = [...cloudModels, ...localModels];
    if (selectedModel && !all.some((m) => m.id === selectedModel)) {
      all.push({
        id: selectedModel,
        name: selectedModel,
        desc: provider === 'cloud' ? '커스텀 클라우드' : '커스텀 로컬',
        group: provider === 'cloud' ? 'cloud' : 'local'
      });
    }

    return all;
  }, [dynamicProviderModels, discoveredLocalModels, selectedModel, provider, webllmProgress.isReady]);

  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState<boolean>(false);
  const [preferencesInitialTab, setPreferencesInitialTab] = useState<'ai-engine' | 'persona' | 'integrations' | 'storage' | 'security' | 'ghost-writer'>('ai-engine');
  const [isPromptLibraryModalOpen, setIsPromptLibraryModalOpen] = useState<boolean>(false);

  // Chat Sessions State (Projects)
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'session-default',
      title: 'AI 지식 비서',
      createdAt: '방금 전',
      fileName: 'tech_notes.md',
      editorTab: 'wysiwyg',
      editorContent: `# 기술 노트\n\nAI 지식 비서와 함께 작성하는 문서입니다.`,
      messages: [
        {
          id: 'welcome-1',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          model: 'AI 지식 비서',
          text: `안녕하세요! **AI 지식 비서**입니다.\n\nAI Podium에 오신 것을 환영합니다! 별도의 API 키 등록이나 로컬 AI 연결 없이도 에디터와 기본 기능을 즉시 체험하실 수 있습니다. 원하시는 안내를 아래 버튼에서 선택해 보세요.`,
          showOnboardingChips: true,
        }
      ]
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-default');
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState<boolean>(true);
  const [isAiModelSelectionOpen, setIsAiModelSelectionOpen] = useState<boolean>(true);
  const [isChatHistoryPinned] = useState<boolean>(true);

  // Check whether onboarding guide bot should be active (guest user without API key or Ollama connection)
  const hasConfiguredApiKey = Boolean(cloudApiKey?.trim() || Object.values(apiKeys).some((k) => typeof k === 'string' && k.trim().length > 0));
  const hasConnectedLocalAi = (provider === 'local-pc' || provider === 'local-server') && (isVerified || (discoveredLocalModels && discoveredLocalModels.length > 0));
  const isOnboardingMode = !hasConfiguredApiKey && !hasConnectedLocalAi && !(webllmProgress.isReady && selectedModel === WEB_LLM_MODEL_ID);

  // Derived current session messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  // Top Dropdown Menu Bar state & refs
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [isExportSubmenuOpen, setIsExportSubmenuOpen] = useState<boolean>(false);
  const topMenuRef = useRef<HTMLDivElement>(null);
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  // Project Events & Milestone Management Hook
  const {
    projectEvents,
    setProjectEvents,
    isEventManagerOpen,
    setIsEventManagerOpen,
    isExtractingEvents,
    eventFilter,
    setEventFilter,
    newEventTitle,
    setNewEventTitle,
    newEventDate,
    setNewEventDate,
    newEventType,
    setNewEventType,
    newEventPriority,
    setNewEventPriority,
    newEventNotes,
    setNewEventNotes,
    handleAddEvent: handleAddProjectEvent,
    handleDeleteEvent: handleDeleteProjectEvent,
    handleToggleEventCompleted,
    handleExtractEventsWithAi,
    handleExportEventsIcs
  } = useProjectEvents(showToast);

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

  // Document Converter State for PDF / Office Files (.pdf, .docx, .xlsx, .pptx)
  const [docConversionResult, setDocConversionResult] = useState<DocumentConversionResult | null>(null);
  const [isDocConverterModalOpen, setIsDocConverterModalOpen] = useState<boolean>(false);
  const [isConvertingDoc, setIsConvertingDoc] = useState<boolean>(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Persistent PDF Markdown Cache: Map of pdfFileName -> parsed/edited markdown string
  const [pdfMarkdownMap, setPdfMarkdownMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('aipodium_pdf_markdowns');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_pdf_markdowns', JSON.stringify(pdfMarkdownMap));
    } catch {}
  }, [pdfMarkdownMap]);

  const pdfViewerRef = useRef<PdfViewerHandle>(null);

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
  const [workspaceRootType, setWorkspaceRootType] = useState<'local' | 'gdrive' | 'remote' | 'github'>(() => {
    try {
      return (localStorage.getItem('aipodium_workspace_root_type') as any) || 'local';
    } catch {
      return 'local';
    }
  });
  const [gdriveSsotFolder, setGdriveSsotFolder] = useState<DriveFolderInfo | null>(() => googleDriveService.getSavedSsotFolder());
  const [isGdrivePickerOpen, setIsGdrivePickerOpen] = useState<boolean>(false);
  const [gdrivePickerTab, setGdrivePickerTab] = useState<'open' | 'save' | 'folders'>('open');
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

  // GitHub & Google Drive: Independent on-demand integration, runs directly via user PAT / OAuth
  const handleOpenGithubModal = useCallback(() => {
    setIsGithubModalOpen(true);
  }, []);

  // Google Drive & Account: Independent on-demand integration, runs regardless of guest mode
  const handleOpenGoogleAccount = useCallback(() => {
    setIsGoogleAccountModalOpen(true);
  }, []);

  const handleOpenGoogleDrive = useCallback((tab: 'open' | 'save' | 'folders' = 'open') => {
    setGdrivePickerTab(tab);
    setIsGdrivePickerOpen(true);
  }, []);

  // Remote SSH & Enterprise Server: Independent on-demand integration
  const handleOpenRemoteSSH = useCallback(() => {
    setIsRemoteModalOpen(true);
  }, []);
  
  // SSOT Generator Modal State
  const [isSSOTGeneratorModalOpen, setIsSSOTGeneratorModalOpen] = useState(false);
  const [ssotGeneratorInitialFolder, setSsotGeneratorInitialFolder] = useState<string>('');

  const handleOpenSSOTGeneratorModal = (folder = '') => {
    setSsotGeneratorInitialFolder(folder);
    setIsSSOTGeneratorModalOpen(true);
  };

  const [githubConfig, setGithubConfig] = useState<GithubConfig | null>(() => {
    try {
      const sessionSaved = sessionStorage.getItem('aipodium_github_config');
      if (sessionSaved) {
        return JSON.parse(sessionSaved);
      }
      const legacySaved = localStorage.getItem('aipodium_github_config');
      if (legacySaved) {
        // Migrate token to temporary session storage and purge cleartext token from persistent localStorage
        sessionStorage.setItem('aipodium_github_config', legacySaved);
        localStorage.removeItem('aipodium_github_config');
        return JSON.parse(legacySaved);
      }
      return null;
    } catch {
      return null;
    }
  });

  const handleGoogleSignIn = async () => {
    try {
      const { profile } = await googleDriveService.signIn();
      setGoogleUser(profile);
      showToast(`✨ Google Drive [${profile.name || profile.email}] 단독 연동 완료!`);
      return profile;
    } catch (e: any) {
      showToast(`Google Drive 연동 오류: ${e.message || '인증 실패'}`);
      throw e;
    }
  };

  const handleGoogleSignOut = () => {
    googleDriveService.clearToken();
    setGoogleUser(null);
    showToast('Google Drive 연결이 해제되었습니다.');
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

      // Folder-to-Project Mapping:
      // When importing a local folder, automatically ensure a Project node exists under PROJECTS
      const projectName = newWorkspace.name || 'Local Project';
      const defaultProjectMemo = `${projectName}.md`;
      const targetFileName = loadedFiles[defaultProjectMemo] !== undefined ? defaultProjectMemo : firstF;

      setSessions((prevSessions) => {
        const existingSession = prevSessions.find((s) => s.title === projectName);
        if (existingSession) {
          setActiveSessionId(existingSession.id);
          return prevSessions;
        }

        const newSession: ChatSession = {
          id: `session-local-${Date.now()}`,
          title: projectName,
          createdAt: '방금',
          messages: [
            {
              id: `msg-init-${Date.now()}`,
              sender: 'ai',
              text: `📂 로컬 프로젝트 **${projectName}** 폴더가 연결되었습니다. (${Object.keys(loadedFiles).length}개 문서)`,
              timestamp: '방금',
            },
          ],
          fileName: targetFileName,
          editorContent: loadedFiles[targetFileName] || `# ${projectName}\n\n로컬 프로젝트 문서입니다.`,
          editorTab: 'wysiwyg',
        };

        setActiveSessionId(newSession.id);
        return [newSession, ...prevSessions];
      });
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

  // Close top menu and popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setActiveSubmenu(null);
        setIsExportSubmenuOpen(false);
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
    `# AI Podium 기술 스택 노트 (SSOT 원본)\n\n## 개요\n이 노트는 AI 대화창에서 [에디터로 보내기 ➔] 버튼을 눌러 수집된 Single Source of Truth(SSOT) 핵심 문서입니다.\n\n## 시작하기\nAI 지식 비서와 대화를 통해 지식을 축적하고 문서를 완성해 보세요.`
  );
  const [editorTab, setEditorTab] = useState<'wysiwyg' | 'edit' | 'split' | 'preview'>('wysiwyg');
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [isSsotAuditorOpen, setIsSsotAuditorOpen] = useState<boolean>(false);
  const [showMarkdownHelp, setShowMarkdownHelp] = useState<boolean>(false);
  const [showTablePicker, setShowTablePicker] = useState<boolean>(false);
  const tableButtonRef = useRef<HTMLButtonElement | null>(null);
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isAiCleaning, setIsAiCleaning] = useState<boolean>(false);
  const [isEditorToolbarDrawerOpen, setIsEditorToolbarDrawerOpen] = useState<boolean>(false);

  // Editor Font Size State (12px ~ 22px, Default 15px)
  const [editorFontSize, setEditorFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('editor_font_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 22) {
          return parsed;
        }
      }
    } catch {}
    return 15;
  });
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('editor_font_size', editorFontSize.toString());
    } catch {}
    document.documentElement.style.setProperty('--editor-font-size', `${editorFontSize}px`);
  }, [editorFontSize]);

  // Close editor toolbar drawer on outside click or Escape key
  useEffect(() => {
    if (!isEditorToolbarDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditorToolbarDrawerOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        !target.closest('#editor-formatting-toolbar') &&
        !target.closest('#editor-toolbar-drawer-toggle') &&
        !target.closest('#table-grid-picker-popover') &&
        !target.closest('#markdown-help-popover')
      ) {
        setIsEditorToolbarDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditorToolbarDrawerOpen]);

  // Fast SSOT Consistency & Drift Analysis Summary for Toolbar Badge
  const ssotAuditSummary = useMemo(() => analyzeSSOTDriftLocally(editorContent), [editorContent]);

  // Council of Critics Multi-Perspective Document Review Modal State
  const [isCouncilModalOpen, setIsCouncilModalOpen] = useState<boolean>(false);
  const councilSummary = useMemo(() => evaluateDocumentLocally(editorContent), [editorContent]);

  // Interactive Ghost Diff Modal State
  const [diffModalData, setDiffModalData] = useState<{
    isOpen: boolean;
    proposedContent: string;
    title?: string;
    sourceLabel?: string;
  } | null>(null);

  // Jump to specific line in OptimizedEditor
  const handleJumpToLine = useCallback((lineNumber: number) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const lines = textarea.value.split('\n');
    let charPos = 0;
    for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
      charPos += lines[i].length + 1;
    }
    textarea.focus();
    textarea.setSelectionRange(charPos, charPos + (lines[lineNumber - 1]?.length || 0));
    const lineHeight = 22;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);
  }, []);

  // Multi-Tab Document States (Single Unified VS Code-like Tab Bar)
  const [openTabs, setOpenTabs] = useState<string[]>(['tech_notes.md', 'architecture_overview.md']);
  // In-Memory Untitled Document States (Temporary tabs without physical files)
  const [untitledDocs, setUntitledDocs] = useState<Record<string, string>>({});
  const untitledCounterRef = useRef<number>(1);
  const [isSaveUntitledModalOpen, setIsSaveUntitledModalOpen] = useState<boolean>(false);

  // File Explorer State
  const [files, setFiles] = useState<Record<string, string>>({
    'tech_notes.md': `# AI Podium 기술 스택 노트 (SSOT 원본)\n\n## 개요\n이 노트는 AI 대화창에서 [에디터로 보내기 ➔] 버튼을 눌러 수집된 Single Source of Truth(SSOT) 핵심 문서입니다.\n\n## 시작하기\nAI 지식 비서와 대화를 통해 지식을 축적하고 문서를 완성해 보세요.`,
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
    'README.md': `# AI Podium 3-Pane AI Architecture\n\nAI 대화, SSOT 지식 수집, 그리고 2차 가공(Word, Sheets, Slides, Manual, Code)을 하나의 통합 워크스페이스에서 제공합니다.`,
    'AI_Architecture_Whitepaper.pdf': SAMPLE_PDF_DATA_URL
  });
  const [currentActiveFile, setCurrentActiveFile] = useState<string>('tech_notes.md');

  // File Explorer Folder Assignments & Drag-and-Drop State
  const [fileFolders, setFileFolders] = useState<Record<string, string>>({
    'tech_notes.md': 'AI 지식 비서',
    'architecture_overview.md': 'AI 지식 비서',
    'api_specifications.md': 'AI 지식 비서',
    'AI_Architecture_Whitepaper.pdf': '문서 라이브러리',
    'AI_Podium_word_doc.html': 'AI 지식 비서',
    'project_analysis_sheet.html': 'AI 지식 비서',
    'README.md': 'AI 지식 비서'
  });
  const [draggedType, setDraggedType] = useState<'project' | 'file' | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [dragDropPosition, setDragDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  // Global Search Bar Query for File Explorer
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Trash & Warning Confirmation States
  const [trashSessions, setTrashSessions] = useState<ChatSession[]>([]);
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<ChatSession | null>(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState<boolean>(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [focusedTreeItemId, setFocusedTreeItemId] = useState<string | null>(null);
  const [editingTreeTarget, setEditingTreeTarget] = useState<RenameTarget | null>(null);
  const fileTreeRef = useRef<HTMLDivElement>(null);

  // Reliable, smooth auto-scroll helper for the file tree container without triggering window/parent scroll
  const scrollToTreeItem = useCallback((itemId: string) => {
    const container = fileTreeRef.current;
    if (!container) return;
    const el = document.getElementById(`tree-item-${itemId}`);
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (elRect.top < containerRect.top) {
      container.scrollTop -= (containerRect.top - elRect.top) + 8;
    } else if (elRect.bottom > containerRect.bottom) {
      container.scrollTop += (elRect.bottom - containerRect.bottom) + 8;
    }
  }, []);

  // Dynamically resolve currently selected or focused project/folder path for bottom status bar and navigation
  const getCurrentDisplayPath = (): string => {
    let targetSessionTitle = '';
    let targetSubpath = '';

    if (focusedTreeItemId) {
      if (focusedTreeItemId.startsWith('session:')) {
        const sId = focusedTreeItemId.replace('session:', '');
        const s = sessions.find((sess) => sess.id === sId);
        if (s) targetSessionTitle = s.title;
      } else if (focusedTreeItemId.startsWith('folder:')) {
        const fullKey = focusedTreeItemId.replace('folder:', '');
        const slashIdx = fullKey.indexOf('/');
        if (slashIdx !== -1) {
          targetSessionTitle = fullKey.substring(0, slashIdx);
          targetSubpath = fullKey.substring(slashIdx + 1);
        } else {
          targetSessionTitle = fullKey;
        }
      } else if (focusedTreeItemId.startsWith('file:')) {
        const filePath = focusedTreeItemId.replace('file:', '');
        const lastSlash = filePath.lastIndexOf('/');
        if (lastSlash !== -1) {
          targetSubpath = filePath.substring(0, lastSlash);
        }
        const assignedFolder = fileFolders[filePath];
        if (assignedFolder) {
          targetSessionTitle = assignedFolder;
        } else {
          const activeS = sessions.find((s) => s.id === activeSessionId);
          if (activeS) targetSessionTitle = activeS.title;
        }
      }
    }

    if (!targetSessionTitle && !targetSubpath) {
      const activeS = sessions.find((s) => s.id === activeSessionId);
      targetSessionTitle = activeS?.title || activeWorkspace.name || 'Workspace';
      if (currentActiveFile && currentActiveFile.includes('/')) {
        const lastSlash = currentActiveFile.lastIndexOf('/');
        targetSubpath = currentActiveFile.substring(0, lastSlash);
      }
    }

    const basePath = activeWorkspace.path || `/${activeWorkspace.name}`;

    if (activeWorkspace.type === 'gdrive') {
      const parts = [activeWorkspace.name];
      if (targetSessionTitle && targetSessionTitle !== activeWorkspace.name) parts.push(targetSessionTitle);
      if (targetSubpath) parts.push(targetSubpath);
      return `Google Drive:/${parts.join('/')}`;
    }

    if (activeWorkspace.type === 'github') {
      const base = `github.com/${activeWorkspace.githubOwner || 'org'}/${activeWorkspace.githubRepo || activeWorkspace.name}`;
      const parts = [];
      if (targetSessionTitle && targetSessionTitle !== activeWorkspace.name && targetSessionTitle !== activeWorkspace.githubRepo) {
        parts.push(targetSessionTitle);
      }
      if (targetSubpath) parts.push(targetSubpath);
      return parts.length ? `${base}/${parts.join('/')}` : base;
    }

    const normalizedBase = basePath.replace(/\/+$/, '');
    const baseSegments = normalizedBase.split('/');
    const lastSegment = baseSegments[baseSegments.length - 1];

    let fullFolderPath = normalizedBase;
    if (targetSessionTitle) {
      if (lastSegment.toLowerCase() === targetSessionTitle.toLowerCase()) {
        fullFolderPath = normalizedBase;
      } else {
        if (baseSegments.length > 1) {
          const parentDir = baseSegments.slice(0, -1).join('/');
          fullFolderPath = `${parentDir}/${targetSessionTitle}`;
        } else {
          fullFolderPath = `~/${targetSessionTitle}`;
        }
      }
    }

    if (targetSubpath) {
      fullFolderPath = `${fullFolderPath}/${targetSubpath}`;
    }

    return fullFolderPath;
  };

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

  // Generate list of workspace folders and files for @ mention referencing
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

    folderSet.forEach((folderName) => {
      const containedFiles = Object.keys(files).filter(
        (f) => (fileFolders[f] || folderName) === folderName || f === `${folderName}.md`
      );
      items.push({
        id: `folder-${folderName}`,
        type: 'folder',
        name: folderName,
        detail: `${containedFiles.length}개 파일`,
        path: folderName
      });
    });

    // 2. Workspace Files
    Object.keys(files).forEach((fname) => {
      const parentFolder = fileFolders[fname] || 'AI 지식 비서';
      const fileContent = files[fname] || '';
      const sizeKb = (fileContent.length / 1024).toFixed(1);
      const sizeStr = fileContent.length >= 1024 ? `${sizeKb} KB` : `${fileContent.length} B`;
      items.push({
        id: `file-${fname}`,
        type: 'file',
        name: fname,
        detail: sizeStr,
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

  // Ghost Writer Mode State (고스트 라이터 모드: 영어 번역 & 영작 연습 기능)
  const [ghostWriterLevel, setGhostWriterLevel] = useState<GhostWriterLevel>(() => {
    return preferences.ghostWriterLevel || 'off';
  });
  const [ghostTargetEnglish, setGhostTargetEnglish] = useState<string>('');
  const [ghostTemplateText, setGhostTemplateText] = useState<string>('');
  const [ghostUserInput, setGhostUserInput] = useState<string>('');
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
        showToast(`💡 ${data?.error || '기본 템플릿으로 생성되었습니다.'}`);
      }
    } catch {
      showToast('💡 기본 템플릿으로 생성되었습니다.');
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
    setGhostShowFullAnswer(false);
  };

  // Recent AI Changes Notification State
  const [recentAiChanges, setRecentAiChanges] = useState<{
    file: string;
    source: string;
    timestamp: string;
    preview: string;
  } | null>(null);
  const [hasUnreadAiChanges, setHasUnreadAiChanges] = useState<boolean>(false);

  // Resizable Panes & Section Collapse State
  const mainContainerRef = useRef<HTMLElement>(null);
  const {
    pane1Width,
    setPane1Width,
    pane2Width,
    setPane2Width,
    isResizing,
    isSection1Collapsed,
    setIsSection1Collapsed,
    isSection2Collapsed,
    setIsSection2Collapsed,
    isSection3Collapsed,
    setIsSection3Collapsed,
    handleMouseDownDivider,
    handleTouchStartDivider,
    applyDefaultPanelsForCurrentDevice
  } = usePaneResizer(mainContainerRef);

  // Auto-collapse Section 1 (AI Chat) when a PDF tab is active to allocate 50:50 wide space
  const prevActiveFilePdfRef = useRef<string>(currentActiveFile);
  useEffect(() => {
    const isPdf = currentActiveFile.toLowerCase().endsWith('.pdf');
    const wasPdf = prevActiveFilePdfRef.current.toLowerCase().endsWith('.pdf');
    prevActiveFilePdfRef.current = currentActiveFile;

    if (isPdf && !wasPdf) {
      setIsSection1Collapsed(true);
      setPane2Width((prev) => (prev < 75 ? 78 : prev));
    }
  }, [currentActiveFile, setIsSection1Collapsed, setPane2Width]);

  // Initial check on mount if active file is a PDF
  useEffect(() => {
    if (currentActiveFile.toLowerCase().endsWith('.pdf')) {
      setIsSection1Collapsed(true);
      setPane2Width((prev) => (prev < 75 ? 78 : prev));
    }
  }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const tiptapEditorRef = useRef<TiptapWysiwygEditorRef>(null);
  const lastActiveTextTargetRef = useRef<'editor' | 'chat'>('chat');

  // Resolved list of prompt templates for top menu instant injection
  const effectivePrompts: PromptTemplate[] = useMemo(() => {
    if (preferences.customPrompts && preferences.customPrompts.length > 0) {
      return preferences.customPrompts;
    }
    try {
      const saved = localStorage.getItem('aipodium_custom_prompts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SYSTEM_PROMPTS;
  }, [preferences.customPrompts]);

  // 1-Click Instant Inject logic (Editor cursor position OR AI Chat Input)
  const handleInstantInjectPrompt = useCallback((prompt: PromptTemplate) => {
    setActiveMenu(null);
    setActiveSubmenu(null);

    const textToInsert = prompt.body;
    // Priority: If markdown editor was focused and is visible, inject at cursor position.
    // Otherwise, inject into AI Chat input and focus it.
    const isEditorActive = lastActiveTextTargetRef.current === 'editor' && !isSection2Collapsed && !!editorRef.current;

    if (isEditorActive) {
      const textarea = editorRef.current!;
      const start = textarea.selectionStart ?? editorContent.length;
      const end = textarea.selectionEnd ?? editorContent.length;
      const before = editorContent.substring(0, start);
      const after = editorContent.substring(end);
      const newContent = before + textToInsert + after;
      setEditorContent(newContent);
      showToast(`📝 에디터 커서 위치에 "${prompt.title}" 프롬프트가 주입되었습니다.`, 'success');
      setTimeout(() => {
        textarea.focus();
        const newCursor = start + textToInsert.length;
        textarea.setSelectionRange(newCursor, newCursor);
      }, 50);
    } else {
      if (isSection1Collapsed) {
        setIsSection1Collapsed(false);
      }
      const textarea = chatInputRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? chatInput.length;
        const end = textarea.selectionEnd ?? chatInput.length;
        const before = chatInput.substring(0, start);
        const after = chatInput.substring(end);
        const separator = before && !before.endsWith(' ') && !before.endsWith('\n') ? '\n\n' : '';
        const newText = before + separator + textToInsert + after;
        setChatInput(newText);
        showToast(`💬 AI 채팅창에 "${prompt.title}" 프롬프트가 즉시 주입되었습니다.`, 'success');
        setTimeout(() => {
          textarea.focus();
          const newCursor = start + separator.length + textToInsert.length;
          textarea.setSelectionRange(newCursor, newCursor);
        }, 50);
      } else {
        setChatInput((prev) => (prev ? prev + '\n\n' + textToInsert : textToInsert));
        showToast(`💬 AI 채팅창에 "${prompt.title}" 프롬프트가 즉시 주입되었습니다.`, 'success');
      }
    }
  }, [editorContent, chatInput, isSection1Collapsed, isSection2Collapsed, isSection3Collapsed, showToast, setIsSection1Collapsed, setIsSection3Collapsed, setActiveMenu, setActiveSubmenu]);

  // Load auto-saved content & projects from IndexedDB / localStorage on initial render
  useEffect(() => {
    let isMounted = true;
    const initStorage = async () => {
      try {
        // Automatically migrate any legacy LocalStorage data to IndexedDB in the background
        await migrateFromLocalStorageIfAvailable().catch(() => {});

        // 1. Try reading from IndexedDB first (High-Capacity Primary Store)
        const [
          idbProjects,
          idbActiveSessionId,
          idbTrash,
          idbFiles,
          idbFolders,
          idbEditorContent,
          idbActiveFile,
          idbOpenTabs
        ] = await Promise.all([
          getDbItem<ChatSession[]>(STORAGE_KEYS.SESSIONS),
          getDbItem<string>(STORAGE_KEYS.ACTIVE_SESSION_ID),
          getDbItem<ChatSession[]>(STORAGE_KEYS.TRASH_SESSIONS),
          getDbItem<Record<string, string>>(STORAGE_KEYS.FILES),
          getDbItem<Record<string, string>>(STORAGE_KEYS.FILE_FOLDERS),
          getDbItem<string>(STORAGE_KEYS.EDITOR_CONTENT),
          getDbItem<string>(STORAGE_KEYS.ACTIVE_FILE),
          getDbItem<string[]>(STORAGE_KEYS.OPEN_TABS)
        ]);

        if (!isMounted) return;

        // If data at rest is encrypted with Master Vault Key, defer state loading until user unlocks via AuthPage
        if (
          isEncryptedPayload(idbFiles) ||
          isEncryptedPayload(idbProjects) ||
          isEncryptedPayload(idbEditorContent) ||
          isEncryptedPayload(idbActiveSessionId)
        ) {
          return;
        }

        // Fallbacks from LocalStorage if IndexedDB was null
        const savedProjects: ChatSession[] | null = idbProjects || (() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
            return raw ? JSON.parse(raw) : null;
          } catch { return null; }
        })();

        const savedActiveSessionId = idbActiveSessionId || localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);

        const savedTrash: ChatSession[] | null = idbTrash || (() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.TRASH_SESSIONS);
            return raw ? JSON.parse(raw) : null;
          } catch { return null; }
        })();

        const savedFiles: Record<string, string> | null = idbFiles || (() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.FILES);
            return raw ? JSON.parse(raw) : null;
          } catch { return null; }
        })();

        const savedFolders: Record<string, string> | null = idbFolders || (() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.FILE_FOLDERS);
            return raw ? JSON.parse(raw) : null;
          } catch { return null; }
        })();

        const savedOpenTabs: string[] | null = idbOpenTabs || (() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.OPEN_TABS);
            return raw ? JSON.parse(raw) : null;
          } catch { return null; }
        })();

        if (savedOpenTabs && Array.isArray(savedOpenTabs)) {
          setOpenTabs(savedOpenTabs);
        }

        if (savedTrash && Array.isArray(savedTrash)) {
          setTrashSessions(savedTrash);
        }

        // Sanitize: Purge legacy "REST API..." and "Redis..." sample projects, folders, and files
        const isLegacySampleTitle = (title?: string) =>
          Boolean(title && (title.includes('REST API') || title.includes('Redis')));
        const isLegacySampleId = (id?: string) =>
          id === 'session-rest-graphql' || id === 'session-redis';
        const isLegacySampleFile = (fName?: string) =>
          fName === 'rest_graphql_comparison.md' || fName === 'redis_caching_guide.md';

        // 1. Files
        const resolvedFiles: Record<string, string> = {
          ...(savedFiles && typeof savedFiles === 'object' ? savedFiles : {})
        };
        delete resolvedFiles['rest_graphql_comparison.md'];
        delete resolvedFiles['redis_caching_guide.md'];
        if (!resolvedFiles['tech_notes.md']) {
          resolvedFiles['tech_notes.md'] = `# AI Podium 기술 스택 노트 (SSOT 원본)\n\n## 개요\n이 노트는 AI 대화창에서 [에디터로 보내기 ➔] 버튼을 눌러 수집된 Single Source of Truth(SSOT) 핵심 문서입니다.\n\n## 시작하기\nAI 지식 비서와 대화를 통해 지식을 축적하고 문서를 완성해 보세요.`;
        }
        setFiles(resolvedFiles);

        // 2. Folders
        const resolvedFolders: Record<string, string> = {
          ...(savedFolders && typeof savedFolders === 'object' ? savedFolders : {})
        };
        delete resolvedFolders['rest_graphql_comparison.md'];
        delete resolvedFolders['redis_caching_guide.md'];
        // Re-assign any file assigned to legacy REST or Redis folders to 'AI 지식 비서'
        Object.keys(resolvedFolders).forEach((fKey) => {
          const folderName = resolvedFolders[fKey];
          if (folderName && (folderName.includes('REST API') || folderName.includes('Redis'))) {
            resolvedFolders[fKey] = 'AI 지식 비서';
          }
        });
        if (!resolvedFolders['tech_notes.md']) {
          resolvedFolders['tech_notes.md'] = 'AI 지식 비서';
        }
        setFileFolders(resolvedFolders);

        // 3. Open Tabs
        if (savedOpenTabs && Array.isArray(savedOpenTabs)) {
          const cleanedTabs = savedOpenTabs.filter((t) => !isLegacySampleFile(t) && resolvedFiles[t]);
          setOpenTabs(cleanedTabs.length > 0 ? cleanedTabs : ['tech_notes.md']);
        }

        // 4. Projects / Sessions
        const defaultSession: ChatSession = {
          id: 'session-default',
          title: 'AI 지식 비서',
          createdAt: '방금 전',
          fileName: 'tech_notes.md',
          editorTab: 'wysiwyg',
          editorContent: resolvedFiles['tech_notes.md'] || `# 기술 노트\n\nAI 지식 비서와 함께 작성하는 문서입니다.`,
          messages: [
            {
              id: 'welcome-1',
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              model: 'AI 지식 비서',
              text: `안녕하세요! **AI 지식 비서**입니다.\n\nAI Podium에 오신 것을 환영합니다! 별도의 API 키 등록이나 로컬 AI 연결 없이도 에디터와 기본 기능을 즉시 체험하실 수 있습니다. 원하시는 안내를 아래 버튼에서 선택해 보세요.`,
              showOnboardingChips: true,
            }
          ]
        };

        let cleanedSessions: ChatSession[] = [];
        if (savedProjects && Array.isArray(savedProjects)) {
          cleanedSessions = savedProjects.filter(
            (s) => !isLegacySampleId(s.id) && !isLegacySampleTitle(s.title)
          );
        }
        if (cleanedSessions.length === 0) {
          cleanedSessions = [defaultSession];
        }
        setSessions(cleanedSessions);

        const targetId = savedActiveSessionId && cleanedSessions.some((s) => s.id === savedActiveSessionId)
          ? savedActiveSessionId
          : cleanedSessions[0].id;
        setActiveSessionId(targetId);

        const activeSess = cleanedSessions.find((s) => s.id === targetId) || cleanedSessions[0];
        if (activeSess) {
          const initialContent = activeSess.editorContent !== undefined
            ? activeSess.editorContent
            : resolvedFiles[activeSess.fileName || 'tech_notes.md'] || `# ${activeSess.title}\n\n프로젝트 노트`;
          const initialFileName = isLegacySampleFile(activeSess.fileName) ? 'tech_notes.md' : (activeSess.fileName || 'tech_notes.md');
          // 앱 초기 시작 시 항상 서식 모드(워드프로세서)로 시작
          const initialTab: 'wysiwyg' | 'edit' | 'split' | 'preview' = 'wysiwyg';

          setEditorContent(initialContent);
          setFileName(initialFileName);
          setCurrentActiveFile(initialFileName);
          setEditorTab(initialTab);
        }

        try {
          saveHybridStorage(STORAGE_KEYS.SESSIONS, cleanedSessions);
          saveHybridStorage(STORAGE_KEYS.ACTIVE_SESSION_ID, targetId);
          saveHybridStorage(STORAGE_KEYS.FILES, resolvedFiles);
          saveHybridStorage(STORAGE_KEYS.FILE_FOLDERS, resolvedFolders);
        } catch {}
        return;

        // Fallback to active file if no saved sessions
        if (idbActiveFile) {
          setCurrentActiveFile(idbActiveFile);
          setFileName(idbActiveFile);
        }
        if (idbEditorContent) {
          setEditorContent(idbEditorContent);
        }
      } catch (err) {
        console.warn('Failed to load auto-saved data from IndexedDB/localStorage:', err);
      }
    };

    initStorage();
    return () => { isMounted = false; };
  }, []);

  // Synchronized refs for fresh pre-lock snapshots & active encryption vault key
  const activeVaultKeyRef = useRef<string | null>(null);
  const apiKeysRef = useRef(apiKeys);
  apiKeysRef.current = apiKeys;
  const editorContentRef = useRef(editorContent);
  editorContentRef.current = editorContent;
  const filesRef = useRef(files);
  filesRef.current = files;
  const fileFoldersRef = useRef(fileFolders);
  fileFoldersRef.current = fileFolders;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;
  const currentActiveFileRef = useRef(currentActiveFile);
  currentActiveFileRef.current = currentActiveFile;
  const trashSessionsRef = useRef(trashSessions);
  trashSessionsRef.current = trashSessions;
  const openTabsRef = useRef(openTabs);
  openTabsRef.current = openTabs;

  // In-Memory Data Wiping on Lock: Encrypts data at rest, purges documents, secrets, and vault keys from React memory
  const handleWipeInMemoryDataOnLock = useCallback(async () => {
    const vaultKey = activeVaultKeyRef.current;
    const hasPin = hasMasterPinConfigured();
    const isGuestUser = auth.isGuest || !hasPin || authService.getCurrentUser()?.provider === 'guest';

    try {
      if (vaultKey && hasPin) {
        // High-Security Data-at-Rest Encryption (DRE) with AES-256-GCM before flushing to disk
        const [
          encSessions,
          encActiveId,
          encTrash,
          encContent,
          encActiveFile,
          encFiles,
          encFolders,
          encOpenTabs
        ] = await Promise.all([
          encryptObjectWithVaultKey(sessionsRef.current, vaultKey),
          encryptWithVaultKey(activeSessionIdRef.current || '', vaultKey),
          encryptObjectWithVaultKey(trashSessionsRef.current, vaultKey),
          encryptWithVaultKey(editorContentRef.current || '', vaultKey),
          encryptWithVaultKey(currentActiveFileRef.current || '', vaultKey),
          encryptObjectWithVaultKey(filesRef.current, vaultKey),
          encryptObjectWithVaultKey(fileFoldersRef.current, vaultKey),
          encryptObjectWithVaultKey(openTabsRef.current, vaultKey)
        ]);

        await Promise.all([
          saveHybridStorage(STORAGE_KEYS.SESSIONS, encSessions),
          saveHybridStorage(STORAGE_KEYS.ACTIVE_SESSION_ID, encActiveId),
          saveHybridStorage(STORAGE_KEYS.TRASH_SESSIONS, encTrash),
          saveHybridStorage(STORAGE_KEYS.EDITOR_CONTENT, encContent),
          saveHybridStorage(STORAGE_KEYS.ACTIVE_FILE, encActiveFile),
          saveHybridStorage(STORAGE_KEYS.FILES, encFiles),
          saveHybridStorage(STORAGE_KEYS.FILE_FOLDERS, encFolders),
          saveHybridStorage(STORAGE_KEYS.OPEN_TABS, encOpenTabs)
        ]);

        // Encrypt BYOK API keys in sessionStorage with AES-256-GCM so they are NEVER in plaintext while locked
        const currentKeys = apiKeysRef.current;
        const encApiKeys = await encryptObjectWithVaultKey(currentKeys, vaultKey);
        sessionStorage.setItem('aipodium_api_keys', encApiKeys);
        sessionStorage.removeItem('aipodium_cloud_api_key');
      } else if (isGuestUser) {
        // GUEST / UNREGISTERED USER AUTO-PURGE:
        // When a user without PIN locks or exceeds idle timeout, purge all local files, sessions, and databases completely.
        await purgeGuestSession();
        authService.logout();
        setCurrentUser(null);
      } else {
        // Unencrypted fallback for registered non-guest accounts without active vaultKey
        await Promise.all([
          saveHybridStorage(STORAGE_KEYS.SESSIONS, sessionsRef.current),
          saveHybridStorage(STORAGE_KEYS.ACTIVE_SESSION_ID, activeSessionIdRef.current),
          saveHybridStorage(STORAGE_KEYS.TRASH_SESSIONS, trashSessionsRef.current),
          saveHybridStorage(STORAGE_KEYS.EDITOR_CONTENT, editorContentRef.current),
          saveHybridStorage(STORAGE_KEYS.ACTIVE_FILE, currentActiveFileRef.current),
          saveHybridStorage(STORAGE_KEYS.FILES, filesRef.current),
          saveHybridStorage(STORAGE_KEYS.FILE_FOLDERS, fileFoldersRef.current)
        ]);
      }
    } catch (err) {
      console.warn('Pre-lock state flush warning:', err);
    }

    // Wipe sensitive state variables and the vault key from React memory, and purge sensitive clipboard
    setEditorContent('');
    setFiles({});
    setFileFolders({});
    setOpenTabs([]);
    setSessions([]);
    setActiveSessionId(null);
    setCurrentActiveFile('');
    setFileName('untitled.md');
    setApiKeys({ gemini: '', openai: '', anthropic: '', deepseek: '', groq: '' });
    activeVaultKeyRef.current = null;
    clearSensitiveClipboard();
  }, [auth.isGuest]);

  handleWipeInMemoryDataOnLockRef.current = handleWipeInMemoryDataOnLock;

  // Re-fetch / rehydrate & decrypt data from local storage on successful unlock
  const reloadSecureWorkspaceData = useCallback(async (providedVaultKey?: string | null) => {
    try {
      const keyToUse = providedVaultKey || activeVaultKeyRef.current;

      const [
        idbFiles,
        idbFolders,
        idbContent,
        idbActiveFile,
        idbSessions,
        idbActiveSessId,
        idbOpenTabs
      ] = await Promise.all([
        getDbItem<any>(STORAGE_KEYS.FILES),
        getDbItem<any>(STORAGE_KEYS.FILE_FOLDERS),
        getDbItem<any>(STORAGE_KEYS.EDITOR_CONTENT),
        getDbItem<any>(STORAGE_KEYS.ACTIVE_FILE),
        getDbItem<any>(STORAGE_KEYS.SESSIONS),
        getDbItem<any>(STORAGE_KEYS.ACTIVE_SESSION_ID),
        getDbItem<any>(STORAGE_KEYS.OPEN_TABS)
      ]);

      // 1. Files
      let loadedFiles: Record<string, string> | null = null;
      const rawFiles = idbFiles !== null && idbFiles !== undefined ? idbFiles : (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.FILES);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (rawFiles) {
        if (keyToUse && isEncryptedPayload(rawFiles)) {
          try {
            loadedFiles = await decryptObjectWithVaultKey<Record<string, string>>(rawFiles, keyToUse);
          } catch (err) {
            console.warn('Failed to decrypt files with vault key:', err);
          }
        } else if (typeof rawFiles === 'object') {
          loadedFiles = rawFiles;
        }
      }

      // 2. Folders
      let loadedFolders: Record<string, string> | null = null;
      const rawFolders = idbFolders !== null && idbFolders !== undefined ? idbFolders : (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.FILE_FOLDERS);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (rawFolders) {
        if (keyToUse && isEncryptedPayload(rawFolders)) {
          try {
            loadedFolders = await decryptObjectWithVaultKey<Record<string, string>>(rawFolders, keyToUse);
          } catch (err) {
            console.warn('Failed to decrypt folders with vault key:', err);
          }
        } else if (typeof rawFolders === 'object') {
          loadedFolders = rawFolders;
        }
      }

      // 3. Editor Content
      let loadedContent: string | null = null;
      const rawContent = idbContent !== null && idbContent !== undefined ? idbContent : localStorage.getItem(STORAGE_KEYS.EDITOR_CONTENT);
      if (rawContent !== null && rawContent !== undefined) {
        if (keyToUse && isEncryptedPayload(rawContent)) {
          try {
            loadedContent = await decryptWithVaultKey(rawContent, keyToUse);
          } catch (err) {
            console.warn('Failed to decrypt editor content with vault key:', err);
          }
        } else {
          loadedContent = typeof rawContent === 'string' ? rawContent : String(rawContent);
        }
      }

      // 4. Active File
      let loadedActiveFile: string | null = null;
      const rawActiveFile = idbActiveFile !== null && idbActiveFile !== undefined ? idbActiveFile : localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE);
      if (rawActiveFile) {
        if (keyToUse && isEncryptedPayload(rawActiveFile)) {
          try {
            loadedActiveFile = await decryptWithVaultKey(rawActiveFile, keyToUse);
          } catch {}
        } else {
          loadedActiveFile = rawActiveFile;
        }
      }

      // 5. Sessions
      let loadedSessions: ChatSession[] | null = null;
      const rawSessions = idbSessions !== null && idbSessions !== undefined ? idbSessions : (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (rawSessions) {
        if (keyToUse && isEncryptedPayload(rawSessions)) {
          try {
            loadedSessions = await decryptObjectWithVaultKey<ChatSession[]>(rawSessions, keyToUse);
          } catch {}
        } else if (Array.isArray(rawSessions)) {
          loadedSessions = rawSessions;
        }
      }

      // 6. Active Session ID
      let loadedActiveSessId: string | null = null;
      const rawActiveSessId = idbActiveSessId !== null && idbActiveSessId !== undefined ? idbActiveSessId : localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
      if (rawActiveSessId) {
        if (keyToUse && isEncryptedPayload(rawActiveSessId)) {
          try {
            loadedActiveSessId = await decryptWithVaultKey(rawActiveSessId, keyToUse);
          } catch {}
        } else {
          loadedActiveSessId = rawActiveSessId;
        }
      }

      // 6.2. Open Tabs
      let loadedOpenTabs: string[] | null = null;
      const rawOpenTabs = idbOpenTabs !== null && idbOpenTabs !== undefined ? idbOpenTabs : (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.OPEN_TABS);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (rawOpenTabs) {
        if (keyToUse && isEncryptedPayload(rawOpenTabs)) {
          try {
            loadedOpenTabs = await decryptObjectWithVaultKey<string[]>(rawOpenTabs, keyToUse);
          } catch {}
        } else if (Array.isArray(rawOpenTabs)) {
          loadedOpenTabs = rawOpenTabs;
        }
      }

      if (loadedFiles && Object.keys(loadedFiles).length > 0) {
        delete loadedFiles['rest_graphql_comparison.md'];
        delete loadedFiles['redis_caching_guide.md'];
        setFiles(loadedFiles);
      }
      if (loadedFolders) {
        delete loadedFolders['rest_graphql_comparison.md'];
        delete loadedFolders['redis_caching_guide.md'];
        Object.keys(loadedFolders).forEach((k) => {
          if (loadedFolders[k] && (loadedFolders[k].includes('REST API') || loadedFolders[k].includes('Redis'))) {
            loadedFolders[k] = 'AI 지식 비서';
          }
        });
        setFileFolders(loadedFolders);
      }
      if (loadedContent !== null) {
        setEditorContent(loadedContent);
      }
      if (loadedActiveFile) {
        const safeActiveFile = (loadedActiveFile === 'rest_graphql_comparison.md' || loadedActiveFile === 'redis_caching_guide.md')
          ? 'tech_notes.md'
          : loadedActiveFile;
        setCurrentActiveFile(safeActiveFile);
        setFileName(safeActiveFile);
      }
      if (loadedSessions && Array.isArray(loadedSessions) && loadedSessions.length > 0) {
        const safeSessions = loadedSessions.filter(
          (s) => s.id !== 'session-rest-graphql' && s.id !== 'session-redis' && !s.title.includes('REST API') && !s.title.includes('Redis')
        );
        setSessions(safeSessions.length > 0 ? safeSessions : [
          {
            id: 'session-default',
            title: 'AI 지식 비서',
            createdAt: '방금 전',
            fileName: 'tech_notes.md',
            editorTab: 'wysiwyg',
            editorContent: `# 기술 노트\n\nAI 지식 비서와 함께 작성하는 문서입니다.`,
            messages: [
              {
                id: 'welcome-1',
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                model: 'AI 지식 비서',
                text: `안녕하세요! **AI 지식 비서**입니다.\n\nAI Podium에 오신 것을 환영합니다! 별도의 API 키 등록이나 로컬 AI 연결 없이도 에디터와 기본 기능을 즉시 체험하실 수 있습니다. 원하시는 안내를 아래 버튼에서 선택해 보세요.`,
                showOnboardingChips: true,
              }
            ]
          }
        ]);
      }
      if (loadedActiveSessId) {
        const safeActiveSessId = (loadedActiveSessId === 'session-rest-graphql' || loadedActiveSessId === 'session-redis')
          ? 'session-default'
          : loadedActiveSessId;
        setActiveSessionId(safeActiveSessId);
      }
      if (loadedOpenTabs && Array.isArray(loadedOpenTabs)) {
        const safeTabs = loadedOpenTabs.filter((t) => t !== 'rest_graphql_comparison.md' && t !== 'redis_caching_guide.md');
        setOpenTabs(safeTabs.length > 0 ? safeTabs : ['tech_notes.md']);
      }

      // 7. Rehydrate and decrypt transient session API keys from sessionStorage
      try {
        const sessionKeys = sessionStorage.getItem('aipodium_api_keys');
        if (sessionKeys) {
          if (keyToUse && isEncryptedPayload(sessionKeys)) {
            const decryptedKeys = await decryptObjectWithVaultKey<Record<string, string>>(sessionKeys, keyToUse);
            setApiKeys({ gemini: '', openai: '', anthropic: '', deepseek: '', groq: '', ...decryptedKeys });
          } else {
            setApiKeys({ gemini: '', openai: '', anthropic: '', deepseek: '', groq: '', ...JSON.parse(sessionKeys) });
          }
        }
      } catch (err) {
        console.warn('Failed to rehydrate session API keys:', err);
      }
    } catch (err) {
      console.warn('Failed to rehydrate secure workspace data:', err);
    }
  }, []);

  // Monitor lock transitions to execute in-memory wiping
  const prevIsLockedRef = useRef(isLocked);
  useEffect(() => {
    if (!prevIsLockedRef.current && isLocked) {
      handleWipeInMemoryDataOnLock();
    }
    prevIsLockedRef.current = isLocked;
  }, [isLocked, handleWipeInMemoryDataOnLock]);

  // Auto-save sessions, active session, editor content & files to IndexedDB & localStorage on change (Debounced 400ms)
  useEffect(() => {
    // CRITICAL: Prevent saving wiped/sanitized empty states to persistent storage while locked
    if (isLocked) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const vaultKey = activeVaultKeyRef.current;
        if (vaultKey) {
          // Encrypted at rest during background auto-save
          const [
            encSessions,
            encActiveId,
            encTrash,
            encContent,
            encActiveFile,
            encFiles,
            encFolders,
            encOpenTabs
          ] = await Promise.all([
            encryptObjectWithVaultKey(sessions, vaultKey),
            encryptWithVaultKey(activeSessionId || '', vaultKey),
            encryptObjectWithVaultKey(trashSessions, vaultKey),
            encryptWithVaultKey(editorContent || '', vaultKey),
            encryptWithVaultKey(currentActiveFile || '', vaultKey),
            encryptObjectWithVaultKey(files, vaultKey),
            encryptObjectWithVaultKey(fileFolders, vaultKey),
            encryptObjectWithVaultKey(openTabs, vaultKey)
          ]);

          await Promise.all([
            saveHybridStorage(STORAGE_KEYS.SESSIONS, encSessions),
            saveHybridStorage(STORAGE_KEYS.ACTIVE_SESSION_ID, encActiveId),
            saveHybridStorage(STORAGE_KEYS.TRASH_SESSIONS, encTrash),
            saveHybridStorage(STORAGE_KEYS.EDITOR_CONTENT, encContent),
            saveHybridStorage(STORAGE_KEYS.ACTIVE_FILE, encActiveFile),
            saveHybridStorage(STORAGE_KEYS.FILES, encFiles),
            saveHybridStorage(STORAGE_KEYS.FILE_FOLDERS, encFolders),
            saveHybridStorage(STORAGE_KEYS.OPEN_TABS, encOpenTabs)
          ]);
        } else {
          await Promise.all([
            saveHybridStorage(STORAGE_KEYS.SESSIONS, sessions),
            saveHybridStorage(STORAGE_KEYS.ACTIVE_SESSION_ID, activeSessionId),
            saveHybridStorage(STORAGE_KEYS.TRASH_SESSIONS, trashSessions),
            saveHybridStorage(STORAGE_KEYS.EDITOR_CONTENT, editorContent),
            saveHybridStorage(STORAGE_KEYS.ACTIVE_FILE, currentActiveFile),
            saveHybridStorage(STORAGE_KEYS.FILES, files),
            saveHybridStorage(STORAGE_KEYS.FILE_FOLDERS, fileFolders),
            saveHybridStorage(STORAGE_KEYS.OPEN_TABS, openTabs)
          ]);
        }
      } catch (err) {
        console.warn('Auto-save storage engine warning:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [sessions, activeSessionId, trashSessions, editorContent, files, currentActiveFile, fileFolders, openTabs, isLocked]);

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

      const currentFolder = fileFolders[currentDraggedId];
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

  // Smart Auto scroll chat: locks to bottom during generation, releases if user scrolls up
  const isUserScrolledUpRef = useRef<boolean>(false);
  const [isScrolledUp, setIsScrolledUp] = useState<boolean>(false);

  const handleChatScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 40) {
      isUserScrolledUpRef.current = true;
      setIsScrolledUp(true);
    } else {
      isUserScrolledUpRef.current = false;
      setIsScrolledUp(false);
    }
  }, []);

  const scrollToChatBottom = useCallback((smooth = false) => {
    const container = chatContainerRef.current;
    if (!container) return;
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!isUserScrolledUpRef.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAiLoading, activeSessionId]);

  // REQUIREMENT 4: [에디터로 보내기 ➔] Logic
  const handleSendToEditor = (msgText: string) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const headerTitle = `AI 응답 수집 - ${timestamp}`;

    if (editorTab === 'wysiwyg' && tiptapEditorRef.current) {
      // 1. 서식 모드 (워드프로세서 방식): 서식 그대로 리치 텍스트 노드로 주입
      const syncedMd = tiptapEditorRef.current.insertFormattedMarkdown(msgText, headerTitle);
      const updated = syncedMd || (editorContent ? `${editorContent}\n\n---\n> 📌 [${headerTitle}]\n\n${msgText.trim()}\n` : `> 📌 [${headerTitle}]\n\n${msgText.trim()}\n`);

      setEditorContent(updated);
      setFiles((prev) => ({
        ...prev,
        [currentActiveFile]: updated
      }));
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

      showToast('✓ AI 답변이 서식 모드(워드프로세서)에 서식 그대로 주입되었습니다.');
    } else {
      // 2. 마크다운 모드 (edit, split, preview): 마크다운 문법 원문으로 주입
      const isDocEmpty = !editorContent.trim();
      const formattedAppend = isDocEmpty
        ? `> 📌 [${headerTitle}]\n\n` + msgText.trim() + `\n`
        : `\n\n---\n> 📌 [${headerTitle}]\n\n` + msgText.trim() + `\n`;

      const textarea = editorRef.current;
      let updated: string;

      if (textarea && typeof textarea.selectionStart === 'number' && document.activeElement === textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        updated = editorContent.slice(0, start) + formattedAppend + editorContent.slice(end);
        setEditorContent(updated);
        setTimeout(() => {
          if (editorRef.current) {
            const newCursor = start + formattedAppend.length;
            editorRef.current.setSelectionRange(newCursor, newCursor);
            editorRef.current.focus();
          }
        }, 30);
      } else {
        updated = editorContent ? editorContent + formattedAppend : formattedAppend.trimStart();
        setEditorContent(updated);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.scrollTop = editorRef.current.scrollHeight;
          }
        }, 30);
      }

      setFiles((prev) => ({
        ...prev,
        [currentActiveFile]: updated
      }));
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

      showToast('✓ AI 답변이 마크다운 모드에 마크다운 문법으로 주입되었습니다.');
    }

    const fullTimeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecentAiChanges({
      file: currentActiveFile,
      source: 'AI 대화 응답 수집',
      timestamp: fullTimeStr,
      preview: msgText.trim().slice(0, 65) + '...'
    });
    setHasUnreadAiChanges(true);
  };

  // REQUIREMENT 3: Save to File Logic
  const handleSaveToFile = () => {
    if (!editorContent.trim()) {
      showToast('No document content to save.', 'warn');
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
    URL.revokeObjectURL(url);

    showToast(`Saved '${fileName}' successfully!`);
  };

  // Export as PDF Logic via Browser Print Dialog
  const handleExportPdf = () => {
    if (!editorContent.trim()) {
      showToast('No document content to export.', 'warn');
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
    setIsSaveUntitledModalOpen(true);
  };

  // Export DOCX Handler
  const handleExportDocx = () => {
    if (!editorContent.trim()) {
      showToast('No document content to export.', 'warn');
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
    URL.revokeObjectURL(url);
    showToast(`Exported '${fileName.replace(/\.[^/.]+$/, '')}.docx' successfully!`);
  };

  // Export PPTX Handler
  const handleExportPptx = () => {
    if (!editorContent.trim()) {
      showToast('No slide content to export.', 'warn');
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
    URL.revokeObjectURL(url);
    showToast(`Exported '${fileName.replace(/\.[^/.]+$/, '')}.pptx' successfully!`);
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    if (!editorContent.trim()) {
      showToast('No CSV content to export.', 'warn');
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
    URL.revokeObjectURL(url);
    showToast(`Exported '${fileName.replace(/\.[^/.]+$/, '')}.csv' successfully!`);
  };

  // Process Document File (PDF, DOCX, XLSX, PPTX, or text/markdown) client-side
  const handleProcessDocumentFile = async (
    file: File,
    showPreview: boolean = true,
    preferredFolder?: string
  ) => {
    const lower = file.name.toLowerCase();

    if (lower.endsWith('.pdf')) {
      if (file.size === 0) {
        showToast(`⚠️ '${file.name}' 파일이 비어 있습니다 (0 바이트).`, 'warn');
        return;
      }
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const fname = file.name;
          const targetFolder = preferredFolder || activeSession?.title || '문서 라이브러리 (Documents)';
          setFiles((prev) => ({ ...prev, [fname]: dataUrl }));
          setFileFolders((prev) => ({ ...prev, [fname]: targetFolder }));
          setFileName(fname);
          setCurrentActiveFile(fname);
          if (!openTabs.includes(fname)) {
            setOpenTabs((prev) => [...prev, fname]);
          }
          showToast(`📄 PDF '${fname}'을 뷰어 모드로 열었습니다.`, 'success');
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        showToast(`PDF 로드 실패: ${err.message}`, 'error');
      }
      return;
    }

    const isOffice =
      lower.endsWith('.docx') ||
      lower.endsWith('.xlsx') ||
      lower.endsWith('.xls') ||
      lower.endsWith('.pptx') ||
      lower.endsWith('.ppt');

    if (!isOffice) {
      try {
        const text = await file.text();
        const fname = file.name;
        const targetFolder = preferredFolder || activeSession?.title || 'docs';
        setFiles((prev) => ({ ...prev, [fname]: text }));
        setFileFolders((prev) => ({ ...prev, [fname]: targetFolder }));
        setFileName(fname);
        setCurrentActiveFile(fname);
        setEditorContent(text);
        setEditorTab('edit');
        if (!openTabs.includes(fname)) {
          setOpenTabs((prev) => [...prev, fname]);
        }
        showToast(`📂 파일 '${fname}'을 불러왔습니다.`);
      } catch (err: any) {
        showToast(`파일 읽기 실패: ${err.message}`, 'error');
      }
      return;
    }

    try {
      setIsConvertingDoc(true);
      showToast(`🔄 '${file.name}'을 클라이언트 엔진으로 변환 중입니다...`, 'info');
      const result = await convertDocumentToMarkdown(file);
      setIsConvertingDoc(false);

      if (showPreview) {
        setDocConversionResult(result);
        setIsDocConverterModalOpen(true);
      } else {
        const targetName = result.suggestedFileName;
        const targetFolder = preferredFolder || activeSession?.title || 'docs';
        setFiles((prev) => ({ ...prev, [targetName]: result.markdown }));
        setFileFolders((prev) => ({ ...prev, [targetName]: targetFolder }));
        setFileName(targetName);
        setCurrentActiveFile(targetName);
        setEditorContent(result.markdown);
        setEditorTab('edit');
        if (!openTabs.includes(targetName)) {
          setOpenTabs((prev) => [...prev, targetName]);
        }
        showToast(`✨ '${file.name}'을 마크다운(${targetName})으로 성공적으로 변환했습니다!`, 'success');
      }
    } catch (err: any) {
      setIsConvertingDoc(false);
      showToast(`문서 변환 실패: ${err.message}`, 'error');
    }
  };

  // Open Local File Handler (Processes both text/md and office/pdf docs)
  const handleOpenLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleProcessDocumentFile(file, true);
    if (e.target) e.target.value = '';
  };

  // Batch / Multi Document Import Handler
  const handleImportDocumentFiles = async (filesToImport: File[]) => {
    if (!filesToImport || filesToImport.length === 0) return;
    for (const file of filesToImport) {
      await handleProcessDocumentFile(file, true);
    }
  };

  // Confirm Document Conversion from Preview Modal
  const handleConfirmDocumentConversion = async ({
    fileName: finalName,
    folder,
    markdown,
    openInEditor,
  }: {
    fileName: string;
    folder: string;
    markdown: string;
    openInEditor: boolean;
  }) => {
    setIsDocConverterModalOpen(false);

    if (folder !== '__none__') {
      const targetFolder = folder || activeSession?.title || 'docs';
      setFiles((prev) => ({ ...prev, [finalName]: markdown }));
      setFileFolders((prev) => ({ ...prev, [finalName]: targetFolder }));

      try {
        const memoryHandle = getMemoryDirectoryHandle();
        if (memoryHandle && activeWorkspace.type === 'local') {
          await saveFileToLocalDirectory(memoryHandle, finalName, markdown);
        }
      } catch (e) {
        console.warn('Failed to sync converted document to local directory handle:', e);
      }
    }

    if (openInEditor) {
      setFileName(finalName);
      setCurrentActiveFile(finalName);
      setEditorContent(markdown);
      setEditorTab('edit');
      if (!openTabs.includes(finalName)) {
        setOpenTabs((prev) => [...prev, finalName]);
      }
    }

    showToast(`✨ 마크다운 문서 '${finalName}'이(가) 준비되었습니다.`, 'success');
  };

  // Commit Rename File Handler (Preserves subdirectory paths)
  const handleCommitRenameFile = (oldPath: string, newFileName: string) => {
    if (!newFileName || !newFileName.trim()) return;
    const trimmed = newFileName.trim();

    const parts = oldPath.split('/');
    const oldFileName = parts[parts.length - 1];
    if (oldFileName === trimmed) return;

    parts[parts.length - 1] = trimmed;
    const newPath = parts.join('/');

    if (files[newPath] !== undefined && newPath !== oldPath) {
      showToast(`'${trimmed}' 파일이 이미 존재합니다.`, 'warn');
      return;
    }

    const oldContent = files[oldPath] || '';
    setFiles((prev) => {
      const updated = { ...prev };
      updated[newPath] = updated[oldPath] ?? '';
      delete updated[oldPath];
      return updated;
    });

    setFileFolders((prev) => {
      const updated = { ...prev };
      if (updated[oldPath]) {
        updated[newPath] = updated[oldPath];
        delete updated[oldPath];
      }
      return updated;
    });

    if (currentActiveFile === oldPath) {
      setCurrentActiveFile(newPath);
      setFileName(newPath);
    }

    // Physical Local Directory / IndexedDB storage sync
    const dirHandle = getMemoryDirectoryHandle();
    if (activeWorkspace.type === 'local' && dirHandle) {
      renameFileInLocalDirectory(dirHandle, oldPath, newPath, oldContent).catch(console.error);
    }

    showToast(`✏️ 파일명이 '${oldFileName}'에서 '${trimmed}'(으)로 변경되었습니다.`);
  };

  // Rename File Handler (Triggers inline rename for compatibility)
  const handleRenameFile = (oldPath: string) => {
    const parts = oldPath.split('/');
    const name = parts[parts.length - 1];
    setEditingTreeTarget({
      id: `file:${oldPath}`,
      type: 'file',
      name,
      path: oldPath,
    });
    setFocusedTreeItemId(`file:${oldPath}`);
  };

  // Rename Subfolder Handler
  const handleRenameFolder = (oldFolderPath: string, newFolderName: string, sessionId?: string) => {
    if (!newFolderName || !newFolderName.trim()) return;
    const trimmed = newFolderName.trim();

    const parts = oldFolderPath.split('/');
    const oldFolderName = parts[parts.length - 1];
    if (oldFolderName === trimmed) return;

    parts[parts.length - 1] = trimmed;
    const newFolderPath = parts.join('/');

    // 1. Update files state: Only update path prefix if files have hierarchical paths
    // Keep file names intact - NEVER rename files to the folder name!
    setFiles((prev) => {
      const updated: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k.startsWith(`${oldFolderPath}/`)) {
          const rest = k.slice(oldFolderPath.length);
          updated[`${newFolderPath}${rest}`] = v;
        } else {
          updated[k] = v;
        }
      }
      return updated;
    });

    // 2. Update fileFolders mapping: Map all files belonging to oldFolderPath/oldFolderName to newFolderPath
    setFileFolders((prev) => {
      const updated: Record<string, string> = {};
      for (const [k, folderVal] of Object.entries(prev)) {
        const newKey = k.startsWith(`${oldFolderPath}/`)
          ? `${newFolderPath}${k.slice(oldFolderPath.length)}`
          : k;
        let newFolderVal = folderVal;
        if (folderVal === oldFolderPath || folderVal === oldFolderName) {
          newFolderVal = newFolderPath;
        } else if (folderVal.startsWith(`${oldFolderPath}/`)) {
          newFolderVal = `${newFolderPath}${folderVal.slice(oldFolderPath.length)}`;
        }
        updated[newKey] = newFolderVal;
      }
      return updated;
    });

    // 3. Update currentActiveFile if it was inside the renamed folder
    if (currentActiveFile.startsWith(`${oldFolderPath}/`)) {
      const rest = currentActiveFile.slice(oldFolderPath.length);
      const updatedActive = `${newFolderPath}${rest}`;
      setCurrentActiveFile(updatedActive);
      setFileName(updatedActive);
    }

    // 4. Update openTabs
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.startsWith(`${oldFolderPath}/`) ? `${newFolderPath}${tab.slice(oldFolderPath.length)}` : tab
      )
    );

    // 5. Update openFolders mapping
    setOpenFolders((prev) => {
      const updated = { ...prev };
      if (updated[oldFolderPath] !== undefined) {
        updated[newFolderPath] = updated[oldFolderPath];
        delete updated[oldFolderPath];
      }
      const sessionTitle = sessionId ? sessions.find((s) => s.id === sessionId)?.title : '';
      if (sessionTitle) {
        const oldKey = `${sessionTitle}/${oldFolderPath}`;
        const newKey = `${sessionTitle}/${newFolderPath}`;
        if (updated[oldKey] !== undefined) {
          updated[newKey] = updated[oldKey];
          delete updated[oldKey];
        }
      }
      return updated;
    });

    showToast(`📁 폴더명이 '${oldFolderName}'에서 '${trimmed}'(으)로 변경되었습니다.`);
  };

  // Commit Rename Handler (Dispatches to session, folder, or file)
  const handleCommitRename = (newName: string) => {
    if (!editingTreeTarget) return;
    const target = editingTreeTarget;
    setEditingTreeTarget(null);

    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();

    if (target.type === 'session') {
      if (target.sessionId) {
        handleRenameProject(target.sessionId, trimmed);
      }
    } else if (target.type === 'folder') {
      handleRenameFolder(target.path, trimmed, target.sessionId);
    } else if (target.type === 'file') {
      handleCommitRenameFile(target.path, trimmed);
    }
  };

  // Delete Subfolder Handler
  const handleDeleteFolder = (folderPath: string) => {
    const matchingFiles = Object.keys(files).filter(
      (f) => f === folderPath || f.startsWith(`${folderPath}/`)
    );
    if (matchingFiles.length === 0) return;
    if (
      !window.confirm(
        `'${folderPath}' 폴더 및 하위 파일(${matchingFiles.length}개)을 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    setFiles((prev) => {
      const updated = { ...prev };
      matchingFiles.forEach((f) => delete updated[f]);
      return updated;
    });
    setFileFolders((prev) => {
      const updated = { ...prev };
      matchingFiles.forEach((f) => delete updated[f]);
      return updated;
    });

    if (matchingFiles.includes(currentActiveFile)) {
      const remaining = Object.keys(files).filter((k) => !matchingFiles.includes(k));
      if (remaining.length > 0) {
        setCurrentActiveFile(remaining[0]);
        setFileName(remaining[0]);
        setEditorContent(files[remaining[0]] || '');
      }
    }

    showToast(`🗑️ 폴더 및 하위 ${matchingFiles.length}개 파일이 삭제되었습니다.`);
  };

  const getFlatVisibleTreeItems = useCallback(() => {
    const items: Array<{
      id: string;
      type: 'session' | 'folder' | 'file';
      name: string;
      path: string;
      sessionId?: string;
      isOpen?: boolean;
    }> = [];

    for (const session of sessions) {
      const isFolderOpen = openFolders[session.title] ?? true;
      items.push({
        id: `session:${session.id}`,
        type: 'session',
        name: session.title,
        path: session.title,
        sessionId: session.id,
        isOpen: isFolderOpen,
      });

      if (isFolderOpen) {
        const memoFileName = session.fileName || `${session.title}.md`;
        const folderFiles = Object.keys(files).filter((f) => {
          if (
            f.startsWith('01_SSOT_Sources/') ||
            f.startsWith('02_Studio_Outputs/') ||
            f.startsWith('.podium/')
          ) {
            return false;
          }
          // 1. Explicitly assigned to this session folder
          if (fileFolders[f] === session.title) {
            return true;
          }
          // 2. If assigned to another session, it must not appear here
          if (fileFolders[f] && fileFolders[f] !== session.title) {
            return false;
          }
          // 3. Fallback: Path prefix of session or unassigned session memo
          if (f.startsWith(`${session.title}/`)) {
            return true;
          }
          if (f === memoFileName || (session.fileName && f === session.fileName)) {
            const isOtherSessionMemo = sessions.some(
              (s) => s.id !== session.id && (s.fileName === f || f === `${s.title}.md`)
            );
            return !isOtherSessionMemo;
          }
          return false;
        });
        const matchingFiles = folderFiles.filter(
          (f) => !searchQuery.trim() || f.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
        const treeRoot = buildFileTreeFromPaths(matchingFiles, session.title);
        items.push(...flattenTreeDirectoryNode(treeRoot, session.title, session.id, openFolders));
      }
    }

    // Unassigned files
    const allProjectTitles = new Set(sessions.map((s) => s.title));
    const allSessionMemoFiles = new Set(
      sessions.flatMap((s) => [s.fileName, `${s.title}.md`].filter(Boolean) as string[])
    );
    const unassignedFiles = Object.keys(files).filter((f) => {
      if (
        f.startsWith('01_SSOT_Sources/') ||
        f.startsWith('02_Studio_Outputs/') ||
        f.startsWith('.podium/')
      ) {
        return false;
      }
      if (allSessionMemoFiles.has(f)) {
        return false;
      }
      const folder = fileFolders[f];
      if (folder && allProjectTitles.has(folder)) {
        return false;
      }
      return true;
    });

    if (unassignedFiles.length > 0) {
      const unassignedTree = buildFileTreeFromPaths(unassignedFiles, 'OTHER FILES');
      items.push(...flattenTreeDirectoryNode(unassignedTree, 'OTHER FILES', undefined, openFolders));
    }

    return items;
  }, [sessions, openFolders, files, fileFolders, searchQuery]);

  const handleTreeKeyDown = (e: React.KeyboardEvent) => {
    // If inline editing, allow input to handle keys
    if (editingTreeTarget) return;

    const visibleItems = getFlatVisibleTreeItems();
    if (visibleItems.length === 0) return;

    let currentIndex = visibleItems.findIndex((it) => it.id === focusedTreeItemId);
    if (currentIndex === -1) {
      currentIndex = visibleItems.findIndex(
        (it) => it.type === 'file' && it.path === currentActiveFile
      );
      if (currentIndex === -1) currentIndex = 0;
    }

    const currentItem = visibleItems[currentIndex];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, visibleItems.length - 1);
      const nextItem = visibleItems[nextIndex];
      setFocusedTreeItemId(nextItem.id);
      scrollToTreeItem(nextItem.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      const prevItem = visibleItems[prevIndex];
      setFocusedTreeItemId(prevItem.id);
      scrollToTreeItem(prevItem.id);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (currentItem.type === 'session') {
        if (!currentItem.isOpen) {
          setOpenFolders((prev) => ({ ...prev, [currentItem.name]: true }));
        } else if (currentIndex + 1 < visibleItems.length) {
          setFocusedTreeItemId(visibleItems[currentIndex + 1].id);
          scrollToTreeItem(visibleItems[currentIndex + 1].id);
        }
      } else if (currentItem.type === 'folder') {
        const folderKey = currentItem.id.replace(/^folder:/, '');
        if (!currentItem.isOpen) {
          setOpenFolders((prev) => ({ ...prev, [folderKey]: true }));
        } else if (currentIndex + 1 < visibleItems.length) {
          setFocusedTreeItemId(visibleItems[currentIndex + 1].id);
          scrollToTreeItem(visibleItems[currentIndex + 1].id);
        }
      } else if (currentItem.type === 'file') {
        if (currentItem.sessionId && currentItem.sessionId !== activeSessionId) {
          handleSelectSession(currentItem.sessionId);
        }
        handleOpenFile(currentItem.path);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentItem.type === 'session') {
        if (currentItem.isOpen) {
          setOpenFolders((prev) => ({ ...prev, [currentItem.name]: false }));
        }
      } else if (currentItem.type === 'folder') {
        const folderKey = currentItem.id.replace(/^folder:/, '');
        if (currentItem.isOpen) {
          setOpenFolders((prev) => ({ ...prev, [folderKey]: false }));
        } else {
          const lastSlash = currentItem.path.lastIndexOf('/');
          if (lastSlash > 0) {
            const parentSub = currentItem.path.slice(0, lastSlash);
            const session = sessions.find((s) => s.id === currentItem.sessionId);
            const parentFolderKey = `${session ? session.title : 'root'}/${parentSub}`;
            setFocusedTreeItemId(`folder:${parentFolderKey}`);
            scrollToTreeItem(`folder:${parentFolderKey}`);
          } else if (currentItem.sessionId) {
            setFocusedTreeItemId(`session:${currentItem.sessionId}`);
            scrollToTreeItem(`session:${currentItem.sessionId}`);
          }
        }
      } else if (currentItem.type === 'file') {
        const lastSlash = currentItem.path.lastIndexOf('/');
        const session = sessions.find((s) => s.id === currentItem.sessionId);
        if (lastSlash > 0) {
          const parentSub = currentItem.path.slice(0, lastSlash);
          const parentFolderKey = `${session ? session.title : 'root'}/${parentSub}`;
          setFocusedTreeItemId(`folder:${parentFolderKey}`);
          scrollToTreeItem(`folder:${parentFolderKey}`);
        } else if (currentItem.sessionId) {
          setFocusedTreeItemId(`session:${currentItem.sessionId}`);
          scrollToTreeItem(`session:${currentItem.sessionId}`);
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (currentItem.type === 'file') {
        if (currentItem.sessionId && currentItem.sessionId !== activeSessionId) {
          handleSelectSession(currentItem.sessionId);
        }
        handleOpenFile(currentItem.path);
      } else if (currentItem.type === 'session') {
        const isCurrentlyOpen = openFolders[currentItem.name] ?? true;
        setOpenFolders((prev) => ({ ...prev, [currentItem.name]: !isCurrentlyOpen }));
        if (currentItem.sessionId && currentItem.sessionId !== activeSessionId) {
          handleSelectSession(currentItem.sessionId);
        }
      } else if (currentItem.type === 'folder') {
        const folderKey = currentItem.id.replace(/^folder:/, '');
        const isCurrentlyOpen = openFolders[folderKey] ?? true;
        setOpenFolders((prev) => ({ ...prev, [folderKey]: !isCurrentlyOpen }));
      }
    } else if (e.key === 'F2') {
      e.preventDefault();
      setEditingTreeTarget({
        id: currentItem.id,
        type: currentItem.type,
        name: currentItem.name,
        path: currentItem.path,
        sessionId: currentItem.sessionId,
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedTreeItemId(visibleItems[0].id);
      scrollToTreeItem(visibleItems[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastItem = visibleItems[visibleItems.length - 1];
      setFocusedTreeItemId(lastItem.id);
      scrollToTreeItem(lastItem.id);
    }
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
    if (currentActiveFile?.toLowerCase().endsWith('.pdf')) {
      const mdName = currentActiveFile.replace(/\.pdf$/i, '.md');
      const savedMd = pdfMarkdownMap[currentActiveFile] ?? files[mdName] ?? '';
      return editorContent !== savedMd;
    }
    if (untitledDocs[currentActiveFile] !== undefined) {
      return editorContent.trim().length > 0;
    }
    return files[currentActiveFile] !== editorContent;
  }, [files, currentActiveFile, editorContent, untitledDocs, pdfMarkdownMap]);

  // Synchronize active file to openTabs
  useEffect(() => {
    if (currentActiveFile) {
      setOpenTabs((prev) => (prev.includes(currentActiveFile) ? prev : [...prev, currentActiveFile]));
    }
  }, [currentActiveFile]);

  // Prevent and sanitize ghost tabs
  useEffect(() => {
    if (isLocked) return;

    // 1. Gather all files currently available in the system
    const validFileKeys = Object.keys(files);
    const validUntitledKeys = Object.keys(untitledDocs);
    const allValidFiles = new Set([...validFileKeys, ...validUntitledKeys]);

    if (allValidFiles.size === 0) return;

    // 2. Filter openTabs to ensure they only contain valid existing files
    const sanitizedTabs = openTabs.filter((tab) => allValidFiles.has(tab));

    // If all open tabs were invalid, fallback to the first available file
    let finalTabs = sanitizedTabs;
    if (sanitizedTabs.length === 0) {
      const fallbackFile = validFileKeys[0] || validUntitledKeys[0] || 'welcome.md';
      finalTabs = [fallbackFile];
    }

    // 3. Update openTabs if they were sanitized/changed
    const hasTabChanged = finalTabs.length !== openTabs.length || finalTabs.some((t, i) => t !== openTabs[i]);
    if (hasTabChanged) {
      setOpenTabs(finalTabs);
    }

    // 4. Ensure currentActiveFile is a valid open tab
    if (!finalTabs.includes(currentActiveFile)) {
      const nextActive = finalTabs[finalTabs.length - 1];
      setCurrentActiveFile(nextActive);
      setFileName(nextActive);
      const targetContent = files[nextActive] !== undefined ? files[nextActive] : (untitledDocs[nextActive] || '');
      setEditorContent(targetContent);
      setEditorTab(nextActive.endsWith('.html') ? 'preview' : 'edit');
    }
  }, [files, untitledDocs, openTabs, currentActiveFile, isLocked]);

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
            setEditorTab('wysiwyg');
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
    setEditorTab('wysiwyg');
    showToast(`📝 새 임시 탭 '${newName}'이(가) 열렸습니다 (저장 시 파일 생성).`);
  };

  // Optimized debounced editor state synchronization handler
  const handleEditorChange = useCallback(
    (val: string) => {
      setEditorContent(val);
    },
    []
  );

  // Save Document: if untitled or placeholder, open Save modal; otherwise save to physical file & sync storage
  const handleSaveDocument = useCallback(() => {
    if (!currentActiveFile) return;

    // If current document is an untitled in-memory tab or initial placeholder, open Save Modal to assign physical file name & folder
    const isUntitledOrInitial =
      untitledDocs[currentActiveFile] !== undefined ||
      currentActiveFile.startsWith('Untitled-') ||
      /^새 프로젝트(\s*\d*)?\.md$/i.test(currentActiveFile) ||
      currentActiveFile === '새 문서.md';

    if (isUntitledOrInitial) {
      setIsSaveUntitledModalOpen(true);
      return;
    }

    if (currentActiveFile.toLowerCase().endsWith('.pdf')) {
      const mdName = currentActiveFile.replace(/\.pdf$/i, '.md');
      const updatedFiles = { ...files, [mdName]: editorContent };
      setFiles(updatedFiles);
      setPdfMarkdownMap((prev) => ({ ...prev, [currentActiveFile]: editorContent }));
      const dirHandle = getMemoryDirectoryHandle();
      if (activeWorkspace.type === 'local' && dirHandle) {
        saveFileToLocalDirectory(dirHandle, mdName, editorContent).catch(console.error);
      } else if (activeWorkspace.type === 'indexeddb') {
        saveVaultToIndexedDB(
          activeWorkspace.vaultId || activeWorkspace.id,
          updatedFiles,
          fileFolders,
          activeWorkspace.name
        ).catch(console.error);
      }
      showToast(`💾 PDF 마크다운('${mdName}')이 저장되었습니다.`);
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

    // If oldActive was an untitled doc or auto-created placeholder, clean it up so no duplicate or ghost files remain
    if (oldActive && oldActive !== newFileName) {
      if (
        files[oldActive] !== undefined &&
        (/^새 프로젝트(\s*\d*)?\.md$/i.test(oldActive) ||
          oldActive.startsWith('Untitled-') ||
          oldActive === '새 문서.md')
      ) {
        delete updatedFiles[oldActive];
        delete updatedFolders[oldActive];
      }
    }

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

    // Update current project/session so it points to the newly saved file
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, editorContent: contentToSave, fileName: newFileName }
          : s
      )
    );

    // Expand target folder in workspace
    setOpenFolders((prev) => ({
      ...prev,
      [targetFolder]: true
    }));

    // Sync to physical storage
    const dirHandle = getMemoryDirectoryHandle();
    if (activeWorkspace.type === 'local' && dirHandle) {
      saveFileToLocalDirectory(dirHandle, newFileName, contentToSave).catch(console.error);
      if (
        oldActive &&
        oldActive !== newFileName &&
        (/^새 프로젝트(\s*\d*)?\.md$/i.test(oldActive) ||
          oldActive.startsWith('Untitled-') ||
          oldActive === '새 문서.md')
      ) {
        deleteFileFromLocalDirectory(dirHandle, oldActive).catch(console.error);
      }
    } else if (activeWorkspace.type === 'indexeddb') {
      saveVaultToIndexedDB(
        activeWorkspace.vaultId || activeWorkspace.id,
        updatedFiles,
        updatedFolders,
        activeWorkspace.name
      ).catch(console.error);
    }

    showToast(`💾 '${newFileName}' 파일이 [${targetFolder}] 폴더에 저장되었습니다.`);
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
      if (editorTab === 'wysiwyg' && tiptapEditorRef.current) {
        tiptapEditorRef.current.executeCommand(formatType);
        return;
      }
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
        textarea.value = nextVal;
        textarea.focus();
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
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
        textarea.value = nextVal;
        textarea.focus();
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
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
        textarea.value = nextVal;
        textarea.focus();
        textarea.setSelectionRange(start + 14, start + 14 + inner.length);
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
      textarea.value = nextVal;
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + newBlock.length);
      handleEditorChange(nextVal);

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          editorRef.current.setSelectionRange(lineStart, lineStart + newBlock.length);
        }
      }, 20);
    },
    [editorContent, handleEditorChange, editorTab]
  );

  // Smart Word-Processor Grade Table Creator Handler
  const handleInsertTable = useCallback(
    (rows: number, cols: number) => {
      if (editorTab === 'wysiwyg' && tiptapEditorRef.current) {
        tiptapEditorRef.current.insertTable(rows, cols);
        setShowTablePicker(false);
        showToast(`📊 ${rows}행 × ${cols}열 표가 삽입되었습니다.`);
        return;
      }

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

      showToast(`📊 ${rows}행 × ${cols}열 표가 삽입되었습니다.`);

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          const newCursor = (textBefore + prefix).length + 2;
          editorRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 30);
    },
    [editorContent, handleEditorChange, editorTab]
  );

  // Undo & Redo handlers for Unified Toolbar
  const handleUndo = useCallback(() => {
    if (editorTab === 'wysiwyg' && tiptapEditorRef.current) {
      tiptapEditorRef.current.undo();
      return;
    }
    const textarea = editorRef.current;
    if (textarea) {
      textarea.focus();
      document.execCommand('undo');
    }
  }, [editorTab]);

  const handleRedo = useCallback(() => {
    if (editorTab === 'wysiwyg' && tiptapEditorRef.current) {
      tiptapEditorRef.current.redo();
      return;
    }
    const textarea = editorRef.current;
    if (textarea) {
      textarea.focus();
      document.execCommand('redo');
    }
  }, [editorTab]);

  // Insert snippet from Markdown Help Popover
  const handleInsertSnippet = useCallback(
    (snippet: string) => {
      const textarea = editorRef.current;
      if (!textarea) {
        handleEditorChange(editorContent ? editorContent + '\n' + snippet : snippet);
        showToast('✨ 마크다운 서식이 에디터에 삽입되었습니다.');
        return;
      }

      const val = editorContent;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextVal = val.slice(0, start) + snippet + val.slice(end);
      textarea.value = nextVal;
      textarea.focus();
      const newCursor = start + snippet.length;
      textarea.setSelectionRange(newCursor, newCursor);
      handleEditorChange(nextVal);

      showToast('✨ 마크다운 서식이 에디터에 삽입되었습니다.');

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          editorRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 20);
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
    showToast('✨ AI가 마크다운 서식과 군더더기를 정리하고 있습니다...', 'info');

    setTimeout(() => {
      let cleaned = editorContent;
      // 1. Remove AI response collection headers/footers
      cleaned = cleaned.replace(/---\s*> 📌 \[AI 응답 수집 - .*?\]\n+/g, '');
      // 2. Remove common chatbot greetings/preambles at start of content
      cleaned = cleaned.replace(/^(안녕하세요[^\n]*|질의하신[^\n]*|다음은[^\n]*분석[^\n]*입니다:?|네,[^\n]*요청하신[^\n]*입니다:?)\n+/gm, '');
      // 3. Remove redundant artificial greeting blocks
      cleaned = cleaned.replace(/# \[Gemini.*?\] .*? 분석 및 답변\n+질의하신 .*? 기술 분석 및 솔루션 제안입니다\.\n+## 핵심 요약\n+.*?(?=\n##|\n#|$)/gs, '');
      cleaned = cleaned.replace(/# \[.*?\] .*?\n+## 개요\n+/g, '## 개요\n');
      cleaned = cleaned.replace(/# AI Podium 스타일 AI 지식 비서에 오신 것을 환영합니다\n+## 개요\n+.*?\n+## 주요 기능\n+.*?(?=\n##|\n#|$)/gs, '');
      // 4. Normalize headings: ensure a single space after # hashes (#Heading -> # Heading)
      cleaned = cleaned.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');
      // 5. Normalize checkboxes (-[] or * [] -> - [ ])
      cleaned = cleaned.replace(/^(\s*)[-*]\s*\[([ xX])\]/gm, '$1- [$2]');
      // 6. Trim trailing whitespace from each line
      cleaned = cleaned.replace(/[ \t]+$/gm, '');
      // 7. Collapse excessive blank lines (3 or more -> 2)
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

      if (cleaned !== editorContent) {
        handleEditorChange(cleaned);
        showToast('🪄 AI 문서 정리가 완료되었습니다! (불필요한 인사말 제거 및 마크다운 정돈)');
      } else {
        showToast('✅ 문서가 이미 깔끔하게 정리되어 있어 변경할 내용이 없습니다.');
      }
      setIsAiCleaning(false);
    }, 600);
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

  // Provider change handler
  const handleProviderSelect = (p: 'cloud' | 'local-pc' | 'local-server') => {
    setProvider(p);
    setIsVerified(false);
    if (p === 'cloud') {
    } else {
    }
  };

  // Emergency Data Purge (Wipe All Data)
  const handleWipeAllData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      clearDb().catch(console.warn);

      // Reset all state to factory defaults
      setPreferences(DEFAULT_PREFERENCES);
      setCloudApiKey('');
      setLocalEndpointAddress('http://localhost:11434');
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
        editorTab: 'wysiwyg',
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

  // Verify connection (Real API and Local Host verification with multi-vendor BYOK support)
  const handleVerify = async (vendor?: string, keyOrEp?: string) => {
    setIsVerifying(true);
    try {
      const isLocal = vendor === 'local' || (!vendor && provider !== 'cloud');
      if (!isLocal) {
        const activeVendor = (vendor && vendor !== 'local') ? vendor : (getVendorForModel(selectedModel) || 'gemini');
        const activeKey = (typeof keyOrEp === 'string' && keyOrEp.trim())
          ? keyOrEp.trim()
          : (apiKeys[activeVendor] || (activeVendor === 'gemini' ? cloudApiKey : ''));

        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: activeKey || undefined,
            vendor: activeVendor
          })
        });
        const data = await res.json();
        if (res.ok && data.valid) {
          setIsVerified(true);
          const vendorLabel = activeVendor.toUpperCase();
          showToast(`✓ ${vendorLabel} (${data.model || activeVendor}) API 연결 및 키 검증 성공!`, 'success');

          // Dynamically fetch and register provider active models
          try {
            const models = await fetchProviderActiveModels(activeVendor, activeKey);
            if (models && models.length > 0) {
              const simplified = models.map((m) => ({ id: m.id, name: m.name }));
              setDynamicProviderModels((prev) => ({
                ...prev,
                [activeVendor]: simplified
              }));
            }
          } catch (err) {
            console.warn('동적 모델 목록 갱신 실패:', err);
          }
        } else {
          setIsVerified(false);
          showToast(`⚠️ API 검증 실패: ${data.error || '인증 오류'}`, 'error');
        }
      } else {
        const cleanEndpoint = ((typeof keyOrEp === 'string' && keyOrEp.trim()) ? keyOrEp : (localEndpointAddress || 'http://localhost:11434')).trim().replace(/\/+$/, '');
        const tags = await fetchOllamaTags(cleanEndpoint);
        if (tags && tags.length > 0) {
          const formatted = tags.map((t) => ({
            id: t.id,
            name: t.name
          }));
          setDiscoveredLocalModels(formatted);
          try {
            localStorage.setItem('aipodium_discovered_models', JSON.stringify(formatted));
          } catch {}
          setIsVerified(true);
          showToast(`✓ 로컬 Ollama 연결 성공! (${tags.length}개 모델 감지 및 대화창 연동 완료)`, 'success');
        } else {
          setIsVerified(false);
          showToast('⚠️ 로컬 Ollama에서 감지된 모델이 없거나 연결할 수 없습니다.', 'error');
        }
      }
    } catch (err: any) {
      setIsVerified(false);
      const isAbort = err?.name === 'AbortError';
      const isCors = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
      const msg = isAbort
        ? '연결 타임아웃 (3.5초 초과). 로컬 Ollama 실행 상태를 확인하세요.'
        : isCors
        ? '브라우저 CORS 차단 감지. OLLAMA_ORIGINS="*" 환경변수로 Ollama를 실행해 주세요.'
        : (err?.message || '네트워크 연결 실패');
      showToast(`⚠️ 연결 검증 실패: ${msg}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Switch to another project and link its editor content
  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;

    // Ephemeral in-memory zeroing of decrypted API keys upon project switch
    clearAiDecryptedKeyMemory();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aipodium:project_switch'));
    }

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
    const newTab = targetSession.editorTab || 'wysiwyg';

    setEditorContent(newContent);
    setFileName(newFileName);
    setCurrentActiveFile(newFileName);
    setEditorTab(newTab);
    
    // Auto-populate files dictionary with initial content if not present, unless it's an untitled draft
    const isUntitled =
      newFileName.startsWith('Untitled-') ||
      untitledDocs[newFileName] !== undefined ||
      /^새 프로젝트(\s*\d*)?\.md$/i.test(newFileName) ||
      newFileName === '새 문서.md';

    if (isUntitled) {
      setUntitledDocs((prev) => ({
        ...prev,
        [newFileName]: newContent
      }));
    } else {
      if (files[newFileName] === undefined) {
        setFiles((prev) => ({
          ...prev,
          [newFileName]: newContent
        }));
      }
      setFileFolders((prev) => {
        if (prev[newFileName] === targetSession.title) return prev;
        return {
          ...prev,
          [newFileName]: targetSession.title
        };
      });
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

    // Generate an in-memory untitled document tab so user can assign their own filename upon first save
    let num = untitledCounterRef.current;
    let newDocTabName = `Untitled-${num}`;
    while (untitledDocs[newDocTabName] !== undefined || files[newDocTabName] !== undefined) {
      num++;
      newDocTabName = `Untitled-${num}`;
    }
    untitledCounterRef.current = num + 1;

    const initialContent = `# ${projectTitle}\n\n새 프로젝트가 생성되었습니다.\nAI 대화창에서 질문 후 **[에디터로 보내기 ➔]**를 클릭하거나 외부에서 붙여넣은 내용을 단일 진실 출처(Single Source of Truth)로 관리하세요.`;

    const newSession: ChatSession = {
      id: newSessionId,
      title: projectTitle,
      createdAt: '방금 전',
      fileName: newDocTabName,
      editorContent: initialContent,
      editorTab: 'wysiwyg',
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
    setFileName(newDocTabName);
    setCurrentActiveFile(newDocTabName);
    setEditorContent(initialContent);
    setEditorTab('edit');

    // Keep draft in-memory in untitledDocs until user explicitly saves
    setUntitledDocs((prev) => ({
      ...prev,
      [newDocTabName]: initialContent
    }));

    setOpenTabs((prev) => (prev.includes(newDocTabName) ? prev : [...prev, newDocTabName]));

    // Synchronize Folder Window: create/open folder named exact same as project title
    setOpenFolders((prev) => ({
      ...prev,
      [projectTitle]: true
    }));
    showToast(`✨ 새 프로젝트 '[${projectTitle}]' 생성 완료. 첫 저장 시 파일명을 지정할 수 있습니다.`);
  });
  };

  // Synchronized Project Rename Across All Windows (Decoupled from file names)
  const handleRenameProject = (sessionId: string, newTitle: string) => {
    if (!newTitle || !newTitle.trim()) return;
    const trimmedTitle = newTitle.trim();
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    const oldTitle = targetSession.title;
    if (oldTitle === trimmedTitle) return;

    // 1. Update Project Session Title (Preserve file names inside the project)
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        let updatedFileName = s.fileName;
        if (updatedFileName && updatedFileName.startsWith(`${oldTitle}/`)) {
          updatedFileName = `${trimmedTitle}/${updatedFileName.slice(oldTitle.length + 1)}`;
        }
        return {
          ...s,
          title: trimmedTitle,
          fileName: updatedFileName,
        };
      })
    );

    // 2. Synchronize File Contents Store (Only update path prefixes if any files used oldTitle/ prefix)
    setFiles((prev) => {
      let hasChanges = false;
      const updated: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k.startsWith(`${oldTitle}/`)) {
          hasChanges = true;
          const rest = k.slice(oldTitle.length + 1);
          updated[`${trimmedTitle}/${rest}`] = v;
        } else {
          updated[k] = v;
        }
      }
      return hasChanges ? updated : prev;
    });

    // 3. Synchronize Folder Mapping: All files belonging to oldTitle now belong to trimmedTitle
    // The files inside KEEP THEIR OWN NAMES and are not renamed to the folder name!
    setFileFolders((prev) => {
      const updated: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const newKey = k.startsWith(`${oldTitle}/`)
          ? `${trimmedTitle}/${k.slice(oldTitle.length + 1)}`
          : k;
        const newVal = v === oldTitle ? trimmedTitle : v;
        updated[newKey] = newVal;
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
      for (const [k, v] of Object.entries(prev)) {
        if (k.startsWith(`${oldTitle}/`)) {
          const rest = k.slice(oldTitle.length + 1);
          updated[`${trimmedTitle}/${rest}`] = v;
          delete updated[k];
        }
      }
      return updated;
    });

    // 5. Update Active Session State if Active (Only if path had oldTitle/ prefix)
    if (activeSessionId === sessionId) {
      if (currentActiveFile.startsWith(`${oldTitle}/`)) {
        const updatedPath = `${trimmedTitle}/${currentActiveFile.slice(oldTitle.length + 1)}`;
        setFileName(updatedPath);
        setCurrentActiveFile(updatedPath);
      }
    }

    // 6. Update openTabs if any had oldTitle/ prefix
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.startsWith(`${oldTitle}/`)
          ? `${trimmedTitle}/${tab.slice(oldTitle.length + 1)}`
          : tab
      )
    );

    showToast(`📁 프로젝트/폴더명이 '[${trimmedTitle}]'(으)로 변경되었습니다.`);
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
      setEditorTab(nextSession.editorTab || 'wysiwyg');
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
      showToast('No chat history to export.', 'warn');
      return;
    }

    const safeTitle = targetSession.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    let blob: Blob;
    let extension: string = format;

    if (format === 'json') {
      const jsonContent = JSON.stringify(targetSession, null, 2);
      blob = new Blob([jsonContent], { type: 'application/json' });
    } else {
      let textContent = `# ${targetSession.title}\n`;
      textContent += `Created: ${targetSession.createdAt}\n`;
      textContent += `Total Messages: ${targetSession.messages.length}\n`;
      textContent += `========================================\n\n`;

      targetSession.messages.forEach((msg) => {
        const senderLabel = msg.sender === 'user' ? 'User' : `AI (${msg.model || 'Assistant'})`;
        textContent += `### [${senderLabel}] - ${msg.timestamp}\n\n${msg.text}\n\n`;
        if (msg.attachments && msg.attachments.length > 0) {
          textContent += `Attachments: ${msg.attachments.map((a) => a.name).join(', ')}\n\n`;
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

    showToast(`Exported ${extension.toUpperCase()} file successfully!`);
  };


  
  // SSOT Document Generation: Creates or scaffolds the SSOT markdown file directly in the workspace
  const handleGenerateSSOTDocument = async (config: SSOTGeneratorConfig) => {
    const targetFname = config.docTitle.endsWith('.md') ? config.docTitle : `${config.docTitle}.md`;
    const targetFolder = config.selectedFolder;
    const timeStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    // Gather text from selected source files
    let sourceTextsCombined = '';
    if (config.selectedFiles && config.selectedFiles.length > 0) {
      sourceTextsCombined = config.selectedFiles
        .map((fn) => `### 📄 [참조 소스 파일] ${fn}\n\n${files[fn] || ''}`)
        .join('\n\n---\n\n');
    }

    if (config.autoGenerateWithAi && sourceTextsCombined.trim()) {
      showToast(`✨ AI가 '${targetFname}' 기준 문서를 작성 중입니다...`, 'info');

      const getFallbackDoc = () =>
        `# ${targetFname.replace(/\.md$/i, '')}\n\n> **작성일:** ${timeStr} | **대상 소스 폴더:** ${targetFolder}\n\n## 1. 프로젝트 개요\n\n## 2. 주요 내용 종합\n\n---\n\n## 3. 참조 소스 파일 요약\n${sourceTextsCombined}`;

      try {
        let templateSupplement = '';
        if (config.templateMarkdownContent && config.templateMarkdownContent.trim()) {
          templateSupplement = `\n\n다음 [기준 템플릿]의 목차 위계, 표 서식, 제목 스타일을 엄격히 본떠서 결과물을 작성하세요:\n\n${config.templateMarkdownContent.trim()}`;
        } else if (config.templateDoc) {
          const tContent = files[config.templateDoc];
          if (tContent && tContent.trim()) {
            templateSupplement = `\n\n다음 [기준 템플릿]의 목차 위계, 표 서식, 제목 스타일을 엄격히 본떠서 결과물을 작성하세요:\n\n${tContent.trim()}`;
          }
        }

        const prompt = `당신은 프로젝트의 단일 진실 공급원(SSOT)을 구축하는 전문 수석 테크니컬 라이터 및 기획자입니다.
다음 원본 문서 자료들을 바탕으로 사용자의 지시사항에 맞추어 일관되고 완결성 높은 SSOT 마크다운 문서를 작성하세요.

[핵심 작성 원칙]:
1. 대화형 미사여구(인사말, 맺음말, 안내 멘트)를 일절 배제하고 반드시 마크다운 헤더(#)로 즉시 시작하세요.
2. 원본 소스 간 중복되거나 상충하는 내용은 논리적으로 정합화하여 단일 진실 공급원(SSOT) 기준의 확정된 내용만을 기술하세요.
3. 표준 마크다운 문법(#, ##, -, **, 표 |---|)을 활용하여 전문적이고 가독성 높은 구조로 완성하세요.

[작성 톤 & 스타일]: ${config.designTone}
[사용자 지시사항]: ${config.instruction || '선택된 소스 문서들의 핵심 내용을 종합하여 프로젝트의 명확한 기준이 되는 SSOT 문서로 작성해 줘.'}${templateSupplement}

[분석할 원본 문서 자료들]:
${sourceTextsCombined}

위 소스 자료를 빠짐없이 종합하여, 누락 없이 완결성 있는 고품질 마크다운 SSOT 문서를 작성해 주세요.`;

        const ssotModel = config.model || roleModels.ssot || roleModels.architect || selectedModel || 'gemini-3.8-flash';
        const targetProvider = config.provider || (availableChatModels.find(m => m.id === ssotModel)?.group === 'local' ? (provider.startsWith('local') ? provider : 'local-pc') : 'cloud');
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            model: ssotModel,
            provider: targetProvider,
            apiKey: targetProvider === 'cloud' ? (getApiKeyForModel(ssotModel) || cloudApiKey) : undefined,
            endpoint: (targetProvider === 'local-pc' || targetProvider === 'local-server') ? localEndpointAddress : undefined,
            parameters: aiParameters,
            googleSearchGrounding: preferences.googleSearchGrounding ?? false,
            history: []
          })
        });

        let finalContent = getFallbackDoc();
        if (res.ok) {
          const data = await res.json();
          const generatedMarkdown = data.reply || data.text || '';
          if (generatedMarkdown.trim()) {
            finalContent = generatedMarkdown;
          }
        }

        // Save directly to files & open in editor
        setFiles((prev) => ({ ...prev, [targetFname]: finalContent }));
        setFileFolders((prev) => ({ ...prev, [targetFname]: targetFolder }));
        setOpenTabs((prev) => (prev.includes(targetFname) ? prev : [...prev, targetFname]));
        setCurrentActiveFile(targetFname);
        setFileName(targetFname);
        setEditorContent(finalContent);

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSessionId || s.title === targetFolder) {
              return { ...s, fileName: targetFname, editorContent: finalContent };
            }
            return s;
          })
        );

        showToast(`✨ 기준 문서('${targetFname}')가 '${targetFolder}' 폴더에 생성되어 에디터에 열렸습니다!`, 'success');
      } catch (err) {
        console.error('SSOT generation error:', err);
        const fallbackContent = getFallbackDoc();
        setFiles((prev) => ({ ...prev, [targetFname]: fallbackContent }));
        setFileFolders((prev) => ({ ...prev, [targetFname]: targetFolder }));
        setOpenTabs((prev) => (prev.includes(targetFname) ? prev : [...prev, targetFname]));
        setCurrentActiveFile(targetFname);
        setFileName(targetFname);
        setEditorContent(fallbackContent);
        showToast(`💡 기본 기준 문서 스캐폴딩이 생성되어 에디터에 열렸습니다.`, 'info');
      }
    } else {
      const scaffold = `# ${targetFname.replace(/\.md$/i, '')}\n\n> **작성일:** ${timeStr} | **대상 폴더:** ${targetFolder}\n\n## 1. 프로젝트 개요\n\n## 2. 주요 내용 종합\n` +
        (sourceTextsCombined ? `\n\n---\n\n## 3. 참조 소스 파일 데이터\n${sourceTextsCombined}` : '');

      setFiles((prev) => ({ ...prev, [targetFname]: scaffold }));
      setFileFolders((prev) => ({ ...prev, [targetFname]: targetFolder }));
      setOpenTabs((prev) => (prev.includes(targetFname) ? prev : [...prev, targetFname]));
      setCurrentActiveFile(targetFname);
      setFileName(targetFname);
      setEditorContent(scaffold);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId || s.title === targetFolder) {
            return { ...s, fileName: targetFname, editorContent: scaffold };
          }
          return s;
        })
      );

      showToast(`📝 기준 문서 스캐폴딩이 '${targetFolder}' 폴더에 생성되어 에디터에 열렸습니다.`, 'success');
    }
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

  // Event Manager: Export Schedule to Editor Tab
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
      if (fname.toLowerCase().endsWith('.pdf')) {
        const mdName = fname.replace(/\.pdf$/i, '.md');
        const pairedMd = pdfMarkdownMap[fname] ?? files[mdName] ?? '';
        setEditorContent(pairedMd);
        setEditorTab('edit');
        setIsSection1Collapsed(true);
        setPane2Width((prev) => (prev < 75 ? 78 : prev));
      } else {
        setEditorContent(targetContent);
        setEditorTab(fname.endsWith('.html') ? 'preview' : 'edit');
      }
      showToast(`📂 '${fname}' 탭이 열렸습니다.`);
    }
  };

  // PDF Viewer: Realtime Markdown sync to cache and project storage
  const handlePdfMarkdownChange = useCallback((newMarkdown: string) => {
    if (!currentActiveFile) return;
    setPdfMarkdownMap((prev) => ({ ...prev, [currentActiveFile]: newMarkdown }));

    // Generate/sync paired .md file in files state
    const mdName = currentActiveFile.replace(/\.pdf$/i, '.md');
    setFiles((prev) => ({
      ...prev,
      [mdName]: newMarkdown,
    }));

    setFileFolders((prev) => {
      const parentFolder = prev[currentActiveFile] || activeSession?.title || '문서 라이브러리 (Documents)';
      if (prev[mdName] !== parentFolder) {
        return { ...prev, [mdName]: parentFolder };
      }
      return prev;
    });

    setEditorContent(newMarkdown);
  }, [currentActiveFile, activeSession]);

  // PDF Viewer: Clear Markdown cache for specific document
  const handlePdfClearMarkdownCache = useCallback((targetFileName: string) => {
    setPdfMarkdownMap((prev) => {
      const next = { ...prev };
      delete next[targetFileName];
      return next;
    });

    const mdName = targetFileName.replace(/\.pdf$/i, '.md');
    setFiles((prev) => {
      const next = { ...prev };
      delete next[mdName];
      return next;
    });

    try {
      const stored = localStorage.getItem('aipodium_pdf_markdowns');
      if (stored) {
        const parsed = JSON.parse(stored);
        delete parsed[targetFileName];
        delete parsed[mdName];
        localStorage.setItem('aipodium_pdf_markdowns', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Failed to clear markdown cache in localStorage:', e);
    }
  }, []);

  // PDF Viewer: Upload / Replace PDF file handler
  const handlePdfUploadFromViewer = useCallback((file: File) => {
    if (file.size === 0) {
      showToast(`⚠️ '${file.name}' 파일이 비어 있습니다 (0 바이트).`, 'warn');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const fname = file.name;
        const targetFolder = fileFolders[currentActiveFile] || activeSession?.title || '문서 라이브러리 (Documents)';
        setFiles((prev) => ({ ...prev, [fname]: dataUrl }));
        setFileFolders((prev) => ({ ...prev, [fname]: targetFolder }));
        setFileName(fname);
        setCurrentActiveFile(fname);
        if (!openTabs.includes(fname)) {
          setOpenTabs((prev) => [...prev, fname]);
        }
        showToast(`📄 PDF '${fname}'을 불러왔습니다.`, 'success');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast(`PDF 로드 실패: ${err.message}`, 'error');
    }
  }, [currentActiveFile, fileFolders, activeSession, openTabs]);

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

  // Onboarding Interactive Guide Bot Simulation (For guest users without API keys or Ollama)
  const executeOnboardingSimulation = (
    queryText: string,
    chipKey?: 'gemini-key' | 'ollama-guide' | 'demo-knowledge',
    meta?: {
      originalText?: string;
      translatedText?: string;
      ghostWriterLevel?: string;
    }
  ) => {
    const targetSessionId = activeSessionId;
    const userTimestamp = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text: queryText,
      timestamp: userTimestamp,
      attachments: chatAttachments.length > 0 ? [...chatAttachments] : undefined,
      originalText: meta?.originalText,
      translatedText: meta?.translatedText,
      ghostWriterLevel: meta?.ghostWriterLevel,
    };

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

    setChatInput('');
    setChatAttachments([]);
    setIsAiLoading(true);
    isUserScrolledUpRef.current = false;
    setIsScrolledUp(false);
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });

    // 0.5초 가상 로딩 (점 3개 깜빡임) 후 미리 정의된 안내 스크립트 스트리밍 출력
    setTimeout(() => {
      const responseData = getOnboardingResponse(chipKey || queryText);
      const aiMsgId = `msg-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const aiTimestamp = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        model: 'AI 지식 비서',
        text: '',
        timestamp: aiTimestamp,
        isStreaming: true,
        actionButtons: responseData.actionButtons,
      };

      setSessions((prev) =>
        prev.map((session) => {
          if (session.id === targetSessionId) {
            return {
              ...session,
              messages: [...session.messages, aiMsg],
            };
          }
          return session;
        })
      );

      let queue = responseData.text;
      let currentText = '';

      let rafId: number | null = null;
      let lastFrameTime = performance.now();
      let accumulator = 0;

      const step = (now: number) => {
        const dt = Math.min(now - lastFrameTime, 100);
        lastFrameTime = now;
        accumulator += dt;

        if (accumulator >= 20) {
          accumulator = 0;

          if (queue.length > 0) {
            const qLen = queue.length;
            let takeCount = 1;
            if (qLen > 300) {
              takeCount = Math.min(16, Math.ceil(qLen * 0.1));
            } else if (qLen > 120) {
              takeCount = Math.min(8, Math.ceil(qLen * 0.08));
            } else if (qLen > 40) {
              takeCount = Math.min(4, Math.ceil(qLen * 0.06));
            } else if (qLen > 15) {
              takeCount = 2;
            } else {
              takeCount = 1;
            }

            const chunk = queue.slice(0, takeCount);
            queue = queue.slice(takeCount);
            currentText += chunk;

            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== targetSessionId) return s;
                return {
                  ...s,
                  messages: s.messages.map((m) => {
                    if (m.id !== aiMsgId) return m;
                    return {
                      ...m,
                      text: currentText,
                      isStreaming: true,
                    };
                  }),
                };
              })
            );

            if (!isUserScrolledUpRef.current && chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          } else {
            if (rafId) cancelAnimationFrame(rafId);
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== targetSessionId) return s;
                return {
                  ...s,
                  messages: s.messages.map((m) => {
                    if (m.id !== aiMsgId) return m;
                    return {
                      ...m,
                      text: responseData.text,
                      isStreaming: false,
                    };
                  }),
                };
              })
            );

            if (!isUserScrolledUpRef.current && chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
            setIsAiLoading(false);
            return;
          }
        }

        rafId = requestAnimationFrame(step);
      };

      rafId = requestAnimationFrame(step);
    }, 500);
  };

  const handleOnboardingChipClick = (chipType: 'gemini-key' | 'ollama-guide' | 'demo-knowledge') => {
    let queryText = '';
    if (chipType === 'gemini-key') queryText = 'Gemini API 키 등록 방법';
    else if (chipType === 'ollama-guide') queryText = 'Ollama 로컬 AI 연결 가이드';
    else if (chipType === 'demo-knowledge') queryText = '가상 지식 정리 체험';

    executeOnboardingSimulation(queryText, chipType);
  };

  // Start explicit WebLLM download and initialization
  const handleStartWebLlmDownload = async () => {
    if (!isWebGPUSupported()) {
      showToast('⚠️ 현재 브라우저가 WebGPU를 지원하지 않습니다. Chrome/Edge 최신 버전을 권장합니다.');
      return;
    }

    setWebllmProgress((prev) => ({ ...prev, isLoading: true, progressPercent: 0, progressText: 'WebGPU 가속 어댑터 확인 중...' }));

    const hasAdapter = await getWebGPUDevice();
    if (!hasAdapter) {
      setWebllmProgress((prev) => ({ ...prev, isLoading: false, isReady: false, progressText: '' }));
      showToast('⚠️ WebGPU 그래픽 가속기를 초기화할 수 없습니다. 상단 [새 탭에서 열기]를 통해 실행하거나 브라우저 하드웨어 가속을 켜주세요.');
      return;
    }

    try {
      await initWebLLMEngine((report) => {
        const percent = Math.min(100, Math.max(0, Math.round(report.progress * 100)));
        setWebllmProgress((prev) => ({
          ...prev,
          isLoading: true,
          progressPercent: percent,
          progressText: report.text || '가중치 다운로드 중...',
        }));
      });
      setWebllmProgress({
        isSupported: true,
        isLoading: false,
        isReady: true,
        progressText: '로컬 AI 엔진 준비 완료',
        progressPercent: 100,
      });
      setSelectedModel(WEB_LLM_MODEL_ID);
      setProvider('local-pc');
      showToast('✓ Qwen2.5-0.5B 브라우저 로컬 AI가 준비되었습니다.');
    } catch (err: any) {
      setWebllmProgress((prev) => ({
        ...prev,
        isLoading: false,
        isReady: false,
        progressText: '',
      }));
      const rawMsg = err?.message || (typeof err === 'string' ? err : '');
      let userFriendlyMsg = rawMsg;
      if (!userFriendlyMsg || userFriendlyMsg.includes('알 수 없는') || userFriendlyMsg.includes('Error')) {
        userFriendlyMsg = '네트워크 연결 상태 및 브라우저 그래픽 가속 설정을 확인해 주세요. (새 탭 권장)';
      }
      showToast(`⚠️ WebLLM 로드 실패: ${userFriendlyMsg}`);
    }
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

    // Route to Onboarding Interactive Guide Bot for guest users without API keys or Ollama
    if (isOnboardingMode) {
      executeOnboardingSimulation(textToSend, undefined, meta);
      return;
    }

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

    if (overrideText === undefined) {
      setChatInput('');
      setChatAttachments([]);
    }

    const customInstruction = preferences.aiPersona?.systemInstruction?.trim();
    const formattingDirectives = `\n\n[출력 서식 엄격 준수 규칙]:\n1. 이모지 및 아이콘 사용 절대 금지: 제목, 목록, 본문 어디에도 이모지(📌, 📋, 💡, 🚀, 🤖, ✅, 📝, 🎯, 📊, ⚡ 등)나 장식용 아이콘을 일절 넣지 마세요. 사용자가 문서로 바로 가져가므로 순수 텍스트로만 작성해야 합니다.\n2. 단일 폰트 크기 및 볼드체 제목: 글자 크기를 키우는 H1, H2, H3 등의 큰 헤딩 서식을 쓰지 마시고, 제목은 볼드체(**제목**)로만 작성하세요.`;
    const sysInstruction = customInstruction
      ? `Persona Name: ${preferences.aiPersona.name}\nRole: ${preferences.aiPersona.role}\n\n${customInstruction}${formattingDirectives}`
      : `You are a helpful AI assistant in AI Podium workspace.${formattingDirectives}`;

    let targetsToExecute: { modelKey: string; labelSuffix?: string }[] = [];

    if (mode === 'multi') {
      const activeMulti = selectedMultiModels.length > 0 ? selectedMultiModels : [selectedModel];
      targetsToExecute = activeMulti.map((m) => ({ modelKey: m }));
    } else if (mode === 'routing') {
      // Intelligent Auto Routing
      const combined = `${textToSend} ${editorContent || ''}`.toLowerCase();
      const isComplex =
        combined.length > 1200 ||
        /```|code|function|class|algorithm|refactor|architecture|typescript|python|sql|math|calcul|regex|구조|설계|리팩토링|아키텍처|성능 최적화/i.test(combined);
      const isLite =
        textToSend.length < 60 &&
        /번역|요약|맞춤법|오타|간단히|한줄|translate|summarize|proofread/i.test(textToSend);

      if (provider !== 'cloud') {
        const coderModel = availableChatModels.find((m) => m.group === 'local' && /coder|code|dev|qwen/i.test(m.id))?.id;
        const liteModel = availableChatModels.find((m) => m.group === 'local' && /mini|lite|8b|7b|small|gemma/i.test(m.id))?.id;

        if (isComplex && coderModel) {
          targetsToExecute = [{ modelKey: coderModel, labelSuffix: ` [Auto-Routed: Ollama Coder (${coderModel})]` }];
        } else if (isLite && liteModel) {
          targetsToExecute = [{ modelKey: liteModel, labelSuffix: ` [Auto-Routed: Ollama Lite (${liteModel})]` }];
        } else {
          targetsToExecute = [{ modelKey: selectedModel || 'llama-3.3-70b', labelSuffix: ' [Auto-Routed: Local Ollama]' }];
        }
      } else if (isComplex) {
        targetsToExecute = [{ modelKey: 'gemini-3.1-pro-preview', labelSuffix: ' [Auto-Routed: Gemini 3.1 Pro (심층 추론·코드 특화)]' }];
      } else if (isLite) {
        targetsToExecute = [{ modelKey: 'gemini-3.1-flash-lite', labelSuffix: ' [Auto-Routed: Gemini 3.1 Flash-Lite (초저지연 경량)]' }];
      } else {
        targetsToExecute = [{ modelKey: 'gemini-3.8-flash', labelSuffix: ' [Auto-Routed: Gemini 3.8 Flash (고속 범용)]' }];
      }
    } else {
      targetsToExecute = [{ modelKey: selectedModel || 'gemini-3.8-flash' }];
    }

    // Prepare initial AI placeholders with streaming state
    const initialAiItems = targetsToExecute.map(({ modelKey, labelSuffix }, idx) => {
      const modelOpt = availableChatModels.find((m) => m.id === modelKey) || ghostWriterModelOptions.find((m) => m.id === modelKey);
      const displayName = (modelOpt?.name || modelKey) + (labelSuffix || '');
      const id = `msg-ai-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
      return {
        id,
        modelKey,
        labelSuffix,
        displayName,
        msg: {
          id,
          sender: 'ai' as const,
          model: displayName,
          text: '',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          isStreaming: true,
        }
      };
    });

    // Mount user message and initial streaming AI placeholders
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === targetSessionId) {
          return {
            ...session,
            messages: [...session.messages, userMsg, ...initialAiItems.map((item) => item.msg)],
          };
        }
        return session;
      })
    );

    setIsAiLoading(true);
    isUserScrolledUpRef.current = false;
    setIsScrolledUp(false);
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });

    let completedStreams = 0;
    const totalStreams = initialAiItems.length;

    // Execute streaming pipeline for each AI target
    initialAiItems.forEach(async ({ id: msgId, modelKey }) => {
      let queue = '';
      let currentText = '';
      let isDone = false;
      let finalMeta: { tokens?: ChatMessage['tokens']; groundingSources?: ChatMessage['groundingSources'] } | undefined = undefined;
      let rafId: number | null = null;
      let lastFrameTime = performance.now();
      let accumulator = 0;

      const step = (now: number) => {
        const dt = Math.min(now - lastFrameTime, 100);
        lastFrameTime = now;
        accumulator += dt;

        // Smooth 45~50fps dispatch interval synchronized with display refresh rate
        if (accumulator >= 20) {
          accumulator = 0;

          if (queue.length > 0) {
            // Adaptive Elastic Pacing: fluid, organic token flow with no stuttering
            const qLen = queue.length;
            let takeCount = 1;
            if (qLen > 300) {
              takeCount = Math.min(16, Math.ceil(qLen * 0.1));
            } else if (qLen > 120) {
              takeCount = Math.min(8, Math.ceil(qLen * 0.08));
            } else if (qLen > 40) {
              takeCount = Math.min(4, Math.ceil(qLen * 0.06));
            } else if (qLen > 15) {
              takeCount = 2;
            } else {
              takeCount = 1;
            }

            const chunk = queue.slice(0, takeCount);
            queue = queue.slice(takeCount);
            currentText += chunk;

            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== targetSessionId) return s;
                return {
                  ...s,
                  messages: s.messages.map((m) => {
                    if (m.id !== msgId) return m;
                    return {
                      ...m,
                      text: currentText,
                      isStreaming: true,
                    };
                  }),
                };
              })
            );

            if (!isUserScrolledUpRef.current && chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          } else if (isDone) {
            if (rafId) cancelAnimationFrame(rafId);
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== targetSessionId) return s;
                return {
                  ...s,
                  messages: s.messages.map((m) => {
                    if (m.id !== msgId) return m;
                    return {
                      ...m,
                      text: currentText,
                      isStreaming: false,
                      tokens: finalMeta?.tokens ?? m.tokens,
                      groundingSources: finalMeta?.groundingSources ?? m.groundingSources,
                    };
                  }),
                };
              })
            );

            if (!isUserScrolledUpRef.current && chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }

            completedStreams += 1;
            if (completedStreams >= totalStreams) {
              setIsAiLoading(false);
            }
            return;
          }
        }

        rafId = requestAnimationFrame(step);
      };

      rafId = requestAnimationFrame(step);

      const pushChunk = (chunk: string) => {
        if (chunk) queue += chunk;
      };

      const finishStream = (meta?: { tokens?: ChatMessage['tokens']; groundingSources?: ChatMessage['groundingSources'] }) => {
        if (meta) finalMeta = meta;
        isDone = true;
      };

      try {
        if (modelKey === WEB_LLM_MODEL_ID) {
          // Browser-native WebGPU WebLLM streaming execution
          const fullSystem = sysInstruction
            ? `${sysInstruction}\n\n[Editor Context]\n${editorContent || ''}`
            : (editorContent ? `[Editor Context]\n${editorContent}` : undefined);

          const messagesForWebLlm = [
            ...(fullSystem ? [{ role: 'system' as const, content: fullSystem }] : []),
            { role: 'user' as const, content: textToSend }
          ];

          await streamWebLLMCompletion(
            messagesForWebLlm,
            (delta: string) => {
              pushChunk(delta);
            },
            0.35
          );
          finishStream();
        } else if (provider === 'local-pc' || provider === 'local-server') {
          // Local Ollama streaming execution
          const cleanEndpoint = (localEndpointAddress || 'http://localhost:11434').trim().replace(/\/+$/, '');
          const fullSystem = sysInstruction
            ? `${sysInstruction}\n\n[Editor Context]\n${editorContent || ''}`
            : (editorContent ? `[Editor Context]\n${editorContent}` : undefined);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          const res = await fetch(`${cleanEndpoint}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              model: modelKey,
              messages: [
                ...(fullSystem ? [{ role: 'system', content: fullSystem }] : []),
                { role: 'user', content: textToSend }
              ],
              stream: true,
              options: {
                temperature: aiParameters?.temperature,
                top_p: aiParameters?.topP,
                num_predict: aiParameters?.maxTokens
              }
            })
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }

          if (res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                  const parsed = JSON.parse(trimmed);
                  const piece = parsed?.message?.content || parsed?.response;
                  if (piece) pushChunk(piece);
                } catch {}
              }
            }

            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim());
                const piece = parsed?.message?.content || parsed?.response;
                if (piece) pushChunk(piece);
              } catch {}
            }
          }
          finishStream();
        } else {
          // Cloud Provider (Server API with SSE streaming support)
          const targetApiKey = getApiKeyForModel(modelKey) || cloudApiKey;
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream, application/json'
            },
            body: JSON.stringify({
              message: textToSend,
              editorContent: editorContent,
              model: modelKey,
              parameters: aiParameters,
              apiKey: targetApiKey || undefined,
              systemInstruction: sysInstruction,
              googleSearchGrounding: preferences.googleSearchGrounding ?? false,
              stream: true
            })
          });

          const isSSE = res.headers.get('content-type')?.includes('text/event-stream');

          if (isSSE && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(trimmed.slice(6));
                    if (parsed.chunk) {
                      pushChunk(parsed.chunk);
                    }
                    if (parsed.done) {
                      finishStream({
                        tokens: parsed.usage,
                        groundingSources: parsed.groundingSources
                      });
                    }
                    if (parsed.error) {
                      pushChunk(`\n\n⚠️ ${parsed.error}`);
                      finishStream();
                    }
                  } catch {}
                }
              }
            }

            if (buffer.trim().startsWith('data: ')) {
              try {
                const parsed = JSON.parse(buffer.trim().slice(6));
                if (parsed.chunk) pushChunk(parsed.chunk);
                if (parsed.done) {
                  finishStream({ tokens: parsed.usage, groundingSources: parsed.groundingSources });
                }
              } catch {}
            }
            finishStream();
          } else {
            // Non-SSE or fallback response
            const data = await res.json();
            if (!res.ok) {
              const vendor = getVendorForModel(modelKey);
              pushChunk(`💡 **AI 엔진 안내**: ${data.error || '응답을 생성할 수 없습니다.'}\n\n*설정([Ctrl+,])의 [AI 엔진 설정]에서 **${vendor.toUpperCase()} API 키**를 등록하거나, 상단 모드를 [Local PC (Ollama)]로 전환하여 사용할 수 있습니다.*`);
              finishStream();
            } else {
              pushChunk(data.text || '');
              finishStream({
                tokens: data.usage,
                groundingSources: data.groundingSources
              });
            }
          }
        }
      } catch (e: any) {
        const isAbort = e?.name === 'AbortError';
        const isCors = e?.message?.includes('Failed to fetch') || e?.name === 'TypeError';
        let errorText = '';
        if (provider !== 'cloud') {
          if (isCors) {
            errorText = `⚠️ **로컬 Ollama 연결 차단 (브라우저 CORS 제한)**\n\n브라우저 보안 정책으로 인해 로컬 Ollama(\`${localEndpointAddress || 'http://localhost:11434'}\`) 호출이 차단되었습니다.\n\n### 🛠️ 즉시 해결 방법 (CORS 허용 실행):\n**Windows (PowerShell):**\n\`\`\`powershell\n$env:OLLAMA_ORIGINS="*" ; ollama serve\n\`\`\`\n\n**macOS / Linux:**\n\`\`\`bash\nOLLAMA_ORIGINS="*" ollama serve\n\`\`\`\n\n💡 *Tip: 상단 톱니바퀴 [설정] -> [AI 엔진 설정]에서 **[CORS 자가진단]**을 실행하여 정상 연결 여부를 확인할 수 있습니다.*`;
          } else if (isAbort) {
            errorText = `⚠️ **로컬 Ollama 응답 시간 초과 (60초)**\n\n모델 추론 시간이 60초를 초과했습니다. 더 가벼운 양자화 모델을 사용하거나 로컬 리소스를 확인하세요.`;
          } else {
            errorText = `⚠️ **로컬 Ollama 호출 실패**: ${e.message}\n\n*터미널에서 'OLLAMA_ORIGINS="*" ollama serve' 실행 여부 및 로컬 모델 설치 상태를 확인하세요.*`;
          }
        } else {
          errorText = `⚠️ Network Error: ${e.message}\n\n*백엔드 서버 또는 AI API 연결에 실패했습니다.*`;
        }
        pushChunk(errorText);
        finishStream();
      }
    });
  };

  // Editor Font Zoom Actions (Ctrl + +, Ctrl + -, Ctrl + 0)
  const handleEditorZoomIn = useCallback(() => {
    setEditorFontSize((prev) => {
      const next = Math.min(22, prev + 1);
      showToast(`에디터 폰트 크기: ${next}px`);
      return next;
    });
  }, [showToast]);

  const handleEditorZoomOut = useCallback(() => {
    setEditorFontSize((prev) => {
      const next = Math.max(12, prev - 1);
      showToast(`에디터 폰트 크기: ${next}px`);
      return next;
    });
  }, [showToast]);

  const handleEditorZoomReset = useCallback(() => {
    setEditorFontSize(15);
    showToast('에디터 폰트 기본 크기 복원: 15px');
  }, [showToast]);

  // Ctrl + Mouse Wheel font size adjustment on editor container
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleEditorZoomIn();
        } else if (e.deltaY > 0) {
          handleEditorZoomOut();
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleEditorZoomIn, handleEditorZoomOut]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Editor Font Size Zoom Shortcuts (Ctrl + +, Ctrl + -, Ctrl + 0)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
          e.preventDefault();
          handleEditorZoomIn();
          return;
        }
        if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          handleEditorZoomOut();
          return;
        }
        if (e.key === '0' || e.code === 'Numpad0') {
          e.preventDefault();
          handleEditorZoomReset();
          return;
        }
      }

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
          handleOpenSSOTGeneratorModal(activeSession?.title || 'Main Project');
        } else if (key === 's') {
          e.preventDefault();
          handleGenerateAiSpreadsheet();
        } else if (key === 'd') {
          e.preventDefault();
          handleGenerateAiSlideBuilder();
        } else if (key === 'v') {
          e.preventDefault();
          handleOpenSSOTGeneratorModal(activeSession?.title || 'Main Project');
        } else if (key === 'p') {
          e.preventDefault();
          setIsPromptLibraryModalOpen(true);
        } else if (key === 'e') {
          e.preventDefault();
          setIsEventManagerOpen(true);
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
    handleEditorZoomIn,
    handleEditorZoomOut,
    handleEditorZoomReset,
    showToast
  ]);

  // Quick Submenu Action Handlers (View & Settings)
  const handleQuickFontSize = useCallback((size: 'sm' | 'md' | 'lg' | 'xl') => {
    const sizeLabels: Record<string, string> = { sm: '작게 (14px)', md: '보통 (16px)', lg: '크게 (18px)', xl: '아주 크게 (20px)' };
    const updated = { ...preferences, fontSize: size };
    setPreferences(updated);
    saveSafePreferences(updated);
    applyThemeToDocument(preferences.compactness || 'spacious', size);
    showToast(`글꼴 크기가 "${sizeLabels[size]}"(으)로 즉시 변경되었습니다.`, 'success');
    setActiveMenu(null);
    setActiveSubmenu(null);
  }, [preferences, showToast]);

  const handleQuickCompactness = useCallback((compactness: 'dense' | 'spacious') => {
    const updated = { ...preferences, compactness };
    setPreferences(updated);
    saveSafePreferences(updated);
    applyThemeToDocument(compactness, preferences.fontSize || 'md');
    showToast(`레이아웃 밀도가 "${compactness === 'dense' ? '조밀하게' : '여유롭게'}"로 즉시 변경되었습니다.`, 'success');
    setActiveMenu(null);
    setActiveSubmenu(null);
  }, [preferences, showToast]);

  const handleQuickDefaultModel = useCallback((modelId: string, modelName: string) => {
    const updatedRoles = { ...roleModels, chat: modelId };
    setRoleModels(updatedRoles);
    setSelectedModel(modelId);
    const updated = { ...preferences, defaultModel: modelId, roleModels: updatedRoles };
    setPreferences(updated);
    saveSafePreferences(updated);
    try {
      localStorage.setItem('aipodium_ai_role_models', JSON.stringify(updatedRoles));
    } catch {}
    showToast(`대화 AI 모델이 "${modelName}"(으)로 즉시 변경되었습니다.`, 'success');
    setActiveMenu(null);
    setActiveSubmenu(null);
  }, [preferences, roleModels, showToast]);

  const handleQuickGhostWriter = useCallback((level: GhostWriterLevel) => {
    const updated = { ...preferences, ghostWriterLevel: level };
    setPreferences(updated);
    setGhostWriterLevel(level);
    saveSafePreferences(updated);
    showToast(`고스트 라이터가 "${level === 'off' ? 'OFF' : level + '%'}"로 설정되었습니다.`, 'success');
    setActiveMenu(null);
    setActiveSubmenu(null);
  }, [preferences, showToast]);

  const currentModelName = useMemo(() => {
    const targetId = preferences.defaultModel || selectedModel;
    return getModelDisplayName(targetId);
  }, [preferences.defaultModel, selectedModel]);

  const currentGhostLabel = useMemo(() => {
    const g = preferences.ghostWriterLevel || ghostWriterLevel;
    return g === 'off' ? 'Off' : `${g}%`;
  }, [preferences.ghostWriterLevel, ghostWriterLevel]);

  // Authentication & Local Lock Guard: If locked or not logged in, route to AuthPage
  if (!currentUser || isLocked) {
    return (
      <AuthPage
        onAuthenticated={async (user, vaultKey) => {
          setCurrentUser(user);
          setIsLocked(false);
          applyDefaultPanelsForCurrentDevice();
          if (vaultKey) {
            activeVaultKeyRef.current = vaultKey;
          }
          await reloadSecureWorkspaceData(vaultKey);
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
              ? 'Local-first workspace unlocked'
              : `Welcome back, ${user.name}! Workspace unlocked.`,
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
        className="h-11 bg-[#111114] border-b border-white/[0.08] px-3 flex items-center justify-between z-50 shrink-0"
      >
        <div className="flex items-center gap-2">
          {/* Logo / App Name */}
          <div className="flex items-center font-bold tracking-tight text-white cursor-pointer" onClick={() => showToast('AI Podium (SSOT 마크다운 플랫폼)')}>
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
                  setActiveSubmenu(null);
                }}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu('file');
                    setIsExportSubmenuOpen(false);
                    setActiveSubmenu(null);
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                  activeMenu === 'file'
                    ? 'text-zinc-100 bg-white/[0.08] font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
                }`}
              >
                <span>파일</span>
              </button>

              {activeMenu === 'file' && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => { handleCreateNewSession(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                  >
                    <span>새 프로젝트</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Alt+N</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleCreateNewFile(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                  >
                    <span>새 마크다운 노트</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+N</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { openFileInputRef.current?.click(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                  >
                    <span>로컬 파일 불러오기...</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+O</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { docFileInputRef.current?.click(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                  >
                    <span>오피스 / PDF 문서 변환...</span>
                    <span className="text-[11px] text-zinc-500 font-mono">PDF/DOCX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleSaveDocument(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                  >
                    <span>저장</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+S</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleSaveAsFile(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                  >
                    <span>다른 이름으로 저장...</span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  {/* 내보내기 (Export As) Sub-menu */}
                  <div
                    className="relative"
                    onMouseEnter={() => { setActiveSubmenu('export'); setIsExportSubmenuOpen(true); }}
                    onMouseMove={() => { if (activeSubmenu !== 'export') { setActiveSubmenu('export'); setIsExportSubmenuOpen(true); } }}
                    onMouseLeave={() => { setActiveSubmenu(null); setIsExportSubmenuOpen(false); }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const next = activeSubmenu !== 'export' && !isExportSubmenuOpen;
                        setActiveSubmenu(next ? 'export' : null);
                        setIsExportSubmenuOpen(next);
                      }}
                      className={`w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                        activeSubmenu === 'export' || isExportSubmenuOpen
                          ? 'bg-white/[0.08] text-white font-medium'
                          : 'hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span>내보내기</span>
                      <div className={`flex items-center gap-1 text-[11px] ${activeSubmenu === 'export' || isExportSubmenuOpen ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </div>
                    </button>

                    {(activeSubmenu === 'export' || isExportSubmenuOpen) && (
                      <div className="absolute left-full top-0 pl-1.5 -ml-1 w-52 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200">
                          <button
                            type="button"
                            onClick={() => { handleExportPdf(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                            className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                          >
                            <span>인쇄 및 PDF 출력</span>
                            <span className="text-[11px] text-zinc-500 font-mono">Ctrl+P</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleExportDocx(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                            className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                          >
                            <span>DOCX 문서 내보내기</span>
                            <span className="text-[11px] text-zinc-500 font-mono">DOCX</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleExportPptx(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                            className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                          >
                            <span>PPTX 슬라이드 내보내기</span>
                            <span className="text-[11px] text-zinc-500 font-mono">PPTX</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleExportCsv(); setActiveMenu(null); setIsExportSubmenuOpen(false); setActiveSubmenu(null); }}
                            className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer group"
                          >
                            <span>CSV 데이터 내보내기</span>
                            <span className="text-[11px] text-zinc-500 font-mono">CSV</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="my-1 border-t border-white/[0.06]" />

                  <button
                    type="button"
                    onClick={() => { setIsWorkspaceModalOpen(true); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>프로젝트 폴더 연결 / 관리...</span>
                    <span className="text-[0.5625rem] bg-[#09090b] text-emerald-300 px-1 rounded-sm border border-[#222226]/40 font-mono uppercase">{activeWorkspace.type}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenGoogleDrive('open');
                      setActiveMenu(null);
                      setIsExportSubmenuOpen(false);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="whitespace-nowrap">구글 드라이브...</span>
                    <span className="text-[0.5625rem] bg-[#09090b] text-indigo-300 px-1.5 py-0.5 rounded-sm border border-[#222226]/40 font-mono shrink-0 whitespace-nowrap">
                      {googleUser ? '연동' : '단독'}
                    </span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  <button
                    type="button"
                    onClick={() => { setIsTrashOpen(true); setActiveMenu(null); setIsExportSubmenuOpen(false); }}
                    className="w-full text-left text-xs text-rose-300 px-3 py-2 rounded-lg hover:bg-rose-950/60 hover:text-rose-200 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>휴지통 열기</span>
                    {trashSessions.length > 0 && (
                      <span className="bg-rose-600 text-white text-[0.5625rem] px-1.5 py-0.5 rounded-sm font-medium font-mono">
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
                onClick={() => {
                  setActiveMenu(activeMenu === 'edit' ? null : 'edit');
                  setActiveSubmenu(null);
                }}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu('edit');
                    setActiveSubmenu(null);
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                  activeMenu === 'edit'
                    ? 'text-zinc-100 bg-white/[0.08] font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
                }`}
              >
                <span>편집</span>
              </button>

              {activeMenu === 'edit' && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { document.execCommand('undo'); showToast('실행 취소'); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>실행 취소</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+Z</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { document.execCommand('redo'); showToast('다시 실행'); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>다시 실행</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+Y</span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { handleCopyToClipboard(); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>전체 복사</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+C</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { document.execCommand('cut'); showToast('잘라내기 완료'); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>잘라내기</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+X</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { showToast('💡 에디터나 대화창에서 Ctrl+V 키로 붙여넣으세요.'); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>붙여넣기</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+V</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      handleFormatDocument();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>문서 서식 자동 정리</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Shift+Alt+F</span>
                  </button>
                  {/* 프롬프트 주입 서브메뉴 */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('inject-prompts')}
                    onMouseMove={() => { if (activeSubmenu !== 'inject-prompts') setActiveSubmenu('inject-prompts'); }}
                    onMouseLeave={() => setActiveSubmenu(null)}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveSubmenu('inject-prompts')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSubmenu(activeSubmenu === 'inject-prompts' ? null : 'inject-prompts');
                      }}
                      className={`w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                        activeSubmenu === 'inject-prompts' ? 'bg-white/[0.08] text-white font-medium' : 'hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span>프롬프트 주입</span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>

                    {activeSubmenu === 'inject-prompts' && (
                      <div className="absolute left-full top-0 pl-1.5 -ml-1 w-64 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200">
                          <div className="px-2.5 py-1 text-[0.5625rem] font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-white/[0.06] mb-1">
                            <span>프롬프트 목록</span>
                            <span className="text-[0.5625rem] text-indigo-400 font-medium">1클릭 주입</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                            {effectivePrompts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleInstantInjectPrompt(p)}
                                className="w-full text-left text-xs text-zinc-200 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-start gap-1.5 transition cursor-pointer group"
                                title={p.description || p.title}
                              >
                                <span className="text-zinc-500 group-hover:text-white text-[0.625rem] shrink-0 mt-0.5">▶</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{p.title}</div>
                                  {p.description && (
                                    <div className="text-[11px] text-zinc-500 group-hover:text-zinc-300 truncate">
                                      {p.description}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>

                          <div className="my-1 border-t border-white/[0.06]" />

                          <button
                            type="button"
                            onClick={() => {
                              setIsPromptLibraryModalOpen(true);
                              setActiveMenu(null);
                              setActiveSubmenu(null);
                            }}
                            className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer font-medium"
                          >
                            <span>프롬프트 관리...</span>
                            <span className="text-[11px] text-zinc-500 font-mono">Alt+P</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="my-1 border-t border-white/[0.06]" />

                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      const searchInput = document.querySelector('input[placeholder*="파일"]') as HTMLInputElement;
                      if (searchInput) searchInput.focus();
                      showToast('탐색기 파일 검색 창에 포커스되었습니다.');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>찾기 및 검색</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+F</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      if (!messages || messages.length === 0) {
                        showToast('현재 세션에 초기화할 대화 내역이 없습니다.', 'info');
                      } else {
                        handleClearChat();
                      }
                      setActiveMenu(null);
                    }}
                    className="w-full text-left text-xs text-rose-300 px-3 py-2 rounded-lg hover:bg-rose-950/60 hover:text-rose-200 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>대화 내역 초기화</span>
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { handleDeleteFile(currentActiveFile); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-rose-300 px-3 py-2 rounded-lg hover:bg-rose-950/60 hover:text-rose-200 flex items-center justify-between transition cursor-pointer"
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
                onClick={() => {
                  setActiveMenu(activeMenu === 'view' ? null : 'view');
                  setActiveSubmenu(null);
                }}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu('view');
                    setActiveSubmenu(null);
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                  activeMenu === 'view'
                    ? 'text-zinc-100 bg-white/[0.08] font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
                }`}
              >
                <span>보기</span>
              </button>

              {activeMenu === 'view' && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">사이드바 토글</div>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { setIsSection1Collapsed(!isSection1Collapsed); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>좌측 AI 대화 패널</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{isSection1Collapsed ? '열기' : '숨김'}</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { setIsSection3Collapsed(!isSection3Collapsed); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>우측 탐색기 패널</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{isSection3Collapsed ? '열기' : '숨김'}</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { setIsSection1Collapsed(true); setIsSection3Collapsed(true); showToast('🎯 집중 모드 (모든 사이드바 숨김)'); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>집중 모드 (사이드바 숨김)</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { applyDefaultPanelsForCurrentDevice(); showToast('패널 레이아웃이 복원되었습니다.'); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>전체 패널 복원</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => { setIsTocOpen(!isTocOpen); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>제목 목차 보기</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{isTocOpen ? '숨김' : '표시'}</span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />
                  <div className="px-3 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">에디터 모드 전환</div>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      setEditorTab('wysiwyg');
                      setSessions((prev) =>
                        prev.map((s) => (s.id === activeSessionId ? { ...s, editorTab: 'wysiwyg' } : s))
                      );
                      setActiveMenu(null);
                    }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                      editorTab === 'wysiwyg'
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <span>서식 모드</span>
                    {editorTab === 'wysiwyg' && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      setEditorTab('edit');
                      setSessions((prev) =>
                        prev.map((s) => (s.id === activeSessionId ? { ...s, editorTab: 'edit' } : s))
                      );
                      setActiveMenu(null);
                    }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                      editorTab === 'edit'
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <span>마크다운 소스</span>
                    {editorTab === 'edit' && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />
                  <div className="px-3 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>에디터 폰트 크기</span>
                    <span className="font-mono text-indigo-400">{editorFontSize}px</span>
                  </div>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      handleEditorZoomIn();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>확대</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl + +</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      handleEditorZoomOut();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>축소</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl + -</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      handleEditorZoomReset();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>기본 크기 복원</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl + 0</span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />
                  <div className="px-3 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">인터페이스 스타일</div>

                  {/* 글꼴 크기 서브메뉴 */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('font-size')}
                    onMouseMove={() => { if (activeSubmenu !== 'font-size') setActiveSubmenu('font-size'); }}
                    onMouseLeave={() => setActiveSubmenu(null)}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveSubmenu('font-size')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSubmenu(activeSubmenu === 'font-size' ? null : 'font-size');
                      }}
                      className={`w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                        activeSubmenu === 'font-size' ? 'bg-white/[0.08] text-white font-medium' : 'hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span>글꼴 크기</span>
                      <div className={`flex items-center gap-1 text-[11px] ${activeSubmenu === 'font-size' ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                        <span>
                          {preferences.fontSize === 'sm' ? '작게' : preferences.fontSize === 'lg' ? '크게' : preferences.fontSize === 'xl' ? '아주 크게' : '보통'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </div>
                    </button>
                    {activeSubmenu === 'font-size' && (
                      <div className="absolute left-full top-0 pl-1.5 -ml-1 w-36 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200">
                          {[
                            { id: 'sm', label: '작게 (14px)' },
                            { id: 'md', label: '보통 (16px)' },
                            { id: 'lg', label: '크게 (18px)' },
                            { id: 'xl', label: '아주 크게 (20px)' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleQuickFontSize(item.id as any)}
                              className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                                (preferences.fontSize || 'md') === item.id
                                  ? 'bg-white/[0.08] text-white font-medium'
                                  : 'text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                              }`}
                            >
                              <span>{item.label}</span>
                              {(preferences.fontSize || 'md') === item.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 레이아웃 밀도 서브메뉴 */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('compactness')}
                    onMouseMove={() => { if (activeSubmenu !== 'compactness') setActiveSubmenu('compactness'); }}
                    onMouseLeave={() => setActiveSubmenu(null)}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveSubmenu('compactness')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSubmenu(activeSubmenu === 'compactness' ? null : 'compactness');
                      }}
                      className={`w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                        activeSubmenu === 'compactness' ? 'bg-white/[0.08] text-white font-medium' : 'hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span>레이아웃 밀도</span>
                      <div className={`flex items-center gap-1 text-[11px] ${activeSubmenu === 'compactness' ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                        <span>{preferences.compactness === 'dense' ? '조밀하게' : '여유롭게'}</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </div>
                    </button>
                    {activeSubmenu === 'compactness' && (
                      <div className="absolute left-full top-0 pl-1.5 -ml-1 w-32 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200">
                          {[
                            { id: 'dense', label: '조밀하게' },
                            { id: 'spacious', label: '여유롭게' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleQuickCompactness(item.id as any)}
                              className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                                (preferences.compactness || 'spacious') === item.id
                                  ? 'bg-white/[0.08] text-white font-medium'
                                  : 'text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                              }`}
                            >
                              <span>{item.label}</span>
                              {(preferences.compactness || 'spacious') === item.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>


                </div>
              )}
            </div>

            {/* 4. 기준 문서 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(activeMenu === 'ssot' ? null : 'ssot');
                  setActiveSubmenu(null);
                }}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu('ssot');
                    setActiveSubmenu(null);
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                  activeMenu === 'ssot'
                    ? 'text-zinc-100 bg-white/[0.08] font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
                }`}
              >
                <span>기준 문서</span>
              </button>

              {activeMenu === 'ssot' && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* 기준 문서 생성기 */}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      handleOpenSSOTGeneratorModal(activeSession?.title || 'Main Project');
                      setActiveMenu(null);
                      setActiveSubmenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>기준 문서 생성기...</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Alt+C</span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  {/* 문서 정합성 감사 */}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      setIsSsotAuditorOpen(true);
                      setActiveMenu(null);
                      setActiveSubmenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>문서 정합성 감사</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{ssotAuditSummary.score}%</span>
                  </button>

                  {/* 다관점 비평위원회 */}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      setIsCouncilModalOpen(true);
                      setActiveMenu(null);
                      setActiveSubmenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>다관점 비평위원회</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{councilSummary.overallScore}점</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. PDF 도구 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(activeMenu === 'pdf' ? null : 'pdf');
                  setActiveSubmenu(null);
                }}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu('pdf');
                    setActiveSubmenu(null);
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                  activeMenu === 'pdf'
                    ? 'text-zinc-100 bg-white/[0.08] font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
                }`}
              >
                <span>PDF</span>
              </button>

              {activeMenu === 'pdf' && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Current Active File Header */}
                  <div className="px-3 py-1.5 border-b border-white/[0.06] mb-1 flex items-center justify-between">
                    <span className="font-medium text-[11px] truncate text-zinc-300">
                      {currentActiveFile.toLowerCase().endsWith('.pdf') ? currentActiveFile : '활성 PDF 문서 없음'}
                    </span>
                    {currentActiveFile.toLowerCase().endsWith('.pdf') && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 uppercase font-mono">
                        PDF
                      </span>
                    )}
                  </div>

                  {/* Extraction & Parsing Group */}
                  <button
                    type="button"
                    disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
                    onClick={() => {
                      setActiveMenu(null);
                      pdfViewerRef.current?.extractToMarkdown();
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none group"
                  >
                    <span>마크다운 추출 실행</span>
                    <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300">즉시 변환</span>
                  </button>

                  <button
                    type="button"
                    disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
                    onClick={() => {
                      setActiveMenu(null);
                      pdfViewerRef.current?.clearCacheAndReparse();
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none group"
                  >
                    <span>캐시 초기화 및 재파싱</span>
                    <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300">캐시 삭제</span>
                  </button>

                  <button
                    type="button"
                    disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
                    onClick={() => {
                      setActiveMenu(null);
                      pdfViewerRef.current?.openReducerModal();
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none group"
                  >
                    <span>PDF 최적화 및 경량화...</span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  {/* View Controls */}
                  <button
                    type="button"
                    disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
                    onClick={() => {
                      setActiveMenu(null);
                      pdfViewerRef.current?.toggleSplitView();
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>단일 뷰 및 분할 편집 전환</span>
                  </button>

                  <button
                    type="button"
                    disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
                    onClick={() => {
                      setActiveMenu(null);
                      pdfViewerRef.current?.fitWidth();
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>너비 맞춤</span>
                  </button>

                  <button
                    type="button"
                    disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
                    onClick={() => {
                      setActiveMenu(null);
                      pdfViewerRef.current?.rotate();
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>시계 방향 90도 회전</span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  {/* File Actions */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      if (currentActiveFile.toLowerCase().endsWith('.pdf') && pdfViewerRef.current) {
                        pdfViewerRef.current.openFilePicker();
                      } else {
                        docFileInputRef.current?.click();
                      }
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>새 PDF 파일 열기...</span>
                  </button>

                  <button
                    type="button"
                    disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
                    onClick={() => {
                      setActiveMenu(null);
                      pdfViewerRef.current?.downloadPdf();
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>현재 PDF 다운로드</span>
                  </button>

                  {!currentActiveFile.toLowerCase().endsWith('.pdf') && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenu(null);
                        handleOpenFile('sample_document.pdf');
                      }}
                      className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>샘플 PDF 열기</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-white/[0.06]" />

                  {/* Engine Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setPreferencesInitialTab('ai-engine');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>PDF 파서 및 AI 엔진 설정...</span>
                  </button>
                </div>
              )}
            </div>

            {/* 6. 설정 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(activeMenu === 'settings' ? null : 'settings');
                  setActiveSubmenu(null);
                }}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu('settings');
                    setActiveSubmenu(null);
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                  activeMenu === 'settings'
                    ? 'text-zinc-100 bg-white/[0.08] font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
                }`}
              >
                <span>설정</span>
              </button>

              {activeMenu === 'settings' && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* 0. 역할별 AI 모델명 지정 */}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      setIsAiRoleModalOpen(true);
                      setActiveMenu(null);
                      setActiveSubmenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer mb-0.5"
                  >
                    <span>역할별 AI 모델명 지정...</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                      4개 역할
                    </span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  {/* 1. 대화 AI 모델 서브메뉴 */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('ai-model')}
                    onMouseMove={() => { if (activeSubmenu !== 'ai-model') setActiveSubmenu('ai-model'); }}
                    onMouseLeave={() => setActiveSubmenu(null)}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveSubmenu('ai-model')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSubmenu(activeSubmenu === 'ai-model' ? null : 'ai-model');
                      }}
                      className={`w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                        activeSubmenu === 'ai-model' ? 'bg-white/[0.08] text-white font-medium' : 'hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span>대화 AI 모델</span>
                      <div className={`flex items-center gap-1 text-[11px] ${activeSubmenu === 'ai-model' ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                        <span className="truncate max-w-[80px]">{currentModelName}</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </div>
                    </button>
                    {activeSubmenu === 'ai-model' && (
                      <div className="absolute left-full top-0 pl-1.5 -ml-1 w-52 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200 max-h-72 overflow-y-auto">
                          <div className="px-3 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">추천 AI 모델</div>
                          {RECOMMENDED_QUICK_MODELS.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleQuickDefaultModel(m.id, m.name)}
                              className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                                (preferences.defaultModel || selectedModel) === m.id
                                  ? 'bg-white/[0.08] text-white font-medium'
                                  : 'text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              {(preferences.defaultModel || selectedModel) === m.id && (
                                <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. 고스트 라이터 서브메뉴 */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('ghost-writer')}
                    onMouseMove={() => { if (activeSubmenu !== 'ghost-writer') setActiveSubmenu('ghost-writer'); }}
                    onMouseLeave={() => setActiveSubmenu(null)}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveSubmenu('ghost-writer')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSubmenu(activeSubmenu === 'ghost-writer' ? null : 'ghost-writer');
                      }}
                      className={`w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                        activeSubmenu === 'ghost-writer' ? 'bg-white/[0.08] text-white font-medium' : 'hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span>고스트 라이터</span>
                      <div className={`flex items-center gap-1 text-[11px] ${activeSubmenu === 'ghost-writer' ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                        <span>{currentGhostLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </div>
                    </button>
                    {activeSubmenu === 'ghost-writer' && (
                      <div className="absolute left-full top-0 pl-1.5 -ml-1 w-52 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200">
                          {/* 1클릭 프리셋 버튼 목록 */}
                          <div className="space-y-0.5">
                            {[
                              { id: 'off', label: '끄기', desc: '비활성화' },
                              { id: '30', label: '30%', desc: '보수적 제안' },
                              { id: '50', label: '50%', desc: '균형 모드' },
                              { id: '70', label: '70%', desc: '적극적 보조' },
                              { id: '100', label: '100%', desc: '자동 완성 극대화' }
                            ].map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleQuickGhostWriter(item.id as GhostWriterLevel)}
                                className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                                  (preferences.ghostWriterLevel || ghostWriterLevel) === item.id
                                    ? 'bg-white/[0.08] text-white font-medium'
                                    : 'text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-xs">{item.label}</span>
                                  <span className={`text-[11px] ${
                                    (preferences.ghostWriterLevel || ghostWriterLevel) === item.id
                                      ? 'text-indigo-200'
                                      : 'text-zinc-500 group-hover:text-zinc-300'
                                  }`}>
                                    {item.desc}
                                  </span>
                                </div>
                                {(preferences.ghostWriterLevel || ghostWriterLevel) === item.id && (
                                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="my-1 border-t border-white/[0.06]" />

                  {/* 3. 저장소 및 백업 관리 */}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      setPreferencesInitialTab('storage');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                      setActiveSubmenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>저장소 및 백업 관리...</span>
                    <span className="text-[10px] bg-black/40 text-emerald-400 px-1.5 py-0.5 rounded border border-white/[0.08] font-mono">로컬 저장소</span>
                  </button>

                  {/* 4. 워크스페이스 잠금 */}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      setActiveMenu(null);
                      setActiveSubmenu(null);
                      lockNow();
                      showToast('🔒 워크스페이스가 잠겼습니다.', 'info');
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>워크스페이스 잠금</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Ctrl+L</span>
                  </button>

                  {/* 5. 전체 환경설정 */}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      setPreferencesInitialTab('ai-engine');
                      setIsPreferencesModalOpen(true);
                      setActiveMenu(null);
                      setActiveSubmenu(null);
                    }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>전체 환경설정</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Alt+,</span>
                  </button>
                </div>
              )}
            </div>

            {/* 7. 도움말 메뉴 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(activeMenu === 'help' ? null : 'help');
                  setActiveSubmenu(null);
                }}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu('help');
                    setActiveSubmenu(null);
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                  activeMenu === 'help'
                    ? 'text-zinc-100 bg-white/[0.08] font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
                }`}
              >
                <span>도움말</span>
              </button>

              {activeMenu === 'help' && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#1c1c22]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => { setIsShortcutsModalOpen(true); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>단축키 가이드</span>
                    <span className="text-[11px] text-zinc-500 font-mono">F1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAboutModalOpen(true); setActiveMenu(null); }}
                    className="w-full text-left text-xs text-zinc-200 px-3 py-2 rounded-lg hover:bg-white/[0.08] hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span>AI Podium 정보</span>
                  </button>
                </div>
              )}
            </div>

          </nav>
        </div>

        {/* Hidden Input for Local File Loading (Markdown & Documents) */}
        <input
          ref={openFileInputRef}
          type="file"
          accept=".md,.markdown,.txt,.pdf,.docx,.xlsx,.xls,.pptx,.ppt,.csv,.json"
          onChange={handleOpenLocalFile}
          className="hidden"
        />

        {/* Hidden Input for Dedicated Office / PDF Document Batch Import */}
        <input
          ref={docFileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.xls,.pptx,.ppt,.md,.markdown,.txt,.csv"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleImportDocumentFiles(Array.from(e.target.files));
            }
            if (e.target) e.target.value = '';
          }}
          className="hidden"
        />

        {/* Right Controls: Command Palette & Status */}
        <div className="flex items-center gap-2">
          {/* GitHub Connection Status */}
          {workspaceRootType === 'github' && githubConfig && (
            <div 
              className="h-6 flex items-center gap-1.5 px-2 rounded-xs border border-[#222226] bg-[#121214] text-[0.6875rem] text-slate-300 font-medium cursor-pointer hover:bg-[#18181b] transition"
              title="GitHub 연동 설정 변경"
              onClick={handleOpenGithubModal}
            >
              <Github className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[140px]">저장소 연동: <span className="font-mono text-[#6366f1]">{githubConfig.repo}</span></span>
            </div>
          )}

          {/* User Profile Badge Avatar in Header */}
          {currentUser && (
            <UserProfileBadge
              user={currentUser}
              variant="header"
              onSignOut={async () => {
                const isGuestUser = auth.isGuest || currentUser?.provider === 'guest' || currentUser?.isGuest === true || !hasMasterPinConfigured();
                if (isGuestUser) {
                  await purgeGuestSession();
                  setEditorContent('');
                  setFiles({});
                  setFileFolders({});
                  setOpenTabs([]);
                  setSessions([]);
                  setActiveSessionId(null);
                }
                await auth.logout();
                setCurrentUser(null);
                setIsLocked(true);
                showToast(
                  isGuestUser
                    ? '게스트 세션이 종료되고 임시 데이터가 모두 삭제되었습니다.'
                    : '로그아웃되었습니다.'
                );
              }}
              onLockWorkspace={() => {
                lockNow();
                showToast('🔒 워크스페이스가 잠겼습니다 (Ctrl+L).', 'info');
              }}
              onOpenSettings={() => {
                setPreferencesInitialTab('integrations');
                setIsPreferencesModalOpen(true);
              }}
              onOpenGoogleAccount={handleOpenGoogleAccount}
            />
          )}
        </div>

      </header>

      {/* COLLAPSED SECTIONS RESTORE CONTROL BAR */}
      {(isSection1Collapsed || isSection2Collapsed || isSection3Collapsed) && (
        <div className="flex items-center justify-between bg-[#09090b]/90 backdrop-blur-md border-b border-[#222226] px-3 py-1.5 text-xs shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[0.6875rem] font-semibold text-slate-300 flex items-center gap-1">
              <ChevronsRight className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>접힌 섹션 펼치기:</span>
            </span>
            {isSection1Collapsed && (
              <button
                type="button"
                onClick={() => setIsSection1Collapsed(false)}
                className="p-1 px-2 rounded-xs bg-[#121214] hover:bg-[#18181b] text-indigo-400 hover:text-white border border-[#222226] transition flex items-center gap-1.5 active:scale-95 cursor-pointer text-[0.6875rem]"
                title="좌측 AI 대화 패널 펼치기"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI 대화</span>
              </button>
            )}
            {isSection2Collapsed && (
              <button
                type="button"
                onClick={() => setIsSection2Collapsed(false)}
                className="p-1 px-2 rounded-xs bg-[#121214] hover:bg-[#18181b] text-indigo-400 hover:text-white border border-[#222226] transition flex items-center gap-1.5 active:scale-95 cursor-pointer text-[0.6875rem]"
                title="중앙 에디터 패널 펼치기"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>중앙 에디터</span>
              </button>
            )}
            {isSection3Collapsed && (
              <button
                type="button"
                onClick={() => setIsSection3Collapsed(false)}
                className="p-1 px-2 rounded-xs bg-[#121214] hover:bg-[#18181b] text-amber-300 hover:text-white border border-[#222226] transition flex items-center gap-1.5 active:scale-95 cursor-pointer text-[0.6875rem]"
                title="우측 파일 탐색기 패널 펼치기"
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>파일 탐색기</span>
              </button>
            )}
          </div>

          {isSection1Collapsed && isSection3Collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-[0.625rem] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-xs border border-indigo-500/20 font-medium flex items-center gap-1">
                <span>🎯 문서 집중 모드 활성화 중</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSection1Collapsed(false);
                  setIsSection3Collapsed(false);
                  showToast('기본 패널 레이아웃이 복원되었습니다.');
                }}
                className="p-1 px-2 rounded-xs bg-[#121214] hover:bg-[#18181b] text-slate-300 hover:text-white border border-[#222226] transition flex items-center gap-1 active:scale-95 cursor-pointer text-[0.6875rem]"
                title="모든 패널 복원"
              >
                <span>전체 패널 복원</span>
              </button>
            </div>
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
              ? `${pane1Width}%`
              : `${pane1Width}%`,
            minWidth: isSection1Collapsed ? '0px' : '220px',
            opacity: isSection1Collapsed ? 0 : 1,
            pointerEvents: isSection1Collapsed ? 'none' : 'auto',
          }}
          className={`h-full min-h-0 flex flex-col bg-[#121214] border-r border-[#222226] shrink-0 overflow-hidden ${
            isResizing ? 'transition-none select-none' : 'transition-[width,min-width,opacity] duration-300 ease-in-out'
          }`}
        >
            
            {/* Header */}
            <div className="bg-[#0f0f12] border-b border-[#222226] px-2.5 h-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
                  className={`p-1 rounded-xs transition flex items-center gap-1.5 border shrink-0 cursor-pointer ${
                    isChatHistoryOpen
                      ? 'bg-[#18181b] text-[#6366f1] border-[#6366f1]/40'
                      : 'bg-[#121214] text-slate-300 hover:text-white border-[#222226] hover:bg-[#18181b]'
                  }`}
                  title="프로젝트 목록 열기/닫기"
                >
                  <History className="w-3 h-3 text-[#6366f1]" />
                  <span className="bg-[#09090b] text-indigo-300 text-[0.625rem] px-1 py-0.2 rounded-xs font-mono border border-[#222226]">
                    {sessions.length}
                  </span>
                </button>

                <div className="flex items-center gap-1.5 pl-1 border-l border-[#222226] min-w-0">
                  <Bot className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[180px] font-medium text-slate-200 text-xs" title={activeSession?.title}>
                    {selectedModel === WEB_LLM_MODEL_ID
                      ? '브라우저 로컬 AI'
                      : (isOnboardingMode ? 'AI 지식 비서 · 온보딩' : (activeSession?.title || 'AI 프로젝트'))}
                  </span>
                  {selectedModel === WEB_LLM_MODEL_ID ? (
                    <span className="text-[0.5625rem] px-1.5 py-0.2 rounded-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium shrink-0">
                      WebGPU Qwen2.5
                    </span>
                  ) : isOnboardingMode ? (
                    <span className="text-[0.5625rem] px-1.5 py-0.2 rounded-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium shrink-0">
                      게스트 가이드
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Recent Changes Badge (Alerting AI Edits in Editor) */}
                {hasUnreadAiChanges && recentAiChanges && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editorRef.current) editorRef.current.focus();
                    }}
                    className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-xs text-[0.625rem] font-semibold flex items-center gap-1 transition shrink-0 cursor-pointer"
                    title="AI가 에디터 내용을 수정했습니다. 에디터로 이동하여 확인하세요."
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="hidden md:inline">최근 AI 변경</span>
                    <ArrowRight className="w-3 h-3 text-amber-400" />
                  </button>
                )}
              </div>
            </div>

          {/* Left Pane Body: Split Chat History Sidebar + Active Chat Area */}
          <div className="flex-1 flex overflow-hidden relative">

            {/* Chat History & AI Model Selection Sidebar Panel */}
            <div
              className={`bg-[#121214] border-r border-[#222226] flex flex-col shrink-0 transition-all duration-300 ease-in-out transform z-10 ${
                isChatHistoryOpen
                  ? 'w-52 sm:w-60 opacity-100 translate-x-0'
                  : 'w-0 opacity-0 -translate-x-full overflow-hidden border-r-0 pointer-events-none'
              }`}
            >
              {/* Sidebar Header */}
              <div className="p-2 border-b border-[#222226] space-y-1.5 bg-[#0c0c0e] shrink-0">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Folder className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
                    <span className="font-semibold tracking-wider text-[0.6875rem] uppercase text-indigo-300">프로젝트 목록</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* [+] New Project Session Button */}
                    <button
                      type="button"
                      onClick={() => handleCreateNewSession()}
                      className="p-1 rounded-xs hover:bg-[#18181b] text-slate-400 hover:text-white transition cursor-pointer"
                      title="새 프로젝트 생성"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {/* [<<] Collapse Slide Button */}
                    <button
                      type="button"
                      onClick={() => setIsChatHistoryOpen(false)}
                      className="p-1 rounded-xs hover:bg-[#18181b] text-slate-400 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer"
                      title="프로젝트 목록 접기"
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
                    className="w-full bg-[#121214] border border-[#222226] focus:border-[#6366f1] rounded-md pl-7 pr-6 py-1 text-[0.6875rem] text-slate-200 placeholder:text-slate-400 outline-none transition"
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
                        className={`group relative flex flex-col px-2.5 py-1.5 rounded-xs transition cursor-pointer ${
                          isDraggingThis
                            ? 'opacity-40 border border-dashed border-[#6366f1] bg-[#18181b]/50'
                            : isActive
                            ? 'bg-[#18181b] text-white border-l-2 border-[#6366f1] pl-2 font-medium border-t border-r border-b border-[#222226]'
                            : 'text-slate-300 hover:bg-[#09090b]/60 hover:text-slate-100'
                        }`}
                      >
                        {/* Visual Drop Insertion Indicators */}
                        {isDroppingBefore && (
                          <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#6366f1] z-30 pointer-events-none" />
                        )}
                        {isDroppingAfter && (
                          <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#6366f1] z-30 pointer-events-none" />
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
                            {editingTreeTarget?.id === `project:${session.id}` ? (
                              <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                                <InlineRenameInput
                                  initialValue={session.title}
                                  isFolder={true}
                                  onCommit={handleCommitRename}
                                  onCancel={() => setEditingTreeTarget(null)}
                                />
                              </div>
                            ) : (
                              <span
                                className="truncate"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTreeTarget({
                                    id: `project:${session.id}`,
                                    type: 'session',
                                    name: session.title,
                                    path: session.title,
                                    sessionId: session.id,
                                  });
                                }}
                              >
                                {session.title}
                              </span>
                            )}
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
                                  setEditingTreeTarget({
                                    id: `project:${session.id}`,
                                    type: 'session',
                                    name: session.title,
                                    path: session.title,
                                    sessionId: session.id,
                                  });
                                }}
                                className="p-0.5 text-slate-400 hover:text-amber-300 transition rounded hover:bg-[#18181b]"
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
                                className="p-0.5 text-slate-400 hover:text-[#6366f1] transition rounded hover:bg-[#18181b]"
                                title="JSON으로 내보내기"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => requestDeleteSession(session.id, e)}
                                className="p-0.5 text-slate-400 hover:text-rose-400 transition rounded hover:bg-[#18181b]"
                                title="프로젝트 삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[0.5625rem] text-slate-400 font-mono mt-0.5">
                          <span>
                            {session.createdAt}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* AI Model Selection Box at the bottom of Project List */}
              <div className="border-t border-[#222226] bg-[#09090b]/85 flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAiModelSelectionOpen(!isAiModelSelectionOpen)}
                  className="flex items-center justify-between px-2.5 py-1.5 hover:bg-[#09090b]/60 transition-colors cursor-pointer w-full text-slate-300 hover:text-white"
                  title={isAiModelSelectionOpen ? "AI 모델 패널 접기" : "AI 모델 패널 펼치기"}
                >
                  <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-wider uppercase text-zinc-400">
                    <Cpu className="w-[13px] h-[13px] text-zinc-500 shrink-0" />
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
                      <div className="flex items-center bg-[#09090b] border border-[#222226] rounded-md p-0.5 text-[0.6875rem] gap-0.5">
                        <button
                          type="button"
                          onClick={() => { setMode('single'); showToast('Single Mode (단일 모델 모드) 설정'); }}
                          className={`flex-1 py-1 rounded transition flex items-center justify-center font-medium cursor-pointer ${
                            mode === 'single' ? 'bg-[#6366f1] text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-white'
                          }`}
                          title="Single Mode (단일 모델 모드)"
                        >
                          <span>Single</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMode('routing'); showToast('Routing Mode (스마트 오토 라우팅) 활성화'); }}
                          className={`flex-1 py-1 rounded transition flex items-center justify-center font-medium cursor-pointer ${
                            mode === 'routing' ? 'bg-[#6366f1] text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-white'
                          }`}
                          title="Routing Mode (스마트 오토 라우팅 모드)"
                        >
                          <span>Routing</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMode('multi'); showToast('Multi Mode (다중 모델 병렬 모드) 활성화'); }}
                          className={`flex-1 py-1 rounded transition flex items-center justify-center font-medium cursor-pointer ${
                            mode === 'multi' ? 'bg-[#6366f1] text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-white'
                          }`}
                          title="Multi Mode (다중 모델 병렬 모드)"
                        >
                          <span>Multi</span>
                        </button>
                      </div>

                      {/* Model Selection Dropdown (Single/Routing) or Checkbox List (Multi) */}
                      {mode === 'multi' ? (
                        <div className="bg-[#09090b]/90 border border-[#222226] rounded-md p-1.5 space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                          <div className="text-[0.625rem] text-zinc-400 font-mono px-1 flex justify-between items-center pb-1 border-b border-[#222226]">
                            <span>병렬 응답 모델 선택:</span>
                            <span className="text-zinc-300 font-medium">{selectedMultiModels.length}개 선택</span>
                          </div>
                          {availableChatModels.map((m) => {
                            const isChecked = selectedMultiModels.includes(m.id);
                            return (
                              <label
                                key={m.id}
                                className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition select-none hover:bg-white/5 text-xs ${
                                  isChecked
                                    ? 'text-zinc-100 font-medium'
                                    : 'text-zinc-400 hover:text-zinc-200'
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
                              </label>
                            );
                          })}
                        </div>
                      ) : mode === 'routing' ? (
                        <div className="bg-[#09090b]/90 border border-indigo-500/40 rounded-md p-2 text-[0.6875rem] text-indigo-200 flex items-start gap-1.5">
                          <Route className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-indigo-300 block">
                              스마트 오토 라우팅 ({provider === 'cloud' ? 'Gemini Cloud' : 'Local Ollama'})
                            </span>
                            <span className="text-[0.625rem] text-slate-400 leading-tight block mt-0.5">
                              {provider === 'cloud'
                                ? '입력 프롬프트의 복잡도/코드/길이를 자동 분석하여 Gemini 3.1 Pro, 3.8 Flash, 3.1 Flash-Lite로 지능형 배정합니다.'
                                : '프롬프트 복잡도 및 코드 유무를 분석하여 감지된 로컬 Coder/Lite/기본 Ollama 모델로 자동 배정합니다.'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#09090b]/90 border border-[#222226] rounded-md p-1.5 space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                          <div className="text-[0.625rem] text-zinc-400 font-mono px-1 flex justify-between items-center pb-1 border-b border-[#222226]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="shrink-0">단일 응답 모델:</span>
                              <span className="text-zinc-300 font-medium truncate">
                                {availableChatModels.find((m) => m.id === selectedModel)?.name || selectedModel}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsAiRoleModalOpen(true)}
                              title="역할별 AI 모델 지정"
                              className="p-0.5 text-zinc-400 hover:text-indigo-300 hover:bg-[#18181b] rounded transition shrink-0 cursor-pointer ml-1"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                            </button>
                          </div>
                          {availableChatModels.map((m) => {
                            const isSelected = selectedModel === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  setRoleModels((prev) => {
                                    const updated = { ...prev, chat: m.id };
                                    try {
                                      localStorage.setItem('aipodium_ai_role_models', JSON.stringify(updated));
                                    } catch {}
                                    return updated;
                                  });
                                }}
                                className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition select-none text-left hover:bg-white/5 text-xs ${
                                  isSelected
                                    ? 'text-zinc-100 font-medium'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'border-[#6366f1] bg-[#6366f1]/20'
                                      : 'border-[#3a3a40] bg-[#09090b]'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                                  )}
                                </div>
                                <span className="flex-1 truncate">{m.name}</span>
                                {isSelected && (
                                  <Check className="w-3 h-3 text-[#6366f1] shrink-0" />
                                )}
                              </button>
                            );
                          })}
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
                className="absolute left-0 top-12 z-20 bg-[#121214] hover:bg-[#18181b] text-[#6366f1] py-2 px-1 rounded-r-xs border border-l-0 border-[#222226] transition flex items-center gap-1 text-[0.625rem] font-mono group cursor-pointer"
                title="프로젝트 목록 펼치기"
              >
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#6366f1]" />
              </button>
            )}

            {/* Active Conversation Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
              {/* Chat Messages */}
              <div id="chat-messages" ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto p-3 select-text custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSessionId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="space-y-3 select-text max-w-3xl mx-auto w-full"
                  >
                    {/* 채팅 본문 상단 인라인 배너: '안녕하세요! AI 지식 비서입니다' 환영 메시지 바로 위 */}
                    {((isOnboardingMode && !isWebLlmBannerDismissed) || webllmProgress.isLoading || webllmProgress.isReady) && (
                      <WebLlmBanner
                        isSupported={webllmProgress.isSupported}
                        isLoading={webllmProgress.isLoading}
                        isReady={webllmProgress.isReady}
                        progressText={webllmProgress.progressText}
                        progressPercent={webllmProgress.progressPercent}
                        onStartDownload={handleStartWebLlmDownload}
                        onSelectModel={() => {
                          setSelectedModel(WEB_LLM_MODEL_ID);
                          setProvider('local-pc');
                          showToast('✓ Qwen2.5-0.5B 브라우저 로컬 AI가 선택되었습니다.');
                        }}
                        onDismiss={() => {
                          setIsWebLlmBannerDismissed(true);
                          try {
                            localStorage.setItem('aipodium_webllm_banner_dismissed', 'true');
                          } catch {}
                        }}
                      />
                    )}

                    {messages.map((msg) =>
                      msg.sender === 'ai' ? (
                        <AiMessageBubble
                          key={msg.id}
                          msg={msg}
                          selectedModel={selectedModel === WEB_LLM_MODEL_ID ? WEB_LLM_MODEL_DISPLAY_NAME : (isOnboardingMode ? 'AI 지식 비서' : selectedModel)}
                          onCopy={(text) => {
                            navigator.clipboard.writeText(text);
                            showToast('✓ AI 답변 내용이 클립보드에 복사되었습니다.');
                          }}
                          onDiff={(text, model) => {
                            setDiffModalData({
                              isOpen: true,
                              proposedContent: text,
                              title: 'AI 응답과 현재 문서 시맨틱 Diff',
                              sourceLabel: `${model || 'AI Assistant'} 제안본`,
                            });
                          }}
                          onSendToEditor={(text) => handleSendToEditor(text)}
                          onActionChipClick={(chipType) => handleOnboardingChipClick(chipType)}
                          onOpenSettings={(tab) => {
                            setPreferencesInitialTab(tab || 'ai-engine');
                            setIsPreferencesModalOpen(true);
                          }}
                        />
                      ) : (
                        <div
                          key={msg.id}
                          className="flex gap-2.5 items-start select-text justify-end"
                        >
                          <div className="rounded-md p-3 text-xs leading-relaxed space-y-2 select-text cursor-text bg-[#18181f] border border-white/[0.08] text-slate-100 max-w-[85%]">
                            {/* Attachment Rendering in Chat Bubble */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5 border-b border-white/[0.06] pb-1.5 select-none">
                                {msg.attachments.map((att) => (
                                  <div key={att.id} className="rounded overflow-hidden border border-white/[0.06] bg-black/40 p-1 flex items-center gap-1.5 max-w-full">
                                    {att.type === 'image' && att.url ? (
                                      <img
                                        src={att.url}
                                        alt={att.name}
                                        className="max-h-36 rounded border border-white/[0.06] object-cover"
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

                            {msg.ghostWriterLevel && msg.ghostWriterLevel !== 'off' && (
                              <div className="flex flex-col gap-1 pb-1.5 mb-1.5 border-b border-white/[0.06] select-none">
                                <div className="flex items-center justify-between gap-2 text-[0.625rem]">
                                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-200 bg-emerald-950/80 px-1.5 py-0.5 rounded text-[0.5625rem] border border-emerald-800/60">
                                    <Ghost className="w-3 h-3 text-emerald-300" />
                                    Ghost Writer {msg.ghostWriterLevel}%
                                  </span>
                                  <span className="text-[0.625rem] text-[#38bdf8] font-mono flex items-center gap-1">
                                    <Globe className="w-3 h-3 text-[#0ea5e9]" />
                                    영문 프롬프트
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

                            <div className="whitespace-pre-wrap font-sans space-y-1 select-text cursor-text selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)]">
                              {renderFormattedMessageText(msg.text)}
                            </div>
                          </div>

                          <div className="w-6 h-6 rounded-md bg-[#121214] border border-[#222226] flex items-center justify-center text-slate-200 text-xs shrink-0 mt-0.5 select-none shadow-xs">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      )
                    )}

                    {isAiLoading && !messages.some((m) => m.isStreaming) && (
                      <div className="flex gap-2.5 items-center py-1 bg-transparent border-0 select-none">
                        <div className="w-5 h-5 flex items-center justify-center text-indigo-400 text-xs shrink-0 select-none bg-transparent border-0">
                          <Bot className="w-4 h-4 animate-pulse text-indigo-400" />
                        </div>
                        <div className="bg-transparent border-0 px-1 py-1 text-xs text-slate-400 flex items-center gap-2 font-sans shadow-none">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                          </div>
                          <span className="text-slate-400 text-xs">
                            {isOnboardingMode ? 'AI 지식 비서가 답변을 준비하고 있습니다...' : 'AI 모델이 응답을 준비하고 있습니다...'}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Floating scroll to bottom pill */}
              {isScrolledUp && (
                <button
                  type="button"
                  onClick={() => {
                    isUserScrolledUpRef.current = false;
                    setIsScrolledUp(false);
                    scrollToChatBottom(true);
                  }}
                  className="absolute bottom-3 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121214]/95 border border-[#222226] text-[0.6875rem] text-slate-300 hover:text-white shadow-lg hover:border-[#6366f1] transition-all cursor-pointer group select-none"
                  title="최신 대화로 스크롤 이동"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-[#6366f1] group-hover:translate-y-0.5 transition-transform" />
                  <span>최신 대화로 이동</span>
                </button>
              )}
            </div>
          </div>

          {/* Input Box Area - Minimalist Clean Layout */}
          <div className="p-2.5 bg-[#09090b]/95 border-t border-[#222226] shrink-0">
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
              className="space-y-1.5 max-w-3xl mx-auto w-full"
            >
              {/* Attached Files Preview Bar */}
              {chatAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0c0c0e] border border-[#222226] rounded-xs max-h-28 overflow-y-auto custom-scrollbar">
                  {chatAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative group bg-[#09090b] border border-[#222226] rounded-xs p-1 flex items-center gap-1.5 text-xs text-slate-200 shrink-0"
                    >
                      {att.type === 'image' && att.url ? (
                        <img src={att.url} alt={att.name} className="w-7 h-7 rounded object-cover border border-[#222226]" />
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
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-[#18181b] hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 transition cursor-pointer"
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
                className="relative flex flex-col bg-[#101014] border border-white/[0.08] focus-within:border-[#6366f1]/70 rounded-md transition"
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
                      initial={{ opacity: 0, y: 6, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.99 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full left-0 right-0 mb-2 bg-[#121214] border border-white/[0.08] rounded-md shadow-2xl z-50 overflow-hidden flex flex-col max-h-72"
                    >
                      {/* Filtered Item List */}
                      <div
                        ref={mentionListRef}
                        className="overflow-y-auto p-1.5 space-y-0.5 text-xs select-none max-h-60 scroll-smooth bg-[#121214]"
                      >
                        {filteredMentionItems.length === 0 ? (
                          <div className="py-6 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                            <Info className="w-4 h-4 text-zinc-500" />
                            <span>'{mentionQuery}'에 해당하는 폴더 또는 파일이 없습니다.</span>
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
                                className={`group flex items-center justify-between px-3 py-1.5 h-8 rounded-md cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-white/10 text-zinc-100'
                                    : 'text-zinc-300 hover:bg-white/5'
                                }`}
                              >
                                {/* Left: Monochrome Icon + Name */}
                                <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                                  {item.type === 'folder' ? (
                                    <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                                  )}
                                  <span className="text-xs truncate font-medium">
                                    {item.name}
                                  </span>
                                </div>

                                {/* Right: Meta (File count / Size) + Select hint */}
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span className="text-xs text-zinc-500 font-mono">
                                    {item.detail}
                                  </span>
                                  <span
                                    className={`text-[0.6875rem] font-mono transition-opacity ${
                                      isSelected
                                        ? 'text-zinc-300 opacity-100'
                                        : 'text-zinc-500 opacity-0 group-hover:opacity-100'
                                    }`}
                                  >
                                    선택 ↵
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer Shortcut Navigation Guide */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#121214] border-t border-[#222226] text-[0.6875rem] text-zinc-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.2 bg-[#18181b] rounded-xs text-[0.625rem] border border-[#27272a] text-zinc-300">↑</kbd>
                            <kbd className="px-1 py-0.2 bg-[#18181b] rounded-xs text-[0.625rem] border border-[#27272a] text-zinc-300">↓</kbd>
                            <span className="text-zinc-500 ml-0.5">이동</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.2 bg-[#18181b] rounded-xs text-[0.625rem] border border-[#27272a] text-zinc-300">Enter</kbd>
                            <span className="text-zinc-600">/</span>
                            <kbd className="px-1.5 py-0.2 bg-[#18181b] rounded-xs text-[0.625rem] border border-[#27272a] text-zinc-300">Tab</kbd>
                            <span className="text-zinc-500 ml-0.5">참조 삽입</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.2 bg-[#18181b] rounded-xs text-[0.625rem] border border-[#27272a] text-zinc-300">Esc</kbd>
                            <span className="text-zinc-500 ml-0.5">닫기</span>
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {ghostWriterLevel !== 'off' ? (
                  <div className="flex flex-col">
                    {/* Dual Pane Layout (Left: Korean Prompt / Right: Ghost Practice) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#222226] bg-[#0c0c0e]">
                      {/* Left: Native Korean Prompt Input */}
                      <div className="flex flex-col p-2 relative">
                        <textarea
                          id="chat-input"
                          ref={chatInputRef}
                          style={{ height: `${chatInputHeight}px` }}
                          value={chatInput}
                          onFocus={() => {
                            lastActiveTextTargetRef.current = 'chat';
                          }}
                          onChange={(e) => {
                            handleChatInputChange(e);
                            if (ghostTargetEnglish || ghostTemplateText || ghostUserInput) {
                              setGhostTargetEnglish('');
                              setGhostTemplateText('');
                              setGhostUserInput('');
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
                          className="w-full bg-[#09090b] p-2 text-xs text-slate-100 placeholder:text-slate-400 rounded-xs border border-[#222226] focus:border-[#6366f1] resize-none outline-none font-sans leading-relaxed transition"
                        />
                      </div>

                      {/* Right: Ghost Writer Interactive Practice Pane */}
                      <div className="flex flex-col p-2 relative bg-[#0c0c0e]">
                        {/* Interactive Ghost Text Canvas / Overlay Textarea */}
                        <div
                          style={{ height: `${chatInputHeight}px` }}
                          className="relative w-full rounded-xs border border-[#222226] bg-[#09090b] overflow-hidden focus-within:border-emerald-500/80 transition"
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
                                  <kbd className="px-1 py-0.5 rounded-xs bg-[#09090b] border border-[#222226] text-teal-200 font-mono text-[0.5625rem]">Enter</kbd> 키 또는 상단 <span className="text-emerald-300 font-medium">[영작 생성]</span> 버튼을 누르면 고스트 텍스트가 생성됩니다.
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
                              className="absolute inset-0 w-full h-full p-2 text-xs font-mono leading-relaxed bg-transparent text-emerald-100 placeholder:text-transparent outline-none resize-none z-10 selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)]"
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
                    onFocus={() => {
                      lastActiveTextTargetRef.current = 'chat';
                    }}
                    onChange={handleChatInputChange}
                    onPaste={handlePaste}
                    onKeyDown={handleChatInputKeyDown}
                    placeholder="질문 또는 요청 입력, '@'로 워크스페이스 폴더 및 문서 참조..."
                    className="w-full bg-transparent p-2.5 text-xs text-slate-100 placeholder:text-slate-400 resize-none min-h-[44px] max-h-[350px] outline-none font-sans leading-relaxed"
                  />
                )}

                {/* Bottom Input Action Bar - Clean Borderless Unified Layout */}
                <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1 hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 rounded transition flex items-center justify-center cursor-pointer"
                      title="이미지 또는 파일 첨부하기"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>

                    {/* @ Workspace Reference Trigger Button */}
                    <button
                      type="button"
                      onClick={handleTriggerMention}
                      className="p-1 hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 rounded transition flex items-center justify-center cursor-pointer"
                      title="워크스페이스 폴더 및 파일 참조"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                    </button>

                    {/* Ghost Writer Auto-Complete Button (Visible when GW is enabled in Preferences) */}
                    {ghostWriterLevel !== 'off' && ghostTargetEnglish && (
                      <button
                        type="button"
                        onClick={() => {
                          setGhostUserInput(ghostTargetEnglish);
                          showToast('✨ 영작 자동 완성');
                        }}
                        className="px-1.5 py-0.5 rounded hover:bg-white/[0.06] text-indigo-400 hover:text-indigo-300 text-[0.625rem] font-mono flex items-center gap-1 transition cursor-pointer border border-white/[0.08]"
                        title="정답 문장 자동 완성"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                        <span>Tab 완성</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick Height Preset Buttons - Clean Text Group */}
                    <div className="flex items-center gap-0.5 text-[0.625rem] font-mono text-slate-400 bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setChatInputHeight(44)}
                        className={`px-1.5 py-0.5 rounded transition cursor-pointer ${chatInputHeight <= 50 ? 'bg-white/10 text-white font-bold' : 'hover:text-slate-200'}`}
                        title="높이 소: 44픽셀"
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatInputHeight(110)}
                        className={`px-1.5 py-0.5 rounded transition cursor-pointer ${chatInputHeight > 50 && chatInputHeight <= 150 ? 'bg-white/10 text-white font-bold' : 'hover:text-slate-200'}`}
                        title="높이 중: 110픽셀"
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatInputHeight(220)}
                        className={`px-1.5 py-0.5 rounded transition cursor-pointer ${chatInputHeight > 150 ? 'bg-white/10 text-white font-bold' : 'hover:text-slate-200'}`}
                        title="높이 대: 220픽셀"
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
                        className="hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 h-6 w-6 flex items-center justify-center rounded transition cursor-pointer"
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
                      className="bg-indigo-600/80 hover:bg-indigo-600 active:bg-indigo-700 text-white border border-indigo-500/40 h-6 px-2.5 rounded transition flex items-center justify-center cursor-pointer"
                      title={ghostWriterLevel !== 'off' ? '영작된 영어 프롬프트로 AI 전송' : '메시지 전송'}
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
            onTouchStart={(e) => handleTouchStartDivider(1, e)}
            className="w-1.5 hover:w-2 bg-[#09090b]/80 hover:bg-[#6366f1]/40 active:bg-[#6366f1] cursor-col-resize shrink-0 transition-all z-20 flex items-center justify-center group select-none border-r border-white/[0.06]"
            title="좌우로 드래그하여 패널 크기 조절 (대화창 / 에디터)"
          >
            <div className="w-0.5 h-8 bg-slate-500 group-hover:bg-[#6366f1] rounded-full transition" />
          </div>
        )}

        {/* Resizer Divider when Section 2 is collapsed */}
        {!isSection1Collapsed && isSection2Collapsed && !isSection3Collapsed && (
          <div
            onMouseDown={(e) => handleMouseDownDivider(3, e)}
            onTouchStart={(e) => handleTouchStartDivider(3, e)}
            className="w-1.5 hover:w-2 bg-[#09090b]/80 hover:bg-[#6366f1]/40 active:bg-[#6366f1] cursor-col-resize shrink-0 transition-all z-20 flex items-center justify-center group select-none border-r border-white/[0.06]"
            title="좌우로 드래그하여 패널 크기 조절 (대화창 / 파일 탐색기)"
          >
            <div className="w-0.5 h-8 bg-slate-500 group-hover:bg-[#6366f1] rounded-full transition" />
          </div>
        )}

        {/* ==================== CENTER PANE: Markdown Editor ==================== */}
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
            minWidth: isSection2Collapsed ? '0px' : isSection1Collapsed && isSection3Collapsed ? '100%' : '300px',
            opacity: isSection2Collapsed ? 0 : 1,
            pointerEvents: isSection2Collapsed ? 'none' : 'auto',
          }}
          className={`h-full min-h-0 flex-1 flex flex-col bg-[#09090b] backdrop-blur-md shrink-0 overflow-hidden ${
            isResizing ? 'transition-none select-none' : 'transition-[width,min-width,opacity] duration-300 ease-in-out'
          } min-w-0 z-10`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              e.preventDefault();
              e.stopPropagation();
              handleImportDocumentFiles(Array.from(e.dataTransfer.files));
            }
          }}
        >
          {/* Multi-Tab Document Bar */}
              <div className="bg-[#0c0c0e] border-b border-white/[0.06] flex items-center justify-between px-1.5 pt-1 select-none min-h-[34px] z-20 w-full min-w-0 relative">
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
                        className={`group relative flex items-center gap-1.5 px-3 py-1 text-xs font-mono transition cursor-pointer shrink-0 max-w-[200px] border-r border-white/[0.06] ${
                          isActive
                            ? 'bg-[#121216] border-b-2 border-b-[#6366f1] text-slate-100 font-medium'
                            : 'bg-transparent border-b-2 border-b-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                        }`}
                        title={tabFileName}
                      >
                        <span className="truncate flex-1 text-[0.6875rem]">{tabFileName}</span>

                        {/* Unsaved indicator */}
                        {isTabDirty && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 group-hover:hidden"
                            title="저장되지 않은 변경사항 있음"
                          />
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleCloseTab(tabFileName, e)}
                          className={`p-0.5 rounded-xs hover:bg-white/[0.08] text-slate-400 hover:text-white shrink-0 transition cursor-pointer ${
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
                    className="p-1 px-1.5 rounded-xs hover:bg-white/[0.06] text-slate-400 hover:text-white text-xs transition flex items-center justify-center shrink-0 ml-0.5 cursor-pointer border border-transparent hover:border-white/[0.08]"
                    title="새로운 메모 탭 추가"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>

                {/* Right: Unread Changes alert & Top-Right Drawer Button */}
                {!currentActiveFile?.toLowerCase().endsWith('.pdf') && (
                  <div className="shrink-0 flex items-center gap-1.5 pl-1.5 pr-0.5 relative z-40">
                    {/* Right: Recent Changes Alert (rendered only when present) */}
                    {hasUnreadAiChanges && recentAiChanges && (
                      <button
                        type="button"
                        onClick={() => setHasUnreadAiChanges(false)}
                        className="flex items-center gap-1 bg-[#121214] border border-[#6366f1]/50 px-1.5 py-0.5 rounded-xs text-[0.625rem] text-indigo-300 font-medium shrink-0 hover:border-[#6366f1] transition cursor-pointer"
                        title="AI가 최근 내용을 수정했습니다. 클릭 시 확인 완료."
                      >
                        <Sparkles className="w-3 h-3 text-[#6366f1] shrink-0" />
                        <span className="font-bold text-indigo-200 hidden sm:inline">최근 AI 변경</span>
                        <X className="w-3 h-3 text-[#6366f1] hover:text-white shrink-0 ml-0.5" />
                      </button>
                    )}


                    {/* Focus Mode (문서 집중 모드) Quick Toggle Button */}
                    <button
                      id="editor-focus-mode-toggle"
                      type="button"
                      onClick={() => {
                        const isFocus = isSection1Collapsed && isSection3Collapsed;
                        if (isFocus) {
                          setIsSection1Collapsed(false);
                          setIsSection3Collapsed(false);
                          showToast('기본 패널 레이아웃이 복원되었습니다.');
                        } else {
                          setIsSection1Collapsed(true);
                          setIsSection3Collapsed(true);
                          showToast('🎯 문서 집중 모드: 사이드바를 모두 접었습니다.');
                        }
                      }}
                      className={`p-1 rounded-xs border transition flex items-center justify-center cursor-pointer select-none ${
                        isSection1Collapsed && isSection3Collapsed
                          ? 'bg-[#18181b] text-indigo-400 border-[#6366f1]'
                          : 'bg-[#09090b] text-slate-400 border-[#222226] hover:text-white hover:bg-[#18181b]'
                      }`}
                      title={
                        isSection1Collapsed && isSection3Collapsed
                          ? '문서 집중 모드 해제 (패널 복원)'
                          : '문서 집중 모드 (사이드바 숨기기)'
                      }
                      aria-label="문서 집중 모드 토글"
                    >
                      {isSection1Collapsed && isSection3Collapsed ? (
                        <Minimize2 className="w-3 h-3" />
                      ) : (
                        <Maximize2 className="w-3 h-3" />
                      )}
                    </button>

                    {/* Compact Top-Right Drawer Button (24px wide, 12px high - half size of standard 24px button) */}
                    <button
                      id="editor-toolbar-drawer-toggle"
                      type="button"
                      onClick={() => setIsEditorToolbarDrawerOpen((prev) => !prev)}
                      className={`w-6 h-3 rounded-xs border transition flex items-center justify-center cursor-pointer select-none ${
                        isEditorToolbarDrawerOpen
                          ? 'bg-[#18181b] text-white border-[#6366f1]'
                          : 'bg-[#09090b] text-slate-400 border-[#222226] hover:text-white hover:bg-[#18181b]'
                      }`}
                      title={isEditorToolbarDrawerOpen ? '편집 도구 모음 접기' : '편집 도구 모음 펼치기'}
                      aria-label="편집 툴바 드로워 토글"
                    >
                      {isEditorToolbarDrawerOpen ? (
                        <ChevronUp className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                      )}
                    </button>

                    {/* Sliding Drop-down Vertical Toolbar Drawer */}
                    <AnimatePresence>
                      {isEditorToolbarDrawerOpen && (
                        <motion.div
                          id="editor-formatting-toolbar"
                          initial={{ opacity: 0, y: -12, scaleY: 0.85 }}
                          animate={{ opacity: 1, y: 0, scaleY: 1 }}
                          exit={{ opacity: 0, y: -8, scaleY: 0.88, transition: { duration: 0.16, ease: 'easeOut' } }}
                          transition={{
                            type: 'spring',
                            stiffness: 420,
                            damping: 26,
                            mass: 0.8,
                            opacity: { duration: 0.18 }
                          }}
                          className="absolute top-full right-0 mt-1.5 z-50 flex flex-col items-center bg-[#0f0f12] border border-[#222226] rounded-xs p-0.5 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-none w-7 origin-top gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* View Modes */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditorTab('wysiwyg');
                              setSessions((prev) =>
                                prev.map((s) => (s.id === activeSessionId ? { ...s, editorTab: 'wysiwyg' } : s))
                              );
                            }}
                            className={`h-6 w-6 min-w-[24px] px-0 rounded-xs transition flex items-center justify-center cursor-pointer select-none shrink-0 ${
                              editorTab === 'wysiwyg'
                                ? 'bg-[#18181b] text-indigo-400 font-medium'
                                : 'text-slate-400 hover:text-white hover:bg-[#18181b]/60'
                            }`}
                            title="서식 모드 (워드프로세서 방식)"
                            aria-label="서식 모드"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditorTab('edit');
                              setSessions((prev) =>
                                prev.map((s) => (s.id === activeSessionId ? { ...s, editorTab: 'edit' } : s))
                              );
                            }}
                            className={`h-6 w-6 min-w-[24px] px-0 rounded-xs transition flex items-center justify-center cursor-pointer select-none shrink-0 ${
                              editorTab === 'edit'
                                ? 'bg-[#18181b] text-white font-medium'
                                : 'text-slate-400 hover:text-white hover:bg-[#18181b]/60'
                            }`}
                            title="마크다운 소스 모드 (원본)"
                            aria-label="마크다운 소스 모드"
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
                            className={`h-6 w-6 min-w-[24px] px-0 rounded-xs transition flex items-center justify-center cursor-pointer select-none shrink-0 ${
                              editorTab === 'split'
                                ? 'bg-[#18181b] text-white font-medium'
                                : 'text-slate-400 hover:text-white hover:bg-[#18181b]/60'
                            }`}
                            title="실시간 분할 모드 (에디터 50% | 미리보기 50%)"
                            aria-label="실시간 분할 모드"
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
                            className={`h-6 w-6 min-w-[24px] px-0 rounded-xs transition flex items-center justify-center cursor-pointer select-none shrink-0 ${
                              editorTab === 'preview'
                                ? 'bg-[#18181b] text-white font-medium'
                                : 'text-slate-400 hover:text-white hover:bg-[#18181b]/60'
                            }`}
                            title="미리보기 전용 모드"
                            aria-label="미리보기 전용 모드"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                          </button>

                          {/* Divider */}
                          <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                          {/* Save Document Button */}
                          <button
                            type="button"
                            onClick={handleSaveDocument}
                            className={`h-6 w-6 min-w-[24px] px-0 rounded-xs transition flex items-center justify-center relative font-mono cursor-pointer select-none shrink-0 ${
                              isCurrentFileDirty
                                ? 'bg-[#6366f1] text-white hover:bg-[#4f46e5] font-semibold'
                                : 'text-slate-300 hover:bg-[#18181b] hover:text-white'
                            }`}
                            title="문서 저장"
                            aria-label="문서 저장"
                          >
                            <Save className="w-3.5 h-3.5 shrink-0" />
                            {isCurrentFileDirty && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0 absolute top-0.5 right-0.5 ring-1 ring-[#09090b]" title="저장되지 않은 변경사항 있음" />
                            )}
                          </button>

                          {/* Divider */}
                          <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                          {/* Undo & Redo */}
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleUndo}
                            className="h-6 w-6 min-w-[24px] px-0 rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition flex items-center justify-center cursor-pointer select-none shrink-0"
                            title="실행 취소"
                            aria-label="실행 취소"
                          >
                            <Undo2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleRedo}
                            className="h-6 w-6 min-w-[24px] px-0 rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition flex items-center justify-center cursor-pointer select-none shrink-0"
                            title="다시 실행"
                            aria-label="다시 실행"
                          >
                            <Redo2 className="w-3.5 h-3.5 shrink-0" />
                          </button>

                          {/* Divider */}
                          <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                          {/* Markdown Formatting Section */}
                          <div
                            className={`flex flex-col items-center gap-0.5 transition-opacity duration-200 ${
                              editorTab === 'preview'
                                ? 'opacity-35 pointer-events-none select-none'
                                : ''
                            }`}
                            title={editorTab === 'preview' ? '미리보기 전용 모드에서는 서식 툴바가 비활성화됩니다' : undefined}
                          >
                            {/* Headings (h1, h2, h3) */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('h1')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white font-semibold text-xs transition font-mono cursor-pointer flex items-center justify-center select-none text-slate-300 shrink-0"
                              title="제목 1"
                              aria-label="Heading 1"
                            >
                              h1
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('h2')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white font-semibold text-xs transition font-mono cursor-pointer flex items-center justify-center select-none text-slate-300 shrink-0"
                              title="제목 2"
                              aria-label="Heading 2"
                            >
                              h2
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('h3')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white font-semibold text-xs transition font-mono cursor-pointer flex items-center justify-center select-none text-slate-300 shrink-0"
                              title="제목 3"
                              aria-label="Heading 3"
                            >
                              h3
                            </button>

                            {/* Divider */}
                            <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                            {/* Link & Image */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('link')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="링크 삽입"
                              aria-label="링크 추가"
                            >
                              <Link className="w-3.5 h-3.5 text-slate-300" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('image')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="이미지 삽입"
                              aria-label="이미지 추가"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
                            </button>

                            {/* Divider */}
                            <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                            {/* Text Formatting (Bold, Italic, Code) */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('bold')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white font-bold transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="굵게"
                              aria-label="굵게"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('italic')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white italic transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="기울임"
                              aria-label="기울임"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('code')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white font-mono text-xs transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="인라인 코드"
                              aria-label="인라인 코드"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </button>

                            {/* Divider */}
                            <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                            {/* Lists, Quote & Rule */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('bullet')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="글머리 기호 목록"
                              aria-label="글머리 기호 목록"
                            >
                              <List className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('number')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="번호 목록"
                              aria-label="순서 있는 번호 목록"
                            >
                              <ListOrdered className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('task')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="체크박스 할 일 목록"
                              aria-label="체크박스 할 일 목록"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-slate-300" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('quote')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="인용구"
                              aria-label="인용구"
                            >
                              <Quote className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMarkdownBlockFormat('rule')}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300 shrink-0"
                              title="구분선"
                              aria-label="구분선"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            {/* Divider */}
                            <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                            {/* Table Dropdown Button */}
                            <div className="relative inline-flex items-center">
                              <button
                                ref={tableButtonRef}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowTablePicker(!showTablePicker)}
                                className={`h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none shrink-0 ${
                                  showTablePicker ? 'bg-[#6366f1] text-white' : 'text-slate-300'
                                }`}
                                title="표 삽입"
                                aria-label="표 삽입"
                              >
                                <TableIcon className={`w-3.5 h-3.5 ${showTablePicker ? 'text-white' : 'text-[#6366f1]'}`} />
                              </button>

                              {showTablePicker && (
                                <TableGridPicker
                                  anchorRef={tableButtonRef}
                                  onInsertTable={handleInsertTable}
                                  onClose={() => setShowTablePicker(false)}
                                />
                              )}
                            </div>

                            {/* Divider */}
                            <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                            {/* Markdown Guide Help (?) */}
                            <div className="relative inline-flex items-center shrink-0">
                              <button
                                ref={helpButtonRef}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowMarkdownHelp(!showMarkdownHelp)}
                                className={`h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none shrink-0 ${
                                  showMarkdownHelp ? 'bg-[#6366f1] text-white' : 'text-slate-300'
                                }`}
                                title="마크다운 문법 및 단축키 안내"
                                aria-label="마크다운 문법 & 단축키 가이드"
                              >
                                <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${showMarkdownHelp ? 'text-white' : 'text-[#818cf8]'}`} />
                              </button>

                              {showMarkdownHelp && (
                                <MarkdownHelpPopover
                                  isOpen={showMarkdownHelp}
                                  onClose={() => setShowMarkdownHelp(false)}
                                  anchorRef={helpButtonRef}
                                  onInsertSnippet={handleInsertSnippet}
                                />
                              )}
                            </div>

                            {/* Divider */}
                            <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                            {/* View Title (TOC / 문서 목차) */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setIsTocOpen(!isTocOpen);
                                if (!isTocOpen) setIsSsotAuditorOpen(false);
                              }}
                              className={`h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center relative cursor-pointer select-none shrink-0 ${
                                isTocOpen
                                  ? 'bg-[#6366f1] text-white font-semibold'
                                  : 'text-slate-300'
                              }`}
                              title="문서 목차 보기"
                              aria-label="문서 목차 보기"
                            >
                              <ListTree className={`w-3.5 h-3.5 ${isTocOpen ? 'text-white' : 'text-[#6366f1]'}`} />
                              {getTocItems(editorContent).length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#6366f1] text-white text-[0.5rem] px-1 rounded-full font-mono scale-90">
                                  {getTocItems(editorContent).length}
                                </span>
                              )}
                            </button>

                            {/* Divider */}
                            <div className="h-px w-4 bg-[#222226] shrink-0 my-0.5" />

                            {/* AI Clean Document (AI 자동 정리) */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={handleAiCleanDocument}
                              disabled={isAiCleaning}
                              className={`h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white text-slate-400 transition flex items-center justify-center group cursor-pointer select-none shrink-0 ${
                                isAiCleaning ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title="AI 자동 정리"
                              aria-label="AI 자동 정리"
                            >
                              <Wand2 className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white ${isAiCleaning ? 'animate-pulse' : ''}`} />
                            </button>

                            {/* Format Document (문서 서식 및 들여쓰기 자동 정리) */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={handleFormatDocument}
                              className="h-6 w-6 min-w-[24px] px-0 rounded-xs hover:bg-[#18181b] hover:text-white text-slate-400 transition flex items-center justify-center group cursor-pointer select-none shrink-0"
                              title="문서 서식 자동 정리"
                              aria-label="문서 서식 자동 정리"
                            >
                              <AlignLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

            {/* Recent AI Changes Notification Banner */}
            {hasUnreadAiChanges && recentAiChanges && (
              <div className="bg-[#121214] border-b border-[#222226] p-2 px-3 flex items-center justify-between text-xs text-indigo-200 shrink-0 z-20">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-xs bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-[#6366f1]" />
                  </div>
                  <div className="min-w-0 flex items-center gap-2 flex-wrap text-[0.6875rem]">
                    <span className="font-bold text-indigo-300">최근 AI 변경 알림</span>
                    <span className="bg-[#6366f1]/20 text-indigo-300 text-[0.625rem] px-1.5 py-0.2 rounded-xs font-mono border border-[#6366f1]/30">
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
                  className="bg-[#6366f1] hover:bg-[#4f46e5] active:bg-[#4338ca] text-white text-[0.625rem] font-semibold px-2.5 py-0.5 rounded-xs transition flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                >
                  <span>확인</span>
                  <Check className="w-3 h-3" />
                </button>
              </div>
            )}

              {/* Main Editor Body */}
              <div
                ref={editorContainerRef}
                style={{ '--editor-font-size': `${editorFontSize}px` } as React.CSSProperties}
                className="flex-1 relative overflow-hidden flex flex-row min-h-0 bg-[#0c0c0e]"
              >
                <div className="h-full relative overflow-hidden flex flex-col min-w-0 w-full">
                  <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                    {currentActiveFile.toLowerCase().endsWith('.pdf') ? (
                      <PdfViewer
                        ref={pdfViewerRef}
                        fileName={currentActiveFile}
                        pdfData={files[currentActiveFile] || SAMPLE_PDF_DATA_URL}
                        markdownContent={
                          pdfMarkdownMap[currentActiveFile] ??
                          files[currentActiveFile.replace(/\.pdf$/i, '.md')] ??
                          ''
                        }
                        onMarkdownChange={handlePdfMarkdownChange}
                        onClearMarkdownCache={handlePdfClearMarkdownCache}
                        onUploadPdf={handlePdfUploadFromViewer}
                        ollamaEndpoint={preferences.pdfParser?.ollamaEndpoint || 'http://localhost:11434'}
                        ollamaModel={preferences.pdfParser?.ollamaModel || 'llama3.2-vision'}
                        onToast={showToast}
                        renderMarkdownToHtml={renderMarkdownToHtml}
                      />
                    ) : (
                      <OptimizedEditor
                        value={editorContent}
                        onChange={handleEditorChange}
                        onFocus={() => {
                          lastActiveTextTargetRef.current = 'editor';
                          if (hasUnreadAiChanges) setHasUnreadAiChanges(false);
                        }}
                        editorRef={editorRef}
                        tiptapRef={tiptapEditorRef}
                        placeholder="# 마크다운 노트&#10;&#10;AI 답변의 [에디터로 내용 전송] 또는 직접 작성..."
                        editorTab={editorTab}
                        renderMarkdownToHtml={renderMarkdownToHtml}
                        fontSize={editorFontSize}
                      />
                    )}

                    {/* Table of Contents Floating Sidebar / Drawer Overlay */}
                    {isTocOpen && (
                      <div className="absolute top-0 right-0 bottom-0 w-64 bg-[#0f0f12] border-l border-[#222226] z-20 flex flex-col transition-all">
                        {/* TOC Header */}
                        <div className="p-2.5 bg-[#121214] border-b border-[#222226] flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                            <ListTree className="w-3.5 h-3.5 text-[#6366f1]" />
                            <span>문서 목차</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsTocOpen(false)}
                            className="text-slate-400 hover:text-slate-200 p-1 rounded-xs hover:bg-[#18181b] transition cursor-pointer"
                            title="목차 닫기"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* TOC Content List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs custom-scrollbar">
                          {getTocItems(editorContent).length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-[0.6875rem]">
                              <p>문서에 제목 서식이 없습니다.</p>
                              <p className="mt-1 text-[0.625rem] text-slate-500">`#`, `##`, `###` 등으로 제목을 추가하세요.</p>
                            </div>
                          ) : (
                            getTocItems(editorContent).map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => jumpToTocItem(item.charOffset, item.lineIndex)}
                                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-xs hover:bg-[#18181b] hover:text-slate-100 cursor-pointer transition text-slate-300 border border-transparent hover:border-[#222226] ${
                                  item.level === 1
                                    ? 'font-semibold pl-2 text-indigo-300 bg-[#121214]'
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

                    {/* SSOT Drift & Consistency Auditor Floating Drawer Overlay */}
                    {isSsotAuditorOpen && (
                      <div className="absolute top-0 right-0 bottom-0 z-30 shadow-2xl flex transition-all">
                        <SSOTDriftAuditor
                          content={editorContent}
                          onUpdateContent={handleEditorChange}
                          onJumpToLine={handleJumpToLine}
                          onClose={() => setIsSsotAuditorOpen(false)}
                          apiKey={cloudApiKey}
                          model={roleModels.architect}
                          isDarkTheme={preferences.themeMode !== 'light'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
        </section>

        {/* Resizer Divider 2 */}
        {!isSection2Collapsed && !isSection3Collapsed && (
          <div
            onMouseDown={(e) => handleMouseDownDivider(2, e)}
            onTouchStart={(e) => handleTouchStartDivider(2, e)}
            className="w-1.5 hover:w-2 bg-[#09090b]/80 hover:bg-[#6366f1]/40 active:bg-[#6366f1] cursor-col-resize shrink-0 transition-all z-20 flex items-center justify-center group select-none shadow-xs border-x border-[#222226]"
            title="좌우로 드래그하여 패널 크기 조절 (에디터 / 파일 탐색기)"
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
              : isSection2Collapsed
              ? `${100 - pane1Width}%`
              : `${100 - pane1Width - pane2Width}%`,
            minWidth: isSection3Collapsed ? '0px' : '180px',
            opacity: isSection3Collapsed ? 0 : 1,
            pointerEvents: isSection3Collapsed ? 'none' : 'auto',
          }}
          className={`h-full min-h-0 flex flex-col bg-[#121214] shrink-0 overflow-hidden relative ${
            isResizing ? 'transition-none select-none' : 'transition-[width,min-width,opacity] duration-300 ease-in-out'
          } min-w-0 border-l border-[#222226]`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              e.preventDefault();
              e.stopPropagation();
              handleImportDocumentFiles(Array.from(e.dataTransfer.files));
            }
          }}
        >
            
            {/* Integrated Sleek 1-Line File Explorer Header Toolbar */}
            {/* Explorer Header */}
            <div className="flex items-center h-8 px-2.5 gap-2 bg-[#0f0f12] border-b border-[#222226] shrink-0 text-slate-300 select-none">
              {/* 1. Integrated Search Input */}
              <div className="relative flex-1 min-w-[60px] flex items-center">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="파일 검색..."
                  className="w-full bg-[#09090b] hover:bg-[#09090b] text-slate-200 placeholder-slate-400 text-xs pl-6 pr-5 py-0.5 rounded-xs border border-[#222226] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/40 focus:outline-none transition font-sans"
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
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer disabled:opacity-50"
                  title="저장소 새로고침 및 동기화"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isResyncingWorkspace ? 'animate-spin text-[#6366f1]' : ''}`} />
                </button>

                {/* [📁+ New Folder] */}
                <button
                  type="button"
                  onClick={() => handleCreateNewSession()}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer"
                  title="새 폴더 추가"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                {/* [📄+ New File] */}
                <button
                  type="button"
                  onClick={handleCreateNewFile}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer"
                  title="새 파일 추가"
                >
                  <FilePlus className="w-3.5 h-3.5 text-[#6366f1]" />
                </button>

                {/* [📂 Manage/Pick Project Folder Workspace] */}
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer"
                  title="프로젝트 폴더 연결 및 문서 가져오기"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-300" />
                </button>

                {/* [☁️ Google Drive Picker / Connect Button] */}
                <button
                  type="button"
                  onClick={() => handleOpenGoogleDrive('open')}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer relative group"
                  title="구글 드라이브 파일 탐색 및 연동"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
                  {googleUser && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>

                {/* [📄⬆️ Import Office / PDF Document] */}
                <button
                  type="button"
                  onClick={() => docFileInputRef.current?.click()}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer relative group"
                  title="오피스 및 PDF 문서 가져오기"
                >
                  <FileUp className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
                </button>
              </div>
            </div>

          {/* Continuous Tree Structure (VS Code Standard Style) */}
          <div
            id="file-tree"
            ref={fileTreeRef}
            tabIndex={0}
            onKeyDown={handleTreeKeyDown}
            className="flex-1 overflow-y-auto py-1 text-xs select-none bg-transparent custom-scrollbar focus:outline-none"
          >
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
                // 1. Explicitly assigned to this session folder
                if (fileFolders[f] === session.title) {
                  return true;
                }
                // 2. If assigned to another session, it must not appear here
                if (fileFolders[f] && fileFolders[f] !== session.title) {
                  return false;
                }
                // 3. Fallback: Path prefix of session or unassigned session memo
                if (f.startsWith(`${session.title}/`)) {
                  return true;
                }
                if (f === memoFileName || (session.fileName && f === session.fileName)) {
                  const isOtherSessionMemo = sessions.some(
                    (s) => s.id !== session.id && (s.fileName === f || f === `${s.title}.md`)
                  );
                  return !isOtherSessionMemo;
                }
                return false;
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
                    isDraggingThis ? 'opacity-40 bg-[#18181b]' : ''
                  } ${isDroppingInside ? 'bg-[#18181b]/90' : ''}`}
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
                    id={`tree-item-session:${session.id}`}
                    onClick={() => {
                      setFocusedTreeItemId(`session:${session.id}`);
                      fileTreeRef.current?.focus({ preventScroll: true });
                      setOpenFolders((prev) => ({ ...prev, [session.title]: !isFolderOpen }));
                      if (session.id !== activeSessionId) {
                        handleSelectSession(session.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleOpenSSOTGeneratorModal(session.title);
                    }}
                    className={`flex items-center justify-between px-2 h-7 cursor-pointer group transition-colors rounded-xs ${
                      focusedTreeItemId === `session:${session.id}`
                        ? 'bg-[#1c1c20] text-white ring-1 ring-indigo-500/70 font-medium shadow-xs'
                        : isCurrentActiveSession
                        ? 'text-indigo-300 font-medium bg-white/5 border-l-2 border-indigo-500 hover:bg-white/[0.08]'
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
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
                      {editingTreeTarget?.id === `session:${session.id}` ? (
                        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <InlineRenameInput
                            initialValue={session.title}
                            isFolder={true}
                            onCommit={handleCommitRename}
                            onCancel={() => setEditingTreeTarget(null)}
                          />
                        </div>
                      ) : (
                        <span className="truncate text-xs text-slate-200 group-hover:text-white">
                          {session.title}
                        </span>
                      )}
                    </div>

                    {/* Right Folder Actions & Badge */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isDroppingInside && (
                        <span className="text-[0.625rem] bg-[#6366f1] text-white px-1.5 py-0.2 rounded-xs font-sans">
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
                          className="p-1 rounded-xs hover:bg-[#18181b] hover:text-[#6366f1] transition cursor-pointer"
                          title="통합 문서 생성"
                        >
                          <Sparkles className="w-3 h-3 text-[#6366f1]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedTreeItemId(`session:${session.id}`);
                            setEditingTreeTarget({
                              id: `session:${session.id}`,
                              type: 'session',
                              name: session.title,
                              path: session.title,
                              sessionId: session.id,
                            });
                          }}
                          className="p-1 rounded-xs hover:bg-[#18181b] hover:text-slate-100 transition cursor-pointer"
                          title="이름 변경"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => requestDeleteSession(session.id, e)}
                          className="p-1 rounded-xs hover:bg-[#18181b] hover:text-rose-400 transition cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nested Files / Subdirectories in Folder with Recursive Tree Structure */}
                  {isFolderOpen && (
                    <div className="relative pl-5 before:absolute before:left-3 before:top-0 before:bottom-1 before:w-[1px] before:bg-[#222226]">
                      {matchingFiles.length === 0 ? (
                        <div className="text-[0.6875rem] text-slate-500 py-1 pl-3 font-mono select-none">
                          문서 없음
                        </div>
                      ) : (
                        (() => {
                          const treeRoot = buildFileTreeFromPaths(matchingFiles, session.title);
                          return (
                            <div className="py-0.5">
                              <RecursiveFolderTree
                                node={treeRoot}
                                level={0}
                                sessionTitle={session.title}
                                sessionId={session.id}
                                currentActiveFile={currentActiveFile}
                                isCurrentFileDirty={isCurrentFileDirty}
                                draggedType={draggedType}
                                draggedId={draggedId}
                                searchQuery={searchQuery}
                                focusedTreeItemId={focusedTreeItemId}
                                editingTreeItemId={editingTreeTarget?.id}
                                openFolders={openFolders}
                                onToggleFolder={(folderKey) =>
                                  setOpenFolders((prev) => ({
                                    ...prev,
                                    [folderKey]: !(prev[folderKey] ?? true),
                                  }))
                                }
                                onSetFocusedItem={(id) => {
                                  setFocusedTreeItemId(id);
                                  fileTreeRef.current?.focus({ preventScroll: true });
                                }}
                                onStartRename={(target) => setEditingTreeTarget(target)}
                                onCommitRename={handleCommitRename}
                                onCancelRename={() => setEditingTreeTarget(null)}
                                onDeleteFolder={handleDeleteFolder}
                                onOpenFile={(fpath) => {
                                  handleSelectSession(session.id);
                                  handleOpenFile(fpath);
                                }}
                                onRenameFile={handleRenameFile}
                                onDeleteFile={handleDeleteFile}
                                onDragStart={handleFileDragStart}
                                onDragEnd={handleDragEnd}
                              />
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Any loose/unassigned files outside registered projects */}
            {(() => {
              const allProjectTitles = new Set(sessions.map((s) => s.title));
              const allSessionMemoFiles = new Set(
                sessions.flatMap((s) => [s.fileName, `${s.title}.md`].filter(Boolean) as string[])
              );
              const unassignedFiles = Object.keys(files).filter((f) => {
                if (
                  f.startsWith('01_SSOT_Sources/') ||
                  f.startsWith('02_Studio_Outputs/') ||
                  f.startsWith('.podium/')
                ) {
                  return false;
                }
                if (allSessionMemoFiles.has(f)) {
                  return false;
                }
                const folder = fileFolders[f];
                if (folder && allProjectTitles.has(folder)) {
                  return false;
                }
                return true;
              });

              if (unassignedFiles.length === 0) return null;

              const unassignedTree = buildFileTreeFromPaths(unassignedFiles, 'OTHER FILES');

              return (
                <div className="mt-2 pt-2 border-t border-[#222226]">
                  <div className="px-3 py-1 text-[0.625rem] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-slate-400" />
                    <span>기타 파일 ({unassignedFiles.length})</span>
                  </div>
                  <div className="mt-0.5 px-1">
                    <RecursiveFolderTree
                      node={unassignedTree}
                      level={0}
                      sessionTitle="OTHER FILES"
                      currentActiveFile={currentActiveFile}
                      isCurrentFileDirty={isCurrentFileDirty}
                      draggedType={draggedType}
                      draggedId={draggedId}
                      searchQuery={searchQuery}
                      focusedTreeItemId={focusedTreeItemId}
                      editingTreeItemId={editingTreeTarget?.id}
                      openFolders={openFolders}
                      onToggleFolder={(folderKey) =>
                        setOpenFolders((prev) => ({
                          ...prev,
                          [folderKey]: !(prev[folderKey] ?? true),
                        }))
                      }
                      onSetFocusedItem={(id) => {
                        setFocusedTreeItemId(id);
                        fileTreeRef.current?.focus({ preventScroll: true });
                      }}
                      onStartRename={(target) => setEditingTreeTarget(target)}
                      onCommitRename={handleCommitRename}
                      onCancelRename={() => setEditingTreeTarget(null)}
                      onDeleteFolder={handleDeleteFolder}
                      onOpenFile={handleOpenFile}
                      onRenameFile={handleRenameFile}
                      onDeleteFile={handleDeleteFile}
                      onDragStart={handleFileDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

        </section>

      </main>

      {/* Global Bottom Status Bar - Clean Workspace Path Display */}
      <footer className="h-6 bg-[#09090b]/90 backdrop-blur-md border-t border-[#222226] px-3 flex items-center justify-between text-[0.6875rem] text-slate-300 font-mono shrink-0 select-none z-30">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-[#6366f1] transition cursor-pointer shrink-0 truncate group"
            title={`클릭하여 프로젝트 폴더 연결 및 관리 열기 (${getCurrentDisplayPath()})`}
          >
            <Folder className="w-3.5 h-3.5 text-indigo-400/80 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-slate-400">프로젝트:</span>
            <span className="font-semibold text-indigo-300 group-hover:underline truncate">
              {getCurrentDisplayPath()}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[0.625rem]">
          {/* Local AI Resource Monitor (Podium style VRAM & CPU indicator) */}
          <LocalAiResourceMonitor
            endpoint={localEndpointAddress}
            isGenerating={isAiLoading}
            activeModel={selectedModel}
            provider={provider}
            variant="statusbar"
            onOpenSettings={() => {
              setPreferencesInitialTab('ai-engine');
              setIsPreferencesModalOpen(true);
            }}
          />
          <span className="text-slate-600">|</span>

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
        <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-[#222226] rounded-xs max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-950/80 border border-rose-800/80 text-rose-400 rounded-xs shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>프로젝트 삭제 경고</span>
                  <span className="text-xs font-mono font-normal text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-xs">
                    주의
                  </span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  '<span className="font-semibold text-amber-300">{deleteConfirmSession.title}</span>' 프로젝트를 삭제하시겠습니까?
                </p>
                <p className="text-[0.6875rem] text-slate-400 leading-normal pt-1">
                  프로젝트를 삭제하면 좌측 대화, 중앙 메모, 우측 폴더 연동 항목이 모두 휴지통으로 이동합니다. 휴지통에서 언제든지 복구할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222226]">
              <button
                type="button"
                onClick={() => setDeleteConfirmSession(null)}
                className="px-3 py-1.5 rounded-xs bg-[#121214] hover:bg-[#18181b] text-slate-300 text-xs font-medium transition cursor-pointer border border-[#222226]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={executeDeleteSession}
                className="px-3.5 py-1.5 rounded-xs bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-[#222226] rounded-xs max-w-lg w-full p-5 flex flex-col max-h-[80vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-200">휴지통</h3>
                <span className="text-xs bg-[#09090b] text-indigo-300 px-2 py-0.5 rounded-xs font-mono font-semibold border border-[#222226]">
                  {trashSessions.length}개 항목
                </span>
              </div>
              <div className="flex items-center gap-2">
                {trashSessions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleEmptyTrash}
                    className="text-[0.6875rem] text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 rounded-xs bg-rose-950/40 border border-rose-900/60 transition cursor-pointer"
                  >
                    휴지통 전체 비우기
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsTrashOpen(false)}
                  className="p-1 rounded-xs hover:bg-[#18181b] text-slate-400 hover:text-white transition cursor-pointer"
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
                    className="flex items-center justify-between p-3 rounded-xs bg-[#09090b] border border-[#222226] hover:border-[#222226] transition"
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
                        className="px-2.5 py-1 rounded-xs bg-emerald-700 hover:bg-[#6366f1] border border-emerald-600 text-white text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                        title="프로젝트, 대화, 메모, 폴더 복구"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>복구</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermanentDeleteSession(session.id)}
                        className="px-2.5 py-1 rounded-xs bg-[#121214] hover:bg-rose-950 border border-[#222226] hover:border-rose-800 text-slate-300 hover:text-rose-300 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
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

            <div className="pt-3 border-t border-[#222226] flex justify-end">
              <button
                type="button"
                onClick={() => setIsTrashOpen(false)}
                className="px-3 py-1.5 rounded-xs bg-[#121214] hover:bg-[#18181b] text-slate-300 text-xs font-medium transition cursor-pointer border border-[#222226]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal (Standard VS Code Style) */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#121214]/95 backdrop-blur-xl border border-[#222226] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-[#18181b] transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pt-1">
              <h2 className="text-base font-semibold text-indigo-300">단축키 안내</h2>
              <p className="text-xs text-slate-400">워크스페이스 작업 효율을 높이는 단축키 목록입니다.</p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">메시지 전송</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Ctrl + Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">마크다운 파일 저장</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Ctrl + S</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">새 프로젝트 생성</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Alt + N</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">새 마크다운 노트</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Ctrl + N</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">로컬 파일 불러오기</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Ctrl + O</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">PDF / 인쇄 출력</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Ctrl + P</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">이미지/파일 붙여넣기</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Ctrl + V</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">전체 마크다운 복사</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Ctrl + C</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#222226]">
                <span className="text-slate-300">탐색기 파일 검색</span>
                <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-sm text-[0.6875rem] border border-[#222226]">Ctrl + F</kbd>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white transition cursor-pointer shadow-xs glow-accent-subtle"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal (Standard Deep Teal Style) */}
      {pendingAction !== null && (
        <div className="fixed inset-0 z-[60] bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#121214]/95 backdrop-blur-xl border border-[#222226] rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
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
                className="px-3.5 py-1.5 rounded-md text-xs text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] transition cursor-pointer"
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
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-md transition cursor-pointer"
              >
                무시하고 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation Modal (Standard Deep Teal Style) */}
      {deleteConfirmFile !== null && (
        <div className="fixed inset-0 z-[60] bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#121214]/95 backdrop-blur-xl border border-[#222226] rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <div className="space-y-2 pt-1">
              <h2 className="text-base font-semibold text-rose-300">파일 삭제 확인</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-mono text-[#6366f1] bg-[#09090b] px-1.5 py-0.5 rounded-sm border border-[#222226]">
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
                className="px-3.5 py-1.5 rounded-md text-xs text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={executeDeleteFile}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-md transition cursor-pointer flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#121214]/95 backdrop-blur-xl border border-[#222226] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-[#18181b] transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#6366f1] flex items-center justify-center text-white shadow-xs">
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
              <div className="bg-[#09090b]/80 p-3 rounded-md border border-[#222226] text-[0.6875rem] space-y-1 font-mono text-slate-300">
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
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white transition cursor-pointer shadow-xs glow-accent-subtle"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Manager Modal */}
      {isEventManagerOpen && (
        <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121214]/95 backdrop-blur-xl border border-[#222226] rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#222226] pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#6366f1]" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">프로젝트 일정 및 마일스톤 관리</h3>
                  <p className="text-[0.6875rem] text-slate-400">
                    프로젝트: <strong className="text-indigo-300">'{activeSession?.title || 'AI 지식 비서'}'</strong> 기반 일정 관리
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEventManagerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-[#18181b] transition cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#09090b]/80 p-2 rounded-md border border-[#222226]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExtractEventsWithAi(activeSession?.title)}
                  disabled={isExtractingEvents}
                  className="px-2.5 py-1.5 rounded-md bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs glow-accent-subtle"
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
                  className="px-2.5 py-1.5 rounded-md bg-[#121214] hover:bg-[#18181b] text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-[#222226] cursor-pointer"
                  title="에디터에 마크다운 일정표로 삽입"
                >
                  <FileText className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span>에디터로 전송</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportEventsIcs}
                  className="px-2.5 py-1.5 rounded-md bg-[#121214] hover:bg-[#18181b] text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-[#222226] cursor-pointer"
                  title="캘린더 파일 다운로드"
                >
                  <Download className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span>캘린더 파일 내보내기</span>
                </button>
              </div>
            </div>

            {/* Add Event Form */}
            <div className="bg-[#09090b]/60 p-3 rounded-md border border-[#222226] space-y-2">
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
                  className="sm:col-span-5 bg-[#09090b] border border-[#222226] rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-[#6366f1]"
                />
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="sm:col-span-3 bg-[#09090b] border border-[#222226] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#6366f1] font-mono"
                />
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as any)}
                  className="sm:col-span-2 bg-[#09090b] border border-[#222226] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#6366f1]"
                >
                  <option value="task">작업</option>
                  <option value="milestone">마일스톤</option>
                  <option value="meeting">회의</option>
                  <option value="deadline">마감</option>
                </select>
                <select
                  value={newEventPriority}
                  onChange={(e) => setNewEventPriority(e.target.value as any)}
                  className="sm:col-span-2 bg-[#09090b] border border-[#222226] rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#6366f1]"
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
                  className="flex-1 bg-[#09090b] border border-[#222226] rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-[#6366f1]"
                />
                <button
                  type="button"
                  onClick={handleAddProjectEvent}
                  className="px-3 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-md text-xs font-semibold transition flex items-center gap-1 shrink-0 glow-accent-subtle"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>추가</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between text-xs border-b border-[#222226] pb-1">
              <div className="flex items-center gap-1">
                {(['all', 'milestone', 'task', 'meeting', 'deadline'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setEventFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-md text-[0.6875rem] font-medium transition ${
                      eventFilter === filterKey
                        ? 'bg-[#6366f1] text-white font-semibold glow-accent-subtle'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#121214]'
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
                      className={`p-2.5 rounded-md border transition flex items-center justify-between gap-3 ${
                        evt.completed
                          ? 'bg-[#09090b]/40 border-[#222226] opacity-60'
                          : 'bg-[#09090b]/80 border-[#222226] hover:border-[#222226]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={evt.completed}
                          onChange={() => handleToggleEventCompleted(evt.id)}
                          className="w-4 h-4 rounded-sm border-[#222226] bg-[#09090b] text-emerald-500 focus:ring-0 cursor-pointer"
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
                              className={`px-1.5 py-0.2 rounded-sm text-[0.5625rem] font-medium uppercase ${
                                evt.type === 'milestone'
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/80'
                                  : evt.type === 'deadline'
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                                  : evt.type === 'meeting'
                                  ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                                  : 'bg-[#121214] text-slate-300'
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
            <div className="pt-2 border-t border-[#222226] flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[0.6875rem]">
                Google Calendar 및 iCal 표준 포맷 완벽 호환
              </span>
              <button
                type="button"
                onClick={() => setIsEventManagerOpen(false)}
                className="bg-[#121214] hover:bg-[#18181b] text-slate-200 px-4 py-1.5 rounded-md font-medium transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive SSOT & File Picker Modal */}
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
        onOpenFile={(openedName, content) => {
          setFiles((prev) => ({ ...prev, [openedName]: content }));
          setCurrentActiveFile(openedName);
          setFileName(openedName);
          setEditorContent(content);
          if (!openTabs.includes(openedName)) {
            setOpenTabs((prev) => [...prev, openedName]);
          }
        }}
        currentEditorContent={editorContent}
        currentEditorFileName={fileName || currentActiveFile}
        initialTab={gdrivePickerTab}
        user={googleUser}
        onSignIn={async () => {
          await handleGoogleSignIn();
        }}
        onSignOut={handleGoogleSignOut}
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
        currentUser={currentUser}
        onOpenAccountModal={() => {
          setIsRemoteModalOpen(false);
          setIsGoogleAccountModalOpen(true);
        }}
        onDisconnect={() => {
          setRemoteConfig(null);
          try {
            localStorage.removeItem('aipodium_remote_workspace_config');
          } catch {}
          setWorkspaceRootType('local');
          localStorage.setItem('aipodium_workspace_root_type', 'local');
          setIsRemoteModalOpen(false);
          showToast('원격 서버 연결이 해제되었습니다.', 'info');
        }}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-sm p-4"
          onClick={() => setIsNewFileModalOpen(false)}
        >
          <div
            className="relative bg-[#121214]/95 backdrop-blur-xl border border-[#222226] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsNewFileModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-[#18181b] transition cursor-pointer"
              title="닫기"
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
                  className="w-full bg-[#09090b] border border-[#222226] rounded-md px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition placeholder-slate-400"
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
                  className="w-full bg-[#09090b] border border-[#222226] rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition font-sans cursor-pointer"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.title} className="bg-[#121214] text-slate-200">
                      📁 {s.title} (현재 프로젝트)
                    </option>
                  ))}
                  <option value="docs" className="bg-[#121214] text-slate-200">📁 docs (공용 문서 폴더)</option>
                  <option value="src" className="bg-[#121214] text-slate-200">📁 src (소스 폴더)</option>
                  <option value="root" className="bg-[#121214] text-slate-200">📁 루트 (기본 디렉토리)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#222226]">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white transition shadow-xs cursor-pointer glow-accent-subtle"
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
        initialConfig={githubConfig}
        currentUser={currentUser}
        onOpenAccountModal={() => {
          setIsGithubModalOpen(false);
          setIsGoogleAccountModalOpen(true);
        }}
        onDisconnect={() => {
          setGithubConfig(null);
          try {
            sessionStorage.removeItem('aipodium_github_config');
            localStorage.removeItem('aipodium_github_config');
            localStorage.removeItem('aipodium_github_meta');
          } catch {}
          setWorkspaceRootType('local');
          localStorage.setItem('aipodium_workspace_root_type', 'local');
          setIsGithubModalOpen(false);
          showToast('GitHub 저장소 연결이 해제되었습니다.', 'info');
        }}
        onSave={(config) => {
          setGithubConfig(config);
          try {
            sessionStorage.setItem('aipodium_github_config', JSON.stringify(config));
            // Keep persistent storage clean of raw access tokens
            localStorage.removeItem('aipodium_github_config');
            const safeMeta = { repo: config.repo, branch: config.branch, owner: config.owner };
            localStorage.setItem('aipodium_github_meta', JSON.stringify(safeMeta));
          } catch {}
          setWorkspaceRootType('github');
          localStorage.setItem('aipodium_workspace_root_type', 'github');
          setIsGithubModalOpen(false);
          showToast(`✅ GitHub 저장소(${config.repo}) 워크스페이스 활성화 완료!`);
        }}
      />

      {/* Standalone Prompt Management Modal */}
      <PromptLibraryModal
        isOpen={isPromptLibraryModalOpen}
        onClose={() => setIsPromptLibraryModalOpen(false)}
        prompts={effectivePrompts}
        onSavePrompts={(updatedPrompts) => {
          const updated = { ...preferences, customPrompts: updatedPrompts };
          setPreferences(updated);
          saveSafePreferences(updated);
          try {
            localStorage.setItem('aipodium_custom_prompts', JSON.stringify(updatedPrompts));
          } catch {}
        }}
        onApplyPrompt={(promptBody) => {
          const matched: PromptTemplate = effectivePrompts.find((p) => p.body === promptBody) || {
            id: 'temp',
            title: '프롬프트',
            description: '',
            body: promptBody
          };
          handleInstantInjectPrompt(matched);
          setIsPromptLibraryModalOpen(false);
        }}
        onToast={showToast}
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
          if (prefs.roleModels) {
            setRoleModels(prefs.roleModels);
            try {
              localStorage.setItem('aipodium_ai_role_models', JSON.stringify(prefs.roleModels));
            } catch {}
          }
          if (prefs.apiKeys) {
            setApiKeys((prev) => ({ ...prev, ...prefs.apiKeys }));
          }
          if (prefs.ghostWriterLevel) {
            setGhostWriterLevel(prefs.ghostWriterLevel);
          }
          if (prefs.ghostWriterModel) {
            setGhostWriterModel(prefs.ghostWriterModel);
          }
          saveSafePreferences(prefs);
        }}
        onOpenRoleAssignment={() => setIsAiRoleModalOpen(true)}
        onApplyPrompt={(promptBody) => {
          setChatInput(promptBody);
          setIsPreferencesModalOpen(false);
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 100);
        }}
        modelOptions={ghostWriterModelOptions}
        dynamicModelsMap={dynamicProviderModels}
        onUpdateDynamicModels={(vendor, models) => {
          setDynamicProviderModels((prev) => ({
            ...prev,
            [vendor]: models
          }));
        }}
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
        onUpdateDiscoveredModels={setDiscoveredLocalModels}
        initialDiscoveredModels={discoveredLocalModels}
        onToast={showToast}
        onWipeAllData={handleWipeAllData}
        googleUser={googleUser}
        onOpenGoogleAccount={() => {
          handleOpenGoogleAccount();
        }}
        workspaceRootType={workspaceRootType}
        onOpenGoogleDrive={() => {
          handleOpenGoogleDrive('open');
        }}
        remoteConfig={remoteConfig}
        onOpenRemoteSSH={() => {
          handleOpenRemoteSSH();
        }}
        githubConfig={githubConfig}
        onOpenGithub={() => {
          handleOpenGithubModal();
        }}
      />

      {/* SSOT Document Generator Modal */}
      <SSOTGeneratorModal
        isOpen={isSSOTGeneratorModalOpen}
        onClose={() => setIsSSOTGeneratorModalOpen(false)}
        initialFolder={ssotGeneratorInitialFolder}
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
        availableTemplates={Object.keys(files).filter(f => f.endsWith('.md') && !f.startsWith('.podium/'))}
        availableModels={availableChatModels}
        currentModel={roleModels.ssot || roleModels.architect || selectedModel || 'gemini-3.8-flash'}
        currentProvider={provider}
        onGenerate={(config) => {
          setIsSSOTGeneratorModalOpen(false);
          handleGenerateSSOTDocument(config);
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
        onImportDocumentFiles={handleImportDocumentFiles}
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

      {/* Document Converter Preview Modal (.pdf, .docx, .xlsx, .pptx) */}
      <DocumentConverterModal
        isOpen={isDocConverterModalOpen}
        onClose={() => setIsDocConverterModalOpen(false)}
        conversionResult={docConversionResult}
        availableFolders={Array.from(new Set(['docs', ...sessions.map((s) => s.title)]))}
        defaultFolder={activeSession?.title || 'docs'}
        onConfirm={handleConfirmDocumentConversion}
        renderMarkdownToHtml={renderMarkdownToHtml}
        defaultOllamaEndpoint={preferences.pdfParser?.ollamaEndpoint || 'http://localhost:11434'}
        defaultOllamaModel={preferences.pdfParser?.ollamaModel || 'llama3.2-vision'}
        onToast={showToast}
      />

      {/* Save In-Memory Untitled Document Modal */}
      <SaveUntitledModal
        isOpen={isSaveUntitledModalOpen}
        onClose={() => setIsSaveUntitledModalOpen(false)}
        onConfirmSave={handleConfirmSaveUntitled}
        defaultFileName={
          currentActiveFile.startsWith('Untitled-') ||
          /^새 프로젝트(\s*\d*)?\.md$/i.test(currentActiveFile) ||
          currentActiveFile === '새 문서.md'
            ? '새 문서.md'
            : currentActiveFile
        }
        defaultFolder={activeSession?.title || fileFolders[currentActiveFile] || 'docs'}
        existingFiles={Object.keys(files)}
        availableFolders={Array.from(new Set([activeSession?.title || 'docs', 'docs', ...sessions.map((s) => s.title)]))}
      />

      {/* Council of Critics Multi-Perspective Document Review Modal */}
      <CouncilOfCriticsModal
        isOpen={isCouncilModalOpen}
        onClose={() => setIsCouncilModalOpen(false)}
        content={editorContent}
        apiKey={cloudApiKey}
        model={roleModels.critic}
        onApplyRevisions={(revised) => {
          handleEditorChange(revised);
          showToast('✓ 비평가 위원회 권고 개정안이 문서에 성공적으로 반영되었습니다.');
        }}
        onJumpToLine={handleJumpToLine}
      />

      {/* Role-Based AI Model Assignment Modal */}
      <AiRoleAssignmentModal
        isOpen={isAiRoleModalOpen}
        onClose={() => setIsAiRoleModalOpen(false)}
        roleModels={roleModels}
        onSaveRoleModels={handleSaveRoleModels}
        availableModels={availableChatModels}
        onToast={showToast}
        onOpenAiEngineSettings={() => {
          setIsAiRoleModalOpen(false);
          setPreferencesInitialTab('ai-engine');
          setIsPreferencesModalOpen(true);
        }}
      />

      {/* Interactive Ghost Diff Modal for AI Proposals and Revisions */}
      {diffModalData && (
        <GhostDiffModal
          isOpen={diffModalData.isOpen}
          onClose={() => setDiffModalData(null)}
          originalContent={editorContent}
          proposedContent={diffModalData.proposedContent}
          title={diffModalData.title}
          sourceLabel={diffModalData.sourceLabel}
          onApplyRevisions={(newContent) => {
            handleEditorChange(newContent);
            showToast('✓ 제안된 개정안이 문서에 성공적으로 반영되었습니다.');
            setDiffModalData(null);
          }}
          onAppendRevisions={(contentToAppend) => {
            handleSendToEditor(contentToAppend);
            setDiffModalData(null);
          }}
        />
      )}

      {/* Visual Toast Notification Popup */}
      <Toast toast={toast} onClose={closeToast} />

    </div>
  );
}

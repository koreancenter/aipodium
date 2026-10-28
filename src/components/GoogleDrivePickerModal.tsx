import React, { useState, useEffect } from 'react';
import { HelpTooltip } from './HelpTooltip';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  Check,
  X,
  RotateCw,
  Search,
  HardDrive,
  CheckCircle2,
  FileText,
  Code2,
  Download,
  Upload,
  ExternalLink,
  LogOut,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import {
  googleDriveService,
  ensureGoogleScriptsLoaded,
  DriveItem,
  DriveFolderInfo,
  GoogleUserProfile,
} from '../services/googleDriveService';
import { convertDocumentToMarkdown } from '../services/documentConverterService';

import { useLanguage } from '../context/LanguageContext';
import { getDriveSecurityTranslations } from '../locales/driveSecurityLocale';

export interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder?: (folder: DriveFolderInfo) => void;
  currentFolder?: DriveFolderInfo | null;
  onToast: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  onOpenFile?: (fileName: string, content: string) => void;
  currentEditorContent?: string;
  currentEditorFileName?: string;
  initialTab?: 'open' | 'save' | 'folders';
  user?: GoogleUserProfile | null;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => void;
}

type TabType = 'open' | 'save' | 'folders';
type FilterType = 'all' | 'markdown' | 'html';

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFolder,
  currentFolder,
  onToast,
  onOpenFile,
  currentEditorContent = '',
  currentEditorFileName = 'document.md',
  initialTab = 'open',
  user,
  onSignIn,
  onSignOut,
}) => {
  const { language } = useLanguage();
  const t = getDriveSecurityTranslations(language).drivePicker;
  const DRIVE_UNAVAILABLE_MESSAGE = t.unavailable;
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Folder state
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolder?.id || 'root');
  const [selectedFolderName, setSelectedFolderName] = useState<string>(currentFolder?.name || t.rootFolder);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  // File list state
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null);

  // Save state
  const [saveFileName, setSaveFileName] = useState<string>(currentEditorFileName);
  const [saveFormat, setSaveFormat] = useState<'markdown' | 'html'>('markdown');
  const [saveTargetFolderId, setSaveTargetFolderId] = useState<string>('root');

  // Loading & auth status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [missingConfigWarning, setMissingConfigWarning] = useState<string | null>(null);
  const isDriveConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [authStatus, setAuthStatus] = useState<'connected' | 'expired' | 'disconnected'>(
    googleDriveService.getTokenStatus()
  );
  const [currentUserProfile, setCurrentUserProfile] = useState<GoogleUserProfile | null>(
    user || googleDriveService.getUserProfile()
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSaveFileName(currentEditorFileName || 'document.md');
      setSaveFormat(currentEditorFileName?.endsWith('.html') ? 'html' : 'markdown');
      setMissingConfigWarning(null);
      refreshAuthAndData();
    }
  }, [isOpen, initialTab, currentEditorFileName]);

  const refreshAuthAndData = async () => {
    const status = googleDriveService.getTokenStatus();
    setAuthStatus(status);
    setCurrentUserProfile(googleDriveService.getUserProfile());

    if (status === 'connected') {
      await Promise.all([loadFolders(), loadFiles()]);
    }
  };

  const loadFolders = async () => {
    try {
      const items = await googleDriveService.listFolders('root');
      setFolders(items);
    } catch (e: any) {
      console.warn('Load folders warning:', e);
    }
  };

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const items = await googleDriveService.listFiles('root', filterType);
      setFiles(items);
    } catch (e: any) {
      console.warn('Load files warning:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && authStatus === 'connected') {
      loadFiles();
    }
  }, [filterType]);

  /**
   * File Ingestion Pipeline:
   * Downloads content via ?alt=media with Authorization Bearer header,
   * converts via documentConverterService, and inserts into active workspace.
   */
  const handleFileIngestion = async (
    fileId: string,
    fileName: string,
    mimeType?: string,
    tokenOverride?: string
  ) => {
    setIsLoading(true);
    try {
      const token = tokenOverride || googleDriveService.getAccessToken();
      if (!token) {
        throw new Error(t.errInvalidToken);
      }

      onToast(t.fetching(fileName), 'info');

      let fileBlob: Blob;

      // Special handling for Google Docs format
      if (mimeType === 'application/vnd.google-apps.document') {
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (exportRes.ok) {
          const text = await exportRes.text();
          fileBlob = new Blob([text], { type: 'text/plain' });
        } else {
          const mediaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!mediaRes.ok) throw new Error(t.downloadFailed(mediaRes.status));
          fileBlob = await mediaRes.blob();
        }
      } else {
        const mediaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!mediaRes.ok) {
          throw new Error(t.downloadFailed(mediaRes.status));
        }
        fileBlob = await mediaRes.blob();
      }

      const fileObj = new File([fileBlob], fileName, {
        type: mimeType || fileBlob.type || 'application/octet-stream',
      });

      const conversion = await convertDocumentToMarkdown(fileObj);
      const finalName = conversion.suggestedFileName || (fileName.endsWith('.md') ? fileName : `${fileName}.md`);
      const finalMarkdown = conversion.markdown;

      if (onOpenFile) {
        onOpenFile(finalName, finalMarkdown);
      }

      onToast(t.imported(finalName), 'success');
      onClose();
    } catch (e: any) {
      console.error('File ingestion failed:', e);
      onToast(t.convertFailed(e?.message || t.fileLoadFallback), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Builds and displays the official Google Picker dialog
   */
  const createAndShowPicker = (accessToken: string) => {
    const google = (window as any).google;
    if (!google?.picker) {
      onToast(t.pickerNotReady, 'error');
      return;
    }

    try {
      const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setMode(google.picker.DocsViewMode.LIST);

      const pickerBuilder = new google.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(accessToken)
        .setLocale('ko')
        .setTitle(t.pickerDocTitle)
        .setCallback(async (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs?.[0];
            if (doc) {
              await handleFileIngestion(doc.id, doc.name, doc.mimeType, accessToken);
            }
          }
        });

      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (apiKey) {
        pickerBuilder.setDeveloperKey(apiKey);
      }

      const picker = pickerBuilder.build();
      picker.setVisible(true);
    } catch (err: any) {
      console.error('Failed to create Google Picker:', err);
      onToast(t.pickerCreateError(err?.message || t.pickerOpenFallback), 'error');
    }
  };

  /**
   * Launch Google Picker on demand with robust GIS OAuth flow
   */
  const openGooglePicker = async (existingToken?: string) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set; Google Drive is disabled.');
      setMissingConfigWarning(DRIVE_UNAVAILABLE_MESSAGE);
      return;
    }
    setMissingConfigWarning(null);

    setIsConnecting(true);
    try {
      await ensureGoogleScriptsLoaded();
      const google = (window as any).google;

      const validToken =
        existingToken ||
        (googleDriveService.hasValidToken() ? googleDriveService.getAccessToken() : null);

      if (validToken) {
        createAndShowPicker(validToken);
        setIsConnecting(false);
        return;
      }

      if (!google?.accounts?.oauth2) {
        throw new Error(t.errScriptLoad);
      }

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
          if (response.error) {
            console.error('Google Auth Error:', response);
            onToast(t.authError(response.error_description || response.error), 'error');
            setIsConnecting(false);
            return;
          }
          if (response.access_token) {
            googleDriveService.setToken(response.access_token, response.expires_in || 3599);
            setAuthStatus('connected');
            try {
              const profile = await googleDriveService.fetchUserProfile();
              setCurrentUserProfile(profile);
            } catch (e) {}
            createAndShowPicker(response.access_token);
          }
          setIsConnecting(false);
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      console.error('Google Picker initialization failed:', err);
      onToast(t.connectError(err?.message || t.scriptLoadFallback), 'error');
      setIsConnecting(false);
    }
  };

  const handleOnDemandConnect = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set; Google Drive is disabled.');
      setMissingConfigWarning(DRIVE_UNAVAILABLE_MESSAGE);
      return;
    }
    setMissingConfigWarning(null);

    setIsConnecting(true);
    try {
      await ensureGoogleScriptsLoaded();
      const google = (window as any).google;

      if (google?.accounts?.oauth2) {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: async (response: any) => {
            if (response.error) {
              console.error('Google Auth Error:', response);
              onToast(t.googleAuthError(response.error_description || response.error), 'error');
              setIsConnecting(false);
              return;
            }
            if (response.access_token) {
              googleDriveService.setToken(response.access_token, response.expires_in || 3599);
              setAuthStatus('connected');
              try {
                const profile = await googleDriveService.fetchUserProfile();
                setCurrentUserProfile(profile);
              } catch (e) {}
              onToast(t.connectDone, 'success');
              await Promise.all([loadFolders(), loadFiles()]);
              createAndShowPicker(response.access_token);
            }
            setIsConnecting(false);
          },
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else if (onSignIn) {
        await onSignIn();
        setAuthStatus('connected');
        await Promise.all([loadFolders(), loadFiles()]);
        setIsConnecting(false);
      } else {
        const { profile } = await googleDriveService.signIn();
        setCurrentUserProfile(profile);
        setAuthStatus('connected');
        onToast(t.connectDone, 'success');
        await Promise.all([loadFolders(), loadFiles()]);
        setIsConnecting(false);
      }
    } catch (e: any) {
      console.error('Google Drive On-Demand Connect failed:', e);
      onToast(t.linkError(e.message || t.authFallback), 'error');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      googleDriveService.clearToken();
    }
    setAuthStatus('disconnected');
    setCurrentUserProfile(null);
    setFiles([]);
    setFolders([]);
    onToast(t.disconnected, 'info');
  };

  // Import file to editor
  const handleImportFile = async () => {
    if (!selectedFile) {
      onToast(t.pickFile, 'warn');
      return;
    }

    await handleFileIngestion(selectedFile.id, selectedFile.name, selectedFile.mimeType);
  };

  // Save current editor content to Drive
  const handleSaveToDrive = async () => {
    if (!saveFileName.trim()) {
      onToast(t.enterFileName, 'warn');
      return;
    }

    let finalName = saveFileName.trim();
    if (saveFormat === 'markdown' && !finalName.endsWith('.md') && !finalName.endsWith('.markdown')) {
      finalName += '.md';
    } else if (saveFormat === 'html' && !finalName.endsWith('.html') && !finalName.endsWith('.htm')) {
      finalName += '.html';
    }

    setIsLoading(true);
    try {
      const saved = await googleDriveService.saveFile(
        finalName,
        currentEditorContent,
        saveTargetFolderId
      );
      onToast(t.saved(saved.name), 'success');
      await loadFiles();
      onClose();
    } catch (e: any) {
      console.error('Failed to save file to Drive:', e);
      onToast(t.saveFailed, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsLoading(true);
    try {
      const created = await googleDriveService.createFolder(newFolderName.trim(), 'root');
      onToast(t.folderCreated(created.name), 'success');
      setNewFolderName('');
      setIsCreatingFolder(false);
      await loadFolders();
      setSelectedFolderId(created.id);
      setSelectedFolderName(created.name);
    } catch (e) {
      onToast(t.folderCreateFailed, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Set SSOT workspace folder
  const handleConfirmFolder = () => {
    const folderInfo: DriveFolderInfo = {
      id: selectedFolderId,
      name: selectedFolderName,
      path: `/${selectedFolderName}`,
    };
    googleDriveService.setSavedSsotFolder(folderInfo);
    if (onSelectFolder) {
      onSelectFolder(folderInfo);
    }
    onToast(t.defaultFolderSet(selectedFolderName), 'success');
    onClose();
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '0 B';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="google-drive-picker-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="google-drive-picker-container"
        className="relative bg-[#121214] border border-[#222226] rounded-lg max-w-2xl w-full p-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans h-[620px] max-h-[calc(100vh-3rem)] flex flex-col shrink-0 gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-[#222226] pb-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-sm font-medium text-zinc-200 tracking-tight flex items-center gap-2">
                {t.heading}
                {authStatus === 'connected' ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t.statusConnected}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                    {t.statusDisconnected}
                  </span>
                )}
                <HelpTooltip
                  title={t.heading}
                  content={t.helpContent}
                  side="bottom"
                />
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authStatus === 'connected' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#09090b] border border-white/10 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-zinc-300 font-medium truncate max-w-[140px]">
                    {currentUserProfile?.name || currentUserProfile?.email || t.linked}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-2.5 py-1 rounded text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  title={t.disconnectTitle}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.disconnect}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-white/5 transition cursor-pointer"
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Flat IDE Tab Style */}
        {authStatus === 'connected' && (
          <div className="flex items-center justify-between border-b border-[#222226] shrink-0 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('open')}
                className={`px-3.5 py-2 font-medium flex items-center transition cursor-pointer border-b-2 -mb-[1px] ${
                  activeTab === 'open'
                    ? 'border-indigo-500 text-indigo-300 bg-[#09090b]/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#09090b]/25'
                }`}
              >
                <span>{t.tabOpen}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('save')}
                className={`px-3.5 py-2 font-medium flex items-center transition cursor-pointer border-b-2 -mb-[1px] ${
                  activeTab === 'save'
                    ? 'border-indigo-500 text-indigo-300 bg-[#09090b]/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#09090b]/25'
                }`}
              >
                <span>{t.tabSave}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('folders')}
                className={`px-3.5 py-2 font-medium flex items-center transition cursor-pointer border-b-2 -mb-[1px] ${
                  activeTab === 'folders'
                    ? 'border-indigo-500 text-indigo-300 bg-[#09090b]/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#09090b]/25'
                }`}
              >
                <span>{t.tabFolder}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                loadFolders();
                loadFiles();
              }}
              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition cursor-pointer"
              title={t.refresh}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        )}

        {/* Missing Config Warning Indicator */}
        {missingConfigWarning && (
          <div
            id="google-drive-missing-config-warning"
            className="bg-amber-950/40 border border-amber-800/60 rounded px-3 py-2 text-xs flex items-center justify-between text-amber-200 shrink-0 animate-in fade-in duration-100"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{missingConfigWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setMissingConfigWarning(null)}
              className="text-amber-400 hover:text-amber-200 p-0.5 rounded cursor-pointer"
              title={t.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* BODY AREA: Unified Disconnected Hero State OR Connected Tab Viewports */}
        {authStatus !== 'connected' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
              <HardDrive className="w-6 h-6 text-zinc-300" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-sm font-medium text-zinc-200">{t.needLinkTitle}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {t.needLinkDesc}
              </p>
            </div>
            <button
              type="button"
              id="google-drive-connect-btn"
              onClick={handleOnDemandConnect}
              disabled={isConnecting || !isDriveConfigured}
              title={isDriveConfigured ? undefined : DRIVE_UNAVAILABLE_MESSAGE}
              className="px-4 py-2 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
            >
              <span>{isConnecting ? t.connecting : t.connect}</span>
            </button>
            {!isDriveConfigured && (
              <p className="text-[11px] text-zinc-500 max-w-sm">{DRIVE_UNAVAILABLE_MESSAGE}</p>
            )}
          </div>
        ) : (
          <>
            {/* TAB 1: FILE IMPORT */}
            {activeTab === 'open' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Filter, Search & Google Picker Launch */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-[#09090b] p-0.5 rounded border border-[#222226] text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded transition cursor-pointer ${
                        filterType === 'all' ? 'bg-[#18181b] text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.filterAll(files.length)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('markdown')}
                      className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                        filterType === 'markdown' ? 'bg-[#18181b] text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-indigo-400" />
                      {t.filterMarkdown}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('html')}
                      className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                        filterType === 'html' ? 'bg-[#18181b] text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileCode className="w-3 h-3 text-amber-400" />
                      {t.filterHtml}
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-[#09090b] border border-[#222226] rounded px-2.5 py-1 pl-8 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition"
                    />
                  </div>

                  <button
                    type="button"
                    id="google-picker-launch-btn"
                    onClick={() => openGooglePicker()}
                    disabled={isConnecting}
                    className="btn-secondary text-xs flex items-center justify-center px-3 py-1 bg-[#18181b] border-indigo-500/40 hover:border-indigo-400 text-indigo-300 shrink-0 cursor-pointer"
                    title={t.openPicker}
                  >
                    <span>{t.pickWithPicker}</span>
                  </button>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1 border border-[#222226] rounded p-1.5 bg-[#09090b] custom-scrollbar">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFile?.id === file.id;
                    const isHtml = file.name.endsWith('.html') || file.mimeType === 'text/html';

                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer border transition text-xs ${
                          isSelected
                            ? 'bg-[#18181b] border-indigo-500 text-white'
                            : 'bg-[#0c0c0e] border-[#222226] hover:bg-[#18181b] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isHtml ? (
                            <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{file.name}</div>
                            <div className="text-[0.625rem] text-slate-500 font-mono flex items-center gap-2">
                              <span>{t.size(formatFileSize(file.size))}</span>
                              {file.modifiedTime && (
                                <span>{t.modified(new Date(file.modifiedTime).toLocaleDateString())}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </div>
                    );
                  })}

                  {filteredFiles.length === 0 && !isLoading && (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      <FileText className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p>{searchQuery ? t.noMatch : t.noFiles}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {t.uploadHint}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Actions for Tab 1 */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#222226] shrink-0">
                  <div className="text-xs text-slate-400 truncate">
                    {selectedFile ? (
                      <span className="flex items-center gap-1.5 text-slate-200">
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                        {t.selected} <span className="font-mono text-indigo-300">{selectedFile.name}</span>
                      </span>
                    ) : (
                      <span>{t.selectFromList}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-ghost text-xs"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={!selectedFile || isLoading}
                      onClick={handleImportFile}
                      className="btn-primary text-xs"
                    >
                      <span>{t.loadIntoEditor}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SAVE TO DRIVE */}
            {activeTab === 'save' && (
              <div className="flex-1 flex flex-col justify-between min-h-0 space-y-4">
                <div className="space-y-3 bg-[#09090b] border border-[#222226] p-3.5 rounded">
                  {/* File Name Input */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">{t.fileNameLabel}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={saveFileName}
                        onChange={(e) => setSaveFileName(e.target.value)}
                        placeholder={t.fileNamePlaceholder}
                        className="flex-1 bg-[#0c0c0e] border border-[#222226] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-400"
                      />
                      <div className="flex items-center gap-1 bg-[#0c0c0e] p-1 rounded border border-[#222226] text-xs shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSaveFormat('markdown');
                            if (saveFileName.endsWith('.html')) {
                              setSaveFileName(saveFileName.replace(/\.html$/, '.md'));
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                            saveFormat === 'markdown'
                              ? 'bg-indigo-600 text-white font-medium'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {t.filterMarkdown}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSaveFormat('html');
                            if (saveFileName.endsWith('.md')) {
                              setSaveFileName(saveFileName.replace(/\.md$/, '.html'));
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                            saveFormat === 'html'
                              ? 'bg-indigo-600 text-white font-medium'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          HTML
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Target Folder Selector */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">{t.targetFolder}</label>
                    <select
                      value={saveTargetFolderId}
                      onChange={(e) => setSaveTargetFolderId(e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#222226] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                    >
                      <option value="root">{t.rootFolder}</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Content Preview Details */}
                  <div className="p-2.5 bg-[#0c0c0e] rounded border border-[#222226] text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{t.editorLength(currentEditorContent.length)}</span>
                    <span>{t.format(saveFormat === 'markdown')}</span>
                  </div>
                </div>

                {/* Bottom Actions for Tab 2 */}
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#222226] shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-ghost text-xs"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={!saveFileName.trim() || isLoading}
                    onClick={handleSaveToDrive}
                    className="btn-primary text-xs"
                  >
                    <span>{isLoading ? t.saving : t.saveToDrive}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: FOLDERS & DEFAULT PATH CONFIG */}
            {activeTab === 'folders' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Active Selected Folder Display */}
                <div className="bg-[#09090b] border border-[#222226] rounded px-3 py-2 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2 text-slate-300 truncate">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-slate-400 text-xs shrink-0">{t.selectedFolder}</span>
                    <span className="font-mono text-slate-200 truncate flex items-center gap-1">
                      <FolderOpen className="w-3 h-3 text-indigo-400" />
                      {selectedFolderName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                    className="btn-secondary text-xs"
                  >
                    <span>{t.newFolder}</span>
                  </button>
                </div>

                {/* New Folder Inline Form */}
                {isCreatingFolder && (
                  <form
                    onSubmit={handleCreateFolder}
                    className="p-2 bg-[#09090b] border border-[#222226] rounded flex items-center gap-2 shrink-0"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={t.newFolderPlaceholder}
                      autoFocus
                      className="flex-1 bg-[#0c0c0e] border border-[#222226] rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={!newFolderName.trim() || isLoading}
                      className="btn-primary text-xs"
                    >
                      {t.create}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(false)}
                      className="btn-ghost text-xs"
                    >
                      {t.cancel}
                    </button>
                  </form>
                )}

                {/* Folder List */}
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1 border border-[#222226] rounded p-1.5 bg-[#09090b] custom-scrollbar">
                  {/* Root Choice */}
                  <div
                    onClick={() => {
                      setSelectedFolderId('root');
                      setSelectedFolderName(t.rootFolder);
                    }}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer border transition ${
                      selectedFolderId === 'root'
                        ? 'bg-[#18181b] border-indigo-500 text-white'
                        : 'bg-[#0c0c0e] border-[#222226] hover:bg-[#18181b] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-normal">{t.rootFolder}</div>
                        <div className="text-[0.625rem] text-slate-500 font-mono">{t.rootFolderShort}</div>
                      </div>
                    </div>
                    {selectedFolderId === 'root' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                  </div>

                  {filteredFolders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id;
                    return (
                      <div
                        key={folder.id}
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          setSelectedFolderName(folder.name);
                        }}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer border transition ${
                          isSelected
                            ? 'bg-[#18181b] border-indigo-500 text-white'
                            : 'bg-[#0c0c0e] border-[#222226] hover:bg-[#18181b] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-normal truncate">{folder.name}</div>
                            <div className="text-[0.625rem] text-slate-500 font-mono">ID: {folder.id}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Actions for Tab 3 */}
                <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-[#222226] shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-ghost text-xs"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmFolder}
                    className="btn-primary text-xs"
                  >
                    <span>{t.setAsDefault}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

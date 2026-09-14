import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  LogOut,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import {
  googleDriveService,
  DriveItem,
  DriveFolderInfo,
  GoogleUserProfile,
} from '../services/googleDriveService';

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
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Folder state
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolder?.id || 'root');
  const [selectedFolderName, setSelectedFolderName] = useState<string>(currentFolder?.name || '구글 드라이브 최상위 폴더');
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

  const handleOnDemandConnect = async () => {
    setIsConnecting(true);
    try {
      if (onSignIn) {
        await onSignIn();
      } else {
        const { profile } = await googleDriveService.signIn();
        setCurrentUserProfile(profile);
      }
      setAuthStatus('connected');
      onToast('✨ 구글 드라이브 연동이 완료되었습니다!', 'success');
      await Promise.all([loadFolders(), loadFiles()]);
    } catch (e: any) {
      console.error('Google Drive On-Demand Connect failed:', e);
      onToast(`연동 오류: ${e.message || '인증에 실패했습니다.'}`, 'error');
    } finally {
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
    onToast('구글 드라이브 연동이 해제되었습니다.', 'info');
  };

  // Import file to editor
  const handleImportFile = async () => {
    if (!selectedFile) {
      onToast('불러올 파일을 선택해주세요.', 'warn');
      return;
    }

    setIsLoading(true);
    try {
      const content = await googleDriveService.readFile(selectedFile.id);
      if (onOpenFile) {
        onOpenFile(selectedFile.name, content);
      }
      onToast(`📥 '${selectedFile.name}' 파일을 에디터로 불러왔습니다.`, 'success');
      onClose();
    } catch (e: any) {
      console.error('Failed to import file:', e);
      onToast('파일을 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Save current editor content to Drive
  const handleSaveToDrive = async () => {
    if (!saveFileName.trim()) {
      onToast('저장할 파일 이름을 입력해주세요.', 'warn');
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
      onToast(`💾 '${saved.name}' 파일이 구글 드라이브에 안전하게 저장되었습니다!`, 'success');
      await loadFiles();
      onClose();
    } catch (e: any) {
      console.error('Failed to save file to Drive:', e);
      onToast('구글 드라이브 파일 저장에 실패했습니다.', 'error');
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
      onToast(`'${created.name}' 폴더가 생성되었습니다.`, 'success');
      setNewFolderName('');
      setIsCreatingFolder(false);
      await loadFolders();
      setSelectedFolderId(created.id);
      setSelectedFolderName(created.name);
    } catch (e) {
      onToast('폴더 생성에 실패했습니다.', 'error');
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
    onToast(`구글 드라이브 기본 작업 폴더가 [${selectedFolderName}] (으)로 설정되었습니다.`, 'success');
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
        className="relative bg-[#1e202b] border border-[#2e3142] rounded-lg max-w-2xl w-full p-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans h-[620px] max-h-[calc(100vh-3rem)] flex flex-col shrink-0 gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-[#2e3142] pb-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-sm font-medium text-slate-200 tracking-tight flex items-center gap-2">
                구글 드라이브 파일 탐색기
                <span className="badge-success text-[10px] font-medium px-2 py-0.5 rounded">
                  전용 파일 보안 모드
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              계정 로그인 여부와 무관하게 구글 드라이브 파일을 안전하게 열고 저장합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {authStatus === 'connected' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121318] border border-[#2e3142] text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-300 font-medium truncate max-w-[140px]">
                    {currentUserProfile?.name || currentUserProfile?.email || '연동됨'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="btn-secondary text-xs text-rose-400 hover:text-rose-300 border-rose-900/50 hover:bg-rose-950/40"
                  title="구글 드라이브 연동 해제"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>해제</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-[#282a38] transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Flat IDE Tab Style */}
        <div className="flex items-center justify-between border-b border-[#2e3142] shrink-0 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('open')}
              className={`px-3.5 py-2 font-medium flex items-center gap-1.5 transition cursor-pointer border-b-2 -mb-[1px] ${
                activeTab === 'open'
                  ? 'border-indigo-500 text-indigo-300 bg-[#121318]/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121318]/25'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>파일 불러오기</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('save')}
              className={`px-3.5 py-2 font-medium flex items-center gap-1.5 transition cursor-pointer border-b-2 -mb-[1px] ${
                activeTab === 'save'
                  ? 'border-indigo-500 text-indigo-300 bg-[#121318]/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121318]/25'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>드라이브에 저장</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('folders')}
              className={`px-3.5 py-2 font-medium flex items-center gap-1.5 transition cursor-pointer border-b-2 -mb-[1px] ${
                activeTab === 'folders'
                  ? 'border-indigo-500 text-indigo-300 bg-[#121318]/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121318]/25'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>기본 폴더 설정</span>
            </button>
          </div>

          {authStatus === 'connected' && (
            <button
              type="button"
              onClick={() => {
                loadFolders();
                loadFiles();
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#282a38] transition cursor-pointer"
              title="새로고침"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}
        </div>

        {/* Security Info Indicator (1줄 컴팩트 안내) */}
        <div className="bg-[#121318] border border-[#2e3142] rounded px-3 py-1.5 text-xs flex items-center gap-2 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-300">
            <span className="text-emerald-400 font-medium">최소 권한 원칙:</span> 본 앱에서 열거나 생성한 전용 파일에만 안전하게 접근합니다.
          </span>
        </div>

        {/* BODY AREA: Unified Disconnected Hero State OR Connected Tab Viewports */}
        {authStatus !== 'connected' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#121318] border border-[#2e3142] rounded-lg my-auto space-y-4 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-sm font-medium text-slate-200">구글 드라이브 연동이 필요합니다</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                클라우드에 저장된 마크다운 및 HTML 문서를 즉시 불러오거나 현재 작성 중인 문서를 드라이브에 안전하게 보관할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOnDemandConnect}
              disabled={isConnecting}
              className="btn-primary text-xs px-4 py-2"
            >
              <HardDrive className="w-4 h-4" />
              <span>{isConnecting ? '연동 진행 중...' : '구글 드라이브 연결하기'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1: FILE IMPORT */}
            {activeTab === 'open' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Filter and Search */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-[#121318] p-0.5 rounded border border-[#2e3142] text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded transition cursor-pointer ${
                        filterType === 'all' ? 'bg-[#282a38] text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      전체 {files.length}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('markdown')}
                      className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                        filterType === 'markdown' ? 'bg-[#282a38] text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-indigo-400" />
                      마크다운
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('html')}
                      className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                        filterType === 'html' ? 'bg-[#282a38] text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileCode className="w-3 h-3 text-amber-400" />
                      HTML 문서
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="드라이브 파일 검색..."
                      className="w-full bg-[#121318] border border-[#2e3142] rounded px-2.5 py-1 pl-8 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition"
                    />
                  </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1 border border-[#2e3142] rounded p-1.5 bg-[#121318] custom-scrollbar">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFile?.id === file.id;
                    const isHtml = file.name.endsWith('.html') || file.mimeType === 'text/html';

                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer border transition text-xs ${
                          isSelected
                            ? 'bg-[#282a38] border-indigo-500 text-white'
                            : 'bg-[#16171e] border-[#2e3142] hover:bg-[#282a38] text-slate-300'
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
                              <span>크기: {formatFileSize(file.size)}</span>
                              {file.modifiedTime && (
                                <span>수정: {new Date(file.modifiedTime).toLocaleDateString()}</span>
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
                      <p>{searchQuery ? '검색어와 일치하는 파일이 없습니다.' : '드라이브에 저장된 파일이 없습니다.'}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        '드라이브에 저장' 탭에서 현재 문서를 먼저 업로드할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Actions for Tab 1 */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#2e3142] shrink-0">
                  <div className="text-xs text-slate-400 truncate">
                    {selectedFile ? (
                      <span className="flex items-center gap-1.5 text-slate-200">
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                        선택됨: <span className="font-mono text-indigo-300">{selectedFile.name}</span>
                      </span>
                    ) : (
                      <span>불러올 파일을 목록에서 선택하세요</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-ghost text-xs"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={!selectedFile || isLoading}
                      onClick={handleImportFile}
                      className="btn-primary text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>에디터로 불러오기</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SAVE TO DRIVE */}
            {activeTab === 'save' && (
              <div className="flex-1 flex flex-col justify-between min-h-0 space-y-4">
                <div className="space-y-3 bg-[#121318] border border-[#2e3142] p-3.5 rounded">
                  {/* File Name Input */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">저장할 파일 이름</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={saveFileName}
                        onChange={(e) => setSaveFileName(e.target.value)}
                        placeholder="예: architecture_notes.md"
                        className="flex-1 bg-[#16171e] border border-[#2e3142] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-400"
                      />
                      <div className="flex items-center gap-1 bg-[#16171e] p-1 rounded border border-[#2e3142] text-xs shrink-0">
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
                          마크다운
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
                    <label className="text-xs text-slate-300 font-medium">저장 대상 폴더</label>
                    <select
                      value={saveTargetFolderId}
                      onChange={(e) => setSaveTargetFolderId(e.target.value)}
                      className="w-full bg-[#16171e] border border-[#2e3142] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                    >
                      <option value="root">구글 드라이브 최상위 폴더</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Content Preview Details */}
                  <div className="p-2.5 bg-[#16171e] rounded border border-[#2e3142] text-[11px] text-slate-400 flex items-center justify-between">
                    <span>에디터 현재 내용: {currentEditorContent.length} 글자</span>
                    <span>형식: {saveFormat === 'markdown' ? '마크다운 문서' : 'HTML 웹 문서'}</span>
                  </div>
                </div>

                {/* Bottom Actions for Tab 2 */}
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#2e3142] shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-ghost text-xs"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={!saveFileName.trim() || isLoading}
                    onClick={handleSaveToDrive}
                    className="btn-primary text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isLoading ? '저장 중...' : '구글 드라이브에 저장'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: FOLDERS & DEFAULT PATH CONFIG */}
            {activeTab === 'folders' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Active Selected Folder Display */}
                <div className="bg-[#121318] border border-[#2e3142] rounded px-3 py-2 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2 text-slate-300 truncate">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-slate-400 text-xs shrink-0">선택된 폴더:</span>
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
                    <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>새 폴더</span>
                  </button>
                </div>

                {/* New Folder Inline Form */}
                {isCreatingFolder && (
                  <form
                    onSubmit={handleCreateFolder}
                    className="p-2 bg-[#121318] border border-[#2e3142] rounded flex items-center gap-2 shrink-0"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="새 폴더 이름 입력..."
                      autoFocus
                      className="flex-1 bg-[#16171e] border border-[#2e3142] rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={!newFolderName.trim() || isLoading}
                      className="btn-primary text-xs"
                    >
                      생성
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(false)}
                      className="btn-ghost text-xs"
                    >
                      취소
                    </button>
                  </form>
                )}

                {/* Folder List */}
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1 border border-[#2e3142] rounded p-1.5 bg-[#121318] custom-scrollbar">
                  {/* Root Choice */}
                  <div
                    onClick={() => {
                      setSelectedFolderId('root');
                      setSelectedFolderName('구글 드라이브 최상위 폴더');
                    }}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer border transition ${
                      selectedFolderId === 'root'
                        ? 'bg-[#282a38] border-indigo-500 text-white'
                        : 'bg-[#16171e] border-[#2e3142] hover:bg-[#282a38] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-normal">구글 드라이브 최상위 폴더</div>
                        <div className="text-[0.625rem] text-slate-500 font-mono">최상위 폴더</div>
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
                            ? 'bg-[#282a38] border-indigo-500 text-white'
                            : 'bg-[#16171e] border-[#2e3142] hover:bg-[#282a38] text-slate-300'
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
                <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-[#2e3142] shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-ghost text-xs"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmFolder}
                    className="btn-primary text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>기본 폴더로 지정</span>
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

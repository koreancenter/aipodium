import React, { Suspense } from 'react';
import type { GithubConfig } from '../GithubIntegrationModal';
import type { SSOTGeneratorConfig } from '../SSOTGeneratorModal';
import type { UserPreferences, PromptTemplate, PreferencesTab } from '../../types/preferences';
import type { ChatSession, ProjectEvent } from '../../types';
import type { DriveFolderInfo, GoogleUserProfile } from '../../services/googleDriveService';

import { TrashModal } from './TrashModal';
import { ShortcutsModal } from './ShortcutsModal';
import { AboutModal } from './AboutModal';
import { NewFileModal } from './NewFileModal';
import { EventManagerModal } from './EventManagerModal';
import { UnsavedChangesModal, DeleteFileModal, DeleteFolderModal, DeleteSessionModal } from './ConfirmDialogs';

// Lazy-loaded heavy modals
const GoogleDrivePickerModal = React.lazy(() =>
  import('../GoogleDrivePickerModal').then(({ GoogleDrivePickerModal: component }) => ({ default: component }))
);
const GoogleAccountModal = React.lazy(() =>
  import('../GoogleAccountModal').then(({ GoogleAccountModal: component }) => ({ default: component }))
);
const GithubIntegrationModal = React.lazy(() =>
  import('../GithubIntegrationModal').then(({ GithubIntegrationModal: component }) => ({ default: component }))
);
const PromptLibraryModal = React.lazy(() =>
  import('../PromptLibraryModal').then(({ PromptLibraryModal: component }) => ({ default: component }))
);
const PreferencesModal = React.lazy(() =>
  import('../PreferencesModal').then(({ PreferencesModal: component }) => ({ default: component }))
);
const SSOTGeneratorModal = React.lazy(() =>
  import('../SSOTGeneratorModal').then(({ SSOTGeneratorModal: component }) => ({ default: component }))
);
const WorkspaceConnectionModal = React.lazy(() =>
  import('../WorkspaceConnectionModal').then(({ WorkspaceConnectionModal: component }) => ({ default: component }))
);
const DocumentConverterModal = React.lazy(() =>
  import('../DocumentConverterModal').then(({ DocumentConverterModal: component }) => ({ default: component }))
);
const SaveUntitledModal = React.lazy(() =>
  import('../SaveUntitledModal').then(({ SaveUntitledModal: component }) => ({ default: component }))
);
const CouncilOfCriticsModal = React.lazy(() =>
  import('../CouncilOfCriticsModal').then(({ CouncilOfCriticsModal: component }) => ({ default: component }))
);
const AiRoleAssignmentModal = React.lazy(() =>
  import('../AiRoleAssignmentModal').then(({ AiRoleAssignmentModal: component }) => ({ default: component }))
);
const GhostDiffModal = React.lazy(() =>
  import('../GhostDiffModal').then(({ GhostDiffModal: component }) => ({ default: component }))
);
const AiEngineOnboardingModal = React.lazy(() =>
  import('../AiEngineOnboardingModal').then(({ AiEngineOnboardingModal: component }) => ({ default: component }))
);

export interface AppModalOrchestratorProps {
  // Confirmation Dialogs
  pendingAction: (() => void) | null;
  onCancelPendingAction: () => void;
  onProceedPendingAction: () => void;
  deleteConfirmFile: string | null;
  onCancelDeleteFile: () => void;
  onExecuteDeleteFile: () => void;
  deleteConfirmFolder: string | null;
  onCancelDeleteFolder: () => void;
  onExecuteDeleteFolder: () => void;
  deleteConfirmSession: ChatSession | null;
  onCancelDeleteSession: () => void;
  onExecuteDeleteSession: () => void;

  // Trash Modal
  isTrashOpen: boolean;
  onCloseTrash: () => void;
  trashSessions: ChatSession[];
  onRestoreSession: (id: string) => void;
  onPermanentDeleteSession: (id: string) => void;
  onEmptyTrash: () => void;

  // Shortcuts & About Modals
  isShortcutsModalOpen: boolean;
  onCloseShortcuts: () => void;
  isAboutModalOpen: boolean;
  onCloseAbout: () => void;

  // Event Manager Modal
  isEventManagerOpen: boolean;
  onCloseEventManager: () => void;
  activeSessionTitle?: string;
  projectEvents: ProjectEvent[];
  eventFilter: 'all' | 'milestone' | 'meeting' | 'deadline' | 'task';
  onFilterChange: (filter: 'all' | 'milestone' | 'meeting' | 'deadline' | 'task') => void;
  isExtractingEvents: boolean;
  onExtractEvents: () => void;
  onExportEventsToEditor: () => void;
  onExportEventsIcs: () => void;
  newEventTitle: string;
  onNewEventTitleChange: (v: string) => void;
  newEventDate: string;
  onNewEventDateChange: (v: string) => void;
  newEventType: 'milestone' | 'meeting' | 'deadline' | 'task';
  onNewEventTypeChange: (v: 'milestone' | 'meeting' | 'deadline' | 'task') => void;
  newEventPriority: 'high' | 'medium' | 'low';
  onNewEventPriorityChange: (v: 'high' | 'medium' | 'low') => void;
  newEventNotes: string;
  onNewEventNotesChange: (v: string) => void;
  onAddEvent: () => void;
  onToggleEventCompleted: (id: string) => void;
  onDeleteEvent: (id: string) => void;

  // New File Modal
  isNewFileModalOpen: boolean;
  onCloseNewFile: () => void;
  newFileNameInput: string;
  onNewFileNameChange: (v: string) => void;
  newFileFolderTarget: string;
  onNewFileFolderChange: (v: string) => void;
  sessions: ChatSession[];
  onConfirmCreateNewFile: (e: React.FormEvent) => void;
  newFileInputRef?: React.RefObject<HTMLInputElement | null>;

  // Google Drive SSOT Picker
  isGdrivePickerOpen: boolean;
  onCloseGdrivePicker: () => void;
  gdriveSsotFolder?: DriveFolderInfo | null;
  onSelectGdriveFolder?: (folder: DriveFolderInfo) => void;
  onOpenFileGdrive: (name: string, content: string) => void;
  gdrivePickerTab: 'open' | 'save' | 'folders';
  currentEditorContent: string;
  currentEditorFileName: string;
  googleUser?: GoogleUserProfile | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => void;

  // Google Account Modal
  isGoogleAccountModalOpen: boolean;
  onCloseGoogleAccount: () => void;

  // GitHub Integration Modal
  isGithubModalOpen: boolean;
  onCloseGithubModal: () => void;
  githubConfig: GithubConfig | null;
  currentUser: any;
  currentActiveFile: string;
  editorContent: string;
  onOpenGoogleAccountFromGithub: () => void;
  onDisconnectGithub: () => void;
  onSaveGithub: (config: GithubConfig, pulledData?: any) => Promise<void>;

  // Prompt Library Modal
  isPromptLibraryModalOpen: boolean;
  onClosePromptLibrary: () => void;
  effectivePrompts: PromptTemplate[];
  onSavePrompts: (prompts: PromptTemplate[]) => void;
  onApplyPromptFromLibrary: (promptBody: string) => void;

  // Preferences Modal
  isPreferencesModalOpen: boolean;
  onClosePreferences: () => void;
  preferencesInitialTab?: PreferencesTab | 'theme' | 'prompts';
  preferences: UserPreferences;
  apiKeys: Record<string, string>;
  onSavePreferences: (prefs: UserPreferences) => void;
  onOpenRoleAssignmentFromPrefs: () => void;
  onApplyPromptFromPrefs: (body: string) => void;
  ghostWriterModelOptions: any;
  dynamicProviderModels: any;
  onUpdateDynamicModels: (vendor: any, models: any) => void;
  provider: any;
  onSelectProvider: (p: any) => void;
  selectedModel: string;
  onSelectModel: (modelId: string, modelName?: string) => void;
  cloudApiKey: string;
  onUpdateApiKey: (key: string) => void;
  localEndpointAddress: string;
  onUpdateEndpoint: (endpoint: string) => void;
  isVerified: boolean;
  onVerify: () => Promise<void>;
  isVerifying: boolean;
  aiParameters: any;
  onSaveAiParameters: (params: any) => void;
  onUpdateDiscoveredModels: (models: any) => void;
  discoveredLocalModels?: any;
  initialDiscoveredModels?: any;
  onWipeAllData: () => void | Promise<void>;
  workspaceRootType?: 'github' | 'local' | 'gdrive';
  onOpenGoogleAccountFromPrefs?: () => void;
  onOpenGoogleDriveFromPrefs: () => void;
  onOpenGithubFromPrefs: () => void;

  // SSOT Generator Modal
  isSSOTGeneratorModalOpen: boolean;
  onCloseSSOTGenerator: () => void;
  ssotGeneratorInitialFolder: string;
  availableChatModels: any;
  files: Record<string, string>;
  fileFolders: Record<string, string>;
  activeSessionId: string;
  onGenerateSSOT: (config: SSOTGeneratorConfig) => void;
  onQuickDefaultModel: (modelId: string, name?: string) => void;
  getModelDisplayName: (id: string) => string;

  // Workspace Connection Modal
  isWorkspaceModalOpen: boolean;
  onCloseWorkspaceModal: () => void;
  activeWorkspace: any;
  onSelectActiveWorkspace: (ws: any) => void;
  onAddNewNoteTab: () => void;
  onImportDocumentFiles: (files: FileList | File[]) => Promise<void>;
  onOpenFileFromWorkspace: (name: string, content: string) => void;
  onOpenSSOTGeneratorFromWorkspace: () => void;
  onOpenSettingsFromWorkspace: (tab?: any) => void;

  // Document Converter Modal
  isDocConverterModalOpen: boolean;
  onCloseDocConverterModal: () => void;
  docConversionResult: any;
  onConfirmDocumentConversion: (payload: any) => Promise<void> | void;
  renderMarkdownToHtml: (md: string) => string;

  // Save Untitled Modal
  isSaveUntitledModalOpen: boolean;
  onCloseSaveUntitledModal: () => void;
  onConfirmSaveUntitled: (name: string, folder: string) => void;

  // Council of Critics Modal
  isCouncilModalOpen: boolean;
  onCloseCouncilModal: () => void;
  roleModels: any;
  onApplyCriticRevisions: (revised: string) => void;
  onJumpToLine: (line: number) => void;

  // Role Assignment Modal
  isAiRoleModalOpen: boolean;
  onCloseAiRoleModal: () => void;
  onSaveRoleModels: (newRoles: any) => void;
  onOpenAiEngineSettingsFromRoles: () => void;

  // Ghost Diff Modal
  diffModalData: {
    isOpen: boolean;
    proposedContent: string;
    title?: string;
    sourceLabel?: string;
  } | null;
  onCloseDiffModal: () => void;
  onApplyDiffRevisions: (newContent: string) => void;
  onAppendDiffRevisions: (content: string) => void;

  // AI Engine Onboarding Modal
  isEngineOnboardingOpen: boolean;
  onCloseEngineOnboarding: () => void;
  webllmProgress: any;
  onStartWebLlmDownload: () => void;
  onCompleteEngineOnboarding: (engine: string, key?: string) => void;

  // Toast
  onToast: (msg: string, type?: 'success' | 'warn' | 'info' | 'error') => void;
}

export const AppModalOrchestrator: React.FC<AppModalOrchestratorProps> = (props) => {
  const {
    // Confirm Dialogs
    pendingAction,
    onCancelPendingAction,
    onProceedPendingAction,
    deleteConfirmFile,
    onCancelDeleteFile,
    onExecuteDeleteFile,
    deleteConfirmFolder,
    onCancelDeleteFolder,
    onExecuteDeleteFolder,
    deleteConfirmSession,
    onCancelDeleteSession,
    onExecuteDeleteSession,

    // Trash Modal
    isTrashOpen,
    onCloseTrash,
    trashSessions,
    onRestoreSession,
    onPermanentDeleteSession,
    onEmptyTrash,

    // Shortcuts & About
    isShortcutsModalOpen,
    onCloseShortcuts,
    isAboutModalOpen,
    onCloseAbout,

    // Event Manager
    isEventManagerOpen,
    onCloseEventManager,
    activeSessionTitle,
    projectEvents,
    eventFilter,
    onFilterChange,
    isExtractingEvents,
    onExtractEvents,
    onExportEventsToEditor,
    onExportEventsIcs,
    newEventTitle,
    onNewEventTitleChange,
    newEventDate,
    onNewEventDateChange,
    newEventType,
    onNewEventTypeChange,
    newEventPriority,
    onNewEventPriorityChange,
    newEventNotes,
    onNewEventNotesChange,
    onAddEvent,
    onToggleEventCompleted,
    onDeleteEvent,

    // New File
    isNewFileModalOpen,
    onCloseNewFile,
    newFileNameInput,
    onNewFileNameChange,
    newFileFolderTarget,
    onNewFileFolderChange,
    sessions,
    onConfirmCreateNewFile,
    newFileInputRef,

    // Google Drive Picker
    isGdrivePickerOpen,
    onCloseGdrivePicker,
    gdriveSsotFolder,
    onSelectGdriveFolder,
    onOpenFileGdrive,
    gdrivePickerTab,
    currentEditorContent,
    currentEditorFileName,
    googleUser,
    onGoogleSignIn,
    onGoogleSignOut,

    // Google Account
    isGoogleAccountModalOpen,
    onCloseGoogleAccount,

    // GitHub Integration
    isGithubModalOpen,
    onCloseGithubModal,
    githubConfig,
    currentUser,
    currentActiveFile,
    editorContent,
    onOpenGoogleAccountFromGithub,
    onDisconnectGithub,
    onSaveGithub,

    // Prompt Library
    isPromptLibraryModalOpen,
    onClosePromptLibrary,
    effectivePrompts,
    onSavePrompts,
    onApplyPromptFromLibrary,

    // Preferences
    isPreferencesModalOpen,
    onClosePreferences,
    preferencesInitialTab,
    preferences,
    apiKeys,
    onSavePreferences,
    onOpenRoleAssignmentFromPrefs,
    onApplyPromptFromPrefs,
    ghostWriterModelOptions,
    dynamicProviderModels,
    onUpdateDynamicModels,
    provider,
    onSelectProvider,
    selectedModel,
    onSelectModel,
    cloudApiKey,
    onUpdateApiKey,
    localEndpointAddress,
    onUpdateEndpoint,
    isVerified,
    onVerify,
    isVerifying,
    aiParameters,
    onSaveAiParameters,
    onUpdateDiscoveredModels,
    discoveredLocalModels,
    initialDiscoveredModels,
    onWipeAllData,
    workspaceRootType,
    onOpenGoogleAccountFromPrefs,
    onOpenGoogleDriveFromPrefs,
    onOpenGithubFromPrefs,

    // SSOT Generator
    isSSOTGeneratorModalOpen,
    onCloseSSOTGenerator,
    ssotGeneratorInitialFolder,
    availableChatModels,
    files,
    fileFolders,
    activeSessionId,
    onGenerateSSOT,
    onQuickDefaultModel,
    getModelDisplayName,

    // Workspace Connection
    isWorkspaceModalOpen,
    onCloseWorkspaceModal,
    activeWorkspace,
    onSelectActiveWorkspace,
    onAddNewNoteTab,
    onImportDocumentFiles,
    onOpenFileFromWorkspace,
    onOpenSSOTGeneratorFromWorkspace,
    onOpenSettingsFromWorkspace,

    // Document Converter
    isDocConverterModalOpen,
    onCloseDocConverterModal,
    docConversionResult,
    onConfirmDocumentConversion,
    renderMarkdownToHtml,

    // Save Untitled
    isSaveUntitledModalOpen,
    onCloseSaveUntitledModal,
    onConfirmSaveUntitled,

    // Council of Critics
    isCouncilModalOpen,
    onCloseCouncilModal,
    roleModels,
    onApplyCriticRevisions,
    onJumpToLine,

    // AI Role Assignment
    isAiRoleModalOpen,
    onCloseAiRoleModal,
    onSaveRoleModels,
    onOpenAiEngineSettingsFromRoles,

    // Ghost Diff
    diffModalData,
    onCloseDiffModal,
    onApplyDiffRevisions,
    onAppendDiffRevisions,

    // AI Engine Onboarding
    isEngineOnboardingOpen,
    onCloseEngineOnboarding,
    webllmProgress,
    onStartWebLlmDownload,
    onCompleteEngineOnboarding,

    // Toast
    onToast
  } = props;

  return (
    <>
      {/* Inline Direct Confirmation Dialogs */}
      <UnsavedChangesModal
        isOpen={pendingAction !== null}
        onCancel={onCancelPendingAction}
        onProceed={onProceedPendingAction}
      />
      <DeleteFileModal
        fileName={deleteConfirmFile}
        onCancel={onCancelDeleteFile}
        onConfirm={onExecuteDeleteFile}
      />
      <DeleteFolderModal
        folderName={deleteConfirmFolder}
        onCancel={onCancelDeleteFolder}
        onConfirm={onExecuteDeleteFolder}
      />
      <DeleteSessionModal
        session={deleteConfirmSession}
        onCancel={onCancelDeleteSession}
        onConfirm={onExecuteDeleteSession}
      />

      {/* Standalone Direct Modals */}
      <TrashModal
        isOpen={isTrashOpen}
        onClose={onCloseTrash}
        trashSessions={trashSessions}
        onRestoreSession={onRestoreSession}
        onPermanentDeleteSession={onPermanentDeleteSession}
        onEmptyTrash={onEmptyTrash}
      />
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={onCloseShortcuts}
      />
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={onCloseAbout}
      />
      <EventManagerModal
        isOpen={isEventManagerOpen}
        onClose={onCloseEventManager}
        activeSessionTitle={activeSessionTitle}
        projectEvents={projectEvents}
        eventFilter={eventFilter}
        onFilterChange={onFilterChange}
        isExtractingEvents={isExtractingEvents}
        onExtractEvents={onExtractEvents}
        onExportEventsToEditor={onExportEventsToEditor}
        onExportEventsIcs={onExportEventsIcs}
        newEventTitle={newEventTitle}
        onNewEventTitleChange={onNewEventTitleChange}
        newEventDate={newEventDate}
        onNewEventDateChange={onNewEventDateChange}
        newEventType={newEventType}
        onNewEventTypeChange={onNewEventTypeChange}
        newEventPriority={newEventPriority}
        onNewEventPriorityChange={onNewEventPriorityChange}
        newEventNotes={newEventNotes}
        onNewEventNotesChange={onNewEventNotesChange}
        onAddEvent={onAddEvent}
        onToggleEventCompleted={onToggleEventCompleted}
        onDeleteEvent={onDeleteEvent}
      />
      <NewFileModal
        isOpen={isNewFileModalOpen}
        onClose={onCloseNewFile}
        fileNameInput={newFileNameInput}
        onFileNameChange={onNewFileNameChange}
        folderTarget={newFileFolderTarget}
        onFolderTargetChange={onNewFileFolderChange}
        sessions={sessions}
        onSubmit={onConfirmCreateNewFile}
        inputRef={newFileInputRef}
      />

      {/* Lazy Suspense Modals */}
      <Suspense fallback={null}>
        <GoogleDrivePickerModal
          isOpen={isGdrivePickerOpen}
          onClose={onCloseGdrivePicker}
          currentFolder={gdriveSsotFolder}
          onSelectFolder={onSelectGdriveFolder}
          onToast={onToast}
          onOpenFile={onOpenFileGdrive}
          currentEditorContent={currentEditorContent}
          currentEditorFileName={currentEditorFileName}
          initialTab={gdrivePickerTab}
          user={googleUser}
          onSignIn={onGoogleSignIn}
          onSignOut={onGoogleSignOut}
        />

        <GoogleAccountModal
          isOpen={isGoogleAccountModalOpen}
          onClose={onCloseGoogleAccount}
          user={googleUser}
          onSignIn={onGoogleSignIn}
          onSignOut={onGoogleSignOut}
          onToast={onToast}
        />

        <GithubIntegrationModal
          isOpen={isGithubModalOpen}
          onClose={onCloseGithubModal}
          initialConfig={githubConfig}
          currentUser={currentUser}
          currentActiveFile={currentActiveFile}
          editorContent={editorContent}
          onOpenAccountModal={onOpenGoogleAccountFromGithub}
          onDisconnect={onDisconnectGithub}
          onSave={onSaveGithub}
        />

        <PromptLibraryModal
          isOpen={isPromptLibraryModalOpen}
          onClose={onClosePromptLibrary}
          prompts={effectivePrompts}
          onSavePrompts={onSavePrompts}
          onApplyPrompt={onApplyPromptFromLibrary}
          onToast={onToast}
        />

        <PreferencesModal
          isOpen={isPreferencesModalOpen}
          onClose={onClosePreferences}
          initialTab={preferencesInitialTab}
          preferences={preferences}
          apiKeys={apiKeys}
          onSave={onSavePreferences}
          onOpenRoleAssignment={onOpenRoleAssignmentFromPrefs}
          onApplyPrompt={onApplyPromptFromPrefs}
          modelOptions={ghostWriterModelOptions}
          dynamicModelsMap={dynamicProviderModels}
          onUpdateDynamicModels={onUpdateDynamicModels}
          provider={provider}
          onSelectProvider={onSelectProvider}
          selectedModel={selectedModel}
          onSelectModel={onSelectModel}
          currentApiKey={cloudApiKey}
          onUpdateApiKey={onUpdateApiKey}
          currentEndpoint={localEndpointAddress}
          onUpdateEndpoint={onUpdateEndpoint}
          isVerified={isVerified}
          onVerify={onVerify}
          isVerifying={isVerifying}
          aiParameters={aiParameters}
          onSaveParameters={onSaveAiParameters}
          onUpdateDiscoveredModels={onUpdateDiscoveredModels}
          initialDiscoveredModels={initialDiscoveredModels || discoveredLocalModels}
          onToast={onToast}
          onWipeAllData={onWipeAllData}
          googleUser={googleUser}
          onOpenGoogleAccount={onOpenGoogleAccountFromPrefs}
          workspaceRootType={workspaceRootType}
          onOpenGoogleDrive={onOpenGoogleDriveFromPrefs}
          githubConfig={githubConfig}
          onOpenGithub={onOpenGithubFromPrefs}
        />

        <SSOTGeneratorModal
          isOpen={isSSOTGeneratorModalOpen}
          onClose={onCloseSSOTGenerator}
          initialFolder={ssotGeneratorInitialFolder}
          availableFolders={Array.from(new Set([
            ...sessions.map((s) => s.title),
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
                .filter((m) => m.attachments && m.attachments.length > 0)
                .flatMap((m) => (m.attachments || []).map((a) => a.name));

              acc[s.title] = Array.from(new Set([...matchedFiles, ...chatAttachments]));
              return acc;
            }, {} as Record<string, string[]>)
          }
          availableTemplates={Object.keys(files).filter((f) => f.endsWith('.md') && !f.startsWith('.podium/'))}
          availableModels={availableChatModels}
          currentModel={selectedModel}
          selectedModel={selectedModel}
          provider={selectedModel === 'webllm' ? 'webllm' : (provider === 'local-pc' || provider === 'local-server' ? 'local-pc' : 'cloud')}
          currentProvider={provider}
          apiKeys={apiKeys}
          ollamaEndpoint={localEndpointAddress || 'http://localhost:11434'}
          onModelChange={(modelId) => {
            onQuickDefaultModel(modelId, getModelDisplayName(modelId));
          }}
          files={files}
          editorContent={editorContent}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onToast={onToast}
          onGenerate={(config) => {
            onCloseSSOTGenerator();
            onGenerateSSOT(config);
          }}
        />

        <WorkspaceConnectionModal
          isOpen={isWorkspaceModalOpen}
          onClose={onCloseWorkspaceModal}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={onSelectActiveWorkspace}
          currentFiles={files}
          currentFolders={fileFolders}
          onToast={onToast}
          onNewFile={onAddNewNoteTab}
          onImportDocumentFiles={onImportDocumentFiles}
          onOpenFileContent={onOpenFileFromWorkspace}
          onOpenSSOTGenerator={onOpenSSOTGeneratorFromWorkspace}
          googleUser={googleUser}
          githubConfig={githubConfig}
          onOpenSettings={onOpenSettingsFromWorkspace}
        />

        <DocumentConverterModal
          isOpen={isDocConverterModalOpen}
          onClose={onCloseDocConverterModal}
          conversionResult={docConversionResult}
          availableFolders={Array.from(new Set(['docs', ...sessions.map((s) => s.title)]))}
          defaultFolder={activeSessionTitle || 'docs'}
          onConfirm={onConfirmDocumentConversion}
          renderMarkdownToHtml={renderMarkdownToHtml}
          defaultOllamaEndpoint={preferences.pdfParser?.ollamaEndpoint || 'http://localhost:11434'}
          defaultOllamaModel={preferences.pdfParser?.ollamaModel || 'llama3.2-vision'}
          onToast={onToast}
        />

        <SaveUntitledModal
          isOpen={isSaveUntitledModalOpen}
          onClose={onCloseSaveUntitledModal}
          onConfirmSave={onConfirmSaveUntitled}
          defaultFileName={
            currentActiveFile.startsWith('Untitled-') ||
            /^새 프로젝트(\s*\d*)?\.md$/i.test(currentActiveFile) ||
            currentActiveFile === '새 문서.md'
              ? '새 문서.md'
              : currentActiveFile
          }
          defaultFolder={activeSessionTitle || fileFolders[currentActiveFile] || 'docs'}
          existingFiles={Object.keys(files)}
          availableFolders={Array.from(new Set([activeSessionTitle || 'docs', 'docs', ...sessions.map((s) => s.title)]))}
        />

        <CouncilOfCriticsModal
          isOpen={isCouncilModalOpen}
          onClose={onCloseCouncilModal}
          content={editorContent}
          apiKey={cloudApiKey}
          model={roleModels.critic}
          onApplyRevisions={onApplyCriticRevisions}
          onJumpToLine={onJumpToLine}
        />

        <AiRoleAssignmentModal
          isOpen={isAiRoleModalOpen}
          onClose={onCloseAiRoleModal}
          roleModels={roleModels}
          onSaveRoleModels={onSaveRoleModels}
          availableModels={availableChatModels}
          onToast={onToast}
          onOpenAiEngineSettings={onOpenAiEngineSettingsFromRoles}
        />

        {diffModalData && (
          <GhostDiffModal
            isOpen={diffModalData.isOpen}
            onClose={onCloseDiffModal}
            originalContent={editorContent}
            proposedContent={diffModalData.proposedContent}
            title={diffModalData.title}
            sourceLabel={diffModalData.sourceLabel}
            onApplyRevisions={onApplyDiffRevisions}
            onAppendRevisions={onAppendDiffRevisions}
          />
        )}

        <AiEngineOnboardingModal
          isOpen={isEngineOnboardingOpen}
          onClose={onCloseEngineOnboarding}
          initialApiKey={cloudApiKey}
          webllmProgress={webllmProgress}
          onStartWebLlmDownload={onStartWebLlmDownload}
          onComplete={onCompleteEngineOnboarding}
        />
      </Suspense>
    </>
  );
};

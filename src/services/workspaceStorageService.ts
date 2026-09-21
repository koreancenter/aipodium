// Workspace Directory Picker & Storage Binding Service
// Supports:
// 1. Local Directory (Browser File System Access API - window.showDirectoryPicker)
// 2. Remote / Cloud Storage (REST / WebDAV / Cloud API interface)
// 3. Browser Vault (IndexedDB high-capacity offline persistent storage)
// 4. GitHub Repository Bidirectional Sync Engine (Push/Pull)

import type {
  WorkspaceStorageType,
  ActiveWorkspace,
  StoredVaultItem,
  PurgeGuestSessionOptions,
  SyncDocumentToGithubOptions,
  SyncDocumentToGithubResult,
  PullDocumentsFromGithubOptions,
  PullDocumentsResult,
} from '../types';

export type {
  WorkspaceStorageType,
  ActiveWorkspace,
  StoredVaultItem,
  PurgeGuestSessionOptions,
  SyncDocumentToGithubOptions,
  SyncDocumentToGithubResult,
  PullDocumentsFromGithubOptions,
  PullDocumentsResult,
};

const DB_NAME = 'aipodium_vault_db';
const DB_VERSION = 1;
const STORE_FILES = 'vault_files';
const STORE_METADATA = 'vault_metadata';

// In-memory directory handle reference (Handles cannot be directly serialized to localStorage)
let activeDirectoryHandle: any = null;

export const setMemoryDirectoryHandle = (handle: any) => {
  activeDirectoryHandle = handle;
};

export const getMemoryDirectoryHandle = (): any => {
  return activeDirectoryHandle;
};

// Open or initialize IndexedDB
function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------
// 1. IndexedDB Browser Vault Storage Operations
// ---------------------------------------------------------

export async function saveVaultToIndexedDB(
  vaultId: string,
  files: Record<string, string>,
  fileFolders: Record<string, string>,
  vaultName: string = '내 브라우저 Vault'
): Promise<void> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction([STORE_FILES, STORE_METADATA], 'readwrite');
    const filesStore = tx.objectStore(STORE_FILES);
    const metaStore = tx.objectStore(STORE_METADATA);

    const data = {
      key: vaultId,
      files,
      fileFolders,
      updatedAt: new Date().toISOString(),
    };
    filesStore.put(data);

    const meta: StoredVaultItem = {
      id: vaultId,
      name: vaultName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileCount: Object.keys(files).length,
    };
    metaStore.put(meta);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save to IndexedDB:', err);
    // Fallback to localStorage
    try {
      localStorage.setItem(`vault_${vaultId}_files`, JSON.stringify(files));
      localStorage.setItem(`vault_${vaultId}_folders`, JSON.stringify(fileFolders));
    } catch (e) {
      console.warn('localStorage fallback failed:', e);
    }
  }
}

export async function loadVaultFromIndexedDB(
  vaultId: string
): Promise<{ files: Record<string, string>; fileFolders: Record<string, string> } | null> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);
    const request = store.get(vaultId);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            files: request.result.files || {},
            fileFolders: request.result.fileFolders || {},
          });
        } else {
          // Check localStorage fallback
          try {
            const savedF = localStorage.getItem(`vault_${vaultId}_files`);
            const savedFold = localStorage.getItem(`vault_${vaultId}_folders`);
            if (savedF) {
              resolve({
                files: JSON.parse(savedF),
                fileFolders: savedFold ? JSON.parse(savedFold) : {},
              });
              return;
            }
          } catch {}
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function listIndexedDBVaults(): Promise<StoredVaultItem[]> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_METADATA, 'readonly');
    const store = tx.objectStore(STORE_METADATA);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------
// 2. Local Directory Picker (File System Access API)
// ---------------------------------------------------------

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickLocalDirectory(): Promise<{
  handle: any;
  name: string;
  files: Record<string, string>;
  fileFolders: Record<string, string>;
}> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('이 브라우저는 File System Access API(showDirectoryPicker)를 지원하지 않습니다.');
  }

  // Request directory picker with readwrite mode
  // @ts-ignore
  const dirHandle = await window.showDirectoryPicker({
    mode: 'readwrite',
    id: 'aipodium_workspace_picker',
  });

  setMemoryDirectoryHandle(dirHandle);

  const scannedFiles: Record<string, string> = {};
  const scannedFolders: Record<string, string> = {};
  const rootName = dirHandle.name || 'Local Workspace';

  // Recursive scan function
  async function scanDirectory(folderHandle: any, currentFolderPath: string) {
    // @ts-ignore
    for await (const entry of folderHandle.values()) {
      // Ignore hidden files and system/build/cache directories
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === 'out' ||
        entry.name === 'target' ||
        entry.name === 'coverage' ||
        entry.name === '.git' ||
        entry.name === '__pycache__' ||
        entry.name === '.next' ||
        entry.name === '.cache'
      ) {
        continue;
      }

      if (entry.kind === 'file') {
        const lowerName = entry.name.toLowerCase();
        // Smart Document Filtering: Knowledge & Document files ONLY (.md, .markdown, .txt, .json, .csv)
        // Explicitly exclude code, scripts, styles, build artifacts (.html, .css, .js, .jsx, .ts, .tsx, .py, etc.)
        const isSupportedDoc =
          lowerName.endsWith('.md') ||
          lowerName.endsWith('.markdown') ||
          lowerName.endsWith('.txt') ||
          lowerName.endsWith('.json') ||
          lowerName.endsWith('.csv');

        if (isSupportedDoc) {
          try {
            const file = await entry.getFile();
            const text = await file.text();
            // Store with full relative path to preserve tree structure
            const relativePath = currentFolderPath ? `${currentFolderPath}/${entry.name}` : entry.name;
            scannedFiles[relativePath] = text;
            scannedFolders[relativePath] = rootName;
          } catch (e) {
            console.warn(`Failed to read file ${entry.name}:`, e);
          }
        }
      } else if (entry.kind === 'directory') {
        const subFolderPath = currentFolderPath ? `${currentFolderPath}/${entry.name}` : entry.name;
        await scanDirectory(entry, subFolderPath);
      }
    }
  }

  await scanDirectory(dirHandle, '');

  return {
    handle: dirHandle,
    name: rootName,
    files: scannedFiles,
    fileFolders: scannedFolders,
  };
}

// Rescan current directory handle
export async function rescanLocalDirectory(
  dirHandle: any
): Promise<{ files: Record<string, string>; fileFolders: Record<string, string> }> {
  if (!dirHandle) {
    throw new Error('Directory handle is not available');
  }

  const scannedFiles: Record<string, string> = {};
  const scannedFolders: Record<string, string> = {};
  const rootName = dirHandle.name || 'Local Workspace';

  async function scanDirectory(folderHandle: any, currentFolderPath: string) {
    // @ts-ignore
    for await (const entry of folderHandle.values()) {
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === 'out' ||
        entry.name === 'target' ||
        entry.name === 'coverage' ||
        entry.name === '.git' ||
        entry.name === '__pycache__' ||
        entry.name === '.next' ||
        entry.name === '.cache'
      ) {
        continue;
      }

      if (entry.kind === 'file') {
        const lowerName = entry.name.toLowerCase();
        const isSupportedDoc =
          lowerName.endsWith('.md') ||
          lowerName.endsWith('.markdown') ||
          lowerName.endsWith('.txt') ||
          lowerName.endsWith('.json') ||
          lowerName.endsWith('.csv');

        if (isSupportedDoc) {
          try {
            const file = await entry.getFile();
            const text = await file.text();
            const relativePath = currentFolderPath ? `${currentFolderPath}/${entry.name}` : entry.name;
            scannedFiles[relativePath] = text;
            scannedFolders[relativePath] = rootName;
          } catch (e) {
            console.warn(`Failed to read file ${entry.name}:`, e);
          }
        }
      } else if (entry.kind === 'directory') {
        const subFolderPath = currentFolderPath ? `${currentFolderPath}/${entry.name}` : entry.name;
        await scanDirectory(entry, subFolderPath);
      }
    }
  }

  await scanDirectory(dirHandle, '');
  return { files: scannedFiles, fileFolders: scannedFolders };
}

// Write/Save file to directory handle
export async function saveFileToLocalDirectory(
  dirHandle: any,
  filePath: string,
  content: string
): Promise<boolean> {
  if (!dirHandle) return false;
  try {
    const parts = filePath.split('/');
    let currentDir = dirHandle;

    // Navigate or create subdirectories if needed
    for (let i = 0; i < parts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
    }

    const fileName = parts[parts.length - 1];
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (err) {
    console.error(`Failed to save file '${filePath}' to local directory:`, err);
    return false;
  }
}

// Delete file from directory handle
export async function deleteFileFromLocalDirectory(
  dirHandle: any,
  filePath: string
): Promise<boolean> {
  if (!dirHandle) return false;
  try {
    const parts = filePath.split('/');
    let currentDir = dirHandle;

    for (let i = 0; i < parts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(parts[i]);
    }

    const fileName = parts[parts.length - 1];
    await currentDir.removeEntry(fileName);
    return true;
  } catch (err) {
    console.error(`Failed to delete file '${filePath}' from local directory:`, err);
    return false;
  }
}

// Rename file in directory handle
export async function renameFileInLocalDirectory(
  dirHandle: any,
  oldPath: string,
  newPath: string,
  content: string
): Promise<boolean> {
  if (!dirHandle) return false;
  try {
    const saved = await saveFileToLocalDirectory(dirHandle, newPath, content);
    if (saved) {
      await deleteFileFromLocalDirectory(dirHandle, oldPath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Failed to rename file '${oldPath}' to '${newPath}':`, err);
    return false;
  }
}

// ---------------------------------------------------------
// 3. Remote / Cloud Storage API Layer
// ---------------------------------------------------------

export async function testRemoteStorageConnection(
  remoteUrl: string,
  token?: string
): Promise<{ success: boolean; message: string; fileCount?: number }> {
  try {
    if (!remoteUrl || !remoteUrl.trim()) {
      return { success: false, message: '원격 서버 URL을 입력하세요.' };
    }

    let parsedUrl: URL;
    try {
      const trimmed = remoteUrl.trim();
      const normalized = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
      parsedUrl = new URL(normalized);
    } catch {
      return { success: false, message: '올바른 형식의 원격 서버 URL이 아닙니다.' };
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { success: false, message: '원격 서버 연결은 http 또는 https 프로토콜만 허용됩니다.' };
    }

    // SSRF Prevention: Block loopback, link-local, and cloud metadata IPs
    const hostname = parsedUrl.hostname.toLowerCase();
    const isLocalOrPrivate =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname) ||
      /^169\.254\.\d+\.\d+$/.test(hostname);

    if (isLocalOrPrivate) {
      return {
        success: false,
        message: '보안 정책상 로컬 루프백 및 내부 사설망(Private IP / Cloud Metadata) 주소로의 원격 연결은 차단됩니다.'
      };
    }

    // Try fetching with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const resp = await fetch(parsedUrl.toString(), {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok || resp.status === 401 || resp.status === 403 || resp.status === 404) {
        return {
          success: true,
          message: `원격 저장소 서버에 성공적으로 접속했습니다 (HTTP ${resp.status})`,
        };
      }

      return {
        success: false,
        message: `원격 서버가 오류 상태를 반환했습니다 (HTTP ${resp.status})`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      return {
        success: false,
        message: isTimeout
          ? '원격 서버 응답 시간이 초과되었습니다 (타임아웃).'
          : `원격 저장소 서버에 연결할 수 없습니다: ${err?.message || '네트워크 연결 오류'}`,
      };
    }
  } catch (e: any) {
    return {
      success: false,
      message: e.message || '원격 저장소 연결 테스트 중 예외가 발생했습니다.',
    };
  }
}

// ---------------------------------------------------------
// 4. Guest Session Data Purge Pipeline
// ---------------------------------------------------------

/**
 * Truncates and clears all object stores in the vault IndexedDB.
 */
export async function clearVaultIndexedDB(): Promise<void> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction([STORE_FILES, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_FILES).clear();
    tx.objectStore(STORE_METADATA).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[workspaceStorageService] clearVaultIndexedDB notice:', err);
  }
}

/**
 * Complete Data Purge Pipeline for Guest Sessions upon Termination:
 * 1. Truncates and clears all tables in IndexedDB (primary app db and vault db).
 * 2. Clears in-memory directory handles.
 * 3. Batch-removes all guest-related keys from localStorage and sessionStorage.
 * 4. Clears sensitive clipboard memory.
 * 5. Resets storage state to the initial default sample workspace.
 */
export async function purgeGuestSession(
  options: PurgeGuestSessionOptions = { resetToSampleWorkspace: true }
): Promise<void> {
  const shouldResetToSample = options.resetToSampleWorkspace !== false;

  // 1. Truncate all tables in Vault DB if indexedDB is supported
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB) {
      await clearVaultIndexedDB();
    }
  } catch (err) {
    console.warn('[workspaceStorageService] clearVaultIndexedDB error:', err);
  }

  // 2. Truncate all tables in Primary App DB if indexedDB is supported
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB) {
      const { clearDb } = await import('./indexedDbService');
      await clearDb();
    }
  } catch (err) {
    console.warn('[workspaceStorageService] clearDb error:', err);
  }

  // 3. Clear in-memory directory handles
  setMemoryDirectoryHandle(null);

  // 4. Batch-remove all guest-related keys from localStorage & sessionStorage
  const guestKeysToRemove = [
    // Active project, sessions & workspaces
    'aipodium_active_workspace',
    'aipodium_workspace_root_type',
    'aipodium_remote_workspace_config',
    'aipodium_github_config',
    'aipodium_github_meta',
    'aipodium_github_pat_enc',
    'aipodium_recent_workspaces',
    'aipodium_active_session_id',
    'aipodium_projects_sessions',
    'aipodium_trash_sessions',
    'notebooklm_sessions',
    'notebooklm_active_session_id',
    'notebooklm_trash_sessions',

    // Document tree, files & tabs
    'aipodium_files',
    'aipodium_file_folders',
    'aipodium_open_tabs',
    'aipodium_active_file',
    'aipodium_current_active_file',
    'notebooklm_files',
    'notebooklm_file_folders',
    'notebooklm_open_tabs',
    'notebooklm_active_file',

    // Draft buffers & editor content
    'aipodium_editor_content',
    'notebooklm_editor_content',
    'editor_font_size',

    // Chat histories & messages
    'notebooklm_chat_messages',
    'notebooklm_chat_threads',
    'notebooklm_custom_templates',

    // Cached assets & project events
    'aipodium_pdf_markdowns',
    'aipodium_pdf_auto_reduce',
    'aipodium_project_events',
    'aipodium_custom_prompts',

    // API keys & local endpoints (guest zero-retention)
    'gemini_api_key',
    'aipodium_enc_gemini_key_v1',
    'aipodium_enc_api_keys_v1',
    'aipodium_api_keys',
    'aipodium_cloud_api_key',
    'aipodium_local_endpoint',

    // Guest session flags & auth user
    'aipodium_guest_init_v1',
    'aipodium_guest_init_v2',
    'aipodium_auth_user',
    'podium_auth_session_v1',
    'aipodium_pinned_models',
    'aipodium_discovered_models',
    'ai_podium_parameters',
    'aipodium_webllm_banner_dismissed',
    'aipodium_ai_role_models',
    'aipodium_ghost_writer_model',
  ];

  if (typeof localStorage !== 'undefined' && localStorage) {
    for (const key of guestKeysToRemove) {
      localStorage.removeItem(key);
    }
    // Dynamically remove any keys matching vault_*, draft_*, aipodium_draft_*, buffer_*, temp_*
    const dynamicKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('vault_') ||
          k.startsWith('draft_') ||
          k.startsWith('aipodium_draft_') ||
          k.startsWith('buffer_') ||
          k.startsWith('temp_'))
      ) {
        dynamicKeysToRemove.push(k);
      }
    }
    for (const k of dynamicKeysToRemove) {
      localStorage.removeItem(k);
    }
  }

  if (typeof sessionStorage !== 'undefined' && sessionStorage) {
    for (const key of guestKeysToRemove) {
      sessionStorage.removeItem(key);
    }
    sessionStorage.removeItem('aipodium_api_keys');
    sessionStorage.removeItem('aipodium_cloud_api_key');
    sessionStorage.removeItem('aipodium_local_endpoint');
  }

  // 5. Clear sensitive clipboard memory and in-memory decrypted keys
  try {
    const { clearSensitiveClipboard } = await import('../utils/securityCrypto');
    await clearSensitiveClipboard();
  } catch {}

  // Trigger memory wipe event in aiEngineCore without direct module coupling
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aipodium:auto_lock'));
  }
  if (options.onClearKeys) {
    try {
      options.onClearKeys();
    } catch {}
  }

  // 6. Reset the storage state to the initial default sample workspace
  if (shouldResetToSample) {
    try {
      const { GUEST_SAMPLE_FILES, GUEST_SAMPLE_FOLDERS } = await import('../data/guestSampleWorkspace');

      // Seed IndexedDB app_state_store if supported
      if (typeof indexedDB !== 'undefined' && indexedDB) {
        try {
          const { setDbItem, STORAGE_KEYS } = await import('./indexedDbService');
          await setDbItem(STORAGE_KEYS.FILES, GUEST_SAMPLE_FILES);
          await setDbItem(STORAGE_KEYS.FILE_FOLDERS, GUEST_SAMPLE_FOLDERS);
          await setDbItem(STORAGE_KEYS.EDITOR_CONTENT, GUEST_SAMPLE_FILES['welcome.md']);
          await setDbItem(STORAGE_KEYS.ACTIVE_FILE, 'welcome.md');
          await setDbItem(STORAGE_KEYS.OPEN_TABS, ['welcome.md', 'ai_guide.md']);
          await setDbItem(STORAGE_KEYS.SESSIONS, []);
          await setDbItem(STORAGE_KEYS.ACTIVE_SESSION_ID, null);
          await setDbItem(STORAGE_KEYS.TRASH_SESSIONS, []);
        } catch (dbErr) {
          console.warn('[workspaceStorageService] IndexedDB sample seed warning:', dbErr);
        }
      }

      // Seed localStorage with initial sample workspace for fast synchronous reads
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem('notebooklm_files', JSON.stringify(GUEST_SAMPLE_FILES));
        localStorage.setItem('notebooklm_file_folders', JSON.stringify(GUEST_SAMPLE_FOLDERS));
        localStorage.setItem('notebooklm_editor_content', GUEST_SAMPLE_FILES['welcome.md']);
        localStorage.setItem('notebooklm_active_file', 'welcome.md');
        localStorage.setItem('notebooklm_open_tabs', JSON.stringify(['welcome.md', 'ai_guide.md']));
        localStorage.setItem('notebooklm_sessions', JSON.stringify([]));
        localStorage.setItem('aipodium_guest_init_v2', 'true');
      }
    } catch (err) {
      console.warn('[workspaceStorageService] Reset sample workspace error:', err);
    }
  }
}

// ---------------------------------------------------------
// 5. GitHub Repository Bidirectional Sync Engine (Push/Pull)
// ---------------------------------------------------------

export const GITHUB_REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

/**
 * Smartly sanitizes GitHub repository input, stripping protocol, domain, and .git extensions:
 * - https://github.com/owner/repo -> owner/repo
 * - https://github.com/owner/repo.git -> owner/repo
 * - git@github.com:owner/repo.git -> owner/repo
 * - github.com/owner/repo -> owner/repo
 */
export function sanitizeGithubRepo(input: string): string {
  if (!input) return '';
  let val = input.trim();
  val = val.replace(/^git@github\.com:/i, '');
  val = val.replace(/^https?:\/\/(www\.)?github\.com\/?/i, '');
  val = val.replace(/^(www\.)?github\.com\/?/i, '');
  val = val.replace(/^\/+/, '');
  val = val.replace(/\.git$/i, '');
  val = val.replace(/\/+$/, '');
  return val;
}

/**
 * Auto-generates standard conventional commit messages for document push pipeline:
 * - For new files: docs: create ${filename} (via AI Podium)
 * - For modified files: docs: update ${filename} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
 */
export function generateConventionalCommitMessage(
  filename: string,
  isNewFile: boolean,
  timeString?: string
): string {
  const cleanFilename = filename.replace(/^\/+/, '').split('/').pop() || filename;
  const time = timeString || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isNewFile) {
    return `docs: create ${cleanFilename} (via AI Podium)`;
  }
  return `docs: update ${cleanFilename} (${time})`;
}

function utf8ToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

function base64ToUtf8(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))));
  } catch {
    const binary = atob(str.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * Pushes a single document (e.g. Markdown) directly to a GitHub repository branch.
 * 1. Fetches current file SHA via GET /repos/{owner}/{repo}/contents/{path}.
 * 2. Commits and pushes changes via PUT /repos/{owner}/{repo}/contents/{path} with base64 content and SHA.
 * 3. Handles 409 Conflict gracefully with Safe Fork:
 *    - Fetches remote head content
 *    - Creates conflict filename: ${baseFileName}_conflict_${Date.now()}.md
 *    - Notifies caller to preserve user edits in the conflict file and update tab to remote head.
 */
export async function syncDocumentToGithub(
  options: SyncDocumentToGithubOptions
): Promise<SyncDocumentToGithubResult> {
  const {
    owner,
    repo,
    branch = 'main',
    token,
    filePath,
    content,
    commitMessage,
    onToast,
  } = options;

  if (!token || !owner || !repo || !filePath) {
    const errMsg = 'GitHub 동기화 필수 정보가 누락되었습니다.';
    if (onToast) onToast(errMsg, 'warn');
    return { success: false, error: errMsg };
  }

  const cleanToken = token.trim();
  const cleanPath = filePath.replace(/^\/+/, '');

  try {
    // 1. Fetch current file SHA via GET /repos/{owner}/{repo}/contents/{path}
    let existingSha: string | undefined = undefined;
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}`,
        {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (getRes.ok) {
        const fileData = await getRes.json();
        existingSha = fileData.sha;
      } else if (getRes.status === 404) {
        existingSha = undefined;
      } else {
        console.warn(`[syncDocumentToGithub] Checking file SHA returned HTTP ${getRes.status}`);
      }
    } catch (checkErr) {
      console.warn('[syncDocumentToGithub] Error checking existing SHA:', checkErr);
    }

    // 2. Commit and push changes via PUT /repos/{owner}/{repo}/contents/{path}
    const base64Content = utf8ToBase64(content);
    const isNewFile = !existingSha;
    const filename = cleanPath.split('/').pop() || cleanPath;

    let message: string;
    if (commitMessage && commitMessage.trim()) {
      message = commitMessage
        .replace(/\$\{filename\}/g, filename)
        .replace(/\{filename\}/g, filename)
        .replace(/\$\{time\}/g, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        .trim();
    } else {
      message = generateConventionalCommitMessage(filename, isNewFile);
    }

    const putBody: Record<string, any> = {
      message,
      content: base64Content,
      branch,
    };
    if (existingSha) {
      putBody.sha = existingSha;
    }

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putBody),
      }
    );

    // 3. Graceful 409 Conflict Handling (Safe Fork):
    if (putRes.status === 409) {
      let remoteContent: string | undefined = undefined;
      let remoteSha: string | undefined = undefined;
      try {
        const remoteRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}`,
          {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        if (remoteRes.ok) {
          const remoteData = await remoteRes.json();
          remoteSha = remoteData.sha;
          if (remoteData.content) {
            remoteContent = base64ToUtf8(remoteData.content);
          }
        }
      } catch (remoteFetchErr) {
        console.warn('[syncDocumentToGithub] Error fetching remote content during 409 conflict:', remoteFetchErr);
      }

      const baseFileName = filename.replace(/\.[^/.]+$/, '');
      const conflictFileName = `${baseFileName}_conflict_${Date.now()}.md`;
      const conflictMsg = '원격 저장소에 더 최신 문서가 존재하여 충돌 사본이 생성되었습니다.';

      if (onToast) onToast(conflictMsg, 'warn');

      return {
        success: false,
        conflict: true,
        conflictFileName,
        remoteContent,
        sha: remoteSha,
        error: conflictMsg,
      };
    }

    if (!putRes.ok) {
      const errorData = await putRes.json().catch(() => ({}));
      const errorMsg = errorData.message || `HTTP ${putRes.status}`;
      if (onToast) onToast(`GitHub 푸시 실패: ${errorMsg}`, 'error');
      return { success: false, error: errorMsg };
    }

    const resData = await putRes.json();
    const newSha = resData.content?.sha;

    if (onToast) {
      onToast(`GitHub 저장소에 '${cleanPath}' 파일이 동기화되었습니다.`, 'success');
    }

    return {
      success: true,
      sha: newSha,
    };
  } catch (err: any) {
    const errorMsg = err?.message || '네트워크 연결 오류';
    if (onToast) onToast(`GitHub 동기화 오류: ${errorMsg}`, 'error');
    return { success: false, error: errorMsg };
  }
}

/**
 * Single-Document Push Engine alias for syncDocumentToGithub
 */
export const syncDocToGithub = syncDocumentToGithub;

/**
 * Pulls existing Markdown documents from a GitHub repository branch into the workspace.
 */
export async function pullDocumentsFromGithub(
  options: PullDocumentsFromGithubOptions
): Promise<PullDocumentsResult> {
  const { owner, repo, branch = 'main', token, onToast } = options;

  if (!token || !owner || !repo) {
    throw new Error('저장소 동기화에 필요한 토큰과 저장소 정보가 부족합니다.');
  }

  const cleanToken = token.trim();

  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!treeRes.ok) {
      throw new Error(`저장소 파일 트리를 가져올 수 없습니다 (HTTP ${treeRes.status})`);
    }

    const treeData = await treeRes.json();
    const tree = treeData.tree || [];

    const mdBlobs = tree.filter(
      (item: any) =>
        item.type === 'blob' &&
        typeof item.path === 'string' &&
        (item.path.toLowerCase().endsWith('.md') || item.path.toLowerCase().endsWith('.markdown')) &&
        !item.path.startsWith('.') &&
        !item.path.includes('node_modules/')
    );

    if (mdBlobs.length === 0) {
      return { files: {}, fileFolders: {}, count: 0 };
    }

    const pulledFiles: Record<string, string> = {};
    const pulledFolders: Record<string, string> = {};
    const rootFolder = `${owner}/${repo}`;

    const BATCH_SIZE = 5;
    for (let i = 0; i < mdBlobs.length; i += BATCH_SIZE) {
      const batch = mdBlobs.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (item: any) => {
          try {
            const blobRes = await fetch(item.url, {
              headers: {
                Authorization: `Bearer ${cleanToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            });
            if (blobRes.ok) {
              const blobData = await blobRes.json();
              if (blobData.encoding === 'base64' && blobData.content) {
                const text = base64ToUtf8(blobData.content);
                pulledFiles[item.path] = text;
                pulledFolders[item.path] = rootFolder;
              }
            }
          } catch (fetchErr) {
            console.warn(`[pullDocumentsFromGithub] Failed to fetch blob for ${item.path}:`, fetchErr);
          }
        })
      );
    }

    return {
      files: pulledFiles,
      fileFolders: pulledFolders,
      count: Object.keys(pulledFiles).length,
    };
  } catch (err: any) {
    console.error('Error pulling documents from GitHub:', err);
    if (onToast) {
      onToast(`GitHub 문서 동기화 실패: ${err?.message || '네트워크 오류'}`, 'error');
    }
    throw err;
  }
}

// ---------------------------------------------------------
// 6. WorkspaceStorageService Class & Lazy Singleton Getter
// ---------------------------------------------------------

export class WorkspaceStorageService {
  setMemoryDirectoryHandle = setMemoryDirectoryHandle;
  getMemoryDirectoryHandle = getMemoryDirectoryHandle;
  saveVaultToIndexedDB = saveVaultToIndexedDB;
  loadVaultFromIndexedDB = loadVaultFromIndexedDB;
  listIndexedDBVaults = listIndexedDBVaults;
  clearVaultIndexedDB = clearVaultIndexedDB;
  isFileSystemAccessSupported = isFileSystemAccessSupported;
  pickLocalDirectory = pickLocalDirectory;
  saveFileToLocalDirectory = saveFileToLocalDirectory;
  deleteFileFromLocalDirectory = deleteFileFromLocalDirectory;
  renameFileInLocalDirectory = renameFileInLocalDirectory;
  rescanLocalDirectory = rescanLocalDirectory;
  purgeGuestSession = purgeGuestSession;
  sanitizeGithubRepo = sanitizeGithubRepo;
  generateConventionalCommitMessage = generateConventionalCommitMessage;
  syncDocToGithub = syncDocToGithub;
  syncDocumentToGithub = syncDocumentToGithub;
  pullDocumentsFromGithub = pullDocumentsFromGithub;
}

let instance: WorkspaceStorageService | null = null;

export const getWorkspaceStorageService = (): WorkspaceStorageService => {
  if (!instance) {
    instance = new WorkspaceStorageService();
  }
  return instance;
};

// Lazy proxy object for any legacy code expecting `workspaceStorageService.<method>`
// without evaluating top-level instances prematurely at module load time.
export const workspaceStorageService = new Proxy({} as WorkspaceStorageService, {
  get(_target, prop: string | symbol) {
    const realInstance = getWorkspaceStorageService();
    const value = (realInstance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realInstance);
    }
    return value;
  },
});



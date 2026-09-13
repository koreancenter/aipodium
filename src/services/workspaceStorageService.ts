// Workspace Directory Picker & Storage Binding Service
// Supports:
// 1. Local Directory (Browser File System Access API - window.showDirectoryPicker)
// 2. Remote / Cloud Storage (REST / WebDAV / Cloud API interface)
// 3. Browser Vault (IndexedDB high-capacity offline persistent storage)

export type WorkspaceStorageType = 'local' | 'remote' | 'indexeddb' | 'gdrive' | 'github';

export interface ActiveWorkspace {
  id: string;
  name: string;
  type: WorkspaceStorageType;
  path?: string;
  status: 'connected' | 'offline' | 'syncing';
  lastSynced?: string;
  fileCount: number;
  remoteUrl?: string;
  remoteToken?: string;
  vaultId?: string;
  isReadOnly?: boolean;
  gdriveFolderId?: string;
  gdriveFolderName?: string;
  githubRepo?: string;
  githubOwner?: string;
  githubBranch?: string;
}

export interface StoredVaultItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
}

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

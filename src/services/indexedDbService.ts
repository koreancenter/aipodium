// IndexedDB High-Capacity Storage Service for AI Podium
// Solves browser LocalStorage quota limits (5~10MB) by providing
// high-capacity (hundreds of MBs to GBs), asynchronous, non-blocking local storage.

const DB_NAME = 'aipodium_primary_db';
const DB_VERSION = 1;
const STORE_KEYVAL = 'app_state_store';

export interface StorageEstimateResult {
  usage: number; // in bytes
  quota: number; // in bytes
  usagePercent: number; // 0 to 100
  usageFormatted: string;
  quotaFormatted: string;
  isPersisted: boolean;
  supported: boolean;
}

export const STORAGE_KEYS = {
  SESSIONS: 'aipodium_projects_sessions',
  ACTIVE_SESSION_ID: 'aipodium_active_session_id',
  TRASH_SESSIONS: 'aipodium_trash_sessions',
  FILES: 'aipodium_files',
  FILE_FOLDERS: 'aipodium_file_folders',
  EDITOR_CONTENT: 'aipodium_editor_content',
  ACTIVE_FILE: 'aipodium_active_file',
  OPEN_TABS: 'aipodium_open_tabs',
  PREFERENCES: 'aipodium_preferences',
  CUSTOM_PROMPTS: 'aipodium_custom_prompts'
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

// Initialize or open the primary IndexedDB connection
export function openIndexedDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_KEYVAL)) {
          db.createObjectStore(STORE_KEYVAL, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('[IndexedDB] Database upgrade or open was blocked by another tab.');
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

// Get item from IndexedDB
export async function getDbItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_KEYVAL, 'readonly');
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        console.warn(`[IndexedDB] Error reading key "${key}":`, req.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn(`[IndexedDB] getDbItem error for key "${key}":`, err);
    return null;
  }
}

// Set item in IndexedDB
export async function setDbItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYVAL, 'readwrite');
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.put({
        key,
        value,
        updatedAt: new Date().toISOString()
      });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error(`Failed to write key "${key}"`));

      tx.onerror = () => reject(tx.error || new Error(`Transaction failed for "${key}"`));
    });
  } catch (err) {
    console.warn(`[IndexedDB] setDbItem error for key "${key}":`, err);
    throw err;
  }
}

// Remove item from IndexedDB
export async function removeDbItem(key: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYVAL, 'readwrite');
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] removeDbItem error for key "${key}":`, err);
  }
}

// Clear all items in store
export async function clearDb(): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYVAL, 'readwrite');
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] clearDb error:', err);
  }
}

// List all keys stored in IndexedDB
export async function getAllDbKeys(): Promise<string[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_KEYVAL, 'readonly');
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const keys = (req.result || []).map((k) => String(k));
        resolve(keys);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Export all data from IndexedDB as a single serializable object
export async function exportAllDbData(): Promise<Record<string, any>> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_KEYVAL, 'readonly');
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result || [];
        const exportMap: Record<string, any> = {};
        for (const item of results) {
          if (item && item.key) {
            exportMap[item.key] = item.value;
          }
        }
        resolve(exportMap);
      };
      req.onerror = () => resolve({});
    });
  } catch (err) {
    console.error('[IndexedDB] exportAllDbData failed:', err);
    return {};
  }
}

// Import data map into IndexedDB
export async function importAllDbData(data: Record<string, any>): Promise<{ importedCount: number }> {
  try {
    const db = await openIndexedDB();
    let count = 0;
    const tx = db.transaction(STORE_KEYVAL, 'readwrite');
    const store = tx.objectStore(STORE_KEYVAL);

    for (const [key, value] of Object.entries(data)) {
      if (key && value !== undefined) {
        store.put({
          key,
          value,
          updatedAt: new Date().toISOString()
        });
        count++;
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve({ importedCount: count });
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[IndexedDB] importAllDbData failed:', err);
    throw err;
  }
}

// Helper: Format bytes to human readable string
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Estimate storage quota and usage
export async function getStorageQuotaEstimate(): Promise<StorageEstimateResult> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return {
      usage: 0,
      quota: 0,
      usagePercent: 0,
      usageFormatted: 'N/A',
      quotaFormatted: 'N/A',
      isPersisted: false,
      supported: false
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usagePercent = quota > 0 ? Math.min(100, Math.round((usage / quota) * 10000) / 100) : 0;

    let isPersisted = false;
    if (navigator.storage.persisted) {
      isPersisted = await navigator.storage.persisted();
    }

    return {
      usage,
      quota,
      usagePercent,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota),
      isPersisted,
      supported: true
    };
  } catch (err) {
    console.warn('[IndexedDB] getStorageQuotaEstimate error:', err);
    return {
      usage: 0,
      quota: 0,
      usagePercent: 0,
      usageFormatted: '알 수 없음',
      quotaFormatted: '알 수 없음',
      isPersisted: false,
      supported: true
    };
  }
}

// Request persistent storage so browser eviction doesn't delete user data
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

// Hybrid Save: Writes to IndexedDB (asynchronous high capacity)
// and safely mirrors to LocalStorage if quota permits.
export async function saveHybridStorage<T>(
  key: string,
  value: T,
  mirrorToLocalStorage = true
): Promise<void> {
  // 1. Primary save to IndexedDB (Reliable, high-capacity, non-blocking)
  try {
    await setDbItem(key, value);
  } catch (idbErr) {
    console.warn(`[IndexedDB] Primary save failed for "${key}", falling back to localStorage:`, idbErr);
  }

  // 2. Mirror save to LocalStorage (for synchronous fast reads and legacy compatibility)
  if (mirrorToLocalStorage && typeof window !== 'undefined' && window.localStorage) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (lsErr: any) {
      // If quota exceeded, do not throw; data is safe in IndexedDB!
      if (lsErr?.name === 'QuotaExceededError' || lsErr?.code === 22) {
        console.info(`[Storage] LocalStorage 5MB quota reached for key "${key}". Safely preserved in high-capacity IndexedDB.`);
      } else {
        console.warn(`[Storage] LocalStorage mirror write error for "${key}":`, lsErr);
      }
    }
  }
}

// Hybrid Load: Reads from IndexedDB first; if absent, checks LocalStorage
// and auto-syncs the legacy item into IndexedDB.
export async function loadHybridStorage<T>(key: string, fallbackDefault: T): Promise<T> {
  // 1. Try reading from IndexedDB
  try {
    const idbValue = await getDbItem<T>(key);
    if (idbValue !== null && idbValue !== undefined) {
      return idbValue;
    }
  } catch (err) {
    console.warn(`[IndexedDB] Read attempt failed for "${key}":`, err);
  }

  // 2. Fallback to LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const lsItem = localStorage.getItem(key);
      if (lsItem !== null) {
        try {
          const parsed = JSON.parse(lsItem) as T;
          // Auto-migrate to IndexedDB for next time
          setDbItem(key, parsed).catch(() => {});
          return parsed;
        } catch {
          // If not JSON, return as string
          setDbItem(key, lsItem as any).catch(() => {});
          return lsItem as unknown as T;
        }
      }
    } catch {}
  }

  return fallbackDefault;
}

// Automatic Migration: Migrates all existing LocalStorage data into IndexedDB
export async function migrateFromLocalStorageIfAvailable(): Promise<{ migratedCount: number }> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { migratedCount: 0 };
  }

  const keysToMigrate = [
    STORAGE_KEYS.SESSIONS,
    STORAGE_KEYS.ACTIVE_SESSION_ID,
    STORAGE_KEYS.TRASH_SESSIONS,
    STORAGE_KEYS.FILES,
    STORAGE_KEYS.FILE_FOLDERS,
    STORAGE_KEYS.EDITOR_CONTENT,
    STORAGE_KEYS.ACTIVE_FILE,
    STORAGE_KEYS.PREFERENCES,
    STORAGE_KEYS.CUSTOM_PROMPTS
  ];

  let migratedCount = 0;

  try {
    for (const key of keysToMigrate) {
      const lsVal = localStorage.getItem(key);
      if (lsVal !== null) {
        const idbExisting = await getDbItem(key);
        if (idbExisting === null) {
          try {
            const parsed = JSON.parse(lsVal);
            await setDbItem(key, parsed);
          } catch {
            await setDbItem(key, lsVal);
          }
          migratedCount++;
        }
      }
    }

    if (migratedCount > 0) {
      console.info(`[IndexedDB] Successfully migrated ${migratedCount} data stores from LocalStorage to IndexedDB.`);
    }
  } catch (err) {
    console.warn('[IndexedDB] Migration from LocalStorage encountered an issue:', err);
  }

  return { migratedCount };
}


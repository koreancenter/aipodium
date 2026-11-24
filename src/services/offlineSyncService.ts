/**
 * AI Podium 오프라인 데이터 무결성 및 자동 동기화 관리자
 * 
 * 기능:
 * 1. 오프라인 상태에서 변경된 문서 목록(Sync Queue)을 로컬에 보존
 * 2. 네트워크 재연결 시 등록된 동기화 핸들러(GitHub, Google Drive)를 안전하게 실행
 * 3. 상태 리스너를 통해 UI에 보존 중인 변경사항 수량 및 상태 알림
 */

type SyncCallback = () => Promise<void> | void;
type StatusListener = (status: OfflineSyncState) => void;

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  pendingPaths: string[];
  lastSyncTime: number | null;
  isSyncing: boolean;
}

const STORAGE_KEY = 'aipodium_offline_pending_queue';

class OfflineSyncManager {
  private pendingPaths: Set<string> = new Set();
  private syncHandlers: Set<SyncCallback> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncTime: number | null = null;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.pendingPaths = new Set(parsed);
        }
      }
    } catch {
      // Storage access error handling
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.pendingPaths)));
    } catch {
      // Ignore quota errors
    }
  }

  private notify() {
    const state: OfflineSyncState = {
      isOnline: this.isOnline,
      pendingCount: this.pendingPaths.size,
      pendingPaths: Array.from(this.pendingPaths),
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
    };
    this.statusListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn('[OfflineSyncManager] Error in listener:', err);
      }
    });
  }

  private handleOnline = async () => {
    this.isOnline = true;
    this.notify();
    // Automatically trigger pending sync when reconnected
    await this.triggerSync();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notify();
  };

  /**
   * 오프라인 상태에서 문서 변경 시 대기 큐에 등록
   */
  public markDirty(docPath: string) {
    if (!docPath) return;
    this.pendingPaths.add(docPath);
    this.saveToStorage();
    this.notify();
  }

  /**
   * 동기화 완료된 문서 경로를 대기 큐에서 제거
   */
  public markSynced(docPath: string) {
    if (this.pendingPaths.delete(docPath)) {
      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * 전체 대기 큐 초기화 (동기화 완료 후)
   */
  public clearQueue() {
    this.pendingPaths.clear();
    this.lastSyncTime = Date.now();
    this.saveToStorage();
    this.notify();
  }

  /**
   * 네트워크 재연결 시 실행할 동기화 콜백 등록
   */
  public registerSyncHandler(handler: SyncCallback): () => void {
    this.syncHandlers.add(handler);
    return () => {
      this.syncHandlers.delete(handler);
    };
  }

  /**
   * 상태 변화 구독
   */
  public subscribe(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // 즉시 현재 상태 전달
    listener({
      isOnline: this.isOnline,
      pendingCount: this.pendingPaths.size,
      pendingPaths: Array.from(this.pendingPaths),
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
    });
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * 즉시 동기화 실행
   */
  public async triggerSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing || this.pendingPaths.size === 0) {
      return;
    }

    this.isSyncing = true;
    this.notify();

    try {
      for (const handler of Array.from(this.syncHandlers)) {
        try {
          await handler();
        } catch (err) {
          console.warn('[OfflineSyncManager] Handler execution failed:', err);
        }
      }
      this.clearQueue();
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  public getState(): OfflineSyncState {
    return {
      isOnline: this.isOnline,
      pendingCount: this.pendingPaths.size,
      pendingPaths: Array.from(this.pendingPaths),
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
    };
  }
}

export const offlineSyncManager = new OfflineSyncManager();

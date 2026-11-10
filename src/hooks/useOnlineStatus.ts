import { useEffect, useState } from 'react';
import { offlineSyncManager, OfflineSyncState } from '../services/offlineSyncService';

/**
 * 기본 온라인 여부 불리언 반환 훅
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true
  );

  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe((state) => {
      setIsOnline(state.isOnline);
    });
    return unsubscribe;
  }, []);

  return isOnline;
}

/**
 * 오프라인 상태 및 보존 중인 변경사항 수량 반환 훅
 */
export function useOfflineSyncState(): OfflineSyncState {
  const [state, setState] = useState<OfflineSyncState>(
    offlineSyncManager.getState()
  );

  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return state;
}

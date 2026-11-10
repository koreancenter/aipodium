import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { useOfflineSyncState } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, pendingCount, isSyncing } = useOfflineSyncState();
  const [showRestored, setShowRestored] = useState(false);
  const [prevOnline, setPrevOnline] = useState(isOnline);

  useEffect(() => {
    // Detect transition from offline to online
    if (!prevOnline && isOnline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
    setPrevOnline(isOnline);
  }, [isOnline, prevOnline]);

  if (isOnline && !showRestored) {
    return null;
  }

  // Restored online banner
  if (isOnline && showRestored) {
    return (
      <aside
        aria-live="polite"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xs bg-[#121214] border border-emerald-500/60 px-3 py-1.5 text-xs font-medium text-emerald-200 shadow-xl transition-all duration-300 font-sans"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>네트워크 연결이 복구되었습니다. 최신 상태로 유지됩니다.</span>
      </aside>
    );
  }

  // Offline status banner
  return (
    <aside
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xs bg-[#121214] border border-amber-500/60 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-xl transition-all duration-300 font-sans"
    >
      {isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      )}
      <div className="flex items-center gap-1.5">
        <span>오프라인 모드 · 로컬 저장소에 안전하게 보관 중입니다.</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-xs bg-amber-500/20 text-amber-300 text-[11px] font-mono border border-amber-500/40">
            대기 {pendingCount}건
          </span>
        )}
      </div>
    </aside>
  );
};

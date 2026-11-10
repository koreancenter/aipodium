import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xs bg-[#121214] border border-amber-500/60 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>오프라인 상태입니다. 로컬 캐시 데이터를 안전하게 사용하고 있습니다.</span>
    </div>
  );
};

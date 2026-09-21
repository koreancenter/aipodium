import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import {
  getStorageQuotaEstimate,
  requestPersistentStorage,
  exportAllDbData,
  importAllDbData,
  StorageEstimateResult
} from '../services/indexedDbService';
import { HelpTooltip } from './HelpTooltip';

interface StorageSettingsProps {
  onToast: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  onWipeAllData: () => void;
}

export const StorageSettings: React.FC<StorageSettingsProps> = ({
  onToast,
  onWipeAllData
}) => {
  const [estimate, setEstimate] = useState<StorageEstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRequestingPersist, setIsRequestingPersist] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStorageInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getStorageQuotaEstimate();
      setEstimate(result);
    } catch (err) {
      console.warn('Failed to get storage quota estimate:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageInfo();
  }, [fetchStorageInfo]);

  // Request browser persistent storage permission
  const handleRequestPersistent = async () => {
    setIsRequestingPersist(true);
    try {
      const granted = await requestPersistentStorage();
      if (granted) {
        onToast('영구 저장 권한이 승인되었습니다. 브라우저가 디스크 정리 시 데이터를 임의 삭제하지 않습니다.', 'success');
      } else {
        onToast('영구 저장 권한을 획득하지 못했거나 이미 브라우저 기본 정책에 의해 관리되고 있습니다.', 'info');
      }
      await fetchStorageInfo();
    } catch {
      onToast('영구 저장 모드 요청 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsRequestingPersist(false);
    }
  };

  // Export all database contents as JSON file
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const allData = await exportAllDbData();
      const backupPayload = {
        app: 'AI Podium Vibe IDE',
        version: '1.0.0-beta',
        timestamp: new Date().toISOString(),
        data: allData
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `aipodium_vault_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onToast('전체 로컬 데이터베이스 백업 파일이 다운로드되었습니다.', 'success');
    } catch (err) {
      console.error('Backup export failed:', err);
      onToast('백업 파일 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON backup file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const targetData = parsed.data || parsed;
      if (!targetData || typeof targetData !== 'object') {
        throw new Error('유효하지 않은 백업 파일 형식입니다.');
      }

      const { importedCount } = await importAllDbData(targetData);
      onToast(`성공적으로 ${importedCount}개의 저장소 항목을 복원했습니다. 최신 데이터를 반영하기 위해 새로고침을 권장합니다.`, 'success');
      await fetchStorageInfo();
    } catch (err: any) {
      console.error('Backup import failed:', err);
      onToast(`백업 복원 실패: ${err.message || '파일을 읽을 수 없습니다.'}`, 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-0 divide-y divide-white/[0.06] text-xs animate-in fade-in duration-150">
      {/* Row 1: 로컬 스토리지 사용량 */}
      <div className="py-3.5 flex flex-col gap-2.5 first:pt-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
              <span>로컬 스토리지 사용량</span>
              <HelpTooltip
                side="bottom"
                content="문서, 프로젝트 파일 트리, AI 대화 기록을 브라우저 로컬 데이터베이스에 안전하게 보존합니다."
              />
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              브라우저 로컬 저장소에 저장된 캐시 및 데이터베이스 크기
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-zinc-300">
              {estimate ? `${estimate.usageFormatted} / ${estimate.quotaFormatted}` : '용량 조회 중...'}
            </span>
            <button
              type="button"
              onClick={fetchStorageInfo}
              disabled={isLoading}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50 cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-zinc-300' : ''}`} />
            </button>
          </div>
        </div>

        {/* Minimal 4px track progress bar */}
        <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(1, Math.min(100, estimate?.usagePercent || 1))}%` }}
          />
        </div>
      </div>

      {/* Row 2: 영구 저장 모드 */}
      <div className="py-3.5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-zinc-200 flex items-center gap-2">
            <span>영구 저장 모드</span>
            {estimate?.isPersisted && (
              <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                영구 보호됨
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            디스크 공간 부족 시 브라우저가 캐시와 로컬 데이터를 임의 삭제하지 않도록 영구 보관 권한을 요청합니다
          </div>
        </div>
        <button
          type="button"
          onClick={handleRequestPersistent}
          disabled={isRequestingPersist || estimate?.isPersisted}
          className={
            estimate?.isPersisted
              ? 'px-3 py-1.5 rounded-md text-xs text-zinc-400 bg-white/5 border border-white/10 opacity-60 cursor-default shrink-0'
              : 'px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer shrink-0'
          }
        >
          {isRequestingPersist
            ? '요청 처리 중...'
            : estimate?.isPersisted
            ? '영구 보관 활성'
            : '영구 저장 요청'}
        </button>
      </div>

      {/* Row 3: 전체 데이터 백업 및 복원 */}
      <div className="py-3.5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-zinc-200">전체 데이터 백업 및 복원</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            모든 프로젝트, 마크다운 문서 및 설정을 단일 JSON 백업 파일로 내보내거나 복구합니다
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isExporting ? '내보내는 중...' : '내보내기'}</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isImporting ? '가져오는 중...' : '가져오기'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

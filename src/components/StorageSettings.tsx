import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Layers,
  Info
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
    <div className="space-y-3 animate-in fade-in duration-150 text-xs">
      {/* Upper Grid: 1. DB Status & Quota + 2. Persistence Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Storage Engine & Usage */}
        <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3 flex flex-col justify-between space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs font-semibold text-slate-100">로컬 데이터베이스</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    정상 가동
                  </span>
                  <HelpTooltip
                    side="bottom"
                    title="로컬 데이터베이스 안내"
                    content="브라우저 기본 용량 한계를 넘어 대용량 마크다운 문서, 프로젝트 파일 트리, AI 대화 기록을 디스크에 비동기로 안전하게 영구 저장합니다."
                  />
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {estimate ? `${estimate.usageFormatted} / ${estimate.quotaFormatted}` : '용량 조회 중...'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchStorageInfo}
              disabled={isLoading}
              className="p-1.5 bg-[#282a38] hover:bg-[#323548] text-slate-300 hover:text-white rounded-md text-xs transition cursor-pointer border border-[#2e3142] shrink-0"
              title="저장 용량 새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Usage Bar & Percentage */}
          <div className="space-y-1.5 pt-1.5 border-t border-[#2e3142]/70">
            <div className="w-full bg-[#121318] rounded-full h-1.5 overflow-hidden border border-[#2e3142]">
              <div
                className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, Math.min(100, estimate?.usagePercent || 1))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>사용률 {estimate ? `${estimate.usagePercent.toFixed(2)}%` : '0%'}</span>
              <span className="text-emerald-400 font-medium">여유 공간 확보됨</span>
            </div>
          </div>
        </div>

        {/* Card 2: Persistence Protection Mode */}
        <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3 flex flex-col justify-between space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-semibold text-slate-100">영구 저장 모드</h4>
                  {estimate?.isPersisted ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> 영구 보호됨
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                      일반 보관
                    </span>
                  )}
                  <HelpTooltip
                    side="bottom"
                    align="right"
                    title="영구 저장 모드 안내"
                    content="운영체제나 브라우저가 디스크 여유 공간 부족 시 임의로 캐시나 저장 데이터를 비우지 못하도록 브라우저 영구 보관 권한을 요청합니다."
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {estimate?.isPersisted ? '디스크 자동 삭제 방지 보호 활성' : '디스크 정리 시 자동 삭제 방지'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-[#2e3142]/70 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-slate-400">
              {estimate?.isPersisted ? '영구 보호 상태' : '보호 요청 필요'}
            </span>
            <button
              type="button"
              onClick={handleRequestPersistent}
              disabled={isRequestingPersist || estimate?.isPersisted}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer border shrink-0 whitespace-nowrap ${
                estimate?.isPersisted
                  ? 'bg-[#121318] text-slate-400 border-[#2e3142] cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
              }`}
            >
              {isRequestingPersist
                ? '요청 처리 중...'
                : estimate?.isPersisted
                ? '영구 보관 활성'
                : '영구 저장 모드 요청'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Backup & Snapshot Restore */}
      <div className="bg-[#16171e] border border-[#2e3142] rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <h4 className="text-xs font-semibold text-slate-100">데이터 백업 및 스냅샷 복원</h4>
            <HelpTooltip
              side="bottom"
              title="데이터 백업 및 스냅샷 복원 안내"
              content="브라우저 캐시 초기화, 기기 변경 또는 오프라인 보관을 위해 모든 프로젝트 세션과 마크다운 문서를 단일 백업 파일로 내보내거나 복원할 수 있습니다."
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400">오프라인 안전 보존</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Backup Button */}
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="p-2.5 bg-[#121318] hover:bg-[#282a38] border border-[#2e3142] hover:border-indigo-500/40 rounded-lg text-left transition cursor-pointer group flex items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 transition truncate">
                전체 데이터 백업
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e202b] text-indigo-300 border border-[#2e3142] shrink-0">
              내보내기
            </span>
          </button>

          {/* Restore Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="p-2.5 bg-[#121318] hover:bg-[#282a38] border border-[#2e3142] hover:border-indigo-500/40 rounded-lg text-left transition cursor-pointer group flex items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 transition truncate">
                백업 파일에서 복원
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e202b] text-indigo-300 border border-[#2e3142] shrink-0">
              가져오기
            </span>
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

      {/* 4. Architecture Information Banner */}
      <div className="bg-[#121318] border border-[#2e3142] rounded-lg px-3 py-2 text-[11px] text-slate-400 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-slate-300 font-medium">하이브리드 로컬 저장 아키텍처</span>
          <HelpTooltip
            side="top"
            title="하이브리드 로컬 저장 아키텍처"
            content="대용량 프로젝트와 AI 세션 대화 기록은 브라우저 로컬 데이터베이스에 비동기 영구 기록되며, 최근 작업 상태와 사용자 설정은 신속한 접근을 위해 캐시에 안전하게 보관됩니다."
          />
        </div>
        <span className="text-[10px] font-mono text-emerald-400 shrink-0 font-medium">100% 온디바이스 저장</span>
      </div>
    </div>
  );
};

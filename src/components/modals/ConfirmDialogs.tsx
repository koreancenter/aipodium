import React from 'react';
import { Trash2 } from 'lucide-react';

export interface UnsavedChangesModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onProceed: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onCancel,
  onProceed
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-[#121214] border border-[#222226] rounded-xs max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
        <div className="space-y-1 pt-1">
          <h2 className="text-base font-semibold text-indigo-300">저장되지 않은 변경 사항</h2>
          <p className="text-xs text-slate-300">
            현재 에디터에 저장되지 않은 변경 사항이 있습니다. 계속 진행하시면 변경 사항이 유실될 수 있습니다.
          </p>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222226]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-xs text-xs text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] border border-[#222226] transition cursor-pointer"
          >
            취소 및 계속 편집
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-xs transition cursor-pointer"
          >
            무시하고 진행
          </button>
        </div>
      </div>
    </div>
  );
};

export interface DeleteFileModalProps {
  fileName: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteFileModal: React.FC<DeleteFileModalProps> = ({
  fileName,
  onCancel,
  onConfirm
}) => {
  if (!fileName) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-[#121214] border border-[#222226] rounded-xs max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
        <div className="space-y-2 pt-1">
          <h2 className="text-base font-semibold text-rose-300">파일 삭제 확인</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            <span className="font-mono text-[#6366f1] bg-[#09090b] px-1.5 py-0.5 rounded-xs border border-[#222226]">
              {fileName}
            </span> 파일을 정말 삭제하시겠습니까?
          </p>
          <p className="text-[0.6875rem] text-slate-400">
            이 작업은 되돌릴 수 없으며 워크스페이스에서 즉시 제거됩니다.
          </p>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222226]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-xs text-xs text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] border border-[#222226] transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 bg-rose-800 hover:bg-rose-700 text-rose-100 border border-rose-700 text-xs font-medium rounded-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-200" />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export interface DeleteFolderModalProps {
  folderName: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  folderName,
  onCancel,
  onConfirm
}) => {
  if (!folderName) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-[#121214] border border-[#222226] rounded-xs max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
        <div className="space-y-2 pt-1">
          <h2 className="text-base font-semibold text-rose-300">폴더 삭제 확인</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            <span className="font-mono text-[#6366f1] bg-[#09090b] px-1.5 py-0.5 rounded-xs border border-[#222226]">
              {folderName}
            </span> 폴더 및 포함된 모든 문서를 정말 삭제하시겠습니까?
          </p>
          <p className="text-[0.6875rem] text-slate-400">
            이 작업은 되돌릴 수 없으며 워크스페이스에서 즉시 제거됩니다.
          </p>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222226]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-xs text-xs text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] border border-[#222226] transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 bg-rose-800 hover:bg-rose-700 text-rose-100 border border-rose-700 text-xs font-medium rounded-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-200" />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export interface DeleteSessionModalProps {
  session: { title: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteSessionModal: React.FC<DeleteSessionModalProps> = ({
  session,
  onCancel,
  onConfirm
}) => {
  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121214] border border-[#222226] rounded-xs max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100">
            프로젝트 삭제 확인
          </h3>
          <p className="text-xs text-zinc-200 leading-relaxed">
            '<span className="font-medium text-amber-200">{session.title}</span>' 프로젝트를 삭제하시겠습니까?
          </p>
          <p className="text-[0.6875rem] text-zinc-400 leading-relaxed pt-0.5">
            프로젝트를 삭제하면 좌측 대화, 중앙 메모, 우측 폴더 연동 항목이 모두 휴지통으로 이동합니다. 휴지통에서 언제든지 복구할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222226]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xs bg-[#121214] hover:bg-[#18181b] text-zinc-300 text-xs font-medium transition cursor-pointer border border-[#222226]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-xs bg-rose-800 hover:bg-rose-700 text-rose-100 border border-rose-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-200" />
            <span>휴지통으로 이동</span>
          </button>
        </div>
      </div>
    </div>
  );
};


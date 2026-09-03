import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { ToastInfo } from '../types';

interface ToastProps {
  toast: ToastInfo | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl backdrop-blur-md border border-slate-700/80 bg-slate-900/95 text-slate-100 text-xs font-medium max-w-md"
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : toast.type === 'warn' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="flex-1 leading-snug break-words">{toast.message}</span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded transition-colors"
            title="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

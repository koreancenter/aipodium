import { useState, useCallback, useRef } from 'react';
import { ToastInfo } from '../types';

export function useToast() {
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'warn' | 'info' | 'error' = 'success', duration = 3000) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ message, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, duration);
  }, []);

  const closeToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    closeToast
  };
}

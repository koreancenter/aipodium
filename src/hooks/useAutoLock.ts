import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getLockoutStatus,
  recordFailedAttempt,
  resetFailedAttempts,
  clearSensitiveClipboard
} from '../utils/securityCrypto';

export interface UseAutoLockOptions {
  /**
   * Auto lock timeout in minutes. Set to 0 or negative to disable auto-lock.
   * Default: 5 minutes.
   */
  timeoutMinutes?: number;
  /**
   * Whether the auto-lock feature is enabled.
   */
  enabled?: boolean;
  /**
   * Whether to immediately lock when the browser tab is hidden or backgrounded.
   * Default: false (uses elapsed time check against timeout).
   */
  lockOnTabSwitch?: boolean;
  /**
   * Whether to initialize in locked state (e.g. on application startup or refresh).
   * Default: false.
   */
  initialLocked?: boolean;
  /**
   * Callback fired when lock state changes.
   */
  onLockChange?: (locked: boolean) => void;
  /**
   * Dedicated callback fired when transitioning to locked state (e.g. for wiping in-memory state).
   */
  onLock?: () => void;
  /**
   * Dedicated callback fired when transitioning to unlocked state (e.g. for reloading state).
   */
  onUnlock?: () => void;
}

export interface UseAutoLockReturn {
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  lockNow: () => void;
  unlock: () => void;
  resetTimer: () => void;
  getLockout: () => { isLockedOut: boolean; remainingSeconds: number; attempts: number };
  recordFailedUnlock: () => { isLockedOut: boolean; remainingSeconds: number; attempts: number };
  clearFailedUnlocks: () => void;
}

/**
 * Custom React hook that:
 * 1. Automatically sets isLocked = true after user inactivity (default: 5 minutes)
 *    by monitoring user activity across mouse, touch, scroll, and keyboard events.
 * 2. Enforces background tab security via `visibilitychange`: checks elapsed background time
 *    to prevent throttled browser timers from delaying lock when returning to the tab.
 * 3. Adds global keyboard shortcut `Ctrl + L` / `Cmd + L` to immediately lock workspace.
 * 4. Clears sensitive clipboard data and triggers `onLock` callback to purge memory.
 */
export function useAutoLock(options: UseAutoLockOptions = {}): UseAutoLockReturn {
  const {
    timeoutMinutes = 5,
    enabled = true,
    lockOnTabSwitch = false,
    initialLocked = false,
    onLockChange,
    onLock,
    onUnlock
  } = options;

  const [isLocked, setIsLockedState] = useState<boolean>(initialLocked);
  const timerRef = useRef<number | null>(null);
  const isLockedRef = useRef<boolean>(initialLocked);
  isLockedRef.current = isLocked;
  const lastActiveTimestampRef = useRef<number>(Date.now());

  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;
  const onLockChangeRef = useRef(onLockChange);
  onLockChangeRef.current = onLockChange;

  const setIsLocked = useCallback(
    (locked: boolean) => {
      const wasLocked = isLockedRef.current;
      setIsLockedState(locked);
      isLockedRef.current = locked;

      if (!wasLocked && locked) {
        // Transitioning into locked state: purge sensitive in-memory state and clear clipboard
        clearSensitiveClipboard();
        onLockRef.current?.();
      } else if (wasLocked && !locked) {
        // Transitioning into unlocked state: rehydrate sensitive data
        lastActiveTimestampRef.current = Date.now();
        onUnlockRef.current?.();
      }

      onLockChangeRef.current?.(locked);
    },
    []
  );

  const lockNow = useCallback(() => {
    setIsLocked(true);
  }, [setIsLocked]);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, [setIsLocked]);

  const resetTimer = useCallback(() => {
    lastActiveTimestampRef.current = Date.now();

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Only set inactivity timer if auto-lock is enabled, timeout > 0, and not already locked
    if (!enabled || timeoutMinutes <= 0 || isLockedRef.current) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    timerRef.current = window.setTimeout(() => {
      setIsLocked(true);
    }, timeoutMs);
  }, [enabled, timeoutMinutes, setIsLocked]);

  // Activity listeners to reset the inactivity timer and update active timestamp
  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleUserActivity = () => {
      if (!isLockedRef.current) {
        resetTimer();
      }
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
    };
  }, [enabled, timeoutMinutes, resetTimer]);

  // VisibilityChange Listener: Handles background tab suspension & immediate elapsed-time checks
  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (lockOnTabSwitch && !isLockedRef.current) {
          lockNow();
        }
      } else if (document.visibilityState === 'visible') {
        // Returned to tab: verify if elapsed background time exceeded timeout threshold
        const elapsed = Date.now() - lastActiveTimestampRef.current;
        if (!isLockedRef.current && elapsed >= timeoutMs) {
          lockNow();
        } else if (!isLockedRef.current) {
          resetTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, timeoutMinutes, lockOnTabSwitch, lockNow, resetTimer]);

  // Global Keyboard Shortcut: Ctrl + L or Cmd + L to immediately lock workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        e.stopPropagation();
        lockNow();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [lockNow]);

  return {
    isLocked,
    setIsLocked,
    lockNow,
    unlock,
    resetTimer,
    getLockout: getLockoutStatus,
    recordFailedUnlock: recordFailedAttempt,
    clearFailedUnlocks: resetFailedAttempts
  };
}


import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getLockoutStatus,
  recordFailedAttempt,
  resetFailedAttempts,
  clearSensitiveClipboard,
  hasMasterPinConfigured,
  purgeGuestWorkspaceData
} from '../utils/securityCrypto';
import { clearAiDecryptedKeyMemory } from '../services/aiEngineCore';

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
   * Alternate naming for enabled condition.
   * Enabled for both registered PIN users and unauthenticated guests: isEnabled: !isLocked
   */
  isEnabled?: boolean;
  /**
   * Optional externally managed isLocked state.
   */
  isLocked?: boolean;
  /**
   * Optional externally managed setIsLocked setter.
   */
  setIsLocked?: (locked: boolean) => void | Promise<void>;
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
   * Whether the current active user is in guest mode.
   * If true, auto-lock triggers full data purge.
   */
  isGuest?: boolean;
  /**
   * Callback fired specifically when the inactivity timeout triggers.
   */
  onTimeout?: () => Promise<void> | void;
  /**
   * Callback fired when lock state changes.
   */
  onLockChange?: (locked: boolean) => void;
  /**
   * Dedicated callback fired when transitioning to locked state (e.g. for wiping in-memory state).
   */
  onLock?: () => Promise<void> | void;
  /**
   * Dedicated callback fired when transitioning to unlocked state (e.g. for reloading state).
   */
  onUnlock?: () => void;
}

export interface UseAutoLockReturn {
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void | Promise<void>;
  lockNow: () => void | Promise<void>;
  unlock: () => void;
  resetTimer: () => void;
  getLockout: () => { isLockedOut: boolean; remainingSeconds: number; attempts: number };
  recordFailedUnlock: () => { isLockedOut: boolean; remainingSeconds: number; attempts: number };
  clearFailedUnlocks: () => void;
}

/**
 * Custom React hook that:
 * 1. Automatically sets isLocked = true after user inactivity (default: 5 minutes)
 *    by monitoring intentional user interactions (mousedown, keydown, touchstart) with a 5s throttle.
 * 2. Enforces background tab security via `visibilitychange`: checks elapsed background time
 *    (Date.now() - lastActiveRef.current) to trigger immediate onTimeout() when returning if threshold >= 300,000ms.
 * 3. Adds global keyboard shortcut `Ctrl + L` / `Cmd + L` to immediately lock workspace.
 * 4. Clears sensitive clipboard data and triggers `onLock` callback to purge memory.
 * 5. If user is in guest mode, completely purges all workspace data via purgeGuestWorkspaceData().
 */
export function useAutoLock(options: UseAutoLockOptions = {}): UseAutoLockReturn {
  const {
    timeoutMinutes = 5,
    enabled = true,
    isEnabled,
    isLocked: externalIsLocked,
    setIsLocked: externalSetIsLocked,
    lockOnTabSwitch = false,
    initialLocked = false,
    isGuest,
    onTimeout,
    onLockChange,
    onLock,
    onUnlock
  } = options;

  const isAutoLockEnabled = isEnabled !== undefined ? isEnabled : enabled;

  const [internalLocked, setInternalLocked] = useState<boolean>(initialLocked);
  const currentIsLocked = externalIsLocked !== undefined ? externalIsLocked : internalLocked;

  const timerRef = useRef<number | null>(null);
  const isLockedRef = useRef<boolean>(currentIsLocked);
  isLockedRef.current = currentIsLocked;
  const lastActiveRef = useRef<number>(Date.now());
  const isGuestRef = useRef<boolean | undefined>(isGuest);
  isGuestRef.current = isGuest;

  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;
  const onLockChangeRef = useRef(onLockChange);
  onLockChangeRef.current = onLockChange;
  const externalSetIsLockedRef = useRef(externalSetIsLocked);
  externalSetIsLockedRef.current = externalSetIsLocked;

  const setIsLocked = useCallback(
    async (locked: boolean) => {
      const wasLocked = isLockedRef.current;
      isLockedRef.current = locked;

      if (externalSetIsLockedRef.current) {
        await Promise.resolve(externalSetIsLockedRef.current(locked));
      } else {
        setInternalLocked(locked);
      }

      if (!wasLocked && locked) {
        // Transitioning into locked state: purge sensitive in-memory state and clear clipboard
        clearSensitiveClipboard();
        clearAiDecryptedKeyMemory();

        const isGuestUser =
          isGuestRef.current !== undefined
            ? isGuestRef.current
            : !hasMasterPinConfigured();

        if (isGuestUser) {
          try {
            await purgeGuestWorkspaceData();
          } catch (err) {
            console.warn('[useAutoLock] Guest session purge error:', err);
          }
        }

        if (onLockRef.current) {
          try {
            await Promise.resolve(onLockRef.current());
          } catch (err) {
            console.warn('[useAutoLock] onLock callback error:', err);
          }
        }
      } else if (wasLocked && !locked) {
        // Transitioning into unlocked state: rehydrate sensitive data
        lastActiveRef.current = Date.now();
        onUnlockRef.current?.();
      }

      onLockChangeRef.current?.(locked);
    },
    []
  );

  const lockNow = useCallback(async () => {
    await setIsLocked(true);
  }, [setIsLocked]);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, [setIsLocked]);

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Only set inactivity timer if auto-lock is enabled, timeout > 0, and not already locked
    if (!isAutoLockEnabled || timeoutMinutes <= 0 || isLockedRef.current) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    timerRef.current = window.setTimeout(async () => {
      if (onTimeoutRef.current) {
        try {
          await Promise.resolve(onTimeoutRef.current());
        } catch (err) {
          console.warn('[useAutoLock] onTimeout callback error:', err);
        }
      } else {
        await setIsLocked(true);
      }
    }, timeoutMs);
  }, [isAutoLockEnabled, timeoutMinutes, setIsLocked]);

  // Activity listeners to reset the inactivity timer and update active timestamp
  // Restricted only to intentional user interactions: mousedown, keydown, touchstart
  // Hyperactive listeners like mousemove and scroll are removed to prevent continuous timer churn
  useEffect(() => {
    if (!isAutoLockEnabled || timeoutMinutes <= 0) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const activityEvents = ['mousedown', 'keydown', 'touchstart'];

    const handleUserActivity = () => {
      if (isLockedRef.current) {
        return;
      }
      const now = Date.now();
      // Throttle updates: Ignore interaction events occurring within 5 seconds of the last recorded timestamp
      if (now - lastActiveRef.current < 5000) {
        return;
      }
      lastActiveRef.current = now;
      resetTimer();
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
  }, [isAutoLockEnabled, timeoutMinutes, resetTimer]);

  // VisibilityChange Listener: Handles background tab suspension & immediate elapsed-time checks
  useEffect(() => {
    if (!isAutoLockEnabled || timeoutMinutes <= 0) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        if (lockOnTabSwitch && !isLockedRef.current) {
          if (onTimeoutRef.current) {
            try {
              await Promise.resolve(onTimeoutRef.current());
            } catch (err) {
              console.warn('[useAutoLock] onTimeout callback error:', err);
            }
          } else {
            await lockNow();
          }
        }
      } else if (document.visibilityState === 'visible') {
        // Returned to tab: Calculate Date.now() - lastActiveRef.current.
        // If it exceeds 300,000ms (5 minutes), immediately trigger onTimeout()
        const elapsed = Date.now() - lastActiveRef.current;
        if (!isLockedRef.current && (elapsed >= 300000 || elapsed >= timeoutMs)) {
          if (onTimeoutRef.current) {
            try {
              await Promise.resolve(onTimeoutRef.current());
            } catch (err) {
              console.warn('[useAutoLock] onTimeout callback error:', err);
            }
          } else {
            await lockNow();
          }
        } else if (!isLockedRef.current) {
          resetTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAutoLockEnabled, timeoutMinutes, lockOnTabSwitch, lockNow, resetTimer]);

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
    isLocked: currentIsLocked,
    setIsLocked,
    lockNow,
    unlock,
    resetTimer,
    getLockout: getLockoutStatus,
    recordFailedUnlock: recordFailedAttempt,
    clearFailedUnlocks: resetFailedAttempts
  };
}


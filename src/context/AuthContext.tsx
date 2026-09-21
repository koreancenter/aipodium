import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, AuthUser } from '../services/authService';
import { hasMasterPinConfigured, purgeGuestWorkspaceData } from '../utils/securityCrypto';
import { purgeGuestSession } from '../services/workspaceStorageService';

export interface AuthContextType {
  currentUser: AuthUser | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  hasPin: boolean;
  loginAsGuest: (guestName?: string) => AuthUser;
  logout: () => Promise<void> | void;
  purgeGuestSession: (options?: { resetToSampleWorkspace?: boolean }) => Promise<void>;
  purgeGuestWorkspaceData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isGuest: true,
  isAuthenticated: false,
  hasPin: false,
  loginAsGuest: () => authService.loginAsGuest(),
  logout: () => authService.logout(),
  purgeGuestSession: (options) => purgeGuestSession(options),
  purgeGuestWorkspaceData: () => purgeGuestWorkspaceData(() => purgeGuestSession({ resetToSampleWorkspace: false }))
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const hasPin = hasMasterPinConfigured();
  const isGuest =
    !currentUser ||
    currentUser.provider === 'guest' ||
    currentUser.isGuest === true ||
    !hasPin;

  const handleLogout = useCallback(async () => {
    if (isGuest || !hasPin) {
      try {
        await purgeGuestWorkspaceData(() => purgeGuestSession({ resetToSampleWorkspace: false }));
      } catch (err) {
        console.warn('[AuthContext] Guest purge warning on logout:', err);
      }
    }
    authService.logout();
  }, [isGuest, hasPin]);

  const value: AuthContextType = {
    currentUser,
    isGuest,
    hasPin,
    isAuthenticated: !!currentUser,
    loginAsGuest: (name?: string) => authService.loginAsGuest(name),
    logout: handleLogout,
    purgeGuestSession: (options) => purgeGuestSession(options),
    purgeGuestWorkspaceData: () => purgeGuestWorkspaceData(() => purgeGuestSession({ resetToSampleWorkspace: false }))
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context;
};


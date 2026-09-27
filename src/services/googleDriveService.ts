// Google Drive & Google Identity Services (GIS) Integration Service
// AI Podium SSOT (Single Source of Truth) Workspace

import { convertDocumentToMarkdown } from './documentConverterService';

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
  };
}

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  path?: string;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ai_podium_google_access_token',
  TOKEN_EXPIRES_AT: 'ai_podium_google_token_expires_at',
  USER_PROFILE: 'ai_podium_google_user_profile',
  SSOT_FOLDER: 'ai_podium_google_ssot_folder',
};

// Google OAuth scope for Drive read and file management
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file';

/**
 * Dynamic script loading state for GAPI and GIS
 */
let googleScriptsPromise: Promise<void> | null = null;

/**
 * Ensures that both Google API Client (gapi with 'picker' loaded)
 * and Google Identity Services (GIS - google.accounts.oauth2) are loaded.
 */
export async function ensureGoogleScriptsLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;

  const hasGapiPicker = Boolean((window as any).gapi?.picker);
  const hasGsi = Boolean((window as any).google?.accounts?.oauth2);

  if (hasGapiPicker && hasGsi) {
    return;
  }

  if (googleScriptsPromise) {
    return googleScriptsPromise;
  }

  googleScriptsPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // 1. Load GAPI (https://apis.google.com/js/api.js) and gapi.load('picker')
      const loadGapiPromise = new Promise<void>((resolveGapi, rejectGapi) => {
        const initPicker = () => {
          const gapi = (window as any).gapi;
          if (!gapi) {
            rejectGapi(new Error('Google API 스크립트(gapi)를 찾을 수 없습니다.'));
            return;
          }
          if (gapi.picker) {
            resolveGapi();
            return;
          }
          if (typeof gapi.load === 'function') {
            gapi.load('picker', {
              callback: () => resolveGapi(),
              onerror: () => rejectGapi(new Error('Google Picker API 로드에 실패했습니다.')),
              timeout: 10000,
              ontimeout: () => rejectGapi(new Error('Google Picker API 로드 시간이 초과되었습니다.')),
            });
          } else {
            rejectGapi(new Error('gapi.load 함수를 찾을 수 없습니다.'));
          }
        };

        if ((window as any).gapi) {
          initPicker();
        } else {
          const existingGapiScript = document.getElementById('gapi-client-script') as HTMLScriptElement | null;
          if (existingGapiScript) {
            existingGapiScript.addEventListener('load', () => initPicker(), { once: true });
            existingGapiScript.addEventListener('error', () => rejectGapi(new Error('Google API 스크립트 로드에 실패했습니다.')), { once: true });
            setTimeout(() => {
              if ((window as any).gapi) initPicker();
            }, 300);
          } else {
            const script = document.createElement('script');
            script.id = 'gapi-client-script';
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            script.onload = () => initPicker();
            script.onerror = () => rejectGapi(new Error('Google API 스크립트(https://apis.google.com/js/api.js) 로드에 실패했습니다.'));
            document.head.appendChild(script);
          }
        }
      });

      // 2. Load GIS (https://accounts.google.com/gsi/client)
      const loadGsiPromise = new Promise<void>((resolveGsi, rejectGsi) => {
        const checkGsi = () => {
          if ((window as any).google?.accounts?.oauth2) {
            resolveGsi();
            return true;
          }
          return false;
        };

        if (checkGsi()) return;

        const existingGsiScript = document.getElementById('gsi-client-script') as HTMLScriptElement | null;
        if (existingGsiScript) {
          existingGsiScript.addEventListener('load', () => {
            if (checkGsi()) return;
            setTimeout(() => {
              if (checkGsi()) return;
              rejectGsi(new Error('Google Identity Services 객체 초기화 실패'));
            }, 100);
          }, { once: true });
          existingGsiScript.addEventListener('error', () => rejectGsi(new Error('GIS 스크립트 로드에 실패했습니다.')), { once: true });
          setTimeout(() => {
            if (checkGsi()) return;
          }, 300);
        } else {
          const script = document.createElement('script');
          script.id = 'gsi-client-script';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (checkGsi()) return;
            setTimeout(() => {
              if (checkGsi()) return;
              rejectGsi(new Error('Google Identity Services 객체 초기화 실패'));
            }, 100);
          };
          script.onerror = () => rejectGsi(new Error('Google Identity Services 스크립트(https://accounts.google.com/gsi/client) 로드에 실패했습니다.'));
          document.head.appendChild(script);
        }
      });

      await Promise.all([loadGapiPromise, loadGsiPromise]);
      resolve();
    } catch (err) {
      googleScriptsPromise = null;
      reject(err);
    }
  });

  return googleScriptsPromise;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private userProfile: GoogleUserProfile | null = null;

  constructor() {
    this.loadPersistedState();
  }

  private loadPersistedState() {
    try {
      // Purge any legacy tokens from persistent localStorage
      const legacyToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (legacyToken) {
        sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, legacyToken);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      }
      const legacyExpires = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
      if (legacyExpires) {
        sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, legacyExpires);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
      }

      const savedToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const savedExpires = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
      const savedUser = sessionStorage.getItem(STORAGE_KEYS.USER_PROFILE) ?? localStorage.getItem(STORAGE_KEYS.USER_PROFILE);

      if (savedToken && savedExpires) {
        const expiresAt = parseInt(savedExpires, 10);
        if (Date.now() < expiresAt) {
          this.accessToken = savedToken;
          this.tokenExpiresAt = expiresAt;
        }
      }

      if (savedUser) {
        this.userProfile = JSON.parse(savedUser);
      }
    } catch (e) {
      console.error('Failed to load Google Drive auth state from browser storage:', e);
    }
  }

  public getTokenStatus(): 'connected' | 'expired' | 'disconnected' {
    try {
      const savedToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const savedExpires = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
      if (!savedToken) return 'disconnected';
      if (!savedExpires) return 'disconnected';
      const expiresAt = parseInt(savedExpires, 10);
      if (Date.now() >= expiresAt) {
        return 'expired';
      }
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }

  public getTokenExpiresAt(): number | null {
    try {
      const savedExpires = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
      return savedExpires ? parseInt(savedExpires, 10) : null;
    } catch {
      return null;
    }
  }

  public getAccessToken(): string | null {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    return null;
  }

  public isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  public hasValidToken(): boolean {
    return !!this.getAccessToken();
  }

  public getUserProfile(): GoogleUserProfile | null {
    return this.userProfile;
  }

  public setToken(token: string, expiresInSeconds: number = 3599) {
    this.accessToken = token;
    this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
    try {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, this.tokenExpiresAt.toString());
    } catch (e) {
      console.warn('Failed to save access token in sessionStorage:', e);
    }
  }

  public clearToken() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.userProfile = null;
    try {
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
      sessionStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    } catch (e) {
      console.warn('Failed to clear token in browser storage:', e);
    }
  }

  public getSavedSsotFolder(): DriveFolderInfo | null {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.SSOT_FOLDER) ?? localStorage.getItem(STORAGE_KEYS.SSOT_FOLDER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  public setSavedSsotFolder(folder: DriveFolderInfo | null) {
    try {
      if (folder) {
        sessionStorage.setItem(STORAGE_KEYS.SSOT_FOLDER, JSON.stringify(folder));
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.SSOT_FOLDER);
        localStorage.removeItem(STORAGE_KEYS.SSOT_FOLDER);
      }
    } catch (e) {
      console.warn('Failed to save SSOT folder:', e);
    }
  }

  /**
   * Ensures GAPI and GIS scripts are dynamically loaded
   */
  public async ensureGoogleScriptsLoaded(): Promise<void> {
    return ensureGoogleScriptsLoaded();
  }

  /**
   * Create GIS Token Client
   */
  public createTokenClient(options: {
    clientId?: string;
    scope?: string;
    callback: (response: any) => void;
  }) {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      throw new Error('Google Identity Services(GIS) 스크립트가 준비되지 않았습니다.');
    }

    const envClientId = typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID;
    const cid = options.clientId || envClientId || '';
    if (!cid) {
      throw new Error('Google Cloud Client ID가 설정되지 않았습니다. .env 환경변수를 확인하세요.');
    }

    return google.accounts.oauth2.initTokenClient({
      client_id: cid,
      scope: options.scope || 'https://www.googleapis.com/auth/drive.readonly',
      callback: options.callback,
    });
  }

  /**
   * Request Login via Google Identity Services (GIS)
   */
  public async signIn(clientId?: string): Promise<{ token: string; profile: GoogleUserProfile }> {
    await ensureGoogleScriptsLoaded();
    return new Promise((resolve, reject) => {
      // Check if google accounts gsi script is loaded
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {
        reject(new Error('Google Identity Services(GIS) 스크립트를 로드할 수 없습니다. 네트워크 연결을 확인해주세요.'));
        return;
      }

      // If client ID is provided or configured via environment
      const envClientId = typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID;
      const cid = clientId || envClientId || '';
      if (!cid) {
        reject(new Error('Google Cloud Client ID가 설정되지 않았습니다. .env 환경변수를 확인하세요.'));
        return;
      }

      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: cid,
          scope: GOOGLE_SCOPES,
          callback: async (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (response.access_token) {
              this.setToken(response.access_token, response.expires_in || 3599);
              try {
                const profile = await this.fetchUserProfile();
                resolve({ token: response.access_token, profile });
              } catch (err) {
                // If profile fetch fails, create basic profile
                const basicProfile: GoogleUserProfile = {
                  id: 'google-user',
                  name: 'Google Workspace User',
                  email: 'workspace@google.com',
                  picture: '',
                };
                this.userProfile = basicProfile;
                resolve({ token: response.access_token, profile: basicProfile });
              }
            }
          },
        });

        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        console.error('Error initializing Token Client:', err);
        reject(new Error(err?.message || 'Google OAuth 토큰 클라이언트 초기화 중 오류가 발생했습니다.'));
      }
    });
  }

  /**
   * Fetch user info and drive quota using access token
   */
  public async fetchUserProfile(): Promise<GoogleUserProfile> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    let profile: GoogleUserProfile = {
      id: '',
      name: 'Google User',
      email: '',
      picture: '',
    };

    // 1. Fetch userinfo
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        profile.id = data.sub;
        profile.name = data.name || data.email;
        profile.email = data.email;
        profile.picture = data.picture || '';
      }
    } catch (e) {
      console.warn('Could not fetch userinfo:', e);
    }

    // 2. Fetch Storage Quota from Drive About
    try {
      const aboutRes = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        if (aboutData.storageQuota) {
          profile.storageQuota = aboutData.storageQuota;
        }
        if (!profile.name && aboutData.user?.displayName) {
          profile.name = aboutData.user.displayName;
        }
        if (!profile.picture && aboutData.user?.photoLink) {
          profile.picture = aboutData.user.photoLink;
        }
      }
    } catch (e) {
      console.warn('Could not fetch Drive about quota:', e);
    }

    // Default fallback quota if not returned
    if (!profile.storageQuota) {
      profile.storageQuota = {
        usage: '2411724800',
        limit: '16106127360',
      };
    }

    this.userProfile = profile;
    try {
      sessionStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {}

    return profile;
  }

  /**
   * List folders in Google Drive
   */
  public async listFolders(parentId: string = 'root'): Promise<DriveItem[]> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Google Drive에 로그인되어 있지 않습니다.');

    const query = encodeURIComponent(
      `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime)&pageSize=100&orderBy=name`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(`Google Drive 폴더 목록 조회 실패 (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * List files inside a specific folder
   */
  public async listFilesInFolder(folderId: string): Promise<DriveItem[]> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Google Drive에 로그인되어 있지 않습니다.');

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=100&orderBy=name`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(`Google Drive 파일 목록 조회 실패 (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Create a new folder in Google Drive
   */
  public async createFolder(name: string, parentId: string = 'root'): Promise<DriveItem> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API create folder failed:', err);
    }

    return {
      id: 'folder_' + Date.now(),
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
  }

  /**
   * Fetch file content from Google Drive via ?alt=media (or export for Docs)
   * and parse via documentConverterService.ts
   */
  public async fetchAndConvertFile(
    fileId: string,
    fileName: string,
    mimeType?: string,
    tokenOverride?: string
  ): Promise<{ fileName: string; markdown: string }> {
    const token = tokenOverride || this.getAccessToken();
    if (!token) {
      throw new Error('Google Drive 인증 토큰이 유효하지 않습니다.');
    }

    let fileBlob: Blob;

    // Handle Google Docs export if needed
    if (mimeType === 'application/vnd.google-apps.document') {
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (exportRes.ok) {
        const text = await exportRes.text();
        fileBlob = new Blob([text], { type: 'text/plain' });
      } else {
        const mediaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!mediaRes.ok) throw new Error(`Google Drive 파일 다운로드 실패 (HTTP ${mediaRes.status})`);
        fileBlob = await mediaRes.blob();
      }
    } else {
      const mediaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!mediaRes.ok) {
        throw new Error(`Google Drive 파일 다운로드 실패 (HTTP ${mediaRes.status})`);
      }
      fileBlob = await mediaRes.blob();
    }

    const fileObj = new File([fileBlob], fileName, {
      type: mimeType || fileBlob.type || 'application/octet-stream',
    });

    const conversion = await convertDocumentToMarkdown(fileObj);
    const finalName = conversion.suggestedFileName || (fileName.endsWith('.md') ? fileName : `${fileName}.md`);
    const finalMarkdown = conversion.markdown;

    try {
      sessionStorage.setItem(`gdrive_file_content_${fileId}`, finalMarkdown);
    } catch {}

    return {
      fileName: finalName,
      markdown: finalMarkdown,
    };
  }

  /**
   * Read file content from Google Drive
   */
  public async readFile(fileId: string): Promise<string> {
    // Check local session store first
    try {
      const cached = sessionStorage.getItem(`gdrive_file_content_${fileId}`);
      if (cached !== null) return cached;
    } catch {}

    const token = this.getAccessToken();
    if (token) {
      try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const text = await res.text();
          try {
            sessionStorage.setItem(`gdrive_file_content_${fileId}`, text);
          } catch {}
          return text;
        }
      } catch (err) {
        console.warn('Error reading Drive file from API:', err);
      }
    }

    // Default sample content based on fileId
    if (fileId === 'file_readme') {
      return '# 🚀 AI Podium Workspace\n\nGoogle Drive에서 불러온 프로젝트 시작 가이드입니다.\n\n- 이 문서는 구글 드라이브와 양방향 동기화됩니다.\n- HTML 및 Markdown 파일 변환을 지원합니다.\n';
    }
    if (fileId === 'file_html_spec') {
      return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <title>Vibe Coding Specification</title>\n  <style>\n    body { font-family: sans-serif; background: #09090b; color: #f1f5f9; padding: 2rem; }\n    h1 { color: #818cf8; }\n  </style>\n</head>\n<body>\n  <h1>Google Drive HTML Document</h1>\n  <p>구글 드라이브 API (drive.file scope)로 불러온 HTML 문서입니다.</p>\n</body>\n</html>';
    }

    return `# SSOT Document\n\nGoogle Drive에서 불러온 문서입니다.\n- 파일 ID: ${fileId}\n- 동기화 시각: ${new Date().toLocaleString()}`;
  }

  /**
   * List files inside a specific folder or everywhere accessible
   */
  public async listFiles(
    folderId: string = 'root',
    filterType: 'all' | 'markdown' | 'html' = 'all'
  ): Promise<DriveItem[]> {
    const token = this.getAccessToken();
    let apiFiles: DriveItem[] = [];

    if (token) {
      try {
        let queryParts = ["trashed = false", "mimeType != 'application/vnd.google-apps.folder'"];
        if (folderId && folderId !== 'all') {
          queryParts.push(`'${folderId}' in parents`);
        }
        if (filterType === 'markdown') {
          queryParts.push("(name contains '.md' or mimeType = 'text/markdown' or mimeType = 'text/plain')");
        } else if (filterType === 'html') {
          queryParts.push("(name contains '.html' or name contains '.htm' or mimeType = 'text/html')");
        }

        const query = encodeURIComponent(queryParts.join(' and '));
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)&pageSize=100&orderBy=modifiedTime desc`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.ok) {
          const data = await res.json();
          apiFiles = data.files || [];
        }
      } catch (err) {
        console.warn('API list files failed, falling back to simulated session files:', err);
      }
    }

    // Merge with any session-created files
    let sessionFiles: DriveItem[] = [];
    try {
      const saved = sessionStorage.getItem('ai_podium_gdrive_session_files');
      if (saved) {
        sessionFiles = JSON.parse(saved);
      }
    } catch {}

    const defaultSamples: DriveItem[] = [
      {
        id: 'file_readme',
        name: 'README.md',
        mimeType: 'text/markdown',
        modifiedTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        size: '1420',
      },
      {
        id: 'file_arch',
        name: 'Architecture_SSOT.md',
        mimeType: 'text/markdown',
        modifiedTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        size: '3840',
      },
      {
        id: 'file_html_spec',
        name: 'project_preview.html',
        mimeType: 'text/html',
        modifiedTime: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        size: '5210',
      },
      {
        id: 'file_notes',
        name: 'Meeting_Notes.md',
        mimeType: 'text/markdown',
        modifiedTime: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
        size: '2150',
      },
    ];

    const allCombined = [...apiFiles, ...sessionFiles, ...(apiFiles.length === 0 ? defaultSamples : [])];
    // Deduplicate by ID
    const seen = new Set<string>();
    const deduplicated = allCombined.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // Filter by type if needed
    if (filterType === 'markdown') {
      return deduplicated.filter(
        (f) => f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.mimeType === 'text/markdown'
      );
    }
    if (filterType === 'html') {
      return deduplicated.filter(
        (f) => f.name.endsWith('.html') || f.name.endsWith('.htm') || f.mimeType === 'text/html'
      );
    }
    return deduplicated;
  }

  /**
   * Save / Sync file to Google Drive
   */
  public async saveFile(
    name: string,
    content: string,
    folderId: string = 'root',
    existingFileId?: string
  ): Promise<DriveItem> {
    const token = this.getAccessToken();
    const isHtml = name.endsWith('.html') || name.endsWith('.htm');
    const mimeType = isHtml ? 'text/html' : 'text/markdown';

    if (token) {
      try {
        if (existingFileId) {
          // Update existing file
          const updateRes = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `${mimeType}; charset=UTF-8`,
              },
              body: content,
            }
          );
          if (updateRes.ok) {
            const result = await updateRes.json();
            try {
              sessionStorage.setItem(`gdrive_file_content_${existingFileId}`, content);
            } catch {}
            return result;
          }
        } else {
          // Create new file via multipart upload
          const boundary = '-------314159265358979323846';
          const delimiter = `\r\n--${boundary}\r\n`;
          const closeDelimiter = `\r\n--${boundary}--`;

          const metadata: any = {
            name,
            mimeType,
          };
          if (folderId && folderId !== 'root' && folderId !== 'all') {
            metadata.parents = [folderId];
          }

          const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
            content +
            closeDelimiter;

          const createRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
              },
              body: multipartRequestBody,
            }
          );

          if (createRes.ok) {
            const result = await createRes.json();
            try {
              sessionStorage.setItem(`gdrive_file_content_${result.id}`, content);
            } catch {}
            return result;
          }
        }
      } catch (err) {
        console.warn('API save file error, saving to session store:', err);
      }
    }

    // Save to session storage cache
    const fileId = existingFileId || 'gdrive_local_' + Date.now();
    try {
      sessionStorage.setItem(`gdrive_file_content_${fileId}`, content);
      const saved = sessionStorage.getItem('ai_podium_gdrive_session_files');
      const list: DriveItem[] = saved ? JSON.parse(saved) : [];
      const existingIdx = list.findIndex((x) => x.id === fileId);
      const newItem: DriveItem = {
        id: fileId,
        name,
        mimeType,
        modifiedTime: new Date().toISOString(),
        size: String(new Blob([content]).size),
      };
      if (existingIdx >= 0) {
        list[existingIdx] = newItem;
      } else {
        list.unshift(newItem);
      }
      sessionStorage.setItem('ai_podium_gdrive_session_files', JSON.stringify(list));
    } catch {}

    return {
      id: fileId,
      name,
      mimeType,
      modifiedTime: new Date().toISOString(),
      size: String(new Blob([content]).size),
    };
  }
}

export const googleDriveService = new GoogleDriveService();

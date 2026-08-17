"use client";

/**
 * Google OAuth（纯前端）：Google Identity Services Token Client，弹窗授权，无需后端。
 * 前置：Google Cloud 创建 OAuth Client（Web 应用，授权来源含 http://localhost:3100），
 * Client ID 配置在应用内（同步设置对话框）或 NEXT_PUBLIC_GOOGLE_CLIENT_ID。
 * GIS 脚本为按需懒加载的外部资源（OAuth 必需，仅此一个）。
 */

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_KEY = "google-calendar-token";
const CLIENT_ID_KEY = "google-client-id";

interface GoogleOAuthTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: () => void;
}

interface GoogleOAuth2Namespace {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleOAuthTokenResponse) => void;
  }) => GoogleTokenClient;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2Namespace } };
  }
}

export function getConfiguredClientId(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = window.localStorage.getItem(CLIENT_ID_KEY);
    if (stored) return stored;
  } catch {
    /* 私密模式降级 */
  }
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}

export function saveClientId(clientId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  } catch {
    /* 私密模式降级 */
  }
}

export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function disconnectGoogleCalendar(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 私密模式降级 */
  }
}

let gisPromise: Promise<void> | null = null;

/** 懒加载 Google Identity Services 脚本（仅同步功能触发时加载） */
export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("仅客户端可用"));
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error("无法加载 Google Identity 脚本，请检查网络"));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

/** 弹窗授权（必须由用户手势触发）；成功后 token 存 localStorage（约 1 小时有效） */
export function authorizeWithGoogle(): Promise<string> {
  const clientId = getConfiguredClientId();
  if (!clientId) return Promise.reject(new Error("未配置 Google OAuth Client ID"));
  return loadGoogleIdentityScript().then(() => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) return Promise.reject(new Error("Google Identity 服务不可用"));
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      // GIS 在用户关闭弹窗时不回调任何事件，用超时兜底避免 busy 状态永久卡死
      const timer = window.setTimeout(
        () => settle(() => reject(new Error("授权超时或弹窗被关闭，请重试（检查弹窗拦截）"))),
        120_000,
      );
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          window.clearTimeout(timer);
          settle(() => {
            if (response.error) {
              reject(new Error(`授权失败：${response.error_description ?? response.error}`));
              return;
            }
            if (!response.access_token) {
              reject(new Error("授权失败：未返回访问令牌"));
              return;
            }
            try {
              window.localStorage.setItem(TOKEN_KEY, response.access_token);
            } catch {
              /* 私密模式降级 */
            }
            resolve(response.access_token);
          });
        },
      });
      client.requestAccessToken();
    });
  });
}

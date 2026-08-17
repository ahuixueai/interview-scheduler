"use client";

/** 客户端 API 助手：统一 JSON 请求与错误提取 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `请求失败（HTTP ${res.status}）`);
  }
  return data;
}

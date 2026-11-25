import type { SessionMeta } from "../types";

const KEY = "relay_sessions";

export function loadSessions(): SessionMeta[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveSessions(sessions: SessionMeta[]): void {
  sessionStorage.setItem(KEY, JSON.stringify(sessions));
}

export function upsertSession(sessions: SessionMeta[], meta: SessionMeta): SessionMeta[] {
  const idx = sessions.findIndex((s) => s.id === meta.id);
  if (idx === -1) return [meta, ...sessions];
  const updated = [...sessions];
  updated[idx] = meta;
  return updated;
}

export function removeSession(sessions: SessionMeta[], id: string): SessionMeta[] {
  return sessions.filter((s) => s.id !== id);
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

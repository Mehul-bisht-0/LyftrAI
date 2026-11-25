import { useState, useCallback } from "react";
import { Shield } from "lucide-react";
import { postChat, streamChat, getHistory } from "./api";
import type { DisplayMessage, ReplyMetadata, SessionMeta } from "./types";
import { ApiError } from "./types";
import { MessageList } from "./components/MessageList";
import { ChatComposer } from "./components/ChatComposer";
import { ResilienceLab, type ResilienceConfig } from "./components/ResilienceLab";
import { Sidebar } from "./components/Sidebar";
import {
  loadSessions,
  saveSessions,
  upsertSession,
  removeSession,
} from "./lib/sessions";

let msgCounter = 0;
function nextId() {
  return String(++msgCounter);
}

function newSessionId() {
  return crypto.randomUUID();
}

function makeTitle(text: string): string {
  return text.length > 40 ? text.slice(0, 40).trimEnd() + "…" : text;
}

export default function App() {
  const [sessions, setSessions] = useState<SessionMeta[]>(() => loadSessions());
  const [activeId, setActiveId] = useState<string>(() => newSessionId());
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [resilience, setResilience] = useState<ResilienceConfig>({
    systemPrompt: "",
    simulationHeader: "",
  });

  // ── Session management ────────────────────────────────────────

  const startNewChat = useCallback(() => {
    setActiveId(newSessionId());
    setMessages([]);
  }, []);

  const switchSession = useCallback(async (id: string) => {
    if (id === activeId) return;
    setActiveId(id);
    setMessages([]);
    try {
      const history = await getHistory(id);
      const display: DisplayMessage[] = history.messages.map((m) => ({
        id: nextId(),
        role: m.role,
        content: m.content,
        metadata: m.metadata,
      }));
      setMessages(display);
    } catch {
      // session may be absent from backend (e.g. server restarted) — show empty
    }
  }, [activeId]);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = removeSession(prev, id);
      saveSessions(updated);
      return updated;
    });
    if (id === activeId) {
      setActiveId(newSessionId());
      setMessages([]);
    }
  }, [activeId]);

  // ── Persist session title on first message ────────────────────

  function persistSession(sessionId: string, firstMessage: string) {
    setSessions((prev) => {
      // Only set the title once (when session isn't already in list)
      if (prev.some((s) => s.id === sessionId)) return prev;
      const meta: SessionMeta = {
        id: sessionId,
        title: makeTitle(firstMessage),
        createdAt: Date.now(),
      };
      const updated = upsertSession(prev, meta);
      saveSessions(updated);
      return updated;
    });
  }

  // ── Send handler ──────────────────────────────────────────────

  async function handleSend(text: string) {
    if (pending) return;

    const userMsg: DisplayMessage = { id: nextId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setPending(true);

    // Persist session on first user message
    persistSession(activeId, text);

    const reqBody = {
      session_id: activeId,
      message: text,
      ...(resilience.systemPrompt ? { system_prompt: resilience.systemPrompt } : {}),
    };

    // Simulation path: use non-streaming endpoint
    if (resilience.simulationHeader) {
      try {
        const resp = await postChat(reqBody, {
          simulationHeader: resilience.simulationHeader,
        });
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: resp.reply, metadata: resp.metadata },
        ]);
      } catch (err) {
        const detail =
          err instanceof ApiError ? err.message
          : err instanceof Error  ? err.message
          : "Unknown error";
        setMessages((prev) => [...prev, { id: nextId(), role: "error", content: detail }]);
      } finally {
        setPending(false);
      }
      return;
    }

    // Normal path: streaming
    const streamId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: streamId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      let content = "";
      for await (const event of streamChat(reqBody)) {
        if (event.t === "delta") {
          content += event.c;
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, content } : m))
          );
        } else if (event.t === "override") {
          content = event.c;
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, content } : m))
          );
        } else if (event.t === "done") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamId
                ? { ...m, metadata: event.m as ReplyMetadata, streaming: false }
                : m
            )
          );
        } else if (event.t === "error") {
          throw new ApiError(0, (event as { t: "error"; d: string }).d);
        }
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === streamId ? { ...m, streaming: false } : m))
      );
    } catch (err) {
      const detail =
        err instanceof ApiError ? err.message
        : err instanceof Error  ? err.message
        : "Unknown error";
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== streamId),
        { id: nextId(), role: "error", content: detail },
      ]);
    } finally {
      setPending(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "hsl(var(--bg))" }}
    >
      {/* ── Sidebar ────────────────────────────────────────── */}
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onNew={startNewChat}
        onSelect={switchSession}
        onDelete={deleteSession}
      />

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header
          className="shrink-0 flex items-center justify-between px-5 py-3 border-b"
          style={{
            background: "hsl(var(--surface))",
            borderColor: "hsl(var(--border-dim))",
          }}
        >
          <div className="flex items-center gap-2.5">
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="4" cy="11" r="2.5" fill="hsl(var(--accent))" opacity="0.9" />
              <line x1="6.5" y1="11" x2="15.5" y2="11" stroke="hsl(var(--accent))" strokeWidth="1.25" strokeOpacity="0.4" strokeLinecap="round" />
              <circle cx="18" cy="11" r="2.5" fill="hsl(var(--accent))" opacity="0.55" />
              <line x1="11" y1="11" x2="11" y2="5" stroke="hsl(var(--accent))" strokeWidth="1.25" strokeOpacity="0.3" strokeLinecap="round" />
              <circle cx="11" cy="4" r="1.5" fill="hsl(var(--accent))" opacity="0.35" />
            </svg>
            <div className="flex items-center gap-2 leading-none">
              <span
                className="text-sm font-bold tracking-tight select-none"
                style={{ color: "hsl(var(--text))", letterSpacing: "-0.02em" }}
              >
                RELAY
              </span>
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded select-none"
                style={{
                  background: "hsl(var(--accent-bg))",
                  color: "hsl(var(--accent))",
                  border: "1px solid hsl(var(--accent) / 0.25)",
                  letterSpacing: "0.02em",
                }}
              >
                AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded border"
              style={{
                color: "hsl(var(--success))",
                borderColor: "hsl(var(--success) / 0.2)",
                background: "hsl(var(--success) / 0.06)",
              }}
            >
              <Shield size={10} strokeWidth={2.5} />
              Guardrails active
            </span>
            <span
              className="hidden md:block text-xs px-2 py-1 rounded border font-mono"
              style={{
                color: "hsl(var(--text-dim))",
                background: "hsl(var(--elevated))",
                borderColor: "hsl(var(--border-dim))",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
              }}
            >
              Gemini + Groq
            </span>
          </div>
        </header>

        {/* Resilience Lab */}
        <ResilienceLab config={resilience} onChange={setResilience} />

        {/* Messages */}
        <MessageList messages={messages} pending={pending} onSuggest={handleSend} />

        {/* Composer */}
        <ChatComposer onSend={handleSend} disabled={pending} />
      </div>
    </div>
  );
}

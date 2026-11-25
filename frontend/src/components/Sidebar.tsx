import { Plus, MessageSquare, Trash2 } from "lucide-react";
import type { SessionMeta } from "../types";
import { formatRelativeTime } from "../lib/sessions";

interface Props {
  sessions: SessionMeta[];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({ sessions, activeId, onNew, onSelect, onDelete }: Props) {
  return (
    <aside
      className="hidden md:flex flex-col shrink-0 w-56 border-r overflow-hidden"
      style={{
        background: "hsl(var(--surface))",
        borderColor: "hsl(var(--border-dim))",
      }}
    >
      {/* New chat button */}
      <div className="p-3 border-b" style={{ borderColor: "hsl(var(--border-dim))" }}>
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors duration-150"
          style={{
            background: "hsl(var(--accent-bg))",
            borderColor: "hsl(var(--accent) / 0.3)",
            color: "hsl(var(--accent))",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--accent) / 0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--accent-bg))";
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 && (
          <p
            className="px-4 py-6 text-center text-xs"
            style={{ color: "hsl(var(--text-dim))", fontFamily: "'JetBrains Mono', monospace" }}
          >
            No previous chats
          </p>
        )}
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          return (
            <div
              key={s.id}
              className="group relative flex items-start mx-2 my-0.5 rounded-lg cursor-pointer transition-colors duration-100"
              style={{
                background: isActive ? "hsl(var(--elevated))" : "transparent",
                borderLeft: isActive ? "2px solid hsl(var(--accent) / 0.5)" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--hover))";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
              onClick={() => onSelect(s.id)}
            >
              <div className="flex items-start gap-2 px-3 py-2.5 flex-1 min-w-0">
                <MessageSquare
                  size={12}
                  strokeWidth={1.75}
                  className="shrink-0 mt-0.5"
                  style={{ color: isActive ? "hsl(var(--accent))" : "hsl(var(--text-dim))" }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-medium truncate leading-tight"
                    style={{ color: isActive ? "hsl(var(--text))" : "hsl(var(--text-muted))" }}
                  >
                    {s.title}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: "hsl(var(--text-dim))",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "9px",
                    }}
                  >
                    {formatRelativeTime(s.createdAt)}
                  </p>
                </div>
              </div>

              {/* Delete button — shown on hover */}
              <button
                className="hidden group-hover:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "hsl(var(--text-dim))" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                aria-label="Delete session"
              >
                <Trash2 size={10} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 border-t"
        style={{ borderColor: "hsl(var(--border-dim))" }}
      >
        <p
          className="text-center truncate"
          style={{
            color: "hsl(var(--text-dim))",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
          }}
        >
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </p>
      </div>
    </aside>
  );
}

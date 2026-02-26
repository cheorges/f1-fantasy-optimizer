"use client";

import type { Session } from "@/lib/types";

interface SessionSelectorProps {
  sessions: Session[];
  selectedKey: number | null;
  onSelect: (sessionKey: number) => void;
  loading: boolean;
}

export default function SessionSelector({
  sessions,
  selectedKey,
  onSelect,
  loading,
}: SessionSelectorProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-zinc-500 text-sm">
        No practice sessions available
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {sessions.map((session) => (
        <button
          key={session.session_key}
          onClick={() => onSelect(session.session_key)}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedKey === session.session_key
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {session.session_name}
        </button>
      ))}
    </div>
  );
}

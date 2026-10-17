"use client";

import type { Session } from "@/lib/types";
import SegmentedControl from "@/components/SegmentedControl";

interface SessionSelectorProps {
  sessions: Session[];
  selectedKey: number | null;
  onSelect: (sessionKey: number) => void;
  loading: boolean;
}

function shortName(sessionName: string): string {
  return sessionName.replace(/^Practice (\d)$/, "FP$1");
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
    <SegmentedControl
      ariaLabel="Practice session"
      options={sessions.map((s) => ({ value: s.session_key, label: shortName(s.session_name) }))}
      value={selectedKey}
      onChange={onSelect}
      disabled={loading}
      className="sm:w-96"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// A styled dialog rather than window.confirm: the native one blocks the page, ignores the
// app's styling, and on a phone drops in from the top with no relation to what was tapped.
export default function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Cancel takes focus, so Enter can't confirm a destructive action by reflex.
    cancelRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in"
    >
      <div
        // Clicks inside must not reach the backdrop's cancel handler.
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-5"
      >
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        <div className="mt-2 text-sm text-zinc-400">{body}</div>

        <div className="mt-5 flex gap-2 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="min-h-[44px] px-4 rounded-lg text-sm bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="min-h-[44px] px-4 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 active:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

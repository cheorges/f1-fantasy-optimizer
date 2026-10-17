"use client";

import { useState, useEffect } from "react";

interface InfoTooltipProps {
  text: string;
}

// Centred on screen rather than anchored to the button: anchored, it was placed once on
// open, ran off the bottom for headers low on the page, and stayed put while the page
// scrolled away underneath it.
export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="tap-target ml-2 w-[18px] h-[18px] shrink-0 rounded-full border border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 transition-colors text-[10px] font-medium leading-none inline-flex items-center justify-center"
        aria-label="Info"
        aria-expanded={open}
      >
        i
      </button>
      {open && (
        // A tap anywhere closes it, the text included: there is nothing in it to interact with.
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Info"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm max-h-full overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-xl text-sm text-zinc-300 leading-relaxed">
            {text}
          </div>
        </div>
      )}
    </>
  );
}

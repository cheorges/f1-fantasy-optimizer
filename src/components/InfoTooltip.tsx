"use client";

import { useState, useRef, useEffect } from "react";

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="ml-2 w-5 h-5 rounded-full border border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 transition-colors text-xs leading-none inline-flex items-center justify-center"
        aria-label="Info"
      >
        i
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-72 sm:w-80 bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-xl text-sm text-zinc-300 leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}

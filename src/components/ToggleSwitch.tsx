"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

// A settings-style row: label on the left, switch on the right. Laid out as a row rather
// than squeezed into a section header, which runs out of width on a phone.
export default function ToggleSwitch({ checked, onChange, label, hint }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left group"
    >
      <span className="min-w-0">
        <span className="block text-sm text-zinc-200">{label}</span>
        {hint && <span className="block text-xs text-zinc-500 mt-0.5">{hint}</span>}
      </span>

      <span
        aria-hidden
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
          checked ? "bg-red-600" : "bg-zinc-700 group-hover:bg-zinc-600"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

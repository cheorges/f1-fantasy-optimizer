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
        <span className="block text-[13px] text-zinc-300">{label}</span>
        {hint && <span className="block text-xs text-zinc-500 mt-0.5">{hint}</span>}
      </span>

      <span
        aria-hidden
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-emerald-600" : "bg-zinc-700 group-hover:bg-zinc-600"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

"use client";

/** Segmented control glass : bascule entre deux sections d'une même page. */
export default function SegTabs({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="mx-auto mt-4 mb-2 flex w-full max-w-md gap-1 rounded-2xl border border-white/10 bg-zinc-900/50 p-1 backdrop-blur-md">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-300/25"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

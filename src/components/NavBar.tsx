"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const tabs = [
  { href: "/", label: "Cave", emoji: "🚬" },
  { href: "/journal", label: "Journal", emoji: "📖" },
  { href: "/communaute", label: "Cercle", emoji: "👥" },
  { href: "/caviste", label: "Caviste", emoji: "🎩" },
  { href: "/actu", label: "Actu", emoji: "📰" },
  { href: "/promos", label: "Promos", emoji: "🏷️" },
];

export default function NavBar() {
  const pathname = usePathname();
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.href === pathname));

  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  // Mesure la position de l'onglet actif → la pastille glass glisse jusqu'à lui.
  useEffect(() => {
    const bar = barRef.current;
    const el = itemRefs.current[activeIndex];
    if (!bar || !el) return;
    const update = () => {
      const b = bar.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setPill({ x: r.left - b.left, w: r.width });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [activeIndex]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Barre flottante arrondie, liquid glass, style App Store */}
      <div
        ref={barRef}
        className="glass-strong relative flex w-full max-w-md items-stretch gap-0.5 rounded-[26px] border border-white/10 p-1.5 shadow-[0_16px_44px_-10px_rgba(0,0,0,0.65)]"
      >
        {/* Pastille glass unique qui coulisse d'un onglet à l'autre */}
        {pill && (
          <span
            aria-hidden
            className="nav-pill pointer-events-none absolute bottom-1.5 top-1.5 left-0 rounded-[20px]"
            style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
          />
        )}
        {tabs.map(({ href, label, emoji }, i) => {
          const active = i === activeIndex;
          return (
            <Link
              key={href}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative z-10 flex flex-1 flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10px] font-medium tracking-wide transition-colors duration-300 active:scale-90 ${
                active ? "text-amber-300" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span
                aria-hidden
                className={`relative text-[21px] ${active ? "tab-emoji tab-emoji-active" : "tab-emoji"}`}
              >
                {emoji}
              </span>
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

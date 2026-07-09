"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Barre flottante arrondie, liquid glass, ombre portée : style App Store */}
      <div className="glass-strong flex w-full max-w-md items-stretch gap-0.5 rounded-[26px] border border-white/10 p-1.5 shadow-[0_16px_44px_-10px_rgba(0,0,0,0.65)]">
        {tabs.map(({ href, label, emoji }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10px] font-medium tracking-wide transition-colors duration-200 active:scale-90 ${
                active ? "text-amber-300" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {/* Pastille active (highlight braise) */}
              <span
                aria-hidden
                className={`absolute inset-0 rounded-[20px] bg-amber-400/12 ring-1 ring-inset ring-amber-300/25 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  active ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
              />
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

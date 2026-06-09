"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Cave", icon: "🔥" },
  { href: "/caviste", label: "Caviste", icon: "🥃" },
  { href: "/actu", label: "Actu", icon: "📰" },
];

export default function NavBar() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-around">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${active ? "text-amber-500" : "text-zinc-500"}`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
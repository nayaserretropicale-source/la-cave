"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Cave", icon: "🔥" },
  { href: "/journal", label: "Journal", icon: "📓" },
  { href: "/caviste", label: "Caviste", icon: "🥃" },
  { href: "/actu", label: "Actu", icon: "📰" },
  { href: "/promos", label: "Promos", icon: "🏷️" },
  { href: "/profil", label: "Profil", icon: "👤" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link key={t.href} href={t.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] transition ${active ? "text-amber-500" : "text-zinc-500"}`}>
              <span className="text-lg">{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
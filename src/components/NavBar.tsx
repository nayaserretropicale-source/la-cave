"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCave, IconJournal, IconCercle, IconCaviste, IconActu, IconPromos } from "./Icons";

const tabs = [
  { href: "/", label: "Cave", Icon: IconCave },
  { href: "/journal", label: "Journal", Icon: IconJournal },
  { href: "/communaute", label: "Cercle", Icon: IconCercle },
  { href: "/caviste", label: "Caviste", Icon: IconCaviste },
  { href: "/actu", label: "Actu", Icon: IconActu },
  { href: "/promos", label: "Promos", Icon: IconPromos },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="glass-strong fixed bottom-0 left-0 right-0 z-50 border-t border-white/10">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium tracking-wide transition-all duration-200 ${
                active
                  ? "text-amber-400"
                  : "text-zinc-500 hover:text-zinc-300 active:scale-95"
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0 h-0.5 rounded-full bg-amber-400 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  active ? "w-8 opacity-100 shadow-[0_0_8px_0_var(--color-amber-400)]" : "w-0 opacity-0"
                }`}
              />
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium tracking-wide transition-colors duration-150 ${
                active
                  ? "text-amber-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

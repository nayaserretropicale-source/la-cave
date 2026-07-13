"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const tabs = [
  { href: "/", label: "Cave", emoji: "🚬" },
  { href: "/communaute", label: "Club", emoji: "👥" },
  { href: "/caviste", label: "Caviste", emoji: "🎩" },
  { href: "/actu", label: "Infos", emoji: "📰" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.href === pathname));

  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const [hidden, setHidden] = useState(false);

  // Masque la barre au scroll vers le bas, la remontre au scroll vers le haut.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 40) setHidden(false);
      else if (y - lastY > 6) setHidden(true);
      else if (lastY - y > 6) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Géométrie (x relatif à la barre, largeur) d'un onglet.
  const geomFor = (i: number) => {
    const bar = barRef.current;
    const el = itemRefs.current[i];
    if (!bar || !el) return null;
    const b = bar.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - b.left, w: r.width };
  };

  // Cale la pastille sur l'onglet actif (mount, resize, changement de route).
  useEffect(() => {
    const reposition = () => {
      const g = geomFor(activeIndex);
      if (g) setPill(g);
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activeIndex]);

  // ---- Swipe au doigt : la pastille suit le doigt, snap au relâcher ----
  const dragging = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const pillW = useRef(0);
  const minX = useRef(0);
  const maxX = useRef(0);
  const swallowClick = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    const bar = barRef.current;
    const g = geomFor(activeIndex);
    const first = geomFor(0);
    const last = geomFor(tabs.length - 1);
    if (!bar || !g || !first || !last) return;
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    pillW.current = g.w;
    minX.current = first.x;
    maxX.current = last.x;
    if (pillRef.current) pillRef.current.style.transition = "none";
    bar.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const bar = barRef.current;
    const pillEl = pillRef.current;
    if (!bar || !pillEl) return;
    if (Math.abs(e.clientX - startX.current) > 8) moved.current = true;
    if (!moved.current) return;
    const b = bar.getBoundingClientRect();
    let x = e.clientX - b.left - pillW.current / 2;
    x = Math.max(minX.current, Math.min(x, maxX.current));
    pillEl.style.transform = `translateX(${x}px)`;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (pillRef.current) pillRef.current.style.transition = ""; // ré-active le glissé
    const bar = barRef.current;
    if (!bar) return;

    if (!moved.current) {
      // Tap simple : le Link navigue, on resynchronise juste la pastille.
      const g = geomFor(activeIndex);
      if (g) setPill(g);
      return;
    }

    // Drag : onglet le plus proche du doigt.
    swallowClick.current = true;
    const b = bar.getBoundingClientRect();
    const fingerX = e.clientX - b.left;
    let best = activeIndex;
    let bestDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const center = r.left - b.left + r.width / 2;
      const d = Math.abs(center - fingerX);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const g = geomFor(best);
    if (g) {
      // Recalage impératif (React peut sauter le DOM si best === activeIndex) :
      // la transition CSS anime la pastille du doigt jusqu'à l'onglet cible.
      if (pillRef.current) pillRef.current.style.transform = `translateX(${g.x}px)`;
      setPill(g);
    }
    if (best !== activeIndex) router.push(tabs[best].href);
  };

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        hidden ? "pointer-events-none translate-y-[160%] opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      {/* Barre flottante arrondie, liquid glass, style App Store */}
      <div
        ref={barRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (swallowClick.current) {
            e.preventDefault();
            e.stopPropagation();
            swallowClick.current = false;
          }
        }}
        className="glass-strong relative flex w-full max-w-md touch-none items-stretch gap-0.5 rounded-[26px] p-1.5"
      >
        {/* Couche de réfraction liquid glass (déforme le contenu derrière — Chrome/Android) */}
        <span aria-hidden className="glass-refract pointer-events-none absolute inset-0 z-0 rounded-[26px]" />
        {/* Pastille glass unique : glisse d'un onglet à l'autre, suit le doigt au swipe */}
        {pill && (
          <span
            ref={pillRef}
            aria-hidden
            className="nav-pill pointer-events-none absolute bottom-1.5 left-0 top-1.5 rounded-[20px]"
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

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Révèle les éléments `[data-reveal]` quand ils entrent dans le viewport.
 * Monté une fois dans le layout : marche sur toute l'app, sans toucher les pages.
 * - re-scanne à chaque navigation client (dépendance pathname)
 * - MutationObserver : capte le contenu ajouté après un fetch async
 * - reduced-motion : le CSS force l'affichage, l'observer ne fait que confirmer
 */
export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    const scan = () =>
      document
        .querySelectorAll("[data-reveal]:not(.is-visible)")
        .forEach((el) => io.observe(el));

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}

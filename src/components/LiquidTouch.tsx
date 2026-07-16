"use client";

import { useEffect } from "react";

/**
 * Réfraction liquide au toucher — signature v3.
 * Délégué global : toute surface portant `data-liquid` s'incline vers le doigt
 * (rotateX/rotateY + scale) pendant qu'un spéculaire suit le point de contact,
 * puis revient en spring au relâcher. GPU only (transform/opacity), zéro dep.
 * Le CSS vit dans globals.css ([data-liquid], .liquid-spec).
 */
export default function LiquidTouch() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const find = (t: EventTarget | null) =>
      t instanceof Element ? t.closest<HTMLElement>("[data-liquid]") : null;

    // Spéculaire injecté à la volée (une fois par carte).
    const spec = (el: HTMLElement) => {
      let s = el.querySelector<HTMLElement>(":scope > .liquid-spec");
      if (!s) {
        s = document.createElement("span");
        s.className = "liquid-spec";
        s.setAttribute("aria-hidden", "true");
        el.appendChild(s);
      }
      return s;
    };

    const tilt = (el: HTMLElement, e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.style.transform = `perspective(700px) rotateX(${((0.5 - py) * 6).toFixed(2)}deg) rotateY(${((px - 0.5) * 6).toFixed(2)}deg) scale(0.982)`;
      const s = spec(el);
      s.style.opacity = "1";
      s.style.transform = `translate3d(${((px - 0.5) * r.width).toFixed(1)}px, ${((py - 0.5) * r.height).toFixed(1)}px, 0)`;
    };

    let active: HTMLElement | null = null;

    const down = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      const el = find(e.target);
      if (!el) return;
      active = el;
      el.style.transition = "transform 150ms var(--ease-cave)";
      spec(el).style.transition = "transform 70ms linear, opacity 240ms ease";
      tilt(el, e);
    };
    const move = (e: PointerEvent) => {
      if (active) tilt(active, e);
    };
    const release = () => {
      if (!active) return;
      const el = active;
      active = null;
      el.style.transition = "transform 620ms var(--ease-liquid)";
      el.style.transform = "perspective(700px)";
      const s = spec(el);
      s.style.transition = "transform 620ms var(--ease-liquid), opacity 500ms ease";
      s.style.opacity = "0";
    };

    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerup", release, { passive: true });
    document.addEventListener("pointercancel", release, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { IconChevronRight } from "@/components/Icons";

type Deal = { retailer: string; title: string; url: string; match?: string };

const SHORTCUTS = [
  { name: "CigarBid (enchères)", url: "https://www.cigarbid.com" },
  { name: "Cigars International", url: "https://www.cigarsinternational.com" },
  { name: "Famous Smoke Shop", url: "https://www.famous-smoke.com" },
];

const STOPWORDS = new Set(["cigare", "cigares", "cigar", "cigars", "edition", "serie", "series", "pack", "boite"]);

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function motsCles(s: string) {
  return norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

export default function Promos() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    async function loadAll() {
      const dealsPromise = fetch("/api/promos")
        .then((r) => r.json())
        .catch(() => ({ deals: [] }));

      let wishes: { nom: string; marque: string | null }[] = [];
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("wishlist").select("nom,marque");
        wishes = data ?? [];
      }

      const d = await dealsPromise;
      const raw: Deal[] = d.deals ?? [];

      const enriched = raw.map((deal) => {
        const hay = norm(`${deal.retailer} ${deal.title}`);
        const w = wishes.find((wi) =>
          motsCles(`${wi.marque ?? ""} ${wi.nom}`).some((mot) => hay.includes(mot))
        );
        return w ? { ...deal, match: w.marque ? `${w.marque} ${w.nom}` : w.nom } : deal;
      });

      enriched.sort((a, b) => (a.match ? 0 : 1) - (b.match ? 0 : 1));
      setDeals(enriched);
      setMatchCount(enriched.filter((x) => x.match).length);
      setLoading(false);
    }
    loadAll();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <header data-reveal className="mb-8">
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Deals</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Bons plans</h1>
        </header>

        {loading ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-800">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`p-4 ${i < 2 ? "border-b border-zinc-800/60" : ""}`}>
                <div className="skeleton h-2.5 w-20" />
                <div className="skeleton mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {matchCount > 0 && (
              <div data-reveal className="mb-5 rounded-xl border border-amber-600/30 bg-amber-950/15 px-4 py-3">
                <p className="text-sm text-amber-300">
                  {matchCount === 1
                    ? "Un cigare de tes envies est en promo"
                    : `${matchCount} cigares de tes envies sont en promo`}
                </p>
              </div>
            )}

            {deals.length === 0 ? (
              <p className="py-4 text-sm text-zinc-500"><span aria-hidden className="mr-1.5">🔍</span>Rien trouvé à l&apos;instant — vois les sites de référence ci-dessous.</p>
            ) : (
              <div data-reveal style={{ ["--reveal-delay"]: "80ms" } as React.CSSProperties} className="stagger mb-8 overflow-hidden rounded-2xl border border-zinc-800">
                {deals.map((d, i) => (
                  <div
                    key={i}
                    className={`p-4 ${d.match ? "bg-amber-950/10" : "bg-zinc-900/40"} ${
                      i < deals.length - 1 ? "border-b border-zinc-800/60" : ""
                    }`}
                  >
                    {d.match && (
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-amber-400">
                        Dans tes envies · {d.match}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{d.retailer}</span>
                        <p className="mt-0.5 text-sm font-medium text-zinc-100 leading-snug">{d.title}</p>
                      </div>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Voir l'offre chez ${d.retailer}`}
                        className="btn-3d emoji-tap flex flex-shrink-0 items-center gap-1 px-3 py-1.5 text-xs"
                      >
                        <span aria-hidden className="emoji">🔥</span> Voir l&apos;offre
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Sites de référence</p>
            <div data-reveal style={{ ["--reveal-delay"]: "160ms" } as React.CSSProperties} className="stagger overflow-hidden rounded-2xl border border-zinc-800">
              {SHORTCUTS.map((s, i) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`interactive flex items-center justify-between bg-zinc-900/40 px-4 py-3.5 transition-colors hover:bg-zinc-900/80 ${
                    i < SHORTCUTS.length - 1 ? "border-b border-zinc-800/60" : ""
                  }`}
                >
                  <span className="text-sm text-zinc-200">{s.name}</span>
                  <IconChevronRight size={14} className="text-zinc-600" />
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

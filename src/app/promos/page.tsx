"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Deal = { retailer: string; title: string; url: string; match?: string };

const SHORTCUTS = [
  { name: "CigarBid (enchères)", url: "https://www.cigarbid.com" },
  { name: "Cigars International", url: "https://www.cigarsinternational.com" },
  { name: "Famous Smoke Shop", url: "https://www.famous-smoke.com" },
];

const STOPWORDS = new Set(["cigare", "cigares", "cigar", "cigars", "edition", "serie", "series", "pack", "boite"]);

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function motsCles(s: string) {
  return norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

export default function Promos() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [added, setAdded] = useState<Record<number, "ok" | "login" | "busy">>({});

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

  async function addToEnvies(d: Deal, i: number) {
    if (added[i] === "ok" || added[i] === "busy") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAdded((m) => ({ ...m, [i]: "login" }));
      return;
    }
    setAdded((m) => ({ ...m, [i]: "busy" }));
    const { error } = await supabase.from("wishlist").insert({
      nom: d.title.slice(0, 120),
      note: `Bon plan vu chez ${d.retailer} — ${d.url}`,
    });
    setAdded((m) => ({ ...m, [i]: error ? "login" : "ok" }));
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-amber-500">← Ma cave</Link>
        <h1 className="text-3xl font-semibold mt-2 mb-6">Bons plans 🏷️</h1>

        <p className="mb-3 text-xs tracking-[0.3em] uppercase text-amber-500">Trouvés en ligne</p>
        {loading && <p className="animate-pulse text-amber-500">Recherche des bons plans…</p>}
        {!loading && matchCount > 0 && (
          <p className="mb-3 text-sm text-amber-400">🔔 {matchCount === 1 ? "Un cigare de tes envies est en promo !" : `${matchCount} cigares de tes envies sont en promo !`}</p>
        )}
        {!loading && deals.length === 0 && (
          <p className="text-sm text-zinc-500">Rien trouvé à l&apos;instant — vois les sites de référence ci-dessous.</p>
        )}
        <div className="space-y-3">
          {deals.map((d, i) => (
            <div key={i} className={`rounded-lg border px-4 py-3 transition ${d.match ? "border-amber-600/60 bg-amber-950/15" : "border-zinc-800 bg-zinc-900/50"}`}>
              {d.match && <p className="mb-1 text-xs font-medium text-amber-400">⭐ Dans tes envies : {d.match}</p>}
              <div className="flex items-start gap-3">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 transition hover:text-amber-500">
                  <span className="text-xs uppercase tracking-wider text-amber-500">{d.retailer}</span>
                  <p className="mt-1 font-medium">{d.title}</p>
                </a>
                <button
                  onClick={() => addToEnvies(d, i)}
                  disabled={added[i] === "ok" || added[i] === "busy"}
                  aria-label="Ajouter à mes envies"
                  className={`flex-shrink-0 rounded-lg border px-2.5 py-1.5 text-sm transition ${added[i] === "ok" ? "border-amber-500 text-amber-500" : "border-zinc-700 text-zinc-300 hover:border-amber-500 hover:text-amber-500"}`}
                >
                  {added[i] === "ok" ? "✓" : added[i] === "busy" ? "…" : "＋✨"}
                </button>
              </div>
              {added[i] === "login" && (
                <p className="mt-2 text-xs text-amber-500">Connecte-toi pour ajouter à tes envies.</p>
              )}
              {added[i] === "ok" && (
                <p className="mt-2 text-xs text-zinc-500">Ajouté à <Link href="/wishlist" className="text-amber-500 underline">Mes envies ✨</Link></p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 mb-3 text-xs tracking-[0.3em] uppercase text-amber-500">Sites de référence</p>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition hover:border-amber-500">
              {s.name} →
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Deal = { retailer: string; title: string; url: string };

const SHORTCUTS = [
  { name: "CigarBid (enchères)", url: "https://www.cigarbid.com" },
  { name: "Cigars International", url: "https://www.cigarsinternational.com" },
  { name: "Famous Smoke Shop", url: "https://www.famous-smoke.com" },
];

export default function Promos() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/promos")
      .then((r) => r.json())
      .then((d) => setDeals(d.deals ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-amber-500">← Ma cave</Link>
        <h1 className="text-3xl font-semibold mt-2 mb-6">Bons plans 🏷️</h1>

        <p className="mb-3 text-xs tracking-[0.3em] uppercase text-amber-500">Trouvés en ligne</p>
        {loading && <p className="animate-pulse text-amber-500">Recherche des bons plans…</p>}
        {!loading && deals.length === 0 && (
          <p className="text-sm text-zinc-500">Rien trouvé à l'instant — vois les sites de référence ci-dessous.</p>
        )}
        <div className="space-y-3">
          {deals.map((d, i) => (
            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition hover:border-amber-500">
              <span className="text-xs uppercase tracking-wider text-amber-500">{d.retailer}</span>
              <p className="mt-1 font-medium">{d.title}</p>
            </a>
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
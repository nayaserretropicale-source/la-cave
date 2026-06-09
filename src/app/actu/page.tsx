"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type News = { title: string; link: string; source: string; date: string; snippet: string };

export default function Actu() {
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-amber-500">← Ma cave</Link>
        <h1 className="text-3xl font-semibold mt-2 mb-6">Actu cigares 📰</h1>

        {loading && <p className="animate-pulse text-amber-500">Chargement…</p>}

        <div className="space-y-3">
          {items.map((n, i) => (
            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition hover:border-amber-500">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider text-amber-500">{n.source}</span>
                <span className="text-xs text-zinc-500">{n.date ? new Date(n.date).toLocaleDateString("fr-FR") : ""}</span>
              </div>
              <p className="mt-1 font-medium">{n.title}</p>
              {n.snippet && <p className="mt-1 text-sm text-zinc-400">{n.snippet}…</p>}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
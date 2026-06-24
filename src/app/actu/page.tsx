"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Article = { title: string; snippet: string; url: string; source: string; date: string };

export default function Actu() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Article | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/news", { cache: "no-store" });
        const data = await res.json();
        setArticles(Array.isArray(data.articles) ? data.articles : []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  function frDate(d: string) {
    if (!d) return "";
    const t = new Date(d);
    return isNaN(t.getTime()) ? "" : t.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 transition hover:text-amber-500">← Ma cave</Link>
        <h1 className="text-3xl font-semibold mt-2 mb-6">Actu cigares 📰</h1>

        {loading ? (
          <p className="animate-pulse text-amber-500">Chargement de l&apos;actu…</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-zinc-500">Pas d&apos;actualité disponible pour l&apos;instant.</p>
        ) : (
          <div className="space-y-3">
            {articles.map((a, i) => (
              <button key={i} onClick={() => setSel(a)} className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition hover:border-amber-500">
                <p className="text-[11px] uppercase tracking-wider text-amber-500">{a.source}{a.date ? ` · ${frDate(a.date)}` : ""}</p>
                <p className="mt-1 font-medium">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{a.snippet}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {sel && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/70 p-4 sm:items-center" onClick={() => setSel(null)}>
          <div className="my-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] uppercase tracking-wider text-amber-500">{sel.source}{sel.date ? ` · ${frDate(sel.date)}` : ""}</p>
            <h2 className="mt-1 text-xl font-semibold">{sel.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{sel.snippet}</p>
            <p className="mt-2 text-xs italic text-zinc-600">Extrait — la suite sur le site d&apos;origine.</p>
            <div className="mt-4 flex gap-2">
              {sel.url && (
                <a href={sel.url} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-center font-medium text-zinc-950 transition hover:bg-amber-500">Lire sur {sel.source} →</a>
              )}
              <button onClick={() => setSel(null)} className="rounded-lg border border-zinc-700 px-4 py-2.5 transition hover:border-amber-500">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
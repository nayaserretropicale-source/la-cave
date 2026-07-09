"use client";

import { useEffect, useState } from "react";

type Article = { title: string; snippet: string; url: string; source: string; date: string };

export default function Actu() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Article | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/news");
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8" data-reveal>
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Presse</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Actu cigares</h1>
        </header>

        {loading ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`p-4 ${i < 2 ? "border-b border-zinc-800/60" : ""}`}>
                <div className="skeleton h-2.5 w-28" />
                <div className="skeleton mt-2 h-4 w-3/4" />
                <div className="skeleton mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-600">Pas d&apos;actualité disponible pour l&apos;instant.</p>
        ) : (
          <div className="stagger overflow-hidden rounded-2xl border border-zinc-800" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
            {articles.map((a, i) => (
              <button
                key={i}
                onClick={() => setSel(a)}
                className={`interactive block w-full bg-zinc-900/40 p-4 text-left transition-colors hover:bg-zinc-900/80 ${
                  i < articles.length - 1 ? "border-b border-zinc-800/60" : ""
                }`}
              >
                <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  {a.source}{a.date ? ` · ${frDate(a.date)}` : ""}
                </p>
                <p className="mt-1 font-medium text-zinc-100 leading-snug">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500 leading-relaxed">{a.snippet}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {sel && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:items-center"
          onClick={() => setSel(null)}
        >
          <div
            className="glass my-auto w-full max-w-md rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              {sel.source}{sel.date ? ` · ${frDate(sel.date)}` : ""}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 leading-snug">{sel.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{sel.snippet}</p>
            <p className="mt-2 text-xs italic text-zinc-600">Extrait — la suite sur le site d&apos;origine.</p>
            <div className="mt-5 flex gap-2">
              {sel.url && (
                <a
                  href={sel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-3d flex-1 px-4 py-2.5 text-center text-sm"
                >
                  Lire sur {sel.source}
                </a>
              )}
              <button
                onClick={() => setSel(null)}
                className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

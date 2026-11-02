"use client";

import { useEffect, useState } from "react";
import { IconCave } from "./Icons";

export default function AgeGate() {
  const [status, setStatus] = useState<"loading" | "ask" | "ok" | "denied">("loading");

  useEffect(() => {
    try {
      setStatus(localStorage.getItem("lacave_age_ok") === "1" ? "ok" : "ask");
    } catch {
      setStatus("ask");
    }
  }, []);

  function accept() {
    try { localStorage.setItem("lacave_age_ok", "1"); } catch { /* private browsing */ }
    setStatus("ok");
  }

  if (status === "loading" || status === "ok") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 px-6">
      <div className="glass rise w-full max-w-sm rounded-2xl p-6 text-center text-zinc-100">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-600/10 text-amber-400">
          <IconCave size={24} />
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold">La Cave</h2>

        {status === "ask" ? (
          <>
            <p className="mt-2 text-sm text-zinc-400">
              Cette application traite de cigares et s&apos;adresse exclusivement aux adultes.
              As-tu 18 ans ou plus ?
            </p>
            <button onClick={accept} className="btn-3d mt-5 w-full px-4 py-2.5">
              Oui, j&apos;ai 18 ans ou plus
            </button>
            <button onClick={() => setStatus("denied")} className="mt-2 w-full rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-500">
              Non
            </button>
            <p className="mt-4 text-xs text-zinc-600">
              Fumer nuit gravement à la santé.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">
            Désolé, La Cave est réservée aux personnes majeures.
          </p>
        )}
      </div>
    </div>
  );
}
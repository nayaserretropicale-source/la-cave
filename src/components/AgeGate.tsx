"use client";

import { useEffect, useState } from "react";

export default function AgeGate() {
  const [status, setStatus] = useState<"loading" | "ask" | "ok" | "denied">("loading");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(localStorage.getItem("lacave_age_ok") === "1" ? "ok" : "ask");
  }, []);

  function accept() {
    localStorage.setItem("lacave_age_ok", "1");
    setStatus("ok");
  }

  if (status === "loading" || status === "ok") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 px-6">
      <div className="rise w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-100">
        <p className="text-4xl">🥃</p>
        <h2 className="mt-3 text-xl font-semibold">La Cave</h2>

        {status === "ask" ? (
          <>
            <p className="mt-2 text-sm text-zinc-400">
              Cette application traite de cigares et s&apos;adresse exclusivement aux adultes.
              As-tu 18 ans ou plus ?
            </p>
            <button onClick={accept} className="btn-press mt-5 w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">
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
            Désolé, La Cave est réservée aux personnes majeures. 🔞
          </p>
        )}
      </div>
    </div>
  );
}
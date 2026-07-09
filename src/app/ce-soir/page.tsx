"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";
import { IconBook } from "@/components/Icons";

type Cig = {
  id: string;
  nom: string;
  marque: string | null;
  origine: string | null;
  force: string | null;
  format: string | null;
  profil: string[] | null;
  duree_fume: string | null;
  accord: string | null;
  note_perso: string | null;
  rating: number | null;
  quantite: number | null;
  photo_url: string | null;
  statut: string | null;
};

type Result = {
  choix_id?: string;
  pourquoi?: string;
  alternative_id?: string | null;
  alternative_pourquoi?: string | null;
  conseil?: string | null;
  error?: string;
};

const TEMPS = ["< 30 min", "30–60 min", "> 1h"];
const OCCASION = ["Détente", "Célébration", "Entre amis", "Réflexion"];
const ACCORD = ["Café", "Rhum", "Whisky", "Rien"];
const FORCE = ["Peu importe", "Légère", "Moyenne", "Corsée"];

function Chip({ value, current, set }: { value: string; current: string; set: (v: string) => void }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => set(active ? "" : value)}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-amber-600 text-zinc-950" : "border border-zinc-800 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      {value}
    </button>
  );
}

export default function CeSoir() {
  const [userId, setUserId] = useState<string | null>(null);
  const [cave, setCave] = useState<Cig[]>([]);
  const [temps, setTemps] = useState("");
  const [occasion, setOccasion] = useState("");
  const [accord, setAccord] = useState("");
  const [force, setForce] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id ?? null);
    const { data } = await supabase
      .from("cave")
      .select("id,nom,marque,origine,force,format,profil,duree_fume,accord,note_perso,rating,quantite,photo_url,statut")
      .order("created_at", { ascending: false });
    const dispo = ((data ?? []) as Cig[]).filter((c) => c.statut !== "fume" && (c.quantite ?? 1) > 0);
    setCave(dispo);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function suggest() {
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cesoir", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ criteres: { temps, occasion, accord, force, notes } }),
      });
      const data = (await res.json()) as Result;
      setResult(data);
    } catch {
      setResult({ error: "reseau" });
    } finally {
      setLoading(false);
    }
  }

  const choix = result?.choix_id ? cave.find((c) => c.id === result.choix_id) : null;
  const alt = result?.alternative_id ? cave.find((c) => c.id === result.alternative_id) : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8" data-reveal>
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Suggestion</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Ce soir</h1>
        </header>

        <AuthBar />

        {!userId ? (
          <p className="text-sm text-zinc-400">Connecte-toi pour que je pioche dans ta cave.</p>
        ) : cave.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Ta cave est vide (ou tout est marqué fumé). Ajoute des cigares depuis{" "}
            <Link href="/" className="text-amber-400 underline underline-offset-2">La Cave</Link>.
          </p>
        ) : (
          <>
            <div className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5" data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
              <FilterRow label="Temps disponible" values={TEMPS} current={temps} set={setTemps} />
              <FilterRow label="Occasion" values={OCCASION} current={occasion} set={setOccasion} />
              <FilterRow label="Accord" values={ACCORD} current={accord} set={setAccord} />
              <FilterRow label="Force" values={FORCE} current={force} set={setForce} />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Envie particulière</p>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ex. quelque chose de doux, boisé…"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <button
                onClick={suggest}
                disabled={loading}
                className="btn-3d w-full px-4 py-3 text-sm disabled:opacity-50"
              >
                {loading ? "Analyse en cours…" : "Trouver un cigare"}
              </button>
            </div>

            {result && !loading && (
              <div className="rise mt-6">
                {result.error || !choix ? (
                  <p className="rounded-xl border border-orange-500/20 bg-orange-950/20 px-4 py-3 text-sm text-orange-300">
                    Je n&apos;ai pas réussi à choisir. Réessaie ou précise un critère.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-amber-700/30 bg-amber-950/15 p-5">
                      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-amber-500/80">Ce soir</p>
                      <div className="flex items-center gap-4">
                        {choix.photo_url ? (
                          <Image src={choix.photo_url} alt={choix.nom} width={64} height={64} className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-600">
                            <IconBook size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-lg font-semibold leading-tight text-zinc-50">{choix.nom}</p>
                          <p className="mt-0.5 text-sm text-zinc-400">{[choix.marque, choix.force].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                      {result.pourquoi && <p className="mt-4 text-sm text-zinc-200 leading-relaxed">{result.pourquoi}</p>}
                      {result.conseil && <p className="mt-2 text-sm italic text-zinc-400 leading-relaxed">{result.conseil}</p>}
                    </div>

                    {alt && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-500">Sinon</p>
                        <p className="font-medium text-zinc-100">
                          {alt.nom}
                          {alt.marque && <span className="font-normal text-zinc-500"> · {alt.marque}</span>}
                        </p>
                        {result.alternative_pourquoi && <p className="mt-1 text-sm text-zinc-400">{result.alternative_pourquoi}</p>}
                      </div>
                    )}

                    <button
                      onClick={suggest}
                      disabled={loading}
                      className="w-full rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
                    >
                      Une autre idée
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function FilterRow({ label, values, current, set }: { label: string; values: string[]; current: string; set: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => <Chip key={v} value={v} current={current} set={set} />)}
      </div>
    </div>
  );
}

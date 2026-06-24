"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";

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
    <button type="button" onClick={() => set(active ? "" : value)} className={`rounded-full px-3 py-1.5 text-sm transition ${active ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-300 hover:border-amber-500"}`}>{value}</button>
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
    const res = await fetch("/api/cesoir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteres: { temps, occasion, accord, force, notes }, cigares: cave }),
    });
    const data = (await res.json()) as Result;
    setResult(data);
    setLoading(false);
  }

  const choix = result?.choix_id ? cave.find((c) => c.id === result.choix_id) : null;
  const alt = result?.alternative_id ? cave.find((c) => c.id === result.alternative_id) : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Suggestion</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">Que fumer ce soir ? 🌙</h1>

        <AuthBar />

        {!userId ? (
          <p className="text-sm text-zinc-400">Connecte-toi pour que je pioche dans ta cave.</p>
        ) : cave.length === 0 ? (
          <p className="text-sm text-zinc-400">Ta cave est vide (ou tout est marqué « fumé »). Ajoute des cigares depuis l&apos;onglet <Link href="/" className="text-amber-500 underline">Cave</Link>.</p>
        ) : (
          <>
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wider text-zinc-500">Temps dispo</p>
                <div className="flex flex-wrap gap-2">{TEMPS.map((v) => <Chip key={v} value={v} current={temps} set={setTemps} />)}</div>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wider text-zinc-500">Occasion</p>
                <div className="flex flex-wrap gap-2">{OCCASION.map((v) => <Chip key={v} value={v} current={occasion} set={setOccasion} />)}</div>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wider text-zinc-500">Accord</p>
                <div className="flex flex-wrap gap-2">{ACCORD.map((v) => <Chip key={v} value={v} current={accord} set={setAccord} />)}</div>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wider text-zinc-500">Force souhaitée</p>
                <div className="flex flex-wrap gap-2">{FORCE.map((v) => <Chip key={v} value={v} current={force} set={setForce} />)}</div>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wider text-zinc-500">Envie particulière (optionnel)</p>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex. quelque chose de doux, boisé…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
              </div>
              <button onClick={suggest} disabled={loading} className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500 disabled:opacity-50">
                {loading ? "Je réfléchis…" : "Trouve-moi ça 🔥"}
              </button>
            </div>

            {result && !loading && (
              <div className="mt-6">
                {result.error || !choix ? (
                  <p className="text-sm text-orange-400">Je n&apos;ai pas réussi à choisir. Réessaie, ou précise un critère.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-amber-700/40 bg-amber-950/15 p-4">
                      <p className="text-xs uppercase tracking-wider text-amber-500">Ce soir, fume…</p>
                      <div className="mt-2 flex items-center gap-3">
                        {choix.photo_url ? (
                          <Image src={choix.photo_url} alt={choix.nom} width={64} height={64} className="h-16 w-16 flex-shrink-0 rounded-lg border border-zinc-800 object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xl">🚬</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-lg font-semibold leading-tight">{choix.nom}</p>
                          <p className="text-sm text-zinc-400">{[choix.marque, choix.force].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                      {result.pourquoi && <p className="mt-3 text-sm text-zinc-200">{result.pourquoi}</p>}
                      {result.conseil && <p className="mt-2 text-sm italic text-zinc-400">💡 {result.conseil}</p>}
                    </div>

                    {alt && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                        <p className="text-xs uppercase tracking-wider text-zinc-500">Sinon</p>
                        <p className="mt-1 font-medium">{alt.nom}<span className="font-normal text-zinc-500">{alt.marque ? ` · ${alt.marque}` : ""}</span></p>
                        {result.alternative_pourquoi && <p className="mt-1 text-sm text-zinc-400">{result.alternative_pourquoi}</p>}
                      </div>
                    )}

                    <button onClick={suggest} disabled={loading} className="w-full rounded-lg border border-zinc-700 px-4 py-2.5 text-sm transition hover:border-amber-500">Une autre idée</button>
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
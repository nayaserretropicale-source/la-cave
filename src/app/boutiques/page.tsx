"use client";

import { useEffect, useState } from "react";
import AuthBar from "@/components/AuthBar";
import { IconMap } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { supabase } from "@/lib/supabase";

type Lieu = {
  id: string;
  user_id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
  adresse: string | null;
  note: string | null;
};

const PAYS = ["Côte d'Ivoire", "Sénégal", "Mali", "Burkina Faso", "Cameroun", "Bénin", "Togo", "Guinée", "France"];

function mapsUrl(l: { nom: string; adresse: string | null; ville: string | null; pays: string | null }) {
  const q = [l.nom, l.adresse, l.ville, l.pays].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function Boutiques() {
  const confirm = useConfirm();
  const [userId, setUserId] = useState<string | null>(null);
  const [list, setList] = useState<Lieu[]>([]);
  const [paysF, setPaysF] = useState("");
  const [q, setQ] = useState("");

  const [nom, setNom] = useState("");
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [aiPays, setAiPays] = useState("");
  const [aiVille, setAiVille] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<{ nom: string; ville: string; note: string }[] | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id ?? null);
    const { data } = await supabase
      .from("lieux")
      .select("id,user_id,nom,pays,ville,adresse,note")
      .order("pays", { ascending: true })
      .order("nom", { ascending: true });
    setList((data ?? []) as Lieu[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function add() {
    if (!nom.trim() || !pays.trim()) { setMsg("Nom et pays sont obligatoires."); return; }
    setMsg("Ajout…");
    const { error } = await supabase.from("lieux").insert({
      nom: nom.trim(),
      pays: pays.trim(),
      ville: ville.trim() || null,
      adresse: adresse.trim() || null,
      note: note.trim() || null,
    });
    if (error) { setMsg("Connecte-toi d'abord pour ajouter."); return; }
    setNom(""); setPays(""); setVille(""); setAdresse(""); setNote(""); setMsg(""); setShowAdd(false);
    load();
  }

  async function remove(id: string) {
    if (!(await confirm({ message: "Retirer cette boutique de l'annuaire ?", confirmLabel: "Retirer", danger: true }))) return;
    await supabase.from("lieux").delete().eq("id", id);
    load();
  }

  async function findAI() {
    if (!aiPays.trim()) { return; }
    setAiLoading(true);
    setAiResults(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/boutiques", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ pays: aiPays.trim(), ville: aiVille.trim() || null }),
      });
      const data = await res.json();
      setAiResults(Array.isArray(data.boutiques) ? data.boutiques : []);
    } catch {
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  }

  async function addFromAI(r: { nom: string; ville: string; note: string }) {
    const { error } = await supabase.from("lieux").insert({
      nom: r.nom,
      pays: aiPays.trim(),
      ville: r.ville || aiVille.trim() || null,
      note: r.note || null,
    });
    if (error) { setMsg("Connecte-toi d'abord pour ajouter."); return; }
    setAiResults((prev) => (prev ? prev.filter((x) => x !== r) : prev));
    load();
  }

  const paysList = Array.from(new Set(list.map((l) => l.pays).filter(Boolean))) as string[];
  const filtered = list.filter((l) => {
    const term = q.trim().toLowerCase();
    const mq = !term || [l.nom, l.ville, l.adresse].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    const mp = !paysF || l.pays === paysF;
    return mq && mp;
  });
  const groups: Record<string, Lieu[]> = {};
  filtered.forEach((l) => { (groups[l.pays?.trim() || "Autres"] ||= []).push(l); });
  const groupNames = Object.keys(groups).sort();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Annuaire</p>
        <h1 className="font-display text-3xl font-semibold mt-1 mb-6">Boutiques</h1>

        <AuthBar />

        {!userId ? (
          <p className="text-sm text-zinc-400">Connecte-toi pour voir et enrichir l&apos;annuaire des boutiques.</p>
        ) : (
          <>
            <button onClick={() => setShowAdd((v) => !v)} className="btn-3d mb-6 w-full px-4 py-2.5">
              {showAdd ? "Fermer" : "+ Ajouter une boutique"}
            </button>

            {showAdd && (
              <div className="mb-8 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de la boutique *" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors" />
                <input list="pays-list" value={pays} onChange={(e) => setPays(e.target.value)} placeholder="Pays *" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors" />
                <datalist id="pays-list">{PAYS.map((p) => <option key={p} value={p} />)}</datalist>
                <input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ville (optionnel)" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors" />
                <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse / repère (optionnel)" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (horaires, spécialité…)" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors" />
                <p className="text-xs text-zinc-600">Ton ajout est visible par toute la communauté.</p>
                <button onClick={add} className="btn-3d w-full px-4 py-2.5">Ajouter à l&apos;annuaire</button>
                {msg && <p className="text-sm text-amber-500">{msg}</p>}
              </div>
            )}

            {list.length >= 5 && (
              <div className="mb-4 space-y-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, ville)…" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors" />
                {paysList.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPaysF("")} className={`rounded-full px-3 py-1 text-xs transition ${paysF === "" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>Tous pays</button>
                    {paysList.map((p) => (
                      <button key={p} onClick={() => setPaysF(p)} className={`rounded-full px-3 py-1 text-xs transition ${paysF === p ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>{p}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune boutique dans l&apos;annuaire pour l&apos;instant. Ajoute-en une, ou utilise les suggestions ci-dessous.</p>
            ) : (
              <div className="space-y-6">
                {groupNames.map((name) => (
                  <div key={name}>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-500"><IconMap size={14} />{name}</p>
                    <div className="stagger space-y-2">
                      {groups[name].map((l) => (
                        <div key={l.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{l.nom}</p>
                              {(l.ville || l.adresse) && <p className="text-sm text-zinc-500">{[l.ville, l.adresse].filter(Boolean).join(" · ")}</p>}
                            </div>
                            {l.user_id === userId && (
                              <button onClick={() => remove(l.id)} className="flex-shrink-0 rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400" aria-label="Retirer">✕</button>
                            )}
                          </div>
                          {l.note && <p className="mt-2 text-sm text-zinc-300">{l.note}</p>}
                          <a href={mapsUrl(l)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">Ouvrir dans Maps →</a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div data-reveal className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-sm font-medium text-amber-500">Trouver des boutiques (IA)</p>
              <p className="mt-1 text-xs text-zinc-500">Suggestions issues du web — <span className="text-zinc-400">à vérifier</span> avant de t&apos;y rendre.</p>
              <div className="mt-3 space-y-2">
                <input list="pays-list" value={aiPays} onChange={(e) => setAiPays(e.target.value)} placeholder="Pays" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors" />
                <input value={aiVille} onChange={(e) => setAiVille(e.target.value)} placeholder="Ville (optionnel)" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors" />
                <button onClick={findAI} disabled={aiLoading} className="w-full rounded-lg border border-amber-600/60 bg-amber-950/20 px-4 py-2 text-sm text-amber-400 transition hover:border-amber-500 disabled:opacity-50">
                  {aiLoading ? "Recherche…" : "Chercher des boutiques"}
                </button>
              </div>

              {aiResults && (
                <div className="stagger mt-4 space-y-2">
                  {aiResults.length === 0 ? (
                    <p className="text-sm text-zinc-500">Aucune suggestion fiable trouvée. Tu peux ajouter une adresse que tu connais.</p>
                  ) : (
                    aiResults.map((r, i) => (
                      <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="font-medium">{r.nom}{r.ville ? <span className="font-normal text-zinc-500"> · {r.ville}</span> : null}</p>
                        {r.note && <p className="mt-1 text-sm text-zinc-400">{r.note}</p>}
                        <button onClick={() => addFromAI(r)} className="mt-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">+ Ajouter à l&apos;annuaire</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
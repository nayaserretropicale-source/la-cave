"use client";

import { useEffect, useState } from "react";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";

type CaveLite = { id: string; nom: string };
type Session = {
  id: string;
  nom: string;
  date_fume: string | null;
  duree_min: number | null;
  accord: string | null;
  rating: number | null;
  commentaire: string | null;
};

export default function Journal() {
  const [cave, setCave] = useState<CaveLite[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cigareId, setCigareId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duree, setDuree] = useState("");
  const [accord, setAccord] = useState("");
  const [rating, setRating] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  async function loadCave() {
    const { data } = await supabase.from("cave").select("id,nom").order("nom");
    setCave((data ?? []) as CaveLite[]);
  }
  async function loadSessions() {
    const { data } = await supabase
      .from("degustation")
      .select("id,nom,date_fume,duree_min,accord,rating,commentaire")
      .order("date_fume", { ascending: false })
      .order("created_at", { ascending: false });
    setSessions((data ?? []) as Session[]);
  }

  useEffect(() => {
    loadCave();
    loadSessions();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadCave();
      loadSessions();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function resetForm() {
    setCigareId("");
    setDate(new Date().toISOString().slice(0, 10));
    setDuree("");
    setAccord("");
    setRating(0);
    setCommentaire("");
  }

  async function save() {
    const cig = cave.find((c) => c.id === cigareId);
    if (!cig) {
      setMsg("Choisis un cigare de ta cave.");
      return;
    }
    setMsg("Enregistrement…");
    const { error } = await supabase.from("degustation").insert({
      cigare_id: cig.id,
      nom: cig.nom,
      date_fume: date,
      duree_min: duree ? parseInt(duree, 10) : null,
      accord: accord || null,
      rating: rating || null,
      commentaire: commentaire || null,
    });
    if (error) {
      setMsg("Connecte-toi d'abord pour enregistrer.");
      return;
    }
    setMsg("Dégustation enregistrée ✓");
    resetForm();
    setOpen(false);
    loadSessions();
  }

  async function removeSession(id: string) {
    if (!window.confirm("Supprimer cette dégustation ?")) return;
    await supabase.from("degustation").delete().eq("id", id);
    loadSessions();
  }

  function frDate(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Carnet</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">Journal de dégustation 📓</h1>

        <AuthBar />

        <button onClick={() => setOpen((v) => !v)} className="mb-6 w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">
          {open ? "Fermer" : "+ Nouvelle dégustation"}
        </button>

        {open && (
          <div className="mb-8 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Cigare</label>
              <select value={cigareId} onChange={(e) => setCigareId(e.target.value)} className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none">
                <option value="">— Choisir dans ma cave —</option>
                {cave.map((c) => (<option key={c.id} value={c.id}>{c.nom}</option>))}
              </select>
              {cave.length === 0 && <p className="mt-1 text-xs text-zinc-500">Ta cave est vide : ajoute d'abord un cigare depuis l'onglet Cave.</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Durée (min)</label>
                <input type="number" inputMode="numeric" value={duree} onChange={(e) => setDuree(e.target.value)} placeholder="45" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Accord</label>
              <input value={accord} onChange={(e) => setAccord(e.target.value)} placeholder="Rhum vieux, café…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Note</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-amber-500" : "text-zinc-600"}`} aria-label={`${n} étoiles`}>★</button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Ressenti</label>
              <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} placeholder="Arômes, tirage, évolution…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
            </div>

            <button onClick={save} className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">Enregistrer la dégustation</button>
            {msg && <p className="text-sm text-amber-500">{msg}</p>}
          </div>
        )}

        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune dégustation pour l'instant. Note ta première session !</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.nom}</p>
                    <p className="text-xs text-zinc-500">{frDate(s.date_fume)}</p>
                  </div>
                  <button onClick={() => removeSession(s.id)} className="flex-shrink-0 rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400" aria-label="Supprimer">✕</button>
                </div>
                {s.rating ? <p className="mt-1 text-sm text-amber-500">{"★".repeat(s.rating)}</p> : null}
                {(s.duree_min || s.accord) && (
                  <p className="mt-1 text-sm text-zinc-400">{[s.duree_min ? `${s.duree_min} min` : null, s.accord].filter(Boolean).join(" · ")}</p>
                )}
                {s.commentaire && <p className="mt-2 text-sm text-zinc-300">{s.commentaire}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
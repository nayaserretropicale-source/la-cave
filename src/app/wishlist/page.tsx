"use client";

import { useEffect, useState } from "react";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";

type Envie = { id: string; nom: string; marque: string | null; note: string | null };

export default function Wishlist() {
  const [items, setItems] = useState<Envie[]>([]);
  const [nom, setNom] = useState("");
  const [marque, setMarque] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await supabase
      .from("wishlist")
      .select("id,nom,marque,note")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Envie[]);
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function add() {
    if (!nom.trim()) { setMsg("Donne au moins un nom."); return; }
    setMsg("Ajout…");
    const { error } = await supabase.from("wishlist").insert({
      nom: nom.trim(),
      marque: marque.trim() || null,
      note: note.trim() || null,
    });
    if (error) { setMsg("Connecte-toi d'abord pour ajouter."); return; }
    setNom(""); setMarque(""); setNote(""); setMsg("");
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Retirer de tes envies ?")) return;
    await supabase.from("wishlist").delete().eq("id", id);
    load();
  }

  async function toCave(item: Envie) {
    if (!window.confirm(`Ajouter « ${item.nom} » à ta cave ?`)) return;
    const { error } = await supabase.from("cave").insert({
      nom: item.nom,
      marque: item.marque,
      source: "wishlist",
    });
    if (error) { setMsg("Connecte-toi d'abord."); return; }
    await supabase.from("wishlist").delete().eq("id", item.id);
    load();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Envies</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">À essayer ✨</h1>

        <AuthBar />

        <div className="mb-8 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du cigare *" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
          <input value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Marque (optionnel)" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Pourquoi / où tu l'as repéré…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
          <button onClick={add} className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">+ Ajouter une envie</button>
          {msg && <p className="text-sm text-amber-500">{msg}</p>}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune envie pour l'instant. Note les cigares que tu veux goûter !</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{it.nom}</p>
                    {it.marque && <p className="text-sm text-zinc-500">{it.marque}</p>}
                  </div>
                  <button onClick={() => remove(it.id)} className="flex-shrink-0 rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400" aria-label="Retirer">✕</button>
                </div>
                {it.note && <p className="mt-2 text-sm text-zinc-300">{it.note}</p>}
                <button onClick={() => toCave(it)} className="mt-3 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">→ Ajouter à ma cave</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
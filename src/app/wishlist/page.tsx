"use client";

import { useEffect, useState } from "react";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";
import { IconX, IconChevronRight } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";

type Envie = { id: string; nom: string; marque: string | null; note: string | null };

export default function Wishlist() {
  const confirm = useConfirm();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!(await confirm({ message: "Retirer de tes envies ?", confirmLabel: "Retirer", danger: true }))) return;
    await supabase.from("wishlist").delete().eq("id", id);
    load();
  }

  async function toCave(item: Envie) {
    if (!(await confirm({ message: `Ajouter « ${item.nom} » à ta cave ?`, confirmLabel: "Ajouter" }))) return;
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8" data-reveal>
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Liste</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Mes envies</h1>
        </header>

        <AuthBar />

        <div className="mb-8 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5" data-reveal style={{ ["--reveal-delay"]: "80ms" } as React.CSSProperties}>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom du cigare *"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
          />
          <input
            value={marque}
            onChange={(e) => setMarque(e.target.value)}
            placeholder="Marque (optionnel)"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Pourquoi / où tu l'as repéré…"
            className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
          />
          <button
            onClick={add}
            className="btn-3d emoji-tap flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
          >
            <span className="emoji" aria-hidden>✨</span>
            Ajouter une envie
          </button>
          {msg && <p className="text-sm text-amber-400">{msg}</p>}
        </div>

        {items.length === 0 ? (
          <div className="py-10 text-center" data-reveal>
            <span aria-hidden className="mb-2 block text-4xl">⭐️</span>
            <p className="text-sm text-zinc-600">Aucune envie pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="stagger overflow-hidden rounded-2xl border border-zinc-800" data-reveal style={{ ["--reveal-delay"]: "160ms" } as React.CSSProperties}>
            {items.map((it, i) => (
              <div
                key={it.id}
                className={`bg-zinc-900/40 p-4 ${i < items.length - 1 ? "border-b border-zinc-800/60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">{it.nom}</p>
                    {it.marque && <p className="text-sm text-zinc-500 mt-0.5">{it.marque}</p>}
                    {it.note && <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{it.note}</p>}
                    <button
                      onClick={() => toCave(it)}
                      className="mt-3 flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-amber-400"
                    >
                      Ajouter à ma cave
                      <IconChevronRight size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(it.id)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-orange-400"
                    aria-label="Retirer"
                  >
                    <IconX size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

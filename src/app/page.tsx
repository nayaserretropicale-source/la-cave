"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";

type Fiche = {
  identifie: boolean;
  nom?: string;
  marque?: string;
  origine?: string;
  format?: string;
  cape?: string;
  force?: string;
  profil?: string[] | string;
  prix_indicatif?: string;
  duree_fume?: string;
  accord?: string;
  conservation?: string;
  degustation?: string;
  confiance?: string;
  commentaire?: string;
};

type CaveItem = {
  id: string;
  nom: string;
  marque?: string | null;
  origine?: string | null;
  force?: string | null;
  format?: string | null;
  cape?: string | null;
  photo_url?: string | null;
  rating?: number | null;
  note_perso?: string | null;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cave, setCave] = useState<CaveItem[]>([]);
  const [saveMsg, setSaveMsg] = useState("");
  const [selected, setSelected] = useState<CaveItem | null>(null);
  const [ratingDraft, setRatingDraft] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [q, setQ] = useState("");
  const [forceF, setForceF] = useState("");

  async function loadCave() {
    const { data } = await supabase
      .from("cave")
      .select("id,nom,marque,origine,force,format,cape,photo_url,rating,note_perso")
      .order("created_at", { ascending: false });
    setCave((data ?? []) as CaveItem[]);
  }

  useEffect(() => {
    loadCave();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadCave());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setLoading(true);
    setFiche(null);
    setSaveMsg("");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: f.type }),
      });
      const data = (await res.json()) as Fiche;
      setFiche(data);
      setLoading(false);
    };
    reader.readAsDataURL(f);
  }

  function reset() {
    setFiche(null);
    setPreview(null);
    setFile(null);
    setSaveMsg("");
  }

  async function saveToCave() {
    if (!fiche || !fiche.identifie) return;
    setSaveMsg("Enregistrement…");

    let photo_url: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cigares").upload(path, file);
      if (!upErr) {
        photo_url = supabase.storage.from("cigares").getPublicUrl(path).data.publicUrl;
      }
    }

    const { error } = await supabase.from("cave").insert({
      nom: fiche.nom || fiche.marque || "Cigare",
      marque: fiche.marque,
      origine: fiche.origine,
      format: fiche.format,
      cape: fiche.cape,
      force: fiche.force,
      profil: Array.isArray(fiche.profil) ? fiche.profil : fiche.profil ? [fiche.profil] : [],
      photo_url,
      source: "scan",
    });

    if (error) {
      setSaveMsg("Connecte-toi d'abord pour sauvegarder.");
      return;
    }
    setSaveMsg("Ajouté à ta cave ✓");
    loadCave();
  }

  async function removeFromCave(id: string) {
    if (!window.confirm("Supprimer ce cigare de ta cave ?")) return;
    await supabase.from("cave").delete().eq("id", id);
    loadCave();
  }

  function openDetail(item: CaveItem) {
    setSelected(item);
    setRatingDraft(item.rating ?? 0);
    setNoteDraft(item.note_perso ?? "");
  }

  async function saveDetail() {
    if (!selected) return;
    await supabase.from("cave").update({ rating: ratingDraft, note_perso: noteDraft }).eq("id", selected.id);
    setSelected(null);
    loadCave();
  }

  async function onDetailPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !selected) return;
    setPhotoBusy(true);
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("cigares").upload(path, f);
    if (upErr) { setPhotoBusy(false); return; }
    const url = supabase.storage.from("cigares").getPublicUrl(path).data.publicUrl;
    await supabase.from("cave").update({ photo_url: url }).eq("id", selected.id);
    setSelected({ ...selected, photo_url: url });
    setPhotoBusy(false);
    loadCave();
  }

  const profil = Array.isArray(fiche?.profil) ? fiche?.profil.join(", ") : fiche?.profil;

  const forces = Array.from(new Set(cave.map((c) => c.force).filter(Boolean))) as string[];
  const filtered = cave.filter((c) => {
    const term = q.trim().toLowerCase();
    const matchesQ = !term || [c.nom, c.marque, c.origine].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    const matchesF = !forceF || c.force === forceF;
    return matchesQ && matchesF;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Cave personnelle</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">Ma cave à cigares 🔥</h1>

        <AuthBar />

        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/caviste" className="inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">Demander au caviste 🥃</Link>
          <Link href="/wishlist" className="inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">Mes envies ✨</Link>
        </div>

        {!fiche && !loading && (
          <label className="block cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-10 text-center transition hover:border-amber-500">
            <span className="text-zinc-300">Choisir / prendre une photo</span>
            <span className="mt-1 block text-sm text-zinc-500">Galerie ou appareil photo — cadre bien la bague.</span>
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
        )}

        {preview && <img src={preview} alt="cigare" className="mb-6 w-full rounded-xl border border-zinc-800" />}

        {loading && <p className="animate-pulse text-amber-500">Analyse en cours…</p>}

        {fiche && !loading && (
          <div>
            {fiche.identifie ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold">{fiche.nom || fiche.marque}</h2>
                  <p className="text-sm uppercase tracking-wider text-amber-500">
                    {fiche.marque}
                    {fiche.confiance ? ` · confiance ${fiche.confiance}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-zinc-800">
                  <Field label="Origine" value={fiche.origine} />
                  <Field label="Format" value={fiche.format} />
                  <Field label="Cape" value={fiche.cape} />
                  <Field label="Force" value={fiche.force} />
                  <Field label="Durée de fume" value={fiche.duree_fume} />
                  <Field label="Accord" value={fiche.accord} />
                  <Field label="Prix indicatif" value={fiche.prix_indicatif} />
                  <Field label="Profil" value={profil} />
                </div>

                {fiche.degustation && (
                  <p className="rounded-r-lg border-l-2 border-amber-500 bg-zinc-900/50 px-4 py-3 italic text-zinc-300">{fiche.degustation}</p>
                )}
                {fiche.conservation && (
                  <p className="rounded-r-lg border-l-2 border-zinc-600 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
                    <span className="font-medium text-zinc-100">Conservation — </span>{fiche.conservation}
                  </p>
                )}
              </div>
            ) : (
              <p className="italic text-orange-400">{fiche.commentaire || "Cigare non identifié, réessaie avec la bague bien visible."}</p>
            )}

            <div className="mt-6 flex gap-2">
              {fiche.identifie && (
                <button onClick={saveToCave} className="rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">+ Ajouter à ma cave</button>
              )}
              <button onClick={reset} className="rounded-lg border border-zinc-700 px-5 py-2.5 transition hover:border-amber-500">Scanner un autre</button>
            </div>
            {saveMsg && <p className="mt-2 text-sm text-amber-500">{saveMsg}</p>}
          </div>
        )}

        {cave.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 text-xs tracking-[0.3em] uppercase text-amber-500">Ma cave ({cave.length})</p>

            {cave.length >= 5 && (
              <div className="mb-3 space-y-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, marque, origine)…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
                {forces.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setForceF("")} className={`rounded-full px-3 py-1 text-xs transition ${forceF === "" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>Toutes forces</button>
                    {forces.map((f) => (
                      <button key={f} onClick={() => setForceF(f)} className={`rounded-full px-3 py-1 text-xs transition ${forceF === f ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>{f}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun cigare ne correspond.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <div key={c.id} onClick={() => openDetail(c)} className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt={c.nom} className="h-14 w-14 flex-shrink-0 rounded-lg border border-zinc-800 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg">🚬</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.nom}</p>
                      <p className="text-sm text-zinc-500">{[c.origine, c.force].filter(Boolean).join(" · ")}</p>
                      {c.rating ? <p className="text-sm text-amber-500">{"★".repeat(c.rating)}</p> : null}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFromCave(c.id); }} className="flex-shrink-0 rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400" aria-label="Supprimer">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            {selected.photo_url ? (
              <img src={selected.photo_url} alt={selected.nom} className="mb-3 max-h-60 w-full rounded-xl border border-zinc-800 object-cover" />
            ) : (
              <div className="mb-3 flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800 text-3xl">🚬</div>
            )}
            <label className="mb-4 block cursor-pointer text-center text-sm text-zinc-400 transition hover:text-amber-500">
              {photoBusy ? "Envoi…" : selected.photo_url ? "Changer la photo" : "Ajouter une photo"}
              <input type="file" accept="image/*" onChange={onDetailPhoto} className="hidden" />
            </label>

            <h2 className="text-xl font-semibold">{selected.nom}</h2>
            {selected.marque && <p className="text-sm uppercase tracking-wider text-amber-500">{selected.marque}</p>}

            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-zinc-800">
              <Field label="Origine" value={selected.origine ?? undefined} />
              <Field label="Force" value={selected.force ?? undefined} />
              <Field label="Format" value={selected.format ?? undefined} />
              <Field label="Cape" value={selected.cape ?? undefined} />
            </div>

            <p className="mt-4 mb-1 text-xs uppercase tracking-wider text-zinc-500">Ma note</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRatingDraft(n)} className={`text-2xl ${n <= ratingDraft ? "text-amber-500" : "text-zinc-600"}`} aria-label={`${n} étoiles`}>★</button>
              ))}
            </div>

            <p className="mt-4 mb-1 text-xs uppercase tracking-wider text-zinc-500">Mon commentaire</p>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} placeholder="Ce que j'en ai pensé…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />

            <div className="mt-4 flex gap-2">
              <button onClick={saveDetail} className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">Enregistrer</button>
              <button onClick={() => setSelected(null)} className="rounded-lg border border-zinc-700 px-4 py-2.5 transition hover:border-amber-500">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-zinc-900 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5">{value || "—"}</p>
    </div>
  );
}
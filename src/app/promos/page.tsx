"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image";

type Evolution = { premier_tiers?: string; deuxieme_tiers?: string; troisieme_tiers?: string };
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
  evolution?: Evolution;
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
  source?: string | null;
  quantite?: number | null;
  statut?: string | null;
  duree_fume?: string | null;
  accord?: string | null;
  conservation?: string | null;
  premier_tiers?: string | null;
  deuxieme_tiers?: string | null;
  troisieme_tiers?: string | null;
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
  const [qteDraft, setQteDraft] = useState(1);
  const [statutDraft, setStatutDraft] = useState("en_cave");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [q, setQ] = useState("");
  const [forceF, setForceF] = useState("");
  const [statutF, setStatutF] = useState("");
  const [histoire, setHistoire] = useState<string | null>(null);
  const [histoireLoading, setHistoireLoading] = useState(false);

  async function loadCave() {
    const { data } = await supabase
      .from("cave")
      .select("id,nom,marque,origine,force,format,cape,photo_url,rating,note_perso,source,quantite,statut,duree_fume,accord,conservation,premier_tiers,deuxieme_tiers,troisieme_tiers")
      .order("created_at", { ascending: false });
    setCave((data ?? []) as CaveItem[]);
  }

  useEffect(() => {
    loadCave();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadCave());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f0 = e.target.files?.[0];
    if (!f0) return;
    const f = await compressImage(f0);
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
      if (!upErr) photo_url = supabase.storage.from("cigares").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from("cave").insert({
      nom: fiche.nom || fiche.marque || "Cigare",
      marque: fiche.marque,
      origine: fiche.origine,
      format: fiche.format,
      cape: fiche.cape,
      force: fiche.force,
      profil: Array.isArray(fiche.profil) ? fiche.profil : fiche.profil ? [fiche.profil] : [],
      duree_fume: fiche.duree_fume,
      accord: fiche.accord,
      conservation: fiche.conservation,
      premier_tiers: fiche.evolution?.premier_tiers,
      deuxieme_tiers: fiche.evolution?.deuxieme_tiers,
      troisieme_tiers: fiche.evolution?.troisieme_tiers,
      photo_url,
      source: "scan",
    });

    if (error) { setSaveMsg("Connecte-toi d'abord pour sauvegarder."); return; }
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
    setQteDraft(item.quantite ?? 1);
    setStatutDraft(item.statut ?? "en_cave");
    setHistoire(null);
    setHistoireLoading(false);
  }

  async function saveDetail() {
    if (!selected) return;
    await supabase.from("cave").update({
      rating: ratingDraft,
      note_perso: noteDraft,
      quantite: qteDraft,
      statut: statutDraft,
    }).eq("id", selected.id);
    setSelected(null);
    loadCave();
  }

  async function onDetailPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f0 = e.target.files?.[0];
    if (!f0 || !selected) return;
    setPhotoBusy(true);
    const f = await compressImage(f0);
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

  async function fetchHistoire() {
    if (!selected) return;
    setHistoireLoading(true);
    const res = await fetch("/api/histoire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marque: selected.marque, nom: selected.nom }),
    });
    const data = await res.json();
    setHistoire(data.histoire || "Histoire indisponible pour le moment.");
    setHistoireLoading(false);
  }

  const profil = Array.isArray(fiche?.profil) ? fiche?.profil.join(", ") : fiche?.profil;
  const forces = Array.from(new Set(cave.map((c) => c.force).filter(Boolean))) as string[];
  const filtered = cave.filter((c) => {
    const term = q.trim().toLowerCase();
    const matchesQ = !term || [c.nom, c.marque, c.origine].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    const matchesF = !forceF || c.force === forceF;
    const matchesS = !statutF || (statutF === "fume" ? c.statut === "fume" : c.statut !== "fume");
    return matchesQ && matchesF && matchesS;
  });
  const groups: Record<string, CaveItem[]> = {};
  filtered.forEach((c) => {
    const key = c.origine?.trim() || "Autres";
    (groups[key] ||= []).push(c);
  });
  const groupNames = Object.keys(groups).sort();
  const physical = cave.filter((c) => c.statut !== "fume").reduce((s, c) => s + (c.quantite ?? 1), 0);
  const fumeCount = cave.filter((c) => c.statut === "fume").length;

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
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
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

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4">
                  <Line label="Origine" value={fiche.origine} />
                  <Line label="Format" value={fiche.format} />
                  <Line label="Cape" value={fiche.cape} />
                  <Line label="Force" value={fiche.force} />
                  <Line label="Durée de fume" value={fiche.duree_fume} />
                  <Line label="Accord" value={fiche.accord} />
                  <Line label="Prix indicatif" value={fiche.prix_indicatif} />
                  <Line label="Profil" value={profil} last />
                </div>

                {(fiche.evolution?.premier_tiers || fiche.evolution?.deuxieme_tiers || fiche.evolution?.troisieme_tiers) && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4">
                    <p className="border-b border-zinc-800 py-2 text-xs uppercase tracking-wider text-amber-500">Évolution de la dégustation</p>
                    <Line label="1er tiers" value={fiche.evolution?.premier_tiers} />
                    <Line label="2e tiers" value={fiche.evolution?.deuxieme_tiers} />
                    <Line label="3e tiers" value={fiche.evolution?.troisieme_tiers} last />
                  </div>
                )}

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
            <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Ma cave ({cave.length})</p>
            <p className="mb-3 mt-0.5 text-sm text-zinc-500">{physical} cigare(s) en cave{fumeCount ? ` · ${fumeCount} fumé(s)` : ""}</p>

            {cave.length >= 5 && (
              <div className="mb-4 space-y-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, marque, origine)…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setStatutF("")} className={`rounded-full px-3 py-1 text-xs transition ${statutF === "" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>Tout</button>
                  <button onClick={() => setStatutF("en_cave")} className={`rounded-full px-3 py-1 text-xs transition ${statutF === "en_cave" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>En cave</button>
                  <button onClick={() => setStatutF("fume")} className={`rounded-full px-3 py-1 text-xs transition ${statutF === "fume" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>Fumés</button>
                </div>
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
              <div className="space-y-6">
                {groupNames.map((name) => (
                  <div key={name}>
                    <p className="mb-2 text-sm font-medium text-amber-500">📍 {name}</p>
                    <div className="space-y-2">
                      {groups[name].map((c) => (
                        <div key={c.id} onClick={() => openDetail(c)} className={`flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700 ${c.statut === "fume" ? "opacity-60" : ""}`}>
                          {c.photo_url ? (
                            <img src={c.photo_url} alt={c.nom} className="h-14 w-14 flex-shrink-0 rounded-lg border border-zinc-800 object-cover" />
                          ) : (
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg">🚬</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{c.nom}</p>
                            <p className="text-sm text-zinc-500">{[c.marque, c.force].filter(Boolean).join(" · ")}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              {c.rating ? <span className="text-sm text-amber-500">{"★".repeat(c.rating)}</span> : null}
                              {(c.quantite ?? 1) > 1 && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">×{c.quantite}</span>}
                              {c.statut === "fume" && <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-400">Fumé</span>}
                              {c.source === "wishlist" && <span className="rounded-full border border-amber-700/50 px-2 py-0.5 text-[10px] text-amber-500">✨ Envie</span>}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeFromCave(c.id); }} className="flex-shrink-0 rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400" aria-label="Supprimer">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/70 p-4 sm:items-center" onClick={() => setSelected(null)}>
          <div className="my-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            {selected.photo_url ? (
              <img src={selected.photo_url} alt={selected.nom} className="mb-3 max-h-60 w-full rounded-xl border border-zinc-800 object-cover" />
            ) : (
              <div className="mb-3 flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800 text-3xl">🚬</div>
            )}
            <label className="mb-4 block cursor-pointer text-center text-sm text-zinc-400 transition hover:text-amber-500">
              {photoBusy ? "Envoi…" : selected.photo_url ? "Changer la photo" : "Ajouter une photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onDetailPhoto} className="hidden" />
            </label>

            <h2 className="text-xl font-semibold">{selected.nom}</h2>
            <div className="flex items-center gap-2">
              {selected.marque && <p className="text-sm uppercase tracking-wider text-amber-500">{selected.marque}</p>}
              {selected.source === "wishlist" && <span className="rounded-full border border-amber-700/50 px-2 py-0.5 text-[10px] text-amber-500">✨ Envie</span>}
            </div>

            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4">
              <Line label="Origine" value={selected.origine} />
              <Line label="Format" value={selected.format} />
              <Line label="Cape" value={selected.cape} />
              <Line label="Force" value={selected.force} />
              <Line label="Durée de fume" value={selected.duree_fume} />
              <Line label="Accord" value={selected.accord} last />
            </div>

            {(selected.premier_tiers || selected.deuxieme_tiers || selected.troisieme_tiers) && (
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4">
                <p className="border-b border-zinc-800 py-2 text-xs uppercase tracking-wider text-amber-500">Évolution</p>
                <Line label="1er tiers" value={selected.premier_tiers} />
                <Line label="2e tiers" value={selected.deuxieme_tiers} />
                <Line label="3e tiers" value={selected.troisieme_tiers} last />
              </div>
            )}

            {selected.conservation && (
              <p className="mt-3 rounded-r-lg border-l-2 border-zinc-600 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
                <span className="font-medium text-zinc-100">Conservation — </span>{selected.conservation}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Quantité</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQteDraft((n) => Math.max(0, n - 1))} className="h-9 w-9 rounded-lg border border-zinc-700 text-lg transition hover:border-amber-500">−</button>
                  <span className="w-6 text-center text-lg font-semibold">{qteDraft}</span>
                  <button type="button" onClick={() => setQteDraft((n) => n + 1)} className="h-9 w-9 rounded-lg border border-zinc-700 text-lg transition hover:border-amber-500">+</button>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Statut</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStatutDraft("en_cave")} className={`rounded-lg px-3 py-1.5 text-sm transition ${statutDraft !== "fume" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>En cave</button>
                  <button type="button" onClick={() => setStatutDraft("fume")} className={`rounded-lg px-3 py-1.5 text-sm transition ${statutDraft === "fume" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-amber-500"}`}>Fumé</button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {histoire ? (
                <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-300 whitespace-pre-wrap">{histoire}</p>
              ) : (
                <button onClick={fetchHistoire} disabled={histoireLoading} className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500 disabled:opacity-50">
                  {histoireLoading ? "Recherche…" : "Histoire de la marque 📖"}
                </button>
              )}
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

function Line({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  if (!value) return null;
  return (
    <div className={`flex gap-3 py-2 text-sm ${last ? "" : "border-b border-zinc-800"}`}>
      <span className="w-28 flex-shrink-0 text-zinc-500">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}
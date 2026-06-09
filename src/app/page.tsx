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
  origine?: string | null;
  force?: string | null;
  photo_url?: string | null;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cave, setCave] = useState<CaveItem[]>([]);
  const [saveMsg, setSaveMsg] = useState("");

  async function loadCave() {
    const { data } = await supabase
      .from("cave")
      .select("id,nom,origine,force,photo_url")
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

  const profil = Array.isArray(fiche?.profil) ? fiche?.profil.join(", ") : fiche?.profil;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Cave personnelle</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">Ma cave à cigares 🔥</h1>

        <AuthBar />

        <Link
          href="/caviste"
          className="mb-6 inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500"
        >
          Demander au caviste 🥃 →
        </Link>

        {!fiche && !loading && (
          <label className="block cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-10 text-center transition hover:border-amber-500">
            <span className="text-zinc-300">Choisir / prendre une photo</span>
            <span className="mt-1 block text-sm text-zinc-500">Galerie ou appareil photo — cadre bien la bague.</span>
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
        )}

        {preview && (
          <img src={preview} alt="cigare" className="mb-6 w-full rounded-xl border border-zinc-800" />
        )}

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
                  <p className="rounded-r-lg border-l-2 border-amber-500 bg-zinc-900/50 px-4 py-3 italic text-zinc-300">
                    {fiche.degustation}
                  </p>
                )}
                {fiche.conservation && (
                  <p className="rounded-r-lg border-l-2 border-zinc-600 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
                    <span className="font-medium text-zinc-100">Conservation — </span>
                    {fiche.conservation}
                  </p>
                )}
              </div>
            ) : (
              <p className="italic text-orange-400">
                {fiche.commentaire || "Cigare non identifié, réessaie avec la bague bien visible."}
              </p>
            )}

            <div className="mt-6 flex gap-2">
              {fiche.identifie && (
                <button onClick={saveToCave} className="rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">
                  + Ajouter à ma cave
                </button>
              )}
              <button onClick={reset} className="rounded-lg border border-zinc-700 px-5 py-2.5 transition hover:border-amber-500">
                Scanner un autre
              </button>
            </div>
            {saveMsg && <p className="mt-2 text-sm text-amber-500">{saveMsg}</p>}
          </div>
        )}

        {cave.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 text-xs tracking-[0.3em] uppercase text-amber-500">Ma cave</p>
            <div className="space-y-2">
              {cave.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.nom} className="h-14 w-14 flex-shrink-0 rounded-lg border border-zinc-800 object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg">🚬</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.nom}</p>
                    <p className="text-sm text-zinc-500">{[c.origine, c.force].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button
                    onClick={() => removeFromCave(c.id)}
                    className="flex-shrink-0 rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400"
                    aria-label="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
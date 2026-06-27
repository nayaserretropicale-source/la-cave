"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import {
  IconCamera, IconPlus, IconEdit, IconX, IconStar,
  IconMoon, IconCaviste, IconMap, IconHeart, IconBook, IconChevronRight,
} from "@/components/Icons";

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

type Editable = {
  nom: string; marque: string; origine: string; format: string; cape: string; force: string;
  duree_fume: string; accord: string; conservation: string;
  premier_tiers: string; deuxieme_tiers: string; troisieme_tiers: string;
};
const EMPTY: Editable = {
  nom: "", marque: "", origine: "", format: "", cape: "", force: "",
  duree_fume: "", accord: "", conservation: "", premier_tiers: "", deuxieme_tiers: "", troisieme_tiers: "",
};

const QUICK_LINKS = [
  { href: "/ce-soir", label: "Ce soir", sub: "Que fumer ?", Icon: IconMoon, primary: true },
  { href: "/caviste", label: "Caviste", sub: "Conseil expert", Icon: IconCaviste, primary: false },
  { href: "/boutiques", label: "Boutiques", sub: "Trouver près de moi", Icon: IconMap, primary: false },
  { href: "/wishlist", label: "Envies", sub: "Ma liste", Icon: IconHeart, primary: false },
];

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
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Editable>(EMPTY);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [q, setQ] = useState("");
  const [forceF, setForceF] = useState("");
  const [statutF, setStatutF] = useState("");
  const [histoire, setHistoire] = useState<string | null>(null);
  const [histoireLoading, setHistoireLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [mForm, setMForm] = useState<Editable>(EMPTY);
  const [manualMsg, setManualMsg] = useState("");

  async function loadCave() {
    const { data } = await supabase
      .from("cave")
      .select("id,nom,marque,origine,force,format,cape,photo_url,rating,note_perso,source,quantite,statut,duree_fume,accord,conservation,premier_tiers,deuxieme_tiers,troisieme_tiers")
      .order("created_at", { ascending: false });
    setCave((data ?? []) as CaveItem[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
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
    setSaveMsg("Ajouté à ta cave");
    loadCave();
  }

  async function saveManual() {
    if (!mForm.nom.trim()) { setManualMsg("Le nom est obligatoire."); return; }
    setManualMsg("Ajout…");
    const { error } = await supabase.from("cave").insert({
      nom: mForm.nom.trim(),
      marque: mForm.marque.trim() || null,
      origine: mForm.origine.trim() || null,
      format: mForm.format.trim() || null,
      cape: mForm.cape.trim() || null,
      force: mForm.force.trim() || null,
      duree_fume: mForm.duree_fume.trim() || null,
      accord: mForm.accord.trim() || null,
      conservation: mForm.conservation.trim() || null,
      profil: [],
      source: "manuel",
    });
    if (error) { setManualMsg("Connecte-toi d'abord pour ajouter."); return; }
    setManual(false);
    setMForm(EMPTY);
    setManualMsg("");
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
    setEditing(false);
    setForm({
      nom: item.nom ?? "",
      marque: item.marque ?? "",
      origine: item.origine ?? "",
      format: item.format ?? "",
      cape: item.cape ?? "",
      force: item.force ?? "",
      duree_fume: item.duree_fume ?? "",
      accord: item.accord ?? "",
      conservation: item.conservation ?? "",
      premier_tiers: item.premier_tiers ?? "",
      deuxieme_tiers: item.deuxieme_tiers ?? "",
      troisieme_tiers: item.troisieme_tiers ?? "",
    });
    setHistoire(null);
    setHistoireLoading(false);
  }

  async function saveDetail() {
    if (!selected) return;
    await supabase.from("cave").update({
      nom: form.nom.trim() || selected.nom,
      marque: form.marque.trim() || null,
      origine: form.origine.trim() || null,
      format: form.format.trim() || null,
      cape: form.cape.trim() || null,
      force: form.force.trim() || null,
      duree_fume: form.duree_fume.trim() || null,
      accord: form.accord.trim() || null,
      conservation: form.conservation.trim() || null,
      premier_tiers: form.premier_tiers.trim() || null,
      deuxieme_tiers: form.deuxieme_tiers.trim() || null,
      troisieme_tiers: form.troisieme_tiers.trim() || null,
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
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/histoire", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <header className="mb-8">
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Collection personnelle</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">La Cave</h1>
        </header>

        <AuthBar />

        {/* Quick links */}
        <div className="mb-8 grid grid-cols-2 gap-2">
          {QUICK_LINKS.map(({ href, label, sub, Icon, primary }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                primary
                  ? "bg-amber-600/10 border border-amber-600/30 hover:border-amber-500/60 hover:bg-amber-600/15"
                  : "border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              <Icon size={18} className={primary ? "text-amber-400 flex-shrink-0" : "text-zinc-400 flex-shrink-0"} />
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-tight ${primary ? "text-amber-300" : "text-zinc-200"}`}>{label}</p>
                <p className="text-[11px] text-zinc-500 leading-tight mt-0.5 truncate">{sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Scan zone */}
        {!fiche && !loading && (
          <div className="mb-3">
            <label className="group flex flex-col items-center gap-3 cursor-pointer rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-8 text-center transition-colors hover:border-amber-600/50 hover:bg-zinc-900/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors group-hover:bg-amber-600/10 group-hover:text-amber-400">
                <IconCamera size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Scanner un cigare</p>
                <p className="mt-0.5 text-xs text-zinc-500">Photo de la bague · galerie ou appareil</p>
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
            </label>
            <button
              onClick={() => { setMForm(EMPTY); setManualMsg(""); setManual(true); }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              <IconPlus size={15} />
              Ajouter manuellement
            </button>
          </div>
        )}

        {preview && (
          <div className="relative mb-6 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-800">
            <Image src={preview} alt="cigare" fill sizes="448px" className="object-cover" />
          </div>
        )}

        {loading && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
            <p className="text-sm text-zinc-400">Analyse en cours…</p>
          </div>
        )}

        {/* Scan result */}
        {fiche && !loading && (
          <div className="mb-6">
            {fiche.identifie ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{fiche.nom || fiche.marque}</h2>
                  <p className="mt-0.5 text-sm text-amber-400">
                    {fiche.marque}
                    {fiche.confiance ? <span className="ml-2 text-zinc-500 text-xs">confiance {fiche.confiance}</span> : null}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/60">
                  <Line label="Origine" value={fiche.origine} />
                  <Line label="Format" value={fiche.format} />
                  <Line label="Cape" value={fiche.cape} />
                  <Line label="Force" value={fiche.force} />
                  <Line label="Durée" value={fiche.duree_fume} />
                  <Line label="Accord" value={fiche.accord} />
                  <Line label="Prix" value={fiche.prix_indicatif} />
                  <Line label="Profil" value={profil} last />
                </div>

                {(fiche.evolution?.premier_tiers || fiche.evolution?.deuxieme_tiers || fiche.evolution?.troisieme_tiers) && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/60">
                    <div className="px-4 py-2.5">
                      <p className="text-xs font-medium text-amber-500/80 uppercase tracking-widest">Évolution</p>
                    </div>
                    <Line label="1er tiers" value={fiche.evolution?.premier_tiers} />
                    <Line label="2e tiers" value={fiche.evolution?.deuxieme_tiers} />
                    <Line label="3e tiers" value={fiche.evolution?.troisieme_tiers} last />
                  </div>
                )}

                {fiche.degustation && (
                  <p className="rounded-xl border border-amber-600/20 bg-amber-950/20 px-4 py-3 text-sm italic text-zinc-300 leading-relaxed">{fiche.degustation}</p>
                )}
                {fiche.conservation && (
                  <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300">
                    <span className="font-medium text-zinc-100">Conservation — </span>{fiche.conservation}
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-orange-500/20 bg-orange-950/20 px-4 py-3 text-sm italic text-orange-300">
                {fiche.commentaire || "Cigare non identifié — réessaie avec la bague bien visible."}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              {fiche.identifie && (
                <button onClick={saveToCave} className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500">
                  Ajouter à ma cave
                </button>
              )}
              <button onClick={reset} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600">
                Scanner un autre
              </button>
            </div>
            {saveMsg && <p className="mt-2 text-sm text-amber-400">{saveMsg}</p>}
          </div>
        )}

        {/* Cave list */}
        {cave.length > 0 && (
          <div className="mt-4">
            {/* Stats */}
            <div className="mb-5 flex items-baseline justify-between">
              <div>
                <span className="text-lg font-semibold text-zinc-50">{cave.length}</span>
                <span className="ml-1.5 text-sm text-zinc-500">cigare{cave.length > 1 ? "s" : ""}</span>
              </div>
              <p className="text-sm text-zinc-500">
                {physical} en cave{fumeCount ? ` · ${fumeCount} fumé${fumeCount > 1 ? "s" : ""}` : ""}
              </p>
            </div>

            {/* Filters */}
            {cave.length >= 5 && (
              <div className="mb-5 space-y-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { val: "", label: "Tout" },
                    { val: "en_cave", label: "En cave" },
                    { val: "fume", label: "Fumés" },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => setStatutF(val)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        statutF === val
                          ? "bg-amber-600 text-zinc-950"
                          : "border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {forces.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setForceF("")}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        forceF === "" ? "bg-amber-600 text-zinc-950" : "border border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      Toutes
                    </button>
                    {forces.map((f) => (
                      <button
                        key={f}
                        onClick={() => setForceF(f)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          forceF === f ? "bg-amber-600 text-zinc-950" : "border border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-600">Aucun cigare ne correspond.</p>
            ) : (
              <div className="space-y-6">
                {groupNames.map((name) => (
                  <div key={name}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">{name}</p>
                    <div className="overflow-hidden rounded-xl border border-zinc-800">
                      {groups[name].map((c, i) => (
                        <div
                          key={c.id}
                          onClick={() => openDetail(c)}
                          className={`flex cursor-pointer items-center gap-3 bg-zinc-900/40 px-3 py-3 transition-colors hover:bg-zinc-900/80 ${
                            i < groups[name].length - 1 ? "border-b border-zinc-800/60" : ""
                          } ${c.statut === "fume" ? "opacity-50" : ""}`}
                        >
                          {c.photo_url ? (
                            <Image
                              src={c.photo_url}
                              alt={c.nom}
                              width={44}
                              height={44}
                              className="h-11 w-11 flex-shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-600">
                              <IconBook size={18} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-100">{c.nom}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {[c.marque, c.force].filter(Boolean).join(" · ")}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {c.rating ? (
                                <span className="flex">
                                  {Array.from({ length: c.rating }).map((_, i) => (
                                    <IconStar key={i} size={11} filled className="text-amber-400" />
                                  ))}
                                </span>
                              ) : null}
                              {(c.quantite ?? 1) > 1 && (
                                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">×{c.quantite}</span>
                              )}
                              {c.statut === "fume" && (
                                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500">Fumé</span>
                              )}
                              {c.source === "wishlist" && (
                                <span className="rounded-full border border-amber-700/40 px-2 py-0.5 text-[10px] text-amber-500/80">Envie</span>
                              )}
                              {c.source === "manuel" && (
                                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-600">Manuel</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFromCave(c.id); }}
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-orange-400"
                              aria-label="Supprimer"
                            >
                              <IconX size={14} />
                            </button>
                            <IconChevronRight size={14} className="text-zinc-700 flex-shrink-0" />
                          </div>
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

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="my-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo */}
            {selected.photo_url ? (
              <div className="relative h-56 w-full overflow-hidden rounded-t-2xl">
                <Image src={selected.photo_url} alt={selected.nom} fill sizes="448px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
              </div>
            ) : (
              <div className="flex h-36 w-full items-center justify-center rounded-t-2xl border-b border-zinc-800 bg-zinc-900 text-zinc-700">
                <IconCamera size={32} />
              </div>
            )}

            <div className="p-5">
              <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 text-xs text-zinc-500 transition-colors hover:text-amber-400">
                <IconCamera size={13} />
                {photoBusy ? "Envoi…" : selected.photo_url ? "Changer la photo" : "Ajouter une photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onDetailPhoto} className="hidden" />
              </label>

              <div className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-50">{selected.nom}</h2>
                <div className="mt-0.5 flex items-center gap-2">
                  {selected.marque && <p className="text-sm text-amber-400">{selected.marque}</p>}
                  {selected.source === "wishlist" && (
                    <span className="rounded-full border border-amber-700/40 px-2 py-0.5 text-[10px] text-amber-500/80">Envie</span>
                  )}
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <FieldEdit label="Nom" value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} />
                  <FieldEdit label="Marque" value={form.marque} onChange={(v) => setForm({ ...form, marque: v })} />
                  <FieldEdit label="Origine" value={form.origine} onChange={(v) => setForm({ ...form, origine: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <FieldEdit label="Force" value={form.force} onChange={(v) => setForm({ ...form, force: v })} placeholder="légère / moyenne / corsée" />
                    <FieldEdit label="Format" value={form.format} onChange={(v) => setForm({ ...form, format: v })} />
                    <FieldEdit label="Cape" value={form.cape} onChange={(v) => setForm({ ...form, cape: v })} />
                    <FieldEdit label="Durée de fume" value={form.duree_fume} onChange={(v) => setForm({ ...form, duree_fume: v })} />
                  </div>
                  <FieldEdit label="Accord" value={form.accord} onChange={(v) => setForm({ ...form, accord: v })} />
                  <FieldEdit label="Conservation" value={form.conservation} onChange={(v) => setForm({ ...form, conservation: v })} />
                  <FieldEdit label="1er tiers" value={form.premier_tiers} onChange={(v) => setForm({ ...form, premier_tiers: v })} />
                  <FieldEdit label="2e tiers" value={form.deuxieme_tiers} onChange={(v) => setForm({ ...form, deuxieme_tiers: v })} />
                  <FieldEdit label="3e tiers" value={form.troisieme_tiers} onChange={(v) => setForm({ ...form, troisieme_tiers: v })} />
                  <button onClick={() => setEditing(false)} className="text-xs text-zinc-500 underline underline-offset-2">Terminer</button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/60">
                    <Line label="Origine" value={selected.origine} />
                    <Line label="Format" value={selected.format} />
                    <Line label="Cape" value={selected.cape} />
                    <Line label="Force" value={selected.force} />
                    <Line label="Durée" value={selected.duree_fume} />
                    <Line label="Accord" value={selected.accord} last />
                  </div>

                  {(selected.premier_tiers || selected.deuxieme_tiers || selected.troisieme_tiers) && (
                    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/60">
                      <div className="px-4 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-amber-500/70">Évolution</p>
                      </div>
                      <Line label="1er tiers" value={selected.premier_tiers} />
                      <Line label="2e tiers" value={selected.deuxieme_tiers} />
                      <Line label="3e tiers" value={selected.troisieme_tiers} last />
                    </div>
                  )}

                  {selected.conservation && (
                    <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300">
                      <span className="font-medium text-zinc-100">Conservation — </span>{selected.conservation}
                    </p>
                  )}

                  <button
                    onClick={() => setEditing(true)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                  >
                    <IconEdit size={14} />
                    Modifier les infos
                  </button>
                </>
              )}

              {/* Qty + statut */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Quantité</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQteDraft((n) => Math.max(0, n - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-base text-zinc-300 transition-colors hover:border-zinc-600"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-base font-semibold">{qteDraft}</span>
                    <button
                      type="button"
                      onClick={() => setQteDraft((n) => n + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-base text-zinc-300 transition-colors hover:border-zinc-600"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Statut</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatutDraft("en_cave")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        statutDraft !== "fume" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      En cave
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatutDraft("fume")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        statutDraft === "fume" ? "bg-amber-600 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      Fumé
                    </button>
                  </div>
                </div>
              </div>

              {/* Histoire */}
              <div className="mt-4">
                {histoire ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{histoire}</div>
                ) : (
                  <button
                    onClick={fetchHistoire}
                    disabled={histoireLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40"
                  >
                    <IconBook size={14} />
                    {histoireLoading ? "Recherche…" : "Histoire de la marque"}
                  </button>
                )}
              </div>

              {/* Rating */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ma note</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRatingDraft(n)}
                      aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                    >
                      <IconStar size={24} filled={n <= ratingDraft} className={n <= ratingDraft ? "text-amber-400" : "text-zinc-700"} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Commentaire */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Mon commentaire</p>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                  placeholder="Ce que j'en ai pensé…"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="mt-5 flex gap-2">
                <button onClick={saveDetail} className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500">
                  Enregistrer
                </button>
                <button onClick={() => setSelected(null)} className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual add modal */}
      {manual && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:items-center"
          onClick={() => setManual(false)}
        >
          <div
            className="my-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold tracking-tight">Ajouter un cigare</h2>
            <p className="mt-1 text-sm text-zinc-500">Seul le nom est obligatoire.</p>

            <div className="mt-5 space-y-3">
              <FieldEdit label="Nom *" value={mForm.nom} onChange={(v) => setMForm({ ...mForm, nom: v })} />
              <FieldEdit label="Marque" value={mForm.marque} onChange={(v) => setMForm({ ...mForm, marque: v })} />
              <FieldEdit label="Origine" value={mForm.origine} onChange={(v) => setMForm({ ...mForm, origine: v })} />
              <div className="grid grid-cols-2 gap-3">
                <FieldEdit label="Force" value={mForm.force} onChange={(v) => setMForm({ ...mForm, force: v })} placeholder="légère / moyenne / corsée" />
                <FieldEdit label="Format" value={mForm.format} onChange={(v) => setMForm({ ...mForm, format: v })} />
                <FieldEdit label="Cape" value={mForm.cape} onChange={(v) => setMForm({ ...mForm, cape: v })} />
                <FieldEdit label="Durée de fume" value={mForm.duree_fume} onChange={(v) => setMForm({ ...mForm, duree_fume: v })} />
              </div>
              <FieldEdit label="Accord" value={mForm.accord} onChange={(v) => setMForm({ ...mForm, accord: v })} />
              <FieldEdit label="Conservation" value={mForm.conservation} onChange={(v) => setMForm({ ...mForm, conservation: v })} />
            </div>

            {manualMsg && <p className="mt-3 text-sm text-amber-400">{manualMsg}</p>}

            <div className="mt-5 flex gap-2">
              <button onClick={saveManual} className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500">
                Ajouter à ma cave
              </button>
              <button onClick={() => setManual(false)} className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700">
                Annuler
              </button>
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
    <div className={`flex gap-3 px-4 py-2.5 text-sm ${last ? "" : ""}`}>
      <span className="w-24 flex-shrink-0 text-zinc-500">{label}</span>
      <span className="flex-1 text-zinc-200">{value}</span>
    </div>
  );
}

function FieldEdit({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors"
      />
    </div>
  );
}

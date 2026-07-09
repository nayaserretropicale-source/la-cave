"use client";

import { useEffect, useState } from "react";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";
import { IconStar } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";

type CaveLite = { id: string; nom: string; origine: string | null; photo_url: string | null };
type Session = {
  id: string;
  cigare_id: string | null;
  nom: string;
  date_fume: string | null;
  duree_min: number | null;
  accord: string | null;
  rating: number | null;
  commentaire: string | null;
};

export default function Journal() {
  const confirm = useConfirm();
  const [cave, setCave] = useState<CaveLite[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [majeur, setMajeur] = useState(false);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const [shareMsg, setShareMsg] = useState("");
  const [cigareId, setCigareId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duree, setDuree] = useState("");
  const [accord, setAccord] = useState("");
  const [rating, setRating] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  async function loadMe() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setPseudo(null); setMajeur(false); return; }
    const { data } = await supabase.from("profiles").select("pseudo,majeur").eq("id", user.id).single();
    setPseudo(data?.pseudo ?? null);
    setMajeur(data?.majeur === true);
  }

  async function loadCave() {
    const { data } = await supabase.from("cave").select("id,nom,origine,photo_url").order("nom");
    setCave((data ?? []) as CaveLite[]);
  }
  async function loadSessions() {
    const { data } = await supabase
      .from("degustation")
      .select("id,cigare_id,nom,date_fume,duree_min,accord,rating,commentaire")
      .order("date_fume", { ascending: false })
      .order("created_at", { ascending: false });
    setSessions((data ?? []) as Session[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMe();
    loadCave();
    loadSessions();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { loadMe(); loadCave(); loadSessions(); });
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
    if (!cig) { setMsg("Choisis un cigare de ta cave."); return; }
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
    if (error) { setMsg("Connecte-toi d'abord pour enregistrer."); return; }
    setMsg("Dégustation enregistrée");
    resetForm();
    setOpen(false);
    loadSessions();
  }

  async function removeSession(id: string) {
    if (!(await confirm({ message: "Supprimer cette dégustation ?", confirmLabel: "Supprimer", danger: true }))) return;
    await supabase.from("degustation").delete().eq("id", id);
    loadSessions();
  }

  async function shareSession(s: Session) {
    setShareMsg("");
    if (!majeur) { setShareMsg("Confirme d'abord ton âge dans l'onglet Communauté."); return; }
    if (!pseudo) { setShareMsg("Ajoute un pseudo dans ton profil pour publier."); return; }
    const photo = cave.find((c) => c.id === s.cigare_id)?.photo_url ?? null;
    const texte = [s.commentaire, s.accord ? `Accord : ${s.accord}` : null].filter(Boolean).join("\n");
    const { error } = await supabase.from("posts").insert({
      cigare_nom: s.nom,
      rating: s.rating,
      texte: texte || null,
      photo_url: photo,
    });
    if (error) { setShareMsg("Partage impossible : " + error.message); return; }
    setSharedIds((p) => new Set(p).add(s.id));
  }

  function frDate(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  const now = new Date();
  const moisCount = sessions.filter((s) => {
    if (!s.date_fume) return false;
    const d = new Date(s.date_fume);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const rated = sessions.filter((s) => s.rating);
  const moyenne = rated.length ? rated.reduce((a, s) => a + (s.rating || 0), 0) / rated.length : 0;
  const origineCount: Record<string, number> = {};
  cave.forEach((c) => { if (c.origine) origineCount[c.origine] = (origineCount[c.origine] || 0) + 1; });
  const originePref = Object.entries(origineCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const hasData = cave.length > 0 || sessions.length > 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8" data-reveal>
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Carnet</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Journal</h1>
        </header>

        <AuthBar />

        {hasData && (
          <div className="stagger mb-6 grid grid-cols-2 gap-2" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
            <Stat label="En cave" value={String(cave.length)} />
            <Stat label="Dégustations" value={String(sessions.length)} />
            <Stat label="Ce mois-ci" value={String(moisCount)} />
            <Stat label="Note moyenne" value={moyenne ? `${moyenne.toFixed(1)} / 5` : "—"} />
            <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Origine préférée</p>
              <p className="mt-0.5 text-amber-400">{originePref}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="btn-3d emoji-tap mb-6 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
        >
          {open ? "Fermer" : <><span className="emoji" aria-hidden>🚬</span> Nouvelle dégustation</>}
        </button>

        {open && (
          <div className="mb-8 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Cigare</label>
              <select
                value={cigareId}
                onChange={(e) => setCigareId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-700 transition-colors"
              >
                <option value="">— Choisir dans ma cave —</option>
                {cave.map((c) => (<option key={c.id} value={c.id}>{c.nom}</option>))}
              </select>
              {cave.length === 0 && <p className="mt-1 text-xs text-zinc-500">Ta cave est vide — ajoute d&apos;abord un cigare.</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Durée (min)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={duree}
                  onChange={(e) => setDuree(e.target.value)}
                  placeholder="45"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Accord</label>
              <input
                value={accord}
                onChange={(e) => setAccord(e.target.value)}
                placeholder="Rhum vieux, café…"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Note</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} étoile${n > 1 ? "s" : ""}`}>
                    <IconStar size={24} filled={n <= rating} className={n <= rating ? "text-amber-400" : "text-zinc-700"} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Ressenti</label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={3}
                placeholder="Arômes, tirage, évolution…"
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
              />
            </div>

            <button
              onClick={save}
              className="btn-3d w-full px-4 py-2.5 text-sm"
            >
              Enregistrer la dégustation
            </button>
            {msg && <p className="text-sm text-amber-400">{msg}</p>}
          </div>
        )}

        {shareMsg && <p className="mb-4 text-sm text-amber-400">{shareMsg}</p>}

        {sessions.length === 0 ? (
          <div className="py-8 text-center" data-reveal>
            <p className="text-4xl" aria-hidden>📖</p>
            <p className="mt-2 text-sm text-zinc-600">Aucune dégustation pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="stagger overflow-hidden rounded-2xl border border-zinc-800" data-reveal>
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className={`bg-zinc-900/40 p-4 ${i < sessions.length - 1 ? "border-b border-zinc-800/60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-100">{s.nom}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{frDate(s.date_fume)}</p>
                  </div>
                  <button
                    onClick={() => removeSession(s.id)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-orange-400"
                    aria-label="Supprimer"
                  >
                    <span aria-hidden>✕</span>
                  </button>
                </div>

                {s.rating ? (
                  <div className="mt-1.5 flex gap-0.5">
                    {Array.from({ length: s.rating }).map((_, i) => (
                      <IconStar key={i} size={12} filled className="text-amber-400" />
                    ))}
                  </div>
                ) : null}

                {(s.duree_min || s.accord) && (
                  <p className="mt-1.5 text-sm text-zinc-400">
                    {[s.duree_min ? `${s.duree_min} min` : null, s.accord].filter(Boolean).join(" · ")}
                  </p>
                )}
                {s.commentaire && <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{s.commentaire}</p>}

                {sharedIds.has(s.id) ? (
                  <p className="mt-3 text-xs text-amber-400">Partagé au cercle</p>
                ) : (
                  <button
                    onClick={() => shareSession(s)}
                    className="mt-3 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                  >
                    Partager au cercle
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-zinc-50">{value}</p>
    </div>
  );
}

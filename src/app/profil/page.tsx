"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { IconUser, IconCamera, IconCercle, IconChevronRight } from "@/components/Icons";

export default function Profil() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUserId(null); return; }
    setUserId(user.id);
    setEmail(user.email ?? null);
    const { data } = await supabase.from("profiles").select("pseudo,bio,avatar_url").eq("id", user.id).single();
    if (data) {
      setPseudo(data.pseudo ?? "");
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatar_url ?? null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !userId) return;
    setUploading(true);
    setMsg("");
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
    if (upErr) { setMsg("Échec de l'upload."); setUploading(false); return; }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    setAvatarUrl(url);
    setUploading(false);
  }

  async function save() {
    if (!userId) { setMsg("Connecte-toi d'abord depuis l'onglet Cave."); return; }
    setMsg("Enregistrement…");
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      pseudo: pseudo || null,
      bio: bio || null,
      avatar_url: avatarUrl,
    });
    setMsg(error ? "Erreur : " + error.message : "Profil enregistré");
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-md">
          <header className="mb-8">
            <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Compte</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Mon profil</h1>
          </header>
          <p className="text-sm text-zinc-400">Connecte-toi depuis l&apos;onglet Cave pour créer ton profil.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8" data-reveal>
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Compte</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Mon profil</h1>
        </header>

        {/* Avatar */}
        <div className="mb-6 flex flex-col items-center gap-4" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
          <div className="relative">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="avatar" width={96} height={96} className="h-24 w-24 rounded-full border-2 border-zinc-700 object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-zinc-500">
                <IconUser size={32} />
              </div>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200">
            <IconCamera size={14} />
            {uploading ? "Envoi…" : "Changer la photo"}
            <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
          </label>
        </div>

        {/* Amis */}
        <Link
          href="/amis"
          data-reveal
          style={{ ["--reveal-delay" as string]: "160ms" }}
          className="interactive mb-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3.5 hover:border-zinc-700"
        >
          <div className="flex items-center gap-3">
            <IconCercle size={16} className="text-zinc-400" />
            <span className="text-sm text-zinc-200">Mes amis</span>
          </div>
          <IconChevronRight size={15} className="text-zinc-600" />
        </Link>

        {/* Formulaire */}
        <div className="space-y-4" data-reveal>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Pseudo</label>
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ton nom d'aficionado"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tes goûts, tes origines préférées…"
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
          <p className="text-xs text-zinc-600">{email}</p>
          <button
            onClick={save}
            className="btn-3d w-full px-4 py-2.5 text-sm"
          >
            Enregistrer
          </button>
          {msg && <p className="text-sm text-amber-400">{msg}</p>}
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </main>
  );
}

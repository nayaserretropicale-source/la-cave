"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
    setMsg(error ? "Erreur : " + error.message : "Profil enregistré ✓");
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Compte</p>
          <h1 className="text-3xl font-semibold mt-1 mb-6">Mon profil 👤</h1>
          <p className="text-sm text-zinc-400">Connecte-toi depuis l'onglet Cave pour créer ton profil.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Compte</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">Mon profil 👤</h1>

        <div className="flex flex-col items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-28 w-28 rounded-full border-2 border-amber-500 object-cover" />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-4xl">👤</div>
          )}
          <label className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">
            {uploading ? "Envoi…" : "Changer la photo"}
            <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
          </label>
        </div>

        <Link href="/amis" className="mt-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition hover:border-amber-500">
          <span className="text-sm">Mes amis 👥</span>
          <span className="text-amber-500">→</span>
        </Link>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Pseudo</label>
            <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Ton nom d'aficionado" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tes goûts, tes origines préférées…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
          </div>
          <p className="text-xs text-zinc-600">Connecté : {email}</p>

          <button onClick={save} className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">Enregistrer le profil</button>
          {msg && <p className="text-sm text-amber-500">{msg}</p>}
        </div>
      </div>
    </main>
  );
}
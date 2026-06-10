"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";

type Author = { pseudo: string | null; avatar_url: string | null };
type Comment = { id: string; user_id: string; texte: string; author?: Author };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: string };
type Post = {
  id: string;
  user_id: string;
  cigare_nom: string;
  marque: string | null;
  texte: string | null;
  rating: number | null;
  photo_url: string | null;
  created_at: string;
  author?: Author;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export default function Communaute() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [majeur, setMajeur] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [links, setLinks] = useState<Friendship[]>([]);
  const [cNom, setCNom] = useState("");
  const [cMarque, setCMarque] = useState("");
  const [cRating, setCRating] = useState(0);
  const [cTexte, setCTexte] = useState("");
  const [cPhoto, setCPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  async function loadMe() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setUserId(null); return; }
    setUserId(user.id);
    const { data } = await supabase.from("profiles").select("pseudo,majeur").eq("id", user.id).single();
    setPseudo(data?.pseudo ?? null);
    setMajeur(data?.majeur === true);
  }

  async function loadFriends() {
    const { data } = await supabase.from("friendships").select("id,requester_id,addressee_id,status");
    setLinks((data ?? []) as Friendship[]);
  }

  async function loadFeed() {
    const { data: { session } } = await supabase.auth.getSession();
    const me = session?.user?.id ?? null;

    const { data: rawPosts } = await supabase
      .from("posts")
      .select("id,user_id,cigare_nom,marque,texte,rating,photo_url,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (rawPosts ?? []) as Post[];
    if (list.length === 0) { setPosts([]); return; }

    const ids = list.map((p) => p.id);
    const userIds = Array.from(new Set(list.map((p) => p.user_id)));

    const { data: profs } = await supabase.from("profiles").select("id,pseudo,avatar_url").in("id", userIds);
    const profMap: Record<string, Author> = {};
    (profs ?? []).forEach((p: any) => { profMap[p.id] = { pseudo: p.pseudo, avatar_url: p.avatar_url }; });

    const { data: likes } = await supabase.from("likes").select("post_id,user_id").in("post_id", ids);
    const { data: coms } = await supabase.from("comments").select("post_id").in("post_id", ids);

    const enriched = list.map((p) => {
      const pl = (likes ?? []).filter((l: any) => l.post_id === p.id);
      const cc = (coms ?? []).filter((c: any) => c.post_id === p.id).length;
      return {
        ...p,
        author: profMap[p.user_id],
        likeCount: pl.length,
        likedByMe: me ? pl.some((l: any) => l.user_id === me) : false,
        commentCount: cc,
      };
    });
    setPosts(enriched);
  }

  useEffect(() => {
    loadMe();
    loadFeed();
    loadFriends();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { loadMe(); loadFeed(); loadFriends(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function confirmMajeur() {
    if (!userId) return;
    await supabase.from("profiles").upsert({ id: userId, majeur: true });
    setMajeur(true);
  }

  function relation(otherId: string) {
    const row = links.find(
      (f) =>
        (f.requester_id === userId && f.addressee_id === otherId) ||
        (f.requester_id === otherId && f.addressee_id === userId)
    );
    if (!row) return { state: "none" as const, row: null };
    if (row.status === "accepted") return { state: "friends" as const, row };
    if (row.requester_id === userId) return { state: "sent" as const, row };
    return { state: "incoming" as const, row };
  }

  async function addFriend(otherId: string) {
    await supabase.from("friendships").insert({ addressee_id: otherId });
    loadFriends();
  }

  async function acceptFriend(rowId: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", rowId);
    loadFriends();
  }

  async function onComposePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("cigares").upload(path, f);
    if (!error) setCPhoto(supabase.storage.from("cigares").getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }

  async function publish() {
    if (!cNom.trim()) { setMsg("Indique au moins le nom du cigare."); return; }
    setMsg("Publication…");
    const { error } = await supabase.from("posts").insert({
      cigare_nom: cNom.trim(),
      marque: cMarque.trim() || null,
      texte: cTexte.trim() || null,
      rating: cRating || null,
      photo_url: cPhoto,
    });
    if (error) { setMsg("Erreur : " + error.message); return; }
    setCNom(""); setCMarque(""); setCRating(0); setCTexte(""); setCPhoto(null); setMsg("");
    loadFeed();
  }

  async function toggleLike(p: Post) {
    if (p.likedByMe) {
      await supabase.from("likes").delete().eq("post_id", p.id).eq("user_id", userId);
    } else {
      await supabase.from("likes").insert({ post_id: p.id });
    }
    loadFeed();
  }

  async function deletePost(id: string) {
    if (!window.confirm("Supprimer ta publication ?")) return;
    await supabase.from("posts").delete().eq("id", id);
    loadFeed();
  }

  async function toggleComments(postId: string) {
    if (openComments[postId]) {
      setOpenComments((m) => { const n = { ...m }; delete n[postId]; return n; });
      return;
    }
    const { data: coms } = await supabase.from("comments").select("id,user_id,texte").eq("post_id", postId).order("created_at");
    const list = (coms ?? []) as Comment[];
    const userIds = Array.from(new Set(list.map((c) => c.user_id)));
    let profMap: Record<string, Author> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,pseudo,avatar_url").in("id", userIds);
      (profs ?? []).forEach((p: any) => { profMap[p.id] = { pseudo: p.pseudo, avatar_url: p.avatar_url }; });
    }
    setOpenComments((m) => ({ ...m, [postId]: list.map((c) => ({ ...c, author: profMap[c.user_id] })) }));
  }

  async function addComment(postId: string) {
    const txt = (commentInput[postId] || "").trim();
    if (!txt) return;
    await supabase.from("comments").insert({ post_id: postId, texte: txt });
    setCommentInput((m) => ({ ...m, [postId]: "" }));
    const { data: coms } = await supabase.from("comments").select("id,user_id,texte").eq("post_id", postId).order("created_at");
    const list = (coms ?? []) as Comment[];
    const userIds = Array.from(new Set(list.map((c) => c.user_id)));
    let profMap: Record<string, Author> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,pseudo,avatar_url").in("id", userIds);
      (profs ?? []).forEach((p: any) => { profMap[p.id] = { pseudo: p.pseudo, avatar_url: p.avatar_url }; });
    }
    setOpenComments((m) => ({ ...m, [postId]: list.map((c) => ({ ...c, author: profMap[c.user_id] })) }));
    loadFeed();
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Cercle</p>
          <h1 className="text-3xl font-semibold mt-1 mb-6">Communauté 👥</h1>
          <AuthBar />
          <p className="text-sm text-zinc-400">Connecte-toi pour rejoindre la communauté.</p>
        </div>
      </main>
    );
  }

  if (!majeur) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Cercle</p>
          <h1 className="text-3xl font-semibold mt-1 mb-6">Communauté 👥</h1>
          <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-5">
            <p className="text-zinc-200">Espace réservé aux personnes ayant l'âge légal pour le tabac (18 ans ou plus).</p>
            <p className="mt-2 text-sm text-zinc-400">Le cigare se savoure avec modération. En continuant, tu confirmes avoir l'âge légal.</p>
            <button onClick={confirmMajeur} className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">Je confirme avoir 18 ans ou plus</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Cercle</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">Communauté 👥</h1>

        {!pseudo ? (
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">
            Choisis un pseudo dans ton <Link href="/profil" className="text-amber-500 underline">profil</Link> pour pouvoir publier.
          </div>
        ) : (
          <div className="mb-8 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <input value={cNom} onChange={(e) => setCNom(e.target.value)} placeholder="Cigare dégusté *" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
            <input value={cMarque} onChange={(e) => setCMarque(e.target.value)} placeholder="Marque (optionnel)" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setCRating(n)} className={`text-2xl ${n <= cRating ? "text-amber-500" : "text-zinc-600"}`} aria-label={`${n} étoiles`}>★</button>
              ))}
            </div>
            <textarea value={cTexte} onChange={(e) => setCTexte(e.target.value)} rows={3} placeholder="Ton ressenti à partager…" className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
            {cPhoto && <img src={cPhoto} alt="aperçu" className="max-h-48 w-full rounded-lg border border-zinc-800 object-cover" />}
            <div className="flex gap-2">
              <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">
                {busy ? "Envoi…" : cPhoto ? "Changer photo" : "Photo"}
                <input type="file" accept="image/*" onChange={onComposePhoto} className="hidden" />
              </label>
              <button onClick={publish} className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500">Publier</button>
            </div>
            {msg && <p className="text-sm text-amber-500">{msg}</p>}
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune publication pour l'instant. Sois le premier à partager !</p>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => {
              const rel = p.user_id !== userId ? relation(p.user_id) : null;
              return (
              <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2">
                  {p.author?.avatar_url ? (
                    <img src={p.author.avatar_url} alt="" className="h-8 w-8 rounded-full border border-zinc-700 object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm">👤</div>
                  )}
                  <span className="text-sm font-medium">{p.author?.pseudo || "Anonyme"}</span>

                  {rel && rel.state === "none" && (
                    <button onClick={() => addFriend(p.user_id)} className="ml-auto rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">+ Ami</button>
                  )}
                  {rel && rel.state === "sent" && <span className="ml-auto text-xs text-zinc-500">En attente</span>}
                  {rel && rel.state === "incoming" && rel.row && (
                    <button onClick={() => acceptFriend(rel.row!.id)} className="ml-auto rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-zinc-950 transition hover:bg-amber-500">Accepter</button>
                  )}
                  {rel && rel.state === "friends" && <span className="ml-auto text-xs text-amber-500">Ami ✓</span>}

                  {p.user_id === userId && (
                    <button onClick={() => deletePost(p.id)} className="ml-auto rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400" aria-label="Supprimer">✕</button>
                  )}
                </div>

                <p className="mt-3 font-semibold">{p.cigare_nom}{p.marque ? <span className="font-normal text-zinc-500"> · {p.marque}</span> : null}</p>
                {p.rating ? <p className="text-sm text-amber-500">{"★".repeat(p.rating)}</p> : null}
                {p.photo_url && <img src={p.photo_url} alt={p.cigare_nom} className="mt-2 max-h-72 w-full rounded-lg border border-zinc-800 object-cover" />}
                {p.texte && <p className="mt-2 text-sm text-zinc-300">{p.texte}</p>}

                <div className="mt-3 flex items-center gap-4 text-sm">
                  <button onClick={() => toggleLike(p)} className={`flex items-center gap-1 transition ${p.likedByMe ? "text-amber-500" : "text-zinc-400 hover:text-amber-500"}`}>
                    {p.likedByMe ? "♥" : "♡"} {p.likeCount}
                  </button>
                  <button onClick={() => toggleComments(p.id)} className="flex items-center gap-1 text-zinc-400 transition hover:text-amber-500">
                    💬 {p.commentCount}
                  </button>
                </div>

                {openComments[p.id] && (
                  <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                    {openComments[p.id].map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        {c.author?.avatar_url ? (
                          <img src={c.author.avatar_url} alt="" className="h-6 w-6 rounded-full border border-zinc-700 object-cover" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs">👤</div>
                        )}
                        <p className="text-sm text-zinc-300"><span className="font-medium text-zinc-100">{c.author?.pseudo || "Anonyme"}</span> {c.texte}</p>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <input value={commentInput[p.id] || ""} onChange={(e) => setCommentInput((m) => ({ ...m, [p.id]: e.target.value }))} placeholder="Commenter…" className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
                      <button onClick={() => addComment(p.id)} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-500">Envoyer</button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
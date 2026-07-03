"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthBar from "@/components/AuthBar";
import { supabase } from "@/lib/supabase";
import { IconUser, IconX, IconStar, IconCamera, IconPlus } from "@/components/Icons";

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

function Avatar({ url, size = 32 }: { url?: string | null; size?: number }) {
  if (url) return <Image src={url} alt="" width={size} height={size} className="rounded-full border border-zinc-700 object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="flex flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-500" style={{ width: size, height: size }}>
      <IconUser size={size * 0.45} />
    </div>
  );
}

export default function Communaute() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [majeur, setMajeur] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [links, setLinks] = useState<Friendship[]>([]);
  const [onlyFriends, setOnlyFriends] = useState(false);
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
    const { data } = await supabase.from("profiles").select("pseudo,majeur,is_admin").eq("id", user.id).single();
    setPseudo(data?.pseudo ?? null);
    setMajeur(data?.majeur === true);
    setIsAdmin(data?.is_admin === true);
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
    (profs ?? []).forEach((p: Author & { id: string }) => { profMap[p.id] = { pseudo: p.pseudo, avatar_url: p.avatar_url }; });
    const { data: likes } = await supabase.from("likes").select("post_id,user_id").in("post_id", ids);
    const { data: coms } = await supabase.from("comments").select("post_id").in("post_id", ids);
    const enriched = list.map((p) => {
      const pl = (likes ?? []).filter((l) => l.post_id === p.id);
      const cc = (coms ?? []).filter((c) => c.post_id === p.id).length;
      return { ...p, author: profMap[p.user_id], likeCount: pl.length, likedByMe: me ? pl.some((l) => l.user_id === me) : false, commentCount: cc };
    });
    setPosts(enriched);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMe(); loadFeed(); loadFriends();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { loadMe(); loadFeed(); loadFriends(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function confirmMajeur() {
    if (!userId) return;
    await supabase.from("profiles").upsert({ id: userId, majeur: true });
    setMajeur(true);
  }

  function relation(otherId: string) {
    const row = links.find((f) =>
      (f.requester_id === userId && f.addressee_id === otherId) ||
      (f.requester_id === otherId && f.addressee_id === userId)
    );
    if (!row) return { state: "none" as const, row: null };
    if (row.status === "accepted") return { state: "friends" as const, row };
    if (row.requester_id === userId) return { state: "sent" as const, row };
    return { state: "incoming" as const, row };
  }

  async function addFriend(otherId: string) {
    const { error } = await supabase.from("friendships").insert({ addressee_id: otherId });
    if (error) { setMsg("Demande impossible (déjà envoyée ?)."); return; }
    sendPush("friend_request", otherId);
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
      cigare_nom: cNom.trim(), marque: cMarque.trim() || null,
      texte: cTexte.trim() || null, rating: cRating || null, photo_url: cPhoto,
    });
    if (error) { setMsg("Erreur : " + error.message); return; }
    setCNom(""); setCMarque(""); setCRating(0); setCTexte(""); setCPhoto(null); setMsg("");
    loadFeed();
  }

  async function sendPush(type: "like" | "comment" | "friend_request", toUserId: string, postId?: string) {
    if (toUserId === userId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ type, toUserId, postId }),
    }).catch(() => {});
  }

  async function toggleLike(p: Post) {
    if (p.likedByMe) {
      await supabase.from("likes").delete().eq("post_id", p.id).eq("user_id", userId);
    } else {
      await supabase.from("likes").insert({ post_id: p.id });
      sendPush("like", p.user_id, p.id);
    }
    loadFeed();
  }

  async function deletePost(id: string) {
    if (!window.confirm("Supprimer cette publication ?")) return;
    await supabase.from("posts").delete().eq("id", id);
    loadFeed();
  }

  async function refreshComments(postId: string) {
    const { data: coms } = await supabase.from("comments").select("id,user_id,texte").eq("post_id", postId).order("created_at");
    const list = (coms ?? []) as Comment[];
    const userIds = Array.from(new Set(list.map((c) => c.user_id)));
    const profMap: Record<string, Author> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,pseudo,avatar_url").in("id", userIds);
      (profs ?? []).forEach((p: Author & { id: string }) => { profMap[p.id] = { pseudo: p.pseudo, avatar_url: p.avatar_url }; });
    }
    setOpenComments((m) => ({ ...m, [postId]: list.map((c) => ({ ...c, author: profMap[c.user_id] })) }));
  }

  async function toggleComments(postId: string) {
    if (openComments[postId]) { setOpenComments((m) => { const n = { ...m }; delete n[postId]; return n; }); return; }
    await refreshComments(postId);
  }

  async function addComment(postId: string) {
    const txt = (commentInput[postId] || "").trim();
    if (!txt) return;
    await supabase.from("comments").insert({ post_id: postId, texte: txt });
    setCommentInput((m) => ({ ...m, [postId]: "" }));
    const post = posts.find((p) => p.id === postId);
    if (post) sendPush("comment", post.user_id, postId);
    await refreshComments(postId);
    loadFeed();
  }

  async function deleteComment(postId: string, commentId: string) {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    await supabase.from("comments").delete().eq("id", commentId);
    await refreshComments(postId);
    loadFeed();
  }

  const pageHeader = (
    <header className="mb-8">
      <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">
        Cercle{isAdmin ? " · admin" : ""}
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Communauté</h1>
    </header>
  );

  if (!userId) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-md">
          {pageHeader}
          <AuthBar />
          <p className="text-sm text-zinc-400">Connecte-toi pour rejoindre la communauté.</p>
        </div>
      </main>
    );
  }

  if (!majeur) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-md">
          {pageHeader}
          <div className="rounded-2xl border border-amber-700/30 bg-amber-950/15 p-5">
            <p className="text-zinc-200 leading-relaxed">Espace réservé aux personnes ayant l&apos;âge légal pour le tabac (18 ans ou plus).</p>
            <p className="mt-2 text-sm text-zinc-400">Le cigare se savoure avec modération. En continuant, tu confirmes avoir l&apos;âge légal.</p>
            <button onClick={confirmMajeur} className="btn-press mt-5 w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500">
              Je confirme avoir 18 ans ou plus
            </button>
          </div>
        </div>
      </main>
    );
  }

  const friendIds = new Set(
    links.filter((f) => f.status === "accepted").map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id))
  );
  const visiblePosts = onlyFriends ? posts.filter((p) => p.user_id === userId || friendIds.has(p.user_id)) : posts;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        {pageHeader}

        {/* Compose */}
        {!pseudo ? (
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3.5 text-sm text-zinc-400">
            Choisis un pseudo dans ton <Link href="/profil" className="text-amber-400 underline underline-offset-2">profil</Link> pour publier.
          </div>
        ) : (
          <div className="mb-8 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <input
              value={cNom}
              onChange={(e) => setCNom(e.target.value)}
              placeholder="Cigare dégusté *"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
            />
            <input
              value={cMarque}
              onChange={(e) => setCMarque(e.target.value)}
              placeholder="Marque (optionnel)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
            />
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setCRating(n)} aria-label={`${n} étoiles`}>
                  <IconStar size={22} filled={n <= cRating} className={n <= cRating ? "text-amber-400" : "text-zinc-700"} />
                </button>
              ))}
            </div>
            <textarea
              value={cTexte}
              onChange={(e) => setCTexte(e.target.value)}
              rows={3}
              placeholder="Ton ressenti à partager…"
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
            />
            {cPhoto && (
              <div className="relative h-48 w-full overflow-hidden rounded-xl border border-zinc-800">
                <Image src={cPhoto} alt="aperçu" fill sizes="448px" className="object-cover" />
              </div>
            )}
            <div className="flex gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200">
                <IconCamera size={14} />
                {busy ? "Envoi…" : cPhoto ? "Changer" : "Photo"}
                <input type="file" accept="image/*" onChange={onComposePhoto} className="hidden" />
              </label>
              <button
                onClick={publish}
                className="btn-press flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500"
              >
                <IconPlus size={15} />
                Publier
              </button>
            </div>
            {msg && <p className="text-sm text-amber-400">{msg}</p>}
          </div>
        )}

        {/* Feed filter */}
        <div className="mb-5 flex gap-2">
          {[
            { val: false, label: "Tous" },
            { val: true, label: "Amis" },
          ].map(({ val, label }) => (
            <button
              key={label}
              onClick={() => setOnlyFriends(val)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                onlyFriends === val ? "bg-amber-600 text-zinc-950" : "border border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {visiblePosts.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-600">
            {onlyFriends ? "Aucune publication de tes amis." : "Aucune publication. Sois le premier à partager !"}
          </p>
        ) : (
          <div className="stagger space-y-4">
            {visiblePosts.map((p) => {
              const rel = p.user_id !== userId ? relation(p.user_id) : null;
              return (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
                  {/* Post header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
                    <Link href={`/u/${p.user_id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar url={p.author?.avatar_url} size={32} />
                      <span className="truncate text-sm font-medium text-zinc-100">{p.author?.pseudo || "Anonyme"}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      {rel?.state === "none" && (
                        <button onClick={() => addFriend(p.user_id)} className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200">
                          + Ami
                        </button>
                      )}
                      {rel?.state === "sent" && <span className="text-xs text-zinc-600">En attente</span>}
                      {rel?.state === "incoming" && rel.row && (
                        <button onClick={() => acceptFriend(rel.row!.id)} className="btn-press rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-500">Accepter</button>
                      )}
                      {rel?.state === "friends" && <span className="text-xs text-amber-400">Ami</span>}
                      {(p.user_id === userId || isAdmin) && (
                        <button
                          onClick={() => deletePost(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-orange-400"
                          aria-label="Supprimer"
                        >
                          <IconX size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post body */}
                  <div className="px-4 py-3">
                    <p className="font-semibold text-zinc-50">
                      {p.cigare_nom}
                      {p.marque && <span className="font-normal text-zinc-500"> · {p.marque}</span>}
                    </p>
                    {p.rating ? (
                      <div className="mt-1 flex gap-0.5">
                        {Array.from({ length: p.rating }).map((_, i) => <IconStar key={i} size={12} filled className="text-amber-400" />)}
                      </div>
                    ) : null}
                    {p.photo_url && (
                      <div className="relative mt-3 h-72 w-full overflow-hidden rounded-xl border border-zinc-800">
                        <Image src={p.photo_url} alt={p.cigare_nom} fill sizes="448px" className="object-cover" />
                      </div>
                    )}
                    {p.texte && <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{p.texte}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 border-t border-zinc-800/60 px-4 py-2.5">
                    <button
                      onClick={() => toggleLike(p)}
                      aria-label={p.likedByMe ? "Retirer le like" : "Aimer"}
                      aria-pressed={p.likedByMe}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${p.likedByMe ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      <span aria-hidden className="text-base leading-none">{p.likedByMe ? "♥" : "♡"}</span>
                      <span>{p.likeCount}</span>
                    </button>
                    <button
                      onClick={() => toggleComments(p.id)}
                      aria-label="Commentaires"
                      className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      <span aria-hidden className="text-base leading-none">○</span>
                      <span>{p.commentCount}</span>
                    </button>
                  </div>

                  {/* Comments */}
                  {openComments[p.id] && (
                    <div className="border-t border-zinc-800/60 px-4 py-3 space-y-3">
                      {openComments[p.id].map((c) => (
                        <div key={c.id} className="flex items-start gap-2.5">
                          <Avatar url={c.author?.avatar_url} size={24} />
                          <p className="flex-1 text-sm text-zinc-300 leading-relaxed">
                            <span className="font-medium text-zinc-100">{c.author?.pseudo || "Anonyme"} </span>
                            {c.texte}
                          </p>
                          {(c.user_id === userId || isAdmin) && (
                            <button
                              onClick={() => deleteComment(p.id, c.id)}
                              className="flex-shrink-0 text-zinc-700 transition-colors hover:text-orange-400"
                              aria-label="Supprimer"
                            >
                              <IconX size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={commentInput[p.id] || ""}
                          onChange={(e) => setCommentInput((m) => ({ ...m, [p.id]: e.target.value }))}
                          placeholder="Commenter…"
                          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
                        />
                        <button onClick={() => addComment(p.id)} className="btn-press rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500">
                          Envoyer
                        </button>
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

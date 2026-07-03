"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { IconUser, IconStar } from "@/components/Icons";

type Profile = { id: string; pseudo: string | null; avatar_url: string | null; bio: string | null };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: string };
type Post = { id: string; cigare_nom: string; marque: string | null; texte: string | null; rating: number | null; photo_url: string | null; created_at: string; likeCount: number; likedByMe: boolean; commentCount: number };

export default function PublicProfile() {
  const params = useParams();
  const profileId = String(params.id || "");
  const [me, setMe] = useState<string | null>(null);
  const [prof, setProf] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Friendship[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notFound, setNotFound] = useState(false);

  async function loadAll() {
    // Reset : évite d'afficher le profil précédent en naviguant entre deux /u/*
    setNotFound(false);
    setProf(null);
    const { data: { session } } = await supabase.auth.getSession();
    const meId = session?.user?.id ?? null;
    setMe(meId);

    const { data: p } = await supabase.from("profiles").select("id,pseudo,avatar_url,bio").eq("id", profileId).single();
    if (!p) { setNotFound(true); return; }
    setProf(p as Profile);

    const { data: fr } = await supabase.from("friendships").select("id,requester_id,addressee_id,status");
    setLinks((fr ?? []) as Friendship[]);

    const { data: rawPosts } = await supabase
      .from("posts")
      .select("id,cigare_nom,marque,texte,rating,photo_url,created_at")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (rawPosts ?? []) as Post[];
    const ids = list.map((x) => x.id);
    type LikeRow = { post_id: string; user_id: string };
    type CommentRow = { post_id: string };
    let likes: LikeRow[] = [], coms: CommentRow[] = [];
    if (ids.length) {
      const lr = await supabase.from("likes").select("post_id,user_id").in("post_id", ids);
      const cr = await supabase.from("comments").select("post_id").in("post_id", ids);
      likes = lr.data ?? []; coms = cr.data ?? [];
    }
    setPosts(list.map((x) => {
      const pl = likes.filter((l) => l.post_id === x.id);
      return { ...x, likeCount: pl.length, likedByMe: meId ? pl.some((l) => l.user_id === meId) : false, commentCount: coms.filter((c) => c.post_id === x.id).length };
    }));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profileId) loadAll();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { if (profileId) loadAll(); });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function relation() {
    const row = links.find((f) => (f.requester_id === me && f.addressee_id === profileId) || (f.requester_id === profileId && f.addressee_id === me));
    if (!row) return { state: "none" as const, row: null };
    if (row.status === "accepted") return { state: "friends" as const, row };
    if (row.requester_id === me) return { state: "sent" as const, row };
    return { state: "incoming" as const, row };
  }

  async function addFriend() { await supabase.from("friendships").insert({ addressee_id: profileId }); loadAll(); }
  async function accept(rowId: string) { await supabase.from("friendships").update({ status: "accepted" }).eq("id", rowId); loadAll(); }
  async function removeLink(rowId: string) { await supabase.from("friendships").delete().eq("id", rowId); loadAll(); }
  async function toggleLike(p: Post) {
    if (p.likedByMe) await supabase.from("likes").delete().eq("post_id", p.id).eq("user_id", me);
    else await supabase.from("likes").insert({ post_id: p.id });
    loadAll();
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link href="/communaute" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">← Communauté</Link>
          <p className="mt-8 text-sm text-zinc-500">Profil introuvable.</p>
        </div>
      </main>
    );
  }

  if (!prof) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
            <p className="text-sm text-zinc-400">Chargement…</p>
          </div>
        </div>
      </main>
    );
  }

  const isMe = me === profileId;
  const rel = relation();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/communaute" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">← Communauté</Link>

        {/* Profile header */}
        <div className="mt-6 flex items-center gap-4">
          {prof.avatar_url ? (
            <Image src={prof.avatar_url} alt="" width={72} height={72} className="h-18 w-18 rounded-full border-2 border-zinc-700 object-cover flex-shrink-0" />
          ) : (
            <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-zinc-500">
              <IconUser size={28} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-50">{prof.pseudo || "Membre"}</h1>
            {!isMe && (
              <div className="mt-2">
                {rel.state === "none" && (
                  <button onClick={addFriend} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200">
                    + Ajouter en ami
                  </button>
                )}
                {rel.state === "sent" && (
                  <button onClick={() => rel.row && removeLink(rel.row.id)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-orange-400/40 hover:text-orange-400">
                    Demande envoyée · Annuler
                  </button>
                )}
                {rel.state === "incoming" && rel.row && (
                  <button onClick={() => accept(rel.row!.id)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-500">
                    Accepter la demande
                  </button>
                )}
                {rel.state === "friends" && (
                  <button onClick={() => rel.row && removeLink(rel.row.id)} className="rounded-lg border border-amber-700/30 px-3 py-1.5 text-xs text-amber-400 transition-colors hover:border-orange-400/40 hover:text-orange-400">
                    Ami · Retirer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {prof.bio && <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{prof.bio}</p>}

        {/* Posts */}
        <p className="mt-8 mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Publications ({posts.length})
        </p>
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">Aucune publication.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
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
                <div className="flex items-center gap-4 border-t border-zinc-800/60 px-4 py-2.5">
                  <button
                    onClick={() => toggleLike(p)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${p.likedByMe ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <span className="text-base leading-none">{p.likedByMe ? "♥" : "♡"}</span>
                    <span>{p.likeCount}</span>
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-zinc-600">
                    <span className="text-base leading-none">○</span>
                    <span>{p.commentCount}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

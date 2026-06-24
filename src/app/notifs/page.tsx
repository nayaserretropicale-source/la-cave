"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type Author = { pseudo: string | null; avatar_url: string | null };
type Notif = {
  key: string;
  type: "like" | "comment" | "friend";
  userId: string;
  author?: Author;
  detail: string;
  created_at: string;
  isNew: boolean;
  friendshipId?: string;
};

export default function Notifs() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const me = session?.user?.id;
    if (!me) { setSignedIn(false); setLoading(false); return; }
    setSignedIn(true);

    const { data: prof } = await supabase
      .from("profiles").select("notifs_seen_at").eq("id", me).single();
    const seen = prof?.notifs_seen_at ?? "1970-01-01T00:00:00Z";

    const { data: myPosts } = await supabase
      .from("posts").select("id,cigare_nom").eq("user_id", me);
    const postIds = (myPosts ?? []).map((p) => p.id);
    const postName: Record<string, string> = {};
    (myPosts ?? []).forEach((p) => { postName[p.id] = p.cigare_nom; });

    type LikeRow = { user_id: string; post_id: string; created_at: string };
    type CommentRow = { id: string; user_id: string; post_id: string; texte: string; created_at: string };
    let likes: LikeRow[] = [];
    let coms: CommentRow[] = [];
    if (postIds.length) {
      const l = await supabase
        .from("likes").select("user_id,post_id,created_at")
        .in("post_id", postIds).neq("user_id", me)
        .order("created_at", { ascending: false }).limit(30);
      likes = l.data ?? [];
      const c = await supabase
        .from("comments").select("id,user_id,post_id,texte,created_at")
        .in("post_id", postIds).neq("user_id", me)
        .order("created_at", { ascending: false }).limit(30);
      coms = c.data ?? [];
    }

    const { data: reqs } = await supabase
      .from("friendships").select("id,requester_id,created_at")
      .eq("addressee_id", me).eq("status", "pending");
    const pending = reqs ?? [];

    const uids = Array.from(new Set([
      ...likes.map((x) => x.user_id),
      ...coms.map((x) => x.user_id),
      ...pending.map((x) => x.requester_id),
    ]));
    const profMap: Record<string, Author> = {};
    if (uids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id,pseudo,avatar_url").in("id", uids);
      (profs ?? []).forEach((p: Author & { id: string }) => { profMap[p.id] = { pseudo: p.pseudo, avatar_url: p.avatar_url }; });
    }

    const list: Notif[] = [
      ...likes.map((x) => ({
        key: `l-${x.post_id}-${x.user_id}`,
        type: "like" as const,
        userId: x.user_id,
        author: profMap[x.user_id],
        detail: `a aimé « ${postName[x.post_id] || "ton post"} »`,
        created_at: x.created_at,
        isNew: x.created_at > seen,
      })),
      ...coms.map((x) => ({
        key: `c-${x.id}`,
        type: "comment" as const,
        userId: x.user_id,
        author: profMap[x.user_id],
        detail: `a commenté : « ${(x.texte || "").slice(0, 70)} »`,
        created_at: x.created_at,
        isNew: x.created_at > seen,
      })),
      ...pending.map((x) => ({
        key: `f-${x.id}`,
        type: "friend" as const,
        userId: x.requester_id,
        author: profMap[x.requester_id],
        detail: "t'a envoyé une demande d'ami",
        created_at: x.created_at,
        isNew: x.created_at > seen,
        friendshipId: x.id,
      })),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 40);

    setNotifs(list);
    setLoading(false);

    // Marque tout comme lu (le badge de l'AvatarBadge se mettra à jour au prochain changement de page)
    await supabase.from("profiles")
      .update({ notifs_seen_at: new Date().toISOString() })
      .eq("id", me);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function acceptFriend(rowId: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", rowId);
    load();
  }

  const ICON = { like: "❤️", comment: "💬", friend: "🤝" };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-amber-500">← Ma cave</Link>
        <h1 className="text-3xl font-semibold mt-2 mb-6">Notifications 🔔</h1>

        {signedIn === false && (
          <p className="text-sm text-zinc-400">Connecte-toi pour voir tes notifications.</p>
        )}

        {loading && signedIn !== false && (
          <p className="animate-pulse text-amber-500">Chargement…</p>
        )}

        {!loading && signedIn && notifs.length === 0 && (
          <p className="text-sm text-zinc-500">Rien de nouveau pour l&apos;instant. Partage une dégustation dans le <Link href="/communaute" className="text-amber-500 underline">Cercle</Link> !</p>
        )}

        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.key} className={`flex items-center gap-3 rounded-xl border p-3 ${n.isNew ? "border-amber-600/50 bg-amber-950/10" : "border-zinc-800 bg-zinc-900/50"}`}>
              <span className="text-lg">{ICON[n.type]}</span>
              <Link href={`/u/${n.userId}`} className="flex-shrink-0">
                {n.author?.avatar_url ? (
                  <Image src={n.author.avatar_url} alt="" width={32} height={32} className="h-8 w-8 rounded-full border border-zinc-700 object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm">👤</div>
                )}
              </Link>
              <p className="min-w-0 flex-1 text-sm text-zinc-300">
                <span className="font-medium text-zinc-100">{n.author?.pseudo || "Anonyme"}</span> {n.detail}
              </p>
              {n.type === "friend" && n.friendshipId && (
                <button onClick={() => acceptFriend(n.friendshipId!)} className="flex-shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-zinc-950 transition hover:bg-amber-500">
                  Accepter
                </button>
              )}
              {n.type !== "friend" && (
                <Link href="/communaute" className="flex-shrink-0 text-xs text-zinc-500 transition hover:text-amber-500">Voir →</Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
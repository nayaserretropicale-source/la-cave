"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type P = { pseudo: string | null; avatar_url: string | null };
type Req = { id: string; requester_id: string; author?: P };
type Activity = { key: string; type: "like" | "comment"; actor?: P; postName: string; texte?: string | null; created_at: string; isNew: boolean };

export default function Notifs() {
  const [me, setMe] = useState<string | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);

  async function loadAll() {
    const { data: { session } } = await supabase.auth.getSession();
    const meId = session?.user?.id ?? null;
    setMe(meId);
    if (!meId) return;

    const { data: prof } = await supabase.from("profiles").select("notifs_seen_at").eq("id", meId).single();
    const seen = prof?.notifs_seen_at ?? "1970-01-01T00:00:00Z";

    const { data: fr } = await supabase.from("friendships").select("id,requester_id").eq("addressee_id", meId).eq("status", "pending");
    const reqList = (fr ?? []) as Req[];

    const { data: myPosts } = await supabase.from("posts").select("id,cigare_nom").eq("user_id", meId);
    const postMap: Record<string, string> = {};
    (myPosts ?? []).forEach((p: any) => { postMap[p.id] = p.cigare_nom; });
    const ids = Object.keys(postMap);

    let likes: any[] = [], coms: any[] = [];
    if (ids.length) {
      const lr = await supabase.from("likes").select("user_id,post_id,created_at").in("post_id", ids);
      const cr = await supabase.from("comments").select("user_id,post_id,texte,created_at").in("post_id", ids);
      likes = (lr.data ?? []).filter((x: any) => x.user_id !== meId);
      coms = (cr.data ?? []).filter((x: any) => x.user_id !== meId);
    }

    const actorIds = Array.from(new Set([...reqList.map((r) => r.requester_id), ...likes.map((l) => l.user_id), ...coms.map((c) => c.user_id)]));
    const profMap: Record<string, P> = {};
    if (actorIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,pseudo,avatar_url").in("id", actorIds);
      (profs ?? []).forEach((p: any) => { profMap[p.id] = { pseudo: p.pseudo, avatar_url: p.avatar_url }; });
    }
    setReqs(reqList.map((r) => ({ ...r, author: profMap[r.requester_id] })));

    const activity: Activity[] = [
      ...likes.map((l: any) => ({ key: `l-${l.post_id}-${l.user_id}-${l.created_at}`, type: "like" as const, actor: profMap[l.user_id], postName: postMap[l.post_id], created_at: l.created_at, isNew: l.created_at > seen })),
      ...coms.map((c: any) => ({ key: `c-${c.post_id}-${c.user_id}-${c.created_at}`, type: "comment" as const, actor: profMap[c.user_id], postName: postMap[c.post_id], texte: c.texte, created_at: c.created_at, isNew: c.created_at > seen })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 40);
    setActs(activity);

    await supabase.from("profiles").update({ notifs_seen_at: new Date().toISOString() }).eq("id", meId);
  }

  useEffect(() => {
    loadAll();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadAll());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function accept(id: string) { await supabase.from("friendships").update({ status: "accepted" }).eq("id", id); loadAll(); }
  async function refuse(id: string) { await supabase.from("friendships").delete().eq("id", id); loadAll(); }
  function frTime(d: string) { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }

  if (!me) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold mb-4">Notifications 🔔</h1>
          <p className="text-sm text-zinc-400">Connecte-toi pour voir tes notifications.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Activité</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">Notifications 🔔</h1>

        {reqs.length > 0 && (
          <div className="mb-8">
            <p className="mb-2 text-xs uppercase tracking-wider text-amber-500">Demandes d'amis</p>
            <div className="space-y-2">
              {reqs.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <Link href={`/u/${r.requester_id}`}>
                    {r.author?.avatar_url ? <img src={r.author.avatar_url} alt="" className="h-9 w-9 rounded-full border border-zinc-700 object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm">👤</div>}
                  </Link>
                  <span className="flex-1 truncate text-sm">{r.author?.pseudo || "Membre"}</span>
                  <button onClick={() => accept(r.id)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-500">Accepter</button>
                  <button onClick={() => refuse(r.id)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-orange-400 hover:text-orange-400">Refuser</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Sur tes publications</p>
        {acts.length === 0 ? (
          <p className="text-sm text-zinc-500">Rien pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {acts.map((a) => (
              <div key={a.key} className={`flex items-center gap-3 rounded-lg border p-3 ${a.isNew ? "border-amber-700/40 bg-amber-950/10" : "border-zinc-800 bg-zinc-900/50"}`}>
                {a.actor?.avatar_url ? <img src={a.actor.avatar_url} alt="" className="h-9 w-9 rounded-full border border-zinc-700 object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm">👤</div>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.actor?.pseudo || "Quelqu'un"}</span>
                    {a.type === "like" ? " a aimé " : " a commenté "}
                    <span className="text-zinc-400">{a.postName}</span>
                  </p>
                  {a.type === "comment" && a.texte && <p className="truncate text-xs text-zinc-500">« {a.texte} »</p>}
                </div>
                <span className="flex-shrink-0 text-xs text-zinc-600">{frTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
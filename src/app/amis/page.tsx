"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; pseudo: string | null; avatar_url: string | null };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: string };

export default function Amis() {
  const [userId, setUserId] = useState<string | null>(null);
  const [links, setLinks] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    const me = session?.user?.id ?? null;
    setUserId(me);
    if (!me) return;

    const { data: fr } = await supabase.from("friendships").select("id,requester_id,addressee_id,status");
    const list = (fr ?? []) as Friendship[];
    setLinks(list);

    const otherIds = Array.from(new Set(list.map((f) => (f.requester_id === me ? f.addressee_id : f.requester_id))));
    if (otherIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,pseudo,avatar_url").in("id", otherIds);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: Profile) => { map[p.id] = p; });
      setProfiles(map);
    } else {
      setProfiles({});
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function search() {
    if (!term.trim() || !userId) { setResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id,pseudo,avatar_url")
      .ilike("pseudo", `%${term.trim()}%`)
      .neq("id", userId)
      .limit(10);
    setResults((data ?? []) as Profile[]);
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
    setMsg("");
    const { error } = await supabase.from("friendships").insert({ addressee_id: otherId });
    if (error) { setMsg("Demande impossible (déjà envoyée ?)."); return; }
    load();
  }

  async function accept(rowId: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", rowId);
    load();
  }

  async function removeLink(rowId: string) {
    await supabase.from("friendships").delete().eq("id", rowId);
    load();
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold mb-4">Mes amis 👥</h1>
          <p className="text-sm text-zinc-400">Connecte-toi pour gérer tes amis.</p>
        </div>
      </main>
    );
  }

  const me = userId;
  const friends = links.filter((f) => f.status === "accepted");
  const incoming = links.filter((f) => f.status === "pending" && f.addressee_id === me);
  const outgoing = links.filter((f) => f.status === "pending" && f.requester_id === me);
  const otherOf = (f: Friendship) => (f.requester_id === me ? f.addressee_id : f.requester_id);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-500">Réseau</p>
        <h1 className="text-3xl font-semibold mt-1 mb-6">Mes amis 👥</h1>

        <div className="mb-8 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Trouver un membre</p>
          <div className="flex gap-2">
            <input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") search(); }} placeholder="Pseudo…" className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none" />
            <button onClick={search} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-500">Chercher</button>
          </div>
          {msg && <p className="text-sm text-amber-500">{msg}</p>}
          {results.map((r) => {
            const rel = relation(r.id);
            return (
              <div key={r.id} className="flex items-center gap-3 border-t border-zinc-800 pt-3">
                {r.avatar_url ? <Image src={r.avatar_url} alt="" width={36} height={36} className="h-9 w-9 rounded-full border border-zinc-700 object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm">👤</div>}
                <span className="flex-1 truncate text-sm">{r.pseudo || "Sans pseudo"}</span>
                {rel.state === "none" && <button onClick={() => addFriend(r.id)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">Ajouter</button>}
                {rel.state === "sent" && <span className="text-xs text-zinc-500">En attente</span>}
                {rel.state === "friends" && <span className="text-xs text-amber-500">Ami ✓</span>}
                {rel.state === "incoming" && rel.row && <button onClick={() => accept(rel.row!.id)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-500">Accepter</button>}
              </div>
            );
          })}
        </div>

        {incoming.length > 0 && (
          <div className="mb-8">
            <p className="mb-2 text-xs uppercase tracking-wider text-amber-500">Demandes reçues</p>
            <div className="space-y-2">
              {incoming.map((f) => {
                const p = profiles[otherOf(f)];
                return (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    {p?.avatar_url ? <Image src={p.avatar_url} alt="" width={36} height={36} className="h-9 w-9 rounded-full border border-zinc-700 object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm">👤</div>}
                    <span className="flex-1 truncate text-sm">{p?.pseudo || "Membre"}</span>
                    <button onClick={() => accept(f.id)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-500">Accepter</button>
                    <button onClick={() => removeLink(f.id)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-orange-400 hover:text-orange-400">Refuser</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Amis ({friends.length})</p>
        {friends.length === 0 ? (
          <p className="text-sm text-zinc-500">Pas encore d&apos;amis. Cherche un pseudo ci-dessus pour commencer.</p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => {
              const p = profiles[otherOf(f)];
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  {p?.avatar_url ? <Image src={p.avatar_url} alt="" width={36} height={36} className="h-9 w-9 rounded-full border border-zinc-700 object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm">👤</div>}
                  <span className="flex-1 truncate text-sm">{p?.pseudo || "Membre"}</span>
                  <button onClick={() => removeLink(f.id)} className="rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400" aria-label="Retirer">✕</button>
                </div>
              );
            })}
          </div>
        )}

        {outgoing.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Demandes envoyées</p>
            <div className="space-y-2">
              {outgoing.map((f) => {
                const p = profiles[otherOf(f)];
                return (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    {p?.avatar_url ? <Image src={p.avatar_url} alt="" width={36} height={36} className="h-9 w-9 rounded-full border border-zinc-700 object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm">👤</div>}
                    <span className="flex-1 truncate text-sm">{p?.pseudo || "Membre"}</span>
                    <span className="text-xs text-zinc-500">En attente</span>
                    <button onClick={() => removeLink(f.id)} className="rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-orange-400" aria-label="Annuler">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
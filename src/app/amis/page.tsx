"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { IconUser, IconX } from "@/components/Icons";

type Profile = { id: string; pseudo: string | null; avatar_url: string | null };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: string };

function Avatar({ url, size = 36 }: { url?: string | null; size?: number }) {
  if (url) return <Image src={url} alt="" width={size} height={size} className="flex-shrink-0 rounded-full border border-zinc-700 object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="flex flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-500" style={{ width: size, height: size }}>
      <IconUser size={size * 0.45} />
    </div>
  );
}

function FriendRow({ profile, right }: { profile?: Profile; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <Avatar url={profile?.avatar_url} size={36} />
      <span className="flex-1 truncate text-sm text-zinc-200">{profile?.pseudo || "Membre"}</span>
      {right}
    </div>
  );
}

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
    const { data } = await supabase.from("profiles").select("id,pseudo,avatar_url").ilike("pseudo", `%${term.trim()}%`).neq("id", userId).limit(10);
    setResults((data ?? []) as Profile[]);
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
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-md">
          <header className="mb-8">
            <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Réseau</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Mes amis</h1>
          </header>
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8">
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Réseau</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Mes amis</h1>
        </header>

        {/* Search */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Trouver un membre</p>
          <div className="flex gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") search(); }}
              placeholder="Pseudo…"
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors"
            />
            <button onClick={search} className="btn-press rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500">
              Chercher
            </button>
          </div>
          {msg && <p className="mt-2 text-sm text-amber-400">{msg}</p>}
          {results.length > 0 && (
            <div className="stagger mt-3 overflow-hidden rounded-xl border border-zinc-800">
              {results.map((r, i) => {
                const rel = relation(r.id);
                return (
                  <div key={r.id} className={`flex items-center gap-3 bg-zinc-900/40 p-3 ${i < results.length - 1 ? "border-b border-zinc-800/60" : ""}`}>
                    <Avatar url={r.avatar_url} size={32} />
                    <span className="flex-1 truncate text-sm text-zinc-200">{r.pseudo || "Sans pseudo"}</span>
                    {rel.state === "none" && <button onClick={() => addFriend(r.id)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200">Ajouter</button>}
                    {rel.state === "sent" && <span className="text-xs text-zinc-600">En attente</span>}
                    {rel.state === "friends" && <span className="text-xs text-amber-400">Ami</span>}
                    {rel.state === "incoming" && rel.row && <button onClick={() => accept(rel.row!.id)} className="btn-press rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-500">Accepter</button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <div className="mb-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-amber-500/80">Demandes reçues</p>
            <div className="stagger overflow-hidden rounded-2xl border border-zinc-800">
              {incoming.map((f, i) => (
                <FriendRow
                  key={f.id}
                  profile={profiles[otherOf(f)]}
                  right={
                    <div className={`flex gap-2 ${i < incoming.length - 1 ? "" : ""}`}>
                      <button onClick={() => accept(f.id)} className="btn-press rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-500">Accepter</button>
                      <button onClick={() => removeLink(f.id)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-orange-400/40 hover:text-orange-400">Refuser</button>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Friends */}
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">Amis ({friends.length})</p>
        {friends.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">Pas encore d&apos;amis. Cherche un pseudo ci-dessus.</p>
        ) : (
          <div className="stagger overflow-hidden rounded-2xl border border-zinc-800">
            {friends.map((f, i) => (
              <div key={f.id} className={`bg-zinc-900/40 ${i < friends.length - 1 ? "border-b border-zinc-800/60" : ""}`}>
                <FriendRow
                  profile={profiles[otherOf(f)]}
                  right={
                    <button onClick={() => removeLink(f.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-orange-400" aria-label="Retirer">
                      <IconX size={13} />
                    </button>
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* Outgoing */}
        {outgoing.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">Demandes envoyées</p>
            <div className="stagger overflow-hidden rounded-2xl border border-zinc-800">
              {outgoing.map((f, i) => (
                <div key={f.id} className={`bg-zinc-900/40 ${i < outgoing.length - 1 ? "border-b border-zinc-800/60" : ""}`}>
                  <FriendRow
                    profile={profiles[otherOf(f)]}
                    right={
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600">En attente</span>
                        <button onClick={() => removeLink(f.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-orange-400" aria-label="Annuler">
                          <IconX size={13} />
                        </button>
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

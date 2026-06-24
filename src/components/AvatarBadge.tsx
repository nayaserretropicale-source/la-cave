"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AvatarBadge() {
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [count, setCount] = useState(0);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setSignedIn(false); setAvatarUrl(null); setCount(0); return; }
    setSignedIn(true);
    const me = user.id;

    const { data: prof } = await supabase.from("profiles").select("avatar_url,notifs_seen_at").eq("id", me).single();
    setAvatarUrl(prof?.avatar_url ?? null);
    const seen = prof?.notifs_seen_at ?? "1970-01-01T00:00:00Z";

    const { data: fr } = await supabase.from("friendships").select("id").eq("addressee_id", me).eq("status", "pending");
    let c = (fr ?? []).length;

    const { data: myPosts } = await supabase.from("posts").select("id").eq("user_id", me);
    const ids = (myPosts ?? []).map((p: { id: string }) => p.id);
    if (ids.length) {
      const { data: lk } = await supabase.from("likes").select("user_id,created_at").in("post_id", ids).gt("created_at", seen);
      const { data: cm } = await supabase.from("comments").select("user_id,created_at").in("post_id", ids).gt("created_at", seen);
      c += (lk ?? []).filter((x: { user_id: string }) => x.user_id !== me).length;
      c += (cm ?? []).filter((x: { user_id: string }) => x.user_id !== me).length;
    }
    setCount(c);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [pathname]);

  if (!signedIn) return null;

  return (
    <div className="fixed right-6 z-50 flex items-center gap-3" style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
      <Link href="/notifs" aria-label="Notifications" className="relative">
        <span className="text-2xl">🔔</span>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-zinc-950">{count}</span>
        )}
      </Link>
      {pathname !== "/profil" && (
        <Link href="/profil" aria-label="Mon profil">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="profil" width={40} height={40} className="h-10 w-10 rounded-full border border-amber-500/70 object-cover shadow-lg shadow-black/40" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm shadow-lg shadow-black/40">👤</div>
          )}
        </Link>
      )}
    </div>
  );
}
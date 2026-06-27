"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { IconBell, IconUser } from "./Icons";

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
    <div className="fixed right-4 z-50 flex items-center gap-2" style={{ top: "calc(env(safe-area-inset-top, 0px) + 14px)" }}>
      <Link href="/notifs" aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-zinc-100">
        <IconBell size={20} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-zinc-950">
            {count}
          </span>
        )}
      </Link>
      {pathname !== "/profil" && (
        <Link href="/profil" aria-label="Mon profil" className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-500">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="profil" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <IconUser size={18} className="text-zinc-400" />
          )}
        </Link>
      )}
    </div>
  );
}

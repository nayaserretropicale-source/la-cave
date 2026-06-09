"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AvatarBadge() {
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setSignedIn(false); setAvatarUrl(null); return; }
    setSignedIn(true);
    const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
    setAvatarUrl(data?.avatar_url ?? null);
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [pathname]);

  if (!signedIn || pathname === "/profil") return null;

  return (
    <Link href="/profil" aria-label="Mon profil" className="fixed right-6 z-50" style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="profil" className="h-10 w-10 rounded-full border border-amber-500/70 object-cover shadow-lg shadow-black/40" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm shadow-lg shadow-black/40">👤</div>
      )}
    </Link>
  );
}
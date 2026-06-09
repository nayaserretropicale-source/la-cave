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
    <Link href="/profil" className="fixed top-3 right-3 z-50" aria-label="Mon profil">
      {avatarUrl ? (
        <img src={avatarUrl} alt="profil" className="h-9 w-9 rounded-full border border-amber-500 object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm">👤</div>
      )}
    </Link>
  );
}
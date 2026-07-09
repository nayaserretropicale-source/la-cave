"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthBar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setMsg(error.message); return; }
    setMsg(data.session ? "Compte créé, tu es connecté." : "Compte créé — confirme ton email pour te connecter.");
  }
  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMsg(error ? error.message : "");
  }
  async function signOut() {
    await supabase.auth.signOut();
  }

  if (user) {
    return (
      <div data-reveal className="mb-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm">
        <span className="text-zinc-400">
          <span className="text-amber-400">{user}</span>
        </span>
        <button onClick={signOut} className="btn-press text-xs text-zinc-500 transition-colors hover:text-zinc-300">
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <div data-reveal className="mb-6 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        type="password"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
      />
      <div className="flex gap-2 pt-1">
        <button
          onClick={signIn}
          className="btn-3d flex-1 px-3 py-2.5 text-sm"
        >
          Se connecter
        </button>
        <button
          onClick={signUp}
          className="btn-press flex-1 rounded-lg border border-zinc-700 px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600"
        >
          Créer un compte
        </button>
      </div>
      {msg && <p className="text-xs text-zinc-400">{msg}</p>}
    </div>
  );
}

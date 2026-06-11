"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Vitoles courantes et leurs tailles",
  "Quelle vitole pour ~30 min de fume ?",
  "Différence entre Robusto et Toro",
  "Trouve-moi de bons plans sur un Cohiba",
];

export default function Caviste() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || thinking) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setPending(q);
      setShowLogin(true);
      return;
    }

    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/expert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: next }),
      });
      if (res.status === 401) {
        setPending(q);
        setShowLogin(true);
        setMessages(messages);
        return;
      }
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "…" }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Désolé, une erreur est survenue." }]);
    } finally {
      setThinking(false);
    }
  }

  async function login() {
    if (loggingIn) return;
    setLoggingIn(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoggingIn(false);
    if (error) {
      setLoginError("Email ou mot de passe incorrect.");
      return;
    }
    setShowLogin(false);
    setEmail("");
    setPassword("");
    if (pending) {
      const q = pending;
      setPending(null);
      send(q);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-amber-500">← Ma cave</Link>
        <h1 className="text-3xl font-semibold mt-2 mb-6">Le caviste 🥃</h1>

        {messages.length === 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-amber-500 hover:text-amber-500">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 mb-4 min-h-[120px]">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-zinc-800 px-4 py-2.5 text-sm" : "mr-auto max-w-[85%] rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 whitespace-pre-wrap"}>
              {m.content}
            </div>
          ))}
          {thinking && <p className="animate-pulse text-sm text-amber-500">Le caviste cherche…</p>}
        </div>

        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Pose ta question…" className="flex-1 rounded-lg bg-zinc-800 px-3 py-2.5 text-sm outline-none" />
          <button onClick={() => send()} disabled={thinking} className="rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500 disabled:opacity-50">Envoyer</button>
        </div>
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setShowLogin(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Connexion 🔒</h2>
            <p className="mt-1 text-sm text-zinc-400">Connecte-toi pour parler au caviste — ta question sera envoyée juste après.</p>

            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className="mt-4 w-full rounded-lg bg-zinc-800 px-3 py-2.5 text-sm outline-none" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") login(); }} placeholder="Mot de passe" autoComplete="current-password" className="mt-2 w-full rounded-lg bg-zinc-800 px-3 py-2.5 text-sm outline-none" />

            {loginError && <p className="mt-2 text-sm text-red-400">{loginError}</p>}

            <button onClick={login} disabled={loggingIn} className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500 disabled:opacity-50">
              {loggingIn ? "Connexion…" : "Se connecter"}
            </button>
            <button onClick={() => setShowLogin(false)} className="mt-2 w-full rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-500">
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
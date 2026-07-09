"use client";

import { useState, useRef, useEffect } from "react";
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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8" data-reveal>
          <p className="text-[11px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Expert</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">Le Caviste</h1>
        </header>

        {messages.length === 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 min-h-[120px] space-y-3" aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-800 px-4 py-3 text-sm text-zinc-100"
                  : "rise mr-auto max-w-[85%] rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed"
              }
            >
              {m.content}
            </div>
          ))}
          {thinking && (
            <div className="mr-auto max-w-[85%] space-y-2 rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <div className="skeleton h-3 w-40" />
              <div className="skeleton h-3 w-24" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Pose ta question…"
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={thinking}
            className="btn-3d px-4 py-2.5 text-sm disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </div>

      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setShowLogin(false)}
        >
          <div
            className="glass w-full max-w-sm rounded-2xl border border-zinc-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">Connexion requise</h2>
            <p className="mt-1 text-sm text-zinc-400">Ta question sera envoyée juste après la connexion.</p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="mt-5 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") login(); }}
              placeholder="Mot de passe"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-700 transition-colors"
            />

            {loginError && <p className="mt-2 text-sm text-red-400">{loginError}</p>}

            <button
              onClick={login}
              disabled={loggingIn}
              className="btn-3d mt-4 w-full px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {loggingIn ? "Connexion…" : "Se connecter"}
            </button>
            <button
              onClick={() => setShowLogin(false)}
              className="mt-2 w-full rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

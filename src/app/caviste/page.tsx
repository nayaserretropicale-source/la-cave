"use client";

import { useState } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };

export default function Caviste() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q || thinking) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "…" }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Désolé, une erreur est survenue." }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-amber-500">← Ma cave</Link>
        <h1 className="text-3xl font-semibold mt-2 mb-6">Le caviste 🥃</h1>

        <div className="space-y-3 mb-4 min-h-[120px]">
          {messages.length === 0 && (
            <p className="text-zinc-500 italic text-sm">
              « Quel cigare pour débuter ? », « un accord avec un rhum vieux ? », « comment conserver sans cave ? »…
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-zinc-800 px-4 py-2.5 text-sm"
                  : "mr-auto max-w-[85%] rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200"
              }
            >
              {m.content}
            </div>
          ))}
          {thinking && <p className="animate-pulse text-sm text-amber-500">Le caviste réfléchit…</p>}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Pose ta question…"
            className="flex-1 rounded-lg bg-zinc-800 px-3 py-2.5 text-sm outline-none"
          />
          <button onClick={send} disabled={thinking} className="rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-500 disabled:opacity-50">
            Envoyer
          </button>
        </div>
      </div>
    </main>
  );
}
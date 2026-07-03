import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import MemoryClient from "mem0ai";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/api-guard";

function authedClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const mem0 = process.env.MEM0_API_KEY
  ? new MemoryClient({ apiKey: process.env.MEM0_API_KEY })
  : null;

const SYSTEM = `Tu es un caviste-tabac francophone avec 30 ans de métier (dégustateur passionné de cigares). Réponses précises, concrètes et concises (4 à 6 phrases max), ton chaleureux et accessible. Tu conseilles sur les formats, capes, accords boissons, conservation et dégustation, et le choix selon le goût. Tu n'encourages pas à fumer ; tu informes celui qui fume déjà.`;

const MAX_MESSAGES = 12;
const MAX_CHARS = 2000;

type IncomingMsg = { role: "user" | "assistant"; content: string };

function sanitize(messages: unknown): IncomingMsg[] | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const clean: IncomingMsg[] = [];
  for (const m of messages.slice(-MAX_MESSAGES)) {
    if (
      !m ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length === 0
    ) {
      return null;
    }
    clean.push({ role: m.role, content: m.content.slice(0, MAX_CHARS) });
  }
  if (clean[clean.length - 1].role !== "user") return null;
  return clean;
}

export async function POST(req: Request) {
  const { user, error } = await requireUser(req);
  if (error) return error;

  try {
    const body = await req.json();
    const messages = sanitize(body?.messages);
    if (!messages) {
      return NextResponse.json({ error: "requête invalide" }, { status: 400 });
    }

    // Grounding : le caviste connaît la vraie cave de l'utilisateur
    let system = SYSTEM;
    const token = req.headers.get("authorization")!.slice(7);
    const { data: rows } = await authedClient(token)
      .from("cave")
      .select("nom,marque,origine,force,duree_fume,accord,rating,quantite,statut")
      .limit(100);
    const dispo = (rows ?? []).filter((c) => c.statut !== "fume" && (c.quantite ?? 1) > 0);
    if (dispo.length) {
      system +=
        `\n\nCave réelle de l'utilisateur (${dispo.length} cigares disponibles) :\n` +
        dispo
          .map((c) => `- ${c.nom}${c.marque ? ` (${c.marque})` : ""}${c.origine ? `, ${c.origine}` : ""}${c.force ? `, force ${c.force}` : ""}${c.duree_fume ? `, ${c.duree_fume}` : ""}${c.rating ? `, noté ${c.rating}/5` : ""}`)
          .join("\n") +
        `\nQuand tu recommandes un cigare à fumer maintenant, privilégie ceux de cette liste et cite-les par leur nom exact. Ne propose un cigare hors cave que si l'utilisateur demande explicitement une découverte ou un achat.`;
    }
    if (mem0 && user) {
      // La mémoire est un bonus : si mem0 est indisponible, le chat ne doit pas tomber en 500.
      try {
        const lastMsg = messages[messages.length - 1];
        const { results } = await mem0.search(lastMsg.content, { filters: { user_id: user.id } }) as { results: { memory: string }[] };
        if (results?.length) {
          system += "\n\nCe que tu sais déjà de cet amateur :\n" + results.map((r) => `- ${r.memory}`).join("\n");
        }
      } catch { /* mémoire indisponible : on continue sans */ }
    }

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system,
      messages,
    });
    const reply = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Sauvegarder l'échange dans mem0
    if (mem0 && user && reply) {
      const lastMsg = messages[messages.length - 1];
      await mem0.add(
        [{ role: "user", content: lastMsg.content }, { role: "assistant", content: reply }],
        { userId: user.id }
      ).catch(() => {});
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "réponse impossible" }, { status: 500 });
  }
}
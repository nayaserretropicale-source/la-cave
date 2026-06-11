import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/api-guard";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  const { error } = await requireUser(req);
  if (error) return error;

  try {
    const body = await req.json();
    const messages = sanitize(body?.messages);
    if (!messages) {
      return NextResponse.json({ error: "requête invalide" }, { status: 400 });
    }

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: SYSTEM,
      messages,
    });
    const reply = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "réponse impossible" }, { status: 500 });
  }
}
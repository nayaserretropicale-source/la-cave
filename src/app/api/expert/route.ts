import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Tu es un caviste-tabac francophone avec 30 ans de métier (dégustateur passionné de cigares). Réponses précises, concrètes et concises (4 à 6 phrases max), ton chaleureux et accessible. Tu conseilles sur les formats, capes, accords boissons, conservation et dégustation, et le choix selon le goût. Tu n'encourages pas à fumer ; tu informes celui qui fume déjà.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
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
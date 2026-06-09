import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Tu es un caviste-tabac francophone avec 30 ans de métier (dégustateur passionné de cigares). Réponses précises, concrètes et concises, ton chaleureux et accessible. Tu conseilles sur les vitoles, formats, capes, accords, conservation, dégustation et le choix selon le goût.
Pour toute question sur des PRIX, PROMOS, DISPONIBILITÉS ou BONS PLANS actuels, utilise la recherche web pour donner des infos réelles et à jour, et cite le marchand/la source. N'invente JAMAIS de prix : si tu n'es pas sûr, dis-le. Rappelle que prix et promos varient selon le pays.
Tu n'encourages pas à fumer ; tu informes celui qui fume déjà. Réponds toujours en français.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages,
    });
    const reply = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "réponse impossible" }, { status: 500 });
  }
}
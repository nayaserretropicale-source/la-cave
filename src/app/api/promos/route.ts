import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-static";
export const revalidate = 21600; // cache 6h : 4 exécutions/jour max

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `Recherche sur le web des bons plans et promotions cigares actuels (ventes, soldes, codes promo) chez les principaux marchands internationaux. Puis réponds UNIQUEMENT par un tableau JSON valide, sans backticks ni texte autour, au format :
[{"retailer":"nom du marchand","title":"intitulé court du bon plan en français","url":"lien réel issu de ta recherche"}]
8 entrées maximum. N'utilise que des URLs réelles trouvées dans ta recherche ; en cas de doute sur une URL, mets la page d'accueil du marchand.`,
        },
      ],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    const json = start >= 0 && end >= 0 ? clean.slice(start, end + 1) : "[]";
    return NextResponse.json({ deals: JSON.parse(json) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ deals: [] });
  }
}
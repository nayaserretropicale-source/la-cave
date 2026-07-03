import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/api-guard";
import { cached } from "@/lib/simple-cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const TTL_MS = 24 * 60 * 60 * 1000; // l'histoire d'une marque ne change pas d'un utilisateur à l'autre

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, 120) : "";
}

export async function POST(req: Request) {
  const { error } = await requireUser(req);
  if (error) return error;

  try {
    const body = await req.json();
    const marque = clean(body?.marque);
    const nom = clean(body?.nom);
    const sujet = marque || nom;
    if (!sujet) {
      return Response.json({ histoire: "", error: "marque ou nom requis" }, { status: 400 });
    }
    const key = `histoire:${sujet.toLowerCase()}:${nom.toLowerCase()}`;

    const text = await cached(key, TTL_MS, async () => {
      const prompt = `Tu es un expert du cigare. En français, en 4 à 6 phrases, raconte l'histoire de la marque "${sujet}"${nom ? ` et, si tu la connais, le contexte de création de la vitole "${nom}"` : ""}. Vérifie les faits clés (fondation, fondateur, origine) par une recherche web si tu as un doute. Reste factuel et nuancé : si tu n'es pas certain d'un détail (dates, chiffres précis), reste général plutôt que d'inventer. Pas de conseils d'achat. Réponds uniquement par le texte final, sans titre ni citation de sources.`;
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        // Ancre les dates/fondateurs sur des sources réelles — terrain classique d'hallucination
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: prompt }],
      });
      return msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    });

    return Response.json({ histoire: text });
  } catch (e) {
    console.error(e);
    return Response.json({ histoire: "", error: "erreur" }, { status: 500 });
  }
}

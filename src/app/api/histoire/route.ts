import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/api-guard";
import { cached } from "@/lib/simple-cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const TTL_MS = 24 * 60 * 60 * 1000; // l'histoire d'une marque ne change pas d'un utilisateur à l'autre

export async function POST(req: Request) {
  const { error } = await requireUser(req);
  if (error) return error;

  try {
    const { marque, nom } = await req.json();
    const key = `histoire:${String(marque || nom).trim().toLowerCase()}:${String(nom).trim().toLowerCase()}`;

    const text = await cached(key, TTL_MS, async () => {
      const prompt = `Tu es un expert du cigare. En français, en 4 à 6 phrases, raconte l'histoire de la marque "${marque || nom}" et, si tu la connais, le contexte de création de la vitole "${nom}". Reste factuel et nuancé : si tu n'es pas certain d'un détail (dates, chiffres précis), reste général plutôt que d'inventer. Pas de conseils d'achat. Réponds uniquement par le texte, sans titre.`;
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
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
    const message = e instanceof Error ? e.message : "erreur";
    return Response.json({ histoire: "", error: message });
  }
}
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/api-guard";
import { cached } from "@/lib/simple-cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const TTL_MS = 24 * 60 * 60 * 1000; // les boutiques d'une ville ne changent pas d'un utilisateur à l'autre

type Boutique = { nom: string; ville: string; note: string };

export async function POST(req: Request) {
  const { error } = await requireUser(req);
  if (error) return error;

  try {
    const body = await req.json();
    // Bornes anti prompt-injection / pollution du cache : entrées courtes, texte simple
    const pays = String(body?.pays || "").trim().slice(0, 60);
    const ville = String(body?.ville || "").trim().slice(0, 60);
    if (!pays) return Response.json({ boutiques: [] });
    const lieu = ville ? `${ville}, ${pays}` : pays;
    const key = `boutiques:${pays.toLowerCase()}:${ville.toLowerCase()}`;

    const boutiques = await cached(key, TTL_MS, async () => {
      const prompt = `Recherche des boutiques, civettes ou points de vente de cigares à ${lieu}. Donne uniquement celles que tu peux raisonnablement identifier via des sources. Pour chacune : nom, ville, et une courte note (quartier, type d'enseigne). N'invente jamais d'adresse précise. Si tu ne trouves rien de fiable, renvoie une liste vide.

Réponds UNIQUEMENT par un tableau JSON valide, sans texte ni backticks, schéma exact : [{"nom":"...","ville":"...","note":"..."}]. Maximum 8 entrées.`;
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
        messages: [{ role: "user", content: prompt }],
      });
      const raw = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      let result: Boutique[] = [];
      if (start !== -1 && end !== -1) {
        try {
          const arr = JSON.parse(raw.slice(start, end + 1));
          if (Array.isArray(arr)) {
            result = arr
              .map((b: Partial<Boutique>) => ({ nom: b.nom || "", ville: b.ville || "", note: b.note || "" }))
              .filter((b: Boutique) => b.nom);
          }
        } catch {}
      }
      return result;
    });

    return Response.json({ boutiques });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erreur";
    return Response.json({ boutiques: [], error: message });
  }
}
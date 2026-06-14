import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { pays, ville } = await req.json();
    if (!pays) return Response.json({ boutiques: [] });
    const lieu = ville ? `${ville}, ${pays}` : pays;
    const prompt = `Recherche des boutiques, civettes ou points de vente de cigares à ${lieu}. Donne uniquement celles que tu peux raisonnablement identifier via des sources. Pour chacune : nom, ville, et une courte note (quartier, type d'enseigne). N'invente jamais d'adresse précise. Si tu ne trouves rien de fiable, renvoie une liste vide.

Réponds UNIQUEMENT par un tableau JSON valide, sans texte ni backticks, schéma exact : [{"nom":"...","ville":"...","note":"..."}]. Maximum 8 entrées.`;
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 } as any],
      messages: [{ role: "user", content: prompt }],
    });
    const raw = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    let boutiques: any[] = [];
    if (start !== -1 && end !== -1) {
      try {
        const arr = JSON.parse(raw.slice(start, end + 1));
        if (Array.isArray(arr)) {
          boutiques = arr
            .map((b: any) => ({ nom: b.nom || "", ville: b.ville || "", note: b.note || "" }))
            .filter((b: any) => b.nom);
        }
      } catch {}
    }
    return Response.json({ boutiques });
  } catch (e: any) {
    return Response.json({ boutiques: [], error: e?.message || "erreur" });
  }
}
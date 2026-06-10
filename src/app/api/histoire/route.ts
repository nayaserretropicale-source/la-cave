import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { marque, nom } = await req.json();
    const prompt = `Tu es un expert du cigare. En français, en 4 à 6 phrases, raconte l'histoire de la marque "${marque || nom}" et, si tu la connais, le contexte de création de la vitole "${nom}". Reste factuel et nuancé : si tu n'es pas certain d'un détail (dates, chiffres précis), reste général plutôt que d'inventer. Pas de conseils d'achat. Réponds uniquement par le texte, sans titre.`;
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    return Response.json({ histoire: text });
  } catch (e: any) {
    return Response.json({ histoire: "", error: e?.message || "erreur" });
  }
}
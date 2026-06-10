import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const INSTRUCTION = `Tu es un expert du cigare. Identifie le cigare sur la photo (sers-toi surtout de la bague). Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans backticks, avec ce schéma exact :
{
  "identifie": true,
  "nom": "nom complet du cigare",
  "marque": "marque",
  "origine": "pays d'origine",
  "format": "format / vitole",
  "cape": "type de cape",
  "force": "légère | moyenne | corsée",
  "profil": ["arômes dominants"],
  "prix_indicatif": "fourchette de prix indicative",
  "duree_fume": "durée approximative",
  "accord": "accord boisson conseillé",
  "conservation": "conseil de conservation",
  "degustation": "courte note de dégustation générale",
  "evolution": {
    "premier_tiers": "ce qu'on perçoit au 1er tiers",
    "deuxieme_tiers": "au 2e tiers",
    "troisieme_tiers": "au 3e tiers"
  },
  "confiance": "élevée | moyenne | faible"
}
Si tu ne parviens pas à identifier le cigare, renvoie {"identifie": false, "commentaire": "explication courte en français"}. Tout le texte en français. N'invente pas de certitudes : si un champ est incertain, reste général.`;

export async function POST(req: Request) {
  try {
    const { imageBase64, mediaType } = await req.json();
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
            { type: "text", text: INSTRUCTION },
          ],
        },
      ],
    });
    const raw = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    let fiche: any = { identifie: false, commentaire: "Lecture impossible, réessaie." };
    if (start !== -1 && end !== -1) {
      try { fiche = JSON.parse(raw.slice(start, end + 1)); } catch {}
    }
    return Response.json(fiche);
  } catch (e: any) {
    return Response.json({ identifie: false, commentaire: "Erreur d'analyse : " + (e?.message || "") }, { status: 200 });
  }
}
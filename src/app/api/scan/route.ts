import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

// ~8 Mo de base64 ≈ 6 Mo décodés — au-delà, l'analyse coûte cher pour rien
const MAX_B64_LENGTH = 8_000_000;
const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"] as const);
type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const INSTRUCTION = `Tu es un expert du cigare. Identifie le cigare sur la photo (sers-toi surtout de la bague). Tout le texte en français. N'invente pas de certitudes : si un champ est incertain, reste général et baisse "confiance". Si la bague n'est pas lisible, "confiance" doit être "faible". Si tu ne parviens pas à identifier le cigare, mets "identifie" à false avec un "commentaire" court, et null partout ailleurs.`;

const nullableString = { type: ["string", "null"] };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "identifie", "commentaire", "nom", "marque", "origine", "format", "cape", "force",
    "profil", "prix_indicatif", "duree_fume", "accord", "conservation", "degustation",
    "evolution", "confiance",
  ],
  properties: {
    identifie: { type: "boolean" },
    commentaire: nullableString,
    nom: nullableString,
    marque: nullableString,
    origine: nullableString,
    format: nullableString,
    cape: nullableString,
    force: { type: ["string", "null"], enum: ["légère", "moyenne", "corsée", null] },
    profil: { type: ["array", "null"], items: { type: "string" } },
    prix_indicatif: nullableString,
    duree_fume: nullableString,
    accord: nullableString,
    conservation: nullableString,
    degustation: nullableString,
    evolution: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["premier_tiers", "deuxieme_tiers", "troisieme_tiers"],
      properties: {
        premier_tiers: nullableString,
        deuxieme_tiers: nullableString,
        troisieme_tiers: nullableString,
      },
    },
    confiance: { type: ["string", "null"], enum: ["élevée", "moyenne", "faible", null] },
  },
};

export async function POST(req: Request) {
  const { error } = await requireUser(req);
  if (error) return error;

  try {
    const { imageBase64, mediaType } = await req.json();

    if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
      return Response.json({ identifie: false, commentaire: "Image manquante." }, { status: 400 });
    }
    if (imageBase64.length > MAX_B64_LENGTH) {
      return Response.json({ identifie: false, commentaire: "Image trop lourde (6 Mo max)." }, { status: 413 });
    }
    const type: MediaType = MEDIA_TYPES.has(mediaType) ? mediaType : "image/jpeg";

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: type, data: imageBase64 } },
            { type: "text", text: INSTRUCTION },
          ],
        },
      ],
    });
    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return Response.json(JSON.parse(raw));
  } catch (e) {
    console.error(e);
    return Response.json({ identifie: false, commentaire: "Erreur d'analyse, réessaie." }, { status: 500 });
  }
}

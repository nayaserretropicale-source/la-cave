import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INSTRUCTION = `Tu es un caviste-tabac et torcedor avec 30 ans d'expérience. À partir de la photo (lis surtout la bague), identifie le cigare.
Réponds UNIQUEMENT par un JSON valide, sans backticks ni texte autour, schéma exact :
{"identifie":true,"nom":"","marque":"","origine":"","format":"","cape":"","force":"léger|moyen|corsé","profil":["",""],"prix_indicatif":"","degustation":"conseil court","confiance":"haute|moyenne|faible","commentaire":""}
Si la bague est illisible ou le cigare non identifiable, mets identifie à false et explique dans commentaire ce qu'il faudrait (meilleur angle, lumière, bague visible). Prix indicatif à l'unité en euros approximatifs. Sois honnête sur la confiance.`;

export async function POST(req: Request) {
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "image manquante" }, { status: 400 });
    }

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: (mediaType as "image/jpeg" | "image/png" | "image/webp") || "image/jpeg",
                data: imageBase64,
              },
            },
            { type: "text", text: INSTRUCTION },
          ],
        },
      ],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();

    try {
      return NextResponse.json(JSON.parse(clean));
    } catch {
      return NextResponse.json({ identifie: false, commentaire: "Réponse illisible, réessaie avec une photo plus nette." });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "analyse impossible" }, { status: 500 });
  }
}
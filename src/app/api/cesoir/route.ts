import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

type CigareInput = {
  id: string;
  nom: string;
  marque: string | null;
  origine: string | null;
  force: string | null;
  format: string | null;
  profil: string[] | null;
  duree_fume: string | null;
  accord: string | null;
  note_perso: string | null;
  rating: number | null;
};

type Recommandation = {
  choix_id: string;
  pourquoi: string;
  alternative_id: string | null;
  alternative_pourquoi: string | null;
  conseil: string | null;
};

export async function POST(req: Request) {
  const { error } = await requireUser(req);
  if (error) return error;

  try {
    const { criteres, cigares } = await req.json();
    if (!Array.isArray(cigares) || cigares.length === 0) {
      return Response.json({ error: "cave_vide" });
    }

    const liste: CigareInput[] = cigares.map((c: CigareInput) => ({
      id: c.id,
      nom: c.nom,
      marque: c.marque,
      origine: c.origine,
      force: c.force,
      format: c.format,
      profil: c.profil,
      duree_fume: c.duree_fume,
      accord: c.accord,
      note_perso: c.note_perso,
      rating: c.rating,
    }));

    const prompt = `Tu es un caviste expert. Voici la cave de l'utilisateur (cigares réellement disponibles), en JSON :
${JSON.stringify(liste)}

Critères pour ce soir :
- Temps disponible : ${criteres?.temps || "peu importe"}
- Occasion : ${criteres?.occasion || "non précisée"}
- Accord/boisson : ${criteres?.accord || "non précisé"}
- Force souhaitée : ${criteres?.force || "peu importe"}
- Envie particulière : ${criteres?.notes || "aucune"}

Choisis LE cigare le plus adapté UNIQUEMENT parmi ceux de la liste (via leur "id"). Tiens compte de la force, de la durée de fume face au temps dispo, du profil et de l'accord. Si pertinent, propose une alternative de la liste.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour ni backticks, schéma exact :
{
  "choix_id": "id du cigare choisi (obligatoirement un id de la liste)",
  "pourquoi": "2 à 3 phrases en français, concrètes, qui justifient le choix",
  "alternative_id": "id d'un autre cigare de la liste, ou null",
  "alternative_pourquoi": "1 phrase, ou null",
  "conseil": "1 phrase de conseil (accord, moment, tirage), ou null"
}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    let out: Recommandation | { error: string } = { error: "parse" };
    if (start !== -1 && end !== -1) {
      try { out = JSON.parse(raw.slice(start, end + 1)); } catch {}
    }
    return Response.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "erreur";
    return Response.json({ error: message });
  }
}
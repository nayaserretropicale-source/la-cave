import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

function authedClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

type Cigare = {
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
  quantite: number | null;
  statut: string | null;
};

export async function POST(req: Request) {
  const { error } = await requireUser(req);
  if (error) return error;

  try {
    const { criteres } = await req.json();
    // Bornes anti prompt-injection / coût : entrées client tronquées
    const s = (v: unknown, max = 60) => String(v ?? "").slice(0, max);

    // La cave est relue côté serveur — jamais depuis le corps de la requête
    // (le client pouvait envoyer une liste falsifiée).
    const token = req.headers.get("authorization")!.slice(7);
    const { data: rows } = await authedClient(token)
      .from("cave")
      .select("id,nom,marque,origine,force,format,profil,duree_fume,accord,note_perso,rating,quantite,statut")
      // ordre déterministe avant le cap 50 : sous-ensemble de candidats stable
      .order("created_at", { ascending: false });

    const liste = ((rows ?? []) as Cigare[])
      .filter((c) => c.statut !== "fume" && (c.quantite ?? 1) > 0)
      // ponytail: cap à 50 candidats pour borner le prompt — pré-filtrage par critères si les caves grossissent
      .slice(0, 50)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ quantite, statut, ...c }) => c);

    if (liste.length === 0) {
      return Response.json({ error: "cave_vide" }, { status: 400 });
    }

    const ids = liste.map((c) => c.id);

    const prompt = `Tu es un caviste expert. Voici la cave de l'utilisateur (cigares réellement disponibles), en JSON :
${JSON.stringify(liste)}

Critères pour ce soir :
- Temps disponible : ${s(criteres?.temps) || "peu importe"}
- Occasion : ${s(criteres?.occasion) || "non précisée"}
- Accord/boisson : ${s(criteres?.accord) || "non précisé"}
- Force souhaitée : ${s(criteres?.force) || "peu importe"}
- Envie particulière : ${s(criteres?.notes, 300) || "aucune"}

Choisis LE cigare le plus adapté parmi ceux de la liste. Tiens compte de la force, de la durée de fume face au temps dispo, du profil et de l'accord. Si pertinent, propose une alternative de la liste.
"pourquoi" : 2 à 3 phrases en français, concrètes. "alternative_pourquoi" : 1 phrase ou null. "conseil" : 1 phrase (accord, moment, tirage) ou null.`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      // Le schéma contraint choix_id/alternative_id aux ids réels de la cave :
      // l'IA ne peut structurellement pas inventer un cigare.
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["choix_id", "pourquoi", "alternative_id", "alternative_pourquoi", "conseil"],
            properties: {
              choix_id: { type: "string", enum: ids },
              pourquoi: { type: "string" },
              alternative_id: { type: ["string", "null"], enum: [...ids, null] },
              alternative_pourquoi: { type: ["string", "null"] },
              conseil: { type: ["string", "null"] },
            },
          },
        },
      },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return Response.json(JSON.parse(raw));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "suggestion_impossible" }, { status: 500 });
  }
}

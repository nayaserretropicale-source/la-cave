import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const parser = new Parser();

export const revalidate = 10800; // 3h de cache
export const maxDuration = 60;

const FEEDS = [
  { url: "https://halfwheel.com/feed/", source: "halfwheel" },
  { url: "https://www.cigarjournal.com/feed/", source: "Cigar Journal" },
  { url: "https://www.cigar-coop.com/feed/", source: "Cigar Coop" },
];

function clean(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export async function GET() {
  try {
    // 1) Récupère les flux — un flux mort ne casse pas les autres
    const all: any[] = [];
    for (const f of FEEDS) {
      try {
        const feed = await parser.parseURL(f.url);
        (feed.items || []).forEach((it: any) => {
          all.push({
            title: (it.title || "").trim(),
            snippet: clean(it.contentSnippet || it.content || ""),
            url: it.link || "",
            source: f.source,
            date: it.isoDate || it.pubDate || null,
          });
        });
      } catch {
        // flux indisponible : on ignore
      }
    }

    if (all.length === 0) return Response.json({ articles: [] });

    // 2) Tri par date décroissante, top 15
    all.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
    const top = all.slice(0, 15);

    // 3) Traduction FR en un seul appel, avec repli si échec
    let translated = top;
    try {
      const payload = top.map((a, i) => ({ i, title: a.title, snippet: a.snippet }));
      const prompt = `Traduis en français naturel les titres et extraits de presse ci-dessous (JSON). Garde le sens, n'invente rien, ne traduis pas les noms propres de marques/cigares. Réponds UNIQUEMENT par un tableau JSON valide, sans texte ni backticks, même longueur et même ordre, schéma : [{"i":0,"title":"...","snippet":"..."}].\n\n${JSON.stringify(payload)}`;
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        const arr = JSON.parse(raw.slice(start, end + 1));
        if (Array.isArray(arr) && arr.length === top.length) {
          translated = top.map((a, idx) => {
            const t = arr.find((x: any) => x.i === idx) || arr[idx] || {};
            return { ...a, title: t.title || a.title, snippet: t.snippet || a.snippet };
          });
        }
      }
    } catch {
      // traduction indisponible : on garde l'original (jamais vide)
      translated = top;
    }

    return Response.json({ articles: translated });
  } catch {
    // Dernier filet : ne jamais planter le build ni la page
    return Response.json({ articles: [] });
  }
}
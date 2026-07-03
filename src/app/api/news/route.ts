import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const parser = new Parser({
  timeout: 9000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
  },
});

export const revalidate = 1800; // 30 min de cache
export const maxDuration = 60;

const FEEDS = [
  { url: "https://halfwheel.com/feed/", source: "halfwheel" },
  { url: "https://www.cigarjournal.com/feed/", source: "Cigar Journal" },
  { url: "https://www.cigar-coop.com/feed/", source: "Cigar Coop" },
];

type DiagEntry = { source: string; items?: number; error?: string };
type Article = { title: string; snippet: string; url: string; source: string; date: string | null };
type TranslatedEntry = { i: number; title?: string; snippet?: string };

function clean(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export async function GET() {
  const diag: DiagEntry[] = [];
  try {
    const all: Article[] = [];
    for (const f of FEEDS) {
      try {
        const feed = await parser.parseURL(f.url);
        const items = feed.items || [];
        diag.push({ source: f.source, items: items.length });
        items.forEach((it) => {
          all.push({
            title: (it.title || "").trim(),
            snippet: clean(it.contentSnippet || it.content || ""),
            url: it.link || "",
            source: f.source,
            date: it.isoDate || it.pubDate || null,
          });
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "echec";
        diag.push({ source: f.source, error: message });
      }
    }

    const debug = process.env.NODE_ENV !== "production";
    if (all.length === 0) return Response.json({ articles: [], ...(debug && { _diag: diag }) });

    all.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
    const top = all.slice(0, 15);

    let translated = top;
    try {
      const payload = top.map((a, i) => ({ i, title: a.title, snippet: a.snippet }));
      const prompt = `Traduis en français naturel les titres et extraits de presse ci-dessous (JSON). Garde le sens, n'invente rien, ne traduis pas les noms propres de marques/cigares. Réponds UNIQUEMENT par un tableau JSON valide, sans texte ni backticks, même longueur et même ordre, schéma : [{"i":0,"title":"...","snippet":"..."}].\n\n${JSON.stringify(payload)}`;
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        const arr: TranslatedEntry[] = JSON.parse(raw.slice(start, end + 1));
        if (Array.isArray(arr) && arr.length === top.length) {
          translated = top.map((a, idx) => {
            const t = arr.find((x) => x.i === idx) || arr[idx] || {};
            return { ...a, title: t.title || a.title, snippet: t.snippet || a.snippet };
          });
        }
      }
    } catch {
      translated = top; // traduction indisponible : on garde l'original
    }

    return Response.json({ articles: translated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erreur";
    return Response.json({ articles: [], ...(process.env.NODE_ENV !== "production" && { _diag: diag, _error: message }) });
  }
}
import { NextResponse } from "next/server";
import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FEEDS = [
  { url: "https://halfwheel.com/feed/", source: "halfwheel" },
  { url: "https://www.cigarjournal.com/feed/", source: "Cigar Journal" },
  { url: "https://www.cigar-coop.com/feed/", source: "Cigar Coop" },
];

const parser = new Parser({ headers: { "User-Agent": "Mozilla/5.0" } });

type Item = { title: string; link: string; source: string; date: string; snippet: string };

export async function GET() {
  const all: Item[] = [];

  await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const feed = await parser.parseURL(f.url);
        for (const item of feed.items.slice(0, 8)) {
          all.push({
            title: item.title ?? "Sans titre",
            link: item.link ?? "#",
            source: f.source,
            date: item.isoDate ?? item.pubDate ?? "",
            snippet: (item.contentSnippet ?? "").slice(0, 160),
          });
        }
      } catch {
        // flux indisponible : on l'ignore
      }
    })
  );

  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const items = all.slice(0, 25);

  // Traduction en français (un seul appel, modèle rapide et économique)
  try {
    const payload = items.map((a, i) => ({ i, title: a.title, snippet: a.snippet }));
    const tr = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      system:
        'Tu traduis en français des titres et extraits d\'actualité sur les cigares. Réponds UNIQUEMENT par un tableau JSON valide (sans backticks) de la forme [{"i":0,"title":"...","snippet":"..."}], en gardant le même "i" pour chaque élément. Traduis fidèlement et naturellement. Garde tels quels les noms propres de marques et de cigares.',
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    const text = tr.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const translated = JSON.parse(text.replace(/```json|```/g, "").trim()) as {
      i: number;
      title: string;
      snippet: string;
    }[];
    for (const t of translated) {
      if (items[t.i]) {
        items[t.i].title = t.title ?? items[t.i].title;
        items[t.i].snippet = t.snippet ?? items[t.i].snippet;
      }
    }
  } catch {
    // si la traduction échoue, on garde l'anglais (l'app reste fonctionnelle)
  }

  return NextResponse.json({ items });
}
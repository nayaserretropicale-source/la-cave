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

async function traduire(items: Item[]): Promise<Item[]> {
  if (items.length === 0) return items;
  const payload = items.map((it, i) => ({ i, title: it.title, snippet: it.snippet }));
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Traduis en français naturel les champs "title" et "snippet" de ces actualités cigares. Réponds UNIQUEMENT par un tableau JSON valide, sans backticks ni texte autour, au format [{"i":0,"title":"...","snippet":"..."}], en conservant le même "i". Données :\n${JSON.stringify(payload)}`,
        },
      ],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const fr: { i: number; title: string; snippet: string }[] = JSON.parse(clean);
    const map = new Map(fr.map((t) => [t.i, t]));
    return items.map((it, i) => {
      const t = map.get(i);
      return t ? { ...it, title: t.title, snippet: t.snippet } : it;
    });
  } catch {
    return items;
  }
}

export async function GET() {
  const all: Item[] = [];

  await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const feed = await parser.parseURL(f.url);
        for (const item of feed.items.slice(0, 6)) {
          all.push({
            title: item.title ?? "Sans titre",
            link: item.link ?? "#",
            source: f.source,
            date: item.isoDate ?? item.pubDate ?? "",
            snippet: (item.contentSnippet ?? "").slice(0, 160),
          });
        }
      } catch {
        // flux indisponible : ignoré
      }
    })
  );

  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const top = all.slice(0, 15);
  const traduits = await traduire(top);
  return NextResponse.json({ items: traduits });
}
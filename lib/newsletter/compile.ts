// lib/newsletter/compile.ts
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import OpenAI from "openai";
import type { SourcePick, NewsletterSourceKey } from "@/lib/newsletter/store";

type PerSourceOpts = Partial<Record<
  NewsletterSourceKey,
  { dateFrom?: string; dateTo?: string; limit?: number }
>>;

type Item = {
  title: string;
  date?: Date;
  body: string;
  slug: string;
};

function tryParseDate(anyDate: any, fallbackFromName?: string): Date | undefined {
  const candidates = [
    anyDate,
    typeof anyDate === "string" ? anyDate : undefined,
    // infer “YYYY-MM-DD ...” from filename
    fallbackFromName && /^(\d{4}-\d{1,2}-\d{1,2})/.exec(fallbackFromName)?.[1],
  ].filter(Boolean) as string[];

  for (const s of candidates) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

async function walkMarkdown(dirAbs: string, relFrom: string): Promise<Item[]> {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true }).catch(() => []);
  const out: Item[] = [];

  for (const e of entries) {
    const abs = path.join(dirAbs, e.name);
    const rel = path.join(relFrom, e.name);

    if (e.isDirectory()) {
      // common patterns: <slug>/index.mdx or <slug>/page.mdx
      const idx = await fs.readFile(path.join(abs, "index.mdx")).catch(() => null);
      const pg = idx ? null : await fs.readFile(path.join(abs, "page.mdx")).catch(() => null);
      if (idx || pg) {
        const raw = (idx || pg)!.toString();
        const { data, content } = matter(raw);
        const date =
          tryParseDate(
            data?.date || data?.published || data?.publishedAt || data?.lastmod || data?.updated,
            e.name
          );
        out.push({
          title: String(data?.title || e.name),
          date,
          body: content.trim(),
          slug: rel.replace(/\/(index|page)\.mdx?$/i, "").replace(/\/+/g, "/"),
        });
      } else {
        out.push(...(await walkMarkdown(abs, rel)));
      }
      continue;
    }

    if (!/\.mdx?$/i.test(e.name)) continue;

    const raw = await fs.readFile(abs, "utf8").catch(() => "");
    const { data, content } = matter(raw);
    const base = e.name.replace(/\.(md|mdx)$/i, "");
    const date =
      tryParseDate(
        data?.date || data?.published || data?.publishedAt || data?.lastmod || data?.updated,
        base
      );

    out.push({
      title: String(data?.title || base),
      date,
      body: content.trim(),
      slug: rel.replace(/\.(md|mdx)$/i, ""),
    });
  }

  // newest first
  out.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  return out;
}

async function readMarkdownDirRecursive(relDir: string): Promise<Item[]> {
  const abs = path.join(process.cwd(), relDir);
  return walkMarkdown(abs, relDir);
}

async function readPolls(): Promise<any[]> {
  const dir = path.join(process.cwd(), "data/polls");
  const files = await fs.readdir(dir).catch(() => []);
  const out: any[] = [];
  for (const f of files) {
    if (!/\.json$/i.test(f)) continue;
    try {
      const raw = await fs.readFile(path.join(dir, f), "utf8");
      const json = JSON.parse(raw);
      if (Array.isArray(json)) out.push(...json);
      else out.push(json);
    } catch {}
  }
  return out;
}

export async function compileNewsletter(
  picks: SourcePick[],
  opts?: {
    dateFrom?: string;
    dateTo?: string;
    stylePrompt?: string;
    perSource?: PerSourceOpts;
  }
): Promise<{ subject: string; markdown: string }> {
  const wanted = new Set<NewsletterSourceKey>(picks.map(p => p.key));
  const pickOf = (k: NewsletterSourceKey) => picks.find(p => p.key === k);
  const per = (k: NewsletterSourceKey) => opts?.perSource?.[k];

  const globalFrom = opts?.dateFrom ? new Date(opts.dateFrom) : undefined;
  const globalTo   = opts?.dateTo   ? new Date(opts.dateTo)   : undefined;

  const within = (d?: Date, k?: NewsletterSourceKey) => {
    if (!d) return true; // include undated items
    const from = per(k!)?.dateFrom ? new Date(per(k!)!.dateFrom!) : globalFrom;
    const to   = per(k!)?.dateTo   ? new Date(per(k!)!.dateTo!)   : globalTo;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const limitN = (arr: any[], k?: NewsletterSourceKey) => {
    const n = per(k!)?.limit;
    return typeof n === "number" && n > 0 ? arr.slice(0, n) : arr;
  };

  const rangeLabel = () => {
    const f = globalFrom ? globalFrom.toLocaleDateString() : "";
    const t = globalTo   ? globalTo.toLocaleDateString()   : "";
    if (f && t) return `${f}–${t}`;
    if (f) return `since ${f}`;
    if (t) return `through ${t}`;
    return "This Week";
  };

  const sections: { title: string; markdown: string; verbatim: boolean }[] = [];
  const toSummarize: { source: NewsletterSourceKey; title: string; text: string }[] = [];

  // ---------- Blog ----------
  if (wanted.has("blog")) {
    const p = pickOf("blog")!;
    let posts = (await readMarkdownDirRecursive("app/content/posts")).filter(x => within(x.date, "blog"));
    if (!posts.length && (globalFrom || globalTo)) {
      // fallback to latest if range yields none
      posts = await readMarkdownDirRecursive("app/content/posts");
    }
    posts = limitN(posts, "blog");
    if (posts.length) {
      if (p.verbatim) {
        sections.push({
          title: "From the Blog",
          verbatim: true,
          markdown: posts.map(x => `### ${x.title}\n\n${x.body}\n`).join("\n"),
        });
      } else {
        toSummarize.push({
          source: "blog",
          title: "From the Blog",
          text: posts.map(x => `Title: ${x.title}\nBody:\n${x.body}\n`).join("\n---\n"),
        });
      }
    }
  }

  // ---------- Weekly Recap ----------
  if (wanted.has("weeklyRecap")) {
    const p = pickOf("weeklyRecap")!;
    let recaps = (await readMarkdownDirRecursive("app/content/recaps")).filter(x => within(x.date, "weeklyRecap"));
    if (!recaps.length && (globalFrom || globalTo)) {
      recaps = await readMarkdownDirRecursive("app/content/recaps");
    }
    recaps = limitN(recaps, "weeklyRecap");
    if (recaps.length) {
      if (p.verbatim) {
        sections.push({
          title: "Weekly Recap",
          verbatim: true,
          markdown: recaps.map(x => `### ${x.title}\n\n${x.body}\n`).join("\n"),
        });
      } else {
        toSummarize.push({
          source: "weeklyRecap",
          title: "Weekly Recap",
          text: recaps.map(x => `Title: ${x.title}\nBody:\n${x.body}\n`).join("\n---\n"),
        });
      }
    }
  }

  // ---------- Hold’em / Fold’em ----------
  if (wanted.has("holdem")) {
    const p = pickOf("holdem")!;
    let posts = (await readMarkdownDirRecursive("app/content/posts"))
      .filter(x => within(x.date, "holdem"))
      .filter(x => /hold[\s’'`-]*em|stash|fold/i.test(x.title));
    if (!posts.length && (globalFrom || globalTo)) {
      posts = (await readMarkdownDirRecursive("app/content/posts"))
        .filter(x => /hold[\s’'`-]*em|stash|fold/i.test(x.title));
    }
    posts = limitN(posts, "holdem");
    if (posts.length) {
      if (p.verbatim) {
        sections.push({
          title: "Hold’em / Fold’em",
          verbatim: true,
          markdown: posts.map(x => `### ${x.title}\n\n${x.body}\n`).join("\n"),
        });
      } else {
        toSummarize.push({
          source: "holdem",
          title: "Hold’em / Fold’em",
          text: posts.map(x => `Title: ${x.title}\nBody:\n${x.body}\n`).join("\n---\n"),
        });
      }
    }
  }

  // ---------- Start / Sit ----------
  if (wanted.has("sitStart")) {
    const p = pickOf("sitStart")!;
    let posts = (await readMarkdownDirRecursive("app/content/posts"))
      .filter(x => within(x.date, "sitStart"))
      .filter(x => /start\s*\/?\s*sit|start-?sit|start vs sit/i.test(x.title));
    if (!posts.length && (globalFrom || globalTo)) {
      posts = (await readMarkdownDirRecursive("app/content/posts"))
        .filter(x => /start\s*\/?\s*sit|start-?sit|start vs sit/i.test(x.title));
    }
    posts = limitN(posts, "sitStart");
    if (posts.length) {
      if (p.verbatim) {
        sections.push({
          title: "Start / Sit",
          verbatim: true,
          markdown: posts.map(x => `### ${x.title}\n\n${x.body}\n`).join("\n"),
        });
      } else {
        toSummarize.push({
          source: "sitStart",
          title: "Start / Sit",
          text: posts.map(x => `Title: ${x.title}\nBody:\n${x.body}\n`).join("\n---\n"),
        });
      }
    }
  }

  // ---------- Survivor Polls (summarized) ----------
  if (wanted.has("survivorPolls")) {
    const polls = await readPolls();
    const items = limitN(
      polls.filter((p: any) => {
        const d = p?.date ? new Date(p.date) : undefined;
        return within(d, "survivorPolls");
      }),
      "survivorPolls"
    );
    if (items.length) {
      const text = items
        .map((p: any) =>
          `Question: ${p.question}\n` +
          (p.options || []).map((o: any) => `- ${o.label}: ${o.votes ?? 0} votes`).join("\n")
        )
        .join("\n---\n");
      toSummarize.push({ source: "survivorPolls", title: "Survivor Polls", text });
    }
  }

  // ---------- Survivor Leaderboard (summarized) ----------
  if (wanted.has("survivorLeaderboard")) {
    const text =
      `Summarize the current Survivor Bracket leaderboard for ${rangeLabel()}.\n` +
      `Focus on Top 5, biggest risers/fallers, and a quick highlight. Link: /survivor/leaderboard.`;
    toSummarize.push({ source: "survivorLeaderboard", title: "Survivor Leaderboard", text });
  }

  // ---------- Compose ----------
  const defaultSubject = `Skol Sisters Weekly Rundown — ${rangeLabel()}`;

  // If there’s nothing to summarize, return verbatim sections only (still useful).
  if (!toSummarize.length) {
    const md = `# ${defaultSubject}\n\n` +
      (sections.length
        ? sections.map(s => `## ${s.title}\n\n${s.markdown}`).join("\n\n")
        : "_You’re getting this because you subscribed on heyskolssister.com_");
    return { subject: defaultSubject, markdown: md.trim() };
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_SERVER;
  if (!apiKey) {
    // Local/dev fallback
    const bullets = toSummarize
      .map(m => `### ${m.title}\n\n${m.text.split("\n").slice(0, 12).join("\n")}`)
      .join("\n\n");
    const md = `# ${defaultSubject}\n\n` +
      (sections.length ? sections.map(s => `## ${s.title}\n\n${s.markdown}`).join("\n\n") + "\n\n" : "") +
      `## Highlights\n\n${bullets}\n\n_You’re getting this because you subscribed on heyskolssister.com_`;
    return { subject: defaultSubject, markdown: md.trim() };
  }

  const openai = new OpenAI({ apiKey });

  const system =
    "You are the Skol Sisters newsletter writer. Tone: witty, playful, NFL-savvy. " +
    "Write ~600–900 words in Markdown. NEVER alter verbatim sections. " +
    "Summarize and stitch the rest with clean headings and brief transitions.";

  const style =
    (opts?.stylePrompt?.trim() ||
      "Make it funny and witty (never mean). Short paragraphs, clear headings, newsletter length.")!;

  const payload = {
    range: rangeLabel(),
    house_style: style,
    verbatim_sections: sections.map(s => ({ title: s.title, markdown: s.markdown })),
    materials_to_summarize: toSummarize,
    footer: "_You’re getting this because you subscribed on heyskolssister.com_",
  };

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_NEWSLETTER_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          "Assemble ONE Markdown newsletter. Start with an H1 title, then sections. " +
          "Respect VERBATIM exactly; add connective tissue for summarized parts. " +
          "Finish with a brief sign-off.\n\n" +
          "INPUT JSON:\n```json\n" + JSON.stringify(payload, null, 2) + "\n```",
      },
    ],
  });

  const md = completion.choices[0]?.message?.content?.trim() || "";
  const subject = /#\s+(.+)/.exec(md)?.[1]?.trim() || defaultSubject;

  return { subject, markdown: md || `# ${defaultSubject}\n\n(Empty body)` };
}

// lib/newsletter/compile.ts
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import OpenAI from "openai";
import type { SourcePick, NewsletterSourceKey } from "@/lib/newsletter/store";

type PerSourceOpts = Partial<
  Record<
    NewsletterSourceKey,
    {
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    }
  >
>;

export async function compileNewsletter(
  picks: SourcePick[],
  opts?: {
    dateFrom?: string;
    dateTo?: string;
    stylePrompt?: string;
    perSource?: PerSourceOpts;
  }
): Promise<{ subject: string; markdown: string }> {
  const globalFrom = opts?.dateFrom ? new Date(opts.dateFrom) : undefined;
  const globalTo = opts?.dateTo ? new Date(opts.dateTo) : undefined;

  const wanted = new Set<NewsletterSourceKey>(picks.map((p) => p.key));
  const byKey = (k: NewsletterSourceKey) => picks.find((p) => p.key === k);
  const pso = (k: NewsletterSourceKey) => opts?.perSource?.[k];

  const within = (d?: Date, key?: NewsletterSourceKey) => {
    if (!d) return true;
    const from = pso(key!)?.dateFrom ? new Date(pso(key!)!.dateFrom!) : globalFrom;
    const to = pso(key!)?.dateTo ? new Date(pso(key!)!.dateTo!) : globalTo;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };
  const cap = <T,>(arr: T[], key?: NewsletterSourceKey) => {
    const n = pso(key!)?.limit;
    return typeof n === "number" && n > 0 ? arr.slice(0, n) : arr;
  };

  function rangeLabel() {
    const f = globalFrom ? globalFrom.toLocaleDateString() : "";
    const t = globalTo ? globalTo.toLocaleDateString() : "";
    if (f && t) return `${f}–${t}`;
    if (f) return `since ${f}`;
    if (t) return `through ${t}`;
    return "This Week";
  }

  async function readMarkdownDir(dirRel: string) {
    const dir = path.join(process.cwd(), dirRel);
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      return [] as any[];
    }
    const out: { title: string; date?: Date; body: string; slug: string }[] = [];
    for (const f of files) {
      if (!/\.(md|mdx)$/i.test(f)) continue;
      const full = path.join(dir, f);
      const raw = await fs.readFile(full, "utf8");
      const { data, content } = matter(raw);
      out.push({
        title: String(data?.title || f.replace(/\.(md|mdx)$/i, "")),
        date: data?.date ? new Date(data.date) : undefined,
        body: content.trim(),
        slug: String(data?.slug || f.replace(/\.(md|mdx)$/i, "")),
      });
    }
    out.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    return out;
  }

  async function readPolls(): Promise<any[]> {
    const dir = path.join(process.cwd(), "data/polls");
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      return [];
    }
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

  const sections: { title: string; markdown: string; verbatim: boolean }[] = [];
  const toSummarize: { source: NewsletterSourceKey; title: string; text: string }[] = [];

  // Blog (root: content/posts)
  if (wanted.has("blog")) {
    const pick = byKey("blog")!;
    let posts = (await readMarkdownDir("content/posts")).filter((p) => within(p.date, "blog"));
    posts = cap(posts, "blog");
    if (posts.length) {
      if (pick.verbatim) {
        sections.push({
          title: "From the Blog",
          markdown: posts.map((p) => `### ${p.title}\n\n${p.body}\n`).join("\n"),
          verbatim: true,
        });
      } else {
        toSummarize.push({
          source: "blog",
          title: "From the Blog",
          text: posts.map((p) => `Title: ${p.title}\nBody:\n${p.body}\n`).join("\n---\n"),
        });
      }
    }
  }

  // Weekly Recap (root: content/recaps)
  if (wanted.has("weeklyRecap")) {
    const pick = byKey("weeklyRecap")!;
    let recaps = (await readMarkdownDir("content/recaps")).filter((r) => within(r.date, "weeklyRecap"));
    recaps = cap(recaps, "weeklyRecap");
    if (recaps.length) {
      if (pick.verbatim) {
        sections.push({
          title: "Weekly Recap",
          markdown: recaps.map((r) => `### ${r.title}\n\n${r.body}\n`).join("\n"),
          verbatim: true,
        });
      } else {
        toSummarize.push({
          source: "weeklyRecap",
          title: "Weekly Recap",
          text: recaps.map((r) => `Title: ${r.title}\nBody:\n${r.body}\n`).join("\n---\n"),
        });
      }
    }
  }

  // Hold’em / Fold’em (heuristic within posts)
  if (wanted.has("holdem")) {
    const pick = byKey("holdem")!;
    let posts = (await readMarkdownDir("content/posts"))
      .filter((p) => within(p.date, "holdem"))
      .filter((p) => /hold[\s’'`-]*em|stash|fold/i.test(p.title));
    posts = cap(posts, "holdem");
    if (posts.length) {
      if (pick.verbatim) {
        sections.push({
          title: "Hold’em / Fold’em",
          markdown: posts.map((p) => `### ${p.title}\n\n${p.body}\n`).join("\n"),
          verbatim: true,
        });
      } else {
        toSummarize.push({
          source: "holdem",
          title: "Hold’em / Fold’em",
          text: posts.map((p) => `Title: ${p.title}\nBody:\n${p.body}\n`).join("\n---\n"),
        });
      }
    }
  }

  // Start / Sit
  if (wanted.has("sitStart")) {
    const pick = byKey("sitStart")!;
    let posts = (await readMarkdownDir("content/posts"))
      .filter((p) => within(p.date, "sitStart"))
      .filter((p) => /start\s*\/?\s*sit|start-sit|start vs sit/i.test(p.title));
    posts = cap(posts, "sitStart");
    if (posts.length) {
      if (pick.verbatim) {
        sections.push({
          title: "Start / Sit",
          markdown: posts.map((p) => `### ${p.title}\n\n${p.body}\n`).join("\n"),
          verbatim: true,
        });
      } else {
        toSummarize.push({
          source: "sitStart",
          title: "Start / Sit",
          text: posts.map((p) => `Title: ${p.title}\nBody:\n${p.body}\n`).join("\n---\n"),
        });
      }
    }
  }

  // Survivor Polls (always summarized)
  if (wanted.has("survivorPolls")) {
    const polls = await readPolls();
    const items = cap(
      polls.filter((p: any) => within(p?.date ? new Date(p.date) : undefined, "survivorPolls")),
      "survivorPolls"
    );
    if (items.length) {
      const text = items
        .map(
          (p: any) =>
            `Question: ${p.question}\n` +
            (p.options || [])
              .map((o: any) => `- ${o.label}: ${o.votes ?? 0} votes`)
              .join("\n")
        )
        .join("\n---\n");
      toSummarize.push({ source: "survivorPolls", title: "Survivor Polls", text });
    }
  }

  // Survivor Leaderboard (always summarized)
  if (wanted.has("survivorLeaderboard")) {
    const text = `Summarize the current Survivor Bracket leaderboard for ${rangeLabel()}. Focus on Top 5, biggest risers/fallers, and a quick highlight. Include a link to /survivor/leaderboard.`;
    toSummarize.push({ source: "survivorLeaderboard", title: "Survivor Leaderboard", text });
  }

  const defaultSubject = `Skol Sisters Weekly Rundown — ${rangeLabel()}`;

  // If only verbatim sections, just stitch them.
  if (!toSummarize.length) {
    const markdown =
      `# ${defaultSubject}\n\n` + sections.map((s) => `## ${s.title}\n\n${s.markdown}`).join("\n\n");
    return { subject: defaultSubject, markdown: markdown.trim() };
  }

  // If no OpenAI key, fallback assembler.
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_SERVER;
  const fallbackAssemble = () => {
    const bullets = toSummarize
      .map(
        (m) =>
          `### ${m.title}\n\n` +
          m.text
            .split(/\s+/)
            .slice(0, 180)
            .join(" ") +
          "…"
      )
      .join("\n\n");
    const markdown =
      `# ${defaultSubject}\n\n` +
      (sections.length ? sections.map((s) => `## ${s.title}\n\n${s.markdown}`).join("\n\n") + "\n\n" : "") +
      `## Highlights\n\n${bullets}\n\n—\n_You’re getting this because you subscribed on heyskolssister.com_`;
    return { subject: defaultSubject, markdown: markdown.trim() };
  };
  if (!apiKey) return fallbackAssemble();

  // Try OpenAI; fall back gracefully on any error.
  try {
    const openai = new OpenAI({ apiKey });
    const system =
      "You are the Hey Skol Sisters newsletter writer. Tone: witty, playful, NFL-savvy. " +
      "Produce one Markdown email (≈600–900 words). " +
      "NEVER modify content marked VERBATIM; copy exact. Summarize and stitch the rest.";

    const style =
      opts?.stylePrompt?.trim() ||
      "Make it funny and witty (never mean). Use short paragraphs and clear headings. Keep to newsletter length.";

    const payload = {
      range: rangeLabel(),
      house_style: style,
      verbatim_sections: sections.map((s) => ({ title: s.title, markdown: s.markdown })),
      materials_to_summarize: toSummarize,
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
            "Respect VERBATIM exactly; add connective tissue and polish for summarized parts. " +
            "Finish with a brief sign-off.\n\n" +
            "INPUT JSON:\n```json\n" +
            JSON.stringify(payload, null, 2) +
            "\n```",
        },
      ],
    });

    const md = completion.choices[0]?.message?.content?.trim() || "";
    const subject = /#\s+(.+)/.exec(md)?.[1]?.trim() || defaultSubject;
    return { subject, markdown: md || `# ${defaultSubject}\n\n(Empty body)` };
  } catch (err) {
    console.warn("OpenAI compile failed, using fallback:", err);
    return fallbackAssemble();
  }
}

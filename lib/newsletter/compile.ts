// lib/newsletter/compile.ts
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import OpenAI from "openai";
import type { SourcePick, NewsletterSourceKey } from "@/lib/newsletter/store";

/**
 * Compile a newsletter using selected sources.
 * - Respects verbatim (kept exactly as-is)
 * - Non-verbatim content is summarized by AI with the provided style prompt
 * - Filters all sources by the optional date range [dateFrom, dateTo]
 */
export async function compileNewsletter(
  picks: SourcePick[],
  opts?: {
    dateFrom?: string;      // ISO YYYY-MM-DD or full ISO
    dateTo?: string;        // ISO
    stylePrompt?: string;   // extra guidance for the AI
  }
): Promise<{ subject: string; markdown: string }> {
  const dateFrom = opts?.dateFrom ? new Date(opts.dateFrom) : undefined;
  const dateTo   = opts?.dateTo   ? new Date(opts.dateTo)   : undefined;

  // ---------- helpers ----------
  function withinRange(d?: Date): boolean {
    if (!d) return true;
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  }

  async function readMarkdownDir(dirRel: string) {
    const dir = path.join(process.cwd(), dirRel);
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      return [] as { title: string; date?: Date; body: string; slug: string }[];
    }
    const out: { title: string; date?: Date; body: string; slug: string }[] = [];
    for (const f of files) {
      if (!/\.(md|mdx)$/i.test(f)) continue;
      const full = path.join(dir, f);
      const raw = await fs.readFile(full, "utf8");
      const { data, content } = matter(raw);
      const title = String(data?.title || f.replace(/\.(md|mdx)$/i, ""));
      const d = data?.date ? new Date(data.date) : undefined;
      const slug = String(data?.slug || f.replace(/\.(md|mdx)$/i, ""));
      out.push({ title, date: d, body: content.trim(), slug });
    }
    // newest first
    out.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    return out;
  }

  async function readJson<T = any>(rel: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), rel), "utf8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function rangeLabel() {
    const f = dateFrom ? dateFrom.toLocaleDateString() : "";
    const t = dateTo ? dateTo.toLocaleDateString() : "";
    if (f && t) return `${f}–${t}`;
    if (f) return `since ${f}`;
    if (t) return `through ${t}`;
    return "This Week";
  }

  // ---------- gather content ----------
  const sections: { title: string; markdown: string; verbatim: boolean }[] = [];
  const nonVerbatimMaterials: { source: NewsletterSourceKey; title: string; text: string }[] = [];

  // Selected sources, once each
  const wanted = new Set<NewsletterSourceKey>(picks.map(p => p.key));
  const byKey = (key: NewsletterSourceKey) => picks.find(p => p.key === key);

  // Blog posts: app/content/posts
  if (wanted.has("blog")) {
    const pick = byKey("blog")!;
    const posts = (await readMarkdownDir("app/content/posts"))
      .filter(p => withinRange(p.date));
    if (posts.length) {
      if (pick.verbatim) {
        const md = posts
          .map(p => `### ${p.title}\n\n${p.body}\n`)
          .join("\n");
        sections.push({ title: "From the Blog", markdown: md, verbatim: true });
      } else {
        const text = posts
          .map(p => `Title: ${p.title}\nSummary-eligible body:\n${p.body}\n`)
          .join("\n---\n");
        nonVerbatimMaterials.push({ source: "blog", title: "From the Blog", text });
      }
    }
  }

  // Weekly Recap: app/content/recaps  ← you said this is where it lives
  if (wanted.has("weeklyRecap")) {
    const pick = byKey("weeklyRecap")!;
    const recaps = (await readMarkdownDir("app/content/recaps"))
      .filter(r => withinRange(r.date));
    if (recaps.length) {
      if (pick.verbatim) {
        const md = recaps
          .map(r => `### ${r.title}\n\n${r.body}\n`)
          .join("\n");
        sections.push({ title: "Weekly Recap", markdown: md, verbatim: true });
      } else {
        const text = recaps
          .map(r => `Title: ${r.title}\nRecap body:\n${r.body}\n`)
          .join("\n---\n");
        nonVerbatimMaterials.push({ source: "weeklyRecap", title: "Weekly Recap", text });
      }
    }
  }

  // Hold’em / Fold’em (assume markdown lives under posts with a tag/category)
  if (wanted.has("holdem")) {
    const pick = byKey("holdem")!;
    const posts = (await readMarkdownDir("app/content/posts"))
      .filter(p => withinRange(p.date))
      .filter(p => /hold[\s’'`-]*em|stash|fold/i.test(p.title));
    if (posts.length) {
      if (pick.verbatim) {
        const md = posts.map(p => `### ${p.title}\n\n${p.body}\n`).join("\n");
        sections.push({ title: "Hold’em / Fold’em", markdown: md, verbatim: true });
      } else {
        const text = posts.map(p => `Title: ${p.title}\nBody:\n${p.body}\n`).join("\n---\n");
        nonVerbatimMaterials.push({ source: "holdem", title: "Hold’em / Fold’em", text });
      }
    }
  }

  // Start / Sit (same assumption: in posts)
  if (wanted.has("sitStart")) {
    const pick = byKey("sitStart")!;
    const posts = (await readMarkdownDir("app/content/posts"))
      .filter(p => withinRange(p.date))
      .filter(p => /start\s*\/?\s*sit|start-sit|start vs sit/i.test(p.title));
    if (posts.length) {
      if (pick.verbatim) {
        const md = posts.map(p => `### ${p.title}\n\n${p.body}\n`).join("\n");
        sections.push({ title: "Start / Sit", markdown: md, verbatim: true });
      } else {
        const text = posts.map(p => `Title: ${p.title}\nBody:\n${p.body}\n`).join("\n---\n");
        nonVerbatimMaterials.push({ source: "sitStart", title: "Start / Sit", text });
      }
    }
  }

  // Survivor Polls: data/polls/*.json  (always non-verbatim per your note)
  if (wanted.has("survivorPolls")) {
    // Try a single JSON file first; if you store multiple, read them all.
    const pollJson = await readJson<any>("data/polls.json");
    let text = "";
    if (pollJson && Array.isArray(pollJson)) {
      // Expecting objects like { question, options: [{label, votes}], date }
      const items = pollJson
        .filter((p) => withinRange(p.date ? new Date(p.date) : undefined));
      if (items.length) {
        text = items
          .map(p =>
            `Question: ${p.question}\n` +
            (p.options || [])
              .map((o: any) => `- ${o.label}: ${o.votes ?? 0} votes`)
              .join("\n")
          )
          .join("\n---\n");
      }
    }
    if (text) nonVerbatimMaterials.push({ source: "survivorPolls", title: "Survivor Polls", text });
  }

  // Survivor Leaderboard: summarize, don’t verbatim
  if (wanted.has("survivorLeaderboard")) {
    // If you have a file with rankings, load & summarize here.
    // For now, provide a natural-language stub the model can tighten.
    const text = `Summarize current Survivor Bracket leaderboard for the selected window ${rangeLabel()} using site data if available. Emphasize top 5 and notable jumps. Include a link to /survivor/leaderboard.`;
    nonVerbatimMaterials.push({ source: "survivorLeaderboard", title: "Survivor Leaderboard", text });
  }

  // ---------- build with or without AI ----------
  const range = rangeLabel();
  const defaultSubject = `Skol Sisters Weekly Rundown — ${range}`;

  // If there are no non-verbatim materials, just concatenate verbatim sections
  if (!nonVerbatimMaterials.length) {
    const body =
      `# ${defaultSubject}\n\n` +
      sections.map(s => `## ${s.title}\n\n${s.markdown}`).join("\n\n");
    return { subject: defaultSubject, markdown: body.trim() };
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_SERVER;
  if (!apiKey) {
    // Fallback: crude assembler (no AI). Verbatim, then bullet summaries.
    const bullets = nonVerbatimMaterials
      .map(m => `### ${m.title}\n\n${m.text.split("\n").slice(0, 10).join("\n")}`)
      .join("\n\n");
    const body =
      `# ${defaultSubject}\n\n` +
      (sections.length ? sections.map(s => `## ${s.title}\n\n${s.markdown}`).join("\n\n") + "\n\n" : "") +
      `## Highlights\n\n${bullets}\n\n` +
      `–––\n_You’re getting this because you subscribed on heyskolssister.com_`;
    return { subject: defaultSubject, markdown: body.trim() };
  }

  const openai = new OpenAI({ apiKey });

  const system = [
    "You are the Skol Sisters newsletter writer.",
    "Goal: produce a single, tight, newsletter-length Markdown email.",
    "Tone: witty, playful, a little snarky, but clear and readable.",
    "Never alter any content marked VERBATIM; copy it exactly.",
    "For non-verbatim materials, summarize, stitch together transitions, and keep it punchy.",
    "Use Markdown headings and short paragraphs. Avoid walls of text.",
  ].join(" ");

  const style = opts?.stylePrompt?.trim()
    || "Make it funny and witty without being mean, keep it newsletter-length (~600–900 words). Include clear section headings.";

  const userPayload = {
    range,
    verbatim_sections: sections.map(s => ({ title: s.title, markdown: s.markdown })),
    materials_to_summarize: nonVerbatimMaterials,
    house_style: style,
    footer: "_You’re getting this because you subscribed on heyskolsister.com_",
  };

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    {
      role: "user",
      content:
        "Assemble a single Markdown newsletter. " +
        "Start with a fun title line (as H1), then sections. " +
        "Keep VERBATIM sections exactly as provided. " +
        "Then weave in the summarized sections. " +
        "End with a brief sign-off.\n\n" +
        "JSON INPUT:\n" +
        "```json\n" + JSON.stringify(userPayload, null, 2) + "\n```",
    },
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_NEWSLETTER_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    messages,
  });

  const aiMarkdown = completion.choices[0]?.message?.content?.trim() || "";
  const subject =
    /#\s+(.+)/.exec(aiMarkdown)?.[1]?.trim() || defaultSubject;

  return {
    subject,
    markdown: aiMarkdown || `# ${defaultSubject}\n\n(Empty body)`,
  };
}

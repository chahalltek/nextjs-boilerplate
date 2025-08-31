// lib/newsletter/compile.ts
import type { SourcePick } from "./store";
import { collectBlog, collectRecaps, collectSurvivorPolls } from "./collectors";

// If OPENAI_API_KEY is present, we can try light summarization; otherwise fallback to simple bullets.
async function summarizeIfPossible(prompt: string, fallback: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallback;
  try {
    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Summarize briefly in 2–4 punchy bullets. Keep markdown short." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({} as any));
    const text = json?.choices?.[0]?.message?.content?.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function compileNewsletter(picks: SourcePick[]) {
  // Subject seed
  let subject = "Your weekly Skol Sisters rundown";
  const sections: string[] = [];

  // BLOG --------------------------------------------------------------------
  const wantBlog = picks.find((p) => p.key === "blog");
  if (wantBlog) {
    const posts = await collectBlog(3);
    if (wantBlog.verbatim) {
      // Use the latest post full body
      const p = posts[0];
      if (p) {
        subject = p.title;
        sections.push(`# ${p.title}`, p.excerpt ? `${p.excerpt}\n` : "", `[Read more →](${p.href})`);
        if (p.body) sections.push("\n---\n", p.body);
      }
    } else {
      const bullets = posts
        .map((p) => `- **${p.title}** — ${p.excerpt || ""} [Read](${p.href})`)
        .join("\n");
      const summary = await summarizeIfPossible(
        `Summarize these posts:\n${posts.map((p) => `Title: ${p.title}\nExcerpt: ${p.excerpt}`).join("\n\n")}`,
        bullets
      );
      sections.push(`## On the blog`, summary);
    }
  }

  // RECAPS ------------------------------------------------------------------
  const wantRecap = picks.find((p) => p.key === "weeklyRecap");
  if (wantRecap) {
    const recaps = await collectRecaps(1);
    const r = recaps[0];
    if (r) {
      if (wantRecap.verbatim && r.body) {
        sections.push(`\n## Weekly Recap — ${r.title}`, r.body);
      } else {
        const blurb = r.excerpt || "This week’s highlights, storylines, and who trended up/down.";
        sections.push(`\n## Weekly Recap`, `- **${r.title}** — ${blurb} [Read](${r.href})`);
      }
    }
  }

  // SURVIVOR POLLS ----------------------------------------------------------
  const wantPolls = picks.find((p) => p.key === "survivorPolls");
  if (wantPolls) {
    const polls = await collectSurvivorPolls(3);
    if (wantPolls.verbatim) {
      sections.push(
        `\n## Survivor Polls`,
        ...polls.map((p) => `- **${p.question}**${(p.options ?? []).length ? `  \n  ${p.options!.map(o => `• ${o.text}${o.votes ? ` (${o.votes})` : ""}`).join("\n  ")}` : ""}`)
      );
    } else {
      const bullets = polls.map((p) => `- **${p.question}**`).join("\n");
      const summary = await summarizeIfPossible(
        `Summarize these audience poll questions (make it fun):\n${polls.map((p) => `Q: ${p.question}`).join("\n")}`,
        bullets
      );
      sections.push(`\n## Survivor — Community Pulse`, summary, `[Vote now →](/survivor)`);
    }
  }

  // (Optional) Hold’em / Start-Sit / Leaderboard stubs for later wiring
  if (picks.some((p) => p.key === "holdem")) {
    sections.push(`\n## Hold’em or Fold’em`, `- This section will summarize your hold’em/fold’em picks. (Coming soon.)`);
  }
  if (picks.some((p) => p.key === "sitStart")) {
    sections.push(`\n## Start / Sit`, `- This section will summarize this week’s start/sit calls. (Coming soon.)`);
  }
  if (picks.some((p) => p.key === "survivorLeaderboard")) {
    sections.push(`\n## Survivor Leaderboard`, `- Who’s climbing? Check the latest standings. [See leaderboard →](/survivor/leaderboard)`);
  }

  const markdown = sections.filter(Boolean).join("\n\n").trim();
  return { subject, markdown };
}

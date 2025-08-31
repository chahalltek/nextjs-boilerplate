import type { NewsletterSourceKey, SourcePick } from "./store";
import {
  collectBlog,
  collectWeeklyRecap,
  collectHoldem,
  collectSitStart,
  collectSurvivorPolls,
  collectSurvivorLeaderboard,
} from "./collectors";

const COLLECTORS: Record<NewsletterSourceKey, () => Promise<string>> = {
  blog: collectBlog,
  weeklyRecap: collectWeeklyRecap,
  holdem: collectHoldem,
  sitStart: collectSitStart,
  survivorPolls: collectSurvivorPolls,
  survivorLeaderboard: collectSurvivorLeaderboard,
};

async function aiRewrite(input: string, intent: "summarize" | "polish"): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return input;
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are a concise, punchy sports newsletter writer. Return Markdown." },
          { role: "user", content: `${intent === "summarize" ? "Summarize" : "Polish"} this for a weekly email:\n\n${input}` },
        ],
      }),
    });
    const json = await resp.json();
    return json?.choices?.[0]?.message?.content?.trim() || input;
  } catch {
    return input;
  }
}

export async function compileNewsletter(picks: SourcePick[]) {
  const pieces: { title: string; body: string }[] = [];

  for (const p of picks) {
    const raw = await (COLLECTORS[p.key]?.() ?? Promise.resolve(""));
    const body = p.verbatim ? raw : await aiRewrite(raw, "summarize");
    const title = ({
      blog: "From the Blog",
      weeklyRecap: "Weekly Recap",
      holdem: "Hold’em / Fold’em",
      sitStart: "Start / Sit",
      survivorPolls: "Survivor Polls",
      survivorLeaderboard: "Survivor Leaderboard",
    } as Record<NewsletterSourceKey, string>)[p.key];

    pieces.push({ title, body });
  }

  // Subject line (AI if available)
  const subject =
    (await aiRewrite(
      pieces.map((p) => `- ${p.title}`).join("\n"),
      "polish"
    ).catch(() => "")) || "Your weekly Skol Sisters rundown";

  const markdown = [
    `# Skol Sisters Weekly`,
    `> Fresh tools, lineup notes, and Survivor chatter.`,
    ``,
    ...pieces.map((p) => `## ${p.title}\n\n${p.body}`),
    ``,
    `— The Skol Sisters 💜`,
  ].join("\n\n");

  return { subject, markdown };
}

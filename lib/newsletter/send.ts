// lib/newsletter/send.ts
import type { NewsletterDraft } from "./store";
import { listSubscribers } from "@/lib/subscribers/store";

function mdToBasicHtml(md: string) {
  return md
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => {
      if (l.startsWith("# ")) return `<h1>${l.slice(2)}</h1>`;
      if (l.startsWith("## ")) return `<h2>${l.slice(3)}</h2>`;
      if (l.startsWith("### ")) return `<h3>${l.slice(4)}</h3>`;
      if (l.startsWith("- ")) return `<li>${l.slice(2)}</li>`;
      if (!l.trim()) return "";
      return `<p>${l}</p>`;
    })
    .join("\n")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
}

async function sendWithResend(to: string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM || "Skol Sisters <news@heyskolsister.com>";
  if (!key) return false;

  const { Resend } = await import("resend");
  const resend = new Resend(key);

  const chunk = <T,>(arr: T[], n = 50) =>
    arr.reduce<T[][]>((a, c, i) => {
      const k = Math.floor(i / n);
      (a[k] ||= []).push(c);
      return a;
    }, []);

  for (const batch of chunk(to, 50)) {
    await resend.emails.send({ from, to: batch, subject, html }).catch((e) => {
      console.error("Resend error:", e?.message || e);
    });
  }
  return true;
}

function cleanEmails(input?: string[] | null): string[] {
  if (!input) return [];
  const r = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const out = new Set<string>();
  for (const raw of input) {
    const e = String(raw || "").toLowerCase().replace(/[<>,"']/g, "").trim();
    if (r.test(e)) out.add(e);
  }
  return [...out];
}

export async function sendNewsletter(
  draft: NewsletterDraft,
  opts?: { recipients?: string[] }
) {
  // If recipients are provided, use ONLY them; otherwise use the subscriber list.
  const override = cleanEmails(opts?.recipients || []);
  const to =
    override.length > 0
      ? override
      : (await listSubscribers(draft as any as string | undefined))
          .map((s) => s.email)
          .filter(Boolean);

  if (!to.length) {
    console.log(`[newsletter] No recipients. Subject "${draft.subject}"`);
    return { sent: 0 };
  }

  const html = mdToBasicHtml(draft.markdown);

  const ok = await sendWithResend(to, draft.subject, html);
  if (!ok) {
    console.log(
      `[newsletter] No email provider configured. Would send "${draft.subject}" to ${to.length} recipient(s).`
    );
  } else {
    console.log(`[newsletter] Sent "${draft.subject}" to ${to.length} recipient(s)`);
  }
  return { sent: to.length };
}

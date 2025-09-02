// lib/newsletter/template.ts
import type { NewsletterDraft } from "@/lib/newsletter/store";

/** Optional override for the email logo */
const LOGO_URL =
  process.env.NEWSLETTER_LOGO_URL || "https://heyskolsister.com/logo.png";
const SITE = "https://heyskolsister.com";

const NAV = [
  { href: `${SITE}/stats`, label: "Player Projections" },
  { href: `${SITE}/start-sit`, label: "Sit/Start" },
  { href: `${SITE}/blog`, label: "Blog" },
  { href: `${SITE}/roster`, label: "Lineup Lab" },
] as const;

/** Inline brand style = safest across email clients */
const BRAND_STYLE =
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif;" +
  "font-size:26px;font-weight:800;line-height:1.2;color:#ffffff;" +
  "text-decoration:none;display:inline-block;";

export function renderNewsletterEmail(draft: NewsletterDraft): string {
  const subject = draft.subject || "Your weekly Hey Skol Sister rundown!";
  const bodyHtml = markdownToHtml(draft.markdown || "");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charSet="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${escapeHtml(subject)}</title>
  <style>
    /* Basic email-safe styles (inline-friendly) */
    body { margin:0; padding:0; background:#0f0d18; }
    .wrapper { width:100%; background:#0f0d18; }
    .container { width:100%; max-width:640px; margin:0 auto; }
    .card { background:#121022; border:1px solid rgba(255,255,255,0.08);
            border-radius:14px; padding:24px; }
    .muted { color:#a3a3b2; font-size:13px; }
    a { color:#ffd166; text-decoration:none; }
    .nav a { color:#ffffff !important; opacity:.9; font-size:13px; margin:0 8px; font-weight:600; }
    h1,h2,h3 { color:#ffffff; margin:18px 0 8px; font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif; }
    p,li { color:#e8e8ef; line-height:1.5; font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif; font-size:16px; }
    ul { padding-left:22px; margin:8px 0 16px; }
    hr { border:none; border-top:1px solid rgba(255,255,255,0.12); margin:20px 0; }
    .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; }
    .logo { display:block; height:36px; margin:0 auto; }
    .header { padding:24px 0 8px; text-align:center; }
    .footer { text-align:center; padding:18px 0 36px; }
  </style>
</head>
<body>
  <!-- Preheader (hidden in most clients) -->
  <div class="preheader">${escapeHtml(subject)}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="wrapper">
    <tr><td>
      <div class="container">

        <!-- Header -->
        <div class="header">
          <!-- Logo (may fail to load in some clients; text brand below is always visible) -->
          <a href="${SITE}" target="_blank" rel="noopener">
            <img class="logo" src="${LOGO_URL}" alt="Hey Skol Sister" />
          </a>

          <!-- Strong textual brand (big, bold, white) -->
          <div style="margin-top:8px;">
            <a href="${SITE}" target="_blank" rel="noopener" style="${BRAND_STYLE}">
              <!-- font tag helps keep white in dark-mode clients that override colors -->
              <font color="#ffffff" style="color:#ffffff">Hey Skol Sister</font>
            </a>
          </div>

          <!-- Top navigation -->
          <div class="nav" style="margin-top:10px;">
            ${NAV.map(
              (n) =>
                `<a href="${n.href}" target="_blank" rel="noopener">${escapeHtml(
                  n.label
                )}</a>`
            ).join(" • ")}
          </div>
        </div>

        <!-- Body -->
        <div class="card">
          ${bodyHtml}
        </div>

        <!-- Footer -->
        <div class="footer">
          <p class="muted">
            You’re receiving this because you subscribed at
            <a href="${SITE}" target="_blank" rel="noopener">${SITE.replace(
              "https://",
              ""
            )}</a>.
            <br />
            <a href="${SITE}/unsubscribe" target="_blank" rel="noopener">Unsubscribe</a>
            &nbsp;•&nbsp;
            <a href="${SITE}/privacy" target="_blank" rel="noopener">Privacy</a>
          </p>
        </div>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Tiny, dependency-free Markdown -> HTML that's “email-safe enough”. */
/* Supports: #, ##, ###, **bold**, _italic_, lists, paragraphs, HR.   */
/* ------------------------------------------------------------------ */
function markdownToHtml(md: string): string {
  md = md.replace(/\r\n/g, "\n");
  md = md.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

  md = md
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");

  md = md.replace(/^\s*---+\s*$/gm, "<hr />");

  md = md.replace(/^(?:-\s+.*(?:\n|$))+?/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((line) => line.replace(/^-+\s+/, "").trim())
      .map((txt) => `<li>${inline(txt)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  md = md
    .split(/\n{2,}/)
    .map((chunk) => {
      if (/^<(h\d|ul|hr)/i.test(chunk.trim())) return chunk;
      const lines = chunk
        .split("\n")
        .map((l) => inline(l))
        .join("<br />");
      return `<p>${lines}</p>`;
    })
    .join("\n");

  return md;
}

function inline(s: string): string {
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/_(.+?)_/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

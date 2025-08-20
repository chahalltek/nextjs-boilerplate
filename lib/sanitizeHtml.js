// lib/sanitizeHtml.ts
/**
 * Minimal server-safe HTML sanitizer to prevent obvious XSS.
 * If you need stricter rules, swap this for a lib like `sanitize-html`.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let s = String(input);

  // Strip dangerous elements entirely
  s = s.replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi, "");

  // Remove inline event handlers (onclick, onload, etc.)
  s = s.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
  s = s.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");
  s = s.replace(/\s+on\w+\s*=\s*[^>\s]+/gi, "");

  // Neutralize javascript: URLs
  s = s.replace(/\s(href|src)\s*=\s*"(?:\s*javascript:)[^"]*"/gi, ' $1="#"');
  s = s.replace(/\s(href|src)\s*=\s*'(?:\s*javascript:)[^']*'/gi, " $1='#'");

  // Only allow http/https/mailto for href/src; drop others
  s = s.replace(/\s(href|src)\s*=\s*"(?!(?:https?:|mailto:))[^"]*"/gi, "");
  s = s.replace(/\s(href|src)\s*=\s'(?!(?:https?:|mailto:))[^']*'/gi, "");

  // Optionally strip inline styles
  s = s.replace(/\sstyle\s*=\s*"[^"]*"/gi, "");
  s = s.replace(/\sstyle\s*=\s*'[^']*'/gi, "");

  return s;
}

export default sanitizeHtml;

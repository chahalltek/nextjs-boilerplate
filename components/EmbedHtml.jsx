'use client';

import { sanitizeHtml } from '@/lib/sanitizeHtml';

export default function EmbedHtml({ html, className }) {
  if (!html) return null;
 const safe = sanitizeHtml(html);
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}

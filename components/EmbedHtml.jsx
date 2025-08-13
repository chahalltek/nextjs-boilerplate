'use client';

export default function EmbedHtml({ html, className }) {
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

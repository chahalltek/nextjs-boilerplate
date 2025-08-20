// Sanitizer leveraging DOMPurify when available with a whitelist fallback.
// DOMPurify provides thorough XSS protection, but since external
// dependencies may not always be present in build environments, we fall back
// to a basic whitelist-based sanitizer that removes disallowed tags and
// attributes.

let DOMPurify;
try {
  // isomorphic-dompurify works in both server and client contexts
  DOMPurify = require('isomorphic-dompurify');
} catch {
  DOMPurify = null;
}

const ALLOWED_TAGS = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen'],
  p: [],
  br: [],
  div: ['class'],
  span: ['class'],
  strong: [],
  em: [],
  ul: [],
  ol: [],
  li: [],
  h1: [],
  h2: [],
  h3: [],
  blockquote: []
};

function basicSanitize(html) {
  // Remove closing tags for disallowed elements
  const allowedTagNames = Object.keys(ALLOWED_TAGS);
  let cleaned = html.replace(/<\/(\w+)>/gi, (match, tag) => {
    return allowedTagNames.includes(tag.toLowerCase()) ? match : '';
  });

  // Sanitize opening tags and attributes
  cleaned = cleaned.replace(/<(\w+)([^>]*)>/gi, (match, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!ALLOWED_TAGS[tag]) {
      return '';
    }

    const allowedAttrs = ALLOWED_TAGS[tag];
    const sanitizedAttrs = [];

    attrs.replace(/([\w-:]+)(?:=("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g, (m, name, _q1, v1, v2, v3) => {
      name = name.toLowerCase();
      if (allowedAttrs.includes(name)) {
        const value = v1 || v2 || v3 || '';
        sanitizedAttrs.push(`${name}="${value}"`);
      }
      return '';
    });

    const attrString = sanitizedAttrs.length ? ' ' + sanitizedAttrs.join(' ') : '';
    return `<${tag}${attrString}>`;
  });

  return cleaned;
}

function sanitizeHtml(html) {
  if (DOMPurify) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: Object.keys(ALLOWED_TAGS),
      ALLOWED_ATTR: Object.values(ALLOWED_TAGS).flat()
    });
  }
  return basicSanitize(html);
}

module.exports = { sanitizeHtml };
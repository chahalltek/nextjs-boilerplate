// Simple sanitizer that strips event handler attributes like onerror
// This avoids relying on external packages during builds
function sanitizeHtml(html) {
  return html
    .replace(/on\w+="[^"]*"/g, '') // remove inline event handlers
    .replace(/\s+>/g, '>'); // tidy up extra whitespace
}

module.exports = { sanitizeHtml };
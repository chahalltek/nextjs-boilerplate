const test = require('node:test');
const assert = require('node:assert');
const { sanitizeHtml } = require('../lib/sanitizeHtml');

test('sanitizeHtml removes dangerous attributes', () => {
  const dirty = '<img src=x onerror="alert(1)">';
  const clean = sanitizeHtml(dirty);
  assert.strictEqual(clean, '<img src="x">');
});
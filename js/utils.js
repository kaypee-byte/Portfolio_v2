/* ==========================================================
   UTILS: small helpers shared by every other file.
   Loaded first. Everything is shared through window.Site.
   ========================================================== */

window.Site = window.Site || {};

(function () {
  const Site = window.Site;

  const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  /* True when the visitor asked for less motion. */
  Site.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Matches on phones. Used to pick the phone layout of "My story". */
  Site.phone = matchMedia('(max-width: 760px)');

  Site.$ = function (selector) {
    return document.querySelector(selector);
  };

  /* Makes text safe to place inside HTML. */
  Site.esc = function (text = '') {
    return String(text).replace(/[&<>"']/g, function (char) {
      return HTML_ESCAPES[char];
    });
  };

  /* Only allows web links (blocks javascript: and similar). */
  Site.safeUrl = function (url) {
    return /^https?:\/\//i.test(url) ? url : '#';
  };

  /* Turns **bold** into <strong>bold</strong> (text must be escaped first). */
  Site.rich = function (html) {
    return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  };

  /* One trimmed, non-empty item per line. */
  Site.lines = function (text = '') {
    return text
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  };

  /* Paragraphs are separated by a blank line. */
  Site.paras = function (text = '') {
    return text
      .split(/\n\s*\n/)
      .filter(function (part) { return part.trim(); })
      .map(function (part) {
        const safe = Site.rich(Site.esc(part.trim()));
        return '<p>' + safe.replace(/\n/g, '<br>') + '</p>';
      })
      .join('');
  };

  /* "· 2026-01-15" or an empty string. */
  Site.whenText = function (item) {
    return item.event_date ? '· ' + Site.esc(item.event_date) : '';
  };
})();

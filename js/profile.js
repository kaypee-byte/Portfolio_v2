/* ==========================================================
   PROFILE: fills About, Skills, Languages, Interests,
   Experience and Education from Site.text() (dashboard text
   if saved, otherwise the built-in text in defaults.js).
   ========================================================== */

(function () {
  const Site = window.Site;
  const esc = Site.esc;

  /* One <li> per line. */
  function fillChips(selector, key) {
    const items = Site.lines(Site.text(key));
    Site.$(selector).innerHTML = items
      .map(function (item) { return '<li>' + esc(item) + '</li>'; })
      .join('');
  }

  /* Entries are separated by a blank line.
     Line 1 = title, line 2 = place, the rest = bullet points. */
  function entryHtml(lines) {
    let html = '<h3>' + esc(lines[0]) + '</h3>';

    if (lines[1]) {
      html += '<p class="meta">' + esc(lines[1]) + '</p>';
    }

    if (lines.length > 2) {
      const bullets = lines.slice(2).map(function (line) {
        return '<li>' + esc(line.replace(/^[-•]\s*/, '')) + '</li>';
      });
      html += '<ul>' + bullets.join('') + '</ul>';
    }

    return html;
  }

  function fillEntries(selector, key) {
    const entries = Site.text(key)
      .split(/\n\s*\n/)
      .map(Site.lines)
      .filter(function (lines) { return lines.length; });

    Site.$(selector).innerHTML = entries.map(entryHtml).join('');
  }

  Site.fillProfile = function () {
    Site.$('#aboutText').innerHTML = Site.paras(Site.text('about'));
    fillChips('#skillsList', 'skills');
    fillChips('#langList', 'languages');
    fillChips('#intList', 'interests');
    fillEntries('#expList', 'experience');
    fillEntries('#eduList', 'education');
  };
})();

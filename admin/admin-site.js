/* ==========================================================
   ADMIN SITE CONTENT: the text inside the half globe, About,
   skills, languages, interests, experience and education.
   Boxes start with the built-in text from js/defaults.js.
   ========================================================== */

(function () {
  const Admin = window.Admin;
  const $ = Admin.$;
  const KEYS = [
    'journeyTitle', 'journey', 'about', 'skills',
    'languages', 'interests', 'experience', 'education',
  ];

  Admin.loadSite = async function () {
    const result = await Admin.sb.from('site_content').select('*');
    const saved = {};
    (result.data || []).forEach(function (row) { saved[row.key] = row.value; });

    const defaults = window.DEFAULTS || {};
    KEYS.forEach(function (key) {
      const value = saved[key] !== undefined ? saved[key] : defaults[key] || '';
      $('#s_' + key).value = value;
    });
  };

  async function saveSite(event) {
    event.preventDefault();

    const rows = KEYS.map(function (key) {
      return { key: key, value: $('#s_' + key).value };
    });

    const result = await Admin.sb.from('site_content').upsert(rows);
    Admin.say(
      result.error
        ? 'Could not save: ' + result.error.message
        : 'Site content saved. Refresh the public page to see it.'
    );
  }

  Admin.initSite = function () {
    $('#sf').onsubmit = saveSite;
  };
})();

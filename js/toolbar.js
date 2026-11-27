/* ==========================================================
   TOOLBAR: the phone navigation.
   - Bottom bar: Home, Cyber, Software, Projects, Menu.
   - Menu opens a sheet with every page and every link.
   - The current page is highlighted (aria-current="page").
   ========================================================== */

(function () {
  const Site = window.Site;
  const SHEET_ANCHORS = /^#(about|experience|timeline|contact)/;

  /* Which toolbar item matches the page being shown? */
  function currentKey() {
    const hash = location.hash;
    const panel = hash.match(/^#\/panel\/(cyber|software|pm)/);

    if (panel) return panel[1];
    if (hash.startsWith('#/post/')) return document.body.dataset.panel || 'home';
    if (hash.startsWith('#/moment/') || SHEET_ANCHORS.test(hash)) return 'more';
    return 'home';
  }

  Site.updateToolbar = function () {
    const key = currentKey();

    document.querySelectorAll('#toolbar [data-nav]').forEach(function (item) {
      if (item.dataset.nav === key) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });
  };

  Site.initToolbar = function () {
    const sheet = Site.$('#sheet');
    const button = Site.$('#menuBtn');

    function openSheet() {
      sheet.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-expanded', 'true');
      document.body.classList.add('sheet-open');
      sheet.querySelector('a').focus();
    }

    function closeSheet() {
      sheet.classList.remove('open');
      sheet.setAttribute('aria-hidden', 'true');
      button.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('sheet-open');
    }

    button.addEventListener('click', function () {
      if (sheet.classList.contains('open')) closeSheet();
      else openSheet();
    });

    /* Backdrop, close button and every link close the sheet. */
    sheet.addEventListener('click', function (event) {
      if (event.target.closest('[data-close], a')) closeSheet();
    });

    addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && sheet.classList.contains('open')) {
        closeSheet();
        button.focus();
      }
    });

    addEventListener('hashchange', Site.updateToolbar);
    Site.updateToolbar();
  };
})();

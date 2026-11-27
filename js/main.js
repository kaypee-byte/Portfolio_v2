/* ==========================================================
   MAIN: starts everything, in order.
   ========================================================== */

(function () {
  const Site = window.Site;

  /* The three panel cards tilt toward the mouse. */
  function tiltCards() {
    if (Site.reduce) return;

    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        card.style.setProperty('--ry', x * 14 + 'deg');
        card.style.setProperty('--rx', -y * 14 + 'deg');
      });

      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  async function start() {
    /* Things that need no data. */
    Site.buildPhotoStrip();
    Site.buildHeroGlobe();
    tiltCards();
    Site.initToolbar();
    Site.fillProfile();
    Site.startRouter();

    /* Things that use saved content (dashboard) when it exists. */
    Site.$('#jStage').innerHTML = '<p class="meta">Loading…</p>';

    try {
      await Site.loadContent();
    } catch (error) {
      console.warn('Using built-in text.', error);
    }
    Site.fillProfile();

    let moments = [];
    try {
      moments = await Site.loadMoments();
    } catch (error) {
      console.warn('Could not load moments.', error);
    }
    Site.renderJourney(moments);
  }

  start();
})();

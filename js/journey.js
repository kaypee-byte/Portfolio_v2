/* ==========================================================
   JOURNEY: the "My story" section.
   Chooses the desktop or phone layout, builds the rolling half
   globe and the moment cards, and scales everything to fit.
   ========================================================== */

(function () {
  const Site = window.Site;

  const DESIGN = {
    desktop: { width: 1000, height: 620 },
    phone: { width: 360, height: 250 },
  };

  let moments = [];
  let resizeBound = false;

  /* Scale the fixed-size stage down when the screen is narrower. */
  function fitStage(modeName) {
    const design = DESIGN[modeName];
    const host = Site.$('#jScale');
    const frame = Site.$('#jFrame');
    if (!host || !frame) return;

    const available = Site.$('#jStage').clientWidth;
    const scale = Math.min(1, available / design.width);

    host.style.transform = 'scale(' + scale + ')';
    frame.style.height = design.height * scale + 'px';
  }

  Site.renderJourney = function (list) {
    if (list) moments = list;

    const modeName = Site.phone.matches ? 'phone' : 'desktop';
    const text = Site.text('journey');

    Site.$('#jTitle').textContent = Site.text('journeyTitle') || 'My story';
    Site.$('#jFull').innerHTML = Site.paras(text); // full text for screen readers

    Site.$('#jStage').innerHTML =
      '<div id="jFrame"><div id="jScale"></div></div><div id="jStrip"></div>';

    const stage = Site.Story.build(Site.$('#jScale'), text, modeName);

    if (modeName === 'desktop') {
      Site.Moments.arc(stage, moments);
    } else {
      Site.Moments.strip(Site.$('#jStrip'), moments);
    }

    fitStage(modeName);

    if (!resizeBound) {
      resizeBound = true;
      addEventListener('resize', function () {
        fitStage(Site.phone.matches ? 'phone' : 'desktop');
      });
      Site.phone.addEventListener('change', function () {
        Site.renderJourney();
      });
    }
  };
})();

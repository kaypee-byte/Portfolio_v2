/* ==========================================================
   PHOTO STRIP: your photos, right to left, in an endless loop.
   The photos are written out twice, and the CSS animation moves
   the track by exactly half its width, so the loop never jumps.
   ========================================================== */

(function () {
  const Site = window.Site;

  Site.buildPhotoStrip = function () {
    const total = Site.photos.length;
    const twoSets = Site.photos.concat(Site.photos);

    const html = twoSets.map(function (src, index) {
      const number = (index % total) + 1;
      const alt = 'Photo of Kwanele (' + number + ' of ' + total + ')';
      return '<img src="' + src + '" alt="' + alt + '" height="220">';
    });

    Site.$('#track').innerHTML = html.join('');
  };
})();

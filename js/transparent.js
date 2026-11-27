/* ==========================================================
   TRANSPARENT BLACK BACKGROUNDS for template photos / videos.

   Rules, so nothing important is lost:
   1. Only runs when the picture's EDGE is genuinely solid black.
   2. Only near-black pixels CONNECTED to that edge are removed.
      Black details inside the subject stay.
   3. The original file is never changed. A processed canvas is
      shown on top; the original stays in the page as a fallback.
   4. If the browser cannot read the pixels, nothing changes.
   ========================================================== */

(function () {
  const Site = window.Site;

  const BLACK_LEVEL = 14;      // 0-255: "solid black" background
  const SOFT_EDGE_LEVEL = 44;  // pixels between 14 and 44 fade out
  const EDGE_SHARE = 0.9;      // 90% of the edge must be black
  const MIN_REMOVED = 0.05;    // at least 5% of the picture is background
  const MAX_IMAGE_SIDE = 900;
  const VIDEO_MASK_WIDTH = 192;
  const VIDEO_FRAME_MS = 50;

  function isBlack(data, i) {
    return data[i] <= BLACK_LEVEL && data[i + 1] <= BLACK_LEVEL && data[i + 2] <= BLACK_LEVEL;
  }

  /* ----- Step 1: is the edge solid black? ----- */

  function edgeIsBlack(data, w, h) {
    let black = 0;
    let total = 0;

    function check(x, y) {
      total++;
      if (isBlack(data, (y * w + x) * 4)) black++;
    }

    for (let x = 0; x < w; x++) {
      check(x, 0);
      check(x, h - 1);
    }
    for (let y = 1; y < h - 1; y++) {
      check(0, y);
      check(w - 1, y);
    }

    return black / total >= EDGE_SHARE;
  }

  /* ----- Step 2: flood fill black pixels connected to the edge ----- */

  function floodFromEdges(data, w, h) {
    const mask = new Uint8Array(w * h).fill(255); // 255 = keep, 0 = remove
    const stack = [];

    function seed(k) {
      if (mask[k] === 255 && isBlack(data, k * 4)) {
        mask[k] = 0;
        stack.push(k);
      }
    }

    for (let x = 0; x < w; x++) {
      seed(x);
      seed((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      seed(y * w);
      seed(y * w + w - 1);
    }

    while (stack.length) {
      const k = stack.pop();
      const x = k % w;
      const y = (k / w) | 0;
      if (x > 0) seed(k - 1);
      if (x < w - 1) seed(k + 1);
      if (y > 0) seed(k - w);
      if (y < h - 1) seed(k + w);
    }

    return mask;
  }

  /* ----- Step 3: fade the pixels right on the border ----- */

  function softenEdges(mask, data, w, h) {
    const edge = [];

    for (let k = 0; k < mask.length; k++) {
      if (mask[k] !== 255) continue;
      const x = k % w;
      const y = (k / w) | 0;
      const touchesBackground =
        (x > 0 && !mask[k - 1]) ||
        (x < w - 1 && !mask[k + 1]) ||
        (y > 0 && !mask[k - w]) ||
        (y < h - 1 && !mask[k + w]);
      if (touchesBackground) edge.push(k);
    }

    edge.forEach(function (k) {
      const brightness = Math.max(data[k * 4], data[k * 4 + 1], data[k * 4 + 2]);
      if (brightness >= SOFT_EDGE_LEVEL) return;
      const range = SOFT_EDGE_LEVEL - BLACK_LEVEL;
      const fade = (255 * (brightness - BLACK_LEVEL)) / range;
      mask[k] = Math.max(40, Math.round(fade));
    });
  }

  /* Returns a mask (255 = keep, 0 = transparent) or null for "leave it alone". */
  function buildMask(data, w, h) {
    if (!edgeIsBlack(data, w, h)) return null;

    const mask = floodFromEdges(data, w, h);
    let removed = 0;
    for (let k = 0; k < mask.length; k++) {
      if (!mask[k]) removed++;
    }
    if (removed / mask.length < MIN_REMOVED) return null;

    softenEdges(mask, data, w, h);
    return mask;
  }

  /* ----- Photos ----- */

  function keyImage(img) {
    const source = new Image();
    if (/^https?:/i.test(img.src)) source.crossOrigin = 'anonymous';

    source.onload = function () {
      try {
        const longSide = Math.max(source.naturalWidth, source.naturalHeight);
        const scale = Math.min(1, MAX_IMAGE_SIDE / longSide);
        const w = Math.round(source.naturalWidth * scale);
        const h = Math.round(source.naturalHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0, w, h);

        const pixels = ctx.getImageData(0, 0, w, h);
        const mask = buildMask(pixels.data, w, h);
        if (!mask) return;

        for (let k = 0; k < mask.length; k++) {
          pixels.data[k * 4 + 3] = Math.min(pixels.data[k * 4 + 3], mask[k]);
        }
        ctx.putImageData(pixels, 0, 0);

        canvas.className = 'keyed-media';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', img.alt || '');
        img.after(canvas);
        img.style.display = 'none';
        img.parentElement.classList.add('keyed');
      } catch (error) {
        /* Cross-origin or unsupported: keep the original picture. */
      }
    };

    source.src = img.currentSrc || img.src;
  }

  /* ----- Videos (the mask is rebuilt for every frame at low resolution) ----- */

  function keyVideo(original) {
    const host = original.parentElement;
    const video = document.createElement('video');

    if (/^https?:/i.test(original.src)) video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('muted', '');
    video.src = original.src;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const small = document.createElement('canvas');
    const smallCtx = small.getContext('2d', { willReadFrequently: true });
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    let visible = true;
    let working = true;
    let swapped = false;

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }).observe(host);

    function drawFrame() {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const sw = VIDEO_MASK_WIDTH;
      const sh = Math.max(1, Math.round((sw * vh) / vw));

      if (canvas.width !== Math.min(vw, 640)) {
        canvas.width = Math.min(vw, 640);
        canvas.height = Math.round((canvas.width * vh) / vw);
      }

      small.width = sw;
      small.height = sh;
      smallCtx.drawImage(video, 0, 0, sw, sh);
      const mask = buildMask(smallCtx.getImageData(0, 0, sw, sh).data, sw, sh);

      if (!mask && !swapped) {
        working = false; // not a black-background video: leave it untouched
        video.removeAttribute('src');
        return;
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (mask) {
        maskCanvas.width = sw;
        maskCanvas.height = sh;
        const maskPixels = maskCtx.createImageData(sw, sh);
        for (let k = 0; k < mask.length; k++) maskPixels.data[k * 4 + 3] = mask[k];
        maskCtx.putImageData(maskPixels, 0, 0);

        ctx.globalCompositeOperation = 'destination-in';
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (!swapped) {
        swapped = true;
        canvas.className = 'keyed-media';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', original.getAttribute('aria-label') || '');
        original.after(canvas);
        original.style.display = 'none';
        if (original.pause) original.pause();
        host.classList.add('keyed');
        video.preload = 'auto';
        if (!Site.reduce) video.play().catch(function () {});
      }
    }

    function loop() {
      if (!host.isConnected || !working) return;

      if (visible && video.readyState >= 2 && video.videoWidth) {
        try {
          drawFrame();
        } catch (error) {
          working = false; // cross-origin: keep the original video
        }
      }

      setTimeout(function () { requestAnimationFrame(loop); }, VIDEO_FRAME_MS);
    }

    video.addEventListener('error', function () { working = false; });
    video.addEventListener('loadedmetadata', function () { video.currentTime = 0.05; });
    loop();
  }

  /* ----- Public: process everything marked with data-key inside `root` ----- */

  Site.keyOut = function (root) {
    if (!root) return;
    const items = root.querySelectorAll('[data-key]:not([data-keyed])');

    items.forEach(function (el) {
      el.setAttribute('data-keyed', '1');
      if (el.tagName === 'VIDEO') {
        keyVideo(el);
      } else {
        keyImage(el);
      }
    });
  };
})();

/* ==========================================================
   MOMENTS: the template cards (photo/video + "Read more").
   - Desktop: cards slide along an arc, right to left, forever.
     Drag, swipe, use the arrows or the keyboard to move them.
   - Phone: a swipeable strip that also scrolls by itself.
   ========================================================== */

(function () {
  const Site = window.Site;
  const esc = Site.esc;

  const ARC = {
    centerX: 500,
    centerY: 520,
    radius: 430,
    slot: 37.5,          // degrees between two cards
    startAngle: 15,
    fadeZone: 12,        // degrees where a card fades in / out
    autoSpeed: 5,        // degrees per second (right to left)
    degreesPerPixel: 0.19,
    minCards: 6,
  };

  /* ---------- Card markup ---------- */

  function thumbHtml(moment) {
    const first = (moment.media || [])[0];
    if (!first) return '<span class="nothumb">Photo</span>';

    const key = first.keyBlack === false ? '' : ' data-key';
    const label = esc(first.alt || moment.title);
    const url = esc(first.url);

    if (first.type === 'video') {
      const poster = first.poster ? ' poster="' + esc(first.poster) + '"' : '';
      return (
        '<video src="' + url + '"' + poster + ' muted loop playsinline ' +
        'preload="metadata" aria-label="' + label + '"' + key + '></video>'
      );
    }
    return '<img src="' + url + '" alt="' + label + '" loading="lazy"' + key + '>';
  }

  function cardHtml(moment) {
    return (
      '<a class="moment" href="#/moment/' + esc(moment.id) + '">' +
        '<span class="in">' +
          '<span class="thumb">' + thumbHtml(moment) + '</span>' +
          '<span class="more">' +
            '<b>' + esc(moment.title) + '</b>' +
            esc(moment.cta || 'Read the story') + ' →' +
          '</span>' +
        '</span>' +
      '</a>'
    );
  }

  /* Repeat the list until a loop has enough cards to look full. */
  function fillList(moments) {
    let list = moments.slice();
    while (list.length && list.length < ARC.minCards) {
      list = list.concat(moments);
    }
    return list;
  }

  /* Videos on cards play (silently) only while the pointer is over them. */
  function previewVideosOnHover(root) {
    root.addEventListener('pointerover', function (event) {
      const card = event.target.closest('.moment');
      const video = card && card.querySelector('video');
      if (video && video.paused) video.play().catch(function () {});
    });

    root.addEventListener('pointerout', function (event) {
      const card = event.target.closest('.moment');
      const video = card && card.querySelector('video');
      if (video) video.pause();
    });
  }

  /* ---------- Desktop: arc carousel ---------- */

  function arc(stage, moments) {
    const holder = stage.querySelector('#arc');
    const leftButton = stage.querySelector('#aL');
    const rightButton = stage.querySelector('#aR');

    if (!moments.length) {
      holder.innerHTML =
        '<p class="note" style="position:absolute;left:330px;top:60px">' +
        'Moments will appear here soon.</p>';
      leftButton.hidden = true;
      rightButton.hidden = true;
      return;
    }

    const items = fillList(moments);
    holder.innerHTML = items.map(cardHtml).join('');
    Site.keyOut(holder);
    previewVideosOnHover(holder);

    const cards = Array.from(holder.children);
    const loopLength = items.length * ARC.slot;
    const autoSpeed = Site.reduce ? 0 : ARC.autoSpeed;

    const state = {
      offset: ARC.startAngle,
      speed: autoSpeed,
      hover: false,
      jump: 0,
      dragging: false,
      moved: false,
    };

    /* Put every card on the arc. Angle 0 = right end, 180 = left end. */
    function place() {
      cards.forEach(function (card, index) {
        const raw = index * ARC.slot + state.offset;
        const angle = ((raw % loopLength) + loopLength) % loopLength;

        if (angle > 180) {
          card.style.display = 'none';
          return;
        }

        const radians = (angle * Math.PI) / 180;
        const x = ARC.centerX + ARC.radius * Math.cos(radians);
        const y = ARC.centerY - ARC.radius * Math.sin(radians);
        const edge = Math.min(angle, 180 - angle);

        card.style.display = 'block';
        card.style.left = x + 'px';
        card.style.top = y + 'px';
        card.style.opacity = Math.max(0, Math.min(1, edge / ARC.fadeZone));
        card.style.setProperty('--r', (90 - angle) * 0.55 + 'deg');
      });
    }

    let lastTime = performance.now();

    function frame(now) {
      if (!holder.isConnected) return;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!state.dragging) {
        if (state.jump) {
          const step = Math.sign(state.jump) * Math.min(Math.abs(state.jump), 180 * dt);
          state.offset += step;
          state.jump -= step;
        } else {
          const target = state.hover ? 0 : autoSpeed;
          state.offset += state.speed * dt;
          state.speed += (target - state.speed) * Math.min(1, dt * 2.5);
        }
      }

      place();
      requestAnimationFrame(frame);
    }

    place();
    requestAnimationFrame(frame);

    /* ----- Mouse / touch drag on the stage (not on the globe) ----- */

    const scaleOf = function () {
      return stage.getBoundingClientRect().width / stage.offsetWidth;
    };

    stage.addEventListener('pointerdown', function (event) {
      if (event.target.closest('.dome, .ctrl, .arcbtn')) return;

      const startX = event.clientX;
      let lastX = startX;
      let lastT = performance.now();
      state.moved = false;

      function onMove(move) {
        if (!state.dragging && Math.abs(move.clientX - startX) > 5) {
          state.dragging = true;
          state.moved = true;
          state.jump = 0;
        }
        if (!state.dragging) return;

        const now = performance.now();
        const change = (-(move.clientX - lastX) * ARC.degreesPerPixel) / scaleOf();
        state.offset += change;

        const seconds = Math.max((now - lastT) / 1000, 0.008);
        state.speed = Math.max(-400, Math.min(400, change / seconds));
        lastX = move.clientX;
        lastT = now;
      }

      function onUp() {
        removeEventListener('pointermove', onMove);
        removeEventListener('pointerup', onUp);
        removeEventListener('pointercancel', onUp);
        state.dragging = false;
      }

      addEventListener('pointermove', onMove);
      addEventListener('pointerup', onUp);
      addEventListener('pointercancel', onUp);
    });

    /* A drag must not open the card under the finger. */
    stage.addEventListener('click', function (event) {
      if (!state.moved) return;
      event.preventDefault();
      event.stopPropagation();
      state.moved = false;
    }, true);

    /* ----- Pause while the pointer is over a card ----- */

    holder.addEventListener('pointerover', function (event) {
      if (event.target.closest('.moment')) state.hover = true;
    });
    holder.addEventListener('pointerout', function (event) {
      if (event.target.closest('.moment')) state.hover = false;
    });
    holder.addEventListener('focusin', function () { state.hover = true; });
    holder.addEventListener('focusout', function () { state.hover = false; });

    /* ----- Arrows and keyboard ----- */

    holder.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') state.jump += ARC.slot;
      if (event.key === 'ArrowLeft') state.jump -= ARC.slot;
    });

    rightButton.onclick = function () { state.jump += ARC.slot; };
    leftButton.onclick = function () { state.jump -= ARC.slot; };
    leftButton.hidden = false;
    rightButton.hidden = false;
  }

  /* ---------- Phone: swipeable strip that also drifts on its own ---------- */

  function strip(container, moments) {
    if (!moments.length) {
      container.innerHTML = '<p class="note">Moments will appear here soon.</p>';
      return;
    }

    const items = fillList(moments);
    const row = document.createElement('div');
    row.className = 'strip-row';
    row.innerHTML = items.concat(items).map(cardHtml).join(''); // two copies = endless
    container.append(row);
    Site.keyOut(row);
    previewVideosOnHover(row);

    const half = row.scrollWidth / 2;
    let position = 1;
    let paused = false;
    let resumeTimer;

    row.scrollLeft = 1;

    function pause() {
      paused = true;
      clearTimeout(resumeTimer);
    }

    function resumeSoon() {
      resumeTimer = setTimeout(function () { paused = false; }, 1500);
    }

    ['pointerdown', 'touchstart', 'focusin'].forEach(function (name) {
      row.addEventListener(name, pause);
    });
    ['pointerup', 'touchend', 'focusout'].forEach(function (name) {
      row.addEventListener(name, resumeSoon);
    });

    /* Wrap around when the visitor swipes past either end. */
    row.addEventListener('scroll', function () {
      if (row.scrollLeft <= 0) row.scrollLeft = half - 1;
      else if (row.scrollLeft >= half) row.scrollLeft -= half;
    });

    function loop() {
      if (!row.isConnected) return;

      if (paused || Site.reduce) {
        position = row.scrollLeft;
      } else {
        position += 0.6;
        if (position >= half) position -= half;
        row.scrollLeft = position;
      }
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

  Site.Moments = { arc: arc, strip: strip };
})();

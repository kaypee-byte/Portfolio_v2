/* ==========================================================
   STORY DOME: the half globe that rolls by itself.

   - The surface lines and your words are on the same turning
     surface, so the words follow its curve as it rolls.
   - It never stops, reverses or resets: the story simply
     starts again after its last piece.
   - Touch, click or drag it: the automatic roll eases to a
     stop and you turn it yourself. Let go: it eases back up.
   ========================================================== */

(function () {
  const Site = window.Site;

  /* One set of numbers per layout. */
  const MODES = {
    desktop: { width: 1000, chunk: 300, radius: 330, step: 34, perspective: 1000, dragPx: 190 },
    phone: { width: 360, chunk: 130, radius: 190, step: 41, perspective: 620, dragPx: 125 },
  };

  const BAND_COUNT = 24;               // surface lines around the full turn
  const AUTO_SPEED = 0.14;             // story pieces per second
  const VISIBLE_PIECES = 2.4;          // pieces shown above and below the centre
  const FADE_CURVE = 1.6;              // higher = neighbours fade out sooner

  /* ---------- Cut the story into short pieces that fit the globe ---------- */

  /* Breaks a very long sentence at a space so it never overflows. */
  function breakLong(sentence, max) {
    const pieces = [];
    let rest = sentence.trim();

    while (rest.length > max) {
      let cut = rest.lastIndexOf(', ', max);
      if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
      if (cut <= 0) cut = max;
      pieces.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }

    if (rest) pieces.push(rest);
    return pieces;
  }

  function splitIntoPieces(text, max) {
    const pieces = [];
    const paragraphs = text.replace(/^#.*\n/, '').split(/\n\s*\n/);

    paragraphs.forEach(function (paragraph) {
      const clean = paragraph.replace(/\s+/g, ' ').trim();
      if (!clean) return;

      const sentences = clean.match(/[^.!?]+[.!?]+["”']?\s*|[^.!?]+$/g) || [clean];
      let current = '';

      sentences.forEach(function (sentence) {
        breakLong(sentence, max).forEach(function (part) {
          if (current && (current + ' ' + part).length > max) {
            pieces.push(current.trim());
            current = '';
          }
          current += (current ? ' ' : '') + part;
        });
      });

      if (current.trim()) pieces.push(current.trim());
    });

    return pieces;
  }

  /* ---------- Markup ---------- */

  function stageHtml(modeName, mode, pieces) {
    const words = pieces
      .map(function (piece) {
        return '<p class="seg">' + Site.rich(Site.esc(piece)) + '</p>';
      })
      .join('');

    const arcParts =
      modeName === 'desktop'
        ? '<div id="arc"></div>' +
          '<button class="arcbtn l" id="aL" aria-label="Previous moments">‹</button>' +
          '<button class="arcbtn r" id="aR" aria-label="Next moments">›</button>'
        : '';

    return (
      '<div class="stage ' + modeName + '">' +
        '<div class="floor"></div>' +
        '<div class="dome" id="dome" tabindex="0" role="group" ' +
          'style="perspective:' + mode.perspective + 'px" ' +
          'aria-label="Story globe. It turns by itself. Drag it, use the arrow ' +
          'keys, the mouse wheel or the buttons to turn it yourself. ' +
          'The full text is also available to screen readers.">' +
          '<div class="bands" id="bands" aria-hidden="true"></div>' +
          '<div class="drum" id="drum" aria-hidden="true">' + words + '</div>' +
        '</div>' +
        arcParts +
        '<div class="ctrl">' +
          '<button id="jBack" class="btn ghost">▲ Back</button>' +
          '<span id="jPos" aria-live="off"></span>' +
          '<button id="jFwd" class="btn ghost">Forward ▼</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* Surface lines, one every 15 degrees, so a full turn repeats exactly. */
  function addBands(bands, radius) {
    const gap = 360 / BAND_COUNT;

    for (let k = 0; k < BAND_COUNT; k++) {
      const band = document.createElement('i');
      band.className = 'band';
      band.style.transform = 'rotateX(' + -k * gap + 'deg) translateZ(' + (radius - 3) + 'px)';
      bands.append(band);
    }
  }

  /* ---------- The rolling ---------- */

  function startRolling(stage, mode, count) {
    const dome = stage.querySelector('#dome');
    const drum = stage.querySelector('#drum');
    const bands = stage.querySelector('#bands');
    const label = stage.querySelector('#jPos');
    const pieces = Array.from(drum.children);
    const auto = Site.reduce ? 0 : AUTO_SPEED;

    /* turn = position in the story (in pieces). It only ever grows
       while rolling, so there is no reset. */
    const state = {
      turn: 0,
      speed: auto,
      held: false,
      dragging: false,
      jump: 0,
      pauseUntil: 0,
    };

    drum.style.transform = 'translateZ(' + -mode.radius + 'px)';
    addBands(bands, mode.radius);

    function wrapIndex(value) {
      return ((value % count) + count) % count;
    }

    /* Draw one moment of the rolling globe. */
    function draw() {
      const position = wrapIndex(state.turn);

      bands.style.transform =
        'translateZ(' + -mode.radius + 'px) rotateX(' + state.turn * mode.step + 'deg)';

      pieces.forEach(function (piece, index) {
        let distance = index - position;
        distance -= count * Math.round(distance / count); // shortest way round
        const away = Math.abs(distance);

        if (away > VISIBLE_PIECES) {
          piece.style.display = 'none';
          return;
        }

        piece.style.display = 'flex';
        piece.style.opacity = Math.max(0, 1 - Math.pow(away, FADE_CURVE));
        piece.style.transform =
          'rotateX(' + -distance * mode.step + 'deg) translateZ(' + mode.radius + 'px)';
      });

      label.textContent = (Math.floor(position + 0.5) % count) + 1 + ' / ' + count;
    }

    let lastTime = performance.now();

    function frame(now) {
      if (!dome.isConnected) return;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!state.dragging) {
        if (state.jump) {
          const step = Math.sign(state.jump) * Math.min(Math.abs(state.jump), 4 * dt);
          state.turn += step;
          state.jump -= step;
        }

        /* Ease the speed toward "roll" or "stop", never a sudden change. */
        const waiting = state.held || now < state.pauseUntil;
        const target = waiting ? 0 : auto;
        const rate = waiting ? 5 : 1.4;
        state.speed += (target - state.speed) * Math.min(1, dt * rate);
        state.turn += state.speed * dt;
      }

      draw();
      requestAnimationFrame(frame);
    }

    draw();
    requestAnimationFrame(frame);

    /* ----- Touch / mouse drag ----- */

    const scaleOf = function () {
      return stage.getBoundingClientRect().width / stage.offsetWidth;
    };

    let startY = 0;
    let startTurn = 0;
    let lastTurn = 0;
    let lastT = 0;

    dome.addEventListener('pointerdown', function (event) {
      state.held = true;
      state.dragging = true;
      state.speed = 0;
      startY = event.clientY;
      startTurn = state.turn;
      lastTurn = state.turn;
      lastT = performance.now();
      dome.setPointerCapture(event.pointerId);
      dome.style.cursor = 'grabbing';
    });

    dome.addEventListener('pointermove', function (event) {
      if (!state.dragging) return;

      const now = performance.now();
      state.turn = startTurn - (event.clientY - startY) / (mode.dragPx * scaleOf());

      /* Remember how fast the finger moved so letting go feels natural. */
      const seconds = Math.max((now - lastT) / 1000, 0.008);
      const speed = (state.turn - lastTurn) / seconds;
      state.speed = Math.max(-4, Math.min(4, state.speed * 0.6 + speed * 0.4));
      lastTurn = state.turn;
      lastT = now;
    });

    function release() {
      if (!state.dragging) return;
      state.dragging = false;
      state.held = false;
      dome.style.cursor = '';
    }

    dome.addEventListener('pointerup', release);
    dome.addEventListener('pointercancel', release);

    /* ----- Wheel, keyboard and buttons ----- */

    function nudge(pieces) {
      state.jump += pieces;
      state.pauseUntil = performance.now() + 1500;
    }

    dome.addEventListener('wheel', function (event) {
      event.preventDefault();
      state.turn += event.deltaY / 260;
      state.pauseUntil = performance.now() + 1200;
    }, { passive: false });

    dome.addEventListener('keydown', function (event) {
      const direction = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[event.key];
      if (!direction) return;
      event.preventDefault();
      nudge(direction);
    });

    stage.querySelector('#jFwd').onclick = function () { nudge(1); };
    stage.querySelector('#jBack').onclick = function () { nudge(-1); };
  }

  /* ---------- Public ---------- */

  function build(host, text, modeName) {
    const mode = MODES[modeName];
    const pieces = splitIntoPieces(text, mode.chunk);

    host.style.width = mode.width + 'px';
    host.innerHTML = stageHtml(modeName, mode, pieces);

    const stage = host.querySelector('.stage');
    if (pieces.length) startRolling(stage, mode, pieces.length);
    return stage;
  }

  Site.Story = { build: build };
})();

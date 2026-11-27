/* ==========================================================
   HERO GLOBE: the spinning 3D ball in the hero (three.js).
   - Covered in your photos (or your video, see README).
   - Ten photos orbit around it in a tilted ring.
   - Drag to turn it. Falls back to a plain photo if 3D fails.
   ========================================================== */

(function () {
  const Site = window.Site;
  const PHOTOS = window.PHOTOS_DATA || [];

  const ATLAS = { columns: 6, rows: 3, cell: 400 };
  const BALL_RADIUS = 1.7;
  const RING_RADIUS = 2.75;
  const RING_PHOTOS = 10;
  const BALL_SPIN = 0.012; // radians per frame at 60 fps
  const RING_SPIN = 0.006;

  /* ----- Texture made of all photos in a grid ----- */

  function makeAtlasTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS.columns * ATLAS.cell;
    canvas.height = ATLAS.rows * ATLAS.cell;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    const cells = PHOTOS.concat(PHOTOS[0]); // 17 photos + 1 repeat = 18 cells

    cells.forEach(function (src, index) {
      const image = new Image();

      image.onload = function () {
        const cell = ATLAS.cell;
        const scale = Math.max(cell / image.width, cell / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        const x = (index % ATLAS.columns) * cell;
        const y = Math.floor(index / ATLAS.columns) * cell;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, cell, cell);
        ctx.clip();
        ctx.drawImage(image, x + (cell - w) / 2, y + (cell - h) * 0.3, w, h);
        ctx.restore();
        texture.needsUpdate = true;
      };

      image.src = src;
    });

    return texture;
  }

  /* ----- Texture made of your video (optional) ----- */

  function makeVideoTexture(THREE) {
    const video = document.createElement('video');
    video.src = window.SITE_VIDEO;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('muted', '');
    video.play().catch(function () {});
    return new THREE.VideoTexture(video);
  }

  /* ----- The parts of the scene ----- */

  function makeBall(THREE, texture) {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 96, 64);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 });
    const ball = new THREE.Mesh(geometry, material);
    ball.rotation.z = 0.25;
    return ball;
  }

  /* A soft light edge around the ball so it stands out from the page. */
  function makeRim(THREE) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: [
        'varying vec3 n;',
        'void main() {',
        '  n = normalize(normalMatrix * normal);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying vec3 n;',
        'void main() {',
        '  float i = pow(0.72 - dot(n, vec3(0.0, 0.0, 1.0)), 3.0);',
        '  gl_FragColor = vec4(0.75, 0.95, 0.8, 1.0) * i;',
        '}',
      ].join('\n'),
    });
    return new THREE.Mesh(new THREE.SphereGeometry(1.82, 64, 48), material);
  }

  function makeRing(THREE) {
    const ring = new THREE.Group();
    const loader = new THREE.TextureLoader();
    ring.rotation.x = 0.35;

    for (let i = 0; i < RING_PHOTOS; i++) {
      const angle = (i / RING_PHOTOS) * Math.PI * 2;
      const map = loader.load(PHOTOS[i % PHOTOS.length]);
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.82),
        new THREE.MeshBasicMaterial({ map: map, side: THREE.DoubleSide })
      );
      card.position.set(Math.sin(angle) * RING_RADIUS, 0, Math.cos(angle) * RING_RADIUS);
      card.rotation.y = angle;
      ring.add(card);
    }

    return ring;
  }

  function addLights(THREE, scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(4, 3, 6);
    scene.add(sun);
  }

  /* ----- Dragging ----- */

  function enableDrag(box, ball, state) {
    let lastX = 0;
    let lastY = 0;

    box.addEventListener('pointerdown', function (event) {
      state.dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      box.setPointerCapture(event.pointerId);
    });

    box.addEventListener('pointermove', function (event) {
      if (!state.dragging) return;
      ball.rotation.y += (event.clientX - lastX) * 0.008;
      state.tilt += (event.clientY - lastY) * 0.004;
      state.tilt = Math.max(-0.5, Math.min(0.5, state.tilt));
      lastX = event.clientX;
      lastY = event.clientY;
    });

    box.addEventListener('pointerup', function () {
      state.dragging = false;
    });
  }

  /* ----- Build everything ----- */

  Site.buildHeroGlobe = function () {
    const box = Site.$('#globe');

    try {
      const THREE = window.THREE;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
      camera.position.set(0, 0.6, 10.5);
      camera.lookAt(0, 0, 0);

      const texture = window.SITE_VIDEO ? makeVideoTexture(THREE) : makeAtlasTexture(THREE);
      const ball = makeBall(THREE, texture);
      const ring = makeRing(THREE);
      scene.add(ball, makeRim(THREE), ring);
      addLights(THREE, scene);

      box.innerHTML = '';
      box.append(renderer.domElement);

      function fit() {
        renderer.setSize(box.clientWidth, box.clientWidth, false);
      }
      fit();
      addEventListener('resize', fit);

      const state = { dragging: false, tilt: 0 };
      enableDrag(box, ball, state);

      let last = performance.now();

      function frame(now) {
        const dt = Math.min((now - last) / 16.67, 3);
        last = now;

        if (!state.dragging && !Site.reduce) {
          ball.rotation.y += BALL_SPIN * dt;
          ring.rotation.y -= RING_SPIN * dt;
        }

        ring.rotation.x = 0.35 + state.tilt;
        ball.rotation.x = state.tilt;
        renderer.render(scene, camera);

        if (!Site.reduce || state.dragging) requestAnimationFrame(frame);
      }

      if (Site.reduce) {
        ball.rotation.y = 0.6;
        renderer.render(scene, camera);
        addEventListener('pointerdown', function () { requestAnimationFrame(frame); }, { once: true });
      } else {
        requestAnimationFrame(frame);
      }
    } catch (error) {
      console.warn('3D is not available, showing a photo instead.', error);
    }
  };
})();

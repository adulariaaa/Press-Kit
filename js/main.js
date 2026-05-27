/* ═══════════════════════════════════════════
   ADULARIA — main.js
   cursor · noise canvas · routing · reveals
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ──────────────────────────────────────
     SHARP CROSSHAIR CURSOR
     No lag, no blob — just a precise cross
  ────────────────────────────────────── */
  const cursor = document.getElementById('cursor');
  const dot    = document.getElementById('cursor-dot');

  let mx = -200, my = -200;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    dot.style.transform    = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });

  // Hover state
  const interactives = 'a, button, .btn, .mix-tile, .rel-row, .platform-row, .mini-mix-row, .more-link, .section-aux';

  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactives)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactives)) document.body.classList.remove('cursor-hover');
  });

  /* ──────────────────────────────────────
     SPA ROUTING
  ────────────────────────────────────── */
  const pages    = document.querySelectorAll('.page');
  const navLinks = document.querySelectorAll('.nav-links a[data-page]');

  function showPage(id) {
    pages.forEach(p => p.classList.remove('active'));
    navLinks.forEach(a => a.classList.remove('active'));
    const target = document.getElementById('page-' + id);
    if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
    navLinks.forEach(a => { if (a.dataset.page === id) a.classList.add('active'); });
    setTimeout(triggerReveals, 60);
    setTimeout(animateBars, 200);
    buildWaveforms();
    initNoiseCanvas();
  }

  navLinks.forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showPage(a.dataset.page); });
  });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-goto]');
    if (t) { e.preventDefault(); showPage(t.dataset.goto); }
  });

  /* ──────────────────────────────────────
     SCROLL REVEAL
  ────────────────────────────────────── */
  function triggerReveals() {
    const io = new IntersectionObserver(entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 55);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04 });
    document.querySelectorAll('.page.active .reveal').forEach(el => {
      el.classList.remove('visible');
      io.observe(el);
    });
  }

  /* ──────────────────────────────────────
     SOUND PROFILE BARS
  ────────────────────────────────────── */
  function animateBars() {
    document.querySelectorAll('.sp-fill[data-val]').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.val + '%'; }, 300);
    });
  }

  /* ──────────────────────────────────────
     WAVEFORM BUILDER
  ────────────────────────────────────── */
  function buildWaveforms() {
    document.querySelectorAll('.waveform[data-id]').forEach(el => {
      if (el.dataset.built) return;
      el.dataset.built = '1';
      for (let i = 0; i < 50; i++) {
        // spikier distribution for techno feel
        const r = Math.random();
        const h = r < 0.15
          ? Math.random() * 26 + 4     // occasional spike
          : Math.random() * 10 + 2;    // mostly low
        const bar = document.createElement('div');
        bar.className = 'wbar';
        bar.style.height = h + 'px';
        el.appendChild(bar);
      }
    });
  }

  /* ──────────────────────────────────────
     NOISE / SPIKE CANVAS
     — oscilloscope waves + random spikes
     — same horizontal movement, but harsh
  ────────────────────────────────────── */
  function initNoiseCanvas() {
    document.querySelectorAll('#noise-canvas').forEach(canvas => {
      if (canvas.dataset.init) return;
      canvas.dataset.init = '1';

      const ctx = canvas.getContext('2d');

      function resize() {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
      resize();
      window.addEventListener('resize', resize);

      const W = () => canvas.width;
      const H = () => canvas.height;

      let phase = 0;

      // Noise history buffer for raw signal
      const NOISE_LEN = 512;
      let noiseBuffer = new Float32Array(NOISE_LEN).map(() => (Math.random() * 2 - 1));

      // Spike state
      let spikes = [];
      function maybeAddSpike() {
        if (Math.random() < 0.04) {
          spikes.push({
            x: Math.random() * W(),
            y: H() / 2,
            amp: (Math.random() * 0.6 + 0.3) * (Math.random() < 0.5 ? 1 : -1),
            life: 1,
            decay: Math.random() * 0.06 + 0.04,
          });
        }
      }

      function draw() {
        ctx.clearRect(0, 0, W(), H());

        const cy = H() / 2;

        /* ── Layer 1: raw noise signal (horizontal scan line) ── */
        // shift buffer left, add new sample
        noiseBuffer.copyWithin(0, 1);
        noiseBuffer[NOISE_LEN - 1] = (Math.random() * 2 - 1) * 0.4;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 0.7;
        for (let x = 0; x < W(); x++) {
          const idx = Math.floor((x / W()) * NOISE_LEN);
          const y = cy + noiseBuffer[idx] * cy * 0.5;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        /* ── Layer 2: main signal — jagged, not smooth ── */
        // Use multiple harmonics with sharp wrap
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 4;

        for (let x = 0; x <= W(); x += 1) {
          const t = x / W();
          // base wave
          let y = Math.sin(t * Math.PI * 2 * 1.0 + phase) * cy * 0.22;
          // add harmonics for harshness
          y += Math.sin(t * Math.PI * 2 * 3.3 + phase * 1.7) * cy * 0.09;
          y += Math.sin(t * Math.PI * 2 * 7.1 + phase * 2.3) * cy * 0.04;
          // add noise grain
          y += (Math.random() * 2 - 1) * cy * 0.025;
          // hard clip / fold — makes it angular
          y = Math.max(-cy * 0.5, Math.min(cy * 0.5, y));

          x === 0 ? ctx.moveTo(x, cy + y) : ctx.lineTo(x, cy + y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        /* ── Layer 3: second offset line ── */
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= W(); x += 2) {
          const t = x / W();
          let y = Math.sin(t * Math.PI * 2 * 2.1 + phase * 0.8 + 1.2) * cy * 0.14;
          y += Math.sin(t * Math.PI * 2 * 5.5 + phase * 1.9) * cy * 0.05;
          y += (Math.random() * 2 - 1) * cy * 0.015;
          y = Math.max(-cy * 0.4, Math.min(cy * 0.4, y));
          x === 0 ? ctx.moveTo(x, cy + y) : ctx.lineTo(x, cy + y);
        }
        ctx.stroke();

        /* ── Layer 4: vertical impulse spikes ── */
        maybeAddSpike();
        ctx.lineWidth = 1;
        spikes = spikes.filter(s => s.life > 0);
        spikes.forEach(s => {
          const h = s.amp * cy * s.life;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255,255,255,${s.life * 0.9})`;
          ctx.shadowColor = `rgba(255,255,255,${s.life * 0.4})`;
          ctx.shadowBlur = 6;
          ctx.moveTo(s.x, cy);
          ctx.lineTo(s.x, cy + h);
          // add a tiny horizontal tick at peak
          ctx.moveTo(s.x - 3, cy + h);
          ctx.lineTo(s.x + 3, cy + h);
          ctx.stroke();
          s.life -= s.decay;
        });
        ctx.shadowBlur = 0;

        /* ── Layer 5: sparse vertical scan lines (static feel) ── */
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.04) {
            const sx = Math.random() * W();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 0.5;
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, H());
            ctx.stroke();
          }
        }

        /* ── horizontal center line ── */
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.moveTo(0, cy);
        ctx.lineTo(W(), cy);
        ctx.stroke();

        phase += 0.032; // same speed as before
        requestAnimationFrame(draw);
      }

      draw();
    });
  }

  /* ──────────────────────────────────────
     GLITCH DATA ATTR
  ────────────────────────────────────── */
  document.querySelectorAll('.glitch').forEach(el => {
    el.dataset.text = el.textContent;
  });

  /* ──────────────────────────────────────
     INIT
  ────────────────────────────────────── */
  buildWaveforms();
  showPage('home');

});/* ═══════════════════════════════════════════
   ADULARIA — main.js
   cursor · noise canvas · routing · reveals
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ──────────────────────────────────────
     SHARP CROSSHAIR CURSOR
     No lag, no blob — just a precise cross
  ────────────────────────────────────── */
  const cursor = document.getElementById('cursor');
  const dot    = document.getElementById('cursor-dot');

  let mx = -200, my = -200;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    dot.style.transform    = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });

  // Hover state
  const interactives = 'a, button, .btn, .mix-tile, .rel-row, .platform-row, .mini-mix-row, .more-link, .section-aux';

  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactives)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactives)) document.body.classList.remove('cursor-hover');
  });

  /* ──────────────────────────────────────
     SPA ROUTING
  ────────────────────────────────────── */
  const pages    = document.querySelectorAll('.page');
  const navLinks = document.querySelectorAll('.nav-links a[data-page]');

  function showPage(id) {
    pages.forEach(p => p.classList.remove('active'));
    navLinks.forEach(a => a.classList.remove('active'));
    const target = document.getElementById('page-' + id);
    if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
    navLinks.forEach(a => { if (a.dataset.page === id) a.classList.add('active'); });
    setTimeout(triggerReveals, 60);
    setTimeout(animateBars, 200);
    buildWaveforms();
    initNoiseCanvas();
  }

  navLinks.forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showPage(a.dataset.page); });
  });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-goto]');
    if (t) { e.preventDefault(); showPage(t.dataset.goto); }
  });

  /* ──────────────────────────────────────
     SCROLL REVEAL
  ────────────────────────────────────── */
  function triggerReveals() {
    const io = new IntersectionObserver(entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 55);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04 });
    document.querySelectorAll('.page.active .reveal').forEach(el => {
      el.classList.remove('visible');
      io.observe(el);
    });
  }

  /* ──────────────────────────────────────
     SOUND PROFILE BARS
  ────────────────────────────────────── */
  function animateBars() {
    document.querySelectorAll('.sp-fill[data-val]').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.val + '%'; }, 300);
    });
  }

  /* ──────────────────────────────────────
     WAVEFORM BUILDER
  ────────────────────────────────────── */
  function buildWaveforms() {
    document.querySelectorAll('.waveform[data-id]').forEach(el => {
      if (el.dataset.built) return;
      el.dataset.built = '1';
      for (let i = 0; i < 50; i++) {
        // spikier distribution for techno feel
        const r = Math.random();
        const h = r < 0.15
          ? Math.random() * 26 + 4     // occasional spike
          : Math.random() * 10 + 2;    // mostly low
        const bar = document.createElement('div');
        bar.className = 'wbar';
        bar.style.height = h + 'px';
        el.appendChild(bar);
      }
    });
  }

  /* ──────────────────────────────────────
     NOISE / SPIKE CANVAS
     — oscilloscope waves + random spikes
     — same horizontal movement, but harsh
  ────────────────────────────────────── */
  function initNoiseCanvas() {
    document.querySelectorAll('#noise-canvas').forEach(canvas => {
      if (canvas.dataset.init) return;
      canvas.dataset.init = '1';

      const ctx = canvas.getContext('2d');

      function resize() {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
      resize();
      window.addEventListener('resize', resize);

      const W = () => canvas.width;
      const H = () => canvas.height;

      let phase = 0;

      // Noise history buffer for raw signal
      const NOISE_LEN = 512;
      let noiseBuffer = new Float32Array(NOISE_LEN).map(() => (Math.random() * 2 - 1));

      // Spike state
      let spikes = [];
      function maybeAddSpike() {
        if (Math.random() < 0.04) {
          spikes.push({
            x: Math.random() * W(),
            y: H() / 2,
            amp: (Math.random() * 0.6 + 0.3) * (Math.random() < 0.5 ? 1 : -1),
            life: 1,
            decay: Math.random() * 0.06 + 0.04,
          });
        }
      }

      function draw() {
        ctx.clearRect(0, 0, W(), H());

        const cy = H() / 2;

        /* ── Layer 1: raw noise signal (horizontal scan line) ── */
        // shift buffer left, add new sample
        noiseBuffer.copyWithin(0, 1);
        noiseBuffer[NOISE_LEN - 1] = (Math.random() * 2 - 1) * 0.4;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 0.7;
        for (let x = 0; x < W(); x++) {
          const idx = Math.floor((x / W()) * NOISE_LEN);
          const y = cy + noiseBuffer[idx] * cy * 0.5;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        /* ── Layer 2: main signal — jagged, not smooth ── */
        // Use multiple harmonics with sharp wrap
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 4;

        for (let x = 0; x <= W(); x += 1) {
          const t = x / W();
          // base wave
          let y = Math.sin(t * Math.PI * 2 * 1.0 + phase) * cy * 0.22;
          // add harmonics for harshness
          y += Math.sin(t * Math.PI * 2 * 3.3 + phase * 1.7) * cy * 0.09;
          y += Math.sin(t * Math.PI * 2 * 7.1 + phase * 2.3) * cy * 0.04;
          // add noise grain
          y += (Math.random() * 2 - 1) * cy * 0.025;
          // hard clip / fold — makes it angular
          y = Math.max(-cy * 0.5, Math.min(cy * 0.5, y));

          x === 0 ? ctx.moveTo(x, cy + y) : ctx.lineTo(x, cy + y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        /* ── Layer 3: second offset line ── */
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= W(); x += 2) {
          const t = x / W();
          let y = Math.sin(t * Math.PI * 2 * 2.1 + phase * 0.8 + 1.2) * cy * 0.14;
          y += Math.sin(t * Math.PI * 2 * 5.5 + phase * 1.9) * cy * 0.05;
          y += (Math.random() * 2 - 1) * cy * 0.015;
          y = Math.max(-cy * 0.4, Math.min(cy * 0.4, y));
          x === 0 ? ctx.moveTo(x, cy + y) : ctx.lineTo(x, cy + y);
        }
        ctx.stroke();

        /* ── Layer 4: vertical impulse spikes ── */
        maybeAddSpike();
        ctx.lineWidth = 1;
        spikes = spikes.filter(s => s.life > 0);
        spikes.forEach(s => {
          const h = s.amp * cy * s.life;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255,255,255,${s.life * 0.9})`;
          ctx.shadowColor = `rgba(255,255,255,${s.life * 0.4})`;
          ctx.shadowBlur = 6;
          ctx.moveTo(s.x, cy);
          ctx.lineTo(s.x, cy + h);
          // add a tiny horizontal tick at peak
          ctx.moveTo(s.x - 3, cy + h);
          ctx.lineTo(s.x + 3, cy + h);
          ctx.stroke();
          s.life -= s.decay;
        });
        ctx.shadowBlur = 0;

        /* ── Layer 5: sparse vertical scan lines (static feel) ── */
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.04) {
            const sx = Math.random() * W();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 0.5;
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, H());
            ctx.stroke();
          }
        }

        /* ── horizontal center line ── */
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.moveTo(0, cy);
        ctx.lineTo(W(), cy);
        ctx.stroke();

        phase += 0.032; // same speed as before
        requestAnimationFrame(draw);
      }

      draw();
    });
  }

  /* ──────────────────────────────────────
     GLITCH DATA ATTR
  ────────────────────────────────────── */
  document.querySelectorAll('.glitch').forEach(el => {
    el.dataset.text = el.textContent;
  });

  /* ──────────────────────────────────────
     INIT
  ────────────────────────────────────── */
  buildWaveforms();
  showPage('home');

});
function initQuasar(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin:1.5em 0;border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;position:relative;';

  const canvas = document.createElement('canvas');

  const status = document.createElement('div');
  status.style.cssText = `
    padding:8px 16px;border-top:1px solid #21262d;background:#161b22;
    color:#484f58;font-family:monospace;font-size:12px;text-align:center;
  `;
  status.textContent = 'a photon left a quasar 5 billion years ago. it has been travelling ever since.';

  wrapper.appendChild(canvas);
  wrapper.appendChild(status);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let time = 0;

  // Phases: 'travelling', 'arrived', 'committed'
  let phase = 'travelling';
  let photonX = 0;
  let commitTime = 0;
  let yearCount = 0;
  let chosenPath = 0; // which lensed path survives on observation
  const totalYears = 5000000000;
  const travelDuration = 400; // frames to cross

  // Quadratic bezier for the two gravitationally lensed paths around the galaxy
  function pathPoint(side, t) {
    const x0 = W * 0.14, y0 = H / 2;
    const x1 = W * 0.5, y1 = side === 0 ? H * 0.18 : H * 0.82;
    const x2 = W * 0.85, y2 = H / 2;
    const mt = 1 - t;
    return {
      x: mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
      y: mt * mt * y0 + 2 * mt * t * y1 + t * t * y2,
    };
  }

  // Stars background
  let stars = [];

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = rect.width;
    H = Math.min(240, W * 0.4);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Generate stars
    stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 1.5 + 0.3,
        brightness: Math.random() * 0.4 + 0.1,
      });
    }
  }

  function formatYears(y) {
    if (y >= 1000000000) return (y / 1000000000).toFixed(1) + ' billion years';
    if (y >= 1000000) return (y / 1000000).toFixed(0) + ' million years';
    if (y >= 1000) return (y / 1000).toFixed(0) + ',000 years';
    return Math.floor(y) + ' years';
  }

  function drawStars() {
    for (const s of stars) {
      const twinkle = s.brightness + Math.sin(time * 0.02 + s.x) * 0.1;
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawQuasar() {
    const qx = W * 0.08;
    const qy = H / 2;

    // Glow
    const grad = ctx.createRadialGradient(qx, qy, 0, qx, qy, 20);
    grad.addColorStop(0, '#e3b34180');
    grad.addColorStop(0.5, '#e3b34120');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(qx, qy, 20 + Math.sin(time * 0.03) * 3, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#e3b341';
    ctx.beginPath();
    ctx.arc(qx, qy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#484f58';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('quasar', qx, qy + 30);
    ctx.fillText('5 billion years ago', qx, qy + 42);
  }

  function drawGalaxy() {
    const gx = W * 0.5;
    const gy = H / 2;

    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 16);
    grad.addColorStop(0, '#a371f760');
    grad.addColorStop(0.6, '#a371f715');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(gx, gy, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a371f7';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 8, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#484f58';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('galaxy', gx, gy + 24);
    ctx.fillText('(gravitational lens)', gx, gy + 36);
  }

  function drawLensedPaths() {
    // Both paths alive while the transaction is open; only the surviving one after
    for (let side = 0; side < 2; side++) {
      if (phase === 'committed' && side !== chosenPath) continue;

      ctx.strokeStyle = phase === 'committed' ? '#58a6ff' : '#e3b341';
      ctx.globalAlpha = phase === 'committed' ? 0.8 : 0.15 + Math.sin(time * 0.04 + side * Math.PI) * 0.05;
      ctx.lineWidth = phase === 'committed' ? 2 : 1;
      if (phase !== 'committed') ctx.setLineDash([3, 5]);
      ctx.beginPath();
      const start = pathPoint(side, 0);
      ctx.moveTo(start.x, start.y);
      for (let t = 0.05; t <= 1.001; t += 0.05) {
        const p = pathPoint(side, t);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  function drawTelescope() {
    const tx = W * 0.9;
    const ty = H / 2;

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔭', tx, ty);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#484f58';
    ctx.font = '10px sans-serif';
    ctx.fillText('you', tx, ty + 28);
    ctx.fillText('right now', tx, ty + 40);

    if (phase === 'arrived') {
      // Pulsing "click" hint
      const pulse = 0.5 + Math.sin(time * 0.1) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#58a6ff';
      ctx.font = '11px sans-serif';
      ctx.fillText('click to observe', tx, ty - 28);
      ctx.globalAlpha = 1;
    }
  }

  function drawPhoton() {
    if (phase === 'committed') return;

    const progress = Math.min(photonX / travelDuration, 1);

    // One photon, both paths at once — a ghost on each side of the lens
    for (let side = 0; side < 2; side++) {
      const pos = pathPoint(side, progress);

      // Trail along the curve
      const trailSteps = 20;
      for (let i = 1; i <= trailSteps; i++) {
        const tt = progress - i * 0.008;
        if (tt < 0) break;
        const tp = pathPoint(side, tt);
        ctx.globalAlpha = (1 - i / trailSteps) * 0.15;
        ctx.fillStyle = '#e3b341';
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Ghost photon — half-real until the transaction closes
      const pulse = 4 + Math.sin(time * 0.08 + side * Math.PI) * 2;
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#e3b341';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pulse + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawTimeline() {
    const y = H - 20;
    const startX = W * 0.08;
    const endX = W * 0.9;

    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    // Year marker
    const progress = phase === 'committed' ? 1 : Math.min(photonX / travelDuration, 1);
    const markerX = startX + (endX - startX) * progress;

    ctx.fillStyle = phase === 'committed' ? '#58a6ff' : '#e3b341';
    ctx.beginPath();
    ctx.arc(markerX, y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#484f58';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('T+0', startX, y + 12);
    ctx.textAlign = 'right';
    ctx.fillText('T+5 billion years', endX, y + 12);
  }

  function drawCommitFlash() {
    if (phase !== 'committed') return;
    const e = time - commitTime;

    // Short bright white flash
    if (e < 8) {
      const alpha = 1 - e / 8;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Committed dot at telescope
    ctx.fillStyle = '#58a6ff';
    ctx.beginPath();
    ctx.arc(W * 0.85, H / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStatusLabel() {
    if (phase === 'travelling' || phase === 'arrived') {
      ctx.fillStyle = '#e3b341';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('status: staged. not pushed.', W / 2, 18);
    } else if (phase === 'committed') {
      ctx.fillStyle = '#58a6ff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('git commit && git push', W / 2, 18);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawStars();
    drawLensedPaths();
    drawGalaxy();
    drawQuasar();
    drawTelescope();
    drawTimeline();
    drawPhoton();
    drawCommitFlash();
    drawStatusLabel();
  }

  function update() {
    if (phase === 'travelling') {
      photonX += 1;
      // Accelerating year count
      const progress = photonX / travelDuration;
      yearCount = totalYears * (progress * progress); // quadratic acceleration
      status.textContent = formatYears(yearCount) + ' in transit. staged. not pushed. waiting.';

      if (photonX >= travelDuration) {
        phase = 'arrived';
        yearCount = totalYears;
        status.textContent = 'photon arrived. 5 billion years, both paths around the galaxy, still open. click the telescope.';
        status.style.color = '#e3b341';
        canvas.style.cursor = 'pointer';
      }
    } else if (phase === 'committed') {
      const e = time - commitTime;
      if (e === 1) {
        status.innerHTML = '<span style="color:#58a6ff">git commit && git push</span> — transaction closed: now. not backdated. for 5 billion years the log held nothing.';
      }
    }
  }

  canvas.addEventListener('click', () => {
    if (phase === 'arrived') {
      phase = 'committed';
      commitTime = time;
      chosenPath = Math.random() < 0.5 ? 0 : 1;
      canvas.style.cursor = 'default';
    }
  });

  function loop() {
    time++;
    update();
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  loop();
}

function tryInitQuasar() {
  const el = document.getElementById('quasar-sim');
  if (el) initQuasar(el);
}

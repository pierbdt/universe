function initDelayedChoice(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin:1.5em 0;border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;position:relative;';

  const canvas = document.createElement('canvas');

  // Status bar
  const status = document.createElement('div');
  status.style.cssText = `
    padding:8px 16px;border-top:1px solid #21262d;background:#161b22;
    color:#484f58;font-family:monospace;font-size:12px;text-align:center;
  `;
  status.textContent = 'photons landing... each one has an entangled twin, still in flight.';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;border-top:1px solid #21262d;';

  const btnErase = document.createElement('button');
  btnErase.textContent = '🧹 Erase twins, then sort dots';
  btnErase.style.cssText = `
    flex:1;padding:12px 6px;border:none;background:#161b22;color:#a371f7;
    font-family:inherit;font-size:13px;cursor:pointer;transition:background 0.2s;
    border-right:1px solid #21262d;
  `;

  const btnKeep = document.createElement('button');
  btnKeep.textContent = '📋 Keep twins\' info, then sort dots';
  btnKeep.style.cssText = `
    flex:1;padding:12px 6px;border:none;background:#161b22;color:#f85149;
    font-family:inherit;font-size:13px;cursor:pointer;transition:background 0.2s;
  `;

  // Filter row — appears after sorting
  const filterRow = document.createElement('div');
  filterRow.style.cssText = 'display:none;border-top:1px solid #21262d;';

  const btnAll = document.createElement('button');
  const btnG1 = document.createElement('button');
  const btnG2 = document.createElement('button');
  const btnReset = document.createElement('button');
  btnReset.textContent = '↻';

  [btnAll, btnG1, btnG2, btnReset].forEach((btn, i) => {
    btn.style.cssText = `
      flex:1;padding:11px 6px;border:none;background:#161b22;color:#8b949e;
      font-family:inherit;font-size:13px;cursor:pointer;transition:background 0.2s;
      ${i < 3 ? 'border-right:1px solid #21262d;' : 'flex:0 0 48px;'}
    `;
    filterRow.appendChild(btn);
  });

  [btnErase, btnKeep, btnAll, btnG1, btnG2, btnReset].forEach(btn => {
    btn.onmouseenter = () => btn.style.background = '#1c2128';
    btn.onmouseleave = () => btn.style.background = '#161b22';
  });

  wrapper.appendChild(canvas);
  wrapper.appendChild(status);
  wrapper.appendChild(btnRow);
  btnRow.appendChild(btnErase);
  btnRow.appendChild(btnKeep);
  wrapper.appendChild(filterRow);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let wallX, screenX, sourceX, slitY1, slitY2, slitH;
  let time = 0;

  // States: 'collecting', 'ready', 'sorted-erase', 'sorted-keep'
  let state = 'collecting';
  let filter = 'all'; // 'all' | 'g1' | 'g2'

  let dots = [];
  let particles = [];
  let twins = [];

  const TARGET_DOTS = 520;

  const COLORS = {
    pending: '#e3b341',
    erase1: '#58a6ff',  // eraser output 1 — stripes
    erase2: '#f85149',  // eraser output 2 — anti-stripes
    keep1: '#3fb950',   // left slit
    keep2: '#a371f7',   // right slit
  };

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = rect.width;
    H = Math.min(360, W * 0.55);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    wallX = W * 0.32;
    screenX = W * 0.76;
    sourceX = W * 0.06;
    slitH = H * 0.06;
    slitY1 = H * 0.38;
    slitY2 = H * 0.58;
  }

  // The full screen pattern is the envelope only — stripes + anti-stripes sum to a blob.
  function envelope(y) {
    const dy = (y - H / 2) / H;
    return Math.exp(-dy * dy / 0.04);
  }

  function fringeProb(y) {
    // Probability this dot's twin exits eraser output 1.
    // Output-1 dots: envelope × cos² (stripes). Output-2: envelope × sin² (anti-stripes).
    const dy = (y - H / 2) / H;
    const f = Math.cos(Math.PI * dy / 0.16);
    return f * f;
  }

  function sampleEnvelope() {
    for (let i = 0; i < 200; i++) {
      const y = Math.random() * H;
      if (Math.random() < envelope(y)) return y;
    }
    return H / 2;
  }

  function spawnParticle() {
    if (state !== 'collecting' || dots.length + particles.length >= TARGET_DOTS) return;

    const targetY = sampleEnvelope();
    const slit = Math.random() < 0.5 ? 0 : 1;
    const slitY = (slit === 0 ? slitY1 : slitY2) + slitH / 2;

    particles.push({
      x: sourceX,
      y: H / 2,
      launchY: H / 2 + (Math.random() - 0.5) * H * 0.6,
      slit: slit,
      slitY: slitY,
      targetY: targetY,
      phase: 'toWall',
      speed: 2.2 + Math.random() * 1,
    });

    // The entangled twin drifts away toward the bottom-left — still in flight
    twins.push({
      x: sourceX + 4,
      y: H / 2,
      vx: -0.5 - Math.random() * 0.5,
      vy: 0.5 + Math.random() * 0.4,
      alpha: 0.5,
    });
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.phase === 'toWall') {
        p.x += p.speed * 1.5;
        const t = (p.x - sourceX) / (wallX - sourceX);
        const ease = t * t;
        const earlyY = H / 2 + (p.launchY - H / 2) * t;
        const lateY = H / 2 + (p.slitY - H / 2) * t;
        p.y = earlyY * (1 - ease) + lateY * ease;
        if (p.x >= wallX) {
          p.x = wallX;
          p.y = p.slitY;
          p.phase = 'toScreen';
        }
      } else {
        p.x += p.speed * 1.4;
        const t = (p.x - wallX) / (screenX - wallX);
        p.y = p.slitY + (p.targetY - p.slitY) * t;
        if (p.x >= screenX) {
          dots.push({
            x: screenX + Math.random() * (W - screenX - 8) + 4,
            y: p.targetY,
            out1: Math.random() < fringeProb(p.targetY), // twin's eraser output — decided by the correlations, revealed later
            slit: p.slit,
            age: 0,
          });
          particles.splice(i, 1);

          if (dots.length >= TARGET_DOTS && state === 'collecting') {
            state = 'ready';
            status.textContent = `${TARGET_DOTS} dots. one blob. no stripes. the twins are still in flight — what do you do to them?`;
            status.style.color = '#f0f6fc';
          } else if (dots.length % 30 === 0) {
            status.textContent = `${dots.length} dots landed. no pattern. each twin still in flight...`;
          }
        }
      }
    }
  }

  function updateTwins() {
    for (let i = twins.length - 1; i >= 0; i--) {
      const t = twins[i];
      t.x += t.vx;
      t.y += t.vy;
      if (t.x < 8 || t.y > H - 8) {
        t.alpha -= 0.03;
        t.vx = 0;
        t.vy = 0;
      }
      if (t.alpha <= 0) twins.splice(i, 1);
    }
  }

  function setFilterStyles() {
    const groups = { all: btnAll, g1: btnG1, g2: btnG2 };
    for (const key in groups) {
      groups[key].style.borderBottom = filter === key ? '2px solid #f0f6fc' : '2px solid transparent';
    }
  }

  function sort(erase) {
    state = erase ? 'sorted-erase' : 'sorted-keep';
    filter = 'all';
    btnRow.style.display = 'none';
    filterRow.style.display = 'flex';

    btnAll.textContent = 'All dots';
    if (erase) {
      btnG1.textContent = '● Output 1';
      btnG1.style.color = COLORS.erase1;
      btnG2.textContent = '● Output 2';
      btnG2.style.color = COLORS.erase2;
      status.innerHTML = '<span style="color:#a371f7">🧹 twins erased.</span> the eraser has two outputs. sort the dots you already have — they never move.';
    } else {
      btnG1.textContent = '● Left slit';
      btnG1.style.color = COLORS.keep1;
      btnG2.textContent = '● Right slit';
      btnG2.style.color = COLORS.keep2;
      status.innerHTML = '<span style="color:#f85149">📋 twins measured: which slit.</span> sort the dots you already have — they never move.';
    }
    setFilterStyles();
  }

  function setFilter(f) {
    if (state !== 'sorted-erase' && state !== 'sorted-keep') return;
    filter = f;
    setFilterStyles();

    const erase = state === 'sorted-erase';
    if (erase) {
      if (f === 'g1') status.innerHTML = '<span style="color:#58a6ff">output 1: stripes.</span> these dots were on the screen the whole time.';
      else if (f === 'g2') status.innerHTML = '<span style="color:#f85149">output 2: anti-stripes.</span> offset exactly so that output 1 + output 2 = blob.';
      else status.textContent = 'all dots: still the blob. nothing moved. the stripes were hiding inside it.';
    } else {
      if (f === 'all') status.textContent = 'all dots: the blob.';
      else status.innerHTML = 'sorted by slit: <span style="color:#f0f6fc">still a blob.</span> no stripes in any subset. keeping the info means there is no key — and nothing encrypted.';
    }
  }

  function dotColor(d) {
    if (state === 'sorted-erase') return d.out1 ? COLORS.erase1 : COLORS.erase2;
    if (state === 'sorted-keep') return d.slit === 0 ? COLORS.keep1 : COLORS.keep2;
    return COLORS.pending;
  }

  function dotInFilter(d) {
    if (filter === 'all') return true;
    if (state === 'sorted-erase') return filter === 'g1' ? d.out1 : !d.out1;
    return filter === 'g1' ? d.slit === 0 : d.slit === 1;
  }

  function drawWall() {
    ctx.fillStyle = '#30363d';
    ctx.fillRect(wallX - 2, 0, 4, slitY1);
    ctx.fillRect(wallX - 2, slitY1 + slitH, 4, slitY2 - slitY1 - slitH);
    ctx.fillRect(wallX - 2, slitY2 + slitH, 4, H - slitY2 - slitH);
    ctx.fillStyle = '#58a6ff15';
    ctx.fillRect(wallX - 1, slitY1, 2, slitH);
    ctx.fillRect(wallX - 1, slitY2, 2, slitH);
  }

  function drawScreen() {
    ctx.fillStyle = '#161b22';
    ctx.fillRect(screenX, 0, W - screenX, H);
    ctx.strokeStyle = '#21262d';
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, H);
    ctx.stroke();
  }

  function drawParticles() {
    ctx.fillStyle = '#e3b341';
    for (const p of particles) {
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTwins() {
    ctx.fillStyle = '#e3b341';
    for (const t of twins) {
      ctx.globalAlpha = t.alpha * 0.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (state === 'collecting' || state === 'ready') {
      ctx.fillStyle = '#484f58';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('↙ entangled twins, still in flight', 10, H - 10);
    }
  }

  function drawDots() {
    for (const d of dots) {
      const inFilter = dotInFilter(d);
      const baseAlpha = Math.min(d.age / 10, 0.85);
      ctx.fillStyle = dotColor(d);
      ctx.globalAlpha = inFilter ? baseAlpha : 0.07;
      ctx.beginPath();
      ctx.arc(d.x, d.y, inFilter && filter !== 'all' ? 2 : 1.5, 0, Math.PI * 2);
      ctx.fill();
      d.age++;
    }
    ctx.globalAlpha = 1;
  }

  function drawLabels() {
    ctx.fillStyle = '#e3b341';
    ctx.beginPath();
    ctx.arc(sourceX, H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#484f58';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('source', sourceX, H / 2 + 20);
    ctx.fillText('screen', screenX + (W - screenX) / 2, H - 8);

    if (state === 'sorted-erase' || state === 'sorted-keep') {
      ctx.fillStyle = '#484f58';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('dots never move', W - 12, 16);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawScreen();
    drawWall();
    drawParticles();
    drawTwins();
    drawDots();
    drawLabels();
  }

  function loop() {
    time++;
    if (state === 'collecting') {
      spawnParticle();
      spawnParticle();
      spawnParticle();
    }
    updateParticles();
    updateTwins();
    draw();
    requestAnimationFrame(loop);
  }

  btnErase.addEventListener('click', () => {
    if (state !== 'ready') { status.textContent = 'wait — the photons are still landing...'; return; }
    sort(true);
  });

  btnKeep.addEventListener('click', () => {
    if (state !== 'ready') { status.textContent = 'wait — the photons are still landing...'; return; }
    sort(false);
  });

  btnAll.addEventListener('click', () => setFilter('all'));
  btnG1.addEventListener('click', () => setFilter('g1'));
  btnG2.addEventListener('click', () => setFilter('g2'));

  btnReset.addEventListener('click', () => {
    state = 'collecting';
    filter = 'all';
    dots = [];
    particles = [];
    twins = [];
    btnRow.style.display = 'flex';
    filterRow.style.display = 'none';
    status.textContent = 'photons landing... each one has an entangled twin, still in flight.';
    status.style.color = '#484f58';
  });

  resize();
  window.addEventListener('resize', resize);
  loop();
}

function tryInitDelayedChoice() {
  const el = document.getElementById('delayed-choice-sim');
  if (el) initDelayedChoice(el);
}

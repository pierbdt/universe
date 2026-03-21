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
  status.textContent = 'photons passing through slits... landing on screen... waiting for your decision.';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;border-top:1px solid #21262d;';

  const btnObserve = document.createElement('button');
  btnObserve.textContent = '👀 Observe (git push --force)';
  btnObserve.style.cssText = `
    flex:1;padding:12px 6px;border:none;background:#161b22;color:#f85149;
    font-family:inherit;font-size:13px;cursor:pointer;transition:background 0.2s;
    border-right:1px solid #21262d;
  `;

  const btnIgnore = document.createElement('button');
  btnIgnore.textContent = '🙈 Don\'t Observe (no push)';
  btnIgnore.style.cssText = `
    flex:1;padding:12px 6px;border:none;background:#161b22;color:#58a6ff;
    font-family:inherit;font-size:13px;cursor:pointer;transition:background 0.2s;
  `;

  const btnReset = document.createElement('button');
  btnReset.textContent = '↻ Reset';
  btnReset.style.cssText = `
    display:none;width:100%;padding:10px;border:none;border-top:1px solid #21262d;
    background:#161b22;color:#484f58;font-family:inherit;font-size:13px;cursor:pointer;
    transition:background 0.2s;
  `;

  [btnObserve, btnIgnore, btnReset].forEach(btn => {
    btn.onmouseenter = () => btn.style.background = '#1c2128';
    btn.onmouseleave = () => btn.style.background = '#161b22';
  });

  wrapper.appendChild(canvas);
  wrapper.appendChild(status);
  wrapper.appendChild(btnRow);
  btnRow.appendChild(btnObserve);
  btnRow.appendChild(btnIgnore);
  wrapper.appendChild(btnReset);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let wallX, screenX, sourceX, slitY1, slitY2, slitH;
  let time = 0;

  // States: 'collecting', 'decided-observe', 'decided-ignore', 'animating'
  let state = 'collecting';
  let decisionTime = 0;

  // Each dot stores both possible positions
  let pendingDots = [];    // dots that landed but fate undecided
  let finalDots = [];      // dots after decision, animating to final position
  let particles = [];

  const TARGET_DOTS = 120;

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
    screenX = W * 0.78;
    sourceX = W * 0.06;
    slitH = H * 0.06;
    slitY1 = H * 0.38;
    slitY2 = H * 0.58;
  }

  function interferenceY() {
    for (let i = 0; i < 200; i++) {
      const y = Math.random() * H;
      const dy = (y - H / 2) / H;
      const fringe = Math.cos(Math.PI * dy / 0.12);
      const envelope = Math.exp(-dy * dy / 0.04);
      if (Math.random() < fringe * fringe * envelope) return y;
    }
    return H / 2;
  }

  function particleY() {
    const slit = Math.random() < 0.5 ? slitY1 + slitH / 2 : slitY2 + slitH / 2;
    return slit + (Math.random() - 0.5 + Math.random() - 0.5) * H * 0.06;
  }

  function spawnParticle() {
    if (state !== 'collecting' || pendingDots.length >= TARGET_DOTS) return;

    const waveY = interferenceY();
    const partY = particleY();
    // Neutral landing position — average-ish, slightly random
    const neutralY = H * 0.15 + Math.random() * H * 0.7;
    const screenLandX = screenX + Math.random() * (W - screenX - 8) + 4;

    particles.push({
      x: sourceX,
      y: H / 2,
      speed: 2 + Math.random() * 1,
      // Store both fates
      waveY: waveY,
      particleY: partY,
      neutralY: neutralY,
      screenX: screenLandX,
    });
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.speed * 1.8;

      // Simple path — fly straight across
      if (p.x >= screenX) {
        pendingDots.push({
          x: p.screenX,
          neutralY: p.neutralY,
          waveY: p.waveY,
          particleY: p.particleY,
          currentY: p.neutralY,
          targetY: p.neutralY,
          age: 0,
        });
        particles.splice(i, 1);

        // Update counter
        const remaining = TARGET_DOTS - pendingDots.length;
        if (remaining > 0) {
          status.textContent = `${pendingDots.length} dots landed. ${remaining} more before you decide...`;
        } else if (state === 'collecting') {
          status.textContent = `${pendingDots.length} dots landed. All passed the slits already. Now — did you observe them or not?`;
          status.style.color = '#f0f6fc';
        }
      }
    }
  }

  function decide(observe) {
    state = 'animating';
    decisionTime = time;

    btnRow.style.display = 'none';
    btnReset.style.display = 'block';

    // Assign final positions
    finalDots = pendingDots.map(d => {
      const targetY = observe ? d.particleY : d.waveY;
      return {
        x: d.x,
        currentY: d.currentY,
        targetY: targetY,
        startY: d.currentY,
        age: d.age,
        settled: false,
      };
    });
    pendingDots = [];

    if (observe) {
      status.innerHTML = '<span style="color:#f85149">👀 git push --force</span> — dots rearranging into two lines. History rewritten.';
    } else {
      status.innerHTML = '<span style="color:#58a6ff">🙈 no push</span> — dots rearranging into interference pattern. The wave was always there.';
    }
  }

  function updateFinalDots() {
    const elapsed = time - decisionTime;
    for (const d of finalDots) {
      if (d.settled) continue;
      // Staggered animation — each dot starts moving at a slightly different time
      const delay = Math.random() * 0.3;
      const t = Math.max(0, (elapsed - delay * 60) / 60);
      const ease = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3); // ease out cubic
      d.currentY = d.startY + (d.targetY - d.startY) * ease;
      if (ease >= 1) d.settled = true;
    }
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
    for (const p of particles) {
      // Grey/amber — undecided
      ctx.fillStyle = '#e3b341';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawPendingDots() {
    for (const d of pendingDots) {
      // Amber — staged, not pushed
      const alpha = Math.min(d.age / 10, 0.7);
      ctx.fillStyle = '#e3b341';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.currentY, 1.5, 0, Math.PI * 2);
      ctx.fill();
      d.age++;
    }
    ctx.globalAlpha = 1;
  }

  function drawFinalDots() {
    for (const d of finalDots) {
      const alpha = Math.min(d.age / 10, 0.85);
      // Transition color from amber to blue/red
      const settled = d.settled;
      ctx.fillStyle = settled ? '#58a6ff' : '#e3b341';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.currentY, 1.5, 0, Math.PI * 2);
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

    // Staged indicator
    if (state === 'collecting') {
      ctx.fillStyle = '#e3b341';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('status: staged', W - 12, 16);
      ctx.fillText('not pushed', W - 12, 28);

      // Pulsing "?" over the wall
      const pulse = 0.5 + Math.sin(time * 0.05) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#e3b341';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', wallX, 20);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawScreen();
    drawWall();
    drawParticles();
    drawPendingDots();
    drawFinalDots();
    drawLabels();
  }

  function loop() {
    time++;
    if (state === 'collecting' && time % 2 === 0) spawnParticle();
    updateParticles();
    if (state === 'animating') updateFinalDots();
    draw();
    requestAnimationFrame(loop);
  }

  btnObserve.addEventListener('click', () => {
    if (pendingDots.length < 20) return; // need some dots first
    decide(true);
  });

  btnIgnore.addEventListener('click', () => {
    if (pendingDots.length < 20) return;
    decide(false);
  });

  btnReset.addEventListener('click', () => {
    state = 'collecting';
    pendingDots = [];
    finalDots = [];
    particles = [];
    btnRow.style.display = 'flex';
    btnReset.style.display = 'none';
    status.textContent = 'photons passing through slits... landing on screen... waiting for your decision.';
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

function initQuantumEraser(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin:1.5em 0;border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;position:relative;';

  const canvas = document.createElement('canvas');

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;border-top:1px solid #21262d;';

  const modes = [
    { key: 'none', label: '🙈 No Detector', color: '#58a6ff' },
    { key: 'detector', label: '📷 Detector', color: '#f85149' },
    { key: 'eraser', label: '📷🧹 Detector + Eraser', color: '#a371f7' },
  ];

  let currentMode = 'none';
  const buttons = {};

  modes.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.textContent = m.label;
    btn.style.cssText = `
      flex:1;padding:10px 6px;border:none;background:#161b22;color:${m.color};
      font-family:inherit;font-size:13px;cursor:pointer;transition:background 0.2s;
      ${i < modes.length - 1 ? 'border-right:1px solid #21262d;' : ''}
    `;
    btn.onmouseenter = () => btn.style.background = '#1c2128';
    btn.onmouseleave = () => { if (currentMode !== m.key) btn.style.background = '#161b22'; };
    btn.addEventListener('click', () => setMode(m.key));
    btnRow.appendChild(btn);
    buttons[m.key] = btn;
  });

  wrapper.appendChild(canvas);
  wrapper.appendChild(btnRow);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  let dots = [];
  let particles = [];
  let ripples = [];
  let sourceRipples = [];
  let W, H, dpr;
  let slitY1, slitY2, slitH, wallX, screenX, sourceX, eraserX;
  let time = 0;

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
    screenX = W * 0.82;
    sourceX = W * 0.06;
    eraserX = W * 0.58;
    slitH = H * 0.06;
    slitY1 = H * 0.38;
    slitY2 = H * 0.58;
  }

  function setMode(mode) {
    currentMode = mode;
    dots = [];
    particles = [];
    ripples = [];
    sourceRipples = [];
    modes.forEach(m => {
      buttons[m.key].style.background = currentMode === m.key ? '#1c2128' : '#161b22';
      buttons[m.key].style.borderBottom = currentMode === m.key ? '2px solid ' + m.color : '2px solid transparent';
    });
  }

  function interferenceProb(y) {
    const dy = (y - H / 2) / H;
    const fringe = Math.cos(Math.PI * dy / 0.12);
    const envelope = Math.exp(-dy * dy / 0.04);
    return fringe * fringe * envelope;
  }

  function sampleInterference() {
    for (let i = 0; i < 200; i++) {
      const y = Math.random() * H;
      if (Math.random() < interferenceProb(y)) return y;
    }
    return H / 2;
  }

  function sampleParticle() {
    const slit = Math.random() < 0.5 ? slitY1 + slitH / 2 : slitY2 + slitH / 2;
    return slit + (Math.random() - 0.5 + Math.random() - 0.5) * H * 0.06;
  }

  function isWaveResult() {
    return currentMode === 'none' || currentMode === 'eraser';
  }

  function hasDetector() {
    return currentMode === 'detector' || currentMode === 'eraser';
  }

  function spawnParticle() {
    const waveResult = isWaveResult();
    const targetY = waveResult ? sampleInterference() : sampleParticle();
    const slitCenter = targetY < H / 2 ? slitY1 + slitH / 2 : slitY2 + slitH / 2;
    const spread = (Math.random() - 0.5) * H * 0.6;

    particles.push({
      x: sourceX,
      y: H / 2,
      targetY: targetY,
      slitY: hasDetector() ? slitCenter : H / 2,
      launchY: H / 2 + spread,
      phase: 'toWall',
      wave: !hasDetector(),
      erased: currentMode === 'eraser',
      speed: 1.5 + Math.random() * 0.8,
      born: time,
    });
  }

  function spawnSourceRipple() {
    if (hasDetector()) return;
    sourceRipples.push({ born: time, radius: 0 });
  }

  function spawnSlitRipples() {
    ripples.push(
      { x: wallX + 2, y: slitY1 + slitH / 2, born: time, radius: 0 },
      { x: wallX + 2, y: slitY2 + slitH / 2, born: time, radius: 0 },
    );
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.born++;

      if (p.phase === 'toWall') {
        p.x += p.speed * 1.5;
        const wallProgress = (p.x - sourceX) / (wallX - sourceX);
        const ease = wallProgress * wallProgress;
        const earlyY = H / 2 + (p.launchY - H / 2) * wallProgress;
        const lateY = H / 2 + (p.slitY - H / 2) * wallProgress;
        p.y = earlyY * (1 - ease) + lateY * ease;
        if (p.x >= wallX) {
          p.x = wallX;
          p.y = p.slitY;
          p.phase = 'throughSlit';
          if (!hasDetector()) spawnSlitRipples();
        }
      } else if (p.phase === 'throughSlit') {
        p.x += p.speed * 1.2;
        const progress = (p.x - wallX) / (screenX - wallX);
        p.y = p.slitY + (p.targetY - p.slitY) * progress;

        // Eraser moment — particle becomes wave-like after eraser
        if (p.erased && p.x >= eraserX && !p.erasedTriggered) {
          p.erasedTriggered = true;
          spawnSlitRipples();
        }

        if (p.x >= screenX) {
          dots.push({
            x: screenX + Math.random() * (W - screenX - 4) + 2,
            y: p.targetY,
            age: 0
          });
          particles.splice(i, 1);
        }
      }
    }
  }

  function updateRipples() {
    const speed = 2.0;
    const maxRadius = (screenX - wallX) * 1.2;
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].radius += speed;
      if (ripples[i].radius > maxRadius) ripples.splice(i, 1);
    }
    for (let i = sourceRipples.length - 1; i >= 0; i--) {
      sourceRipples[i].radius += speed * 1.2;
      if (sourceRipples[i].radius > wallX - sourceX + 40) sourceRipples.splice(i, 1);
    }
  }

  function drawWall() {
    ctx.fillStyle = '#30363d';
    ctx.fillRect(wallX - 2, 0, 4, slitY1);
    ctx.fillRect(wallX - 2, slitY1 + slitH, 4, slitY2 - slitY1 - slitH);
    ctx.fillRect(wallX - 2, slitY2 + slitH, 4, H - slitY2 - slitH);

    ctx.fillStyle = hasDetector() ? '#f8514922' : '#58a6ff15';
    ctx.fillRect(wallX - 1, slitY1, 2, slitH);
    ctx.fillRect(wallX - 1, slitY2, 2, slitH);
  }

  function drawDetector() {
    if (!hasDetector()) return;

    const midSlitX = wallX + 14;

    // Spotlight cone
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#f85149';
    ctx.beginPath();
    ctx.moveTo(midSlitX, 28);
    ctx.lineTo(wallX - 20, slitY1);
    ctx.lineTo(wallX + 48, slitY2 + slitH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Camera
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', midSlitX, 16);
    ctx.textBaseline = 'alphabetic';

    // REC
    const blink = Math.sin(time * 0.1) > 0;
    if (blink) {
      ctx.fillStyle = '#f85149';
      ctx.beginPath();
      ctx.arc(midSlitX + 22, 12, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f85149';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('REC', midSlitX + 27, 15);
  }

  function drawEraser() {
    if (currentMode !== 'eraser') return;

    // Eraser device — vertical line with glow
    ctx.strokeStyle = '#a371f7';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(eraserX, H * 0.15);
    ctx.lineTo(eraserX, H * 0.85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;

    // Eraser glow
    const grad = ctx.createLinearGradient(eraserX - 15, 0, eraserX + 15, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, '#a371f720');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(eraserX - 15, H * 0.15, 30, H * 0.7);

    // Label
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧹', eraserX, H * 0.1);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#a371f7';
    ctx.font = '9px monospace';
    ctx.fillText('ERASER', eraserX, H * 0.92);
  }

  function drawSourceRipples() {
    for (const r of sourceRipples) {
      const fade = 1 - r.radius / (wallX - sourceX + 40);
      if (fade <= 0) continue;
      ctx.globalAlpha = fade * 0.35;
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sourceX, H / 2, r.radius, -0.6, 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  function drawSlitRipples() {
    const maxR = (screenX - wallX) * 1.2;
    for (const r of ripples) {
      const fade = 1 - r.radius / maxR;
      if (fade <= 0) continue;
      ctx.globalAlpha = fade * 0.3;
      ctx.strokeStyle = currentMode === 'eraser' ? '#a371f7' : '#58a6ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }

    // Interference bright spots
    for (let i = 0; i < ripples.length - 1; i += 2) {
      const r1 = ripples[i];
      const r2 = ripples[i + 1];
      if (!r1 || !r2) continue;
      const fade = Math.min(1 - r1.radius / maxR, 1 - r2.radius / maxR);
      if (fade <= 0) continue;

      const numPoints = 12;
      for (let n = 0; n < numPoints; n++) {
        const testX = wallX + 10 + (screenX - wallX - 20) * (n / numPoints);
        for (let testY = H * 0.1; testY < H * 0.9; testY += 8) {
          const d1 = Math.sqrt((testX - r1.x) ** 2 + (testY - r1.y) ** 2);
          const d2 = Math.sqrt((testX - r2.x) ** 2 + (testY - r2.y) ** 2);
          const wavelength = 22;
          const pathDiff = Math.abs(d1 - d2);
          const constructive = Math.cos(Math.PI * 2 * pathDiff / wavelength);
          if (constructive > 0.7) {
            const nearR1 = Math.abs(d1 - r1.radius) < 6;
            const nearR2 = Math.abs(d2 - r2.radius) < 6;
            if ((nearR1 || nearR2) && testX < screenX - 5) {
              ctx.globalAlpha = fade * constructive * 0.35;
              ctx.fillStyle = currentMode === 'eraser' ? '#c4a5f7' : '#79c0ff';
              ctx.beginPath();
              ctx.arc(testX, testY, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  function drawParticles() {
    for (const p of particles) {
      if (p.wave) {
        // Wave mode: only ripples
      } else if (p.erased && p.erasedTriggered) {
        // After eraser: particle fades, wave takes over
        ctx.fillStyle = '#a371f7';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // Particle dot
        ctx.fillStyle = '#58a6ff';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(p.x - 5, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x - 10, p.y, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawDots() {
    for (const d of dots) {
      const alpha = Math.min(d.age / 15, 0.85);
      ctx.fillStyle = currentMode === 'eraser' ? '#a371f7' : '#58a6ff';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      d.age++;
    }
    ctx.globalAlpha = 1;
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

  function drawLabels() {
    ctx.fillStyle = '#58a6ff';
    ctx.beginPath();
    ctx.arc(sourceX, H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#484f58';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('source', sourceX, H / 2 + 20);
    ctx.fillText('screen', screenX + (W - screenX) / 2, H - 8);

    // Pattern label
    const col = currentMode === 'eraser' ? '#a371f7' : currentMode === 'detector' ? '#f85149' : '#58a6ff';
    const label = isWaveResult() ? 'interference pattern ≋' : 'two lines ‖';
    ctx.fillStyle = col;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label, W - 12, 20);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawScreen();
    drawSourceRipples();
    drawSlitRipples();
    drawWall();
    drawDetector();
    drawEraser();
    drawParticles();
    drawDots();
    drawLabels();
  }

  let frameCount = 0;
  function loop() {
    time++;
    frameCount++;
    if (frameCount % 4 === 0) spawnParticle();
    if (frameCount % 12 === 0) spawnSourceRipple();
    updateParticles();
    updateRipples();
    draw();
    requestAnimationFrame(loop);
  }

  setMode('none');
  resize();
  window.addEventListener('resize', resize);
  loop();
}

function tryInitQuantumEraser() {
  const el = document.getElementById('quantum-eraser-sim');
  if (el) initQuantumEraser(el);
}

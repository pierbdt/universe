function initDoubleSlit(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin:1.5em 0;border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;position:relative;';

  const canvas = document.createElement('canvas');
  const btn = document.createElement('button');
  btn.textContent = '🙈 Not Observing';
  btn.style.cssText = `
    display:block;width:100%;padding:10px;border:none;border-top:1px solid #21262d;
    background:#161b22;color:#58a6ff;font-family:inherit;font-size:14px;cursor:pointer;
    transition:background 0.2s;
  `;
  btn.onmouseenter = () => btn.style.background = '#1c2128';
  btn.onmouseleave = () => btn.style.background = '#161b22';

  wrapper.appendChild(canvas);
  wrapper.appendChild(btn);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  let observing = false;
  let dots = [];
  let particles = [];
  let ripples = [];       // wavefronts from slits
  let sourceRipples = []; // wavefronts from source
  let W, H, dpr;
  let slitY1, slitY2, slitH, wallX, screenX, sourceX;
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

    wallX = W * 0.38;
    screenX = W * 0.82;
    sourceX = W * 0.08;
    slitH = H * 0.06;
    slitY1 = H * 0.38;
    slitY2 = H * 0.58;
  }

  // Interference pattern probability
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

  function spawnParticle() {
    const targetY = observing ? sampleParticle() : sampleInterference();

    // In particle mode, pick which slit it goes through based on target
    const slitCenter = targetY < H / 2 ? slitY1 + slitH / 2 : slitY2 + slitH / 2;

    // Random launch angle — burst outward from source
    const spread = (Math.random() - 0.5) * H * 0.6;

    particles.push({
      x: sourceX,
      y: H / 2,
      targetY: targetY,
      slitY: observing ? slitCenter : H / 2,
      launchY: H / 2 + spread,  // where it's initially heading
      phase: 'toWall',
      wave: !observing,
      speed: 1.5 + Math.random() * 0.8,
      born: time,
    });
  }

  function spawnSourceRipple() {
    if (observing) return;
    sourceRipples.push({ born: time, radius: 0 });
  }

  function spawnSlitRipples() {
    if (observing) return;
    ripples.push(
      { x: wallX + 2, y: slitY1 + slitH / 2, born: time, radius: 0 },
      { x: wallX + 2, y: slitY2 + slitH / 2, born: time, radius: 0 },
    );
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.phase === 'toWall') {
        p.x += p.speed * 1.5;
        const wallProgress = (p.x - sourceX) / (wallX - sourceX);
        // Start heading toward random launchY, curve toward slit
        // Ease: early = launchY, late = slitY
        const ease = wallProgress * wallProgress; // quadratic — mostly straight, then snaps to slit
        const earlyY = H / 2 + (p.launchY - H / 2) * wallProgress;
        const lateY = H / 2 + (p.slitY - H / 2) * wallProgress;
        p.y = earlyY * (1 - ease) + lateY * ease;
        if (p.x >= wallX) {
          p.x = wallX;
          p.y = p.slitY;
          p.phase = 'throughSlit';
          if (p.wave) spawnSlitRipples();
        }
      } else if (p.phase === 'throughSlit') {
        p.x += p.speed * 1.2;
        const progress = (p.x - wallX) / (screenX - wallX);
        p.y = p.slitY + (p.targetY - p.slitY) * progress;
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

    // Slit glow
    ctx.fillStyle = observing ? '#f8514922' : '#58a6ff15';
    ctx.fillRect(wallX - 1, slitY1, 2, slitH);
    ctx.fillRect(wallX - 1, slitY2, 2, slitH);
  }

  function drawDetectors() {
    if (!observing) return;

    const midSlitX = wallX + 14;
    const midSlitY = (slitY1 + slitY2 + slitH) / 2;

    // Spotlight cone from camera down to slits
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#f85149';
    ctx.beginPath();
    ctx.moveTo(midSlitX, 28);
    ctx.lineTo(wallX - 20, slitY1);
    ctx.lineTo(wallX + 48, slitY2 + slitH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Camera emoji
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', midSlitX, 16);
    ctx.textBaseline = 'alphabetic';

    // "REC" indicator with blinking dot
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
    if (ripples.length === 0) return;

    // Draw interfering wavefronts from both slits
    // We draw them as arcs; where two arcs from paired ripples overlap,
    // we draw brighter to show constructive interference
    const maxR = (screenX - wallX) * 1.2;

    for (const r of ripples) {
      const fade = 1 - r.radius / maxR;
      if (fade <= 0) continue;
      ctx.globalAlpha = fade * 0.3;
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }

    // Draw interference bright spots where paired ripples overlap
    // Check pairs (they spawn in pairs: top slit, bottom slit)
    for (let i = 0; i < ripples.length - 1; i += 2) {
      const r1 = ripples[i];
      const r2 = ripples[i + 1];
      if (!r1 || !r2) continue;

      const fade = Math.min(
        1 - r1.radius / maxR,
        1 - r2.radius / maxR
      );
      if (fade <= 0) continue;

      // Find intersection points of the two circles
      const dy = r2.y - r1.y;
      const numPoints = 12;
      for (let n = 0; n < numPoints; n++) {
        // Check points along the right side where wavefronts meet
        const testX = wallX + 10 + (screenX - wallX - 20) * (n / numPoints);
        for (let testY = H * 0.1; testY < H * 0.9; testY += 8) {
          const d1 = Math.sqrt((testX - r1.x) ** 2 + (testY - r1.y) ** 2);
          const d2 = Math.sqrt((testX - r2.x) ** 2 + (testY - r2.y) ** 2);
          // Constructive: path difference is near integer * wavelength
          const wavelength = 22;
          const pathDiff = Math.abs(d1 - d2);
          const constructive = Math.cos(Math.PI * 2 * pathDiff / wavelength);

          if (constructive > 0.7) {
            // Near both wavefronts?
            const nearR1 = Math.abs(d1 - r1.radius) < 6;
            const nearR2 = Math.abs(d2 - r2.radius) < 6;
            if ((nearR1 || nearR2) && testX < screenX - 5) {
              ctx.globalAlpha = fade * constructive * 0.35;
              ctx.fillStyle = '#79c0ff';
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
        // Wave mode: no visible particle, only ripples represent the wave
      } else {
        // Particle mode: visible dot
        ctx.fillStyle = '#58a6ff';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Small trail
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
      ctx.fillStyle = '#58a6ff';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      d.age++;
    }
    ctx.globalAlpha = 1;
  }

  function drawLabels() {
    // Source
    ctx.fillStyle = '#58a6ff';
    ctx.beginPath();
    ctx.arc(sourceX, H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#484f58';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('source', sourceX, H / 2 + 20);
    ctx.fillText('screen', screenX + (W - screenX) / 2, H - 8);

    // Mode label
    ctx.fillStyle = observing ? '#f85149' : '#58a6ff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(observing ? 'particle mode' : 'wave mode', W - 12, 20);
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

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawScreen();
    drawSourceRipples();
    drawSlitRipples();
    drawWall();
    drawDetectors();
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

  btn.addEventListener('click', () => {
    observing = !observing;
    btn.textContent = observing ? '👀 Observing' : '🙈 Not Observing';
    btn.style.color = observing ? '#f85149' : '#58a6ff';
    dots = [];
    particles = [];
    ripples = [];
    sourceRipples = [];
  });

  resize();
  window.addEventListener('resize', resize);
  loop();
}

function tryInitDoubleSlit() {
  const el = document.getElementById('double-slit-sim');
  if (el) initDoubleSlit(el);
}

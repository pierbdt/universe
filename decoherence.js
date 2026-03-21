function initDecoherence(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin:1.5em 0;border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;position:relative;';

  const canvas = document.createElement('canvas');

  // Slider row
  const sliderRow = document.createElement('div');
  sliderRow.style.cssText = `
    display:flex;align-items:center;gap:12px;padding:10px 16px;
    border-top:1px solid #21262d;background:#161b22;
  `;

  const sliderLabel = document.createElement('span');
  sliderLabel.textContent = '🛡 Isolation';
  sliderLabel.style.cssText = 'color:#484f58;font-size:12px;font-family:monospace;white-space:nowrap;';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = '0';
  slider.style.cssText = 'flex:1;accent-color:#58a6ff;cursor:pointer;';

  const sliderValue = document.createElement('span');
  sliderValue.style.cssText = 'color:#484f58;font-size:12px;font-family:monospace;min-width:32px;text-align:right;';
  sliderValue.textContent = '0%';

  sliderRow.appendChild(sliderLabel);
  sliderRow.appendChild(slider);
  sliderRow.appendChild(sliderValue);

  const status = document.createElement('div');
  status.style.cssText = `
    padding:6px 16px;border-top:1px solid #21262d;background:#161b22;
    color:#484f58;font-family:monospace;font-size:11px;text-align:center;
  `;
  status.textContent = 'you. right now. no isolation. 10²⁵ interactions per nanosecond.';

  wrapper.appendChild(canvas);
  wrapper.appendChild(sliderRow);
  wrapper.appendChild(status);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let time = 0;
  let isolation = 0;

  // The quantum particle in the center
  let coherence = 1.0; // 1 = full wave, 0 = fully collapsed
  let envParticles = [];

  const envTypes = [
    { label: 'air', color: '#8b949e', emoji: '💨' },
    { label: 'photon', color: '#e3b341', emoji: '💡' },
    { label: 'heat', color: '#f85149', emoji: '🔥' },
    { label: 'gravity', color: '#a371f7', emoji: '⬇' },
  ];

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = rect.width;
    H = Math.min(320, W * 0.5);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnEnvParticle() {
    // Spawn from random edge
    const type = envTypes[Math.floor(Math.random() * envTypes.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(W, H) * 0.6;
    const cx = W / 2;
    const cy = H / 2;

    envParticles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: -Math.cos(angle) * (2 + Math.random() * 2),
      vy: -Math.sin(angle) * (2 + Math.random() * 2),
      type: type,
      alive: true,
      age: 0,
      blocked: false,
      blockFade: 0,
    });
  }

  function updateEnvParticles() {
    const cx = W / 2;
    const cy = H / 2;
    const shieldRadius = 50 + isolation * 0.4;

    for (let i = envParticles.length - 1; i >= 0; i--) {
      const p = envParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.age++;

      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check shield collision
      if (!p.blocked && isolation > 5 && dist < shieldRadius) {
        // Chance to block based on isolation
        if (Math.random() * 100 < isolation) {
          p.blocked = true;
          p.blockFade = 1;
          // Bounce off
          const nx = dx / dist;
          const ny = dy / dist;
          p.vx = nx * 2;
          p.vy = ny * 2;
          continue;
        }
      }

      // Hit the quantum particle
      if (!p.blocked && dist < 15) {
        // Decohere!
        coherence = Math.max(0, coherence - 0.04);
        p.alive = false;
      }

      // Fade blocked particles
      if (p.blocked) {
        p.blockFade -= 0.02;
        if (p.blockFade <= 0) p.alive = false;
      }

      // Off screen
      if (p.age > 200) p.alive = false;

      if (!p.alive) envParticles.splice(i, 1);
    }
  }

  function updateCoherence() {
    // Slowly recover coherence based on isolation level
    const recovery = isolation / 100 * 0.008;
    coherence = Math.min(1, coherence + recovery);

    // At zero isolation, constant bombardment keeps it collapsed
    if (isolation < 5) {
      coherence = Math.max(0, coherence - 0.02);
    }
  }

  function drawShield() {
    if (isolation < 5) return;
    const cx = W / 2;
    const cy = H / 2;
    const radius = 50 + isolation * 0.4;
    const alpha = (isolation / 100) * 0.25;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Shield glow
    const grad = ctx.createRadialGradient(cx, cy, radius - 5, cx, cy, radius + 5);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, '#58a6ff15');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  function drawQuantumParticle() {
    const cx = W / 2;
    const cy = H / 2;

    if (coherence > 0.1) {
      // Wave-like: show oscillating rings
      const numRings = Math.ceil(coherence * 4);
      for (let r = 0; r < numRings; r++) {
        const radius = 10 + r * 8 + Math.sin(time * 0.06 + r) * 3;
        const alpha = coherence * 0.3 * (1 - r / numRings);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }

    // Core particle — blends from wave (blue, large, soft) to collapsed (amber, small, hard)
    const coreRadius = 5 + coherence * 8;
    const pulseR = coherence > 0.3 ? Math.sin(time * 0.08) * 2 : 0;

    // Color blend: blue (wave) to amber (collapsed)
    const r = Math.round(88 + (227 - 88) * (1 - coherence));
    const g = Math.round(166 + (179 - 166) * (1 - coherence));
    const b = Math.round(255 + (65 - 255) * (1 - coherence));

    // Glow
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius + 8 + pulseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Core
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius + pulseR, 0, Math.PI * 2);
    ctx.fill();

    // Coherence label
    ctx.fillStyle = '#484f58';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const pct = Math.round(coherence * 100);
    ctx.fillText(`coherence: ${pct}%`, cx, cy + coreRadius + 25);
  }

  function drawEnvParticles() {
    for (const p of envParticles) {
      const alpha = p.blocked ? p.blockFade * 0.6 : 0.6;
      ctx.globalAlpha = alpha;

      if (p.blocked) {
        // Blocked — red spark
        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.type.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawLabels() {
    // Env type labels at edges
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#30363d';

    ctx.fillText('💨 air', W * 0.12, H * 0.15);
    ctx.fillText('💡 photons', W * 0.88, H * 0.15);
    ctx.fillText('🔥 heat', W * 0.12, H * 0.88);
    ctx.fillText('⬇ gravity', W * 0.88, H * 0.88);
  }

  function updateStatus() {
    const pct = Math.round(coherence * 100);
    if (isolation < 5) {
      status.textContent = `you. right now. no isolation. 10²⁵ interactions per nanosecond. coherence: ${pct}%`;
      status.style.color = '#f85149';
    } else if (isolation < 40) {
      status.textContent = `some shielding. particles still getting through. coherence: ${pct}%`;
      status.style.color = '#e3b341';
    } else if (isolation < 80) {
      status.textContent = `heavy isolation. wave holding. but the universe is patient. coherence: ${pct}%`;
      status.style.color = '#58a6ff';
    } else {
      status.textContent = `near-perfect isolation. this is what quantum computers try to do. coherence: ${pct}%`;
      status.style.color = '#a371f7';
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawLabels();
    drawShield();
    drawEnvParticles();
    drawQuantumParticle();
  }

  slider.addEventListener('input', () => {
    isolation = parseInt(slider.value);
    sliderValue.textContent = isolation + '%';
    if (isolation > 50) {
      sliderValue.style.color = '#58a6ff';
    } else if (isolation > 0) {
      sliderValue.style.color = '#e3b341';
    } else {
      sliderValue.style.color = '#484f58';
    }
  });

  function loop() {
    time++;

    // Spawn rate based on isolation (less isolation = more bombardment)
    const spawnRate = Math.max(1, Math.floor(1 + (100 - isolation) / 15));
    if (time % 2 === 0) {
      for (let i = 0; i < spawnRate; i++) {
        spawnEnvParticle();
      }
    }

    updateEnvParticles();
    updateCoherence();
    if (time % 10 === 0) updateStatus();
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  loop();
}

function tryInitDecoherence() {
  const el = document.getElementById('decoherence-sim');
  if (el) initDecoherence(el);
}

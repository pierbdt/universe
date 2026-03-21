function initEntanglement(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin:1.5em 0;border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;position:relative;';

  const canvas = document.createElement('canvas');

  const status = document.createElement('div');
  status.style.cssText = `
    padding:8px 16px;border-top:1px solid #21262d;background:#161b22;
    color:#484f58;font-family:monospace;font-size:12px;text-align:center;
  `;

  const btnReset = document.createElement('button');
  btnReset.textContent = '↻ Entangle Again';
  btnReset.style.cssText = `
    display:none;width:100%;padding:10px;border:none;border-top:1px solid #21262d;
    background:#161b22;color:#484f58;font-family:inherit;font-size:13px;cursor:pointer;
  `;
  btnReset.onmouseenter = () => btnReset.style.background = '#1c2128';
  btnReset.onmouseleave = () => btnReset.style.background = '#161b22';

  wrapper.appendChild(canvas);
  wrapper.appendChild(status);
  wrapper.appendChild(btnReset);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let time = 0;

  // Phases: 'merging', 'separating', 'waiting', 'collapsed', 'showing-no-signal'
  let phase = 'merging';
  let phaseStart = 0;

  let particleA = {};
  let particleB = {};
  let resultA = '';  // 'up' or 'down'
  let resultB = '';
  let clickedParticle = ''; // 'A' or 'B'
  let flashTime = 0;
  let noSignalAlpha = 0;

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = rect.width;
    H = Math.min(280, W * 0.45);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetState() {
    phase = 'merging';
    phaseStart = time;
    resultA = '';
    resultB = '';
    clickedParticle = '';
    noSignalAlpha = 0;
    particleA = { x: W * 0.15, y: H / 2 };
    particleB = { x: W * 0.85, y: H / 2 };
    status.textContent = 'two particles approaching...';
    status.style.color = '#484f58';
    btnReset.style.display = 'none';
    canvas.style.cursor = 'default';
  }

  function elapsed() { return time - phaseStart; }

  function setPhase(p) {
    phase = p;
    phaseStart = time;
  }

  function update() {
    const e = elapsed();
    const cx = W / 2;
    const cy = H / 2;

    if (phase === 'merging') {
      const t = Math.min(e / 80, 1);
      const ease = 1 - Math.pow(1 - t, 2);
      particleA.x = W * 0.15 + (cx - W * 0.15) * ease;
      particleB.x = W * 0.85 - (W * 0.85 - cx) * ease;
      particleA.y = cy;
      particleB.y = cy;

      if (t >= 1) {
        status.textContent = 'git merge particle-A particle-B — one commit. entangled.';
        status.style.color = '#a371f7';
        setPhase('merged');
      }
    } else if (phase === 'merged') {
      if (e > 50) {
        status.textContent = 'separating... distance doesn\'t matter. same commit.';
        setPhase('separating');
      }
    } else if (phase === 'separating') {
      const t = Math.min(e / 90, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      particleA.x = cx - (cx - W * 0.18) * ease;
      particleB.x = cx + (W * 0.82 - cx) * ease;

      if (t >= 1) {
        status.textContent = 'click either particle to observe it.';
        status.style.color = '#e3b341';
        canvas.style.cursor = 'pointer';
        setPhase('waiting');
      }
    } else if (phase === 'waiting') {
      // Pulsing, waiting for click
      particleA.y = cy + Math.sin(time * 0.04) * 3;
      particleB.y = cy + Math.sin(time * 0.04 + Math.PI) * 3;
    } else if (phase === 'collapsed') {
      if (e > 5) {
        setPhase('showing-no-signal');
      }
    } else if (phase === 'showing-no-signal') {
      noSignalAlpha = Math.min(e / 30, 1);
      if (e > 80) {
        btnReset.style.display = 'block';
      }
    }
  }

  function drawConnectionLine() {
    if (phase === 'waiting' || phase === 'collapsed' || phase === 'showing-no-signal') {
      // Dashed line connecting them — shared commit
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(particleA.x, particleA.y);
      ctx.lineTo(particleB.x, particleB.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  function drawParticle(p, label, result, isClicked) {
    const radius = 18;

    if (result) {
      // Collapsed state
      const isUp = result === 'up';
      const color = isUp ? '#58a6ff' : '#f85149';

      // Glow
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Circle
      ctx.fillStyle = '#0d1117';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Arrow
      ctx.fillStyle = color;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isUp ? '↑' : '↓', p.x, p.y);

      // Spin label
      ctx.font = '10px monospace';
      ctx.fillText(isUp ? 'spin up' : 'spin down', p.x, p.y + radius + 14);
      ctx.textBaseline = 'alphabetic';
    } else if (phase === 'waiting') {
      // Superposition — pulsing amber
      const pulse = 0.6 + Math.sin(time * 0.06) * 0.3;

      ctx.globalAlpha = pulse * 0.15;
      ctx.fillStyle = '#e3b341';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 6 + Math.sin(time * 0.08) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#0d1117';
      ctx.strokeStyle = '#e3b341';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Superposition arrows
      ctx.globalAlpha = 0.4 + Math.sin(time * 0.05) * 0.2;
      ctx.fillStyle = '#58a6ff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↑', p.x - 6, p.y);
      ctx.fillStyle = '#f85149';
      ctx.fillText('↓', p.x + 6, p.y);
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    } else {
      // Pre-entangle or merging — simple circle
      const merging = phase === 'merged';
      const glow = merging ? 0.5 + Math.sin(time * 0.15) * 0.3 : 0;

      if (glow > 0) {
        ctx.globalAlpha = glow * 0.2;
        ctx.fillStyle = '#a371f7';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = '#0d1117';
      ctx.strokeStyle = merging ? '#a371f7' : '#58a6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = merging ? '#a371f7' : '#58a6ff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, p.x, p.y);
      ctx.textBaseline = 'alphabetic';
    }

    // Location label
    if (phase === 'waiting' || phase === 'collapsed' || phase === 'showing-no-signal') {
      ctx.fillStyle = '#484f58';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label === 'A' ? '📍 New York' : '📍 Tokyo', p.x, p.y - radius - 10);
    }
  }

  function drawNoSignal() {
    if (phase !== 'showing-no-signal') return;

    const cx = W / 2;
    const cy = H / 2;

    ctx.globalAlpha = noSignalAlpha * 0.8;

    // X marks across the connection
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 2;
    const numX = 3;
    for (let i = 0; i < numX; i++) {
      const t = (i + 1) / (numX + 1);
      const x = particleA.x + (particleB.x - particleA.x) * t;
      const y = cy;
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(x - s, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s);
      ctx.lineTo(x - s, y + s);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#f85149';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('no signal sent', cx, cy - 20);
    ctx.fillStyle = '#484f58';
    ctx.font = '10px monospace';
    ctx.fillText('same commit forces consistency', cx, cy + 20);

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  function drawMergeFlash() {
    if (phase !== 'merged') return;
    const e = elapsed();
    if (e > 15) return;
    const alpha = 1 - e / 15;
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = '#a371f7';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 30 + e * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawCollapseFlash() {
    if (phase !== 'collapsed' && phase !== 'showing-no-signal') return;
    const e = time - flashTime;
    if (e > 20) return;
    const alpha = 1 - e / 20;

    // Flash on clicked particle
    const p = clickedParticle === 'A' ? particleA : particleB;
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 25 + e * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawConnectionLine();
    drawMergeFlash();
    drawCollapseFlash();
    drawParticle(particleA, 'A', resultA, clickedParticle === 'A');
    drawParticle(particleB, 'B', resultB, clickedParticle === 'B');
    drawNoSignal();
  }

  function handleClick(e) {
    if (phase !== 'waiting') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);

    const dA = Math.sqrt((mx - particleA.x) ** 2 + (my - particleA.y) ** 2);
    const dB = Math.sqrt((mx - particleB.x) ** 2 + (my - particleB.y) ** 2);

    let clicked = null;
    if (dA < 30) clicked = 'A';
    else if (dB < 30) clicked = 'B';
    else return;

    clickedParticle = clicked;
    flashTime = time;

    // Random result for clicked particle
    const clickedUp = Math.random() < 0.5;
    if (clicked === 'A') {
      resultA = clickedUp ? 'up' : 'down';
      resultB = clickedUp ? 'down' : 'up';
    } else {
      resultB = clickedUp ? 'up' : 'down';
      resultA = clickedUp ? 'down' : 'up';
    }

    canvas.style.cursor = 'default';
    setPhase('collapsed');

    const clickedLabel = clicked === 'A' ? 'New York' : 'Tokyo';
    const otherLabel = clicked === 'A' ? 'Tokyo' : 'New York';
    status.innerHTML = `<span style="color:#f0f6fc">observed ${clickedLabel}.</span> ${otherLabel} collapsed instantly. no signal. same commit.`;
  }

  canvas.addEventListener('click', handleClick);

  btnReset.addEventListener('click', resetState);

  function loop() {
    time++;
    update();
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  resetState();
  window.addEventListener('resize', resize);
  loop();
}

function tryInitEntanglement() {
  const el = document.getElementById('entanglement-sim');
  if (el) initEntanglement(el);
}

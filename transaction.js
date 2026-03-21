/* transaction.js — Transactional Interpretation handshake animation */

function initTransaction(container) {
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;';
  container.appendChild(wrapper);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;';
  wrapper.appendChild(canvas);

  const status = document.createElement('div');
  status.style.cssText = 'padding:8px 12px;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#8b949e;background:#161b22;border-top:1px solid #21262d;';
  status.textContent = 'initializing...';
  wrapper.appendChild(status);

  const ctx = canvas.getContext('2d');
  let w, h, dpr, animId;

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    w = rect.width;
    h = Math.min(320, w * 0.5);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);

  // State
  const PHASE_OFFER = 0;
  const PHASE_CONFIRM = 1;
  const PHASE_FLASH = 2;
  const PHASE_COLLAPSE = 3;
  const PHASE_DONE = 4;

  let phase, frame, offerRadius, confirmRadius;
  let ghostPaths, confirmedPath, flashAlpha, particleX, doneTimer;

  function randomPaths(count) {
    const paths = [];
    for (let i = 0; i < count; i++) {
      const cp1y = h * 0.15 + Math.random() * h * 0.7;
      const cp2y = h * 0.15 + Math.random() * h * 0.7;
      paths.push({ cp1y, cp2y, alpha: 0.35 });
    }
    return paths;
  }

  function resetState() {
    phase = PHASE_OFFER;
    frame = 0;
    offerRadius = 0;
    confirmRadius = 0;
    ghostPaths = randomPaths(5);
    confirmedPath = ghostPaths[Math.floor(Math.random() * ghostPaths.length)];
    flashAlpha = 0;
    particleX = -1;
    doneTimer = 0;
  }

  resetState();

  const emitterX = 60;
  const receiverXFn = () => w - 60;

  function drawNode(x, y, label, color) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '11px -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
    ctx.fillStyle = '#8b949e';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 26);
  }

  function drawPath(p, color, alpha) {
    const rx = receiverXFn();
    ctx.beginPath();
    ctx.moveTo(emitterX, h / 2);
    ctx.bezierCurveTo(emitterX + (rx - emitterX) * 0.33, p.cp1y, emitterX + (rx - emitterX) * 0.66, p.cp2y, rx, h / 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawWaveArcs(originX, radius, maxRadius, color, direction) {
    const rx = receiverXFn();
    const span = rx - emitterX;
    for (let i = 0; i < 4; i++) {
      const r = radius - i * 30;
      if (r <= 0 || r > maxRadius) continue;
      const progress = r / span;
      const alpha = Math.max(0, 0.6 - progress * 0.5) * (1 - i * 0.2);
      ctx.beginPath();
      if (direction > 0) {
        ctx.arc(originX, h / 2, r, -Math.PI * 0.4, Math.PI * 0.4);
      } else {
        ctx.arc(originX, h / 2, r, Math.PI * 0.6, Math.PI * 1.4);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function tick() {
    const rx = receiverXFn();
    const span = rx - emitterX;

    ctx.clearRect(0, 0, w, h);

    // Background grid dots
    ctx.fillStyle = '#21262d';
    for (let x = 20; x < w; x += 30) {
      for (let y = 20; y < h; y += 30) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Draw ghost paths
    if (phase <= PHASE_COLLAPSE) {
      for (const p of ghostPaths) {
        const a = phase === PHASE_COLLAPSE ? p.alpha : 0.15;
        drawPath(p, '#8b949e', a);
      }
    }

    // Confirmed path
    if (phase >= PHASE_FLASH) {
      drawPath(confirmedPath, '#58a6ff', phase === PHASE_DONE ? 0.8 : 0.5);
    }

    // Offer wave
    if (phase === PHASE_OFFER) {
      offerRadius += 2.5;
      drawWaveArcs(emitterX, offerRadius, span, '#58a6ff', 1);
      if (offerRadius >= span) {
        phase = PHASE_CONFIRM;
        frame = 0;
      }
      status.textContent = 'offer wave broadcasting...';
    }

    // Confirmation wave
    if (phase === PHASE_CONFIRM) {
      confirmRadius += 3;
      // Still show fading offer
      drawWaveArcs(emitterX, offerRadius, span + 100, '#58a6ff', 1);
      drawWaveArcs(rx, confirmRadius, span, '#3fb950', -1);
      if (confirmRadius >= span) {
        phase = PHASE_FLASH;
        frame = 0;
        flashAlpha = 1;
      }
      status.textContent = 'confirmation received';
    }

    // Flash + collapse
    if (phase === PHASE_FLASH) {
      flashAlpha = Math.max(0, flashAlpha - 0.03);
      if (flashAlpha > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha + ')';
        ctx.fillRect(0, 0, w, h);
      }
      if (flashAlpha <= 0) {
        phase = PHASE_COLLAPSE;
        frame = 0;
      }
      status.textContent = 'transaction complete. one possibility survives.';
    }

    // Collapse ghost paths
    if (phase === PHASE_COLLAPSE) {
      let allGone = true;
      for (const p of ghostPaths) {
        if (p === confirmedPath) continue;
        p.alpha = Math.max(0, p.alpha - 0.008);
        if (p.alpha > 0) allGone = false;
      }
      if (allGone) {
        phase = PHASE_DONE;
        frame = 0;
        particleX = 0;
      }
      status.textContent = 'transaction complete. one possibility survives.';
    }

    // Particle travels along confirmed path
    if (phase === PHASE_DONE) {
      particleX = Math.min(1, particleX + 0.012);
      const t = particleX;
      const x0 = emitterX, x3 = rx;
      const x1 = emitterX + span * 0.33, x2 = emitterX + span * 0.66;
      const y0 = h / 2, y1 = confirmedPath.cp1y, y2 = confirmedPath.cp2y, y3 = h / 2;
      const mt = 1 - t;
      const px = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
      const py = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(88,166,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (particleX >= 1) {
        doneTimer++;
        if (doneTimer > 90) resetState();
      }
    }

    // Nodes
    drawNode(emitterX, h / 2, 'emitter', '#58a6ff');
    drawNode(rx, h / 2, 'receiver', '#3fb950');

    frame++;
    animId = requestAnimationFrame(tick);
  }

  // Intersection observer — play when visible
  let running = false;
  const observer = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !running) {
      running = true;
      resetState();
      tick();
    } else if (!entries[0].isIntersecting && running) {
      running = false;
      cancelAnimationFrame(animId);
    }
  }, { threshold: 0.2 });
  observer.observe(wrapper);
}

function tryInitTransaction() {
  var el = document.getElementById('transaction-sim');
  if (el) initTransaction(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitTransaction);
} else {
  tryInitTransaction();
}

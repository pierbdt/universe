/* vacuum.js — Vacuum Fluctuations, particles popping in and out of nothing */

function initVacuum(container) {
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;';
  container.appendChild(wrapper);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;';
  wrapper.appendChild(canvas);

  // Label
  const label = document.createElement('div');
  label.style.cssText = 'padding:6px 12px;font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#484f58;background:#0d1117;text-align:center;border-top:1px solid #161b22;';
  label.textContent = "vacuum fluctuations \u2014 the universe can't even keep nothing as nothing";
  wrapper.appendChild(label);

  // Status bar
  const status = document.createElement('div');
  status.style.cssText = 'padding:8px 12px;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#8b949e;background:#161b22;border-top:1px solid #21262d;';
  status.textContent = 'empty space. not empty.';
  wrapper.appendChild(status);

  const ctx = canvas.getContext('2d');
  let w, h, dpr, animId;

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    w = rect.width;
    h = Math.min(360, w * 0.55);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);

  // Pair object pool
  var pairs = [];
  var totalThisSecond = 0;
  var displayCount = 0;
  var lastSecond = 0;

  function spawnPair() {
    var energy = Math.random();
    var size = 1.5 + energy * 4;
    var lifetime = 15 + Math.floor(Math.random() * 25);
    var cx = 20 + Math.random() * (w - 40);
    var cy = 20 + Math.random() * (h - 40);
    var angle = Math.random() * Math.PI * 2;
    var spread = 4 + energy * 14;

    pairs.push({
      cx: cx,
      cy: cy,
      angle: angle,
      spread: spread,
      size: size,
      lifetime: lifetime,
      age: 0,
      energy: energy
    });
  }

  function tick(timestamp) {
    ctx.clearRect(0, 0, w, h);

    // Subtle background noise
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Faint grid
    ctx.fillStyle = '#161b22';
    for (var gx = 0; gx < w; gx += 40) {
      for (var gy = 0; gy < h; gy += 40) {
        ctx.fillRect(gx, gy, 1, 1);
      }
    }

    // Spawn new pairs — rate scales with canvas area
    var area = w * h;
    var spawnRate = Math.max(1, Math.floor(area / 8000));
    for (var s = 0; s < spawnRate; s++) {
      if (Math.random() < 0.35) {
        spawnPair();
        totalThisSecond++;
      }
    }

    // Update and draw pairs
    var alive = [];
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      p.age++;

      var t = p.age / p.lifetime;
      if (t > 1) {
        // Annihilation flash
        var flashR = p.size * 2;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, flashR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
        continue; // remove from pool
      }

      alive.push(p);

      // Separation: pairs expand then contract
      var sep;
      if (t < 0.3) {
        sep = (t / 0.3) * p.spread;
      } else if (t < 0.7) {
        sep = p.spread;
      } else {
        sep = p.spread * (1 - (t - 0.7) / 0.3);
      }

      var x1 = p.cx + Math.cos(p.angle) * sep;
      var y1 = p.cy + Math.sin(p.angle) * sep;
      var x2 = p.cx - Math.cos(p.angle) * sep;
      var y2 = p.cy - Math.sin(p.angle) * sep;

      // Fade in/out
      var alpha = 1;
      if (t < 0.15) alpha = t / 0.15;
      else if (t > 0.8) alpha = (1 - t) / 0.2;
      alpha = Math.max(0, Math.min(1, alpha));

      // Connecting line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(139,148,158,' + (alpha * 0.25) + ')';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Particle (blue)
      ctx.beginPath();
      ctx.arc(x1, y1, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(88,166,255,' + alpha + ')';
      ctx.fill();

      // Glow
      if (p.energy > 0.5) {
        ctx.beginPath();
        ctx.arc(x1, y1, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(88,166,255,' + (alpha * 0.15) + ')';
        ctx.fill();
      }

      // Antiparticle (red)
      ctx.beginPath();
      ctx.arc(x2, y2, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248,81,73,' + alpha + ')';
      ctx.fill();

      if (p.energy > 0.5) {
        ctx.beginPath();
        ctx.arc(x2, y2, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(248,81,73,' + (alpha * 0.15) + ')';
        ctx.fill();
      }
    }

    pairs = alive;

    // Update counter every second
    var sec = Math.floor(timestamp / 1000);
    if (sec !== lastSecond) {
      displayCount = totalThisSecond;
      totalThisSecond = 0;
      lastSecond = sec;
    }

    status.textContent = 'empty space. not empty. ' + displayCount + ' virtual particles this second.';

    animId = requestAnimationFrame(tick);
  }

  // Intersection observer
  let running = false;
  const observer = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !running) {
      running = true;
      pairs = [];
      totalThisSecond = 0;
      displayCount = 0;
      tick(performance.now());
    } else if (!entries[0].isIntersecting && running) {
      running = false;
      cancelAnimationFrame(animId);
    }
  }, { threshold: 0.2 });
  observer.observe(wrapper);
}

function tryInitVacuum() {
  var el = document.getElementById('vacuum-sim');
  if (el) initVacuum(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitVacuum);
} else {
  tryInitVacuum();
}

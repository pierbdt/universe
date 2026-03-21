/* git-log.js — The Universe's git log, scrolling terminal animation */

function initGitLog(container) {
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'border:1px solid #21262d;border-radius:8px;overflow:hidden;background:#0d1117;';
  container.appendChild(wrapper);

  // Terminal header bar
  const header = document.createElement('div');
  header.style.cssText = 'padding:6px 12px;background:#161b22;border-bottom:1px solid #21262d;display:flex;align-items:center;gap:6px;';
  const dots = ['#f85149', '#e3b341', '#3fb950'];
  dots.forEach(function (c) {
    const dot = document.createElement('span');
    dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + c + ';display:inline-block;opacity:0.8;';
    header.appendChild(dot);
  });
  const title = document.createElement('span');
  title.style.cssText = 'color:#8b949e;font:12px monospace;margin-left:8px;';
  title.textContent = 'git log --oneline --all';
  header.appendChild(title);
  wrapper.appendChild(header);

  // Terminal body
  const terminal = document.createElement('div');
  const termHeight = 320;
  terminal.style.cssText = 'height:' + termHeight + 'px;overflow:hidden;padding:10px 12px;font:13px/1.6 "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;color:#3fb950;background:#0d1117;position:relative;';
  wrapper.appendChild(terminal);

  // Status bar
  const status = document.createElement('div');
  status.style.cssText = 'padding:8px 12px;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#8b949e;background:#161b22;border-top:1px solid #21262d;';
  status.textContent = 'commits: 0';
  wrapper.appendChild(status);

  const commits = [
    { hash: '0000001', msg: 'Big Bang', time: 'T+0', author: 'Universe' },
    { hash: '0000002', msg: 'First hydrogen atoms form', time: 'T+380,000 years', author: 'Universe' },
    { hash: '0000003', msg: 'First stars ignite', time: 'T+200,000,000 years', author: 'Universe' },
    { hash: '0000004', msg: 'Heavy elements forged in supernovae', time: 'T+1,000,000,000 years', author: 'Universe' },
    { hash: '0000005', msg: 'Solar system forms', time: 'T+9,200,000,000 years', author: 'Universe' },
    { hash: '0000006', msg: 'Earth forms', time: 'T+9,300,000,000 years', author: 'Universe' },
    { hash: '0000007', msg: 'First life', time: 'T+10,000,000,000 years', author: 'Universe' },
    { hash: '0000008', msg: 'Dinosaurs', time: 'T+13,560,000,000 years', author: 'Universe' },
    { hash: '0000009', msg: 'Humans', time: 'T+13,799,800,000 years', author: 'Universe' },
    { hash: '000000a', msg: 'You. Reading this. Right now.', time: 'T+13,800,000,000 years', author: 'Universe' }
  ];

  // Rapid-fire commit message fragments for the burst phase
  const burstMessages = [
    'photon absorbed by electron in Andromeda',
    'quark-gluon interaction #4.2e17',
    'neutrino passes through Earth',
    'virtual pair annihilation in sector 7G',
    'hydrogen bond formed in water molecule',
    'muon decays in upper atmosphere',
    'proton tunnels through Coulomb barrier',
    'electron entangled across 12 light-years',
    'graviton exchange (maybe)',
    'Higgs field interaction',
    'dark energy expands void #9.1e42',
    'cosmic ray strikes nitrogen atom',
    'W boson mediates beta decay',
    'vacuum fluctuation #uncountable',
    'photosynthesis captures photon',
    'radioactive decay in uranium-238',
    'neutron star pulses',
    'black hole emits Hawking radiation',
    'tau neutrino oscillation detected',
    'strong force confines quarks',
    'electromagnetic wave propagates',
    'positron meets electron — annihilated',
    'quantum decoherence event',
    'wavefunction collapses (or branches)',
    'entropy increases by 1 bit'
  ];

  let lines = [];
  let commitIndex = 0;
  let commitCount = 0;
  let burstPhase = false;
  let cursorVisible = false;
  let cursorBlinkCount = 0;
  let pauseAfterMain = 0;
  let timerId = null;
  let burstCounter = 0;

  function makeLine(c) {
    return '<span style="color:#e3b341">' + c.hash + '</span> <span style="color:#8b949e">|</span> ' +
      (c.author ? '<span style="color:#58a6ff">' + c.author + '</span> <span style="color:#8b949e">|</span> ' : '') +
      '<span style="color:#8b949e">' + c.time + '</span> <span style="color:#8b949e">|</span> ' +
      '<span style="color:#c9d1d9">' + c.msg + '</span>';
  }

  function randomHash() {
    var s = '';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * 16)];
    return s;
  }

  function render() {
    // Keep only enough lines to fill terminal
    var maxLines = Math.floor(termHeight / 21);
    var display = lines.slice(-maxLines);
    terminal.innerHTML = display.join('<br>');
    terminal.scrollTop = terminal.scrollHeight;
    status.textContent = 'commits: ' + commitCount.toLocaleString();
  }

  function step() {
    if (!burstPhase) {
      if (commitIndex < commits.length) {
        // Accelerating delays: first commit slow, later ones faster
        var delay = Math.max(200, 1200 - commitIndex * 100);
        lines.push(makeLine(commits[commitIndex]));
        commitCount++;
        commitIndex++;
        render();
        timerId = setTimeout(step, delay);
      } else {
        // Pause with blinking cursor
        if (pauseAfterMain < 8) {
          cursorVisible = !cursorVisible;
          cursorBlinkCount++;
          var lastLine = lines[lines.length - 1];
          // Remove old cursor if present
          var base = lines.slice(0, -1);
          var cleanLast = commits.length > 0 ? makeLine(commits[commits.length - 1]) : '';
          base.push(cleanLast + (cursorVisible ? '<span style="color:#3fb950"> _</span>' : ''));
          lines = base;
          lines.push('');
          pauseAfterMain++;
          render();
          timerId = setTimeout(step, 500);
        } else {
          // Transition to burst
          burstPhase = true;
          lines.push('<span style="color:#8b949e">--- 10^80 particles commit simultaneously ---</span>');
          render();
          timerId = setTimeout(step, 400);
        }
      }
    } else {
      // Burst phase: rapid commits
      var batchSize = Math.min(4, 1 + Math.floor(burstCounter / 30));
      for (var i = 0; i < batchSize; i++) {
        var msg = burstMessages[Math.floor(Math.random() * burstMessages.length)];
        var c = { hash: randomHash(), msg: msg, time: 'T+now', author: '' };
        lines.push(makeLine(c));
        commitCount += Math.floor(Math.random() * 1e6) + 1;
      }
      burstCounter++;
      render();

      // Reset after a while
      if (burstCounter > 200) {
        burstCounter = 0;
        commitIndex = 0;
        commitCount = 0;
        burstPhase = false;
        pauseAfterMain = 0;
        cursorBlinkCount = 0;
        lines = [];
        render();
        timerId = setTimeout(step, 1500);
      } else {
        var burstDelay = Math.max(16, 80 - burstCounter * 0.3);
        timerId = setTimeout(step, burstDelay);
      }
    }
  }

  // Intersection observer
  let running = false;
  const observer = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !running) {
      running = true;
      // Reset
      lines = [];
      commitIndex = 0;
      commitCount = 0;
      burstPhase = false;
      pauseAfterMain = 0;
      burstCounter = 0;
      step();
    } else if (!entries[0].isIntersecting && running) {
      running = false;
      clearTimeout(timerId);
    }
  }, { threshold: 0.2 });
  observer.observe(wrapper);
}

function tryInitGitLog() {
  var el = document.getElementById('git-log-sim');
  if (el) initGitLog(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitGitLog);
} else {
  tryInitGitLog();
}

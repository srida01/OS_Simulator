/* ═══════════════════════════════════════════════════════
   TAB SWITCHING
═══════════════════════════════════════════════════════ */
function switchTab(id) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', ['dp','th'][i] === id));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === id));
}

/* ═══════════════════════════════════════════════════════
   DEMAND PAGING
═══════════════════════════════════════════════════════ */
const dp = {
  refs: [], frames: [], frameCount: 3, algo: 'fifo',
  step: 0, hits: 0, faults: 0,
  queue: [],      // FIFO order
  lruOrder: [],   // LRU order
  running: false, timer: null,
  resultMap: []   // store 'hit'|'fault' per step for coloring
};

const PROC_COLORS = ['#60b8ff','#28c840','#ff5f57','#ffbd2e','#c084fc','#fb923c','#34d399','#f472b6'];

function dpLoadDemo() {
  document.getElementById('dp-refstr').value = '7 0 1 2 0 3 0 4 2 3 0 3 2 1';
  document.getElementById('dp-frames').value = 3;
  document.getElementById('dp-algo').value = 'fifo';
  dpInit();
}

function dpInit() {
  if (dp.timer) { clearInterval(dp.timer); dp.timer = null; }
  dp.running = false;
  document.getElementById('dp-autoBtn').textContent = 'Auto Run';

  dp.refs = document.getElementById('dp-refstr').value.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
  dp.frameCount = Math.max(1, parseInt(document.getElementById('dp-frames').value) || 3);
  dp.algo = document.getElementById('dp-algo').value;
  dp.frames = new Array(dp.frameCount).fill(null);
  dp.step = 0; dp.hits = 0; dp.faults = 0;
  dp.queue = []; dp.lruOrder = []; dp.resultMap = [];

  dpRenderFrames(null, null);
  dpRenderRefs();
  dpUpdateStats();
  const logEl = document.getElementById('dp-log');
  logEl.innerHTML = `<span class="info">Initialized: ${dp.frameCount} frame(s), ${dp.algo.toUpperCase()}, ${dp.refs.length} references. Ready to step.</span>`;
}

function dpReset() {
  if (dp.timer) { clearInterval(dp.timer); dp.timer = null; }
  dp.running = false;
  document.getElementById('dp-autoBtn').textContent = 'Auto Run';
  dpInit();
}

function dpStep() {
  if (!dp.refs.length) { dpInit(); return; }
  if (dp.step >= dp.refs.length) {
    dpAppendLog(`<span class="done">── Simulation complete. ${dp.faults} fault(s), Hit rate: ${Math.round(dp.hits/dp.refs.length*100)}% ──</span>`);
    return;
  }

  const page = dp.refs[dp.step];
  const inFrames = dp.frames.includes(page);
  let evicted = null;

  if (inFrames) {
    dp.hits++;
    if (dp.algo === 'lru') {
      dp.lruOrder = dp.lruOrder.filter(p => p !== page);
      dp.lruOrder.push(page);
    }
    dp.resultMap.push('hit');
    dpRenderFrames(page, true);
    dpAppendLog(`<span class="hit">Step ${dp.step+1}: Page <b>${page}</b> → HIT  (already in frame)</span>`);
  } else {
    dp.faults++;
    const emptyIdx = dp.frames.indexOf(null);

    if (emptyIdx !== -1) {
      dp.frames[emptyIdx] = page;
      dp.queue.push(page);
      if (dp.algo === 'lru') dp.lruOrder.push(page);
    } else {
      if (dp.algo === 'fifo') {
        evicted = dp.queue.shift();
        dp.frames[dp.frames.indexOf(evicted)] = page;
        dp.queue.push(page);
      } else if (dp.algo === 'lru') {
        evicted = dp.lruOrder.shift();
        dp.frames[dp.frames.indexOf(evicted)] = page;
        dp.lruOrder.push(page);
      } else { // optimal
        let farthest = -1, victimIdx = 0;
        for (let i = 0; i < dp.frames.length; i++) {
          const next = dp.refs.indexOf(dp.frames[i], dp.step + 1);
          if (next === -1) { victimIdx = i; break; }
          if (next > farthest) { farthest = next; victimIdx = i; }
        }
        evicted = dp.frames[victimIdx];
        dp.frames[victimIdx] = page;
      }
    }
    dp.resultMap.push('fault');
    dpRenderFrames(page, false);
    dpAppendLog(`<span class="fault">Step ${dp.step+1}: Page <b>${page}</b> → FAULT${evicted !== null ? ` (evicted page ${evicted})` : ' (loaded into empty frame)'}</span>`);
  }

  dp.step++;
  dpRenderRefs();
  dpUpdateStats();
}

function dpToggleAuto() {
  if (dp.running) {
    clearInterval(dp.timer); dp.timer = null; dp.running = false;
    document.getElementById('dp-autoBtn').textContent = 'Auto Run';
  } else {
    if (!dp.refs.length) dpInit();
    dp.running = true;
    document.getElementById('dp-autoBtn').textContent = 'Pause';
    dp.timer = setInterval(() => {
      if (dp.step >= dp.refs.length) {
        clearInterval(dp.timer); dp.timer = null; dp.running = false;
        document.getElementById('dp-autoBtn').textContent = 'Auto Run';
        return;
      }
      dpStep();
    }, 480);
  }
}

function dpRenderFrames(current, isHit) {
  const el = document.getElementById('dp-framesview');
  el.innerHTML = '';
  for (let i = 0; i < dp.frameCount; i++) {
    const f = document.createElement('div');
    f.className = 'frame';
    const val = dp.frames[i];
    if (val === null) {
      f.classList.add('empty');
      f.innerHTML = `<span class="fid">F${i}</span><span class="fval" style="color:var(--muted);font-size:12px">—</span>`;
    } else {
      if (current !== null && val === current) {
        f.classList.add(isHit ? 'hit' : 'fault');
      } else {
        f.classList.add('filled');
      }
      f.innerHTML = `<span class="fid">F${i}</span><span class="fval">${val}</span>`;
    }
    el.appendChild(f);
  }
}

function dpRenderRefs() {
  const el = document.getElementById('dp-refview');
  el.innerHTML = '';
  dp.refs.forEach((r, i) => {
    const b = document.createElement('div');
    b.className = 'ref-badge';
    b.textContent = r;
    if (i === dp.step) b.classList.add('current');
    else if (i < dp.step) b.classList.add('done-' + (dp.resultMap[i] || 'hit'));
    el.appendChild(b);
  });
}

function dpUpdateStats() {
  document.getElementById('dp-total').textContent  = dp.step;
  document.getElementById('dp-hits').textContent   = dp.hits;
  document.getElementById('dp-faults').textContent = dp.faults;
  document.getElementById('dp-ratio').textContent  = dp.step > 0 ? Math.round(dp.hits / dp.step * 100) + '%' : '—';
}

function dpAppendLog(msg) {
  const log = document.getElementById('dp-log');
  log.innerHTML += msg + '<br>';
  log.scrollTop = log.scrollHeight;
}

/* ═══════════════════════════════════════════════════════
   THRASHING
═══════════════════════════════════════════════════════ */
const th = {
  running: false, timer: null, tick: 0,
  cpuHistory: [], processes: [],
  frames: 20, wsPerProc: 6
};

function thInit() {
  thStop();
  th.frames    = parseInt(document.getElementById('th-frames').value) || 20;
  th.wsPerProc = parseInt(document.getElementById('th-ws').value)     || 6;
  const n      = parseInt(document.getElementById('th-procs').value)  || 4;
  th.tick = 0; th.cpuHistory = []; th.processes = [];
  for (let i = 0; i < n; i++) thCreateProc(i);
  thStartLoop();
}

function thCreateProc(id) {
  th.processes.push({
    id, name: 'P' + id,
    ws: th.wsPerProc,
    progress: 0,
    state: 'ready',
    pageFaults: 0,
    color: PROC_COLORS[id % 8]
  });
}

function thAddProc() {
  if (!th.processes.length) { thInit(); return; }
  const id = th.processes.length;
  document.getElementById('th-procs').value = id + 1;
  thCreateProc(id);
  if (!th.running) thStartLoop();
}

function thRemoveProc() {
  if (th.processes.length <= 1) return;
  th.processes.pop();
  document.getElementById('th-procs').value = th.processes.length;
}

function thStop() {
  if (th.timer) { clearInterval(th.timer); th.timer = null; }
  th.running = false;
}

function thStartLoop() {
  th.running = true;
  th.timer = setInterval(thTick, 650);
  thTick();
}

function thTick() {
  th.tick++;
  const totalWS  = th.processes.reduce((s, p) => s + p.ws, 0);
  const overload  = Math.max(0, totalWS - th.frames);
  const severity  = Math.min(1, overload / Math.max(1, th.frames));
  const thrashing = totalWS > th.frames;

  // Update each process
  th.processes.forEach(p => {
    if (thrashing) {
      if (Math.random() < severity * 0.72) {
        p.state = 'blocked';
        p.pageFaults += Math.floor(Math.random() * 4) + 1;
      } else {
        p.state = 'running';
        p.progress = Math.min(100, p.progress + Math.random() * 2.5);
      }
    } else {
      p.state = Math.random() > 0.08 ? 'running' : 'ready';
      p.progress = Math.min(100, p.progress + Math.random() * 9 + 4);
    }
  });

  const activeCount = th.processes.filter(p => p.state === 'running').length;
  const cpuUtil = thrashing
    ? Math.max(4, Math.round((1 - severity * 0.88) * (activeCount / Math.max(1, th.processes.length)) * 100 * (0.45 + Math.random() * 0.55)))
    : Math.round(62 + Math.random() * 34);
  th.cpuHistory.push(Math.min(100, cpuUtil));
  if (th.cpuHistory.length > 32) th.cpuHistory.shift();

  const pfs = thrashing ? Math.round(severity * 85 + Math.random() * 20) : Math.round(Math.random() * 4);
  const memPct = Math.min(100, Math.round(totalWS / th.frames * 100));

  // Update DOM metrics
  const cpuEl = document.getElementById('th-cpu');
  cpuEl.textContent = cpuUtil + '%';
  cpuEl.className   = 'stat-val ' + (cpuUtil < 30 ? 'red' : cpuUtil < 60 ? 'amber' : 'green');
  document.getElementById('th-pf').textContent  = pfs;
  document.getElementById('th-mem').textContent = memPct + '%';

  thRenderProcesses();
  thRenderChart();
  thRenderMemMap(thrashing, severity);
  thUpdateIndicator(thrashing, severity, totalWS);
}

function thRenderProcesses() {
  const el = document.getElementById('th-proclist');
  el.innerHTML = '';
  th.processes.forEach(p => {
    const row = document.createElement('div');
    row.className = 'proc-row ' + p.state;
    const barColor = p.state === 'blocked' ? 'var(--red)' : p.color;
    row.innerHTML = `
      <span class="proc-name" style="color:${p.color}">${p.name}</span>
      <div class="proc-bar-wrap"><div class="proc-bar" style="width:${p.progress}%;background:${barColor}"></div></div>
      <span class="proc-ws">WS:${p.ws}f</span>
      <span class="proc-state ${p.state}">${p.state.toUpperCase()}</span>
    `;
    el.appendChild(row);
  });
}

function thRenderChart() {
  const el = document.getElementById('th-cpuchart');
  if (!th.cpuHistory.length) return;
  el.innerHTML = '';
  th.cpuHistory.forEach(v => {
    const bar = document.createElement('div');
    bar.className = 'cpu-bar';
    bar.style.height   = v + '%';
    bar.style.background = v < 30 ? 'var(--red)' : v < 60 ? 'var(--amber)' : 'var(--green)';
    el.appendChild(bar);
  });
}

function thRenderMemMap(thrashing, severity) {
  const mm = document.getElementById('th-memmap');
  mm.innerHTML = '';
  let used = 0;
  th.processes.forEach(p => used += p.ws);
  for (let i = 0; i < th.frames; i++) {
    const block = document.createElement('div');
    block.className = 'mem-block';
    if (i < used) {
      let cum = 0, owner = -1;
      for (let j = 0; j < th.processes.length; j++) {
        cum += th.processes[j].ws;
        if (i < cum) { owner = j; break; }
      }
      const proc = th.processes[owner];
      block.style.background = (thrashing && proc && proc.state === 'blocked')
        ? 'var(--red)' : (proc ? proc.color : 'var(--accent)');
    } else {
      block.style.background  = 'rgba(96,184,255,0.07)';
      block.style.border      = '1px solid var(--border)';
    }
    mm.appendChild(block);
  }
  // also render overflow blocks in red
  if (used > th.frames) {
    for (let i = 0; i < used - th.frames; i++) {
      const extra = document.createElement('div');
      extra.className = 'mem-block';
      extra.style.background = 'rgba(255,95,87,0.35)';
      extra.style.border = '1px solid var(--red)';
      extra.title = 'Over-committed';
      mm.appendChild(extra);
    }
  }
}

function thUpdateIndicator(thrashing, severity, totalWS) {
  const ind = document.getElementById('th-indicator');
  ind.style.display = 'block';
  if (!thrashing) {
    ind.className = 'thrash-indicator normal';
    ind.textContent = `System stable — total working set (${totalWS} frames) fits in physical memory (${th.frames} frames). CPU utilization high.`;
  } else if (severity < 0.4) {
    ind.className = 'thrash-indicator warning';
    ind.textContent = `WARNING: Total working set (${totalWS} frames) exceeds physical memory (${th.frames}). Overcommitted by ${totalWS - th.frames} frames — light thrashing detected.`;
  } else {
    ind.className = 'thrash-indicator critical';
    ind.textContent = `THRASHING: Working set (${totalWS} frames) far exceeds memory (${th.frames}). CPU utilization collapsing — processes blocked waiting for page swaps.`;
  }
}

// Init demand paging on load
dpInit();
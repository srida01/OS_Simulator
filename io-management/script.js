let simClock = 0;
function ts() { return `<span class="lts">[${String(simClock++).padStart(4,'0')}]</span>`; }

function addLog(id, html) {
  const el = document.getElementById(id);
  const d = document.createElement('div');
  d.className = 'le fresh';
  d.innerHTML = html;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  setTimeout(() => d.classList.remove('fresh'), 700);
  while (el.children.length > 80) el.removeChild(el.firstChild);
}

function switchTab(id, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

// ═══════════════════════════════════════════
// BUFFERING
// ═══════════════════════════════════════════
let bufType = 'single';
let bufRunning = false;
let bufTimer = null;
let bufSpeedIdx = 3;

// Single/Circular state
let bufSize = 8;
let buffer = [];
let wPtr = 0, rPtr = 0, bCount = 0;
let produced = 0, consumed = 0;
let circTurn = 0;

// Double buffer state
let bufA = [], bufB = [];
let pBuf = 'A', cBuf = 'B';
let dblWPtr = 0, dblRPtr = 0, dblProd = 0, dblCons = 0;
let dblTurn = 0;
let swapping = false;

// Agent state
let pState = 'idle', cState = 'idle';

const BUF_SPEEDS = [0, 1400, 900, 500, 250, 110];
const BUF_SPD_LABELS = ['','×0.5','×1','×2','×4','×8'];

function updateBufSpeed(v) {
  bufSpeedIdx = parseInt(v);
  document.getElementById('bsp-v').textContent = BUF_SPD_LABELS[v];
  if (bufRunning) { clearInterval(bufTimer); bufTimer = setInterval(bufStep, BUF_SPEEDS[bufSpeedIdx]); }
}

function rebuildBuf() {
  bufSize = parseInt(document.getElementById('bsz').value);
  resetBuf();
}

function setBufType(t, btn) {
  bufType = t;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  resetBuf();
}

function resetBuf() {
  clearInterval(bufTimer);
  bufRunning = false;
  document.getElementById('btn-brun').textContent = '▶ Run';
  simClock = 0;
  bufSize = parseInt(document.getElementById('bsz').value);
  buffer = Array(bufSize).fill(null);
  bufA = Array(bufSize).fill(null);
  bufB = Array(bufSize).fill(null);
  wPtr = 0; rPtr = 0; bCount = 0;
  produced = 0; consumed = 0; circTurn = 0;
  pBuf = 'A'; cBuf = 'B';
  dblWPtr = 0; dblRPtr = 0; dblProd = 0; dblCons = 0;
  dblTurn = 0; swapping = false;
  pState = 'idle'; cState = 'idle';
  renderBuf();
  document.getElementById('buf-log').innerHTML = '';
}

function toggleBufRun() {
  if (bufRunning) {
    clearInterval(bufTimer);
    bufRunning = false;
    document.getElementById('btn-brun').textContent = '▶ Run';
  } else {
    bufRunning = true;
    document.getElementById('btn-brun').textContent = '⏸ Pause';
    bufTimer = setInterval(bufStep, BUF_SPEEDS[bufSpeedIdx]);
  }
}

function bufStep() {
  if (bufType === 'single') stepSingle();
  else if (bufType === 'double') stepDouble();
  else stepCircular();
  renderBuf();
}

function rv() { return Math.floor(Math.random() * 90) + 10; }

function stepSingle() {
  if (bCount < bufSize) {
    const v = rv();
    buffer[wPtr] = v;
    addLog('buf-log', `${ts()}<span class="lp">PROD</span> → buf[<em>${wPtr}</em>] = <em>${v}</em>`);
    wPtr = (wPtr + 1) % bufSize;
    bCount++; produced++;
    pState = 'running'; cState = bCount > 0 ? 'running' : 'idle';
  } else if (bCount > 0) {
    const v = buffer[rPtr];
    buffer[rPtr] = null;
    addLog('buf-log', `${ts()}<span class="lc">CONS</span> ← buf[<em>${rPtr}</em>] = <em>${v}</em>`);
    rPtr = (rPtr + 1) % bufSize;
    bCount--; consumed++;
    pState = 'running'; cState = 'running';
  } else {
    addLog('buf-log', `${ts()}<span class="ls">SYS</span>  Buffer empty — consumer <em>waiting</em>`);
    cState = 'waiting'; pState = 'running';
  }
}

function stepCircular() {
  if (circTurn === 0) {
    if (bCount < bufSize) {
      const v = rv();
      buffer[wPtr] = v;
      addLog('buf-log', `${ts()}<span class="lp">PROD</span> → head[<em>${wPtr}</em>] = <em>${v}</em>`);
      wPtr = (wPtr + 1) % bufSize;
      bCount++; produced++; pState = 'running';
    } else {
      addLog('buf-log', `${ts()}<span class="ls">SYS</span>  Buffer <em>FULL</em> — producer waiting`);
      pState = 'waiting';
    }
    circTurn = 1;
  } else {
    if (bCount > 0) {
      const v = buffer[rPtr];
      buffer[rPtr] = null;
      addLog('buf-log', `${ts()}<span class="lc">CONS</span> ← tail[<em>${rPtr}</em>] = <em>${v}</em>`);
      rPtr = (rPtr + 1) % bufSize;
      bCount--; consumed++; cState = 'running';
    } else {
      addLog('buf-log', `${ts()}<span class="ls">SYS</span>  Buffer <em>EMPTY</em> — consumer waiting`);
      cState = 'waiting';
    }
    circTurn = 0;
  }
}

function stepDouble() {
  swapping = false;
  if (dblTurn === 0) {
    const arr = pBuf === 'A' ? bufA : bufB;
    if (dblWPtr < bufSize) {
      const v = rv();
      arr[dblWPtr] = v;
      addLog('buf-log', `${ts()}<span class="lp">PROD</span> → Buf${pBuf}[<em>${dblWPtr}</em>] = <em>${v}</em>`);
      dblWPtr++; dblProd++; pState = 'running';
    } else {
      addLog('buf-log', `${ts()}<span class="ls">SYS</span>  Buf${pBuf} full → <em>SWAP</em> buffers`);
      const t = pBuf; pBuf = cBuf; cBuf = t;
      dblWPtr = 0; dblRPtr = 0; swapping = true;
    }
    dblTurn = 1;
  } else {
    const arr = cBuf === 'A' ? bufA : bufB;
    if (dblRPtr < bufSize && arr[dblRPtr] !== null) {
      const v = arr[dblRPtr];
      arr[dblRPtr] = null;
      addLog('buf-log', `${ts()}<span class="lc">CONS</span> ← Buf${cBuf}[<em>${dblRPtr}</em>] = <em>${v}</em>`);
      dblRPtr++; dblCons++; cState = 'running';
    } else {
      addLog('buf-log', `${ts()}<span class="ls">SYS</span>  Buf${cBuf} empty — consumer <em>waiting</em>`);
      cState = 'waiting';
    }
    dblTurn = 0;
  }
}

// ─── RENDER BUFFERING ───
function cellsHTML(arr, wP, rP, mode) {
  return arr.map((v, i) => {
    let cls = 'bcell';
    let ptrs = '';
    if (mode === 'circ') {
      if (v !== null) cls += ' filled';
      if (i === wP && i === rP) { cls += ' wptr'; ptrs = '<span class="pind w">W</span><span class="pind r">R</span>'; }
      else if (i === wP) { cls += ' wptr'; ptrs = '<span class="pind w">W</span>'; }
      else if (i === rP) { cls += ' rptr'; ptrs = '<span class="pind r">R</span>'; }
    } else {
      if (v !== null) cls += ' filled';
      if (i === wP && mode === 'single' && v === null) cls += ' wptr';
    }
    return `<div class="${cls}">${v !== null ? v : ''}${ptrs}</div>`;
  }).join('');
}

function agentHTML(type, label, state) {
  const sC = state === 'running' ? 'st-run' : state === 'waiting' ? 'st-wait' : 'st-idle';
  const gC = state === 'running' ? (type === 'prod' ? ' glow-prod' : ' glow-cons') : '';
  const icon = type === 'prod' ? '⚙' : '📦';
  return `<div class="agent">
    <div class="agent-lbl ${type}">${label}</div>
    <div class="agent-box ${type}${gC}">${icon}</div>
    <span class="agent-st ${sC}">${state}</span>
  </div>`;
}

function statsHTML(n1,l1,c1, n2,l2,c2, n3,l3,c3) {
  return `<div class="buf-stats">
    <div class="bstat"><span class="bstat-n" style="color:${c1}">${n1}</span><span class="bstat-l">${l1}</span></div>
    <div class="bstat"><span class="bstat-n" style="color:${c2}">${n2}</span><span class="bstat-l">${l2}</span></div>
    ${n3 !== undefined ? `<div class="bstat"><span class="bstat-n" style="color:${c3}">${n3}</span><span class="bstat-l">${l3}</span></div>` : ''}
  </div>`;
}

function renderBuf() {
  const viz = document.getElementById('buf-viz');
  if (bufType === 'single') {
    viz.innerHTML = `<div class="buf-scene">
      ${agentHTML('prod','PRODUCER',pState)}
      <div class="buf-mid">
        <div class="buf-lbl">Single Buffer — ${bufSize} slots</div>
        <div class="buf-row">${cellsHTML(buffer, wPtr, rPtr, 'single')}</div>
        ${statsHTML(produced,'produced','var(--accent)', consumed,'consumed','var(--green)', bCount,'buffered', bCount>=bufSize?'var(--red)':'var(--text)')}
      </div>
      ${agentHTML('cons','CONSUMER',cState)}
    </div>`;
  } else if (bufType === 'circular') {
    viz.innerHTML = `<div class="buf-scene">
      ${agentHTML('prod','PRODUCER',pState)}
      <div class="buf-mid">
        <div class="buf-lbl">Circular Buffer — ${bufSize} slots &nbsp;·&nbsp; <span style="color:var(--accent)">W</span>=write &nbsp;<span style="color:var(--green)">R</span>=read</div>
        <div class="buf-row">${cellsHTML(buffer, wPtr, rPtr, 'circ')}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--muted);display:flex;gap:16px;margin-top:4px">
          <span>Head: <span style="color:var(--accent)">${wPtr}</span></span>
          <span>Tail: <span style="color:var(--green)">${rPtr}</span></span>
          <span>Used: <span style="color:${bCount>=bufSize?'var(--red)':'var(--text)'}">${bCount}/${bufSize}</span></span>
        </div>
        ${statsHTML(produced,'produced','var(--accent)', consumed,'consumed','var(--green)')}
      </div>
      ${agentHTML('cons','CONSUMER',cState)}
    </div>`;
  } else {
    viz.innerHTML = `<div class="dbl-layout">
      <div class="dbl-agents">
        ${agentHTML('prod','PRODUCER',pState)}
        ${agentHTML('cons','CONSUMER',cState)}
      </div>
      <div class="dbl-buffers">
        <div class="dbl-buf">
          <div class="dbl-role" style="color:var(--accent)">Buf A — ${pBuf==='A'?'Producer writing':'Consumer reading'}</div>
          <div class="buf-row">${cellsHTML(bufA,-1,-1,'dbl')}</div>
        </div>
        <div class="dbl-buf">
          <div class="dbl-role" style="color:var(--green)">Buf B — ${pBuf==='B'?'Producer writing':'Consumer reading'}</div>
          <div class="buf-row">${cellsHTML(bufB,-1,-1,'dbl')}</div>
        </div>
      </div>
      ${swapping ? '<div class="swap-badge">↕ SWAPPING BUFFERS</div>' : ''}
      ${statsHTML(dblProd,'produced','var(--accent)', dblCons,'consumed','var(--green)')}
    </div>`;
  }
}

// ═══════════════════════════════════════════
// DMA SIMULATION
// ═══════════════════════════════════════════
const DMA_PH = [
  { lbl:'CPU programs DMA controller',      det:'src=DISK, dst=RAM[0x1000], len=N, dir=READ' },
  { lbl:'DMA asserts HOLD → requests bus',  det:'DMA requests system bus from CPU' },
  { lbl:'CPU asserts HLDA, releases bus',   det:'CPU suspends bus activity (SUSPENDED)' },
  { lbl:'DMA transfers data I/O → Memory',  det:'DMA is bus master — zero CPU involvement' },
  { lbl:'DMA fires interrupt (IRQ)',         det:'Transfer complete, CPU notified' },
  { lbl:'CPU resumes, handles IRQ',          det:'CPU regains bus, processes data in RAM' },
];

let dmaPhase = -1;
let dmaRunning = false;
let dmaAuto = false;
let dmaTimer2 = null;
let dmaXferTimer = null;
let dmaBlocks = 8;
let dmaXferred = 0;
let dmaSpeedIdx = 2;
const DMA_DELAYS = [0, 2200, 1300, 650];
const DMA_SPD_LABELS = ['','Slow','Normal','Fast'];

function updateDmaSpeed(v) {
  dmaSpeedIdx = parseInt(v);
  document.getElementById('dspd-v').textContent = DMA_SPD_LABELS[v];
}

function getDmaDelay() { return DMA_DELAYS[dmaSpeedIdx]; }

function resetDma() {
  clearTimeout(dmaTimer2); clearInterval(dmaXferTimer);
  dmaRunning = false; dmaAuto = false; dmaPhase = -1; dmaXferred = 0;
  document.getElementById('btn-drun').textContent = '▶ Start DMA';
  document.getElementById('btn-drun').disabled = false;
  document.getElementById('btn-dstep').disabled = false;
  document.getElementById('xfer-area').style.display = 'none';
  document.getElementById('xfer-fill').style.width = '0%';
  document.getElementById('dma-log').innerHTML = '';
  renderDmaViz();
  renderDmaPhases();
}

function startDma() {
  if (dmaPhase >= 5) { resetDma(); return; }
  if (dmaRunning) return;
  dmaRunning = true; dmaAuto = true;
  document.getElementById('btn-drun').textContent = '⏳ Running...';
  document.getElementById('btn-drun').disabled = true;
  runDmaNext();
}

function stepDma() {
  if (dmaPhase >= 5) { resetDma(); return; }
  advanceDma();
}

function runDmaNext() {
  advanceDma();
  if (dmaPhase < 5 && dmaAuto) {
    const d = dmaPhase === 3 ? getDmaDelay() * 2.2 : getDmaDelay();
    dmaTimer2 = setTimeout(runDmaNext, d + 300);
  } else if (dmaPhase >= 5) {
    dmaRunning = false; dmaAuto = false;
    document.getElementById('btn-drun').textContent = '↺ Restart';
    document.getElementById('btn-drun').disabled = false;
    document.getElementById('btn-dstep').disabled = false;
  }
}

function advanceDma() {
  dmaPhase++;
  if (dmaPhase > 5) return;
  dmaBlocks = parseInt(document.getElementById('dblk').value);
  const msgs = [
    `${ts()}<span class="lp">CPU</span>  Programs DMA: src=DISK, dst=RAM[0x1000], len=<em>${dmaBlocks} blocks</em>`,
    `${ts()}<span class="ls">DMA</span>  Asserts <em>HOLD</em> signal → requesting system bus`,
    `${ts()}<span class="lp">CPU</span>  Asserts <em>HLDA</em> — CPU <span style="color:var(--red)">SUSPENDED</span> from bus`,
    `${ts()}<span class="ls">DMA</span>  Bus master: transferring <em>${dmaBlocks} blocks</em> DISK→RAM`,
    `${ts()}<span class="ls">DMA</span>  Transfer done → fires <em>IRQ</em> to CPU`,
    `${ts()}<span class="lp">CPU</span>  Handles IRQ, regains bus — <span style="color:var(--green)">RESUMED</span>`,
  ];
  addLog('dma-log', msgs[dmaPhase]);
  if (dmaPhase === 3) {
    document.getElementById('xfer-area').style.display = 'block';
    dmaXferred = 0;
    clearInterval(dmaXferTimer);
    const sd = getDmaDelay() * 2.2 / dmaBlocks;
    dmaXferTimer = setInterval(() => {
      dmaXferred++;
      const p = Math.round((dmaXferred / dmaBlocks) * 100);
      document.getElementById('xfer-fill').style.width = p + '%';
      document.getElementById('xfer-pct').textContent = p + '%';
      if (dmaXferred >= dmaBlocks) clearInterval(dmaXferTimer);
    }, sd);
  }
  renderDmaViz();
  renderDmaPhases();
}

function renderDmaPhases() {
  document.getElementById('dma-phases').innerHTML = DMA_PH.map((p, i) => {
    const cls = i < dmaPhase ? 'ph-done' : i === dmaPhase ? 'ph-active' : '';
    return `<div class="ph-item ${cls}">
      <span class="ph-dot"></span>
      <div>
        <div>${p.lbl}</div>
        ${i === dmaPhase ? `<div class="ph-detail">${p.det}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderDmaViz() {
  const ph = dmaPhase;
  // Node states
  const cpuActive  = ph === 0 || ph >= 4;
  const cpuSusp    = ph === 2 || ph === 3;
  const dmaActive  = ph >= 1 && ph <= 4;
  const memActive  = ph === 3 || ph >= 5;
  const ioActive   = ph === 3;

  // Connection highlight colors
  const colProg    = ph === 0  ? '#60b8ff' : 'rgba(96,184,255,0.15)';
  const colHold    = ph === 1  ? '#f5a822' : 'rgba(96,184,255,0.12)';
  const colHlda    = ph === 2  ? '#ff5f57' : 'rgba(96,184,255,0.12)';
  const colData    = ph === 3  ? '#2dc840' : 'rgba(96,184,255,0.12)';
  const colIrq     = ph === 4  ? '#f5a822' : 'rgba(96,184,255,0.12)';
  const colCtrl    = ph >= 1 && ph <= 3 ? '#60b8ff' : 'rgba(96,184,255,0.12)';

  const wProg  = ph === 0  ? 2 : .6;
  const wHold  = ph === 1  ? 2 : .6;
  const wHlda  = ph === 2  ? 2 : .6;
  const wData  = ph === 3  ? 2.5: .6;
  const wIrq   = ph === 4  ? 2 : .6;
  const wCtrl  = ph >= 1 && ph <= 3 ? 1.5 : .6;

  const cpuFill  = cpuSusp ? 'rgba(255,95,87,0.08)' : cpuActive ? 'rgba(96,184,255,0.08)' : 'rgba(255,255,255,0.02)';
  const cpuStk   = cpuSusp ? '#ff5f57' : cpuActive ? '#60b8ff' : 'rgba(96,184,255,0.14)';
  const dmaFill  = dmaActive ? 'rgba(96,184,255,0.09)' : 'rgba(255,255,255,0.02)';
  const dmaStk   = dmaActive ? '#60b8ff' : 'rgba(96,184,255,0.14)';
  const memFill  = memActive ? 'rgba(45,200,64,0.09)' : 'rgba(255,255,255,0.02)';
  const memStk   = memActive ? '#2dc840' : 'rgba(96,184,255,0.14)';
  const ioFill   = ioActive  ? 'rgba(96,184,255,0.09)' : 'rgba(255,255,255,0.02)';
  const ioStk    = ioActive  ? '#60b8ff' : 'rgba(96,184,255,0.14)';

  const cpuLbl  = cpuSusp ? 'SUSPENDED' : cpuActive ? 'ACTIVE' : 'IDLE';
  const cpuC    = cpuSusp ? '#ff5f57' : cpuActive ? '#60b8ff' : '#6a7ea0';
  const dmaLbl  = ph >= 2 && ph <= 3 ? 'BUS MASTER' : dmaActive ? 'ACTIVE' : 'IDLE';
  const dmaC    = ph >= 2 && ph <= 3 ? '#2dc840' : dmaActive ? '#60b8ff' : '#6a7ea0';
  const memLbl  = memActive ? (ph === 3 ? 'WRITING' : 'READY') : 'IDLE';
  const memC    = memActive ? '#2dc840' : '#6a7ea0';
  const ioLbl   = ioActive  ? 'READING' : 'IDLE';
  const ioC     = ioActive  ? '#60b8ff' : '#6a7ea0';

  // Animated dot on data path during transfer
  const dotAnim = ph === 3 ? `
    <circle r="5" fill="#2dc840" opacity="0.9">
      <animateMotion dur="1.1s" repeatCount="indefinite"
        path="M 430 255 L 430 310 L 170 310 L 170 255"/>
    </circle>
    <circle r="3.5" fill="#60b8ff" opacity="0.7">
      <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.4s"
        path="M 430 255 L 430 310 L 170 310 L 170 255"/>
    </circle>` : '';

  const irqAnim = ph === 4 ? `
    <circle r="4.5" fill="#f5a822" opacity="0.9">
      <animateMotion dur="0.9s" repeatCount="indefinite"
        path="M 350 105 L 250 105"/>
    </circle>` : '';

  const progAnim = ph === 0 ? `
    <circle r="4" fill="#60b8ff" opacity="0.85">
      <animateMotion dur="0.8s" repeatCount="indefinite"
        path="M 250 95 L 350 95"/>
    </circle>` : '';

  document.getElementById('dma-viz').innerHTML = `
<svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
  <defs>
    <marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M1 1L7 4L1 7" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- ── CPU NODE ── -->
  <rect x="40" y="60" width="160" height="90" rx="8" fill="${cpuFill}" stroke="${cpuStk}" stroke-width="${cpuActive||cpuSusp?1.5:.6}"/>
  <text x="120" y="91" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="11" fill="${cpuActive||cpuSusp?cpuC:'#6a7ea0'}" font-weight="600" letter-spacing="1">CPU</text>
  <text x="120" y="110" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#6a7ea0">${ph === 2||ph===3?'bus released (HLDA)':ph>=5?'handling IRQ':'in control'}</text>
  <rect x="78" y="122" width="84" height="16" rx="3" fill="${cpuSusp?'rgba(255,95,87,0.15)':cpuActive?'rgba(96,184,255,0.12)':'rgba(255,255,255,0.04)'}"/>
  <text x="120" y="133" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8.5" fill="${cpuC}" letter-spacing=".5">${cpuLbl}</text>
  <text x="76" y="80" font-family="sans-serif" font-size="18" fill="${cpuActive||cpuSusp?cpuC:'#3a4a60'}">🖥</text>

  <!-- ── DMA CTRL NODE ── -->
  <rect x="400" y="60" width="160" height="90" rx="8" fill="${dmaFill}" stroke="${dmaStk}" stroke-width="${dmaActive?1.5:.6}"/>
  <text x="480" y="91" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="10" fill="${dmaActive?dmaC:'#6a7ea0'}" font-weight="600" letter-spacing="1">DMA CTRL</text>
  <text x="480" y="110" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#6a7ea0">${ph===3?`${Math.min(dmaXferred,dmaBlocks)}/${dmaBlocks} blks`:ph===4?'firing IRQ':ph===1?'HOLD asserted':'controller'}</text>
  <rect x="432" y="122" width="96" height="16" rx="3" fill="${dmaActive?'rgba(96,184,255,0.12)':'rgba(255,255,255,0.04)'}"/>
  <text x="480" y="133" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8.5" fill="${dmaC}" letter-spacing=".5">${dmaLbl}</text>
  <text x="436" y="80" font-family="sans-serif" font-size="18" fill="${dmaActive?dmaC:'#3a4a60'}">⚡</text>

  <!-- ── MEMORY NODE ── -->
  <rect x="40" y="260" width="160" height="90" rx="8" fill="${memFill}" stroke="${memStk}" stroke-width="${memActive?1.5:.6}"/>
  <text x="120" y="291" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="10" fill="${memActive?memC:'#6a7ea0'}" font-weight="600" letter-spacing="1">MEMORY</text>
  <text x="120" y="310" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#6a7ea0">${ph===3?'receiving data':ph>=5?'data ready':'RAM @ 0x1000'}</text>
  <rect x="70" y="322" width="100" height="16" rx="3" fill="${memActive?'rgba(45,200,64,0.12)':'rgba(255,255,255,0.04)'}"/>
  <text x="120" y="333" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8.5" fill="${memC}" letter-spacing=".5">${memLbl}</text>
  <text x="76" y="280" font-family="sans-serif" font-size="18" fill="${memActive?memC:'#3a4a60'}">💾</text>

  <!-- ── I/O DEVICE NODE ── -->
  <rect x="400" y="260" width="160" height="90" rx="8" fill="${ioFill}" stroke="${ioStk}" stroke-width="${ioActive?1.5:.6}"/>
  <text x="480" y="291" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="10" fill="${ioActive?ioC:'#6a7ea0'}" font-weight="600" letter-spacing="1">I/O DISK</text>
  <text x="480" y="310" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#6a7ea0">${ph===3?'sending blocks':'source device'}</text>
  <rect x="432" y="322" width="96" height="16" rx="3" fill="${ioActive?'rgba(96,184,255,0.12)':'rgba(255,255,255,0.04)'}"/>
  <text x="480" y="333" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8.5" fill="${ioC}" letter-spacing=".5">${ioLbl}</text>
  <text x="436" y="280" font-family="sans-serif" font-size="18" fill="${ioActive?ioC:'#3a4a60'}">💿</text>

  <!-- ── CONNECTIONS ── -->
  <!-- CPU ↔ DMA: program line (top) -->
  <line x1="200" y1="95" x2="400" y2="95" stroke="${colProg}" stroke-width="${wProg}" marker-end="url(#ah)"/>
  <text x="300" y="88" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="${ph===0?'#60b8ff':'rgba(96,184,255,0.3)'}">${ph===0?'PROGRAM':'─────'}</text>

  <!-- DMA → CPU: HOLD (slightly below) -->
  <line x1="400" y1="115" x2="200" y2="115" stroke="${colHold}" stroke-width="${wHold}" stroke-dasharray="${ph===1?'4,3':'3,4'}" marker-end="url(#ah)"/>
  <text x="300" y="128" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="${ph===1?'#f5a822':'rgba(245,168,34,0.3)'}">${ph===1?'HOLD →':''}</text>

  <!-- CPU → DMA: HLDA -->
  <text x="300" y="128" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="${ph===2?'#ff5f57':'rgba(255,95,87,0)'}">${ph===2?'← HLDA':''}</text>

  <!-- DMA ↔ I/O: control (right side vertical) -->
  <line x1="480" y1="150" x2="480" y2="260" stroke="${colCtrl}" stroke-width="${wCtrl}" marker-end="url(#ah)"/>
  <text x="496" y="210" font-family="JetBrains Mono,monospace" font-size="8" fill="${ph>=1&&ph<=3?'#60b8ff':'rgba(96,184,255,0.3)'}" transform="rotate(90,496,210)">${ph>=1&&ph<=3?'CTRL':'─────'}</text>

  <!-- Data transfer: I/O → Memory (straight path) -->
<line x1="400" y1="305"
      x2="200" y2="305"
      stroke="${colData}"
      stroke-width="${wData}"
      marker-end="url(#ah)"/>
  <!-- IRQ: DMA → CPU (diagonal dashed) -->
  <line x1="400" y1="105" x2="100" y2="105" stroke="${colIrq}" stroke-width="${wIrq}" stroke-dasharray="5,3" marker-end="url(#ah)"/>
  <text x="300" y="98" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="${ph===4?'#f5a822':'rgba(0,0,0,0)'}">${ph===4?'IRQ ←':''}</text>

  <!-- Animated particles -->
  ${progAnim}
  ${dotAnim}
  ${irqAnim}

  <!-- Legend -->
  <text x="30" y="375" font-family="JetBrains Mono,monospace" font-size="8.5" fill="rgba(96,184,255,0.5)">━</text>
  <text x="42" y="375" font-family="JetBrains Mono,monospace" font-size="8.5" fill="#6a7ea0">Program/Ctrl</text>
  <text x="140" y="375" font-family="JetBrains Mono,monospace" font-size="8.5" fill="rgba(45,200,64,0.6)">━</text>
  <text x="152" y="375" font-family="JetBrains Mono,monospace" font-size="8.5" fill="#6a7ea0">Data transfer</text>
  <text x="260" y="375" font-family="JetBrains Mono,monospace" font-size="8.5" fill="rgba(245,168,34,0.6)">- -</text>
  <text x="276" y="375" font-family="JetBrains Mono,monospace" font-size="8.5" fill="#6a7ea0">IRQ / HOLD</text>
</svg>`;
}

// ─── INIT ───
resetBuf();
resetDma();
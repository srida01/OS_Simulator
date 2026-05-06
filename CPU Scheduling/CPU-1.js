let fcfsProcesses = [];
let rrProcesses = [];

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active-tab'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active-tab');
  btn.classList.add('active');
}

function addProcess(type) {
  const pid     = document.getElementById(type + 'Pid').value;
  const arrival = parseInt(document.getElementById(type + 'Arrival').value);
  const burst   = parseInt(document.getElementById(type + 'Burst').value);
  if (!pid || Number.isNaN(arrival) || Number.isNaN(burst) || burst <= 0) return;
  const arr = type === 'fcfs' ? fcfsProcesses : rrProcesses;
  arr.push({ pid, arrival, burst });
  displayProcesses(type);
}

function displayProcesses(type) {
  const list = document.getElementById(type + 'ProcessList');
  const arr  = type === 'fcfs' ? fcfsProcesses : rrProcesses;
  list.innerHTML = `<h3>Queued Processes:</h3>` +
    arr.map(p => `PID: ${p.pid}, A: ${p.arrival}, B: ${p.burst}`).join('<br>');
}

function runFCFS(e) {
  e.preventDefault();
  let time=0, wtSum=0, tatSum=0, results=[];
  const procs = [...fcfsProcesses].sort((a,b)=>a.arrival-b.arrival);
  if (!procs.length) return;
  procs.forEach(p=>{
    if(time < p.arrival) time = p.arrival;
    const start=time, end=start+p.burst;
    const wt = start - p.arrival, tat = end - p.arrival;
    wtSum += wt; tatSum += tat;
    results.push({ pid:p.pid, start, end, wt, tat });
    time = end;
  });
  drawGantt(results, 'fcfsGanttChart');
  drawResult(results, 'fcfsResultTable');
  document.getElementById('fcfsAvgWT').textContent = (wtSum/procs.length).toFixed(2);
  document.getElementById('fcfsAvgTAT').textContent = (tatSum/procs.length).toFixed(2);
}

function runRR(e) {
  e.preventDefault();
  const quantum = parseInt(document.getElementById('rrQuantum').value);
  if (!rrProcesses.length || Number.isNaN(quantum) || quantum <= 0) return;
  let time=0, wtSum=0, tatSum=0, done=0, idx=0, queue=[], timeline=[], results=[];
  const procs = rrProcesses
    .map(p=>({ ...p, remaining:p.burst, arrival:p.arrival }))
    .sort((a,b)=>a.arrival-b.arrival);
  while(done < procs.length) {
    while(idx<procs.length && procs[idx].arrival<=time) queue.push(procs[idx++]);
    if(!queue.length){ time++; continue; }
    const cur = queue.shift();
    const exec = Math.min(cur.remaining, quantum);
    const start=time, end=start+exec;
    cur.remaining -= exec;
    timeline.push({ pid: cur.pid, start, end });
    time=end;
    while(idx<procs.length && procs[idx].arrival<=time) queue.push(procs[idx++]);
    if(cur.remaining===0){
      const wt = end - cur.arrival - cur.burst;
      const tat= end - cur.arrival;
      wtSum+=wt; tatSum+=tat;
      results.push({ pid:cur.pid, start, end, wt, tat });
      done++;
    } else {
      queue.push(cur);
    }
  }
  drawGantt(timeline, 'rrGanttChart');
  drawResult(results, 'rrResultTable');
  document.getElementById('rrAvgWT').textContent = (wtSum/procs.length).toFixed(2);
  document.getElementById('rrAvgTAT').textContent = (tatSum/procs.length).toFixed(2);
}

function drawGantt(data, id) {
  const div = document.getElementById(id);
  div.innerHTML = '<h3>Gantt Chart:</h3>' +
    data.map(r=>`<div style="width:${r.end-r.start}em">${r.pid}<br><small>${r.start}-${r.end}</small></div>`).join('');
}

function drawResult(data, id) {
  const div = document.getElementById(id);
  let html = `<h3>Results:</h3><table>
    <tr><th>PID</th><th>Waiting</th><th>Turnaround</th></tr>`;
  data.forEach(r=>html+=`<tr><td>${r.pid}</td><td>${r.wt}</td><td>${r.tat}</td></tr>`);
  html += `</table>`;
  div.innerHTML = html;
}
// Process colors for Gantt chart
const colors = [
  '#ff6ec7', '#ff9900', '#00ff94',  
  '#d96eff',  
  '#ffee00',  
  '#ff66b2',  
  '#00ffc6',  
  '#ff7052',   
  '#c6ff00', 
  '#4fc3f7', 
  '#ff8a65', 
  '#a1887f', 
  '#ce93d8', 
  '#90caf9'  
];

// Initialize process colors display
function updateProcessColors() {
  const processes = getProcessData();
  const colorsDiv = document.getElementById('process-colors');
  colorsDiv.innerHTML = '';
  
  processes.forEach((process, index) => {
    const colorItem = document.createElement('div');
    colorItem.className = 'process-color-item';
    
    const colorBox = document.createElement('span');
    colorBox.className = 'color-box';
    colorBox.style.backgroundColor = process.color;
    
    const label = document.createElement('span');
    label.textContent = process.id;
    
    colorItem.appendChild(colorBox);
    colorItem.appendChild(label);
    colorsDiv.appendChild(colorItem);
  });
}

// Reset simulation results for all algorithms
function resetAllSimulationResults() {
  const algorithms = ['sjf', 'priority', 'srjf'];
  
  algorithms.forEach(algo => {
    // Reset Gantt chart
    const ganttContainer = document.getElementById(`${algo}-gantt`);
    if (ganttContainer) {
      ganttContainer.innerHTML = '';
    }
    
    // Reset performance metrics
    const avgTat = document.getElementById(`${algo}-avg-tat`);
    const avgWt = document.getElementById(`${algo}-avg-wt`);
    if (avgTat) avgTat.textContent = '0.00';
    if (avgWt) avgWt.textContent = '0.00';
    
    // Reset results table
    const resultTable = document.getElementById(`${algo}-results`);
    if (resultTable && resultTable.getElementsByTagName('tbody')[0]) {
      resultTable.getElementsByTagName('tbody')[0].innerHTML = '';
    }
  });
}

// Show the appropriate algorithm container
function showAlgorithm(algo) {
  const containers = document.querySelectorAll('.algorithm-container');
  containers.forEach(container => {
    container.classList.remove('active');
  });
  
  document.getElementById(`${algo}-container`).classList.add('active');
  
  // Update algorithm description
  const descriptionEl = document.querySelector('.algorithm-description');
  const titles = {
    'sjf': 'Shortest Job First (SJF)',
    'priority': 'Priority Scheduling',
    'srjf': 'Shortest Remaining Job First (SRTF)'
  };
  
  const descriptions = {
    'sjf': 'A non-preemptive scheduling algorithm that selects the process with the smallest execution time first.',
    'priority': 'Processes are scheduled based on priority. Lower numbers typically indicate higher priority.',
    'srjf': 'Preemptive version of SJF where the process with the smallest remaining time is selected.'
  };
  
  descriptionEl.innerHTML = `<h3>${titles[algo]}</h3><p>${descriptions[algo]}</p>`;
  
  // Reset simulation results for this algorithm
  const ganttContainer = document.getElementById(`${algo}-gantt`);
  if (ganttContainer) {
    ganttContainer.innerHTML = '';
  }
  
  // Reset performance metrics for this algorithm
  const avgTat = document.getElementById(`${algo}-avg-tat`);
  const avgWt = document.getElementById(`${algo}-avg-wt`);
  if (avgTat) avgTat.textContent = '0.00';
  if (avgWt) avgWt.textContent = '0.00';
  
  // Reset results table for this algorithm
  const resultTable = document.getElementById(`${algo}-results`);
  if (resultTable && resultTable.getElementsByTagName('tbody')[0]) {
    resultTable.getElementsByTagName('tbody')[0].innerHTML = '';
  }
}

// Initialize algorithm tabs
document.querySelectorAll('.algo-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.algo-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    showAlgorithm(tab.dataset.algo);
  });
});

// Add a new process row to the table
document.getElementById('add-process-btn').addEventListener('click', function() {
  const processId = document.getElementById('process-id').value || `P${document.getElementById('process-table-body').rows.length + 1}`;
  const arrivalTime = document.getElementById('arrival-time').value;
  const burstTime = document.getElementById('burst-time').value;
  const priority = document.getElementById('priority').value;
  
  const table = document.getElementById('process-table-body');
  const newRow = table.insertRow();
  
  newRow.innerHTML = `
    <td>${processId}</td>
    <td>${arrivalTime}</td>
    <td>${burstTime}</td>
    <td>${priority}</td>
    <td><button class="delete-btn" data-id="${processId}">Delete</button></td>
  `;
  
  // Attach delete event listener
  newRow.querySelector('.delete-btn').addEventListener('click', function() {
    const rowIndex = this.parentNode.parentNode.rowIndex - 1;
    document.getElementById('process-table-body').deleteRow(rowIndex);
    updateProcessColors();
  });
  
  updateProcessColors();
});

// Delete process button event delegation
document.getElementById('process-table-body').addEventListener('click', function(event) {
  if (event.target.classList.contains('delete-btn')) {
    const rowIndex = event.target.parentNode.parentNode.rowIndex - 1;
    document.getElementById('process-table-body').deleteRow(rowIndex);
    updateProcessColors();
  }
});

// Get process data from the input table
function getProcessData() {
  const rows = document.getElementById('process-table-body').rows;
  const processes = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const process = {
      id: row.cells[0].innerText,
      arrivalTime: parseInt(row.cells[1].innerText),
      burstTime: parseInt(row.cells[2].innerText),
      priority: parseInt(row.cells[3].innerText),
      color: colors[i % colors.length],
      remainingTime: 0, // Will be set in algorithms
      completionTime: 0,
      waitingTime: 0,
      turnaroundTime: 0
    };
    processes.push(process);
  }
  
  return processes;
}

// NEW: Shortest Job First (SJF) Scheduling Algorithm
function shortestJobFirst(processes) {
  const result = JSON.parse(JSON.stringify(processes)); // Deep copy
  result.forEach(p => p.remainingTime = p.burstTime);
  
  const timeline = [];
  let currentTime = 0;
  const n = result.length;
  const completedProcesses = Array(n).fill(false);
  
  while (completedProcesses.some(p => !p)) {
    // Find the shortest job that has arrived but not completed
    let shortestIndex = -1;
    let shortestBurst = Number.MAX_VALUE;
    
    for (let i = 0; i < n; i++) {
      if (!completedProcesses[i] && result[i].arrivalTime <= currentTime && result[i].burstTime < shortestBurst) {
        shortestBurst = result[i].burstTime;
        shortestIndex = i;
      }
    }
    
    // If no process is available at current time
    if (shortestIndex === -1) {
      // Find next arrival time
      let nextArrival = Number.MAX_VALUE;
      for (let i = 0; i < n; i++) {
        if (!completedProcesses[i] && result[i].arrivalTime < nextArrival) {
          nextArrival = result[i].arrivalTime;
        }
      }
      
      // Add idle time to timeline
      if (timeline.length > 0 && timeline[timeline.length - 1].processIndex === -1) {
        timeline[timeline.length - 1].endTime = nextArrival;
      } else {
        timeline.push({
          processIndex: -1,
          processId: 'Idle',
          startTime: currentTime,
          endTime: nextArrival
        });
      }
      
      currentTime = nextArrival;
      continue;
    }
    
    // Execute selected process until completion
    const process = result[shortestIndex];
    
    timeline.push({
      processIndex: shortestIndex,
      processId: process.id,
      startTime: currentTime,
      endTime: currentTime + process.burstTime
    });
    
    currentTime += process.burstTime;
    process.completionTime = currentTime;
    process.turnaroundTime = process.completionTime - process.arrivalTime;
    process.waitingTime = process.turnaroundTime - process.burstTime;
    completedProcesses[shortestIndex] = true;
  }
  
  return { processes: result, timeline };
}

// Priority Scheduling Algorithm
function priorityScheduling(processes) {
  const result = JSON.parse(JSON.stringify(processes)); // Deep copy
  result.forEach(p => p.remainingTime = p.burstTime);
  
  const timeline = [];
  let currentTime = 0;
  const completedProcesses = Array(result.length).fill(false);
  
  while (completedProcesses.some(p => !p)) {
    // Find next process to execute based on priority and arrival time
    let selectedIndex = -1;
    let highestPriority = Number.MAX_VALUE;
    
    for (let i = 0; i < result.length; i++) {
      if (!completedProcesses[i] && result[i].arrivalTime <= currentTime) {
        // Lower priority number means higher priority
        if (result[i].priority < highestPriority) {
          highestPriority = result[i].priority;
          selectedIndex = i;
        }
      }
    }
    
    if (selectedIndex === -1) {
      // No process available at current time, advance to next arrival
      let nextArrivalTime = Number.MAX_VALUE;
      for (let i = 0; i < result.length; i++) {
        if (!completedProcesses[i] && result[i].arrivalTime < nextArrivalTime) {
          nextArrivalTime = result[i].arrivalTime;
        }
      }
      
      // Add idle time to timeline
      if (timeline.length > 0 && timeline[timeline.length - 1].processIndex === -1) {
        timeline[timeline.length - 1].endTime = nextArrivalTime;
      } else {
        timeline.push({
          processIndex: -1,
          processId: 'Idle',
          startTime: currentTime,
          endTime: nextArrivalTime
        });
      }
      
      currentTime = nextArrivalTime;
      continue;
    }
    
    // Execute selected process until completion
    const process = result[selectedIndex];
    
    timeline.push({
      processIndex: selectedIndex,
      processId: process.id,
      startTime: currentTime,
      endTime: currentTime + process.remainingTime
    });
    
    currentTime += process.remainingTime;
    process.remainingTime = 0;
    process.completionTime = currentTime;
    process.turnaroundTime = process.completionTime - process.arrivalTime;
    process.waitingTime = process.turnaroundTime - process.burstTime;
    completedProcesses[selectedIndex] = true;
  }
  
  return { processes: result, timeline };
}

// Shortest Remaining Job First (SRJF) Scheduling Algorithm
function shortestRemainingJobFirst(processes) {
  const result = JSON.parse(JSON.stringify(processes)); // Deep copy
  result.forEach(p => p.remainingTime = p.burstTime);
  
  const timeline = [];
  let currentTime = 0;
  const n = result.length;
  const completedProcesses = Array(n).fill(false);
  
  while (completedProcesses.some(p => !p)) {
    // Find process with shortest remaining time
    let shortestIndex = -1;
    let shortestTime = Number.MAX_VALUE;
    
    for (let i = 0; i < n; i++) {
      if (!completedProcesses[i] && result[i].arrivalTime <= currentTime && result[i].remainingTime < shortestTime) {
        shortestTime = result[i].remainingTime;
        shortestIndex = i;
      }
    }
    
    // If no process is available at current time
    if (shortestIndex === -1) {
      // Find next arrival time
      let nextArrival = Number.MAX_VALUE;
      for (let i = 0; i < n; i++) {
        if (!completedProcesses[i] && result[i].arrivalTime < nextArrival) {
          nextArrival = result[i].arrivalTime;
        }
      }
      
      // Add idle time to timeline
      if (timeline.length > 0 && timeline[timeline.length - 1].processIndex === -1) {
        timeline[timeline.length - 1].endTime = nextArrival;
      } else {
        timeline.push({
          processIndex: -1,
          processId: 'Idle',
          startTime: currentTime,
          endTime: nextArrival
        });
      }
      
      currentTime = nextArrival;
      continue;
    }
    
    const process = result[shortestIndex];
    
    // Determine how long this process will run
    let runUntil = currentTime + process.remainingTime;
    
    // Check if another process will arrive before this one completes
    for (let i = 0; i < n; i++) {
      if (!completedProcesses[i] && i !== shortestIndex && 
          result[i].arrivalTime > currentTime && 
          result[i].arrivalTime < runUntil) {
        // A process will arrive before the current one completes
        const potentiallyPreemptingProcess = result[i];
        if (potentiallyPreemptingProcess.remainingTime < (process.remainingTime - (potentiallyPreemptingProcess.arrivalTime - currentTime))) {
          // The new process will have less remaining time than the current one
          runUntil = potentiallyPreemptingProcess.arrivalTime;
        }
      }
    }
    
    // Add to timeline
    timeline.push({
      processIndex: shortestIndex,
      processId: process.id,
      startTime: currentTime,
      endTime: runUntil
    });
    
    // Update process
    const timeRun = runUntil - currentTime;
    process.remainingTime -= timeRun;
    currentTime = runUntil;
    
    // Check if process completed
    if (process.remainingTime === 0) {
      completedProcesses[shortestIndex] = true;
      process.completionTime = currentTime;
      process.turnaroundTime = process.completionTime - process.arrivalTime;
      process.waitingTime = process.turnaroundTime - process.burstTime;
    }
  }
  
  return { processes: result, timeline };
}

// Modified renderAnimatedGanttChart function with reversed speed parameters only
function renderAnimatedGanttChart(timeline, processes, containerId, algorithmName) {
  const ganttContainer = document.getElementById(containerId);
  ganttContainer.innerHTML = '';
  
  if (timeline.length === 0) return;
  
  const totalTime = timeline[timeline.length - 1].endTime;
  const ganttWidth = 1100;
  ganttContainer.style.width = `${ganttWidth}px`;
  
  // Add Gantt chart title
  const chartTitle = document.createElement('h3');
  chartTitle.textContent = algorithmName + ' Gantt Chart';
  chartTitle.style.textAlign = 'center';
  chartTitle.style.marginBottom = '15px';
  ganttContainer.appendChild(chartTitle);
  
  const ganttRow = document.createElement('div');
  ganttRow.className = 'gantt-row';
  ganttRow.style.display = 'flex';
  ganttRow.style.height = '40px';
  ganttRow.style.position = 'relative';
  ganttContainer.appendChild(ganttRow);
  
  // Current time display
  const timeDisplay = document.createElement('div');
  timeDisplay.style.marginTop = '20px';
  timeDisplay.style.textAlign = 'center';
  timeDisplay.style.fontWeight = 'bold';
  timeDisplay.textContent = 'Current Time: 0';
  ganttContainer.appendChild(timeDisplay);
  
  // Control buttons and speed slider
  const controlsDiv = document.createElement('div');
  controlsDiv.style.marginTop = '15px';
  controlsDiv.style.display = 'flex';
  controlsDiv.style.gap = '10px';
  controlsDiv.style.justifyContent = 'center';
  controlsDiv.style.alignItems = 'center';
  
  // Animation variables
  let currentTime = 0;
  let animationSpeed = 500; // milliseconds per time unit
  let isPaused = false;
  let animationCompleted = false;
  let animationTimer = null;
  
  // Create play/pause button
  const playPauseBtn = document.createElement('button');
  playPauseBtn.textContent = 'Pause';
  playPauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    playPauseBtn.textContent = isPaused ? 'Play' : 'Pause';
    
    if (!isPaused && !animationCompleted) {
      animate();
    }
  });
  
  // Create speed control div
  const speedControlDiv = document.createElement('div');
  speedControlDiv.style.display = 'flex';
  speedControlDiv.style.alignItems = 'center';
  speedControlDiv.style.gap = '10px';
  
  const speedLabel = document.createElement('label');
  speedLabel.textContent = 'Speed:';
  
  // Create slider with reversed values for speed
  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.min = '100';  // Slow animation (high delay)
  speedSlider.max = '900';  // Fast animation (low delay)
  speedSlider.value = '500'; // Middle speed
  speedSlider.style.width = '150px';
  
  // Set the initial animation speed based on reversed slider
  animationSpeed = 1000 - parseInt(speedSlider.value);
  
  // Update speed when slider moves (with reversed values)
  speedSlider.addEventListener('input', () => {
    // Reverse the value: high slider value = low delay (fast animation)
    animationSpeed = 1000 - parseInt(speedSlider.value);
  });
  
  // Add slider and label to the speed control div
  speedControlDiv.appendChild(speedLabel);
  speedControlDiv.appendChild(speedSlider);
  
  // Create reset button
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {
    // Clear any ongoing animation
    if (animationTimer) {
      clearTimeout(animationTimer);
    }
    
    currentTime = 0;
    isPaused = false;
    animationCompleted = false;
    playPauseBtn.textContent = 'Pause';
    
    // Clear existing blocks
    ganttRow.innerHTML = '';
    renderedBlocks.clear();
    
    // Reset animation
    renderCurrentTimeBlocks();
    animate();
  });
  
  // Add all controls to the controls div
  controlsDiv.appendChild(playPauseBtn);
  controlsDiv.appendChild(speedControlDiv);
  controlsDiv.appendChild(resetBtn);
  
  ganttContainer.appendChild(controlsDiv);
  
  // Store all timeline blocks in a map for easy lookup
  const timelineMap = {};
  
  timeline.forEach((segment, index) => {
    for (let t = segment.startTime; t < segment.endTime; t++) {
      timelineMap[t] = {
        processIndex: segment.processIndex,
        startTime: segment.startTime,
        endTime: segment.endTime,
        segmentIndex: index
      };
    }
  });
  
  // Keep track of rendered blocks to prevent duplicates
  const renderedBlocks = new Set();
  
  // Function to render blocks for the current time
  function renderCurrentTimeBlocks() {
    timeDisplay.textContent = `Current Time: ${currentTime}`;
    
    // Process all segments that have started by the current time
    timeline.forEach((segment, segmentIndex) => {
      // Skip if this segment hasn't started yet
      if (segment.startTime > currentTime) return;
      
      // Skip if we've already rendered this entire segment
      if (currentTime >= segment.endTime && renderedBlocks.has(`${segmentIndex}-full`)) return;
      
      // Calculate how much of this segment to show based on current time
      const segmentEndTime = Math.min(currentTime + 1, segment.endTime);
      const blockWidth = (segmentEndTime - segment.startTime) * 40;
      const blockId = `${segmentIndex}-${segment.startTime}-${segmentEndTime}`;
      
      // Skip if we've already rendered this partial block
      if (renderedBlocks.has(blockId)) return;
      
      // Add to rendered blocks
      renderedBlocks.add(blockId);
      
      // If the block is complete, mark it as fully rendered
      if (currentTime >= segment.endTime) {
        renderedBlocks.add(`${segmentIndex}-full`);
      }
      
      // Create the block
      const block = document.createElement('div');
      block.className = 'gantt-block';
      block.style.position = 'absolute';
      block.style.left = `${segment.startTime * 40}px`;
      block.style.width = `${blockWidth}px`;
      block.style.height = '40px';
      block.style.display = 'flex';
      block.style.alignItems = 'center';
      block.style.justifyContent = 'center';
      block.style.border = '1px solid #333';
      
      if (segment.processIndex === -1) {
        // Idle time
        block.style.backgroundColor = '#f0f0f0';
        block.textContent = 'Idle';
      } else {
        const process = processes[segment.processIndex];
        block.style.backgroundColor = process.color;
        block.textContent = process.id;
      }
      
      ganttRow.appendChild(block);
      
      // Add time labels at segment boundaries
      if (currentTime >= segment.startTime && !renderedBlocks.has(`start-${segmentIndex}`)) {
        const startLabel = document.createElement('div');
        startLabel.className = 'time-label start';
        startLabel.style.position = 'absolute';
        startLabel.style.left = `${segment.startTime * 40}px`;
        startLabel.style.top = '40px';
        startLabel.style.fontSize = '11px';
        startLabel.style.fontWeight = 'bold';
        startLabel.textContent = segment.startTime;
        ganttRow.appendChild(startLabel);
        renderedBlocks.add(`start-${segmentIndex}`);
      }
      
      if (currentTime >= segment.endTime && !renderedBlocks.has(`end-${segmentIndex}`)) {
        const endLabel = document.createElement('div');
        endLabel.className = 'time-label end';
        endLabel.style.position = 'absolute';
        endLabel.style.left = `${segment.endTime * 40}px`;
        endLabel.style.top = '40px';
        endLabel.style.fontSize = '11px';
        endLabel.style.fontWeight = 'bold';
        endLabel.textContent = segment.endTime;
        ganttRow.appendChild(endLabel);
        renderedBlocks.add(`end-${segmentIndex}`);
      }
    });
    
    // Add final time label when animation completes
    if (currentTime >= totalTime && !renderedBlocks.has('final-time-label')) {
      const finalLabel = document.createElement('div');
      finalLabel.className = 'time-label end';
      finalLabel.style.position = 'absolute';
      finalLabel.style.left = `${totalTime * 40}px`;
      finalLabel.style.top = '40px';
      finalLabel.style.fontSize = '11px';
      finalLabel.style.fontWeight = 'bold';
      finalLabel.textContent = totalTime;
      ganttRow.appendChild(finalLabel);
      renderedBlocks.add('final-time-label');
    }
  }
  
  // Animation loop
  function animate() {
    if (isPaused) {
      animationTimer = setTimeout(animate, animationSpeed);
      return;
    }
    
    renderCurrentTimeBlocks();
    
    if (currentTime < totalTime) {
      currentTime++;
      animationTimer = setTimeout(animate, animationSpeed);
    } else {
      animationCompleted = true;
      
      // Add a notification that animation is complete
      const completionNotice = document.createElement('div');
      completionNotice.style.marginTop = '10px';
      completionNotice.style.textAlign = 'center';
      completionNotice.style.color = 'green';
      completionNotice.style.fontWeight = 'bold';
      completionNotice.textContent = 'Animation Completed';
      ganttContainer.appendChild(completionNotice);
      
      // Trigger the performance metrics update
      const algorithm = containerId.split('-')[0]; // Extract algorithm name from container ID
      updatePerformanceMetrics(getProcessResultForAlgorithm(algorithm), algorithm);
    }
  }
  
  // Start animation
  animate();
  
  // Return a promise that resolves when animation completes
  return new Promise((resolve) => {
    const checkCompletion = setInterval(() => {
      if (animationCompleted) {
        clearInterval(checkCompletion);
        resolve();
      }
    }, 100);
  });
}

// Helper function to get the correct process result for each algorithm
function getProcessResultForAlgorithm(algorithm) {
  // This would be set by the main simulation function
  switch (algorithm) {
    case 'sjf':
      return window.sjfResult ? window.sjfResult.processes : [];
    case 'priority':
      return window.priorityResult ? window.priorityResult.processes : [];
    case 'srjf':
      return window.srjfResult ? window.srjfResult.processes : [];
    default:
      return [];
  }
}

// Get algorithm name for display
function getAlgorithmDisplayName(algo) {
  const names = {
    'sjf': 'Shortest Job First (SJF)',
    'priority': 'Priority Scheduling',
    'srjf': 'Shortest Remaining Job First (SRTF)'
  };
  return names[algo] || algo.toUpperCase();
}

// Modified simulation function to run only the active algorithm
document.getElementById('simulate-btn').addEventListener('click', async function() {
  const processes = getProcessData();
  if (processes.length === 0) {
    alert('Please add at least one process.');
    return;
  }
  
  // Update UI to show this is animated
  document.querySelector('.hero p').textContent = 'A real-time visual simulation of CPU scheduling algorithms in operating systems';
  
  // Determine which algorithm is currently active
  const activeContainer = document.querySelector('.algorithm-container.active');
  if (!activeContainer) return;
  
  const activeAlgorithm = activeContainer.id.split('-')[0]; // Extract algorithm name from container ID
  
  // Reset all simulation results before running new simulation
  resetAllSimulationResults();
  
  // Run only the active algorithm
  switch (activeAlgorithm) {
    case 'sjf':
      const sjfResult = shortestJobFirst(processes);
      window.sjfResult = sjfResult;
      await renderAnimatedGanttChart(sjfResult.timeline, processes, 'sjf-gantt', getAlgorithmDisplayName('sjf'));
      break;
      
    case 'priority':
      const priorityResult = priorityScheduling(processes);
      window.priorityResult = priorityResult;
      await renderAnimatedGanttChart(priorityResult.timeline, processes, 'priority-gantt', getAlgorithmDisplayName('priority'));
      break;
      
    case 'srjf':
      const srjfResult = shortestRemainingJobFirst(processes);
      window.srjfResult = srjfResult;
      await renderAnimatedGanttChart(srjfResult.timeline, processes, 'srjf-gantt', getAlgorithmDisplayName('srjf'));
      break;
  }
});

// Calculate and update performance metrics
function updatePerformanceMetrics(processes, algorithm) {
  if (!processes || processes.length === 0) return;
  
  let totalTurnaroundTime = 0;
  let totalWaitingTime = 0;
  
  // Calculate averages
  processes.forEach(process => {
    totalTurnaroundTime += process.turnaroundTime;
    totalWaitingTime += process.waitingTime;
  });
  
  const avgTurnaroundTime = totalTurnaroundTime / processes.length;
  const avgWaitingTime = totalWaitingTime / processes.length;
  
  // Update UI
  document.getElementById(`${algorithm}-avg-tat`).textContent = avgTurnaroundTime.toFixed(2);
  document.getElementById(`${algorithm}-avg-wt`).textContent = avgWaitingTime.toFixed(2);
  
  // Update results table
  const resultTable = document.getElementById(`${algorithm}-results`).getElementsByTagName('tbody')[0];
  resultTable.innerHTML = ''; // Clear existing rows
  
  processes.forEach(process => {
    const row = resultTable.insertRow();
    
    // Different columns based on algorithm
    if (algorithm === 'priority') {
      row.innerHTML = `
        <td>${process.id}</td>
        <td>${process.arrivalTime}</td>
        <td>${process.burstTime}</td>
        <td>${process.priority}</td>
        <td>${process.completionTime}</td>
        <td>${process.turnaroundTime}</td>
        <td>${process.waitingTime}</td>
      `;
    } else {
      row.innerHTML = `
        <td>${process.id}</td>
        <td>${process.arrivalTime}</td>
        <td>${process.burstTime}</td>
        <td>${process.completionTime}</td>
        <td>${process.turnaroundTime}</td>
        <td>${process.waitingTime}</td>
      `;
    }
  });
}

// Initialize process colors on page load
window.addEventListener('DOMContentLoaded', function() {
  updateProcessColors();
});
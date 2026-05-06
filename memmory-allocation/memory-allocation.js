// Memory block representation
class MemoryBlock {
    constructor(size, startAddress) {
        this.size = size;
        this.startAddress = startAddress;
        this.allocated = false;
        this.processId = null;
        this.remainingSpace = size;
        this.allocatedProcesses = [];
    }
}

// Memory manager class
class MemoryManager {
    constructor() {
        this.blocks = [];
        this.processes = [];
        this.currentStep = 0;
        this.steps = [];
        this.currentAlgorithm = null;
        this.lastAllocationIndex = 0;
    }

    initializeMemory(blockSizes) {
        this.blocks = blockSizes.map(size => new MemoryBlock(size, 0));
        this.updateVisualization();
    }

    initializeProcesses(processSizes) {
        this.processes = processSizes.map(size => ({
            size: size,
            status: 'Pending',
            allocatedBlock: null
        }));
        this.currentStep = 0;
        this.updateVisualization();
    }

    firstFit(processSize) {
        for (let i = 0; i < this.blocks.length; i++) {
            if (this.blocks[i].remainingSpace >= processSize) {
                return i;
            }
        }
        return -1;
    }

    bestFit(processSize) {
        let bestFitIndex = -1;
        let smallestDifference = Infinity;
        for (let i = 0; i < this.blocks.length; i++) {
            if (this.blocks[i].remainingSpace >= processSize) {
                const difference = this.blocks[i].remainingSpace - processSize;
                if (difference < smallestDifference) {
                    smallestDifference = difference;
                    bestFitIndex = i;
                }
            }
        }
        return bestFitIndex;
    }

    worstFit(processSize) {
        let worstFitIndex = -1;
        let largestDifference = -1;
        for (let i = 0; i < this.blocks.length; i++) {
            if (this.blocks[i].remainingSpace >= processSize) {
                const difference = this.blocks[i].remainingSpace - processSize;
                if (difference > largestDifference) {
                    largestDifference = difference;
                    worstFitIndex = i;
                }
            }
        }
        return worstFitIndex;
    }

    nextFit(processSize) {
        const startIndex = this.lastAllocationIndex || 0;
        for (let i = 0; i < this.blocks.length; i++) {
            const index = (startIndex + i) % this.blocks.length;
            if (this.blocks[index].remainingSpace >= processSize) {
                this.lastAllocationIndex = (index + 1) % this.blocks.length;
                return index;
            }
        }
        return -1;
    }

    weightedBestFit(processSize) {
        let bestFitIndex = -1;
        let bestScore = -Infinity;
        for (let i = 0; i < this.blocks.length; i++) {
            if (this.blocks[i].remainingSpace >= processSize) {
                const sizeScore = 1 - Math.abs(this.blocks[i].remainingSpace - processSize) / this.blocks[i].size;
                const locationScore = 1 - (i / this.blocks.length);
                const fragmentationScore = this.blocks[i].allocatedProcesses.length === 0 ? 1 :
                    (this.blocks[i].remainingSpace - processSize) / this.blocks[i].size;
                const totalScore = (sizeScore * 0.5) + (locationScore * 0.3) + (fragmentationScore * 0.2);
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestFitIndex = i;
                }
            }
        }
        return bestFitIndex;
    }

    sizeOrderedFirstFit(processSize) {
        const sortedIndices = Array.from({ length: this.blocks.length }, (_, i) => i)
            .sort((a, b) => {
                const aScore = this.blocks[a].allocated ? this.blocks[a].remainingSpace : this.blocks[a].size;
                const bScore = this.blocks[b].allocated ? this.blocks[b].remainingSpace : this.blocks[b].size;
                return aScore - bScore;
            });
        for (const index of sortedIndices) {
            if (this.blocks[index].remainingSpace >= processSize) {
                return index;
            }
        }
        return -1;
    }

    allocateMemory(processId, processSize, algorithm) {
        let blockIndex = -1;
        switch (algorithm) {
            case 'first':   blockIndex = this.firstFit(processSize); break;
            case 'best':    blockIndex = this.bestFit(processSize); break;
            case 'worst':   blockIndex = this.worstFit(processSize); break;
            case 'next':    blockIndex = this.nextFit(processSize); break;
            case 'weighted': blockIndex = this.weightedBestFit(processSize); break;
            case 'size-ordered': blockIndex = this.sizeOrderedFirstFit(processSize); break;
        }

        if (blockIndex !== -1) {
            const block = this.blocks[blockIndex];
            block.allocated = true;
            block.remainingSpace -= processSize;
            block.allocatedProcesses.push({ processId, size: processSize });

            const process = this.processes[processId - 1];
            process.status = 'Allocated';
            process.allocatedBlock = blockIndex + 1;

            logMessage(`✓ P${processId} (${processSize} KB) → Block ${blockIndex + 1}`, 'success');
        } else {
            const process = this.processes[processId - 1];
            process.status = 'Failed';
            logMessage(`✗ P${processId} (${processSize} KB) → No suitable block found`, 'error');
        }

        this.updateVisualization();
        return blockIndex !== -1;
    }

    reset() {
        this.blocks.forEach(block => {
            block.allocated = false;
            block.processId = null;
            block.remainingSpace = block.size;
            block.allocatedProcesses = [];
        });
        this.processes.forEach(process => {
            process.status = 'Pending';
            process.allocatedBlock = null;
        });
        this.currentStep = 0;
        this.lastAllocationIndex = 0;
        this.updateVisualization();
    }

    updateVisualization() {
        // --- Process blocks ---
        const processBlocksContainer = document.getElementById('processBlocks');
        processBlocksContainer.innerHTML = '';

        const colorMap = ['process-color-1', 'process-color-2', 'process-color-3', 'process-color-4', 'process-color-5'];

        this.processes.forEach((process, index) => {
            const el = document.createElement('div');
            const colorClass = process.status === 'Allocated'
                ? colorMap[index % colorMap.length]
                : process.status === 'Failed' ? '' : '';
            el.className = `block ${process.status === 'Allocated' ? 'allocated ' + colorClass : ''}`;
            el.style.flexDirection = 'column';
            el.style.gap = '4px';
            el.innerHTML = `
                <span style="font-weight:700;">P${index + 1}</span>
                <span style="font-size:10px;">${process.size} KB</span>
                <span style="font-size:9px;opacity:0.8;">${process.status}</span>
            `;
            if (process.status === 'Failed') {
                el.style.borderColor = 'rgba(255,85,85,0.6)';
                el.style.background = 'rgba(255,85,85,0.15)';
                el.style.color = '#ff5555';
            }
            processBlocksContainer.appendChild(el);
        });

        // --- Memory blocks ---
        const memoryContainer = document.getElementById('memoryVisualization');
        memoryContainer.innerHTML = '';

        this.blocks.forEach((block, index) => {
            const el = document.createElement('div');
            el.className = `block ${block.allocated ? 'allocated' : ''}`;
            el.style.flexDirection = 'column';
            el.style.gap = '4px';
            el.style.minWidth = '110px';

            if (block.allocated) {
                const procsText = block.allocatedProcesses.map(p => `P${p.processId}(${p.size}KB)`).join(', ');
                el.innerHTML = `
                    <span style="font-weight:700;font-size:10px;">Block ${index + 1}</span>
                    <span style="font-size:10px;">${block.size} KB</span>
                    <span style="font-size:9px;opacity:0.85;">${procsText}</span>
                    <span style="font-size:9px;opacity:0.7;">Free: ${block.remainingSpace} KB</span>
                `;
            } else {
                el.innerHTML = `
                    <span style="font-weight:700;font-size:10px;">Block ${index + 1}</span>
                    <span style="font-size:10px;">${block.size} KB</span>
                    <span style="font-size:9px;opacity:0.6;">Free</span>
                `;
            }
            memoryContainer.appendChild(el);
        });

        this.updateTables();
        this.updateStats();
    }

    updateTables() {
        const allocationTable = document.getElementById('allocationTable');
        allocationTable.innerHTML = '';
        this.blocks.forEach((block, index) => {
            const row = document.createElement('tr');
            const allocatedText = block.allocated && block.allocatedProcesses.length > 0
                ? block.allocatedProcesses.map(p => `P${p.processId}`).join(', ')
                : 'Free';
            row.innerHTML = `
                <td>Block ${index + 1}</td>
                <td>${block.size} KB</td>
                <td>${allocatedText}</td>
                <td>${block.remainingSpace} KB ${block.allocated ? 'left' : 'available'}</td>
            `;
            allocationTable.appendChild(row);
        });

        const processTable = document.getElementById('processTable');
        processTable.innerHTML = '';
        this.processes.forEach((process, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>P${index + 1}</td>
                <td>${process.size} KB</td>
                <td style="color:${process.status === 'Allocated' ? '#50fa7b' : process.status === 'Failed' ? '#ff5555' : 'inherit'}">${process.status}</td>
                <td>${process.allocatedBlock ? `Block ${process.allocatedBlock}` : 'N/A'}</td>
            `;
            processTable.appendChild(row);
        });
    }

    updateStats() {
        const totalMemory = this.blocks.reduce((sum, b) => sum + b.size, 0);
        let allocatedMemory = 0;
        this.blocks.forEach(block => {
            if (block.allocated) {
                allocatedMemory += block.allocatedProcesses.reduce((sum, p) => sum + p.size, 0);
            }
        });
        const freeMemory = totalMemory - allocatedMemory;

        document.getElementById('totalMemory').textContent = totalMemory ? `${totalMemory} KB` : '—';
        document.getElementById('allocatedMemory').textContent = totalMemory ? `${allocatedMemory} KB` : '—';
        document.getElementById('freeMemory').textContent = totalMemory ? `${freeMemory} KB` : '—';
    }
}

// ---- Global state ----
const memoryManager = new MemoryManager();
let simulationInterval = null;
let currentSpeed = 2;
let selectedAlgorithm = null;

// ---- Logging ----
function logMessage(msg, type = 'info') {
    const log = document.getElementById('allocation-log');
    if (!log) return;
    const p = document.createElement('p');
    p.textContent = `> ${msg}`;
    if (type === 'success') p.style.color = '#50fa7b';
    else if (type === 'error') p.style.color = '#ff5555';
    else if (type === 'info') p.style.color = '#3ea6ff';
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
}

// ---- Input table ----
function updateInputTable() {
    const numBlocks = parseInt(document.getElementById('numBlocks').value);
    const numProcesses = parseInt(document.getElementById('numProcesses').value);
    const maxRows = Math.max(numBlocks, numProcesses);
    const tableBody = document.getElementById('inputTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    for (let i = 0; i < maxRows; i++) {
        const row = document.createElement('tr');
        if (i < numBlocks) {
            row.innerHTML = `<td>Block ${i + 1}</td><td><input type="number" id="block${i}" min="1" value="100" class="block-input"></td>`;
        } else {
            row.innerHTML = `<td>-</td><td>-</td>`;
        }
        if (i < numProcesses) {
            row.innerHTML += `<td>Process ${i + 1}</td><td><input type="number" id="process${i}" min="1" value="50" class="process-input"></td>`;
        } else {
            row.innerHTML += `<td>-</td><td>-</td>`;
        }
        tableBody.appendChild(row);
    }
}

function getBlockSizes() {
    const numBlocks = parseInt(document.getElementById('numBlocks').value);
    return Array.from({ length: numBlocks }, (_, i) => {
        const el = document.getElementById(`block${i}`);
        return el ? parseInt(el.value) || 100 : 100;
    });
}

function getProcessSizes() {
    const numProcesses = parseInt(document.getElementById('numProcesses').value);
    return Array.from({ length: numProcesses }, (_, i) => {
        const el = document.getElementById(`process${i}`);
        return el ? parseInt(el.value) || 50 : 50;
    });
}

// ---- Generate random inputs ----
function generateRandomInputs() {
    const numBlocks = Math.floor(Math.random() * 6) + 3;
    const numProcesses = Math.floor(Math.random() * 5) + 2;

    document.getElementById('numBlocks').value = numBlocks;
    document.getElementById('numProcesses').value = numProcesses;

    updateInputTable();

    for (let i = 0; i < numBlocks; i++) {
        const el = document.getElementById(`block${i}`);
        if (el) el.value = Math.floor(Math.random() * 451) + 50;
    }
    for (let i = 0; i < numProcesses; i++) {
        const el = document.getElementById(`process${i}`);
        if (el) el.value = Math.floor(Math.random() * 271) + 30;
    }

    resetVisualization();
    logMessage('Random inputs generated. Select an algorithm to begin.', 'info');
}

// ---- Select algorithm ----
function selectAlgorithm(algorithm) {
    if (!algorithm) return;
    selectedAlgorithm = algorithm;

    const blockSizes = getBlockSizes();
    const processSizes = getProcessSizes();

    memoryManager.initializeMemory(blockSizes);
    memoryManager.initializeProcesses(processSizes);
    memoryManager.currentStep = 0;

    document.getElementById('selectedAlgo').textContent = algorithm.toUpperCase();
    document.getElementById('allocation-log').innerHTML = '';
    logMessage(`Algorithm set to ${algorithm}. Click "Start Simulation" or "Next Step".`, 'info');
}

// ---- Step through ----
function stepThroughAllocation() {
    if (!selectedAlgorithm) {
        logMessage('Please select an algorithm first!', 'error');
        return;
    }

    if (memoryManager.blocks.length === 0) {
        logMessage('Click "Generate Inputs" first, then select an algorithm.', 'error');
        return;
    }

    const currentProcess = memoryManager.processes[memoryManager.currentStep];
    if (!currentProcess) {
        logMessage('All processes handled.', 'info');
        return;
    }
    if (currentProcess.status !== 'Pending') {
        memoryManager.currentStep++;
        return;
    }

    memoryManager.allocateMemory(
        memoryManager.currentStep + 1,
        currentProcess.size,
        selectedAlgorithm
    );
    memoryManager.currentStep++;

    if (memoryManager.currentStep >= memoryManager.processes.length) {
        logMessage('Allocation complete!', 'info');
    }
}

function isAllocationComplete() {
    return memoryManager.currentStep >= memoryManager.processes.length;
}

// ---- Start / pause simulation ----
function startSimulation() {
    if (!selectedAlgorithm) {
        logMessage('Please select an algorithm first!', 'error');
        return;
    }
    if (memoryManager.blocks.length === 0) {
        logMessage('Click "Generate Inputs" first, then select an algorithm.', 'error');
        return;
    }

    if (!simulationInterval) {
        simulationInterval = setInterval(() => {
            if (!isAllocationComplete()) {
                stepThroughAllocation();
            } else {
                clearInterval(simulationInterval);
                simulationInterval = null;
                document.getElementById('startButton').textContent = 'Start Simulation';
            }
        }, 1000 / currentSpeed);
        document.getElementById('startButton').textContent = 'Pause Simulation';
    } else {
        clearInterval(simulationInterval);
        simulationInterval = null;
        document.getElementById('startButton').textContent = 'Start Simulation';
    }
}

// ---- Reset ----
function resetVisualization() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    selectedAlgorithm = null;
    document.getElementById('startButton').textContent = 'Start Simulation';
    document.getElementById('selectedAlgo').textContent = 'Select Algorithm';
    document.getElementById('algorithmSelect').value = '';

    const log = document.getElementById('allocation-log');
    if (log) log.innerHTML = '';

    memoryManager.blocks = [];
    memoryManager.processes = [];
    memoryManager.currentStep = 0;
    memoryManager.lastAllocationIndex = 0;

    // Clear visuals
    document.getElementById('processBlocks').innerHTML = '';
    document.getElementById('memoryVisualization').innerHTML = '';
    document.getElementById('allocationTable').innerHTML = '';
    document.getElementById('processTable').innerHTML = '';
    document.getElementById('totalMemory').textContent = '—';
    document.getElementById('allocatedMemory').textContent = '—';
    document.getElementById('freeMemory').textContent = '—';
}

// ---- Init ----
document.getElementById('numBlocks').addEventListener('change', updateInputTable);
document.getElementById('numProcesses').addEventListener('change', updateInputTable);

window.onload = function () {
    updateInputTable();
};
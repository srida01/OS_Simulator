// Memory block representation
class MemoryBlock {
    constructor(size, startAddress) {
        this.size = size;
        this.startAddress = startAddress;
        this.allocated = false;
        this.processId = null;
        this.remainingSpace = size;  // Track remaining space
        this.allocatedProcesses = []; // Track allocated processes
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
                // Calculate weighted score based on multiple factors
                const sizeScore = 1 - Math.abs(this.blocks[i].remainingSpace - processSize) / this.blocks[i].size; // Prefer closest fit
                const locationScore = 1 - (i / this.blocks.length); // Prefer blocks at the beginning
                const fragmentationScore = this.blocks[i].allocatedProcesses.length === 0 ? 1 : 
                    (this.blocks[i].remainingSpace - processSize) / this.blocks[i].size; // Prefer blocks with less fragmentation
                
                // Combine scores with weights (50% size, 30% location, 20% fragmentation)
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
        // Create a sorted array of block indices based on remaining space
        const sortedIndices = Array.from({length: this.blocks.length}, (_, i) => i)
            .sort((a, b) => {
                // Sort by remaining space, prioritizing blocks that are not yet allocated
                const aScore = this.blocks[a].allocated ? this.blocks[a].remainingSpace : this.blocks[a].size;
                const bScore = this.blocks[b].allocated ? this.blocks[b].remainingSpace : this.blocks[b].size;
                return aScore - bScore;
            });

        // Find the first block that fits
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
            case 'first':
                blockIndex = this.firstFit(processSize);
                break;
            case 'best':
                blockIndex = this.bestFit(processSize);
                break;
            case 'worst':
                blockIndex = this.worstFit(processSize);
                break;
            case 'next':
                blockIndex = this.nextFit(processSize);
                break;
            case 'weighted':
                blockIndex = this.weightedBestFit(processSize);
                break;
            case 'size-ordered':
                blockIndex = this.sizeOrderedFirstFit(processSize);
                break;
        }

        if (blockIndex !== -1) {
            const block = this.blocks[blockIndex];
            block.allocated = true;
            block.remainingSpace -= processSize;
            block.allocatedProcesses.push({
                processId: processId,
                size: processSize
            });

            const process = this.processes[processId - 1];
            process.status = 'Allocated';
            process.allocatedBlock = blockIndex + 1;
        } else {
            const process = this.processes[processId - 1];
            process.status = 'Failed';
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
        // Update process blocks visualization
        const processBlocksContainer = document.getElementById('processBlocks');
        processBlocksContainer.innerHTML = '';
        
        this.processes.forEach((process, index) => {
            const processBlock = document.createElement('div');
            processBlock.className = `process-block ${process.status.toLowerCase()}`;
            
            const processId = document.createElement('div');
            processId.className = 'process-id';
            processId.textContent = `P${index + 1}`;
            
            const processSize = document.createElement('div');
            processSize.className = 'process-size';
            processSize.textContent = `${process.size} KB`;
            
            const processStatus = document.createElement('div');
            processStatus.className = 'process-status';
            processStatus.textContent = process.status;
            
            processBlock.appendChild(processId);
            processBlock.appendChild(processSize);
            processBlock.appendChild(processStatus);
            processBlocksContainer.appendChild(processBlock);
        });

        // Update memory blocks visualization
        const memoryContainer = document.getElementById('memoryVisualization');
        memoryContainer.innerHTML = '';
        
        this.blocks.forEach((block, index) => {
            const memoryBlock = document.createElement('div');
            memoryBlock.className = `memory-block ${block.allocated ? 'allocated' : 'unallocated'}`;
            
            const blockSize = document.createElement('div');
            blockSize.className = 'block-size';
            blockSize.textContent = `${block.size} KB`;
            
            const blockInfo = document.createElement('div');
            blockInfo.className = 'block-info';
            
            if (block.allocated) {
                // Create a container for allocated processes
                const allocatedProcesses = document.createElement('div');
                allocatedProcesses.className = 'allocated-processes';
                
                // Add each allocated process as a tag
                block.allocatedProcesses.forEach(proc => {
                    const processTag = document.createElement('div');
                    processTag.className = 'process-tag';
                    processTag.textContent = `P${proc.processId} (${proc.size} KB)`;
                    allocatedProcesses.appendChild(processTag);
                });
                
                // Add remaining space info
                const remainingInfo = document.createElement('div');
                remainingInfo.className = 'remaining-info';
                remainingInfo.textContent = `Remaining: ${block.remainingSpace} KB`;
                
                blockInfo.appendChild(allocatedProcesses);
                blockInfo.appendChild(remainingInfo);
            } else {
                blockInfo.textContent = 'Free';
            }
            
            memoryBlock.appendChild(blockSize);
            memoryBlock.appendChild(blockInfo);
            memoryContainer.appendChild(memoryBlock);
        });

        // Update tables
        this.updateTables();
        
        // Update progress and stats
        this.updateProgress();
        this.updateStats();
    }

    updateTables() {
        // Update allocation table
        const allocationTable = document.getElementById('allocationTable');
        allocationTable.innerHTML = '';
        
        this.blocks.forEach((block, index) => {
            const row = document.createElement('tr');
            
            // Create a list of allocated processes
            let allocatedProcessesText = 'Free';
            if (block.allocated && block.allocatedProcesses.length > 0) {
                allocatedProcessesText = block.allocatedProcesses.map(proc => `P${proc.processId}`).join(', ');
            }
            
            row.innerHTML = `
                <td>Block ${index + 1}</td>
                <td>${block.size} KB</td>
                <td>${allocatedProcessesText}</td>
                <td>${block.remainingSpace} KB ${block.allocated ? 'left' : 'available'}</td>
            `;
            allocationTable.appendChild(row);
        });

        // Update process table
        const processTable = document.getElementById('processTable');
        processTable.innerHTML = '';
        
        this.processes.forEach((process, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>P${index + 1}</td>
                <td>${process.size} KB</td>
                <td class="${process.status.toLowerCase()}">${process.status}</td>
                <td>${process.allocatedBlock ? `Block ${process.allocatedBlock}` : 'N/A'}</td>
            `;
            processTable.appendChild(row);
        });
    }

    updateProgress() {
        const totalProcesses = this.processes.length;
        const completedProcesses = this.processes.filter(p => p.status !== 'Pending').length;
        const progress = (completedProcesses / totalProcesses) * 100;
        
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Allocation Progress: ${Math.round(progress)}%`;
    }

    updateStats() {
        const totalMemory = this.blocks.reduce((sum, block) => sum + block.size, 0);
        let allocatedMemory = 0;
        let internalFragmentation = 0;
        let externalFragmentation = 0;

        // Calculate allocated memory and internal fragmentation
        this.blocks.forEach(block => {
            if (block.allocated) {
                const usedSpace = block.allocatedProcesses.reduce((sum, proc) => sum + proc.size, 0);
                allocatedMemory += usedSpace;
                internalFragmentation += block.size - usedSpace; // Wasted space in allocated blocks
            } else {
                externalFragmentation += block.size; // Unallocated blocks contribute to external fragmentation
            }
        });
        
        document.getElementById('totalMemory').textContent = `${totalMemory} KB`;
        document.getElementById('allocatedMemory').textContent = `${allocatedMemory} KB`;
        document.getElementById('internalFragmentation').textContent = `${internalFragmentation} KB`;
        document.getElementById('externalFragmentation').textContent = `${externalFragmentation} KB`;
    }
}

// Initialize memory manager
const memoryManager = new MemoryManager();

// Add these variables at the top of the file
let simulationInterval = null;
let currentSpeed = 5;
let selectedAlgorithm = null;

// UI Functions
function updateInputTable() {
    const numBlocks = parseInt(document.getElementById('numBlocks').value);
    const numProcesses = parseInt(document.getElementById('numProcesses').value);
    const maxRows = Math.max(numBlocks, numProcesses);
    const tableBody = document.getElementById('inputTableBody');
    
    tableBody.innerHTML = '';
    
    for (let i = 0; i < maxRows; i++) {
        const row = document.createElement('tr');
        
        // Block columns
        if (i < numBlocks) {
            row.innerHTML = `
                <td>Block ${i + 1}</td>
                <td><input type="number" id="block${i}" min="1" value="100" class="block-input"></td>
            `;
        } else {
            row.innerHTML = `
                <td>-</td>
                <td>-</td>
            `;
        }
        
        // Process columns
        if (i < numProcesses) {
            row.innerHTML += `
                <td>Process ${i + 1}</td>
                <td><input type="number" id="process${i}" min="1" value="50" class="process-input"></td>
            `;
        } else {
            row.innerHTML += `
                <td>-</td>
                <td>-</td>
            `;
        }
        
        tableBody.appendChild(row);
    }
}

function getBlockSizes() {
    const numBlocks = parseInt(document.getElementById('numBlocks').value);
    const blockSizes = [];
    for (let i = 0; i < numBlocks; i++) {
        const input = document.getElementById(`block${i}`);
        if (input) {
            blockSizes.push(parseInt(input.value));
        }
    }
    return blockSizes;
}

function getProcessSizes() {
    const numProcesses = parseInt(document.getElementById('numProcesses').value);
    const processSizes = [];
    for (let i = 0; i < numProcesses; i++) {
        const input = document.getElementById(`process${i}`);
        if (input) {
            processSizes.push(parseInt(input.value));
        }
    }
    return processSizes;
}

function selectAlgorithm(algorithm) {
    selectedAlgorithm = algorithm;
    
    // Initialize memory and processes
    const blockSizes = getBlockSizes();
    const processSizes = getProcessSizes();
    
    memoryManager.initializeMemory(blockSizes);
    memoryManager.initializeProcesses(processSizes);
    memoryManager.currentStep = 0;
    
    document.getElementById('stepInfo').textContent = `Selected ${algorithm} algorithm. Click 'Start Simulation' or 'Next Step' to begin allocation.`;
    document.getElementById('startButton').disabled = false;
    document.getElementById('stepButton').disabled = false;
    
    memoryManager.updateVisualization();
}

function stepThroughAllocation() {
    if (!selectedAlgorithm) {
        document.getElementById('stepInfo').textContent = 'Please select an algorithm first!';
        return;
    }
    
    const currentProcess = memoryManager.processes[memoryManager.currentStep];
    if (!currentProcess || currentProcess.status !== 'Pending') {
        return;
    }
    
    memoryManager.allocateMemory(
        memoryManager.currentStep + 1,
        currentProcess.size,
        selectedAlgorithm
    );
    
    memoryManager.currentStep++;
    
    if (memoryManager.currentStep >= memoryManager.processes.length) {
        document.getElementById('stepInfo').textContent = 'Allocation complete!';
        return;
    }
    
    document.getElementById('stepInfo').textContent = `Step ${memoryManager.currentStep + 1}: Allocating Process ${memoryManager.currentStep + 1}`;
}

function isAllocationComplete() {
    return memoryManager.currentStep >= memoryManager.processes.length;
}

function startSimulation() {
    if (!selectedAlgorithm) {
        document.getElementById('stepInfo').textContent = 'Please select an algorithm first!';
        return;
    }
    
    if (!simulationInterval) {
        simulationInterval = setInterval(() => {
            if (!isAllocationComplete()) {
                stepThroughAllocation();
            } else {
                clearInterval(simulationInterval);
                simulationInterval = null;
                document.getElementById('startButton').innerHTML = '<i class="fas fa-play"></i> Start Simulation';
            }
        }, 1000 / currentSpeed);
        document.getElementById('startButton').innerHTML = '<i class="fas fa-pause"></i> Pause Simulation';
    } else {
        clearInterval(simulationInterval);
        simulationInterval = null;
        document.getElementById('startButton').innerHTML = '<i class="fas fa-play"></i> Start Simulation';
    }
}

function updateSpeed(value) {
    currentSpeed = value;
    document.getElementById('speedValue').textContent = value + 'x';
    
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = setInterval(() => {
            if (!memoryManager.isAllocationComplete()) {
                stepThroughAllocation();
            } else {
                clearInterval(simulationInterval);
                simulationInterval = null;
                document.getElementById('startButton').innerHTML = '<i class="fas fa-play"></i> Start Simulation';
            }
        }, 1000 / currentSpeed);
    }
}

function resetVisualization() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    selectedAlgorithm = null;
    document.getElementById('startButton').innerHTML = '<i class="fas fa-play"></i> Start Simulation';
    document.getElementById('startButton').disabled = true;
    document.getElementById('stepButton').disabled = true;
    document.getElementById('stepInfo').textContent = 'Select an algorithm to begin';
    
    memoryManager.reset();
    memoryManager.currentStep = 0;
    memoryManager.updateVisualization();
}

function resetSimulation() {
    const output = document.getElementById('output');
    if (output) {
        output.textContent = '';
    }
    const status = document.getElementById('status');
    if (status) {
        status.textContent = 'Simulation reset';
    }
    resetVisualization();
    
    // Reset input fields
    updateInputTable();
}

function generateRandomInputs() {
    // Generate random number of blocks (between 3 and 8)
    const numBlocks = Math.floor(Math.random() * 6) + 3;
    document.getElementById('numBlocks').value = numBlocks;

    // Generate random number of processes (between 2 and 6)
    const numProcesses = Math.floor(Math.random() * 5) + 2;
    document.getElementById('numProcesses').value = numProcesses;

    // Update the input table first
    updateInputTable();

    // Generate random block sizes (between 50 and 500 KB)
    for (let i = 0; i < numBlocks; i++) {
        const blockSize = Math.floor(Math.random() * 451) + 50; // 50 to 500
        document.getElementById(`block${i}`).value = blockSize;
    }

    // Generate random process sizes (between 30 and 300 KB)
    for (let i = 0; i < numProcesses; i++) {
        const processSize = Math.floor(Math.random() * 271) + 30; // 30 to 300
        document.getElementById(`process${i}`).value = processSize;
    }

    // Reset the simulation
    resetVisualization();
    document.getElementById('status').textContent = 'Random inputs generated. Select an algorithm to begin.';
}

// Add event listeners for input changes
document.getElementById('numBlocks').addEventListener('change', updateInputTable);
document.getElementById('numProcesses').addEventListener('change', updateInputTable);

// Add event listener for speed slider
document.addEventListener('DOMContentLoaded', function() {
    const speedSlider = document.getElementById('speedSlider');
    speedSlider.addEventListener('input', function() {
        updateSpeed(this.value);
    });
});

// Initialize the page
window.onload = function() {
    updateInputTable();
}; 

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const referenceStringInput = document.getElementById('reference-string');
    const frameSizeInput = document.getElementById('frame-size');
    const algorithmSelect = document.getElementById('algorithm');
    const simulateBtn = document.getElementById('simulate-btn');
    const stepBtn = document.getElementById('step-btn');
    const resetBtn = document.getElementById('reset-btn');
    const speedControl = document.getElementById('speed');
    const referenceDisplay = document.getElementById('reference-display');
    const framesContainer = document.getElementById('frames-container');
    const pageHitsElement = document.getElementById('page-hits');
    const pageFaultsElement = document.getElementById('page-faults');
    const hitRatioElement = document.getElementById('hit-ratio');

    // Simulation variables
    let referenceString = [];
    let frameSize = 0;
    let algorithm = '';
    let frames = [];
    let currentStep = 0;
    let pageHits = 0;
    let pageFaults = 0;
    let simulationInterval = null;
    let simulationSpeed = 1000;
    let extraData = {}; // For algorithm-specific data like counters, timestamps, etc.
    let stepResults = []; // Store detailed results for each step

    // Initialize with a default reference string
    referenceStringInput.value = "7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1";

    // Event Listeners
    simulateBtn.addEventListener('click', startSimulation);
    stepBtn.addEventListener('click', performStep);
    resetBtn.addEventListener('click', resetSimulation);
    speedControl.addEventListener('input', updateSpeed);

    // Add event listeners for tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs and content
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
            
            // Update the view based on which tab is active
            if (button.dataset.tab === 'table-view' && currentStep > 0) {
                updateTableView();
            } else if (button.dataset.tab === 'step-view' && currentStep > 0) {
                // Get the last step data
                const lastStep = currentStep - 1;
                if (stepResults[lastStep]) {
                    updateStepView(
                        stepResults[lastStep].page,
                        stepResults[lastStep].prevFrames,
                        stepResults[lastStep].isHit
                    );
                }
            }
        });
    });

    // Functions
    function startSimulation() {
        parseInputs();
        
        if (referenceString.length === 0) {
            alert("Please enter a valid reference string");
            return;
        }
        
        resetSimulation();
        
        // Disable simulate button, enable step button
        simulateBtn.disabled = true;
        stepBtn.disabled = false;
        
        // Display reference string
        displayReferenceString();
        
        // Set up auto-play
        updateSpeed();
        simulationInterval = setInterval(performStep, simulationSpeed);
    }

    function parseInputs() {
        // Parse reference string
        referenceString = referenceStringInput.value
            .trim()
            .split(/\s+/)
            .map(num => parseInt(num))
            .filter(num => !isNaN(num));
        
        // Parse frame size
        frameSize = parseInt(frameSizeInput.value);
        if (frameSize < 1) frameSize = 1;
        if (frameSize > 10) frameSize = 10;
        
        // Get selected algorithm
        algorithm = algorithmSelect.value;
        
        // Initialize frames array
        frames = new Array(frameSize).fill(null);
        
        // Initialize extra data for algorithms
        initializeExtraData();
    }

    function initializeExtraData() {
        extraData = {};
        
        switch(algorithm) {
            case 'lru':
                // Track last used time for each page
                extraData.lastUsed = {};
                break;
            case 'lfu':
                // Track frequency for each page
                extraData.frequency = {};
                break;
            case 'fifo':
                // Queue to track order of insertion
                extraData.queue = [];
                break;
            case 'mru':
                // Track last used time for each page (similar to LRU but we'll replace the most recent)
                extraData.lastUsed = {};
                break;
            case 'random':
                // No extra data needed
                break;
        }
    }

    function performStep() {
        if (currentStep >= referenceString.length) {
            clearInterval(simulationInterval);
            stepBtn.disabled = true;
            simulateBtn.disabled = false;
            return;
        }
        
        // Get the current page from reference string
        const currentPage = referenceString[currentStep];
        
        // Highlight current reference
        updateReferenceHighlight();
        
        // Check if the page is already in frames (hit)
        const frameIndex = frames.indexOf(currentPage);
        let isHit = frameIndex !== -1;
        
        // Clone current frames for display purposes
        const prevFrames = [...frames];
        
        if (isHit) {
            // Page hit
            pageHits++;
            
            // Update extra data
            updateExtraDataOnHit(currentPage, frameIndex);
        } else {
            // Page fault
            pageFaults++;
            
            // Find the frame to replace based on the algorithm
            const replaceIndex = findFrameToReplace(currentPage);
            
            // Replace the frame
            frames[replaceIndex] = currentPage;
            
            // Update extra data
            updateExtraDataOnFault(currentPage, replaceIndex);
        }
        
        // Store the result of this step for statistics and table display
        storeStepResult(currentPage, prevFrames, isHit, currentStep);
        
        // Update display for the current step
        if (document.getElementById('table-view').classList.contains('active')) {
            updateTableView();
        } else {
            updateStepView(currentPage, prevFrames, isHit);
        }
        
        updateStatistics();
        
        // Move to next step
        currentStep++;
    }

    function findFrameToReplace(currentPage) {
        // Check if there are empty frames
        const emptyIndex = frames.indexOf(null);
        if (emptyIndex !== -1) {
            return emptyIndex;
        }
        
        // If no empty frames, use the algorithm to decide which frame to replace
        switch(algorithm) {
            case 'fifo':
                return fifoReplace();
            case 'lru':
                return lruReplace();
            case 'lfu':
                return lfuReplace();
            case 'mru':
                return mruReplace();
            case 'random':
                return randomReplace();
            default:
                return 0; // Default to first frame
        }
    }

    function fifoReplace() {
        // Get the oldest page from the queue
        const oldestPage = extraData.queue.shift();
        return frames.indexOf(oldestPage);
    }

    function lruReplace() {
        // Find the page with the lowest (oldest) timestamp
        let leastRecentlyUsed = Infinity;
        let replaceIndex = 0;
        
        for (let i = 0; i < frames.length; i++) {
            const page = frames[i];
            if (extraData.lastUsed[page] < leastRecentlyUsed) {
                leastRecentlyUsed = extraData.lastUsed[page];
                replaceIndex = i;
            }
        }
        
        return replaceIndex;
    }

    function lfuReplace() {
        // Find the page with the lowest frequency
        let lowestFrequency = Infinity;
        let replaceIndex = 0;
        
        for (let i = 0; i < frames.length; i++) {
            const page = frames[i];
            if (extraData.frequency[page] < lowestFrequency) {
                lowestFrequency = extraData.frequency[page];
                replaceIndex = i;
            }
        }
        
        return replaceIndex;
    }

    function mruReplace() {
        // Find the page with the highest (most recent) timestamp
        let mostRecentlyUsed = -1;
        let replaceIndex = 0;
        
        for (let i = 0; i < frames.length; i++) {
            const page = frames[i];
            if (extraData.lastUsed[page] > mostRecentlyUsed) {
                mostRecentlyUsed = extraData.lastUsed[page];
                replaceIndex = i;
            }
        }
        
        return replaceIndex;
    }

    function randomReplace() {
        // Randomly select a frame to replace
        return Math.floor(Math.random() * frames.length);
    }

    function updateExtraDataOnHit(page, frameIndex) {
        switch(algorithm) {
            case 'lru':
            case 'mru':
                // Update timestamp for the accessed page
                extraData.lastUsed[page] = currentStep;
                break;
            case 'lfu':
                // Increment frequency for the accessed page
                extraData.frequency[page]++;
                break;
            case 'fifo':
                // No change to queue on hit
                break;
        }
    }

    function updateExtraDataOnFault(page, frameIndex) {
        switch(algorithm) {
            case 'lru':
            case 'mru':
                // Set timestamp for the new page
                extraData.lastUsed[page] = currentStep;
                break;
            case 'lfu':
                // Initialize frequency for the new page
                extraData.frequency[page] = 1;
                break;
            case 'fifo':
                // Add new page to queue
                extraData.queue.push(page);
                break;
        }
    }

    function displayReferenceString() {
        referenceDisplay.innerHTML = '';
        
        referenceString.forEach((page, index) => {
            const pageElement = document.createElement('div');
            pageElement.classList.add('ref-item');
            pageElement.dataset.index = index;
            pageElement.textContent = page;
            referenceDisplay.appendChild(pageElement);
        });
    }

    function updateReferenceHighlight() {
        // Remove highlight from all reference items
        document.querySelectorAll('.ref-item').forEach(item => {
            item.classList.remove('current');
        });
        
        // Add highlight to current step
        const currentItem = document.querySelector(`.ref-item[data-index="${currentStep}"]`);
        if (currentItem) {
            currentItem.classList.add('current');
        }
    }

    function displayFrames(prevFrames, isHit) {
        framesContainer.innerHTML = '';
        
        // Create row for previous frames
        const prevRow = document.createElement('div');
        prevRow.classList.add('frame-row');
        prevRow.innerHTML = '<div class="frame-label">Previous:</div>';
        
        prevFrames.forEach(frame => {
            const frameElement = document.createElement('div');
            frameElement.classList.add('frame');
            frameElement.textContent = frame !== null ? frame : '-';
            prevRow.appendChild(frameElement);
        });
        
        framesContainer.appendChild(prevRow);
        
        // Create row for current frames
        const currentRow = document.createElement('div');
        currentRow.classList.add('frame-row');
        currentRow.innerHTML = '<div class="frame-label">Current:</div>';
        
        // Create a container for frame state changes
        const frameChangesDiv = document.createElement('div');
        frameChangesDiv.classList.add('frame-changes');
        
        frames.forEach((frame, index) => {
            const frameElement = document.createElement('div');
            frameElement.classList.add('frame');
            
            if (frame !== null) {
                frameElement.textContent = frame;
                
                // Track and display frame changes
                if (prevFrames[index] !== frame) {
                    frameElement.classList.add('new');
                    
                    // Add change indicator
                    const changeIndicator = document.createElement('div');
                    changeIndicator.classList.add('change-indicator');
                    changeIndicator.innerHTML = prevFrames[index] === null ? 
                        `<span class="new-page">New: ${frame}</span>` : 
                        `<span class="replaced-page">Replaced: ${prevFrames[index]} → ${frame}</span>`;
                    frameChangesDiv.appendChild(changeIndicator);
                } else if (frame === referenceString[currentStep] && isHit) {
                    frameElement.classList.add('active');
                }
            } else {
                frameElement.textContent = '-';
            }
            
            currentRow.appendChild(frameElement);
        });
        
        framesContainer.appendChild(currentRow);
        
        // Add result row with more detailed information
        const resultRow = document.createElement('div');
        resultRow.classList.add('frame-row', 'result-row');
        
        const resultLabel = document.createElement('div');
        resultLabel.classList.add('frame-label');
        resultLabel.textContent = 'Result:';
        
        const resultInfo = document.createElement('div');
        resultInfo.classList.add('result', isHit ? 'hit-result' : 'fault-result');
        
        // Add more detailed information about the current step
        resultInfo.innerHTML = isHit ? 
            `<strong>HIT</strong> - Page ${referenceString[currentStep]} found in frame` : 
            `<strong>FAULT</strong> - Page ${referenceString[currentStep]} not in memory`;
        
        resultRow.appendChild(resultLabel);
        resultRow.appendChild(resultInfo);
        framesContainer.appendChild(resultRow);
        
        // Add the frame changes information if there are any changes
        if (frameChangesDiv.children.length > 0) {
            const changesRow = document.createElement('div');
            changesRow.classList.add('frame-row', 'changes-row');
            
            const changesLabel = document.createElement('div');
            changesLabel.classList.add('frame-label');
            changesLabel.textContent = 'Changes:';
            
            changesRow.appendChild(changesLabel);
            changesRow.appendChild(frameChangesDiv);
            framesContainer.appendChild(changesRow);
        }
        
        // Add a divider between steps for clarity
        const divider = document.createElement('div');
        divider.classList.add('step-divider');
        divider.innerHTML = `<span>Step ${currentStep + 1}: Page ${referenceString[currentStep]}</span>`;
        framesContainer.appendChild(divider);
        
        // Store the result of this step for statistics calculation
        storeStepResult(referenceString[currentStep], prevFrames, isHit, currentStep);
    }

    function updateStatistics() {
        // Calculate statistics based on all completed steps
        let hits = 0;
        let faults = 0;
        
        for (let i = 0; i <= currentStep; i++) {
            if (stepResults[i] && stepResults[i].isHit) {
                hits++;
            } else if (stepResults[i]) {
                faults++;
            }
        }
        
        pageHits = hits;
        pageFaults = faults;
        
        pageHitsElement.textContent = pageHits;
        pageFaultsElement.textContent = pageFaults;
        
        const total = pageHits + pageFaults;
        const ratio = total > 0 ? (pageHits / total).toFixed(2) : '0.00';
        hitRatioElement.textContent = ratio;
    }

    function resetSimulation() {
        clearInterval(simulationInterval);
        
        // Reset simulation variables
        frames = new Array(frameSize).fill(null);
        currentStep = 0;
        pageHits = 0;
        pageFaults = 0;
        stepResults = []; // Reset step results array
        
        // Reset UI
        referenceDisplay.innerHTML = '';
        framesContainer.innerHTML = '';
        pageHitsElement.textContent = '0';
        pageFaultsElement.textContent = '0';
        hitRatioElement.textContent = '0.00';
        
        // Reset extra data
        initializeExtraData();
        
        // Create empty simulation table
        createSimulationTable();
        
        // Enable simulate button
        simulateBtn.disabled = false;
        stepBtn.disabled = true;
    }

    function updateSpeed() {
        const speed = parseInt(speedControl.value);
        simulationSpeed = 2000 / speed; // Convert to milliseconds (faster as value increases)
        
        // If simulation is running, restart interval with new speed
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = setInterval(performStep, simulationSpeed);
        }
    }

    // Create a table for the simulation history with enhanced column structure
    function createSimulationTable() {
        // Clear existing content
        framesContainer.innerHTML = '';
        
        // Create the table
        const table = document.createElement('table');
        table.id = 'simulation-table';
        table.classList.add('simulation-table');
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Remove 'Action' from the headers array
        const headers = ['Step', 'Page Reference', 'Before and After frames', 'Result'];
        
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        tbody.id = 'simulation-tbody';
        table.appendChild(tbody);
        
        framesContainer.appendChild(table);
        
        // Add a caption or explanation
        const caption = document.createElement('div');
        caption.classList.add('table-caption');
        caption.innerHTML = `
            <p>This table shows each step of the ${algorithmSelect.options[algorithmSelect.selectedIndex].text} page replacement algorithm:</p>
            <ul>
                <li><strong>Before:</strong> Frame contents before processing the current page reference</li>
                <li><strong>After:</strong> Frame contents after processing the current page reference</li>
                <li><strong>Result:</strong> Whether the page was found in memory (HIT) or not (FAULT)</li>
            </ul>
        `;
        framesContainer.insertBefore(caption, table);
    }

    // Store detailed results for each step
    function storeStepResult(page, prevFrames, isHit, step) {
        stepResults[step] = {
            step: step + 1,
            page: page,
            prevFrames: [...prevFrames],
            currentFrames: [...frames],
            isHit: isHit
        };
    }

    // Update the table view to show all steps
    function updateTableView() {
        // Check if table exists, if not create it
        if (!document.getElementById('simulation-table')) {
            createSimulationTable();
        }
        
        // Get the table body
        const tbody = document.getElementById('simulation-tbody');
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Add all steps to the table
        for (let i = 0; i <= currentStep; i++) {
            if (stepResults[i]) {
                addStepToTable(stepResults[i], i);
            }
        }
        
        // Scroll to the bottom to show most recent step
        framesContainer.scrollTop = framesContainer.scrollHeight;
    }

    // Add a single step to the table - remove the Action column
    function addStepToTable(stepData, index) {
        const tbody = document.getElementById('simulation-tbody');
        const row = document.createElement('tr');
        
        // Highlight current step
        if (index === currentStep) {
            row.classList.add('current-step');
        }
        
        // Step column
        const stepCell = document.createElement('td');
        stepCell.textContent = stepData.step;
        row.appendChild(stepCell);
        
        // Page column
        const pageCell = document.createElement('td');
        pageCell.textContent = stepData.page;
        pageCell.classList.add('page-cell');
        row.appendChild(pageCell);
        
        // Previous frames column
        const prevFramesCell = document.createElement('td');
        prevFramesCell.classList.add('frames-cell');
        
        // Create previous frame visualization
        stepData.prevFrames.forEach(frame => {
            const frameSpan = document.createElement('span');
            frameSpan.classList.add('frame-in-table');
            
            if (frame !== null) {
                frameSpan.textContent = frame;
                // Highlight the frame that will be replaced if this is a fault
                if (!stepData.isHit && stepData.currentFrames.indexOf(stepData.page) !== -1 && frame === stepData.page) {
                    frameSpan.classList.add('to-be-replaced');
                }
            } else {
                frameSpan.textContent = '-';
                frameSpan.classList.add('empty-frame');
            }
            
            prevFramesCell.appendChild(frameSpan);
        });
        
        row.appendChild(prevFramesCell);
        
        // Current frames column
        const currentFramesCell = document.createElement('td');
        currentFramesCell.classList.add('frames-cell');
        
        // Create current frame visualization
        stepData.currentFrames.forEach((frame, index) => {
            const frameSpan = document.createElement('span');
            frameSpan.classList.add('frame-in-table');
            
            if (frame !== null) {
                frameSpan.textContent = frame;
                
                // Highlight if this frame was just changed
                if (stepData.prevFrames[index] !== frame) {
                    frameSpan.classList.add('new-frame');
                } else if (frame === stepData.page && stepData.isHit) {
                    frameSpan.classList.add('hit-frame');
                }
            } else {
                frameSpan.textContent = '-';
                frameSpan.classList.add('empty-frame');
            }
            
            currentFramesCell.appendChild(frameSpan);
        });
        
        row.appendChild(currentFramesCell);
        
        // Result column with more prominent styling
        const resultCell = document.createElement('td');
        resultCell.classList.add(stepData.isHit ? 'hit-result' : 'fault-result');
        resultCell.innerHTML = `<div class="result-badge">${stepData.isHit ? 'HIT' : 'FAULT'}</div>`;
        row.appendChild(resultCell);
        
        // Add the row to the table
        tbody.appendChild(row);
    }

    // Update step view with current step details
    function updateStepView(currentPage, prevFrames, isHit) {
        const stepDetails = document.getElementById('step-details');
        stepDetails.innerHTML = '';
        
        // Create header with step information
        const stepHeader = document.createElement('div');
        stepHeader.classList.add('step-header');
        stepHeader.innerHTML = `
            <h4>Step ${currentStep + 1}: Reference Page ${currentPage}</h4>
            <div class="step-result ${isHit ? 'hit-result' : 'fault-result'}">
                Result: ${isHit ? 'HIT' : 'FAULT'}
            </div>
        `;
        stepDetails.appendChild(stepHeader);
        
        // Create frame comparison view
        const frameComparison = document.createElement('div');
        frameComparison.classList.add('frame-comparison');
        
        // Before section
        const beforeSection = document.createElement('div');
        beforeSection.classList.add('comparison-section');
        beforeSection.innerHTML = '<h5>Before</h5>';
        
        const beforeFrames = document.createElement('div');
        beforeFrames.classList.add('comparison-frames');
        
        prevFrames.forEach((frame, index) => {
            const frameDiv = document.createElement('div');
            frameDiv.classList.add('comparison-frame');
            
            if (frame !== null) {
                frameDiv.textContent = frame;
                if (!isHit && frames[index] !== frame) {
                    frameDiv.classList.add('to-be-replaced');
                }
            } else {
                frameDiv.textContent = '-';
                frameDiv.classList.add('empty-frame');
            }
            
            beforeFrames.appendChild(frameDiv);
        });
        
        beforeSection.appendChild(beforeFrames);
        frameComparison.appendChild(beforeSection);
        
        // Arrow indicator
        const arrow = document.createElement('div');
        arrow.classList.add('comparison-arrow');
        arrow.innerHTML = '→';
        frameComparison.appendChild(arrow);
        
        // After section
        const afterSection = document.createElement('div');
        afterSection.classList.add('comparison-section');
        afterSection.innerHTML = '<h5>After</h5>';
        
        const afterFrames = document.createElement('div');
        afterFrames.classList.add('comparison-frames');
        
        frames.forEach((frame, index) => {
            const frameDiv = document.createElement('div');
            frameDiv.classList.add('comparison-frame');
            
            if (frame !== null) {
                frameDiv.textContent = frame;
                if (prevFrames[index] !== frame) {
                    frameDiv.classList.add('new-frame');
                } else if (frame === currentPage && isHit) {
                    frameDiv.classList.add('hit-frame');
                }
            } else {
                frameDiv.textContent = '-';
                frameDiv.classList.add('empty-frame');
            }
            
            afterFrames.appendChild(frameDiv);
        });
        
        afterSection.appendChild(afterFrames);
        frameComparison.appendChild(afterSection);
        stepDetails.appendChild(frameComparison);
        
        // Add explanation
        const explanation = document.createElement('div');
        explanation.classList.add('step-explanation');
        
        if (isHit) {
            explanation.innerHTML = `
                <h5>Explanation:</h5>
                <p>Page ${currentPage} was found in memory, so no page replacement was needed.</p>
                <p>This counts as a page hit.</p>
            `;
        } else {
            // Find what was replaced
            let replacedPage = null;
            let replacedIndex = null;
            
            for (let i = 0; i < frames.length; i++) {
                if (frames[i] !== prevFrames[i]) {
                    replacedPage = prevFrames[i];
                    replacedIndex = i;
                    break;
                }
            }
            
            if (replacedPage === null) {
                explanation.innerHTML = `
                    <h5>Explanation:</h5>
                    <p>Page ${currentPage} was not in memory, but there was an empty frame available.</p>
                    <p>The page was loaded into the empty frame without needing to replace any existing page.</p>
                    <p>This counts as a page fault.</p>
                `;
            } else {
                // Provide algorithm-specific explanation
                let algorithmExplanation = '';
                switch(algorithm) {
                    case 'fifo':
                        algorithmExplanation = `According to FIFO, page ${replacedPage} was the oldest page in memory.`;
                        break;
                    case 'lru':
                        algorithmExplanation = `According to LRU, page ${replacedPage} was the least recently used page.`;
                        break;
                    case 'lfu':
                        algorithmExplanation = `According to LFU, page ${replacedPage} was the least frequently used page.`;
                        break;
                    case 'mru':
                        algorithmExplanation = `According to MRU, page ${replacedPage} was the most recently used page.`;
                        break;
                    case 'random':
                        algorithmExplanation = `According to Random replacement, page ${replacedPage} was randomly selected.`;
                        break;
                }
                
                explanation.innerHTML = `
                    <h5>Explanation:</h5>
                    <p>Page ${currentPage} was not in memory, so a page replacement was needed.</p>
                    <p>${algorithmExplanation}</p>
                    <p>Page ${replacedPage} in frame ${replacedIndex + 1} was replaced with page ${currentPage}.</p>
                    <p>This counts as a page fault.</p>
                `;
            }
        }
        
        stepDetails.appendChild(explanation);
        
        // Add algorithm state information if applicable
        if (algorithm !== 'random') {
            const stateInfo = document.createElement('div');
            stateInfo.classList.add('algorithm-state');
            
            let stateHTML = '<h5>Algorithm State:</h5>';
            
            switch(algorithm) {
                case 'fifo':
                    stateHTML += '<p>FIFO Queue (oldest first): ';
                    if (extraData.queue.length > 0) {
                        stateHTML += extraData.queue.join(' → ');
                    } else {
                        stateHTML += 'Empty';
                    }
                    stateHTML += '</p>';
                    break;
                    
                case 'lru':
                case 'mru':
                    stateHTML += '<p>Page Timestamp (lower = older):</p><ul>';
                    for (const page in extraData.lastUsed) {
                        stateHTML += `<li>Page ${page}: ${extraData.lastUsed[page]}</li>`;
                    }
                    stateHTML += '</ul>';
                    break;
                    
                case 'lfu':
                    stateHTML += '<p>Page Frequency:</p><ul>';
                    for (const page in extraData.frequency) {
                        stateHTML += `<li>Page ${page}: ${extraData.frequency[page]}</li>`;
                    }
                    stateHTML += '</ul>';
                    break;
            }
            
            stateInfo.innerHTML = stateHTML;
            stepDetails.appendChild(stateInfo);
        }
    }
}); 
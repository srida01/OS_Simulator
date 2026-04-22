document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const numProcessesInput = document.getElementById('num-processes');
    const numResourcesInput = document.getElementById('num-resources');
    const generateTablesBtn = document.getElementById('generate-tables');
    const loadDemoBtn = document.getElementById('load-demo');
    const runAlgorithmBtn = document.getElementById('run-algorithm');
    const tablesSection = document.getElementById('tables-section');
    const resultsSection = document.getElementById('results-section');
    const maxMatrixDiv = document.getElementById('max-matrix');
    const allocationMatrixDiv = document.getElementById('allocation-matrix');
    const availableResourcesDiv = document.getElementById('available-resources');
    const needMatrixDiv = document.getElementById('need-matrix');
    const systemStateDiv = document.getElementById('system-state');
    const safeSequenceDiv = document.getElementById('safe-sequence');
    const stepExecutionDiv = document.getElementById('step-execution');

    // Event Listeners
    generateTablesBtn.addEventListener('click', generateTables);
    loadDemoBtn.addEventListener('click', loadDemo);
    runAlgorithmBtn.addEventListener('click', runBankersAlgorithm);

    // Generate tables based on user input
    function generateTables() {
        const numProcesses = parseInt(numProcessesInput.value);
        const numResources = parseInt(numResourcesInput.value);

        if (numProcesses < 1 || numResources < 1 || numProcesses > 10 || numResources > 10) {
            alert('Please enter valid numbers (1-10) for processes and resources.');
            return;
        }

        // Generate Maximum Demand Matrix
        maxMatrixDiv.innerHTML = generateMatrixHTML('max', numProcesses, numResources);

        // Generate Allocation Matrix
        allocationMatrixDiv.innerHTML = generateMatrixHTML('allocation', numProcesses, numResources);

        // Generate Available Resources
        availableResourcesDiv.innerHTML = generateResourceVectorHTML(numResources);

        // Show tables section
        tablesSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    }

    // Generate HTML for a matrix input table
    function generateMatrixHTML(prefix, rows, cols) {
        let html = `<table><tr><th></th>`;
        
        // Column headers (Resource types)
        for (let j = 0; j < cols; j++) {
            html += `<th>R${j}</th>`;
        }
        html += `</tr>`;

        // Table rows
        for (let i = 0; i < rows; i++) {
            html += `<tr><th>P${i}</th>`;
            for (let j = 0; j < cols; j++) {
                html += `<td><input type="number" id="${prefix}-${i}-${j}" min="0" value="0"></td>`;
            }
            html += `</tr>`;
        }
        html += `</table>`;
        return html;
    }

    // Generate HTML for available resources vector
    function generateResourceVectorHTML(cols) {
        let html = `<table><tr>`;
        
        // Column headers (Resource types)
        for (let j = 0; j < cols; j++) {
            html += `<th>R${j}</th>`;
        }
        html += `</tr><tr>`;

        // Input fields
        for (let j = 0; j < cols; j++) {
            html += `<td><input type="number" id="available-${j}" min="0" value="0"></td>`;
        }
        html += `</tr></table>`;
        return html;
    }

    // Load demo values
    function loadDemo() {
        // Set 5 processes and 3 resources
        numProcessesInput.value = 5;
        numResourcesInput.value = 3;
        generateTables();

        // Demo values for Maximum Demand Matrix
        const maxDemo = [
            [7, 5, 3],
            [3, 2, 2],
            [9, 0, 2],
            [2, 2, 2],
            [4, 3, 3]
        ];

        // Demo values for Allocation Matrix
        const allocationDemo = [
            [0, 1, 0],
            [2, 0, 0],
            [3, 0, 2],
            [2, 1, 1],
            [0, 0, 2]
        ];

        // Demo values for Available Resources
        const availableDemo = [3, 3, 2];

        // Set demo values in the UI
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 3; j++) {
                document.getElementById(`max-${i}-${j}`).value = maxDemo[i][j];
                document.getElementById(`allocation-${i}-${j}`).value = allocationDemo[i][j];
            }
        }

        for (let j = 0; j < 3; j++) {
            document.getElementById(`available-${j}`).value = availableDemo[j];
        }
    }

    // Run Banker's Algorithm
    function runBankersAlgorithm() {
        const numProcesses = parseInt(numProcessesInput.value);
        const numResources = parseInt(numResourcesInput.value);

        // Read matrices from UI
        const maxMatrix = readMatrixFromUI('max', numProcesses, numResources);
        const allocationMatrix = readMatrixFromUI('allocation', numProcesses, numResources);
        const availableResources = readResourceVectorFromUI(numResources);

        // Validate input data
        if (!validateInputData(maxMatrix, allocationMatrix, availableResources)) {
            return;
        }

        // Calculate Need Matrix
        const needMatrix = calculateNeedMatrix(maxMatrix, allocationMatrix);

        // Check if the system is in a safe state
        const { isSafe, safeSequence, steps } = checkSafeState(
            numProcesses, 
            numResources, 
            maxMatrix, 
            allocationMatrix, 
            needMatrix, 
            availableResources
        );

        // Display results
        displayResults(needMatrix, isSafe, safeSequence, steps);
    }

    // Read matrix values from UI
    function readMatrixFromUI(prefix, rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                const value = parseInt(document.getElementById(`${prefix}-${i}-${j}`).value);
                row.push(value);
            }
            matrix.push(row);
        }
        return matrix;
    }

    // Read resource vector from UI
    function readResourceVectorFromUI(cols) {
        const vector = [];
        for (let j = 0; j < cols; j++) {
            const value = parseInt(document.getElementById(`available-${j}`).value);
            vector.push(value);
        }
        return vector;
    }

    // Validate input data
    function validateInputData(maxMatrix, allocationMatrix, availableResources) {
        // Check if allocation exceeds max claim
        for (let i = 0; i < maxMatrix.length; i++) {
            for (let j = 0; j < maxMatrix[i].length; j++) {
                if (allocationMatrix[i][j] > maxMatrix[i][j]) {
                    alert(`Error: Allocation for Process ${i}, Resource ${j} exceeds maximum claim!`);
                    return false;
                }
            }
        }
        return true;
    }

    // Calculate Need Matrix
    function calculateNeedMatrix(maxMatrix, allocationMatrix) {
        const needMatrix = [];
        for (let i = 0; i < maxMatrix.length; i++) {
            const row = [];
            for (let j = 0; j < maxMatrix[i].length; j++) {
                row.push(maxMatrix[i][j] - allocationMatrix[i][j]);
            }
            needMatrix.push(row);
        }
        return needMatrix;
    }

    // Check if the system is in a safe state
    function checkSafeState(numProcesses, numResources, maxMatrix, allocationMatrix, needMatrix, availableResources) {
        // Initialize variables
        const work = [...availableResources]; // Available resources
        const finish = Array(numProcesses).fill(false); // Track which processes are finished
        const safeSequence = [];
        const steps = [];
        
        let found;
        do {
            found = false;
            
            // Find a process that can be allocated resources
            for (let i = 0; i < numProcesses; i++) {
                if (!finish[i]) {
                    // Check if all resources for this process can be allocated
                    let canAllocate = true;
                    for (let j = 0; j < numResources; j++) {
                        if (needMatrix[i][j] > work[j]) {
                            canAllocate = false;
                            break;
                        }
                    }
                    
                    if (canAllocate) {
                        // Record step information
                        const stepInfo = {
                            process: i,
                            granted: true,
                            need: [...needMatrix[i]],
                            available: [...work],
                            reason: 'Resources granted'
                        };
                        
                        // Process can complete, update work resources
                        for (let j = 0; j < numResources; j++) {
                            work[j] += allocationMatrix[i][j];
                        }
                        
                        // Update step with new available resources
                        stepInfo.newAvailable = [...work];
                        steps.push(stepInfo);
                        
                        finish[i] = true;
                        safeSequence.push(i);
                        found = true;
                        break; // Break out of the for loop once we find a process
                    } else {
                        // Record failed attempt
                        steps.push({
                            process: i,
                            granted: false,
                            need: [...needMatrix[i]],
                            available: [...work],
                            reason: 'Insufficient resources'
                        });
                    }
                }
            }
        } while (found);
        
        // Check if all processes could finish
        const isSafe = finish.every(f => f);
        
        return { isSafe, safeSequence, steps };
    }

    // Display results
    function displayResults(needMatrix, isSafe, safeSequence, steps) {
        // Display Need Matrix
        needMatrixDiv.innerHTML = generateStaticMatrixHTML(needMatrix, 'Need');
        
        // Display System State
        systemStateDiv.textContent = isSafe ? 'SAFE STATE' : 'UNSAFE STATE';
        systemStateDiv.className = isSafe ? 'safe' : 'unsafe';
        
        // Display Safe Sequence
        if (isSafe) {
            safeSequenceDiv.textContent = 'Safe Sequence: ' + safeSequence.map(p => 'P' + p).join(' → ');
        } else {
            safeSequenceDiv.textContent = 'No safe sequence exists.';
        }
        
        // Display Step-by-Step Execution
        displayStepExecution(steps);
        
        // Show results section
        resultsSection.classList.remove('hidden');
    }

    // Generate HTML for a static matrix (for display, not input)
    function generateStaticMatrixHTML(matrix, title) {
        let html = `<table><tr><th></th>`;
        
        // Column headers (Resource types)
        for (let j = 0; j < matrix[0].length; j++) {
            html += `<th>R${j}</th>`;
        }
        html += `</tr>`;

        // Table rows
        for (let i = 0; i < matrix.length; i++) {
            html += `<tr><th>P${i}</th>`;
            for (let j = 0; j < matrix[i].length; j++) {
                html += `<td>${matrix[i][j]}</td>`;
            }
            html += `</tr>`;
        }
        html += `</table>`;
        return html;
    }

    // Display step-by-step execution
    function displayStepExecution(steps) {
        stepExecutionDiv.innerHTML = '';
        
        let stepNumber = 1;
        steps.forEach(step => {
            const stepDiv = document.createElement('div');
            stepDiv.className = `step ${step.granted ? 'process-granted' : 'process-denied'}`;
            
            let content = `<strong>Step ${stepNumber}:</strong> `;
            content += `<strong>Process P${step.process}</strong> - ${step.reason}.<br>`;
            content += `Need: [${step.need.join(', ')}]<br>`;
            content += `Available: [${step.available.join(', ')}]<br>`;
            
            if (step.granted) {
                content += `Process completes and releases resources.<br>`;
                content += `New Available: [${step.newAvailable.join(', ')}]`;
            }
            
            stepDiv.innerHTML = content;
            stepExecutionDiv.appendChild(stepDiv);
            stepNumber++;
        });
    }

    // Modal functionality
    const howToUseBtn = document.getElementById('how-to-use-btn');
    const howToUseModal = document.getElementById('how-to-use-modal');
    const modalClose = document.getElementById('modal-close');
    
    howToUseBtn.addEventListener('click', function() {
        howToUseModal.style.display = 'flex';
    });
    
    modalClose.addEventListener('click', function() {
        howToUseModal.style.display = 'none';
    });
    
    // Close modal when clicking outside of modal content
    howToUseModal.addEventListener('click', function(event) {
        if (event.target === howToUseModal) {
            howToUseModal.style.display = 'none';
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && howToUseModal.style.display === 'flex') {
            howToUseModal.style.display = 'none';
        }
    });
}); 
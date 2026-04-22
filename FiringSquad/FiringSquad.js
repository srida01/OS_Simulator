document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const processContainer = document.getElementById('process-container');
    const startBtn = document.getElementById('start-btn');
    const stepBtn = document.getElementById('step-btn');
    const resetBtn = document.getElementById('reset-btn');
    const numProcessesInput = document.getElementById('num-processes');
    const simulationSpeedInput = document.getElementById('simulation-speed');
    const applySettingsBtn = document.getElementById('apply-settings');
    const stepDisplay = document.querySelector('.step-display');
    const statusMessage = document.querySelector('.status-message');

    // Simulation parameters
    let numProcesses = parseInt(numProcessesInput.value);
    let simulationSpeed = parseInt(simulationSpeedInput.value);
    let processes = [];
    let step = 0;
    let isRunning = false;
    let simulationInterval;
    let isComplete = false;

    // State constants
    const STATES = {
        QUIESCENT: 'Q',
        GENERAL: 'G',
        LEADER: 'L',
        ACTIVE: 'A',
        FIRED: 'F'
    };

    // Initialize the simulation
    function initializeSimulation() {
        processContainer.innerHTML = '';
        processes = [];
        step = 0;
        isRunning = false;
        isComplete = false;
        clearInterval(simulationInterval);
        
        // Update display
        stepDisplay.textContent = `Step: ${step}`;
        statusMessage.textContent = 'Initialize the processes and click Start';
        
        // Create processes
        for (let i = 0; i < numProcesses; i++) {
            const processDiv = document.createElement('div');
            processDiv.className = 'process';
            
            const processLabel = document.createElement('span');
            processLabel.className = 'process-label';
            processLabel.textContent = i;
            
            const stateIndicator = document.createElement('span');
            stateIndicator.className = 'state-indicator';
            
            processDiv.appendChild(processLabel);
            processDiv.appendChild(stateIndicator);
            processContainer.appendChild(processDiv);
            
            // Process state data
            const process = {
                id: i,
                element: processDiv,
                stateIndicator: stateIndicator,
                state: i === 0 ? STATES.LEADER : STATES.GENERAL,
                active: false,
                fired: false
            };
            
            processes.push(process);
        }
        
        // Reset button states
        startBtn.disabled = false;
        stepBtn.disabled = false;
        startBtn.textContent = 'Start Simulation';
        
        // Set initial visual state
        updateVisualState();
    }

    // Update the visual representation based on process states
    function updateVisualState() {
        processes.forEach(process => {
            process.element.className = 'process';
            
            // Add appropriate classes based on state
            if (process.state === STATES.LEADER) {
                process.element.classList.add('leader');
            } else if (process.state === STATES.GENERAL) {
                process.element.classList.add('general');
            }
            
            if (process.active) {
                process.element.classList.add('active');
            }
            
            if (process.fired) {
                process.element.classList.add('fired');
            }
            
            // Update state indicator text
            process.stateIndicator.textContent = process.state;
        });
    }

    // Perform one step of the simulation
    function performStep() {
        if (isComplete) return;
        
        step++;
        stepDisplay.textContent = `Step: ${step}`;
        
        if (step === 1) {
            // First step - Leader initiates signals
            statusMessage.textContent = 'Leader initiates synchronization signal';
            processes[0].active = true;
            updateVisualState();
            return;
        }
        
        // For propagation steps - we need to fix this part
        if (step <= numProcesses) {
            // Propagate signal from left to right
            const currentIdx = step - 1;
            
            if (currentIdx < numProcesses) {
                processes[currentIdx].active = true;
                statusMessage.textContent = `Signal propagating... (${currentIdx}/${numProcesses-1})`;
            }
            
            updateVisualState();
            return;
        }
        
        // When signal reaches the end
        if (step === numProcesses + 1) {
            statusMessage.textContent = 'Signal reached end, starting return wave';
            // All processes are now active
            processes.forEach(process => {
                process.active = true;
            });
            updateVisualState();
            return;
        }
        
        // Countdown before firing
        const countdownRemaining = numProcesses * 2 - step;
        if (countdownRemaining > 0) {
            statusMessage.textContent = `Synchronizing... Firing in ${countdownRemaining} steps`;
            updateVisualState();
            return;
        }
        
        // Fire!
        if (step === numProcesses * 2) {
            processes.forEach(process => {
                process.fired = true;
                process.active = false;
                process.state = STATES.FIRED;
            });
            updateVisualState();
            statusMessage.textContent = 'All processes fired simultaneously!';
            isComplete = true;
            
            // Stop any running simulation
            clearInterval(simulationInterval);
            isRunning = false;
            startBtn.textContent = 'Start Simulation';
            startBtn.disabled = true;
            stepBtn.disabled = true;
        }
    }

    // Start/stop the simulation
    function toggleSimulation() {
        if (isComplete) return;
        
        if (isRunning) {
            clearInterval(simulationInterval);
            isRunning = false;
            startBtn.textContent = 'Start Simulation';
        } else {
            isRunning = true;
            startBtn.textContent = 'Pause Simulation';
            
            // Calculate actual delay time - FIXED HERE
            // Invert the speed value so that lower values = faster simulation
            const maxSpeed = 1000; // Maximum delay (1 second)
            const actualDelay = maxSpeed - simulationSpeed;
            
            simulationInterval = setInterval(performStep, actualDelay);
        }
    }

    // Apply settings
    function applySettings() {
        const newNumProcesses = parseInt(numProcessesInput.value);
        simulationSpeed = parseInt(simulationSpeedInput.value);
        
        if (newNumProcesses !== numProcesses) {
            numProcesses = newNumProcesses;
            initializeSimulation();
        }
        
        // Calculate actual delay for display
        const maxSpeed = 1000;
        const actualDelay = maxSpeed - simulationSpeed;
        
        statusMessage.textContent = `Settings applied: ${numProcesses} processes, ${actualDelay}ms delay`;
    }

    // Event listeners
    startBtn.addEventListener('click', toggleSimulation);
    
    stepBtn.addEventListener('click', () => {
        if (!isComplete) {
            performStep();
        }
    });
    
    resetBtn.addEventListener('click', initializeSimulation);
    
    applySettingsBtn.addEventListener('click', applySettings);

    // Initialize simulation on load
    initializeSimulation();
});
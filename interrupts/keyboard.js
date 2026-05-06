
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const startButton = document.getElementById('startButton');
  const resetButton = document.getElementById('resetButton');
  const key = document.getElementById('key');
  const signal = document.getElementById('signal');
  const dataPacket = document.getElementById('dataPacket');
  const stepInfo = document.getElementById('stepInfo');
  const systemStatus = document.getElementById('systemStatus');
  const cpuStatus = document.getElementById('cpuStatus');
  const interruptFlag = document.getElementById('interruptFlag');
  const progressBar = document.getElementById('progressBar');
  const stackContent = document.getElementById('stackContent');
  const isrCode = document.getElementById('isrCode');
  const vectorEntry = document.getElementById('vectorEntry');
  const cpuDetails = document.getElementById('cpuDetails');
  
  // Get all components
  const keyboard = document.getElementById('keyboard');
  const circuit = document.getElementById('circuit');
  const interruptController = document.getElementById('interruptController');
  const cpu = document.getElementById('cpu');
  const os = document.getElementById('os');
  const vectorTable = document.getElementById('vectorTable');
  const process = document.getElementById('process');
  const isr = document.getElementById('isr');
  const processStack = document.getElementById('processStack');
  
  // Animation variables
  let animationRunning = false;
  let currentStep = 0;
  
  // Animation waypoints with positions, messages, and delays
  const waypoints = [
    { // Step 0: Key press
      x: 90, 
      y: 75, 
      message: "1. Key 'A' is pressed, generating electrical signal (Scancode: 0x1E)",
      highlight: [keyboard],
      showData: false,
      actions: () => {
        key.classList.add('pressed');
        systemStatus.textContent = "Key Pressed";
        progressBar.style.width = '8%';
      }
    },
    { // Step 1: Circuit completes
      x: 130, 
      y: 160, 
      message: "2. Keyboard controller detects keypress and translates to scancode 0x1E",
      highlight: [keyboard, circuit],
      showData: false,
      actions: () => {
        circuit.classList.add('pulse');
        progressBar.style.width = '16%';
      }
    },
    { // Step 2: Signal to interrupt controller
      x: 200, 
      y: 180, 
      message: "3. Keyboard controller sends IRQ signal to interrupt controller",
      highlight: [circuit, interruptController],
      showData: false,
      actions: () => {
        circuit.classList.remove('pulse');
        progressBar.style.width = '24%';
      }
    },
    { // Step 3: Interrupt controller processes
      x: 410, 
      y: 160, 
      message: "4. Interrupt controller sets IRQ line 1 for keyboard interrupt",
      highlight: [interruptController],
      showData: false,
      actions: () => {
        interruptController.classList.add('pulse');
        progressBar.style.width = '32%';
      }
    },
    { // Step 4: Signal reaches CPU
      x: 600, 
      y: 160, 
      message: "5. CPU receives interrupt signal and checks its priority",
      highlight: [interruptController, cpu],
      showData: false,
      actions: () => {
        interruptController.classList.remove('pulse');
        interruptFlag.textContent = "IF: 0";
        interruptFlag.classList.add('interrupt-flag');
        cpuStatus.textContent = "Interrupt Detected";
        cpuDetails.textContent = "Checking interrupt priority\nSaving current state";
        progressBar.style.width = '40%';
      }
    },
    { // Step 5: CPU pauses current process
      x: 620, 
      y: 210, 
      message: "6. CPU saves current execution state to the stack",
      highlight: [cpu, processStack],
      showData: false,
      actions: () => {
        stackContent.innerHTML = "PC: 0x8042<br>Flags: 0x202<br><span style='color:#ebcb8b'>IP: 0x7F21</span>";
        process.style.opacity = "0.5";
        cpuStatus.textContent = "Process Paused";
        cpuDetails.textContent = "State saved to stack\nPreparing for ISR";
        progressBar.style.width = '48%';
      }
    },
    { // Step 6: CPU notifies OS
      x: 590, 
      y: 290, 
      message: "7. CPU transfers control to OS interrupt handler",
      highlight: [cpu, os],
      showData: false,
      actions: () => {
        os.classList.add('pulse');
        cpuDetails.textContent = "";
        systemStatus.textContent = "OS Handling Interrupt";
        progressBar.style.width = '56%';
      }
    },
    { // Step 7: OS looks up vector
      x: 410, 
      y: 340, 
      message: "8. OS accesses interrupt vector table to find keyboard handler",
      highlight: [os, vectorTable],
      showData: false,
      actions: () => {
        os.classList.remove('pulse');
        vectorTable.classList.add('pulse');
        vectorEntry.style.opacity = "1";
        progressBar.style.width = '64%';
      }
    },
    { // Step 8: Vector entry found
      x: 170, 
      y: 410, 
      message: "9. System locates keyboard interrupt handler at memory address 0x8C20",
      highlight: [vectorTable],
      showData: false,
      actions: () => {
        vectorTable.classList.remove('pulse');
        dataPacket.textContent = "0x8C20";
        dataPacket.style.display = "block";
        dataPacket.style.left = "170px";
        dataPacket.style.top = "410px";
        progressBar.style.width = '72%';
      }
    },
    { // Step 9: Execute ISR
      x: 450, 
      y: 450, 
      message: "10. OS executes the Keyboard Interrupt Service Routine (ISR)",
      highlight: [os, isr],
      showData: true,
      actions: () => {
        dataPacket.style.display = "none";
        isr.classList.add('pulse');
        isrCode.style.opacity = "1";
        cpuStatus.textContent = "Executing ISR";
        systemStatus.textContent = "Reading Keyboard Input";
        progressBar.style.width = '80%';
      }
    },
    { // Step 10: ISR processes keyboard data
      x: 450, 
      y: 345, 
      message: "11. ISR reads scancode (0x1E for 'A'), processes the input, and sends EOI",
      highlight: [isr],
      showData: false,
      actions: () => {
        dataPacket.textContent = "0x1E";
        dataPacket.style.display = "block";
        dataPacket.style.left = "450px";
        dataPacket.style.top = "420px";
        progressBar.style.width = '88%';
      }
    },
    { // Step 11: Return to OS
      x: 590, 
      y: 340, 
      message: "12. ISR completes, sends End Of Interrupt signal, control returns to OS",
      highlight: [isr, os],
      showData: false,
      actions: () => {
        isr.classList.remove('pulse');
        isrCode.style.opacity = "0";
        dataPacket.style.display = "none";
        progressBar.style.width = '92%';
      }
    },
    { // Step 12: Resume process
      x: 710, 
      y: 450, 
      message: "13. OS restores saved process state and resumes execution",
      highlight: [os, process, processStack],
      showData: false,
      actions: () => {
        process.style.opacity = "1";
        stackContent.innerHTML = "PC: 0x8042<br>Flags: 0x202";
        vectorEntry.style.opacity = "0";
        interruptFlag.textContent = "IF: 1";
        interruptFlag.classList.remove('interrupt-flag');
        cpuStatus.textContent = "Executing Current Process";
        systemStatus.textContent = "Normal";
        progressBar.style.width = '100%';
      }
    }
  ];
  
  // Reset all components
  function resetSimulation() {
    // Hide animation elements
    signal.style.display = 'none';
    dataPacket.style.display = 'none';
    
    // Reset key state
    key.classList.remove('pressed');
    
    // Reset component styles
    const components = document.querySelectorAll('.component');
    components.forEach(comp => {
      comp.style.borderWidth = '2px';
      comp.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      comp.classList.remove('pulse');
    });
    
    // Reset process
    process.style.opacity = "1";
    
    // Reset text elements
    stepInfo.textContent = 'Press the key to start the interrupt process visualization.';
    cpuStatus.textContent = 'Executing Current Process';
    systemStatus.textContent = 'Normal';
    interruptFlag.textContent = 'IF: 1';
    interruptFlag.classList.remove('interrupt-flag');
    stackContent.innerHTML = "PC: 0x8042<br>Flags: 0x202";
    cpuDetails.textContent = "";
    
    // Reset code and vector display
    isrCode.style.opacity = "0";
    vectorEntry.style.opacity = "0";
    
    // Reset progress bar
    progressBar.style.width = '0%';
    
    // Reset animation state
    currentStep = 0;
    animationRunning = false;
  }
  
  // Highlight components
  function highlightComponents(components) {
    // Reset all components first
    const allComponents = document.querySelectorAll('.component');
    allComponents.forEach(comp => {
      comp.style.borderWidth = '2px';
      comp.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    });
    
    // Highlight selected components
    components.forEach(comp => {
      comp.style.borderWidth = '3px';
      comp.style.boxShadow = '0 0 15px rgba(188, 236, 255, 0.7)';
    });
  }
  
  // Animate signal movement
  function animateSignal() {
    if (currentStep >= waypoints.length) {
      // Animation complete, enable restart
      animationRunning = false;
      setTimeout(() => {
        stepInfo.textContent = 'Interrupt processing complete. Click "Reset" to start over.';
      }, 1000);
      return;
    }
    
    // Get current waypoint
    const waypoint = waypoints[currentStep];
    
    // Set signal position
    signal.style.left = waypoint.x + 'px';
    signal.style.top = waypoint.y + 'px';
    
    // Show or hide data packet
    if (waypoint.showData) {
      dataPacket.style.display = 'block';
      dataPacket.style.left = (waypoint.x + 15) + 'px';
      dataPacket.style.top = waypoint.y + 'px';
    } else {
      dataPacket.style.display = 'none';
    }
    
    // Update info text
    stepInfo.textContent = waypoint.message;
    
    // Highlight components
    highlightComponents(waypoint.highlight);
    
    // Execute any specific actions for this step
    if (waypoint.actions) {
      waypoint.actions();
    }
    
    // Move to next step
    currentStep++;
    
    // Continue animation after delay
    setTimeout(animateSignal, 3000);
  }
  
  // Start animation
  function startAnimation() {
    if (animationRunning) return;
    
    animationRunning = true;
    resetSimulation();
    
    // Show initial signal
    signal.style.display = 'block';
    
    // Start animation
    animateSignal();
  }
  
  // Event listeners
  startButton.addEventListener('click', startAnimation);
  resetButton.addEventListener('click', resetSimulation);
  key.addEventListener('click', startAnimation);
});
const cpuBox = document.getElementById('cpuBox');
const interruptBox = document.getElementById('interruptBox');
const kernelBox = document.getElementById('kernelBox');
const vectorBox = document.getElementById('vectorBox');

function clearActive() {
  cpuBox.classList.remove('active');
  interruptBox.classList.remove('active');
  kernelBox.classList.remove('active');
  vectorBox.classList.remove('active');
}

async function runDemo() {
  clearActive();

  cpuBox.classList.add('active');
  await wait(1200);

  clearActive();
  interruptBox.classList.add('active');
  await wait(1200);

  clearActive();
  vectorBox.classList.add('active');
  await wait(1200);

  clearActive();
  kernelBox.classList.add('active');
  await wait(1500);

  clearActive();
  cpuBox.classList.add('active');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function scrollToFlow() {
  document.getElementById('flowSection').scrollIntoView({
    behavior: 'smooth'
  });
}
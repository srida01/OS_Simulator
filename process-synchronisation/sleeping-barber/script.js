// fifo queue implementation using array
class FifoQueue {
    constructor() { this.queue = []; }
    enqueue(item) { this.queue.push(item); }
    dequeue() { return this.queue.shift(); }
    size() { return this.queue.length; }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getValues() {
    let customers = document.getElementById("customerCount").value;
    let chair = document.getElementById("chairCount").value;
    customers = customers.trim().split(" ");
    let chairs = [];

    if (customers[0] === "") {
        document.getElementById("waitingRoom").innerHTML =
            `<div class="msg msg-blue">Waiting Room Empty at ${new Date().toLocaleTimeString()}</div>`;
        document.getElementById("cuttingRoom").innerHTML =
            `<div class="msg msg-green">Hair Cut Room Empty at ${new Date().toLocaleTimeString()}</div>`;
        document.getElementById("baberSl").classList.remove("hidden");
        document.getElementById("barberSleeping").innerHTML =
            `<div class="msg msg-warn">Barber Sleeping at ${new Date().toLocaleTimeString()}</div>`;
        return;
    } else if (chair === "") {
        document.getElementById("chEr").style.display = "block";
        return;
    }

    for (let i = 0; i < chair; i++) { chairs.push("chair" + i); }
    return [customers, chairs];
}

function clr() {
    ["leaveWaitingRoom","waitingRoom","cuttingRoom","cuttingLeavingRoom","barberSleeping"]
        .forEach(id => { document.getElementById(id).innerHTML = ""; });
    document.getElementById("cuttingLeaving").classList.add("hidden");
    document.getElementById("baberSl").classList.add("hidden");
}

function start() {
    clr();
    const result = getValues();
    if (!result) return;
    const [customers, chairs] = result;

    let waitting = 0;
    const queue = new FifoQueue();

    const leaveWaitingRoom  = document.getElementById("leaveWaitingRoom");
    const waitingRoom       = document.getElementById("waitingRoom");
    const cuttingRoom       = document.getElementById("cuttingRoom");
    const cuttingLeavingRoom= document.getElementById("cuttingLeavingRoom");
    const barberSleeping    = document.getElementById("barberSleeping");
    const baberSl           = document.getElementById("baberSl");
    const cuttingLeaving    = document.getElementById("cuttingLeaving");

    setTimeout(async () => {
        for (let i = 0; i < customers.length; i++) {
            if (waitting < chairs.length) {
                queue.enqueue(customers[i]);
                waitting++;
                waitingRoom.innerHTML +=
                    `<div class="msg msg-blue">Customer ${customers[i]} entered waiting room at ${new Date().toLocaleTimeString()}</div>`;
            } else {
                if (queue.size() === 0) return;
                leaveWaitingRoom.innerHTML +=
                    `<div class="msg msg-red">Customer ${customers[i]} left — no chairs available at ${new Date().toLocaleTimeString()}</div>`;
            }
        }
    }, 2000);

    setTimeout(async () => {
        if (waitting > 0) {
            for (let i = 0; i < waitting; i++) {
                const customer = queue.dequeue();
                waitingRoom.removeChild(waitingRoom.childNodes[0]);
                if (i === waitting - 1) {
                    waitingRoom.innerHTML +=
                        `<div class="msg msg-blue">Waiting Room Empty at ${new Date().toLocaleTimeString()}</div>`;
                }
                cuttingLeaving.classList.remove("hidden");
                cuttingRoom.innerHTML +=
                    `<div class="msg msg-green">Barber cutting hair of ${customer} at ${new Date().toLocaleTimeString()}</div>`;
                await sleep(2000);
                cuttingLeavingRoom.innerHTML +=
                    `<div class="msg msg-dim">Customer ${customer} left after haircut at ${new Date().toLocaleTimeString()}</div>`;
                await sleep(2000);
                cuttingRoom.removeChild(cuttingRoom.childNodes[0]);
                if (i === waitting - 1) {
                    cuttingRoom.innerHTML +=
                        `<div class="msg msg-green">Hair Cut Room Empty at ${new Date().toLocaleTimeString()}</div>`;
                }
                await sleep(2000);
            }
        }
        if (waitting === 0 || waitting === chairs.length) {
            if (waitting === 0) {
                waitingRoom.innerHTML +=
                    `<div class="msg msg-blue">Waiting Room Empty at ${new Date().toLocaleTimeString()}</div>`;
                cuttingRoom.innerHTML +=
                    `<div class="msg msg-green">Hair Cut Room Empty at ${new Date().toLocaleTimeString()}</div>`;
            }
            baberSl.classList.remove("hidden");
            barberSleeping.innerHTML +=
                `<div class="msg msg-warn">Barber Sleeping at ${new Date().toLocaleTimeString()}</div>`;
        }
    }, 2000);
}
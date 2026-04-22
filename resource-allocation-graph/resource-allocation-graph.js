document.addEventListener('DOMContentLoaded', function () {
    const graph = document.getElementById('rag-graph');
    const statusContent = document.getElementById('status-content');
    const addProcessBtn = document.getElementById('add-process-btn');
    const addResourceBtn = document.getElementById('add-resource-btn');
    const addEdgeBtn = document.getElementById('add-edge-btn');
    const detectDeadlockBtn = document.getElementById('detect-deadlock-btn');
    const resetBtn = document.getElementById('reset-btn');
    const fromSelect = document.getElementById('from-select');
    const toSelect = document.getElementById('to-select');

    let processCount = 0;
    let resourceCount = 0;
    let nodes = {};
    let edges = [];
    let draggingNode = null;
    let offsetX = 0;
    let offsetY = 0;

    initializeGraph();

    addProcessBtn.addEventListener('click', addProcess);
    addResourceBtn.addEventListener('click', addResource);
    addEdgeBtn.addEventListener('click', addEdge);
    detectDeadlockBtn.addEventListener('click', detectDeadlock);
    resetBtn.addEventListener('click', resetGraph);
    graph.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    function initializeGraph() {
        graph.style.position = 'relative';
        graph.style.height = '400px';
        updateStatus("Create a Resource Allocation Graph by adding processes and resources, then connect them with edges.");
    }

    function addProcess() {
        processCount++;
        const processId = 'P' + processCount;
        const processNode = document.createElement('div');
        processNode.className = 'node process';
        processNode.textContent = processId;
        processNode.setAttribute('data-id', processId);
        processNode.setAttribute('data-type', 'process');

        const x = Math.floor(Math.random() * (graph.offsetWidth - 100)) + 50;
        const y = Math.floor(Math.random() * (graph.offsetHeight - 100)) + 50;
        processNode.style.left = x + 'px';
        processNode.style.top = y + 'px';

        graph.appendChild(processNode);

        nodes[processId] = {
            id: processId,
            type: 'process',
            element: processNode,
            x: x,
            y: y
        };

        updateDropdowns();
        updateStatus(`Process ${processId} added to the graph.`);
    }

    function addResource() {
        resourceCount++;
        const resourceId = 'R' + resourceCount;
        const resourceNode = document.createElement('div');
        resourceNode.className = 'node resource';
        resourceNode.textContent = resourceId;
        resourceNode.setAttribute('data-id', resourceId);
        resourceNode.setAttribute('data-type', 'resource');

        const x = Math.floor(Math.random() * (graph.offsetWidth - 100)) + 50;
        const y = Math.floor(Math.random() * (graph.offsetHeight - 100)) + 50;
        resourceNode.style.left = x + 'px';
        resourceNode.style.top = y + 'px';

        graph.appendChild(resourceNode);

        nodes[resourceId] = {
            id: resourceId,
            type: 'resource',
            element: resourceNode,
            x: x,
            y: y
        };

        updateDropdowns();
        updateStatus(`Resource ${resourceId} added to the graph.`);
    }

    function addEdge() {
        const fromId = fromSelect.value;
        const toId = toSelect.value;

        if (!fromId || !toId || fromId === toId) {
            updateStatus("Invalid edge selection.");
            return;
        }

        if (edges.some(edge => edge.from === fromId && edge.to === toId)) {
            updateStatus("This edge already exists.");
            return;
        }

        const fromType = nodes[fromId].type;
        const toType = nodes[toId].type;

        if (fromType === toType) {
            updateStatus("Cannot connect nodes of the same type.");
            return;
        }

        createEdge(fromId, toId);
        fromSelect.value = "";
        toSelect.value = "";
        updateStatus(`Edge created from ${fromId} to ${toId}.`);
    }

    function createEdge(fromId, toId) {
        const fromNode = nodes[fromId];
        const toNode = nodes[toId];
        const fromX = fromNode.x + 25;
        const fromY = fromNode.y + 25;
        const toX = toNode.x + 25;
        const toY = toNode.y + 25;

        const length = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
        const angle = Math.atan2(toY - fromY, toX - fromX);

        const edge = document.createElement('div');
        edge.className = 'edge';
        edge.style.width = length + 'px';
        edge.style.left = fromX + 'px';
        edge.style.top = fromY + 'px';
        edge.style.transform = `rotate(${angle}rad)`;

        const arrow = document.createElement('div');
        arrow.className = 'arrow';
        arrow.style.left = (length - 5) + 'px';

        edge.appendChild(arrow);
        graph.appendChild(edge);

        edges.push({
            from: fromId,
            to: toId,
            element: edge,
            arrow: arrow,
            fromX: fromX,
            fromY: fromY,
            toX: toX,
            toY: toY
        });
    }

    function updateEdges() {
        edges.forEach(edge => {
            const fromNode = nodes[edge.from];
            const toNode = nodes[edge.to];

            const fromX = fromNode.x + 25;
            const fromY = fromNode.y + 25;
            const toX = toNode.x + 25;
            const toY = toNode.y + 25;

            const length = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
            const angle = Math.atan2(toY - fromY, toX - fromX);

            edge.element.style.width = length + 'px';
            edge.element.style.left = fromX + 'px';
            edge.element.style.top = fromY + 'px';
            edge.element.style.transform = `rotate(${angle}rad)`;
            edge.arrow.style.left = (length - 5) + 'px';
        });
    }

    function detectDeadlock() {
        resetHighlighting();
        const adjacencyList = {};
        const processToResource = {};
        const resourceToProcesses = {};

        Object.keys(nodes).forEach(nodeId => {
            if (nodes[nodeId].type === 'process') {
                adjacencyList[nodeId] = [];
            }
        });

        edges.forEach(edge => {
            const from = edge.from;
            const to = edge.to;
            const fromType = nodes[from].type;
            const toType = nodes[to].type;

            if (fromType === 'process' && toType === 'resource') {
                processToResource[from] = processToResource[from] || [];
                processToResource[from].push(to);
            } else if (fromType === 'resource' && toType === 'process') {
                resourceToProcesses[from] = resourceToProcesses[from] || [];
                resourceToProcesses[from].push(to);
            }
        });

        for (const process in processToResource) {
            processToResource[process].forEach(resource => {
                if (resourceToProcesses[resource]) {
                    resourceToProcesses[resource].forEach(holdingProcess => {
                        adjacencyList[process].push(holdingProcess);
                    });
                }
            });
        }

        const visited = {};
        const recStack = {};
        let cycleNodes = [];

        function dfs(node, path) {
            if (recStack[node]) {
                const cycleStart = path.indexOf(node);
                cycleNodes = path.slice(cycleStart);
                return true;
            }
            if (visited[node]) return false;

            visited[node] = true;
            recStack[node] = true;
            path.push(node);

            for (const neighbor of adjacencyList[node]) {
                if (dfs(neighbor, path)) return true;
            }

            recStack[node] = false;
            path.pop();
            return false;
        }

        let cycleDetected = false;
        for (const process in adjacencyList) {
            if (!visited[process] && dfs(process, [])) {
                cycleDetected = true;
                break;
            }
        }

        if (cycleDetected) {
            cycleNodes.forEach(id => nodes[id].element.classList.add('highlight'));

            for (let i = 0; i < cycleNodes.length; i++) {
                const from = cycleNodes[i];
                const to = cycleNodes[(i + 1) % cycleNodes.length];
                processToResource[from]?.forEach(resource => {
                    if (resourceToProcesses[resource]?.includes(to)) {
                        highlightEdge(from, resource);
                        highlightEdge(resource, to);
                        nodes[resource].element.classList.add('highlight');
                    }
                });
            }

            updateStatus(`Deadlock detected among: ${cycleNodes.join(', ')}`);
        } else {
            updateStatus("No deadlocks detected.");
        }
    }

    function highlightEdge(fromId, toId) {
        const edge = edges.find(e => e.from === fromId && e.to === toId);
        if (edge) {
            edge.element.style.backgroundColor = '#ffeb3b';
            edge.element.style.height = '3px';
            edge.arrow.style.borderBottomColor = '#ffeb3b';
        }
    }

    function resetHighlighting() {
        Object.values(nodes).forEach(node => node.element.classList.remove('highlight'));
        edges.forEach(edge => {
            edge.element.style.backgroundColor = '#ffffff';
            edge.element.style.height = '2px';
            edge.arrow.style.borderBottomColor = '#ffffff';
        });
    }

    function resetGraph() {
        while (graph.firstChild) graph.removeChild(graph.firstChild);
        processCount = 0;
        resourceCount = 0;
        nodes = {};
        edges = [];
        updateDropdowns();
        updateStatus("Graph reset.");
    }

    function updateDropdowns() {
        while (fromSelect.options.length > 1) fromSelect.remove(1);
        while (toSelect.options.length > 1) toSelect.remove(1);

        Object.keys(nodes).forEach(nodeId => {
            const optionFrom = document.createElement('option');
            optionFrom.value = nodeId;
            optionFrom.textContent = `${nodeId} (${nodes[nodeId].type})`;
            const optionTo = optionFrom.cloneNode(true);

            fromSelect.appendChild(optionFrom);
            toSelect.appendChild(optionTo);
        });
    }

    function updateStatus(message) {
        statusContent.textContent = message;
    }

    function startDrag(e) {
        if (e.target.classList.contains('node')) {
            draggingNode = e.target;
            offsetX = e.clientX - draggingNode.getBoundingClientRect().left;
            offsetY = e.clientY - draggingNode.getBoundingClientRect().top;
            e.preventDefault();
        }
    }

    function drag(e) {
        if (draggingNode) {
            const graphRect = graph.getBoundingClientRect();
            let newX = e.clientX - graphRect.left - offsetX;
            let newY = e.clientY - graphRect.top - offsetY;

            newX = Math.max(0, Math.min(newX, graphRect.width - draggingNode.offsetWidth));
            newY = Math.max(0, Math.min(newY, graphRect.height - draggingNode.offsetHeight));

            draggingNode.style.left = newX + 'px';
            draggingNode.style.top = newY + 'px';

            const nodeId = draggingNode.getAttribute('data-id');
            nodes[nodeId].x = newX;
            nodes[nodeId].y = newY;

            updateEdges();
        }
    }

    function endDrag() {
        draggingNode = null;
    }
});

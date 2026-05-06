document.addEventListener('DOMContentLoaded', function () {
    const graph = document.getElementById('rag-graph');
    const statusContent = document.getElementById('status-content');
    const statusDot = document.getElementById('status-dot');
    const addProcessBtn = document.getElementById('add-process-btn');
    const addResourceBtn = document.getElementById('add-resource-btn');
    const addEdgeBtn = document.getElementById('add-edge-btn');
    const undoEdgeBtn = document.getElementById('undo-edge-btn');
    const detectDeadlockBtn = document.getElementById('detect-deadlock-btn');
    const resetBtn = document.getElementById('reset-btn');
    const fromSelect = document.getElementById('from-select');
    const toSelect = document.getElementById('to-select');

    const NODE_SIZE = 52;
    const EDGE_COLOR      = '#3b8eea';
    const HIGHLIGHT_COLOR = '#e3b341';

    let processCount = 0, resourceCount = 0;
    let nodes = {}, edges = [];
    let draggingNode = null, offsetX = 0, offsetY = 0;

    // ── SVG overlay ──
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;overflow:visible;';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    function createMarker(id, color) {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', id);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', '0 0, 10 3.5, 0 7');
        poly.setAttribute('fill', color);
        marker.appendChild(poly);
        return marker;
    }

    defs.appendChild(createMarker('arrow-normal', EDGE_COLOR));
    defs.appendChild(createMarker('arrow-highlight', HIGHLIGHT_COLOR));
    svg.appendChild(defs);
    graph.appendChild(svg);

    initializeGraph();

    addProcessBtn.addEventListener('click', addProcess);
    addResourceBtn.addEventListener('click', addResource);
    addEdgeBtn.addEventListener('click', addEdge);
    undoEdgeBtn.addEventListener('click', undoEdge);
    detectDeadlockBtn.addEventListener('click', detectDeadlock);
    resetBtn.addEventListener('click', resetGraph);
    graph.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    function initializeGraph() {
        graph.style.position = 'relative';
        graph.style.height = '480px';
        updateStatus("Add processes and resources, then connect them with edges.");
    }

    function getBorderPoint(node, tx, ty) {
        const cx = node.x + NODE_SIZE / 2;
        const cy = node.y + NODE_SIZE / 2;
        const dx = tx - cx, dy = ty - cy;
        const r  = NODE_SIZE / 2;

        if (node.type === 'process') {
            const len = Math.sqrt(dx*dx + dy*dy) || 1;
            return { x: cx + (dx/len)*r, y: cy + (dy/len)*r };
        } else {
            const absDx = Math.abs(dx), absDy = Math.abs(dy);
            if (absDx === 0 && absDy === 0) return { x: cx, y: cy };
            const scale = (absDx/r > absDy/r) ? r/absDx : r/absDy;
            return { x: cx + dx*scale, y: cy + dy*scale };
        }
    }

    function addProcess() {
        processCount++;
        const id = 'P' + processCount;
        const el = document.createElement('div');
        el.className = 'node process';
        el.textContent = id;
        el.setAttribute('data-id', id);
        el.setAttribute('data-type', 'process');
        const x = Math.floor(Math.random() * (graph.offsetWidth  - NODE_SIZE - 40)) + 20;
        const y = Math.floor(Math.random() * (graph.offsetHeight - NODE_SIZE - 40)) + 20;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        graph.appendChild(el);
        nodes[id] = { id, type: 'process', element: el, x, y };
        updateDropdowns();
        updateStatus(`Process ${id} added.`);
    }

    function addResource() {
        resourceCount++;
        const id = 'R' + resourceCount;
        const el = document.createElement('div');
        el.className = 'node resource';
        el.textContent = id;
        el.setAttribute('data-id', id);
        el.setAttribute('data-type', 'resource');
        const x = Math.floor(Math.random() * (graph.offsetWidth  - NODE_SIZE - 40)) + 20;
        const y = Math.floor(Math.random() * (graph.offsetHeight - NODE_SIZE - 40)) + 20;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        graph.appendChild(el);
        nodes[id] = { id, type: 'resource', element: el, x, y };
        updateDropdowns();
        updateStatus(`Resource ${id} added.`);
    }

    function addEdge() {
        const fromId = fromSelect.value, toId = toSelect.value;
        if (!fromId || !toId || fromId === toId) { updateStatus("Invalid edge selection."); return; }
        if (edges.some(e => e.from === fromId && e.to === toId)) { updateStatus("Edge already exists."); return; }
        if (nodes[fromId].type === nodes[toId].type) { updateStatus("Cannot connect nodes of the same type."); return; }
        createEdge(fromId, toId);
        fromSelect.value = ""; toSelect.value = "";
        updateStatus(`Edge: ${fromId} → ${toId}`);
    }

    function createEdge(fromId, toId) {
        const fn = nodes[fromId], tn = nodes[toId];
        const start = getBorderPoint(fn, tn.x + NODE_SIZE/2, tn.y + NODE_SIZE/2);
        const end   = getBorderPoint(tn, fn.x + NODE_SIZE/2, fn.y + NODE_SIZE/2);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', start.x); line.setAttribute('y1', start.y);
        line.setAttribute('x2', end.x);   line.setAttribute('y2', end.y);
        line.setAttribute('stroke', EDGE_COLOR);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrow-normal)');
        svg.appendChild(line);

        edges.push({ from: fromId, to: toId, line });
    }

    function updateEdges() {
        edges.forEach(edge => {
            const fn = nodes[edge.from], tn = nodes[edge.to];
            const start = getBorderPoint(fn, tn.x + NODE_SIZE/2, tn.y + NODE_SIZE/2);
            const end   = getBorderPoint(tn, fn.x + NODE_SIZE/2, fn.y + NODE_SIZE/2);
            edge.line.setAttribute('x1', start.x); edge.line.setAttribute('y1', start.y);
            edge.line.setAttribute('x2', end.x);   edge.line.setAttribute('y2', end.y);
        });
    }

    function detectDeadlock() {
        resetHighlighting();
        const adj = {}, p2r = {}, r2p = {};
        Object.keys(nodes).forEach(id => { if (nodes[id].type === 'process') adj[id] = []; });
        edges.forEach(e => {
            if (nodes[e.from].type === 'process') { (p2r[e.from] = p2r[e.from]||[]).push(e.to); }
            else                                   { (r2p[e.from] = r2p[e.from]||[]).push(e.to); }
        });
        for (const p in p2r) p2r[p].forEach(r => (r2p[r]||[]).forEach(hp => adj[p].push(hp)));

        const visited = {}, recStack = {};
        let cycleNodes = [];

        function dfs(node, path) {
            if (recStack[node]) { cycleNodes = path.slice(path.indexOf(node)); return true; }
            if (visited[node]) return false;
            visited[node] = recStack[node] = true;
            path.push(node);
            for (const nb of adj[node]) { if (dfs(nb, path)) return true; }
            recStack[node] = false; path.pop(); return false;
        }

        let found = false;
        for (const p in adj) { if (!visited[p] && dfs(p, [])) { found = true; break; } }

        if (found) {
            cycleNodes.forEach(id => nodes[id].element.classList.add('highlight'));
            for (let i = 0; i < cycleNodes.length; i++) {
                const from = cycleNodes[i], to = cycleNodes[(i+1)%cycleNodes.length];
                (p2r[from]||[]).forEach(r => {
                    if ((r2p[r]||[]).includes(to)) {
                        highlightEdge(from, r); highlightEdge(r, to);
                        nodes[r].element.classList.add('highlight');
                    }
                });
            }
            if(statusDot){statusDot.style.background='#f85149';statusDot.style.boxShadow='0 0 8px #f85149';}
            updateStatus(`⚠ Deadlock detected: ${cycleNodes.join(' → ')}`);
        } else {
            if(statusDot){statusDot.style.background='#3fb950';statusDot.style.boxShadow='0 0 6px #3fb950';}
            updateStatus("✓ No deadlocks detected. System is safe.");
        }
    }

    function highlightEdge(fromId, toId) {
        const edge = edges.find(e => e.from === fromId && e.to === toId);
        if (edge) {
            edge.line.setAttribute('stroke', HIGHLIGHT_COLOR);
            edge.line.setAttribute('stroke-width', '3');
            edge.line.setAttribute('marker-end', 'url(#arrow-highlight)');
        }
    }

    function resetHighlighting() {
        Object.values(nodes).forEach(n => n.element.classList.remove('highlight'));
        edges.forEach(e => {
            e.line.setAttribute('stroke', EDGE_COLOR);
            e.line.setAttribute('stroke-width', '2');
            e.line.setAttribute('marker-end', 'url(#arrow-normal)');
        });
    }

    function undoEdge() {
        if (!edges.length) { updateStatus("No edges to undo."); return; }
        const last = edges.pop();
        svg.removeChild(last.line);
        updateStatus(`Removed edge: ${last.from} → ${last.to}`);
    }

    function resetGraph() {
        while (svg.lastChild && svg.lastChild !== defs) svg.removeChild(svg.lastChild);
        Array.from(graph.querySelectorAll('.node')).forEach(n => graph.removeChild(n));
        processCount = resourceCount = 0; nodes = {}; edges = [];
        updateDropdowns();
        if(statusDot){statusDot.style.background='#3fb950';statusDot.style.boxShadow='0 0 6px #3fb950';}
        updateStatus("Graph reset. Ready for new simulation.");
    }

    function updateDropdowns() {
        while (fromSelect.options.length > 1) fromSelect.remove(1);
        while (toSelect.options.length > 1)   toSelect.remove(1);
        Object.keys(nodes).forEach(id => {
            const a = document.createElement('option');
            a.value = id; a.textContent = `${id} (${nodes[id].type})`;
            fromSelect.appendChild(a); toSelect.appendChild(a.cloneNode(true));
        });
    }

    function updateStatus(msg) { statusContent.textContent = msg; }

    function startDrag(e) {
        if (e.target.classList.contains('node')) {
            draggingNode = e.target;
            offsetX = e.clientX - draggingNode.getBoundingClientRect().left;
            offsetY = e.clientY - draggingNode.getBoundingClientRect().top;
            e.preventDefault();
        }
    }

    function drag(e) {
        if (!draggingNode) return;
        const rect = graph.getBoundingClientRect();
        let x = e.clientX - rect.left - offsetX;
        let y = e.clientY - rect.top  - offsetY;
        x = Math.max(0, Math.min(x, rect.width  - draggingNode.offsetWidth));
        y = Math.max(0, Math.min(y, rect.height - draggingNode.offsetHeight));
        draggingNode.style.left = x + 'px'; draggingNode.style.top = y + 'px';
        const id = draggingNode.getAttribute('data-id');
        nodes[id].x = x; nodes[id].y = y;
        updateEdges();
    }

    function endDrag() { draggingNode = null; }
});
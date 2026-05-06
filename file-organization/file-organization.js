/* ============================================================
   script.js - File System Directory Structures Simulator
   Supports single-level, multi-level, tree, and DAG structures.
   Includes validation, cycle detection, hierarchy metrics,
   and an innovation layer for lookup-cost estimation.
   ============================================================ */

const STRUCTURE_HINTS = {
  dag: 'DAG mode allows shared references across directories or files, but cycles are still forbidden.',
  single: 'Single-level mode keeps one flat directory. Nested folders and shared parents are not allowed.',
  multi: 'Multi-level mode allows nested directories and files, but each node can belong to only one parent.',
  tree: 'Tree mode enforces one connected rooted hierarchy. Every node except the root must have exactly one parent.'
};

const STRUCTURE_LABELS = {
  dag: 'DAG',
  single: 'Single Level',
  multi: 'Multi Level',
  tree: 'Tree'
};

const PRESETS = {
  single: {
    structureMode: 'single',
    files: [
      { name: 'notes.txt', size: 1024 },
      { name: 'marks.csv', size: 2048 },
      { name: 'timetable.pdf', size: 3072 }
    ],
    directories: [{ name: 'root' }],
    dependencies: [
      { from: 'root', to: 'notes.txt' },
      { from: 'root', to: 'marks.csv' },
      { from: 'root', to: 'timetable.pdf' }
    ]
  },
  multi: {
    structureMode: 'multi',
    files: [
      { name: 'main.c', size: 2048 },
      { name: 'util.c', size: 1024 },
      { name: 'report.docx', size: 4096 }
    ],
    directories: [{ name: 'root' }, { name: 'src' }, { name: 'docs' }],
    dependencies: [
      { from: 'root', to: 'src' },
      { from: 'root', to: 'docs' },
      { from: 'src', to: 'main.c' },
      { from: 'src', to: 'util.c' },
      { from: 'docs', to: 'report.docx' }
    ]
  },
  tree: {
    structureMode: 'tree',
    files: [
      { name: 'app.py', size: 3072 },
      { name: 'config.json', size: 1024 },
      { name: 'readme.md', size: 1024 },
      { name: 'test_app.py', size: 2048 }
    ],
    directories: [{ name: 'root' }, { name: 'src' }, { name: 'config' }, { name: 'tests' }],
    dependencies: [
      { from: 'root', to: 'src' },
      { from: 'root', to: 'config' },
      { from: 'root', to: 'tests' },
      { from: 'src', to: 'app.py' },
      { from: 'config', to: 'config.json' },
      { from: 'root', to: 'readme.md' },
      { from: 'tests', to: 'test_app.py' }
    ]
  },
  dag: {
    structureMode: 'dag',
    files: [
      { name: 'logo.png', size: 2048 },
      { name: 'shared.css', size: 1024 },
      { name: 'dashboard.js', size: 3072 }
    ],
    directories: [{ name: 'root' }, { name: 'student' }, { name: 'admin' }, { name: 'assets' }],
    dependencies: [
      { from: 'root', to: 'student' },
      { from: 'root', to: 'admin' },
      { from: 'root', to: 'assets' },
      { from: 'assets', to: 'logo.png' },
      { from: 'student', to: 'shared.css' },
      { from: 'admin', to: 'shared.css' },
      { from: 'admin', to: 'dashboard.js' }
    ]
  },
  cycle: {
    structureMode: 'dag',
    files: [
      { name: 'A.txt', size: 1024 }
    ],
    directories: [{ name: 'root' }, { name: 'dir1' }, { name: 'dir2' }],
    dependencies: [
      { from: 'root', to: 'dir1' },
      { from: 'dir1', to: 'dir2' },
      { from: 'dir2', to: 'root' },
      { from: 'dir2', to: 'A.txt' }
    ]
  }
};

const dagState = {
  structureMode: 'dag',
  files: [],
  directories: [],
  dependencies: []
};

let currentResult = null;
let currentZoom = 1;
let currentPanX = 0;
let currentPanY = 0;
let toastTimer = null;
let nextNodeId = 0;

const NODE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/* ── Theme Toggle ─────────────────────────────────────────── */
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

/* ── Status / UI Helpers ──────────────────────────────────── */
function setLiveStatus(title, message, mode = 'info') {
  const card = document.getElementById('live-status-card');
  if (!card) return;

  const kicKerColor = mode === 'error' ? 'Validation Alert' : mode === 'success' ? 'Ready State' : 'Validation Center';
  card.innerHTML = `
    <span class="status-kicker">${kicKerColor}</span>
    <h4>${title}</h4>
    <p>${message}</p>
  `;
}

function setValidationPill(text, isError = false) {
  const pill = document.getElementById('validation-pill');
  const textEl = document.getElementById('validation-text');
  if (!pill || !textEl) return;
  textEl.textContent = text;
  if (isError) {
    pill.classList.add('is-error');
  } else {
    pill.classList.remove('is-error');
  }
}

function showError(message) {
  const el = document.getElementById('error-msg');
  el.innerHTML = `<strong>Validation error</strong> ${message}`;
  el.classList.remove('hidden', 'status-success');
  el.classList.add('status-error');
  setLiveStatus('Invalid operation blocked', message, 'error');
  setValidationPill('Error', true);
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearError() {
  const el = document.getElementById('error-msg');
  el.innerHTML = '';
  el.classList.add('hidden');
  clearFieldErrors();
}

function showSuccessBanner(message) {
  const el = document.getElementById('error-msg');
  if (!el) return;
  el.innerHTML = `<strong>✓</strong> ${message}`;
  el.classList.remove('hidden', 'status-error');
  el.classList.add('status-success');
  setValidationPill('Ready', false);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

function renderOutput(html) {
  document.getElementById('visual-output').innerHTML = html;
}

function markFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (field) field.classList.add('field-error');
}

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(field => {
    field.classList.remove('field-error');
  });
}

function showInputError(message, fieldId) {
  showError(message);
  markFieldError(fieldId);
  const field = document.getElementById(fieldId);
  if (field) field.focus();
}

function validateFileName(name) {
  if (!name) return 'Please enter a file name before adding it.';
  if (name.includes('/') || name.includes('\\')) return 'File name cannot include path separators. Use only the file name, for example notes.txt.';
  if (!FILE_NAME_PATTERN.test(name)) {
    return 'Invalid file name. Use letters, numbers, hyphen, underscore, or dot, starting with a letter or number.';
  }
  return null;
}

function validateDirectoryName(name) {
  if (!name) return 'Please enter a directory name before adding it.';
  if (name.includes('/') || name.includes('\\')) return 'Directory name cannot include path separators. Use a folder name like docs or source_files.';
  if (!NODE_NAME_PATTERN.test(name)) {
    return 'Invalid directory name. Use letters, numbers, hyphen, underscore, or dot, starting with a letter or number.';
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

/* ── Node Helpers ─────────────────────────────────────────── */
function makeNodeId(type) {
  nextNodeId += 1;
  return `${type}-${nextNodeId}`;
}

function getAllNodeIds() {
  return [
    ...dagState.directories.map(d => d.id),
    ...dagState.files.map(f => f.id)
  ];
}

function getNodeById(id) {
  return dagState.directories.find(d => d.id === id) || dagState.files.find(f => f.id === id) || null;
}

function getNodeType(id) {
  if (dagState.directories.some(d => d.id === id)) return 'directory';
  if (dagState.files.some(f => f.id === id)) return 'file';
  return null;
}

function getNodeLabel(id) {
  const node = getNodeById(id);
  return node ? node.name : id;
}

function getNodeOptionLabel(id) {
  const label = getNodeLabel(id);
  const sameNameCount = [...dagState.directories, ...dagState.files].filter(node => node.name === label).length;
  const type = getNodeType(id);
  return sameNameCount > 1 ? `${label} (${type} ${id.split('-')[1]})` : label;
}

function getNodePath(id, seen = new Set()) {
  const node = getNodeById(id);
  if (!node) return id;
  if (seen.has(id)) return node.name;
  seen.add(id);
  const parents = dagState.dependencies.filter(dep => dep.to === id).map(dep => dep.from);
  if (!parents.length) return node.name;
  return `${getNodePath(parents[0], seen)}/${node.name}`;
}

/* ── Reference Counting ───────────────────────────────────── */
function getRefCount(nodeId) {
  return dagState.dependencies.filter(dep => dep.to === nodeId).length;
}

function getAllNodeRefCounts() {
  const refCounts = {};
  getAllNodeIds().forEach(id => {
    refCounts[id] = getRefCount(id);
  });
  return refCounts;
}

function serializeFiles() {
  return dagState.files.map(f => `${getNodePath(f.id)}:${f.size}`).join(',');
}

function serializeDirectories() {
  return dagState.directories.map(d => getNodePath(d.id)).join(',');
}

function serializeDependencies() {
  return dagState.dependencies.map(d => `${getNodePath(d.from)}->${getNodePath(d.to)}`).join(',');
}

/* ── Graph Builders ───────────────────────────────────────── */
function buildGraphContext(files, directories, dependencies) {
  const allNodes = [...directories, ...files];
  const adjacency = {};
  const indegree = {};

  allNodes.forEach(node => {
    adjacency[node] = [];
    indegree[node] = 0;
  });

  dependencies.forEach(dep => {
    if (!adjacency[dep.from]) {
      adjacency[dep.from] = [];
      indegree[dep.from] = indegree[dep.from] || 0;
    }
    adjacency[dep.from].push(dep.to);
    indegree[dep.to] = (indegree[dep.to] || 0) + 1;
  });

  return { allNodes, adjacency, indegree };
}

function detectCycle(nodes, adjacency) {
  const visiting = new Set();
  const visited = new Set();
  let cyclePath = [];

  function dfs(node, trail) {
    if (visiting.has(node)) {
      const startIndex = trail.indexOf(node);
      cyclePath = [...trail.slice(startIndex), node];
      return true;
    }
    if (visited.has(node)) return false;
    visiting.add(node);
    visited.add(node);
    trail.push(node);
    for (const neighbor of adjacency[node] || []) {
      if (dfs(neighbor, trail)) return true;
    }
    visiting.delete(node);
    trail.pop();
    return false;
  }

  for (const node of nodes) {
    if (dfs(node, [])) return { hasCycle: true, cyclePath };
  }
  return { hasCycle: false, cyclePath: [] };
}

function estimateDepths(nodes, adjacency, indegree) {
  const queue = nodes.filter(node => indegree[node] === 0);
  const depths = Object.fromEntries(nodes.map(node => [node, 0]));
  const indegreeCopy = { ...indegree };

  while (queue.length > 0) {
    const node = queue.shift();
    for (const child of adjacency[node] || []) {
      depths[child] = Math.max(depths[child], depths[node] + 1);
      indegreeCopy[child] -= 1;
      if (indegreeCopy[child] === 0) queue.push(child);
    }
  }
  return depths;
}

/* ── Validation ───────────────────────────────────────────── */
function getStructureSpecificError(files, directories, dependencies) {
  const fileSet = new Set(files);
  const { allNodes, adjacency, indegree } = buildGraphContext(files, directories, dependencies);
  const cycleCheck = detectCycle(allNodes, adjacency);

  if (cycleCheck.hasCycle) {
    return `Cycle not allowed: ${cycleCheck.cyclePath.map(getNodeLabel).join(' -> ')}`;
  }

  for (const dep of dependencies) {
    const fromType = getNodeType(dep.from);
    const toType = getNodeType(dep.to);
    if (fromType === 'file') {
      return `Invalid link for ${STRUCTURE_LABELS[dagState.structureMode]}: files cannot contain other nodes.`;
    }
    if (!fromType || !toType) {
      return 'Dependency references a node that does not exist.';
    }
  }

  for (const directoryId of directories) {
    const childIds = dependencies.filter(dep => dep.from === directoryId).map(dep => dep.to);
    const childNames = new Set();
    for (const childId of childIds) {
      const childName = getNodeLabel(childId);
      if (childNames.has(childName)) {
        return `Duplicate name in "${getNodePath(directoryId)}": only one item named "${childName}" can exist in the same directory.`;
      }
      childNames.add(childName);
    }
  }

  const parentCounts = Object.fromEntries(allNodes.map(node => [node, 0]));
  dependencies.forEach(dep => { parentCounts[dep.to] += 1; });

  if (dagState.structureMode === 'single') {
    if (directories.length > 1) {
      return 'Single-level directory structure supports only one directory.';
    }
    if (dependencies.some(dep => getNodeType(dep.to) === 'directory')) {
      return 'Single-level directory structure does not allow nested directories.';
    }
    if (Object.entries(parentCounts).some(([node, count]) => fileSet.has(node) && count > 1)) {
      return 'Single-level directory structure allows a file in only one flat directory.';
    }
  }

  if (dagState.structureMode === 'multi') {
    if (Object.entries(parentCounts).some(([, count]) => count > 1)) {
      return 'Multi-level structure does not allow a file or folder to have multiple parents.';
    }
  }

  if (dagState.structureMode === 'tree') {
    if (directories.length === 0) {
      return 'Tree structure requires at least one root directory.';
    }
    if (Object.entries(parentCounts).some(([, count]) => count > 1)) {
      return 'Tree structure allows only one parent per file or directory.';
    }
    const rootDirectories = directories.filter(d => parentCounts[d] === 0);
    if (rootDirectories.length !== 1) {
      return 'Tree structure must have exactly one root directory.';
    }
    const reachable = new Set();
    const root = rootDirectories[0];
    const queue = [root];
    while (queue.length > 0) {
      const node = queue.shift();
      if (reachable.has(node)) continue;
      reachable.add(node);
      (adjacency[node] || []).forEach(child => queue.push(child));
    }
    if (reachable.size !== allNodes.length) {
      return 'Tree structure must be fully connected to one root.';
    }
  }

  return null;
}

function validatePotentialDependency(from, to) {
  if (!from || !to) return 'Select both nodes before adding a dependency.';
  if (from === to) return 'A node cannot point to itself.';
  if (dagState.dependencies.some(dep => dep.from === from && dep.to === to)) {
    return 'That link already exists.';
  }
  const testDependencies = [...dagState.dependencies, { from, to }];
  return getStructureSpecificError(
    dagState.files.map(f => f.id),
    dagState.directories.map(d => d.id),
    testDependencies
  );
}

/* ── Selects & Lists ──────────────────────────────────────── */
function updateDependencyOptions() {
  const directoryIds = dagState.directories.map(d => d.id);
  const allNodes = getAllNodeIds();
  const fromSelect = document.getElementById('dependency-from');
  const toSelect = document.getElementById('dependency-to');

  const fromOptions = ['<option value="">Select parent</option>']
    .concat(directoryIds.map(id => `<option value="${escapeAttr(id)}">${escapeHtml(getNodeOptionLabel(id))}</option>`))
    .join('');
  const toOptions = ['<option value="">Select child</option>']
    .concat(allNodes.map(id => `<option value="${escapeAttr(id)}">${escapeHtml(getNodeOptionLabel(id))}</option>`))
    .join('');

  const currentFrom = fromSelect.value;
  const currentTo = toSelect.value;

  fromSelect.innerHTML = fromOptions;
  toSelect.innerHTML = toOptions;
  fromSelect.value = directoryIds.includes(currentFrom) ? currentFrom : '';
  toSelect.value = allNodes.includes(currentTo) ? currentTo : '';
}

function renderLiveSummary() {
  const totalSize = dagState.files.reduce((sum, f) => sum + f.size, 0);

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('stat-files', dagState.files.length);
  setVal('stat-dirs', dagState.directories.length);
  setVal('stat-links', dagState.dependencies.length);
  setVal('stat-size', `${(totalSize / 1024).toFixed(1)} KB`);
}

function updateStructureHint() {
  const hint = document.getElementById('structure-hint');
  if (hint) hint.textContent = STRUCTURE_HINTS[dagState.structureMode];
  setLiveStatus(
    `${STRUCTURE_LABELS[dagState.structureMode]} mode active`,
    STRUCTURE_HINTS[dagState.structureMode],
    'info'
  );
}

function renderLists() {
  const filesList = document.getElementById('files-list');
  const directoriesList = document.getElementById('directories-list');
  const dependenciesList = document.getElementById('dependencies-list');
  const refCounts = getAllNodeRefCounts();

  filesList.innerHTML = dagState.files.length
    ? dagState.files.map((f, idx) => {
        const refCount = refCounts[f.id] || 0;
        const canDelete = refCount === 0;
        const statusTitle = canDelete ? 'Delete file' : `Referenced ${refCount} time(s) - cannot delete`;
        const deleteBtnClass = !canDelete ? 'btn-disabled' : '';
        return `
        <div class="item-chip file-chip">
          <span>${escapeHtml(f.name)}</span>
          <span class="chip-meta">${(f.size / 1024).toFixed(1)} KB</span>
          <span class="chip-ref-count" title="Reference count">Refs: ${refCount}</span>
          <button class="chip-remove ${deleteBtnClass}" type="button" data-file-id="${escapeAttr(f.id)}" data-can-delete="${canDelete}" title="${statusTitle}">×</button>
        </div>
      `;
      }).join('')
    : 'No files added yet.';
  filesList.className = `chip-list${dagState.files.length ? '' : ' empty-state-inline'}`;

  directoriesList.innerHTML = dagState.directories.length
    ? dagState.directories.map((d, idx) => {
        const refCount = refCounts[d.id] || 0;
        const canDelete = refCount === 0;
        const statusTitle = canDelete ? 'Delete directory' : `Referenced ${refCount} time(s) - cannot delete`;
        const deleteBtnClass = !canDelete ? 'btn-disabled' : '';
        return `
        <div class="item-chip dir-chip">
          <span>${escapeHtml(d.name)}</span>
          <span class="chip-ref-count" title="Reference count">Refs: ${refCount}</span>
          <button class="chip-remove ${deleteBtnClass}" type="button" data-dir-id="${escapeAttr(d.id)}" data-can-delete="${canDelete}" title="${statusTitle}">×</button>
        </div>
      `;
      }).join('')
    : 'No directories added yet.';
  directoriesList.className = `chip-list${dagState.directories.length ? '' : ' empty-state-inline'}`;

  dependenciesList.innerHTML = dagState.dependencies.length
    ? dagState.dependencies.map((dep, idx) => `
        <div class="item-chip dep-chip">
          <span>${escapeHtml(getNodePath(dep.from))} → ${escapeHtml(getNodeLabel(dep.to))}</span>
          <button class="chip-remove" type="button" data-dep-index="${idx}" title="Remove dependency">×</button>
        </div>
      `).join('')
    : 'No dependencies added yet.';
  dependenciesList.className = `chip-list${dagState.dependencies.length ? '' : ' empty-state-inline'}`;

  updateDependencyOptions();
  updateStructureHint();
  renderLiveSummary();
  attachDeleteHandlers();
}

function attachDeleteHandlers() {
  // File delete buttons
  document.querySelectorAll('[data-file-id]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const fileId = this.getAttribute('data-file-id');
      const canDelete = this.getAttribute('data-can-delete') === 'true';
      if (canDelete) {
        removeFile(fileId);
      } else {
        const refCount = getRefCount(fileId);
        showToast(`Cannot delete: "${getNodeLabel(fileId)}" is referenced ${refCount} time(s)`);
      }
    });
  });

  // Directory delete buttons
  document.querySelectorAll('[data-dir-id]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const dirId = this.getAttribute('data-dir-id');
      const canDelete = this.getAttribute('data-can-delete') === 'true';
      if (canDelete) {
        removeDirectory(dirId);
      } else {
        const refCount = getRefCount(dirId);
        showToast(`Cannot delete: "${getNodeLabel(dirId)}" is referenced ${refCount} time(s)`);
      }
    });
  });

  // Dependency delete buttons
  document.querySelectorAll('[data-dep-index]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const depIndex = parseInt(this.getAttribute('data-dep-index'), 10);
      const dep = dagState.dependencies[depIndex];
      if (dep) {
        removeDependency(dep.from, dep.to);
      }
    });
  });
}

/* ── Mode Switching ───────────────────────────────────────── */
function setStructureMode(mode, button, quiet = false) {
  dagState.structureMode = mode;
  document.querySelectorAll('.struct-btn').forEach(btn => btn.classList.remove('active'));
  if (button) {
    button.classList.add('active');
  } else {
    const target = document.querySelector(`.struct-btn[data-structure="${mode}"]`);
    if (target) target.classList.add('active');
  }
  clearError();
  renderLists();
  if (!quiet) {
    showSuccessBanner(`${STRUCTURE_LABELS[mode]} rules loaded.`);
    showToast(`Switched to ${STRUCTURE_LABELS[mode]} mode`);
  }
}

/* ── CRUD ─────────────────────────────────────────────────── */
function removeDependenciesForNode(nodeId) {
  dagState.dependencies = dagState.dependencies.filter(
    dep => dep.from !== nodeId && dep.to !== nodeId
  );
}

function pruneZeroReferenceBranch(nodeId, removedNodes = []) {
  if (getNodeLabel(nodeId) === 'root' || !getNodeType(nodeId) || getRefCount(nodeId) > 0) {
    return removedNodes;
  }

  const childNodes = dagState.dependencies
    .filter(dep => dep.from === nodeId)
    .map(dep => dep.to);

  const removedName = getNodePath(nodeId);
  dagState.files = dagState.files.filter(f => f.id !== nodeId);
  dagState.directories = dagState.directories.filter(d => d.id !== nodeId);
  removeDependenciesForNode(nodeId);
  removedNodes.push(removedName);

  childNodes.forEach(child => {
    if (getRefCount(child) === 0) {
      pruneZeroReferenceBranch(child, removedNodes);
    }
  });

  return removedNodes;
}

function addFile() {
  clearError();
  const nameInput = document.getElementById('file-name-input');
  const name = nameInput.value.trim();
  const size = 1024;

  const fileNameError = validateFileName(name);
  if (fileNameError) { showInputError(fileNameError, 'file-name-input'); return; }

  dagState.files.push({ id: makeNodeId('file'), name, size });
  nameInput.value = '';
  renderLists();
  refreshSimulationOutputIfReady();
  showSuccessBanner(`File added: ${name}`);
  showToast(`Added file: ${name}`);
}

function addDirectory() {
  clearError();
  const input = document.getElementById('directory-name-input');
  const name = input.value.trim();
  const directoryNameError = validateDirectoryName(name);

  if (directoryNameError) { showInputError(directoryNameError, 'directory-name-input'); return; }
  if (dagState.structureMode === 'single' && dagState.directories.length >= 1) {
    showInputError('Single-level structure allows only one directory.', 'directory-name-input');
    return;
  }

  dagState.directories.push({ id: makeNodeId('dir'), name });
  input.value = '';
  renderLists();
  refreshSimulationOutputIfReady();
  showSuccessBanner(`Folder added: ${name}`);
  showToast(`Added folder: ${name}`);
}

function addDependency() {
  clearError();
  const from = document.getElementById('dependency-from').value;
  const to = document.getElementById('dependency-to').value;
  const validationError = validatePotentialDependency(from, to);

  if (validationError) { showError(validationError); return; }

  dagState.dependencies.push({ from, to });
  renderLists();
  refreshSimulationOutputIfReady();
  showSuccessBanner(`Link created: ${getNodePath(from)} → ${getNodeLabel(to)}`);
  showToast(`Linked ${getNodeLabel(from)} → ${getNodeLabel(to)}`);
}

function removeFile(id) {
  const refCount = getRefCount(id);
  const name = getNodePath(id);
  const label = getNodeLabel(id);
  if (refCount > 0) {
    showError(`Cannot delete file "${name}": it is referenced ${refCount} time(s) in the file system.`);
    return;
  }
  dagState.files = dagState.files.filter(f => f.id !== id);
  removeDependenciesForNode(id);
  renderLists();
  refreshSimulationOutputIfReady();
  showSuccessBanner(`File deleted: ${name} (Ref count: 0)`);
  showToast(`Deleted file: ${label}`);
}

function removeDirectory(id) {
  const refCount = getRefCount(id);
  const name = getNodePath(id);
  const label = getNodeLabel(id);
  if (refCount > 0) {
    showError(`Cannot delete directory "${name}": it is referenced ${refCount} time(s) in the file system.`);
    return;
  }
  if (getNodeLabel(id) === 'root') {
    dagState.files = [];
    dagState.directories = [];
    dagState.dependencies = [];
    currentResult = null;
    renderLists();
    renderOutput(`
      <div class="output-placeholder">
        <div class="placeholder-icon">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M3 21h18M3 10l9-7 9 7" />
          </svg>
        </div>
        <p>Results will appear here after you run the simulation.</p>
        <span class="placeholder-hint">Try loading a preset and clicking Run →</span>
      </div>
    `);
    document.getElementById('export-btn').style.display = 'none';
    resetGraphZoom();
    showSuccessBanner('Root deleted. Entire graph cleared.');
    showToast('Deleted root and cleared graph');
    return;
  }
  dagState.directories = dagState.directories.filter(d => d.id !== id);
  removeDependenciesForNode(id);
  renderLists();
  refreshSimulationOutputIfReady();
  showSuccessBanner(`Directory deleted: ${name} (Ref count: 0)`);
  showToast(`Deleted directory: ${label}`);
}

function removeDependency(from, to) {
  dagState.dependencies = dagState.dependencies.filter(
    dep => !(dep.from === from && dep.to === to)
  );
  const removedNodes = pruneZeroReferenceBranch(to);
  renderLists();
  refreshSimulationOutputIfReady();
  const cleanupText = removedNodes.length
    ? ` Removed unreferenced node(s): ${removedNodes.join(', ')}.`
    : '';
  showSuccessBanner(`Link removed: ${getNodeLabel(from)} → ${getNodeLabel(to)}.${cleanupText}`);
  showToast(removedNodes.length ? `Removed link and ${removedNodes.length} unreferenced node(s)` : `Removed link: ${getNodeLabel(from)} → ${getNodeLabel(to)}`);
}

/* ── Simulation Core (UNCHANGED LOGIC) ───────────────────── */
function runSimulation() {
  clearError();
  try {
    const startTime = performance.now();
    const files = dagState.files.map(f => f.id);
    const directories = dagState.directories.map(d => d.id);
    const fileSizes = Object.fromEntries(dagState.files.map(f => [f.id, f.size]));
    const validationError = getStructureSpecificError(files, directories, dagState.dependencies);

    if (!files.length && !directories.length) {
      showError('Add at least one file or directory before running the simulation.');
      return;
    }
    if (validationError) { showError(validationError); return; }

    const result = runFileSystemSimulation(files, directories, dagState.dependencies, fileSizes, dagState.structureMode);
    currentResult = result;
    const endTime = performance.now();
    result.executionTime = (endTime - startTime).toFixed(2);

    const outputHTML = `
      <h3>${STRUCTURE_LABELS[result.structureMode]} File System — Simulation Results</h3>
      ${buildSummary(result)}
      ${buildStructureInsights(result)}
      ${buildInnovationInsights(result)}
      ${buildTable(result.steps)}
      ${buildDirectoryDetails(result)}
      ${buildFileDetails(result)}
      ${buildDependencyGraph(result)}
      ${buildHierarchyView(result)}
    `;

    renderOutput(outputHTML);
    document.getElementById('export-btn').style.display = 'inline-block';
    resetGraphZoom();
    showSuccessBanner(`Simulation completed for ${STRUCTURE_LABELS[result.structureMode]} structure.`);
    setLiveStatus(
      `${STRUCTURE_LABELS[result.structureMode]} simulation ready`,
      `Max depth: ${result.maxDepth} · Lookup steps: ${result.lookupMetrics.estimatedLookupSteps} · All checks passed.`,
      'success'
    );
    setValidationPill('Passed ✓', false);
    showToast('Simulation completed!');
  } catch (error) {
    console.error('Simulation error:', error);
    showError('Simulation failed. Check the browser console for details.');
  }
}

function refreshSimulationOutputIfReady() {
  if (!currentResult) return;

  const files = dagState.files.map(f => f.id);
  const directories = dagState.directories.map(d => d.id);
  const fileSizes = Object.fromEntries(dagState.files.map(f => [f.id, f.size]));

  if (!files.length && !directories.length) {
    currentResult = null;
    renderOutput(`
      <div class="output-placeholder">
        <div class="placeholder-icon">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M3 21h18M3 10l9-7 9 7" />
          </svg>
        </div>
        <p>Results will appear here after you run the simulation.</p>
        <span class="placeholder-hint">Try loading a preset and clicking Run →</span>
      </div>
    `);
    document.getElementById('export-btn').style.display = 'none';
    return;
  }

  const validationError = getStructureSpecificError(files, directories, dagState.dependencies);
  if (validationError) {
    showError(validationError);
    return;
  }

  const result = runFileSystemSimulation(files, directories, dagState.dependencies, fileSizes, dagState.structureMode);
  result.executionTime = currentResult.executionTime || '0.00';
  currentResult = result;
  renderOutput(`
    <h3>${STRUCTURE_LABELS[result.structureMode]} File System — Simulation Results</h3>
    ${buildSummary(result)}
    ${buildStructureInsights(result)}
    ${buildInnovationInsights(result)}
    ${buildTable(result.steps)}
    ${buildDirectoryDetails(result)}
    ${buildFileDetails(result)}
    ${buildDependencyGraph(result)}
    ${buildHierarchyView(result)}
  `);
  resetGraphZoom();
}

function runFileSystemSimulation(files, directories, dependencies, fileSizes, structureMode) {
  const { allNodes, adjacency, indegree } = buildGraphContext(files, directories, dependencies);
  const queue = allNodes.filter(node => indegree[node] === 0);
  const indegreeCopy = { ...indegree };
  const order = [];

  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    for (const child of adjacency[node] || []) {
      indegreeCopy[child] -= 1;
      if (indegreeCopy[child] === 0) queue.push(child);
    }
  }

  const parentCounts = Object.fromEntries(allNodes.map(node => [node, 0]));
  dependencies.forEach(dep => { parentCounts[dep.to] += 1; });

  const roots = directories.filter(d => parentCounts[d] === 0);
  const depths = estimateDepths(allNodes, adjacency, indegree);
  const fileDepths = files.map(f => depths[f]);
  const sharedNodes = allNodes.filter(node => parentCounts[node] > 1);
  const totalFileSize = Object.values(fileSizes).reduce((sum, s) => sum + s, 0);
  const maxDepth = Math.max(0, ...Object.values(depths));
  const averageFileDepth = fileDepths.length
    ? (fileDepths.reduce((s, d) => s + d, 0) / fileDepths.length).toFixed(1)
    : '0.0';

  const lookupMetrics = calculateLookupMetrics(structureMode, files, directories, dependencies, depths, sharedNodes.length);
  const storageMetrics = calculateStorageMetrics(structureMode, fileSizes, dependencies, sharedNodes.length);

  const steps = [
    { step: 1, action: 'Selected Structure', details: `${STRUCTURE_LABELS[structureMode]} hierarchy rules applied`, status: 'OK' },
    { step: 2, action: 'Parsed Nodes', details: `${directories.length} directories and ${files.length} files created`, status: 'OK' },
    { step: 3, action: 'Validated Rules', details: 'No invalid parent-child relation or cycle found', status: 'OK' },
    { step: 4, action: 'Built Hierarchy', details: roots.length ? `Root nodes: ${roots.map(getNodeLabel).join(', ')}` : 'No explicit root directory', status: 'OK' },
    { step: 5, action: 'Generated Access Order', details: `Order: ${order.map(getNodeLabel).join(' → ')}`, status: 'OK' }
  ];

  return {
    structureMode, steps,
    totalFiles: files.length, totalDirs: directories.length, totalDeps: dependencies.length,
    hasCycle: false, topologicalOrder: order, adj: adjacency, indegree,
    allNodes, files, directories, dependencies, fileSizes,
    roots, depths, maxDepth, averageFileDepth, totalFileSize, sharedNodes,
    lookupMetrics, storageMetrics
  };
}

function calculateLookupMetrics(structureMode, files, directories, dependencies, depths, sharedCount) {
  const fileDepths = files.map(f => depths[f] || 0);
  const avgDepth = fileDepths.length ? fileDepths.reduce((s, d) => s + d, 0) / fileDepths.length : 0;
  const singleLevelLinearCost = Math.max(1, files.length);
  const pathTraversalCost = Math.max(1, Math.round(avgDepth + 1));
  const sharedBenefit = structureMode === 'dag' ? sharedCount : 0;

  let estimatedLookupSteps = singleLevelLinearCost;
  if (structureMode === 'multi' || structureMode === 'tree') estimatedLookupSteps = pathTraversalCost;
  if (structureMode === 'dag') {
    estimatedLookupSteps = Math.max(1, pathTraversalCost - Math.min(sharedBenefit, Math.max(0, pathTraversalCost - 1)));
  }

  return {
    estimatedLookupSteps,
    avgDepth: avgDepth.toFixed(1),
    innovationNote: structureMode === 'dag'
      ? `Shared references reduce repeated traversal across ${sharedBenefit} reused node(s).`
      : `Lookup estimated using average path depth across the current hierarchy.`
  };
}

function calculateStorageMetrics(structureMode, fileSizes, dependencies, sharedCount) {
  const totalFileSize = Object.values(fileSizes).reduce((s, v) => s + v, 0);
  const pointerOverhead = dependencies.length * 24;
  const baseStorage = totalFileSize + pointerOverhead;
  const sharedSavings = structureMode === 'dag' ? sharedCount * 128 : 0;
  return { totalFileSize, pointerOverhead, baseStorage, sharedSavings, effectiveStorage: Math.max(0, baseStorage - sharedSavings) };
}

/* ── Output Builders ──────────────────────────────────────── */
function buildSummary(result) {
  return `
    <div class="stats-row">
      <div class="stat-box"><div class="stat-value">${result.totalFiles}</div><div class="stat-label">Files</div></div>
      <div class="stat-box"><div class="stat-value">${result.totalDirs}</div><div class="stat-label">Directories</div></div>
      <div class="stat-box"><div class="stat-value">${result.totalDeps}</div><div class="stat-label">Links</div></div>
      <div class="stat-box"><div class="stat-value">${(result.totalFileSize / 1024).toFixed(1)} KB</div><div class="stat-label">File Size</div></div>
      <div class="stat-box"><div class="stat-value">${result.maxDepth}</div><div class="stat-label">Max Depth</div></div>
      <div class="stat-box"><div class="stat-value">${result.averageFileDepth}</div><div class="stat-label">Avg Depth</div></div>
      <div class="stat-box"><div class="stat-value">${result.executionTime || '0.00'}ms</div><div class="stat-label">Exec Time</div></div>
    </div>
  `;
}

function buildStructureInsights(result) {
  return `
    <div class="insight-grid">
      <div class="insight-card">
        <h4>Structure Rules</h4>
        <p>${STRUCTURE_HINTS[result.structureMode]}</p>
      </div>
      <div class="insight-card">
        <h4>Root Directories</h4>
        <p>${result.roots.length ? result.roots.map(id => escapeHtml(getNodeLabel(id))).join(', ') : 'No explicit root directory in the current design.'}</p>
      </div>
      <div class="insight-card">
        <h4>Shared Nodes</h4>
        <p>${result.sharedNodes.length ? result.sharedNodes.map(id => escapeHtml(getNodeLabel(id))).join(', ') : 'No shared nodes. This behaves like a strict hierarchy.'}</p>
      </div>
    </div>
  `;
}

function buildInnovationInsights(result) {
  return `
    <div class="insight-grid">
      <div class="insight-card">
        <h4>Innovation: Adaptive Lookup Estimator</h4>
        <p>Estimated lookup steps: <strong>${result.lookupMetrics.estimatedLookupSteps}</strong>. Average depth: <strong>${result.lookupMetrics.avgDepth}</strong>. ${result.lookupMetrics.innovationNote}</p>
      </div>
      <div class="insight-card">
        <h4>Innovation: Effective Storage Score</h4>
        <p>Base storage: <strong>${(result.storageMetrics.baseStorage / 1024).toFixed(1)} KB</strong>. Effective storage after shared-reference savings: <strong>${(result.storageMetrics.effectiveStorage / 1024).toFixed(1)} KB</strong>.</p>
      </div>
      <div class="insight-card">
        <h4>Why This Helps</h4>
        <p>This simulator compares lookup behavior, path depth, and shared-storage impact as an added analytical layer beyond plain visualization.</p>
      </div>
    </div>
  `;
}

function buildTable(steps) {
  const rows = steps.map(step => `
    <tr>
      <td>${step.step}</td>
      <td>${step.action}</td>
      <td>${step.details}</td>
      <td><span class="badge ${step.status === 'OK' ? 'badge-success' : 'badge-error'}">${step.status}</span></td>
    </tr>
  `).join('');

  return `
    <div class="table-container mt-16">
      <table class="output-table">
        <thead>
          <tr><th>Step</th><th>Action</th><th>Details</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildFileDetails(result) {
  if (result.files.length === 0) return '';
  const rows = result.files.map(file => {
    const size = result.fileSizes[file] || 1024;
    const parents = result.dependencies.filter(dep => dep.to === file).map(dep => dep.from);
    const refCount = parents.length;
    const children = result.adj[file] || [];
    const statusBadge = refCount > 1 ? '<span class="badge badge-info">Shared</span>' : '<span class="badge badge-muted">Single</span>';
    return `
      <tr>
        <td><code>${escapeHtml(getNodeLabel(file))}</code></td>
        <td>${(size / 1024).toFixed(1)} KB</td>
        <td>${parents.length ? parents.map(parent => escapeHtml(getNodePath(parent))).join(', ') : 'No parent directory'}</td>
        <td>${result.depths[file] ?? 0}</td>
        <td>${refCount}</td>
        <td>${children.length ? children.map(child => escapeHtml(getNodeLabel(child))).join(', ') : 'Leaf node'}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');

  return `
    <h3 class="mt-16">File Details with Reference Counts</h3>
    <div class="table-container">
      <table class="output-table">
        <thead>
          <tr><th>File Name</th><th>Size</th><th>Parent(s)</th><th>Depth</th><th>Ref Count</th><th>Children</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildDirectoryDetails(result) {
  if (result.directories.length === 0) return '';
  const rows = result.directories.map(directory => {
    const parents = result.dependencies.filter(dep => dep.to === directory).map(dep => dep.from);
    const children = result.adj[directory] || [];
    const refCount = parents.length;
    const statusBadge = refCount > 1 ? '<span class="badge badge-info">Shared</span>' : '<span class="badge badge-muted">Single</span>';
    return `
      <tr>
        <td><code>${escapeHtml(getNodeLabel(directory))}</code></td>
        <td>${parents.length ? parents.map(parent => escapeHtml(getNodePath(parent))).join(', ') : 'Root / no parent'}</td>
        <td>${result.depths[directory] ?? 0}</td>
        <td>${refCount}</td>
        <td>${children.length ? children.map(child => escapeHtml(getNodeLabel(child))).join(', ') : 'Empty directory'}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');

  return `
    <h3 class="mt-16">Directory Details with Reference Counts</h3>
    <div class="table-container">
      <table class="output-table">
        <thead>
          <tr><th>Directory Name</th><th>Parent(s)</th><th>Depth</th><th>Ref Count</th><th>Children</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ── Graph (UNCHANGED LOGIC) ─────────────────────────────── */
function computeLevels(result) {
  return result.depths;
}

function createSVGGraph(result) {
  const width = 760;
  const height = Math.max(320, (result.maxDepth + 1) * 120 + 80);
  const nodeRadius = 28;
  const levels = computeLevels(result);
  const grouped = {};
  const positions = {};

  result.allNodes.forEach(node => {
    const level = levels[node] || 0;
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(node);
  });

  Object.entries(grouped).forEach(([levelKey, nodes]) => {
    const level = Number(levelKey);
    const gap = width / (nodes.length + 1);
    nodes.forEach((node, index) => {
      positions[node] = { x: gap * (index + 1), y: 60 + level * 120 };
    });
  });

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="dag-svg">`;
  svg += `
    <defs>
      <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1L11 6L1 11Z" fill="#64748b"></path>
      </marker>
    </defs>
    <g class="dag-pan-layer">
  `;

  result.dependencies.forEach(dep => {
    const fromPos = positions[dep.from];
    const toPos = positions[dep.to];
    if (fromPos && toPos) {
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const offsetX = (dx / distance) * 30;
      const offsetY = (dy / distance) * 30;
      svg += `<line x1="${fromPos.x + offsetX}" y1="${fromPos.y + offsetY}" x2="${toPos.x - offsetX}" y2="${toPos.y - offsetY}" class="dag-edge" marker-end="url(#arrowhead)"></line>`;
    }
  });

  result.allNodes.forEach(node => {
    const pos = positions[node];
    if (!pos) return;
    const isFile = result.files.includes(node);
    const refCount = result.dependencies.filter(dep => dep.to === node).length;
    const encodedNode = encodeURIComponent(node).replace(/'/g, '%27');
    svg += `<g class="dag-node-group" role="button" tabindex="0" data-node-id="${escapeAttr(node)}" onclick="handleGraphNodeClick(event, '${encodedNode}')" onkeydown="handleGraphNodeKeydown(event, '${encodedNode}')">`;
    svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius}" class="dag-node ${isFile ? 'file-node' : 'dir-node'}"></circle>`;
    svg += `<text x="${pos.x}" y="${pos.y + 4}" class="dag-label">${escapeHtml(getNodeLabel(node))}</text>`;
    svg += `<rect x="${pos.x - 24}" y="${pos.y + 34}" width="48" height="18" rx="4" class="dag-ref-badge"></rect>`;
    svg += `<text x="${pos.x}" y="${pos.y + 47}" class="dag-ref-label">Refs: ${refCount}</text>`;
    svg += '</g>';
  });

  svg += '</g></svg>';
  return svg;
}

function buildDependencyGraph(result) {
  return `
    <h3 class="mt-16">Hierarchy Graph</h3>
    <div class="graph-controls">
      <button class="preset-btn" onclick="zoomGraph(1.2)">＋ Zoom In</button>
      <button class="preset-btn" onclick="zoomGraph(0.8)">－ Zoom Out</button>
      <button class="preset-btn" onclick="resetGraphZoom()">⊙ Reset View</button>
    </div>
    <div class="graph-container">
      ${createSVGGraph(result)}
    </div>
    <div class="graph-legend">
      <div class="legend-item"><div class="legend-color file-color"></div> Files</div>
      <div class="legend-item"><div class="legend-color dir-color"></div> Directories</div>
      <div class="legend-item"><div class="legend-arrow">→</div> Parent to child</div>
      <div class="legend-item"><div class="legend-ref">Refs</div> Click a node to delete it</div>
    </div>
  `;
}

function buildHierarchyView(result) {
  const childMap = result.adj;
  const lines = [];
  const visited = new Set();

  function walk(node, depth) {
    if (visited.has(node) && result.structureMode !== 'dag') return;
    visited.add(node);
    const indent = '  '.repeat(depth);
    const prefix = result.files.includes(node) ? '[FILE]' : '[DIR] ';
    lines.push(`${indent}${prefix} ${getNodeLabel(node)}`);
    (childMap[node] || []).forEach(child => walk(child, depth + 1));
  }

  if (result.roots.length) {
    result.roots.forEach(root => walk(root, 0));
  } else {
    result.topologicalOrder.forEach(node => walk(node, 0));
  }

  return `
    <h3 class="mt-16">Hierarchy View</h3>
    <pre class="hierarchy-view">${lines.join('\n')}</pre>
  `;
}

/* ── Presets & Export ─────────────────────────────────────── */
function loadPreset(type) {
  clearError();
  const preset = PRESETS[type];
  if (!preset) return;

  nextNodeId = 0;
  const nodeIdsByName = {};
  dagState.files = preset.files.map(f => {
    const file = { id: makeNodeId('file'), ...f };
    nodeIdsByName[f.name] = file.id;
    return file;
  });
  dagState.directories = preset.directories.map(d => {
    const directory = { id: makeNodeId('dir'), ...d };
    nodeIdsByName[d.name] = directory.id;
    return directory;
  });
  dagState.dependencies = preset.dependencies.map(dep => ({
    from: nodeIdsByName[dep.from],
    to: nodeIdsByName[dep.to]
  }));
  setStructureMode(preset.structureMode, null, true);
  renderLists();
  refreshSimulationOutputIfReady();
  showSuccessBanner(`Preset "${type}" loaded successfully.`);
  showToast(`Loaded preset: ${type}`);
}

function exportResults() {
  if (!currentResult) { showError('Run the simulation before exporting results.'); return; }

  const exportData = {
    timestamp: new Date().toISOString(),
    structureMode: dagState.structureMode,
    input: {
      files: serializeFiles(),
      directories: serializeDirectories(),
      dependencies: serializeDependencies()
    },
    results: {
      totalFiles: currentResult.totalFiles,
      totalDirs: currentResult.totalDirs,
      totalDeps: currentResult.totalDeps,
      topologicalOrder: currentResult.topologicalOrder.map(getNodePath),
      executionTime: currentResult.executionTime,
      lookupMetrics: currentResult.lookupMetrics,
      storageMetrics: currentResult.storageMetrics,
      steps: currentResult.steps
    }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `filesystem-results-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showNodeInfo(nodeId, isFile) {
  if (!currentResult) return;
  const type = isFile ? 'File' : 'Directory';
  const parents = currentResult.dependencies.filter(dep => dep.to === nodeId).map(dep => dep.from);
  const children = currentResult.adj[nodeId] || [];
  const refCount = parents.length;
  alert(`${type}: ${getNodeLabel(nodeId)}\nReference count: ${refCount}\nParent: ${parents.length ? parents.map(getNodePath).join(', ') : 'None'}\nChildren: ${children.length ? children.map(getNodeLabel).join(', ') : 'None'}\nDepth: ${currentResult.depths[nodeId] ?? 0}`);
}

function handleGraphNodeClick(eventOrEncodedNodeId, maybeEncodedNodeId) {
  if (!currentResult) return;
  if (eventOrEncodedNodeId && typeof eventOrEncodedNodeId.stopPropagation === 'function') {
    eventOrEncodedNodeId.stopPropagation();
  }
  const encodedNodeId = maybeEncodedNodeId || eventOrEncodedNodeId;
  const nodeId = decodeURIComponent(encodedNodeId);
  const nodeType = getNodeType(nodeId);
  if (!nodeType) return;

  const isFile = nodeType === 'file';
  const typeLabel = isFile ? 'file' : 'directory';
  const nodeName = getNodeLabel(nodeId);
  const incomingLinks = dagState.dependencies.filter(dep => dep.to === nodeId);
  const parents = incomingLinks.map(dep => dep.from);
  const children = dagState.dependencies.filter(dep => dep.from === nodeId).map(dep => dep.to);
  const refCount = parents.length;

  if (refCount > 0) {
    if (refCount === 1) {
      const parent = incomingLinks[0].from;
      const shouldRemoveReference = confirm([
        `${isFile ? 'File' : 'Directory'}: ${nodeName}`,
        `Reference count: ${refCount}`,
        `Parent: ${getNodePath(parent)}`,
        '',
        `Remove this reference (${getNodeLabel(parent)} -> ${nodeName})?`
      ].join('\n'));
      if (shouldRemoveReference) removeDependency(parent, nodeId);
      return;
    }

    const choices = incomingLinks
      .map((dep, index) => `${index + 1}. ${getNodePath(dep.from)} -> ${getNodeLabel(dep.to)}`)
      .join('\n');
    const selected = prompt([
      `${isFile ? 'File' : 'Directory'}: ${nodeName}`,
      `Reference count: ${refCount}`,
      '',
      'Type the number of the reference to remove:',
      choices
    ].join('\n'));
    if (selected === null) return;
    const selectedIndex = parseInt(selected, 10) - 1;
    const linkToRemove = incomingLinks[selectedIndex];
    if (!linkToRemove) {
      showError('Invalid reference number selected.');
      return;
    }
    removeDependency(linkToRemove.from, linkToRemove.to);
    return;
  }

  const details = [
    `${isFile ? 'File' : 'Directory'}: ${nodeName}`,
    `Reference count: ${refCount}`,
    `Parents: None`,
    `Children: ${children.length ? children.map(getNodeLabel).join(', ') : 'None'}`,
    '',
    `Delete this ${typeLabel} from the graph?`
  ].join('\n');

  if (!confirm(details)) return;
  if (isFile) {
    removeFile(nodeId);
  } else {
    removeDirectory(nodeId);
  }
}

function handleGraphNodeKeydown(event, encodedNodeId) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  handleGraphNodeClick(event, encodedNodeId);
}

/* ── Graph Zoom / Pan ─────────────────────────────────────── */
function zoomGraph(factor) {
  const svg = document.querySelector('.dag-svg');
  if (!svg) return;
  currentZoom = Math.max(0.1, Math.min(3, currentZoom * factor));
  updateGraphTransform();
}

function resetGraphZoom() {
  currentZoom = 1; currentPanX = 0; currentPanY = 0;
  updateGraphTransform();
}

function updateGraphTransform() {
  const layer = document.querySelector('.dag-pan-layer');
  if (!layer) return;
  layer.setAttribute('transform', `translate(${currentPanX}, ${currentPanY}) scale(${currentZoom})`);
}

/* ── Reset ────────────────────────────────────────────────── */
function resetAll() {
  dagState.files = [];
  dagState.directories = [];
  dagState.dependencies = [];
  nextNodeId = 0;
  currentResult = null;

  document.getElementById('file-name-input').value = '';
  document.getElementById('directory-name-input').value = '';
  clearError();
  setStructureMode('dag', null, true);
  renderLists();
  renderOutput(`
    <div class="output-placeholder">
      <div class="placeholder-icon">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M3 21h18M3 10l9-7 9 7" />
        </svg>
      </div>
      <p>Results will appear here after you run the simulation.</p>
      <span class="placeholder-hint">Try loading a preset and clicking Run →</span>
    </div>
  `);
  document.getElementById('export-btn').style.display = 'none';
  resetGraphZoom();
  setLiveStatus('Ready to build', 'Choose a structure, add nodes, and create valid parent-to-child relations. Rule checks and cycle checks will appear here instantly.', 'info');
  setValidationPill('Ready', false);
  showToast('Builder reset.');
}

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setStructureMode('dag', null, true);
  renderLists();

  let isDragging = false;
  let startX = 0, startY = 0;

  document.addEventListener('mousedown', e => {
    if (e.target.closest('.dag-svg')) {
      if (e.target.closest('.dag-node-group')) return;
      isDragging = true;
      startX = e.clientX - currentPanX;
      startY = e.clientY - currentPanY;
    }
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    currentPanX = e.clientX - startX;
    currentPanY = e.clientY - startY;
    updateGraphTransform();
  });

  document.addEventListener('mouseup', () => { isDragging = false; });

  document.getElementById('file-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') addFile(); });
  document.getElementById('directory-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') addDirectory(); });
  document.querySelectorAll('.field').forEach(field => {
    field.addEventListener('input', () => field.classList.remove('field-error'));
  });
});

/* ── Expose to HTML ───────────────────────────────────────── */
window.toggleTheme     = toggleTheme;
window.setStructureMode = setStructureMode;
window.addFile         = addFile;
window.addDirectory    = addDirectory;
window.addDependency   = addDependency;
window.removeFile      = removeFile;
window.removeDirectory = removeDirectory;
window.removeDependency = removeDependency;
window.runSimulation   = runSimulation;
window.resetAll        = resetAll;
window.exportResults   = exportResults;
window.loadPreset      = loadPreset;
window.zoomGraph       = zoomGraph;
window.resetGraphZoom  = resetGraphZoom;
window.showNodeInfo    = showNodeInfo;
window.handleGraphNodeClick = handleGraphNodeClick;
window.handleGraphNodeKeydown = handleGraphNodeKeydown;

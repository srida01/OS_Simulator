let TOTAL_BLOCKS = 30;
let currentAlgorithm = 'contiguous';
let diskBlocks = Array(TOTAL_BLOCKS).fill(null);
let fileCounter = 0;
let colorClasses = ['allocated-1', 'allocated-2', 'allocated-3', 'allocated-4', 'allocated-5'];
let randomAllocation = false;

document.addEventListener('DOMContentLoaded', () => {
    initializeDiskBlocks();
    setupAlgorithmSelector();
    setupRangeSliders();
    document.getElementById('allocate-btn').addEventListener('click', allocateFile);
    document.getElementById('reset-btn').addEventListener('click', resetDisk);
    updateFreeBlocksCount();
});

function initializeDiskBlocks() {
    const container = document.getElementById('disk-blocks');
    container.innerHTML = '';

    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        const block = document.createElement('div');
        block.className = 'block free';
        block.textContent = i;

        container.appendChild(block);
    }

    updateDiskVisualization();
}

function setupAlgorithmSelector() {
    const algoButtons = document.querySelectorAll('.algo-btn');
    const algoDescs = document.querySelectorAll('.algo-desc');

    algoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            algoButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const algo = btn.getAttribute('data-algo');
            algoDescs.forEach(desc => desc.classList.remove('active'));
            document.getElementById(`${algo}-desc`).classList.add('active');

            currentAlgorithm = algo;
        });
    });
}

function setupRangeSliders() {
}

function resetDisk() {
    diskBlocks = Array(TOTAL_BLOCKS).fill(null);
    
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    
    fileCounter = 0;
    
    updateDiskVisualization();
    
    updateFreeBlocksCount();
}

function updateFreeBlocksCount() {
    const freeBlocks = diskBlocks.filter(block => block === null).length;
    document.getElementById('blocks-count-text').textContent = `${freeBlocks} of ${TOTAL_BLOCKS} blocks free`;
}

function allocateFile() {
    const fileNameInput = document.getElementById('file-name');
    const fileSize = parseInt(document.getElementById('file-size').value);
    let fileName = fileNameInput.value.trim();

    if (!fileName) {
        alert('Please enter a file name.');
        return;
    }

    if (isNaN(fileSize) || fileSize <= 0 || fileSize > 10) {
        alert('File size must be between 1 and 10 blocks.');
        return;
    }

    const existingFiles = document.querySelectorAll('.file-entry');
    for (const file of existingFiles) {
        if (file.dataset.fileName === fileName) {
            alert('A file with that name already exists.');
            return;
        }
    }
    
    let allocated = false;
    let colorClass = colorClasses[(existingFiles.length) % colorClasses.length];
    let allocatedBlocks = [];
    
    switch (currentAlgorithm) {
        case 'contiguous':
            allocated = allocateContiguous(fileName, fileSize, colorClass, allocatedBlocks);
            break;
        case 'linked':
            allocated = allocateLinked(fileName, fileSize, colorClass, allocatedBlocks);
            break;
        case 'indexed':
            allocated = allocateIndexed(fileName, fileSize, colorClass, allocatedBlocks);
            break;
        case 'extents':
            allocated = allocateExtents(fileName, fileSize, colorClass, allocatedBlocks);
            break;
    }

    if (!allocated) {
        alert('Could not allocate file. Not enough free space or fragmentation issue.');
    } else {
        addFileToList(fileName, fileSize, colorClass, allocatedBlocks);
        updateFreeBlocksCount();
        fileNameInput.value = "";
    }
}

function allocateContiguous(fileName, fileSize, colorClass, allocatedBlocks) {
    let startBlock = -1;
    let consecutiveFree = 0;

    if (randomAllocation) {
        const potentialStarts = [];
        
        for (let i = 0; i <= TOTAL_BLOCKS - fileSize; i++) {
            let canStart = true;
            for (let j = 0; j < fileSize; j++) {
                if (diskBlocks[i + j] !== null) {
                    canStart = false;
                    break;
                }
            }
            if (canStart) {
                potentialStarts.push(i);
            }
        }
        
        if (potentialStarts.length > 0) {
            const randomIndex = Math.floor(Math.random() * potentialStarts.length);
            startBlock = potentialStarts[randomIndex];
            consecutiveFree = fileSize;
        }
    } else {
        for (let i = 0; i < TOTAL_BLOCKS; i++) {
            if (diskBlocks[i] === null) {
                consecutiveFree++;
                if (consecutiveFree === 1) startBlock = i;
                if (consecutiveFree === fileSize) break;
            } else {
                consecutiveFree = 0;
                startBlock = -1;
            }
        }
    }

    if (consecutiveFree >= fileSize) {
        for (let i = 0; i < fileSize; i++) {
            diskBlocks[startBlock + i] = {
                file: fileName,
                type: colorClass
            };
            allocatedBlocks.push(startBlock + i);
        }

        updateDiskVisualization();
        return true;
    }

    return false;
}

function allocateLinked(fileName, fileSize, colorClass, allocatedBlocks) {
    const freeBlocks = [];
    const freeIndices = [];
    
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        if (diskBlocks[i] === null) {
            freeIndices.push(i);
        }
    }
    
    while (freeIndices.length > 0 && freeBlocks.length < fileSize) {
        const randomIndex = Math.floor(Math.random() * freeIndices.length);
        freeBlocks.push(freeIndices[randomIndex]);
        freeIndices.splice(randomIndex, 1);
    }

    if (freeBlocks.length === fileSize) {
        for (const blockIndex of freeBlocks) {
            diskBlocks[blockIndex] = {
                file: fileName,
                type: colorClass
            };
            allocatedBlocks.push(blockIndex);
        }

        updateDiskVisualization();
        return true;
    }

    return false;
}

function allocateIndexed(fileName, fileSize, colorClass, allocatedBlocks) {
    const freeIndices = [];
    
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        if (diskBlocks[i] === null) {
            freeIndices.push(i);
        }
    }
    
    if (freeIndices.length < fileSize + 1) {
        return false;
    }
    
    let indexBlock;
    let dataBlocks = [];
    
    const randomIndexPos = Math.floor(Math.random() * freeIndices.length);
    indexBlock = freeIndices[randomIndexPos];
    freeIndices.splice(randomIndexPos, 1);
    
    while (dataBlocks.length < fileSize && freeIndices.length > 0) {
        const randomPos = Math.floor(Math.random() * freeIndices.length);
        dataBlocks.push(freeIndices[randomPos]);
        freeIndices.splice(randomPos, 1);
    }

    diskBlocks[indexBlock] = {
        file: fileName,
        type: 'index',
        dataBlocks: dataBlocks.slice()
    };
    allocatedBlocks.push(indexBlock);

    for (const blockIndex of dataBlocks) {
        diskBlocks[blockIndex] = {
            file: fileName,
            type: colorClass,
            indexBlock: indexBlock
        };
        allocatedBlocks.push(blockIndex);
    }

    updateDiskVisualization();
    return true;
}

function allocateExtents(fileName, fileSize, colorClass, allocatedBlocks) {
    const extentCount = 2;
    
    let extentSizes = [];
    let remainingBlocks = fileSize;
    
    const minFirstExtentSize = Math.max(1, Math.floor(fileSize * 0.4));
    const maxFirstExtentSize = Math.max(1, Math.floor(fileSize * 0.6));
    const firstExtentSize = Math.floor(Math.random() * (maxFirstExtentSize - minFirstExtentSize + 1)) + minFirstExtentSize;
    
    extentSizes.push(firstExtentSize);
    remainingBlocks -= firstExtentSize;
    
    extentSizes.push(remainingBlocks);
    
    let extentStartBlocks = [];
    
    for (let i = 0; i < extentCount; i++) {
        const extentSize = extentSizes[i];
        let possibleStarts = [];
        
        for (let j = 0; j <= TOTAL_BLOCKS - extentSize; j++) {
            let canStart = true;
            for (let k = 0; k < extentSize; k++) {
                if (diskBlocks[j + k] !== null) {
                    canStart = false;
                    break;
                }
            }
            if (canStart) {
                possibleStarts.push(j);
            }
        }
        
        if (possibleStarts.length === 0) {
            return false;
        }
        
        const randomStartIndex = Math.floor(Math.random() * possibleStarts.length);
        const startBlock = possibleStarts[randomStartIndex];
        extentStartBlocks.push(startBlock);
        
        const extentClass = `extent-${i + 1}`;
        
        for (let j = 0; j < extentSize; j++) {
            const blockIndex = startBlock + j;
            diskBlocks[blockIndex] = {
                file: fileName,
                type: extentClass,
                extent: i + 1,
                extentStart: startBlock,
                extentSize: extentSize,
                isExtent: true
            };
            allocatedBlocks.push(blockIndex);
        }
    }
    
    updateDiskVisualization();
    return true;
}

function addFileToList(fileName, fileSize, colorClass, blocks) {
    const fileList = document.getElementById('file-list');
    const fileEntry = document.createElement('div');
    fileEntry.className = 'file-entry';
    fileEntry.dataset.fileName = fileName;
    
    blocks.sort((a, b) => a - b);
    
    let methodType = '';
    let methodDesc = '';
    let methodIcon = '';
    
    if (currentAlgorithm === 'contiguous') {
        methodType = 'sequential';
        methodDesc = `Contiguous blocks from ${blocks[0]} to ${blocks[blocks.length - 1]}`;
        methodIcon = 'fa-layer-group';
    } else if (currentAlgorithm === 'linked') {
        methodType = 'linked';
        methodDesc = 'Blocks are linked sequentially';
        methodIcon = 'fa-link';
    } else if (currentAlgorithm === 'indexed') {
        methodType = 'indexed';
        methodDesc = `Index block: ${blocks[0]}, Data blocks: ${blocks.slice(1).join(', ')}`;
        methodIcon = 'fa-table-cells';
    } else if (currentAlgorithm === 'extents') {
        methodType = 'extents-based';
        
        const extentMap = new Map();
        for (const blockIndex of blocks) {
            const block = diskBlocks[blockIndex];
            if (!extentMap.has(block.extent)) {
                extentMap.set(block.extent, {
                    blocks: [],
                    extentNum: block.extent
                });
            }
            extentMap.get(block.extent).blocks.push(blockIndex);
        }
        
        const extentDescriptions = [];
        for (const [extentNum, extentData] of extentMap.entries()) {
            extentData.blocks.sort((a, b) => a - b);
            const start = extentData.blocks[0];
            const end = extentData.blocks[extentData.blocks.length - 1];
            extentDescriptions.push(`Extent ${extentNum}: blocks ${start}-${end}`);
        }
        
        methodDesc = extentDescriptions.join(', ');
        methodIcon = 'fa-puzzle-piece';
    }
    
    let fileIndicators = '';
    
    if (currentAlgorithm === 'extents') {
        const extentMap = new Map();
        for (const blockIndex of blocks) {
            const block = diskBlocks[blockIndex];
            if (!extentMap.has(block.extent)) {
                extentMap.set(block.extent, block.extent);
            }
        }
        
        for (const [extentNum, extentNumber] of extentMap.entries()) {
            const extentColor = extentNumber === 1 ? '#ff7043' : '#66bb6a';
            fileIndicators += `<span class="file-indicator" style="background-color: ${extentColor};"></span>`;
        }
    } else if (currentAlgorithm === 'indexed') {
        fileIndicators = `<span class="file-indicator" style="background-color: #ffc840;"></span>`;
    } else {
        const colorNumber = colorClass.replace('allocated-', '');
        const colorName = ['pink', 'purple', 'blue', 'green', 'orange'][parseInt(colorNumber) - 1];
        fileIndicators = `<span class="file-indicator" style="background-color: var(--block-${colorName});"></span>`;
    }
    
    fileEntry.innerHTML = `
        <div class="file-header">
            <div class="file-title">
                ${fileIndicators}
                ${fileName}
            </div>
            <button class="delete-btn" data-file="${fileName}"><i class="fas fa-trash"></i> Delete</button>
        </div>
        <div class="file-info">
            <p><i class="fas fa-database"></i> Size: ${fileSize} blocks</p>
            <p><i class="fas ${methodIcon}"></i> Method: ${methodType}</p>
            <p><i class="fas fa-info-circle"></i> ${methodDesc}</p>
            <div class="blocks-list">
                <i class="fas fa-cubes"></i> Blocks: ${blocks.map(b => {
                    if (diskBlocks[b].type === 'index') {
                        return `<strong style="color: #ffc840;">${b}</strong>`;
                    } else if (diskBlocks[b].type === 'extent-1') {
                        return `<span style="color: #ff7043; font-weight: 500;">${b}</span>`;
                    } else if (diskBlocks[b].type === 'extent-2') {
                        return `<span style="color: #66bb6a; font-weight: 500;">${b}</span>`;
                    } else {
                        return b;
                    }
                }).join(', ')}
            </div>
        </div>
    `;
    
    fileEntry.querySelector('.delete-btn').addEventListener('click', function() {
        deleteFile(this.dataset.file);
    });
    
    if (fileList.firstChild) {
        fileList.insertBefore(fileEntry, fileList.firstChild);
    } else {
        fileList.appendChild(fileEntry);
    }
}

function deleteFile(fileName) {
    for (let i = 0; i < diskBlocks.length; i++) {
        if (diskBlocks[i] !== null && diskBlocks[i].file === fileName) {
            diskBlocks[i] = null;
        }
    }
    
    const fileEntry = document.querySelector(`.file-entry[data-file-name="${fileName}"]`);
    if (fileEntry) {
        fileEntry.remove();
    }
    
    updateDiskVisualization();
    updateFreeBlocksCount();
}

function updateDiskVisualization() {
    const blocks = document.querySelectorAll('.block');

    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        const block = blocks[i];
        
        block.className = 'block';
        
        if (diskBlocks[i] === null) {
            block.classList.add('free');
            block.title = `Block ${i}: Free`;
        } else {
            const blockData = diskBlocks[i];
            block.classList.add(blockData.type);
            
            if (blockData.type === 'index') {
                const dataBlocksList = blockData.dataBlocks ? blockData.dataBlocks.join(', ') : '';
                block.title = `Block ${i}: ${blockData.file} - Index Block\nPoints to data blocks: ${dataBlocksList}`;
            } else if (blockData.indexBlock !== undefined) {
                block.title = `Block ${i}: ${blockData.file} - Data Block\nReferenced by index block: ${blockData.indexBlock}`;
            } else if (blockData.extent !== undefined) {
                block.title = `Block ${i}: ${blockData.file} - Extent ${blockData.extent}\nPart of extent ${blockData.extent} (blocks ${blockData.extentStart} to ${blockData.extentStart + blockData.extentSize - 1})`;
            } else {
                block.title = `Block ${i}: ${blockData.file}`;
            }
        }
    }
} 
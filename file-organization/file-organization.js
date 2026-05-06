document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const addFolderBtn = document.getElementById('add-folder-btn');
    const addFileBtn = document.getElementById('add-file-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const newItemNameInput = document.getElementById('new-item-name');
    
    // Get file tree elements
    const multiLevelTree = document.getElementById('multi-level-tree');
    const singleLevelTree = document.getElementById('single-level-tree');
    
    // Get explanation elements
    const multiLevelExplanation = document.getElementById('multi-level-explanation');
    const singleLevelExplanation = document.getElementById('single-level-explanation');
    
    // Get organization type buttons
    const multiLevelBtn = document.getElementById('multi-level-btn');
    const singleLevelBtn = document.getElementById('single-level-btn');
    
    let selectedItem = null;
    let currentMode = 'multi-level'; // Default mode
    
    // Handle switching between organization types
    multiLevelBtn.addEventListener('click', function() {
        if (currentMode !== 'multi-level') {
            // Update buttons
            multiLevelBtn.classList.add('active');
            singleLevelBtn.classList.remove('active');
            
            // Update trees with fade animation
            singleLevelTree.style.display = 'none';
            multiLevelTree.style.display = 'block';
            multiLevelTree.classList.add('fade-transition');
            
            // Update explanations
            singleLevelExplanation.style.display = 'none';
            multiLevelExplanation.style.display = 'block';
            multiLevelExplanation.classList.add('fade-transition');
            
            currentMode = 'multi-level';
            selectedItem = null; // Reset selection
            
            // Update folder button state
            addFolderBtn.disabled = false;
            addFolderBtn.style.opacity = '1';
        }
    });
    
    singleLevelBtn.addEventListener('click', function() {
        if (currentMode !== 'single-level') {
            // Update buttons
            singleLevelBtn.classList.add('active');
            multiLevelBtn.classList.remove('active');
            
            // Update trees with fade animation
            multiLevelTree.style.display = 'none';
            singleLevelTree.style.display = 'block';
            singleLevelTree.classList.add('fade-transition');
            
            // Update explanations
            multiLevelExplanation.style.display = 'none';
            singleLevelExplanation.style.display = 'block';
            singleLevelExplanation.classList.add('fade-transition');
            
            currentMode = 'single-level';
            selectedItem = null; // Reset selection
            
            // In single-level mode, can't add folders (except root which already exists)
            addFolderBtn.disabled = true;
            addFolderBtn.style.opacity = '0.5';
        }
    });
    
    // Get current active tree based on mode
    function getCurrentTree() {
        return currentMode === 'multi-level' ? multiLevelTree : singleLevelTree;
    }
    
    // Toggle folder open/close and handle selection
    multiLevelTree.addEventListener('click', handleTreeClick);
    singleLevelTree.addEventListener('click', handleTreeClick);
    
    function handleTreeClick(e) {
        const target = e.target;
        
        // Deselect previous item
        if (selectedItem) {
            selectedItem.classList.remove('selected');
        }
        
        // Select current item
        if (target.classList.contains('folder') || target.classList.contains('file')) {
            selectedItem = target;
            selectedItem.classList.add('selected');
            
            // Stop propagation to avoid triggering parent folders
            e.stopPropagation();
            
            // Toggle folder open/close
            if (target.classList.contains('folder')) {
                target.classList.toggle('open');
            }
        }
    }
    
    // Add folder (only in multi-level mode)
    addFolderBtn.addEventListener('click', function() {
        if (currentMode !== 'multi-level') {
            alert('Folders can only be added in multi-level hierarchical mode');
            return;
        }
        
        const name = newItemNameInput.value.trim();
        if (!name) {
            alert('Please enter a name for the folder');
            return;
        }
        
        if (!selectedItem || !selectedItem.classList.contains('folder')) {
            alert('Please select a folder to add to');
            return;
        }
        
        // Create new folder
        const newFolder = document.createElement('div');
        newFolder.className = 'folder';
        newFolder.setAttribute('data-name', name);
        newFolder.textContent = name;
        
        // Create children container
        const children = document.createElement('div');
        children.className = 'children';
        newFolder.appendChild(children);
        
        // Add to selected folder's children
        const targetChildren = selectedItem.querySelector('.children');
        targetChildren.appendChild(newFolder);
        
        // Open the parent folder
        selectedItem.classList.add('open');
        
        // Clear input
        newItemNameInput.value = '';
    });
    
    // Add file
    addFileBtn.addEventListener('click', function() {
        const name = newItemNameInput.value.trim();
        if (!name) {
            alert('Please enter a name for the file');
            return;
        }
        
        // In single-level mode, can only add to root
        if (currentMode === 'single-level') {
            const rootFolder = singleLevelTree.querySelector('.folder[data-name="root"]');
            if (!rootFolder) {
                alert('Root folder not found');
                return;
            }
            
            // Create new file
            const newFile = document.createElement('div');
            newFile.className = 'file';
            newFile.setAttribute('data-name', name);
            newFile.textContent = name;
            
            // Add to root folder's children
            const rootChildren = rootFolder.querySelector('.children');
            rootChildren.appendChild(newFile);
            rootFolder.classList.add('open');
            
            // Clear input
            newItemNameInput.value = '';
            return;
        }
        
        // Multi-level mode - add to selected folder
        if (!selectedItem || !selectedItem.classList.contains('folder')) {
            alert('Please select a folder to add to');
            return;
        }
        
        // Create new file
        const newFile = document.createElement('div');
        newFile.className = 'file';
        newFile.setAttribute('data-name', name);
        newFile.textContent = name;
        
        // Add to selected folder's children
        const targetChildren = selectedItem.querySelector('.children');
        targetChildren.appendChild(newFile);
        
        // Open the parent folder
        selectedItem.classList.add('open');
        
        // Clear input
        newItemNameInput.value = '';
    });
    
    // Delete selected item
    deleteBtn.addEventListener('click', function() {
        if (!selectedItem) {
            alert('Please select an item to delete');
            return;
        }
        
        // Don't allow deleting the root folder
        if (selectedItem.getAttribute('data-name') === 'root') {
            alert('Cannot delete the root folder');
            return;
        }
        
        // Remove the selected item
        selectedItem.parentNode.removeChild(selectedItem);
        selectedItem = null;
    });
});
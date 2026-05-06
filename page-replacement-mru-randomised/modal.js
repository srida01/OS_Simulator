// Improved modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const howToUseBtn = document.getElementById('how-to-use-btn');
    const howToUseModal = document.getElementById('how-to-use-modal');
    const modalClose = document.getElementById('modal-close');
    
    // Function to open modal
    function openModal() {
        howToUseModal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
    
    // Function to close modal
    function closeModal() {
        howToUseModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    
    // Event listeners
    howToUseBtn.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    
    // Close modal when clicking outside of modal content
    howToUseModal.addEventListener('click', function(event) {
        if (event.target === howToUseModal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && howToUseModal.style.display === 'flex') {
            closeModal();
        }
    });
}); 
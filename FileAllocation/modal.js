// Modal functionality
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal');
    const openModalBtn = document.querySelector('.openModal');
    const closeBtn = document.querySelector('.close');

    // Check if elements exist
    if (modal && closeBtn) {
        // Close modal when clicking X
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Close modal on Escape key press
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }

    // Check if openModalBtn exists
    if (openModalBtn) {
        // Open modal
        openModalBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });
    }
}); 
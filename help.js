// Funcionalidad de ayuda
function showHelp() {
    const modal = document.getElementById('help-modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideHelp() {
    const modal = document.getElementById('help-modal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (event) => {
    const modal = document.getElementById('help-modal');
    if (event.target === modal) {
        hideHelp();
    }
});

// Cerrar modal con tecla Escape
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        hideHelp();
    }
});
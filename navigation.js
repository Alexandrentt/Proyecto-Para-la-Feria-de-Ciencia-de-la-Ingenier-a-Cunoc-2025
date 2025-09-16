// Funcionalidad de navegación
function toggleMenu() {
    const menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('show');
}

function showSection(sectionName) {
    // Si ya estamos en la sección, no hacer nada
    if (currentView === sectionName) {
        document.getElementById('dropdown-menu').classList.remove('show');
        return;
    }

    // Detener webcam si se sale de la página principal
    if (currentView === 'main' && sectionName !== 'main') {
        stopWebcam();
    }

    // Reiniciar webcam si se vuelve a la página principal
    if (sectionName === 'main' && currentView !== 'main') {
        if (isModelLoaded) {
            initWebcam();
        }
    }

    // Ocultar vista actual
    const currentViewEl = document.getElementById(currentView + '-view');
    if (currentViewEl) {
        currentViewEl.classList.remove('active');
        setTimeout(() => {
            currentViewEl.style.display = 'none';
        }, 300);
    }

    // Mostrar nueva vista
    const targetView = document.getElementById(sectionName + '-view');
    if (targetView) {
        targetView.style.display = 'block';
        setTimeout(() => {
            targetView.classList.add('active');
        }, 50);

        currentView = sectionName;

        // Actualizar gráficas si es necesario
        if (sectionName === 'charts') {
            setTimeout(() => {
                updateCharts();
            }, 350);
        }

        // Actualizar título de la página
        updatePageTitle(sectionName);
    }

    // Ocultar menú
    document.getElementById('dropdown-menu').classList.remove('show');
}

function stopWebcam() {
    if (webcam) {
        webcam.stop();
        webcam = null;
        console.log('Webcam detenida');
    }
}

function updatePageTitle(sectionName) {
    const titles = {
        'main': getText('main', 'titles'),
        'history': getText('history', 'titles'),
        'charts': getText('charts', 'titles'),
        'training': getText('training', 'titles'),
        'help': getText('help', 'titles'),
        'config': getText('config', 'titles')
    };

    const header = document.querySelector(`#${sectionName}-view header h1`);
    if (header && titles[sectionName]) {
        header.textContent = titles[sectionName];
    }
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', (e) => {
    const menu = document.getElementById('dropdown-menu');
    const menuToggle = document.getElementById('menu-toggle');
    if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
        menu.classList.remove('show');
    }
});
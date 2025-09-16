// Funcionalidad de navegación
function toggleMenu() {
    const menu = document.getElementById('dropdown-menu');
    // Solo toggle en móviles
    if (window.innerWidth <= 768) {
        menu.classList.toggle('show');
    }
}

function showSection(sectionName) {
    // Si ya estamos en la sección, no hacer nada
    if (currentView === sectionName) {
        // Solo ocultar menú si está en modo móvil
        if (window.innerWidth <= 768) {
            document.getElementById('dropdown-menu').classList.remove('show');
        }
        return;
    }

    // Detener webcam si se sale de la página principal
    if (currentView === 'main' && sectionName !== 'main') {
        stopWebcam();
    }

    // Reiniciar webcam si se vuelve a la página principal
    if (sectionName === 'main' && currentView !== 'main') {
        if (isModelLoaded) {
            setTimeout(() => {
                initWebcam();
            }, 300); // Esperar a que termine la transición
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

        // Actualizar botón activo del menú
        updateActiveMenuButton(sectionName);
    }

    // Ocultar menú solo en móviles
    if (window.innerWidth <= 768) {
        document.getElementById('dropdown-menu').classList.remove('show');
    }
}

function updateActiveMenuButton(sectionName) {
    // Remover clase active de todos los botones
    const menuButtons = document.querySelectorAll('.dropdown-menu button');
    menuButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Agregar clase active al botón correspondiente
    const activeButton = document.querySelector(`.dropdown-menu button[onclick*="${sectionName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
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
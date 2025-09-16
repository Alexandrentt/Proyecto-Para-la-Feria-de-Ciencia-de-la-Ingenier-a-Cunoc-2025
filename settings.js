// Funcionalidad de configuración
function createSettingsView() {
    const settingsHTML = `
        <div class="card">
            <div class="settings-section">
                <h3 data-i18n="title" data-i18n-category="config">Configuración</h3>

                <!-- Idioma -->
                <div class="setting-group">
                    <h4 data-i18n="language" data-i18n-category="config">Idioma</h4>
                    <div class="setting-options">
                        <button class="setting-btn ${currentLanguage === 'es' ? 'active' : ''}"
                                onclick="changeLanguage('es')">
                            <span data-i18n="spanish" data-i18n-category="config">Español</span>
                        </button>
                        <button class="setting-btn ${currentLanguage === 'en' ? 'active' : ''}"
                                onclick="changeLanguage('en')">
                            <span data-i18n="english" data-i18n-category="config">English</span>
                        </button>
                    </div>
                </div>

                <!-- Tema -->
                <div class="setting-group">
                    <h4 data-i18n="theme" data-i18n-category="config">Tema</h4>
                    <div class="theme-options">
                        <div class="theme-option">
                            <span class="theme-label" data-i18n="light" data-i18n-category="config">Claro</span>
                            <label class="theme-switch">
                                <input type="checkbox" ${currentTheme === 'dark' ? 'checked' : ''} onchange="toggleThemeSwitch()">
                                <span class="slider"></span>
                            </label>
                            <span class="theme-label" data-i18n="dark" data-i18n-category="config">Oscuro</span>
                        </div>
                    </div>
                </div>

                <!-- Modo de Escaneo -->
                <div class="setting-group">
                    <h4 data-i18n="scanMode" data-i18n-category="config">Modo de Escaneo</h4>
                    <div class="setting-options">
                        <button class="setting-btn ${scanMode === 'single' ? 'active' : ''}"
                                onclick="setScanMode('single')">
                            <span data-i18n="singleMode" data-i18n-category="config">Uno por Uno</span>
                        </button>
                        <button class="setting-btn ${scanMode === 'multi' ? 'active' : ''}"
                                onclick="setScanMode('multi')">
                            <span data-i18n="multiMode" data-i18n-category="config">Múltiples Objetos</span>
                        </button>
                    </div>
                </div>

                <!-- Modo Webcam -->
                <div class="setting-group">
                    <h4 data-i18n="webcamMode" data-i18n-category="config">Modo Webcam</h4>
                    <div class="setting-options">
                        <button class="setting-btn ${webcamMode === 'continuous' ? 'active' : ''}"
                                onclick="setWebcamMode('continuous')">
                            <span data-i18n="continuousMode" data-i18n-category="config">Continuo</span>
                        </button>
                        <button class="setting-btn ${webcamMode === 'capture' ? 'active' : ''}"
                                onclick="setWebcamMode('capture')">
                            <span data-i18n="captureMode" data-i18n-category="config">Captura</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    return settingsHTML;
}

function changeLanguage(lang) {
    setLanguage(lang);
    // Actualizar botones de configuración
    updateSettingsButtons();
}

function changeTheme(theme) {
    setTheme(theme);
    // Actualizar switch de tema
    updateThemeSwitch();
    // Actualizar botones de configuración
    updateSettingsButtons();
}

function toggleThemeSwitch() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    changeTheme(newTheme);
}

function updateThemeSwitch() {
    const switchInput = document.querySelector('.theme-switch input');
    if (switchInput) {
        switchInput.checked = currentTheme === 'dark';
    }
}

function updateSettingsButtons() {
    // Actualizar estado de los botones en configuración
    const configView = document.getElementById('config-view');
    if (configView) {
        configView.innerHTML = createSettingsView();
    }
    // Actualizar switch de tema
    updateThemeSwitch();
}

// Agregar vista de configuración al cargar
document.addEventListener('DOMContentLoaded', () => {
    const configView = document.getElementById('config-view');
    if (configView) {
        configView.innerHTML = createSettingsView();
    }
});
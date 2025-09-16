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

                <!-- Ayuda integrada -->
                <div class="setting-group">
                    <h4 data-i18n="help" data-i18n-category="titles">Centro de Ayuda</h4>
                    <div class="help-content">
                        <h3 data-i18n="webcam" data-i18n-category="help">¿Cómo funciona?</h3>
                        <p>Esta aplicación utiliza Inteligencia Artificial para clasificar objetos en tres categorías:</p>
                        <ul>
                            <li><strong>🍌 Orgánico:</strong> Basura que se descompone naturalmente</li>
                            <li><strong>♻️ Reciclable:</strong> Materiales que pueden reutilizarse</li>
                            <li><strong>🚫 No Reciclable:</strong> Basura que va a vertedero</li>
                        </ul>

                        <h3 data-i18n="webcam" data-i18n-category="help">Modo Webcam</h3>
                        <p>1. Haz clic en "🎥 Usar Webcam"</p>
                        <p>2. Permite el acceso a la cámara</p>
                        <p>3. La IA detectará objetos automáticamente</p>
                        <p>4. <strong>Haz clic en un objeto</strong> para clasificarlo</p>
                        <p>5. Verás el resultado con el nivel de confianza</p>

                        <h3 data-i18n="upload" data-i18n-category="help">Subir Imagen</h3>
                        <p>1. Haz clic en "📸 Subir Imagen"</p>
                        <p>2. Selecciona o arrastra una imagen</p>
                        <p>3. Haz clic en "🤖 Clasificar Imagen"</p>

                        <h3 data-i18n="multiObject" data-i18n-category="help">Detección Múltiple</h3>
                        <p>La aplicación puede detectar múltiples objetos en la imagen:</p>
                        <ul>
                            <li>Verás rectángulos verdes alrededor de los objetos detectados</li>
                            <li>Cada objeto tiene un número en la esquina</li>
                            <li>Haz clic en el objeto que quieres clasificar</li>
                            <li>El rectángulo se volverá rojo cuando esté seleccionado</li>
                        </ul>

                        <h3 data-i18n="tips" data-i18n-category="help">Consejos para mejores resultados</h3>
                        <ul>
                            <li>Asegúrate de que el objeto esté bien iluminado</li>
                            <li>Mantén la cámara estable</li>
                            <li>Evita fondos complejos</li>
                            <li>Los objetos deben ocupar al menos 1/4 de la imagen</li>
                        </ul>

                        <h3 data-i18n="troubleshooting" data-i18n-category="help">Solución de Problemas</h3>
                        <ul>
                            <li><strong>"Modelo no cargado":</strong> Espera a que termine la carga inicial</li>
                            <li><strong>"Permisos denegados":</strong> Permite el acceso a la cámara</li>
                            <li><strong>"No se detectan objetos":</strong> Intenta con mejor iluminación</li>
                        </ul>

                        <div class="help-highlight">
                            <h3>🌱 Impacto Ambiental</h3>
                            <p>Clasificar correctamente la basura reduce la contaminación y ayuda a reciclar más materiales. ¡Cada clasificación cuenta!</p>
                        </div>
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
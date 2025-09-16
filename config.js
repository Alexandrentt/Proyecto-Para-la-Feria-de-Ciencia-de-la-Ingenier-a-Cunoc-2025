// Configuración de la aplicación
let currentLanguage = 'es'; // 'es' o 'en'
let currentTheme = 'light'; // 'light' o 'dark'

// Configuración de idiomas
const translations = {
    es: {
        // Navegación
        menu: {
            main: 'Principal',
            history: 'Historial',
            charts: 'Estadísticas',
            training: 'Dataset',
            help: 'Ayuda',
            config: 'Configuración'
        },

        // Títulos
        titles: {
            main: '♻️ Clasificador de Basura IA',
            history: '📊 Historial de Clasificaciones',
            charts: '📈 Estadísticas',
            training: '🧠 Dataset de Entrenamiento',
            help: '❓ Centro de Ayuda',
            config: '⚙️ Configuración'
        },

        // Configuración
        config: {
            title: 'Configuración',
            language: 'Idioma',
            theme: 'Tema',
            spanish: 'Español',
            english: 'Inglés',
            light: 'Claro',
            dark: 'Oscuro',
            scanMode: 'Modo de Escaneo',
            webcamMode: 'Modo Webcam',
            singleMode: 'Uno por Uno',
            multiMode: 'Múltiples Objetos',
            continuousMode: 'Continuo',
            captureMode: 'Captura'
        },

        // Mensajes
        messages: {
            loading: 'Cargando...',
            success: '¡Éxito!',
            error: 'Error',
            noData: 'No hay datos disponibles',
            confirmDelete: '¿Estás seguro de que quieres eliminar esto?'
        },

        // Ayuda
        help: {
            title: 'Centro de Ayuda',
            webcam: 'Modo Webcam',
            upload: 'Subir Imagen',
            multiObject: 'Detección Múltiple',
            tips: 'Consejos',
            troubleshooting: 'Solución de Problemas'
        }
    },

    en: {
        // Navigation
        menu: {
            main: 'Main',
            history: 'History',
            charts: 'Statistics',
            training: 'Dataset',
            help: 'Help',
            config: 'Settings'
        },

        // Titles
        titles: {
            main: '♻️ Waste Classifier AI',
            history: '📊 Classification History',
            charts: '📈 Statistics',
            training: '🧠 Training Dataset',
            help: '❓ Help Center',
            config: '⚙️ Settings'
        },

        // Settings
        config: {
            title: 'Settings',
            language: 'Language',
            theme: 'Theme',
            spanish: 'Spanish',
            english: 'English',
            light: 'Light',
            dark: 'Dark',
            scanMode: 'Scan Mode',
            webcamMode: 'Webcam Mode',
            singleMode: 'Single Object',
            multiMode: 'Multiple Objects',
            continuousMode: 'Continuous',
            captureMode: 'Capture'
        },

        // Messages
        messages: {
            loading: 'Loading...',
            success: 'Success!',
            error: 'Error',
            noData: 'No data available',
            confirmDelete: 'Are you sure you want to delete this?'
        },

        // Help
        help: {
            title: 'Help Center',
            webcam: 'Webcam Mode',
            upload: 'Upload Image',
            multiObject: 'Multiple Object Detection',
            tips: 'Tips',
            troubleshooting: 'Troubleshooting'
        }
    }
};

// Funciones de configuración
function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updateLanguage();
}

function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    updateTheme();
}

function getText(key, category = null) {
    const lang = translations[currentLanguage];
    if (category && lang[category]) {
        return lang[category][key] || key;
    }
    return lang[key] || key;
}

function updateLanguage() {
    // Actualizar todos los elementos con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const category = element.getAttribute('data-i18n-category');
        element.textContent = getText(key, category);
    });

    // Actualizar placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const category = element.getAttribute('data-i18n-category');
        element.placeholder = getText(key, category);
    });
}

function updateTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
}

// Cargar configuración guardada
function loadSettings() {
    const savedLanguage = localStorage.getItem('language');
    const savedTheme = localStorage.getItem('theme');

    if (savedLanguage) {
        currentLanguage = savedLanguage;
    }

    if (savedTheme) {
        currentTheme = savedTheme;
    }

    updateLanguage();
    updateTheme();
}

// Inicializar configuración
document.addEventListener('DOMContentLoaded', loadSettings);
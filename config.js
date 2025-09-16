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
            config: 'Configuración'
        },

        // Títulos
        titles: {
            main: '♻️ Clasificador de Basura IA',
            history: '📊 Historial de Clasificaciones',
            charts: '📈 Estadísticas',
            training: '🧠 Dataset de Entrenamiento',
            config: '⚙️ Configuración',
            pageTitle: '♻️ Clasificador de Basura IA'
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
            confirmDelete: '¿Estás seguro de que quieres eliminar esto?',
            waiting: 'Esperando clasificación...',
            captureAndClassify: 'Capturar y Clasificar',
            singleObject: 'Uno por Uno',
            multipleObjects: 'Múltiples Objetos',
            continuous: 'Continua',
            capture: 'Captura',
            clearHistory: 'Limpiar Historial',
            exportData: 'Exportar Datos',
            exportDataset: 'Exportar Dataset',
            clearDataset: 'Limpiar Dataset',
            totalClassifications: 'Total Clasificaciones',
            averageConfidence: 'Confianza Promedio',
            mostCommon: 'Categoría Más Común',
            imagesSaved: 'Imágenes guardadas',
            precisionAverage: 'Precisión promedio',
            useWebcam: 'Usar Webcam',
            uploadImage: 'Subir Imagen',
            classifyImage: 'Clasificar Imagen',
            selectOrDrag: 'Selecciona o arrastra una imagen',
            formats: 'Formatos: JPG, PNG, GIF',
            distributionByCategory: 'Distribución por Categoría',
            classificationsByDay: 'Clasificaciones por Día',
            noClassifications: 'No hay clasificaciones aún',
            imagesStored: 'Imágenes guardadas',
            averageAccuracy: 'Precisión promedio',
            correctClassification: 'Clasificación correcta registrada',
            incorrectClassification: 'Clasificación incorrecta registrada',
            imageSaved: 'Imagen guardada para reentrenamiento',
            startingApp: 'Iniciando aplicación...',
            modelLoading: 'Cargando modelo de IA...',
            modelLoaded: 'Modelo cargado correctamente',
            objectDetectionLoading: 'Cargando modelo de detección de objetos...',
            objectDetectionLoaded: 'Modelo de detección cargado correctamente',
            cameraActive: 'Cámara activa - Haz clic en un objeto para clasificarlo',
            cameraActiveCapture: 'Cámara activa - Presiona "Capturar" para analizar',
            clickObject: 'Haz clic en un objeto para clasificarlo',
            selectImage: 'Selecciona una imagen para clasificar',
            imageLoaded: 'Imagen cargada - Haz clic en "Clasificar"',
            classifying: 'Clasificando...',
            classificationResult: 'Resultado de clasificación',
            confidence: 'Confianza',
            organic: 'Orgánico',
            recyclable: 'Reciclable',
            nonRecyclable: 'No Reciclable',
            menu: 'Menú',
            environmentalImpact: 'Clasificador de Basura con IA • Ayuda al medio ambiente clasificando correctamente'
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
            config: 'Settings'
        },

        // Titles
        titles: {
            main: '♻️ Waste Classifier AI',
            history: '📊 Classification History',
            charts: '📈 Statistics',
            training: '🧠 Training Dataset',
            config: '⚙️ Settings',
            pageTitle: '♻️ Waste Classifier AI'
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
            confirmDelete: 'Are you sure you want to delete this?',
            waiting: 'Waiting for classification...',
            captureAndClassify: 'Capture and Classify',
            singleObject: 'Single Object',
            multipleObjects: 'Multiple Objects',
            continuous: 'Continuous',
            capture: 'Capture',
            clearHistory: 'Clear History',
            exportData: 'Export Data',
            exportDataset: 'Export Dataset',
            clearDataset: 'Clear Dataset',
            totalClassifications: 'Total Classifications',
            averageConfidence: 'Average Confidence',
            mostCommon: 'Most Common Category',
            imagesSaved: 'Images saved',
            precisionAverage: 'Average precision',
            useWebcam: 'Use Webcam',
            uploadImage: 'Upload Image',
            classifyImage: 'Classify Image',
            selectOrDrag: 'Select or drag an image',
            formats: 'Formats: JPG, PNG, GIF',
            distributionByCategory: 'Distribution by Category',
            classificationsByDay: 'Classifications by Day',
            noClassifications: 'No classifications yet',
            imagesStored: 'Images stored',
            averageAccuracy: 'Average accuracy',
            correctClassification: 'Correct classification recorded',
            incorrectClassification: 'Incorrect classification recorded',
            imageSaved: 'Image saved for retraining',
            startingApp: 'Starting application...',
            modelLoading: 'Loading AI model...',
            modelLoaded: 'Model loaded successfully',
            objectDetectionLoading: 'Loading object detection model...',
            objectDetectionLoaded: 'Object detection model loaded successfully',
            cameraActive: 'Camera active - Click on an object to classify it',
            cameraActiveCapture: 'Camera active - Press "Capture" to analyze',
            clickObject: 'Click on an object to classify it',
            selectImage: 'Select an image to classify',
            imageLoaded: 'Image loaded - Click "Classify"',
            classifying: 'Classifying...',
            classificationResult: 'Classification result',
            confidence: 'Confidence',
            organic: 'Organic',
            recyclable: 'Recyclable',
            nonRecyclable: 'Non-Recyclable',
            menu: 'Menu',
            environmentalImpact: 'Waste Classifier with AI • Help the environment by classifying correctly'
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
    // Actualizar título del documento
    document.title = getText('pageTitle', 'titles');

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
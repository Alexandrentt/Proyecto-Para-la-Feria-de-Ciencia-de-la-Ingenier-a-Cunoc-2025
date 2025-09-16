// Configuración
const MODEL_URL = './my_model/';
let model, webcam, currentMode = 'webcam';
let isModelLoaded = false;

// Inicialización
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    console.log('🚀 Iniciando Clasificador de Basura');
    updateStatus('🔄 Verificando librerías...', 'loading');

    // Verificar librerías
    if (typeof tf === 'undefined') {
        updateStatus('❌ TensorFlow.js no cargado', 'error');
        return;
    }

    if (typeof tmImage === 'undefined') {
        updateStatus('❌ Teachable Machine no cargado', 'error');
        return;
    }

    console.log('✅ Librerías cargadas correctamente');

    // Cargar modelo
    await loadModel();

    // Configurar eventos
    setupEventListeners();

    // Iniciar modo webcam si el modelo está cargado
    if (isModelLoaded) {
        await initWebcam();
    }
}

async function loadModel() {
    try {
        updateStatus('📥 Cargando modelo de IA...', 'loading');

        // Verificar archivos del modelo
        const modelResponse = await fetch(MODEL_URL + 'model.json');
        if (!modelResponse.ok) {
            throw new Error('model.json no encontrado. Asegúrate de tener la carpeta my_model/ con los archivos del modelo.');
        }

        const metadataResponse = await fetch(MODEL_URL + 'metadata.json');
        if (!metadataResponse.ok) {
            throw new Error('metadata.json no encontrado en la carpeta my_model/');
        }

        // Cargar modelo
        model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
        console.log('✅ Modelo cargado:', model);

        isModelLoaded = true;
        updateStatus('✅ Modelo cargado correctamente', 'success');

    } catch (error) {
        console.error('❌ Error cargando modelo:', error);
        updateStatus(`❌ Error: ${error.message}`, 'error');
        isModelLoaded = false;
    }
}

async function initWebcam() {
    if (!isModelLoaded) {
        updateStatus('❌ Modelo no cargado', 'error');
        return;
    }

    try {
        updateStatus('🎥 Iniciando cámara...', 'loading');

        // Crear webcam
        const flip = true;
        webcam = new tmImage.Webcam(224, 224, flip);

        await webcam.setup();
        await webcam.play();

        // Mostrar canvas
        const canvas = document.getElementById('webcam-canvas');
        canvas.width = webcam.canvas.width;
        canvas.height = webcam.canvas.height;
        canvas.style.display = 'block';

        updateStatus('🎥 Cámara activa - Muestra un objeto', 'success');

        // Iniciar predicción continua
        predictWebcam();

    } catch (error) {
        console.error('❌ Error con webcam:', error);
        let errorMsg = '❌ Error de cámara: ';

        if (error.name === 'NotAllowedError') {
            errorMsg += 'Permisos denegados. Permite el acceso a la cámara.';
        } else if (error.name === 'NotFoundError') {
            errorMsg += 'No se encontró cámara conectada.';
        } else if (error.name === 'NotReadableError') {
            errorMsg += 'Cámara en uso por otra aplicación.';
        } else {
            errorMsg += error.message;
        }

        updateStatus(errorMsg, 'error');
    }
}

async function predictWebcam() {
    if (webcam && model && currentMode === 'webcam') {
        // Actualizar webcam
        webcam.update();

        // Copiar frame al canvas visible
        const canvas = document.getElementById('webcam-canvas');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(webcam.canvas, 0, 0);

        // Hacer predicción
        const predictions = await model.predict(webcam.canvas);
        displayPrediction(predictions);

        // Continuar el loop
        requestAnimationFrame(predictWebcam);
    }
}

function setupEventListeners() {
    // Drag & Drop para imágenes
    const uploadArea = document.querySelector('.upload-area');

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });

    // Input de archivo
    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageFile(e.target.files[0]);
        }
    });
}

function switchMode(mode) {
    currentMode = mode;

    // Actualizar botones
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Mostrar/ocultar secciones
    if (mode === 'webcam') {
        document.getElementById('webcam-section').style.display = 'flex';
        document.getElementById('upload-section').style.display = 'none';

        if (isModelLoaded) {
            initWebcam();
        }
    } else {
        document.getElementById('webcam-section').style.display = 'none';
        document.getElementById('upload-section').style.display = 'flex';

        // Detener webcam
        if (webcam) {
            webcam.stop();
            webcam = null;
        }

        document.getElementById('prediction').textContent = 'Selecciona una imagen para clasificar';
        document.getElementById('confidence').textContent = '';
    }
}

function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('preview-image');
        img.src = e.target.result;
        img.style.display = 'block';

        document.getElementById('classify-image-btn').style.display = 'block';
        document.getElementById('prediction').textContent = 'Imagen cargada - Haz clic en "Clasificar"';
        document.getElementById('confidence').textContent = '';
    };
    reader.readAsDataURL(file);
}

async function classifyUploadedImage() {
    if (!isModelLoaded) {
        alert('El modelo no está cargado. Espera un momento e intenta de nuevo.');
        return;
    }

    const img = document.getElementById('preview-image');
    if (!img.src) {
        alert('Por favor selecciona una imagen primero.');
        return;
    }

    try {
        document.getElementById('prediction').innerHTML = '<div class="loading-spinner"></div>Clasificando...';
        document.getElementById('confidence').textContent = '';

        // Hacer predicción
        const predictions = await model.predict(img);
        displayPrediction(predictions);

    } catch (error) {
        console.error('Error clasificando imagen:', error);
        document.getElementById('prediction').textContent = '❌ Error al clasificar imagen';
    }
}

function displayPrediction(predictions) {
    // Encontrar la predicción con mayor confianza
    const topPrediction = predictions.reduce((max, current) =>
        current.probability > max.probability ? current : max
    );

    // Formatear etiqueta
    const label = formatLabel(topPrediction.className);
    const confidence = (topPrediction.probability * 100).toFixed(1);

    // Mostrar resultado
    document.getElementById('prediction').textContent = label;
    document.getElementById('confidence').textContent = `Confianza: ${confidence}%`;

    console.log('🎯 Predicción:', label, `(${confidence}%)`);
}

function formatLabel(className) {
    const label = className.toLowerCase();

    // Mapear según nombres comunes
    if (label.includes('organi') || label.includes('organic') || label.includes('class 1') || label.includes('0')) {
        return '🍌 Orgánico';
    } else if ((label.includes('recicla') || label.includes('recycla')) && !label.includes('no')) {
        return '♻️ Reciclable';
    } else if (label.includes('no') || label.includes('class 2') || label.includes('1')) {
        return '🚫 No Reciclable';
    }

    // Retornar el nombre original con emoji genérico
    return `🗂️ ${className}`;
}

function updateStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = type === 'loading' ?
        `<div class="loading-spinner"></div><p>${message}</p>` :
        `<p>${message}</p>`;

    statusEl.className = `status ${type}`;
    console.log(message);
}
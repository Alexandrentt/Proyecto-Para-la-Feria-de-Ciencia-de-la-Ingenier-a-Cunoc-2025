// Configuración
const MODEL_URL = './my_model/';
let model, webcam, currentMode = 'webcam';
let isWebcamActive = false; // indica si la webcam ya está inicializada y en play
let isModelLoaded = false;
let currentImageData = null;
let webcamMode = 'capture'; // 'continuous' o 'capture'
let currentView = 'home'; // or whatever default view you want


async function initApp() {
    console.log(' Iniciando Clasificador de Basura');
    updateStatus('Verificando librerías...', 'loading');

    // Verificar librerías
    if (typeof tf === 'undefined') {
        updateStatus(' TensorFlow.js no cargado', 'error');
        return;
    }

    if (typeof tmImage === 'undefined') {
        updateStatus(' Teachable Machine no cargado', 'error');
        return;
    }

    console.log('Librerías cargadas correctamente');

    // Cargar solo el modelo de clasificación
    await loadModel();

    // Configurar eventos
    setupEventListeners();

    showSection('home');

    if (isModelLoaded) {
        // Esperar un poco para asegurar que el canvas esté listo
        setTimeout(async () => {
            await initWebcam();
        }, 300);
    }
    if (isModelLoaded && currentMode === 'webcam') {
    console.log('Inicializando cámara automáticamente...');
    setTimeout(async () => {
        await initWebcam();
    }, 500);
}

}

async function loadModel() {
    try {
        updateStatus('Cargando modelo de Techable Machine');

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
        console.log('Modelo cargado:', model);

        isModelLoaded = true;
        updateStatus('Modelo cargado correctamente', 'success');

if (typeof currentMode !== 'undefined' && currentMode === 'webcam') {
    console.log('Modelo cargado, iniciando cámara automáticamente...');
    setTimeout(async () => {
        try {
            await initWebcam();
        } catch (err) {
            console.error('Error iniciando webcam automáticamente:', err);
            updateStatus('Error al iniciar la cámara automáticamente', 'error');
        }

    }, 300); // pequeño retardo para asegurar que el DOM esté listo
}

    } catch (error) {
        console.error(' Error cargando modelo:', error);
        updateStatus(`Error: ${error.message}`, 'error');
        isModelLoaded = false;
    }
}

async function initWebcam() {
    console.log('initWebcam: entrando');
    // Debug rápido: imprimir estados
    console.log('initWebcam -> isModelLoaded:', isModelLoaded, ' isWebcamActive:', isWebcamActive, ' currentMode:', currentMode);

    if (!isModelLoaded) {
        updateStatus('Modelo de basura no cargado', 'error');
        console.warn('initWebcam: modelo no cargado, abortando');
        return;
    }

    // Si ya fue marcada activa, evitar reiniciar (pero hacemos una verificación extra).
    if (isWebcamActive && webcam && webcam.playing) {
        console.log('initWebcam: webcam ya activa y en play, saliendo');
        return;
    }

    try {
        updateStatus('🎥 Iniciando cámara...', 'loading');

        // Asegurar que el canvas existe en el DOM (evita race conditions)
        const canvas = document.getElementById('webcam-canvas');
        if (!canvas) {
            // Esperar al próximo repaint y buscar de nuevo
            console.warn('initWebcam: canvas no disponible, esperando repaint');
            await new Promise(res => requestAnimationFrame(res));
            await new Promise(res => setTimeout(res, 150));
        }

        // Detectar si es móvil para usar cámara trasera
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const constraints = {
            video: {
                facingMode: isMobile ? 'environment' : 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };

        // Crear webcam (tmImage.Webcam)
        const flip = !isMobile;
        webcam = new tmImage.Webcam(640, 480, flip);

        try {
            // Intento normal con la API de la librería
            console.log('initWebcam: intentando webcam.setup() con tmImage.Webcam');
            await webcam.setup(constraints);
            await webcam.play();
            console.log('initWebcam: tmImage.Webcam.setup/play OK');
        } catch (libError) {
            // Fallback: intentar abrir la cámara directamente para diagnosticar permisos/constraints
            console.warn('initWebcam: tmImage.Webcam.setup falló, intentando fallback getUserMedia', libError);
            updateStatus('Intentando abrir cámara (fallback)...', 'loading');

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw libError; // rethrow si no hay fallback posible
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            // Si tmImage.Webcam tiene video interno, asignarle el stream manualmente
            if (webcam && webcam.video) {
                webcam.video.srcObject = stream;
                await webcam.video.play();
                // tmImage.Webcam internamente podría requerir `webcam.update()` later; seguiremos igualmente.
            } else {
                // Si no, creamos un elemento <video> temporal y lo ponemos en webcam.canvas (solo para diagnóstico)
                const videoTemp = document.createElement('video');
                videoTemp.autoplay = true;
                videoTemp.playsInline = true;
                videoTemp.srcObject = stream;
                await new Promise(res => {
                    videoTemp.onloadedmetadata = () => {
                        videoTemp.play();
                        res();
                    };
                });
                // crear un objeto mínimo para usar sus canvas en predictWebcam
                webcam = { canvas: document.createElement('canvas'), video: videoTemp, update: () => {}, playing: true };
                webcam.canvas.width = videoTemp.videoWidth || 640;
                webcam.canvas.height = videoTemp.videoHeight || 480;
            }
        }

        // Si llegamos aquí, consideramos la webcam en play
        isWebcamActive = true;
        console.log('initWebcam: isWebcamActive = true');

        // Mostrar canvas (de nuevo por si estuvo ausente)
        const finalCanvas = document.getElementById('webcam-canvas');
        if (finalCanvas && webcam && webcam.canvas) {
            finalCanvas.width = webcam.canvas.width || 640;
            finalCanvas.height = webcam.canvas.height || 480;
            finalCanvas.style.display = 'block';
        } else {
            console.warn('initWebcam: canvas final no encontrado o webcam.canvas ausente');
        }

        let statusMessage = ' Cámara activa';
        if (webcamMode === 'continuous') {
            statusMessage += ' - Muestra un objeto para clasificar \n Asegurate de que el fondo sea claro';
        } else {
            statusMessage += ' - Presiona "Capturar" para analizar \n Asegurate de que el fondo sea claro';
        }
        updateStatus(statusMessage, 'success');

        // iniciar loop de predicción (no bloqueante)
        try {
            predictWebcam();
        } catch (e) {
            console.warn('initWebcam: predictWebcam lanzó excepción (no crítico)', e);
        }

    } catch (error) {
        console.error(' Error con webcam (detalle):', error);
        let errorMsg = ' Error de cámara: ';
        if (error && error.name) {
            if (error.name === 'NotAllowedError') {
                errorMsg += 'Permisos denegados. Permite el acceso a la cámara.';
            } else if (error.name === 'NotFoundError') {
                errorMsg += 'No se encontró cámara conectada.';
            } else if (error.name === 'NotReadableError') {
                errorMsg += 'Cámara en uso por otra aplicación.';
            } else {
                errorMsg += error.message || String(error);
            }
        } else {
            errorMsg += String(error);
        }
        updateStatus(errorMsg, 'error');

        // Para depuración adicional, muestra en consola la lista de dispositivos disponibles
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                console.log('Dispositivos multimedia detectados:', devices);
            } catch (devErr) {
                console.warn('No se pudo enumerar dispositivos:', devErr);
            }
        }
    }
}

async function predictWebcam() {
    if (webcam && currentMode === 'webcam') {
        // Actualizar webcam
        webcam.update();

        // Copiar frame al canvas visible
        const canvas = document.getElementById('webcam-canvas');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(webcam.canvas, 0, 0);

        if (webcamMode === 'continuous') {
            // Modo individual: sistema simplificado
            // Guardar imagen completa para feedback
            currentImageData = canvas.toDataURL('image/jpeg', 0.8);

            // Hacer predicción en toda la imagen
            const predictions = await model.predict(canvas);
            displayPrediction(predictions);
        }

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

    // Event listener para canvas eliminado - no necesario en modo individual

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('dropdown-menu');
        if (!menu.contains(e.target)) {
            menu.classList.remove('show');
        }
    });
}

function switchMode(mode) {
    currentMode = mode;
    // Limpiar resultados anteriores al cambiar de modo
const resultContainer = document.getElementById('label-container');
if (resultContainer) resultContainer.innerHTML = '';

updateStatus('Listo para usar', 'info');


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
            isWebcamActive = false;
        }

        document.getElementById('prediction').textContent = 'Selecciona una imagen para clasificar';
        document.getElementById('confidence').textContent = '';
    }

    // Mostrar u ocultar configuraciones específicas de webcam
    const quickConfig = document.querySelector('.quick-config');
    if (quickConfig) {
        // ocultar las opciones de webcam cuando estamos en modo 'upload'
        quickConfig.style.display = mode === 'upload' ? 'none' : '';
    }

    // Asegurar que los controles de captura estén ocultos en modo upload
    const captureControls = document.getElementById('capture-controls');
    if (captureControls) {
        if (mode === 'upload') captureControls.style.display = 'none';
        // si volvemos a webcam, respetar el modo actual (capture/continuous)
        else captureControls.style.display = webcamMode === 'capture' ? 'block' : 'none';
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
        document.getElementById('prediction').textContent = ' Error al clasificar imagen';
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
    const predictionDiv = document.getElementById('prediction');
    predictionDiv.innerHTML = `<div class="prediction-result">${label}</div>`;
    document.getElementById('confidence').textContent = `Confianza: ${confidence}%`;

    console.log('Predicción:', label, `(${confidence}%)`);
}

function formatLabel(className) {
    const label = className.toLowerCase();

    if (label.includes('lata')) {
        return ' Lata - Inorgánico';
    } else if (label.includes('No se reconoce o es el fondo solamente')) {
        return 'No se reconoce o es el fondo solamente';
    } else if (label.includes('botella')) {
        return 'Botella - Reciclable';
    } else if (label.includes('galgería')){
        return 'Galgería - Reciclable';
    }   return `${className}`;
        }

    

function updateStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = type === 'loading' ?
        `<div class="loading-spinner"></div><p>${message}</p>` :
        `<p>${message}</p>`;

    statusEl.className = `status ${type}`;
    console.log(message);
}

// Funciones para navegación
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

    // Ocultar vista actual
    const currentViewEl = document.getElementById(currentView + '-view');
    if (currentViewEl) {
        currentViewEl.classList.remove('active');
        setTimeout(() => {
            currentViewEl.style.display = 'none';
        }, 300); // Esperar a que termine la animación
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

function updatePageTitle(sectionName) {
    const titles = {
        'home': '♻️ Clasificador de Basura IA',
        'history': '📊 Historial de Clasificaciones',
        'charts': '📈 Estadísticas',
        'training': '🧠 Dataset de Entrenamiento'
    };

    const header = document.querySelector(`#${sectionName}-view header h1`);
    if (header && titles[sectionName]) {
        header.textContent = titles[sectionName];
    }
}

// Función setScanMode eliminada - solo modo individual

function setWebcamMode(mode) {
    webcamMode = mode;

    // Actualizar botones
    document.getElementById('continuous-mode-btn').classList.toggle('active', mode === 'continuous');
    document.getElementById('capture-mode-btn').classList.toggle('active', mode === 'capture');

    // Mostrar/ocultar controles de captura
    const captureControls = document.getElementById('capture-controls');
    captureControls.style.display = mode === 'capture' ? 'block' : 'none';

    // Reiniciar webcam si está activa
    if (webcam && currentMode === 'webcam') {
        initWebcam();
    }

    console.log(`Modo webcam cambiado a: ${mode}`);
}

async function captureAndClassify() {
    if (!webcam || !model) {
        alert('Webcam o modelo no disponible');
        return;
    }

    try {
        // Capturar frame actual
        const canvas = document.getElementById('webcam-canvas');
        const ctx = canvas.getContext('2d');

        // Actualizar para obtener el frame más reciente
        webcam.update();
        ctx.drawImage(webcam.canvas, 0, 0);

        // Guardar imagen para feedback
        currentImageData = canvas.toDataURL('image/jpeg', 0.8);

        // Modo individual: usar imagen completa
        const predictions = await model.predict(canvas);
        displayPrediction(predictions);

    } catch (error) {
        console.error('Error en captura y clasificación:', error);
        updateStatus('❌ Error al procesar imagen', 'error');
    }
    
}
window.addEventListener('DOMContentLoaded', initApp);

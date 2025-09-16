// Configuración
const MODEL_URL = './my_model/';
let model, objectDetector, webcam, currentMode = 'webcam';
let isModelLoaded = false, isObjectDetectorLoaded = false;
let detectedObjects = [];
let selectedObjectIndex = -1;
let classificationHistory = [];
let categoryChart = null;
let dailyChart = null;
let trainingDataset = [];
let currentImageData = null;
let currentView = 'main';
let scanMode = 'single'; // 'single' o 'multi'
let webcamMode = 'capture'; // 'continuous' o 'capture'

// Inicialización
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    console.log('🚀 Iniciando Clasificador de Basura con Detección Multiobjeto');
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

    if (typeof FilesetResolver === 'undefined') {
        updateStatus('❌ MediaPipe Tasks Vision no cargado', 'error');
        return;
    }

    console.log('✅ Librerías cargadas correctamente');

    // Cargar modelos en paralelo
    await Promise.all([
        loadModel(),
        loadObjectDetector()
    ]);

    // Configurar eventos
    setupEventListeners();

    // Cargar historial y dataset
    loadHistory();
    loadTrainingDataset();

    // Mostrar vista principal por defecto
    showSection('main');

    // Iniciar modo webcam si los modelos están cargados
    if (isModelLoaded && isObjectDetectorLoaded) {
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

async function loadObjectDetector() {
    try {
        updateStatus('📦 Cargando modelo de detección de objetos...', 'loading');

        // Verificar que la librería esté disponible
        if (typeof FilesetResolver === 'undefined') {
            throw new Error('MediaPipe Tasks Vision not loaded. Using fallback mode.');
        }

        // Cargar modelo MediaPipe Object Detector
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        objectDetector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
                delegate: "GPU"
            },
            scoreThreshold: 0.5,
            runningMode: "IMAGE"
        });

        console.log('✅ Modelo MediaPipe Object Detector cargado:', objectDetector);

        isObjectDetectorLoaded = true;
        updateStatus('✅ Modelo de detección cargado correctamente', 'success');

    } catch (error) {
        console.error('❌ Error cargando MediaPipe Object Detector:', error);
        console.log('🔄 Continuando sin detección de objetos múltiples');

        // Fallback: continuar sin Object Detector
        isObjectDetectorLoaded = false;
        objectDetector = null;

        // Cambiar automáticamente a modo single si estamos en multi
        if (scanMode === 'multi') {
            scanMode = 'single';
            updateScanModeButtons();
        }

        updateStatus('⚠️ Modo single activado (sin detección múltiple)', 'error');
    }
}

async function initWebcam() {
    if (!isModelLoaded) {
        updateStatus('❌ Modelo de basura no cargado', 'error');
        return;
    }

    // Solo requerir Object Detector si está en modo multi
    if (scanMode === 'multi' && !isObjectDetectorLoaded) {
        updateStatus('❌ Object Detector no cargado para modo múltiple', 'error');
        return;
    }

    try {
        updateStatus('🎥 Iniciando cámara...', 'loading');

        // Detectar si es móvil para usar cámara trasera
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const constraints = {
            video: {
                facingMode: isMobile ? 'environment' : 'user',
                width: 640,
                height: 480
            }
        };

        // Crear webcam
        const flip = !isMobile; // No flip en móviles (cámara trasera ya está correcta)
        webcam = new tmImage.Webcam(640, 480, flip);

        await webcam.setup(constraints);
        await webcam.play();

        // Mostrar canvas
        const canvas = document.getElementById('webcam-canvas');
        canvas.width = webcam.canvas.width;
        canvas.height = webcam.canvas.height;
        canvas.style.display = 'block';

        let statusMessage = '🎥 Cámara activa';

        if (webcamMode === 'continuous') {
            statusMessage += scanMode === 'multi'
                ? ' - Haz clic en un objeto para clasificarlo'
                : ' - Muestra un objeto para clasificarlo';
        } else {
            statusMessage += ' - Presiona "Capturar" para analizar';
        }

        updateStatus(statusMessage, 'success');

        // Reiniciar selección
        selectedObjectIndex = -1;

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
    if (webcam && model && currentMode === 'webcam' && webcamMode === 'continuous') {
        // Actualizar webcam
        webcam.update();

        // Copiar frame al canvas visible
        const canvas = document.getElementById('webcam-canvas');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(webcam.canvas, 0, 0);

        if (scanMode === 'multi' && objectDetector) {
            // Modo múltiple: usar MediaPipe Object Detector
            // Convertir canvas a imagen para detección
            const img = new Image();
            img.src = canvas.toDataURL();
            await new Promise(resolve => img.onload = resolve);

            // Detectar objetos con MediaPipe
            const detections = await objectDetector.detect(img);

            // Adaptar formato de MediaPipe al esperado
            const predictions = detections.map(d => ({
                class: d.categories[0].categoryName,
                score: d.categories[0].score,
                bbox: [d.boundingBox.originX, d.boundingBox.originY, d.boundingBox.width, d.boundingBox.height]
            }));

            // Filtrar objetos relevantes para clasificación de basura
            detectedObjects = filterRelevantObjects(predictions);

            // Dibujar bounding boxes
            drawBoundingBoxes(ctx, detectedObjects);

            // Si hay un objeto seleccionado, hacer predicción solo en esa región
            if (selectedObjectIndex >= 0 && selectedObjectIndex < detectedObjects.length) {
                const selectedObj = detectedObjects[selectedObjectIndex];
                const croppedCanvas = cropObjectFromCanvas(canvas, selectedObj);

                // Guardar imagen para feedback
                currentImageData = croppedCanvas.toDataURL('image/jpeg', 0.8);

                // Hacer predicción en el objeto seleccionado
                const predictions = await model.predict(croppedCanvas);
                displayPrediction(predictions);
            } else {
                // Limpiar imagen actual
                currentImageData = null;
                // Mostrar mensaje para seleccionar objeto
                document.getElementById('prediction').textContent = 'Haz clic en un objeto para clasificarlo';
                document.getElementById('confidence').textContent = '';
            }
        } else if (scanMode === 'single') {
            // Modo uno por uno: sistema tradicional
            detectedObjects = [];
            selectedObjectIndex = -1;

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
    // Menú desplegable
    const menuToggle = document.getElementById('menu-toggle');
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

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

    // Event listener para selección de objetos en canvas
    const canvas = document.getElementById('webcam-canvas');
    canvas.addEventListener('click', handleCanvasClick);

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('dropdown-menu');
        const menuToggle = document.getElementById('menu-toggle');
        if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
            menu.classList.remove('show');
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

    // Mostrar resultado con botones de feedback
    const predictionDiv = document.getElementById('prediction');
    predictionDiv.innerHTML = `
        <div class="prediction-result">${label}</div>
        <div class="feedback-buttons">
            <button class="feedback-btn correct-btn" onclick="provideFeedback(true, '${label}', ${confidence})">✅ Correcto</button>
            <button class="feedback-btn incorrect-btn" onclick="provideFeedback(false, '${label}', ${confidence})">❌ Incorrecto</button>
        </div>
    `;
    document.getElementById('confidence').textContent = `Confianza: ${confidence}%`;

    // Guardar en historial
    saveToHistory(label, confidence, topPrediction.className);

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

// Funciones para detección multiobjeto
function filterRelevantObjects(predictions) {
    // Objetos que podrían ser basura o reciclables
    const relevantClasses = [
        'bottle', 'cup', 'bowl', 'apple', 'banana', 'orange', 'carrot',
        'book', 'cell phone', 'remote', 'keyboard', 'mouse', 'laptop',
        'paper', 'cardboard', 'plastic', 'can', 'box'
    ];

    return predictions.filter(pred =>
        pred.score > 0.5 && relevantClasses.some(cls =>
            pred.class.toLowerCase().includes(cls.toLowerCase())
        )
    );
}

function drawBoundingBoxes(ctx, objects) {
    objects.forEach((obj, index) => {
        const [x, y, width, height] = obj.bbox;

        // Color del bounding box
        const isSelected = index === selectedObjectIndex;
        ctx.strokeStyle = isSelected ? '#ff0000' : '#00ff00';
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)';

        // Dibujar rectángulo
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);

        // Dibujar etiqueta
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        const label = `${obj.class} ${(obj.score * 100).toFixed(1)}%`;
        const textWidth = ctx.measureText(label).width;

        ctx.fillRect(x, y - 25, textWidth + 10, 20);
        ctx.fillStyle = '#000000';
        ctx.fillText(label, x + 5, y - 10);

        // Dibujar número del objeto
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + width - 15, y + 15, 12, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.fillText((index + 1).toString(), x + width - 20, y + 20);
    });
}

function cropObjectFromCanvas(canvas, obj) {
    const [x, y, width, height] = obj.bbox;
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    // Agregar padding alrededor del objeto
    const padding = 10;
    const cropX = Math.max(0, x - padding);
    const cropY = Math.max(0, y - padding);
    const cropWidth = Math.min(canvas.width - cropX, width + 2 * padding);
    const cropHeight = Math.min(canvas.height - cropY, height + 2 * padding);

    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    croppedCtx.drawImage(
        canvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
    );

    return croppedCanvas;
}

function handleCanvasClick(event) {
    if (!detectedObjects.length) return;

    const canvas = document.getElementById('webcam-canvas');
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Verificar si el clic está dentro de algún bounding box
    for (let i = 0; i < detectedObjects.length; i++) {
        const [objX, objY, objWidth, objHeight] = detectedObjects[i].bbox;
        if (x >= objX && x <= objX + objWidth &&
            y >= objY && y <= objY + objHeight) {
            selectedObjectIndex = i;
            console.log(`Objeto seleccionado: ${detectedObjects[i].class}`);
            return;
        }
    }

    // Si no se hizo clic en ningún objeto, deseleccionar
    selectedObjectIndex = -1;
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
        'main': '♻️ Clasificador de Basura IA',
        'history': '📊 Historial de Clasificaciones',
        'charts': '📈 Estadísticas',
        'training': '🧠 Dataset de Entrenamiento'
    };

    const header = document.querySelector(`#${sectionName}-view header h1`);
    if (header && titles[sectionName]) {
        header.textContent = titles[sectionName];
    }
}

function setScanMode(mode) {
    // Verificar si el modo multi está disponible
    if (mode === 'multi' && !isObjectDetectorLoaded) {
        alert('El modo múltiple requiere Object Detector, que no está disponible. Cambiando a modo single.');
        mode = 'single';
    }

    scanMode = mode;

    // Actualizar botones
    const singleBtn = document.getElementById('single-mode-btn');
    const multiBtn = document.getElementById('multi-mode-btn');

    if (singleBtn) singleBtn.classList.toggle('active', mode === 'single');
    if (multiBtn) {
        multiBtn.classList.toggle('active', mode === 'multi');
        // Deshabilitar si Object Detector no está disponible
        multiBtn.disabled = !isObjectDetectorLoaded;
        multiBtn.style.opacity = isObjectDetectorLoaded ? '1' : '0.5';
    }

    // Reiniciar selección y objetos detectados
    selectedObjectIndex = -1;
    detectedObjects = [];

    // Reiniciar webcam si está activa
    if (webcam && currentMode === 'webcam') {
        initWebcam();
    }

    console.log(`Modo de escaneo cambiado a: ${mode}`);
}

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

        // Procesar según el modo de escaneo
        if (scanMode === 'multi' && objectDetector) {
            // Convertir canvas a imagen
            const img = new Image();
            img.src = canvas.toDataURL();
            await new Promise(resolve => img.onload = resolve);

            // Detectar objetos con MediaPipe
            const detections = await objectDetector.detect(img);
            const predictions = detections.map(d => ({
                class: d.categories[0].categoryName,
                score: d.categories[0].score,
                bbox: [d.boundingBox.originX, d.boundingBox.originY, d.boundingBox.width, d.boundingBox.height]
            }));

            detectedObjects = filterRelevantObjects(predictions);

            if (detectedObjects.length > 0) {
                // Usar el primer objeto detectado
                const selectedObj = detectedObjects[0];
                const croppedCanvas = cropObjectFromCanvas(canvas, selectedObj);
                const predictions = await model.predict(croppedCanvas);
                displayPrediction(predictions);
            } else {
                // No se detectaron objetos, usar imagen completa
                const predictions = await model.predict(canvas);
                displayPrediction(predictions);
            }
        } else {
            // Modo single o sin COCO-SSD
            const predictions = await model.predict(canvas);
            displayPrediction(predictions);
        }

    } catch (error) {
        console.error('Error en captura y clasificación:', error);
        updateStatus('❌ Error al procesar imagen', 'error');
    }
}

// Funciones para el modal de ayuda
function showHelp() {
    const modal = document.getElementById('help-modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevenir scroll
}

function hideHelp() {
    const modal = document.getElementById('help-modal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto'; // Restaurar scroll
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

// Funciones para el historial
function saveToHistory(label, confidence, originalClass) {
    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        label: label,
        confidence: parseFloat(confidence),
        originalClass: originalClass,
        category: getCategoryFromLabel(label)
    };

    classificationHistory.unshift(historyItem); // Agregar al inicio

    // Limitar a 50 elementos para no sobrecargar
    if (classificationHistory.length > 50) {
        classificationHistory = classificationHistory.slice(0, 50);
    }

    // Guardar en localStorage
    localStorage.setItem('classificationHistory', JSON.stringify(classificationHistory));

    // Actualizar display
    updateHistoryDisplay();
    updateCharts();
}

function loadHistory() {
    const saved = localStorage.getItem('classificationHistory');
    if (saved) {
        classificationHistory = JSON.parse(saved);
        updateHistoryDisplay();
    }
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('history-list');

    if (classificationHistory.length === 0) {
        historyList.innerHTML = '<p class="no-history">No hay clasificaciones aún</p>';
        return;
    }

    const historyHTML = classificationHistory.map(item => {
        const time = new Date(item.timestamp).toLocaleString();
        return `
            <div class="history-item ${item.category.toLowerCase().replace(' ', '-')}" data-id="${item.id}">
                <div class="history-item-header">
                    <div class="history-item-result">${item.label}</div>
                    <div class="history-item-time">${time}</div>
                </div>
                <div class="history-item-confidence">Confianza: ${item.confidence}%</div>
            </div>
        `;
    }).join('');

    historyList.innerHTML = historyHTML;

    // Actualizar gráficas
    updateCharts();
}

function clearHistory() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial?')) {
        classificationHistory = [];
        localStorage.removeItem('classificationHistory');
        updateHistoryDisplay();
    }
}

function exportHistory() {
    if (classificationHistory.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const dataStr = JSON.stringify(classificationHistory, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `clasificaciones_basura_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function getCategoryFromLabel(label) {
    if (label.includes('🍌')) return 'organic';
    if (label.includes('♻️')) return 'recyclable';
    if (label.includes('🚫')) return 'non-recyclable';
    return 'unknown';
}

// Funciones para gráficas
function updateCharts() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js no está cargado');
        return;
    }

    updateCategoryChart();
    updateDailyChart();
    updateStatsSummary();
}

function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    // Contar clasificaciones por categoría
    const categoryCounts = {
        '🍌 Orgánico': 0,
        '♻️ Reciclable': 0,
        '🚫 No Reciclable': 0
    };

    classificationHistory.forEach(item => {
        if (item.label.includes('🍌')) categoryCounts['🍌 Orgánico']++;
        else if (item.label.includes('♻️')) categoryCounts['♻️ Reciclable']++;
        else if (item.label.includes('🚫')) categoryCounts['🚫 No Reciclable']++;
    });

    const data = {
        labels: Object.keys(categoryCounts),
        datasets: [{
            data: Object.values(categoryCounts),
            backgroundColor: [
                '#28a745', // Verde para orgánico
                '#17a2b8', // Azul para reciclable
                '#dc3545'  // Rojo para no reciclable
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    };

    if (categoryChart) {
        categoryChart.data = data;
        categoryChart.update();
    } else {
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function updateDailyChart() {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;

    // Contar clasificaciones por día (últimos 7 días)
    const dailyCounts = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dailyCounts[dateKey] = 0;
    }

    classificationHistory.forEach(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        if (dailyCounts.hasOwnProperty(itemDate)) {
            dailyCounts[itemDate]++;
        }
    });

    const data = {
        labels: Object.keys(dailyCounts).map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
        }),
        datasets: [{
            label: 'Clasificaciones',
            data: Object.values(dailyCounts),
            backgroundColor: 'rgba(0, 123, 255, 0.5)',
            borderColor: 'rgba(0, 123, 255, 1)',
            borderWidth: 2,
            fill: true
        }]
    };

    if (dailyChart) {
        dailyChart.data = data;
        dailyChart.update();
    } else {
        dailyChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

function updateStatsSummary() {
    if (classificationHistory.length === 0) {
        document.getElementById('total-classifications').textContent = '0';
        document.getElementById('avg-confidence').textContent = '0%';
        document.getElementById('most-common').textContent = '-';
        return;
    }

    // Total de clasificaciones
    document.getElementById('total-classifications').textContent = classificationHistory.length;

    // Confianza promedio
    const avgConfidence = classificationHistory.reduce((sum, item) => sum + item.confidence, 0) / classificationHistory.length;
    document.getElementById('avg-confidence').textContent = avgConfidence.toFixed(1) + '%';

    // Categoría más común
    const categoryCounts = {};
    classificationHistory.forEach(item => {
        const category = getCategoryFromLabel(item.label);
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const mostCommon = Object.entries(categoryCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const categoryNames = {
        'organic': '🍌 Orgánico',
        'recyclable': '♻️ Reciclable',
        'non-recyclable': '🚫 No Reciclable'
    };

    document.getElementById('most-common').textContent = categoryNames[mostCommon] || mostCommon;
}

// Funciones para recopilación de datos
function provideFeedback(isCorrect, predictedLabel, confidence) {
    if (!currentImageData) {
        alert('No hay imagen disponible para guardar');
        return;
    }

    if (isCorrect) {
        // Agregar al dataset de entrenamiento
        const trainingSample = {
            id: Date.now(),
            imageData: currentImageData,
            label: predictedLabel,
            confidence: confidence,
            timestamp: new Date().toISOString(),
            category: getCategoryFromLabel(predictedLabel)
        };

        trainingDataset.push(trainingSample);

        // Guardar en localStorage
        localStorage.setItem('trainingDataset', JSON.stringify(trainingDataset));

        // Actualizar estadísticas
        updateTrainingStats();

        // Mostrar confirmación
        showFeedbackMessage('✅ Imagen guardada para reentrenamiento', 'success');
        console.log('Imagen guardada para dataset de entrenamiento');
    } else {
        // Solo actualizar historial, no guardar para entrenamiento
        showFeedbackMessage('❌ Clasificación incorrecta registrada', 'error');
    }

    // Limpiar imagen actual
    currentImageData = null;

    // Ocultar botones de feedback después de 2 segundos
    setTimeout(() => {
        document.getElementById('prediction').textContent = 'Esperando nueva clasificación...';
        document.getElementById('confidence').textContent = '';
    }, 2000);
}

function showFeedbackMessage(message, type) {
    const predictionDiv = document.getElementById('prediction');
    predictionDiv.innerHTML = `<div class="feedback-message ${type}">${message}</div>`;
}

function loadTrainingDataset() {
    const saved = localStorage.getItem('trainingDataset');
    if (saved) {
        trainingDataset = JSON.parse(saved);
        console.log(`Cargado dataset de entrenamiento: ${trainingDataset.length} muestras`);
        updateTrainingStats();
    }
}

function exportTrainingDataset() {
    if (trainingDataset.length === 0) {
        alert('No hay datos de entrenamiento para exportar');
        return;
    }

    // Crear archivo ZIP con imágenes y metadatos
    const zip = new JSZip();
    const metadata = [];

    trainingDataset.forEach((sample, index) => {
        // Agregar imagen al ZIP
        const imageData = sample.imageData.split(',')[1]; // Remover data URL prefix
        zip.file(`sample_${index}.jpg`, imageData, {base64: true});

        // Agregar metadatos
        metadata.push({
            filename: `sample_${index}.jpg`,
            label: sample.label,
            category: sample.category,
            confidence: sample.confidence,
            timestamp: sample.timestamp
        });
    });

    // Agregar archivo de metadatos
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    // Generar y descargar ZIP
    zip.generateAsync({type: 'blob'}).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `dataset_entrenamiento_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function clearTrainingDataset() {
    if (confirm('¿Estás seguro de que quieres eliminar todo el dataset de entrenamiento?')) {
        trainingDataset = [];
        localStorage.removeItem('trainingDataset');
        console.log('Dataset de entrenamiento eliminado');
    }
}

// Agregar JSZip para crear archivos ZIP
document.head.insertAdjacentHTML('beforeend', '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>');

function updateTrainingStats() {
    // Actualizar número de imágenes
    document.getElementById('dataset-size').textContent = trainingDataset.length;

    // Calcular precisión promedio
    if (trainingDataset.length > 0) {
        const avgAccuracy = trainingDataset.reduce((sum, item) => sum + item.confidence, 0) / trainingDataset.length;
        document.getElementById('dataset-accuracy').textContent = avgAccuracy.toFixed(1) + '%';
    } else {
        document.getElementById('dataset-accuracy').textContent = '0%';
    }
}
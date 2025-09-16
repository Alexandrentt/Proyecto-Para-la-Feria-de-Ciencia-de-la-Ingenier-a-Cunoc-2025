// Configuración
const MODEL_URL = './my_model/';
let model, cocoModel, webcam, currentMode = 'webcam';
let isModelLoaded = false, isCocoLoaded = false;
let detectedObjects = [];
let selectedObjectIndex = -1;

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

    if (typeof cocoSsd === 'undefined') {
        updateStatus('❌ COCO-SSD no cargado', 'error');
        return;
    }

    console.log('✅ Librerías cargadas correctamente');

    // Cargar modelos en paralelo
    await Promise.all([
        loadModel(),
        loadCocoModel()
    ]);

    // Configurar eventos
    setupEventListeners();

    // Iniciar modo webcam si los modelos están cargados
    if (isModelLoaded && isCocoLoaded) {
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

async function loadCocoModel() {
    try {
        updateStatus('📦 Cargando modelo de detección de objetos...', 'loading');

        // Cargar modelo COCO-SSD
        cocoModel = await cocoSsd.load();
        console.log('✅ Modelo COCO-SSD cargado:', cocoModel);

        isCocoLoaded = true;
        updateStatus('✅ Modelo de detección cargado correctamente', 'success');

    } catch (error) {
        console.error('❌ Error cargando COCO-SSD:', error);
        updateStatus(`❌ Error COCO-SSD: ${error.message}`, 'error');
        isCocoLoaded = false;
    }
}

async function initWebcam() {
    if (!isModelLoaded || !isCocoLoaded) {
        updateStatus('❌ Modelos no cargados completamente', 'error');
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

        updateStatus('🎥 Cámara activa - Haz clic en un objeto para clasificarlo', 'success');

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
    if (webcam && model && cocoModel && currentMode === 'webcam') {
        // Actualizar webcam
        webcam.update();

        // Copiar frame al canvas visible
        const canvas = document.getElementById('webcam-canvas');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(webcam.canvas, 0, 0);

        // Detectar objetos con COCO-SSD
        const cocoPredictions = await cocoModel.detect(canvas);

        // Filtrar objetos relevantes para clasificación de basura
        detectedObjects = filterRelevantObjects(cocoPredictions);

        // Dibujar bounding boxes
        drawBoundingBoxes(ctx, detectedObjects);

        // Si hay un objeto seleccionado, hacer predicción solo en esa región
        if (selectedObjectIndex >= 0 && selectedObjectIndex < detectedObjects.length) {
            const selectedObj = detectedObjects[selectedObjectIndex];
            const croppedCanvas = cropObjectFromCanvas(canvas, selectedObj);

            // Hacer predicción en el objeto seleccionado
            const predictions = await model.predict(croppedCanvas);
            displayPrediction(predictions);
        } else {
            // Mostrar mensaje para seleccionar objeto
            document.getElementById('prediction').textContent = 'Haz clic en un objeto para clasificarlo';
            document.getElementById('confidence').textContent = '';
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

    // Event listener para selección de objetos en canvas
    const canvas = document.getElementById('webcam-canvas');
    canvas.addEventListener('click', handleCanvasClick);
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
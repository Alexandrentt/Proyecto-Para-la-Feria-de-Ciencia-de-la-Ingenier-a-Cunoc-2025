const MODEL_URL = './my_model/';
let model, webcam, currentMode = 'webcam';
let isWebcamActive = false; 
let isModelLoaded = false;
let currentImageData = null;
let webcamMode = 'capture'; 
let currentView = 'home'; 
let isModalOpen = false;
let lastTopPrediction = null;
// usamos la camara trasera, primer intento
let preferredFacing = 'environment';

async function initApp() {
    console.log(' Iniciando Clasificador de Basura');
    updateStatus('Verificando librerías...', 'loading');

    // esto verifica las librerias
    if (typeof tf === 'undefined') {
        updateStatus(' TensorFlow.js no cargado', 'error');
        return;
    }

    if (typeof tmImage === 'undefined') {
        updateStatus(' Teachable Machine no cargado', 'error');
        return;
    }

    console.log('Librerías cargadas correctamente');

    // Carga el modelo
    await loadModel();

    setupEventListeners();
    showSection('webcam-section');

    if (isModelLoaded) {
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

        const modelResponse = await fetch(MODEL_URL + 'model.json');
        if (!modelResponse.ok) {
            throw new Error('model.json no encontrado. Asegúrate de tener la carpeta my_model/ con los archivos del modelo.');
        }

        const metadataResponse = await fetch(MODEL_URL + 'metadata.json');
        if (!metadataResponse.ok) {
            throw new Error('metadata.json no encontrado en la carpeta my_model/');
        }

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

    }, 300); 
}

    } catch (error) {
        console.error(' Error cargando modelo:', error);
        updateStatus(`Error: ${error.message}`, 'error');
        isModelLoaded = false;
    }
}
async function initWebcam() {
    console.log(' Iniciando cámara...');

    if (!isModelLoaded) {
        updateStatus('Modelo de basura no cargado', 'error');
        return;
    }

    if (isWebcamActive && webcam && webcam.playing) {
        console.log('Cámara ya activa, saliendo');
        return;
    }

    const video = document.getElementById('webcam');
    if (!video) return console.error("No se encontró el elemento <video>");

    if (window.webcamStream) {
        window.webcamStream.getTracks().forEach(track => track.stop());
    }

    // Detectar si es telefono o computadora
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Dispositivo detectado:', isMobile ? 'Móvil' : 'Escritorio');

    let stream = null;
    let cameraUsed = '';

    // ESTRATEGIA 1: En telefonos, forzar la cámara trasera con facingMode exact
    if (isMobile) {
        console.log(' Móvil detectado - Forzando cámara trasera con facingMode: environment');
        try {
            stream = await navigator.mediaDevices.getUserMedia({
            video: {
                    facingMode: { exact: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
            });
            cameraUsed = 'Trasera (móvil)';
            console.log(' Cámara trasera activada en móvil');
        } catch (error) {
            console.warn(' No se pudo usar facingMode environment en móvil:', error);
        }
    }

    // ESTRATEGIA 2: Buscar cámara trasera por etiquetas (telefono y computadora)
    if (!stream) {
        console.log('🔍 Buscando cámara trasera por etiquetas...');
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            // Buscar cámara trasera por etiquetas
            const backCamera = videoDevices.find(d => {
                const label = d.label.toLowerCase();
                return /back|rear|environment|main|primary|trasera|traser|rear camera|back camera/i.test(label);
            });

            if (backCamera) {
                console.log('Cámara trasera encontrada:', backCamera.label);
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: backCamera.deviceId },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                });
                cameraUsed = `Trasera (${backCamera.label})`;
                console.log('Cámara trasera activada por deviceId');
            }
        } catch (error) {
            console.warn('Error buscando cámara trasera por etiquetas:', error);
        }
    }

    // ESTRATEGIA 3: 
    if (!stream) {
        console.log('🔄 Fallback: Intentando facingMode environment ideal...');
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            cameraUsed = 'Camara';
            console.log('✅ Cámara trasera activada (fallback)');
        } catch (error) {
            console.warn('❌ Fallback environment falló:', error);
        }
    }

    // ESTRATEGIA 4: Último recurso, la cámara frontal (solo en computadora)
    if (!stream && !isMobile) {
        console.log('🔄 Último recurso: Usando cámara frontal en escritorio...');
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            cameraUsed = 'Frontal (último recurso)';
            console.log(' Cámara frontal activada como último recurso');
        } catch (error) {
            console.error(' No se pudo acceder a ninguna cámara:', error);
            alert("No se pudo acceder a la cámara. Revisa los permisos.");
            return;
        }
    }

    // Si no se pudo obtener ninguna cámara
    if (!stream) {
        console.error('No se pudo acceder a ninguna cámara');
        alert("No se pudo acceder a la cámara. Revisa los permisos.");
        return;
    }

    // Configurar el video
    window.webcamStream = stream;
    video.srcObject = stream;
    video.style.transform = "none"; 
    await new Promise(resolve => {
        video.onloadedmetadata = () => {
            video.play();
            resolve();
        };
    });

    // Crear webcam para tmImage
    const flip = false;
    webcam = new tmImage.Webcam(640, 480, flip);

    const canvas = document.getElementById('webcam-canvas');
    if (canvas) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.style.display = 'block';
    }
    if (video) {
        video.style.display = 'none';
    }

    isWebcamActive = true;

    let statusMessage = `📷 ${cameraUsed} activa`;
        if (webcamMode === 'continuous') {
        statusMessage += ' - Muestra un objeto para clasificar';
        } else {
        statusMessage += ' - Presiona "Capturar" para analizar';
        }
        updateStatus(statusMessage, 'success');

            predictWebcam();
}



async function predictWebcam() {
    if (currentMode !== 'webcam') return;

    const video = document.getElementById('webcam');
    const canvas = document.getElementById('webcam-canvas');
    if (!video || !canvas) return;

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(predictWebcam);
        return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (webcamMode === 'continuous') {
        currentImageData = canvas.toDataURL('image/jpeg', 0.8);
            const predictions = await model.predict(canvas);
            displayPrediction(predictions);
    }

    requestAnimationFrame(predictWebcam);
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

    // Cerrar menú de información al hacer clic fuera
    document.addEventListener('click', (e) => {
        const content = document.getElementById('recycling-content');
        const toggleBtn = document.querySelector('.info-toggle-btn');
        if (!content) return;
        const clickInsideContent = content.contains(e.target);
        const clickOnToggle = toggleBtn && toggleBtn.contains(e.target);
        if (content.classList.contains('show') && !clickInsideContent && !clickOnToggle) {
            content.classList.remove('show');
            if (toggleBtn) toggleBtn.classList.remove('active');
        }
    });
}

function switchMode(mode) {
    currentMode = mode;
    
    // Limpiar resultados al cambiar de modo
    clearResults();
    
    // Ocultar menú desplegable de información si está abierto
    const recyclingContent = document.getElementById('recycling-content');
    const toggleBtn = document.querySelector('.info-toggle-btn');
    if (recyclingContent) recyclingContent.classList.remove('show');
    if (toggleBtn) toggleBtn.classList.remove('active');

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
        // Mostrar upload y ocultar webcam
        document.getElementById('webcam-section').style.display = 'none';
        document.getElementById('upload-section').style.display = 'flex';

        // Detener webcam si está activa
        if (webcam) {
            try {
                if (typeof webcam.stop === 'function') webcam.stop();
                if (webcam.video && webcam.video.srcObject) {
                    const tracks = webcam.video.srcObject.getTracks();
                    tracks.forEach(t => t.stop());
                }
            } catch (e) {
                console.warn('Error deteniendo webcam:', e);
            }
            webcam = null;
            isWebcamActive = false;
        }

        // Limpiar canvas de webcam
        const canvas = document.getElementById('webcam-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }

        // Limpiar preview de upload
        const preview = document.getElementById('preview-image');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }

        // Ocultar botón de clasificar
        const classifyBtn = document.getElementById('classify-image-btn');
        if (classifyBtn) classifyBtn.style.display = 'none';
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

    // Determinar la confianza en porcentaje
    const confidencePercent = (topPrediction.probability * 100);

    if (!isNaN(confidencePercent) && confidencePercent >= 90) {
        lastTopPrediction = { ...topPrediction };
    } else {
        lastTopPrediction = null;
    }

    // Si el modal está abierto, no actualizar la UI (evitar que cambie mientras el usuario lee)
    if (isModalOpen) {
        console.log('Modal abierto — no se actualiza la etiqueta');
        return;
    }

    renderTopPrediction(topPrediction);
}

function renderTopPrediction(topPrediction) {
    const label = formatLabel(topPrediction.className);
    const confidence = (topPrediction.probability * 100).toFixed(1);

    const wasteInfo = getWasteType(topPrediction.className);
    const typeLabel = wasteInfo.type === 'reciclable' ? '♻️ Reciclable' :
        wasteInfo.type === 'organico' ? '🌱 Orgánico' :
            wasteInfo.type === 'merma' ? '🗑️ Merma' : '❌ No Reciclable';
    const typeClass = wasteInfo.type === 'reciclable' ? 'reciclable' :
        wasteInfo.type === 'organico' ? 'organico' :
            wasteInfo.type === 'merma' ? 'merma' : 'no-reciclable';

    const predictionDiv = document.getElementById('prediction');
    predictionDiv.innerHTML = '';

    const resultEl = document.createElement('div');
    resultEl.className = 'prediction-result';
    resultEl.textContent = label;

    const typeEl = document.createElement('div');
    typeEl.className = `waste-type-label ${typeClass}`;
    typeEl.textContent = typeLabel;

    // Mostrar resultado solo si la confianza alcanza el umbral
    const confidenceNum = parseFloat(confidence);
    if (!isNaN(confidenceNum) && confidenceNum >= 90) {
        // Confianza suficiente: mostrar etiqueta, tipo y botón de información
        predictionDiv.appendChild(resultEl);
        predictionDiv.appendChild(typeEl);

        updateRecyclingInfo(topPrediction.className);
    } else {
        const unknownBadge = document.createElement('div');
        unknownBadge.className = 'unknown-badge';
        unknownBadge.textContent = 'El modelo no fue entrenado para reconocer este objeto en específico.';
        predictionDiv.appendChild(unknownBadge);
        updateRecyclingInfo(null);
    }

    const confEl = document.getElementById('confidence');
    if (confEl) confEl.textContent = `Confianza: ${confidence}%`;

    console.log('Predicción:', label, `(${confidence}%) - Tipo: ${wasteInfo.type}`);
}

function formatLabel(className) {
    const label = className.toLowerCase();
    // Mapear etiquetas esperadas a textos legibles
    if (label.includes('lata')) return 'Lata';
    if (label.includes('botella de vidrio')) return 'Botella de vidrio';
    if (label.includes('botella')) return 'Botella (plástico)';
    if (label.includes('plato')) return 'Plato (duroport)';
    if (label.includes('vaso')) return 'Vaso (duroport)';
    if (label.includes('jugo')) return 'Caja de jugo (cartón)';
    if (label.includes('pizza')) return 'Caja de pizza (cartón)';
    if (label.includes('papel') || label.includes('carton') || label.includes('cartón')) return 'Papel / Cartón';
    if (label.includes('organico')) return 'Orgánico';
    if (label.includes('manzana')) return 'Manzana';
    if (label.includes('banano') || label.includes('banana')) return 'Banano';
    if (label.includes('limon') || label.includes('limón')) return 'Limón';
    if (label.includes('huevo')) return 'Huevo (cáscara)';
    if (label.includes('piña') || label.includes('pina')) return 'Piña';
    if (label.includes('merma') || label.includes('basura')) return 'Merma / Basura';

    return `${className}`;
}



function updateStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = type === 'loading' ?
        `<div class="loading-spinner"></div><p>${message}</p>` :
        `<p>${message}</p>`;

    statusEl.className = `status ${type}`;
    console.log(message);
}


function showSection(sectionId) {
    const webcamSection = document.getElementById('webcam-section');
    const uploadSection = document.getElementById('upload-section');

    if (!webcamSection || !uploadSection) {
        console.error('No se encontraron las secciones principales de la UI');
        return;
    }

    // Mostrar/ocultar solo las secciones de contenido, sin tocar la vista contenedora
    if (sectionId === 'webcam-section') {
        webcamSection.style.display = 'flex';
        uploadSection.style.display = 'none';
        initWebcam();
    } else if (sectionId === 'upload-section') {
        webcamSection.style.display = 'none';
        uploadSection.style.display = 'flex';
        stopWebcam();
    } else {
        console.error(`No se encontró la sección con id: ${sectionId}`);
        return;
    }

    // Limpiar resultados y previsualizaciones al cambiar de sección
    const resultContainer = document.getElementById('result');
    const preview = document.getElementById('imagePreview');
    if (resultContainer) resultContainer.textContent = '';
    if (preview) preview.src = '';
}

function setWebcamMode(mode) {
    webcamMode = mode;

    clearResults();
    
    const recyclingContent = document.getElementById('recycling-content');
    const toggleBtn = document.querySelector('.info-toggle-btn');
    if (recyclingContent) recyclingContent.classList.remove('show');
    if (toggleBtn) toggleBtn.classList.remove('active');

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
    if (!model) {
        alert('Modelo no disponible');
        return;
    }

    try {
        const video = document.getElementById('webcam');
        const canvas = document.getElementById('webcam-canvas');
        if (!video || !canvas || video.readyState < 2) {
            updateStatus('Cámara no lista', 'error');
            return;
        }
        const ctx = canvas.getContext('2d');
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Guardar imagen para feedback
        currentImageData = canvas.toDataURL('image/jpeg', 0.8);

        // Modo individual: usar imagen completa
        const predictions = await model.predict(canvas);
        displayPrediction(predictions);

    } catch (error) {
        console.error('Error en captura y clasificación:', error);
        updateStatus(' Error al procesar imagen', 'error');
    }
    
}
const recyclingInfo = {
    'lata': {
        type: 'reciclable',
        title: 'Lata de Aluminio',
        description: 'Las latas de aluminio son envases metálicos que contienen bebidas, alimentos u otros productos.',
        instructions: [
            'Aplasta la lata para reducir su volumen',
            'Limpia cualquier residuo de comida o bebida',
            'Deposítala en el contenedor amarillo destinado a envases metálicos',
            'No es necesario quitar las etiquetas de papel'
        ],
        tips: [
            'Las latas se reciclan infinitamente sin perder calidad',
            'El reciclaje de una sola lata ahorra energía suficiente para alimentar un televisor durante 3 horas',
            'Separa las latas de otros metales como el acero'
        ]
    },
    'botella': {
        type: 'reciclable',
        title: 'Botella de Plástico',
        description: 'Las botellas de plástico PET son envases comunes para bebidas, productos de limpieza y otros líquidos.',
        instructions: [
            'Vacía completamente el contenido de la botella',
            'Enjuaga con agua para eliminar residuos',
            'Aplasta la botella para reducir espacio',
            'Deposítala en el contenedor amarillo de plásticos',
            'Quítale el tapón y deposítalo en el mismo contenedor'
        ],
        tips: [
            'El plástico PET se puede reciclar múltiples veces',
            'Una botella reciclada puede convertirse en fibra textil, muebles de jardín o nuevas botellas',
            'No mezcles botellas PET con otros tipos de plástico'
        ]
    },
    'botella de vidrio': {
        type: 'reciclable',
        title: 'Botella de Vidrio',
        description: 'Las botellas de vidrio son envases retornables o reciclables que se utilizan para bebidas y alimentos.',
        instructions: [
            'Vacía completamente la botella',
            'No es necesario enjuagar excesivamente',
            'Deposítala en el contenedor verde específico para vidrio',
            'No incluyas tapones de metal o corcho',
            'Separa por colores si tu municipio lo requiere'
        ],
        tips: [
            'El vidrio se recicla al 100% infinitamente',
            'Una botella de vidrio reciclada ahorra la energía necesaria para mantener encendida una bombilla durante 4 horas',
            'No deposites vidrio plano (ventanas, espejos) en el mismo contenedor'
        ]
    },
    'plato': {
        type: 'no-reciclable',
        title: 'Plato (duroport)',
        description: 'Platos de duroport (espuma de poliestireno) - material no reciclable en la mayoría de sistemas locales.',
        instructions: [
            'Deposítalo en el contenedor gris de rechazo',
            'No lo quemes ni lo tires en la naturaleza',
            'Si está en buen estado, considera reutilizar o donar'
        ],
        tips: [
            'El duroport no se recicla fácilmente en plantas convencionales',
            'Reduce el uso de platos desechables siempre que sea posible'
        ]
    },
    'vaso': {
        type: 'no-reciclable',
        title: 'Vaso (duroport)',
        description: 'Vasos de duroport/espuma (poliestireno expandido) — generalmente no reciclables y considerados residuo contaminante.',
        instructions: [
            'Deposítalo en el contenedor gris de rechazo',
            'Evita usar vasos desechables de duroport cuando sea posible',
            'Si es un vaso reutilizable, límpialo y reutilízalo'
        ],
        tips: [
            'Los vasos de espuma no suelen aceptarse en plantas de reciclaje',
            'Prefiere alternativas reutilizables o compostables'
        ]
    },
    'jugo': {
        type: 'reciclable',
        title: 'Caja de Jugo',
        description: 'Envase de cartón para jugos. En muchos sistemas se considera envase reciclable o se procesa separadamente.',
        instructions: [
            'Vacía completamente el contenido',
            'Aplasta la caja para ahorrar espacio',
            'Deposítala en el contenedor de envases/reciclaje según tu municipio',
            'Si tu servicio lo requiere, separa el tapón y deposítalo en el contenedor correspondiente'
        ],
        tips: [
            'Las cajas de cartón para bebidas pueden requerir tratamiento especial en algunas plantas',
            'Consulta la guía local de reciclaje para envases multi-capa'
        ]
    },
    'pizza': {
        type: 'reciclable',
        title: 'Caja de Pizza (cartón)',
        description: 'Caja de cartón utilizada para pizza. Si está limpia es reciclable; si está muy grasosa, puede necesitar ir a merma o rechazo según normativa local.',
        instructions: [
            'Si la caja está limpia, pliega y deposítala en el contenedor de papel y cartón',
            'Si la caja está muy contaminada con grasa o restos, córtala y deposítala en orgánicos o rechazo según tu municipio',
            'Retira restos grandes de comida antes de reciclar'
        ],
        tips: [
            'Una caja parcialmente limpia puede reciclarse separando la parte grasienta',
            'Cuando dudes, consulta las reglas locales de reciclaje'
        ]
    },
    'organico': {
        type: 'organico',
        title: 'Residuo Orgánico',
        description: 'Los residuos orgánicos son ideales para compostaje/abono. Transfórmalos en nutrientes para tus plantas o entrégalos al sistema de orgánicos.',
        instructions: [
            'Prioriza el compostaje doméstico: deposítalo en tu compostera para generar abono',
            'Si no tienes compostera, usa el contenedor marrón de orgánicos de tu municipio',
            'Corta los restos en trozos pequeños para acelerar el proceso',
            'No mezcles plásticos, metales o vidrio; usa bolsas compostables si necesitas bolsa'
        ],
        tips: [
            'Mantén un buen balance: 2 partes de material seco (hojas/cartón) por 1 de restos de cocina',
            'Evita grandes cantidades de carnes y lácteos en compost doméstico',
            'Frutas, verduras, posos de café, té y cáscaras son excelentes para hacer abono'
        ]
    },
    'manzana': {
        type: 'organico',
        title: 'Manzana',
        description: 'Las manzanas son perfectas para hacer compost/abono y aportar nutrientes al suelo.',
        instructions: [
            'Depósitala en tu compostera; si no tienes, usa el contenedor marrón de orgánicos',
            'Córtala en trozos para acelerar el compostaje',
            'Evita bolsas plásticas; si necesitas, usa compostables o papel',
            'Incluye corazón y semillas sin problema'
        ],
        tips: [
            'Se descompone en 2-4 semanas en condiciones óptimas',
            'Aporta azúcares que activan microorganismos beneficiosos',
            'Mezcla con material seco (hojas/cartón) para evitar exceso de humedad'
        ]
    },
    'banano': {
        type: 'organico',
        title: 'Banana/Plátano',
        description: 'Las bananas y sus cáscaras son excelentes para compost/abono por su riqueza en potasio.',
        instructions: [
            'Añade cáscaras y restos a tu compostera; como alternativa, usa el contenedor marrón',
            'Trocea cáscaras para acelerar su descomposición',
            'Evita bolsas plásticas; prefiere compostables',
            'Incluye la fruta si está pasada o en mal estado'
        ],
        tips: [
            'Ricas en potasio: benefician el desarrollo de flores y frutos',
            'Se descomponen rápido (1-2 semanas en trozos pequeños)',
            'Enterrándolas cerca de plantas aportan nutrientes de forma gradual'
        ]
    },
    'limon': {
        type: 'organico',
        title: 'Limón',
        description: 'Los limones y cítricos pueden compostarse; úsalos con moderación para evitar acidificar en exceso.',
        instructions: [
            'Añade cáscaras y pulpa en pequeñas cantidades a la compostera',
            'Si no compostas, deposítalo en el contenedor marrón de orgánicos',
            'Evita bolsas plásticas; usa compostables',
            'Trocea para acelerar la descomposición'
        ],
        tips: [
            'Úsalos mezclados con material marrón para equilibrar humedad y acidez',
            'Se descomponen en 2-3 semanas en trozos pequeños',
            'Las cáscaras aportan aceites naturales; no excederse para no frenar microorganismos'
        ]
    },
    'huevo': {
        type: 'organico',
        title: 'Huevo',
        description: 'Las cáscaras de huevo trituradas son excelentes para compost/abono por su aporte de calcio.',
        instructions: [
            'Seca y tritura las cáscaras antes de añadirlas a la compostera',
            'Si no compostas, úsalas en el contenedor marrón',
            'Evita añadir grandes cantidades de restos cocidos grasos',
            'Mezcla con material seco para equilibrar'
        ],
        tips: [
            'Aportan calcio que ayuda a reducir la acidez del compost',
            'Cuanto más trituradas, más rápido se integran',
            'Útiles para suelos y plantas que requieren calcio'
        ]
    },
    'piña': {
        type: 'organico',
        title: 'Piña',
        description: 'La piña y sus residuos (cáscara, corazón, hojas) son aptos para compost/abono.',
        instructions: [
            'Añade cáscara, corazón y hojas a tu compostera; trocea para acelerar',
            'Si no compostas, deposítalos en el contenedor marrón de orgánicos',
            'Mezcla con material seco para evitar exceso de humedad',
            'Evita bolsas plásticas; prefiere compostables'
        ],
        tips: [
            'Contiene enzimas que ayudan a la descomposición',
            'Se descompone en 3-4 semanas en condiciones favorables',
            'Aporta humedad; equilibra con hojas secas o cartón'
        ]
    },
    'carton de jugo': {
        type: 'reciclable',
        title: 'Cartón de jugo (con pajilla)',
        description: 'Envase de cartón/Tetra Pak típico de jugos infantiles. Está compuesto mayoritariamente por cartón con capas finas de plástico y/o aluminio y suele incluir una pajilla de plástico.',
        instructions: [
            'Vacía y enjuaga bien el envase para evitar malos olores',
            'Retira la pajilla y el envoltorio de la pajilla y deposítalos en el contenedor de plásticos según normativa local',
            'Aplasta el cartón para ahorrar espacio',
            'Depósitalo en el contenedor de envases/reciclaje (según tu municipio)'
        ],
        tips: [
            'En algunos municipios los Tetra Pak se recogen junto con plásticos y metales (contenedor amarillo); confirma tu guía local',
            'Si es posible, separa el tapón plástico y recíclalo con los plásticos',
            'Asegúrate de que esté seco y limpio para mejorar su reciclaje.'
        ]
    },
      'papel': {
    type: 'reciclable',
    title: 'Papel y Cartón',
    description: 'Papel y cartón limpios y secos son materiales reciclables que se procesan para fabricar nuevos productos de papel.',
    instructions: [
        'Retira restos de comida y plásticos adheridos',
        'Aplasta las cajas y dóblalas para ahorrar espacio',
        'Deposítalo en el contenedor azul o el contenedor de papel y cartón de tu municipio',
        'No incluyas papel encerado o cartón con tratamiento plástico'
    ],
    tips: [
        'El papel debe estar seco y limpio para ser reciclable',
        'Reutiliza cajas cuando sea posible antes de reciclarlas',
        'Evita mezclar papel con residuos orgánicos o plásticos'
    ]
    },
    'merma': {
        type: 'merma',
        title: 'Merma / Basura',
        description: 'Objetos que han llegado al final de su vida útil y no pueden ser reciclados, reutilizados o compostados. Son residuos que deben ir al contenedor de rechazo.',
        instructions: [
            'Deposítalo en el contenedor gris de rechazo',
            'Asegúrate de que no contenga materiales peligrosos',
            'Si es un objeto grande, consulta con el servicio de recolección especial',
            'No lo quemes ni lo tires en la naturaleza',
            'Si contiene datos personales (documentos, discos), destrúyelos antes de desechar'
        ],
        tips: [
            'Antes de desechar, considera si realmente no se puede reparar o reutilizar',
            'Los objetos de merma van a vertederos controlados donde se manejan de forma segura',
            'Evita generar merma innecesaria: compra solo lo que necesites',
            'Si el objeto es muy grande, llévalo a un punto limpio o solicita recogida especial',
            'Los residuos peligrosos (pilas, medicamentos, aceites) van a puntos limpios, no al contenedor gris'
        ]
    }
};

// Función para determinar el tipo de basura según la eiqueta
function getWasteType(label) {
    const normalizedLabel = label.toLowerCase().trim();

    // Buscar coincidencias exactas o parciales
    for (const [key, info] of Object.entries(recyclingInfo)) {
        if (normalizedLabel.includes(key) || key.includes(normalizedLabel)) {
            return info;
        }
    }

    // Si no encuentra coincidencia, devolver información por defecto
    return {
        type: 'no-reciclable',
        title: 'Objeto Desconocido',
        description: 'No se pudo determinar el tipo de este objeto.',
        instructions: [
            'Consulta con tu servicio local de recolección de basura',
            'Deposítalo en el contenedor gris si no estás seguro',
            'Evita tirarlo en la naturaleza'
        ],
        tips: [
            'Considera reutilizar el objeto si es posible',
            'Toma una foto más clara para mejor identificación'
        ]
    };
}
function toggleRecyclingInfo() {
    const recyclingContent = document.getElementById('recycling-content');
    const toggleBtn = document.querySelector('.info-toggle-btn');
    
    if (recyclingContent.classList.contains('show')) {
        recyclingContent.classList.remove('show');
        toggleBtn.classList.remove('active');
    } else {

        // Si hay una última predicción válida, mostrar su información; si no, mostrar guía general de reciclaje
        const labelToShow = lastTopPrediction && lastTopPrediction.className ? lastTopPrediction.className : null;
        updateRecyclingInfo(labelToShow);
        recyclingContent.classList.add('show');
        toggleBtn.classList.add('active');
    }
}

// Función para actualizar el contenido del menú desplegable
function updateRecyclingInfo(label) {
    let wasteInfo;

    if (!label) {
        // Contenido por defecto cuando no hay predicción: guía básica de reciclaje
        wasteInfo = {
            type: 'info',
            title: 'Información de Reciclaje',
            description: 'Coloca el objeto frente a la cámara o sube una imagen para obtener instrucciones específicas de reciclaje. Mientras esperas, aquí tienes información práctica de reciclaje universal:',
            instructions: [
                'Separa los residuos por tipo: papel/cartón, plástico, vidrio, metal, orgánico y resto.',
                'Limpia los envases (vacía y enjuaga) para evitar contaminación.',
                'Aplasta cajas y botellas para ahorrar espacio en los contenedores.',
                'Deposita cada material en el contenedor correspondiente de tu municipio (p. ej. papel: azul, plásticos/envases: amarillo, vidrio: verde, orgánico: marrón, resto: gris).'
            ],
            tips: [
                'Evita mezclar materiales; la mezcla contamina lotes de reciclaje.',
                'No deposites residuos peligrosos (pilas, aceites) en los contenedores comunes — llévalos a puntos limpios.',
                'Si un envase está muy grasiento (ej. caja de pizza), considera depositar la parte contaminada en orgánicos o rechazo según normativa local.',
                'Reutiliza y reduce antes de reciclar: reutilizar una caja o botellas es mejor que reciclarlas.'
            ]
        };
    } else {
        wasteInfo = getWasteType(label);
    }

    // Actualizar contenido
    const titleEl = document.getElementById('info-title');
    const descEl = document.getElementById('info-description');
    if (titleEl) titleEl.textContent = wasteInfo.title;
    if (descEl) descEl.textContent = wasteInfo.description;

    // Actualizar tipo con estilos
    const typeElement = document.getElementById('info-type');
    if (typeElement) {
        if (wasteInfo.type === 'reciclable') {
            typeElement.textContent = '♻️ Reciclable';
        } else if (wasteInfo.type === 'organico') {
            typeElement.textContent = '🌱 Orgánico';
        } else if (wasteInfo.type === 'merma') {
            typeElement.textContent = '🗑️ Merma';
        } else if (wasteInfo.type === 'info') {
            typeElement.textContent = 'ℹ️ Información';
        } else {
            typeElement.textContent = '❌ No Reciclable';
        }
        typeElement.className = `info-type-badge ${wasteInfo.type}`;
    }

    const instructionsContainer = document.getElementById('info-instructions');
    const tipsContainer = document.getElementById('info-tips');

    if (instructionsContainer) {
        if (Array.isArray(wasteInfo.instructions) && wasteInfo.instructions.length > 0) {
            instructionsContainer.innerHTML = '<ul>' + wasteInfo.instructions.map(i => `<li>${i}</li>`).join('') + '</ul>';
        } else {
            instructionsContainer.innerHTML = '<p>No hay instrucciones específicas para este objeto. Consulta las normas locales.</p>';
        }
    }

    if (tipsContainer) {
        if (Array.isArray(wasteInfo.tips) && wasteInfo.tips.length > 0) {
            tipsContainer.innerHTML = '<ul>' + wasteInfo.tips.map(t => `<li>${t}</li>`).join('') + '</ul>';
        } else {
            tipsContainer.innerHTML = '<p>No hay consejos adicionales disponibles.</p>';
        }
    }
}

function clearResults() {
    const pred = document.getElementById('prediction');
    const conf = document.getElementById('confidence');
    
    if (pred) pred.textContent = 'Esperando clasificación...';
    if (conf) conf.textContent = '';
    
    lastTopPrediction = null;
    // Restaurar guía general en el menú de reciclaje
    try {
        updateRecyclingInfo(null);
    } catch (e) {
        console.warn('clearResults: no se pudo actualizar recycling info:', e);
    }
    
    const recyclingContent = document.getElementById('recycling-content');
    const toggleBtn = document.querySelector('.info-toggle-btn');
    if (recyclingContent) recyclingContent.classList.remove('show');
    if (toggleBtn) toggleBtn.classList.remove('active');
}

window.addEventListener('DOMContentLoaded', initApp);

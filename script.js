const MODEL_URL = './my_model/';
let model, webcam, currentMode = 'webcam';
let isWebcamActive = false; 
let isModelLoaded = false;
let currentImageData = null;
let webcamMode = 'continuous';
let currentView = 'home'; 
let isModalOpen = false;
let lastTopPrediction = null;
let preferredFacing = 'environment';

async function initApp() {
    console.log(' Iniciando Clasificador de Basura');
    updateStatus('Verificando librerías...', 'loading');

    if (typeof tf === 'undefined') {
        updateStatus(' TensorFlow.js no cargado', 'error');
        return;
    }

    if (typeof tmImage === 'undefined') {
        updateStatus(' Teachable Machine no cargado', 'error');
        return;
    }

    console.log('Librerías cargadas correctamente');

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

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Dispositivo detectado:', isMobile ? 'Móvil' : 'Escritorio');

    let stream = null;
    let cameraUsed = '';

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

    if (!stream) {
        console.log('🔍 Buscando cámara trasera por etiquetas...');
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

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

    if (!stream) {
        console.error('No se pudo acceder a ninguna cámara');
        alert("No se pudo acceder a la cámara. Revisa los permisos.");
        return;
    }

    window.webcamStream = stream;
    video.srcObject = stream;
    video.style.transform = "none"; 
    await new Promise(resolve => {
        video.onloadedmetadata = () => {
            video.play();
            resolve();
        };
    });

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

    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageFile(e.target.files[0]);
        }
    });

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
    
    clearResults();
    
    const recyclingContent = document.getElementById('recycling-content');
    const toggleBtn = document.querySelector('.info-toggle-btn');
    if (recyclingContent) recyclingContent.classList.remove('show');
    if (toggleBtn) toggleBtn.classList.remove('active');

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    if (mode === 'webcam') {
        document.getElementById('webcam-section').style.display = 'flex';
        document.getElementById('upload-section').style.display = 'none';

        if (isModelLoaded) {
            initWebcam();
        }
    } else {
        document.getElementById('webcam-section').style.display = 'none';
        document.getElementById('upload-section').style.display = 'flex';

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

        const canvas = document.getElementById('webcam-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }

        const preview = document.getElementById('preview-image');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }

        const classifyBtn = document.getElementById('classify-image-btn');
        if (classifyBtn) classifyBtn.style.display = 'none';
    }

    const quickConfig = document.querySelector('.quick-config');
    if (quickConfig) {
        quickConfig.style.display = mode === 'upload' ? 'none' : '';
    }

    const captureControls = document.getElementById('capture-controls');
    if (captureControls) {
        if (mode === 'upload') captureControls.style.display = 'none';
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

        const predictions = await model.predict(img);
        displayPrediction(predictions);

    } catch (error) {
        console.error('Error clasificando imagen:', error);
        document.getElementById('prediction').textContent = ' Error al clasificar imagen';
    }
}

function displayPrediction(predictions) {
    const topPrediction = predictions.reduce((max, current) =>
        current.probability > max.probability ? current : max
    );

    const confidencePercent = (topPrediction.probability * 100);

    if (!isNaN(confidencePercent) && confidencePercent >= 90) {
        lastTopPrediction = { ...topPrediction };
    } else {
        lastTopPrediction = null;
    }

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
    const infoAvailable = wasteInfo.type !== 'info';

    const predictionDiv = document.getElementById('prediction');
    predictionDiv.innerHTML = '';

    const resultEl = document.createElement('div');
    resultEl.className = 'prediction-result';
    resultEl.textContent = label;

    const typeEl = document.createElement('div');
    typeEl.className = `waste-type-label ${typeClass}`;
    typeEl.textContent = typeLabel;

    const confidenceNum = parseFloat(confidence);
    if (!isNaN(confidenceNum) && confidenceNum >= 90) {
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
    if (label.includes('papaya') || label.includes('papaya')) return 'Papaya';
    if (label.includes('tomate')) return 'tomate';
    if (label.includes('no hay nada')) return 'No hay nada';

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

    document.getElementById('continuous-mode-btn').classList.toggle('active', mode === 'continuous');
    document.getElementById('capture-mode-btn').classList.toggle('active', mode === 'capture');

    const captureControls = document.getElementById('capture-controls');
    captureControls.style.display = mode === 'capture' ? 'block' : 'none';

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

        currentImageData = canvas.toDataURL('image/jpeg', 0.8);

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
        description: 'Las latas de aluminio se utilizan para envasar bebidas y alimentos. Son uno de los materiales más valiosos y eficientes en el reciclaje: pueden reprocesarse infinitas veces sin perder calidad ni propiedades. Su reciclaje reduce notablemente la extracción de minerales y el consumo energético.',
        instructions: [
            'Aplasta la lata para reducir su volumen y facilitar el transporte',
            'Limpia cualquier residuo de bebida o alimento antes de desecharla',
            'Deposítala en el contenedor amarillo destinado a envases metálicos',
            'No es necesario retirar las etiquetas o tapas adheridas'
        ],
        tips: [
            'El aluminio reciclado conserva el 100% de su calidad original',
            'Reciclar una sola lata ahorra suficiente energía para mantener un televisor encendido durante 3 horas',
            'Separa las latas de aluminio de los metales ferrosos como el acero, que se reciclan por separado',
            'Guarda las latas limpias en una bolsa aparte para facilitar su entrega en puntos de acopio'
        ]
    },

    'botella': {
        type: 'reciclable',
        title: 'Botella de Plástico (PET)',
        description: 'Las botellas de plástico PET son los envases más comunes para bebidas, productos de limpieza y otros líquidos. Son ligeras, resistentes y completamente reciclables si se encuentran limpias y secas. El PET reciclado se usa en textiles, mobiliario y nuevas botellas.',
        instructions: [
            'Vacía completamente el contenido de la botella',
            'Enjuaga con poca agua para eliminar residuos',
            'Aplasta la botella para ahorrar espacio en el contenedor',
            'Deposítala en el contenedor amarillo de plásticos',
            'Retira el tapón y recíclalo en el mismo contenedor'
        ],
        tips: [
            'El PET puede reciclarse varias veces, pero se degrada con el calor y la suciedad',
            'Una botella reciclada puede convertirse en fibra textil o mobiliario urbano',
            'Evita mezclar botellas PET con otros tipos de plástico como PVC o HDPE',
            'Reutiliza las botellas solo temporalmente y no para almacenar líquidos calientes'
        ]
    },

    'botella de vidrio': {
        type: 'reciclable',
        title: 'Botella de Vidrio',
        description: 'Las botellas de vidrio son envases duraderos y 100% reciclables. Su proceso de reciclaje no genera pérdida de calidad y permite reducir significativamente el consumo de energía y materias primas.',
        instructions: [
            'Vacía completamente el contenido de la botella',
            'No es necesario lavarla en exceso; basta eliminar residuos visibles',
            'Deposítala en el contenedor verde destinado al vidrio',
            'Retira los tapones de metal o corcho antes de depositarla',
            'Si tu municipio lo solicita, separa por color (verde, ámbar o transparente)'
        ],
        tips: [
            'El vidrio puede reciclarse infinitamente sin perder calidad',
            'Una botella reciclada ahorra la energía necesaria para encender una bombilla durante 4 horas',
            'No deposites vidrios planos, espejos o cerámicas en el mismo contenedor',
            'Reutiliza botellas retornables siempre que sea posible'
        ]
    },

    'plato': {
        type: 'no-reciclable',
        title: 'Plato (duroport)',
        description: 'Los platos de duroport, fabricados con espuma de poliestireno expandido (EPS), son ligeros y térmicos, pero altamente contaminantes. Este material no se recicla en la mayoría de los sistemas locales debido a su baja densidad, dificultad de limpieza y escaso valor comercial.',
        instructions: [
            'Deposítalo en el contenedor gris o negro destinado a residuos no reciclables',
            'No lo quemes: al hacerlo libera gases tóxicos como el estireno y el benceno',
            'Evita desecharlo en la naturaleza, ya que se fragmenta en microplásticos',
            'Si está limpio y en buen estado, reutilízalo para manualidades o actividades educativas'
        ],
        tips: [
            'El EPS no se recicla fácilmente por su baja rentabilidad',
            'Opta por platos compostables o reutilizables hechos de bambú, bagazo o cartón',
            'Algunos programas especializados aceptan duroport limpio; verifica en tu área',
            'Evita productos de un solo uso siempre que sea posible'
        ]
    },

    'vaso': {
        type: 'no-reciclable',
        title: 'Vaso (duroport)',
        description: 'Los vasos de duroport o espuma de poliestireno son residuos no reciclables y altamente contaminantes. Su estructura ligera dificulta su procesamiento en plantas de reciclaje y contribuye a la contaminación marina.',
        instructions: [
            'Deposítalo en el contenedor gris o negro de rechazo',
            'No lo incineres ni lo deseches al aire libre',
            'Si es reutilizable, límpialo y guárdalo para nuevos usos'
        ],
        tips: [
            'El poliestireno expandido tarda más de 400 años en degradarse',
            'Prefiere vasos de materiales compostables o reutilizables como acero, vidrio o bambú',
            'Evita productos de espuma en eventos y celebraciones masivas'
        ]
    },

    'jugo': {
        type: 'reciclable',
        title: 'Caja de Jugo (Tetra Pak)',
        description: 'Los envases de cartón para jugos suelen estar hechos de varias capas (cartón, plástico y aluminio). Aunque reciclables, requieren tratamiento especializado para separar sus componentes.',
        instructions: [
            'Vacía completamente el contenido',
            'Enjuaga ligeramente para evitar malos olores',
            'Aplasta la caja para ahorrar espacio',
            'Deposítala en el contenedor amarillo o el designado para envases mixtos',
            'Retira el tapón y deposítalo en el mismo contenedor'
        ],
        tips: [
            'El reciclaje del Tetra Pak requiere plantas especializadas que separan sus capas',
            'Confirma si tu municipio acepta este tipo de envases en la recolección común',
            'Los materiales recuperados se utilizan para fabricar papel reciclado o láminas plásticas',
            'Asegúrate de entregarlos secos y limpios'
        ]
    },

    'pizza': {
        type: 'reciclable',
        title: 'Caja de Pizza (cartón)',
        description: 'Las cajas de cartón para pizza pueden reciclarse si no están contaminadas con grasa o restos de comida. La parte limpia puede separarse y enviarse a reciclaje, mientras que la parte sucia debe desecharse o compostarse.',
        instructions: [
            'Si la caja está limpia, pliega y deposítala en el contenedor azul o de papel/cartón',
            'Si tiene grasa o restos, corta las secciones sucias y deposítalas en orgánicos o rechazo',
            'Retira restos grandes de comida antes de reciclarla'
        ],
        tips: [
            'El cartón limpio se recicla fácilmente en nuevos productos de papel',
            'Evita que el cartón contaminado manche otros materiales reciclables',
            'Separa siempre la parte aceitosa para mejorar la eficiencia del reciclaje'
        ]
    },

    'organico': {
        type: 'organico',
        title: 'Residuo Orgánico',
        description: 'Incluye restos de comida, frutas, verduras y materiales biodegradables. Son perfectos para compostaje, devolviendo nutrientes al suelo y reduciendo la cantidad de residuos enviados a vertederos.',
        instructions: [
            'Usa compostera doméstica o el contenedor marrón de orgánicos',
            'Corta los restos en trozos pequeños para acelerar la descomposición',
            'No mezcles plásticos ni metales',
            'Usa bolsas compostables si necesitas bolsa para su recolección'
        ],
        tips: [
            'Mantén un equilibrio 2:1 entre material seco (cartón, hojas) y húmedo (restos de cocina)',
            'Evita carnes y lácteos para prevenir malos olores',
            'El compost maduro mejora la fertilidad del suelo y retiene humedad'
        ]
    },

    'manzana': {
        type: 'organico',
        title: 'Manzana',
        description: 'Las manzanas y sus restos son ideales para compostaje. Aportan azúcares naturales que activan microorganismos beneficiosos y enriquecen el abono final.',
        instructions: [
            'Depósitala en tu compostera o en el contenedor marrón de orgánicos',
            'Córtala en trozos para acelerar su descomposición',
            'Evita usar bolsas plásticas; si es necesario, usa compostables',
            'Incluye corazón y semillas sin problema'
        ],
        tips: [
            'Se descompone en 2-4 semanas según las condiciones del compost',
            'Aporta carbono y nutrientes esenciales',
            'Mezcla con hojas secas o cartón para evitar exceso de humedad'
        ]
    },

    'banano': {
        type: 'organico',
        title: 'Banana/Plátano',
        description: 'Las cáscaras y restos de banana son ricas en potasio y minerales. Se descomponen rápidamente, aportando nutrientes ideales para flores y frutos.',
        instructions: [
            'Trocea las cáscaras y añádelas al compost o al contenedor marrón',
            'Evita bolsas plásticas; usa compostables o deposítalas directamente',
            'Incluye la fruta si está pasada o dañada'
        ],
        tips: [
            'Se descomponen en 1-2 semanas',
            'Aportan potasio, fósforo y magnesio al compost',
            'Enterrarlas cerca de plantas mejora la floración'
        ]
    },

    'limon': {
        type: 'organico',
        title: 'Limón',
        description: 'Los limones pueden compostarse en pequeñas cantidades. Aportan aceites y compuestos ácidos que ayudan a mantener el equilibrio biológico del compost si se usan moderadamente.',
        instructions: [
            'Trocea las cáscaras y mézclalas con material seco',
            'Depósitalo en tu compostera o en el contenedor marrón',
            'Evita excederte para no acidificar el compost'
        ],
        tips: [
            'Se descompone en 2-3 semanas',
            'En pequeñas cantidades aporta aroma y repelencia natural a insectos',
            'Ideal mezclar con restos vegetales y hojas secas'
        ]
    },

    'huevo': {
        type: 'organico',
        title: 'Huevo',
        description: 'Las cáscaras de huevo son una fuente natural de calcio. Trituradas, ayudan a reducir la acidez del compost y fortalecen los suelos.',
        instructions: [
            'Seca las cáscaras y tritúralas antes de compostar',
            'Deposítalas en el contenedor marrón o en tu compostera',
            'Evita añadir grandes cantidades de restos cocidos o grasosos'
        ],
        tips: [
            'El calcio del huevo fortalece la estructura del suelo',
            'Cuanto más trituradas estén las cáscaras, más rápido se integran',
            'Pueden colocarse directamente en las macetas como suplemento mineral'
        ]
    },

    'piña': {
        type: 'organico',
        title: 'Piña',
        description: 'La piña y sus partes (cáscara, corazón y hojas) son compostables y aportan enzimas que aceleran la descomposición de otros materiales.',
        instructions: [
            'Trocea los restos y añádelos al compost o contenedor marrón',
            'Evita bolsas plásticas; usa compostables',
            'Equilibra con material seco para evitar exceso de humedad'
        ],
        tips: [
            'Las enzimas naturales ayudan al proceso de compostaje',
            'Se descompone en 3-4 semanas',
            'Aporta azúcares que alimentan microorganismos beneficiosos'
        ]
    },

    'carton de jugo': {
        type: 'reciclable',
        title: 'Cartón de Jugo (con pajilla)',
        description: 'Los envases Tetra Pak combinan cartón, plástico y aluminio. Aunque su reciclaje es posible, requiere separación industrial de sus capas. Su limpieza y compactación facilitan el proceso.',
        instructions: [
            'Vacía y enjuaga bien el envase',
            'Retira la pajilla y su envoltorio; deposítalos con los plásticos',
            'Aplasta el envase para ahorrar espacio',
            'Deposítalo seco en el contenedor de envases o reciclaje mixto'
        ],
        tips: [
            'El reciclaje del Tetra Pak genera papel, plásticos y aluminio reutilizables',
            'Confirma si tu municipio lo acepta en el contenedor amarillo',
            'Asegúrate de entregarlo seco y limpio para facilitar su recuperación'
        ]
    },

    'papel': {
        type: 'reciclable',
        title: 'Papel y Cartón',
        description: 'El papel y el cartón son materiales reciclables siempre que estén limpios y secos. Pueden reprocesarse hasta 6 veces para fabricar nuevos productos como cajas, cuadernos y cartulina.',
        instructions: [
            'Retira restos de comida, cinta o plástico',
            'Dobla o aplasta para ahorrar espacio',
            'Deposítalo en el contenedor azul o el de papel/cartón',
            'No incluyas papel encerado, plastificado o muy sucio'
        ],
        tips: [
            'El papel húmedo o con grasa no se recicla',
            'Reutiliza cajas y hojas antes de desecharlas',
            'Guarda los papeles limpios separados del resto de residuos'
        ]
    },

    'merma': {
        type: 'merma',
        title: 'Merma / Basura No Reciclable',
        description: 'Residuos que no pueden reutilizarse, reciclarse ni compostarse. Incluye objetos dañados, mezclas de materiales y artículos de un solo uso sin valor de recuperación.',
        instructions: [
            'Deposítalos en el contenedor gris o negro de rechazo',
            'Asegúrate de que no contengan materiales peligrosos',
            'Si son objetos grandes, consulta el servicio de recolección especial',
            'No los quemes ni los deseches en la naturaleza'
        ],
        tips: [
            'Reduce la generación de merma eligiendo productos duraderos',
            'Llévalos a puntos limpios si el tamaño o tipo lo requiere',
            'Destruye documentos o discos con datos personales antes de tirarlos',
            'Evita confundir residuos peligrosos con basura común (pilas, aceites, medicamentos van a puntos especiales)'
        ]
    },

    'tomate': {
        type: 'organico',
        title: 'Tomate',
        description: 'Los tomates aportan humedad y nutrientes al compost. Se descomponen rápidamente, ayudando a activar la fermentación y enriqueciendo el abono.',
        instructions: [
            'Trocea los tomates y añádelos al compost o al contenedor marrón',
            'Evita bolsas plásticas',
            'Incluye tallos o restos vegetales si están sanos'
        ],
        tips: [
            'Aporta nitrógeno y vitaminas al compost',
            'Se descompone en 2-3 semanas',
            'Combina con material seco para evitar exceso de agua'
        ]
    },

    'papaya': {
        type: 'organico',
        title: 'Papaya',
        description: 'Las papayas y sus cáscaras son compostables. Su alto contenido de agua las hace ideales para mantener la humedad del compost y aportar nutrientes.',
        instructions: [
            'Trocea las cáscaras y restos antes de compostar',
            'Depósitalas en el contenedor marrón si no compostas en casa',
            'Evita bolsas plásticas; usa compostables o deposítalas directamente'
        ],
        tips: [
            'Se descompone en 1-2 semanas',
            'Aporta humedad y nutrientes esenciales',
            'Ideal combinar con cartón seco para equilibrar la mezcla'
        ]
    },
    "dulces" : {
        type: 'merma',
        title: 'Dulces / Caramelos',
        description: 'La envoltura del dulce no es reciclable debido a su empaque. Está hecho de multiples capas de material: Plastico, alumminio y papel, que no se pueden separar en plantas de reciclaje.',
        instructions: 'Deposítalos en el contenedor gris o negro de rechazo',


    },
    "no hay nada" : {
        type: 'info',
        title: 'Información de Reciclaje',
        description: 'Coloca el objeto frente a la cámara o sube una imagen para obtener instrucciones específicas de reciclaje. Mientras esperas, aquí tienes información práctica de reciclaje universal:',
    }
};

function getWasteType(label) {
    const normalizedLabel = label.toLowerCase().trim();

    for (const [key, info] of Object.entries(recyclingInfo)) {
        if (normalizedLabel.includes(key) || key.includes(normalizedLabel)) {
            return info;
        }
    }

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

        const labelToShow = lastTopPrediction && lastTopPrediction.className ? lastTopPrediction.className : null;
        updateRecyclingInfo(labelToShow);
        recyclingContent.classList.add('show');
        toggleBtn.classList.add('active');
    }
}

function updateRecyclingInfo(label) {
    let wasteInfo;

    if (!label) {
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

    const titleEl = document.getElementById('info-title');
    const descEl = document.getElementById('info-description');
    if (titleEl) titleEl.textContent = wasteInfo.title;
    if (descEl) descEl.textContent = wasteInfo.description;

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
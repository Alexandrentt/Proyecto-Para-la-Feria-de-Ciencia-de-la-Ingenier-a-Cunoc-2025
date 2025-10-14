const MODEL_URL = './my_model/';
let model, webcam, currentMode = 'webcam';
let isWebcamActive = false; // indica si la webcam ya está inicializada y en play
let isModelLoaded = false;
let currentImageData = null;
let webcamMode = 'capture'; 
let currentView = 'home'; 
let isModalOpen = false;
let lastTopPrediction = null;
// Preferencia de cámara: 'environment' (trasera) o 'user' (frontal). Se puede cambiar desde la UI.
let preferredFacing = 'environment';

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

    setupEventListeners();
    showSection('home');

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

        // Forzar uso de cámara trasera por defecto (environment) a menos que el usuario haya elegido lo contrario.
        // Esto aplica en móviles y escritorio: siempre intentamos seleccionar una cámara trasera primero.
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Construir constraints iniciales (pedimos resolución alta ideal)
        let constraints = {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        // Intentar obtener deviceId de una cámara trasera disponible (no limitar solo a móviles)
        let selectedDeviceId = null;
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');

                // Buscar por etiquetas comunes de cámara trasera
                const rearRegex = /back|rear|traser|trasera|environment|camara trasera|rear camera/i;
                const found = videoInputs.find(d => d.label && rearRegex.test(d.label));
                if (found) {
                    selectedDeviceId = found.deviceId;
                    console.log('initWebcam: cámara trasera detectada por label:', found.label);
                } else {
                    // Si no hay label (posiblemente sin permisos), solicitar temporalmente facingMode=environment
                    try {
                        const tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: 640, height: 480 } });
                        const track = tempStream.getVideoTracks()[0];
                        const settings = track.getSettings && track.getSettings();
                        if (settings && settings.deviceId) {
                            selectedDeviceId = settings.deviceId;
                            console.log('initWebcam: obtuvo deviceId tras permiso temporal:', selectedDeviceId);
                        }
                        // detener stream temporal
                        track.stop();
                    } catch (permErr) {
                        console.warn('initWebcam: no se pudo obtener permiso temporal con facingMode=environment:', permErr);
                    }
                }
            } catch (enumErr) {
                console.warn('initWebcam: enumerateDevices falló:', enumErr);
            }
        }

        if (selectedDeviceId) {
            constraints.video.deviceId = { exact: selectedDeviceId };
        } else {
            // Fallback: en móviles forzamos facingMode 'environment' para priorizar la trasera.
            if (isMobile) {
                constraints.video.facingMode = { exact: 'environment' };
            } else {
                // En escritorio, usar la preferencia si existe, sino preferir 'user'
                const facingToUse = preferredFacing || 'user';
                constraints.video.facingMode = { ideal: facingToUse };
            }
        }

    // Crear webcam (tmImage.Webcam)
    // No hacemos flip por defecto: preferimos mostrar la imagen tal cual (evita efecto espejo que puede confundirte)
    const flip = false;
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
        // Comprobar si realmente se abrió la cámara trasera; si no, intentar con otra cámara disponible.
        let actuallyFront = false;
        try {
            const activeStream = webcam && webcam.video && webcam.video.srcObject;
            if (activeStream) {
                const track = activeStream.getVideoTracks()[0];
                const settings = track.getSettings && track.getSettings();
                const label = track.label || '';
                // Algunos navegadores devuelven facingMode en settings
                if (settings && settings.facingMode) {
                    actuallyFront = settings.facingMode === 'user' || settings.facingMode === 'front';
                } else {
                    // Fallback: inferir por label si contiene palabras comunes
                    const frontRegex = /front|user|selfie|frontal/i;
                    actuallyFront = frontRegex.test(label);
                }
                console.log('initWebcam: cámara activa label/settings:', label, settings, ' actuallyFront=', actuallyFront);
            }
        } catch (e) {
            console.warn('initWebcam: no se pudo determinar facingMode del track:', e);
        }

        // Si detectamos que por alguna razón se abrió la frontal, intentamos seleccionar otra cámara (trasera) si existe
        if (actuallyFront && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                const frontRegex = /front|user|selfie|frontal/i;
                const rearCandidate = videoInputs.find(d => d.label && !frontRegex.test(d.label));
                if (rearCandidate) {
                    console.log('initWebcam: se detectó frontal. Reintentando con candidate trasera:', rearCandidate.label || rearCandidate.deviceId);
                    // Detener stream actual
                    try {
                        if (webcam && typeof webcam.stop === 'function') webcam.stop();
                        if (webcam && webcam.video && webcam.video.srcObject) {
                            const tracks = webcam.video.srcObject.getTracks();
                            tracks.forEach(t => t.stop());
                        }
                    } catch (stopErr) {
                        console.warn('initWebcam: error deteniendo stream antes de reintentar:', stopErr);
                    }

                    // Forzar deviceId al candidate trasera y reiniciar webcam una única vez
                    constraints.video.deviceId = { exact: rearCandidate.deviceId };
                    // Ajustar flip acorde (trasera no debe flipearse)
                    const flipRetry = false; // trasera -> no flip
                    webcam = new tmImage.Webcam(640, 480, flipRetry);
                    await webcam.setup(constraints);
                    await webcam.play();
                    // actualizar canvas/video
                    const finalCanvasRetry = document.getElementById('webcam-canvas');
                    if (finalCanvasRetry && webcam && webcam.video) {
                        const vw = webcam.video.videoWidth || webcam.canvas && webcam.canvas.width || 640;
                        const vh = webcam.video.videoHeight || webcam.canvas && webcam.canvas.height || 480;
                        finalCanvasRetry.width = vw;
                        finalCanvasRetry.height = vh;
                        finalCanvasRetry.style.display = 'block';
                        if (webcam.canvas) {
                            webcam.canvas.width = vw;
                            webcam.canvas.height = vh;
                        }
                    }
                    console.log('initWebcam: reintento con cámara trasera realizado');
                } else {
                    console.log('initWebcam: no se encontró una cámara trasera alternativa para reintentar');
                }
            } catch (retryErr) {
                console.warn('initWebcam: error al enumerar/reintentar con cámara trasera:', retryErr);
            }
        }

        isWebcamActive = true;
        console.log('initWebcam: isWebcamActive = true');

        // Mostrar canvas (de nuevo por si estuvo ausente)
        const finalCanvas = document.getElementById('webcam-canvas');
            if (finalCanvas && webcam && webcam.video) {
                // Ajustar el canvas al tamaño real del stream para mantener resolución máxima
                const vw = webcam.video.videoWidth || webcam.canvas && webcam.canvas.width || 640;
                const vh = webcam.video.videoHeight || webcam.canvas && webcam.canvas.height || 480;
                finalCanvas.width = vw;
                finalCanvas.height = vh;
                finalCanvas.style.display = 'block';
                // Si la librería creó su propio canvas más pequeño, mantenerlo consistente
                if (webcam.canvas) {
                    webcam.canvas.width = vw;
                    webcam.canvas.height = vh;
                }
            } else if (finalCanvas && webcam && webcam.canvas) {
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

// Permite al usuario cambiar entre cámara frontal y trasera
function setCameraFacing(facing) {
    if (facing !== 'user' && facing !== 'environment') return;
    preferredFacing = facing;

    // Actualizar estilos de botones
    const rearBtn = document.getElementById('rear-camera-btn');
    const frontBtn = document.getElementById('front-camera-btn');
    if (rearBtn) rearBtn.classList.toggle('active', facing === 'environment');
    if (frontBtn) frontBtn.classList.toggle('active', facing === 'user');

    // Si la webcam está activa, reiniciarla para aplicar la preferencia
    if (isWebcamActive && currentMode === 'webcam') {
        try {
            // Detener la webcam actual
            if (webcam) {
                if (typeof webcam.stop === 'function') webcam.stop();
                if (webcam.video && webcam.video.srcObject) {
                    const tracks = webcam.video.srcObject.getTracks();
                    tracks.forEach(t => t.stop());
                }
            }
        } catch (e) {
            console.warn('Error al detener webcam antes de reiniciar:', e);
        }
        webcam = null;
        isWebcamActive = false;
        // Re-iniciar la webcam con la nueva preferencia
        setTimeout(() => initWebcam(), 200);
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

    // Guardar la última predicción SOLO si la confianza es alta (>= 90%). En caso contrario, mantener null
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
                     wasteInfo.type === 'organico' ? '📦 Merma' : '❌ No Reciclable';
    const typeClass = wasteInfo.type === 'reciclable' ? 'reciclable' :
                     wasteInfo.type === 'organico' ? 'merma' : 'no-reciclable';

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

        const infoBtn = document.createElement('button');
        infoBtn.className = 'info-btn';
        infoBtn.classList.add('custom-highlight');
        infoBtn.textContent = 'Información';
        infoBtn.addEventListener('click', () => showRecyclingInfo(topPrediction.className));

        if (typeof webcamMode === 'undefined' || webcamMode === 'capture' || currentMode === 'upload') {
            predictionDiv.appendChild(infoBtn);
        }

        // Actualizar el contenido del menú desplegable automáticamente (solo con confianza alta)
        updateRecyclingInfo(topPrediction.className);
    } else {
        // Confianza baja: mostrar aviso de desconocido, no mostrar clasificación
        const unknownBadge = document.createElement('div');
        unknownBadge.className = 'unknown-badge';
        unknownBadge.textContent = 'El modelo no fue entrenado para reconocer este objeto en específico.';
        predictionDiv.appendChild(unknownBadge);
        // Mostrar la guía general en el menú desplegable cuando la predicción no es fiable
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

    // Fallback: retornar como vino
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
    // Oculta todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });

    // Muestra la sección seleccionada
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    } else {
        console.error(`No se encontró la sección con id: ${sectionId}`);
        return;
    }

    // Limpia resultados y previsualizaciones
    const resultContainer = document.getElementById('result');
    const preview = document.getElementById('imagePreview');
    if (resultContainer) resultContainer.textContent = '';
    if (preview) preview.src = '';

    // Lógica según la sección activa
    if (sectionId === 'webcam-section') {
        // Inicia la cámara automáticamente al entrar
        initWebcam();
    } else if (sectionId === 'upload-section') {
        // Detiene la cámara al cambiar a subir imagen
        stopWebcam();
    }
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
        title: 'Caja de Jugo (cartón/Tetra Pak)',
        description: 'Envase de cartón para jugos (Tetra Pak o cartón multi-capa). En muchos sistemas se considera envase reciclable o se procesa separadamente.',
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
        description: 'Los residuos orgánicos son materiales biodegradables que provienen de seres vivos o alimentos.',
        instructions: [
            'Deposítalo en el contenedor marrón específico para orgánicos',
            'No incluyas plásticos, metales o vidrios',
            'Si tienes compostaje doméstico, úsalo para generar abono',
            'Evita bolsas de plástico, usa bolsas compostables'
        ],
        tips: [
            'Los residuos orgánicos se convierten en compost rico en nutrientes',
            'El compostaje reduce la cantidad de basura que va a los vertederos',
            'Incluye cáscaras de frutas, verduras, restos de comida, café, té, etc.'
        ]
    },
    'manzana': {
        type: 'organico',
        title: 'Manzana',
        description: 'Las manzanas y otras frutas son residuos orgánicos biodegradables.',
        instructions: [
            'Deposítala en el contenedor marrón de orgánicos',
            'Si tienes espacio, puedes hacer compostaje doméstico',
            'No uses bolsas de plástico, usa bolsas compostables o papel',
            'Incluye el corazón y las semillas'
        ],
        tips: [
            'Las frutas son excelentes para el compostaje',
            'Una manzana se descompone completamente en 2-4 semanas',
            'El compost de frutas es rico en nutrientes naturales'
        ]
    },
    'banano': {
        type: 'organico',
        title: 'Banana/Plátano',
        description: 'Las bananas y sus cáscaras son residuos orgánicos altamente biodegradables.',
        instructions: [
            'Deposita la cáscara en el contenedor marrón',
            'Si tienes compost, agrégala directamente',
            'No uses bolsas plásticas, usa compostables',
            'Incluye toda la fruta si está en mal estado'
        ],
        tips: [
            'Las cáscaras de banana son ricas en potasio para el compost',
            'Se descomponen rápidamente (1-2 semanas)',
            'Excelente para abono natural de plantas'
        ]
    },
    'limon': {
        type: 'organico',
        title: 'Limón',
        description: 'Los limones y cítricos son residuos orgánicos ácidos pero biodegradables.',
        instructions: [
            'Deposítalo en el contenedor marrón de orgánicos',
            'Incluye cáscaras y pulpa',
            'Evita bolsas de plástico',
            'Perfecto para compostaje doméstico'
        ],
        tips: [
            'Los cítricos ayudan a equilibrar el pH del compost',
            'Se descomponen en 2-3 semanas',
            'Ricos en vitamina C que beneficia al compost'
        ]
    },
    'huevo': {
        type: 'organico',
        title: 'Huevo',
        description: 'Las cáscaras de huevo son residuos orgánicos ricos en calcio.',
        instructions: [
            'Deposita las cáscaras en el contenedor marrón',
            'Aplástalas para que ocupen menos espacio',
            'Incluye yemas y claras si están crudas',
            'Perfecto para compostaje'
        ],
        tips: [
            'Las cáscaras de huevo agregan calcio al compost',
            'Se descomponen en 3-4 semanas',
            'Ayudan a reducir la acidez del compost'
        ]
    },
    'piña': {
        type: 'organico',
        title: 'Piña',
        description: 'La piña y sus residuos son orgánicos biodegradables.',
        instructions: [
            'Deposita en contenedor marrón de orgánicos',
            'Incluye cáscaras, corazón y hojas',
            'Córtala en trozos pequeños para mejor compostaje',
            'Evita bolsas de plástico'
        ],
        tips: [
            'La piña es rica en enzimas naturales',
            'Se descompone en 3-4 semanas',
            'Excelente para compostaje doméstico'
        ]
    },
    'shakalaka': {
        type: 'no-reciclable',
        title: 'Objeto Desconocido',
        description: 'Este objeto no pudo ser identificado correctamente por el modelo.',
        instructions: [
            'Si sabes qué es, clasifícalo según su material',
            'Consulta con tu servicio local de recolección',
            'Deposítalo en el contenedor gris de rechazo',
            'Evita tirarlo en la naturaleza'
        ],
        tips: [
            'Si es un objeto reutilizable, considera donarlo',
            'Toma una foto más clara para mejor identificación',
            'Consulta con expertos en reciclaje para objetos desconocidos'
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
}
};

// Función para determinar el tipo de basura según la etiqueta
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
            title: 'Esperando clasificación',
            description: 'Coloca el objeto frente a la cámara o sube una imagen para obtener instrucciones específicas de reciclaje. Mientras esperas, aquí tienes una guía práctica de reciclaje universal:',
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
        } else if (wasteInfo.type === 'info') {
            typeElement.textContent = 'ℹ️ Guía';
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
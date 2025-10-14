# SARB - Sistema Automático de Reconocimiento de Basura

## 🌱 Descripción

SARB es una aplicación web que utiliza inteligencia artificial para clasificar residuos en tiempo real. La aplicación puede identificar diferentes tipos de basura usando la cámara del dispositivo o subiendo imágenes, y proporciona información detallada sobre cómo reciclar cada tipo de residuo.

## ✨ Características

- **Clasificación en tiempo real** usando la cámara del dispositivo
- **Subida de imágenes** para análisis offline
- **Información de reciclaje** detallada para cada tipo de residuo
- **Interfaz responsiva** que funciona en móviles y escritorio
- **Modelo de IA entrenado** con Teachable Machine
- **Tema claro/oscuro** (preparado para futuras implementaciones)

## 🗂️ Tipos de Residuos Soportados

### Reciclables ♻️
- Latas de aluminio
- Botellas de plástico
- Botellas de vidrio
- Cajas de jugo (cartón)
- Cajas de pizza (cartón)
- Papel y cartón

### Orgánicos 🌱
- Residuos orgánicos generales
- Manzanas
- Bananos/Plátanos
- Limones
- Huevos (cáscaras)
- Piñas

### No Reciclables ❌
- Platos de duroport
- Vasos de duroport
- Objetos desconocidos

## 🚀 Despliegue

### Opción 1: Vercel (Recomendado)

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Desplegar:**
   ```bash
   vercel
   ```

3. **Seguir las instrucciones** en la terminal para configurar el proyecto

### Opción 2: Netlify

1. **Instalar Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Desplegar:**
   ```bash
   netlify deploy --prod --dir .
   ```

### Opción 3: Servidor Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Ejecutar servidor local:**
   ```bash
   npm start
   ```

3. **Abrir en el navegador:** `http://localhost:3000`

## 🛠️ Desarrollo

### Estructura del Proyecto

```
sarb/
├── index.html          # Página principal
├── script.js           # Lógica de la aplicación
├── styles.css          # Estilos CSS
├── favicon.png         # Icono de la aplicación
├── my_model/           # Modelo de IA entrenado
│   ├── model.json      # Arquitectura del modelo
│   ├── weights.bin     # Pesos del modelo
│   └── metadata.json   # Metadatos del modelo
├── package.json        # Configuración del proyecto
├── vercel.json         # Configuración de Vercel
└── README.md           # Este archivo
```

### Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **IA/ML:** TensorFlow.js, Teachable Machine
- **Librerías:** Chart.js (para futuras gráficas)
- **Despliegue:** Vercel, Netlify

## 📱 Uso

1. **Abrir la aplicación** en un navegador web
2. **Permitir acceso a la cámara** cuando se solicite
3. **Apunta la cámara** hacia el objeto que quieres clasificar
4. **Toca "Capturar y Clasificar"** o usa el modo continuo
5. **Consulta la información de reciclaje** expandiendo el panel informativo

## 🔧 Configuración

### Modos de Webcam
- **Continua:** Clasificación automática en tiempo real
- **Captura:** Clasificación manual al presionar el botón

### Cámaras (Móviles)
- **Trasera:** Cámara posterior (recomendada)
- **Frontal:** Cámara frontal

## 📊 Modelo de IA

El modelo fue entrenado usando Google Teachable Machine con las siguientes características:
- **Tamaño de imagen:** 224x224 píxeles
- **Clases:** 14 tipos diferentes de residuos
- **Formato:** TensorFlow.js
- **Confianza mínima:** 90% para mostrar resultados

## 🌍 Impacto Ambiental

SARB contribuye a:
- **Mejorar la separación de residuos** en el hogar
- **Educar sobre reciclaje** con información específica
- **Reducir la contaminación** por mal manejo de residuos
- **Promover la sostenibilidad** ambiental

## 📄 Licencia

MIT License - Proyecto Feria de Ciencia Ingeniería 2025

## 🤝 Contribuciones

Este es un proyecto educativo. Las contribuciones son bienvenidas para:
- Mejorar la precisión del modelo
- Agregar nuevos tipos de residuos
- Mejorar la interfaz de usuario
- Optimizar el rendimiento

## 📞 Contacto

Proyecto desarrollado para la Feria de Ciencia Ingeniería 2025
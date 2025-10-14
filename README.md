# SARB - Sistema Automático de Reconocimiento de Basura

##  Descripción del Proyecto

SARB (Sistema Automático de Reconocimiento de Basura) es un sistema inteligente de clasificación de residuos que utiliza Inteligencia Artificial y aprendizaje automático para identificar y categorizar diferentes tipos de basura en tiempo real. Desarrollado con Teachable Machine de Google y TensorFlow.js, este proyecto busca facilitar el proceso de reciclaje mediante la identificación automática de materiales.

##  Características Principales

- Clasificación en Tiempo Real**: Utiliza la webcam para identificar objetos instantáneamente
- Modo de Captura**: Permite tomar fotografías individuales para análisis detallado
- Carga de Imágenes**: Soporta la clasificación de imágenes desde archivos locales
- 13 Categorías de Residuos**:
  - **Reciclables**: Lata, Botella (plástico), Botella de vidrio, Caja de jugo, Caja de pizza, Papel/Cartón
  - **Orgánicos**: Manzana, Banano, Limón, Huevo (cáscara), Piña
  - **No Reciclables**: Plato (duroport), Vaso (duroport)
  - **Merma**: Basura sin valor de reciclaje
- Información Detallada de Reciclaje**: Instrucciones específicas para cada tipo de residuo
- Confianza de Predicción**: Muestra el porcentaje de certeza en cada clasificación
- Diseño Responsivo**: Optimizado para dispositivos móviles y escritorio
- Interfaz Moderna**: Diseño limpio con paleta de colores verde ecológica
- Modos de Operación**: Continuo (clasificación automática) y Captura (análisis individual)

##  Stack Tecnológico

- **HTML5**: Estructura semántica y moderna
- **CSS3**: Estilos avanzados con variables CSS y diseño responsivo
- **JavaScript ES6+**: Lógica de aplicación con características modernas
- **TensorFlow.js**: Framework de aprendizaje automático en el navegador
- **Teachable Machine**: Plataforma de entrenamiento de modelos de IA de Google
- **Web APIs**:
  - `getUserMedia`: Acceso a la cámara del dispositivo
  - `Canvas API`: Procesamiento de imágenes
  - `FileReader API`: Carga de archivos locales

## Estructura del Proyecto

```
Proyecto Feria cientifica/
│
├── index.html              # Interfaz principal de la aplicación
├── script.js               # Lógica de la aplicación y manejo del modelo
├── styles.css              # Estilos y temas visuales
├── favicon.png             # Icono de la aplicación
├── README.md               # Documentación del proyecto
│
├── my_model/               # Modelo entrenado de Teachable Machine
│   ├── model.json          # Arquitectura del modelo
│   ├── weights.bin         # Pesos del modelo entrenado
│   └── metadata.json       # Metadatos y etiquetas de clases
│
└── dataset/                # Conjunto de datos de entrenamiento
    ├── botella/            # Imágenes de botellas de plástico
    ├── jugo/               # Imágenes de cajas de jugo
    ├── lata/               # Imágenes de latas de aluminio
    ├── merma/              # Imágenes de basura general
    ├── organico/           # Imágenes de residuos orgánicos
    │   ├── huevo/
    │   ├── limon/
    │   ├── manzana/
    │   └── piña/
    ├── papel/              # Imágenes de papel y cartón
    ├── pizza/              # Imágenes de cajas de pizza
    ├── plato/              # Imágenes de platos de duroport
    ├── vaso/               # Imágenes de vasos desechables
    └── vidrio botella/     # Imágenes de botellas de vidrio
```

##  Instalación y Uso

### Requisitos Previos

- Navegador web moderno (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Cámara web o cámara de dispositivo móvil
- JavaScript habilitado
- Conexión a internet (para cargar librerías CDN)

### Pasos de Instalación

1. **Clonar o descargar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/sarb-proyecto.git
   cd sarb-proyecto
   ```

2. **Abrir la aplicación**:
   - Simplemente abre el archivo `index.html` en tu navegador web
   - O utiliza un servidor local:
     ```bash
     # Con Python 3
     python -m http.server 8000
     
     # Con Node.js (http-server)
     npx http-server
     ```

3. **Permitir permisos de cámara**:
   - El navegador solicitará permiso para acceder a la cámara
   - Acepta los permisos para usar la funcionalidad de clasificación en tiempo real

### Uso de la Aplicación

#### Modo Webcam

1. **Modo Continuo**:
   - Selecciona "Usar Webcam" en la parte superior
   - Activa el modo "Continua" en la configuración
   - Apunta la cámara hacia el objeto a clasificar
   - La clasificación se realizará automáticamente

2. **Modo Captura**:
   - Selecciona "Usar Webcam"
   - Activa el modo "Captura" en la configuración
   - Posiciona el objeto frente a la cámara
   - Presiona "Capturar y Clasificar"

#### Modo Subir Imagen

1. Selecciona "Subir Imagen" en la parte superior
2. Haz clic en el área de carga o arrastra una imagen
3. Presiona "Clasificar Imagen"
4. Visualiza los resultados y la información de reciclaje

##  Configuración del Modelo

### Categorías Entrenadas

El modelo ha sido entrenado con las siguientes categorías:

1. **Lata** - Latas de aluminio (bebidas, alimentos)
2. **Botella** - Botellas de plástico PET
3. **Botella de vidrio** - Botellas de vidrio retornables
4. **Plato** - Platos de duroport/espuma
5. **Vaso** - Vasos desechables de duroport
6. **Jugo** - Cajas de jugo (Tetra Pak)
7. **Pizza** - Cajas de pizza de cartón
8. **Papel** - Papel y cartón limpio
9. **Orgánico** - Residuos orgánicos generales
10. **Manzana** - Manzanas y restos
11. **Banano** - Bananos y cáscaras
12. **Limón** - Limones y cítricos
13. **Huevo** - Cáscaras de huevo
14. **Piña** - Piña y sus residuos
15. **Merma** - Basura sin valor de reciclaje

### Reemplazar el Modelo

Si deseas entrenar tu propio modelo:

1. Visita [Teachable Machine](https://teachablemachine.withgoogle.com/)
2. Crea un nuevo proyecto de clasificación de imágenes
3. Entrena tu modelo con tus propias categorías
4. Exporta el modelo y descarga los archivos
5. Reemplaza los archivos en la carpeta `my_model/`
6. Actualiza la constante `MODEL_URL` en `script.js` si es necesario:
   ```javascript
   const MODEL_URL = './my_model/';
   ```

##  Compatibilidad de Navegadores

| Navegador | Versión Mínima | Soporte |
|-----------|----------------|---------|
| Chrome    | 90+            | ✅ Completo |
| Firefox   | 88+            | ✅ Completo |
| Safari    | 14+            | ✅ Completo |
| Edge      | 90+            | ✅ Completo |
| Opera     | 76+            | ✅ Completo |

**Requisitos**:
- Cámara web o cámara de dispositivo
- JavaScript habilitado
- Permisos de cámara otorgados

##  Funcionalidades Clave

### Detección Inteligente de Cámara

- **Móviles**: Prioriza automáticamente la cámara trasera
- **Escritorio**: Selecciona la mejor cámara disponible
- **4 Estrategias de Fallback**: Garantiza acceso a la cámara en diferentes dispositivos

### Sistema de Confianza

- Umbral de confianza del 90% para mostrar resultados
- Indicador visual de porcentaje de certeza
- Mensaje informativo cuando el objeto no es reconocido

### Información de Reciclaje

Para cada objeto detectado, el sistema proporciona:
- **Descripción**: Qué es el objeto y sus características
- **Instrucciones de reciclaje**: Pasos específicos para reciclar correctamente
- **Consejos adicionales**: Tips para maximizar el reciclaje
- **Clasificación por tipo**: Reciclable, Orgánico, No Reciclable, o Merma

### Diseño Responsivo

- **Escritorio**: Layout amplio con controles completos
- **Móvil**: Interfaz optimizada con elementos apilados
- **Tablet**: Diseño adaptativo intermedio

##  Créditos

**SARB - Sistema Automático de Reconocimiento de Basura**

- **Proyecto**: Feria Científica • Ingeniería 2025
- **Tecnologías**: Google Teachable Machine, TensorFlow.js
- **Inspiración**: Contribuir a un mundo más sostenible mediante la tecnología

### Agradecimientos

- Facultad de Ingeniería del Centro Universitaicion de Occidente por que la feria es cosa del aniversario de Ingeniería.
- Zi, si estás leyendo esto. Por, no se. Apoyo moral?

##  Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

```
MIT License

Copyright (c) 2025 SARB Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```


<div align="center">

Construyendo un futuro más verde, una clasificación a la vez (Ah re xd) 

[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/sarb-proyecto)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://www.javascript.com/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-2.0+-orange.svg)](https://www.tensorflow.org/js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

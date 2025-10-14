# 🚀 Guía de Despliegue - SARB

## Opción 1: Vercel (Recomendado)

### Pasos para desplegar en Vercel:

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión en Vercel:**
   ```bash
   vercel login
   ```

3. **Desplegar el proyecto:**
   ```bash
   vercel
   ```

4. **Seguir las instrucciones:**
   - ¿Cuál es el nombre de tu proyecto? `sarb-sistema-reconocimiento-basura`
   - ¿En qué directorio está tu código? `./` (presionar Enter)
   - ¿Quieres sobrescribir la configuración? `N` (presionar Enter)

5. **¡Listo!** Tu aplicación estará disponible en una URL como:
   `https://sarb-sistema-reconocimiento-basura.vercel.app`

### Configuración automática:
- El archivo `vercel.json` ya está configurado
- La aplicación se desplegará automáticamente
- HTTPS habilitado por defecto
- CDN global para mejor rendimiento

## Opción 2: Netlify

### Pasos para desplegar en Netlify:

1. **Instalar Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Iniciar sesión en Netlify:**
   ```bash
   netlify login
   ```

3. **Desplegar el proyecto:**
   ```bash
   netlify deploy --prod --dir .
   ```

4. **¡Listo!** Tu aplicación estará disponible en una URL como:
   `https://sarb-sistema-reconocimiento-basura.netlify.app`

### Configuración automática:
- El archivo `netlify.toml` ya está configurado
- Headers de seguridad incluidos
- Cache optimizado para archivos estáticos

## Opción 3: GitHub Pages

### Pasos para desplegar en GitHub Pages:

1. **Crear un repositorio en GitHub**
2. **Subir todos los archivos del proyecto**
3. **Ir a Settings > Pages**
4. **Seleccionar "Deploy from a branch"**
5. **Elegir la rama main/master**
6. **¡Listo!** Tu aplicación estará disponible en:
   `https://tu-usuario.github.io/sarb-sistema-reconocimiento-basura`

## Opción 4: Servidor Local

### Para desarrollo y pruebas:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Ejecutar servidor local:**
   ```bash
   npm start
   ```

3. **Abrir en el navegador:**
   `http://localhost:3000`

## 🔧 Configuración Adicional

### Variables de Entorno (si es necesario):
```bash
# No se requieren variables de entorno para esta aplicación
# El modelo de IA se carga desde archivos locales
```

### Dominio Personalizado:
- **Vercel:** Configurar en el dashboard de Vercel
- **Netlify:** Configurar en el dashboard de Netlify
- **GitHub Pages:** Configurar en Settings > Pages

## 📱 Pruebas Post-Despliegue

1. **Verificar que la aplicación carga correctamente**
2. **Probar el acceso a la cámara**
3. **Probar la subida de imágenes**
4. **Verificar que el modelo de IA funciona**
5. **Probar en diferentes dispositivos (móvil, tablet, escritorio)**

## 🐛 Solución de Problemas

### Error: "Modelo no cargado"
- Verificar que los archivos en `my_model/` estén presentes
- Verificar que la aplicación se sirva desde HTTPS (requerido para acceso a cámara)

### Error: "Cámara no disponible"
- Verificar permisos de cámara en el navegador
- Probar en diferentes navegadores
- Verificar que la aplicación use HTTPS

### Error: "CORS"
- Verificar que el servidor tenga CORS habilitado
- Verificar configuración de headers

## 🎉 ¡Despliegue Completado!

Tu Sistema Automático de Reconocimiento de Basura (SARB) está listo para usar. Los usuarios podrán:

- ✅ Clasificar residuos en tiempo real
- ✅ Obtener información de reciclaje
- ✅ Usar la aplicación en cualquier dispositivo
- ✅ Contribuir a un mejor manejo de residuos

¡Gracias por ayudar a hacer del mundo un lugar más sostenible! 🌱♻️
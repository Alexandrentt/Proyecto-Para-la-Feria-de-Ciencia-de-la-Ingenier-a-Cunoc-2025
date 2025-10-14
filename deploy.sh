#!/bin/bash

echo "🚀 Iniciando despliegue de SARB..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instálalo primero."
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor instálalo primero."
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Buscar un puerto disponible
PORT=8080
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

echo "🌐 Iniciando servidor en puerto $PORT..."
echo "📱 Abre tu navegador en: http://localhost:$PORT"
echo "⏹️  Presiona Ctrl+C para detener el servidor"

# Iniciar servidor
npx http-server . -p $PORT -c-1 --cors -o
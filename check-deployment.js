#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando archivos necesarios para el despliegue de SARB...\n');

// Archivos requeridos
const requiredFiles = [
    'index.html',
    'script.js',
    'styles.css',
    'favicon.png',
    'package.json',
    'my_model/model.json',
    'my_model/weights.bin',
    'my_model/metadata.json'
];

// Archivos de configuración de despliegue
const configFiles = [
    'vercel.json',
    'netlify.toml',
    'README.md',
    'deploy-vercel.md'
];

let allFilesPresent = true;

console.log('📋 Verificando archivos principales...');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - FALTANTE`);
        allFilesPresent = false;
    }
});

console.log('\n📋 Verificando archivos de configuración...');
configFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`⚠️  ${file} - Opcional`);
    }
});

console.log('\n📊 Verificando estructura del modelo de IA...');
const modelDir = 'my_model';
if (fs.existsSync(modelDir)) {
    const modelFiles = fs.readdirSync(modelDir);
    console.log(`✅ Directorio my_model/ encontrado con ${modelFiles.length} archivos`);
    modelFiles.forEach(file => {
        console.log(`   - ${file}`);
    });
} else {
    console.log('❌ Directorio my_model/ no encontrado');
    allFilesPresent = false;
}

console.log('\n📱 Verificando configuración del proyecto...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ package.json válido - Proyecto: ${packageJson.name}`);
    console.log(`   Versión: ${packageJson.version}`);
    console.log(`   Scripts disponibles: ${Object.keys(packageJson.scripts).join(', ')}`);
} catch (error) {
    console.log('❌ Error leyendo package.json:', error.message);
    allFilesPresent = false;
}

console.log('\n🌐 Verificando configuración de Vercel...');
try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    console.log(`✅ vercel.json válido - Versión: ${vercelConfig.version}`);
    console.log(`   Nombre: ${vercelConfig.name}`);
} catch (error) {
    console.log('⚠️  vercel.json no válido o no encontrado');
}

console.log('\n📋 Verificando configuración de Netlify...');
if (fs.existsSync('netlify.toml')) {
    console.log('✅ netlify.toml encontrado');
} else {
    console.log('⚠️  netlify.toml no encontrado');
}

console.log('\n' + '='.repeat(50));

if (allFilesPresent) {
    console.log('🎉 ¡Todo listo para el despliegue!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Ejecutar: npm install');
    console.log('2. Para Vercel: vercel');
    console.log('3. Para Netlify: netlify deploy --prod --dir .');
    console.log('4. Para local: npm start');
    console.log('\n🌱 ¡Tu SARB está listo para ayudar al planeta!');
} else {
    console.log('❌ Faltan archivos necesarios. Revisa la lista anterior.');
    console.log('\n🔧 Archivos faltantes deben ser agregados antes del despliegue.');
}

console.log('\n📚 Para más información, consulta:');
console.log('- README.md - Documentación completa');
console.log('- deploy-vercel.md - Guía de despliegue detallada');
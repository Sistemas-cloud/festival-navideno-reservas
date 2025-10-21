#!/bin/bash

echo "🎄 Iniciando Festival Navideño - Portal de Reserva de Boletos (Next.js)"
echo "=================================================================="

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor instala npm primero."
    exit 1
fi

# Verificar si existe config.env
if [ ! -f "config.env" ]; then
    echo "⚠️  Archivo config.env no encontrado. Copiando desde ejemplo..."
    cp config.env.example config.env
    echo "📝 Por favor edita config.env con tus credenciales de base de datos"
    echo "   Especialmente DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    read -p "¿Continuar con la configuración por defecto? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Cargar variables de entorno
export $(cat config.env | xargs)

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar tipos TypeScript
echo "🔍 Verificando tipos TypeScript..."
npm run type-check

# Verificar si la verificación fue exitosa
if [ $? -eq 0 ]; then
    echo "✅ Verificación de tipos exitosa!"
    echo ""
    echo "🌐 Iniciando servidor Next.js..."
    echo "   Aplicación: http://localhost:3000"
    echo "   API: http://localhost:3000/api"
    echo "   Presiona Ctrl+C para detener"
    echo ""
    npm run dev
else
    echo "❌ Error en la verificación de tipos. Revisa los errores arriba."
    exit 1
fi

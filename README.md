# 🎄 Festival Navideño - Portal de Reserva de Boletos (Next.js)

Sistema moderno de reserva de boletos para eventos navideños escolares, desarrollado con **Next.js**, TypeScript y Tailwind CSS.

## 🚀 Características

- **Autenticación segura** con número de control y contraseña
- **Gestión de hermanos** automática basada en datos familiares
- **Reserva de asientos** en 4 secciones diferentes:
  - 🥇 Oro ($180.00)
  - 🥈 Plata ($160.00) 
  - 🥉 Bronce Palcos ($120.00)
  - 🎭 Bronce Balcón ($120.00)
- **Control de fechas** por nivel escolar
- **Interfaz moderna** con Tailwind CSS
- **Responsive design** para todos los dispositivos
- **Animaciones navideñas** con copos de nieve ❄️

## 🛠️ Tecnologías

### Full-Stack con Next.js
- **Next.js 15** con App Router
- **TypeScript** para tipado estático
- **Tailwind CSS** para estilos
- **API Routes** para backend
- **MySQL** para base de datos
- **Turbopack** para desarrollo ultra-rápido

### Arquitectura
- **Frontend**: React 19 con Next.js
- **Backend**: API Routes de Next.js
- **Base de datos**: MySQL con mysql2
- **Autenticación**: JWT tokens
- **Estilos**: Tailwind CSS con animaciones personalizadas

## 📋 Requisitos Previos

- Node.js 18+ 
- MySQL 5.7+
- Base de datos existente con las tablas del sistema original

## 🔧 Instalación

1. **Clonar o descargar el proyecto**
```bash
cd /home/sistemam/Escritorio/festival-navideno-reservas
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp config.env.example config.env
# Editar config.env con tus credenciales de base de datos
```

4. **Configurar la base de datos**
Asegúrate de que tu base de datos MySQL tenga las siguientes tablas:
- `alumno`
- `alumno_detalles`
- `alumno_familiar`
- `reservas`
- `datos_facturacion`

## 🚀 Ejecución

### Desarrollo
```bash
# Ejecutar con script automatizado
./start.sh

# O ejecutar manualmente:
npm run dev
```

### Producción
```bash
# Compilar el proyecto
npm run build

# Ejecutar servidor de producción
npm start
```

## 📊 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Autenticación
│   │   └── reservas/      # Sistema de reservas
│   ├── globals.css        # Estilos globales
│   └── page.tsx           # Página principal
├── components/            # Componentes React
│   ├── Dashboard.tsx      # Panel principal
│   ├── LoginForm.tsx      # Formulario de login
│   └── SeatingSection.tsx # Sección de asientos
├── hooks/                 # Hooks personalizados
│   ├── useAuth.ts         # Hook de autenticación
│   └── useReservas.ts     # Hook de reservas
├── lib/                   # Utilidades y modelos
│   ├── models/            # Modelos de datos
│   └── database.ts        # Configuración de BD
└── types/                 # Tipos TypeScript
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión

### Reservas
- `POST /api/reservas/asientos-disponibles` - Obtener asientos disponibles
- `POST /api/reservas/reservas` - Obtener reservas existentes
- `POST /api/reservas/pagos` - Obtener pagos realizados
- `POST /api/reservas/crear-reserva` - Crear nueva reserva

### Salud
- `GET /api/health` - Estado de la API

## 🎯 Funcionalidades Migradas

✅ **Sistema de Login** - Autenticación por número de control  
✅ **Gestión de Hermanos** - Identificación automática por datos familiares  
✅ **Reserva de Asientos** - Todas las 4 secciones implementadas  
✅ **Control de Niveles** - Lógica de fechas por nivel escolar  
✅ **Interfaz de Usuario** - Diseño moderno con Tailwind CSS  
✅ **Animaciones** - Copos de nieve navideños  
✅ **Responsive Design** - Adaptable a todos los dispositivos  

## 🔄 Ventajas de Next.js

### Mejoras Implementadas
- **Aplicación Full-Stack** en un solo framework
- **API Routes** integradas para mejor rendimiento
- **Server-Side Rendering** para mejor SEO
- **Turbopack** para desarrollo ultra-rápido
- **App Router** para mejor organización
- **Optimizaciones automáticas** de imágenes y assets
- **Mejor rendimiento** y experiencia de usuario

### Comparación con React + Express

| Aspecto | React + Express | Next.js |
|---------|-----------------|---------|
| Arquitectura | Separada | Full-Stack integrada |
| API | Express separado | API Routes integradas |
| Rendering | Client-Side | Server + Client Side |
| Desarrollo | Dos servidores | Un servidor |
| SEO | Limitado | Excelente |
| Rendimiento | Bueno | Excelente |
| Mantenimiento | Complejo | Simplificado |

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
- Verificar credenciales en `config.env`
- Asegurar que MySQL esté ejecutándose
- Verificar que las tablas existan

### Error de compilación TypeScript
```bash
npm run type-check
```

### Limpiar caché
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📝 Notas de Desarrollo

- El sistema mantiene la misma lógica de fechas del original
- Los asientos especiales (discapacitados) están implementados
- El sistema de hermanos funciona igual que el original
- Las validaciones de nivel y grado se mantienen
- **Next.js 15** con las últimas características
- **React 19** con mejoras de rendimiento
- **Turbopack** para desarrollo más rápido

## 🤝 Contribución

Para contribuir al proyecto:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto mantiene la misma licencia que el sistema original.

---

**🎄 ¡Disfruta del Festival Navideño con el sistema de reservas más moderno! 🎄**
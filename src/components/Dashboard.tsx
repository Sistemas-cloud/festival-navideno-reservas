'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useReservas } from '@/hooks/useReservas';
import { HermanosData, ComprobanteData, AsientoComprobante } from '@/types';

interface ReservaAPI {
  zona?: string;
  seccion?: string;
  fila: string;
  asiento: number;
  precio: number;
}
import { SeatingSection } from './SeatingSection';
import { ComprobantePDF } from './ComprobantePDF';

export const Dashboard: React.FC = () => {
  const { userData, logout } = useAuth();
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [showComprobante, setShowComprobante] = useState(false);
  const [comprobanteData, setComprobanteData] = useState<ComprobanteData | null>(null);
  
  // Llamar hooks antes de cualquier return condicional
  const { eliminarReserva, loading } = useReservas(userData?.alumnoRef || 0);
  
  // Validar que userData existe antes de acceder a sus propiedades
  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del usuario...</p>
        </div>
      </div>
    );
  }
  
  const hermanos = userData.hermanos;
  const alumnoRef = userData.alumnoRef;
  
  // Debug: Log de datos recibidos
  console.log('🔍 Dashboard Debug - userData:', userData);
  console.log('👥 Dashboard Debug - hermanos:', hermanos);
  console.log('📏 Dashboard Debug - hermanos.length:', hermanos.length);
  console.log('🔍 Dashboard Debug - alumnoRef actual:', alumnoRef);
  
  hermanos.forEach((hermano: HermanosData, index: number) => {
    console.log(`  ${index + 1}. ${hermano.nombre} (Control: ${hermano.control}) - Es el alumno actual? ${hermano.control === alumnoRef}`);
  });

  // Función para eliminar un asiento individual
  const eliminarAsientoIndividual = async (asiento: AsientoComprobante) => {
    try {
      const asientoParaEliminar = [{
        fila: asiento.fila,
        asiento: asiento.asiento
      }];
      
      const success = await eliminarReserva(asientoParaEliminar);
      if (success) {
        // Actualizar el comprobante removiendo el asiento eliminado
        if (comprobanteData) {
          const asientosActualizados = comprobanteData.asientos.filter((a: AsientoComprobante) => 
            !(a.fila === asiento.fila && a.asiento === asiento.asiento)
          );
          
          if (asientosActualizados.length === 0) {
            // Si no quedan asientos, cerrar el modal
            setShowComprobante(false);
            setComprobanteData(null);
          } else {
            // Actualizar el total y los asientos
            const nuevoTotal = asientosActualizados.reduce((sum: number, a: AsientoComprobante) => sum + a.precio, 0);
            setComprobanteData({
              ...comprobanteData,
              asientos: asientosActualizados,
              total: nuevoTotal
            });
          }
        }
      }
    } catch (error) {
      console.error('Error al eliminar asiento:', error);
    }
  };

  // Función para debug de hermanos
  const debugHermanos = async () => {
    try {
      const response = await fetch(`/api/debug/hermanos?alumno_ref=${alumnoRef}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('🔍 DEBUG HERMANOS - Resultado completo:', result.data);
        alert(`Debug completado. Revisa la consola para ver los detalles.\nTotal hermanos: ${result.data.totalHermanos}`);
      } else {
        alert('Error en debug: ' + result.message);
      }
    } catch (error) {
      console.error('Error en debug hermanos:', error);
      alert('Error al hacer debug de hermanos');
    }
  };

  // Función para obtener reservas y mostrar comprobante
  const verMisBoletos = async () => {
    try {
      const response = await fetch(`/api/reservas?alumno_ref=${alumnoRef}`);
      const result = await response.json();
      
      if (result.success && result.data.reservas.length > 0) {
        // Transformar los datos para que coincidan con la interfaz del ComprobantePDF
        const comprobanteData = {
          alumnoNombre: result.data.alumno.nombre,
          alumnoControl: result.data.alumno.control.toString(),
          funcion: result.data.alumno.funcion,
          asientos: result.data.reservas.map((reserva: ReservaAPI) => ({
            seccion: reserva.zona || reserva.seccion,
            fila: reserva.fila,
            asiento: reserva.asiento,
            precio: reserva.precio
          })),
          total: result.data.total,
          fechaReserva: result.data.fechaReserva
        };
        
        setComprobanteData(comprobanteData);
        setShowComprobante(true);
      } else {
        alert('No tienes reservas registradas');
      }
    } catch (error) {
      console.error('Error al obtener reservas:', error);
      alert('Error al obtener tus reservas');
    }
  };

  // Determinar el nivel de cierre basado en el alumno actual
  let levelClose = 1;
  hermanos.forEach((hermano: HermanosData) => {
    if (hermano.control === alumnoRef) {
      let nivel = hermano.nivel;
      const grado = hermano.grado;
      
      if (grado === 5 || grado === 6) {
        nivel = 4;
      }
      levelClose = nivel;
    }
  });

  // Validar fechas cuando se selecciona una sección
  const validateDates = () => {
    const today = new Date();
    const targetDateKinder = new Date("2024-12-5");
    const targetDatePrimaria = new Date("2024-12-5");
    const targetDateSecundaria = new Date("2024-12-5");
    const targetDateAsientos = new Date("2024-12-6");

    if (today >= targetDateAsientos) {
      return true; // Sistema liberado
    } else {
      if (today >= targetDateKinder && levelClose === 2) {
        alert("Las fechas de reservas de boletos han concluido.");
        return false;
      }

      if (today >= targetDatePrimaria && levelClose === 3) {
        alert("Las fechas de reservas de boletos han concluido.");
        return false;
      }

      if (today >= targetDateSecundaria && levelClose === 4) {
        alert("Las fechas de reservas de boletos han concluido.");
        return false;
      }
    }
    return true;
  };

  const renderAlumnosInfo = () => {
    console.log('🔍 renderAlumnosInfo - hermanos originales:', hermanos);
    console.log('🔍 renderAlumnosInfo - hermanos originales length:', hermanos.length);
    
    const hermanosFiltrados = hermanos.filter(hermano => hermano.control !== 22222 && hermano.control !== 33333 && hermano.control !== 44444);
    console.log('🔍 renderAlumnosInfo - hermanos filtrados:', hermanosFiltrados);
    console.log('🔍 renderAlumnosInfo - hermanos filtrados length:', hermanosFiltrados.length);
    
    // Verificar si hay duplicados por control
    const controlesUnicos = new Set(hermanosFiltrados.map(h => h.control));
    console.log('🔍 renderAlumnosInfo - controles únicos:', Array.from(controlesUnicos));
    console.log('🔍 renderAlumnosInfo - hay duplicados?', controlesUnicos.size !== hermanosFiltrados.length);
    
    // Eliminar duplicados por control (mantener solo la primera ocurrencia)
    const hermanosSinDuplicados = hermanosFiltrados.filter((hermano, index, self) => {
      const firstIndex = self.findIndex(h => h.control === hermano.control);
      const isDuplicate = index !== firstIndex;
      if (isDuplicate) {
        console.log(`🔍 renderAlumnosInfo - DUPLICADO DETECTADO: ${hermano.nombre} (Control: ${hermano.control}) - Index: ${index}, FirstIndex: ${firstIndex}`);
      }
      return index === firstIndex;
    });
    console.log('🔍 renderAlumnosInfo - hermanos sin duplicados:', hermanosSinDuplicados);
    console.log('🔍 renderAlumnosInfo - hermanos sin duplicados length:', hermanosSinDuplicados.length);
    
    return hermanosSinDuplicados.map((hermano: HermanosData, index: number) => {
      console.log(`🔍 renderAlumnosInfo - Procesando hermano ${index}:`, hermano);
        let aluNivel = "";
        let nivel = hermano.nivel;
        const grado = hermano.grado;

        switch (nivel) {
          case 1:
            aluNivel = "1ra Función";
            break;
          case 2:
            aluNivel = "1ra Función";
            break;
          case 3:
            aluNivel = "2da Función";
            break;
          case 4:
            aluNivel = "3ra Función";
            break;
          default:
            aluNivel = "Nivel desconocido";
        }

        if (grado === 5 || grado === 6) {
          aluNivel = "3ra Función";
          nivel = 4;
        }

        return (
          <div key={`hermano-${hermano.control}`} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {hermano.control.toString().slice(-2)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{hermano.nombre}</p>
                <p className="text-sm text-gray-600">Control: {hermano.control}</p>
                <p className="text-sm text-blue-600 font-medium">{aluNivel}</p>
              </div>
            </div>
          </div>
        );
      });
  };

  if (selectedSection > 0) {
    return (
      <SeatingSection 
        section={selectedSection} 
        alumnoRef={alumnoRef}
        alumnoNombre={hermanos.find(h => h.control === alumnoRef)?.nombre || ''}
        onBack={() => setSelectedSection(0)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Profesional */}
      <nav className="bg-gradient-to-r from-slate-800/95 via-slate-700/95 to-slate-800/95 backdrop-blur-xl shadow-2xl border-b border-slate-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-red-500 rounded-xl flex items-center justify-center shadow-xl border border-white/10">
                <span className="text-white font-bold text-xl">🎄</span>
              </div>
          <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-red-400 bg-clip-text text-transparent tracking-tight">
                  Festival Navideño
                </h1>
                <p className="text-sm text-slate-300 font-medium">Portal de Reservas 2024</p>
              </div>
          </div>
          <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {hermanos.find(h => h.control === alumnoRef)?.nombre || 'Usuario'}
                </p>
                <p className="text-xs text-slate-400 font-mono">#{alumnoRef}</p>
              </div>
            <button
              onClick={logout}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl border border-slate-500/30 hover:border-slate-400/50"
            >
                Cerrar Sesión
            </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">
            ¡Bienvenido al <span className="bg-gradient-to-r from-emerald-400 to-red-400 bg-clip-text text-transparent">Festival Navideño!</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Selecciona tu sección preferida y reserva tus boletos para una experiencia inolvidable
          </p>
        </div>

        {/* Cards de Secciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Sección Oro */}
          <div 
            className="group relative bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 rounded-3xl p-8 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl transition-all duration-500 border border-amber-400/20 hover:border-amber-300/40"
            onClick={() => {
              if (validateDates()) {
                setSelectedSection(1);
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-yellow-600/10 rounded-3xl group-hover:from-amber-300/20 group-hover:to-yellow-500/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl border border-white/10">
                  <span className="text-3xl">👑</span>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Desde</p>
                  <p className="text-white font-bold text-3xl">$180</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-2xl mb-3 tracking-tight">ZONA ORO</h3>
              <p className="text-white/90 text-sm leading-relaxed mb-6">Vista premium del escenario con comodidades exclusivas</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white/90 text-sm">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                  Disponible
                </div>
                <div className="text-white/60 text-xs font-medium">Premium</div>
              </div>
            </div>
          </div>

          {/* Sección Plata */}
          <div 
            className="group relative bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 rounded-3xl p-8 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl transition-all duration-500 border border-slate-400/20 hover:border-slate-300/40"
            onClick={() => {
              if (validateDates()) {
                setSelectedSection(2);
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-400/10 to-slate-700/10 rounded-3xl group-hover:from-slate-300/20 group-hover:to-slate-600/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl border border-white/10">
                  <span className="text-3xl">🥈</span>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Desde</p>
                  <p className="text-white font-bold text-3xl">$160</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-2xl mb-3 tracking-tight">ZONA PLATA</h3>
              <p className="text-white/90 text-sm leading-relaxed mb-6">Excelente vista y comodidad para toda la familia</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white/90 text-sm">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                  Disponible
                </div>
                <div className="text-white/60 text-xs font-medium">Estándar</div>
              </div>
            </div>
          </div>

          {/* Sección Bronce Palcos */}
          <div 
            className="group relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-3xl p-8 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl transition-all duration-500 border border-orange-400/20 hover:border-orange-300/40"
            onClick={() => {
              if (validateDates()) {
                setSelectedSection(3);
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-red-600/10 rounded-3xl group-hover:from-orange-300/20 group-hover:to-red-500/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl border border-white/10">
                  <span className="text-3xl">🏛️</span>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Desde</p>
                  <p className="text-white font-bold text-3xl">$120</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-2xl mb-3 tracking-tight">BRONCE PALCOS</h3>
              <p className="text-white/90 text-sm leading-relaxed mb-6">Vista lateral privilegiada con ambiente íntimo</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white/90 text-sm">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                  Disponible
                </div>
                <div className="text-white/60 text-xs font-medium">Económico</div>
              </div>
            </div>
          </div>

          {/* Sección Bronce Balcón */}
          <div 
            className="group relative bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-700 rounded-3xl p-8 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl transition-all duration-500 border border-amber-400/20 hover:border-amber-300/40"
            onClick={() => {
              if (validateDates()) {
                setSelectedSection(4);
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-yellow-700/10 rounded-3xl group-hover:from-amber-300/20 group-hover:to-yellow-600/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl border border-white/10">
                  <span className="text-3xl">🏛️</span>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Desde</p>
                  <p className="text-white font-bold text-3xl">$120</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-2xl mb-3 tracking-tight">BRONCE BALCÓN</h3>
              <p className="text-white/90 text-sm leading-relaxed mb-6">Vista elevada panorámica con perspectiva única</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white/90 text-sm">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                  Disponible
                </div>
                <div className="text-white/60 text-xs font-medium">Económico</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Ver Mis Boletos */}
        <div className="text-center mb-8">
          <button 
            onClick={verMisBoletos}
            className="px-12 py-4 bg-gradient-to-r from-emerald-600 to-red-600 text-white font-bold rounded-2xl hover:from-emerald-700 hover:to-red-700 transform hover:scale-[1.02] transition-all duration-300 shadow-2xl hover:shadow-3xl border border-white/10 hover:border-white/20 text-lg"
          >
            <span className="flex items-center space-x-3">
              <span>🎫</span>
              <span>Ver Mis Boletos</span>
              <span>🎁</span>
            </span>
          </button>
        </div>

        {/* Botón Debug Hermanos (temporal) */}
        <div className="text-center mb-16">
          <button 
            onClick={debugHermanos}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl border border-white/10 hover:border-white/20 text-sm"
          >
            <span className="flex items-center space-x-2">
              <span>🔍</span>
              <span>Debug Hermanos</span>
            </span>
          </button>
        </div>

        {/* Información de Alumnos */}
        <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-slate-200/50 mb-16">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-3 tracking-tight flex items-center justify-center gap-3">
              <span className="text-4xl">👥</span>
              <span className="bg-gradient-to-r from-emerald-600 to-red-600 bg-clip-text text-transparent">Tu Familia</span>
            </h3>
            <p className="text-slate-600 text-lg">Información de alumnos y hermanos registrados</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderAlumnosInfo()}
          </div>
        </div>

        {/* Escenario Preview */}
        <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-slate-200/50">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-3 tracking-tight flex items-center justify-center gap-3">
              <span className="text-4xl">🎪</span>
              <span className="bg-gradient-to-r from-emerald-600 to-red-600 bg-clip-text text-transparent">Nuestro Escenario</span>
            </h3>
            <p className="text-slate-600 text-lg">Prepárate para una experiencia mágica navideña</p>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
                  <Image 
                    src="/escenario.png" 
                    alt="Escenario del Festival Navideño" 
                    width={800}
                    height={256}
                    className="w-full h-64 object-cover transform hover:scale-105 transition-transform duration-500"
                  />
            <div className="absolute bottom-4 left-4 z-20">
              <h4 className="text-white font-bold text-lg">TECHNO XMAS ESCENARIO</h4>
              <p className="text-white/90 text-sm">Una experiencia visual única</p>
            </div>
            </div>
          </div>
        </div>

      {/* Copos de nieve animados */}
      {Array.from({ length: 15 }, (_, i) => (
        <div 
          key={i} 
          className="snowflake fixed text-blue-200 pointer-events-none"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        >
            ❄
          </div>
        ))}

      {/* Modal de Comprobante PDF */}
      {showComprobante && comprobanteData && (
        <ComprobantePDF
          data={comprobanteData}
          onClose={() => {
            setShowComprobante(false);
            setComprobanteData(null);
          }}
          onEliminarAsiento={eliminarAsientoIndividual}
          loading={loading}
        />
      )}
    </div>
  );
};

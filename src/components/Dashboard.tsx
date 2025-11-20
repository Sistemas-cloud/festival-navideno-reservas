'use client';

import { useState, useEffect } from 'react';
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
import { PaymentDateModal } from './PaymentDateModal';

export const Dashboard: React.FC = () => {
  const { userData, logout } = useAuth();
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [showComprobante, setShowComprobante] = useState(false);
  const [comprobanteData, setComprobanteData] = useState<ComprobanteData | null>(null);
  const [showPaymentModalDelete, setShowPaymentModalDelete] = useState(false);
  const [asientoAEliminar, setAsientoAEliminar] = useState<AsientoComprobante | null>(null);
  const [alumnoNivel, setAlumnoNivel] = useState<number>(1);
  
  // Llamar hooks antes de cualquier return condicional
  const { eliminarReserva, loading } = useReservas(userData?.alumnoRef || 0);
  
  // Determinar el nivel del alumno para el modal de fecha de pago
  // Este hook debe estar ANTES del return condicional
  useEffect(() => {
    if (userData?.hermanos && userData?.alumnoRef) {
      const hermanos = userData.hermanos;
      const alumnoRef = userData.alumnoRef;
      const alumnoActual = hermanos.find((h: HermanosData) => String(h.control) === String(alumnoRef));
      if (alumnoActual) {
        setAlumnoNivel(alumnoActual.nivel);
      }
    }
  }, [userData?.hermanos, userData?.alumnoRef]);
  
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

  // Función para iniciar el proceso de eliminación (abre el modal)
  const iniciarEliminacion = (asiento: AsientoComprobante) => {
    setAsientoAEliminar(asiento);
    setShowPaymentModalDelete(true);
  };

  // Función para confirmar eliminación después de seleccionar fecha
  const confirmarEliminacionConFecha = async (fechaPago: string) => {
    if (!asientoAEliminar) return;

    try {
      const asientoParaEliminar = [{
        fila: asientoAEliminar.fila,
        asiento: asientoAEliminar.asiento
      }];
      
      const success = await eliminarReserva(asientoParaEliminar, fechaPago);
      if (success) {
        // Actualizar el comprobante removiendo el asiento eliminado
        if (comprobanteData) {
          const asientosActualizados = comprobanteData.asientos.filter((a: AsientoComprobante) => 
            !(a.fila === asientoAEliminar.fila && a.asiento === asientoAEliminar.asiento)
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
      
      // Cerrar el modal
      setShowPaymentModalDelete(false);
      setAsientoAEliminar(null);
    } catch (error) {
      console.error('Error al eliminar asiento:', error);
      setShowPaymentModalDelete(false);
      setAsientoAEliminar(null);
    }
  };

  // Función anterior (mantener para compatibilidad, pero ahora llama a iniciarEliminacion)
  const eliminarAsientoIndividual = (asiento: AsientoComprobante) => {
    iniciarEliminacion(asiento);
  };

  // La función de debug de hermanos se ha eliminado para limpiar el código.

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
          fechaReserva: result.data.fechaReserva,
          fechaPago: result.data.fechaPago
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

  // Determinar la función del alumno para el cierre del portal
  // Si es usuario interno, usar función asignada directamente
  // Reglas:
  // - Función 1: Nivel 1 (maternal) + Nivel 2 (kinder) + Nivel 3 Grado 1 (1° primaria)
  // - Función 2: Nivel 3 Grados 2-5 (2°-5° primaria)
  // - Función 3: Nivel 3 Grado 6 (6° primaria) + Nivel 4 (secundaria)
  let levelClose = 1;
  
  // Si es usuario interno, usar función asignada directamente
  if (userData.isInternal && userData.funcionAsignada) {
    levelClose = userData.funcionAsignada;
  } else {
    // Lógica normal para alumnos
    hermanos.forEach((hermano: HermanosData) => {
      if (hermano.control === alumnoRef) {
        const nivel = hermano.nivel;
        const grado = hermano.grado;
        
        if (nivel === 1 || nivel === 2) {
          // Maternal (nivel 1) y Kinder (nivel 2) → Función 1
          levelClose = 1;
        } else if (nivel === 3) {
          // Primaria
          if (grado === 1) {
            // 1° primaria → Función 1
            levelClose = 1;
          } else if (grado >= 2 && grado <= 5) {
            // 2°-5° primaria → Función 2
            levelClose = 2;
          } else if (grado === 6) {
            // 6° primaria → Función 3
            levelClose = 3;
          } else {
            // Por defecto → Función 1
            levelClose = 1;
          }
        } else if (nivel === 4) {
          // Secundaria → Función 3
          levelClose = 3;
        }
      }
    });
  }

  // Función helper para obtener la fecha actual en hora de Monterrey (compatible con cliente)
  const getTodayInMonterrey = (): Date => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Monterrey',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayStr = formatter.format(now); // Formato: YYYY-MM-DD
    const [year, month, day] = todayStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Función helper para parsear fecha string a Date (solo día, sin hora)
  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Validar fechas cuando se selecciona una sección
  // El sistema se cierra INICIANDO el segundo día de venta para cada nivel
  // Los usuarios pueden eliminar asientos pero no pueden reservar nuevos después del cierre
  // Los usuarios internos nunca están bloqueados por fechas
  // Usa hora de Monterrey para todas las comparaciones
  const validateDates = () => {
    // Usuarios internos siempre pueden reservar
    if (userData.isInternal) {
      return true;
    }
    
    const today = getTodayInMonterrey();

    // Fechas de cierre (iniciando el segundo día de venta) - usando hora de Monterrey
    const fechaCierreKinder = parseDateString("2025-12-02"); // Cierra iniciando el 2 de dic (vende 1 y 2 de dic)
    const fechaCierrePrimaria = parseDateString("2025-12-05"); // Cierra iniciando el 5 de dic (vende 4 y 5 de dic)
    const fechaCierreSecundaria = parseDateString("2025-12-09"); // Cierra iniciando el 9 de dic (vende 8 y 9 de dic)

    // Validar según la función del alumno
    if (levelClose === 1) {
      // Función 1: Maternal + Kinder + 1° primaria
      // Vende: 1-2 diciembre, Cierra: iniciando el 2 de diciembre
      if (today >= fechaCierreKinder) {
        alert("Las reservas de boletos para la 1ra Función ya han concluido. El período de venta terminó el 2 de diciembre. Aún puedes eliminar asientos si lo necesitas.");
        return false;
      }
    } else if (levelClose === 2) {
      // Función 2: 2°-5° primaria
      // Vende: 4-5 diciembre, Cierra: iniciando el 5 de diciembre
      if (today >= fechaCierrePrimaria) {
        alert("Las reservas de boletos para la 2da Función ya han concluido. El período de venta terminó el 5 de diciembre. Aún puedes eliminar asientos si lo necesitas.");
        return false;
      }
    } else if (levelClose === 3) {
      // Función 3: 6° primaria + Secundaria
      // Vende: 8-9 diciembre, Cierra: iniciando el 9 de diciembre
      if (today >= fechaCierreSecundaria) {
        alert("Las reservas de boletos para la 3ra Función ya han concluido. El período de venta terminó el 9 de diciembre. Aún puedes eliminar asientos si lo necesitas.");
        return false;
      }
    }

    return true;
  };

  const renderAlumnosInfo = () => {
    const hermanosFiltrados = hermanos.filter(hermano => hermano.control !== 22222 && hermano.control !== 33333 && hermano.control !== 44444);
    const controlesUnicos = new Set(hermanosFiltrados.map(h => h.control));
    
    // Eliminar duplicados por control (mantener solo la primera ocurrencia)
    const hermanosSinDuplicados = hermanosFiltrados.filter((hermano, index, self) => {
      const firstIndex = self.findIndex(h => h.control === hermano.control);
      return index === firstIndex;
    });
    
    return hermanosSinDuplicados.map((hermano: HermanosData, index: number) => {
        let aluNivel = "";
        
        // Si es usuario interno, usar función asignada directamente
        if (userData.isInternal && hermano.control === alumnoRef) {
          const nombresFunciones: { [key: number]: string } = {
            1: '1ra Función',
            2: '2da Función',
            3: '3ra Función'
          };
          aluNivel = nombresFunciones[userData.funcionAsignada || 1] || 'Función';
        } else {
          // Lógica normal para alumnos
          const nivel = hermano.nivel;
          const grado = hermano.grado;

          // Determinar función según las nuevas reglas:
          // - Función 1: Nivel 1 (maternal) + Nivel 2 (kinder) + Nivel 3 Grado 1 (1° primaria)
          // - Función 2: Nivel 3 Grados 2-5 (2°-5° primaria)
          // - Función 3: Nivel 3 Grado 6 (6° primaria) + Nivel 4 (secundaria)
          if (nivel === 1 || nivel === 2) {
            // Maternal (nivel 1) y Kinder (nivel 2) → Función 1
            aluNivel = "1ra Función";
          } else if (nivel === 3) {
            // Primaria
            if (grado === 1) {
              aluNivel = "1ra Función"; // 1° primaria → Función 1
            } else if (grado >= 2 && grado <= 5) {
              aluNivel = "2da Función"; // 2°-5° primaria → Función 2
            } else if (grado === 6) {
              aluNivel = "3ra Función"; // 6° primaria → Función 3
            } else {
              aluNivel = "1ra Función"; // Por defecto
            }
          } else if (nivel === 4) {
            // Secundaria → Función 3
            aluNivel = "3ra Función";
          } else {
            aluNivel = "Nivel desconocido";
          }
        }

        // Determinar si es el alumno actual (convertir ambos a string para comparación)
        const esAlumnoActual = String(hermano.control) === String(alumnoRef);

        return (
          <div 
            key={`hermano-${hermano.control}`} 
            className={`bg-white/80 backdrop-blur-sm border rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300 ${
              esAlumnoActual 
                ? 'border-blue-500 border-2 bg-blue-50/80' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                esAlumnoActual
                  ? 'bg-gradient-to-r from-blue-600 to-purple-700 ring-2 ring-blue-400'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
              }`}>
                {hermano.control.toString().slice(-2)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{hermano.nombre}</p>
                  {esAlumnoActual && (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                      Tú
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">Control: {hermano.control}</p>
                <p className="text-sm font-semibold text-blue-600">{aluNivel}</p>
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
        alumnoNombre={hermanos.find(h => String(h.control) === String(alumnoRef))?.nombre || ''}
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
                <p className="text-sm text-slate-300 font-medium">Portal de Reservas 2025</p>
              </div>
          </div>
          <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">
                    {hermanos.find(h => String(h.control) === String(alumnoRef))?.nombre || 'Usuario'}
                  </p>
                  {userData.isInternal && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg border border-purple-400/30">
                      🔐 ADMIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">#{alumnoRef}</p>
                <p className="text-xs font-bold text-emerald-400 mt-1">
                  {(() => {
                    // Si es usuario interno, usar función asignada directamente
                    if (userData.isInternal && userData.funcionAsignada) {
                      const nombresFunciones: { [key: number]: string } = {
                        1: '🎭 1ra Función',
                        2: '🎭 2da Función',
                        3: '🎭 3ra Función'
                      };
                      return nombresFunciones[userData.funcionAsignada] || '🎭 Función';
                    }
                    
                    // Convertir ambos a string para comparación (control puede ser string, alumnoRef puede ser número)
                    const alumnoActual = hermanos.find(h => String(h.control) === String(alumnoRef));
                    if (!alumnoActual) {
                      return '';
                    }
                    const nivel = alumnoActual.nivel;
                    const grado = alumnoActual.grado;
                    if (nivel === 1 || nivel === 2) {
                      return '🎭 1ra Función';
                    } else if (nivel === 3) {
                      if (grado === 1) return '🎭 1ra Función';
                      if (grado >= 2 && grado <= 5) return '🎭 2da Función';
                      if (grado === 6) return '🎭 3ra Función';
                      return '🎭 1ra Función';
                    } else if (nivel === 4) {
                      return '🎭 3ra Función';
                    }
                    return '';
                  })()}
                </p>
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
                  <p className="text-white font-bold text-3xl">$200</p>
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
                  <p className="text-white font-bold text-3xl">$180</p>
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
                  <p className="text-white font-bold text-3xl">$140</p>
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
                  <p className="text-white font-bold text-3xl">$140</p>
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

        {/* Botón de debug de hermanos eliminado para limpiar la interfaz en producción */}

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

      {/* Modal de Fecha de Pago para Eliminación */}
      {showPaymentModalDelete && (
        <PaymentDateModal
          isOpen={showPaymentModalDelete}
          onClose={() => {
            setShowPaymentModalDelete(false);
            setAsientoAEliminar(null);
          }}
          onConfirm={confirmarEliminacionConFecha}
          nivel={alumnoNivel}
          familiaNumber={alumnoRef % 100} // Usar módulo 100 del control como número de familia aproximado
          alumnoRef={alumnoRef}
        />
      )}
    </div>
  );
};

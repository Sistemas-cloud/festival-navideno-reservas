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
    return hermanos
      .filter(hermano => hermano.control !== 22222 && hermano.control !== 33333 && hermano.control !== 44444)
      .map((hermano: HermanosData, index: number) => {
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
          <div key={index} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Moderno */}
      <nav className="bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🎫</span>
              </div>
          <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Festival Navideño
                </h1>
                <p className="text-sm text-gray-500">Portal de Reservas</p>
              </div>
          </div>
          <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">
                  {hermanos.find(h => h.control === alumnoRef)?.nombre || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500">#{alumnoRef}</p>
              </div>
            <button
              onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
                Cerrar Sesión
            </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            ¡Bienvenido al <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Festival Navideño!</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Selecciona tu sección preferida y reserva tus boletos para una experiencia inolvidable
          </p>
        </div>

        {/* Cards de Secciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Sección Oro */}
          <div 
            className="group relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl p-6 cursor-pointer transform hover:scale-105 hover:shadow-2xl transition-all duration-300"
            onClick={() => {
              if (validateDates()) {
                setSelectedSection(1);
              }
            }}
          >
            <div className="absolute inset-0 bg-black/10 rounded-2xl group-hover:bg-black/20 transition-all duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👑</span>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm">Desde</p>
                  <p className="text-white font-bold text-2xl">$180</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">ZONA ORO</h3>
              <p className="text-white/90 text-sm">Vista premium del escenario</p>
              <div className="mt-4 flex items-center text-white/80 text-sm">
                <span className="w-2 h-2 bg-white/60 rounded-full mr-2"></span>
                Disponible
              </div>
            </div>
          </div>

          {/* Sección Plata */}
          <div 
            className="group relative bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 rounded-2xl p-6 cursor-pointer transform hover:scale-105 hover:shadow-2xl transition-all duration-300"
            onClick={() => {
              if (validateDates()) {
                setSelectedSection(2);
              }
            }}
          >
            <div className="absolute inset-0 bg-black/10 rounded-2xl group-hover:bg-black/20 transition-all duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🥈</span>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm">Desde</p>
                  <p className="text-white font-bold text-2xl">$160</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">ZONA PLATA</h3>
              <p className="text-white/90 text-sm">Excelente vista y comodidad</p>
              <div className="mt-4 flex items-center text-white/80 text-sm">
                <span className="w-2 h-2 bg-white/60 rounded-full mr-2"></span>
                Disponible
              </div>
            </div>
          </div>

          {/* Sección Bronce Palcos */}
          <div 
            className="group relative bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-2xl p-6 cursor-pointer transform hover:scale-105 hover:shadow-2xl transition-all duration-300"
            onClick={() => {
              if (validateDates()) {
                setSelectedSection(3);
              }
            }}
          >
            <div className="absolute inset-0 bg-black/10 rounded-2xl group-hover:bg-black/20 transition-all duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🏛️</span>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm">Desde</p>
                  <p className="text-white font-bold text-2xl">$120</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">BRONCE PALCOS</h3>
              <p className="text-white/90 text-sm">Vista lateral privilegiada</p>
              <div className="mt-4 flex items-center text-white/80 text-sm">
                <span className="w-2 h-2 bg-white/60 rounded-full mr-2"></span>
                Disponible
              </div>
            </div>
          </div>

          {/* Sección Bronce Balcón */}
          <div 
            className="group relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-6 cursor-pointer transform hover:scale-105 hover:shadow-2xl transition-all duration-300"
            onClick={() => {
              if (validateDates()) {
                setSelectedSection(4);
              }
            }}
          >
            <div className="absolute inset-0 bg-black/10 rounded-2xl group-hover:bg-black/20 transition-all duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🏛️</span>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm">Desde</p>
                  <p className="text-white font-bold text-2xl">$120</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">BRONCE BALCÓN</h3>
              <p className="text-white/90 text-sm">Vista elevada panorámica</p>
              <div className="mt-4 flex items-center text-white/80 text-sm">
                <span className="w-2 h-2 bg-white/60 rounded-full mr-2"></span>
                Disponible
              </div>
            </div>
          </div>
        </div>

        {/* Botón Ver Mis Boletos */}
        <div className="text-center mb-12">
          <button 
            onClick={verMisBoletos}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <span className="flex items-center space-x-2">
              <span>🎫</span>
              <span>Ver Mis Boletos</span>
            </span>
          </button>
        </div>

        {/* Información de Alumnos */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200 mb-12">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">👨‍👩‍👧‍👦 Tu Familia</h3>
            <p className="text-gray-600">Información de alumnos y hermanos registrados</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderAlumnosInfo()}
          </div>
        </div>

        {/* Escenario Preview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">🎭 Nuestro Escenario</h3>
            <p className="text-gray-600">Prepárate para una experiencia mágica</p>
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

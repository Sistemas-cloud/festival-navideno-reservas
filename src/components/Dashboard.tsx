'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { HermanosData } from '@/types';
import { SeatingSection } from './SeatingSection';

export const Dashboard: React.FC = () => {
  const { userData, logout } = useAuth();
  const [selectedSection, setSelectedSection] = useState<number>(0);

  if (!userData) {
    return <div>Cargando...</div>;
  }

  const hermanos = userData.hermanos;
  const alumnoRef = userData.alumnoRef;

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
          <div key={index} className="bg-gray-100 border-2 border-blue-500 rounded-2xl p-4 mb-2">
            <p><strong>Nombre:</strong> {hermano.nombre}</p>
            <p><strong>No° de Control:</strong> {hermano.control}</p>
            <p><strong>Nivel para la función:</strong> {aluNivel}</p>
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-blue-800 text-white p-4 rounded-lg m-2">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Portal de Reserva de Boletos</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {alumnoRef} - {hermanos.find(h => h.control === alumnoRef)?.nombre || 'Usuario'}
            </span>
            <button
              onClick={logout}
              className="px-3 py-1 text-sm border-none rounded-lg cursor-pointer transition-colors duration-200 bg-red-600 text-white hover:bg-red-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-4">
        {/* Imágenes de secciones */}
        <div className="flex justify-center space-x-4 mb-6">
          <img src="/costos.png" alt="Costos" className="w-48 h-16 object-contain" />
          <img src="/oro.png" alt="Oro" className="w-48 h-16 object-contain" />
          <img src="/plata.png" alt="Plata" className="w-48 h-16 object-contain" />
          <img src="/bronce.png" alt="Bronce" className="w-48 h-16 object-contain" />
        </div>

        {/* Selector de sección */}
        <div className="text-center mb-6">
          <label htmlFor="seccion" className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona la Sección
          </label>
          <select
            id="seccion"
            value={selectedSection}
            onChange={(e) => {
              const section = parseInt(e.target.value);
              if (section > 0 && validateDates()) {
                setSelectedSection(section);
              }
            }}
            className="w-64 px-4 py-2 border-2 border-gray-300 rounded-full text-blue-600 focus:outline-none focus:border-blue-500"
          >
            <option value={0}>Seleccionar sección</option>
            <option value={1}>Oro</option>
            <option value={2}>Plata</option>
            <option value={3}>Bronce (Palcos)</option>
            <option value={4}>Bronce (Balcón)</option>
          </select>
        </div>

        {/* Botón para ver boletos */}
        <div className="text-center mb-6">
          <button className="px-6 py-2 text-base border-none rounded-lg cursor-pointer transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700">
            VER MIS BOLETOS
          </button>
        </div>

        {/* Información de hermanos */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-center mb-4">Alumno y hermanos:</h3>
          <div className="space-y-2">
            {renderAlumnosInfo()}
          </div>
        </div>

        {/* Carrusel de imágenes */}
        <div className="mt-8">
          <div className="bg-gradient-to-b from-blue-500 to-blue-800 rounded-lg p-4 mx-auto max-w-4xl">
            <div className="carousel-container relative w-full h-96">
              <div className="carousel-inner relative overflow-hidden h-full">
                <div className="carousel-item active">
                  <img 
                    src="/escenario.png" 
                    alt="Escenario" 
                    className="carousel-image w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copos de nieve */}
        {Array.from({ length: 19 }, (_, i) => (
          <div key={i} className="snowflake">
            ❄
          </div>
        ))}
      </div>
    </div>
  );
};

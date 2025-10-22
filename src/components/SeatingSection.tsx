'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useReservas } from '@/hooks/useReservas';
import { Asiento, SectionConfig } from '@/types';

interface SeatingSectionProps {
  section: number;
  alumnoRef: number;
  alumnoNombre: string;
  onBack: () => void;
}

const sectionConfigs: { [key: number]: SectionConfig } = {
  1: { // Oro - Disposición en abanico con escenario arriba
    name: 'ORO',
    color: 'oro',
    price: 180.00,
    rows: { 
      A: 10,  // Fila más cercana al escenario (arriba)
      B: 19,  // Segunda fila
      C: 27,  // Tercera fila
      D: 31,  // Cuarta fila
      E: 33,  // Quinta fila
      F: 35,  // Sexta fila
      G: 39,  // Séptima fila
      H: 41,  // Octava fila
      I: 43   // Fila más alejada del escenario (abajo)
    },
    disabledSeats: []
  },
  2: { // Plata
    name: 'PLATA',
    color: 'plata',
    price: 160.00,
    rows: { J: 31, K: 37, L: 37, M: 37, N: 37, O: 37, P: 37, Q: 45, R: 45, S: 45, T: 45, U: 45, V: 39, W: 42 },
    disabledSeats: [
      { row: 'J', seat: 1 }, { row: 'J', seat: 2 }, { row: 'J', seat: 3 }, { row: 'J', seat: 4 }, { row: 'J', seat: 5 },
      { row: 'J', seat: 27 }, { row: 'J', seat: 28 }, { row: 'J', seat: 29 }, { row: 'J', seat: 30 }, { row: 'J', seat: 31 }
    ]
  },
  3: { // Bronce Palcos
    name: 'BRONCE (PALCOS)',
    color: 'bronce',
    price: 120.00,
    rows: { II: 5, HH: 12, JJ: 12, KK: 5 },
    specialLayout: true
  },
  4: { // Bronce Balcón
    name: 'BRONCE (BALCÓN)',
    color: 'bronce',
    price: 120.00,
    rows: { II: 5, HH: 12, JJ: 12, KK: 5 },
    specialLayout: true
  }
};

export const SeatingSection: React.FC<SeatingSectionProps> = ({ 
  section, 
  alumnoRef, 
  alumnoNombre, 
  onBack 
}) => {
  const config = sectionConfigs[section];
  const { asientosDisponibles, reservas, pagos, loading, crearReserva } = useReservas(alumnoRef);
  const [selectedSeats, setSelectedSeats] = useState<Asiento[]>([]);
  const [availableSeats, setAvailableSeats] = useState(asientosDisponibles);

  useEffect(() => {
    setAvailableSeats(asientosDisponibles);
  }, [asientosDisponibles]);

  // Centrar el scroll horizontal al cargar
  useEffect(() => {
    const container = document.querySelector('.seating-container');
    if (container) {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const centerScroll = (scrollWidth - clientWidth) / 2;
      container.scrollLeft = centerScroll;
    }
  }, [section]);

  const today = new Date();
  const targetAsientos = new Date("2024-12-06");
  const finalAvailableSeats = today >= targetAsientos ? availableSeats + 5 : availableSeats;

  const isSeatDisabled = (row: string, seat: number): boolean => {
    return config.disabledSeats?.some(ds => ds.row === row && ds.seat === seat) || false;
  };

  const isSeatReserved = (row: string, seat: number): boolean => {
    return reservas.some(r => r.fila === row && r.asiento === seat);
  };

  const isSeatPaid = (row: string, seat: number): boolean => {
    return pagos.some(p => p.fila === row && p.asiento === seat);
  };

  const isSeatSelected = (row: string, seat: number): boolean => {
    return selectedSeats.some(s => s.fila === row && s.asiento === seat);
  };

  const handleSeatClick = (row: string, seat: number) => {
    if (isSeatReserved(row, seat) || isSeatPaid(row, seat) || isSeatDisabled(row, seat)) {
      return;
    }

    const seatInfo: Asiento = { fila: row, asiento: seat };

    if (isSeatSelected(row, seat)) {
      // Deseleccionar asiento
      setSelectedSeats(prev => prev.filter(s => !(s.fila === row && s.asiento === seat)));
      setAvailableSeats(prev => prev + 1);
    } else {
      // Seleccionar asiento
      if (finalAvailableSeats > 0) {
        setSelectedSeats(prev => [...prev, seatInfo]);
        setAvailableSeats(prev => prev - 1);
      } else {
        alert('Máximo de boletos reservados.');
      }
    }
  };

  const getSeatClass = (row: string, seat: number): string => {
    let classes = 'relative w-6 h-6 inline-flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-300 transform hover:scale-110 rounded shadow-md border';
    
    if (isSeatPaid(row, seat)) {
      classes += ' bg-gray-800 text-white border-gray-600 cursor-not-allowed shadow-lg';
    } else if (isSeatReserved(row, seat)) {
      classes += ' bg-red-500 text-white border-red-600 cursor-not-allowed shadow-lg';
    } else if (isSeatSelected(row, seat)) {
      classes += ' bg-blue-500 text-white border-blue-600 shadow-lg scale-105';
    } else if (isSeatDisabled(row, seat)) {
      classes += ' bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed';
    } else {
      // Asientos disponibles con colores temáticos
      if (config.color === 'oro') {
        classes += ' bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-500 hover:from-yellow-500 hover:to-yellow-700 hover:shadow-lg';
      } else if (config.color === 'plata') {
        classes += ' bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 border-gray-400 hover:from-gray-400 hover:to-gray-600 hover:shadow-lg';
      } else {
        classes += ' bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100 border-amber-600 hover:from-amber-600 hover:to-amber-800 hover:shadow-lg';
      }
    }

    return classes;
  };

  const handleConfirmReservation = async () => {
    if (selectedSeats.length === 0) {
      alert('No has seleccionado ningún asiento.');
      return;
    }

    if (confirm(`¿Confirma la reserva de boletos en esta sección? No habrá cambios en los asientos que hayas reservado.`)) {
      const hermanosData = JSON.parse(localStorage.getItem('userData') || '[]');
      const success = await crearReserva(selectedSeats, hermanosData.hermanos, config.price, config.name);
      
      if (success) {
        setSelectedSeats([]);
        alert('Reserva realizada exitosamente');
        // Aquí se podría abrir el modal del PDF
      }
    }
  };

  const renderSpecialLayout = () => {
    const leftRows = ['II', 'HH'];
    const rightRows = ['JJ', 'KK'];

    return (
      <div className="flex justify-center space-x-8">
        <div className="left-container">
          <h3 className="text-center mb-4 font-bold text-lg">Palcos izquierda</h3>
          {leftRows.map(row => (
            <div key={row} className="row mb-2">
              {Array.from({ length: config.rows[row] }, (_, i) => i + 1).map(seat => (
                <div
                  key={`${row}${seat}`}
                  className={getSeatClass(row, seat)}
                  onClick={() => handleSeatClick(row, seat)}
                >
                  {`${row}${seat}`}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        <div className="right-container">
          <h3 className="text-center mb-4 font-bold text-lg">Palcos derecha</h3>
          {rightRows.map(row => (
            <div key={row} className="row mb-2">
              {Array.from({ length: config.rows[row] }, (_, i) => i + 1).map(seat => (
                <div
                  key={`${row}${seat}`}
                  className={getSeatClass(row, seat)}
                  onClick={() => handleSeatClick(row, seat)}
                >
                  {`${row}${seat}`}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNormalLayout = () => {
    // Para la sección ORO, asegurar el orden correcto de las filas (A a I, donde A está más cerca del escenario)
    const orderedRows = section === 1 
      ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] 
      : Object.keys(config.rows);

    return (
      <div className="seating-container w-full overflow-x-auto overflow-y-visible">
        <div className="seating flex flex-col items-center px-4 py-4" style={{ minWidth: '1400px', margin: '0 auto' }}>
          {orderedRows.map((row) => {
            const seatCount = config.rows[row];
            if (!seatCount) return null;
            
            return (
              <div key={row} className="row mb-2 flex justify-center items-center gap-1" style={{ minWidth: '1200px' }}>
                {Array.from({ length: seatCount }, (_, i) => i + 1).map(seat => {
                  const shouldAddSpace = 
                    (row === 'J' && seat === 6) || (row === 'J' && seat === 27) ||
                    ((row >= 'K' && row <= 'P') && seat === 9) || ((row >= 'K' && row <= 'P') && seat === 30) ||
                    ((row >= 'Q' && row <= 'U') && seat === 13) || ((row >= 'Q' && row <= 'U') && seat === 34) ||
                    (row === 'V' && seat === 12) || (row === 'V' && seat === 28) ||
                    (row === 'W' && seat === 14) || (row === 'W' && seat === 30);

                  return (
                    <React.Fragment key={seat}>
                      <div
                        className={getSeatClass(row, seat)}
                        onClick={() => handleSeatClick(row, seat)}
                        style={{ minWidth: '24px', minHeight: '24px' }}
                      >
                        {`${row}${seat}`}
                      </div>
                      {shouldAddSpace && <div className="w-12 inline-block"></div>}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Moderno */}
      <div className="bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={onBack} 
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
              >
                <span>←</span>
                <span>Volver</span>
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Sección: {config.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {alumnoNombre} - #{alumnoRef}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">
                  Asientos disponibles
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {finalAvailableSeats}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout principal - Responsive */}
      <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen">
        {/* Contenido principal - Mapa de asientos */}
        <div className="flex-1 overflow-y-auto lg:overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Hero Section con Escenario */}
            <div className="text-center mb-8">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl mb-6">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                <Image 
                  src="/escenario.png" 
                  alt="Escenario del Festival Navideño" 
                  width={800}
                  height={192}
                  className="w-full h-48 object-cover transform hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-4 left-4 z-20">
                  <h2 className="text-white font-bold text-xl mb-1">TECHNO XMAS ESCENARIO</h2>
                  <p className="text-white/90 text-xs">Vista desde tu sección</p>
                </div>
              </div>
            </div>

            {/* Mapa de asientos */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200">
              <div className="text-center mb-6">
                <h2 className={`text-2xl font-bold mb-2 ${
                  config.color === 'oro' 
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent' 
                    : config.color === 'plata' 
                    ? 'bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent' 
                    : 'bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent'
                }`}>
                  SECCIÓN: {config.name}
                </h2>
                <p className="text-gray-600">Selecciona tus asientos preferidos</p>
              </div>
              
              {/* Leyenda de asientos */}
              <div className="flex justify-center mb-6">
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded border border-yellow-500"></div>
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded border border-blue-600"></div>
                    <span>Seleccionado</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded border border-red-600"></div>
                    <span>Reservado</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-800 rounded border border-gray-600"></div>
                    <span>Pagado</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-300 rounded border border-gray-400"></div>
                    <span>No disponible</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                {config.specialLayout ? renderSpecialLayout() : renderNormalLayout()}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Resumen de selección (responsive) */}
        <div className="w-full lg:w-80 bg-white/95 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col">
          <div className="p-4 sm:p-6 flex-1 flex flex-col">
            {selectedSeats.length > 0 ? (
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🎫</span>
                  Resumen de tu Selección
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Asientos seleccionados</p>
                    <p className="text-lg font-semibold text-blue-800 break-words">
                      {selectedSeats.map(s => `${s.fila}${s.asiento}`).join(', ')}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total a pagar</p>
                    <p className="text-2xl font-bold text-green-800">
                      ${(selectedSeats.length * config.price).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Boletos disponibles</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {finalAvailableSeats} restantes
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleConfirmReservation}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Procesando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <span>✅</span>
                      <span>Confirmar Reserva</span>
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎭</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Selecciona tus asientos</h3>
                <p className="text-gray-500 text-sm mb-6">Haz clic en los asientos disponibles para seleccionarlos</p>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Boletos disponibles</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {finalAvailableSeats} restantes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copos de nieve animados */}
      {Array.from({ length: 15 }, (_, i) => (
        <div 
          key={i} 
          className="snowflake fixed text-blue-200/60 pointer-events-none z-0"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};

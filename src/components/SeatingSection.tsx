'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useReservas } from '@/hooks/useReservas';
import { Asiento, SectionConfig, HermanosData } from '@/types';
import { PaymentDateModal } from './PaymentDateModal';

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
    price: 200.00,
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
    price: 180.00,
    rows: { J: 31, K: 37, L: 37, M: 37, N: 37, O: 37, P: 37, Q: 45, R: 45, S: 45, T: 45, U: 45, V: 39, W: 42 },
    disabledSeats: [
      { row: 'J', seat: 1 }, { row: 'J', seat: 2 }, { row: 'J', seat: 3 }, { row: 'J', seat: 4 }, { row: 'J', seat: 5 },
      { row: 'J', seat: 27 }, { row: 'J', seat: 28 }, { row: 'J', seat: 29 }, { row: 'J', seat: 30 }, { row: 'J', seat: 31 }
    ]
  },
  3: { // Bronce Palcos
    name: 'BRONCE (PALCOS)',
    color: 'bronce',
    price: 140.00,
    rows: { II: 5, HH: 12, JJ: 12, KK: 5 },
    specialLayout: true
  },
  4: { // Bronce Balcón
    name: 'BRONCE (BALCÓN)',
    color: 'bronce',
    price: 140.00,
    rows: { AA: 39, BB: 39, CC: 39, DD: 39, EE: 45, FF: 43, GG: 42 },
    disabledSeats: [
      { row: 'AA', seat: 18 }, { row: 'AA', seat: 19 }, { row: 'AA', seat: 20 }, { row: 'AA', seat: 21 }, { row: 'AA', seat: 22 }, { row: 'AA', seat: 23 },
      { row: 'BB', seat: 18 }, { row: 'BB', seat: 19 }, { row: 'BB', seat: 20 }, { row: 'BB', seat: 21 }, { row: 'BB', seat: 22 }, { row: 'BB', seat: 23 },
      { row: 'CC', seat: 18 }, { row: 'CC', seat: 19 }, { row: 'CC', seat: 20 }, { row: 'CC', seat: 21 }, { row: 'CC', seat: 22 }, { row: 'CC', seat: 23 }
    ]
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [alumnoNivel, setAlumnoNivel] = useState<number>(1);
  
  // Log cuando cambia el nivel
  useEffect(() => {
    console.log('🚨 SeatingSection - NIVEL ACTUALIZADO:', alumnoNivel);
  }, [alumnoNivel]);

  useEffect(() => {
    setAvailableSeats(asientosDisponibles);
  }, [asientosDisponibles]);

  // Determinar el nivel del alumno (o función para usuarios internos)
  useEffect(() => {
    console.log('🚨 SeatingSection useEffect - INICIANDO DETERMINACIÓN DE NIVEL');
    console.log('🚨 SeatingSection useEffect - alumnoRef recibido:', alumnoRef);
    
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    console.log('🚨 SeatingSection useEffect - userData completo:', userData);
    console.log('🚨 SeatingSection useEffect - userData.isInternal:', userData.isInternal);
    console.log('🚨 SeatingSection useEffect - userData.funcionAsignada:', userData.funcionAsignada);
    console.log('🚨 SeatingSection useEffect - userData.hermanos:', userData.hermanos);
    
    // Si es usuario interno, usar función asignada directamente
    if (userData.isInternal && userData.funcionAsignada) {
      console.log('🔐 SeatingSection - Usuario interno detectado');
      console.log('🎭 SeatingSection - Función asignada:', userData.funcionAsignada);
      // Para usuarios internos, mapear función a nivel educativo para PaymentDateModal:
      // Función 1 → Nivel 1 (fechas: 1-2 dic)
      // Función 2 → Nivel 2 (fechas: 4-5 dic) 
      // Función 3 → Nivel 4 (fechas: 8-9 dic)
      const nivelMapeado = userData.funcionAsignada === 3 ? 4 : userData.funcionAsignada;
      console.log('🔐 SeatingSection - Nivel mapeado para PaymentDateModal:', nivelMapeado);
      setAlumnoNivel(nivelMapeado);
      return;
    }
    
    // Lógica normal para alumnos
    const hermanos = userData.hermanos || [];
    console.log('🚨 SeatingSection useEffect - hermanos array:', hermanos);
    console.log('🚨 SeatingSection useEffect - hermanos length:', hermanos.length);
    
    // Convertir ambos a string para comparación (alumnoRef puede ser número, control puede ser string)
    const alumnoActual = hermanos.find((h: HermanosData) => String(h.control) === String(alumnoRef));
    console.log('🚨 SeatingSection useEffect - alumnoActual encontrado:', alumnoActual);
    
    if (alumnoActual) {
      console.log('🔍 SeatingSection useEffect - Nivel encontrado:', alumnoActual.nivel);
      console.log('🚨 SeatingSection useEffect - ESTABLECIENDO NIVEL:', alumnoActual.nivel);
      
      // TEMPORAL: Forzar nivel 4 si es secundaria para debug
      if (alumnoActual.nivel === 4) {
        console.log('🚨 SeatingSection useEffect - FORZANDO NIVEL 4 PARA SECUNDARIA');
        setAlumnoNivel(4);
      } else {
        setAlumnoNivel(alumnoActual.nivel);
      }
    } else {
      console.log('🔍 SeatingSection useEffect - Alumno no encontrado, usando nivel 1 por defecto');
      console.log('🚨 SeatingSection useEffect - ESTABLECIENDO NIVEL POR DEFECTO: 1');
      console.log('🚨 SeatingSection useEffect - DEBUG: Buscando control', alumnoRef, 'en hermanos:', hermanos.map((h: HermanosData) => h.control));
      setAlumnoNivel(1);
    }
  }, [alumnoRef]);

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
  const targetAsientos = new Date("2025-12-06");
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
    const baseTextSize = config.name === 'BRONCE (BALCÓN)' ? 'text-[10px]' : 'text-xs';
    let classes = `relative w-6 h-6 inline-flex items-center justify-center ${baseTextSize} font-bold cursor-pointer transition-all duration-300 transform hover:scale-110 rounded shadow-md border`;
    
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

  // Estados para el modal de fecha de pago (ya declarado arriba)

  const handleConfirmReservation = async () => {
    if (selectedSeats.length === 0) {
      alert('No has seleccionado ningún asiento.');
      return;
    }

    // Mostrar modal de fecha de pago en lugar de confirmar directamente
    setShowPaymentModal(true);
  };

  const handlePaymentDateConfirm = async (selectedDate: string) => {
    setShowPaymentModal(false);

    if (confirm(`¿Confirma la reserva de boletos en esta sección? No habrá cambios en los asientos que hayas reservado.`)) {
      const hermanosData = JSON.parse(localStorage.getItem('userData') || '[]');
      
      const success = await crearReserva(selectedSeats, hermanosData.hermanos, config.price, config.name, selectedDate);
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Profesional */}
      <div className="bg-gradient-to-r from-slate-800/95 via-slate-700/95 to-slate-800/95 backdrop-blur-xl shadow-2xl border-b border-slate-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={onBack} 
                className="flex items-center space-x-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl border border-slate-500/30 hover:border-slate-400/50"
              >
                <span>←</span>
                <span>Volver</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-red-400 bg-clip-text text-transparent tracking-tight">
                  Sección: {config.name}
                </h1>
                <p className="text-sm text-slate-300 font-medium">
                  {alumnoNombre} - #{alumnoRef}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  Asientos disponibles
                </p>
                <p className="text-2xl font-bold text-emerald-400">
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
                  src="/banner.png" 
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
            <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl border border-slate-200/50">
              <div className="text-center mb-8">
                <h2 className={`text-3xl font-bold mb-3 tracking-tight ${
                  config.color === 'oro' 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent' 
                    : config.color === 'plata' 
                    ? 'bg-gradient-to-r from-slate-500 to-slate-700 bg-clip-text text-transparent' 
                    : 'bg-gradient-to-r from-orange-500 to-amber-700 bg-clip-text text-transparent'
                }`}>
                  SECCIÓN: {config.name}
                </h2>
                <p className="text-slate-600 text-lg">Selecciona tus asientos preferidos</p>
              </div>
              
              {/* Leyenda de asientos */}
              <div className="flex justify-center mb-8">
                <div className="bg-slate-100/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-200/50">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gradient-to-br from-amber-400 to-yellow-600 rounded border border-amber-500 shadow-sm"></div>
                      <span className="font-medium text-slate-700">Disponible</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded border border-blue-600 shadow-sm"></div>
                      <span className="font-medium text-slate-700">Seleccionado</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-500 rounded border border-red-600 shadow-sm"></div>
                      <span className="font-medium text-slate-700">Reservado</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-slate-800 rounded border border-slate-600 shadow-sm"></div>
                      <span className="font-medium text-slate-700">Pagado</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-slate-300 rounded border border-slate-400 shadow-sm"></div>
                      <span className="font-medium text-slate-700">No disponible</span>
                    </div>
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
        <div className="w-full lg:w-80 bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-slate-200/50 flex flex-col shadow-2xl">
          <div className="p-4 sm:p-6 flex-1 flex flex-col">
            {selectedSeats.length > 0 ? (
              <div className="flex flex-col">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-red-600 bg-clip-text text-transparent mb-6 flex items-center justify-center gap-3">
                  <span className="text-3xl">🎫</span>
                  <span>Resumen de tu Selección</span>
                </h3>
                
                <div className="space-y-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 shadow-lg border border-blue-200/50">
                    <p className="text-sm text-slate-600 mb-3 font-medium">Asientos seleccionados</p>
                    <p className="text-lg font-bold text-blue-800 break-words">
                      {selectedSeats.map(s => `${s.fila}${s.asiento}`).join(', ')}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-6 shadow-lg border border-emerald-200/50">
                    <p className="text-sm text-slate-600 mb-2 font-medium">Total a pagar</p>
                    <p className="text-3xl font-bold text-emerald-800">
                      ${(selectedSeats.length * config.price).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 shadow-lg border border-slate-200/50">
                    <p className="text-sm text-slate-600 mb-2 font-medium">Boletos disponibles</p>
                    <p className="text-xl font-bold text-slate-800">
                      {finalAvailableSeats} restantes
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleConfirmReservation}
                  disabled={loading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-red-600 text-white font-bold rounded-2xl hover:from-emerald-700 hover:to-red-700 transform hover:scale-[1.02] transition-all duration-300 shadow-2xl hover:shadow-3xl border border-white/10 hover:border-white/20 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-slate-200/50">
                  <span className="text-3xl">🎪</span>
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-3">Selecciona tus asientos</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">Haz clic en los asientos disponibles para seleccionarlos</p>
                
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 shadow-lg border border-slate-200/50">
                  <p className="text-sm text-slate-600 mb-2 font-medium">Boletos disponibles</p>
                  <p className="text-2xl font-bold text-slate-800">
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

      {/* Modal de selección de fecha de pago */}
        <PaymentDateModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handlePaymentDateConfirm}
          nivel={alumnoNivel}
          familiaNumber={alumnoRef % 100}
          alumnoRef={alumnoRef}
        />
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { useReservas } from '@/hooks/useReservas';
import { Asiento, SectionConfig } from '@/types';

interface SeatingSectionProps {
  section: number;
  alumnoRef: number;
  alumnoNombre: string;
  onBack: () => void;
}

const sectionConfigs: { [key: number]: SectionConfig } = {
  1: { // Oro
    name: 'ORO',
    color: 'oro',
    price: 180.00,
    rows: { A: 19, B: 25, C: 27, D: 31, E: 33, F: 35, G: 39, H: 41, I: 43 },
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
    let classes = 'w-6 h-6 m-0.5 border border-black inline-block text-center leading-6 text-xs cursor-pointer transition-all duration-200';
    
    if (isSeatPaid(row, seat)) {
      classes += ' bg-black text-white cursor-not-allowed';
    } else if (isSeatReserved(row, seat)) {
      classes += ' bg-red-600 text-white cursor-not-allowed';
    } else if (isSeatSelected(row, seat)) {
      classes += ' bg-blue-600 text-white';
    } else if (isSeatDisabled(row, seat)) {
      classes += ' bg-sky-400';
    } else {
      classes += ` ${config.color === 'oro' ? 'bg-yellow-400' : config.color === 'plata' ? 'bg-gray-400' : 'bg-amber-600'}`;
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
    return (
      <div className="seating flex flex-col items-center">
        {Object.entries(config.rows).map(([row, seatCount]) => (
          <div key={row} className="row mb-1">
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
                  >
                    {`${row}${seat}`}
                  </div>
                  {shouldAddSpace && <div className="w-10 inline-block"></div>}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-800 text-white p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Sección: {config.name}</h1>
          <button onClick={onBack} className="px-4 py-2 text-base border-none rounded-lg cursor-pointer transition-colors duration-200 bg-red-600 text-white hover:bg-red-700">
            Volver a secciones
          </button>
        </div>
        <p className="text-sm mt-2">
          {alumnoNombre} - {alumnoRef}
        </p>
      </div>

      <div className="container mx-auto p-4">
        {/* Imagen del escenario */}
        <div className="flex justify-center mb-6">
          <img src="/escenario.png" alt="Escenario" className="w-full max-w-2xl h-48 object-cover rounded-lg" />
        </div>

        {/* Contador de asientos disponibles */}
        <div className="text-center mb-4">
          <p className="text-lg font-semibold">
            Asientos disponibles: {finalAvailableSeats}
          </p>
        </div>

        {/* Mapa de asientos */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className={`text-center text-3xl font-bold mb-6 ${config.color === 'oro' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900' : config.color === 'plata' ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900' : 'bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100'}`}>
            SECCIÓN: {config.name}
          </h2>
          
          {config.specialLayout ? renderSpecialLayout() : renderNormalLayout()}
        </div>

        {/* Botón de confirmación */}
        <div className="text-center">
          <button
            onClick={handleConfirmReservation}
            disabled={loading || selectedSeats.length === 0}
            className="px-8 py-3 text-lg border-none rounded-lg cursor-pointer transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : 'Reservar en esta sección'}
          </button>
        </div>

        {/* Información de asientos seleccionados */}
        {selectedSeats.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold">
              Asientos seleccionados: {selectedSeats.map(s => `${s.fila}${s.asiento}`).join(', ')}
            </p>
            <p className="text-lg font-semibold">
              Total: ${(selectedSeats.length * config.price).toFixed(2)}
            </p>
          </div>
        )}

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

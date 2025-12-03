'use client';

import React, { useState, useEffect } from 'react';
import { useReservas } from '@/hooks/useReservas';
import { SectionConfig } from '@/types';

interface ChangeSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newSeat: { fila: string; asiento: number }) => void;
  currentSeat: { fila: string; asiento: number; seccion: string; precio: number };
  alumnoRef: number;
  alumnoNombre: string;
}

// Configuración de secciones (misma que en SeatingSection)
const sectionConfigs: { [key: number]: SectionConfig } = {
  1: {
    name: 'ORO',
    color: 'oro',
    price: 200.00,
    rows: { A: 19, B: 25, C: 27, D: 31, E: 33, F: 35, G: 39, H: 41, I: 43 },
    disabledSeats: []
  },
  2: {
    name: 'PLATA',
    color: 'plata',
    price: 180.00,
    rows: { J: 31, K: 37, L: 37, M: 37, N: 37, O: 37, P: 37, Q: 45, R: 45, S: 45, T: 45, U: 45, V: 39, W: 42 },
    accessibleSeats: [
      { row: 'J', seat: 1 }, { row: 'J', seat: 2 }, { row: 'J', seat: 3 }, { row: 'J', seat: 4 }, { row: 'J', seat: 5 },
      { row: 'J', seat: 27 }, { row: 'J', seat: 28 }, { row: 'J', seat: 29 }, { row: 'J', seat: 30 }, { row: 'J', seat: 31 }
    ]
  },
  3: {
    name: 'BRONCE (PALCOS)',
    color: 'bronce',
    price: 140.00,
    rows: { II: 5, HH: 12, JJ: 12, KK: 5 },
    specialLayout: true
  },
  4: {
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

// Función para determinar la sección basada en la fila y precio
function getSectionFromSeat(fila: string, precio: number): number {
  const filaUpper = fila.toUpperCase();
  
  // ORO: Filas A-I, precio 200
  if (precio === 200 || ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].includes(filaUpper)) {
    return 1;
  }
  
  // PLATA: Filas J-W, precio 180
  if (precio === 180 || ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].includes(filaUpper)) {
    return 2;
  }
  
  // BRONCE PALCOS: Filas II, HH, JJ, KK, precio 140
  if (precio === 140 && ['II', 'HH', 'JJ', 'KK'].includes(filaUpper)) {
    return 3;
  }
  
  // BRONCE BALCÓN: Filas AA-GG, precio 140
  if (precio === 140 && ['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG'].includes(filaUpper)) {
    return 4;
  }
  
  // Por defecto, intentar por precio
  if (precio === 200) return 1;
  if (precio === 180) return 2;
  if (precio === 140) return 3; // Default a PALCOS si no se puede determinar
  
  return 1; // Default a ORO
}

export const ChangeSeatModal: React.FC<ChangeSeatModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentSeat,
  alumnoRef,
  alumnoNombre
}) => {
  const { reservas, pagos, loading } = useReservas(alumnoRef);
  const [selectedSeat, setSelectedSeat] = useState<{ fila: string; asiento: number } | null>(null);
  
  const sectionNumber = getSectionFromSeat(currentSeat.fila, currentSeat.precio);
  const config = sectionConfigs[sectionNumber];

  useEffect(() => {
    if (!isOpen) {
      setSelectedSeat(null);
    }
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const isSeatDisabled = (row: string, seat: number): boolean => {
    return config.disabledSeats?.some(ds => ds.row === row && ds.seat === seat) || false;
  };

  const isSeatAccessible = (row: string, seat: number): boolean => {
    return config.accessibleSeats?.some(ds => ds.row === row && ds.seat === seat) || false;
  };

  const isSeatReserved = (row: string, seat: number): boolean => {
    return reservas.some(r => r.fila === row && r.asiento === seat);
  };

  const isSeatPaid = (row: string, seat: number): boolean => {
    return pagos.some(p => p.fila === row && p.asiento === seat);
  };

  const isCurrentSeat = (row: string, seat: number): boolean => {
    return row === currentSeat.fila && seat === currentSeat.asiento;
  };

  const isSeatSelected = (row: string, seat: number): boolean => {
    return selectedSeat?.fila === row && selectedSeat?.asiento === seat;
  };

  const handleSeatClick = (row: string, seat: number) => {
    if (isSeatReserved(row, seat) || isSeatPaid(row, seat) || isSeatDisabled(row, seat) || isCurrentSeat(row, seat)) {
      return;
    }

    if (isSeatAccessible(row, seat)) {
      const shouldContinue = confirm('Este asiento está reservado para personas con discapacidad. ¿Deseas continuar con la selección?');
      if (!shouldContinue) {
        return;
      }
    }

    setSelectedSeat({ fila: row, asiento: seat });
  };

  const getSeatClass = (row: string, seat: number): string => {
    const baseTextSize = config.name === 'BRONCE (BALCÓN)' ? 'text-[10px]' : 'text-xs';
    let classes = `relative w-6 h-6 inline-flex items-center justify-center ${baseTextSize} font-bold cursor-pointer transition-all duration-300 transform hover:scale-110 rounded shadow-md border`;
    
    if (isCurrentSeat(row, seat)) {
      classes += ' bg-purple-500 text-white border-purple-600 cursor-not-allowed shadow-lg ring-2 ring-purple-300';
    } else if (isSeatPaid(row, seat)) {
      classes += ' bg-gray-800 text-white border-gray-600 cursor-not-allowed shadow-lg';
    } else if (isSeatReserved(row, seat)) {
      classes += ' bg-red-500 text-white border-red-600 cursor-not-allowed shadow-lg';
    } else if (isSeatSelected(row, seat)) {
      classes += ' bg-blue-500 text-white border-blue-600 shadow-lg scale-105';
    } else if (isSeatAccessible(row, seat)) {
      classes += ' bg-blue-200 text-blue-900 border-blue-400 ring-2 ring-blue-300/60';
    } else if (isSeatDisabled(row, seat)) {
      classes += ' bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed';
    } else {
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

  const handleConfirm = () => {
    if (selectedSeat) {
      onConfirm(selectedSeat);
    }
  };

  const renderSpecialLayout = () => {
    const leftRows = ['II', 'HH'];
    const rightRows = ['KK', 'JJ'];

    return (
      <div className="flex justify-center space-x-8">
        <div className="flex flex-col items-end">
          {leftRows.map(row => (
            <div key={row} className="row mb-2">
              <div className="text-xs text-gray-600 mb-1 text-right">Fila {row}</div>
              <div className="flex flex-nowrap gap-1 justify-end">
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
            </div>
          ))}
        </div>
        
        <div className="flex flex-col items-start">
          {rightRows.map(row => (
            <div key={row} className="row mb-2">
              <div className="text-xs text-gray-600 mb-1 text-left">Fila {row}</div>
              <div className="flex flex-nowrap gap-1 justify-start">
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
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNormalLayout = () => {
    const orderedRows = sectionNumber === 1 
      ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] 
      : Object.keys(config.rows);

    return (
      <div className="w-full overflow-x-auto overflow-y-visible">
        <div className="flex flex-col items-center px-4 py-4" style={{ minWidth: '1400px', margin: '0 auto' }}>
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? 'block' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Cambiar Asiento</h2>
              <p className="text-sm text-gray-600 mt-1">
                Cambiar de {currentSeat.fila}{currentSeat.asiento} a otro asiento disponible en {config.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <div className="flex flex-wrap gap-4 text-sm bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded border border-purple-600 shadow-sm"></div>
                <span className="font-medium text-gray-700">Asiento actual</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded border border-blue-600 shadow-sm"></div>
                <span className="font-medium text-gray-700">Seleccionado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded border border-red-600 shadow-sm"></div>
                <span className="font-medium text-gray-700">Reservado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-800 rounded border border-gray-600 shadow-sm"></div>
                <span className="font-medium text-gray-700">Pagado</span>
              </div>
              <div className="flex items-center space-x-2">
                {config.color === 'oro' ? (
                  <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded border border-yellow-500 shadow-sm"></div>
                ) : config.color === 'plata' ? (
                  <div className="w-4 h-4 bg-gradient-to-br from-gray-300 to-gray-500 rounded border border-gray-400 shadow-sm"></div>
                ) : (
                  <div className="w-4 h-4 bg-gradient-to-br from-amber-500 to-amber-700 rounded border border-amber-600 shadow-sm"></div>
                )}
                <span className="font-medium text-gray-700">Disponible</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            {config.specialLayout ? renderSpecialLayout() : renderNormalLayout()}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              {selectedSeat ? (
                <p className="text-sm text-gray-600">
                  Nuevo asiento seleccionado: <span className="font-bold text-blue-600">{selectedSeat.fila}{selectedSeat.asiento}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-500">Selecciona un asiento disponible para cambiar</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedSeat || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : 'Confirmar Cambio'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


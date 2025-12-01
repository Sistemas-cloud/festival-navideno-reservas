'use client';

import React from 'react';

type Ocupacion = {
  fila: string;
  asiento: number;
  estado: 'reservado' | 'pagado';
  referencia?: number;
  zona?: string;
};

interface AdminSeatMapProps {
  section: number; // 1: Oro, 2: Plata, 3: Bronce Palcos, 4: Bronce Balcón
  ocupados: Ocupacion[];
  resaltados?: { fila: string; asiento: number; color?: 'blue' | 'orange' }[];
}

const sectionConfigs: Record<number, {
  name: string;
  color: 'oro' | 'plata' | 'bronce';
  rows: Record<string, number>;
  accessibleSeats?: Array<{ row: string; seat: number }>;
  disabledSeats?: Array<{ row: string; seat: number }>;
  specialLayout?: boolean;
}> = {
  1: { name: 'ORO', color: 'oro', rows: { A: 19, B: 25, C: 27, D: 31, E: 33, F: 35, G: 39, H: 41, I: 43 } },
  2: { name: 'PLATA', color: 'plata', rows: { J: 31, K: 37, L: 37, M: 37, N: 37, O: 37, P: 37, Q: 45, R: 45, S: 45, T: 45, U: 45, V: 39, W: 42 }, accessibleSeats: [ { row: 'J', seat: 1 }, { row: 'J', seat: 2 }, { row: 'J', seat: 3 }, { row: 'J', seat: 4 }, { row: 'J', seat: 5 }, { row: 'J', seat: 27 }, { row: 'J', seat: 28 }, { row: 'J', seat: 29 }, { row: 'J', seat: 30 }, { row: 'J', seat: 31 } ] },
  3: { name: 'BRONCE (PALCOS)', color: 'bronce', rows: { II: 5, HH: 12, JJ: 12, KK: 5 }, specialLayout: true },
  4: { 
    name: 'BRONCE (BALCÓN)', 
    color: 'bronce', 
    rows: { AA: 39, BB: 39, CC: 39, DD: 39, EE: 45, FF: 43, GG: 42 },
    disabledSeats: [
      { row: 'AA', seat: 18 }, { row: 'AA', seat: 19 }, { row: 'AA', seat: 20 }, { row: 'AA', seat: 21 }, { row: 'AA', seat: 22 }, { row: 'AA', seat: 23 },
      { row: 'BB', seat: 18 }, { row: 'BB', seat: 19 }, { row: 'BB', seat: 20 }, { row: 'BB', seat: 21 }, { row: 'BB', seat: 22 }, { row: 'BB', seat: 23 },
      { row: 'CC', seat: 18 }, { row: 'CC', seat: 19 }, { row: 'CC', seat: 20 }, { row: 'CC', seat: 21 }, { row: 'CC', seat: 22 }, { row: 'CC', seat: 23 }
    ]
  },
};

export const AdminSeatMap: React.FC<AdminSeatMapProps> = ({ section, ocupados, resaltados = [] }) => {
  const config = sectionConfigs[section];

  const isSeatDisabled = (row: string, seat: number): boolean => {
    return config.disabledSeats?.some(ds => ds.row === row && ds.seat === seat) || false;
  };

  const isSeatAccessible = (row: string, seat: number): boolean => {
    return config.accessibleSeats?.some(ds => ds.row === row && ds.seat === seat) || false;
  };

  const findOcupacion = (row: string, seat: number): Ocupacion | undefined => {
    return ocupados.find(o => o.fila === row && o.asiento === seat);
  };

  const getSeatClass = (row: string, seat: number): string => {
    const baseTextSize = config.name === 'BRONCE (BALCÓN)' ? 'text-[10px]' : 'text-xs';
    let classes = `relative w-6 h-6 inline-flex items-center justify-center ${baseTextSize} font-bold cursor-pointer transition-all duration-300 transform hover:scale-110 rounded shadow-md border`;

    const oc = findOcupacion(row, seat);
    const isDisabled = isSeatDisabled(row, seat);
    const isResaltado = resaltados.some(r => r.fila === row && r.asiento === seat);
    const highlight = resaltados.find(r => r.fila === row && r.asiento === seat);

    if (isDisabled) {
      classes += ' bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed';
    } else if (oc?.estado === 'pagado') {
      classes += ' bg-gray-800 text-white border-gray-600 cursor-not-allowed shadow-lg';
    } else if (oc?.estado === 'reservado') {
      classes += ' bg-red-500 text-white border-red-600 cursor-not-allowed shadow-lg';
    } else if (isSeatAccessible(row, seat)) {
      classes += ' bg-blue-200 text-blue-900 border-blue-400 ring-2 ring-blue-300/60';
    } else {
      if (config.color === 'oro') {
        classes += ' bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-500 hover:from-yellow-500 hover:to-yellow-700 hover:shadow-lg';
      } else if (config.color === 'plata') {
        classes += ' bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 border-gray-400 hover:from-gray-400 hover:to-gray-600 hover:shadow-lg';
      } else {
        classes += ' bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100 border-amber-600 hover:from-amber-600 hover:to-amber-800 hover:shadow-lg';
      }
    }

    if (isResaltado) {
      if (highlight?.color === 'orange') {
        // Color naranja/ámbar vibrante con aura
        classes += ' bg-gradient-to-br from-amber-400 to-orange-500 text-white border-orange-400';
        classes += ' seat-aura-orange';
      } else {
        // Color índigo/púrpura vibrante con aura
        classes += ' bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-purple-400';
        classes += ' seat-aura-purple';
      }
    }

    return classes;
  };

  return (
    <div className="border rounded-2xl p-4 bg-white shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Mapa: {config.name}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-800 font-medium">
          <span className="inline-flex items-center"><span className="w-3.5 h-3.5 inline-block bg-gray-800 rounded mr-2 border border-gray-900/50" />Pagado</span>
          <span className="inline-flex items-center"><span className="w-3.5 h-3.5 inline-block bg-red-500 rounded mr-2 border border-red-600/60" />Reservado</span>
          <span className="inline-flex items-center"><span className="w-3.5 h-3.5 inline-block bg-blue-200 rounded mr-2 border border-blue-400 ring-2 ring-blue-300/60" />Accesible (PCD)</span>
          <span className="inline-flex items-center"><span className="w-3.5 h-3.5 inline-block bg-green-400 rounded mr-2 border border-green-500/60" />Disponible</span>
          <span className="inline-flex items-center"><span className="w-3.5 h-3.5 inline-block bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded mr-2 border border-purple-400 shadow-md" />Canje (Mayor)</span>
          <span className="inline-flex items-center"><span className="w-3.5 h-3.5 inline-block bg-gradient-to-br from-amber-400 to-orange-500 rounded mr-2 border border-orange-400 shadow-md" />Canje (Menor)</span>
        </div>
      </div>
      <div className="overflow-auto seating-container mx-auto w-full">
        {Object.entries(config.rows).map(([row, count]) => (
          <div key={row} className="mb-2">
            <div className="text-xs text-gray-600 mb-1 text-center">Fila {row}</div>
            <div className="flex flex-nowrap gap-1 justify-center overflow-x-auto">
              {Array.from({ length: count }, (_, i) => i + 1).map(seat => {
                const isResaltado = resaltados.some(r => r.fila === row && r.asiento === seat);
                return (
                  <div key={`${row}-${seat}`} className={getSeatClass(row, seat)}>
                    <span className={`relative z-10 ${isResaltado ? 'drop-shadow-md' : ''}`}>{seat}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



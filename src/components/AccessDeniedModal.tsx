'use client';

import { useEffect, useState } from 'react';

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaApertura: string;
  nombreFuncion: string;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  onClose,
  fechaApertura,
  nombreFuncion
}) => {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Actualizar la fecha/hora actual cada segundo
      const updateDateTime = () => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('es-MX', {
          timeZone: 'America/Monterrey',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        setCurrentDateTime(formatter.format(now));
      };

      updateDateTime();
      const interval = setInterval(updateDateTime, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Formatear la fecha de apertura
  const formatOpeningDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Monterrey'
    });
  };

  const fechaAperturaFormateada = formatOpeningDate(fechaApertura);

  // Determinar la hora de apertura según la función
  // Funciones 2 y 3: 8:00 PM, Función 1: 12:00 AM (medianoche)
  const horaApertura = nombreFuncion.includes('2da') || nombreFuncion.includes('3ra') 
    ? '8:00 PM' 
    : '12:00 AM (medianoche)';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🚫</div>
              <div>
                <h2 className="text-2xl font-bold">Acceso Denegado</h2>
                <p className="text-red-100 text-sm">Portal temporalmente cerrado</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 transition-colors text-2xl font-bold"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-gray-700 text-lg mb-4">
              El sistema de reservas aún no está disponible para la{' '}
              <span className="font-bold text-blue-600">{nombreFuncion}</span>.
            </p>
          </div>

          {/* Fecha de apertura */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">📅</div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Fecha de Apertura:</p>
                <p className="text-xl font-bold text-blue-700">
                  {fechaAperturaFormateada}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  A las {horaApertura} hora de Monterrey
                </p>
              </div>
            </div>
          </div>

          {/* Fecha y hora actual */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🕐</div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Fecha y Hora Actual (Monterrey):</p>
                <p className="text-lg font-semibold text-gray-800">
                  {currentDateTime || 'Cargando...'}
                </p>
              </div>
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div className="flex-1">
                <p className="text-sm text-yellow-800">
                  Por favor, intenta nuevamente a partir de la fecha de apertura indicada arriba.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};


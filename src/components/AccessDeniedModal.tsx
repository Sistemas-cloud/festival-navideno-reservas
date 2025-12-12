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

  if (!isOpen) return null;

  // Fecha del evento
  const fechaEvento = '16 de diciembre de 2025';

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
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🎄</div>
              <div>
                <h2 className="text-2xl font-bold">¡Gracias por tu Reserva!</h2>
                <p className="text-green-100 text-sm">Portal de reservas cerrado</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors text-2xl font-bold"
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
              El período de reservas para la{' '}
              <span className="font-bold text-green-600">{nombreFuncion}</span> ha finalizado.
            </p>
            <p className="text-gray-600 mb-4">
              Agradecemos tu participación y te esperamos en el evento.
            </p>
          </div>

          {/* Fecha del evento */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🎭</div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Fecha del Evento:</p>
                <p className="text-xl font-bold text-green-700">
                  {fechaEvento}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ¡Nos vemos en el Festival Navideño!
                </p>
              </div>
            </div>
          </div>

          {/* Mensaje de agradecimiento */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✨</div>
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-semibold mb-2">
                  ¡Gracias por ser parte de esta experiencia mágica!
                </p>
                <p className="text-sm text-blue-700">
                  Tu reserva ha sido confirmada. Te esperamos el día del evento para disfrutar juntos de esta celebración especial.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};


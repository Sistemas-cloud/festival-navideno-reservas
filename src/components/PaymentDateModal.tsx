'use client';

import React, { useState, useEffect } from 'react';
import { formatPaymentDate, getPaymentDatesForLevel, calculatePaymentDate } from '@/lib/utils/paymentDates';

interface PaymentDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDate: string) => void;
  nivel: number;
  familiaNumber: number;
}

export const PaymentDateModal: React.FC<PaymentDateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  nivel,
  familiaNumber
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Calcular la fecha recomendada cuando se abre el modal
      const availableDates = getPaymentDatesForLevel(nivel);
      const recommendedDate = calculatePaymentDate(nivel, familiaNumber, availableDates);
      setSelectedDate(recommendedDate);
    }
  }, [isOpen, nivel, familiaNumber]);

  if (!isOpen) return null;

  const availableDates = getPaymentDatesForLevel(nivel);

  const handleConfirm = () => {
    if (selectedDate) {
      onConfirm(selectedDate);
    } else {
      alert('Por favor selecciona una fecha de pago');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📅</span>
          Selecciona Día de Pago
        </h2>
        
        <p className="text-gray-600 mb-6">
          Por favor selecciona el día en que realizarás el pago de tus boletos.
        </p>

        <div className="space-y-3 mb-6">
          {availableDates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedDate === date
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-semibold text-gray-800">
                    {formatPaymentDate(date)}
                  </p>
                </div>
                {selectedDate === date && (
                  <span className="text-blue-500 text-2xl">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {selectedDate && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              📌 <strong>Fecha seleccionada:</strong> {formatPaymentDate(selectedDate)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              * El pago debe realizarse en las instalaciones del instituto
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors ${
              selectedDate
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

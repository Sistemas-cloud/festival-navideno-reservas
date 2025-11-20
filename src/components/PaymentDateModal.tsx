'use client';

import React, { useState, useEffect } from 'react';
import { formatPaymentDate, getPaymentDatesForLevel } from '@/lib/utils/paymentDates';

interface PaymentDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDate: string) => void;
  nivel: number;
  familiaNumber?: number;
  alumnoRef: number;
}

interface DateAvailability {
  fecha: string;
  disponibles: number;
  limite: number;
  llena: boolean;
}

export const PaymentDateModal: React.FC<PaymentDateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  nivel,
  familiaNumber: _familiaNumber, // eslint-disable-line @typescript-eslint/no-unused-vars
  alumnoRef
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateAvailability, setDateAvailability] = useState<DateAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // Obtener disponibilidad de fechas cuando se abre el modal
  // IMPORTANTE: Se ejecuta ANTES de mostrar el modal para tener la información lista
  useEffect(() => {
    if (isOpen && alumnoRef) {
      setLoadingAvailability(true);
      setSelectedDate(''); // Limpiar selección previa
      setDateAvailability([]); // Limpiar disponibilidad previa
      
      fetch('/api/reservas/disponibilidad-fechas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alumno_ref: alumnoRef }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.disponibilidad) {
            setDateAvailability(data.disponibilidad);
            
            // Seleccionar automáticamente la primera fecha disponible (no llena)
            const fechaDisponible = data.disponibilidad.find((d: DateAvailability) => !d.llena);
            if (fechaDisponible) {
              setSelectedDate(fechaDisponible.fecha);
            } else {
              // Si ambas están llenas, usar la primera como fallback (aunque esté llena)
              if (data.disponibilidad.length > 0) {
                setSelectedDate(data.disponibilidad[0].fecha);
              }
            }
          } else {
            // Fallback: usar fechas sin disponibilidad
            const availableDates = getPaymentDatesForLevel(nivel);
            if (availableDates.length > 0) {
              setSelectedDate(availableDates[0]);
            }
          }
        })
        .catch(error => {
          // Fallback: usar fechas sin disponibilidad
          const availableDates = getPaymentDatesForLevel(nivel);
          if (availableDates.length > 0) {
            setSelectedDate(availableDates[0]);
          }
        })
        .finally(() => {
          setLoadingAvailability(false);
        });
    } else if (!isOpen) {
      // Limpiar cuando se cierra el modal
      setDateAvailability([]);
      setSelectedDate('');
    }
  }, [isOpen, alumnoRef, nivel]);

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
          {loadingAvailability ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 font-medium">Verificando disponibilidad de fechas...</p>
              <p className="text-xs text-gray-500 mt-1">Por favor espera un momento</p>
            </div>
          ) : dateAvailability.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">Cargando fechas disponibles...</p>
            </div>
          ) : (
            availableDates.map((date) => {
              const disponibilidad = dateAvailability.find(d => d.fecha === date);
              const llena = disponibilidad?.llena || false;
              const disponibles = disponibilidad?.disponibles ?? 0;
              const limite = disponibilidad?.limite ?? 0;
              const tieneInfo = disponibilidad !== undefined;
              
              return (
                <button
                  key={date}
                  onClick={() => {
                    if (!llena) {
                      setSelectedDate(date);
                    } else {
                      alert(`La fecha ${formatPaymentDate(date)} ya ha alcanzado su límite máximo de ${limite} familias. Por favor, selecciona la otra fecha disponible.`);
                    }
                  }}
                  disabled={llena}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    llena
                      ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60'
                      : selectedDate === date
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left flex-1">
                      <p className={`font-semibold ${llena ? 'text-gray-500' : 'text-gray-800'}`}>
                        {formatPaymentDate(date)}
                      </p>
                      {tieneInfo ? (
                        <p className={`text-xs mt-1 ${llena ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {llena 
                            ? `❌ Límite alcanzado (${limite} familias)` 
                            : `✅ ${disponibles} de ${limite} lugares disponibles`}
                        </p>
                      ) : (
                        <p className="text-xs mt-1 text-gray-400">Verificando disponibilidad...</p>
                      )}
                    </div>
                    {selectedDate === date && !llena && (
                      <span className="text-blue-500 text-2xl">✓</span>
                    )}
                    {llena && (
                      <span className="text-red-500 text-2xl">✗</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
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

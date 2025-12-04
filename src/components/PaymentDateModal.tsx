'use client';

import React, { useState, useEffect } from 'react';
import { formatPaymentDate } from '@/lib/utils/paymentDates';

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

// Función auxiliar para obtener la fecha actual en Monterrey (cliente)
function getTodayInMonterrey(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Monterrey',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayStr = formatter.format(now); // Formato: YYYY-MM-DD
  const [year, month, day] = todayStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Función auxiliar para parsear fecha string a Date
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Función auxiliar para verificar si una fecha ya pasó
// Una fecha se considera "pasada" solo si es anterior a hoy (no incluye hoy)
function isDatePassed(dateStr: string): boolean {
  const today = getTodayInMonterrey();
  const targetDate = parseDateString(dateStr);
  // La fecha pasó solo si hoy es estrictamente mayor que la fecha objetivo
  // Esto permite seleccionar la fecha si es hoy o en el futuro
  return targetDate.getTime() < today.getTime();
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
      setSelectedDate(''); // Limpiar selección previa - NO seleccionar automáticamente
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
            // Usar solo las fechas que vienen de la API (ya están filtradas por función correcta)
            setDateAvailability(data.disponibilidad);
            
            // Si solo hay una fecha disponible y tiene limite === 0, estamos en reapertura
            // En este caso, seleccionar automáticamente la fecha fija
            if (data.disponibilidad.length === 1 && data.disponibilidad[0].limite === 0) {
                setSelectedDate(data.disponibilidad[0].fecha);
              console.log('🔄 Período de reapertura detectado - Fecha fija seleccionada automáticamente:', data.disponibilidad[0].fecha);
            }
          } else {
            console.error('Error al obtener disponibilidad de fechas:', data.message);
            // Si hay error, no establecer fechas - el modal mostrará mensaje de error
            setDateAvailability([]);
          }
        })
        .catch(error => {
          console.error('Error al obtener disponibilidad de fechas:', error);
          // Si hay error, no establecer fechas - el modal mostrará mensaje de error
          setDateAvailability([]);
        })
        .finally(() => {
          setLoadingAvailability(false);
        });
    } else if (!isOpen) {
      // Limpiar cuando se cierra el modal
      setDateAvailability([]);
      setSelectedDate('');
    }
  }, [isOpen, alumnoRef]);

  if (!isOpen) return null;

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
          {dateAvailability.length === 1 && dateAvailability[0].limite === 0 
            ? 'Fecha de Pago Asignada' 
            : 'Selecciona Día de Pago'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {dateAvailability.length === 1 && dateAvailability[0].limite === 0
            ? 'Durante el período de reapertura, la fecha de pago es fija y no se puede cambiar.'
            : 'Por favor selecciona el día en que realizarás el pago de tus boletos.'}
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
              <p className="text-sm text-red-600 font-semibold">Error al cargar fechas disponibles</p>
              <p className="text-xs text-gray-500 mt-1">Por favor, intenta cerrar y abrir el modal nuevamente</p>
            </div>
          ) : (
            dateAvailability.map((disponibilidad) => {
              const fecha = disponibilidad.fecha;
              // Detectar si es período de reapertura: solo una fecha y limite === 0
              const esReapertura = dateAvailability.length === 1 && disponibilidad.limite === 0;
              // La segunda fecha (fecha2) siempre está disponible - se identifica porque limite === 0
              // La fecha1 siempre tiene un límite > 0
              const esFecha2 = disponibilidad.limite === 0 && !esReapertura;
              
              const llena = disponibilidad.llena ?? false;
              const disponibles = disponibilidad.disponibles ?? 0;
              const limite = disponibilidad.limite ?? 0;
              
              // Verificar si la fecha ya pasó (solo para fecha1, fecha2 siempre disponible)
              // Solo considerar la fecha como pasada si NO es fecha2 y NO es reapertura
              const fechaYaPaso = !esFecha2 && !esReapertura && isDatePassed(fecha);
              
              // La segunda fecha (fecha2) NUNCA está deshabilitada
              // La primera fecha se deshabilita SOLO si:
              //   1. La fecha ya pasó (fechaYaPaso === true) O
              //   2. Está llena (llena === true) Y no hay lugares disponibles (disponibles === 0)
              // Si tiene lugares disponibles (disponibles > 0), NO se deshabilita aunque llena sea true
              const deshabilitada = esFecha2 
                ? false 
                : (!esReapertura && (fechaYaPaso || (llena && disponibles === 0)));
              
              console.log(`🔍 Modal - Fecha ${fecha}: esReapertura=${esReapertura}, esFecha2=${esFecha2}, llena=${llena}, disponibles=${disponibles}, limite=${limite}, fechaYaPaso=${fechaYaPaso}, deshabilitada=${deshabilitada}`);
              
              return (
                <div
                  key={fecha}
                  onClick={() => {
                    // Solo permitir selección si no está deshabilitada
                    if (!deshabilitada) {
                      setSelectedDate(fecha);
                    }
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    esReapertura
                      ? 'border-blue-500 bg-blue-50 shadow-lg cursor-default'
                      : deshabilitada
                      ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60'
                      : selectedDate === fecha
                      ? 'border-blue-500 bg-blue-50 shadow-lg cursor-pointer hover:bg-blue-100'
                      : 'border-gray-200 cursor-pointer hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left flex-1">
                      <p className={`font-semibold ${deshabilitada ? 'text-gray-500' : 'text-gray-800'}`}>
                        {formatPaymentDate(fecha)}
                      </p>
                      {esReapertura ? (
                        <p className="text-xs mt-1 text-blue-600 font-semibold">
                          🔒 Fecha fija asignada (no se puede cambiar)
                        </p>
                      ) : esFecha2 ? (
                        <p className="text-xs mt-1 text-green-600 font-semibold">
                          ✅ Siempre disponible
                        </p>
                      ) : fechaYaPaso ? (
                        <p className="text-xs mt-1 text-red-600 font-semibold">
                          ❌ Fecha ya pasó
                        </p>
                      ) : (
                        <p className={`text-xs mt-1 ${llena ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {llena 
                            ? `❌ Límite alcanzado (${limite} familias)` 
                            : `✅ ${disponibles} de ${limite} lugares disponibles`}
                        </p>
                      )}
                    </div>
                    {selectedDate === fecha && !deshabilitada && (
                      <span className="text-blue-500 text-2xl">✓</span>
                    )}
                    {deshabilitada && !esReapertura && (
                      <span className="text-red-500 text-2xl">✗</span>
                    )}
                    {esReapertura && (
                      <span className="text-blue-500 text-2xl">🔒</span>
                    )}
                  </div>
                </div>
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

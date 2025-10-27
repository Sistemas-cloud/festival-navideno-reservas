/**
 * Utilidades para gestión de fechas de pago
 * Basado en la distribución por nivel educativo
 */

export interface PaymentDate {
  date: string;
  available: boolean;
}

export interface PaymentSchedule {
  kinder: PaymentDate[];
  primaria: PaymentDate[];
  secundaria: PaymentDate[];
}

/**
 * Obtiene los días de pago disponibles según el nivel educativo
 */
export function getPaymentDatesForLevel(level: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (level === 1) {
    // Kinder: 1 y 2 de diciembre
    return ['2025-12-01', '2025-12-02'];
  } else if (level === 2) {
    // Primaria: 4 y 5 de diciembre
    return ['2025-12-04', '2025-12-05'];
  } else if (level === 3) {
    // Secundaria: 8 y 9 de diciembre
    return ['2025-12-08', '2025-12-09'];
  } else if (level === 4) {
    // Preparatoria: 8 y 9 de diciembre (mismo que secundaria)
    return ['2025-12-08', '2025-12-09'];
  }

  return [];
}

/**
 * Calcula la fecha de pago recomendada basándose en el número de familias
 * Distribuye equitativamente las familias entre los días disponibles
 */
export function calculatePaymentDate(level: number, familyNumber: number, availableDates: string[]): string {
  if (availableDates.length === 0) {
    return '';
  }

  // Distribuir familias equitativamente entre los días disponibles
  const familiesPerDay = Math.ceil(familyNumber / availableDates.length);
  const dayIndex = Math.floor(familyNumber / familiesPerDay);

  // Asegurarse de no exceder el índice
  const safeIndex = Math.min(dayIndex, availableDates.length - 1);
  
  return availableDates[safeIndex];
}

/**
 * Verifica si una fecha de pago ya pasó
 */
export function isPaymentDatePassed(paymentDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payment = new Date(paymentDate);
  payment.setHours(0, 0, 0, 0);

  return today > payment;
}

/**
 * Verifica si una fecha de pago es hoy
 */
export function isPaymentDateToday(paymentDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payment = new Date(paymentDate);
  payment.setHours(0, 0, 0, 0);

  return today.getTime() === payment.getTime();
}

/**
 * Formatea una fecha para mostrar al usuario
 */
export function formatPaymentDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}


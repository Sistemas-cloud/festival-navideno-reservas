/**
 * Configuración de fechas de pago fijas durante el período de reapertura
 * Estas fechas no se pueden cambiar y son únicas para cada función
 */

/**
 * Fechas de pago fijas por función durante la reapertura (en formato YYYY-MM-DD)
 */
export const REOPENING_PAYMENT_DATES = {
  FUNCION_1: '2025-12-10', // Función 1: siempre paga el 10 de diciembre
  FUNCION_2: '2025-12-12', // Función 2: siempre paga el 12 de diciembre
  FUNCION_3: '2025-12-12'  // Función 3: siempre paga el 12 de diciembre
};

/**
 * Obtiene la fecha de pago fija para una función específica durante la reapertura
 * @param funcion Número de función (1, 2 o 3)
 * @returns Fecha de pago en formato YYYY-MM-DD
 */
export function getReopeningPaymentDateForFunction(funcion: number): string {
  switch (funcion) {
    case 1:
      return REOPENING_PAYMENT_DATES.FUNCION_1;
    case 2:
      return REOPENING_PAYMENT_DATES.FUNCION_2;
    case 3:
      return REOPENING_PAYMENT_DATES.FUNCION_3;
    default:
      return REOPENING_PAYMENT_DATES.FUNCION_3; // Por defecto, la más tardía
  }
}



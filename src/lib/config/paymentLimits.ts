/**
 * Configuración de límites de familias por fecha de pago
 * Distribución equitativa entre los dos días disponibles por función
 */

export interface PaymentDateLimit {
  funcion: number;
  totalFamilias: number;
  fecha1: string;
  fecha2: string;
  limiteFecha1: number;
  limiteFecha2: number;
}

export const PAYMENT_LIMITS: PaymentDateLimit[] = [
  {
    funcion: 1,
    totalFamilias: 167,
    fecha1: '2025-12-01',
    fecha2: '2025-12-02',
    limiteFecha1: 84, // 167 / 2 = 83.5 → redondeado a 84 y 83
    limiteFecha2: 83
  },
  {
    funcion: 2,
    totalFamilias: 238,
    fecha1: '2025-12-04',
    fecha2: '2025-12-05',
    limiteFecha1: 119, // 238 / 2 = 119
    limiteFecha2: 119
  },
  {
    funcion: 3,
    totalFamilias: 243,
    fecha1: '2025-12-08',
    fecha2: '2025-12-09',
    limiteFecha1: 122, // 243 / 2 = 121.5 → redondeado a 122 y 121
    limiteFecha2: 121
  }
];

/**
 * Obtiene los límites de pago para una función específica
 */
export function getPaymentLimitsForFunction(funcion: number): PaymentDateLimit | undefined {
  return PAYMENT_LIMITS.find(limit => limit.funcion === funcion);
}

/**
 * Obtiene el límite máximo para una fecha específica
 */
export function getLimitForDate(funcion: number, fecha: string): number | null {
  const limits = getPaymentLimitsForFunction(funcion);
  if (!limits) return null;
  
  if (fecha === limits.fecha1) return limits.limiteFecha1;
  if (fecha === limits.fecha2) return limits.limiteFecha2;
  
  return null;
}


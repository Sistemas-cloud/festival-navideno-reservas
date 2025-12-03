/**
 * Lista de números de control con acceso anticipado al sistema
 * Estos usuarios pueden acceder antes de las fechas de apertura oficiales
 */
export const EARLY_ACCESS_CONTROLS: number[] = [
  21328,
  20871,
  11528,
  21084,
  21591,
  21590,
  21437,
  21679,
  21568,
  21453,
  20245,
  11905,
  11632,
  20482,
  20629,
  21674,
  21297,
  21446,
  21584,
  21182,
  77777,
  88888,
  99999,
  20423,
  20340,
  20890,
  21588, 
  21168 
];

/**
 * Verifica si un número de control tiene acceso anticipado
 */
export function hasEarlyAccess(control: number): boolean {
  return EARLY_ACCESS_CONTROLS.includes(control);
}

/**
 * Fechas de apertura por función (en formato YYYY-MM-DD)
 * El sistema estará cerrado para el público hasta estas fechas a medianoche en hora de Monterrey
 */
export const OPENING_DATES = {
  FUNCION_1: '2025-11-07',
  FUNCION_2: '2025-11-08',
  FUNCION_3: '2025-11-09'
};

/**
 * Fechas de reapertura por función (en formato YYYY-MM-DD)
 * El sistema se reabrirá a partir de estas fechas a medianoche en hora de Monterrey
 * Durante el período de reapertura, no hay límite de boletos por familia
 */
export const REOPENING_DATES = {
  FUNCION_1: '2025-12-04', // Se reabre el 4 de diciembre a medianoche
  FUNCION_2: '2025-12-10', // Se reabre el 10 de diciembre a medianoche
  FUNCION_3: '2025-12-10'  // Se reabre el 10 de diciembre a medianoche
};

/**
 * Fechas de cierre anteriores por función (en formato YYYY-MM-DD)
 * Estas fechas representan cuando cerró el portal anteriormente a las 13:00
 */
export const PREVIOUS_CLOSING_DATES = {
  FUNCION_1: '2025-12-02', // Cerró el 2 de diciembre a la 1 PM
  FUNCION_2: '2025-12-05', // Cerró el 5 de diciembre a la 1 PM
  FUNCION_3: '2025-12-09'  // Cerró el 9 de diciembre a la 1 PM
};

/**
 * Obtiene la fecha de apertura para una función específica (string YYYY-MM-DD)
 */
export function getOpeningDateForFunction(funcion: number): string {
  switch (funcion) {
    case 1:
      return OPENING_DATES.FUNCION_1;
    case 2:
      return OPENING_DATES.FUNCION_2;
    case 3:
      return OPENING_DATES.FUNCION_3;
    default:
      return OPENING_DATES.FUNCION_3; // Por defecto, la más tardía
  }
}

/**
 * Obtiene la fecha de reapertura para una función específica (string YYYY-MM-DD)
 */
export function getReopeningDateForFunction(funcion: number): string {
  switch (funcion) {
    case 1:
      return REOPENING_DATES.FUNCION_1;
    case 2:
      return REOPENING_DATES.FUNCION_2;
    case 3:
      return REOPENING_DATES.FUNCION_3;
    default:
      return REOPENING_DATES.FUNCION_3; // Por defecto, la más tardía
  }
}

/**
 * Obtiene la fecha de cierre anterior para una función específica (string YYYY-MM-DD)
 */
export function getPreviousClosingDateForFunction(funcion: number): string {
  switch (funcion) {
    case 1:
      return PREVIOUS_CLOSING_DATES.FUNCION_1;
    case 2:
      return PREVIOUS_CLOSING_DATES.FUNCION_2;
    case 3:
      return PREVIOUS_CLOSING_DATES.FUNCION_3;
    default:
      return PREVIOUS_CLOSING_DATES.FUNCION_3; // Por defecto, la más tardía
  }
}


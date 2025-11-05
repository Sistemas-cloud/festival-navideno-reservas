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
  21453
];

/**
 * Verifica si un número de control tiene acceso anticipado
 */
export function hasEarlyAccess(control: number): boolean {
  return EARLY_ACCESS_CONTROLS.includes(control);
}

/**
 * Fechas de apertura por función
 * El sistema estará cerrado para el público hasta estas fechas
 */
export const OPENING_DATES = {
  FUNCION_1: new Date('2025-12-01'),
  FUNCION_2: new Date('2025-12-04'),
  FUNCION_3: new Date('2025-12-08')
};

/**
 * Obtiene la fecha de apertura para una función específica
 */
export function getOpeningDateForFunction(funcion: number): Date {
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


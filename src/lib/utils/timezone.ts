/**
 * Utilidades para manejo de fechas en zona horaria de Monterrey
 * Monterrey usa la zona horaria America/Monterrey (UTC-6 en invierno, UTC-5 en verano)
 */

const TIMEZONE_MONTERREY = 'America/Monterrey';

/**
 * Obtiene la fecha actual en zona horaria de Monterrey como string YYYY-MM-DD
 * Esto asegura que siempre trabajemos con la fecha correcta independientemente de dónde esté el servidor
 */
function getTodayStringInMonterrey(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_MONTERREY,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // Formato: YYYY-MM-DD
}

/**
 * Obtiene la fecha actual en zona horaria de Monterrey (solo fecha, sin hora)
 * Normalizada a medianoche en Monterrey para comparaciones
 */
export function getTodayInMonterrey(): Date {
  const todayStr = getTodayStringInMonterrey();
  // Crear fecha a partir del string YYYY-MM-DD, esto se interpreta como medianoche en la zona local del servidor
  // Pero como solo comparamos fechas (no horas), funciona correctamente
  const [year, month, day] = todayStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // Los meses son 0-indexados
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Crea una fecha a partir de un string YYYY-MM-DD interpretándola como fecha (solo día, sin hora)
 * Para comparaciones de fechas, esto es suficiente ya que solo comparamos días
 * @param dateStr String en formato YYYY-MM-DD
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // Los meses son 0-indexados
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Compara si la fecha actual en Monterrey es anterior a la fecha de apertura
 * @param openingDateStr Fecha de apertura en formato YYYY-MM-DD
 */
export function isBeforeOpeningDate(openingDateStr: string): boolean {
  const today = getTodayInMonterrey();
  const openingDate = parseDateString(openingDateStr);
  
  // Comparar solo las fechas (sin horas)
  // Si hoy es anterior a la fecha de apertura, retorna true
  return today.getTime() < openingDate.getTime();
}

/**
 * Compara si la fecha actual en Monterrey es igual o posterior a la fecha de cierre
 * @param closingDateStr Fecha de cierre en formato YYYY-MM-DD
 */
export function isAfterClosingDate(closingDateStr: string): boolean {
  const today = getTodayInMonterrey();
  const closingDate = parseDateString(closingDateStr);
  
  // Comparar solo las fechas (sin horas)
  // Si hoy es igual o posterior a la fecha de cierre, retorna true
  return today.getTime() >= closingDate.getTime();
}

/**
 * Compara si la fecha actual en Monterrey es igual o posterior a la fecha especificada
 * @param dateStr Fecha en formato YYYY-MM-DD
 */
export function isDateReached(dateStr: string): boolean {
  const today = getTodayInMonterrey();
  const targetDate = parseDateString(dateStr);
  return today.getTime() >= targetDate.getTime();
}


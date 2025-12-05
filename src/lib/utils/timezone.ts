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

/**
 * Obtiene la fecha y hora actual en zona horaria de Monterrey
 * Retorna un objeto con los componentes de fecha y hora
 */
function getDateTimeInMonterrey(): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_MONTERREY,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  return {
    year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
    month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
    day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
    minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
    second: parseInt(parts.find(p => p.type === 'second')?.value || '0')
  };
}

/**
 * Verifica si la fecha/hora actual en Monterrey ha pasado la hora de cierre
 * El cierre es a las 13:00 (1 PM) del día especificado, no a medianoche
 * @param closingDateStr Fecha de cierre en formato YYYY-MM-DD
 */
export function isAfterClosingTime(closingDateStr: string): boolean {
  const [closeYear, closeMonth, closeDay] = closingDateStr.split('-').map(Number);
  const now = getDateTimeInMonterrey();
  
  // Comparar primero el año
  if (now.year > closeYear) return true;
  if (now.year < closeYear) return false;
  
  // Comparar el mes
  if (now.month > closeMonth) return true;
  if (now.month < closeMonth) return false;
  
  // Comparar el día y hora
  if (now.day > closeDay) return true;
  if (now.day < closeDay) return false;
  
  // Si es el mismo día, verificar si ya pasaron las 13:00
  // Cierra a las 13:00, así que si la hora es >= 13, está cerrado
  return now.hour >= 13;
}

/**
 * Verifica si la fecha/hora actual en Monterrey ha pasado la hora de reapertura
 * La reapertura puede ser a una hora específica (por defecto 20:00 / 8 PM) del día especificado
 * @param reopeningDateStr Fecha de reapertura en formato YYYY-MM-DD
 * @param reopeningHour Hora de reapertura (0-23), por defecto 20 (8 PM)
 */
export function isAfterReopeningTime(reopeningDateStr: string, reopeningHour: number = 20): boolean {
  const [reopenYear, reopenMonth, reopenDay] = reopeningDateStr.split('-').map(Number);
  const now = getDateTimeInMonterrey();
  
  // Comparar primero el año
  if (now.year > reopenYear) return true;
  if (now.year < reopenYear) return false;
  
  // Comparar el mes
  if (now.month > reopenMonth) return true;
  if (now.month < reopenMonth) return false;
  
  // Comparar el día y hora
  if (now.day > reopenDay) return true;
  if (now.day < reopenDay) return false;
  
  // Si es el mismo día, verificar si ya pasó la hora de reapertura
  // Si la hora actual es >= a la hora de reapertura, ya reabrió
  return now.hour >= reopeningHour;
}

/**
 * Crea una fecha de cierre a partir de un string YYYY-MM-DD
 * Esta función se usa para comparaciones y establece la hora de cierre a las 13:00
 * @param dateStr String en formato YYYY-MM-DD
 * @returns Date representando las 13:00 del día indicado en Monterrey
 */
export function parseClosingDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Crear una fecha representando las 13:00 en Monterrey
  // Usamos un enfoque simple: crear la fecha y ajustar para Monterrey
  const dateStrFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T13:00:00`;
  
  // Obtener la representación de esta fecha/hora en Monterrey
  // Primero creamos la fecha como si fuera local
  const localDate = new Date(dateStrFormatted);
  
  // Obtenemos cómo se vería esta fecha en Monterrey
  const monterreyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_MONTERREY,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const monterreyParts = monterreyFormatter.formatToParts(localDate);
  const monterreyHour = parseInt(monterreyParts.find(p => p.type === 'hour')?.value || '0');
  
  // Calcular el offset necesario para que en Monterrey sean las 13:00
  const hourDiff = 13 - monterreyHour;
  
  // Ajustar la fecha
  const adjustedDate = new Date(localDate.getTime() + hourDiff * 60 * 60 * 1000);
  
  return adjustedDate;
}


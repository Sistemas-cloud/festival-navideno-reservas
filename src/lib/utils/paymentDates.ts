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
 * Obtiene los días de pago disponibles según el nivel educativo o función
 * 
 * Niveles educativos:
 * - 1-2 = Kinder → Función 1 → fechas: 1-2 dic
 * - 3 = Primaria → Función 2 (grados 2-5) → fechas: 4-5 dic
 * - 4 = Secundaria → Función 3 → fechas: 8-9 dic
 * 
 * Funciones (para usuarios internos):
 * - 1 = 1ra Función → fechas: 1-2 dic
 * - 2 = 2da Función → fechas: 4-5 dic
 * - 3 = 3ra Función → fechas: 8-9 dic
 */
export function getPaymentDatesForLevel(level: number): string[] {
  console.log('🔍 getPaymentDatesForLevel - Nivel/Función recibido:', level);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Si el nivel es 1, 2, o 3, puede ser función (usuarios internos) o nivel educativo
  // Para funciones: 1 = Función 1, 2 = Función 2, 3 = Función 3
  // Para niveles: 1-2 = Kinder, 3 = Primaria (grados 2-5)
  
  // Función 1 o Niveles 1-2 (Kinder) → 1 y 2 de diciembre
  if (level === 1 || level === 2) {
    console.log('🔍 getPaymentDatesForLevel - Función 1 / Niveles 1-2 (Kinder):', ['2025-12-01', '2025-12-02']);
    return ['2025-12-01', '2025-12-02'];
  }
  
  // Función 2 o Nivel 3 (Primaria grados 2-5) → 4 y 5 de diciembre
  // NOTA: Para usuarios internos, función 2 se mapea a nivel 2, pero función 3 se mapea a nivel 3
  // Para evitar ambigüedad, los usuarios internos función 3 deberían mapearse a nivel 4
  // Pero por ahora, si recibimos level === 3, puede ser:
  // - Función 2 (usuarios internos) → 4-5 dic
  // - Nivel 3 primaria grados 2-5 → 4-5 dic
  // - Función 3 (usuarios internos) → 8-9 dic (pero esto debería ser nivel 4)
  // 
  // La solución: en SeatingSection, mapear función 3 a nivel 4 para usuarios internos
  if (level === 3) {
    // Por defecto, asumimos función 2 o primaria grados 2-5
    console.log('🔍 getPaymentDatesForLevel - Función 2 / Nivel 3 (Primaria grados 2-5):', ['2025-12-04', '2025-12-05']);
    return ['2025-12-04', '2025-12-05'];
  }
  
  // Nivel 4 (Secundaria) o Función 3 → 8 y 9 de diciembre
  if (level === 4) {
    console.log('🔍 getPaymentDatesForLevel - Función 3 / Nivel 4 (Secundaria):', ['2025-12-08', '2025-12-09']);
    return ['2025-12-08', '2025-12-09'];
  }

  console.log('🔍 getPaymentDatesForLevel - Nivel/Función no reconocido, retornando array vacío');
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
export function formatPaymentDate(date: string | null | undefined): string {
  if (!date) {
    return 'No especificada';
  }

  console.log('🔍 formatPaymentDate - Fecha recibida:', date);
  
  try {
    let year: number, month: number, day: number;
    
    // Verificar si ya viene en formato ISO (YYYY-MM-DD)
    if (date.includes('-') && date.length >= 10) {
      const parts = date.split('-');
      if (parts.length >= 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        throw new Error('Formato de fecha inválido');
      }
    } else if (date.includes('/')) {
      // Si viene en formato con barras (DD/MM/YYYY o MM/DD/YYYY)
      const parts = date.split('/');
      if (parts.length >= 3) {
        // Intentar detectar formato (si el primer número es > 12, asumimos DD/MM/YYYY)
        if (parseInt(parts[0], 10) > 12) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        } else {
          month = parseInt(parts[0], 10);
          day = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      } else {
        throw new Error('Formato de fecha inválido');
      }
    } else {
      // Intentar parsear como Date directamente
      const tempDate = new Date(date);
      if (isNaN(tempDate.getTime())) {
        throw new Error('Fecha inválida');
      }
      year = tempDate.getFullYear();
      month = tempDate.getMonth() + 1;
      day = tempDate.getDate();
    }

    // Validar que los valores sean válidos
    if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error('Valores de fecha inválidos');
    }

    const d = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed months
    
    // Validar que la fecha sea válida
    if (isNaN(d.getTime())) {
      throw new Error('Fecha inválida');
    }

    const formatted = d.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    console.log('🔍 formatPaymentDate - Fecha formateada:', formatted);
    return formatted;
  } catch (error) {
    console.error('❌ Error al formatear fecha:', error, 'Fecha original:', date);
    // Si falla, retornar la fecha original o un mensaje de error
    return date.toString();
  }
}


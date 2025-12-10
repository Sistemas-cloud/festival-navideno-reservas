-- ============================================
-- Query para liberar asientos de la función 3
-- que estén reservados con fecha_pago = '2025-12-08'
-- CON BACKUP AUTOMÁTICO ANTES DE MODIFICAR
-- ============================================

-- PASO 1: Verificar cuántos registros se van a afectar
SELECT COUNT(*) as total_registros_a_liberar
FROM reservas
WHERE nivel = 3 
  AND estado = 'reservado' 
  AND fecha_pago = '2025-12-08';

-- PASO 2: Ver detalles de los registros que se van a liberar
SELECT id, fila, asiento, estado, referencia, nivel, fecha_pago, precio, zona, created_at, updated_at
FROM reservas
WHERE nivel = 3 
  AND estado = 'reservado' 
  AND fecha_pago = '2025-12-08'
ORDER BY fila, asiento;

-- ============================================
-- PASO 3: CREAR TABLA DE BACKUP
-- ============================================
-- Crear tabla de backup con timestamp (ejecutar primero)
CREATE TABLE IF NOT EXISTS reservas_backup_2025_12_08_funcion3 AS
SELECT 
  id,
  fila,
  asiento,
  estado,
  referencia,
  nivel,
  fecha_pago,
  precio,
  zona,
  created_at,
  updated_at,
  NOW() as backup_created_at  -- Fecha en que se hizo el backup
FROM reservas
WHERE nivel = 3 
  AND estado = 'reservado' 
  AND fecha_pago = '2025-12-08';

-- Verificar que el backup se creó correctamente
SELECT COUNT(*) as registros_en_backup FROM reservas_backup_2025_12_08_funcion3;

-- ============================================
-- PASO 4: OPCIÓN 1 - Cambiar estado a 'disponible' (RECOMENDADO)
-- ============================================
-- Esto mantiene el registro pero libera el asiento
-- Ejecutar SOLO después de verificar que el backup se creó correctamente
/*
UPDATE reservas
SET 
  estado = 'disponible',
  referencia = 0,  -- Opcional: limpiar la referencia
  fecha_pago = NULL,  -- Opcional: limpiar la fecha de pago
  precio = NULL,  -- Opcional: limpiar el precio
  updated_at = NOW()
WHERE 
  nivel = 3 
  AND estado = 'reservado' 
  AND fecha_pago = '2025-12-08';
*/

-- ============================================
-- PASO 4: OPCIÓN 2 - Cambiar solo el estado (sin limpiar otros campos)
-- ============================================
-- Ejecutar SOLO después de verificar que el backup se creó correctamente
/*
UPDATE reservas
SET 
  estado = 'disponible',
  updated_at = NOW()
WHERE 
  nivel = 3 
  AND estado = 'reservado' 
  AND fecha_pago = '2025-12-08';
*/

-- ============================================
-- PASO 4: OPCIÓN 3 - Eliminar completamente los registros (DELETE)
-- USAR CON PRECAUCIÓN - Solo si realmente quieres eliminar los registros
-- ============================================
-- Ejecutar SOLO después de verificar que el backup se creó correctamente
/*
DELETE FROM reservas
WHERE nivel = 3 
  AND estado = 'reservado' 
  AND fecha_pago = '2025-12-08';
*/

-- ============================================
-- PASO 5: Verificar que la operación se completó correctamente
-- ============================================
-- Después de ejecutar UPDATE o DELETE, verificar que ya no existen los registros:
/*
SELECT COUNT(*) as registros_restantes
FROM reservas
WHERE nivel = 3 
  AND estado = 'reservado' 
  AND fecha_pago = '2025-12-08';
-- Debe devolver 0 si se ejecutó DELETE, o el número actualizado si se ejecutó UPDATE
*/

-- ============================================
-- RESTAURAR DESDE BACKUP (en caso de necesitar revertir)
-- ============================================
-- Si necesitas restaurar los registros desde el backup:
/*
-- Opción A: Restaurar todos los campos (incluyendo estado original)
INSERT INTO reservas (fila, asiento, estado, referencia, nivel, fecha_pago, precio, zona, created_at, updated_at)
SELECT fila, asiento, estado, referencia, nivel, fecha_pago, precio, zona, created_at, updated_at
FROM reservas_backup_2025_12_08_funcion3
ON CONFLICT (fila, asiento, nivel) DO NOTHING;  -- Evitar duplicados si ya existen

-- Opción B: Solo restaurar registros que fueron eliminados (si usaste DELETE)
INSERT INTO reservas (fila, asiento, estado, referencia, nivel, fecha_pago, precio, zona, created_at, updated_at)
SELECT fila, asiento, estado, referencia, nivel, fecha_pago, precio, zona, created_at, updated_at
FROM reservas_backup_2025_12_08_funcion3
WHERE NOT EXISTS (
  SELECT 1 FROM reservas r 
  WHERE r.fila = reservas_backup_2025_12_08_funcion3.fila 
    AND r.asiento = reservas_backup_2025_12_08_funcion3.asiento 
    AND r.nivel = reservas_backup_2025_12_08_funcion3.nivel
);
*/


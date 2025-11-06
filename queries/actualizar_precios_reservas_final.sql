-- ============================================
-- QUERY PARA ACTUALIZAR PRECIOS DE RESERVAS
-- ============================================
-- Actualiza los precios de todas las reservas existentes
-- sin importar la función (nivel) a la que pertenezcan
-- 
-- Nuevos precios:
-- - Oro: $180 → $200
-- - Plata: $160 → $180
-- - Bronce: $120 → $140
-- ============================================

BEGIN;

-- Paso 1: Actualizar precios por valor actual (método más seguro)
-- Oro: $180 → $200
UPDATE reservas
SET precio = 200.00, updated_at = NOW()
WHERE precio = 180.00;

-- Plata: $160 → $180
UPDATE reservas
SET precio = 180.00, updated_at = NOW()
WHERE precio = 160.00;

-- Bronce: $120 → $140
UPDATE reservas
SET precio = 140.00, updated_at = NOW()
WHERE precio = 120.00;

-- Paso 2: Actualizar precios por fila (para casos donde el precio puede estar mal o ser NULL)
-- ZONA ORO (filas A-I): establecer precio a $200
UPDATE reservas
SET precio = 200.00, updated_at = NOW()
WHERE fila IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')
  AND precio != 200.00;

-- ZONA PLATA (filas J-W): establecer precio a $180
UPDATE reservas
SET precio = 180.00, updated_at = NOW()
WHERE fila IN ('J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W')
  AND precio != 180.00;

-- ZONA BRONCE (filas II, HH, JJ, KK): establecer precio a $140
UPDATE reservas
SET precio = 140.00, updated_at = NOW()
WHERE fila IN ('II', 'HH', 'JJ', 'KK')
  AND precio != 140.00;

-- Paso 3: Actualizar por campo 'zona' si existe (como respaldo final)
UPDATE reservas
SET precio = 200.00, updated_at = NOW()
WHERE UPPER(COALESCE(zona, '')) LIKE '%ORO%'
  AND precio != 200.00;

UPDATE reservas
SET precio = 180.00, updated_at = NOW()
WHERE UPPER(COALESCE(zona, '')) LIKE '%PLATA%'
  AND precio != 180.00;

UPDATE reservas
SET precio = 140.00, updated_at = NOW()
WHERE UPPER(COALESCE(zona, '')) LIKE '%BRONCE%'
  AND precio != 140.00;

-- ============================================
-- VERIFICACIÓN: Resumen de actualización
-- ============================================

-- Resumen por precio
SELECT 
  precio,
  COUNT(*) as total_reservas,
  COUNT(DISTINCT nivel) as funciones_afectadas
FROM reservas
WHERE precio IN (200.00, 180.00, 140.00)
GROUP BY precio
ORDER BY precio DESC;

-- Resumen por nivel (función) y precio
SELECT 
  nivel as funcion,
  precio,
  COUNT(*) as total_reservas
FROM reservas
WHERE precio IN (200.00, 180.00, 140.00)
GROUP BY nivel, precio
ORDER BY nivel, precio DESC;

COMMIT;


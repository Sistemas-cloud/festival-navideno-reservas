-- ============================================
-- QUERY SIMPLE PARA ACTUALIZAR PRECIOS
-- ============================================
-- Actualiza todos los precios en una sola transacción
-- Oro: $180 → $200 (filas A-I)
-- Plata: $160 → $180 (filas J-W)
-- Bronce: $120 → $140 (filas II, HH, JJ, KK)
-- 
-- Actualiza TODAS las funciones (niveles) sin importar cuál sea
-- ============================================

BEGIN;

-- Actualizar ZONA ORO: $180 → $200
UPDATE reservas
SET precio = 200.00, updated_at = NOW()
WHERE precio = 180.00;

-- Actualizar ZONA PLATA: $160 → $180
UPDATE reservas
SET precio = 180.00, updated_at = NOW()
WHERE precio = 160.00;

-- Actualizar ZONA BRONCE: $120 → $140
UPDATE reservas
SET precio = 140.00, updated_at = NOW()
WHERE precio = 120.00;

-- Actualizar por fila si el precio no coincide (casos especiales o precios NULL)
-- ZONA ORO por fila (A-I) si no tiene precio correcto
UPDATE reservas
SET precio = 200.00, updated_at = NOW()
WHERE fila IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')
  AND precio != 200.00
  AND (precio IS NULL OR precio NOT IN (200.00, 180.00, 140.00));

-- ZONA PLATA por fila (J-W) si no tiene precio correcto
UPDATE reservas
SET precio = 180.00, updated_at = NOW()
WHERE fila IN ('J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W')
  AND precio != 180.00
  AND (precio IS NULL OR precio NOT IN (200.00, 180.00, 140.00));

-- ZONA BRONCE por fila (II, HH, JJ, KK) si no tiene precio correcto
UPDATE reservas
SET precio = 140.00, updated_at = NOW()
WHERE fila IN ('II', 'HH', 'JJ', 'KK')
  AND precio != 140.00
  AND (precio IS NULL OR precio NOT IN (200.00, 180.00, 140.00));

-- Actualizar por campo zona si existe (como respaldo)
UPDATE reservas
SET precio = 200.00, updated_at = NOW()
WHERE UPPER(zona) LIKE '%ORO%'
  AND precio != 200.00;

UPDATE reservas
SET precio = 180.00, updated_at = NOW()
WHERE UPPER(zona) LIKE '%PLATA%'
  AND precio != 180.00;

UPDATE reservas
SET precio = 140.00, updated_at = NOW()
WHERE UPPER(zona) LIKE '%BRONCE%'
  AND precio != 140.00;

-- Verificar resultados por precio
SELECT 
  precio,
  COUNT(*) as total_reservas
FROM reservas
WHERE precio IN (200.00, 180.00, 140.00, 120.00, 160.00)
GROUP BY precio
ORDER BY precio DESC;

-- Verificar resultados por nivel (función)
SELECT 
  nivel,
  precio,
  COUNT(*) as total_reservas
FROM reservas
WHERE precio IN (200.00, 180.00, 140.00)
GROUP BY nivel, precio
ORDER BY nivel, precio DESC;

COMMIT;


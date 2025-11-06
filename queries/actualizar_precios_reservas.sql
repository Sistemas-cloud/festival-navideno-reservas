-- ============================================
-- QUERY PARA ACTUALIZAR PRECIOS DE RESERVAS
-- ============================================
-- Actualiza los precios de todas las reservas según la zona:
-- - Oro: $180 → $200
-- - Plata: $160 → $180
-- - Bronce: $120 → $140
-- 
-- La actualización se basa en tres criterios (en orden de prioridad):
-- 1. Campo 'zona' (si contiene "ORO", "PLATA" o "BRONCE")
-- 2. Fila del asiento (A-I = Oro, J-W = Plata, II/HH/JJ/KK = Bronce)
-- 3. Precio actual (180 = Oro, 160 = Plata, 120 = Bronce)
-- ============================================

-- Actualizar ZONA ORO: $180 → $200
UPDATE reservas
SET 
  precio = 200.00,
  updated_at = NOW()
WHERE 
  (
    -- Por campo zona
    (UPPER(zona) LIKE '%ORO%')
    OR
    -- Por fila (Oro: A, B, C, D, E, F, G, H, I)
    (fila IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'))
    OR
    -- Por precio actual
    (precio = 180.00)
  )
  AND precio != 200.00; -- Solo actualizar si el precio no es ya el correcto

-- Actualizar ZONA PLATA: $160 → $180
UPDATE reservas
SET 
  precio = 180.00,
  updated_at = NOW()
WHERE 
  (
    -- Por campo zona
    (UPPER(zona) LIKE '%PLATA%')
    OR
    -- Por fila (Plata: J, K, L, M, N, O, P, Q, R, S, T, U, V, W)
    (fila IN ('J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'))
    OR
    -- Por precio actual
    (precio = 160.00)
  )
  AND precio != 180.00; -- Solo actualizar si el precio no es ya el correcto

-- Actualizar ZONA BRONCE: $120 → $140
UPDATE reservas
SET 
  precio = 140.00,
  updated_at = NOW()
WHERE 
  (
    -- Por campo zona
    (UPPER(zona) LIKE '%BRONCE%')
    OR
    -- Por fila (Bronce: II, HH, JJ, KK)
    (fila IN ('II', 'HH', 'JJ', 'KK'))
    OR
    -- Por precio actual
    (precio = 120.00)
  )
  AND precio != 140.00; -- Solo actualizar si el precio no es ya el correcto

-- ============================================
-- VERIFICACIÓN: Ver resumen de precios actualizados
-- ============================================
SELECT 
  CASE 
    WHEN precio = 200.00 THEN 'ZONA ORO'
    WHEN precio = 180.00 THEN 'ZONA PLATA'
    WHEN precio = 140.00 THEN 'ZONA BRONCE'
    ELSE 'OTRA'
  END AS zona_identificada,
  COUNT(*) AS cantidad_reservas,
  precio AS precio_actual
FROM reservas
WHERE precio IN (200.00, 180.00, 140.00, 120.00, 160.00)
GROUP BY 
  CASE 
    WHEN precio = 200.00 THEN 'ZONA ORO'
    WHEN precio = 180.00 THEN 'ZONA PLATA'
    WHEN precio = 140.00 THEN 'ZONA BRONCE'
    ELSE 'OTRA'
  END,
  precio
ORDER BY precio DESC;

-- ============================================
-- VERIFICACIÓN: Ver reservas que no fueron actualizadas (si las hay)
-- ============================================
SELECT 
  id,
  fila,
  asiento,
  zona,
  precio,
  estado,
  nivel
FROM reservas
WHERE precio NOT IN (200.00, 180.00, 140.00)
  AND precio IS NOT NULL
  AND precio > 0
ORDER BY precio DESC;


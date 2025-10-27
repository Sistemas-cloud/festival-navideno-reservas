-- ============================================
-- QUERIES PARA CONTAR FAMILIAS ÚNICAS
-- Basadas en la lógica de hermanos del sistema
-- ============================================

-- ============================================
-- QUERY 1: Contar familias por teléfono de padre/tutor
-- ============================================
-- Esta query agrupa alumnos que tienen el mismo número de teléfono
-- en sus registros de padres/tutores
WITH familias_por_telefono AS (
  SELECT 
    af1.alumno_id,
    af1.familiar_cel AS telefono_familia,
    a.alumno_ref,
    a.alumno_app || ' ' || a.alumno_apm || ' ' || a.alumno_nombre AS nombre_completo
  FROM alumno_familiar af1
  INNER JOIN alumno a ON af1.alumno_id = a.alumno_id
  WHERE af1.familiar_cel IS NOT NULL 
    AND af1.familiar_cel != ''
    AND af1.tutor_id IN (1, 2) -- Padres/Tutores principales
    AND a.alumno_ciclo_escolar = 22
    AND a.alumno_status IN (1, 2) -- Activos
)
SELECT 
  COUNT(DISTINCT telefono_familia) AS total_familias_por_telefono
FROM familias_por_telefono;

-- ============================================
-- QUERY 2: Contar familias por CURP de padre/tutor
-- ============================================
WITH familias_por_curp AS (
  SELECT 
    af1.alumno_id,
    af1.familiar_curp AS curp_familia,
    a.alumno_ref,
    a.alumno_app || ' ' || a.alumno_apm || ' ' || a.alumno_nombre AS nombre_completo
  FROM alumno_familiar af1
  INNER JOIN alumno a ON af1.alumno_id = a.alumno_id
  WHERE af1.familiar_curp IS NOT NULL 
    AND af1.familiar_curp != ''
    AND af1.tutor_id IN (1, 2) -- Padres/Tutores principales
    AND a.alumno_ciclo_escolar = 22
    AND a.alumno_status IN (1, 2) -- Activos
)
SELECT 
  COUNT(DISTINCT curp_familia) AS total_familias_por_curp
FROM familias_por_curp;

-- ============================================
-- QUERY 3: Contar familias únicas (combina teléfono OR CURP)
-- ============================================
-- Esta query cuenta familias donde los alumnos están relacionados
-- por compartir el mismo teléfono O la misma CURP de padres/tutores
WITH familias_combinadas AS (
  SELECT DISTINCT
    a1.alumno_id AS alumno1_id,
    a2.alumno_id AS alumno2_id,
    'telefono' AS criterio
  FROM alumno_familiar af1
  INNER JOIN alumno a1 ON af1.alumno_id = a1.alumno_id
  INNER JOIN alumno_familiar af2 ON af1.familiar_cel = af2.familiar_cel 
    AND af1.familiar_cel IS NOT NULL 
    AND af1.familiar_cel != ''
  INNER JOIN alumno a2 ON af2.alumno_id = a2.alumno_id
  WHERE af1.tutor_id IN (1, 2)
    AND af2.tutor_id IN (1, 2)
    AND a1.alumno_ciclo_escolar = 22
    AND a2.alumno_ciclo_escolar = 22
    AND a1.alumno_status IN (1, 2)
    AND a2.alumno_status IN (1, 2)
    AND a1.alumno_id < a2.alumno_id -- Evitar duplicados
  
  UNION
  
  SELECT DISTINCT
    a1.alumno_id AS alumno1_id,
    a2.alumno_id AS alumno2_id,
    'curp' AS criterio
  FROM alumno_familiar af1
  INNER JOIN alumno a1 ON af1.alumno_id = a1.alumno_id
  INNER JOIN alumno_familiar af2 ON af1.familiar_curp = af2.familiar_curp 
    AND af1.familiar_curp IS NOT NULL 
    AND af1.familiar_curp != ''
  INNER JOIN alumno a2 ON af2.alumno_id = a2.alumno_id
  WHERE af1.tutor_id IN (1, 2)
    AND af2.tutor_id IN (1, 2)
    AND a1.alumno_ciclo_escolar = 22
    AND a2.alumno_ciclo_escolar = 22
    AND a1.alumno_status IN (1, 2)
    AND a2.alumno_status IN (1, 2)
    AND a1.alumno_id < a2.alumno_id -- Evitar duplicados
),
familias_unicas AS (
  -- Agrupar alumnos que están relacionados (transitivo)
  SELECT DISTINCT
    LEAST(alumno1_id, alumno2_id) AS familia_id,
    alumno1_id,
    alumno2_id
  FROM familias_combinadas
)
SELECT 
  COUNT(DISTINCT familia_id) AS total_familias_unicas,
  COUNT(*) AS total_relaciones_entre_hermanos
FROM familias_unicas;

-- ============================================
-- QUERY 4: Detalle de familias (para análisis)
-- ============================================
WITH familias_combinadas AS (
  SELECT DISTINCT
    a1.alumno_id AS alumno1_id,
    a1.alumno_ref AS ref1,
    a1.alumno_app || ' ' || a1.alumno_apm || ' ' || a1.alumno_nombre AS nombre1,
    a2.alumno_id AS alumno2_id,
    a2.alumno_ref AS ref2,
    a2.alumno_app || ' ' || a2.alumno_apm || ' ' || a2.alumno_nombre AS nombre2,
    COALESCE(af1.familiar_cel, '') AS telefono,
    COALESCE(af1.familiar_curp, '') AS curp
  FROM alumno_familiar af1
  INNER JOIN alumno a1 ON af1.alumno_id = a1.alumno_id
  INNER JOIN alumno_familiar af2 ON (
    (af1.familiar_cel = af2.familiar_cel AND af1.familiar_cel IS NOT NULL AND af1.familiar_cel != '')
    OR (af1.familiar_curp = af2.familiar_curp AND af1.familiar_curp IS NOT NULL AND af1.familiar_curp != '')
  )
  INNER JOIN alumno a2 ON af2.alumno_id = a2.alumno_id
  WHERE af1.tutor_id IN (1, 2)
    AND af2.tutor_id IN (1, 2)
    AND a1.alumno_ciclo_escolar = 22
    AND a2.alumno_ciclo_escolar = 22
    AND a1.alumno_status IN (1, 2)
    AND a2.alumno_status IN (1, 2)
    AND a1.alumno_id < a2.alumno_id
)
SELECT 
  telefono,
  curp,
  COUNT(*) AS cantidad_relaciones,
  STRING_AGG(DISTINCT ref1::text || ' - ' || nombre1, ', ') AS alumnos_relacionados
FROM familias_combinadas
GROUP BY telefono, curp
ORDER BY cantidad_relaciones DESC;

-- ============================================
-- QUERY 5: Resumen de familias con estadísticas
-- ============================================
WITH hermanos_por_familia AS (
  SELECT 
    COALESCE(af1.familiar_cel, af1.familiar_curp, 'SIN_DATOS') AS identificador_familia,
    COUNT(DISTINCT af1.alumno_id) AS cantidad_hijos
  FROM alumno_familiar af1
  INNER JOIN alumno a ON af1.alumno_id = a.alumno_id
  WHERE af1.tutor_id IN (1, 2)
    AND a.alumno_ciclo_escolar = 22
    AND a.alumno_status IN (1, 2)
    AND (af1.familiar_cel IS NOT NULL OR af1.familiar_curp IS NOT NULL)
  GROUP BY identificador_familia
)
SELECT 
  COUNT(*) AS total_familias,
  SUM(cantidad_hijos) AS total_alumnos_en_familias,
  AVG(cantidad_hijos) AS promedio_hijos_por_familia,
  MAX(cantidad_hijos) AS max_hijos_en_familia,
  MIN(cantidad_hijos) AS min_hijos_en_familia
FROM hermanos_por_familia
WHERE identificador_familia != 'SIN_DATOS';

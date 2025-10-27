-- ============================================
-- CONTAR FAMILIAS ÚNICAS POR NIVEL EDUCATIVO
-- Basado en teléfono o CURP de padres/tutores
-- ============================================

-- KINDER (Nivel 1 y 2)
SELECT 
  'Kinder (Nivel 1-2)' AS nivel_educativo,
  COUNT(DISTINCT COALESCE(af.familiar_cel, af.familiar_curp, 'SIN_DATOS_' || af.alumno_id::text)) AS total_familias,
  COUNT(DISTINCT a.alumno_ref) AS total_alumnos,
  ROUND(AVG(hijos_por_familia.cantidad), 2) AS promedio_hijos
FROM alumno_familiar af
INNER JOIN alumno a ON af.alumno_id = a.alumno_id
LEFT JOIN (
  SELECT 
    COALESCE(af2.familiar_cel, af2.familiar_curp, 'SIN_DATOS_' || af2.alumno_id::text) AS familia_id,
    COUNT(*) AS cantidad
  FROM alumno_familiar af2
  INNER JOIN alumno a2 ON af2.alumno_id = a2.alumno_id
  WHERE af2.tutor_id IN (1, 2)
    AND a2.alumno_ciclo_escolar = 22
    AND a2.alumno_status IN (1, 2)
    AND a2.alumno_nivel IN (1, 2)
  GROUP BY familia_id
) hijos_por_familia ON COALESCE(af.familiar_cel, af.familiar_curp, 'SIN_DATOS_' || af.alumno_id::text) = hijos_por_familia.familia_id
WHERE af.tutor_id IN (1, 2)
  AND a.alumno_ciclo_escolar = 22
  AND a.alumno_status IN (1, 2)
  AND a.alumno_nivel IN (1, 2)
  AND COALESCE(af.familiar_cel, af.familiar_curp) IS NOT NULL

UNION ALL

-- PRIMARIA (Nivel 3)
SELECT 
  'Primaria (Nivel 3)' AS nivel_educativo,
  COUNT(DISTINCT COALESCE(af.familiar_cel, af.familiar_curp, 'SIN_DATOS_' || af.alumno_id::text)) AS total_familias,
  COUNT(DISTINCT a.alumno_ref) AS total_alumnos,
  ROUND(AVG(hijos_por_familia.cantidad), 2) AS promedio_hijos
FROM alumno_familiar af
INNER JOIN alumno a ON af.alumno_id = a.alumno_id
LEFT JOIN (
  SELECT 
    COALESCE(af2.familiar_cel, af2.familiar_curp, 'SIN_DATOS_' || af2.alumno_id::text) AS familia_id,
    COUNT(*) AS cantidad
  FROM alumno_familiar af2
  INNER JOIN alumno a2 ON af2.alumno_id = a2.alumno_id
  WHERE af2.tutor_id IN (1, 2)
    AND a2.alumno_ciclo_escolar = 22
    AND a2.alumno_status IN (1, 2)
    AND a2.alumno_nivel = 3
  GROUP BY familia_id
) hijos_por_familia ON COALESCE(af.familiar_cel, af.familiar_curp, 'SIN_DATOS_' || af.alumno_id::text) = hijos_por_familia.familia_id
WHERE af.tutor_id IN (1, 2)
  AND a.alumno_ciclo_escolar = 22
  AND a.alumno_status IN (1, 2)
  AND a.alumno_nivel = 3
  AND COALESCE(af.familiar_cel, af.familiar_curp) IS NOT NULL

UNION ALL

-- SECUNDARIA (Nivel 4)
SELECT 
  'Secundaria (Nivel 4)' AS nivel_educativo,
  COUNT(DISTINCT COALESCE(af.familiar_cel, af.familiar_curp, 'SIN_DATOS_' || af.alumno_id::text)) AS total_familias,
  COUNT(DISTINCT a.alumno_ref) AS total_alumnos,
  ROUND(AVG(hijos_por_familia.cantidad), 2) AS promedio_hijos
FROM alumno_familiar af
INNER JOIN alumno a ON af.alumno_id = a.alumno_id
LEFT JOIN (
  SELECT 
    COALESCE(af2.familiar_cel, af2.familiar_curp, 'SIN_DATOS_' || af2.alumno_id::text) AS familia_id,
    COUNT(*) AS cantidad
  FROM alumno_familiar af2
  INNER JOIN alumno a2 ON af2.alumno_id = a2.alumno_id
  WHERE af2.tutor_id IN (1, 2)
    AND a2.alumno_ciclo_escolar = 22
    AND a2.alumno_status IN (1, 2)
    AND a2.alumno_nivel = 4
  GROUP BY familia_id
) hijos_por_familia ON COALESCE(af.familiar_cel, af.familiar_curp, 'SIN_DATOS_' || af.alumno_id::text) = hijos_por_familia.familia_id
WHERE af.tutor_id IN (1, 2)
  AND a.alumno_ciclo_escolar = 22
  AND a.alumno_status IN (1, 2)
  AND a.alumno_nivel = 4
  AND COALESCE(af.familiar_cel, af.familiar_curp) IS NOT NULL;

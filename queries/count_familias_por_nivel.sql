-- ============================================
-- CONTAR FAMILIAS ÚNICAS POR FUNCIÓN
-- Lógica correcta: 1 familia = 1 representante por función
-- Función 1: Nivel 1, 2 y Nivel 3 grado 1
-- Función 2: Nivel 3 grados 2-5
-- Función 3: Nivel 3 grado 6 y Nivel 4
-- ============================================

WITH alumnos_activos AS (
  -- Obtener todos los alumnos activos con su función asignada
  SELECT 
    a.alumno_id,
    a.alumno_ref,
    a.alumno_nivel,
    a.alumno_grado,
    af.familiar_cel,
    af.familiar_curp,
    af.tutor_id,
    -- Calcular función basada en nivel y grado
    CASE 
      WHEN a.alumno_nivel IN (1, 2) THEN 1
      WHEN a.alumno_nivel = 3 AND a.alumno_grado = 1 THEN 1
      WHEN a.alumno_nivel = 3 AND a.alumno_grado BETWEEN 2 AND 5 THEN 2
      WHEN a.alumno_nivel = 3 AND a.alumno_grado = 6 THEN 3
      WHEN a.alumno_nivel = 4 THEN 3
      ELSE NULL
    END AS funcion
  FROM alumno a
  INNER JOIN alumno_familiar af ON a.alumno_id = af.alumno_id
  WHERE a.alumno_ciclo_escolar = 22
    AND a.alumno_status IN (1, 2)
    AND af.tutor_id IN (1, 2)
    AND COALESCE(af.familiar_cel, af.familiar_curp) IS NOT NULL
),

familias_unicas AS (
  -- Identificar familias únicas y sus funciones
  SELECT 
    COALESCE(
      NULLIF(familiar_cel, ''), 
      NULLIF(familiar_curp, ''), 
      CONCAT('SIN_DATOS_', alumno_id::text)
    ) AS familia_id,
    funcion,
    MIN(alumno_id) AS representante_id,  -- Primer alumno de cada familia en cada función
    COUNT(*) AS total_hermanos_funcion
  FROM alumnos_activos
  WHERE funcion IS NOT NULL
  GROUP BY 
    COALESCE(
      NULLIF(familiar_cel, ''), 
      NULLIF(familiar_curp, ''), 
      CONCAT('SIN_DATOS_', alumno_id::text)
    ), 
    funcion
),

-- FUNCIÓN 1: Nivel 1, 2 y Nivel 3 grado 1
funcion1_stats AS (
  SELECT 
    '1ra Función (Nivel 1, 2 y 3er grado 1)' AS funcion_desc,
    1 AS funcion_num,
    COUNT(DISTINCT representante_id) AS total_familias,
    ROUND(AVG(total_hermanos_funcion), 2) AS promedio_hijos
  FROM familias_unicas
  WHERE funcion = 1
),

-- FUNCIÓN 2: Nivel 3 grados 2-5
funcion2_stats AS (
  SELECT 
    '2da Función (Nivel 3 grados 2-5)' AS funcion_desc,
    2 AS funcion_num,
    COUNT(DISTINCT representante_id) AS total_familias,
    ROUND(AVG(total_hermanos_funcion), 2) AS promedio_hijos
  FROM familias_unicas
  WHERE funcion = 2
),

-- FUNCIÓN 3: Nivel 3 grado 6 y Nivel 4
funcion3_stats AS (
  SELECT 
    '3ra Función (Nivel 3 grado 6 y Nivel 4)' AS funcion_desc,
    3 AS funcion_num,
    COUNT(DISTINCT representante_id) AS total_familias,
    ROUND(AVG(total_hermanos_funcion), 2) AS promedio_hijos
  FROM familias_unicas
  WHERE funcion = 3
)

-- Resultado final
SELECT 
  funcion_num,
  funcion_desc AS funcion,
  total_familias,
  promedio_hijos
FROM funcion1_stats
UNION ALL
SELECT 
  funcion_num,
  funcion_desc AS funcion,
  total_familias,
  promedio_hijos
FROM funcion2_stats
UNION ALL
SELECT 
  funcion_num,
  funcion_desc AS funcion,
  total_familias,
  promedio_hijos
FROM funcion3_stats
ORDER BY funcion_num;

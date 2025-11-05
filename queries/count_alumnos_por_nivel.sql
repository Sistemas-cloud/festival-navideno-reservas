-- ============================================
-- CONTAR ALUMNOS ACTIVOS POR NIVEL EDUCATIVO
-- Ciclo escolar 22
-- ============================================

SELECT 
  CASE a.alumno_nivel
    WHEN 1 THEN 'Kinder (Nivel 1)'
    WHEN 2 THEN 'Kinder (Nivel 2)'
    WHEN 3 THEN 'Primaria (Nivel 3)'
    WHEN 4 THEN 'Secundaria (Nivel 4)'
    ELSE 'Nivel Desconocido'
  END AS nivel_educativo,
  COUNT(*) AS total_alumnos
FROM alumno a
WHERE a.alumno_ciclo_escolar = 22
  AND a.alumno_status IN (1, 2)
GROUP BY a.alumno_nivel
ORDER BY a.alumno_nivel;

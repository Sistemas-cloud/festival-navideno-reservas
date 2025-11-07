-- ============================================
-- QUERY DE VERIFICACIÓN ANTES DE BORRAR
-- ============================================
-- 
-- Ejecuta esta query ANTES de borrar para ver:
-- 1. Cuántos registros se van a eliminar
-- 2. Qué usuarios se verán afectados
-- 3. Detalles de las reservas que se eliminarán
-- ============================================

-- 1. Resumen general
SELECT 
    COUNT(*) as total_reservas_a_eliminar,
    COUNT(DISTINCT referencia) as usuarios_afectados,
    SUM(CASE WHEN estado = 'reservado' THEN 1 ELSE 0 END) as reservados,
    SUM(CASE WHEN estado = 'pagado' THEN 1 ELSE 0 END) as pagados,
    SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) as disponibles
FROM reservas
WHERE referencia NOT IN (
    21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
    21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
    21297, 21446, 21584, 21182, 77777, 88888, 99999
);

-- 2. Detalle por usuario
SELECT 
    r.referencia as alumno_ref,
    COUNT(*) as total_reservas,
    SUM(CASE WHEN r.estado = 'reservado' THEN 1 ELSE 0 END) as reservados,
    SUM(CASE WHEN r.estado = 'pagado' THEN 1 ELSE 0 END) as pagados,
    MIN(r.created_at) as primera_reserva,
    MAX(r.created_at) as ultima_reserva,
    STRING_AGG(DISTINCT r.zona, ', ') as zonas,
    SUM(r.precio) as total_precio
FROM reservas r
WHERE r.referencia NOT IN (
    21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
    21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
    21297, 21446, 21584, 21182, 77777, 88888, 99999
)
GROUP BY r.referencia
ORDER BY total_reservas DESC;

-- 3. Reservas que SE MANTENDRÁN (usuarios con acceso anticipado)
SELECT 
    COUNT(*) as reservas_mantenidas,
    COUNT(DISTINCT referencia) as usuarios_con_acceso_anticipado
FROM reservas
WHERE referencia IN (
    21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
    21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
    21297, 21446, 21584, 21182, 77777, 88888, 99999
);




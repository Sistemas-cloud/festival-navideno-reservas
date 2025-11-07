-- ============================================
-- QUERY SIMPLE: BORRAR RESERVAS NO AUTORIZADAS
-- ============================================
-- 
-- Esta es una versión simplificada que puedes ejecutar directamente.
-- RECUERDA: Esta operación es IRREVERSIBLE.
-- ============================================

-- BORRAR todas las reservas de usuarios que NO tienen acceso anticipado
DELETE FROM reservas
WHERE referencia NOT IN (
    -- Lista de números de control con acceso anticipado
    21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
    21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
    21297, 21446, 21584, 21182, 77777, 88888, 99999
);




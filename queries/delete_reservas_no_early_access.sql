-- ============================================
-- QUERY PARA BORRAR RESERVAS DE USUARIOS 
-- QUE NO TIENEN ACCESO ANTICIPADO
-- ============================================
-- 
-- Esta query elimina todos los registros de la tabla 'reservas'
-- cuyo campo 'referencia' (alumno_ref) NO está incluido en la
-- lista de acceso anticipado.
--
-- IMPORTANTE: Ejecuta primero la query de verificación para
-- ver cuántos registros se eliminarán antes de borrarlos.
-- ============================================

-- LISTA DE NÚMEROS DE CONTROL CON ACCESO ANTICIPADO
-- (basada en EARLY_ACCESS_CONTROLS de earlyAccess.ts)
-- 21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
-- 21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
-- 21297, 21446, 21584, 21182, 77777, 88888, 99999

-- ============================================
-- PASO 1: VERIFICACIÓN (EJECUTAR PRIMERO)
-- ============================================
-- Esta query muestra cuántos registros se van a borrar
-- y qué usuarios serán afectados

SELECT 
    COUNT(*) as total_registros_a_borrar,
    COUNT(DISTINCT referencia) as usuarios_afectados
FROM reservas
WHERE referencia NOT IN (
    21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
    21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
    21297, 21446, 21584, 21182, 77777, 88888, 99999
);

-- Ver detalle de los usuarios que serán afectados
SELECT 
    referencia as alumno_ref,
    COUNT(*) as numero_reservas,
    MIN(created_at) as primera_reserva,
    MAX(created_at) as ultima_reserva
FROM reservas
WHERE referencia NOT IN (
    21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
    21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
    21297, 21446, 21584, 21182, 77777, 88888, 99999
)
GROUP BY referencia
ORDER BY numero_reservas DESC;

-- ============================================
-- PASO 2: BACKUP (RECOMENDADO)
-- ============================================
-- Crea una copia de seguridad antes de borrar
-- (Opcional, pero altamente recomendado)

CREATE TABLE IF NOT EXISTS reservas_backup AS
SELECT * FROM reservas
WHERE referencia NOT IN (
    21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
    21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
    21297, 21446, 21584, 21182, 77777, 88888, 99999
);

-- ============================================
-- PASO 3: ELIMINACIÓN (EJECUTAR CON PRECAUCIÓN)
-- ============================================
-- Esta query BORRA permanentemente los registros
-- Solo ejecutar después de verificar y hacer backup

DELETE FROM reservas
WHERE referencia NOT IN (
    21328, 20871, 11528, 21084, 21591, 21590, 21437, 21679,
    21568, 21453, 20245, 11905, 11632, 20482, 20629, 21674,
    21297, 21446, 21584, 21182, 77777, 88888, 99999
);

-- ============================================
-- PASO 4: VERIFICACIÓN POST-ELIMINACIÓN
-- ============================================
-- Verificar que solo quedan reservas de usuarios con acceso anticipado

SELECT 
    COUNT(*) as total_reservas_restantes,
    COUNT(DISTINCT referencia) as usuarios_con_reservas
FROM reservas;

-- Listar todas las reservas restantes
SELECT 
    referencia as alumno_ref,
    COUNT(*) as numero_reservas,
    STRING_AGG(DISTINCT estado, ', ') as estados
FROM reservas
GROUP BY referencia
ORDER BY referencia;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Esta operación es IRREVERSIBLE
-- 2. Asegúrate de tener un backup antes de ejecutar
-- 3. Verifica dos veces la lista de acceso anticipado
-- 4. Considera hacer esto en horario de bajo tráfico
-- 5. Los usuarios con acceso anticipado NO perderán sus reservas


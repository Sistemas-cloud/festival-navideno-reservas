-- ============================================
-- SCHEMA PARA SUPABASE - Festival Navideño
-- ============================================

-- NOTA: La tabla 'alumno' ya está migrada, este script crea las demás tablas

-- 1. Tabla alumno_detalles (Contraseñas y detalles de alumnos)
CREATE TABLE IF NOT EXISTS alumno_detalles (
  alumno_id BIGINT NOT NULL,
  alumno_clave INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (alumno_id),
  FOREIGN KEY (alumno_id) REFERENCES alumno(alumno_id) ON DELETE CASCADE
);

-- 2. Tabla alumno_familiar (Datos de padres/tutores)
CREATE TABLE IF NOT EXISTS alumno_familiar (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL,
  familiar_app VARCHAR(100),
  familiar_apm VARCHAR(100),
  familiar_nombre VARCHAR(100),
  familiar_cel VARCHAR(20),
  familiar_curp VARCHAR(18),
  tutor_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (alumno_id) REFERENCES alumno(alumno_id) ON DELETE CASCADE
);

-- Índices para búsqueda de hermanos
CREATE INDEX IF NOT EXISTS idx_familiar_nombres ON alumno_familiar(familiar_app, familiar_apm, familiar_nombre);
CREATE INDEX IF NOT EXISTS idx_familiar_cel ON alumno_familiar(familiar_cel);
CREATE INDEX IF NOT EXISTS idx_familiar_curp ON alumno_familiar(familiar_curp);
CREATE INDEX IF NOT EXISTS idx_tutor_id ON alumno_familiar(tutor_id);

-- 3. Tabla reservas (Reservas de asientos)
CREATE TABLE IF NOT EXISTS reservas (
  id BIGSERIAL PRIMARY KEY,
  fila VARCHAR(10) NOT NULL,
  asiento INTEGER NOT NULL,
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('disponible', 'reservado', 'pagado')),
  referencia BIGINT NOT NULL,
  nivel INTEGER NOT NULL,
  fecha_pago DATE,
  precio DECIMAL(10,2),
  zona VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (fila, asiento, nivel)
);

-- Índices para la tabla reservas
CREATE INDEX IF NOT EXISTS idx_reservas_referencia ON reservas(referencia);
CREATE INDEX IF NOT EXISTS idx_reservas_nivel ON reservas(nivel);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fila_asiento ON reservas(fila, asiento);

-- 4. Tabla datos_facturacion (Datos de facturación - opcional)
CREATE TABLE IF NOT EXISTS datos_facturacion (
  id BIGSERIAL PRIMARY KEY,
  alumno_ref BIGINT NOT NULL,
  rfc VARCHAR(13),
  razon_social VARCHAR(200),
  direccion TEXT,
  email VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para datos_facturacion
CREATE INDEX IF NOT EXISTS idx_facturacion_alumno ON datos_facturacion(alumno_ref);

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE alumno_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno_familiar ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE datos_facturacion ENABLE ROW LEVEL SECURITY;

-- Políticas: Permitir todas las operaciones con service_role
-- (El backend usará service_role_key para acceso completo)

CREATE POLICY "Enable all for service role" ON alumno_detalles
  FOR ALL USING (true);

CREATE POLICY "Enable all for service role" ON alumno_familiar
  FOR ALL USING (true);

CREATE POLICY "Enable all for service role" ON reservas
  FOR ALL USING (true);

CREATE POLICY "Enable all for service role" ON datos_facturacion
  FOR ALL USING (true);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_alumno_detalles_updated_at BEFORE UPDATE ON alumno_detalles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alumno_familiar_updated_at BEFORE UPDATE ON alumno_familiar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datos_facturacion_updated_at BEFORE UPDATE ON datos_facturacion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Comentar estas líneas si no quieres datos de prueba

-- Ejemplo de alumno_detalles (contraseñas para alumnos de prueba)
-- INSERT INTO alumno_detalles (alumno_id, alumno_clave) VALUES
--   (1, 1234),
--   (2, 5678);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Para verificar que todo se creó correctamente:
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('alumno', 'alumno_detalles', 'alumno_familiar', 'reservas', 'datos_facturacion')
ORDER BY table_name;


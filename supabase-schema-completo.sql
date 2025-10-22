-- ============================================
-- SCHEMA COMPLETO PARA SUPABASE - Festival Navideño
-- Incluye TODAS las columnas de MySQL
-- ============================================

-- NOTA: La tabla 'alumno' ya está migrada, este script actualiza/crea las demás tablas

-- ============================================
-- 1. TABLA: alumno_detalles (ESTRUCTURA COMPLETA)
-- ============================================
DROP TABLE IF EXISTS alumno_detalles CASCADE;

CREATE TABLE alumno_detalles (
  detalle_id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL,
  alumno_clave VARCHAR(20),
  alumno_fecha_nac DATE,
  alumno_lugar_nac VARCHAR(50),
  alumno_curp VARCHAR(18),
  alumno_sexo VARCHAR(1), -- 'H' = Hombre, 'M' = Mujer
  alumno_calle VARCHAR(100),
  alumno_numero VARCHAR(50),
  alumno_numeroint VARCHAR(50),
  alumno_colonia VARCHAR(100),
  alumno_cp INTEGER,
  alumno_entre_calles VARCHAR(150),
  estado_id VARCHAR(200),
  cuidad_id VARCHAR(200), -- Nota: typo original de MySQL
  alumno_escuela_procedente VARCHAR(50),
  tipo_relacion INTEGER, -- Relacion entre tutores
  comentario_relacion VARCHAR(100), -- Comentario sobre relacion de tutores
  detalle_registro TIMESTAMP WITH TIME ZONE,
  detalle_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_detalles_alumno FOREIGN KEY (alumno_id) 
    REFERENCES alumno(alumno_id) ON DELETE CASCADE
);

-- Índices para alumno_detalles
CREATE INDEX idx_detalles_alumno_id ON alumno_detalles(alumno_id);
CREATE INDEX idx_detalles_alumno_clave ON alumno_detalles(alumno_clave);
CREATE INDEX idx_detalles_curp ON alumno_detalles(alumno_curp);

-- ============================================
-- 2. TABLA: alumno_familiar (ESTRUCTURA COMPLETA)
-- ============================================
DROP TABLE IF EXISTS alumno_familiar CASCADE;

CREATE TABLE alumno_familiar (
  familiar_id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL,
  tutor_id SMALLINT, -- 1 = Padre, 2 = Madre, etc.
  familiar_app VARCHAR(50),
  familiar_apm VARCHAR(50),
  familiar_nombre VARCHAR(50),
  familiar_tel VARCHAR(20),
  familiar_cel VARCHAR(20),
  familiar_email VARCHAR(100),
  familiar_recibir_email SMALLINT NOT NULL DEFAULT 0,
  familiar_fecha_nac DATE,
  familiar_lugar_nac VARCHAR(50),
  familiar_curp VARCHAR(18),
  familiar_escolaridad VARCHAR(50),
  familiar_empresa_nombre VARCHAR(100),
  familiar_empresa_direccion VARCHAR(200),
  familiar_empresa_puesto VARCHAR(100),
  familiar_empresa_tel VARCHAR(20),
  familiar_vive SMALLINT NOT NULL DEFAULT 1,
  familiar_registro DATE,
  familiar_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  familiar_rfc VARCHAR(13),
  familiar_factura SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_familiar_alumno FOREIGN KEY (alumno_id) 
    REFERENCES alumno(alumno_id) ON DELETE CASCADE
);

-- Índices para alumno_familiar
CREATE INDEX idx_familiar_alumno_id ON alumno_familiar(alumno_id);
CREATE INDEX idx_familiar_tutor_id ON alumno_familiar(tutor_id);
CREATE INDEX idx_familiar_nombres ON alumno_familiar(familiar_app, familiar_apm, familiar_nombre);
CREATE INDEX idx_familiar_cel ON alumno_familiar(familiar_cel);
CREATE INDEX idx_familiar_curp ON alumno_familiar(familiar_curp);
CREATE INDEX idx_familiar_email ON alumno_familiar(familiar_email);

-- ============================================
-- 3. TABLA: reservas (YA CREADA, PERO POR SI ACASO)
-- ============================================
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

-- Índices para reservas
CREATE INDEX IF NOT EXISTS idx_reservas_referencia ON reservas(referencia);
CREATE INDEX IF NOT EXISTS idx_reservas_nivel ON reservas(nivel);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fila_asiento ON reservas(fila, asiento);

-- ============================================
-- 4. TABLA: datos_facturacion (OPCIONAL)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_facturacion_alumno ON datos_facturacion(alumno_ref);

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE alumno_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno_familiar ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE datos_facturacion ENABLE ROW LEVEL SECURITY;

-- Políticas: Permitir acceso completo con service_role
DROP POLICY IF EXISTS "Enable all for service role" ON alumno_detalles;
CREATE POLICY "Enable all for service role" ON alumno_detalles
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for service role" ON alumno_familiar;
CREATE POLICY "Enable all for service role" ON alumno_familiar
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for service role" ON reservas;
CREATE POLICY "Enable all for service role" ON reservas
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for service role" ON datos_facturacion;
CREATE POLICY "Enable all for service role" ON datos_facturacion
  FOR ALL USING (true);

-- ============================================
-- FUNCIONES Y TRIGGERS
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
DROP TRIGGER IF EXISTS update_alumno_detalles_updated_at ON alumno_detalles;
CREATE TRIGGER update_alumno_detalles_updated_at 
  BEFORE UPDATE ON alumno_detalles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alumno_familiar_updated_at ON alumno_familiar;
CREATE TRIGGER update_alumno_familiar_updated_at 
  BEFORE UPDATE ON alumno_familiar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservas_updated_at ON reservas;
CREATE TRIGGER update_reservas_updated_at 
  BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_datos_facturacion_updated_at ON datos_facturacion;
CREATE TRIGGER update_datos_facturacion_updated_at 
  BEFORE UPDATE ON datos_facturacion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('alumno', 'alumno_detalles', 'alumno_familiar', 'reservas', 'datos_facturacion')
ORDER BY table_name;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================


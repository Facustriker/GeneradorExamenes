-- Crear tabla de cátedras
CREATE TABLE IF NOT EXISTS catedras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de exámenes
CREATE TABLE IF NOT EXISTS examenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  catedra_id UUID NOT NULL REFERENCES catedras(id) ON DELETE CASCADE,
  preguntas JSONB NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar algunas cátedras de ejemplo
INSERT INTO catedras (nombre) VALUES 
  ('Matemática'),
  ('Física'),
  ('Química'),
  ('Historia'),
  ('Literatura')
ON CONFLICT (nombre) DO NOTHING;

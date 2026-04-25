-- 📋 Migración limpia: Tabla archived_conversations (DROP y recrear políticas)
-- Si la tabla ya existe, simplemente recreamos las políticas

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view their archived conversations" ON archived_conversations;
DROP POLICY IF EXISTS "Users can archive conversations" ON archived_conversations;
DROP POLICY IF EXISTS "Users can unarchive conversations" ON archived_conversations;

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS archived_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  other_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  archived_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, other_user_id)
);

-- Habilitar RLS
ALTER TABLE archived_conversations ENABLE ROW LEVEL SECURITY;

-- Crear nuevas políticas (ahora sin conflictos)
CREATE POLICY "Users can view their archived conversations" ON archived_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can archive conversations" ON archived_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unarchive conversations" ON archived_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para queries rápidas (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS archived_conversations_user_id_idx ON archived_conversations(user_id);
CREATE INDEX IF NOT EXISTS archived_conversations_other_user_id_idx ON archived_conversations(other_user_id);

-- Verificación final
SELECT 
  'Table Status' as check_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM archived_conversations;

SELECT 
  'Policies' as check_type,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'archived_conversations' 
ORDER BY policyname;

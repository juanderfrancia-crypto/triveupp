-- 📋 Tabla para archivar conversaciones (soft delete)
-- Cuando un usuario "elimina" una conversación, solo la oculta de su lista

CREATE TABLE IF NOT EXISTS archived_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  other_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  archived_at TIMESTAMP DEFAULT now(),
  
  -- Índices para búsqueda rápida
  UNIQUE(user_id, other_user_id)
);

-- Habilitar RLS
ALTER TABLE archived_conversations ENABLE ROW LEVEL SECURITY;

-- RLS: El usuario solo puede ver/gestionar sus propios archivos
CREATE POLICY "Users can view their archived conversations" ON archived_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can archive conversations" ON archived_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unarchive conversations" ON archived_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Índice para queries rápidas
CREATE INDEX IF NOT EXISTS archived_conversations_user_id_idx ON archived_conversations(user_id);
CREATE INDEX IF NOT EXISTS archived_conversations_other_user_id_idx ON archived_conversations(other_user_id);

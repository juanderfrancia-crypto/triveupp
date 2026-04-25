-- 🔧 FIX: Actualizar RLS Policies para messages
-- Solo el sender (from_user_id) puede actualizar/eliminar sus mensajes

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can update their messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON messages;

-- Crear nuevas políticas más restrictivas
CREATE POLICY "Users can update their messages" ON messages 
  FOR UPDATE 
  USING (auth.uid() = from_user_id) 
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can delete their messages" ON messages 
  FOR DELETE 
  USING (auth.uid() = from_user_id);

-- Verificar las políticas
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

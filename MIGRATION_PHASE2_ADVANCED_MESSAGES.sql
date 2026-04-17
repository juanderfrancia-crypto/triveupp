-- MIGRATION: Phase 2 - Advanced Message Features
-- Adds: Reply/Quote, Pin messages, Edit message functionality
-- Date: 2026-04-15

-- 1. Add reply_to_id column (for replies/quotes)
ALTER TABLE messages ADD COLUMN reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;

-- 2. Add is_pinned column
ALTER TABLE messages ADD COLUMN is_pinned boolean DEFAULT false;

-- 3. Add edited_at column (when message was last edited)
ALTER TABLE messages ADD COLUMN edited_at timestamp with time zone;

-- 4. Add edited_by column (who edited it - should be from_user_id if they own it)
ALTER TABLE messages ADD COLUMN edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Create index on reply_to_id for performance
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);

-- 6. Create index on is_pinned for quick pinned message queries
CREATE INDEX idx_messages_is_pinned ON messages(is_pinned);

-- 7. Create index on conversation (from_user_id + to_user_id) for faster queries
CREATE INDEX idx_messages_conversation ON messages(from_user_id, to_user_id);

-- 8. Create index on edited_at for sorting
CREATE INDEX idx_messages_edited_at ON messages(edited_at);

-- Enable RLS for new columns (inherit from messages table policies)
-- No additional policies needed - they inherit from existing message table

-- Verification queries:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='messages' ORDER BY ordinal_position;
-- SELECT * FROM messages WHERE is_pinned = true LIMIT 5;
-- SELECT * FROM messages WHERE reply_to_id IS NOT NULL LIMIT 5;

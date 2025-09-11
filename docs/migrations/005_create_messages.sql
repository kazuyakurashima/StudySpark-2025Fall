-- Migration: 005_create_messages.sql
-- Description: Create messages and ai_coach_messages tables
-- Depends on: 001_create_profiles_table.sql

-- Create messages table (for parent-to-student messages)
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('encouragement', 'feedback')),
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create ai_coach_messages table
CREATE TABLE IF NOT EXISTS ai_coach_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('greeting', 'encouragement', 'streak')),
  content text NOT NULL,
  trigger_data jsonb, -- Store context data that triggered the message
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_ai_coach_messages_student_id ON ai_coach_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_messages_created_at ON ai_coach_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_coach_messages_type ON ai_coach_messages(message_type);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
-- Users can view messages where they are sender or recipient
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));

-- Users can send messages (but only parents can send to their children)
CREATE POLICY "Parents can send messages to children" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM profiles sender, profiles recipient
      WHERE sender.id = auth.uid()
        AND recipient.id = messages.recipient_id
        AND sender.role = 'parent'
        AND recipient.parent_id = sender.id
    )
  );

-- Recipients can update read status
CREATE POLICY "Recipients can mark messages as read" ON messages
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Enable RLS on ai_coach_messages
ALTER TABLE ai_coach_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_coach_messages
-- Students can view their own AI coach messages
CREATE POLICY "Students can view own ai coach messages" ON ai_coach_messages
  FOR SELECT USING (auth.uid() = student_id);

-- Parents can view their children's AI coach messages
CREATE POLICY "Parents can view children ai coach messages" ON ai_coach_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = ai_coach_messages.student_id
        AND profiles.parent_id = auth.uid()
    )
  );

-- Coaches can view AI coach messages for students in their classes
CREATE POLICY "Coaches can view class students ai coach messages" ON ai_coach_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles coach_profile
      JOIN classes ON classes.coach_id = coach_profile.id
      JOIN class_memberships ON class_memberships.class_id = classes.id
      WHERE coach_profile.id = auth.uid()
        AND coach_profile.role = 'coach'
        AND class_memberships.student_id = ai_coach_messages.student_id
    )
  );

-- System can insert AI coach messages (this policy might need adjustment based on how you implement AI message generation)
CREATE POLICY "System can insert ai coach messages" ON ai_coach_messages
  FOR INSERT WITH CHECK (true); -- You might want to restrict this to a service role

-- Migration: 009_add_coach_policies.sql
-- Description: Add coach-related RLS policies that depend on classes tables
-- Depends on: 001_create_profiles_table.sql, 002_create_classes_and_memberships.sql

-- Add coach policy for profiles table
CREATE POLICY "Coaches can view their students profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles coach_profile
      JOIN classes ON classes.coach_id = coach_profile.id
      JOIN class_memberships ON class_memberships.class_id = classes.id
      WHERE coach_profile.id = auth.uid()
        AND coach_profile.role = 'coach'
        AND class_memberships.student_id = profiles.id
    )
  );
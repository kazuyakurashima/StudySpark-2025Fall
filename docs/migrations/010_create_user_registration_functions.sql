-- Migration: 010_create_user_registration_functions.sql
-- Description: Create functions and triggers for automatic user profile creation
-- Depends on: 001_create_profiles_table.sql

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role text := 'student'; -- Default role
  user_name text;
  coach_code_value text;
BEGIN
  -- Extract metadata from raw_user_meta_data if available
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_name := NEW.raw_user_meta_data->>'name';
    coach_code_value := NEW.raw_user_meta_data->>'coach_code';
  END IF;

  -- Insert into profiles table
  INSERT INTO profiles (
    id,
    email,
    name,
    role,
    coach_code,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_role,
    coach_code_value,
    NOW(),
    NOW()
  );

  -- Initialize learning streak for students
  IF user_role = 'student' THEN
    INSERT INTO learning_streaks (
      student_id,
      current_streak,
      longest_streak,
      updated_at
    ) VALUES (
      NEW.id,
      0,
      0,
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Function to handle user profile updates
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update email in profiles if it changed
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE profiles 
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to update profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Clean up related data (profiles table has CASCADE DELETE, but for safety)
  DELETE FROM learning_streaks WHERE student_id = OLD.id;
  DELETE FROM ai_coach_messages WHERE student_id = OLD.id;
  DELETE FROM messages WHERE sender_id = OLD.id OR recipient_id = OLD.id;
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to cleanup data for user %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$;

-- Function to validate coach code during registration
CREATE OR REPLACE FUNCTION validate_coach_registration(
  user_id uuid,
  provided_coach_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_valid boolean := false;
BEGIN
  -- Check if coach code is valid
  -- In production, this should check against a proper coach codes table
  SELECT validate_coach_code(provided_coach_code) INTO is_valid;
  
  IF NOT is_valid THEN
    RAISE EXCEPTION 'Invalid coach code provided: %', provided_coach_code;
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Coach code validation failed for user %: %', user_id, SQLERRM;
    RETURN false;
END;
$$;

-- Function to create parent-child relationship
CREATE OR REPLACE FUNCTION create_parent_child_relationship(
  parent_email text,
  child_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  parent_id uuid;
  child_id uuid;
BEGIN
  -- Get parent ID
  SELECT id INTO parent_id 
  FROM profiles 
  WHERE email = parent_email AND role = 'parent';
  
  IF parent_id IS NULL THEN
    RAISE EXCEPTION 'Parent not found with email: %', parent_email;
  END IF;
  
  -- Get child ID
  SELECT id INTO child_id 
  FROM profiles 
  WHERE email = child_email AND role = 'student';
  
  IF child_id IS NULL THEN
    RAISE EXCEPTION 'Student not found with email: %', child_email;
  END IF;
  
  -- Update child's parent_id
  UPDATE profiles 
  SET parent_id = parent_id, updated_at = NOW()
  WHERE id = child_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create parent-child relationship: %', SQLERRM;
    RETURN false;
END;
$$;

-- Function to add student to class
CREATE OR REPLACE FUNCTION add_student_to_class(
  student_email text,
  class_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  student_id uuid;
BEGIN
  -- Get student ID
  SELECT id INTO student_id 
  FROM profiles 
  WHERE email = student_email AND role = 'student';
  
  IF student_id IS NULL THEN
    RAISE EXCEPTION 'Student not found with email: %', student_email;
  END IF;
  
  -- Check if class exists
  IF NOT EXISTS (SELECT 1 FROM classes WHERE id = class_id) THEN
    RAISE EXCEPTION 'Class not found with ID: %', class_id;
  END IF;
  
  -- Add to class (ON CONFLICT to handle duplicates)
  INSERT INTO class_memberships (student_id, class_id, joined_at)
  VALUES (student_id, class_id, NOW())
  ON CONFLICT (student_id, class_id) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to add student to class: %', SQLERRM;
    RETURN false;
END;
$$;
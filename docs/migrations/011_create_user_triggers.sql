-- Migration: 011_create_user_triggers.sql
-- Description: Create triggers for automatic user lifecycle management
-- Depends on: 010_create_user_registration_functions.sql

-- Trigger for new user registration
-- This triggers when a new user is created in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger for user updates
-- This triggers when user data is updated in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_update();

-- Trigger for user deletion
-- This triggers before a user is deleted from auth.users
CREATE OR REPLACE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_delete();

-- Optional: Trigger to update learning streaks when learning records are added
-- This depends on learning_records table being created first
CREATE OR REPLACE TRIGGER update_streak_on_learning_record
  AFTER INSERT OR UPDATE OF study_date ON learning_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_learning_streak();

-- Grant necessary permissions
-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_update() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_delete() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_coach_registration(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_parent_child_relationship(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_student_to_class(text, uuid) TO authenticated;

-- Grant execute permission on utility functions
GRANT EXECUTE ON FUNCTION update_learning_streak(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_update_learning_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_coach_code(text) TO authenticated;

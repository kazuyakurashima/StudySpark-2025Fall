-- ============================================================================
-- 20251006000013_update_rls_policies.sql
-- 説明: Phase 0 RLS 詳細ポリシー整備および WITH CHECK 追加
-- ============================================================================

-- ================================
-- parent_child_relations
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Parents can view own children relations" ON public.parent_child_relations;
  DROP POLICY IF EXISTS "Students can view own parent relations" ON public.parent_child_relations;
  DROP POLICY IF EXISTS "Admins can manage all parent-child relations" ON public.parent_child_relations;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Parents can view own children relations"
  ON public.parent_child_relations
  FOR SELECT
  TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.parents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own parent relations"
  ON public.parent_child_relations
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all parent-child relations"
  ON public.parent_child_relations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- coach_student_relations
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Coaches can view own students relations" ON public.coach_student_relations;
  DROP POLICY IF EXISTS "Students can view own coaches relations" ON public.coach_student_relations;
  DROP POLICY IF EXISTS "Admins can manage all coach-student relations" ON public.coach_student_relations;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Coaches can view own students relations"
  ON public.coach_student_relations
  FOR SELECT
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM public.coaches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own coaches relations"
  ON public.coach_student_relations
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all coach-student relations"
  ON public.coach_student_relations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- study_logs
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own study logs" ON public.study_logs;
  DROP POLICY IF EXISTS "Parents can view children study logs" ON public.study_logs;
  DROP POLICY IF EXISTS "Coaches can view assigned students study logs" ON public.study_logs;
  DROP POLICY IF EXISTS "Admins can manage all study logs" ON public.study_logs;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own study logs"
  ON public.study_logs
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children study logs"
  ON public.study_logs
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students study logs"
  ON public.study_logs
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all study logs"
  ON public.study_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- encouragement_messages
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can view and mark read own messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Students can view own encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Students can update read status on own messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Students can update read status on own encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can view children messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can view children encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can send messages to children" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can manage own sent encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can delete own sent encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can send encouragement messages to their children" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can view assigned students messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can view assigned students encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can send messages to assigned students" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can manage own sent encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can delete own sent encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can send encouragement messages to assigned students" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Admins can manage all encouragement messages" ON public.encouragement_messages;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can view own encouragement messages"
  ON public.encouragement_messages
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update read status on own encouragement messages"
  ON public.encouragement_messages
  FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children encouragement messages"
  ON public.encouragement_messages
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage own sent encouragement messages"
  ON public.encouragement_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own sent encouragement messages"
  ON public.encouragement_messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can send encouragement messages to their children"
  ON public.encouragement_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students encouragement messages"
  ON public.encouragement_messages
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can manage own sent encouragement messages"
  ON public.encouragement_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete own sent encouragement messages"
  ON public.encouragement_messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can send encouragement messages to assigned students"
  ON public.encouragement_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all encouragement messages"
  ON public.encouragement_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- test_goals
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own test goals" ON public.test_goals;
  DROP POLICY IF EXISTS "Parents can view children test goals" ON public.test_goals;
  DROP POLICY IF EXISTS "Coaches can view assigned students test goals" ON public.test_goals;
  DROP POLICY IF EXISTS "Admins can manage all test goals" ON public.test_goals;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own test goals"
  ON public.test_goals
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children test goals"
  ON public.test_goals
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students test goals"
  ON public.test_goals
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all test goals"
  ON public.test_goals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- test_results
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own test results" ON public.test_results;
  DROP POLICY IF EXISTS "Parents can view children test results" ON public.test_results;
  DROP POLICY IF EXISTS "Coaches can view assigned students test results" ON public.test_results;
  DROP POLICY IF EXISTS "Admins can manage all test results" ON public.test_results;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own test results"
  ON public.test_results
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children test results"
  ON public.test_results
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students test results"
  ON public.test_results
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all test results"
  ON public.test_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- coaching_sessions
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own coaching sessions" ON public.coaching_sessions;
  DROP POLICY IF EXISTS "Parents can view children coaching sessions" ON public.coaching_sessions;
  DROP POLICY IF EXISTS "Coaches can view assigned students coaching sessions" ON public.coaching_sessions;
  DROP POLICY IF EXISTS "Admins can manage all coaching sessions" ON public.coaching_sessions;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own coaching sessions"
  ON public.coaching_sessions
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children coaching sessions"
  ON public.coaching_sessions
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students coaching sessions"
  ON public.coaching_sessions
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all coaching sessions"
  ON public.coaching_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- coaching_messages
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own coaching messages" ON public.coaching_messages;
  DROP POLICY IF EXISTS "Parents can view children coaching messages" ON public.coaching_messages;
  DROP POLICY IF EXISTS "Coaches can view assigned students coaching messages" ON public.coaching_messages;
  DROP POLICY IF EXISTS "Admins can manage all coaching messages" ON public.coaching_messages;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own coaching messages"
  ON public.coaching_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      JOIN public.students s ON s.id = cs.student_id
      WHERE cs.id = session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      JOIN public.students s ON s.id = cs.student_id
      WHERE cs.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children coaching messages"
  ON public.coaching_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      JOIN public.parent_child_relations pcr ON pcr.student_id = cs.student_id
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE cs.id = session_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students coaching messages"
  ON public.coaching_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      JOIN public.coach_student_relations csr ON csr.student_id = cs.student_id
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE cs.id = session_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all coaching messages"
  ON public.coaching_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- weekly_analysis
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Coaches can view assigned students weekly analysis" ON public.weekly_analysis;
  DROP POLICY IF EXISTS "Admins can manage all weekly analysis" ON public.weekly_analysis;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Coaches can view assigned students weekly analysis"
  ON public.weekly_analysis
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all weekly analysis"
  ON public.weekly_analysis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- notifications
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- test_types and test_schedules
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "All authenticated users can view test types" ON public.test_types;
  DROP POLICY IF EXISTS "Admins can manage test types" ON public.test_types;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "All authenticated users can view test types"
  ON public.test_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test types"
  ON public.test_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DO $$
BEGIN
  DROP POLICY IF EXISTS "All authenticated users can view test schedules" ON public.test_schedules;
  DROP POLICY IF EXISTS "Admins can manage test schedules" ON public.test_schedules;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "All authenticated users can view test schedules"
  ON public.test_schedules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test schedules"
  ON public.test_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

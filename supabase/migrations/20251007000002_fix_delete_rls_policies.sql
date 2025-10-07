-- Fix DELETE RLS policies for encouragement_messages
-- Issue: Current policies allow deletion even when student is not assigned to parent/coach
-- Root cause: The student_id check in the subquery may be returning true incorrectly

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Parents can delete own sent encouragement messages" ON public.encouragement_messages;
DROP POLICY IF EXISTS "Coaches can delete own sent encouragement messages" ON public.encouragement_messages;

-- Recreate DELETE policy for parents with explicit student assignment check
CREATE POLICY "Parents can delete own sent encouragement messages"
ON public.encouragement_messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  AND sender_role = 'parent'::user_role
  AND EXISTS (
    SELECT 1
    FROM public.parent_child_relations pcr
    JOIN public.parents p ON p.id = pcr.parent_id
    WHERE p.user_id = auth.uid()
    AND pcr.student_id = encouragement_messages.student_id
  )
);

-- Recreate DELETE policy for coaches with explicit student assignment check
CREATE POLICY "Coaches can delete own sent encouragement messages"
ON public.encouragement_messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  AND sender_role = 'coach'::user_role
  AND EXISTS (
    SELECT 1
    FROM public.coach_student_relations csr
    JOIN public.coaches c ON c.id = csr.coach_id
    WHERE c.user_id = auth.uid()
    AND csr.student_id = encouragement_messages.student_id
  )
);

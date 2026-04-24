
-- Add event_id column to feedbacks
ALTER TABLE public.feedbacks ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

-- Drop old insert policy
DROP POLICY IF EXISTS "Authenticated users can create feedback" ON public.feedbacks;

-- New insert policy: only registered users can give feedback for an event
CREATE POLICY "Registered users can create event feedback"
ON public.feedbacks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND event_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.registrations
    WHERE registrations.user_id = auth.uid()
      AND registrations.event_id = feedbacks.event_id
  )
);

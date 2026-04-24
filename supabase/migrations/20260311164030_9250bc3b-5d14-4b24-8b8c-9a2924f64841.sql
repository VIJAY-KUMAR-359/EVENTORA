
-- Fix overly permissive INSERT policy on notifications
DROP POLICY "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

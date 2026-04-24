-- Allow the admin (vijaykumareppili24@gmail.com) to delete contact messages.
-- Also allow the same admin to read all rows of core tables for CSV exports.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'vijaykumareppili24@gmail.com'
  );
$$;

-- contact_messages: admin delete
CREATE POLICY "Admin can delete contact messages"
ON public.contact_messages
FOR DELETE
TO authenticated
USING (public.is_admin());

-- registrations: admin can view all
CREATE POLICY "Admin can view all registrations"
ON public.registrations
FOR SELECT
TO authenticated
USING (public.is_admin());

-- feedbacks already public-select; no change needed
-- profiles already public-select; no change needed
-- events already public-select; no change needed
-- notifications: admin view all
CREATE POLICY "Admin can view all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (public.is_admin());

-- event_messages: admin view all
CREATE POLICY "Admin can view all event messages"
ON public.event_messages
FOR SELECT
TO authenticated
USING (public.is_admin());


-- Add payment_status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');

-- Add payment_status column to registrations
ALTER TABLE public.registrations 
ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'pending';

-- Add organizer_note column for rejection reason
ALTER TABLE public.registrations
ADD COLUMN organizer_note text;

-- Allow organizers to update registrations (for payment approval)
CREATE POLICY "Organizers can update registrations for their events"
ON public.registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = registrations.event_id 
    AND events.organizer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = registrations.event_id 
    AND events.organizer_id = auth.uid()
  )
);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

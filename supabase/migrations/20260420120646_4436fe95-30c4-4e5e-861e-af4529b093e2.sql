-- Event messages: participants/users ask questions to organizers; organizers reply.
CREATE TABLE public.event_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  organizer_id UUID NOT NULL,
  message TEXT NOT NULL,
  reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_messages_event ON public.event_messages(event_id);
CREATE INDEX idx_event_messages_organizer ON public.event_messages(organizer_id);
CREATE INDEX idx_event_messages_sender ON public.event_messages(sender_id);

ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- Senders can create their own messages
CREATE POLICY "Users can send messages"
ON public.event_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Sender can view their own messages; organizer can view messages for their events
CREATE POLICY "Sender or organizer can view"
ON public.event_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = organizer_id);

-- Only organizer can update (to add a reply)
CREATE POLICY "Organizer can reply"
ON public.event_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = organizer_id)
WITH CHECK (auth.uid() = organizer_id);

-- Sender or organizer can delete their own thread
CREATE POLICY "Sender or organizer can delete"
ON public.event_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = organizer_id);
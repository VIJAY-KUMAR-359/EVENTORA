DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Event organizers can view participant payment screenshots'
  ) THEN
    CREATE POLICY "Event organizers can view participant payment screenshots"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'payment-screenshots'
      AND (
        (auth.uid())::text = (storage.foldername(name))[1]
        OR EXISTS (
          SELECT 1
          FROM public.registrations r
          JOIN public.events e ON e.id = r.event_id
          WHERE e.organizer_id = auth.uid()
            AND r.payment_screenshot_url IS NOT NULL
            AND split_part(split_part(r.payment_screenshot_url, '/payment-screenshots/', 2), '?', 1) = name
        )
      )
    );
  END IF;
END
$$;
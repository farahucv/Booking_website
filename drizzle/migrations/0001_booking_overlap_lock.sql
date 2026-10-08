CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('pre_approved','receipt_pending','confirmed') THEN
    PERFORM pg_advisory_xact_lock(hashtext('bookings_overlap'));
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id <> NEW.id
        AND b.status IN ('pre_approved','receipt_pending','confirmed')
        AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'booking_overlap';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP POLICY IF EXISTS "anon upload receipt" ON storage.objects;
DROP POLICY IF EXISTS "anyone can create booking request" ON public.bookings;
REVOKE INSERT ON public.bookings FROM anon;
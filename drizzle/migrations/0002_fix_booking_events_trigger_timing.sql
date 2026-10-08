DROP TRIGGER IF EXISTS bookings_log_status ON public.bookings;

CREATE TRIGGER bookings_log_status
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.log_booking_status();
REVOKE EXECUTE ON FUNCTION public.sync_bill_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_session() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.staff_activity(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_guest(uuid,text,text,text,text,int,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guest_reserve(uuid,date,int,text,text,int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_demo_loaded(uuid) FROM PUBLIC, anon;
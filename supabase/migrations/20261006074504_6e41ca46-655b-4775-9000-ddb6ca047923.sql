ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_code text UNIQUE;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS automations jsonb NOT NULL DEFAULT '{"overdue":true,"escalate":true,"daily_refresh":true,"low_supply":true,"food_sla":true,"backup":true,"revenue_summary":true}';
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz, ADD COLUMN IF NOT EXISTS sla_alerted boolean NOT NULL DEFAULT false;
ALTER TABLE public.cleaning_tasks ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.staff_code_available(_code text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT _code ~ '^[0-9]{4}$' AND NOT EXISTS (SELECT 1 FROM profiles WHERE staff_code=_code) $$;
REVOKE EXECUTE ON FUNCTION public.staff_code_available(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.staff_code_available(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.call_manager(_room text, _note text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE hid uuid := public.my_hotel(); nm text;
BEGIN
  IF auth.uid() IS NULL OR hid IS NULL THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT coalesce(full_name,'Staff') INTO nm FROM profiles WHERE id=auth.uid();
  INSERT INTO alerts (hotel_id, kind, message) VALUES (hid, 'call', '📞 ' || nm || ' is calling the manager' || coalesce(' · Room ' || nullif(_room,''),'') || coalesce(' — ' || left(nullif(_note,''),200),''));
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.call_manager(text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.call_manager(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.run_automations() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ist timestamp := now() AT TIME ZONE 'Asia/Kolkata';
BEGIN
  INSERT INTO alerts (hotel_id, kind, message, ref_id)
  SELECT b.hotel_id, 'overdue', 'Room ' || r.number || ' is past its check-out time', b.id
  FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN hotels h ON h.id=b.hotel_id
  WHERE coalesce((h.automations->>'overdue')::boolean,true) AND b.status='checked_in' AND NOT b.flagged AND b.check_in + (b.nights||' days')::interval < now();
  UPDATE bookings SET flagged=true WHERE status='checked_in' AND NOT flagged AND check_in + (nights||' days')::interval < now();
  IF extract(hour FROM ist) >= 10 THEN
    INSERT INTO cleaning_tasks (hotel_id, room_id, source, base_priority, note)
    SELECT r.hotel_id, r.id, 'daily', 10, 'Daily room refresh' FROM rooms r JOIN hotels h ON h.id=r.hotel_id
    WHERE coalesce((h.automations->>'daily_refresh')::boolean,true) AND r.status='occupied'
      AND NOT EXISTS (SELECT 1 FROM cleaning_tasks t WHERE t.room_id=r.id AND t.source='daily' AND (t.created_at AT TIME ZONE 'Asia/Kolkata')::date = ist::date);
  END IF;
  INSERT INTO alerts (hotel_id, kind, message, ref_id)
  SELECT t.hotel_id, 'cleaning', 'Room ' || r.number || ' cleaning has waited over 2 hours', t.id
  FROM cleaning_tasks t JOIN rooms r ON r.id=t.room_id JOIN hotels h ON h.id=t.hotel_id
  WHERE coalesce((h.automations->>'escalate')::boolean,true) AND t.status='pending' AND NOT t.escalated AND t.created_at < now() - interval '2 hours';
  UPDATE cleaning_tasks SET escalated=true WHERE status='pending' AND NOT escalated AND created_at < now() - interval '2 hours';
  INSERT INTO alerts (hotel_id, kind, message, ref_id)
  SELECT o.hotel_id, 'food', 'Order ' || o.order_no || ' not accepted for 10 minutes', o.id
  FROM food_orders o JOIN hotels h ON h.id=o.hotel_id
  WHERE coalesce((h.automations->>'food_sla')::boolean,true) AND o.status='placed' AND NOT o.sla_alerted AND o.created_at < now() - interval '10 minutes';
  UPDATE food_orders SET sla_alerted=true WHERE status='placed' AND NOT sla_alerted AND created_at < now() - interval '10 minutes';
  INSERT INTO alerts (hotel_id, kind, message)
  SELECT s.hotel_id, 'supply', s.name || ' is low (' || s.qty || ' ' || s.unit || ' left)'
  FROM supplies s JOIN hotels h ON h.id=s.hotel_id
  WHERE coalesce((h.automations->>'low_supply')::boolean,true) AND s.qty <= s.min_qty
    AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.hotel_id=s.hotel_id AND a.kind='supply' AND a.message LIKE s.name || ' is low%' AND a.created_at > now() - interval '1 day');
  IF extract(hour FROM ist) >= 18 THEN
    INSERT INTO alerts (hotel_id, kind, message)
    SELECT r.hotel_id, 'checks', count(*) || ' rooms have no condition check today'
    FROM rooms r WHERE NOT EXISTS (SELECT 1 FROM room_checks c WHERE c.room_id=r.id AND (c.created_at AT TIME ZONE 'Asia/Kolkata')::date = ist::date)
      AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.hotel_id=r.hotel_id AND a.kind='checks' AND (a.created_at AT TIME ZONE 'Asia/Kolkata')::date = ist::date)
    GROUP BY r.hotel_id;
  END IF;
  IF extract(hour FROM ist) >= 22 THEN
    INSERT INTO alerts (hotel_id, kind, message)
    SELECT h.id, 'summary', 'Today''s revenue: ₹' || coalesce((SELECT sum(total) FROM bills b WHERE b.hotel_id=h.id AND (b.created_at AT TIME ZONE 'Asia/Kolkata')::date = ist::date),0)
    FROM hotels h WHERE coalesce((h.automations->>'revenue_summary')::boolean,true)
      AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.hotel_id=h.id AND a.kind='summary' AND (a.created_at AT TIME ZONE 'Asia/Kolkata')::date = ist::date);
  END IF;
  DELETE FROM alerts WHERE created_at < now() - interval '14 days';
END $$;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.food_orders; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cleaning_tasks; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_issues; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings; EXCEPTION WHEN others THEN NULL; END;
END $$;
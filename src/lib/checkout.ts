import { supabase } from "@/integrations/supabase/client";

/** Generate GST bill and check the guest out. Returns bill id. */
export async function checkoutBooking(bookingId: string, paymentMode = "cash") {
  const { data: b, error } = await supabase
    .from("bookings").select("*, offers(discount_pct)").eq("id", bookingId).single();
  if (error || !b) throw new Error(error?.message ?? "Booking not found");
  const { data: s } = await supabase.from("business_settings").select("*").eq("id", 1).single();
  const { data: svc } = await supabase
    .from("service_logs").select("amount").eq("room_id", b.room_id).gte("created_at", b.check_in);

  const nights = Math.max(1, Math.ceil((Date.now() - new Date(b.check_in).getTime()) / 86400000), b.nights);
  const subtotal = Number(b.rate) * nights;
  const extras = (svc ?? []).reduce((a, x) => a + Number(x.amount || 0), 0);
  const pct = Number((b as { offers?: { discount_pct: number } | null }).offers?.discount_pct ?? 0);
  const discount = +((subtotal * pct) / 100).toFixed(2);
  const taxable = subtotal + extras - discount;
  const cr = Number(s?.cgst_rate ?? 6), sr = Number(s?.sgst_rate ?? 6);
  const cgst = +((taxable * cr) / 100).toFixed(2);
  const sgst = +((taxable * sr) / 100).toFixed(2);
  const total = +(taxable + cgst + sgst).toFixed(2);

  const { data: bill, error: be } = await supabase.from("bills").insert({
    booking_id: b.id, hotel_id: b.hotel_id, subtotal, extras, discount,
    cgst_rate: cr, sgst_rate: sr, cgst, sgst, total, payment_mode: paymentMode,
  }).select("id").single();
  if (be) throw new Error(be.message);
  await supabase.from("bookings").update({ status: "checked_out", check_out: new Date().toISOString(), nights }).eq("id", b.id);
  await supabase.from("rooms").update({ status: "cleaning" }).eq("id", b.room_id);
  return bill.id;
}

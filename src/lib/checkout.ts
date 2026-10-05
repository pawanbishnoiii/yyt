import { supabase } from "@/integrations/supabase/client";

/** Pure GST math — single source of truth for every bill. */
export function computeBill(i: { rate: number; nights: number; extras: number; discountPct: number; cgstRate: number; sgstRate: number }) {
  const subtotal = +(i.rate * i.nights).toFixed(2);
  const discount = +((subtotal * i.discountPct) / 100).toFixed(2);
  const taxable = subtotal + i.extras - discount;
  const cgst = +((taxable * i.cgstRate) / 100).toFixed(2);
  const sgst = +((taxable * i.sgstRate) / 100).toFixed(2);
  const total = +(taxable + cgst + sgst).toFixed(2);
  return { subtotal, discount, taxable, cgst, sgst, total };
}

/** Generate GST bill (branch-specific rates) and check the guest out. Returns bill id. */
export async function checkoutBooking(bookingId: string, paymentMode = "cash") {
  const { data: b, error } = await supabase
    .from("bookings").select("*, offers(discount_pct), hotels(cgst_rate,sgst_rate)").eq("id", bookingId).single();
  if (error || !b) throw new Error(error?.message ?? "Booking not found");
  const { data: svc } = await supabase
    .from("service_logs").select("amount").eq("room_id", b.room_id).gte("created_at", b.check_in);

  const nights = Math.max(1, Math.ceil((Date.now() - new Date(b.check_in).getTime()) / 86400000), b.nights);
  const extras = (svc ?? []).reduce((a, x) => a + Number(x.amount || 0), 0);
  const h = (b as { hotels?: { cgst_rate: number; sgst_rate: number } | null }).hotels;
  const cr = Number(h?.cgst_rate ?? 6), sr = Number(h?.sgst_rate ?? 6);
  const pct = Number((b as { offers?: { discount_pct: number } | null }).offers?.discount_pct ?? 0);
  const m = computeBill({ rate: Number(b.rate), nights, extras, discountPct: pct, cgstRate: cr, sgstRate: sr });

  const { data: bill, error: be } = await supabase.from("bills").insert({
    booking_id: b.id, hotel_id: b.hotel_id, subtotal: m.subtotal, extras, discount: m.discount,
    cgst_rate: cr, sgst_rate: sr, cgst: m.cgst, sgst: m.sgst, total: m.total, payment_mode: paymentMode,
  }).select("id").single();
  if (be) throw new Error(be.message);
  await supabase.from("bookings").update({ status: "checked_out", check_out: new Date().toISOString(), nights }).eq("id", b.id);
  await supabase.from("rooms").update({ status: "cleaning" }).eq("id", b.room_id);
  return bill.id;
}

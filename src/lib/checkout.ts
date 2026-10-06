import { supabase } from "@/integrations/supabase/client";

/**
 * Pure GST math — single source of truth for every bill.
 * Room + non-food extras are taxed at the room CGST/SGST rates; room-service food
 * is taxed at the hotel's food GST rate (split equally into CGST and SGST).
 */
export function computeBill(i: { rate: number; nights: number; extras: number; discountPct: number; cgstRate: number; sgstRate: number; food?: number; foodRate?: number }) {
  const food = i.food ?? 0;
  const foodRate = i.foodRate ?? 0;
  const subtotal = +(i.rate * i.nights).toFixed(2);
  const discount = +((subtotal * i.discountPct) / 100).toFixed(2);
  const taxable = subtotal + i.extras - discount;
  const foodHalf = (food * foodRate) / 200;
  const cgst = +((taxable * i.cgstRate) / 100 + foodHalf).toFixed(2);
  const sgst = +((taxable * i.sgstRate) / 100 + foodHalf).toFixed(2);
  const foodTax = +(foodHalf * 2).toFixed(2);
  const total = +(taxable + food + cgst + sgst).toFixed(2);
  return { subtotal, discount, taxable, food, foodTax, cgst, sgst, total };
}

export type BillPreview = ReturnType<typeof computeBill> & {
  bookingId: string; hotelId: string; roomId: string; nights: number; rate: number; extras: number;
  cgstRate: number; sgstRate: number; foodRate: number; discountPct: number;
};

/** Draft bill shown before the manager confirms check-out. Nothing is saved. */
export async function previewBill(bookingId: string): Promise<BillPreview> {
  const { data: b, error } = await supabase
    .from("bookings").select("*, offers(discount_pct), hotels(cgst_rate,sgst_rate,food_gst_rate)").eq("id", bookingId).single();
  if (error || !b) throw new Error(error?.message ?? "Booking not found");
  const { data: svc } = await supabase.from("service_logs").select("amount,kind").eq("room_id", b.room_id).gte("created_at", b.check_in);
  const nights = Math.max(1, Math.ceil((Date.now() - new Date(b.check_in).getTime()) / 86400000), b.nights);
  const food = (svc ?? []).filter((x) => x.kind === "food").reduce((a, x) => a + Number(x.amount || 0), 0);
  const extras = (svc ?? []).filter((x) => x.kind !== "food").reduce((a, x) => a + Number(x.amount || 0), 0);
  const h = (b as { hotels?: { cgst_rate: number; sgst_rate: number; food_gst_rate: number } | null }).hotels;
  const cgstRate = Number(h?.cgst_rate ?? 6), sgstRate = Number(h?.sgst_rate ?? 6), foodRate = Number(h?.food_gst_rate ?? 5);
  const discountPct = Number((b as { offers?: { discount_pct: number } | null }).offers?.discount_pct ?? 0);
  const m = computeBill({ rate: Number(b.rate), nights, extras, discountPct, cgstRate, sgstRate, food, foodRate });
  return { ...m, bookingId: b.id, hotelId: b.hotel_id, roomId: b.room_id, nights, rate: Number(b.rate), extras, cgstRate, sgstRate, foodRate, discountPct };
}

/** Save the bill and check the guest out. Returns bill id. */
export async function confirmCheckout(p: BillPreview, paymentMode = "cash", paid = true) {
  const { data: bill, error } = await supabase.from("bills").insert({
    booking_id: p.bookingId, hotel_id: p.hotelId, subtotal: p.subtotal, extras: +(p.extras + p.food).toFixed(2), discount: p.discount,
    cgst_rate: p.cgstRate, sgst_rate: p.sgstRate, cgst: p.cgst, sgst: p.sgst, total: p.total, payment_mode: paymentMode, paid,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.from("bookings").update({ status: "checked_out", check_out: new Date().toISOString(), nights: p.nights }).eq("id", p.bookingId);
  await supabase.from("rooms").update({ status: "cleaning" }).eq("id", p.roomId);
  return bill.id;
}

/** Restore a check-out made within the last hour. */
export async function undoCheckout(bookingId: string) {
  const { error } = await supabase.rpc("undo_checkout", { _booking: bookingId });
  if (error) throw new Error(error.message);
}

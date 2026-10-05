import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Printer, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/me";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/bill/$id")({ component: BillView });

function BillView() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["bill", id],
    queryFn: async () => {
      const [{ data: b }, { data: s }] = await Promise.all([
        supabase.from("bills").select("*, hotels(name,address,phone), bookings(*, guests(*), rooms(number,room_type), offers(code,discount_pct))").eq("id", id).single(),
        supabase.from("business_settings").select("*").eq("id", 1).single(),
      ]);
      return { b, s };
    },
  });
  const b = data?.b;
  const s = data?.s;
  if (!b) return <p className="text-muted-foreground">Loading bill…</p>;
  const bk = b.bookings;
  const upi = s?.upi_id
    ? `upi://pay?pa=${encodeURIComponent(s.upi_id)}&pn=${encodeURIComponent(s.business_name)}&am=${b.total}&tn=${b.bill_no}&cu=INR`
    : `${b.bill_no}|${b.total}|${s?.gst_number ?? ""}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex justify-between">
        <Button variant="outline" asChild><Link to="/app/bills"><ArrowLeft /> Bills</Link></Button>
        <Button variant="neon" onClick={() => window.print()}><Printer /> Print bill</Button>
      </div>
      <div className="print-area rounded-3xl bg-foreground p-8 text-background">
        <div className="flex items-start justify-between border-b border-background/20 pb-4">
          <div>
            <div className="font-display text-2xl font-bold">{s?.business_name}</div>
            <div className="text-sm">{b.hotels?.name}</div>
            <div className="text-xs opacity-70">{b.hotels?.address} {b.hotels?.phone && `· ${b.hotels.phone}`}</div>
            {s?.gst_number && <div className="mt-1 text-xs font-semibold">GSTIN: {s.gst_number}</div>}
          </div>
          <div className="text-right text-sm">
            <div className="font-display font-bold">TAX INVOICE</div>
            <div className="font-mono text-xs">{b.bill_no}</div>
            <div className="text-xs">{format(new Date(b.created_at), "dd MMM yyyy, HH:mm")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div>
            <div className="text-xs opacity-60">Billed to</div>
            <div className="font-semibold">{bk?.guests?.first_name} {bk?.guests?.last_name}</div>
            <div className="text-xs">{bk?.guests?.mobile} · ID {bk?.guests?.guest_code}</div>
            <div className="text-xs">{bk?.guests?.address}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-60">Stay</div>
            <div>Room {bk?.rooms?.number} · {bk?.rooms?.room_type}</div>
            <div className="text-xs">Booking {bk?.booking_code}</div>
            <div className="text-xs">{bk && format(new Date(bk.check_in), "dd MMM")} → {bk?.check_out && format(new Date(bk.check_out), "dd MMM")} · {bk?.nights} night(s)</div>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <L k={`Room charges (${bk?.nights} × ${inr(Number(bk?.rate))})`} v={inr(Number(b.subtotal))} />
            {Number(b.extras) > 0 && <L k="Room service / food" v={inr(Number(b.extras))} />}
            {Number(b.discount) > 0 && <L k={`Discount ${bk?.offers?.code ?? ""}`} v={"- " + inr(Number(b.discount))} />}
            <L k={`CGST @ ${b.cgst_rate}%`} v={inr(Number(b.cgst))} />
            <L k={`SGST @ ${b.sgst_rate}%`} v={inr(Number(b.sgst))} />
          </tbody>
        </table>
        <div className="mt-3 flex items-end justify-between border-t border-background/20 pt-4">
          <div>
            <div className="text-xs opacity-60">Grand total · {b.payment_mode}</div>
            <div className="font-display text-3xl font-bold">{inr(Number(b.total))}</div>
          </div>
          <div className="rounded-xl bg-background p-2"><QRCodeSVG value={upi} size={96} /></div>
        </div>
        <p className="mt-6 text-center text-xs opacity-60">Thank you for staying with us! Scan QR to pay / verify.</p>
      </div>
    </div>
  );
}

function L({ k, v }: { k: string; v: string }) {
  return <tr className="border-b border-background/10"><td className="py-2">{k}</td><td className="py-2 text-right">{v}</td></tr>;
}

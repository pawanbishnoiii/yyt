import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, useHotel } from "@/lib/me";
import { NoHotel, PageTitle } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/bills")({ component: Bills });

function Bills() {
  const { hotelId } = useHotel();
  const { data } = useQuery({
    queryKey: ["bills", hotelId],
    enabled: !!hotelId,
    queryFn: async () => (await supabase.from("bills").select("*, bill_payments(amount), bookings(booking_code, guests(first_name,last_name), rooms(number))").eq("hotel_id", hotelId!).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  if (!hotelId) return <NoHotel />;
  const total = (data ?? []).reduce((a, b) => a + Number(b.total), 0);
  const rec = (b: { bill_payments?: { amount: number }[] | null; paid: boolean; total: number }) => { const p = (b.bill_payments ?? []).reduce((a, x) => a + Number(x.amount), 0); return p || (b.paid ? Number(b.total) : 0); };
  const outstanding = (data ?? []).reduce((a, b) => a + Math.max(0, Number(b.total) - rec(b)), 0);
  const tax = (data ?? []).reduce((a, b) => a + Number(b.cgst) + Number(b.sgst), 0);
  return (
    <div>
      <PageTitle title="Bills" sub={`${data?.length ?? 0} invoices · ${inr(total)} billed · ${inr(outstanding)} outstanding · ${inr(tax)} GST`} />
      <div className="overflow-x-auto rounded-3xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr className="border-b">
            {["Invoice", "Guest", "Room", "Date", "GST", "Total", "Received", "Status", ""].map((h) => <th key={h} className="p-4 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {(data ?? []).map((b) => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-secondary/50">
                <td className="p-4 font-mono text-xs">{b.bill_no}</td>
                <td className="p-4">{b.bookings?.guests?.first_name} {b.bookings?.guests?.last_name}</td>
                <td className="p-4">{b.bookings?.rooms?.number}</td>
                <td className="p-4">{format(new Date(b.created_at), "dd MMM, HH:mm")}</td>
                <td className="p-4">{inr(Number(b.cgst) + Number(b.sgst))}</td>
                <td className="p-4 font-semibold">{inr(Number(b.total))}</td>
                <td className="p-4">{inr(rec(b))}</td>
                <td className="p-4">{b.paid ? <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">Paid</span> : rec(b) > 0 ? <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">Due {inr(Number(b.total) - rec(b))}</span> : <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Unpaid</span>}</td>
                <td className="p-4"><Button size="sm" variant="outline" asChild><Link to="/app/bill/$id" params={{ id: b.id }}><Printer /> View</Link></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <p className="p-8 text-center text-muted-foreground">No bills yet.</p>}
      </div>
    </div>
  );
}

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
    queryFn: async () => (await supabase.from("bills").select("*, bookings(booking_code, guests(first_name,last_name), rooms(number))").eq("hotel_id", hotelId!).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  if (!hotelId) return <NoHotel />;
  const total = (data ?? []).reduce((a, b) => a + Number(b.total), 0);
  const tax = (data ?? []).reduce((a, b) => a + Number(b.cgst) + Number(b.sgst), 0);
  return (
    <div>
      <PageTitle title="Bills" sub={`${data?.length ?? 0} invoices · ${inr(total)} collected · ${inr(tax)} GST`} />
      <div className="overflow-x-auto rounded-3xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr className="border-b">
            {["Invoice", "Guest", "Room", "Date", "CGST", "SGST", "Total", ""].map((h) => <th key={h} className="p-4 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {(data ?? []).map((b) => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-secondary/50">
                <td className="p-4 font-mono text-xs">{b.bill_no}</td>
                <td className="p-4">{b.bookings?.guests?.first_name} {b.bookings?.guests?.last_name}</td>
                <td className="p-4">{b.bookings?.rooms?.number}</td>
                <td className="p-4">{format(new Date(b.created_at), "dd MMM, HH:mm")}</td>
                <td className="p-4">{inr(Number(b.cgst))}</td>
                <td className="p-4">{inr(Number(b.sgst))}</td>
                <td className="p-4 font-semibold">{inr(Number(b.total))}</td>
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

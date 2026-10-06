import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Sparkles, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "@/components/CheckoutDialog";

export const Route = createFileRoute("/_authenticated/app/room/$id")({ component: RoomPage });

function RoomPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [co, setCo] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["room", id],
    queryFn: async () => {
      const [r, b, i] = await Promise.all([
        supabase.from("rooms").select("*").eq("id", id).single(),
        supabase.from("bookings").select("id,booking_code,status,check_in,check_out,guests(first_name,last_name,mobile)").eq("room_id", id).order("check_in", { ascending: false }).limit(10),
        supabase.from("room_issues").select("id,category,tag,severity").eq("room_id", id).eq("resolved", false),
      ]);
      return { room: r.data, bookings: b.data ?? [], issues: i.data ?? [] };
    },
  });
  const r = data?.room;
  if (!r) return <p className="text-muted-foreground">Loading room…</p>;
  const active = data.bookings.find((b) => b.status === "checked_in");
  const setStatus = async (status: string) => {
    const { error } = await supabase.from("rooms").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["room", id] });
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <CheckoutDialog bookingId={co} label={`Room ${r.number}`} onOpenChange={(o) => !o && setCo(null)} />
      <Button variant="outline" asChild><Link to="/app/rooms"><ArrowLeft /> Rooms</Link></Button>
      <div className="rounded-3xl border bg-card p-6 shadow-card">
        <div className="flex items-start justify-between">
          <div><h1 className="text-3xl font-bold">Room {r.number}</h1><p className="text-muted-foreground">{r.room_type} · {inr(Number(r.price))}/night</p></div>
          <span className="rounded-full bg-muted px-3 py-1 text-sm capitalize">{r.status}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {active && <Button onClick={() => setCo(active.id)}><LogOut /> Check-out & bill</Button>}
          {r.status === "cleaning" && <Button variant="outline" onClick={() => setStatus("available")}><Sparkles /> Mark clean</Button>}
          {r.status === "available" && <Button variant="outline" onClick={() => setStatus("maintenance")}><Wrench /> Maintenance</Button>}
          {r.status === "maintenance" && <Button variant="outline" onClick={() => setStatus("available")}>Fixed</Button>}
        </div>
      </div>
      {active && <div className="rounded-3xl border bg-card p-5"><div className="text-sm text-muted-foreground">Current guest</div><div className="font-semibold">{active.guests?.first_name} {active.guests?.last_name}</div><div className="text-sm">{active.booking_code} · {active.guests?.mobile}</div></div>}
      <div className="rounded-3xl border bg-card p-5">
        <h2 className="mb-2 font-semibold">Open issues</h2>
        {data.issues.length ? data.issues.map((i) => <div key={i.id} className="text-sm">{i.category} — {i.tag} <span className="text-muted-foreground">({i.severity})</span></div>) : <p className="text-sm text-muted-foreground">No issues.</p>}
      </div>
      <div className="rounded-3xl border bg-card p-5">
        <h2 className="mb-2 font-semibold">Recent stays</h2>
        {data.bookings.map((b) => <div key={b.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{b.guests?.first_name} {b.guests?.last_name} · {b.booking_code}</span><span className="capitalize text-muted-foreground">{b.status.replace("_", " ")}</span></div>)}
        {!data.bookings.length && <p className="text-sm text-muted-foreground">No stays yet.</p>}
      </div>
    </div>
  );
}

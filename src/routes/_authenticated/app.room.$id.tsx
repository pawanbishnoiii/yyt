import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Sparkles, Wrench, Download, Copy, Save } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "@/components/CheckoutDialog";

export const Route = createFileRoute("/_authenticated/app/room/$id")({ component: RoomPage });

function RoomPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [co, setCo] = useState<string | null>(null);
  const [price, setPrice] = useState("");
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
  const stayUrl = `${window.location.origin}/stay/r/${r.qr_token}`;
  const downloadQr = () => { const svg=document.getElementById("room-qr")?.outerHTML; if(!svg)return; const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));a.download=`room-${r.number}-qr.svg`;a.click();URL.revokeObjectURL(a.href); };
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
        <div className="mt-6 grid gap-5 border-t pt-5 md:grid-cols-[1fr_auto]">
          <div><div className="text-sm font-semibold">Room rate</div><div className="mt-2 flex max-w-xs gap-2"><input className="h-10 min-w-0 flex-1 rounded-full border bg-background px-4" type="number" placeholder={String(r.price)} value={price} onChange={e=>setPrice(e.target.value)}/><Button variant="outline" onClick={async()=>{if(!price)return;const {error}=await supabase.from("rooms").update({price:Number(price)}).eq("id",id);if(error)toast.error(error.message);else{toast.success("Room rate updated");qc.invalidateQueries({queryKey:["room",id]});}}}><Save/>Save</Button></div><div className="mt-4 rounded-xl bg-muted p-2"><Barcode value={r.barcode} height={36} width={1.2} background="transparent" /></div></div>
          <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3"><QRCodeSVG id="room-qr" value={stayUrl} size={112}/><div><div className="text-sm font-semibold">Guest room page</div><p className="max-w-48 truncate text-xs text-muted-foreground">{stayUrl}</p><div className="mt-2 flex gap-1"><Button size="sm" variant="outline" onClick={()=>{navigator.clipboard.writeText(stayUrl);toast.success("Guest link copied");}}><Copy/>Copy</Button><Button size="sm" variant="outline" onClick={downloadQr}><Download/>QR</Button></div></div></div>
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

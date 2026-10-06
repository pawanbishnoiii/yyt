import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Printer, LogOut, Sparkles, Wrench, BedDouble, Barcode as BarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, isManager, useHotel, useLive, useMe } from "@/lib/me";
import { RoomConditions } from "@/components/RoomIssues";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { Link } from "@tanstack/react-router";
import { NoHotel, PageTitle } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/rooms")({ component: Rooms });

const tone: Record<string, string> = {
  available: "border-success/40 bg-success/10",
  occupied: "border-primary/50 bg-primary/15",
  cleaning: "border-warning/40 bg-warning/10",
  maintenance: "border-destructive/40 bg-destructive/10",
};

function Rooms() {
  const { hotelId } = useHotel();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const mgr = isManager(me);
  useLive(["rooms", "bookings", "room_issues"], [["rooms", hotelId ?? ""]]);
  const [filter, setFilter] = useState("all");
  const [labels, setLabels] = useState(false);

  const { data } = useQuery({
    queryKey: ["rooms", hotelId ?? ""],
    enabled: !!hotelId,
    queryFn: async () => {
      const [r, b, iss] = await Promise.all([
        supabase.from("rooms").select("*").eq("hotel_id", hotelId!).order("number"),
        supabase.from("bookings").select("id,room_id,booking_code,check_in,guests(first_name,last_name,mobile)").eq("hotel_id", hotelId!).eq("status", "checked_in"),
        supabase.from("room_issues").select("room_id,severity").eq("hotel_id", hotelId!).eq("resolved", false),
      ]);
      return { rooms: r.data ?? [], active: b.data ?? [], issues: iss.data ?? [] };
    },
  });
  if (!hotelId) return <NoHotel />;
  const rooms = (data?.rooms ?? []).filter((r) => filter === "all" || r.status === filter);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("rooms").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["rooms"] });
  };
  const [co, setCo] = useState<string | null>(null);
  const checkout = (id: string) => setCo(id);

  if (labels)
    return (
      <div>
        <div className="no-print mb-6 flex gap-2">
          <Button variant="outline" onClick={() => setLabels(false)}>Back</Button>
          <Button variant="neon" onClick={() => window.print()}><Printer /> Print labels</Button>
        </div>
        <div className="print-area grid grid-cols-2 gap-4 md:grid-cols-3">
          {(data?.rooms ?? []).map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 text-center">
              <div className="font-display text-lg font-bold">Room {r.number}</div>
              <div className="flex justify-center"><Barcode value={r.barcode} height={50} width={1.4} fontSize={12} background="transparent" /></div>
              <div className="mt-2 flex flex-col items-center gap-1 border-t pt-2">
                <QRCodeSVG value={`${window.location.origin}/stay/r/${r.qr_token}`} size={88} />
                <span className="text-[10px] text-muted-foreground">Guests: scan for room service</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div>
      <CheckoutDialog bookingId={co} onOpenChange={(o) => !o && setCo(null)} />
      <PageTitle title="Rooms" sub="Live status — real-time updates">
        <div className="flex flex-wrap gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>{["all", "available", "occupied", "cleaning", "maintenance"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setLabels(true)}><BarIcon /> Barcode labels</Button>
          {mgr && <AddRoom hotelId={hotelId} />}
        </div>
      </PageTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.map((r, i) => {
          const bk = data?.active.find((b) => b.room_id === r.id);
          const iss = (data?.issues ?? []).filter((x) => x.room_id === r.id);
          return (
            <motion.div layout key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className={`rounded-3xl border p-5 ${tone[r.status] ?? ""}`}>
              <div className="flex items-start justify-between">
                <Link to="/app/room/$id" params={{ id: r.number }} className="group">
                  <div className="font-display text-2xl font-bold group-hover:text-primary">{r.number} <span className="text-xs font-normal text-primary opacity-0 transition group-hover:opacity-100">Open →</span></div>
                  <div className="text-xs text-muted-foreground">{r.room_type} · {inr(Number(r.price))}</div>
                </Link>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-card px-2.5 py-1 text-xs capitalize">{r.status}</span>
                  <RoomConditions room={r} hotelId={hotelId} trigger={
                    <button className={`rounded-full px-2.5 py-1 text-xs font-medium ${iss.length ? (iss.some((x) => x.severity === "high") ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning") : "bg-success/15 text-success"}`}>
                      {iss.length ? `${iss.length} issue${iss.length > 1 ? "s" : ""}` : "Good condition"}
                    </button>} />
                </div>
              </div>
              {bk && (
                <div className="mt-3 rounded-2xl bg-card/70 p-3 text-sm">
                  <div className="font-medium">{bk.guests?.first_name} {bk.guests?.last_name}</div>
                  <div className="text-xs text-muted-foreground">{bk.booking_code} · {bk.guests?.mobile}</div>
                </div>
              )}
              <div className="mt-3 rounded-xl bg-card p-1 text-center"><Barcode value={r.barcode} height={28} width={1} fontSize={10} background="transparent" margin={2} /></div>
              <div className="mt-3 flex flex-wrap gap-2">
                {bk && mgr && <Button size="sm" variant="neon" onClick={() => checkout(bk.id)}><LogOut /> Check-out & bill</Button>}
                {r.status === "available" && mgr && <Button size="sm" variant="outline" onClick={() => nav({ to: "/app/book" })}><BedDouble /> Book</Button>}
                {r.status === "cleaning" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "available")}><Sparkles /> Mark clean</Button>}
                {r.status === "available" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "maintenance")}><Wrench /></Button>}
                {r.status === "maintenance" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "available")}>Fixed</Button>}
              </div>
            </motion.div>
          );
        })}
      </div>
      {!rooms.length && <p className="mt-10 text-center text-muted-foreground">No rooms yet.</p>}
    </div>
  );
}

function AddRoom({ hotelId }: { hotelId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ number: "", room_type: "Standard", price: "1500", count: "1" });
  const save = async () => {
    const n = Math.min(50, Math.max(1, Number(f.count)));
    const start = Number(f.number);
    const rows = [...Array(n)].map((_, i) => ({
      hotel_id: hotelId, number: n > 1 && !isNaN(start) ? String(start + i) : f.number.trim(),
      room_type: f.room_type, price: Number(f.price),
    }));
    if (!f.number.trim()) return toast.error("Room number required");
    const { error } = await supabase.from("rooms").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${n} room(s) added with barcodes`);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["rooms"] });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="neon"><Plus /> Add rooms</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add rooms</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Starting number</Label><Input value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder="101" /></div>
            <div><Label>How many</Label><Input type="number" value={f.count} onChange={(e) => setF({ ...f, count: e.target.value })} /></div>
          </div>
          <div><Label>Type</Label>
            <Select value={f.room_type} onValueChange={(v) => setF({ ...f, room_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Standard", "Deluxe", "Suite", "Family", "Presidential"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Price / night (₹)</Label><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <Button variant="neon" onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

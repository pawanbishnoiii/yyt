import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Camera, Sparkles, Utensils, Wrench, Package, Keyboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { PageTitle } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoomIssuePanel } from "@/components/RoomIssues";
import clayScan from "@/assets/clay-scan.png";

export const Route = createFileRoute("/_authenticated/app/scan")({ component: Scan });

type Room = { id: string; number: string; hotel_id: string; status: string; room_type: string };

const actions = [
  { kind: "cleaning", label: "Cleaning done", icon: Sparkles, status: "available", amount: false },
  { kind: "food", label: "Food delivered", icon: Utensils, status: null, amount: true },
  { kind: "supplies", label: "Supplies / laundry", icon: Package, status: null, amount: true },
  { kind: "maintenance", label: "Maintenance issue", icon: Wrench, status: "maintenance", amount: false },
] as const;

function Scan() {
  const { data: me } = useMe();
  const [room, setRoom] = useState<Room | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  const find = async (code: string) => {
    const { data } = await supabase.from("rooms").select("id,number,hotel_id,status,room_type").eq("barcode", code.trim()).maybeSingle();
    if (!data) return toast.error("Room not found: " + code);
    setRoom(data);
    if (navigator.vibrate) navigator.vibrate(80);
  };

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const s = new Html5Qrcode("reader");
      scannerRef.current = s;
      try {
        await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 280, height: 140 } }, (text) => {
          s.stop().catch(() => {});
          setScanning(false);
          find(text);
        }, () => {});
      } catch (e) {
        toast.error("Could not open camera: " + (e as Error).message);
        setScanning(false);
      }
    })();
    return () => { cancelled = true; scannerRef.current?.stop().catch(() => {}); };
  }, [scanning]);

  const act = async (a: (typeof actions)[number]) => {
    if (!room || !me) return;
    const { error } = await supabase.from("service_logs").insert({
      hotel_id: room.hotel_id, room_id: room.id, staff_id: me.id, kind: a.kind,
      note: note.slice(0, 200) || null, amount: a.amount ? Number(amount) || 0 : 0,
    });
    if (error) return toast.error(error.message);
    if (a.status) await supabase.from("rooms").update({ status: a.status }).eq("id", room.id);
    toast.success(`Room ${room.number}: ${a.label}`);
    setRoom(null); setNote(""); setAmount("");
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle title="Scan room" sub="Scan a room barcode to log service or report an issue" />
      {!room && (
        <div className="rounded-3xl border bg-card shadow-card p-6 text-center">
          {scanning ? (
            <div id="reader" className="overflow-hidden rounded-2xl" />
          ) : (
            <img src={clayScan} alt="" width={1024} height={1024} className="mx-auto h-48 animate-float" />
          )}
          <Button variant={scanning ? "outline" : "neon"} size="lg" className="mt-4 w-full" onClick={() => setScanning(!scanning)}>
            <Camera /> {scanning ? "Stop camera" : "Start scanning"}
          </Button>
          <div className="mt-4 flex gap-2">
            <Input placeholder="Or type the barcode (RM...)" value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} />
            <Button variant="outline" onClick={() => find(manual)}><Keyboard /></Button>
          </div>
        </div>
      )}
      {room && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border bg-card shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-4xl font-bold text-neon">{room.number}</div>
              <div className="text-sm capitalize text-muted-foreground">{room.room_type} · {room.status}</div>
            </div>
            <Button variant="ghost" onClick={() => setRoom(null)}>Cancel</Button>
          </div>
          <div className="mt-4 grid gap-2">
            <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Input type="number" placeholder="Amount ₹ (food / supplies — added to the bill)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {actions.map((a) => (
              <motion.button whileTap={{ scale: 0.95 }} key={a.kind} onClick={() => act(a)}
                className="rounded-2xl border bg-secondary p-4 text-left transition-colors hover:border-primary">
                <a.icon className="size-6 text-accent" />
                <div className="mt-2 text-sm font-semibold">{a.label}</div>
              </motion.button>
            ))}
          </div>
          <div className="mt-6 border-t pt-4"><RoomIssuePanel room={room} hotelId={room.hotel_id} /></div>
        </motion.div>
      )}
    </div>
  );
}

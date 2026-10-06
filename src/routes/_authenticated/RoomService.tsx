import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, ScanLine, Wrench, AlertTriangle, BedDouble, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TASK_FLOW } from "@/lib/flow";
import { StaffShell } from "@/components/StaffShell";
import { CodeScanner } from "@/components/CodeScanner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/RoomService")({
  head: () => ({ meta: [{ title: "Room service — StayOS" }, { name: "description", content: "Live housekeeping and room service requests." }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <StaffShell title="Room service" sub="Guest requests, cleaning and repairs. Scan a room barcode to update it." icon={<Sparkles className="size-5" />}>
      {(hotelId, me) => <Tasks hotelId={hotelId} uid={me.id} />}
    </StaffShell>
  ),
});

type Task = { id: string; status: string; source: string; note: string | null; created_at: string; escalated: boolean; room_id: string; rooms: { number: string } | null };
type Issue = { id: string; category: string; tag: string; severity: string; note: string | null; created_at: string; rooms: { number: string } | null };
type Room = { id: string; number: string; status: string; room_type: string };

function Tasks({ hotelId, uid }: { hotelId: string; uid: string }) {
  const qc = useQueryClient();
  const key = ["rs", hotelId];
  const [scan, setScan] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [t, i] = await Promise.all([
        supabase.from("cleaning_tasks").select("id,status,source,note,created_at,escalated,room_id,rooms(number)").eq("hotel_id", hotelId).neq("status", "done").order("base_priority", { ascending: false }).order("created_at"),
        supabase.from("room_issues").select("id,category,tag,severity,note,created_at,rooms(number)").eq("hotel_id", hotelId).eq("resolved", false).order("created_at", { ascending: false }),
      ]);
      return { tasks: (t.data ?? []) as unknown as Task[], issues: (i.data ?? []) as unknown as Issue[] };
    },
  });
  useEffect(() => {
    const ch = supabase.channel("rs-" + hotelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "cleaning_tasks", filter: `hotel_id=eq.${hotelId}` }, (p) => { if (p.eventType === "INSERT") toast.success("New room request"); qc.invalidateQueries({ queryKey: key }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_issues", filter: `hotel_id=eq.${hotelId}` }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const move = async (t: Task, status: string) => {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status };
    if (status === "accepted") { patch.accepted_at = now; patch.assigned_to = uid; }
    if (status === "in_progress") patch.started_at = now;
    if (status === "done") patch.done_at = now;
    qc.setQueryData<typeof data>(key, (old) => old && { ...old, tasks: old.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)).filter((x) => x.status !== "done") });
    const { error } = await supabase.from("cleaning_tasks").update(patch as never).eq("id", t.id);
    if (error) return toast.error(error.message);
    if (status === "in_progress") await supabase.from("rooms").update({ status: "cleaning" }).eq("id", t.room_id).neq("status", "occupied");
    if (status === "done") {
      await supabase.from("rooms").update({ status: "available" }).eq("id", t.room_id).eq("status", "cleaning");
      await supabase.from("service_logs").insert({ hotel_id: hotelId, room_id: t.room_id, staff_id: uid, kind: "cleaning", note: t.note });
    }
  };
  const resolve = async (id: string) => {
    const { error } = await supabase.from("room_issues").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Marked fixed");
  };
  const onScan = async (raw: string) => {
    const token = raw.match(/\/stay\/r\/([^/?#]+)/)?.[1];
    const q = token ? supabase.from("rooms").select("id,number,status,room_type").eq("qr_token", token) : supabase.from("rooms").select("id,number,status,room_type").eq("barcode", raw.trim());
    const { data: r } = await q.eq("hotel_id", hotelId).maybeSingle();
    if (!r) return toast.error("No room found for that code");
    setRoom(r);
  };
  const setRoomStatus = async (status: string) => {
    if (!room) return;
    const { error } = await supabase.from("rooms").update({ status }).eq("id", room.id);
    if (error) return toast.error(error.message);
    await supabase.from("service_logs").insert({ hotel_id: hotelId, room_id: room.id, staff_id: uid, kind: status === "maintenance" ? "maintenance" : "cleaning", note: "Updated by scan: " + status });
    toast.success(`Room ${room.number} → ${status}`); setRoom(null);
  };
  const newCleaning = async () => {
    if (!room) return;
    const { error } = await supabase.from("cleaning_tasks").insert({ hotel_id: hotelId, room_id: room.id, source: "staff", base_priority: 20, note: "Logged by scan" });
    if (error) toast.error(error.message); else { toast.success("Task added"); setRoom(null); }
  };

  const tasks = data?.tasks ?? [];
  return (
    <div>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScan(true)} className="mb-6 flex w-full items-center gap-4 rounded-3xl bg-primary p-5 text-left text-primary-foreground shadow-[var(--shadow-soft)]">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary-foreground/15"><ScanLine className="size-7" /></span>
        <div><div className="text-lg font-bold">Scan room barcode</div><div className="text-sm opacity-85">Update room status, start cleaning or log a task</div></div>
      </motion.button>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" />Requests & cleaning <span className="rounded-full bg-secondary px-2 text-xs">{tasks.length}</span></h2>
          {isLoading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted" />)}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {tasks.map((t) => {
                const step = TASK_FLOW.find((f) => f.id === t.status) ?? TASK_FLOW[0];
                return (
                  <motion.div layout key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className={`rounded-3xl border bg-card p-4 shadow-card ${t.escalated ? "border-destructive/50" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div><div className="text-xl font-bold">Room {t.rooms?.number}</div><div className="text-xs capitalize text-muted-foreground">{t.source} · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</div></div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.status === "pending" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}>{step.label}</span>
                    </div>
                    {t.note && <p className="mt-2 text-sm">{t.note}</p>}
                    {t.escalated && <p className="mt-2 flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="size-3" />Waiting too long</p>}
                    {step.next && <Button className="mt-3 w-full" onClick={() => move(t, step.next!)}>{step.action}</Button>}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {!isLoading && !tasks.length && <div className="rounded-3xl border border-dashed bg-card p-10 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 size-8 text-success" />All rooms are taken care of.</div>}
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Wrench className="size-4 text-primary" />Open issues</h2>
          <div className="space-y-2">
            {(data?.issues ?? []).map((i) => (
              <div key={i.id} className="rounded-2xl border bg-card p-3">
                <div className="flex justify-between text-sm"><b>Room {i.rooms?.number} · {i.category}</b><span className={`text-xs capitalize ${i.severity === "high" ? "text-destructive" : "text-muted-foreground"}`}>{i.severity}</span></div>
                <div className="text-xs text-muted-foreground">{i.tag}{i.note ? ` — ${i.note}` : ""}</div>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => resolve(i.id)}>Mark fixed</Button>
              </div>
            ))}
            {!data?.issues.length && <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">No open issues.</p>}
          </div>
        </section>
      </div>
      <CodeScanner open={scan} onOpenChange={setScan} onResult={onScan} title="Scan room" hint="Scan the barcode on the room label" />
      <Sheet open={!!room} onOpenChange={(o) => !o && setRoom(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><BedDouble className="size-5 text-primary" />Room {room?.number} <span className="text-sm font-normal capitalize text-muted-foreground">· {room?.room_type} · {room?.status}</span></SheetTitle></SheetHeader>
          <div className="grid grid-cols-2 gap-2 p-4">
            <Button variant="outline" onClick={() => setRoomStatus("cleaning")}>Start cleaning</Button>
            <Button onClick={() => setRoomStatus("available")}>Clean & ready</Button>
            <Button variant="outline" onClick={() => setRoomStatus("maintenance")}>Needs repair</Button>
            <Button variant="outline" onClick={newCleaning}>Add task</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

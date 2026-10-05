import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const ISSUE_TAGS: Record<string, string[]> = {
  AC: ["Low cooling", "No remote", "Noisy", "Leaking"],
  "Wi-Fi": ["Slow speed", "Low range", "No connection"],
  Washroom: ["Dirty washroom", "No hot water", "Leaking tap", "Blocked drain"],
  TV: ["No signal", "Remote missing", "Not turning on"],
  Furniture: ["Broken chair", "Bed squeaks", "Wardrobe stuck"],
  Cleanliness: ["Bad odour", "Stained linen", "Pest sighting"],
};

export function RoomConditions({ room, hotelId, trigger }: { room: { id: string; number: string }; hotelId: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Room {room.number} · conditions</DialogTitle></DialogHeader>
        {open && <RoomIssuePanel room={room} hotelId={hotelId} />}
      </DialogContent>
    </Dialog>
  );
}

export function RoomIssuePanel({ room, hotelId }: { room: { id: string; number: string }; hotelId: string }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [cat, setCat] = useState("AC");
  const [sev, setSev] = useState("medium");
  const [note, setNote] = useState("");
  const { data: issues } = useQuery({
    queryKey: ["issues", room.id],
    queryFn: async () => (await supabase.from("room_issues").select("*").eq("room_id", room.id).eq("resolved", false).order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["issues"] }); qc.invalidateQueries({ queryKey: ["rooms"] }); qc.invalidateQueries({ queryKey: ["dash"] }); };
  const report = async (tag: string) => {
    if (!me) return;
    const { error } = await supabase.from("room_issues").insert({ hotel_id: hotelId, room_id: room.id, category: cat, tag, severity: sev, note: note.slice(0, 200) || null, reported_by: me.id });
    if (error) return toast.error(error.message);
    toast.success(`Reported: ${tag}`); setNote(""); refresh();
  };
  const resolve = async (id: string) => {
    const { error } = await supabase.from("room_issues").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as fixed"); refresh();
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {(issues ?? []).map((i) => (
          <div key={i.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
            <AlertTriangle className={`size-4 ${i.severity === "high" ? "text-destructive" : "text-warning"}`} />
            <div className="flex-1"><b>{i.category}</b> · {i.tag}{i.note && <div className="text-xs text-muted-foreground">{i.note}</div>}</div>
            <Button size="sm" variant="outline" onClick={() => resolve(i.id)}><Check /> Fixed</Button>
          </div>
        ))}
        {!issues?.length && <p className="rounded-xl bg-success/10 p-3 text-sm text-success">No open issues — room is in good condition.</p>}
      </div>
      <div className="rounded-2xl bg-secondary p-4">
        <div className="mb-2 text-sm font-semibold">Report a condition</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(ISSUE_TAGS).map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-xs ${cat === c ? "bg-foreground text-background" : "bg-card"}`}>{c}</button>)}
        </div>
        <div className="mt-2 flex gap-1.5 text-xs">
          {["low", "medium", "high"].map((s) => <button key={s} onClick={() => setSev(s)} className={`rounded-full px-3 py-1 capitalize ${sev === s ? "bg-primary text-primary-foreground" : "bg-card"}`}>{s}</button>)}
        </div>
        <Input className="mt-2 bg-card" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {ISSUE_TAGS[cat]!.map((t) => <Button key={t} size="sm" variant="outline" className="bg-card" onClick={() => report(t)}>{t}</Button>)}
        </div>
      </div>
    </div>
  );
}

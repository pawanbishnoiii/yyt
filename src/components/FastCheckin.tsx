import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { z } from "zod";
import confetti from "canvas-confetti";
import { Fingerprint, Loader2, Minus, Plus, UserPlus, Zap, X, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PREFS = ["Quiet room", "High floor", "Extra pillows", "Vegan meals", "Late checkout", "Early check-in", "Twin beds", "Near lift", "Airport pickup"];

type G = { id: string; first_name: string; last_name: string; mobile: string; aadhaar: string | null; guest_code: string; preferences: string[]; interests: string[]; stay_notes: string | null };

const newSchema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(50),
  last_name: z.string().trim().min(1, "Last name required").max(50),
  age: z.coerce.number().int().min(1, "Age required").max(120),
  gender: z.string().min(1, "Gender required"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile required"),
  aadhaar: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits").or(z.literal("")),
  address: z.string().trim().min(3, "Address required").max(300),
});

export function FastCheckin({ hotelId, rooms }: { hotelId: string; rooms: { id: string; number: string; room_type: string; price: number; status: string }[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [guest, setGuest] = useState<G | null>(null);
  const [creating, setCreating] = useState(false);
  const [ng, setNg] = useState({ first_name: "", last_name: "", age: "", gender: "", mobile: "", aadhaar: "", address: "" });
  const [prefs, setPrefs] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [nights, setNights] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDq(q.replace(/\D/g, "")), 220); return () => clearTimeout(t); }, [q]);

  const { data: matches, isFetching } = useQuery({
    queryKey: ["fast-lookup", dq],
    enabled: dq.length >= 4 && !guest,
    queryFn: async () => (await supabase.from("guests").select("id,first_name,last_name,mobile,aadhaar,guest_code,preferences,interests,stay_notes")
      .or(`mobile.like.${dq}%,aadhaar.like.${dq}%`).limit(4)).data as G[] ?? [],
  });
  const { data: stays } = useQuery({
    queryKey: ["fast-stays", guest?.id],
    enabled: !!guest,
    queryFn: async () => (await supabase.rpc("guest_visits", { _guest: guest!.id })).data ?? [],
  });

  const avail = rooms.filter((r) => r.status === "available");
  const room = avail.find((r) => r.id === roomId);
  const exact = dq.length === 10 || dq.length === 12;

  const pick = (g: G) => { setGuest(g); setPrefs(g.preferences ?? []); setNote(g.stay_notes ?? ""); setCreating(false); };
  const reset = () => { setGuest(null); setQ(""); setDq(""); setCreating(false); setPrefs([]); setNote(""); setRoomId(null); setNights(1); setNg({ first_name: "", last_name: "", age: "", gender: "", mobile: "", aadhaar: "", address: "" }); };
  const startNew = () => {
    setCreating(true);
    setNg({ ...ng, mobile: dq.length === 10 ? dq : "", aadhaar: dq.length === 12 ? dq : "" });
  };

  const checkIn = async () => {
    if (!roomId) return toast.error("Pick a room");
    setBusy(true);
    try {
      let gid = guest?.id;
      if (!gid) {
        const r = newSchema.safeParse(ng);
        if (!r.success) throw new Error(r.error.issues[0]?.message);
        const { data, error } = await supabase.from("guests").insert({ ...r.data, aadhaar: r.data.aadhaar || null, preferences: prefs, stay_notes: note.slice(0, 300) || null }).select("id").single();
        if (error) throw new Error(error.message.includes("duplicate") ? "A guest with this mobile already exists" : error.message);
        gid = data.id;
      } else {
        await supabase.from("guests").update({ preferences: prefs, stay_notes: note.slice(0, 300) || null }).eq("id", gid);
      }
      const { data: code, error } = await supabase.rpc("quick_checkin", { _guest: gid, _room: roomId, _nights: nights });
      if (error) throw error;
      confetti({ particleCount: 90, spread: 70, origin: { x: 0.85, y: 0.3 } });
      toast.success(`Checked in to room ${room?.number} · ${code}`);
      reset();
      qc.invalidateQueries();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const ready = guest || creating;

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="bg-neon px-5 py-4 text-primary-foreground">
        <div className="flex items-center gap-2 font-semibold"><Zap className="size-4" /> Fast check-in</div>
        <p className="text-xs opacity-80">Type a mobile or Aadhaar number — returning guests appear instantly.</p>
      </div>
      <div className="space-y-4 p-5">
        {!ready && (
          <>
            <div className="relative">
              <Fingerprint className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input inputMode="numeric" className="h-11 rounded-xl pl-9 font-mono tracking-wider" placeholder="98765 43210 / Aadhaar" value={q}
                onChange={(e) => setQ(e.target.value.replace(/[^\d ]/g, "").slice(0, 14))} />
              {isFetching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            <AnimatePresence>
              {(matches ?? []).map((g) => (
                <motion.button key={g.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => pick(g)}
                  className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary hover:bg-secondary">
                  <span className="grid size-10 place-items-center rounded-full bg-secondary font-bold text-primary">{g.first_name[0]}{g.last_name[0]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{g.first_name} {g.last_name}</div>
                    <div className="text-xs text-muted-foreground">{g.mobile} · {g.guest_code}</div>
                  </div>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">MATCH</span>
                </motion.button>
              ))}
            </AnimatePresence>
            {dq.length >= 4 && !isFetching && !matches?.length && (
              <div className="rounded-xl border border-dashed p-4 text-center text-sm">
                <p className="text-muted-foreground">No guest found{exact ? "" : " yet — keep typing"}.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={startNew}><UserPlus /> Register new guest</Button>
              </div>
            )}
            {dq.length < 4 && <Button size="sm" variant="ghost" className="w-full" onClick={startNew}><UserPlus /> Walk-in without lookup</Button>}
          </>
        )}

        {ready && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {guest ? (
              <div className="flex items-start gap-3 rounded-xl bg-secondary p-3">
                <span className="grid size-11 place-items-center rounded-full bg-card font-bold text-primary">{guest.first_name[0]}{guest.last_name[0]}</span>
                <div className="flex-1 text-sm">
                  <div className="font-semibold">Welcome back, {guest.first_name} {guest.last_name}</div>
                  <div className="text-xs text-muted-foreground">{guest.mobile} · {guest.guest_code}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><History className="size-3" />{stays?.length ?? 0} previous stays{stays?.[0] ? ` · last at ${stays[0].hotel_name}` : ""}</div>
                </div>
                <button onClick={reset} aria-label="Clear"><X className="size-4" /></button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold">New guest<button onClick={reset} aria-label="Clear"><X className="size-4" /></button></div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="First name" value={ng.first_name} onChange={(e) => setNg({ ...ng, first_name: e.target.value })} />
                  <Input placeholder="Last name" value={ng.last_name} onChange={(e) => setNg({ ...ng, last_name: e.target.value })} />
                  <Input placeholder="Age" type="number" value={ng.age} onChange={(e) => setNg({ ...ng, age: e.target.value })} />
                  <Select value={ng.gender} onValueChange={(v) => setNg({ ...ng, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                    <SelectContent>{["Male", "Female", "Other"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Mobile" value={ng.mobile} onChange={(e) => setNg({ ...ng, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
                  <Input placeholder="Aadhaar (optional)" value={ng.aadhaar} onChange={(e) => setNg({ ...ng, aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })} />
                  <Input className="col-span-2" placeholder="Address" value={ng.address} onChange={(e) => setNg({ ...ng, address: e.target.value })} />
                </div>
              </div>
            )}

            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stay preferences</div>
              <div className="flex flex-wrap gap-1.5">
                {PREFS.map((p) => {
                  const on = prefs.includes(p);
                  return <button key={p} onClick={() => setPrefs(on ? prefs.filter((x) => x !== p) : [...prefs, p])}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{p}</button>;
                })}
              </div>
              <Input className="mt-2" placeholder="Special note (allergies, celebration…)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span>Room</span><span>{avail.length} free</span></div>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto">
                {avail.map((r) => (
                  <button key={r.id} onClick={() => setRoomId(r.id)} title={`${r.room_type} · ${inr(r.price)}`}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${roomId === r.id ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}>
                    {r.number}<span className="ml-1 font-normal opacity-70">{r.room_type[0]}</span>
                  </button>
                ))}
                {!avail.length && <p className="text-xs text-muted-foreground">No rooms available.</p>}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-secondary p-3">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="size-8" onClick={() => setNights(Math.max(1, nights - 1))}><Minus /></Button>
                <span className="w-16 text-center text-sm font-semibold">{nights} night{nights > 1 ? "s" : ""}</span>
                <Button size="icon" variant="outline" className="size-8" onClick={() => setNights(Math.min(60, nights + 1))}><Plus /></Button>
              </div>
              <div className="text-right text-sm"><div className="text-xs text-muted-foreground">Est. before GST</div><div className="font-bold">{inr((room?.price ?? 0) * nights)}</div></div>
            </div>
            <Button variant="neon" size="lg" className="w-full" disabled={busy || !roomId} onClick={checkIn}>{busy ? <Loader2 className="animate-spin" /> : <Zap />} Complete check-in</Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

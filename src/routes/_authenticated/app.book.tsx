import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { z } from "zod";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import {
  Search, UserCheck, UserPlus, Check, BedDouble, ArrowLeft, ArrowRight, Zap, Users, Plus, Trash2, Pencil,
  CalendarDays, Clock, Camera, Upload, CreditCard, Banknote, Smartphone, Printer, CornerDownLeft, Phone, IdCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, useHotel } from "@/lib/me";
import { NoHotel } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/book")({
  head: () => ({ meta: [{ title: "New booking — StayOS" }, { name: "robots", content: "noindex" }] }),
  component: Booking,
});

const guestSchema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(50),
  last_name: z.string().trim().max(50),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile"),
  aadhaar: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits").or(z.literal("")),
  address: z.string().trim().max(300),
});

type Guest = { id?: string; guest_code?: string; first_name: string; last_name: string; age: string; gender: string; mobile: string; aadhaar: string; address: string; preferences?: string[] };
const emptyGuest: Guest = { first_name: "", last_name: "", age: "", gender: "", mobile: "", aadhaar: "", address: "" };
type Occupant = { full_name: string; age: string; gender: string; aadhaar: string };
const SOURCES = [["walk-in", "Walk-in"], ["phone", "Phone call"], ["online", "Website"], ["ota", "OTA (MakeMyTrip, etc.)"], ["corporate", "Corporate"], ["referral", "Referral"]];
const METHODS = [{ id: "cash", label: "Cash", icon: Banknote }, { id: "upi", label: "UPI", icon: Smartphone }, { id: "card", label: "Card", icon: CreditCard }];
const STEPS = [
  { t: "Lead guest", i: UserCheck }, { t: "Room", i: BedDouble }, { t: "Stay dates", i: CalendarDays },
  { t: "Guests", i: Users }, { t: "Payment", i: CreditCard },
];

function Booking() {
  const { hotelId } = useHotel();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [lookup, setLookup] = useState("");
  const [guest, setGuest] = useState<Guest>(emptyGuest);
  const [found, setFound] = useState<boolean | null>(null);
  const [editing, setEditing] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [checkOut, setCheckOut] = useState<Date | undefined>(addDays(startOfDay(new Date()), 1));
  const [source, setSource] = useState("walk-in");
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [offerCode, setOfferCode] = useState("");
  const [method, setMethod] = useState("cash");
  const [received, setReceived] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ bill_id: string; booking_code: string; paid: number; total: number } | null>(null);
  const [now, setNow] = useState(new Date());
  const lookupRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const { data: rooms } = useQuery({
    queryKey: ["rooms-avail", hotelId], enabled: !!hotelId,
    queryFn: async () => (await supabase.from("rooms").select("*").eq("hotel_id", hotelId!).eq("status", "available").order("number")).data ?? [],
  });
  const { data: offers } = useQuery({ queryKey: ["offers-active"], queryFn: async () => (await supabase.from("offers").select("*").eq("active", true)).data ?? [] });
  const { data: hotel } = useQuery({
    queryKey: ["book-hotel", hotelId], enabled: !!hotelId,
    queryFn: async () => (await supabase.from("hotels").select("*").eq("id", hotelId!).single()).data as unknown as { cgst_rate: number; sgst_rate: number; checkout_time: string; checkout_time_enabled: boolean; id_upload_enabled: boolean } | null,
  });

  const room = rooms?.find((r) => r.id === roomId);
  const today = startOfDay(now);
  const nights = checkOut ? Math.max(1, differenceInCalendarDays(checkOut, today)) : 1;
  const offer = offers?.find((o) => o.code.toUpperCase() === offerCode.trim().toUpperCase());
  const base = room ? Number(room.price) * nights : 0;
  const disc = offer ? (base * Number(offer.discount_pct)) / 100 : 0;
  const taxable = base - disc;
  const cgst = (taxable * Number(hotel?.cgst_rate ?? 6)) / 100;
  const sgst = (taxable * Number(hotel?.sgst_rate ?? 6)) / 100;
  const total = Math.round((taxable + cgst + sgst) * 100) / 100;
  const coTime = hotel?.checkout_time_enabled !== false ? (hotel?.checkout_time ?? "11:00").slice(0, 5) : null;
  const coLabel = coTime ? format(new Date(`2000-01-01T${coTime}`), "h:mm a") : null;
  const types = ["All", ...Array.from(new Set((rooms ?? []).map((r) => r.room_type)))];

  const doLookup = async () => {
    const q = lookup.trim();
    if (!/^\d{10}$|^\d{12}$/.test(q)) return toast.error("Enter a 10-digit mobile or 12-digit Aadhaar");
    const col = q.length === 10 ? "mobile" : "aadhaar";
    const { data } = await supabase.from("guests").select("*").eq(col, q).maybeSingle();
    if (data) {
      setGuest({ id: data.id, guest_code: data.guest_code, first_name: data.first_name, last_name: data.last_name, age: String(data.age ?? ""), gender: data.gender ?? "", mobile: data.mobile, aadhaar: data.aadhaar ?? "", address: data.address ?? "", preferences: data.preferences ?? [] });
      setFound(true); setEditing(false);
      toast.success(`Welcome back, ${data.first_name}. Press Enter to choose a room.`);
    } else {
      setGuest({ ...emptyGuest, [col]: q }); setFound(false); setEditing(true);
      toast.info("New guest — fill in the details");
    }
  };

  /** Saves the guest as soon as they move past step 1, even if the booking is never finished. */
  const saveGuest = async () => {
    const r = guestSchema.safeParse(guest);
    if (!r.success) { toast.error(r.error.issues[0].message); return false; }
    const { data, error } = await supabase.rpc("save_guest" as never, {
      _id: guest.id ?? null, _first: guest.first_name, _last: guest.last_name, _mobile: guest.mobile, _aadhaar: guest.aadhaar,
      _age: guest.age ? Number(guest.age) : null, _gender: guest.gender, _address: guest.address,
    } as never);
    if (error) { toast.error(error.message); return false; }
    setGuest((g) => ({ ...g, id: data as unknown as string }));
    return true;
  };

  const next = async () => {
    if (busy) return;
    if (step === 0) {
      if (found === null) return doLookup();
      setBusy(true); const ok = await saveGuest(); setBusy(false);
      if (!ok) return;
    }
    if (step === 1 && !roomId) return toast.error("Pick a room");
    if (step === 2 && !checkOut) return toast.error("Pick a check-out date");
    if (step === 3) {
      if (room && occupants.length + 1 > room.capacity) return toast.error(`Room ${room.number} fits ${room.capacity} guests`);
      if (occupants.some((o) => !o.full_name.trim())) return toast.error("Every guest needs a name");
    }
    if (step === 4) return confirm();
    setStep((s) => s + 1);
  };
  const nextRef = useRef(next); nextRef.current = next;

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || done) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.closest("[role=listbox],[role=dialog]")) return;
      if (t === lookupRef.current && found === null) return;
      e.preventDefault(); nextRef.current();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [done, found]);

  const confirm = async () => {
    if (!room || !guest.id) return;
    const amt = Math.min(Number(received || 0), total);
    setBusy(true);
    try {
      const all = [{ full_name: `${guest.first_name} ${guest.last_name}`.trim(), age: guest.age, gender: guest.gender, aadhaar: guest.aadhaar }, ...occupants];
      const { data: bk, error } = await supabase.rpc("create_booking", { _guest: guest.id, _room: room.id, _nights: nights, _occupants: all, _offer_code: offer?.code ?? "", _paid: false, _payment_mode: method, _source: source });
      if (error) throw error;
      const res = bk as { booking_id: string; bill_id: string; booking_code: string };
      if (checkOut) {
        const planned = new Date(checkOut); if (coTime) { const [h, m] = coTime.split(":"); planned.setHours(+h, +m, 0, 0); }
        await supabase.from("bookings").update({ check_out_planned: planned.toISOString() } as never).eq("id", res.booking_id);
      }
      if (amt > 0) {
        const { error: pe } = await supabase.from("bill_payments" as never).insert({ bill_id: res.bill_id, hotel_id: hotelId, amount: amt, method, note: "At check-in" } as never);
        if (pe) toast.error("Booking saved, but the payment could not be recorded: " + pe.message);
      }
      if (idFile) {
        const ext = idFile.name.split(".").pop() || "jpg";
        const path = `${hotelId}/${guest.id}-${Date.now()}.${ext}`;
        const up = await supabase.storage.from("guest-ids").upload(path, idFile);
        if (!up.error) await supabase.from("guests").update({ id_doc_path: path } as never).eq("id", guest.id);
      }
      confetti({ particleCount: 140, spread: 80 });
      setDone({ bill_id: res.bill_id, booking_code: res.booking_code, paid: amt, total });
      qc.invalidateQueries();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  if (!hotelId) return <NoHotel />;

  if (done) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg rounded-[2rem] border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success"><Check className="size-8" /></div>
      <h1 className="mt-4 font-display text-2xl font-bold">Checked in · Room {room?.number}</h1>
      <p className="text-muted-foreground">Booking <span className="font-mono font-semibold text-foreground">{done.booking_code}</span></p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-2xl bg-secondary p-3"><div className="text-xs text-muted-foreground">Total</div><div className="font-bold">{inr(done.total)}</div></div>
        <div className="rounded-2xl bg-secondary p-3"><div className="text-xs text-muted-foreground">Received</div><div className="font-bold text-success">{inr(done.paid)}</div></div>
        <div className="rounded-2xl bg-secondary p-3"><div className="text-xs text-muted-foreground">Due</div><div className="font-bold">{inr(done.total - done.paid)}</div></div>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {done.paid > 0 ? <Button size="lg" asChild><Link to="/app/bill/$id" params={{ id: done.bill_id }}><Printer /> Print bill</Link></Button>
          : <p className="rounded-2xl bg-warning/10 p-3 text-sm text-warning">Bill printing unlocks once a payment is recorded. Open the bill to collect payment.</p>}
        <Button variant="outline" asChild><Link to="/app/bill/$id" params={{ id: done.bill_id }}>Open bill & payments</Link></Button>
        <Button variant="ghost" onClick={() => { setDone(null); setStep(0); setGuest(emptyGuest); setFound(null); setLookup(""); setRoomId(""); setOccupants([]); setIdFile(null); setReceived(""); setOfferCode(""); }}>Start another booking</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">Front desk</p><h1 className="font-display text-3xl font-bold">New booking</h1></div>
          <span className="hidden items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex"><CornerDownLeft className="size-3.5" /> Enter = next step</span>
        </div>
        <div className="mb-6 grid grid-cols-5 gap-1.5 rounded-2xl border bg-card p-1.5">
          {STEPS.map((s, i) => (
            <button key={s.t} disabled={i > step} onClick={() => setStep(i)} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:text-sm ${i === step ? "bg-primary text-primary-foreground shadow-glow" : i < step ? "text-primary hover:bg-primary/5" : "text-muted-foreground"}`}>
              {i < step ? <Check className="size-4 shrink-0" /> : <s.i className="size-4 shrink-0" />}<span className="hidden truncate md:inline">{s.t}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="rounded-3xl border bg-card p-5 shadow-card sm:p-7">
            {step === 0 && (
              <div className="space-y-5">
                <Head t="Who is checking in?" s="Search by mobile or Aadhaar — returning guests load instantly." />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input ref={lookupRef} autoFocus className="h-12 rounded-2xl pl-11 font-mono text-base tracking-wider" placeholder="98765 43210  or  Aadhaar" value={lookup}
                      onChange={(e) => { setLookup(e.target.value.replace(/\D/g, "").slice(0, 12)); setFound(null); }} onKeyDown={(e) => { if (e.key === "Enter" && found === null) { e.preventDefault(); doLookup(); } }} />
                  </div>
                  <Button size="lg" className="h-12 rounded-2xl" onClick={doLookup}><Search /> Fetch</Button>
                  <Button size="lg" variant="outline" className="h-12 rounded-2xl" onClick={() => { setGuest(emptyGuest); setFound(false); setEditing(true); }}><UserPlus /> New</Button>
                </div>
                {found && !editing && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4 rounded-2xl border border-success/30 bg-success/5 p-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-success text-xl font-bold text-primary-foreground">{guest.first_name[0]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="truncate font-display text-lg font-bold">{guest.first_name} {guest.last_name}</span><span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">RETURNING</span></div>
                      <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Phone className="size-3" />{guest.mobile}</span><span className="flex items-center gap-1"><IdCard className="size-3" />{guest.aadhaar ? `•••• ${guest.aadhaar.slice(-4)}` : "No Aadhaar"}</span><span>ID {guest.guest_code}</span></div>
                      {!!guest.preferences?.length && <div className="mt-1 text-xs text-primary">{guest.preferences.join(" · ")}</div>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
                  </motion.div>
                )}
                {editing && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <F label="First name *"><Input value={guest.first_name} onChange={(e) => setGuest({ ...guest, first_name: e.target.value })} /></F>
                    <F label="Last name"><Input value={guest.last_name} onChange={(e) => setGuest({ ...guest, last_name: e.target.value })} /></F>
                    <F label="Mobile *"><Input inputMode="numeric" value={guest.mobile} onChange={(e) => setGuest({ ...guest, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></F>
                    <F label="Aadhaar"><Input inputMode="numeric" value={guest.aadhaar} onChange={(e) => setGuest({ ...guest, aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })} /></F>
                    <F label="Age"><Input type="number" value={guest.age} onChange={(e) => setGuest({ ...guest, age: e.target.value })} /></F>
                    <F label="Gender"><Seg value={guest.gender} options={["Male", "Female", "Other"]} onChange={(v) => setGuest({ ...guest, gender: v })} /></F>
                    <div className="sm:col-span-2"><F label="Address"><Textarea rows={2} value={guest.address} onChange={(e) => setGuest({ ...guest, address: e.target.value })} /></F></div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <Head t="Pick a room" s={`${rooms?.length ?? 0} rooms free right now`} />
                <div className="flex flex-wrap gap-2">{types.map((t) => <button key={t} onClick={() => setTypeFilter(t)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${typeFilter === t ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/70"}`}>{t}</button>)}</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {(rooms ?? []).filter((r) => typeFilter === "All" || r.room_type === typeFilter).map((r) => (
                    <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} key={r.id} onClick={() => setRoomId(r.id)} onDoubleClick={() => { setRoomId(r.id); setStep(2); }}
                      className={`relative rounded-2xl border p-4 text-left transition-all ${roomId === r.id ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/40"}`}>
                      {roomId === r.id && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
                      <div className="font-display text-2xl font-bold">{r.number}</div>
                      <div className="text-xs text-muted-foreground">{r.room_type} · up to {r.capacity}</div>
                      <div className="mt-2 text-sm font-semibold">{inr(Number(r.price))}<span className="text-xs font-normal text-muted-foreground">/night</span></div>
                    </motion.button>
                  ))}
                  {!rooms?.length && <p className="col-span-full text-sm text-muted-foreground">No rooms are free. Mark rooms clean from the Rooms page.</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <div className="rounded-2xl border p-2"><Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={{ before: addDays(today, 1) }} numberOfMonths={1} className="pointer-events-auto p-3" /></div>
                <div className="space-y-4">
                  <Head t="Stay dates" s="Check-in is right now. Pick the check-out day." />
                  <div className="rounded-2xl bg-secondary p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" /> Check-in (live)</div><div className="font-display text-lg font-bold tabular-nums">{format(now, "EEE d MMM · h:mm:ss a")}</div></div>
                  <div className="rounded-2xl bg-secondary p-4"><div className="text-xs text-muted-foreground">Check-out</div><div className="font-display text-lg font-bold">{checkOut ? format(checkOut, "EEE d MMM") : "—"}{coLabel && ` · ${coLabel}`}</div>{!coLabel && <div className="text-xs text-muted-foreground">No fixed check-out time for this hotel</div>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Nights"><div className="flex items-center gap-2"><Button size="icon" variant="outline" onClick={() => setCheckOut(addDays(today, Math.max(1, nights - 1)))}>−</Button><span className="w-10 text-center font-display text-2xl font-bold">{nights}</span><Button size="icon" variant="outline" onClick={() => setCheckOut(addDays(today, nights + 1))}>+</Button></div></F>
                    <F label="Booking source"><Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SOURCES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></F>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><Head t="Who's staying" s={`Room ${room?.number} fits up to ${room?.capacity} guests`} /><span className="rounded-2xl bg-primary/10 px-4 py-2 font-display text-xl font-bold text-primary">{occupants.length + 1}</span></div>
                <div className="rounded-2xl border bg-secondary/50 p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lead guest</div><div className="font-semibold">{guest.first_name} {guest.last_name}</div></div>
                {occupants.map((o, i) => (
                  <div key={i} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[2fr_80px_1.4fr_1.6fr_auto]">
                    <F label={`Guest ${i + 2} *`}><Input value={o.full_name} onChange={(e) => setOccupants(occupants.map((x, j) => (j === i ? { ...x, full_name: e.target.value } : x)))} /></F>
                    <F label="Age"><Input type="number" value={o.age} onChange={(e) => setOccupants(occupants.map((x, j) => (j === i ? { ...x, age: e.target.value } : x)))} /></F>
                    <F label="Gender"><Seg value={o.gender} options={["M", "F", "O"]} onChange={(v) => setOccupants(occupants.map((x, j) => (j === i ? { ...x, gender: v } : x)))} /></F>
                    <F label="Aadhaar"><Input value={o.aadhaar} onChange={(e) => setOccupants(occupants.map((x, j) => (j === i ? { ...x, aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) } : x)))} /></F>
                    <Button className="self-end" size="icon" variant="ghost" onClick={() => setOccupants(occupants.filter((_, j) => j !== i))}><Trash2 /></Button>
                  </div>
                ))}
                <Button variant="outline" disabled={!!room && occupants.length + 1 >= room.capacity} onClick={() => setOccupants([...occupants, { full_name: "", age: "", gender: "", aadhaar: "" }])}><Plus /> Add guest</Button>
                {hotel?.id_upload_enabled !== false && (
                  <div className="rounded-2xl border border-dashed p-4">
                    <div className="mb-3 flex items-center gap-2 font-semibold"><IdCard className="size-4 text-primary" /> Lead guest ID proof</div>
                    {idFile ? (
                      <div className="flex items-center gap-3"><img src={URL.createObjectURL(idFile)} alt="ID preview" className="h-20 w-32 rounded-xl object-cover" /><div className="flex-1 truncate text-sm">{idFile.name}</div><Button size="sm" variant="ghost" onClick={() => setIdFile(null)}><Trash2 /></Button></div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-secondary"><Camera className="size-4" /> Take photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} /></label>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-secondary"><Upload className="size-4" /> Upload / scan<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} /></label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 4 && room && (
              <div className="space-y-5">
                <Head t="Payment" s="Record what the guest pays now — the rest stays as balance on the bill." />
                <div className="grid grid-cols-3 gap-2">{METHODS.map((m) => <button key={m.id} onClick={() => setMethod(m.id)} className={`flex flex-col items-center gap-1 rounded-2xl border py-4 text-sm font-semibold transition ${method === m.id ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20" : "hover:bg-secondary"}`}><m.icon className="size-5" />{m.label}</button>)}</div>
                <F label="Amount received now">
                  <div className="flex gap-2"><Input autoFocus type="number" className="h-12 font-display text-lg" placeholder="0" value={received} onChange={(e) => setReceived(e.target.value)} /><Button variant="outline" className="h-12" onClick={() => setReceived(String(total))}>Full {inr(total)}</Button></div>
                </F>
                <div className="flex gap-2"><Input placeholder="Offer code" value={offerCode} onChange={(e) => setOfferCode(e.target.value.toUpperCase())} /><Button variant="outline" onClick={() => toast[offer ? "success" : "error"](offer ? `${offer.discount_pct}% off applied` : "Code not found")}>Apply</Button></div>
                {Number(received) > 0 && Number(received) < total && <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">Partial payment — {inr(total - Number(received))} stays due.</p>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft /> Back</Button>
          <Button size="lg" disabled={busy || (step === 0 && found === null && lookup.length < 10)} onClick={next}>
            {step === 4 ? <><Zap /> {busy ? "Checking in…" : "Confirm & check in"}</> : <>{step === 0 && found === null ? "Fetch guest" : "Next"} <ArrowRight /></>}
          </Button>
        </div>
      </div>

      <aside className="h-fit space-y-3 rounded-3xl border bg-card p-5 shadow-card lg:sticky lg:top-24">
        <div className="font-display text-lg font-bold">Booking summary</div>
        <Row k="Guest" v={guest.first_name ? `${guest.first_name} ${guest.last_name}` : "—"} />
        <Row k="Room" v={room ? `${room.number} · ${room.room_type}` : "—"} />
        <Row k="Dates" v={checkOut ? `${format(today, "d MMM")} → ${format(checkOut, "d MMM")}` : "—"} />
        <Row k="Nights · guests" v={`${nights} · ${occupants.length + 1}`} />
        <div className="border-t pt-3" />
        <Row k="Room charges" v={inr(base)} />
        {offer && <Row k={`Offer ${offer.code}`} v={"− " + inr(disc)} />}
        <Row k={`CGST ${hotel?.cgst_rate ?? 6}%`} v={inr(cgst)} />
        <Row k={`SGST ${hotel?.sgst_rate ?? 6}%`} v={inr(sgst)} />
        <div className="flex justify-between rounded-2xl bg-foreground p-4 text-background"><span>Total</span><span className="font-display text-xl font-bold">{inr(total)}</span></div>
      </aside>
    </div>
  );
}

function Head({ t, s }: { t: string; s: string }) {
  return <div><h2 className="font-display text-xl font-bold">{t}</h2><p className="text-sm text-muted-foreground">{s}</p></div>;
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function Seg({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return <div className="flex gap-1 rounded-xl bg-secondary p-1">{options.map((o) => <button type="button" key={o} onClick={() => onChange(o)} className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${value === o ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{o}</button>)}</div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="truncate text-right font-medium">{v}</span></div>;
}

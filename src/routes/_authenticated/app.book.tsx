import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { z } from "zod";
import { Search, UserCheck, UserPlus, Check, BedDouble, ArrowLeft, ArrowRight, Zap, Users, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, useHotel, useMe } from "@/lib/me";
import { NoHotel, PageTitle } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import clayBell from "@/assets/clay-bell.png";

export const Route = createFileRoute("/_authenticated/app/book")({ component: Booking });

const INTERESTS = ["Spa", "Food", "Gym", "Pool", "Sightseeing", "Business", "Nightlife", "Shopping", "Yoga", "Kids"];

const guestSchema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(50),
  last_name: z.string().trim().min(1, "Last name required").max(50),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.string().min(1, "Gender required"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile"),
  aadhaar: z.string().regex(/^\d{12}$/, "Aadhaar 12 digits").or(z.literal("")),
  address: z.string().trim().min(1, "Address required").max(300),
});

type Guest = {
  id?: string; guest_code?: string; first_name: string; last_name: string; age: string; gender: string;
  mobile: string; aadhaar: string; address: string; interests: string[]; extra: Record<string, string>;
};
const emptyGuest: Guest = { first_name: "", last_name: "", age: "", gender: "", mobile: "", aadhaar: "", address: "", interests: [], extra: {} };
type Occupant = { full_name: string; age: string; gender: string; aadhaar: string };
const emptyOccupant = (): Occupant => ({ full_name: "", age: "", gender: "", aadhaar: "" });

function Booking() {
  const { hotelId } = useHotel();
  const { data: me } = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [lookup, setLookup] = useState("");
  const [guest, setGuest] = useState<Guest>(emptyGuest);
  const [found, setFound] = useState<boolean | null>(null);
  const [roomId, setRoomId] = useState("");
  const [nights, setNights] = useState(1);
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [offerCode, setOfferCode] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paid, setPaid] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data: fields } = useQuery({
    queryKey: ["fields"],
    queryFn: async () => (await supabase.from("onboarding_fields").select("*").eq("enabled", true).order("sort")).data ?? [],
  });
  const { data: rooms } = useQuery({
    queryKey: ["rooms-avail", hotelId],
    enabled: !!hotelId,
    queryFn: async () => (await supabase.from("rooms").select("*").eq("hotel_id", hotelId!).eq("status", "available").order("number")).data ?? [],
  });
  const { data: offers } = useQuery({
    queryKey: ["offers-active"],
    queryFn: async () => (await supabase.from("offers").select("*").eq("active", true)).data ?? [],
  });
  const { data: hotel } = useQuery({ queryKey: ["book-hotel", hotelId], enabled: !!hotelId, queryFn: async () => (await supabase.from("hotels").select("cgst_rate,sgst_rate").eq("id", hotelId!).single()).data });

  if (!hotelId) return <NoHotel />;
  const room = rooms?.find((r) => r.id === roomId);
  const offer = offers?.find((o) => o.code.toUpperCase() === offerCode.trim().toUpperCase());
  const base = room ? Number(room.price) * nights : 0;
  const disc = offer ? (base * Number(offer.discount_pct)) / 100 : 0;
  const taxable = base - disc;
  const cgst = taxable * Number(hotel?.cgst_rate ?? 6) / 100;
  const sgst = taxable * Number(hotel?.sgst_rate ?? 6) / 100;
  const total = taxable + cgst + sgst;

  const doLookup = async () => {
    const q = lookup.trim();
    if (!/^\d{10}$|^\d{12}$/.test(q)) return toast.error("Enter a 10-digit mobile or 12-digit Aadhaar");
    const col = q.length === 10 ? "mobile" : "aadhaar";
    const { data } = await supabase.from("guests").select("*").eq(col, q).maybeSingle();
    if (data) {
      setGuest({
        id: data.id, guest_code: data.guest_code, first_name: data.first_name, last_name: data.last_name,
        age: String(data.age ?? ""), gender: data.gender ?? "", mobile: data.mobile, aadhaar: data.aadhaar ?? "",
        address: data.address ?? "", interests: data.interests ?? [], extra: (data.extra as Record<string, string>) ?? {},
      });
      setFound(true);
      toast.success(`Welcome back ${data.first_name}! Details loaded.`);
    } else {
      setGuest({ ...emptyGuest, [col]: q });
      setFound(false);
      toast.info("New guest — please fill in details");
    }
  };

  const validateGuest = () => {
    const r = guestSchema.safeParse(guest);
    if (!r.success) { toast.error(r.error.issues[0].message); return false; }
    for (const f of fields ?? []) if (f.required && !guest.extra[f.key]) { toast.error(`${f.label} required`); return false; }
    return true;
  };

  const confirm = async () => {
    if (!room) return;
    setBusy(true);
    try {
      const payload = {
        first_name: guest.first_name.trim(), last_name: guest.last_name.trim(), age: Number(guest.age), gender: guest.gender,
        mobile: guest.mobile, aadhaar: guest.aadhaar || null, address: guest.address.trim(), interests: guest.interests, extra: guest.extra,
      };
      let gid = guest.id;
      let gcode = guest.guest_code;
      if (gid) {
        const { error } = await supabase.from("guests").update(payload).eq("id", gid);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("guests").insert(payload).select("id,guest_code").single();
        if (error) throw error;
        gid = data.id; gcode = data.guest_code;
      }
      const allOccupants = [{ full_name: `${guest.first_name} ${guest.last_name}`, age: Number(guest.age), gender: guest.gender, aadhaar: guest.aadhaar || null, is_primary: true }, ...occupants.map(o => ({ full_name: o.full_name.trim(), age: Number(o.age), gender: o.gender, aadhaar: o.aadhaar || null, is_primary: false }))];
      const { data: bk, error: be } = await supabase.rpc("create_booking", { _guest: gid!, _room: room.id, _nights: nights, _occupants: allOccupants, _offer_code: offer?.code ?? "", _paid: paid, _payment_mode: paymentMode, _source: "walk_in" });
      if (be) throw be;
      const result = bk as { booking_code?: string } | null;
      confetti({ particleCount: 140, spread: 80, colors: ["#E4472D", "#32A6A0", "#F1B45A"] });
      toast.success(`Checked in! Booking ${result?.booking_code ?? "created"} · Guest ID ${gcode}`);
      qc.invalidateQueries();
      nav({ to: "/app/rooms" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const steps = ["Lead guest", "Room", "Guests", "Payment"];
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="New booking" sub="A guided 4-step check-in with guest identity, room selection and final tax total" />
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <motion.span animate={{ scale: step === i ? 1.1 : 1 }}
              className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${i <= step ? "bg-neon shadow-glow" : "bg-secondary text-muted-foreground"}`}>
              {i < step ? <Check className="size-4" /> : i + 1}
            </motion.span>
            <span className={`text-sm ${i <= step ? "" : "text-muted-foreground"}`}>{s}</span>
            {i < 3 && <div className="h-0.5 flex-1 rounded bg-secondary"><motion.div className="h-full rounded bg-neon" animate={{ width: i < step ? "100%" : "0%" }} /></div>}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}
          className="rounded-3xl border bg-card shadow-card p-6">
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="rounded-full pl-9" placeholder="Mobile (10 digits) or Aadhaar (12 digits)" value={lookup}
                    onChange={(e) => setLookup(e.target.value.replace(/\D/g, "").slice(0, 12))} onKeyDown={(e) => e.key === "Enter" && doLookup()} />
                </div>
                <Button variant="neon" onClick={doLookup}><Search /> Fetch guest</Button>
              </div>
              {found !== null && (
                <div className={`flex items-center gap-3 rounded-2xl p-3 text-sm ${found ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>
                  {found ? <UserCheck /> : <UserPlus />}
                  {found ? `Returning guest · ID ${guest.guest_code}` : "New guest — a guest ID will be generated at booking"}
                </div>
              )}
              {found !== null && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <F label="First name *"><Input value={guest.first_name} onChange={(e) => setGuest({ ...guest, first_name: e.target.value })} /></F>
                    <F label="Last name *"><Input value={guest.last_name} onChange={(e) => setGuest({ ...guest, last_name: e.target.value })} /></F>
                    <F label="Age *"><Input type="number" value={guest.age} onChange={(e) => setGuest({ ...guest, age: e.target.value })} /></F>
                    <F label="Gender *">
                      <Select value={guest.gender} onValueChange={(v) => setGuest({ ...guest, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{["Male", "Female", "Other"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </F>
                    <F label="Mobile *"><Input value={guest.mobile} onChange={(e) => setGuest({ ...guest, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></F>
                    <F label="Aadhaar"><Input value={guest.aadhaar} onChange={(e) => setGuest({ ...guest, aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })} /></F>
                    <div className="sm:col-span-2"><F label="Address *"><Textarea value={guest.address} onChange={(e) => setGuest({ ...guest, address: e.target.value })} /></F></div>
                    {(fields ?? []).map((f) => (
                      <F key={f.id} label={f.label + (f.required ? " *" : "")}>
                        {f.field_type === "select" ? (
                          <Select value={guest.extra[f.key] ?? ""} onValueChange={(v) => setGuest({ ...guest, extra: { ...guest.extra, [f.key]: v } })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input type={f.field_type} value={guest.extra[f.key] ?? ""} onChange={(e) => setGuest({ ...guest, extra: { ...guest.extra, [f.key]: e.target.value } })} />
                        )}
                      </F>
                    ))}
                  </div>
                  <div>
                    <Label>Interests</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {INTERESTS.map((t) => {
                        const on = guest.interests.includes(t);
                        return (
                          <motion.button whileTap={{ scale: 0.9 }} key={t} type="button"
                            onClick={() => setGuest({ ...guest, interests: on ? guest.interests.filter((x) => x !== t) : [...guest.interests, t] })}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors ${on ? "border-transparent bg-neon" : "hover:border-primary"}`}>{t}</motion.button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {(rooms ?? []).map((r) => (
                  <motion.button whileHover={{ y: -3 }} key={r.id} onClick={() => setRoomId(r.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${roomId === r.id ? "border-primary bg-primary/15 shadow-glow" : "hover:border-primary/50"}`}>
                    <BedDouble className="size-5 text-accent" />
                    <div className="mt-2 font-display text-xl font-bold">{r.number}</div>
                    <div className="text-xs text-muted-foreground">{r.room_type}</div>
                    <div className="mt-1 text-sm font-semibold">{inr(Number(r.price))}<span className="text-xs text-muted-foreground">/night</span></div>
                  </motion.button>
                ))}
                {!rooms?.length && <p className="col-span-full text-sm text-muted-foreground">No rooms available. Add rooms from the Rooms page.</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <F label="Nights"><Input type="number" min={1} value={nights} onChange={(e) => setNights(Math.max(1, Number(e.target.value)))} /></F>
                <F label="Total guests"><Input readOnly value={occupants.length + 1} /></F>
                <F label="Booking source"><Input readOnly value="Walk-in / front desk" /></F>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Everyone staying in the room</h2><p className="text-sm text-muted-foreground">The lead guest is mandatory. Add every additional occupant and their identity details.</p></div><Users className="size-8 text-primary" /></div>
              <div className="rounded-2xl border bg-muted/40 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary guest</div><div className="mt-1 font-semibold">{guest.first_name} {guest.last_name}</div><div className="text-sm text-muted-foreground">Age {guest.age} · {guest.gender} · Aadhaar {guest.aadhaar || "not provided"}</div></div>
              {occupants.map((o, i) => <div key={i} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[2fr_1fr_1.2fr_2fr_auto]">
                <F label={`Guest ${i + 2} name *`}><Input value={o.full_name} onChange={e => setOccupants(occupants.map((x,j) => j===i ? {...x,full_name:e.target.value}:x))} /></F>
                <F label="Age *"><Input type="number" value={o.age} onChange={e => setOccupants(occupants.map((x,j) => j===i ? {...x,age:e.target.value}:x))} /></F>
                <F label="Gender *"><Select value={o.gender} onValueChange={v => setOccupants(occupants.map((x,j) => j===i ? {...x,gender:v}:x))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["Male","Female","Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></F>
                <F label="Aadhaar *"><Input value={o.aadhaar} onChange={e => setOccupants(occupants.map((x,j) => j===i ? {...x,aadhaar:e.target.value.replace(/\D/g,"").slice(0,12)}:x))} /></F>
                <Button className="self-end" size="icon" variant="ghost" onClick={() => setOccupants(occupants.filter((_,j)=>j!==i))}><Trash2 /></Button>
              </div>)}
              <Button variant="outline" onClick={() => setOccupants([...occupants, emptyOccupant()])}><Plus />Add another guest</Button>
            </div>
          )}

          {step === 3 && room && (
            <div className="grid items-center gap-6 md:grid-cols-[1fr_200px]">
              <div className="space-y-3 text-sm">
                <Row k="Guest" v={`${guest.first_name} ${guest.last_name} · ${guest.mobile}`} />
                <Row k="Room" v={`${room.number} · ${room.room_type}`} />
                <Row k="Stay" v={`${nights} night(s) · ${occupants.length + 1} guest(s)`} />
                <Row k="Room charges" v={inr(base)} />
                {offer && <Row k={`Offer ${offer.code}`} v={"- " + inr(disc)} />}
                <div className="flex gap-2"><Input placeholder="Discount code" value={offerCode} onChange={e => setOfferCode(e.target.value.toUpperCase())} /><Button variant="outline" onClick={() => toast[offer ? "success" : "error"](offer ? `${offer.discount_pct}% discount applied` : "Offer code not found")}>Apply</Button></div>
                <Row k={`CGST (${hotel?.cgst_rate ?? 6}%)`} v={inr(cgst)} /><Row k={`SGST (${hotel?.sgst_rate ?? 6}%)`} v={inr(sgst)} />
                <div className="flex justify-between border-t pt-3 font-display text-lg font-bold"><span>Final total</span><span className="text-primary">{inr(total)}</span></div>
                <div className="grid grid-cols-2 gap-3"><F label="Payment method"><Select value={paymentMode} onValueChange={setPaymentMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","upi","card","pay_later"].map(m=><SelectItem key={m} value={m}>{m.replace("_"," ").toUpperCase()}</SelectItem>)}</SelectContent></Select></F><label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={paid} onChange={e=>setPaid(e.target.checked)} />Payment received</label></div>
                <p className="text-xs text-muted-foreground">The opening bill is generated with taxes now. Food and services are added at check-out.</p>
              </div>
              <img src={clayBell} alt="" width={1024} height={1024} loading="lazy" className="animate-float" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft /> Back</Button>
        {step < 3 ? (
          <Button variant="neon" disabled={step === 0 && found === null} onClick={() => {
            if (step === 0 && !validateGuest()) return;
            if (step === 1 && !roomId) return toast.error("Please select a room");
            if (step === 2 && occupants.some(o => !o.full_name.trim() || !o.age || !o.gender || !/^\d{12}$/.test(o.aadhaar))) return toast.error("Complete every additional guest, including a 12-digit Aadhaar");
            setStep(step + 1);
          }}>Next <ArrowRight /></Button>
        ) : (
          <Button variant="neon" size="lg" disabled={busy} onClick={confirm}><Zap /> {busy ? "Checking in…" : "Confirm & Check-in"}</Button>
        )}
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}

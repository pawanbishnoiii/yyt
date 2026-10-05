import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, BedDouble, Building2, Check, Loader2, Plus, Receipt, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { inr } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import clayManager from "@/assets/clay-manager.png";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your hotel — StayOS" }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

export const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"];
const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Executive", "Family"];

const step1 = z.object({
  business: z.string().trim().min(2, "Hotel / brand name is required").max(100),
  manager: z.string().trim().min(2, "Manager name is required").max(100),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  address: z.string().trim().min(5, "Address is required").max(300),
  pincode: z.string().regex(/^\d{6}$/, "PIN code must be 6 digits"),
  state: z.string().min(1, "Select a state"),
  gst: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "GSTIN format looks wrong (e.g. 29ABCDE1234F1Z5)").or(z.literal("")),
  cgst: z.coerce.number().min(0).max(14),
  sgst: z.coerce.number().min(0).max(14),
  upi: z.string().regex(/^[\w.-]+@[\w]+$/, "UPI ID looks wrong (e.g. hotel@okhdfc)").or(z.literal("")),
});

type RoomRow = { type: string; start: string; count: string; price: string };

function Onboarding() {
  const { data: me, isLoading } = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState({ business: "", manager: "", mobile: "", address: "", pincode: "", state: "", gst: "", cgst: "6", sgst: "6", upi: "" });
  const [b, setB] = useState({ branch: "", city: "", address: "", phone: "" });
  const [rooms, setRooms] = useState<RoomRow[]>([{ type: "Standard", start: "101", count: "10", price: "1499" }]);

  if (isLoading) return null;
  if (me?.onboarded && me.roles.length) return <Navigate to="/app" />;
  const manager = a.manager || me?.full_name || "";

  const next1 = () => {
    const r = step1.safeParse({ ...a, manager, gst: a.gst.toUpperCase() });
    if (!r.success) return toast.error(r.error.issues[0]?.message);
    setStep(1);
  };
  const next2 = () => {
    if (b.branch.trim().length < 2) return toast.error("Branch name is required");
    if (!b.city.trim()) return toast.error("City is required");
    for (const r of rooms) {
      if (!/^\d+$/.test(r.start)) return toast.error("Starting room number must be numeric");
      if (+r.count < 1 || +r.count > 100) return toast.error("Room count must be 1–100 per type");
      if (+r.price < 100) return toast.error("Price must be at least ₹100");
    }
    setStep(2);
  };
  const totalRooms = rooms.reduce((s, r) => s + Number(r.count || 0), 0);

  const finish = async () => {
    setBusy(true);
    try {
      const [first, ...rest] = rooms;
      const { data: hid, error } = await supabase.rpc("complete_onboarding", {
        _manager_name: manager, _mobile: a.mobile, _business_name: a.business, _address: a.address, _pincode: a.pincode,
        _state: a.state, _gst: a.gst.toUpperCase(), _cgst: Number(a.cgst), _sgst: Number(a.sgst), _upi: a.upi,
        _branch_name: b.branch, _city: b.city, _branch_address: b.address, _phone: b.phone,
        _room_type: first!.type, _start_no: Number(first!.start), _room_count: Number(first!.count), _price: Number(first!.price),
      });
      if (error) throw error;
      const extra = rest.flatMap((r) => [...Array(Number(r.count))].map((_, i) => ({ hotel_id: hid as string, number: String(Number(r.start) + i), room_type: r.type, price: Number(r.price) })));
      if (extra.length) await supabase.from("rooms").insert(extra);
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Your hotel is live!");
      nav({ to: "/app" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const steps = [{ t: "Business & GST", i: Receipt }, { t: "Add hotel branch", i: Building2 }, { t: "Review & launch", i: Check }];

  return (
    <div className="min-h-screen bg-soft">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6">
          <div className="flex items-center gap-2 font-display text-lg font-bold"><span className="grid size-8 place-items-center rounded-xl bg-neon text-primary-foreground"><BedDouble className="size-4" /></span>StayOS</div>
          <img src={clayManager} alt="" width={1024} height={1024} className="hidden h-44 animate-float lg:block" />
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={s.t} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${i === step ? "bg-card shadow-card" : "text-muted-foreground"}`}>
                <span className={`grid size-8 place-items-center rounded-full ${i < step ? "bg-success text-primary-foreground" : i === step ? "bg-foreground text-background" : "bg-muted"}`}>
                  {i < step ? <Check className="size-4" /> : <s.i className="size-4" />}
                </span>
                <div><div className="text-[11px] uppercase tracking-wide opacity-60">Step {i + 1}</div>{s.t}</div>
              </li>
            ))}
          </ol>
        </aside>

        <div className="rounded-3xl border bg-card p-6 shadow-card md:p-10">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
              {step === 0 && (
                <div className="space-y-6">
                  <Head t="Tell us about your business" s="These details appear on every GST invoice you print." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <F l="Hotel / brand name" v={a.business} on={(v) => setA({ ...a, business: v })} ph="Sunrise Hotels" />
                    <F l="Manager name" v={manager} on={(v) => setA({ ...a, manager: v })} ph="Rahul Verma" />
                    <F l="Mobile number" v={a.mobile} on={(v) => setA({ ...a, mobile: v.replace(/\D/g, "").slice(0, 10) })} ph="9876543210" />
                    <div className="space-y-1.5"><Label>State</Label>
                      <Select value={a.state} onValueChange={(v) => setA({ ...a, state: v })}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2"><F l="Business address" v={a.address} on={(v) => setA({ ...a, address: v })} ph="12, MG Road, Indiranagar" /></div>
                    <F l="PIN code" v={a.pincode} on={(v) => setA({ ...a, pincode: v.replace(/\D/g, "").slice(0, 6) })} ph="560038" />
                    <F l="GSTIN (optional)" v={a.gst} on={(v) => setA({ ...a, gst: v.toUpperCase().slice(0, 15) })} ph="29ABCDE1234F1Z5" />
                  </div>
                  <div className="rounded-2xl bg-secondary p-4">
                    <div className="mb-3 text-sm font-semibold">GST rates (accommodation default 12% = 6% + 6%)</div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <F l="CGST %" v={a.cgst} on={(v) => setA({ ...a, cgst: v })} type="number" />
                      <F l="SGST / State GST %" v={a.sgst} on={(v) => setA({ ...a, sgst: v })} type="number" />
                      <F l="UPI ID for bill QR" v={a.upi} on={(v) => setA({ ...a, upi: v.trim() })} ph="hotel@okhdfc" />
                    </div>
                  </div>
                  <div className="flex justify-end"><Button variant="neon" size="lg" onClick={next1}>Continue <ArrowRight /></Button></div>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-6">
                  <Head t="Add your hotel branch" s="Rooms get barcodes automatically. Housekeeping, Kitchen, Front Desk and Maintenance are created for you." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <F l="Branch name" v={b.branch} on={(v) => setB({ ...b, branch: v })} ph="Sunrise Indiranagar" />
                    <F l="City" v={b.city} on={(v) => setB({ ...b, city: v })} ph="Bengaluru" />
                    <F l="Branch address (if different)" v={b.address} on={(v) => setB({ ...b, address: v })} ph="Same as business" />
                    <F l="Front desk phone" v={b.phone} on={(v) => setB({ ...b, phone: v.replace(/[^\d+ ]/g, "").slice(0, 15) })} ph="080 4000 1234" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between"><Label>Room inventory</Label><span className="text-xs text-muted-foreground">{totalRooms} rooms</span></div>
                    <div className="space-y-2">
                      {rooms.map((r, i) => (
                        <div key={i} className="grid grid-cols-2 items-end gap-2 rounded-2xl border p-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
                          <div className="space-y-1"><Label className="text-xs">Type</Label>
                            <Select value={r.type} onValueChange={(v) => setRooms(rooms.map((x, j) => j === i ? { ...x, type: v } : x))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{ROOM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          {(["start", "count", "price"] as const).map((k) => (
                            <div key={k} className="space-y-1"><Label className="text-xs">{k === "start" ? "From room #" : k === "count" ? "How many" : "₹ / night"}</Label>
                              <Input type="number" value={r[k]} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))} /></div>
                          ))}
                          <Button variant="ghost" size="icon" disabled={rooms.length === 1} onClick={() => setRooms(rooms.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 /></Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setRooms([...rooms, { type: "Deluxe", start: String(Number(rooms.at(-1)!.start) + 100), count: "5", price: "2499" }])}><Plus /> Add room type</Button>
                  </div>
                  <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft /> Back</Button><Button variant="neon" size="lg" onClick={next2}>Review <ArrowRight /></Button></div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-6">
                  <Head t="Everything look right?" s="You can change all of this later in Hotel Settings." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Sum t="Business" rows={[["Name", a.business], ["Manager", manager], ["Mobile", a.mobile], ["State", a.state], ["PIN", a.pincode]]} />
                    <Sum t="Tax" rows={[["GSTIN", a.gst || "—"], ["CGST", a.cgst + "%"], ["SGST", a.sgst + "%"], ["UPI", a.upi || "—"]]} />
                    <Sum t="Branch" rows={[["Name", b.branch], ["City", b.city], ["Phone", b.phone || "—"]]} />
                    <Sum t="Rooms" rows={rooms.map((r) => [`${r.type} × ${r.count}`, `#${r.start}+ · ${inr(+r.price)}`] as [string, string])} />
                  </div>
                  <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft /> Back</Button>
                    <Button variant="neon" size="lg" disabled={busy} onClick={finish}>{busy ? <Loader2 className="animate-spin" /> : <Check />} Launch my hotel</Button></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Head({ t, s }: { t: string; s: string }) {
  return <div><h1 className="text-2xl font-bold md:text-3xl">{t}</h1><p className="mt-1 text-sm text-muted-foreground">{s}</p></div>;
}
function F({ l, v, on, ph, type = "text" }: { l: string; v: string; on: (v: string) => void; ph?: string; type?: string }) {
  return <div className="space-y-1.5"><Label>{l}</Label><Input type={type} value={v} placeholder={ph} onChange={(e) => on(e.target.value)} /></div>;
}
function Sum({ t, rows }: { t: string; rows: [string, string][] }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t}</div>
      {rows.map(([k, v]) => <div key={k} className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>)}
    </div>
  );
}

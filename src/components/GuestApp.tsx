import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Compass, Utensils, BellRing, BedDouble, Star, MapPin, Phone, Wifi, Leaf, Sparkles, ScanLine,
  Wrench, ShowerHead, Tv, ArrowLeft, LogOut, ShoppingBag, CheckCircle2, Minus, Plus, CalendarDays, Users, Loader2, Drumstick, PartyPopper,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/me";
import { useMenuImage } from "@/lib/menu-image";
import { GUEST_FOOD_LABEL } from "@/lib/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { GuestAuthSheet, useGuestUser } from "@/components/GuestAuthSheet";
import { CodeScanner } from "@/components/CodeScanner";
import { ScratchCard } from "@/components/ScratchCard";
import food from "@/assets/gen-vegthali.jpg";
import nonveg from "@/assets/gen-nonveg.jpg";
import exterior from "@/assets/gen-exterior.jpg";
import spa from "@/assets/gen-spa.jpg";
import suite from "@/assets/gen-suite.jpg";
import standard from "@/assets/gen-standard.jpg";
import deluxe from "@/assets/stayos-deluxe-2026.jpg";
import delivery from "@/assets/gen-delivery.jpg";

type Dish = { id: string; name: string; category: string; price: number; veg: boolean; image_url?: string | null; description?: string | null };
type Pub = {
  id: string; name: string; city: string | null; address: string | null; phone: string | null; room: string | null;
  room_types: { type: string; price: number; count: number }[];
  menu: Dish[]; offers: { title: string; code: string; pct: number }[]; rating: number | null; reviews: number;
};
type Ctx = {
  linked: boolean; room: string; booking_code?: string; check_in?: string; nights?: number; wifi_name?: string; wifi_password?: string;
  room_total?: number; food_total?: number; orders?: { order_no: string; status: string; total: number; created_at: string }[];
};
type Tab = "explore" | "food" | "service" | "stay";
const STEPS = ["placed", "accepted", "preparing", "out_for_delivery", "delivered"];
export const roomPhoto = (t: string) => (/suite/i.test(t) ? suite : /deluxe/i.test(t) ? deluxe : standard);

export function GuestApp({ hotelId, token }: { hotelId?: string; token?: string }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const uid = useGuestUser();
  const [tab, setTab] = useState<Tab>(token ? "food" : "explore");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [dish, setDish] = useState<Dish | null>(null);
  const [auth, setAuth] = useState<{ reason: string; then: () => void } | null>(null);
  const [scan, setScan] = useState(false);
  const [reserve, setReserve] = useState(false);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: pub, isLoading } = useQuery({
    queryKey: ["pub-hotel", hotelId, token],
    queryFn: async () => (await supabase.rpc("public_hotel", { _hotel: hotelId, _token: token })).data as unknown as Pub | null,
  });
  const { data: ctx, refetch } = useQuery({
    queryKey: ["guest-ctx", token, uid],
    enabled: !!token && uid !== undefined,
    queryFn: async () => (await supabase.rpc("guest_room_context", { _token: token! })).data as unknown as Ctx | null,
  });

  // Scan & Join: once signed in on a room link, join the active stay automatically.
  useEffect(() => {
    if (!token || !uid || !ctx || ctx.linked) return;
    supabase.rpc("guest_auto_link", { _token: token }).then(({ data }) => { if (data) { toast.success("You've joined the room 🎉"); refetch(); } });
  }, [token, uid, ctx, refetch]);

  // Live order status for this guest.
  useEffect(() => {
    if (!uid || !token) return;
    const ch = supabase.channel("guest-orders-" + uid).on("postgres_changes", { event: "UPDATE", schema: "public", table: "food_orders", filter: `guest_user=eq.${uid}` }, (p) => {
      const s = (p.new as { status: string; order_no: string });
      toast(`Order ${s.order_no}: ${GUEST_FOOD_LABEL[s.status] ?? s.status}`);
      refetch();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, token, refetch]);

  const total = useMemo(() => Object.entries(cart).reduce((s, [id, q]) => s + (pub?.menu.find((m) => m.id === id)?.price ?? 0) * q, 0), [cart, pub]);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const setQty = (id: string, q: number) => setCart((c) => { const n = { ...c }; if (q > 0) n[id] = q; else delete n[id]; return n; });

  const guard = (reason: string, fn: () => void) => {
    if (!token) { setScan(true); return; }
    if (!uid) { setAuth({ reason, then: fn }); return; }
    if (!ctx?.linked) { setTab("stay"); toast.info("Enter your booking code to join your room."); return; }
    fn();
  };
  const onScan = (raw: string) => {
    const t = raw.match(/\/stay\/r\/([^/?#]+)/)?.[1] ?? (/^[a-z0-9-]{8,}$/i.test(raw) ? raw : null);
    if (!t) return toast.error("That isn't a room QR code");
    nav({ to: "/stay/r/$token", params: { token: t } });
  };

  const placeOrder = () => guard("place your order", async () => {
    setBusy(true);
    const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
    const { data, error } = await supabase.rpc("guest_place_order", { _token: token!, _items: items, _note: note });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Order ${data} placed! The kitchen has been notified.`);
    setCart({}); setNote(""); setCartOpen(false); refetch(); setTab("stay");
  });
  const request = (kind: string) => guard("send a request", async () => {
    const { error } = await supabase.rpc("guest_request", { _token: token!, _kind: kind, _note: note });
    if (error) return toast.error(error.message);
    toast.success("Request sent — staff and manager notified."); setNote("");
  });
  const link = async () => {
    const { error } = await supabase.rpc("guest_link_stay", { _token: token!, _booking_code: code });
    if (error) return toast.error(error.message);
    toast.success("Joined your room. Enjoy!"); qc.invalidateQueries({ queryKey: ["guest-ctx"] });
  };
  const review = (r: number) => guard("leave a review", async () => {
    const { error } = await supabase.rpc("guest_review", { _token: token!, _rating: r, _comment: note });
    if (error) return toast.error(error.message);
    toast.success("Thank you for your feedback!"); setNote("");
  });

  if (isLoading) return <div className="mx-auto max-w-md space-y-4 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted" />)}</div>;
  if (!pub) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><p className="text-lg font-semibold">This hotel or room code isn't available.</p><Link to="/stay" className="text-primary">Explore hotels</Link></div></div>;

  const vegItems = pub.menu.filter((m) => m.veg);
  const nonVegItems = pub.menu.filter((m) => !m.veg);
  const pureVeg = pub.menu.length > 0 && nonVegItems.length === 0;
  const minPrice = Math.min(...pub.room_types.map((r) => Number(r.price)));
  const tabs: { id: Tab; label: string; icon: typeof Compass }[] = [
    { id: "explore", label: "Explore", icon: Compass }, { id: "food", label: "Food", icon: Utensils },
    { id: "service", label: "Service", icon: BellRing }, { id: "stay", label: "My Stay", icon: BedDouble },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-32">
      <div className="relative h-64 overflow-hidden rounded-b-[2.5rem]">
        <motion.img key={tab} initial={{ scale: 1.1, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }}
          src={tab === "food" ? (pureVeg ? food : nonveg) : tab === "service" ? delivery : exterior} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link to="/stay" className="grid size-10 place-items-center rounded-full bg-background/80 backdrop-blur" aria-label="Back"><ArrowLeft className="size-4" /></Link>
          <div className="flex gap-2">
            {!token && <button onClick={() => setScan(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow"><ScanLine className="size-3.5" />Scan & Join</button>}
            {uid ? <button onClick={() => supabase.auth.signOut()} className="grid size-9 place-items-center rounded-full bg-background/80 backdrop-blur" aria-label="Sign out"><LogOut className="size-3.5" /></button>
              : <button onClick={() => setAuth({ reason: "use in-room services", then: () => {} })} className="rounded-full bg-background/80 px-3 py-2 text-xs font-semibold backdrop-blur">Sign in</button>}
          </div>
        </div>
        <div className="absolute bottom-0 p-5 text-background">
          {pub.room && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Room {pub.room}</span>}
          <motion.h1 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-1 text-3xl font-bold">{pub.name}</motion.h1>
          <div className="flex items-center gap-3 text-sm opacity-90"><span className="flex items-center gap-1"><MapPin className="size-3" />{pub.city}</span>{pub.rating && <span className="flex items-center gap-1"><Star className="size-3 fill-current" />{pub.rating} ({pub.reviews})</span>}</div>
        </div>
      </div>

      {!token && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScan(true)} className="mx-4 -mt-6 relative z-10 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-[var(--shadow-soft)]">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><ScanLine className="size-5" /></span>
          <div className="flex-1"><div className="text-sm font-semibold">Staying here? Scan & Join your room</div><div className="text-xs text-muted-foreground">Open camera to scan the QR in your room</div></div>
        </motion.button>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-5 p-4">
          {tab === "explore" && (<>
            {!!pub.offers.length && (<div>
              <h2 className="mb-2 font-semibold">Scratch & save</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">{pub.offers.map((o) => <ScratchCard key={o.code} title={o.title} code={o.code} pct={Number(o.pct)} />)}</div>
            </div>)}
            <div className="flex items-end justify-between"><h2 className="font-semibold">Rooms & prices</h2>{isFinite(minPrice) && <span className="text-xs text-muted-foreground">from {inr(minPrice)}/night</span>}</div>
            <div className="space-y-3">
              {pub.room_types.map((r, i) => (
                <motion.div key={r.type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="overflow-hidden rounded-3xl border bg-card shadow-card">
                  <img src={roomPhoto(r.type)} alt={r.type} loading="lazy" width={1280} height={896} className="h-36 w-full object-cover" />
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex-1"><div className="font-semibold capitalize">{r.type}</div><div className="text-xs text-muted-foreground">{r.count} rooms · Wi-Fi · AC · TV</div></div>
                    <div className="text-right"><b className="text-lg">{inr(Number(r.price))}</b><div className="text-[11px] text-muted-foreground">per night</div></div>
                  </div>
                </motion.div>
              ))}
            </div>
            <Button size="lg" className="w-full rounded-2xl" onClick={() => setReserve(true)}><CalendarDays /> Reserve a room</Button>
            <div className="grid grid-cols-2 gap-3">
              {[[spa, "Spa & pool"], [food, "In-room dining"]].map(([src, t]) => (
                <div key={t} className="relative h-32 overflow-hidden rounded-2xl"><img src={src} alt={t} loading="lazy" width={1280} height={896} className="size-full object-cover" /><span className="absolute bottom-2 left-2 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium">{t}</span></div>
              ))}
            </div>
            <div className="rounded-3xl border bg-card p-4 text-sm">
              <div className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{pub.address ?? pub.city}</div>
              {pub.phone && <a href={`tel:${pub.phone}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-success/10 py-2.5 font-semibold text-success"><Phone className="size-4" />Call hotel</a>}
            </div>
          </>)}

          {tab === "food" && (<>
            {pureVeg && (
              <div className="flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-3">
                <span className="grid size-10 place-items-center rounded-xl bg-success text-primary-foreground"><Leaf className="size-5" /></span>
                <div><div className="font-semibold text-success">100% Pure Veg kitchen</div><div className="text-xs text-muted-foreground">Every dish here is vegetarian.</div></div>
              </div>
            )}
            {!pub.menu.length && <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">The food menu will appear here soon.</p>}
            {[["Veg", vegItems, Leaf, "text-success"], ["Non-veg", nonVegItems, Drumstick, "text-destructive"]].map(([label, items, I, color]) => {
              const list = items as Dish[]; const Icon = I as typeof Leaf;
              if (!list.length) return null;
              return (
                <section key={label as string}>
                  <h3 className={`mb-2 flex items-center gap-2 font-semibold ${color}`}><Icon className="size-4" />{label as string} <span className="text-xs text-muted-foreground">({list.length})</span></h3>
                  <div className="grid grid-cols-2 gap-3">{list.map((m) => <DishCard key={m.id} d={m} qty={cart[m.id] ?? 0} onQty={(q) => setQty(m.id, q)} onOpen={() => setDish(m)} />)}</div>
                </section>
              );
            })}
          </>)}

          {tab === "service" && (<>
            <h2 className="text-lg font-semibold">How can we help?</h2>
            <div className="grid grid-cols-2 gap-3">
              {[["cleaning", "Clean my room", Sparkles], ["towels", "Fresh towels", ShowerHead], ["AC", "AC problem", Wrench], ["Wi-Fi", "Wi-Fi issue", Wifi], ["TV", "TV not working", Tv], ["Plumbing", "Washroom issue", ShowerHead]].map(([k, l, I], i) => {
                const Icon = I as typeof Sparkles;
                return (
                  <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.94 }} key={k as string} onClick={() => request(k as string)} className="rounded-2xl border bg-card p-4 text-left shadow-card">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><div className="mt-2 text-sm font-medium">{l as string}</div>
                  </motion.button>
                );
              })}
            </div>
            <Textarea placeholder="Add a note for staff (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            {pub.phone && <a href={`tel:${pub.phone}`} className="flex items-center justify-center gap-2 rounded-2xl border bg-card py-3 font-semibold"><Phone className="size-4 text-primary" />Call reception</a>}
            <div className="rounded-2xl border bg-card p-4">
              <div className="text-sm font-semibold">Rate your stay</div>
              <div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((r) => <button key={r} onClick={() => review(r)} aria-label={`${r} stars`}><Star className="size-7 text-warning hover:fill-current" /></button>)}</div>
            </div>
          </>)}

          {tab === "stay" && (<>
            {!token && <div className="rounded-3xl border bg-card p-6 text-center"><ScanLine className="mx-auto size-8 text-primary" /><p className="mt-2 text-sm text-muted-foreground">Scan the QR code in your room to see your stay, orders and bill.</p><Button className="mt-3" onClick={() => setScan(true)}><ScanLine /> Open camera</Button></div>}
            {token && !uid && <div className="rounded-3xl border bg-card p-6 text-center"><p className="text-sm text-muted-foreground">Sign in to join your room.</p><Button className="mt-3" onClick={() => setAuth({ reason: "join your room", then: () => {} })}>Sign in</Button></div>}
            {token && uid && ctx && !ctx.linked && (
              <div className="rounded-3xl border bg-card p-5">
                <div className="font-semibold">Join your room</div>
                <p className="text-sm text-muted-foreground">Enter the booking code from your check-in slip.</p>
                <div className="mt-3 flex gap-2"><Input placeholder="BK-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} /><Button onClick={link}>Join</Button></div>
              </div>
            )}
            {ctx?.linked && (<>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
                <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary-foreground/10" />
                <div className="text-xs opacity-80">Booking {ctx.booking_code}</div>
                <div className="mt-1 text-3xl font-bold">Room {ctx.room}</div>
                <div className="text-sm opacity-90">{ctx.nights} night(s) · checked in {ctx.check_in ? new Date(ctx.check_in).toLocaleDateString() : ""}</div>
                {ctx.wifi_name && <div className="mt-3 flex items-center gap-2 rounded-xl bg-background/20 px-3 py-2 text-sm"><Wifi className="size-4" />{ctx.wifi_name} · <b>{ctx.wifi_password}</b></div>}
              </div>
              <h3 className="font-semibold">Live orders</h3>
              {!ctx.orders?.length && <p className="text-sm text-muted-foreground">No orders yet.</p>}
              {ctx.orders?.map((o) => {
                const i = Math.max(0, STEPS.indexOf(o.status === "ready" ? "preparing" : o.status));
                return (
                  <div key={o.order_no} className="rounded-2xl border bg-card p-4">
                    <div className="flex justify-between text-sm"><b>{o.order_no}</b><span>{inr(o.total)}</span></div>
                    <div className="mt-1 text-xs font-medium text-primary">{GUEST_FOOD_LABEL[o.status] ?? o.status}</div>
                    <div className="mt-3 flex gap-1">{STEPS.map((s, j) => <motion.span key={s} initial={false} animate={{ opacity: j <= i ? 1 : 0.3 }} className={`h-2 flex-1 rounded-full ${j <= i ? "bg-success" : "bg-muted"}`} />)}</div>
                  </div>
                );
              })}
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-2 font-semibold">Running bill</div>
                <div className="flex justify-between text-sm"><span>Room</span><span>{inr(ctx.room_total ?? 0)}</span></div>
                <div className="flex justify-between text-sm"><span>Food</span><span>{inr(ctx.food_total ?? 0)}</span></div>
                <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Before tax</span><span>{inr((ctx.room_total ?? 0) + (ctx.food_total ?? 0))}</span></div>
                <div className="mt-3 flex justify-center"><QRCodeSVG value={ctx.booking_code ?? ""} size={96} /></div>
                <p className="text-center text-xs text-muted-foreground">Show at the front desk for fast check-out</p>
              </div>
            </>)}
          </>)}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {count > 0 && tab === "food" && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
            <Button size="lg" className="h-14 w-full justify-between rounded-2xl shadow-lg" onClick={() => setCartOpen(true)}><span className="flex items-center gap-2"><ShoppingBag />{count} item(s)</span><span>View cart · {inr(total)}</span></Button>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md justify-around rounded-2xl border bg-card/95 px-2 py-1.5 shadow-[var(--shadow-soft)] backdrop-blur">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium ${tab === t.id ? "text-primary" : "text-muted-foreground"}`}>
            {tab === t.id && <motion.span layoutId="gtab" className="absolute inset-0 rounded-xl bg-primary/10" />}
            <t.icon className="relative size-5" /><span className="relative">{t.label}</span>
          </button>
        ))}
      </nav>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[85vh] max-w-md overflow-y-auto rounded-t-3xl">
          <SheetHeader><SheetTitle>Your order</SheetTitle><SheetDescription>{pub.room ? `Delivered to Room ${pub.room}` : "Scan your room QR to order"}</SheetDescription></SheetHeader>
          <div className="space-y-3 p-4">
            {Object.entries(cart).map(([id, q]) => { const m = pub.menu.find((x) => x.id === id); if (!m) return null; return (
              <div key={id} className="flex items-center gap-3 rounded-2xl border p-3">
                <VegDot veg={m.veg} /><div className="flex-1"><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{inr(m.price)}</div></div>
                <Stepper q={q} onQ={(n) => setQty(id, n)} /><b className="w-16 text-right text-sm">{inr(m.price * q)}</b>
              </div>); })}
            <Textarea placeholder="Cooking note (less spicy, no onion…)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            <div className="flex justify-between font-semibold"><span>Total</span><span>{inr(total)}</span></div>
            <Button size="lg" className="h-14 w-full rounded-2xl" disabled={busy || !count} onClick={placeOrder}>{busy && <Loader2 className="animate-spin" />}Place order · {inr(total)}</Button>
          </div>
        </SheetContent>
      </Sheet>
      <DishSheet d={dish} qty={dish ? cart[dish.id] ?? 0 : 0} onQty={(q) => dish && setQty(dish.id, q)} onClose={() => setDish(null)} />
      <ReserveSheet open={reserve} onOpenChange={setReserve} hotelId={pub.id} hotelName={pub.name} uid={uid} askAuth={(then) => setAuth({ reason: "reserve your room", then })} />
      <CodeScanner open={scan} onOpenChange={setScan} onResult={onScan} title="Scan & Join" hint="Scan the QR code in your room" />
      <GuestAuthSheet open={!!auth} onOpenChange={(o) => !o && setAuth(null)} reason={auth?.reason ?? ""} onDone={() => { const f = auth?.then; setAuth(null); setTimeout(() => f?.(), 400); }} />
    </div>
  );
}

function VegDot({ veg }: { veg: boolean }) {
  return <span className={`grid size-4 shrink-0 place-items-center rounded-sm border-2 ${veg ? "border-success" : "border-destructive"}`}><span className={`size-1.5 rounded-full ${veg ? "bg-success" : "bg-destructive"}`} /></span>;
}
function Stepper({ q, onQ }: { q: number; onQ: (n: number) => void }) {
  if (!q) return <Button size="sm" variant="outline" className="h-8 rounded-xl border-primary text-primary" onClick={(e) => { e.stopPropagation(); onQ(1); }}>ADD</Button>;
  return (
    <div className="flex h-8 items-center rounded-xl bg-primary text-primary-foreground" onClick={(e) => e.stopPropagation()}>
      <button className="px-2" onClick={() => onQ(q - 1)} aria-label="Less"><Minus className="size-3.5" /></button>
      <motion.span key={q} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="w-5 text-center text-sm font-bold">{q}</motion.span>
      <button className="px-2" onClick={() => onQ(Math.min(20, q + 1))} aria-label="More"><Plus className="size-3.5" /></button>
    </div>
  );
}
function DishCard({ d, qty, onQty, onOpen }: { d: Dish; qty: number; onQty: (q: number) => void; onOpen: () => void }) {
  const img = useMenuImage(d.image_url);
  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onOpen} className="cursor-pointer overflow-hidden rounded-3xl border bg-card shadow-card">
      <div className="relative h-28"><img src={img ?? (d.veg ? food : nonveg)} alt={d.name} loading="lazy" className="size-full object-cover" /><span className="absolute left-2 top-2 rounded-md bg-card p-0.5"><VegDot veg={d.veg} /></span></div>
      <div className="p-3">
        <div className="line-clamp-1 text-sm font-semibold">{d.name}</div>
        <div className="line-clamp-1 text-[11px] text-muted-foreground">{d.description || d.category}</div>
        <div className="mt-2 flex items-center justify-between"><b className="text-sm">{inr(d.price)}</b><Stepper q={qty} onQ={onQty} /></div>
      </div>
    </motion.div>
  );
}
function DishSheet({ d, qty, onQty, onClose }: { d: Dish | null; qty: number; onQty: (q: number) => void; onClose: () => void }) {
  const img = useMenuImage(d?.image_url);
  return (
    <Sheet open={!!d} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-md overflow-hidden rounded-t-3xl p-0">
        {d && (<>
          <img src={img ?? (d.veg ? food : nonveg)} alt={d.name} className="h-56 w-full object-cover" />
          <div className="space-y-3 p-5">
            <SheetHeader className="p-0 text-left"><SheetTitle className="flex items-center gap-2"><VegDot veg={d.veg} />{d.name}</SheetTitle><SheetDescription>{d.category} · {d.veg ? "Vegetarian" : "Non-vegetarian"}</SheetDescription></SheetHeader>
            <p className="text-sm text-muted-foreground">{d.description || "Freshly prepared in our kitchen and delivered hot to your room."}</p>
            <div className="flex items-center justify-between"><b className="text-2xl">{inr(d.price)}</b><Stepper q={qty} onQ={onQty} /></div>
            <Button className="w-full" size="lg" onClick={() => { if (!qty) onQty(1); onClose(); }}>{qty ? "Done" : "Add to order"}</Button>
          </div>
        </>)}
      </SheetContent>
    </Sheet>
  );
}

export function ReserveSheet({ open, onOpenChange, hotelId, hotelName, uid, askAuth }: { open: boolean; onOpenChange: (o: boolean) => void; hotelId: string; hotelName: string; uid: string | null | undefined; askAuth: (then: () => void) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(2);
  const [room, setRoom] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { booking_code: string; room: string; room_type: string; nights: number; discount_pct: number; total: number }>(null);
  const { data: rooms, isLoading } = useQuery({
    queryKey: ["avail", hotelId, open], enabled: open,
    queryFn: async () => (await supabase.rpc("public_available_rooms", { _hotel: hotelId })).data ?? [],
  });
  const fit = (rooms ?? []).filter((r) => r.capacity >= adults);
  const submit = async () => {
    if (!uid) return askAuth(submit);
    if (!room) return toast.error("Pick a room");
    setBusy(true);
    const { data, error } = await supabase.rpc("guest_reserve", { _room: room, _check_in: date, _nights: nights, _name: name, _mobile: mobile, _adults: adults });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(data as never);
  };
  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setDone(null); setRoom(null); } }}>
      <SheetContent side="bottom" className="mx-auto max-h-[92vh] max-w-md overflow-y-auto rounded-t-3xl">
        {done ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4 p-4 text-center">
            <PartyPopper className="mx-auto size-12 text-primary" />
            <h2 className="text-2xl font-bold">Booking confirmed!</h2>
            <p className="text-sm text-muted-foreground">{hotelName} · Room {done.room} ({done.room_type})</p>
            <div className="rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-5">
              <div className="text-xs text-muted-foreground">Your booking code</div>
              <div className="font-mono text-3xl font-extrabold tracking-wider text-primary">{done.booking_code}</div>
              <div className="mt-3 flex justify-center"><QRCodeSVG value={done.booking_code} size={110} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl bg-secondary p-2"><div className="text-xs text-muted-foreground">Check-in</div><b>{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</b></div>
              <div className="rounded-xl bg-secondary p-2"><div className="text-xs text-muted-foreground">Nights</div><b>{done.nights}</b></div>
              <div className="rounded-xl bg-secondary p-2"><div className="text-xs text-muted-foreground">Total</div><b>{inr(done.total)}</b></div>
            </div>
            {done.discount_pct > 0 && <p className="text-sm text-success">You saved {done.discount_pct}% 🎉</p>}
            <p className="text-xs text-muted-foreground">Pay at the hotel. Show this code at check-in.</p>
            <Button className="w-full" onClick={() => onOpenChange(false)}><CheckCircle2 /> Done</Button>
          </motion.div>
        ) : (<>
          <SheetHeader><SheetTitle>Reserve at {hotelName}</SheetTitle><SheetDescription>Pick dates and a free room. Pay at the hotel.</SheetDescription></SheetHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-3 space-y-1 text-xs font-medium">Check-in<Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label className="space-y-1 text-xs font-medium">Nights<Input type="number" min={1} max={30} value={nights} onChange={(e) => setNights(Math.max(1, Math.min(30, +e.target.value || 1)))} /></label>
              <label className="col-span-2 space-y-1 text-xs font-medium"><span className="flex items-center gap-1"><Users className="size-3" />Guests</span>
                <div className="flex gap-1">{[1, 2, 3, 4].map((n) => <button key={n} onClick={() => setAdults(n)} className={`h-9 flex-1 rounded-lg border text-sm ${adults === n ? "border-primary bg-primary text-primary-foreground" : ""}`}>{n}</button>)}</div></label>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Available rooms</div>
              {isLoading && <Loader2 className="mx-auto animate-spin" />}
              {!isLoading && !fit.length && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">No free rooms for {adults} guest(s) right now.</p>}
              <div className="grid grid-cols-2 gap-2">
                {fit.map((r) => (
                  <button key={r.id} onClick={() => setRoom(r.id)} className={`overflow-hidden rounded-2xl border text-left transition ${room === r.id ? "border-primary ring-2 ring-primary/30" : ""}`}>
                    <img src={roomPhoto(r.room_type)} alt="" className="h-16 w-full object-cover" />
                    <div className="p-2"><div className="text-sm font-semibold">Room {r.number}</div><div className="text-[11px] capitalize text-muted-foreground">{r.room_type} · {r.capacity} guests</div><b className="text-sm">{inr(Number(r.price))}</b><span className="text-[10px] text-muted-foreground">/night</span></div>
                  </button>
                ))}
              </div>
            </div>
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            <Input placeholder="10-digit mobile" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} />
            <p className="text-xs text-muted-foreground">First stay? Get 10% off. Couples get 20% off automatically.</p>
            <Button size="lg" className="h-12 w-full rounded-2xl" disabled={busy} onClick={submit}>{busy && <Loader2 className="animate-spin" />}{uid ? "Confirm reservation" : "Sign in & reserve"}</Button>
          </div>
        </>)}
      </SheetContent>
    </Sheet>
  );
}

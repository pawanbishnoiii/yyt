import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Compass, Utensils, BellRing, BedDouble, Star, MapPin, Phone, Wifi, Minus, Plus, Leaf, Sparkles,
  Wrench, ShowerHead, Tv, ArrowLeft, Tag, LogOut, Receipt, ChefHat, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { OrderItemCard } from "@/components/ui/item-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GuestAuthSheet, useGuestUser } from "@/components/GuestAuthSheet";
import room from "@/assets/photo-room.jpg";
import food from "@/assets/stayos-food-2026.jpg";
import rooftop from "@/assets/stayos-rooftop-2026.jpg";
import reception from "@/assets/stayos-lobby-2026.jpg";
import deluxe from "@/assets/stayos-deluxe-2026.jpg";

type Pub = {
  id: string; name: string; city: string | null; address: string | null; phone: string | null; room: string | null;
  room_types: { type: string; price: number; count: number }[];
  menu: { id: string; name: string; category: string; price: number; veg: boolean; image_url?: string | null; description?: string | null }[];
  offers: { title: string; code: string; pct: number }[];
  rating: number | null; reviews: number;
};
type Ctx = {
  linked: boolean; room: string; booking_code?: string; check_in?: string; nights?: number; wifi_name?: string; wifi_password?: string;
  room_total?: number; food_total?: number; orders?: { order_no: string; status: string; total: number; created_at: string }[];
};
type Tab = "explore" | "menu" | "requests" | "stay";

const steps = ["placed", "preparing", "delivered"];

export function GuestApp({ hotelId, token }: { hotelId?: string; token?: string }) {
  const qc = useQueryClient();
  const uid = useGuestUser();
  const [tab, setTab] = useState<Tab>("explore");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [veg, setVeg] = useState(false);
  const [auth, setAuth] = useState<{ reason: string; then: () => void } | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");

  const { data: pub, isLoading } = useQuery({
    queryKey: ["pub-hotel", hotelId, token],
    queryFn: async () => (await supabase.rpc("public_hotel", { _hotel: hotelId, _token: token })).data as unknown as Pub | null,
  });
  const { data: ctx, refetch } = useQuery({
    queryKey: ["guest-ctx", token, uid],
    enabled: !!token && uid !== undefined,
    refetchInterval: 15000,
    queryFn: async () => (await supabase.rpc("guest_room_context", { _token: token! })).data as unknown as Ctx | null,
  });

  const total = useMemo(() => Object.entries(cart).reduce((s, [id, q]) => s + (pub?.menu.find((m) => m.id === id)?.price ?? 0) * q, 0), [cart, pub]);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  /** Run an action, asking for login (and stay link) only when needed. */
  const guard = (reason: string, fn: () => void) => {
    if (!token) { toast.info("Scan the QR code in your room to use in-room services."); return; }
    if (!uid) { setAuth({ reason, then: fn }); return; }
    if (!ctx?.linked) { setTab("stay"); toast.info("Enter your booking code once to link your stay."); return; }
    fn();
  };

  const placeOrder = () => guard("place your order", async () => {
    const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
    const { data, error } = await supabase.rpc("guest_place_order", { _token: token!, _items: items, _note: note });
    if (error) return toast.error(error.message);
    toast.success(`Order ${data} placed! The kitchen is on it.`);
    setCart({}); setNote(""); refetch(); setTab("stay");
  });
  const request = (kind: string) => guard("send a request", async () => {
    const { error } = await supabase.rpc("guest_request", { _token: token!, _kind: kind, _note: note });
    if (error) return toast.error(error.message);
    toast.success("Request sent — staff have been notified."); setNote("");
  });
  const link = async () => {
    const { error } = await supabase.rpc("guest_link_stay", { _token: token!, _booking_code: code });
    if (error) return toast.error(error.message);
    toast.success("Stay linked. Enjoy!"); qc.invalidateQueries({ queryKey: ["guest-ctx"] });
  };
  const review = (r: number) => guard("leave a review", async () => {
    const { error } = await supabase.rpc("guest_review", { _token: token!, _rating: r, _comment: note });
    if (error) return toast.error(error.message);
    toast.success("Thank you for your feedback!"); setNote("");
  });

  if (isLoading) return <div className="mx-auto max-w-md space-y-4 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted" />)}</div>;
  if (!pub) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><p className="text-lg font-semibold">This hotel or room code isn't available.</p><Link to="/stay" className="text-primary">Explore hotels</Link></div></div>;

  const cats = [...new Set(pub.menu.map((m) => m.category))];
  const tabs: { id: Tab; label: string; icon: typeof Compass }[] = [
    { id: "explore", label: "Explore", icon: Compass }, { id: "menu", label: "Menu", icon: Utensils },
    { id: "requests", label: "Requests", icon: BellRing }, { id: "stay", label: "My Stay", icon: BedDouble },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-28">
      <div className="relative h-56 overflow-hidden rounded-b-[2rem]">
        <img src={tab === "menu" ? food : room} alt="" width={1280} height={896} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link to="/stay" className="grid size-9 place-items-center rounded-full bg-background/80 backdrop-blur" aria-label="Back"><ArrowLeft className="size-4" /></Link>
          {uid ? <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-xs backdrop-blur"><LogOut className="size-3" />Sign out</button>
            : <button onClick={() => setAuth({ reason: "use in-room services", then: () => {} })} className="rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium backdrop-blur">Sign in</button>}
        </div>
        <div className="absolute bottom-0 p-5 text-background">
          {pub.room && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Room {pub.room}</span>}
          <h1 className="mt-1 text-2xl font-bold">{pub.name}</h1>
          <div className="flex items-center gap-3 text-sm opacity-90"><span className="flex items-center gap-1"><MapPin className="size-3" />{pub.city}</span>{pub.rating && <span className="flex items-center gap-1"><Star className="size-3 fill-current" />{pub.rating} ({pub.reviews})</span>}</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }} className="space-y-4 p-4">
          {tab === "explore" && (<>
            {!!pub.offers.length && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {pub.offers.map((o) => (
                  <div key={o.code} className="min-w-56 rounded-2xl bg-gradient-to-br from-primary to-accent p-4 text-primary-foreground">
                    <Tag className="size-4" /><div className="mt-2 font-semibold">{o.title}</div><div className="text-sm opacity-90">{o.pct}% off · code <b>{o.code}</b></div>
                  </div>
                ))}
              </div>
            )}
            <h2 className="font-semibold">Rooms</h2>
            {pub.room_types.map((r) => (
              <div key={r.type} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-card">
                <img src={deluxe} alt="" loading="lazy" width={1600} height={1008} className="size-16 rounded-xl object-cover" />
                <div className="flex-1"><div className="font-medium capitalize">{r.type}</div><div className="text-xs text-muted-foreground">{r.count} rooms</div></div>
                <div className="text-right"><b>{inr(r.price)}</b><div className="text-xs text-muted-foreground">/night</div></div>
              </div>
            ))}
            <h2 className="font-semibold">Around the hotel</h2>
            <div className="grid grid-cols-2 gap-3">
              {[[rooftop, "Rooftop pool"], [reception, "24×7 front desk"]].map(([src, t]) => (
                <div key={t} className="relative h-32 overflow-hidden rounded-2xl"><img src={src} alt={t} loading="lazy" width={1280} height={896} className="size-full object-cover" /><span className="absolute bottom-2 left-2 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium">{t}</span></div>
              ))}
            </div>
            <div className="rounded-2xl border bg-card p-4 text-sm">
              <div className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{pub.address ?? pub.city}</div>
              {pub.phone && <a href={`tel:${pub.phone}`} className="mt-2 flex items-center gap-2"><Phone className="size-4 text-primary" />{pub.phone}</a>}
            </div>
          </>)}

          {tab === "menu" && (<>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Room dining</h2>
              <button onClick={() => setVeg(!veg)} className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${veg ? "border-success bg-success/15 text-success" : ""}`}><Leaf className="size-3" />Veg only</button></div>
            {!pub.menu.length && <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">The menu will appear here soon.</p>}
            {cats.map((c) => (
              <div key={c}><h3 className="mb-2 text-sm font-semibold text-muted-foreground">{c}</h3>
                <div className="space-y-2">{pub.menu.filter((m) => m.category === c && (!veg || m.veg)).map((m) => <GuestMenuItem key={m.id} item={m} quantity={cart[m.id] ?? 0} onChange={q=>setCart(c2=>{const n={...c2};if(q)n[m.id]=q;else delete n[m.id];return n;})}/>)}</div>
              </div>
            ))}
            {count > 0 && <Textarea placeholder="Cooking note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />}
          </>)}

          {tab === "requests" && (<>
            <h2 className="text-lg font-semibold">How can we help?</h2>
            <div className="grid grid-cols-2 gap-3">
              {[["cleaning", "Clean my room", Sparkles], ["towels", "Fresh towels", ShowerHead], ["AC", "AC problem", Wrench], ["Wi-Fi", "Wi-Fi issue", Wifi], ["TV", "TV not working", Tv], ["Plumbing", "Washroom issue", ShowerHead]].map(([k, l, I]) => {
                const Icon = I as typeof Sparkles;
                return (
                  <motion.button whileTap={{ scale: 0.95 }} key={k as string} onClick={() => request(k as string)} className="rounded-2xl border bg-card p-4 text-left shadow-card">
                    <Icon className="size-5 text-primary" /><div className="mt-2 text-sm font-medium">{l as string}</div>
                  </motion.button>
                );
              })}
            </div>
            <Textarea placeholder="Add a note for staff (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            <div className="rounded-2xl border bg-card p-4">
              <div className="text-sm font-semibold">Rate your stay</div>
              <div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((r) => <button key={r} onClick={() => review(r)} aria-label={`${r} stars`}><Star className="size-7 text-warning hover:fill-current" /></button>)}</div>
            </div>
          </>)}

          {tab === "stay" && (<>
            {!token && <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">Scan the QR code in your room to see your stay, orders and bill.</div>}
            {token && !uid && <div className="rounded-2xl border bg-card p-6 text-center"><p className="text-sm text-muted-foreground">Sign in to see your stay and bill.</p><Button className="mt-3" onClick={() => setAuth({ reason: "see your stay", then: () => {} })}>Sign in</Button></div>}
            {token && uid && ctx && !ctx.linked && (
              <div className="rounded-2xl border bg-card p-5">
                <div className="font-semibold">Link your stay</div>
                <p className="text-sm text-muted-foreground">Enter the booking code printed on your check-in slip.</p>
                <div className="mt-3 flex gap-2"><Input placeholder="BK-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} /><Button onClick={link}>Link</Button></div>
              </div>
            )}
            {ctx?.linked && (<>
              <div className="rounded-3xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
                <div className="text-xs opacity-80">Booking {ctx.booking_code}</div>
                <div className="mt-1 text-2xl font-bold">Room {ctx.room}</div>
                <div className="text-sm opacity-90">{ctx.nights} night(s) · checked in {ctx.check_in ? new Date(ctx.check_in).toLocaleDateString() : ""}</div>
                {ctx.wifi_name && <div className="mt-3 flex items-center gap-2 rounded-xl bg-background/20 px-3 py-2 text-sm"><Wifi className="size-4" />{ctx.wifi_name} · <b>{ctx.wifi_password}</b></div>}
              </div>
              <h3 className="font-semibold">Your orders</h3>
              {!ctx.orders?.length && <p className="text-sm text-muted-foreground">No orders yet.</p>}
              {ctx.orders?.map((o) => {
                const i = Math.max(0, steps.indexOf(o.status));
                return (
                  <div key={o.order_no} className="rounded-2xl border bg-card p-4">
                    <div className="flex justify-between text-sm"><b>{o.order_no}</b><span>{inr(o.total)}</span></div>
                    <div className="mt-3 flex items-center gap-1">
                      {steps.map((s, j) => (<div key={s} className="flex flex-1 flex-col items-center gap-1">
                        <div className={`grid size-7 place-items-center rounded-full ${j <= i ? "bg-success text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{j === 0 ? <Receipt className="size-3" /> : j === 1 ? <ChefHat className="size-3" /> : <CheckCircle2 className="size-3" />}</div>
                        <span className="text-[10px] capitalize text-muted-foreground">{s}</span></div>))}
                    </div>
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

      {tab === "menu" && count > 0 && (
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
          <Button size="lg" className="w-full justify-between rounded-2xl shadow-lg" onClick={placeOrder}><span>{count} item(s)</span><span>Place order · {inr(total)}</span></Button>
        </motion.div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md justify-around border-t bg-card/95 px-2 py-2 backdrop-blur">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] ${tab === t.id ? "text-primary" : "text-muted-foreground"}`}>
            <t.icon className="size-5" />{t.label}
            {tab === t.id && <motion.span layoutId="gtab" className="h-1 w-6 rounded-full bg-primary" />}
          </button>
        ))}
      </nav>
      <GuestAuthSheet open={!!auth} onOpenChange={(o) => !o && setAuth(null)} reason={auth?.reason ?? ""} onDone={() => { const f = auth?.then; setAuth(null); setTimeout(() => f?.(), 400); }} />
    </div>
  );
}

function GuestMenuItem({item,quantity,onChange}:{item:Pub["menu"][number];quantity:number;onChange:(q:number)=>void}){
  const {data}=useQuery({queryKey:["guest-menu-image",item.image_url],enabled:!!item.image_url,staleTime:50*60_000,queryFn:async()=>(await supabase.storage.from("menu-images").createSignedUrl(item.image_url!,3600)).data?.signedUrl});
  return <OrderItemCard imageUrl={data??food} title={item.name} details={[item.description||item.category,item.category]} price={item.price} veg={item.veg} quantity={quantity} onQuantityChange={onChange}/>;
}

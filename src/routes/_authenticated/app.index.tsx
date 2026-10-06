import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AirVent, Wifi, ShowerHead, Tv, Wrench, Sparkles, LogOut, Tag, Database, CheckCircle2, ScanLine, ClipboardCheck, UtensilsCrossed } from "lucide-react";
import { formatDistanceToNow, format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { inr, isManager, useHotel, useLive, useMe } from "@/lib/me";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { NoHotel, Panel } from "@/components/NoHotel";
import { FastCheckin } from "@/components/FastCheckin";
import CountUp from "@/components/Count";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/")({ component: Dashboard });

const ISSUE_ICON: Record<string, typeof AirVent> = { AC: AirVent, "Wi-Fi": Wifi, Washroom: ShowerHead, TV: Tv };
const SRC_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-5", "bg-chart-4"];

function Dashboard() {
  const { hotelId } = useHotel();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const mgr = isManager(me);
  useLive(["rooms", "bookings", "service_logs", "room_issues"], [["dash", hotelId ?? ""]]);
  const [roomType, setRoomType] = useState<string>("");
  const [co, setCo] = useState<string | null>(null);
  const [demoDone, setDemoDone] = useState(false);
  const { data: demoFlag } = useQuery({ queryKey: ["demo-flag", hotelId], enabled: !!hotelId, queryFn: async () => (await supabase.from("hotels").select("demo_loaded").eq("id", hotelId!).maybeSingle()).data?.demo_loaded ?? false });

  const { data, isLoading } = useQuery({
    queryKey: ["dash", hotelId ?? ""],
    enabled: !!hotelId,
    queryFn: async () => {
      const since = subDays(new Date(), 29).toISOString();
      const [rooms, bookings, active, logs, bills, issues, offers] = await Promise.all([
        supabase.from("rooms").select("id,number,status,room_type,price").eq("hotel_id", hotelId!).order("number"),
        supabase.from("bookings").select("id,guest_id,check_in,check_out,status,source").eq("hotel_id", hotelId!).gte("check_in", since),
        supabase.from("bookings").select("id,booking_code,check_in,nights,guests(first_name,last_name,preferences),rooms(number)").eq("hotel_id", hotelId!).eq("status", "checked_in").order("check_in"),
        supabase.from("service_logs").select("id,kind,note,created_at,rooms(number)").eq("hotel_id", hotelId!).order("created_at", { ascending: false }).limit(6),
        mgr ? supabase.from("bills").select("total,cgst,sgst,extras,created_at").eq("hotel_id", hotelId!).gte("created_at", since) : Promise.resolve({ data: [] as { total: number; cgst: number; sgst: number; extras: number; created_at: string }[] }),
        supabase.from("room_issues").select("id,category,tag,severity,rooms(number)").eq("hotel_id", hotelId!).eq("resolved", false),
        supabase.from("offers").select("id,title,code,discount_pct").eq("active", true).limit(3),
      ]);
      return { rooms: rooms.data ?? [], bookings: bookings.data ?? [], active: active.data ?? [], logs: logs.data ?? [], bills: bills.data ?? [], issues: issues.data ?? [], offers: offers.data ?? [] };
    },
  });

  if (!hotelId) return <NoHotel />;
  if (isLoading || !data) return <DashSkeleton />;

  if (!mgr) return <StaffHome name={me?.full_name ?? "Team member"} kind={me?.department_id ? "department" : "operations"} logs={data.logs} />;

  const rooms = data.rooms;
  const occ = rooms.filter((r) => r.status === "occupied").length;
  const today = new Date().toDateString();
  const dueOut = data.active.filter((b) => new Date(new Date(b.check_in).getTime() + b.nights * 86400000).toDateString() <= today || new Date(new Date(b.check_in).getTime() + b.nights * 86400000) < new Date());
  const checkedInToday = data.bookings.filter((b) => new Date(b.check_in).toDateString() === today).length;
  const checkedOutToday = data.bookings.filter((b) => b.check_out && new Date(b.check_out).toDateString() === today).length;
  const eod = rooms.length ? Math.round(((occ - dueOut.length + 0) / rooms.length) * 100) : 0;

  const types = [...new Set(rooms.map((r) => r.room_type))];
  const rt = roomType || types[0] || "";
  const ofType = rooms.filter((r) => r.room_type === rt);
  const basePrice = Number(ofType[0]?.price ?? 0);

  const days = [...Array(30)].map((_, i) => {
    const d = subDays(new Date(), 29 - i);
    const end = new Date(d); end.setHours(23, 59, 59);
    const inHouse = data.bookings.filter((b) => new Date(b.check_in) <= end && (!b.check_out || new Date(b.check_out) >= d)).length;
    return { day: format(d, "d MMM"), occupancy: rooms.length ? Math.min(100, Math.round((inHouse / rooms.length) * 100)) : 0 };
  });
  const avgOcc = Math.round(days.reduce((a, d) => a + d.occupancy, 0) / 30);

  const srcCounts: Record<string, number> = {};
  data.bookings.forEach((b) => (srcCounts[b.source] = (srcCounts[b.source] ?? 0) + 1));
  const srcTotal = data.bookings.length || 1;
  const sources = Object.entries(srcCounts).sort((a, b) => b[1] - a[1]);

  const revenue = data.bills.reduce((a, b) => a + Number(b.total), 0);
  const gst = data.bills.reduce((a, b) => a + Number(b.cgst) + Number(b.sgst), 0);
  const extras = data.bills.reduce((a, b) => a + Number(b.extras), 0);

  const guestCount: Record<string, number> = {};
  data.bookings.forEach((b) => (guestCount[b.guest_id] = (guestCount[b.guest_id] ?? 0) + 1));
  const uniq = Object.keys(guestCount).length || 1;
  const returning = Object.values(guestCount).filter((n) => n > 1).length;

  const grouped: Record<string, { rooms: Set<string>; tags: Set<string>; high: boolean }> = {};
  data.issues.forEach((i) => {
    const g = (grouped[i.category] ??= { rooms: new Set(), tags: new Set(), high: false });
    if (i.rooms?.number) g.rooms.add(i.rooms.number);
    g.tags.add(i.tag);
    if (i.severity === "high") g.high = true;
  });

  const checkout = (id: string) => setCo(id);
  const seed = async () => {
    const { error } = await supabase.rpc("seed_demo", { _hotel: hotelId });
    if (error) return toast.error(error.message);
    await supabase.rpc("mark_demo_loaded", { _hotel: hotelId });
    setDemoDone(true);
    toast.success("Demo data added"); qc.invalidateQueries();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <CheckoutDialog bookingId={co} onOpenChange={(o) => !o && setCo(null)} />
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM")}</p>
            <h1 className="text-2xl font-bold md:text-3xl">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {me?.full_name?.split(" ")[0] ?? "there"}</h1>
          </div>
          {mgr && data.bookings.length === 0 && !demoDone && !demoFlag && <Button variant="outline" size="sm" onClick={seed}><Database /> Load demo data</Button>}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Today's status">
            <Row k="Check-ins today" v={checkedInToday} sub="arrived" />
            <Row k="Check-outs left" v={dueOut.length} sub={`of ${dueOut.length + checkedOutToday}`} />
            <div className="my-3 border-t" />
            <Row k="Rooms in use" v={occ} sub={`of ${rooms.length}`} />
            <Row k="EOD occupancy" v={`${Math.max(0, eod)}%`} sub={`${rooms.length - occ} rooms left`} />
          </Panel>
          <Panel title="Price" action={mgr && <Link to="/app/rooms" className="text-sm font-semibold text-primary">Modify</Link>}>
            <Select value={rt} onValueChange={setRoomType}>
              <SelectTrigger className="mb-3"><SelectValue placeholder="Room type" /></SelectTrigger>
              <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Row k="Base rate / night" v={inr(basePrice)} />
            <Row k="With 12% GST" v={inr(basePrice * 1.12)} />
            <Row k={`${rt || "—"} rooms free`} v={`${ofType.filter((r) => r.status === "available").length} / ${ofType.length}`} />
          </Panel>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl bg-aurora p-6 text-primary-foreground shadow-glow">
          <div className="absolute -right-10 -top-10 size-48 rounded-full bg-card/10" />
          <div className="flex items-center gap-2 font-semibold"><Tag className="size-4" /> Active promotions</div>
          <p className="mt-1 text-sm opacity-90">Offers set by your chain admin — apply them at booking for loyal guests.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {data.offers.map((o) => (
              <div key={o.id} className="rounded-xl bg-card p-3 text-foreground">
                <div className="text-[10px] font-bold uppercase tracking-wider text-success">{o.code}</div>
                <div className="flex items-end justify-between"><span className="text-sm font-medium">{o.title}</span><span className="text-xl font-bold">{Number(o.discount_pct)}%</span></div>
              </div>
            ))}
            {!data.offers.length && <div className="rounded-xl bg-card/20 p-3 text-sm">No active offers right now.</div>}
          </div>
        </motion.div>

        <h2 className="pt-2 text-xl font-bold">Property performance</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title={`Occupancy · ${avgOcc}% avg (30 days)`}>
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={days} margin={{ left: -20 }}>
                  <defs><linearGradient id="occ" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-2)" stopOpacity={0.7} /><stop offset="1" stopColor="var(--chart-4)" stopOpacity={0.05} /></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" fontSize={10} stroke="var(--muted-foreground)" interval={6} />
                  <YAxis fontSize={10} stroke="var(--muted-foreground)" unit="%" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="occupancy" stroke="var(--chart-2)" strokeWidth={2} fill="url(#occ)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title={`${data.bookings.length} bookings · last 30 days`}>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {sources.map(([s, n], i) => <div key={s} className={SRC_COLORS[i % 4]} style={{ width: `${(n / srcTotal) * 100}%` }} />)}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              {sources.map(([s, n]) => <div key={s}><div className="font-bold">{Math.round((n / srcTotal) * 100)}%</div><div className="capitalize text-muted-foreground">{s}</div></div>)}
            </div>
            {mgr && (
              <div className="mt-5 space-y-2 border-t pt-4">
                <Row k="Revenue (incl. GST)" v={inr(revenue)} />
                <Row k="GST collected" v={inr(gst)} />
                <Row k="Food & services" v={inr(extras)} />
              </div>
            )}
            <div className="mt-4 rounded-xl bg-secondary p-3 text-sm">
              <div className="flex justify-between"><span>Returning guests</span><b>{Math.round((returning / uniq) * 100)}%</b></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-card"><div className="h-full bg-success" style={{ width: `${(returning / uniq) * 100}%` }} /></div>
            </div>
          </Panel>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Improvement areas</h2><Link to="/app/rooms" className="text-sm font-semibold text-primary">Room conditions</Link></div>
          <div className="space-y-3">
            {Object.entries(grouped).map(([cat, g]) => {
              const Icon = ISSUE_ICON[cat] ?? Wrench;
              return (
                <div key={cat} className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-[auto_120px_90px_1fr_2fr]">
                  <span className={`grid size-10 place-items-center rounded-xl ${g.high ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary"}`}><Icon className="size-5" /></span>
                  <span className="font-semibold">{cat}</span>
                  <span className="text-sm text-muted-foreground">{g.rooms.size} room{g.rooms.size > 1 ? "s" : ""}</span>
                  <span className="text-sm font-semibold">{[...g.rooms].slice(0, 4).join(", ")}</span>
                  <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">{[...g.tags].map((t) => <span key={t} className="rounded-lg border px-2.5 py-1 text-xs">{t}</span>)}</div>
                </div>
              );
            })}
            {!data.issues.length && <div className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-success" /> Every room is in great shape.</div>}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <LiveOps hotelId={hotelId} />
        {mgr && <FastCheckin hotelId={hotelId} rooms={rooms.map((r) => ({ ...r, price: Number(r.price) }))} />}
        <Panel title={`In-house · ${data.active.length}`}>
          <div className="-my-2 max-h-96 divide-y overflow-auto">
            {data.active.map((b) => {
              const due = new Date(new Date(b.check_in).getTime() + b.nights * 86400000);
              const late = due < new Date();
              return (
                <div key={b.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary font-bold">{b.rooms?.number}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{b.guests?.first_name} {b.guests?.last_name}</div>
                    <div className={`text-xs ${late ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{late ? "Overdue · " : "Due "}{format(due, "d MMM, h a")}</div>
                    {!!b.guests?.preferences?.length && <div className="truncate text-[11px] text-primary">{b.guests.preferences.join(" · ")}</div>}
                  </div>
                  {mgr && <Button size="sm" variant="outline" onClick={() => checkout(b.id)}><LogOut /> Bill</Button>}
                </div>
              );
            })}
            {!data.active.length && <p className="py-4 text-center text-sm text-muted-foreground">No guests in-house.</p>}
          </div>
        </Panel>
        <Panel title="Live staff feed">
          <div className="space-y-3">
            {data.logs.map((l) => (
              <div key={l.id} className="flex gap-3 text-sm">
                <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">{l.kind === "maintenance" ? <Wrench className="size-4" /> : <Sparkles className="size-4" />}</span>
                <div><div><b>Room {l.rooms?.number}</b> · <span className="capitalize">{l.kind}</span></div><div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</div></div>
              </div>
            ))}
            {!data.logs.length && <p className="text-sm text-muted-foreground">Staff scans will appear here live.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StaffHome({name,kind,logs}:{name:string;kind:string;logs:{id:string;kind:string;created_at:string;rooms:{number:string}|null}[]}) {
  return <div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm text-muted-foreground">{format(new Date(),"EEEE, d MMMM")}</p><h1 className="text-3xl font-bold">Your shift, {name.split(" ")[0]}</h1><p className="mt-1 text-muted-foreground">Scan a room, complete assigned work and keep every update live.</p></div><Link to="/app/scan" className="group flex min-h-48 items-end overflow-hidden rounded-3xl bg-foreground p-6 text-background shadow-card"><div><span className="grid size-12 place-items-center rounded-2xl bg-primary"><ScanLine/></span><h2 className="mt-8 text-2xl font-bold">Scan room to start</h2><p className="text-sm text-background/70">QR, barcode and booking codes are supported.</p></div></Link><div className="grid grid-cols-2 gap-3">{[[Sparkles,"Cleaning","Complete turnover"],[UtensilsCrossed,"Food","Deliver orders"],[Wrench,"Maintenance","Report issues"],[ClipboardCheck,"Condition check","Daily room check"]].map(([I,t,s])=>{const Icon=I as typeof Sparkles;return <Link key={t as string} to="/app/scan" className="rounded-2xl border bg-card p-4 shadow-card"><Icon className="size-5 text-primary"/><div className="mt-3 font-semibold">{t as string}</div><div className="text-xs text-muted-foreground">{s as string}</div></Link>})}</div><Panel title="Recent team updates"><div className="divide-y">{logs.map(l=><div key={l.id} className="flex justify-between py-3 text-sm"><span>Room {l.rooms?.number} · <span className="capitalize">{l.kind}</span></span><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at),{addSuffix:true})}</span></div>)}</div></Panel></div>;
}

function Row({ k, v, sub }: { k: string; v: string | number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span><b className="text-lg">{typeof v === "number" ? <CountUp end={v} duration={0.8} /> : v}</b>{sub && <span className="ml-1 text-xs text-muted-foreground">{sub}</span>}</span>
    </div>
  );
}

function DashSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6"><Skeleton className="h-10 w-72" /><div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      <div className="space-y-6"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
    </div>
  );
}

function LiveOps({ hotelId }: { hotelId: string }) {
  useLive(["food_orders", "cleaning_tasks", "alerts"], [["liveops", hotelId]]);
  const { data } = useQuery({
    queryKey: ["liveops", hotelId],
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const [o, t, a] = await Promise.all([
        supabase.from("food_orders").select("id,status,order_no,rooms(number)").eq("hotel_id", hotelId).gte("created_at", since).not("status", "in", "(delivered,cancelled)").order("created_at", { ascending: false }),
        supabase.from("cleaning_tasks").select("id,status,source,rooms(number)").eq("hotel_id", hotelId).neq("status", "done").order("created_at", { ascending: false }),
        supabase.from("alerts").select("id,message,kind,created_at").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(5),
      ]);
      return { orders: (o.data ?? []) as unknown as { id: string; status: string; order_no: string; rooms: { number: string } | null }[], tasks: (t.data ?? []) as unknown as { id: string; status: string; source: string; rooms: { number: string } | null }[], alerts: a.data ?? [] };
    },
  });
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-5 py-4"><h3 className="flex items-center gap-2 font-semibold"><span className="size-2 animate-pulse rounded-full bg-success" />Live operations</h3></div>
      <div className="grid grid-cols-2 gap-3 p-4">
        <Link to="/food" className="rounded-xl bg-primary/10 p-3 transition hover:bg-primary/15"><div className="text-2xl font-bold text-primary">{data?.orders.length ?? 0}</div><div className="text-xs text-muted-foreground">Food orders open</div></Link>
        <Link to="/RoomService" className="rounded-xl bg-warning/10 p-3 transition hover:bg-warning/15"><div className="text-2xl font-bold text-warning">{data?.tasks.length ?? 0}</div><div className="text-xs text-muted-foreground">Room requests open</div></Link>
      </div>
      <div className="space-y-1 px-4 pb-4 text-sm">
        {data?.orders.slice(0, 3).map((o) => <div key={o.id} className="flex justify-between rounded-lg bg-secondary px-3 py-1.5"><span>Room {o.rooms?.number} · #{o.order_no}</span><span className="capitalize text-primary">{o.status.replace(/_/g, " ")}</span></div>)}
        {data?.tasks.slice(0, 3).map((t) => <div key={t.id} className="flex justify-between rounded-lg bg-secondary px-3 py-1.5"><span>Room {t.rooms?.number} · {t.source}</span><span className="capitalize text-warning">{t.status.replace(/_/g, " ")}</span></div>)}
        {data?.alerts.map((a) => <div key={a.id} className={`rounded-lg px-3 py-1.5 text-xs ${a.kind === "call" ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}`}>{a.message}</div>)}
      </div>
    </section>
  );
}

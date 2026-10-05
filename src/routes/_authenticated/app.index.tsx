import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import CountUp from "@/components/Count";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { BedDouble, LogIn, LogOut, IndianRupee, Sparkles, Utensils, Wrench } from "lucide-react";
import { formatDistanceToNow, format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { inr, isManager, useHotel, useLive, useMe } from "@/lib/me";
import { NoHotel, PageTitle } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import clayService from "@/assets/clay-service.png";
import clayBill from "@/assets/clay-bill.png";

export const Route = createFileRoute("/_authenticated/app/")({ component: Dashboard });

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const { hotelId } = useHotel();
  const { data: me } = useMe();
  useLive(["rooms", "bookings", "service_logs"], [["dash", hotelId ?? ""]]);

  const { data } = useQuery({
    queryKey: ["dash", hotelId ?? ""],
    enabled: !!hotelId,
    queryFn: async () => {
      const since = subDays(new Date(), 6).toISOString();
      const [rooms, bookings, logs, bills] = await Promise.all([
        supabase.from("rooms").select("id,status,room_type").eq("hotel_id", hotelId!),
        supabase.from("bookings").select("id,status,check_in,check_out,booking_code,guests(first_name,last_name),rooms(number)").eq("hotel_id", hotelId!).gte("check_in", since).order("check_in", { ascending: false }),
        supabase.from("service_logs").select("id,kind,note,created_at,rooms(number)").eq("hotel_id", hotelId!).order("created_at", { ascending: false }).limit(8),
        isManager(me) ? supabase.from("bills").select("total,created_at").eq("hotel_id", hotelId!).gte("created_at", since) : Promise.resolve({ data: [] as { total: number; created_at: string }[] }),
      ]);
      return { rooms: rooms.data ?? [], bookings: bookings.data ?? [], logs: logs.data ?? [], bills: bills.data ?? [] };
    },
  });

  if (!hotelId) return <NoHotel />;
  const rooms = data?.rooms ?? [];
  const occ = rooms.filter((r) => r.status === "occupied").length;
  const today = new Date().toDateString();
  const checkinsToday = (data?.bookings ?? []).filter((b) => new Date(b.check_in).toDateString() === today).length;
  const checkoutsToday = (data?.bookings ?? []).filter((b) => b.check_out && new Date(b.check_out).toDateString() === today).length;
  const revenue = (data?.bills ?? []).reduce((a, b) => a + Number(b.total), 0);

  const days = [...Array(7)].map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = d.toDateString();
    return {
      day: format(d, "EEE"),
      checkins: (data?.bookings ?? []).filter((b) => new Date(b.check_in).toDateString() === key).length,
      revenue: (data?.bills ?? []).filter((b) => new Date(b.created_at).toDateString() === key).reduce((a, b) => a + Number(b.total), 0),
    };
  });
  const statusPie = ["available", "occupied", "cleaning", "maintenance"].map((s) => ({ name: s, value: rooms.filter((r) => r.status === s).length }));

  const stats = [
    { label: "Rooms in use", value: occ, sub: `of ${rooms.length}`, icon: BedDouble, tone: "text-primary" },
    { label: "Check-ins today", value: checkinsToday, sub: "arrivals", icon: LogIn, tone: "text-accent" },
    { label: "Check-outs today", value: checkoutsToday, sub: "departures", icon: LogOut, tone: "text-pink" },
    { label: "Revenue · 7d", value: revenue, sub: "incl. GST", icon: IndianRupee, tone: "text-success", money: true },
  ];

  return (
    <div>
      <PageTitle title={`Namaste, ${me?.full_name?.split(" ")[0] ?? "there"} 👋`} sub="Aapke hotel ka live overview" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-3xl border bg-card p-5">
            <s.icon className={`size-5 ${s.tone}`} />
            <div className="mt-3 font-display text-3xl font-bold">
              {s.money ? "₹" : ""}<CountUp end={s.value} duration={1} preserveValue separator="," />
            </div>
            <div className="text-sm text-muted-foreground">{s.label} · {s.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex justify-between"><h3 className="font-semibold">Check-ins & revenue</h3><span className="text-xs text-muted-foreground">Last 7 days</span></div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={days}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.6} /><stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-2)" stopOpacity={0.5} /><stop offset="1" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" hide />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area yAxisId="r" type="monotone" dataKey="revenue" stroke="var(--chart-2)" fill="url(#g2)" strokeWidth={2} />
                <Area yAxisId="l" type="monotone" dataKey="checkins" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-5">
          <h3 className="font-semibold">Room status</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart><Pie data={statusPie} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={4}>
                {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i]} stroke="none" />)}
              </Pie><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} /></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {statusPie.map((s, i) => <div key={s.name} className="flex items-center gap-2 capitalize"><span className="size-2 rounded-full" style={{ background: COLORS[i] }} />{s.name} · {s.value}</div>)}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border bg-card p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Recent bookings</h3>
          <div className="divide-y">
            {(data?.bookings ?? []).slice(0, 6).map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{b.guests?.first_name} {b.guests?.last_name}</div>
                  <div className="text-xs text-muted-foreground">{b.booking_code} · Room {b.rooms?.number}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs ${b.status === "checked_in" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>{b.status.replace("_", " ")}</span>
              </div>
            ))}
            {!data?.bookings.length && <p className="py-6 text-center text-sm text-muted-foreground">Abhi koi booking nahi.</p>}
          </div>
        </div>
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-aurora p-5 text-primary-foreground">
            <img src={clayBill} alt="" width={1024} height={1024} loading="lazy" className="absolute -bottom-6 -right-6 h-32" />
            <div className="text-sm opacity-90">Quick action</div>
            <div className="mt-1 max-w-[60%] font-display text-lg font-bold">3-step booking + one-click check-in</div>
            {isManager(me) && <Button size="sm" variant="secondary" className="mt-3" asChild><Link to="/app/book">Start</Link></Button>}
          </div>
          <div className="rounded-3xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Live service feed</h3>
              <img src={clayService} alt="" width={1024} height={1024} loading="lazy" className="h-10" />
            </div>
            <div className="mt-3 space-y-3">
              {(data?.logs ?? []).map((l) => {
                const Icon = l.kind === "food" ? Utensils : l.kind === "maintenance" ? Wrench : Sparkles;
                return (
                  <motion.div key={l.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 text-sm">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary"><Icon className="size-4 text-accent" /></span>
                    <div><div className="capitalize">{l.kind} · Room {l.rooms?.number}</div>
                      <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at))} ago {l.note ? `· ${l.note}` : ""}</div></div>
                  </motion.div>
                );
              })}
              {!data?.logs.length && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

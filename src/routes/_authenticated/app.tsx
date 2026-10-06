import { createFileRoute, Link, Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  LayoutDashboard, CalendarPlus, BedDouble, Users, Receipt, ScanLine, Settings, LogOut, Building2,
  Search, Bell, ShieldCheck, Plus, UtensilsCrossed, Maximize2, Minimize2, ShoppingBag, Sparkles,
  ChefHat, UserCog, Keyboard, PanelLeft, Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HotelProvider, isAdmin, isManager, useHotel, useLive, useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KeyboardTips } from "@/components/KeyboardTips";
import { toast } from "sonner";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard — StayOS" }, { name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

function AppLayout() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading your workspace…</div>;
  if (!me) return null;
  if (!me.onboarded && !isAdmin(me) && me.roles.length === 0) return <Navigate to="/onboarding" />;
  if (me.roles.length === 0) return <Navigate to="/onboarding" />;
  if (me.roles.length === 1 && me.roles[0] === "staff" && typeof window !== "undefined" && window.location.pathname === "/app")
    return <Navigate to={me.staff_kind === "food" ? "/food" : "/RoomService"} />;
  return (
    <HotelProvider me={me}>
      <Shell />
    </HotelProvider>
  );
}

function useSignOut() {
  const qc = useQueryClient();
  const nav = useNavigate();
  return async () => {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); nav({ to: "/auth", replace: true });
  };
}

function Shell() {
  const { data: me } = useMe();
  const { hotelId, setHotelId } = useHotel();
  const signOut = useSignOut();
  const { data: hotels } = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => (await supabase.from("hotels").select("id,name,city").order("name")).data ?? [],
  });
  const mgr = isManager(me);
  const [full, setFull] = useState(false);
  const [mini, setMini] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setMini(localStorage.getItem("sb-mini") === "1");
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    const sync = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); setMini((m) => { localStorage.setItem("sb-mini", m ? "0" : "1"); return !m; }); }
    };
    window.addEventListener("keydown", keys);
    return () => { clearInterval(t); document.removeEventListener("fullscreenchange", sync); window.removeEventListener("keydown", keys); };
  }, []);
  const groups = [
    { title: "Front desk", items: [
      { to: "/app", label: "Overview", icon: LayoutDashboard, show: true },
      { to: "/app/book", label: "New Booking", icon: CalendarPlus, show: mgr },
      { to: "/app/rooms", label: "Rooms", icon: BedDouble, show: true },
      { to: "/app/guests", label: "Guests", icon: Users, show: mgr },
      { to: "/app/bills", label: "Bills & Payments", icon: Receipt, show: mgr },
      { to: "/app/scan", label: "Scan Room", icon: ScanLine, show: true },
    ] },
    { title: "Food & service", items: [
      { to: "/app/orders", label: "Guest Orders", icon: ShoppingBag, show: true },
      { to: "/food", label: "Kitchen Board", icon: ChefHat, show: true },
      { to: "/RoomService", label: "Room Service", icon: Sparkles, show: true },
      { to: "/app/menu", label: "Menu Studio", icon: UtensilsCrossed, show: mgr },
    ] },
    { title: "Hotel", items: [
      { to: "/app/staff", label: "Staff & IDs", icon: UserCog, show: mgr },
      { to: "/app/settings", label: "Settings", icon: Settings, show: mgr },
      { to: "/app/admin", label: "Chain Control", icon: ShieldCheck, show: isAdmin(me) },
    ] },
  ] as const;
  const flat = groups.flatMap((g) => g.items.filter((l) => l.show));
  const hotel = hotels?.find((h) => h.id === hotelId);
  const tabs = flat.filter((l) => ["/app", "/app/book", "/app/rooms", "/app/orders"].includes(l.to));
  const initials = (me?.full_name ?? me?.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-card py-5 transition-[width] duration-300 md:flex ${mini ? "w-[76px] px-3" : "w-64 px-4"}`}>
        <div className="mb-6 flex items-center gap-3 px-1">
          <Link to="/" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"><BedDouble className="size-5" /></Link>
          {!mini && <div className="min-w-0"><div className="font-display text-lg font-bold leading-tight">StayOS</div><div className="text-[11px] text-muted-foreground">Hotel operating system</div></div>}
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {groups.map((g) => {
            const items = g.items.filter((l) => l.show);
            if (!items.length) return null;
            return (
              <div key={g.title}>
                {!mini && <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{g.title}</div>}
                <div className="space-y-0.5">
                  {items.map((l) => (
                    <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/app" }} title={l.label}
                      className={`group flex items-center gap-3 rounded-xl py-2.5 text-[13.5px] font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground ${mini ? "justify-center px-0" : "px-3"}`}
                      activeProps={{ className: "!bg-primary/10 !text-primary" }}>
                      <l.icon className="size-[18px] shrink-0" />{!mini && <span className="truncate">{l.label}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className={`flex items-center gap-2 rounded-2xl bg-secondary p-2 ${mini ? "justify-center" : ""}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">{initials}</span>
          {!mini && <div className="min-w-0 flex-1 text-xs"><div className="truncate font-semibold">{me?.full_name ?? me?.email}</div><div className="capitalize text-muted-foreground">{me?.roles.join(", ")}</div></div>}
          {!mini && <button onClick={signOut} aria-label="Log out" className="grid size-8 place-items-center rounded-full text-destructive hover:bg-card"><LogOut className="size-4" /></button>}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-card/85 px-4 py-3 backdrop-blur-xl md:px-6">
          <button className="hidden size-9 place-items-center rounded-xl hover:bg-secondary md:grid" aria-label="Collapse sidebar" onClick={() => setMini((m) => { localStorage.setItem("sb-mini", m ? "0" : "1"); return !m; })}><PanelLeft className="size-[18px]" /></button>
          {isAdmin(me) ? (
            <Select value={hotelId ?? undefined} onValueChange={setHotelId}>
              <SelectTrigger className="h-9 w-44 rounded-xl"><Building2 className="size-4 text-primary" /><SelectValue placeholder="Select hotel" /></SelectTrigger>
              <SelectContent>{hotels?.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <span className="truncate text-sm font-semibold">{hotel?.name ?? "No hotel assigned"}</span>
          )}
          <SearchBox />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-medium text-success sm:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> Live
            </span>
            {now && <div className="hidden border-l pl-3 text-right text-xs leading-tight xl:block"><div className="font-medium">{now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div><div className="text-muted-foreground">{now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</div></div>}
            {mgr && <Button size="sm" className="hidden rounded-xl sm:flex" asChild><Link to="/app/book"><Plus /> New Booking</Link></Button>}
            <button className="hidden size-9 place-items-center rounded-xl border lg:grid" aria-label="Toggle full screen" onClick={async () => { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); setFull(true); } else { await document.exitFullscreen(); setFull(false); } }}>{full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
            <Bells />
            <button onClick={signOut} className="grid size-9 place-items-center rounded-xl text-destructive md:hidden" aria-label="Log out"><LogOut className="size-4" /></button>
          </div>
        </header>
        <main className="flex-1 p-4 pb-28 md:p-8 md:pb-8"><Outlet /></main>
        {mgr && <KeyboardTips />}
        <nav className="no-print fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border bg-card/95 p-1.5 shadow-[var(--shadow-soft)] backdrop-blur md:hidden">
          {tabs.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/app" }} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium text-muted-foreground"
              activeProps={{ className: "!bg-primary/10 !text-primary" }}><l.icon className="size-5" />{l.label.split(" ")[0]}</Link>
          ))}
          <Popover>
            <PopoverTrigger className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground"><Menu className="size-5" />More</PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-56 p-1.5">
              {flat.filter((l) => !tabs.includes(l)).map((l) => (
                <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"><l.icon className="size-4" />{l.label}</Link>
              ))}
            </PopoverContent>
          </Popover>
        </nav>
      </div>
    </div>
  );
}

function SearchBox() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const { hotelId } = useHotel();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const s = q.trim().replace(/[%,()]/g, "");
  const { data } = useQuery({
    queryKey: ["search", s, hotelId],
    enabled: open && s.length >= 2,
    queryFn: async () => {
      const [g, b] = await Promise.all([
        supabase.from("guests").select("id,first_name,last_name,mobile,guest_code").or(`mobile.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%,guest_code.ilike.%${s}%`).limit(6),
        hotelId ? supabase.from("bookings").select("id,booking_code,status,rooms(number)").eq("hotel_id", hotelId).ilike("booking_code", `%${s}%`).limit(6) : Promise.resolve({ data: [] }),
      ]);
      return { guests: g.data ?? [], bookings: (b.data ?? []) as { id: string; booking_code: string; status: string; rooms: { number: string } | null }[] };
    },
  });
  return (
    <>
      <button onClick={() => setOpen(true)} className="hidden w-64 items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground lg:flex">
        <Search className="size-4" /> Search bookings, guests… <kbd className="ml-auto text-[10px]">Ctrl K</kbd>
      </button>
      <button onClick={() => setOpen(true)} className="lg:hidden" aria-label="Search"><Search className="size-4" /></button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Name, mobile, guest ID or booking code" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{s.length < 2 ? "Type at least 2 characters" : "No results"}</CommandEmpty>
          {!!data?.guests.length && (
            <CommandGroup heading="Guests">
              {data.guests.map((g) => (
                <CommandItem key={g.id} value={g.id + g.first_name} onSelect={() => { setOpen(false); nav({ to: "/app/guests" }); }}>
                  {g.first_name} {g.last_name} <span className="ml-auto text-xs text-muted-foreground">{g.mobile}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!!data?.bookings.length && (
            <CommandGroup heading="Bookings">
              {data.bookings.map((b) => (
                <CommandItem key={b.id} value={b.id + b.booking_code} onSelect={() => { setOpen(false); nav({ to: "/app/rooms" }); }}>
                  {b.booking_code} · Room {b.rooms?.number} <span className="ml-auto text-xs capitalize text-muted-foreground">{b.status.replace("_", " ")}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function Bells() {
  const { hotelId } = useHotel();
  const [seen, setSeen] = useState(0);
  useLive(["alerts", "service_logs", "bookings", "food_orders", "cleaning_tasks", "room_issues"], [["bells", hotelId ?? ""]]);
  useEffect(() => {
    if (!hotelId) return;
    const ch = supabase.channel("calls-" + hotelId).on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts", filter: `hotel_id=eq.${hotelId}` }, (p) => {
      const m = (p.new as { message: string; kind: string });
      if (m.kind === "call") toast.warning(m.message, { duration: 15000 }); else toast(m.message);
    }).on("postgres_changes", { event: "INSERT", schema: "public", table: "food_orders", filter: `hotel_id=eq.${hotelId}` }, () => toast.success("New food order received")).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotelId]);
  const { data } = useQuery({
    queryKey: ["bells", hotelId ?? ""],
    enabled: !!hotelId,
    queryFn: async () => {
      const [a, s] = await Promise.all([
        supabase.from("alerts").select("id,message,created_at").eq("hotel_id", hotelId!).order("created_at", { ascending: false }).limit(8),
        supabase.from("service_logs").select("id,kind,created_at,rooms(number)").eq("hotel_id", hotelId!).order("created_at", { ascending: false }).limit(8),
      ]);
      const items = [
        ...(a.data ?? []).map((x) => ({ id: x.id, text: x.message, at: x.created_at, alert: true })),
        ...(s.data ?? []).map((x) => ({ id: x.id, text: `Room ${x.rooms?.number}: ${x.kind} logged`, at: x.created_at, alert: false })),
      ].sort((x, y) => +new Date(y.at) - +new Date(x.at)).slice(0, 10);
      return items;
    },
  });
  const latest = data?.[0] ? +new Date(data[0].at) : 0;
  const unread = (data ?? []).filter((d) => +new Date(d.at) > seen).length;
  return (
    <Popover onOpenChange={(o) => o && setSeen(latest)}>
      <PopoverTrigger asChild>
        <button className="relative grid size-9 place-items-center rounded-full border bg-card" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] text-destructive-foreground">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-80 overflow-auto">
          {(data ?? []).map((d) => (
            <div key={d.id} className="flex gap-2 border-b px-4 py-3 text-sm last:border-0">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${d.alert ? "bg-destructive" : "bg-primary"}`} />
              <div><div>{d.text}</div><div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.at), { addSuffix: true })}</div></div>
            </div>
          ))}
          {!data?.length && <p className="p-6 text-center text-sm text-muted-foreground">All quiet for now.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

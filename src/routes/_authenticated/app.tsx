import { createFileRoute, Link, Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  LayoutDashboard, CalendarPlus, BedDouble, Users, Receipt, ScanLine, Settings, LogOut, Building2,
  Search, Bell, ShieldCheck, Plus, UtensilsCrossed, Maximize2, Minimize2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HotelProvider, isAdmin, isManager, useHotel, useLive, useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const links = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/app/book", label: "New Booking", icon: CalendarPlus, show: mgr },
    { to: "/app/rooms", label: "Rooms", icon: BedDouble, show: true },
    { to: "/app/guests", label: "Guests", icon: Users, show: mgr },
    { to: "/app/bills", label: "Bills", icon: Receipt, show: mgr },
    { to: "/app/orders", label: "Guest Orders", icon: UtensilsCrossed, show: true },
    { to: "/app/menu", label: "Menu Studio", icon: UtensilsCrossed, show: mgr },
    { to: "/app/scan", label: "Scan Room", icon: ScanLine, show: true },
    { to: "/app/settings", label: "Hotel Settings", icon: Settings, show: mgr },
    { to: "/app/admin", label: "Chain Control", icon: ShieldCheck, show: isAdmin(me) },
  ] as const;
  const hotel = hotels?.find((h) => h.id === hotelId);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-5 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-3 font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-neon text-primary-foreground"><BedDouble className="size-4" /></span>StayOS
        </Link>
        <nav className="flex-1 space-y-1">
          {links.filter((l) => l.show).map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/app" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "!bg-foreground !text-background" }}>
              <l.icon className="size-4" />{l.label}
            </Link>
          ))}
        </nav>
        <div className="rounded-2xl bg-sidebar-accent p-3 text-xs">
          <div className="truncate font-semibold">{me?.full_name ?? me?.email}</div>
          <div className="capitalize text-muted-foreground">{me?.roles.join(", ")}</div>
        </div>
        <Button variant="ghost" className="mt-2 justify-start text-destructive" onClick={signOut}><LogOut /> Log out</Button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur md:px-8">
          <Building2 className="hidden size-4 text-primary sm:block" />
          {isAdmin(me) ? (
            <Select value={hotelId ?? undefined} onValueChange={setHotelId}>
              <SelectTrigger className="w-48 rounded-full"><SelectValue placeholder="Select hotel" /></SelectTrigger>
              <SelectContent>{hotels?.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <span className="truncate font-semibold">{hotel?.name ?? "No hotel assigned"}</span>
          )}
          <SearchBox />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success sm:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> Live
            </span>
            {mgr && <Button size="sm" className="rounded-full bg-success text-primary-foreground hover:bg-success/90" asChild><Link to="/app/book"><Plus /> New Booking</Link></Button>}
            <button className="hidden size-9 place-items-center rounded-full border lg:grid" aria-label="Toggle full screen" onClick={async () => { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); setFull(true); } else { await document.exitFullscreen(); setFull(false); } }}>{full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
            <Bells />
          </div>
        </header>
        <nav className="no-print flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 md:hidden">
          {links.filter((l) => l.show).map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/app" }} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs"
              activeProps={{ className: "bg-foreground text-background" }}><l.icon className="size-3" />{l.label}</Link>
          ))}
          <button onClick={signOut} className="shrink-0 px-3 text-xs text-destructive">Log out</button>
        </nav>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
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
  useLive(["alerts", "service_logs", "bookings"], [["bells", hotelId ?? ""]]);
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

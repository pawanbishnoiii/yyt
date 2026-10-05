import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, CalendarPlus, BedDouble, Users, Receipt, ScanLine, Settings, LogOut, Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HotelProvider, isAdmin, isManager, useHotel, useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import clayBell from "@/assets/clay-bell.png";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard — NeonStay" }, { name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

function AppLayout() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!me) return null;
  if (me.roles.length === 0)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <img src={clayBell} alt="" width={1024} height={1024} className="mx-auto h-40" />
          <h1 className="mt-4 text-2xl font-bold">Access pending</h1>
          <p className="mt-2 text-muted-foreground">Admin ko bolo aapko role aur hotel assign kare.</p>
          <SignOut />
        </div>
      </div>
    );
  return (
    <HotelProvider me={me}>
      <Shell />
    </HotelProvider>
  );
}

function SignOut() {
  const qc = useQueryClient();
  const nav = useNavigate();
  return (
    <Button variant="ghost" className="mt-4 w-full justify-start text-muted-foreground" onClick={async () => {
      await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); nav({ to: "/auth", replace: true });
    }}><LogOut /> Sign out</Button>
  );
}

function Shell() {
  const { data: me } = useMe();
  const { hotelId, setHotelId } = useHotel();
  const { data: hotels } = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => (await supabase.from("hotels").select("*").order("name")).data ?? [],
  });
  const mgr = isManager(me);
  const links = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/app/book", label: "New Booking", icon: CalendarPlus, show: mgr },
    { to: "/app/rooms", label: "Rooms", icon: BedDouble, show: true },
    { to: "/app/guests", label: "Guests", icon: Users, show: mgr },
    { to: "/app/bills", label: "Bills", icon: Receipt, show: mgr },
    { to: "/app/scan", label: "Scan Room", icon: ScanLine, show: true },
    { to: "/app/admin", label: "Admin", icon: Settings, show: isAdmin(me) },
  ] as const;
  const hotelName = hotels?.find((h) => h.id === hotelId)?.name;

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2 font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-full bg-neon"><BedDouble className="size-4" /></span>NeonStay
        </Link>
        <nav className="flex-1 space-y-1">
          {links.filter((l) => l.show).map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/app" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-neon text-primary-foreground shadow-glow font-semibold" }}>
              <l.icon className="size-4" />{l.label}
            </Link>
          ))}
        </nav>
        <div className="rounded-2xl bg-sidebar-accent p-3 text-xs">
          <div className="font-semibold">{me?.full_name ?? me?.email}</div>
          <div className="capitalize text-muted-foreground">{me?.roles.join(", ")}</div>
        </div>
        <SignOut />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          <Building2 className="size-4 text-accent" />
          {isAdmin(me) ? (
            <Select value={hotelId ?? undefined} onValueChange={setHotelId}>
              <SelectTrigger className="w-56 rounded-full"><SelectValue placeholder="Select hotel" /></SelectTrigger>
              <SelectContent>{hotels?.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <span className="font-semibold">{hotelName ?? "No hotel assigned"}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> Live
            </span>
            {mgr && <Button variant="neon" size="sm" asChild><Link to="/app/book">New Booking</Link></Button>}
          </div>
        </header>
        <nav className="no-print flex gap-1 overflow-x-auto border-b px-2 py-2 md:hidden">
          {links.filter((l) => l.show).map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/app" }} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs"
              activeProps={{ className: "bg-neon text-primary-foreground" }}><l.icon className="size-3" />{l.label}</Link>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

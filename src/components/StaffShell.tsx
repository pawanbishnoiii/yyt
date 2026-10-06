import { useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "motion/react";
import { PhoneCall, LogOut, LayoutDashboard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin, isManager, useMe, type Me } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function staffHotel(me: Me) {
  if (isAdmin(me) && typeof window !== "undefined") return localStorage.getItem("hotel") ?? me.hotel_id;
  return me.hotel_id;
}

export function StaffShell({ title, sub, icon, children }: { title: string; sub: string; icon: ReactNode; children: (hotelId: string, me: Me) => ReactNode }) {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const hotelId = me ? staffHotel(me) : null;
  const { data: hotel } = useQuery({
    queryKey: ["staff-hotel", hotelId], enabled: !!hotelId,
    queryFn: async () => (await supabase.from("hotels").select("name,phone").eq("id", hotelId!).maybeSingle()).data,
  });
  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground"><Loader2 className="animate-spin" /></div>;
  if (!me) return null;
  if (!me.roles.length) return <Navigate to="/onboarding" />;
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); nav({ to: "/auth", replace: true }); };
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">{icon}</span>
          <div className="min-w-0 flex-1"><div className="font-display text-lg font-bold leading-tight">{title}</div><div className="truncate text-xs text-muted-foreground">{hotel?.name ?? "—"} · {me.full_name ?? me.email}</div></div>
          {isManager(me) && <Button variant="outline" size="sm" asChild><Link to="/app"><LayoutDashboard /> <span className="hidden sm:inline">Dashboard</span></Link></Button>}
          <button onClick={signOut} aria-label="Log out" className="grid size-9 place-items-center rounded-xl text-destructive hover:bg-secondary"><LogOut className="size-4" /></button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-5 text-sm text-muted-foreground">{sub}</p>
        {hotelId ? children(hotelId, me) : <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">You are not assigned to a hotel yet.</p>}
      </main>
      {!isManager(me) && <CallManager phone={hotel?.phone ?? null} />}
    </div>
  );
}

export function CallManager({ phone, room }: { phone: string | null; room?: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("call_manager" as never, { _room: room ?? "", _note: note } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Manager has been alerted");
    setOpen(false); setNote("");
  };
  return (
    <>
      <motion.button whileTap={{ scale: 0.94 }} onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-destructive px-5 py-3.5 font-semibold text-destructive-foreground shadow-[var(--shadow-soft)]">
        <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive-foreground/70" /><span className="relative inline-flex size-2.5 rounded-full bg-destructive-foreground" /></span>
        <PhoneCall className="size-4" /> Call manager
      </motion.button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>Call the manager</DialogTitle><DialogDescription>An alert appears on the manager's screen instantly.</DialogDescription></DialogHeader>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What do you need? (optional)" maxLength={200} />
          <div className="grid gap-2">
            <Button size="lg" onClick={send} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Send alert</Button>
            {phone && <Button size="lg" variant="outline" asChild><a href={`tel:${phone}`} onClick={() => { void send(); }}><PhoneCall /> Alert + phone call</a></Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

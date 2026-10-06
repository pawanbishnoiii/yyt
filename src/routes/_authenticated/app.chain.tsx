import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Building2, BedDouble, IndianRupee, Star, UserCog, Plus, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, isAdmin, useHotel, useMe } from "@/lib/me";
import { PageTitle } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/chain")({ component: () => <Navigate to="/app/admin" replace /> });

function Chain() {
  const { data: me } = useMe();
  const { setHotelId } = useHotel();
  const qc = useQueryClient();
  const [assign, setAssign] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });
  const { data, isLoading } = useQuery({
    queryKey: ["chain"], enabled: isAdmin(me),
    queryFn: async () => (await supabase.rpc("chain_overview")).data ?? [],
  });
  if (!isAdmin(me)) return <p className="text-muted-foreground">Only the chain admin can view this page.</p>;
  const tot = (data ?? []).reduce((a, h) => ({ rooms: a.rooms + h.rooms, occ: a.occ + h.occupied, rev: a.rev + Number(h.revenue) }), { rooms: 0, occ: 0, rev: 0 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["chain"] });

  const doAssign = async () => {
    const { error } = await supabase.rpc("assign_manager", { _hotel: assign!, _email: email });
    if (error) return toast.error(error.message);
    toast.success("Manager assigned"); setAssign(null); setEmail(""); refresh();
  };
  const toggle = async (id: string, status: string) => {
    const { error } = await supabase.from("hotels").update({ status: status === "active" ? "suspended" : "active" } as never).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const add = async () => {
    if (!form.name.trim()) return toast.error("Enter a hotel name");
    const { error } = await supabase.from("hotels").insert({ name: form.name.trim().slice(0, 100), city: form.city.trim().slice(0, 60) || null });
    if (error) return toast.error(error.message);
    toast.success("Hotel added"); setAdding(false); setForm({ name: "", city: "" }); refresh();
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <PageTitle title="Chain overview" sub="Every branch at a glance — occupancy, revenue, rating and manager" />
        <Button onClick={() => setAdding(true)}><Plus /> Add hotel</Button>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[[Building2, "Hotels", data?.length ?? 0], [BedDouble, "Rooms", tot.rooms], [BedDouble, "Occupancy", tot.rooms ? Math.round((tot.occ / tot.rooms) * 100) + "%" : "0%"], [IndianRupee, "Revenue (30d)", inr(tot.rev)]].map(([I, l, v]) => {
          const Icon = I as typeof Building2;
          return <div key={l as string} className="rounded-3xl border bg-card p-5 shadow-card"><Icon className="size-5 text-primary" /><div className="mt-3 text-2xl font-bold">{v as string}</div><div className="text-sm text-muted-foreground">{l as string}</div></div>;
        })}
      </div>
      {isLoading && <div className="h-40 animate-pulse rounded-3xl bg-muted" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((h, i) => {
          const occ = h.rooms ? Math.round((h.occupied / h.rooms) * 100) : 0;
          return (
            <motion.div key={h.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`rounded-3xl border bg-card p-5 shadow-card ${h.status !== "active" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div><div className="font-semibold">{h.name}</div><div className="text-sm text-muted-foreground">{h.city ?? "—"}</div></div>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${h.status === "active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{h.status}</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${occ}%` }} /></div>
              <div className="mt-1 text-xs text-muted-foreground">{h.occupied}/{h.rooms} rooms occupied · {occ}%</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-muted/60 p-2"><div className="text-xs text-muted-foreground">Revenue 30d</div><b>{inr(Number(h.revenue))}</b></div>
                <div className="rounded-xl bg-muted/60 p-2"><div className="text-xs text-muted-foreground">Rating</div><b className="flex items-center gap-1"><Star className="size-3 fill-warning text-warning" />{h.rating ?? "—"}</b></div>
              </div>
              <div className="mt-3 text-sm"><span className="text-muted-foreground">Manager: </span>{h.manager ?? <i className="text-muted-foreground">not assigned</i>}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setHotelId(h.id)}>Open</Button>
                <Button size="sm" variant="outline" onClick={() => setAssign(h.id)}><UserCog /> Manager</Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(h.id, h.status)}><Power /> {h.status === "active" ? "Suspend" : "Activate"}</Button>
              </div>
            </motion.div>
          );
        })}
      </div>
      <Dialog open={!!assign} onOpenChange={(o) => !o && setAssign(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign manager</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Enter the email of a user who has already signed up. They'll become this hotel's manager.</p>
          <Input type="email" placeholder="manager@hotel.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
          <Button onClick={doAssign}>Assign</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add hotel</DialogTitle></DialogHeader>
          <Input placeholder="Hotel name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={60} />
          <Button onClick={add}>Create</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

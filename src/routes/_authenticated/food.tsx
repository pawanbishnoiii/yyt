import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { ChefHat, Clock, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/me";
import { FOOD_FLOW } from "@/lib/flow";
import { StaffShell } from "@/components/StaffShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/food")({
  head: () => ({ meta: [{ title: "Kitchen board — StayOS" }, { name: "description", content: "Live food orders for kitchen staff." }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <StaffShell title="Kitchen board" sub="New orders appear instantly. Tap the button on each order to move it forward." icon={<ChefHat className="size-5" />}>
      {(hotelId) => <Board hotelId={hotelId} />}
    </StaffShell>
  ),
});

type Item = { name: string; qty: number; price: number };
type Order = { id: string; order_no: string; status: string; total: number; items: Item[]; note: string | null; created_at: string; rooms: { number: string } | null };

function Board({ hotelId }: { hotelId: string }) {
  const qc = useQueryClient();
  const key = ["kitchen", hotelId];
  const [tab, setTab] = useState<string>("active");
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("food_orders").select("id,order_no,status,total,items,note,created_at,rooms(number)")
      .eq("hotel_id", hotelId).gte("created_at", new Date(Date.now() - 86400000).toISOString()).order("created_at")).data as unknown as Order[] ?? [],
  });
  useEffect(() => {
    const ch = supabase.channel("kitchen-" + hotelId).on("postgres_changes", { event: "*", schema: "public", table: "food_orders", filter: `hotel_id=eq.${hotelId}` }, (p) => {
      if (p.eventType === "INSERT") { toast.success("New order!"); if (navigator.vibrate) navigator.vibrate([100, 50, 100]); }
      qc.invalidateQueries({ queryKey: key });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const move = async (o: Order, status: string) => {
    qc.setQueryData<Order[]>(key, (old) => old?.map((x) => (x.id === o.id ? { ...x, status } : x)));
    const { error } = await supabase.from("food_orders").update({ status, ...(status === "accepted" ? { accepted_at: new Date().toISOString() } : {}) } as never).eq("id", o.id);
    if (error) { toast.error(error.message); qc.invalidateQueries({ queryKey: key }); }
  };

  const orders = data ?? [];
  const list = orders.filter((o) => (tab === "active" ? !["delivered", "cancelled"].includes(o.status) : o.status === tab));
  const counts = (s: string) => orders.filter((o) => o.status === s).length;

  return (
    <div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[["active", "Active"], ...FOOD_FLOW.map((f) => [f.id, f.label])].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${tab === id ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {l} {id !== "active" && <span className="ml-1 opacity-70">{counts(id)}</span>}
          </button>
        ))}
      </div>
      {isLoading && <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-muted" />)}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((o) => {
            const step = FOOD_FLOW.find((f) => f.id === o.status);
            const idx = FOOD_FLOW.findIndex((f) => f.id === o.status);
            return (
              <motion.div layout key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                className={`rounded-3xl border bg-card p-5 shadow-card ${o.status === "placed" ? "ring-2 ring-primary/40" : ""}`}>
                <div className="flex items-start justify-between">
                  <div><div className="text-2xl font-bold">Room {o.rooms?.number}</div><div className="text-xs text-muted-foreground">#{o.order_no}</div></div>
                  <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"><Clock className="size-3" />{formatDistanceToNow(new Date(o.created_at))}</span>
                </div>
                <div className="mt-3 flex gap-1">{FOOD_FLOW.slice(0, 6).map((f, i) => <span key={f.id} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />)}</div>
                <div className="mt-1 text-xs font-medium text-primary">{step?.label ?? o.status}</div>
                <ul className="mt-3 space-y-1 text-sm">{o.items.map((it, i) => <li key={i} className="flex justify-between"><span><b>{it.qty}×</b> {it.name}</span><span className="text-muted-foreground">{inr(it.price * it.qty)}</span></li>)}</ul>
                {o.note && <p className="mt-3 flex gap-1 rounded-xl bg-warning/10 px-3 py-2 text-xs"><Leaf className="size-3.5 shrink-0" />{o.note}</p>}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <b>{inr(Number(o.total))}</b>
                  <div className="flex gap-2">
                    {o.status === "placed" && <Button size="sm" variant="ghost" onClick={() => move(o, "cancelled")}>Reject</Button>}
                    {step?.next && <Button onClick={() => move(o, step.next!)}>{step.action}</Button>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {!isLoading && !list.length && <div className="rounded-3xl border border-dashed bg-card p-12 text-center text-muted-foreground"><ChefHat className="mx-auto mb-2 size-8" />No orders here right now.</div>}
    </div>
  );
}

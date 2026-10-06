import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { ChefHat, Receipt, CheckCircle2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, useHotel, useLive } from "@/lib/me";
import { NoHotel, PageTitle } from "@/components/NoHotel";
import { FOOD_FLOW } from "@/lib/flow";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/orders")({ component: Orders });

type Item = { name: string; qty: number; price: number };
const ICONS = { placed: Receipt, accepted: Receipt, preparing: ChefHat, ready: ChefHat, out_for_delivery: ChefHat, delivered: CheckCircle2 } as const;
const cols = FOOD_FLOW.map((f) => ({ ...f, icon: ICONS[f.id] }));

function Orders() {
  const { hotelId } = useHotel();
  const qc = useQueryClient();
  useLive(["food_orders", "reviews"], [["orders", hotelId ?? ""]]);
  const { data } = useQuery({
    queryKey: ["orders", hotelId ?? ""], enabled: !!hotelId,
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const [o, r] = await Promise.all([
        supabase.from("food_orders").select("id,order_no,status,total,items,note,created_at,rooms(number)").eq("hotel_id", hotelId!).gte("created_at", since).order("created_at", { ascending: false }),
        supabase.from("reviews").select("id,rating,comment,created_at").eq("hotel_id", hotelId!).order("created_at", { ascending: false }).limit(8),
      ]);
      return { orders: o.data ?? [], reviews: r.data ?? [] };
    },
  });
  if (!hotelId) return <NoHotel />;
  const move = async (id: string, status: string) => {
    const { error } = await supabase.from("food_orders").update({ status, ...(status === "accepted" ? { accepted_at: new Date().toISOString() } : {}) } as never).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["orders"] });
  };
  return (
    <div>
      <PageTitle title="Guest orders" sub="Room-service orders from the guest app update here live" />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cols.map((c) => {
          const list = (data?.orders ?? []).filter((o) => o.status === c.id);
          return (
            <div key={c.id} className="rounded-3xl border bg-muted/40 p-3">
              <div className="mb-3 flex items-center gap-2 px-2 font-semibold"><c.icon className="size-4 text-primary" />{c.label}<span className="ml-auto rounded-full bg-card px-2 text-xs">{list.length}</span></div>
              <div className="space-y-3">
                <AnimatePresence>
                  {list.map((o) => (
                    <motion.div layout key={o.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border bg-card p-4 shadow-card">
                      <div className="flex justify-between"><b>Room {o.rooms?.number}</b><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}</span></div>
                      <ul className="mt-2 space-y-0.5 text-sm">{(o.items as Item[]).map((it, i) => <li key={i}>{it.qty} × {it.name}</li>)}</ul>
                      {o.note && <p className="mt-2 rounded-lg bg-warning/10 px-2 py-1 text-xs">{o.note}</p>}
                      <div className="mt-3 flex items-center justify-between"><span className="font-semibold">{inr(Number(o.total))}</span>
                        {c.next && <Button size="sm" onClick={() => move(o.id, c.next!)}>{c.action}</Button>}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!list.length && <p className="py-6 text-center text-sm text-muted-foreground">Nothing here</p>}
              </div>
            </div>
          );
        })}
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Latest reviews</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {data?.reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-4">
            <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`size-4 ${s <= r.rating ? "fill-warning text-warning" : "text-muted"}`} />)}</div>
            <p className="mt-1 text-sm">{r.comment || <i className="text-muted-foreground">No comment</i>}</p>
          </div>
        ))}
        {!data?.reviews.length && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
      </div>
    </div>
  );
}

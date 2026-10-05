import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { Search, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin, useMe } from "@/lib/me";
import { PageTitle } from "@/components/NoHotel";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/app/guests")({ component: Guests });

function Guests() {
  const { data: me } = useMe();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);
  const { data: guests } = useQuery({
    queryKey: ["guests", q],
    queryFn: async () => {
      let qb = supabase.from("guests").select("*").order("created_at", { ascending: false }).limit(60);
      const s = q.trim().replace(/[%,()]/g, "");
      if (s) qb = qb.or(`mobile.ilike.%${s}%,aadhaar.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%,guest_code.ilike.%${s}%`);
      return (await qb).data ?? [];
    },
  });
  const { data: visits } = useQuery({
    queryKey: ["visits", open?.id],
    enabled: !!open,
    queryFn: async () => (await supabase.rpc("guest_visits", { _guest: open!.id })).data ?? [],
  });

  const counts: Record<string, number> = {};
  (guests ?? []).forEach((g) => (g.interests ?? []).forEach((i: string) => (counts[i] = (counts[i] ?? 0) + 1)));
  const interestData = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageTitle title="Guests" sub={isAdmin(me) ? "Chain-wide guests · full visit history" : "You see visit history for your hotel only"} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="rounded-full pl-9" placeholder="Search name, mobile, Aadhaar, guest ID" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
            {(guests ?? []).map((g) => (
              <button key={g.id} onClick={() => setOpen({ id: g.id, name: `${g.first_name} ${g.last_name}` })}
                className="flex w-full items-center justify-between border-b p-4 text-left text-sm last:border-0 hover:bg-secondary">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-neon font-display text-sm font-bold">{g.first_name[0]}{g.last_name[0]}</span>
                  <div>
                    <div className="font-medium">{g.first_name} {g.last_name} <span className="text-xs text-muted-foreground">· {g.guest_code}</span></div>
                    <div className="text-xs text-muted-foreground">{g.mobile} · {g.gender} · {g.age}y</div>
                  </div>
                </div>
                <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                  {(g.interests ?? []).slice(0, 3).map((i: string) => <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{i}</span>)}
                </div>
              </button>
            ))}
            {!guests?.length && <p className="p-8 text-center text-sm text-muted-foreground">No guests found.</p>}
          </div>
        </div>
        <div className="rounded-3xl border bg-card shadow-card p-5">
          <h3 className="font-semibold">Guest interests</h3>
          <p className="text-xs text-muted-foreground">What guests love — plan offers around it</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={interestData} layout="vertical">
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={12} width={80} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="value" fill="var(--chart-3)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle className="flex items-center gap-2"><History className="size-4" /> {open?.name}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3 px-4">
            {(visits ?? []).map((v) => (
              <div key={v.booking_code} className="rounded-2xl border p-3 text-sm">
                <div className="flex justify-between font-medium"><span>{v.hotel_name}</span><span className="text-xs capitalize text-muted-foreground">{v.status.replace("_", " ")}</span></div>
                <div className="text-xs text-muted-foreground">{v.booking_code} · Room {v.room_number}</div>
                <div className="text-xs">{format(new Date(v.check_in), "dd MMM yy")} → {v.check_out ? format(new Date(v.check_out), "dd MMM yy") : "staying"}</div>
              </div>
            ))}
            {!visits?.length && <p className="text-sm text-muted-foreground">No visits recorded at this hotel.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

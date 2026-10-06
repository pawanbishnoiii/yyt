import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Banknote, CreditCard, Smartphone, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, useLive } from "@/lib/me";
import { Button } from "@/components/ui/button";

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
];

type Pay = { id: string; amount: number; method: string; note: string | null; created_at: string };

export function useBillPayments(billId: string) {
  return useQuery({
    queryKey: ["bill-payments", billId],
    queryFn: async () => ((await supabase.from("bill_payments" as never).select("id,amount,method,note,created_at").eq("bill_id", billId).order("created_at")).data ?? []) as unknown as Pay[],
  });
}

export function BillPayments({ billId, hotelId, total }: { billId: string; hotelId: string; total: number }) {
  const qc = useQueryClient();
  useLive(["bill_payments"], [["bill-payments", billId], ["bill", billId]]);
  const { data: pays = [] } = useBillPayments(billId);
  const paid = pays.reduce((s, p) => s + Number(p.amount), 0);
  const due = Math.max(0, Math.round((total - paid) * 100) / 100);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const add = async (amt?: number) => {
    const a = amt ?? Number(amount);
    if (!(a > 0)) return toast.error("Enter an amount");
    if (a > due + 0.5) return toast.error(`Only ${inr(due)} is due`);
    const { error } = await supabase.from("bill_payments" as never).insert({ bill_id: billId, hotel_id: hotelId, amount: a, method, note: note.trim().slice(0, 120) || null } as never);
    if (error) return toast.error(error.message);
    toast.success(`${inr(a)} recorded`);
    setAmount(""); setNote("");
    qc.invalidateQueries({ queryKey: ["bill-payments", billId] });
    qc.invalidateQueries({ queryKey: ["bill", billId] });
    qc.invalidateQueries({ queryKey: ["bills"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Remove this payment?")) return;
    const { error } = await supabase.from("bill_payments" as never).delete().eq("id", id);
    if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["bill-payments", billId] }); qc.invalidateQueries({ queryKey: ["bill", billId] }); }
  };
  const pct = total ? Math.min(100, (paid / total) * 100) : 0;

  return (
    <div className="no-print mt-5 rounded-3xl border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Payments</h2>
        {due === 0 ? <span className="flex items-center gap-1 rounded-full bg-success/12 px-3 py-1 text-xs font-semibold text-success"><CheckCircle2 className="size-3.5" /> Fully paid</span>
          : <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">{paid > 0 ? "Partly paid" : "Unpaid"}</span>}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[["Bill total", total], ["Received", paid], ["Balance due", due]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl bg-secondary p-3"><div className="text-[11px] text-muted-foreground">{l}</div><div className="font-display text-lg font-bold">{inr(v as number)}</div></div>
        ))}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} /></div>
      {pays.length > 0 && (
        <div className="mt-4 divide-y rounded-2xl border">
          {pays.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-12 font-semibold uppercase text-muted-foreground">{p.method}</span>
              <span className="flex-1 truncate text-muted-foreground">{format(new Date(p.created_at), "d MMM, h:mm a")}{p.note && ` · ${p.note}`}</span>
              <span className="font-semibold">{inr(p.amount)}</span>
              <button onClick={() => remove(p.id)} aria-label="Remove payment" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
      {due > 0 && (
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <div className="flex gap-2">
            {METHODS.map((m) => (
              <button type="button" key={m.id} onClick={() => setMethod(m.id)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition ${method === m.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"}`}><m.icon className="size-4" />{m.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="h-10 w-32 rounded-xl border bg-background px-3" type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3" placeholder="Note (optional)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit" variant="outline"><Plus /> Add</Button>
            <Button type="button" onClick={() => add(due)}>Collect full {inr(due)}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

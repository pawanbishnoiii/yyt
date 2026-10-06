import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ReceiptText, AlertTriangle } from "lucide-react";
import { type BillPreview, confirmCheckout, previewBill, undoCheckout } from "@/lib/checkout";
import { inr } from "@/lib/me";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

/** Two-step check-out: draft bill is shown first, manager must tick and confirm. */
export function CheckoutDialog({ bookingId, label, onOpenChange }: { bookingId: string | null; label?: string; onOpenChange: (o: boolean) => void }) {
  const [p, setP] = useState<BillPreview | null>(null);
  const [mode, setMode] = useState("cash");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    setP(null); setOk(false);
    if (bookingId) previewBill(bookingId).then(setP).catch((e) => { toast.error(e.message); onOpenChange(false); });
  }, [bookingId]);

  const go = async () => {
    if (!p) return;
    setBusy(true);
    try {
      const id = await confirmCheckout(p, mode);
      qc.invalidateQueries();
      onOpenChange(false);
      const bid = p.bookingId;
      toast.success("Checked out — bill saved", {
        duration: 15000,
        action: { label: "Undo", onClick: () => undoCheckout(bid).then(() => { toast.success("Check-out undone"); qc.invalidateQueries(); }).catch((e) => toast.error(e.message)) },
      });
      nav({ to: "/app/bill/$id", params: { id } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const Row = ({ l, v, b }: { l: string; v: number; b?: boolean }) => <div className={`flex justify-between py-1 text-sm ${b ? "border-t pt-2 text-base font-bold" : ""}`}><span className={b ? "" : "text-muted-foreground"}>{l}</span><span>{inr(v)}</span></div>;

  return (
    <Dialog open={!!bookingId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ReceiptText className="size-5 text-primary" />Check out {label}</DialogTitle>
          <DialogDescription>Review the draft bill. Nothing is saved until you confirm.</DialogDescription>
        </DialogHeader>
        {!p ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div> : (
          <div className="space-y-3">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <Row l={`Room · ${p.nights} night(s) × ${inr(p.rate)}`} v={p.subtotal} />
              {p.discount > 0 && <Row l={`Offer discount (${p.discountPct}%)`} v={-p.discount} />}
              {p.extras > 0 && <Row l="Services & supplies" v={p.extras} />}
              {p.food > 0 && <Row l="Room-service food" v={p.food} />}
              <Row l={`CGST (${p.cgstRate}% room${p.food ? `, ${p.foodRate / 2}% food` : ""})`} v={p.cgst} />
              <Row l={`SGST (${p.sgstRate}% room${p.food ? `, ${p.foodRate / 2}% food` : ""})`} v={p.sgst} />
              <Row l="Total" v={p.total} b />
            </div>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["cash", "upi", "card"].map((m) => <SelectItem key={m} value={m} className="uppercase">{m.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm">
              <Checkbox checked={ok} onCheckedChange={(v) => setOk(!!v)} className="mt-0.5" />
              <span><AlertTriangle className="mr-1 inline size-3.5 text-warning" />I confirm the guest has paid and is leaving. (You can undo within 1 hour.)</span>
            </label>
            <Button className="w-full" size="lg" disabled={!ok || busy} onClick={go}>{busy && <Loader2 className="animate-spin" />}Confirm check-out · {inr(p.total)}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

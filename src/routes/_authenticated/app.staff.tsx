import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion } from "motion/react";
import { UserPlus, KeyRound, Trash2, Loader2, CheckCircle2, XCircle, Dices, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHotel } from "@/lib/me";
import { createStaffMember, resetStaffPassword, removeStaff } from "@/lib/admin.functions";
import { NoHotel, PageTitle } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/staff")({ component: StaffPage });

const KINDS = [["food", "Kitchen / food"], ["room_service", "Room service"], ["cleaning", "Housekeeping"], ["maintenance", "Maintenance"], ["front_desk", "Front desk"]] as const;

function StaffPage() {
  const { hotelId } = useHotel();
  const qc = useQueryClient();
  const create = useServerFn(createStaffMember);
  const reset = useServerFn(resetStaffPassword);
  const remove = useServerFn(removeStaff);
  const [f, setF] = useState({ full_name: "", mobile: "", code: "", password: "", staff_kind: "room_service" as string });
  const [avail, setAvail] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff", hotelId], enabled: !!hotelId,
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,mobile,staff_kind,last_seen_at,staff_code" as "*").eq("hotel_id", hotelId!).not("staff_kind", "is", null).order("full_name")).data as unknown as { id: string; full_name: string | null; mobile: string | null; staff_kind: string; last_seen_at: string | null; staff_code: string | null }[] ?? [],
  });

  useEffect(() => {
    setAvail(null);
    if (!/^\d{4}$/.test(f.code)) return;
    const t = setTimeout(async () => { const { data } = await supabase.rpc("staff_code_available" as never, { _code: f.code } as never); setAvail(!!data); }, 300);
    return () => clearTimeout(t);
  }, [f.code]);

  if (!hotelId) return <NoHotel />;
  const random = () => setF((x) => ({ ...x, code: String(1000 + Math.floor(Math.random() * 9000)) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.full_name.trim()) return toast.error("Enter the staff member's name");
    if (!/^\d{4}$/.test(f.code)) return toast.error("Staff ID must be exactly 4 digits");
    if (avail === false) return toast.error("That Staff ID is taken");
    if (f.password.length < 6) return toast.error("Password needs at least 6 characters");
    setBusy(true);
    try {
      await create({ data: { ...f, hotel_id: hotelId, staff_kind: f.staff_kind as never } });
      toast.success(`Staff created — ID ${f.code}`);
      setF({ full_name: "", mobile: "", code: "", password: "", staff_kind: f.staff_kind });
      qc.invalidateQueries({ queryKey: ["staff"] });
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageTitle title="Staff & Staff IDs" sub="Create a 4-digit Staff ID and short password. Staff sign in with it on the sign-in page." />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={submit} className="space-y-4 rounded-3xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 font-semibold"><UserPlus className="size-4 text-primary" />New staff member</div>
          <div className="space-y-1.5"><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} maxLength={100} placeholder="Ravi Kumar" /></div>
          <div className="space-y-1.5"><Label>Mobile (optional)</Label><Input value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="numeric" placeholder="98xxxxxxxx" /></div>
          <div className="space-y-1.5"><Label>Role</Label>
            <Select value={f.staff_kind} onValueChange={(v) => setF({ ...f, staff_kind: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Staff ID (4 digits)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" placeholder="4821" className="font-mono text-lg tracking-[0.4em]" />
                {avail !== null && <span className="absolute right-3 top-1/2 -translate-y-1/2">{avail ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}</span>}
              </div>
              <Button type="button" variant="outline" size="icon" onClick={random} aria-label="Random ID"><Dices /></Button>
            </div>
            {avail === false && <p className="text-xs text-destructive">Already taken — try another.</p>}
            {avail && <p className="text-xs text-success">Available</p>}
          </div>
          <div className="space-y-1.5"><Label>Password (min 6)</Label><Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} maxLength={32} placeholder="e.g. 482100" /></div>
          <Button className="w-full" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Create staff</Button>
        </form>
        <div className="rounded-3xl border bg-card shadow-card">
          <div className="border-b px-5 py-4 font-semibold">Team ({staff?.length ?? 0})</div>
          {isLoading && <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>}
          <div className="divide-y">
            {staff?.map((s, i) => {
              const online = s.last_seen_at && Date.now() - +new Date(s.last_seen_at) < 10 * 60000;
              return (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="relative grid size-10 place-items-center rounded-full bg-secondary font-semibold">{(s.full_name ?? "S")[0]}<span className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card ${online ? "bg-success" : "bg-muted-foreground/40"}`} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">{KINDS.find((k) => k[0] === s.staff_kind)?.[1] ?? s.staff_kind} · {s.last_seen_at ? "seen " + formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true }) : "never signed in"}</div>
                  </div>
                  {s.staff_code && <button onClick={() => { navigator.clipboard.writeText(s.staff_code!); toast.success("Copied"); }} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">ID {s.staff_code}<Copy className="size-3" /></button>}
                  <Button size="icon" variant="ghost" aria-label="Reset password" onClick={async () => {
                    const pw = prompt("New password for " + s.full_name + " (min 6 characters)");
                    if (!pw) return; if (pw.length < 6) return toast.error("At least 6 characters");
                    try { await reset({ data: { user_id: s.id, password: pw } }); toast.success("Password updated"); } catch (e) { toast.error((e as Error).message); }
                  }}><KeyRound /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" aria-label="Remove" onClick={async () => {
                    if (!confirm("Remove " + s.full_name + "? They will no longer be able to sign in.")) return;
                    try { await remove({ data: { user_id: s.id } }); toast.success("Removed"); qc.invalidateQueries({ queryKey: ["staff"] }); } catch (e) { toast.error((e as Error).message); }
                  }}><Trash2 /></Button>
                </motion.div>
              );
            })}
            {!isLoading && !staff?.length && <p className="p-8 text-center text-sm text-muted-foreground">No staff yet. Create the first Staff ID on the left.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

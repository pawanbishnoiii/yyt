import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Database, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isManager, useHotel, useMe } from "@/lib/me";
import { NoHotel, PageTitle, Panel } from "@/components/NoHotel";
import { STATES } from "./onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/settings")({ component: Settings });

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().max(80),
  address: z.string().trim().max(300),
  phone: z.string().trim().max(20),
  pincode: z.string().regex(/^\d{6}$/, "PIN code must be 6 digits").or(z.literal("")),
  state: z.string(),
  gst_number: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "GSTIN format looks wrong").or(z.literal("")),
  cgst_rate: z.coerce.number().min(0).max(14),
  sgst_rate: z.coerce.number().min(0).max(14),
  upi_id: z.string().regex(/^[\w.-]+@[\w]+$/, "UPI ID looks wrong").or(z.literal("")),
});
type F = Record<keyof z.infer<typeof schema>, string>;

function Settings() {
  const { hotelId } = useHotel();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<F | null>(null);
  const { data } = useQuery({
    queryKey: ["hotel", hotelId],
    enabled: !!hotelId,
    queryFn: async () => (await supabase.from("hotels").select("*").eq("id", hotelId!).single()).data,
  });
  useEffect(() => {
    if (data) setF({ name: data.name, city: data.city ?? "", address: data.address ?? "", phone: data.phone ?? "", pincode: data.pincode ?? "", state: data.state ?? "", gst_number: data.gst_number ?? "", cgst_rate: String(data.cgst_rate), sgst_rate: String(data.sgst_rate), upi_id: data.upi_id ?? "" });
  }, [data]);
  if (!hotelId) return <NoHotel />;
  if (!isManager(me)) return <p className="text-muted-foreground">Managers only.</p>;
  if (!f) return null;

  const save = async () => {
    const r = schema.safeParse({ ...f, gst_number: f.gst_number.toUpperCase() });
    if (!r.success) return toast.error(r.error.issues[0]?.message);
    const v = r.data;
    const { error } = await supabase.from("hotels").update({ ...v, gst_number: v.gst_number || null, upi_id: v.upi_id || null }).eq("id", hotelId);
    if (error) return toast.error(error.message);
    toast.success("Hotel settings saved"); qc.invalidateQueries();
  };
  const seed = async () => {
    const { error } = await supabase.rpc("seed_demo", { _hotel: hotelId });
    if (error) return toast.error(error.message);
    await supabase.rpc("mark_demo_loaded", { _hotel: hotelId });
    toast.success("Demo guests, stays, bills and room issues added"); qc.invalidateQueries();
  };
  const toggle = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("hotels").update(patch as never).eq("id", hotelId);
    if (error) return toast.error(error.message);
    toast.success("Saved"); qc.invalidateQueries({ queryKey: ["hotel", hotelId] });
  };
  const h = data as unknown as { checkout_time: string; checkout_time_enabled: boolean; id_upload_enabled: boolean; service_items: string[]; demo_loaded: boolean; wifi_name: string | null; wifi_password: string | null };
  const inp = (k: keyof F, l: string, ph?: string) => (
    <div className="space-y-1.5"><Label>{l}</Label><Input value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );

  return (
    <div className="max-w-4xl">
      <PageTitle title="Hotel settings" sub="Branch details, GST and payment info used on invoices"><Button variant="neon" onClick={save}><Save /> Save changes</Button></PageTitle>
      <div className="grid gap-6">
        <Panel title="Branch">
          <div className="grid gap-4 sm:grid-cols-2">
            {inp("name", "Branch name")}{inp("city", "City")}{inp("address", "Address")}{inp("phone", "Phone")}{inp("pincode", "PIN code")}
            <div className="space-y-1.5"><Label>State</Label>
              <Select value={f.state} onValueChange={(v) => setF({ ...f, state: v })}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Panel>
        <Panel title="GST & payments">
          <div className="grid gap-4 sm:grid-cols-2">
            {inp("gst_number", "GSTIN", "29ABCDE1234F1Z5")}{inp("upi_id", "UPI ID (for bill QR)", "hotel@okhdfc")}{inp("cgst_rate", "CGST %")}{inp("sgst_rate", "SGST / State GST %")}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Total GST on new bills: {Number(f.cgst_rate) + Number(f.sgst_rate)}%.</p>
        </Panel>
        <Panel title="Stay rules & room service">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="font-medium">Fixed check-out time</div><p className="text-muted-foreground">Bookings end at this time on the last day.</p></div>
              <div className="flex items-center gap-3">
                <Input type="time" className="w-32" defaultValue={h.checkout_time?.slice(0, 5)} onBlur={(e) => e.target.value && toggle({ checkout_time: e.target.value })} disabled={!h.checkout_time_enabled} />
                <Switch checked={h.checkout_time_enabled} onCheckedChange={(v) => toggle({ checkout_time_enabled: v })} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <div><div className="font-medium">Ask for guest ID upload</div><p className="text-muted-foreground">Show the ID photo step during new bookings.</p></div>
              <Switch checked={h.id_upload_enabled} onCheckedChange={(v) => toggle({ id_upload_enabled: v })} />
            </div>
            <div className="border-t pt-4">
              <div className="font-medium">Room service tasks</div>
              <p className="mb-2 text-muted-foreground">Turn on the services guests can request.</p>
              <div className="flex flex-wrap gap-2">
                {["cleaning", "towels", "laundry", "AC", "Wi-Fi", "TV", "Plumbing", "wake-up call"].map((k) => {
                  const on = (h.service_items ?? []).includes(k);
                  return <button key={k} onClick={() => toggle({ service_items: on ? h.service_items.filter((x) => x !== k) : [...(h.service_items ?? []), k] })} className={`rounded-full border px-3 py-1 capitalize transition ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>{k}</button>;
                })}
              </div>
            </div>
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Guest Wi-Fi name</Label><Input defaultValue={h.wifi_name ?? ""} onBlur={(e) => toggle({ wifi_name: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>Guest Wi-Fi password</Label><Input defaultValue={h.wifi_password ?? ""} onBlur={(e) => toggle({ wifi_password: e.target.value || null })} /></div>
            </div>
          </div>
        </Panel>
        {!h.demo_loaded && <Panel title="Demo data">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">Fill this branch with sample guests, in-house stays, past invoices and room issues to explore the app.</p>
            <Button variant="outline" onClick={seed}><Database /> Load demo data</Button>
          </div>
        </Panel>}
      </div>
    </div>
  );
}

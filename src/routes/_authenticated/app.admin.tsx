import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Building2, Users, Percent, Tag, ListChecks, DatabaseBackup, Trash2, Plus, Download, SlidersHorizontal, Activity, BedDouble, IndianRupee, Zap, Trophy, TrendingDown, Play, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin, useMe } from "@/lib/me";
import { createStaffUser } from "@/lib/admin.functions";
import { PageTitle } from "@/components/NoHotel";
import clayOffer from "@/assets/clay-offer.png";
import clayBackup from "@/assets/clay-backup.png";
import clayAdmin from "@/assets/clay-admin.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/admin")({ component: Admin });

function Admin() {
  const { data: me } = useMe();
  if (!isAdmin(me)) return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div>
      <PageTitle title="Chain control" sub="Portfolio, hotels, team, manager access, taxes, offers and automations"><img src={clayAdmin} alt="" width={1024} height={1024} className="h-16 animate-float" /></PageTitle>
      <Tabs defaultValue="portfolio">
        <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 rounded-2xl bg-card p-1">
          {[["portfolio", Activity, "Overview"], ["hotels", Building2, "Hotels"], ["staff", Users, "Staff"], ["permissions", SlidersHorizontal, "Manager access"], ["tax", Percent, "GST & taxes"], ["offers", Tag, "Offers"], ["fields", ListChecks, "Check-in form"], ["automations", Zap, "Automations"], ["backup", DatabaseBackup, "Backups"]].map(([v, I, l]) => {
            const Icon = I as typeof Building2;
            return <TabsTrigger key={v as string} value={v as string} className="rounded-xl data-[state=active]:bg-neon"><Icon className="mr-1 size-4" />{l as string}</TabsTrigger>;
          })}
        </TabsList>
        <TabsContent value="portfolio"><Portfolio /></TabsContent>
        <TabsContent value="hotels"><Hotels /></TabsContent>
        <TabsContent value="staff"><Staff /></TabsContent>
        <TabsContent value="permissions"><Permissions /></TabsContent>
        <TabsContent value="tax"><Tax /></TabsContent>
        <TabsContent value="offers"><Offers /></TabsContent>
        <TabsContent value="fields"><Fields /></TabsContent>
        <TabsContent value="automations"><Automations /></TabsContent>
        <TabsContent value="backup"><Backups /></TabsContent>
      </Tabs>
    </div>
  );
}

const card = "rounded-3xl border bg-card shadow-card p-5";

function Portfolio() {
  const { data } = useQuery({ queryKey: ["chain"], queryFn: async () => (await supabase.rpc("chain_overview")).data ?? [] });
  const totals = (data ?? []).reduce((a, h) => ({ rooms: a.rooms + h.rooms, occupied: a.occupied + h.occupied, revenue: a.revenue + Number(h.revenue) }), { rooms: 0, occupied: 0, revenue: 0 });
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3">{[[Building2,"Active properties",data?.filter(h=>h.status==="active").length ?? 0],[BedDouble,"Portfolio occupancy",totals.rooms ? `${Math.round(totals.occupied/totals.rooms*100)}%` : "0%"],[IndianRupee,"Revenue · 30 days",`₹${totals.revenue.toLocaleString("en-IN")}`]].map(([I,l,v])=>{const Icon=I as typeof Building2;return <div key={l as string} className={card}><Icon className="size-5 text-primary"/><div className="mt-4 text-2xl font-bold">{v as string}</div><div className="text-sm text-muted-foreground">{l as string}</div></div>})}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data?.map(h=><div key={h.id} className={card}><div className="flex justify-between"><div><b>{h.name}</b><div className="text-sm text-muted-foreground">{h.city || "City not set"}</div></div><span className={`h-fit rounded-full px-2 py-1 text-xs ${h.status==="active"?"bg-success/10 text-success":"bg-destructive/10 text-destructive"}`}>{h.status}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{width:`${h.rooms?Math.round(h.occupied/h.rooms*100):0}%`}}/></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{h.occupied}/{h.rooms} occupied</span><span>{h.manager || "Manager unassigned"}</span></div></div>)}</div></div>;
}

function Insights({ data }: { data: { name: string; rooms: number; occupied: number; revenue: number; rating: number | null }[] }) {
  if (!data.length) return null;
  const by = [...data].sort((a, b) => Number(b.revenue) - Number(a.revenue));
  const { data: alerts } = useQuery({ queryKey: ["chain-alerts"], queryFn: async () => (await supabase.from("alerts").select("id,message,kind,created_at,hotels(name)").order("created_at", { ascending: false }).limit(8)).data ?? [] });
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className={card}><Trophy className="size-5 text-warning" /><div className="mt-3 text-sm text-muted-foreground">Top performer</div><div className="text-lg font-bold">{by[0]?.name}</div><div className="text-sm">₹{Number(by[0]?.revenue ?? 0).toLocaleString("en-IN")} · ★ {by[0]?.rating ?? "—"}</div></div>
      <div className={card}><TrendingDown className="size-5 text-destructive" /><div className="mt-3 text-sm text-muted-foreground">Needs attention</div><div className="text-lg font-bold">{by[by.length - 1]?.name}</div><div className="text-sm">₹{Number(by[by.length - 1]?.revenue ?? 0).toLocaleString("en-IN")} · {by[by.length - 1]?.occupied}/{by[by.length - 1]?.rooms} occupied</div></div>
      <div className={card}><div className="mb-2 flex items-center gap-2 font-semibold"><Bell className="size-4 text-primary" />Chain alerts</div><div className="max-h-40 space-y-1 overflow-y-auto text-xs">{alerts?.map((a) => <div key={a.id} className="rounded-lg bg-secondary px-2 py-1"><b>{(a.hotels as { name: string } | null)?.name}</b> · {a.message}</div>)}{!alerts?.length && <p className="text-muted-foreground">No alerts.</p>}</div></div>
    </div>
  );
}

const AUTOS: [string, string, string][] = [
  ["overdue", "Overdue check-out alerts", "Warn when a guest stays past check-out"],
  ["escalate", "Escalate slow cleaning", "Alert when cleaning waits over 2 hours"],
  ["daily_refresh", "Daily room refresh", "Create a cleaning task for occupied rooms every morning"],
  ["low_supply", "Low supply alerts", "Warn when stock drops below minimum"],
  ["food_sla", "Food order SLA", "Alert when an order isn't accepted in 10 minutes"],
  ["backup", "Nightly backup", "Save a copy of chain data every night"],
  ["revenue_summary", "Daily revenue summary", "Post today's revenue to managers at 10 PM"],
];
function Automations() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["auto-hotels"], queryFn: async () => (await supabase.from("hotels").select("id,name,city,automations" as "*").order("name")).data as unknown as { id: string; name: string; city: string | null; automations: Record<string, boolean> }[] ?? [] });
  const set = async (id: string, cur: Record<string, boolean>, k: string, v: boolean) => {
    const { error } = await supabase.from("hotels").update({ automations: { ...cur, [k]: v } } as never).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Automation updated"); qc.invalidateQueries({ queryKey: ["auto-hotels"] }); }
  };
  const allOn = async (on: boolean) => {
    for (const h of data ?? []) await supabase.from("hotels").update({ automations: Object.fromEntries(AUTOS.map(([k]) => [k, on])) } as never).eq("id", h.id);
    toast.success(on ? "All automations on" : "All automations paused"); qc.invalidateQueries({ queryKey: ["auto-hotels"] });
  };
  const runNow = async () => {
    const { error } = await supabase.rpc("run_automations");
    if (error) toast.error(error.message); else { toast.success("Automations ran — check alerts"); qc.invalidateQueries(); }
  };
  return (
    <div className="space-y-5">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div><div className="flex items-center gap-2 font-bold"><Zap className="size-4 text-primary" />Automation engine</div><p className="text-sm text-muted-foreground">Runs every few minutes for every hotel. Turn rules on or off per branch.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => allOn(false)}>Pause all</Button><Button variant="outline" onClick={() => allOn(true)}>Enable all</Button><Button onClick={runNow}><Play /> Run now</Button></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {data?.map((h) => (
          <div key={h.id} className={card}>
            <h3 className="font-bold">{h.name}</h3><p className="mb-3 text-sm text-muted-foreground">{h.city}</p>
            <div className="space-y-2">{AUTOS.map(([k, l, d]) => (
              <label key={k} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><span><span className="font-medium">{l}</span><span className="block text-xs text-muted-foreground">{d}</span></span><Switch checked={h.automations?.[k] ?? true} onCheckedChange={(v) => set(h.id, h.automations ?? {}, k, v)} /></label>
            ))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PERMS: [string,string][] = [["bookings","Create bookings"],["checkout","Check-out and bills"],["undo_checkout","Undo check-out"],["room_rates","Edit room prices"],["rooms","Manage rooms"],["menu","Manage menu"],["food_tax","Change food GST"],["staff","Manage staff"],["reviews","View reviews"],["reports","View reports"],["settings","Hotel settings"]];
function Permissions() {
  const qc=useQueryClient();
  const {data}=useQuery({queryKey:["permission-hotels"],queryFn:async()=>(await supabase.from("hotels").select("id,name,city,manager_perms").order("name")).data??[]});
  const set=async(id:string,current:Record<string,boolean>,key:string,on:boolean)=>{const next={...Object.fromEntries(PERMS.map(([k])=>[k,current?.[k]??true])),[key]:on};const {error}=await supabase.rpc("set_manager_permissions",{_hotel:id,_permissions:next});if(error)toast.error(error.message);else{toast.success("Manager access updated");qc.invalidateQueries({queryKey:["permission-hotels"]});}};
  return <div className="grid gap-5 lg:grid-cols-2">{data?.map(h=>{const p=h.manager_perms as Record<string,boolean>;return <div key={h.id} className={card}><div className="mb-4"><h3 className="font-bold">{h.name}</h3><p className="text-sm text-muted-foreground">{h.city} · Backend-enforced access</p></div><div className="grid gap-2 sm:grid-cols-2">{PERMS.map(([k,l])=><label key={k} className="flex items-center justify-between rounded-xl border p-3 text-sm"><span>{l}</span><Switch checked={p?.[k]??true} onCheckedChange={v=>set(h.id,p,k,v)}/></label>)}</div></div>})}</div>;
}

function Hotels() {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", city: "", address: "", phone: "" });
  const [dept, setDept] = useState<Record<string, string>>({});
  const { data } = useQuery({
    queryKey: ["admin-hotels"],
    queryFn: async () => (await supabase.from("hotels").select("*, departments(*)").order("created_at")).data ?? [],
  });
  const add = async () => {
    if (!f.name.trim()) return toast.error("Name required");
    const { data: h, error } = await supabase.from("hotels").insert(f).select("id").single();
    if (error) return toast.error(error.message);
    await supabase.from("departments").insert([
      { hotel_id: h.id, name: "Housekeeping", kind: "cleaning" },
      { hotel_id: h.id, name: "Kitchen & Food", kind: "food" },
      { hotel_id: h.id, name: "Front Desk", kind: "other" },
      { hotel_id: h.id, name: "Maintenance", kind: "other" },
    ]);
    setF({ name: "", city: "", address: "", phone: "" });
    qc.invalidateQueries();
    toast.success("Hotel + default departments created");
  };
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className={card + " space-y-3"}>
        <h3 className="font-semibold">Add hotel branch</h3>
        {(["name", "city", "address", "phone"] as const).map((k) => (
          <div key={k}><Label className="capitalize">{k}</Label><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        <Button variant="neon" className="w-full" onClick={add}><Plus /> Create</Button>
      </div>
      <div className="space-y-4 lg:col-span-2">
        {(data ?? []).map((h) => (
          <div key={h.id} className={card}>
            <div className="flex justify-between">
              <div><div className="font-display text-lg font-bold">{h.name}</div><div className="text-sm text-muted-foreground">{h.city} · {h.address}</div></div>
              <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete hotel and all its data?")) { await supabase.from("hotels").delete().eq("id", h.id); qc.invalidateQueries(); } }}><Trash2 /></Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {h.departments.map((d) => <span key={d.id} className="rounded-full bg-secondary px-3 py-1 text-xs">{d.name} · {d.kind}</span>)}
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="New department" value={dept[h.id] ?? ""} onChange={(e) => setDept({ ...dept, [h.id]: e.target.value })} />
              <Button variant="outline" onClick={async () => {
                if (!dept[h.id]?.trim()) return;
                await supabase.from("departments").insert({ hotel_id: h.id, name: dept[h.id].trim() });
                setDept({ ...dept, [h.id]: "" }); qc.invalidateQueries();
              }}>Add</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Staff() {
  const qc = useQueryClient();
  const create = useServerFn(createStaffUser);
  const [f, setF] = useState({ email: "", password: "", full_name: "", role: "manager", hotel_id: "", department_id: "" });
  const [busy, setBusy] = useState(false);
  const { data: hotels } = useQuery({ queryKey: ["admin-hotels"], queryFn: async () => (await supabase.from("hotels").select("*, departments(*)")).data ?? [] });
  const { data: people } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([supabase.from("profiles").select("*, hotels(name), departments(name)"), supabase.from("user_roles").select("*")]);
      return (p ?? []).map((x) => ({ ...x, roles: (r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role) }));
    },
  });
  const depts = hotels?.find((h) => h.id === f.hotel_id)?.departments ?? [];
  const submit = async () => {
    setBusy(true);
    try {
      await create({ data: { ...f, role: f.role as "manager", hotel_id: f.hotel_id || null, department_id: f.department_id || null } });
      toast.success("User created — they can sign in now");
      setF({ email: "", password: "", full_name: "", role: "manager", hotel_id: "", department_id: "" });
      qc.invalidateQueries({ queryKey: ["people"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className={card + " space-y-3"}>
        <h3 className="font-semibold">Create manager / staff</h3>
        <div><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Password</Label><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div><Label>Role</Label>
          <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["manager", "staff", "admin"].map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Hotel</Label>
          <Select value={f.hotel_id} onValueChange={(v) => setF({ ...f, hotel_id: v, department_id: "" })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{(hotels ?? []).map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select>
        </div>
        {f.role === "staff" && (
          <div><Label>Department</Label>
            <Select value={f.department_id} onValueChange={(v) => setF({ ...f, department_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          </div>
        )}
        <Button variant="neon" className="w-full" disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create user"}</Button>
      </div>
      <div className={card + " lg:col-span-2"}>
        <h3 className="mb-3 font-semibold">Team</h3>
        <div className="divide-y">
          {(people ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3 text-sm">
              <div><div className="font-medium">{p.full_name ?? p.email}</div><div className="text-xs text-muted-foreground">{p.email} · {p.hotels?.name ?? "—"} {p.departments?.name ? `· ${p.departments.name}` : ""}</div></div>
              <div className="flex gap-1">{p.roles.length ? p.roles.map((r) => <span key={r} className="rounded-full bg-neon px-2.5 py-0.5 text-xs capitalize">{r}</span>) : <span className="text-xs text-warning">no role</span>}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tax() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("business_settings").select("*").eq("id", 1).single()).data });
  const [f, setF] = useState({ business_name: "", gst_number: "", address: "", upi_id: "", cgst_rate: "6", sgst_rate: "6" });
  useEffect(() => {
    if (data) setF({ business_name: data.business_name, gst_number: data.gst_number ?? "", address: data.address ?? "", upi_id: data.upi_id ?? "", cgst_rate: String(data.cgst_rate), sgst_rate: String(data.sgst_rate) });
  }, [data]);
  const save = async () => {
    if (f.gst_number && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gst_number.toUpperCase())) return toast.error("Invalid GSTIN format");
    const { error } = await supabase.from("business_settings").update({ ...f, gst_number: f.gst_number.toUpperCase() || null, cgst_rate: Number(f.cgst_rate), sgst_rate: Number(f.sgst_rate), updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] });
  };
  return (
    <div className={card + " grid max-w-2xl gap-4 sm:grid-cols-2"}>
      <div className="sm:col-span-2"><Label>Business name</Label><Input value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} /></div>
      <div><Label>GSTIN</Label><Input value={f.gst_number} placeholder="27ABCDE1234F1Z5" onChange={(e) => setF({ ...f, gst_number: e.target.value.toUpperCase() })} /></div>
      <div><Label>UPI ID (bill QR)</Label><Input value={f.upi_id} placeholder="hotel@upi" onChange={(e) => setF({ ...f, upi_id: e.target.value })} /></div>
      <div><Label>CGST %</Label><Input type="number" step="0.5" value={f.cgst_rate} onChange={(e) => setF({ ...f, cgst_rate: e.target.value })} /></div>
      <div><Label>SGST %</Label><Input type="number" step="0.5" value={f.sgst_rate} onChange={(e) => setF({ ...f, sgst_rate: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label>Registered address</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div className="text-sm text-muted-foreground sm:col-span-2">Total GST: <b className="text-foreground">{Number(f.cgst_rate) + Number(f.sgst_rate)}%</b></div>
      <Button variant="neon" onClick={save}>Save settings</Button>
    </div>
  );
}

function Offers() {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", code: "", discount_pct: "10" });
  const { data } = useQuery({ queryKey: ["offers"], queryFn: async () => (await supabase.from("offers").select("*").order("created_at", { ascending: false })).data ?? [] });
  const add = async () => {
    if (!f.title || !f.code) return toast.error("Title & code required");
    const { error } = await supabase.from("offers").insert({ title: f.title, code: f.code.toUpperCase(), discount_pct: Number(f.discount_pct) });
    if (error) return toast.error(error.message);
    setF({ title: "", code: "", discount_pct: "10" }); qc.invalidateQueries();
  };
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className={card + " space-y-3"}>
        <img src={clayOffer} alt="" width={1024} height={1024} loading="lazy" className="mx-auto h-28 animate-float" />
        <h3 className="font-semibold">New offer</h3>
        <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><Label>Code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
        <div><Label>Discount %</Label><Input type="number" value={f.discount_pct} onChange={(e) => setF({ ...f, discount_pct: e.target.value })} /></div>
        <Button variant="neon" className="w-full" onClick={add}>Create offer</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
        {(data ?? []).map((o) => (
          <div key={o.id} className="relative overflow-hidden rounded-3xl bg-aurora p-5 text-primary-foreground">
            <div className="font-display text-4xl font-extrabold">{o.discount_pct}%</div>
            <div className="font-semibold">{o.title}</div>
            <div className="mt-1 inline-block rounded-full bg-background/30 px-3 py-0.5 font-mono text-xs">{o.code}</div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm"><Switch checked={o.active} onCheckedChange={async (v) => { await supabase.from("offers").update({ active: v }).eq("id", o.id); qc.invalidateQueries(); }} /> {o.active ? "Active" : "Off"}</div>
              <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("offers").delete().eq("id", o.id); qc.invalidateQueries(); }}><Trash2 /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Fields() {
  const qc = useQueryClient();
  const [f, setF] = useState({ label: "", field_type: "text", options: "", required: false });
  const { data } = useQuery({ queryKey: ["fields-all"], queryFn: async () => (await supabase.from("onboarding_fields").select("*").order("sort")).data ?? [] });
  const add = async () => {
    if (!f.label.trim()) return;
    const key = f.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
    const { error } = await supabase.from("onboarding_fields").insert({
      key, label: f.label.trim(), field_type: f.field_type, required: f.required, sort: (data?.length ?? 0) + 1,
      options: f.field_type === "select" ? f.options.split(",").map((s) => s.trim()).filter(Boolean) : null,
    });
    if (error) return toast.error(error.message);
    setF({ label: "", field_type: "text", options: "", required: false }); qc.invalidateQueries();
  };
  const upd = async (id: string, patch: { required?: boolean; enabled?: boolean }) => { await supabase.from("onboarding_fields").update(patch).eq("id", id); qc.invalidateQueries(); };
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className={card + " space-y-3"}>
        <h3 className="font-semibold">Add check-in field</h3>
        <p className="text-xs text-muted-foreground">Name, age, gender, mobile, Aadhaar and address remain standard. Add any extra fields here.</p>
        <div><Label>Label</Label><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></div>
        <div><Label>Format</Label>
          <Select value={f.field_type} onValueChange={(v) => setF({ ...f, field_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["text", "number", "email", "date", "tel", "select"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        </div>
        {f.field_type === "select" && <div><Label>Options (comma separated)</Label><Input value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} /></div>}
        <div className="flex items-center gap-2 text-sm"><Switch checked={f.required} onCheckedChange={(v) => setF({ ...f, required: v })} /> Required</div>
        <Button variant="neon" className="w-full" onClick={add}>Add field</Button>
      </div>
      <div className={card + " lg:col-span-2"}>
        <div className="divide-y">
          {(data ?? []).map((x) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div><div className="font-medium">{x.label}</div><div className="text-xs text-muted-foreground">{x.field_type}{x.options ? ` · ${x.options.join(", ")}` : ""}</div></div>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5"><Switch checked={x.required} onCheckedChange={(v) => upd(x.id, { required: v })} />Required</label>
                <label className="flex items-center gap-1.5"><Switch checked={x.enabled} onCheckedChange={(v) => upd(x.id, { enabled: v })} />Enabled</label>
                <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("onboarding_fields").delete().eq("id", x.id); qc.invalidateQueries(); }}><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Backups() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["backups"], queryFn: async () => (await supabase.from("backups").select("id,created_at,row_counts").order("created_at", { ascending: false }).limit(30)).data ?? [] });
  const run = async () => {
    const { error } = await supabase.rpc("run_backup");
    if (error) return toast.error(error.message);
    toast.success("Backup ready"); qc.invalidateQueries({ queryKey: ["backups"] });
  };
  const download = async (id: string) => {
    const { data: b } = await supabase.from("backups").select("payload,created_at").eq("id", id).single();
    if (!b) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(b.payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `backup-${b.created_at}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4"><img src={clayBackup} alt="" width={1024} height={1024} loading="lazy" className="h-20" /><div><h3 className="font-semibold">Automatic backups</h3><p className="text-xs text-muted-foreground">Runs nightly at 2:00 AM IST and retains the latest 30 days.</p></div></div>
        <Button variant="neon" onClick={run}><DatabaseBackup /> Backup now</Button>
      </div>
      <div className="divide-y">
        {(data ?? []).map((b) => (
          <div key={b.id} className="flex items-center justify-between py-3 text-sm">
            <div><div className="font-medium">{format(new Date(b.created_at), "dd MMM yyyy, HH:mm")}</div>
              <div className="text-xs text-muted-foreground">{Object.entries(b.row_counts as Record<string, number>).map(([k, v]) => `${k}: ${v}`).join(" · ")}</div></div>
            <Button size="sm" variant="outline" onClick={() => download(b.id)}><Download /> JSON</Button>
          </div>
        ))}
        {!data?.length && <p className="py-6 text-center text-sm text-muted-foreground">No backups yet.</p>}
      </div>
    </div>
  );
}

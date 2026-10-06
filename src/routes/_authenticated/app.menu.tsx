import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Pencil, Plus, Trash2, UtensilsCrossed, Search, Sparkles, Percent, Eye, EyeOff, X, Leaf, Drumstick, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, useHotel, useLive } from "@/lib/me";
import { DEMO_MENU, useMenuImage } from "@/lib/menu-image";
import { NoHotel } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import foodFallback from "@/assets/stayos-food-2026.jpg";

export const Route = createFileRoute("/_authenticated/app/menu")({
  head: () => ({ meta: [{ title: "Menu Studio — StayOS" }, { name: "robots", content: "noindex" }] }),
  component: MenuEditor,
});
type Form = { id?: string; name: string; category: string; description: string; price: string; veg: boolean; available: boolean; image_url?: string | null };
const blank: Form = { name: "", category: "Mains", description: "", price: "", veg: true, available: true };
type Item = { id: string; name: string; category: string; description: string | null; price: number; veg: boolean; available: boolean; image_url: string | null };

function MenuEditor() {
  const { hotelId } = useHotel(); const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState("All"); const [q, setQ] = useState(""); const [diet, setDiet] = useState<"all" | "veg" | "nonveg">("all");
  const [tax, setTax] = useState("5");
  useLive(["menu_items"], [["menu", hotelId ?? ""]]);
  const { data: menu = [] } = useQuery({ queryKey: ["menu", hotelId ?? ""], enabled: !!hotelId, queryFn: async () => ((await supabase.from("menu_items").select("*").eq("hotel_id", hotelId!).order("category").order("name")).data ?? []) as Item[] });
  const { data: hotel } = useQuery({ queryKey: ["menu-hotel", hotelId ?? ""], enabled: !!hotelId, queryFn: async () => (await supabase.from("hotels").select("food_gst_rate").eq("id", hotelId!).single()).data });
  useEffect(() => { if (hotel) setTax(String(hotel.food_gst_rate)); }, [hotel]);
  if (!hotelId) return <NoHotel />;
  const cats = ["All", ...Array.from(new Set(menu.map((m) => m.category)))];
  const list = menu.filter((m) => (cat === "All" || m.category === cat) && (diet === "all" || (diet === "veg" ? m.veg : !m.veg)) && m.name.toLowerCase().includes(q.toLowerCase()));
  const live = menu.filter((m) => m.available).length;
  const avg = menu.length ? menu.reduce((a, m) => a + Number(m.price), 0) / menu.length : 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["menu"] });

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !(Number(form.price) >= 0) || form.price === "") return toast.error("Enter an item name and a valid price");
    setBusy(true);
    try {
      let image_url = form.image_url ?? null;
      if (file) {
        if (!file.type.startsWith("image/") || file.size > 5_000_000) throw new Error("Choose a JPG, PNG or WebP under 5 MB");
        const path = `${hotelId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error } = await supabase.storage.from("menu-images").upload(path, file, { contentType: file.type });
        if (error) throw error; image_url = path;
      }
      const row = { hotel_id: hotelId, name: form.name.trim().slice(0, 80), category: form.category.trim().slice(0, 40) || "Mains", description: form.description.trim().slice(0, 300) || null, price: Number(form.price), veg: form.veg, available: form.available, image_url };
      const { error } = form.id ? await supabase.from("menu_items").update(row).eq("id", form.id) : await supabase.from("menu_items").insert(row);
      if (error) throw error;
      toast.success(form.id ? "Item updated" : "Item added"); setForm(null); setFile(null); refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const toggle = async (m: Item) => { const { error } = await supabase.from("menu_items").update({ available: !m.available }).eq("id", m.id); if (error) toast.error(error.message); else refresh(); };
  const bulk = async (available: boolean) => { const ids = list.map((m) => m.id); if (!ids.length) return; const { error } = await supabase.from("menu_items").update({ available }).in("id", ids); if (error) toast.error(error.message); else { toast.success(`${ids.length} items ${available ? "live" : "paused"}`); refresh(); } };
  const addDemo = async () => {
    const have = new Set(menu.map((m) => m.name));
    const rows = DEMO_MENU.filter((d) => !have.has(d.name)).map((d) => ({ ...d, hotel_id: hotelId, available: true }));
    if (!rows.length) return toast.info("Demo dishes are already on your menu");
    const { error } = await supabase.from("menu_items").insert(rows); if (error) toast.error(error.message); else { toast.success(`${rows.length} dishes added with photos`); refresh(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">Food & service</p><h1 className="font-display text-3xl font-bold">Menu Studio</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addDemo}><Wand2 /> Add sample dishes</Button>
          <Button onClick={() => { setForm(blank); setFile(null); }}><Plus /> New item</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={UtensilsCrossed} label="Items on menu" value={String(menu.length)} />
        <Stat icon={Eye} label="Live for guests" value={`${live}`} tone="success" />
        <Stat icon={Sparkles} label="Average price" value={inr(Math.round(avg))} />
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-warning/12 text-warning"><Percent className="size-5" /></span><div className="text-xs text-muted-foreground">GST on food</div></div>
          <div className="mt-2 flex gap-2"><Input className="h-9 w-20" type="number" min={0} max={28} step={0.5} value={tax} onChange={(e) => setTax(e.target.value)} />
            <Button size="sm" variant="outline" onClick={async () => { const v = Number(tax); if (!(v >= 0 && v <= 28)) return toast.error("0–28%"); const { error } = await supabase.from("hotels").update({ food_gst_rate: v }).eq("id", hotelId); error ? toast.error(error.message) : toast.success("Food tax saved"); }}>Save</Button></div>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center gap-2 border-b pb-4">
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${cat === c ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>{c}</button>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-10 rounded-xl pl-9" placeholder="Search menu items…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex rounded-xl bg-secondary p-1">{(["all", "veg", "nonveg"] as const).map((d) => <button key={d} onClick={() => setDiet(d)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${diet === d ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{d === "all" ? "All" : d === "veg" ? "Veg" : "Non-veg"}</button>)}</div>
          <Button variant="outline" size="sm" className="h-10" onClick={() => bulk(true)}><Eye /> Show all</Button>
          <Button variant="outline" size="sm" className="h-10" onClick={() => bulk(false)}><EyeOff /> Pause all</Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {list.map((m) => <ItemCard key={m.id} m={m} onEdit={() => { setForm({ ...m, price: String(m.price), description: m.description ?? "" }); setFile(null); }} onToggle={() => toggle(m)} />)}
        </div>
        {!list.length && (
          <div className="py-14 text-center"><UtensilsCrossed className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">{menu.length ? "Nothing matches these filters" : "Your menu is empty"}</p>
            {!menu.length && <Button className="mt-4" variant="outline" onClick={addDemo}><Wand2 /> Add 15 sample dishes with photos</Button>}</div>
        )}
      </div>

      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>{form?.id ? "Edit item" : "New item"}</SheetTitle></SheetHeader>
          {form && (
            <div className="mt-4 space-y-4 px-4 pb-6">
              <label className="relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-dashed bg-secondary">
                {file ? <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover" /> : form.image_url ? <Img path={form.image_url} cls="size-full object-contain p-4" /> : <div className="grid size-full place-items-center text-sm text-muted-foreground"><div className="text-center"><ImagePlus className="mx-auto mb-2 size-8" />Tap to add a photo</div></div>}
                <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <F l="Item name"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Paneer tikka bowl" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F l="Category"><Input list="menu-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><datalist id="menu-cats">{cats.slice(1).map((c) => <option key={c} value={c} />)}</datalist></F>
                <F l="Price (₹)"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="249" /></F>
              </div>
              <F l="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ingredients or serving details" /></F>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm">Vegetarian<Switch checked={form.veg} onCheckedChange={(v) => setForm({ ...form, veg: v })} /></label>
                <label className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm">Available<Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} /></label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" disabled={busy} onClick={save}>{busy ? "Saving…" : form.id ? "Save changes" : "Add item"}</Button>
                {form.id && <Button variant="outline" className="text-destructive" onClick={async () => { if (!confirm("Delete this item?")) return; await supabase.from("menu_items").delete().eq("id", form.id!); setForm(null); refresh(); }}><Trash2 /></Button>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ItemCard({ m, onEdit, onToggle }: { m: Item; onEdit: () => void; onToggle: () => void }) {
  return (
    <div className={`group relative rounded-2xl border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] ${m.available ? "" : "opacity-60"}`}>
      <span className={`absolute left-3 top-3 z-10 grid size-5 place-items-center rounded-md border-2 bg-card ${m.veg ? "border-success text-success" : "border-destructive text-destructive"}`}>{m.veg ? <Leaf className="size-3" /> : <Drumstick className="size-3" />}</span>
      <button onClick={onToggle} className="absolute right-3 top-3 z-10 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-bold shadow-sm" aria-label="Toggle availability">{m.available ? <span className="text-success">LIVE</span> : <span className="text-muted-foreground">PAUSED</span>}</button>
      <div className="aspect-square overflow-hidden rounded-xl bg-secondary/40"><Img path={m.image_url} cls="size-full object-contain p-2 transition duration-500 group-hover:scale-105" /></div>
      <div className="mt-2.5 truncate text-sm font-semibold">{m.name}</div>
      <div className="flex items-center justify-between"><span className="font-display text-sm font-bold text-primary">{inr(Number(m.price))}</span>
        <button onClick={onEdit} className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary transition hover:bg-primary hover:text-primary-foreground" aria-label={`Edit ${m.name}`}><Pencil className="size-3.5" /></button></div>
    </div>
  );
}
function Img({ path, cls }: { path: string | null; cls: string }) {
  const src = useMenuImage(path);
  return <img src={src ?? foodFallback} alt="" loading="lazy" className={cls} />;
}
function Stat({ icon: I, label, value, tone }: { icon: typeof X; label: string; value: string; tone?: "success" }) {
  return <div className="rounded-2xl border bg-card p-4 shadow-card"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl ${tone ? "bg-success/12 text-success" : "bg-primary/10 text-primary"}`}><I className="size-5" /></span><div><div className="text-xs text-muted-foreground">{label}</div><div className="font-display text-xl font-bold">{value}</div></div></div></div>;
}
function F({ l, children }: { l: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{l}</Label>{children}</div>; }

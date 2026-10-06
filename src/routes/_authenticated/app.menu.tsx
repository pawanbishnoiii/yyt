import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, useHotel, useLive } from "@/lib/me";
import { NoHotel, PageTitle, Panel } from "@/components/NoHotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import foodFallback from "@/assets/stayos-food-2026.jpg";

export const Route = createFileRoute("/_authenticated/app/menu")({ component: MenuEditor });
type Form = { id?: string; name: string; category: string; description: string; price: string; veg: boolean; available: boolean; image_url?: string | null };
const blank: Form = { name: "", category: "Mains", description: "", price: "", veg: true, available: true };

function MenuEditor() {
  const { hotelId } = useHotel(); const qc = useQueryClient();
  const [form, setForm] = useState<Form>(blank); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  useLive(["menu_items", "hotels"], [["menu", hotelId ?? ""]]);
  const { data: menu } = useQuery({ queryKey: ["menu", hotelId ?? ""], enabled: !!hotelId, queryFn: async () => (await supabase.from("menu_items").select("*").eq("hotel_id", hotelId!).order("category").order("name")).data ?? [] });
  const { data: hotel } = useQuery({ queryKey: ["menu-hotel", hotelId ?? ""], enabled: !!hotelId, queryFn: async () => (await supabase.from("hotels").select("food_gst_rate").eq("id", hotelId!).single()).data });
  if (!hotelId) return <NoHotel />;
  const save = async () => {
    if (!form.name.trim() || Number(form.price) < 0) return toast.error("Enter an item name and valid price");
    setBusy(true);
    try {
      let image_url = form.image_url ?? null;
      if (file) {
        if (!file.type.startsWith("image/") || file.size > 5_000_000) throw new Error("Choose a JPG, PNG or WebP under 5 MB");
        const path = `${hotelId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error } = await supabase.storage.from("menu-images").upload(path, file, { contentType: file.type });
        if (error) throw error; image_url = path;
      }
      const row = { hotel_id: hotelId, name: form.name.trim(), category: form.category.trim() || "Mains", description: form.description.trim() || null, price: Number(form.price), veg: form.veg, available: form.available, image_url };
      const q = form.id ? supabase.from("menu_items").update(row).eq("id", form.id) : supabase.from("menu_items").insert(row);
      const { error } = await q; if (error) throw error;
      toast.success(form.id ? "Menu item updated" : "Menu item added"); setForm(blank); setFile(null); qc.invalidateQueries({ queryKey: ["menu"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return <div>
    <PageTitle title="Menu studio" sub="Create the room-service menu, set availability and control food tax." />
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Panel title={form.id ? "Edit menu item" : "Add menu item"}>
        <div className="space-y-3">
          <F l="Item name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Paneer tikka bowl" /></F>
          <div className="grid grid-cols-2 gap-3"><F l="Category"><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></F><F l="Price"><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="249" /></F></div>
          <F l="Description"><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ingredients or serving details" /></F>
          <F l="Food photo"><label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed p-3 text-sm text-muted-foreground"><ImagePlus className="size-4" />{file?.name ?? "Upload JPG, PNG or WebP"}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label></F>
          <div className="flex justify-between rounded-2xl bg-muted/60 p-3 text-sm"><label className="flex items-center gap-2"><Switch checked={form.veg} onCheckedChange={v => setForm({ ...form, veg: v })} />Vegetarian</label><label className="flex items-center gap-2"><Switch checked={form.available} onCheckedChange={v => setForm({ ...form, available: v })} />Available</label></div>
          <div className="flex gap-2"><Button className="flex-1" disabled={busy} onClick={save}><Plus />{busy ? "Saving…" : form.id ? "Save changes" : "Add item"}</Button>{form.id && <Button variant="outline" onClick={() => setForm(blank)}>Cancel</Button>}</div>
        </div>
      </Panel>
      <div className="space-y-5">
        <Panel title="Food tax"><div className="flex flex-wrap items-end gap-3"><F l="GST on food (%)"><Input className="w-40" type="number" min="0" max="28" step="0.5" defaultValue={hotel?.food_gst_rate ?? 5} id="food-tax" /></F><Button variant="outline" onClick={async () => { const el = document.getElementById("food-tax") as HTMLInputElement; const { error } = await supabase.from("hotels").update({ food_gst_rate: Number(el.value) }).eq("id", hotelId); error ? toast.error(error.message) : toast.success("Food tax updated"); }}>Save tax</Button><p className="pb-2 text-xs text-muted-foreground">Split equally into CGST and SGST on the final bill.</p></div></Panel>
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{menu?.map(m => <div key={m.id} className="overflow-hidden rounded-3xl border bg-card shadow-card"><MenuImage path={m.image_url} /><div className="p-4"><div className="flex justify-between gap-3"><div><div className="font-bold">{m.name}</div><div className="text-xs text-muted-foreground">{m.category} · {m.veg ? "Veg" : "Non-veg"}</div></div><b>{inr(Number(m.price))}</b></div><p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{m.description || "No description"}</p><div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => setForm({ ...m, price: String(m.price), description: m.description ?? "" })}><Pencil />Edit</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await supabase.from("menu_items").delete().eq("id", m.id); qc.invalidateQueries({ queryKey: ["menu"] }); }}><Trash2 /></Button><span className={`ml-auto rounded-full px-2 py-1 text-[10px] font-bold ${m.available ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{m.available ? "LIVE" : "PAUSED"}</span></div></div></div>)}</div>
        {!menu?.length && <div className="rounded-3xl border border-dashed p-12 text-center"><UtensilsCrossed className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">Your menu is ready for its first item</p><p className="text-sm text-muted-foreground">Add a photo, price and food tax from the editor.</p></div>}
      </div>
    </div>
  </div>;
}
function F({ l, children }: { l: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{l}</Label>{children}</div>; }
function MenuImage({ path }: { path: string | null }) {
  const { data } = useQuery({ queryKey: ["menu-image", path], enabled: !!path, staleTime: 50 * 60_000, queryFn: async () => (await supabase.storage.from("menu-images").createSignedUrl(path!, 3600)).data?.signedUrl });
  return <img src={data ?? foodFallback} alt="" width={1200} height={1200} loading="lazy" className="h-40 w-full object-cover" />;
}
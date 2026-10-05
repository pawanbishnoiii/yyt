import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PREFS } from "@/components/FastCheckin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function GuestPrefs({ guestId }: { guestId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["guest-prefs", guestId],
    queryFn: async () => (await supabase.from("guests").select("preferences,stay_notes").eq("id", guestId).single()).data,
  });
  const [prefs, setPrefs] = useState<string[]>([]);
  const [note, setNote] = useState("");
  useEffect(() => { if (data) { setPrefs(data.preferences ?? []); setNote(data.stay_notes ?? ""); } }, [data]);
  const save = async () => {
    const { error } = await supabase.from("guests").update({ preferences: prefs, stay_notes: note.slice(0, 300) || null }).eq("id", guestId);
    if (error) return toast.error(error.message);
    toast.success("Preferences saved"); qc.invalidateQueries({ queryKey: ["guests"] });
  };
  return (
    <div className="rounded-2xl bg-secondary p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stay preferences & needs</div>
      <div className="flex flex-wrap gap-1.5">
        {PREFS.map((p) => {
          const on = prefs.includes(p);
          return <button key={p} onClick={() => setPrefs(on ? prefs.filter((x) => x !== p) : [...prefs, p])}
            className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{p}</button>;
        })}
      </div>
      <Textarea className="mt-2 bg-card" rows={2} maxLength={300} placeholder="Allergies, celebrations, special requests…" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button size="sm" variant="neon" className="mt-2" onClick={save}>Save preferences</Button>
    </div>
  );
}

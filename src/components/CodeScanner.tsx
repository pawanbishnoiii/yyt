import { useEffect, useId, useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Camera dialog that reads QR codes and barcodes; also allows typing a code. */
export function CodeScanner({ open, onOpenChange, onResult, title = "Scan code", hint = "Point the camera at the code" }: {
  open: boolean; onOpenChange: (o: boolean) => void; onResult: (text: string) => void; title?: string; hint?: string;
}) {
  const id = "scan-" + useId().replace(/:/g, "");
  const ref = useRef<{ stop: () => Promise<void>; isScanning?: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setErr(null); setStarting(true);
    const t = setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !document.getElementById(id)) return;
        const s = new Html5Qrcode(id);
        ref.current = s;
        await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => {
          if (navigator.vibrate) navigator.vibrate(80);
          s.stop().catch(() => {}); ref.current = null;
          onOpenChange(false); onResult(text);
        }, () => {});
      } catch {
        setErr("Camera not available. Allow camera access, or type the code below.");
      } finally { setStarting(false); }
    }, 150);
    return () => { cancelled = true; clearTimeout(t); ref.current?.stop().catch(() => {}); ref.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Camera className="size-5 text-primary" />{title}</DialogTitle><DialogDescription>{hint}</DialogDescription></DialogHeader>
        <div className="relative overflow-hidden rounded-2xl bg-foreground/90">
          <div id={id} className="aspect-square w-full" />
          {starting && <div className="absolute inset-0 grid place-items-center text-background"><Loader2 className="animate-spin" /></div>}
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
        </div>
        {err && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { onOpenChange(false); onResult(manual.trim()); setManual(""); } }}>
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Or type the code" />
          <Button type="submit">Go</Button>
        </form>
        <Button variant="ghost" onClick={() => onOpenChange(false)}><X /> Close</Button>
      </DialogContent>
    </Dialog>
  );
}

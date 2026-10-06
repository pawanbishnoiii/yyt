import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Gift, Copy } from "lucide-react";
import { toast } from "sonner";

/** Scratch to reveal an offer code. Remembers revealed cards. */
export function ScratchCard({ title, code, pct }: { title: string; code: string; pct: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  const drawing = useRef(false);

  useEffect(() => {
    if (localStorage.getItem("scratch-" + code)) { setDone(true); return; }
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    c.width = r.width; c.height = r.height;
    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    g.addColorStop(0, "#c0c4cc"); g.addColorStop(0.5, "#e8eaee"); g.addColorStop(1, "#a9aeb8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, r.width, r.height);
    ctx.fillStyle = "#5b616e"; ctx.font = "600 14px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("✦ Scratch to reveal ✦", r.width / 2, r.height / 2 + 5);
  }, [code]);

  const scratch = (x: number, y: number) => {
    const c = ref.current; if (!c || done) return;
    const ctx = c.getContext("2d")!; const r = c.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(x - r.left, y - r.top, 18, 0, Math.PI * 2); ctx.fill();
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let clear = 0; for (let i = 3; i < d.length; i += 64) if (d[i] === 0) clear++;
    if (clear / (d.length / 64) > 0.45) { setDone(true); localStorage.setItem("scratch-" + code, "1"); if (navigator.vibrate) navigator.vibrate(60); }
  };

  return (
    <div className="relative h-36 min-w-64 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-4 text-primary-foreground shadow-[var(--shadow-soft)]">
      <div className="absolute -right-6 -top-6 size-28 rounded-full bg-primary-foreground/10" />
      <Gift className="size-5" />
      <motion.div initial={false} animate={done ? { scale: [0.9, 1.05, 1] } : {}} className="mt-2">
        <div className="text-3xl font-extrabold">{pct}% OFF</div>
        <div className="text-sm opacity-90">{title}</div>
        <button onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copied"); }} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-primary-foreground/60 px-2 py-0.5 font-mono text-sm font-bold">{code}<Copy className="size-3" /></button>
      </motion.div>
      {!done && (
        <canvas ref={ref} className="absolute inset-0 size-full cursor-pointer touch-none"
          onPointerDown={(e) => { drawing.current = true; scratch(e.clientX, e.clientY); }}
          onPointerMove={(e) => drawing.current && scratch(e.clientX, e.clientY)}
          onPointerUp={() => (drawing.current = false)} onPointerLeave={() => (drawing.current = false)} />
      )}
    </div>
  );
}

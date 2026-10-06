import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS: [string, string][] = [
  ["Ctrl K", "Search"], ["Ctrl B", "Collapse menu"], ["N", "New booking"], ["R", "Rooms"],
  ["F", "Kitchen board"], ["S", "Room service"], ["G then D", "Dashboard"], ["G then B", "Bills"], ["?", "Show this help"],
];

/** Floating, dismissible shortcut tips. Shows often until the user starts using shortcuts. */
export function KeyboardTips() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const g = useRef(0);

  useEffect(() => {
    const used = Number(localStorage.getItem("kb-used") ?? 0);
    const dismissed = Number(localStorage.getItem("kb-dismissed") ?? 0);
    // Show on most visits until 5 shortcuts used; then rarely/never.
    if (used < 5 && dismissed < 6) { const t = setTimeout(() => setOpen(true), 1800); return () => clearTimeout(t); }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable) return;
      const k = e.key.toLowerCase();
      const go = (to: string) => { e.preventDefault(); localStorage.setItem("kb-used", String(Number(localStorage.getItem("kb-used") ?? 0) + 1)); nav({ to }); };
      if (Date.now() - g.current < 900) {
        g.current = 0;
        if (k === "d") return go("/app");
        if (k === "b") return go("/app/bills");
        if (k === "g") return go("/app/guests");
      }
      if (k === "g") { g.current = Date.now(); return; }
      if (k === "n") return go("/app/book");
      if (k === "r") return go("/app/rooms");
      if (k === "f") return go("/food");
      if (k === "s") return go("/RoomService");
      if (e.key === "?") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  const close = () => { setOpen(false); localStorage.setItem("kb-dismissed", String(Number(localStorage.getItem("kb-dismissed") ?? 0) + 1)); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }}
          className="no-print fixed bottom-24 right-4 z-50 w-72 rounded-2xl border bg-card/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur md:bottom-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary"><Keyboard className="size-4" /></span>
            <div className="flex-1 text-sm font-semibold">Keyboard shortcuts</div>
            <button onClick={close} aria-label="Hide tips" className="grid size-7 place-items-center rounded-lg hover:bg-secondary"><X className="size-4" /></button>
          </div>
          <div className="space-y-1.5">
            {SHORTCUTS.map(([k, l]) => (
              <div key={k} className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{l}</span><kbd className="rounded-md border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{k}</kbd></div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Press ? anytime to bring this back.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

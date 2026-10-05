import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import {
  BedDouble, Receipt, ScanLine, ShieldCheck, Building2, DatabaseBackup, Zap, Fingerprint, ArrowRight,
  Wrench, Bell, Heart, Check, Search, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-lobby.jpg";
import suite from "@/assets/room-suite.jpg";
import clayBell from "@/assets/clay-bell.png";
import clayScan from "@/assets/clay-scan.png";
import clayBill from "@/assets/clay-bill.png";
import clayManager from "@/assets/clay-manager.png";
import clayAdmin from "@/assets/clay-admin.png";
import clayBackup from "@/assets/clay-backup.png";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StayOS — Hotel Chain Management System" },
      { name: "description", content: "Fast Aadhaar/mobile check-in, branch-wise GST invoices with UPI QR, room conditions, barcode scanning and live updates for every hotel in your chain." },
      { property: "og:title", content: "StayOS — Hotel Chain Management System" },
      { property: "og:description", content: "Run every branch of your hotel chain from one calm, fast dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { title: "8-second check-in", text: "Type a mobile or Aadhaar number. Returning guests appear instantly with their preferences — pick a room and you're done.", img: clayBell, icon: Zap },
  { title: "GST invoices per branch", text: "Each branch has its own GSTIN and CGST/SGST rates. Print-ready invoices with UPI QR codes.", img: clayBill, icon: Receipt },
  { title: "Scan, log, fix", text: "Housekeeping scans a room barcode to log cleaning, food or report an AC, Wi-Fi or washroom issue.", img: clayScan, icon: ScanLine },
];

const more = [
  { icon: Building2, t: "Multi-branch", d: "Separate managers, departments and staff per hotel" },
  { icon: Fingerprint, t: "One guest ID", d: "Valid across every branch in your chain" },
  { icon: ShieldCheck, t: "Private history", d: "Branches only see their own visits; admin sees all" },
  { icon: Heart, t: "Stay preferences", d: "Quiet room, high floor, vegan — remembered forever" },
  { icon: Wrench, t: "Room conditions", d: "Improvement areas grouped by AC, Wi-Fi, washroom" },
  { icon: Bell, t: "Smart alerts", d: "Overdue check-outs and slow cleaning flagged hourly" },
  { icon: DatabaseBackup, t: "Nightly backup", d: "Automatic snapshots kept for 30 days" },
  { icon: Receipt, t: "Revenue mix", d: "Occupancy, booking sources and GST at a glance" },
];

function Landing() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const rot = useTransform(scrollYProgress, [0, 1], [0, -4]);

  useEffect(() => {
    let raf = 0; let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    import("lenis").then(({ default: Lenis }) => {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      const loop = (t: number) => { lenis?.raf(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    });
    return () => { cancelAnimationFrame(raf); lenis?.destroy(); };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <nav className="fixed inset-x-0 top-4 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-full glass px-5 py-3 shadow-card">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-neon text-primary-foreground"><BedDouble className="size-4" /></span>StayOS
        </Link>
        <div className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a><a href="#roles" className="hover:text-foreground">Roles</a><a href="#faq" className="hover:text-foreground">FAQ</a>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/auth">Sign in</Link></Button>
          <Button variant="neon" size="sm" asChild><Link to="/auth">Get started</Link></Button>
        </div>
      </nav>

      <section ref={ref} className="relative overflow-hidden bg-soft pb-24 pt-36">
        <div className="absolute -left-32 top-20 size-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-20 top-40 size-96 rounded-full bg-pink/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium shadow-card">
            <span className="size-2 animate-pulse rounded-full bg-success" /> Built for Indian hotel chains · GST ready
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}
            className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold leading-[1.05] md:text-7xl">
            The operating system for your <span className="text-neon">hotel chain.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Check guests in within seconds, print branch-wise GST invoices, track room conditions and watch every property update live.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="neon" size="lg" asChild><Link to="/auth">Register your hotel <ArrowRight /></Link></Button>
            <Button variant="outline" size="lg" className="rounded-full" asChild><a href="#features">See how it works</a></Button>
          </motion.div>

          <motion.div style={{ y, rotateX: rot }} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 60 }}
            className="relative mx-auto mt-16 max-w-5xl [perspective:1200px]">
            <ProductPreview />
            <img src={clayBell} alt="" width={1024} height={1024} className="absolute -right-10 -top-20 hidden h-28 w-auto animate-float drop-shadow-xl md:block" />
            <img src={clayManager} alt="" width={1024} height={1024} className="absolute -bottom-14 -left-14 hidden h-28 w-auto animate-float drop-shadow-xl md:block" style={{ animationDelay: "1.5s" }} />
          </motion.div>
        </div>
      </section>

      <section className="border-y bg-card py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 text-center md:grid-cols-4">
          {[["8 sec", "Average check-in"], ["12%", "GST split automatically"], ["3 steps", "Onboarding to live"], ["24/7", "Live sync & backups"]].map(([n, l]) => (
            <div key={l}><div className="font-display text-3xl font-bold">{n}</div><div className="text-sm text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-28">
        <h2 className="max-w-2xl text-4xl font-bold md:text-5xl">From front desk to housekeeping, <span className="text-neon">everything is connected.</span></h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: i * 0.1 }} whileHover={{ y: -6 }}
              className="group overflow-hidden rounded-3xl border bg-card p-7 shadow-card">
              <img src={f.img} alt="" width={1024} height={1024} loading="lazy" className="h-40 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
              <div className="mt-4 flex items-center gap-2 font-display text-xl font-bold"><f.icon className="size-5 text-primary" />{f.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {more.map((m, i) => (
            <motion.div key={m.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="rounded-2xl border bg-card p-5">
              <m.icon className="size-5 text-primary" /><div className="mt-3 font-semibold">{m.t}</div><div className="text-sm text-muted-foreground">{m.d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-28 md:grid-cols-2">
        <div className="overflow-hidden rounded-[2rem] shadow-card"><img src={suite} alt="Hotel suite" width={1600} height={1066} loading="lazy" className="aspect-[4/3] w-full object-cover" /></div>
        <div>
          <h2 className="text-4xl font-bold">Live in 3 steps.</h2>
          <div className="mt-8 space-y-5">
            {[["Business & GST", "Hotel name, manager, address, PIN, state, GSTIN — 6% CGST + 6% SGST by default."], ["Add hotel branch", "Branch details and room types. Barcodes and departments are created automatically."], ["Review & launch", "Confirm, celebrate, and start checking guests in."]].map(([t, d], i) => (
              <div key={t} className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground font-bold text-background">{i + 1}</span><div><div className="font-semibold">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div></div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="bg-soft py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-4xl font-bold">One app, three roles.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[{ img: clayAdmin, t: "Chain admin", d: "Every branch, every report, offers, check-in form fields and backups." },
              { img: clayManager, t: "Branch manager", d: "Check-in, billing, guest preferences, room conditions and staff." },
              { img: clayBackup, t: "Staff", d: "Scan a room, log service, report an issue — straight from the phone." }].map((r) => (
              <motion.div key={r.t} whileHover={{ y: -8, rotate: -1 }} className="rounded-3xl bg-card p-7 shadow-card">
                <img src={r.img} alt="" width={1024} height={1024} loading="lazy" className="h-32" />
                <div className="mt-4 text-xl font-bold">{r.t}</div><p className="mt-1 text-sm text-muted-foreground">{r.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-28">
        <h2 className="text-center text-4xl font-bold">Questions</h2>
        <Accordion type="single" collapsible className="mt-10">
          {[["Can another branch see my guest's history?", "No. A guest ID works chain-wide, but visit history is visible only to the branch where the stay happened — and to the chain admin."],
            ["Does each branch have its own GST number?", "Yes. Every branch stores its own GSTIN, state, CGST and SGST rates and UPI ID; invoices use them automatically."],
            ["How do staff report a broken AC?", "Scan the room barcode, tap AC → Low cooling. It appears instantly in the manager's Improvement areas."],
            ["Is my data backed up?", "A backup runs every night automatically and is kept for 30 days."]].map(([q, a]) => (
            <AccordionItem key={q} value={q}><AccordionTrigger className="text-left">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-[2.5rem] p-12 text-center text-primary-foreground">
          <img src={hero} alt="" width={1600} height={912} loading="lazy" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-foreground/70" />
          <div className="relative">
            <h2 className="text-4xl font-bold md:text-5xl">Ready to run a calmer front desk?</h2>
            <Button variant="neon" size="lg" className="mt-8" asChild><Link to="/auth">Start free <ArrowRight /></Link></Button>
          </div>
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} StayOS · Hotel chain management</p>
      </section>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card text-left shadow-card ring-8 ring-card/60">
      <div className="flex items-center gap-3 border-b px-5 py-3">
        <span className="grid size-7 place-items-center rounded-lg bg-neon text-primary-foreground"><BedDouble className="size-3.5" /></span>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground"><Search className="size-3" /> Search bookings</div>
        <span className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Plus className="size-3" /> New Booking</span>
      </div>
      <div className="grid gap-4 bg-background p-5 md:grid-cols-[1fr_1fr_1.1fr]">
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="text-sm font-semibold">Today's status</div>
          {[["Check-ins left", "05 of 12"], ["Check-outs left", "02 of 14"], ["Rooms in use", "15 of 20"], ["EOD occupancy", "84%"]].map(([k, v]) => (
            <div key={k} className="mt-2 flex justify-between text-xs"><span className="text-muted-foreground">{k}</span><b>{v}</b></div>
          ))}
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="text-sm font-semibold">Improvement areas</div>
          {[["AC", "203, 205", "Low cooling"], ["Wi-Fi", "207", "Slow speed"], ["Washroom", "301", "Dirty"]].map(([c, r, t]) => (
            <div key={c} className="mt-2 flex items-center justify-between text-xs"><b>{c}</b><span className="text-muted-foreground">{r}</span><span className="rounded border px-1.5">{t}</span></div>
          ))}
        </div>
        <div className="rounded-2xl bg-card shadow-card">
          <div className="rounded-t-2xl bg-neon px-4 py-2 text-xs font-semibold text-primary-foreground">⚡ Fast check-in</div>
          <div className="space-y-2 p-3 text-xs">
            <div className="rounded-lg border px-2 py-1.5 font-mono">98765 4320…</div>
            <div className="flex items-center gap-2 rounded-lg bg-secondary p-2"><span className="grid size-7 place-items-center rounded-full bg-card font-bold text-primary">PS</span><div className="flex-1"><b>Priya Sharma</b><div className="text-muted-foreground">Quiet room · High floor</div></div><Check className="size-4 text-success" /></div>
            <div className="flex gap-1">{["204", "206", "301"].map((n, i) => <span key={n} className={`rounded-md border px-2 py-1 font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : ""}`}>{n}</span>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

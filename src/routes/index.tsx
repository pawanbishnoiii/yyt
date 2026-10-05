import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import CountUp from "react-countup";
import { useRef } from "react";
import {
  BedDouble, Receipt, ScanLine, ShieldCheck, Sparkles, Building2, Users, DatabaseBackup,
  Zap, QrCode, Fingerprint, ArrowRight, Printer, Tag, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-lobby.jpg";
import suite from "@/assets/room-suite.jpg";
import clayBell from "@/assets/clay-bell.png";
import clayScan from "@/assets/clay-scan.png";
import clayBill from "@/assets/clay-bill.png";
import clayService from "@/assets/clay-service.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeonStay — Hotel Chain Management System" },
      { name: "description", content: "One-click check-in, GST bills with QR, room barcodes, staff scanning and live updates across every branch." },
      { property: "og:title", content: "NeonStay — Hotel Chain Management System" },
      { property: "og:description", content: "Run every branch from one neon-bright command center." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Zap, title: "One-click check-in", text: "Returning guest? Mobile ya Aadhaar daalo — data turant fetch.", img: clayBell },
  { icon: Receipt, title: "GST bills + QR", text: "CGST/SGST auto, UPI QR code, ek click me print.", img: clayBill },
  { icon: ScanLine, title: "Room barcodes", text: "Staff phone se scan karke cleaning ya food update kare.", img: clayScan },
  { icon: Sparkles, title: "Live service", text: "Housekeeping, food aur maintenance — sab real-time.", img: clayService },
];

const more = [
  { icon: Building2, t: "Multi-branch", d: "Har hotel ka alag manager aur departments" },
  { icon: Fingerprint, t: "Global guest ID", d: "Ek ID, sab branches me valid" },
  { icon: ShieldCheck, t: "Private history", d: "Visits sirf apni branch + admin ko" },
  { icon: Tag, t: "Offers", d: "Admin-controlled discount codes" },
  { icon: Users, t: "Interest tracking", d: "Guest ki pasand samjho" },
  { icon: DatabaseBackup, t: "Auto backup", d: "Roz raat automatic snapshot" },
  { icon: Printer, t: "Print ready", d: "Bills aur barcode labels" },
  { icon: Activity, t: "Live dashboard", d: "Occupancy aur revenue charts" },
];

function Landing() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <nav className="fixed inset-x-0 top-4 z-50 mx-auto flex max-w-5xl items-center justify-between rounded-full glass px-5 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-full bg-neon"><BedDouble className="size-4" /></span>
          NeonStay
        </Link>
        <Button variant="neon" size="sm" asChild><Link to="/auth">Sign in</Link></Button>
      </nav>

      {/* HERO */}
      <section ref={ref} className="relative flex min-h-[100svh] items-center overflow-hidden">
        <motion.img style={{ y, scale }} src={hero} alt="Neon-lit luxury hotel lobby" width={1600} height={912}
          className="absolute inset-0 size-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pt-24 md:grid-cols-[1.3fr_1fr]">
          <div>
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-accent">
              <span className="size-2 animate-pulse rounded-full bg-success" /> Live across all branches
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}
              className="mt-5 text-5xl font-extrabold leading-[1.05] md:text-7xl">
              Har branch.<br /><span className="text-neon">Ek command center.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-6 max-w-lg text-lg text-muted-foreground">
              3-step booking, GST billing with QR, room barcodes aur staff scanning — sab real-time.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-8 flex gap-3">
              <Button variant="neon" size="lg" asChild><Link to="/auth">Open dashboard <ArrowRight /></Link></Button>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.8, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.3, type: "spring" }}
            className="relative hidden md:block">
            <div className="absolute inset-8 rounded-full bg-primary/40 blur-3xl" />
            <img src={clayBell} alt="" width={1024} height={1024} className="relative animate-float drop-shadow-2xl" />
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto -mt-16 grid max-w-5xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
        {[
          { n: 1, s: "-click", l: "Check-in" },
          { n: 3, s: " steps", l: "Booking flow" },
          { n: 12, s: "%", l: "GST auto split" },
          { n: 24, s: "/7", l: "Live sync" },
        ].map((s, i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="rounded-3xl glass p-5 text-center">
            <div className="font-display text-3xl font-bold text-neon">
              <CountUp end={s.n} enableScrollSpy scrollSpyOnce />{s.s}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
          </motion.div>
        ))}
      </section>

      {/* FEATURE CARDS */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <h2 className="max-w-2xl text-4xl font-bold md:text-5xl">Front desk se housekeeping tak, <span className="text-neon">sab connected.</span></h2>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: (i % 2) * 0.12 }} whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-[2rem] border bg-card p-8">
              <div className="absolute -right-10 -top-10 size-48 rounded-full bg-primary/20 blur-3xl transition-all group-hover:bg-accent/30" />
              <f.icon className="size-8 text-accent" />
              <h3 className="mt-4 text-2xl font-bold">{f.title}</h3>
              <p className="mt-2 max-w-xs text-muted-foreground">{f.text}</p>
              <img src={f.img} alt="" loading="lazy" width={1024} height={1024}
                className="ml-auto mt-2 h-44 w-auto transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden border-y bg-card/50 py-6">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-2xl text-muted-foreground">
          {[...Array(2)].flatMap((_, k) =>
            ["CGST + SGST", "UPI QR", "Barcode labels", "Aadhaar lookup", "Live rooms", "Auto backup", "Offers", "Multi-branch"].map((t) => (
              <span key={k + t} className="flex items-center gap-12">{t}<Sparkles className="size-5 text-pink" /></span>
            )),
          )}
        </div>
      </section>

      {/* SPLIT */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-28 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem]">
          <img src={suite} alt="Luxury hotel suite" loading="lazy" width={1200} height={800} className="aspect-[4/3] w-full object-cover" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl glass p-4">
            <div>
              <div className="text-xs text-muted-foreground">Room 304 · Deluxe</div>
              <div className="font-display font-bold">Checked in · 2 nights</div>
            </div>
            <QrCode className="size-10 text-accent" />
          </div>
        </motion.div>
        <div>
          <h2 className="text-4xl font-bold">3 step booking.<br /><span className="text-neon">Zero confusion.</span></h2>
          <ol className="mt-8 space-y-5">
            {["Guest — mobile ya Aadhaar se fetch, ya naya profile", "Room — type, nights aur offer select", "Confirm — booking ID, check-in aur room live"].map((s, i) => (
              <motion.li key={s} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="flex gap-4 rounded-2xl border bg-card p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-neon font-display font-bold">{i + 1}</span>
                <span className="self-center">{s}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* MORE GRID */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {more.map((m, i) => (
            <motion.div key={m.t} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-3xl border bg-card p-5 transition-colors hover:border-primary">
              <m.icon className="size-6 text-pink" />
              <div className="mt-3 font-semibold">{m.t}</div>
              <div className="text-sm text-muted-foreground">{m.d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mb-20 max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-aurora p-12 text-center">
          <img src={clayScan} alt="" loading="lazy" width={1024} height={1024} className="absolute -left-10 -bottom-10 h-56 animate-float opacity-90" />
          <h2 className="relative text-4xl font-extrabold text-primary-foreground">Apni chain ko live karo.</h2>
          <Button size="lg" variant="secondary" className="relative mt-6" asChild><Link to="/auth">Get started <ArrowRight /></Link></Button>
        </div>
      </section>
      <footer className="pb-10 text-center text-sm text-muted-foreground">© 2026 NeonStay Hotels</footer>
    </div>
  );
}

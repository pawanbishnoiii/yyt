import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { MapPin, Star, QrCode, BedDouble, Utensils, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/me";
import room from "@/assets/stayos-deluxe-2026.jpg";
import rooftop from "@/assets/stayos-rooftop-2026.jpg";
import food from "@/assets/stayos-food-2026.jpg";

export const Route = createFileRoute("/stay/")({
  head: () => ({
    meta: [
      { title: "Guest App — Explore our hotels | StayOS" },
      { name: "description", content: "Browse hotels, rooms, food menu and offers. Sign in only when you order or request service." },
      { property: "og:title", content: "StayOS Guest App" },
      { property: "og:description", content: "Explore hotels, order food and request service from your room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { data: hotels, isLoading } = useQuery({
    queryKey: ["public-hotels"],
    queryFn: async () => (await supabase.rpc("public_hotels")).data ?? [],
  });
  const pics = [room, rooftop, food];
  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="relative h-[52vh] min-h-80 overflow-hidden">
        <img src={rooftop} alt="Rooftop pool at sunset" width={1280} height={896} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-end p-6 text-background">
          <Link to="/" className="mb-auto mt-2 w-fit rounded-full bg-background/20 px-3 py-1 text-xs backdrop-blur">StayOS · Guest</Link>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold md:text-6xl">Your stay, in your pocket.</motion.h1>
          <p className="mt-2 max-w-lg opacity-90">Explore hotels, menus and offers freely. Scan the QR in your room to order food, request cleaning or see your bill.</p>
        </div>
      </div>
      <div className="relative z-10 mx-auto -mt-8 grid max-w-5xl grid-cols-3 gap-3 px-4">
        {[[QrCode, "Scan room QR", "Unlock in-room services"], [Utensils, "Room dining", "Order in two taps"], [Sparkles, "Housekeeping", "Request anytime"]].map(([I, t, s]) => {
          const Icon = I as typeof QrCode;
          return (
            <div key={t as string} className="rounded-2xl border bg-card p-4 shadow-card">
              <Icon className="size-5 text-primary" /><div className="mt-2 text-sm font-semibold">{t as string}</div><div className="text-xs text-muted-foreground">{s as string}</div>
            </div>
          );
        })}
      </div>
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="mb-4 mt-10 text-2xl font-bold">Our hotels</h2>
        {isLoading && <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-72 animate-pulse rounded-3xl bg-muted" />)}</div>}
        <div className="grid gap-5 md:grid-cols-2">
          {hotels?.map((h, i) => (
            <motion.div key={h.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link to="/stay/h/$id" params={{ id: h.id }} className="group block overflow-hidden rounded-3xl border bg-card shadow-card transition hover:-translate-y-1">
                <div className="h-48 overflow-hidden"><img src={pics[i % 3]} alt={h.name} loading="lazy" width={1280} height={896} className="size-full object-cover transition duration-500 group-hover:scale-105" /></div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-lg font-semibold">{h.name}</div><div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3" />{h.city ?? "—"}</div></div>
                    {h.rating && <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success"><Star className="size-3 fill-current" />{h.rating}</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground"><BedDouble className="size-4" />{h.rooms} rooms</span>
                    {h.min_price != null && <span>from <b className="text-lg">{inr(Number(h.min_price))}</b>/night</span>}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        {hotels && !hotels.length && <div className="overflow-hidden rounded-3xl border bg-card shadow-card md:grid md:grid-cols-2"><img src={room} alt="Bright modern hotel room" width={1600} height={1008} loading="lazy" className="h-full min-h-64 w-full object-cover"/><div className="flex flex-col justify-center p-8"><h3 className="text-2xl font-bold">The first property is being prepared</h3><p className="mt-2 text-sm text-muted-foreground">A manager must finish the three-step hotel setup before a property becomes publicly discoverable. Room QR links continue to work for configured properties.</p><Link to="/auth" className="mt-5 w-fit rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Set up a hotel</Link></div></div>}
      </div>
    </div>
  );
}

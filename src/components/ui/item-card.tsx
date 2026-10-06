import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/me";

interface OrderItemCardProps {
  imageUrl: string;
  title: string;
  details: string[];
  price: number;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  imageAlt?: string;
  veg?: boolean;
  className?: string;
}

export function OrderItemCard({ className, imageUrl, title, details, price, quantity = 0, onQuantityChange, imageAlt = "Menu item", veg = true }: OrderItemCardProps) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
      className={cn("group relative flex w-full items-center gap-3 overflow-hidden rounded-3xl border bg-card p-3 shadow-card", className)}>
      <motion.img src={imageUrl} alt={imageAlt} loading="lazy" className="size-24 shrink-0 rounded-2xl object-cover" whileHover={{ scale: 1.04 }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className={`grid size-3.5 place-items-center rounded-sm border-2 ${veg ? "border-success" : "border-destructive"}`}><span className={`size-1.5 rounded-full ${veg ? "bg-success" : "bg-destructive"}`} /></span><h3 className="truncate font-display font-bold">{title}</h3></div>
        {details.slice(0, 2).map((detail) => <p key={detail} className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{detail}</p>)}
        <div className="mt-2 font-bold">{inr(price)}</div>
      </div>
      <div className="z-10 flex items-center rounded-full border bg-background p-1 shadow-sm">
        {quantity > 0 && <motion.button whileTap={{ scale: .85 }} onClick={() => onQuantityChange?.(quantity - 1)} className="grid size-8 place-items-center rounded-full hover:bg-muted" aria-label="Decrease quantity"><Minus className="size-3.5" /></motion.button>}
        <AnimatePresence mode="popLayout">
          {quantity > 0 && <motion.span key={quantity} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="w-6 text-center text-sm font-bold">{quantity}</motion.span>}
        </AnimatePresence>
        <motion.button whileTap={{ scale: .85 }} onClick={() => onQuantityChange?.(Math.min(20, quantity + 1))} className="grid size-8 place-items-center rounded-full bg-foreground text-background" aria-label="Increase quantity"><Plus className="size-3.5" /></motion.button>
      </div>
    </motion.div>
  );
}
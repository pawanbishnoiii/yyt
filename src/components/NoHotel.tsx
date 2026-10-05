import type { ReactNode } from "react";
import clayBell from "@/assets/clay-bell.png";

export function NoHotel() {
  return (
    <div className="grid place-items-center rounded-3xl border bg-card p-12 text-center shadow-card">
      <img src={clayBell} alt="" width={1024} height={1024} loading="lazy" className="h-32" />
      <h2 className="mt-4 text-xl font-bold">Select or create a hotel first</h2>
      <p className="mt-1 text-sm text-muted-foreground">Add a branch in Admin → Hotels, then pick it from the top bar.</p>
    </div>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-card shadow-card ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-semibold">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

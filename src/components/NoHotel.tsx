import clayBell from "@/assets/clay-bell.png";

export function NoHotel() {
  return (
    <div className="grid place-items-center rounded-3xl border bg-card shadow-card p-12 text-center">
      <img src={clayBell} alt="" width={1024} height={1024} loading="lazy" className="h-32" />
      <h2 className="mt-4 text-xl font-bold">Pehle hotel select / create karo</h2>
      <p className="mt-1 text-sm text-muted-foreground">Admin → Hotels me naya hotel add karein, phir upar se select karein.</p>
    </div>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
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

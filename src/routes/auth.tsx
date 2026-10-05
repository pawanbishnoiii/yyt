import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BedDouble, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import clayBell from "@/assets/clay-bell.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — StayOS" },
      { name: "description", content: "Sign in or create your hotel manager account on StayOS." },
      { property: "og:title", content: "Sign in — StayOS" },
      { property: "og:description", content: "Admin, manager and staff sign in for StayOS hotel chain management." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address, e.g. name@hotel.com").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    if (mode === "up" && !name.trim()) { setErr("Please enter your full name"); return; }
    setBusy(true);
    try {
      const { email: em, password: pw } = parsed.data;
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw error;
        nav({ to: "/app" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: em, password: pw,
          options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) nav({ to: "/app" });
        else toast.success("Check your inbox and click the confirmation link to continue.");
      }
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-soft p-10 md:flex">
        <div className="absolute -left-20 top-10 size-80 rounded-full bg-primary/15 blur-3xl" />
        <img src={clayBell} alt="" width={1024} height={1024} className="relative w-1/2 animate-float drop-shadow-2xl" />
        <h2 className="relative mt-6 max-w-sm text-center text-3xl font-bold">Run every branch from one desk.</h2>
        <p className="relative mt-2 max-w-sm text-center text-muted-foreground">Fast check-in, GST invoices and live room status for your whole chain.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} noValidate className="w-full max-w-sm space-y-5">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid size-9 place-items-center rounded-xl bg-neon text-primary-foreground"><BedDouble className="size-4" /></span>StayOS
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{mode === "in" ? "Welcome back" : "Register your hotel"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Sign in to your dashboard." : "Create a manager account — you'll set up your hotel next."}</p>
          </div>
          {mode === "up" && (
            <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Rahul Verma" /></div>
          )}
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="manager@hotel.com" /></div>
          <div className="space-y-2"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
          {err && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <Button variant="neon" className="w-full" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "in" ? "Sign in" : "Create account"}</Button>
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); }}>
            {mode === "in" ? "New hotel? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

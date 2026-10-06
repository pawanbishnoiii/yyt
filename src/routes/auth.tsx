import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BedDouble, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authPhoto from "@/assets/stayos-lobby-2026.jpg";

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
  const [tab, setTab] = useState<"email" | "staff">("email");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (tab === "staff") {
      if (!/^\d{4}$/.test(code)) { setErr("Staff ID is 4 digits"); return; }
      if (password.length < 6) { setErr("Enter your password"); return; }
      setBusy(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email: `${code}@staff.stayos.local`, password });
      setBusy(false);
      if (error || !data.user) { setErr("Wrong Staff ID or password."); return; }
      const { data: p } = await supabase.from("profiles").select("staff_kind").eq("id", data.user.id).maybeSingle();
      nav({ to: p?.staff_kind === "food" ? "/food" : "/RoomService" });
      return;
    }
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
      const raw = (e2 as Error).message ?? "";
      if (/invalid_string|Invalid email/i.test(raw)) {
        setErr("This email address is not accepted. Please check for typos and use a full address like name@hotel.com");
      } else if (/Invalid login credentials/i.test(raw)) {
        setErr("Wrong email or password. Please try again.");
      } else if (/Email not confirmed/i.test(raw)) {
        setErr("Please confirm your email first — open the link we sent to your inbox.");
      } else {
        setErr(raw || "Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-soft p-10 md:flex">
        <img src={authPhoto} alt="Hotel lobby" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
        <div className="relative mt-auto text-background">
          <h2 className="max-w-sm text-4xl font-bold">Run every branch from one desk.</h2>
          <p className="mt-2 max-w-sm opacity-85">Managers sign in with email. Staff sign in with their 4-digit Staff ID.</p>
        </div>
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
          {mode === "in" && (
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
              {(["email", "staff"] as const).map((t) => (
                <button type="button" key={t} onClick={() => { setTab(t); setErr(null); }} className={`rounded-xl py-2 text-sm font-semibold transition ${tab === t ? "bg-card shadow-card" : "text-muted-foreground"}`}>{t === "email" ? "Email" : "Staff ID"}</button>
              ))}
            </div>
          )}
          {mode === "in" && tab === "staff" && (
            <div className="space-y-2"><Label htmlFor="code">Staff ID</Label><Input id="code" inputMode="numeric" autoComplete="username" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4821" className="h-14 text-center font-mono text-2xl tracking-[0.6em]" /></div>
          )}
          {mode === "up" && (
            <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Rahul Verma" /></div>
          )}
          {!(mode === "in" && tab === "staff") && <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="manager@hotel.com" /></div>}
          <div className="space-y-2"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
          {err && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <Button variant="neon" className="w-full" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "in" ? "Sign in" : "Create account"}</Button>
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => { setMode(mode === "in" ? "up" : "in"); setTab("email"); setErr(null); }}>
            {mode === "in" ? "New hotel? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

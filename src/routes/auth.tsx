import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BedDouble } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import clayBell from "@/assets/clay-bell.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — NeonStay" },
      { name: "description", content: "Sign in to your NeonStay hotel dashboard." },
      { property: "og:title", content: "Sign in — NeonStay" },
      { property: "og:description", content: "Admin, manager and staff sign in." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/app" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) nav({ to: "/app" });
        else toast.success("Email check karo aur confirm link par click karo.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-aurora md:flex">
        <img src={clayBell} alt="" width={1024} height={1024} className="w-2/3 animate-float drop-shadow-2xl" />
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid size-9 place-items-center rounded-full bg-neon"><BedDouble className="size-4" /></span>NeonStay
          </Link>
          <h1 className="text-3xl font-bold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
          <p className="text-sm text-muted-foreground">Pehla account automatically admin banta hai. Baaki staff admin banayega.</p>
          {mode === "up" && (
            <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></div>
          )}
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <Button variant="neon" className="w-full" size="lg" disabled={busy}>{busy ? "..." : mode === "in" ? "Sign in" : "Sign up"}</Button>
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Naya account banana hai? Sign up" : "Already account hai? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

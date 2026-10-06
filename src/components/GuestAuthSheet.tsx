import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email, e.g. you@mail.com").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export function useGuestUser() {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return uid;
}

/** Opens only when a guest tries an action that needs an account. */
export function GuestAuthSheet({ open, onOpenChange, reason, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; reason: string; onDone: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const p = schema.safeParse({ email, password });
    if (!p.success) return setErr(p.error.issues[0]?.message ?? "Invalid input");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword(p.data);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        if (!data.session) { setErr("We sent a confirmation link to your email. Open it, then come back here."); return; }
      }
      onOpenChange(false); onDone();
    } catch (e2) {
      const m = (e2 as Error).message;
      setErr(/Invalid login/i.test(m) ? "Wrong email or password." : /already registered/i.test(m) ? "Account exists — switch to Sign in." : m);
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
        <SheetHeader>
          <div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Lock className="size-5" /></div>
          <SheetTitle className="text-center">{mode === "up" ? "Create a guest account" : "Welcome back"}</SheetTitle>
          <SheetDescription className="text-center">Sign in to {reason}. Browsing stays free — no account needed.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} noValidate className="mt-4 space-y-3 px-4 pb-6">
          <Button type="button" variant="outline" className="w-full" size="lg" onClick={async () => {
            const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
            if (error) setErr(error.message); else { onOpenChange(false); onDone(); }
          }}><span className="text-lg font-bold text-primary">G</span>Continue with Google</Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" /></div>
          <Input type="email" placeholder="you@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <Button className="w-full" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "up" ? "Create account & continue" : "Sign in & continue"}</Button>
          <button type="button" onClick={() => { setMode(mode === "up" ? "in" : "up"); setErr(null); }} className="w-full text-sm text-muted-foreground">
            {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

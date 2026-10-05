import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(["manager", "staff", "admin"]),
  hotel_id: z.string().uuid().nullable(),
  department_id: z.string().uuid().nullable(),
});

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!ok) throw new Error("Only admin can create users");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed");
    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, full_name: data.full_name,
      hotel_id: data.hotel_id, department_id: data.department_id,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    return { id: uid };
  });

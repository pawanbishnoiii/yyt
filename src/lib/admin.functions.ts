import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const staffEmail = (code: string) => `${code}@staff.stayos.local`;

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

const staffSchema = z.object({
  hotel_id: z.string().uuid(),
  code: z.string().regex(/^\d{4}$/, "Staff ID must be 4 digits"),
  password: z.string().min(6, "Password must be at least 6 characters").max(32),
  full_name: z.string().trim().min(1).max(100),
  mobile: z.string().trim().max(15).optional(),
  staff_kind: z.enum(["food", "room_service", "cleaning", "maintenance", "front_desk"]),
});

async function assertMgr(ctx: { supabase: any }, hotel: string) {
  const { data } = await ctx.supabase.rpc("is_mgr", { _hotel: hotel });
  if (!data) throw new Error("Only the hotel manager can manage staff");
}

export const createStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => staffSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertMgr(context, data.hotel_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin.from("profiles").select("id").eq("staff_code", data.code).maybeSingle();
    if (taken) throw new Error("This Staff ID is already taken — pick another");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: staffEmail(data.code), password: data.password, email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create staff");
    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: staffEmail(data.code), full_name: data.full_name, mobile: data.mobile ?? null,
      hotel_id: data.hotel_id, staff_kind: data.staff_kind, staff_code: data.code, onboarded: true,
    } as never);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "staff" });
    return { id: uid, code: data.code };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), password: z.string().min(6).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("hotel_id,staff_kind").eq("id", data.user_id).maybeSingle();
    if (!p?.hotel_id || !p.staff_kind) throw new Error("Not a staff member");
    await assertMgr(context, p.hotel_id);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("hotel_id,staff_kind").eq("id", data.user_id).maybeSingle();
    if (!p?.hotel_id || !p.staff_kind) throw new Error("Not a staff member");
    await assertMgr(context, p.hotel_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

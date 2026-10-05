import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "manager" | "staff";
export type Me = {
  id: string;
  email: string | null;
  full_name: string | null;
  hotel_id: string | null;
  department_id: string | null;
  roles: Role[];
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      return {
        id: u.user.id,
        email: u.user.email ?? null,
        full_name: p?.full_name ?? null,
        hotel_id: p?.hotel_id ?? null,
        department_id: p?.department_id ?? null,
        roles: (r ?? []).map((x) => x.role as Role),
      };
    },
  });
}

export const isAdmin = (m?: Me | null) => !!m?.roles.includes("admin");
export const isManager = (m?: Me | null) => !!m && (m.roles.includes("admin") || m.roles.includes("manager"));

const HotelCtx = createContext<{ hotelId: string | null; setHotelId: (id: string) => void }>({ hotelId: null, setHotelId: () => {} });

export function HotelProvider({ me, children }: { me: Me; children: ReactNode }) {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem("hotel");
    if (saved) setSel(saved);
  }, []);
  const hotelId = isAdmin(me) ? sel ?? me.hotel_id : me.hotel_id;
  return (
    <HotelCtx.Provider value={{ hotelId, setHotelId: (id) => { localStorage.setItem("hotel", id); setSel(id); } }}>
      {children}
    </HotelCtx.Provider>
  );
}
export const useHotel = () => useContext(HotelCtx);

/** Subscribe to realtime table changes and invalidate given query keys. */
export function useLive(tables: string[], keys: string[][]) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel("live-" + tables.join("-") + Math.random());
    tables.forEach((t) =>
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => {
        keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      }),
    );
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

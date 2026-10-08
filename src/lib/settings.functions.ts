import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Durations } from "@/lib/pricing";

export type WorkingHours = Record<string, { start: string; end: string } | null>; // keys "0".."6" (Sun..Sat)

export type PublicSettings = {
  booking_open: boolean;
  durations: Durations;
  working_hours: WorkingHours;
  contact: { phone: string; whatsapp: string; instagram: string; tiktok: string; snapchat: string };
};

export const DEFAULT_SETTINGS: PublicSettings = {
  booking_open: false, // stays closed until Jood completes mandatory settings
  durations: { evening: 0, queen: 0, bride: 0, prep: 0, buffer: 0, travel_in: 0, travel_out: 0 },
  working_hours: { "0": null, "1": null, "2": null, "3": null, "4": null, "5": null, "6": null },
  contact: {
    phone: "0556383294",
    whatsapp: "https://wa.me/966556383294",
    instagram: "https://www.instagram.com/joodmua_/",
    tiktok: "https://www.tiktok.com/@joodysh",
    snapchat: "https://snapchat.com/t/sIwi7je5",
  },
};

const PUBLIC_KEYS = ["booking_open", "durations", "working_hours", "contact"] as const;

async function readSettings(admin: any): Promise<Record<string, unknown>> {
  const { data } = await admin.from("settings").select("key, value");
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
}

export function mergePublic(map: Record<string, unknown>): PublicSettings {
  return {
    booking_open: (map["booking_open"] as boolean) ?? DEFAULT_SETTINGS.booking_open,
    durations: { ...DEFAULT_SETTINGS.durations, ...((map["durations"] as Partial<Durations>) ?? {}) },
    working_hours: { ...DEFAULT_SETTINGS.working_hours, ...((map["working_hours"] as WorkingHours) ?? {}) },
    contact: { ...DEFAULT_SETTINGS.contact, ...((map["contact"] as PublicSettings["contact"]) ?? {}) },
  };
}

/** Settings are complete enough to open real booking. Bank details are required later, before pre-approving. */
export function settingsComplete(s: PublicSettings, _bank: unknown): boolean {
  const d = s.durations;
  const durationsOk = d.evening > 0 && d.queen > 0 && d.bride > 0;
  const hoursOk = Object.values(s.working_hours).some((h) => h && h.start && h.end);
  return durationsOk && hoursOk;
}

export function bankComplete(bank: unknown): boolean {
  const b = bank as { bank_name?: string; beneficiary?: string; iban?: string } | null;
  return !!(b?.bank_name && b?.beneficiary && b?.iban);
}

// Public: only non-sensitive keys
export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const map = await readSettings(supabaseAdmin);
  const pub = mergePublic(map);
  const complete = settingsComplete(pub, map["bank_details"]);
  return { ...pub, booking_open: pub.booking_open && complete };
});

// Admin: all settings
export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await (context as any).supabase.rpc("is_admin");
    if (!ok) throw new Error("forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const map = await readSettings(supabaseAdmin);
    return { public: mergePublic(map), bank_details: map["bank_details"] ?? null, calendar: map["calendar"] ?? null, policy: map["policy"] ?? null };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: unknown }) => input)
  .handler(async ({ context, data }) => {
    const { data: ok } = await (context as any).supabase.rpc("is_admin");
    if (!ok) throw new Error("forbidden");
    const allowed = [...PUBLIC_KEYS, "bank_details", "calendar", "policy"];
    if (!allowed.includes(data.key as (typeof allowed)[number])) throw new Error("unknown setting");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: data.key, value: data.value as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Bootstrap: first ever user can claim the admin role (only when no admin exists). */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("user_roles").select("id").eq("role", "admin").limit(1);
    if (existing && existing.length > 0) {
      const { data: mine } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", (context as any).userId)
        .eq("role", "admin");
      return { admin: !!(mine && mine.length) };
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: (context as any).userId, role: "admin" });
    return { admin: true };
  });

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await (context as any).supabase.rpc("is_admin");
    return { admin: !!ok };
  });

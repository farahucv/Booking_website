import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcMakeup, calcHairRange, isLocationBlocked, totalDurationMinutes, type ServiceCounts, type LocationType } from "./pricing";

const countsSchema = z.object({
  evening: z.number().int().min(0).max(20),
  queen: z.number().int().min(0).max(20),
  bride: z.number().int().min(0).max(1),
});
const locSchema = z.enum(["at_jood", "client_in_buraidah", "client_outside"]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function requireAdmin(context: any) {
  const { data } = await context.supabase.rpc("is_admin");
  if (!data) throw new Error("forbidden");
}

// ---------- Public ----------

export const getSlots = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ date: dateSchema, counts: countsSchema, loc: locSchema }).parse(d))
  .handler(async ({ data }) => {
    const { loadAll, computeSlots } = await import("./bookings.server");
    const { pub } = await loadAll();
    const dur = totalDurationMinutes(data.counts as ServiceCounts, pub.durations, data.loc);
    try {
      return { slots: await computeSlots(data.date, dur), duration: dur, error: null as string | null };
    } catch (e) {
      return { slots: [] as string[], duration: dur, error: (e as Error).message };
    }
  });

const createSchema = z.object({
  counts: countsSchema,
  loc: locSchema,
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  location_desc: z.string().max(500).optional(),
  location_url: z.string().max(500).optional(),
  start_at: z.string().datetime({ offset: true }),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[0-9+\s]{9,16}$/),
  notes: z.string().max(1000).optional(),
  hair: z.object({ count: z.number().int().min(1).max(20), bride: z.boolean(), length: z.string().max(20), density: z.string().max(20) }).nullable(),
  lang: z.enum(["ar", "en"]),
  agree: z.literal(true),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { loadAll, computeSlots, admin } = await import("./bookings.server");
    const { pub } = await loadAll();
    if (!pub.booking_open) throw new Error("booking_closed");
    const counts = data.counts as ServiceCounts;
    const m = calcMakeup(counts);
    if (m.people < 1) throw new Error("no_services");
    if (isLocationBlocked(counts, data.loc as LocationType)) throw new Error("location_blocked");
    if (data.loc !== "at_jood" && !data.district && !data.city) throw new Error("address_required");
    const dur = totalDurationMinutes(counts, pub.durations, data.loc);
    const day = new Date(+new Date(data.start_at) + 3 * 3600000).toISOString().slice(0, 10);
    const slots = await computeSlots(day, dur);
    const start = new Date(data.start_at);
    if (!slots.some((s) => +new Date(s) === +start)) throw new Error("slot_unavailable");

    const db = await admin();
    // Duplicate / spam guard: one open request per phone in 10 minutes, max 3 open requests per phone.
    const { data: recent } = await db
      .from("bookings")
      .select("id, created_at")
      .eq("customer_phone", data.phone)
      .eq("status", "pending_review");
    if ((recent ?? []).some((r) => Date.now() - +new Date(r.created_at) < 10 * 60000) || (recent ?? []).length >= 3)
      throw new Error("duplicate_request");

    const hairRange = data.hair ? calcHairRange(data.hair.count, data.hair.bride) : null;
    const { data: row, error } = await db
      .from("bookings")
      .insert({
        customer_name: data.name,
        customer_phone: data.phone,
        notes: data.notes || null,
        services: counts,
        hair_service: data.hair ? { ...data.hair, range: hairRange } : null,
        location_type: data.loc,
        city: data.city || null,
        district: data.district || null,
        location_desc: data.location_desc || null,
        location_url: data.location_url || null,
        start_at: start.toISOString(),
        end_at: new Date(+start + dur * 60000).toISOString(),
        makeup_total: m.total,
        deposit_amount: m.deposit,
        lang: data.lang,
      })
      .select("id, tracking_token")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id.slice(0, 8).toUpperCase(), token: row.tracking_token };
  });

export const getTracking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { admin, loadAll, expireOverdue } = await import("./bookings.server");
    await expireOverdue();
    const db = await admin();
    const { data: b } = await db
      .from("bookings")
      .select("id, status, customer_name, services, hair_service, hair_price, location_type, start_at, end_at, makeup_total, deposit_amount, travel_fee, deposit_deadline, receipt_path")
      .eq("tracking_token", data.token)
      .maybeSingle();
    if (!b) return null;
    const { bank, pub } = await loadAll();
    const showBank = b.status === "pre_approved";
    return {
      ...b,
      id: b.id.slice(0, 8).toUpperCase(),
      has_receipt: !!b.receipt_path,
      receipt_path: undefined,
      bank: showBank ? bank : null,
      whatsapp: pub.contact.whatsapp,
      now: new Date().toISOString(),
    };
  });

export const uploadReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().uuid(), name: z.string().max(200), type: z.string().regex(/^(image\/(png|jpeg|webp|heic)|application\/pdf)$/), base64: z.string().max(7_000_000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { admin } = await import("./bookings.server");
    const db = await admin();
    const { data: b } = await db.from("bookings").select("id, status, deposit_deadline").eq("tracking_token", data.token).maybeSingle();
    if (!b || b.status !== "pre_approved") throw new Error("not_allowed");
    if (b.deposit_deadline && +new Date(b.deposit_deadline) < Date.now()) throw new Error("expired");
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const ext = data.type === "application/pdf" ? "pdf" : data.type.split("/")[1];
    const path = `${b.id}/${Date.now()}.${ext}`;
    const up = await db.storage.from("receipts").upload(path, bytes, { contentType: data.type });
    if (up.error) throw new Error(up.error.message);
    const { error } = await db.from("bookings").update({ receipt_path: path, status: "receipt_pending" }).eq("id", b.id).eq("status", "pre_approved");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPortfolio = createServerFn({ method: "GET" }).handler(async () => {
  const { admin } = await import("./bookings.server");
  const db = await admin();
  const { data } = await db.from("portfolio_images").select("id, storage_path, sort_order").order("sort_order").order("created_at");
  if (!data?.length) return [];
  const { data: signed } = await db.storage.from("portfolio").createSignedUrls(data.map((d) => d.storage_path), 3600 * 6);
  return data.map((d, i) => ({ id: d.id, url: signed?.[i]?.signedUrl ?? "", sort_order: d.sort_order, storage_path: d.storage_path }));
});

// ---------- Admin ----------

export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { admin, expireOverdue } = await import("./bookings.server");
    await expireOverdue();
    const db = await admin();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await db.from("bookings").select("*").gte("start_at", since).order("start_at");
    const { data: events } = await db.from("booking_events").select("*").order("created_at");
    return (data ?? []).map((b) => ({ ...b, events: (events ?? []).filter((e) => e.booking_id === b.id) }));
  });

export const adminReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { admin } = await import("./bookings.server");
    const { data: s } = await (await admin()).storage.from("receipts").createSignedUrl(data.path, 600);
    return s?.signedUrl ?? null;
  });

export const adminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["pre_approve", "confirm", "reject", "cancel"]),
        travel_fee: z.number().int().min(0).max(10000).optional(),
        hair_price: z.number().int().min(0).max(10000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const s = await import("./bookings.server");
    const cal = await import("./calendar.server");
    const db = await s.admin();
    const { data: b } = await db.from("bookings").select("*").eq("id", data.id).single();
    if (!b) throw new Error("not_found");
    const { calendar } = await s.loadAll();
    const calOn = !!calendar?.booking_calendar_id;
    const summary = (st: string) => `${st} — ${b.customer_name} (${b.customer_phone})`;
    const desc = `Booking ${b.id.slice(0, 8).toUpperCase()}\n${JSON.stringify(b.services)}\n${b.location_type} ${b.city ?? ""} ${b.district ?? ""}`;

    if (data.action === "pre_approve") {
      if (b.status !== "pending_review") throw new Error("bad_state");
      if (b.location_type !== "at_jood" && data.travel_fee === undefined) throw new Error("travel_fee_required");
      // Re-check availability (also enforced by DB trigger)
      const { pub } = await s.loadAll();
      const busy = await s.busyForRange(b.start_at, b.end_at, pub.durations.buffer, calendar, b.id);
      if (s.overlaps({ s: +new Date(b.start_at), e: +new Date(b.end_at) }, busy)) throw new Error("slot_unavailable");
      let eventId: string | null = null;
      if (calOn) {
        if (!cal.calendarConnected()) throw new Error("calendar_unavailable");
        eventId = await cal.createBookingEvent(calendar!.booking_calendar_id!, { summary: summary("⏳ بانتظار العربون"), description: desc, start: b.start_at, end: b.end_at, pending: true });
      }
      const { error } = await db
        .from("bookings")
        .update({
          status: "pre_approved",
          travel_fee: data.travel_fee ?? (b.location_type === "at_jood" ? 0 : null),
          hair_price: data.hair_price ?? b.hair_price,
          deposit_deadline: new Date(Date.now() + 24 * 3600000).toISOString(),
          calendar_event_id: eventId,
        })
        .eq("id", b.id)
        .eq("status", "pending_review");
      if (error) {
        await s.removeCalendarEvent(eventId);
        throw new Error(error.message.includes("booking_overlap") ? "slot_unavailable" : error.message);
      }
    } else if (data.action === "confirm") {
      if (!["pre_approved", "receipt_pending"].includes(b.status)) throw new Error("bad_state");
      const { error } = await db.from("bookings").update({ status: "confirmed", hair_price: data.hair_price ?? b.hair_price }).eq("id", b.id);
      if (error) throw new Error(error.message);
      if (calOn && b.calendar_event_id && cal.calendarConnected()) {
        try {
          await cal.updateBookingEvent(calendar!.booking_calendar_id!, b.calendar_event_id, { summary: summary("✅ مؤكد") });
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      const to = data.action === "reject" ? "rejected" : "cancelled";
      if (["rejected", "cancelled", "expired"].includes(b.status)) throw new Error("bad_state");
      const { error } = await db.from("bookings").update({ status: to }).eq("id", b.id);
      if (error) throw new Error(error.message);
      await s.removeCalendarEvent(b.calendar_event_id);
    }
    return { ok: true };
  });

export const adminBlocks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        op: z.enum(["list", "add", "delete"]),
        id: z.string().uuid().optional(),
        start_at: z.string().optional(),
        end_at: z.string().optional(),
        reason: z.string().max(200).optional(),
        source: z.enum(["manual", "external_booking", "vacation"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const db = (context as any).supabase;
    if (data.op === "add") {
      if (!data.start_at || !data.end_at || +new Date(data.end_at) <= +new Date(data.start_at)) throw new Error("bad_range");
      const { error } = await db.from("blocked_slots").insert({ start_at: data.start_at, end_at: data.end_at, reason: data.reason ?? null, source: data.source ?? "manual" });
      if (error) throw new Error(error.message);
    } else if (data.op === "delete" && data.id) {
      await db.from("blocked_slots").delete().eq("id", data.id);
    }
    const { data: rows } = await db.from("blocked_slots").select("*").gte("end_at", new Date().toISOString()).order("start_at");
    return rows ?? [];
  });

export const adminCalendars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const cal = await import("./calendar.server");
    if (!cal.calendarConnected()) return { connected: false, calendars: [] as { id: string; summary: string; primary: boolean }[], error: null as string | null };
    try {
      return { connected: true, calendars: await cal.listCalendars(), error: null };
    } catch (e) {
      return { connected: true, calendars: [], error: (e as Error).message };
    }
  });

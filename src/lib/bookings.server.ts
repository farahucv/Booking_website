// Server-only helpers for availability and booking state changes.
import type { PublicSettings } from "./settings.functions";
import { mergePublic } from "./settings.functions";
import { calendarConnected, getBusyIntervals, deleteBookingEvent } from "./calendar.server";

export type CalendarSettings = { booking_calendar_id?: string; busy_calendar_ids?: string[] } | null;
export type PolicySettings = { short_notice_hours: number; slot_step: number };

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadAll() {
  const db = await admin();
  const { data } = await db.from("settings").select("key, value");
  const map: Record<string, any> = {};
  for (const r of data ?? []) map[r.key] = r.value;
  const pub: PublicSettings = mergePublic(map);
  const policy: PolicySettings = { short_notice_hours: 24, slot_step: 30, ...(map["policy"] ?? {}) };
  return { map, pub, policy, calendar: (map["calendar"] ?? null) as CalendarSettings, bank: map["bank_details"] ?? null };
}

export const riyadh = (date: string, hm: string) => new Date(`${date}T${hm}:00+03:00`);

type Interval = { s: number; e: number };

/** All busy intervals (ms) overlapping the given day, padded by buffer. */
export async function busyForRange(fromIso: string, toIso: string, bufferMin: number, calendar: CalendarSettings, excludeId?: string) {
  const db = await admin();
  const out: Interval[] = [];
  const pad = bufferMin * 60000;
  const { data: bookings } = await db
    .from("bookings")
    .select("id, start_at, end_at")
    .in("status", ["pre_approved", "receipt_pending", "confirmed"])
    .lt("start_at", toIso)
    .gt("end_at", fromIso);
  for (const b of bookings ?? []) {
    if (b.id === excludeId) continue;
    out.push({ s: +new Date(b.start_at) - pad, e: +new Date(b.end_at) + pad });
  }
  const { data: blocks } = await db.from("blocked_slots").select("start_at, end_at").lt("start_at", toIso).gt("end_at", fromIso);
  for (const b of blocks ?? []) out.push({ s: +new Date(b.start_at), e: +new Date(b.end_at) });

  const busyIds = calendar?.busy_calendar_ids?.length
    ? calendar.busy_calendar_ids
    : calendar?.booking_calendar_id
      ? [calendar.booking_calendar_id]
      : [];
  if (busyIds.length) {
    if (!calendarConnected()) throw new Error("calendar_unavailable");
    try {
      const ev = await getBusyIntervals(busyIds, fromIso, toIso);
      // Our own booking events are already counted from the DB; double-counting is harmless.
      for (const i of ev) out.push({ s: +new Date(i.start) - pad, e: +new Date(i.end) + pad });
    } catch (e) {
      console.error(e);
      throw new Error("calendar_unavailable");
    }
  }
  return out;
}

export function overlaps(a: Interval, list: Interval[]) {
  return list.some((b) => a.s < b.e && b.s < a.e);
}

export async function computeSlots(date: string, durationMin: number) {
  const { pub, policy, calendar } = await loadAll();
  const dow = new Date(`${date}T12:00:00+03:00`).getUTCDay();
  const wh = pub.working_hours[String(dow)];
  if (!wh || !durationMin) return [];
  const dayStart = riyadh(date, wh.start);
  const dayEnd = riyadh(date, wh.end);
  const busy = await busyForRange(dayStart.toISOString(), dayEnd.toISOString(), pub.durations.buffer, calendar);
  const minStart = Date.now() + policy.short_notice_hours * 3600000;
  const step = Math.max(15, policy.slot_step) * 60000;
  const slots: string[] = [];
  for (let t = +dayStart; t + durationMin * 60000 <= +dayEnd; t += step) {
    if (t < minStart) continue;
    if (!overlaps({ s: t, e: t + durationMin * 60000 }, busy)) slots.push(new Date(t).toISOString());
  }
  return slots;
}

export async function removeCalendarEvent(eventId: string | null) {
  if (!eventId) return;
  const { calendar } = await loadAll();
  if (!calendar?.booking_calendar_id || !calendarConnected()) return;
  try {
    await deleteBookingEvent(calendar.booking_calendar_id, eventId);
  } catch (e) {
    console.error("calendar delete failed", e);
  }
}

export async function expireOverdue() {
  const db = await admin();
  const { data } = await db
    .from("bookings")
    .update({ status: "expired" })
    .eq("status", "pre_approved")
    .lt("deposit_deadline", new Date().toISOString())
    .select("id, calendar_event_id");
  for (const b of data ?? []) await removeCalendarEvent(b.calendar_event_id);
  return data?.length ?? 0;
}

// Google Calendar via the Lovable connector gateway (server-side only).
// The connection is linked by Jood from the Lovable UI; until then every
// function reports connected=false and availability falls back to DB-only blocks.

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

function creds() {
  const key = process.env["GOOGLE_CALENDAR_API_KEY"];
  const lovable = process.env["LOVABLE_API_KEY"];
  if (!key || !lovable) return null;
  return { key, lovable };
}

async function gcal(path: string, init?: RequestInit) {
  const c = creds();
  if (!c) throw new Error("calendar_not_connected");
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${c.lovable}`,
      "X-Connection-Api-Key": c.key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`calendar_error_${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export function calendarConnected() {
  return creds() !== null;
}

export type BusyInterval = { start: string; end: string };

/** Busy intervals from the configured calendars for [timeMin, timeMax). */
export async function getBusyIntervals(
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
): Promise<BusyInterval[]> {
  const out: BusyInterval[] = [];
  for (const id of calendarIds) {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      maxResults: "250",
      orderBy: "startTime",
    });
    const data = await gcal(`/calendars/${encodeURIComponent(id)}/events?${params}`);
    for (const ev of data.items ?? []) {
      if (ev.transparency === "transparent") continue;
      const start = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00+03:00` : null);
      const end = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00+03:00` : null);
      if (start && end) out.push({ start, end });
    }
  }
  return out;
}

export async function createBookingEvent(
  calendarId: string,
  opts: { summary: string; description: string; start: string; end: string; pending: boolean },
) {
  const data = await gcal(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: opts.summary,
      description: opts.description,
      start: { dateTime: opts.start, timeZone: "Asia/Riyadh" },
      end: { dateTime: opts.end, timeZone: "Asia/Riyadh" },
      transparency: "opaque",
    }),
  });
  return data.id as string;
}

export async function updateBookingEvent(
  calendarId: string,
  eventId: string,
  patch: { summary?: string; description?: string },
) {
  await gcal(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteBookingEvent(calendarId: string, eventId: string) {
  await gcal(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}

export async function listCalendars() {
  const data = await gcal(`/users/me/calendarList`);
  return (data.items ?? []).map((c: any) => ({ id: c.id, summary: c.summary, primary: !!c.primary }));
}

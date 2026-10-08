import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney, fmtDateTime, type TKey } from "@/lib/i18n";
import { SERVICE_KEYS } from "@/lib/pricing";
import { claimAdmin, getAdminSettings, updateSettings } from "@/lib/settings.functions";
import { adminListBookings, adminAction, adminReceiptUrl, adminBlocks, adminCalendars, listPortfolio } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — جود الشاوي | Admin" },
      { name: "description", content: "إدارة طلبات الحجز والإعدادات." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "لوحة الإدارة — جود الشاوي" },
      { property: "og:description", content: "إدارة الحجوزات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const btn = "rounded-full px-4 py-1.5 text-sm font-medium";
const inp = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

function AdminPage() {
  const { t, tr, lang, setLang } = useI18n();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"req" | "week" | "blocks" | "settings" | "portfolio">("req");

  useEffect(() => {
    claimAdmin().then((r) => setIsAdmin(r.admin)).catch(() => setIsAdmin(false));
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    nav({ to: "/" });
  };

  if (isAdmin === null) return <p className="p-10 text-center">…</p>;
  if (!isAdmin) return <div className="p-10 text-center">{tr("هذا الحساب ليس لديه صلاحية الإدارة.", "This account has no admin access.")} <button onClick={logout} className="underline">{t("logout")}</button></div>;

  const tabs = [
    ["req", tr("الطلبات", "Requests")],
    ["week", tr("الأسبوع", "Week")],
    ["blocks", tr("الإجازات والحجوزات الخارجية", "Time off & external")],
    ["settings", tr("الإعدادات", "Settings")],
    ["portfolio", tr("صور الأعمال", "Portfolio")],
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="font-extrabold">{t("brand")} · {t("admin")}</Link>
          <div className="flex gap-2">
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className={`${btn} border border-border`}>{lang === "ar" ? "English" : "عربي"}</button>
            <button onClick={logout} className={`${btn} border border-border`}>{t("logout")}</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`${btn} whitespace-nowrap ${tab === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l}</button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "req" && <Requests />}
        {tab === "week" && <Week />}
        {tab === "blocks" && <Blocks />}
        {tab === "settings" && <SettingsTab />}
        {tab === "portfolio" && <Portfolio />}
      </main>
    </div>
  );
}

type Booking = Awaited<ReturnType<typeof adminListBookings>>[number];

function useBookings() {
  return useQuery({ queryKey: ["admin-bookings"], queryFn: () => adminListBookings(), refetchInterval: 60000 });
}

const ACTION_ERR: Record<string, [string, string]> = {
  slot_unavailable: ["الموعد لم يعد متاحًا (تعارض مع حجز أو حدث آخر).", "Slot no longer available (conflict)."],
  calendar_unavailable: ["ربط تقويم Google معطل — لا يمكن اعتماد الموعد الآن.", "Google Calendar link is down — cannot approve now."],
  travel_fee_required: ["حددي رسوم المشوار أولًا.", "Set the travel fee first."],
  bad_state: ["حالة الطلب لا تسمح بهذا الإجراء.", "Status doesn't allow this action."],
};

function Requests() {
  const { t, tr, lang } = useI18n();
  const q = useBookings();
  const [filter, setFilter] = useState("open");
  if (q.isLoading) return <p>…</p>;
  if (q.error) return <p className="text-destructive">{t("error")}</p>;
  const all = q.data ?? [];
  const list = all.filter((b) => (filter === "open" ? ["pending_review", "pre_approved", "receipt_pending"].includes(b.status) : filter === "all" ? true : b.status === filter));
  const soon = all.filter((b) => b.status === "pre_approved" && b.deposit_deadline && +new Date(b.deposit_deadline) - Date.now() < 3 * 3600000);
  return (
    <div className="space-y-4">
      {soon.length > 0 && <div className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">⚠ {tr(`${soon.length} طلب تقترب مهلة عربونه من الانتهاء (أقل من ٣ ساعات)`, `${soon.length} request(s) near deposit deadline (<3h)`)}</div>}
      <select className={`${inp} max-w-xs`} value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="open">{tr("المفتوحة", "Open")}</option>
        <option value="all">{tr("الكل", "All")}</option>
        {["pending_review", "pre_approved", "receipt_pending", "confirmed", "rejected", "expired", "cancelled"].map((s) => <option key={s} value={s}>{t(`st_${s}` as TKey)}</option>)}
      </select>
      {list.length === 0 && <p className="text-muted-foreground">{tr("لا توجد طلبات.", "No requests.")}</p>}
      <div className="grid gap-4 md:grid-cols-2">{list.map((b) => <BookingCard key={b.id} b={b} />)}</div>
      <p className="text-xs text-muted-foreground">{fmtMoney(0, lang) && ""}</p>
    </div>
  );
}

function BookingCard({ b }: { b: Booking }) {
  const { t, tr, lang } = useI18n();
  const qc = useQueryClient();
  const [fee, setFee] = useState<string>(b.travel_fee?.toString() ?? "");
  const [hair, setHair] = useState<string>(b.hair_price?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const track = `${window.location.origin}/track/${b.tracking_token}`;
  const phone = b.customer_phone.replace(/\D/g, "").replace(/^0/, "966");
  const waText = b.lang === "en"
    ? `Hello ${b.customer_name}, update on your booking (${t(`st_${b.status}` as TKey)}). Track it here: ${track}`
    : `مرحبًا ${b.customer_name}، تحديث بخصوص طلب حجزكِ لدى جود الشاوي. تابعي الطلب من الرابط: ${track}`;

  const act = async (action: "pre_approve" | "confirm" | "reject" | "cancel") => {
    if ((action === "reject" || action === "cancel") && !confirm(tr("متأكدة؟", "Are you sure?"))) return;
    setBusy(true);
    try {
      await adminAction({ data: { id: b.id, action, travel_fee: fee === "" ? undefined : Number(fee), hair_price: hair === "" ? undefined : Number(hair) } });
      toast.success("✓");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (e) {
      const m = (e as Error).message;
      const k = Object.keys(ACTION_ERR).find((x) => m.includes(x));
      toast.error(k ? tr(...ACTION_ERR[k]) : m);
    } finally {
      setBusy(false);
    }
  };
  const openReceipt = async () => {
    const url = await adminReceiptUrl({ data: { path: b.receipt_path! } });
    if (url) window.open(url, "_blank");
  };
  const svc = b.services as Record<string, number>;
  const hs = b.hair_service as any;

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
      <div className="flex items-center justify-between">
        <b>{b.customer_name}</b>
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{t(`st_${b.status}` as TKey)}</span>
      </div>
      <p dir="ltr" className="text-end">{b.customer_phone} · #{b.id.slice(0, 8).toUpperCase()}</p>
      <p>{fmtDateTime(b.start_at, lang)} → {new Date(b.end_at).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-GB", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" })}</p>
      <p>{SERVICE_KEYS.filter((k) => svc?.[k]).map((k) => `${t(`svc_${k}` as const)} × ${svc[k]}`).join(" · ")}</p>
      <p>{t(`loc_${b.location_type}` as TKey)} {b.city ?? ""} {b.district ?? ""} {b.location_desc ?? ""} {b.location_url && <a className="text-primary underline" href={b.location_url} target="_blank" rel="noreferrer">📍</a>}</p>
      <p>{t("total")}: {fmtMoney(b.makeup_total, lang)} · {t("deposit")}: {fmtMoney(b.deposit_amount, lang)}</p>
      {hs && <p>{t("hairTitle")}: {hs.count} · {hs.length}/{hs.density} · {fmtMoney(hs.range?.min ?? 0, lang)}–{fmtMoney(hs.range?.max ?? 0, lang)}</p>}
      {b.notes && <p className="text-muted-foreground">“{b.notes}”</p>}
      {b.deposit_deadline && b.status === "pre_approved" && <p className="text-primary">{tr("مهلة العربون حتى", "Deposit due by")} {fmtDateTime(b.deposit_deadline, lang)}</p>}

      {["pending_review", "pre_approved", "receipt_pending"].includes(b.status) && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {b.location_type !== "at_jood" && <input className={inp} type="number" min={0} placeholder={t("travelFee")} value={fee} onChange={(e) => setFee(e.target.value)} disabled={b.status !== "pending_review"} />}
          {hs && <input className={inp} type="number" min={0} placeholder={tr("سعر الشعر", "Hair price")} value={hair} onChange={(e) => setHair(e.target.value)} />}
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        {b.status === "pending_review" && <button disabled={busy} onClick={() => act("pre_approve")} className={`${btn} bg-primary text-primary-foreground`}>{tr("موافقة مبدئية", "Pre-approve")}</button>}
        {["pre_approved", "receipt_pending"].includes(b.status) && <button disabled={busy} onClick={() => act("confirm")} className={`${btn} bg-primary text-primary-foreground`}>{tr("تم استلام العربون — تأكيد", "Deposit received — confirm")}</button>}
        {b.receipt_path && <button onClick={openReceipt} className={`${btn} border border-border`}>{tr("عرض الإيصال", "View receipt")}</button>}
        {b.status === "pending_review" && <button disabled={busy} onClick={() => act("reject")} className={`${btn} border border-border`}>{tr("رفض", "Reject")}</button>}
        {["pre_approved", "receipt_pending", "confirmed"].includes(b.status) && <button disabled={busy} onClick={() => act("cancel")} className={`${btn} border border-border`}>{tr("إلغاء", "Cancel")}</button>}
        <a href={`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer" className={`${btn} border border-border`}>{t("whatsapp")}</a>
      </div>
      <details className="text-xs text-muted-foreground">
        <summary>{tr("سجل الحالات", "Status log")}</summary>
        {b.events.map((e) => <p key={e.id}>{fmtDateTime(e.created_at, lang)}: {e.from_status ? t(`st_${e.from_status}` as TKey) + " → " : ""}{t(`st_${e.to_status}` as TKey)}</p>)}
      </details>
    </div>
  );
}

function Week() {
  const { t, tr, lang } = useI18n();
  const q = useBookings();
  const [offset, setOffset] = useState(0);
  const start = new Date(Date.now() + offset * 7 * 86400000);
  const days = Array.from({ length: 7 }, (_, i) => new Date(+start + i * 86400000 + 3 * 3600000).toISOString().slice(0, 10));
  const active = (q.data ?? []).filter((b) => ["pre_approved", "receipt_pending", "confirmed", "pending_review"].includes(b.status));
  const dayOf = (iso: string) => new Date(+new Date(iso) + 3 * 3600000).toISOString().slice(0, 10);
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setOffset(offset - 1)} className={`${btn} border border-border`}>{tr("السابق", "Prev")}</button>
        <button onClick={() => setOffset(0)} className={`${btn} border border-border`}>{tr("اليوم", "Today")}</button>
        <button onClick={() => setOffset(offset + 1)} className={`${btn} border border-border`}>{tr("التالي", "Next")}</button>
      </div>
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => (
          <div key={d} className="min-h-32 rounded-xl border border-border bg-card p-2 text-xs">
            <p className="mb-2 font-bold">{new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d))}</p>
            {active.filter((b) => dayOf(b.start_at) === d).map((b) => (
              <div key={b.id} className={`mb-1 rounded-lg p-1.5 ${b.status === "confirmed" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {new Date(b.start_at).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-GB", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" })} {b.customer_name}
                <br />{t(`st_${b.status}` as TKey)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Blocks() {
  const { tr, lang } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState({ date: "", from: "09:00", to: "23:00", reason: "", source: "vacation" as "manual" | "external_booking" | "vacation" });
  const load = (d: Parameters<typeof adminBlocks>[0]["data"]) => adminBlocks({ data: d }).then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { load({ op: "list" }); }, []);
  const add = () => {
    if (!f.date) return;
    load({ op: "add", start_at: `${f.date}T${f.from}:00+03:00`, end_at: `${f.date}T${f.to}:00+03:00`, reason: f.reason, source: f.source });
  };
  const label = { vacation: tr("إجازة", "Time off"), external_booking: tr("حجز واتساب/اتصال", "WhatsApp/phone booking"), manual: tr("فترة محجوبة", "Blocked") };
  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 md:grid-cols-6">
        <select className={inp} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as any })}>
          {Object.entries(label).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className={inp} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input className={inp} type="time" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <input className={inp} type="time" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <input className={inp} placeholder={tr("ملاحظة / اسم العميلة", "Note / client")} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
        <button onClick={add} className={`${btn} bg-primary text-primary-foreground`}>{tr("إضافة", "Add")}</button>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
          <span>{label[r.source as keyof typeof label]} · {fmtDateTime(r.start_at, lang)} → {fmtDateTime(r.end_at, lang)} {r.reason && `· ${r.reason}`}</span>
          <button onClick={() => load({ op: "delete", id: r.id })} className="text-destructive">✕</button>
        </div>
      ))}
    </div>
  );
}

const DAYS: [string, string][] = [["الأحد", "Sun"], ["الاثنين", "Mon"], ["الثلاثاء", "Tue"], ["الأربعاء", "Wed"], ["الخميس", "Thu"], ["الجمعة", "Fri"], ["السبت", "Sat"]];

function SettingsTab() {
  const { tr } = useI18n();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: () => getAdminSettings() });
  const cals = useQuery({ queryKey: ["admin-cals"], queryFn: () => adminCalendars() });
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    if (q.data) setS({ ...q.data.public, bank: q.data.bank_details ?? { bank_name: "", beneficiary: "", iban: "" }, calendar: q.data.calendar ?? { booking_calendar_id: "", busy_calendar_ids: [] }, policy: { short_notice_hours: 24, slot_step: 30, ...((q.data as any).policy ?? {}) } });
  }, [q.data]);
  if (!s) return <p>…</p>;

  const save = async () => {
    try {
      await Promise.all([
        updateSettings({ data: { key: "durations", value: s.durations } }),
        updateSettings({ data: { key: "working_hours", value: s.working_hours } }),
        updateSettings({ data: { key: "contact", value: s.contact } }),
        updateSettings({ data: { key: "bank_details", value: s.bank } }),
        updateSettings({ data: { key: "calendar", value: s.calendar } }),
        updateSettings({ data: { key: "policy", value: s.policy } }),
        updateSettings({ data: { key: "booking_open", value: s.booking_open } }),
      ]);
      toast.success(tr("تم الحفظ", "Saved"));
      q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const num = (path: "durations" | "policy", k: string, label: string) => (
    <label className="text-sm">{label}
      <input className={inp} type="number" min={0} value={s[path][k]} onChange={(e) => setS({ ...s, [path]: { ...s[path], [k]: Number(e.target.value) } })} />
    </label>
  );
  const complete = s.durations.evening > 0 && s.durations.queen > 0 && s.durations.bride > 0 && Object.values(s.working_hours).some(Boolean) && s.bank.bank_name && s.bank.beneficiary && s.bank.iban;
  const card = "space-y-3 rounded-2xl border border-border bg-card p-4";

  return (
    <div className="space-y-5">
      <div className={card}>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={s.booking_open} onChange={(e) => setS({ ...s, booking_open: e.target.checked })} />
          {tr("فتح الحجز الإلكتروني", "Open online booking")}
        </label>
        {!complete && <p className="text-sm text-destructive">{tr("لن يُفتح الحجز حتى تُكملي: مدد الخدمات، أوقات العمل، والبيانات البنكية.", "Booking stays closed until durations, working hours and bank details are set.")}</p>}
      </div>

      <div className={card}>
        <h3 className="font-bold">{tr("مدد الخدمات (بالدقائق)", "Durations (minutes)")}</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {num("durations", "evening", tr("سهرة / شخص", "Evening / person"))}
          {num("durations", "queen", tr("ملكة / شخص", "Queen / person"))}
          {num("durations", "bride", tr("عروس", "Bride"))}
          {num("durations", "prep", tr("وقت التجهيز", "Prep time"))}
          {num("durations", "buffer", tr("فاصل بين المواعيد", "Buffer"))}
          {num("durations", "travel_in", tr("تنقل داخل بريدة (اتجاه)", "Travel in Buraidah (one way)"))}
          {num("durations", "travel_out", tr("تنقل خارج بريدة (اتجاه)", "Travel outside (one way)"))}
          {num("policy", "short_notice_hours", tr("أقل مهلة للحجز (ساعات)", "Min notice (hours)"))}
        </div>
      </div>

      <div className={card}>
        <h3 className="font-bold">{tr("أوقات العمل", "Working hours")}</h3>
        {DAYS.map(([ar, en], i) => {
          const h = s.working_hours[String(i)];
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex w-28 items-center gap-2"><input type="checkbox" checked={!!h} onChange={(e) => setS({ ...s, working_hours: { ...s.working_hours, [i]: e.target.checked ? { start: "12:00", end: "23:00" } : null } })} />{tr(ar, en)}</label>
              {h && <>
                <input className={`${inp} w-32`} type="time" value={h.start} onChange={(e) => setS({ ...s, working_hours: { ...s.working_hours, [i]: { ...h, start: e.target.value } } })} />
                <input className={`${inp} w-32`} type="time" value={h.end} onChange={(e) => setS({ ...s, working_hours: { ...s.working_hours, [i]: { ...h, end: e.target.value } } })} />
              </>}
            </div>
          );
        })}
      </div>

      <div className={card}>
        <h3 className="font-bold">{tr("البيانات البنكية", "Bank details")}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <input className={inp} placeholder={tr("البنك", "Bank")} value={s.bank.bank_name} onChange={(e) => setS({ ...s, bank: { ...s.bank, bank_name: e.target.value } })} />
          <input className={inp} placeholder={tr("اسم المستفيد", "Beneficiary")} value={s.bank.beneficiary} onChange={(e) => setS({ ...s, bank: { ...s.bank, beneficiary: e.target.value } })} />
          <input className={inp} placeholder="IBAN" dir="ltr" value={s.bank.iban} onChange={(e) => setS({ ...s, bank: { ...s.bank, iban: e.target.value } })} />
        </div>
      </div>

      <div className={card}>
        <h3 className="font-bold">{tr("بيانات التواصل", "Contact")}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {(["phone", "whatsapp", "instagram", "tiktok", "snapchat"] as const).map((k) => (
            <input key={k} className={inp} dir="ltr" placeholder={k} value={s.contact[k]} onChange={(e) => setS({ ...s, contact: { ...s.contact, [k]: e.target.value } })} />
          ))}
        </div>
      </div>

      <div className={card}>
        <h3 className="font-bold">Google Calendar</h3>
        {cals.isLoading ? <p>…</p> : !cals.data?.connected ? (
          <p className="text-sm text-muted-foreground">{tr("التقويم غير مربوط بعد. اطلبي من المساعد ربط تقويم Google في المحادثة.", "Calendar not linked yet. Ask the assistant in chat to link Google Calendar.")}</p>
        ) : cals.data.error ? (
          <p className="text-sm text-destructive">{tr("تعذر الوصول للتقويم — الحجوزات المتأثرة لن تُعتمد حتى يعود الربط.", "Calendar unreachable — approvals paused until it's back.")}</p>
        ) : (
          <div className="space-y-2 text-sm">
            <label>{tr("تقويم الحجوزات", "Bookings calendar")}
              <select className={inp} value={s.calendar.booking_calendar_id} onChange={(e) => setS({ ...s, calendar: { ...s.calendar, booking_calendar_id: e.target.value } })}>
                <option value="">{tr("— بدون —", "— none —")}</option>
                {cals.data.calendars.map((c) => <option key={c.id} value={c.id}>{c.summary}</option>)}
              </select>
            </label>
            <p>{tr("التقاويم المؤثرة على الإتاحة", "Calendars that block availability")}</p>
            {cals.data.calendars.map((c) => (
              <label key={c.id} className="flex gap-2">
                <input type="checkbox" checked={s.calendar.busy_calendar_ids?.includes(c.id)} onChange={(e) => setS({ ...s, calendar: { ...s.calendar, busy_calendar_ids: e.target.checked ? [...(s.calendar.busy_calendar_ids ?? []), c.id] : s.calendar.busy_calendar_ids.filter((x: string) => x !== c.id) } })} />
                {c.summary}
              </label>
            ))}
          </div>
        )}
      </div>

      <button onClick={save} className="rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground">{tr("حفظ الإعدادات", "Save settings")}</button>
    </div>
  );
}

function Portfolio() {
  const { tr } = useI18n();
  const q = useQuery({ queryKey: ["portfolio"], queryFn: () => listPortfolio() });
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList) => {
    setBusy(true);
    try {
      let order = (q.data?.length ?? 0) + 1;
      for (const f of Array.from(files)) {
        const path = `${crypto.randomUUID()}.${f.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("portfolio").upload(path, f, { contentType: f.type });
        if (error) throw error;
        const { error: e2 } = await supabase.from("portfolio_images").insert({ storage_path: path, sort_order: order++ });
        if (e2) throw e2;
      }
      q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string, path: string) => {
    if (!confirm(tr("حذف الصورة؟", "Delete photo?"))) return;
    await supabase.storage.from("portfolio").remove([path]);
    await supabase.from("portfolio_images").delete().eq("id", id);
    q.refetch();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const list = q.data ?? [];
    const a = list[i], b = list[i + dir];
    if (!a || !b) return;
    await supabase.from("portfolio_images").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("portfolio_images").update({ sort_order: a.sort_order === b.sort_order ? a.sort_order + dir : a.sort_order }).eq("id", b.id);
    q.refetch();
  };
  return (
    <div className="space-y-4">
      <label className="inline-block cursor-pointer rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground">
        {busy ? "…" : tr("رفع صور", "Upload photos")}
        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
      </label>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(q.data ?? []).map((p, i) => (
          <div key={p.id} className="relative">
            <img src={p.url} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
            <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
              <button onClick={() => move(i, -1)} className="rounded-full bg-background px-2 text-sm">↑</button>
              <button onClick={() => remove(p.id, p.storage_path)} className="rounded-full bg-background px-2 text-sm text-destructive">✕</button>
              <button onClick={() => move(i, 1)} className="rounded-full bg-background px-2 text-sm">↓</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

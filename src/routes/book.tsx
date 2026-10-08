import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n, fmtMoney, fmtTime, fmtDateTime } from "@/lib/i18n";
import { SERVICES, SERVICE_KEYS, calcMakeup, calcHairRange, isLocationBlocked, type ServiceCounts, type LocationType } from "@/lib/pricing";
import { getPublicSettings } from "@/lib/settings.functions";
import { getSlots, createBooking } from "@/lib/bookings.functions";

const settingsQuery = queryOptions({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "اطلبي موعدكِ — جود الشاوي | Book Jood Alshawi" },
      { name: "description", content: "احجزي مكياج سهرة أو ملكة أو عروس مع جود الشاوي في بريدة خلال دقائق." },
      { property: "og:title", content: "اطلبي موعدكِ مع جود الشاوي" },
      { property: "og:description", content: "حجز مكياج إلكتروني في بريدة — سهرة، ملكة، عروس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: BookPage,
  errorComponent: () => <div className="p-10 text-center">Error</div>,
  notFoundComponent: () => <div className="p-10 text-center">Not found</div>,
});

const ERR: Record<string, [string, string]> = {
  slot_unavailable: ["هذا الوقت لم يعد متاحًا، اختاري وقتًا آخر.", "This time is no longer available, please pick another."],
  duplicate_request: ["لديكِ طلب قيد المراجعة بالفعل.", "You already have a request under review."],
  booking_closed: ["الحجز الإلكتروني غير متاح حاليًا.", "Online booking is currently closed."],
  location_blocked: ["الخروج لمكياج السهرة يحتاج أكثر من شخص.", "Home visits need more than one evening makeup."],
};

function Counter({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="h-9 w-9 rounded-full border border-border text-lg">−</button>
      <span className="w-6 text-center font-bold">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="h-9 w-9 rounded-full border border-border text-lg">+</button>
    </div>
  );
}

const input = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-ring";

function BookPage() {
  const { t, tr, lang } = useI18n();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<ServiceCounts>({ evening: 0, queen: 0, bride: 0 });
  const [hairOn, setHairOn] = useState(false);
  const [hair, setHair] = useState({ count: 1, bride: false, length: "medium", density: "light" });
  const [loc, setLoc] = useState<LocationType>("at_jood");
  const [addr, setAddr] = useState({ city: "", district: "", location_desc: "", location_url: "" });
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotErr, setSlotErr] = useState<string | null>(null);
  const [slot, setSlot] = useState("");
  const [info, setInfo] = useState({ name: "", phone: "", notes: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; token: string } | null>(null);

  const m = calcMakeup(counts);
  const hairRange = hairOn ? calcHairRange(hair.count, hair.bride) : null;
  const blocked = isLocationBlocked(counts, loc);
  const minDate = useMemo(() => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!date) return;
    setSlots(null);
    setSlot("");
    getSlots({ data: { date, counts, loc } })
      .then((r) => {
        setSlots(r.slots);
        setSlotErr(r.error);
      })
      .catch(() => setSlots([]));
  }, [date, counts, loc]);

  if (!settings.booking_open) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-lg">{t("bookingClosed")}</p>
          <a href={settings.contact.whatsapp} target="_blank" rel="noreferrer" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">{t("whatsapp")}</a>
        </div>
      </div>
    );
  }

  if (done) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/track/${done.token}`;
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-3xl font-extrabold">{t("submittedTitle")} 🤍</h1>
          <p className="mt-3 text-muted-foreground">{t("submittedText")}</p>
          <p className="mt-6 text-sm">{t("orderNo")}: <b dir="ltr">{done.id}</b></p>
          <div className="mt-4 rounded-xl border border-border bg-card p-3 text-sm break-all" dir="ltr">{url}</div>
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={() => { navigator.clipboard.writeText(url); toast.success("✓"); }} className="rounded-full border border-border px-5 py-2">{t("copy")}</button>
            <Link to="/track/$token" params={{ token: done.token }} className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground">{t("trackLink")}</Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{tr("احفظي هذا الرابط لمتابعة طلبكِ.", "Save this link to follow your request.")}</p>
        </div>
      </div>
    );
  }

  const steps = [t("step_services"), t("step_location"), t("step_time"), t("step_info"), t("step_review")];
  const canNext = [
    m.people > 0 && (!hairOn || hair.count >= 1),
    !blocked && (loc === "at_jood" || (addr.district.trim() && (loc === "client_in_buraidah" || addr.city.trim()))),
    !!slot,
    info.name.trim().length >= 2 && /^[0-9+\s]{9,16}$/.test(info.phone.trim()),
    agree,
  ][step];

  const submit = async () => {
    setBusy(true);
    try {
      const r = await createBooking({
        data: {
          counts, loc, ...addr, start_at: slot, name: info.name, phone: info.phone, notes: info.notes,
          hair: hairOn ? hair : null, lang, agree: true as const,
        },
      });
      setDone(r);
    } catch (e) {
      const msg = (e as Error).message;
      const k = Object.keys(ERR).find((x) => msg.includes(x));
      toast.error(k ? tr(ERR[k]![0], ERR[k]![1]) : t("error"));
      if (k === "slot_unavailable") setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const Summary = (
    <div className="space-y-2 text-sm">
      <h3 className="mb-2 font-bold">{t("summary")}</h3>
      {SERVICE_KEYS.filter((k) => counts[k]).map((k) => (
        <div key={k} className="flex justify-between"><span>{t(`svc_${k}` as const)} × {counts[k]}</span><span>{fmtMoney(counts[k] * SERVICES[k].price, lang)}</span></div>
      ))}
      <div className="flex justify-between border-t border-border pt-2 font-bold"><span>{t("total")}</span><span>{fmtMoney(m.total, lang)}</span></div>
      <div className="flex justify-between text-primary"><span>{t("deposit")}</span><span>{fmtMoney(m.deposit, lang)}</span></div>
      <div className="flex justify-between text-muted-foreground"><span>{t("remaining")}</span><span>{fmtMoney(m.remaining, lang)}</span></div>
      {loc !== "at_jood" && <p className="text-xs text-muted-foreground">{t("travelPending")}</p>}
      {hairRange && <p className="text-xs text-muted-foreground">{t("hairRange")}: {fmtMoney(hairRange.min, lang)} – {fmtMoney(hairRange.max, lang)}</p>}
      {slot && <p className="text-xs">{fmtDateTime(slot, lang)}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <ol className="mb-8 flex gap-2 overflow-x-auto text-xs">
          {steps.map((s, i) => (
            <li key={s} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}. {s}</li>
          ))}
        </ol>
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border border-border bg-card p-5 md:p-7">
            {step === 0 && (
              <div className="space-y-4">
                {SERVICE_KEYS.map((k) => (
                  <div key={k} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div><p className="font-bold">{t(`svc_${k}` as const)}</p><p className="text-sm text-muted-foreground">{fmtMoney(SERVICES[k].price, lang)} · {t("deposit")} {fmtMoney(SERVICES[k].deposit, lang)}</p></div>
                    <Counter value={counts[k]} max={k === "bride" ? 1 : 20} onChange={(n) => setCounts({ ...counts, [k]: n })} />
                  </div>
                ))}
                <p className="text-sm text-muted-foreground">✦ {t("lashesFree")}</p>
                <label className="flex items-center gap-2 rounded-xl border border-border p-4">
                  <input type="checkbox" checked={hairOn} onChange={(e) => setHairOn(e.target.checked)} />
                  <span>{t("hairOpt")}</span>
                </label>
                {hairOn && (
                  <div className="space-y-3 rounded-xl bg-muted p-4 text-sm">
                    <p className="text-muted-foreground">{t("hairNote")}</p>
                    <div className="flex items-center justify-between"><span>{t("hairCount")}</span><Counter value={hair.count} max={20} onChange={(n) => setHair({ ...hair, count: Math.max(1, n) })} /></div>
                    {counts.bride > 0 && <label className="flex gap-2"><input type="checkbox" checked={hair.bride} onChange={(e) => setHair({ ...hair, bride: e.target.checked })} />{t("hairBride")}</label>}
                    <div className="grid grid-cols-2 gap-2">
                      <select className={input} value={hair.length} onChange={(e) => setHair({ ...hair, length: e.target.value })} aria-label={t("hairLength")}>
                        {(["short", "medium", "long"] as const).map((x) => <option key={x} value={x}>{t("hairLength")}: {t(x)}</option>)}
                      </select>
                      <select className={input} value={hair.density} onChange={(e) => setHair({ ...hair, density: e.target.value })} aria-label={t("hairDensity")}>
                        {(["light", "medium", "thick"] as const).map((x) => <option key={x} value={x}>{t("hairDensity")}: {t(x)}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                {(["at_jood", "client_in_buraidah", "client_outside"] as const).map((l) => (
                  <label key={l} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${loc === l ? "border-primary" : "border-border"}`}>
                    <input type="radio" checked={loc === l} onChange={() => setLoc(l)} />
                    <span className="font-medium">{t(`loc_${l}` as const)}</span>
                  </label>
                ))}
                {blocked && <p className="rounded-xl bg-accent p-4 text-sm text-accent-foreground">{t("locBlocked")}</p>}
                {loc !== "at_jood" && !blocked && (
                  <div className="grid gap-3 pt-2">
                    {loc === "client_outside" && <input className={input} placeholder={t("city")} value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />}
                    <input className={input} placeholder={t("district")} value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} />
                    <input className={input} placeholder={t("locDesc")} value={addr.location_desc} onChange={(e) => setAddr({ ...addr, location_desc: e.target.value })} />
                    <input className={input} placeholder={t("locUrl")} value={addr.location_url} onChange={(e) => setAddr({ ...addr, location_url: e.target.value })} dir="ltr" />
                    <p className="text-xs text-muted-foreground">{t("travelPending")}</p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium">{t("pickDate")}
                  <input type="date" min={minDate} className={`${input} mt-1`} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                {date && (
                  <div>
                    <p className="mb-2 text-sm font-medium">{t("pickTime")}</p>
                    {slots === null ? <p className="text-sm text-muted-foreground">…</p> : slotErr ? (
                      <p className="text-sm text-destructive">{tr("تعذر التحقق من المواعيد حاليًا، تواصلي مع جود عبر واتساب.", "Availability can't be checked right now, please contact Jood on WhatsApp.")}</p>
                    ) : slots.length === 0 ? <p className="text-sm text-muted-foreground">{t("noSlots")}</p> : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((s) => (
                          <button key={s} type="button" onClick={() => setSlot(s)} className={`rounded-xl border px-2 py-2 text-sm ${slot === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{fmtTime(s, lang)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-3">
                <input className={input} placeholder={t("name")} value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
                <input className={input} placeholder={t("phone")} inputMode="tel" dir="ltr" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
                <textarea className={input} rows={3} placeholder={t("notes")} value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="md:hidden">{Summary}</div>
                <p className="text-sm"><b>{t("name")}:</b> {info.name} · <span dir="ltr">{info.phone}</span></p>
                <p className="text-sm"><b>{t("step_location")}:</b> {t(`loc_${loc}` as const)} {addr.city} {addr.district}</p>
                <div className="rounded-xl bg-muted p-4 text-sm">
                  <p className="font-bold">{t("policyTitle")}</p>
                  <p className="mt-1 text-muted-foreground">{t("policyText")}</p>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />{t("agree")}</label>
              </div>
            )}

            <div className="mt-8 flex justify-between gap-3">
              <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className="rounded-full border border-border px-5 py-2.5 disabled:opacity-40">{t("back")}</button>
              {step < 4 ? (
                <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground disabled:opacity-40">{t("next")}</button>
              ) : (
                <button type="button" disabled={!canNext || busy} onClick={submit} className="rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground disabled:opacity-40">{busy ? "…" : t("submit")}</button>
              )}
            </div>
          </div>
          <aside className="hidden h-fit rounded-2xl border border-border bg-card p-5 md:sticky md:top-20 md:block">{Summary}</aside>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n, fmtMoney, fmtDateTime, type TKey } from "@/lib/i18n";
import { SERVICE_KEYS } from "@/lib/pricing";
import { getTracking, uploadReceipt } from "@/lib/bookings.functions";

export const Route = createFileRoute("/track/$token")({
  head: () => ({
    meta: [
      { title: "متابعة طلب الحجز — جود الشاوي | Track booking" },
      { name: "description", content: "تابعي حالة طلب حجز المكياج وارفعي إيصال العربون." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "متابعة طلب الحجز — جود الشاوي" },
      { property: "og:description", content: "تابعي حالة طلب الحجز." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
  errorComponent: () => <div className="p-10 text-center">Error</div>,
  notFoundComponent: () => <div className="p-10 text-center">Not found</div>,
});

function Countdown({ deadline, now }: { deadline: string; now: string }) {
  const { t } = useI18n();
  const offset = Date.now() - +new Date(now);
  const [left, setLeft] = useState(+new Date(deadline) - (Date.now() - offset));
  useEffect(() => {
    const i = setInterval(() => setLeft(+new Date(deadline) - (Date.now() - offset)), 1000);
    return () => clearInterval(i);
  }, [deadline, offset]);
  const s = Math.max(0, Math.floor(left / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return <p className="text-sm">{t("timeLeft")}: <b dir="ltr">{h}:{String(m).padStart(2, "0")}</b> {t("hours")}</p>;
}

function TrackPage() {
  const { token } = Route.useParams();
  const { t, tr, lang } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["track", token], queryFn: () => getTracking({ data: { token } }), retry: false });
  const [uploading, setUploading] = useState(false);
  const b = q.data;

  const onFile = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) return toast.error(tr("الحد الأقصى ٥ ميجابايت", "Max 5 MB"));
    setUploading(true);
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      await uploadReceipt({ data: { token, name: f.name, type: f.type, base64: btoa(bin) } });
      toast.success(t("receiptUploaded"));
      qc.invalidateQueries({ queryKey: ["track", token] });
    } catch {
      toast.error(t("error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 py-10">
        {q.isLoading ? <p className="text-center text-muted-foreground">…</p> : !b ? <p className="text-center">{t("notFound")}</p> : (
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("orderNo")} <b dir="ltr">{b.id}</b></span>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{t(`st_${b.status}` as TKey)}</span>
            </div>
            <p className="font-bold">{b.customer_name}</p>
            <p className="text-sm">{t("date")}: {fmtDateTime(b.start_at, lang)}</p>
            <div className="space-y-1 text-sm">
              {SERVICE_KEYS.filter((k) => (b.services as any)?.[k]).map((k) => <p key={k}>{t(`svc_${k}` as const)} × {(b.services as any)[k]}</p>)}
              <p>{t("total")}: <b>{fmtMoney(b.makeup_total, lang)}</b></p>
              <p className="text-primary">{t("deposit")}: <b>{fmtMoney(b.deposit_amount, lang)}</b></p>
              {b.location_type !== "at_jood" && <p>{t("travelFee")}: {b.travel_fee != null ? fmtMoney(b.travel_fee, lang) : t("travelPending")}</p>}
              {b.hair_service && <p>{t("hairTitle")}: {b.hair_price != null ? fmtMoney(b.hair_price, lang) : tr("يُؤكد لاحقًا", "to be confirmed")}</p>}
            </div>

            {b.status === "pre_approved" && (
              <div className="space-y-3 rounded-xl bg-muted p-4">
                {b.deposit_deadline && <Countdown deadline={b.deposit_deadline} now={b.now} />}
                {b.bank && (
                  <div className="text-sm">
                    <p className="font-bold">{t("bankDetails")}</p>
                    <p>{t("bankName")}: {(b.bank as any).bank_name}</p>
                    <p>{t("beneficiary")}: {(b.bank as any).beneficiary}</p>
                    <p>{t("iban")}: <span dir="ltr" className="select-all font-mono">{(b.bank as any).iban}</span></p>
                  </div>
                )}
                <label className="block cursor-pointer rounded-full bg-primary px-5 py-2.5 text-center font-bold text-primary-foreground">
                  {uploading ? "…" : t("uploadReceipt")}
                  <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                </label>
                <p className="text-xs text-muted-foreground">{t("policyText")}</p>
              </div>
            )}
            {b.status === "receipt_pending" && <p className="text-sm">{t("receiptUploaded")}</p>}
            {b.status === "expired" && <p className="text-sm">{t("expiredNote")}</p>}
            <a href={b.whatsapp} target="_blank" rel="noreferrer" className="block text-center text-sm text-primary underline">{t("whatsapp")}</a>
          </div>
        )}
      </div>
    </div>
  );
}

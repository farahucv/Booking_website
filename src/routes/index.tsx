import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { SERVICES, SERVICE_KEYS } from "@/lib/pricing";
import { getPublicSettings } from "@/lib/settings.functions";
import { listPortfolio } from "@/lib/bookings.functions";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: async () => {
    const [settings, portfolio] = await Promise.all([getPublicSettings(), listPortfolio()]);
    return { settings, portfolio };
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "جود الشاوي — خبيرة مكياج في بريدة | Jood Alshawi" },
      { name: "description", content: "مكياج سهرة وملكة وعروس في بريدة. اطلبي موعدكِ إلكترونيًا مع جود الشاوي." },
      { property: "og:title", content: "جود الشاوي — خبيرة مكياج في بريدة" },
      { property: "og:description", content: "مكياج سهرة وملكة وعروس في بريدة. اطلبي موعدكِ إلكترونيًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Index,
  errorComponent: () => <div className="p-10 text-center">Error</div>,
  notFoundComponent: () => <div className="p-10 text-center">Not found</div>,
});

function Index() {
  const { t, tr, lang } = useI18n();
  const { data } = useSuspenseQuery(homeQuery);
  const c = data.settings.contact;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, oklch(0.72 0.1 82 / 14%), transparent 70%), radial-gradient(40% 35% at 85% 20%, oklch(0.4 0.11 18 / 8%), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-20 text-center md:pt-28">
          <p className="text-sm font-semibold tracking-[0.3em] text-gold">{t("tagline")}</p>
          <h1 className="mt-5 font-display text-6xl font-semibold leading-[1.1] md:text-8xl">{t("brand")}</h1>
          <div className="gold-divider mt-7 text-lg" aria-hidden>✦</div>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("intro")}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/book" className="btn-primary text-base">{t("bookCta")}</Link>
            <a href={c.whatsapp} target="_blank" rel="noreferrer" className="btn-outline text-base">
              {t("whatsapp")}
            </a>
          </div>
          {!data.settings.booking_open && <p className="mt-5 text-sm text-muted-foreground">{t("bookingClosed")}</p>}
        </div>
      </section>

      {/* Portfolio */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">{t("portfolio")}</h2>
          <div className="gold-divider mt-4" aria-hidden>✦</div>
        </div>
        {data.portfolio.length === 0 ? (
          <p className="card-luxe border-dashed p-12 text-center text-muted-foreground">{t("portfolioEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {data.portfolio.map((p) => (
              <img key={p.id} src={p.url} alt={t("portfolio")} loading="lazy" className="aspect-[3/4] w-full rounded-2xl object-cover shadow-[var(--shadow-soft)]" />
            ))}
          </div>
        )}
      </section>

      {/* Services */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">{t("services")}</h2>
          <div className="gold-divider mt-4" aria-hidden>✦</div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {SERVICE_KEYS.map((k) => (
            <div key={k} className="card-luxe group p-7 text-center transition-shadow hover:shadow-[var(--shadow-lift)]">
              <h3 className="font-display text-xl font-semibold">{t(`svc_${k}` as const)}</h3>
              <p className="mt-4 font-display text-4xl font-semibold text-primary">{fmtMoney(SERVICES[k].price, lang)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{k === "bride" ? t("forBride") : t("perPerson")}</p>
              <div className="mx-auto mt-5 h-px w-10 bg-gold/60" aria-hidden />
              <p className="mt-4 text-sm text-muted-foreground">
                {t("deposit")}: {fmtMoney(SERVICES[k].deposit, lang)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">✦ {t("lashesFree")} · {t("travelPending")}</p>
        <div className="card-luxe mt-6 p-7 text-center">
          <h3 className="font-display text-lg font-semibold">{t("hairTitle")}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{t("hairNote")}</p>
        </div>
        <div className="mt-10 text-center">
          <Link to="/book" className="btn-primary text-base">{t("bookCta")}</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 border-t border-border bg-card/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm">
          <div>
            <p className="font-display text-base font-semibold">{t("contact")}</p>
            <p className="mt-1 text-muted-foreground" dir="ltr">{c.phone}</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <a href={c.whatsapp} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">{t("whatsapp")}</a>
            <a href={c.instagram} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">Instagram</a>
            <a href={c.tiktok} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">TikTok</a>
            <a href={c.snapchat} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">Snapchat</a>
            <Link to="/admin" className="text-muted-foreground hover:text-primary">{tr("الإدارة", "Admin")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

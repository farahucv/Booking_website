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
      { title: "جود الشاوي — استوديو مكياج في بريدة | Jood Alshawi Studio" },
      { name: "description", content: "استوديو مكياج سهرة وملكة وعروس في بريدة. احجزي موعدكِ إلكترونيًا مع استوديو جود الشاوي." },
      { property: "og:title", content: "جود الشاوي — استوديو مكياج في بريدة" },
      { property: "og:description", content: "مكياج سهرة وملكة وعروس في بريدة. احجزي موعدكِ إلكترونيًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Index,
  errorComponent: () => <div className="p-10 text-center">Error</div>,
  notFoundComponent: () => <div className="p-10 text-center">Not found</div>,
});

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-12 text-center">
      <h2 className="font-display text-4xl font-semibold md:text-5xl">{title}</h2>
      <div className="gold-divider mt-5 text-lg" aria-hidden>✦</div>
    </div>
  );
}

function Index() {
  const { t, tr, lang } = useI18n();
  const { data } = useSuspenseQuery(homeQuery);
  const c = data.settings.contact;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero — full-width calm cream */}
      <section className="hero-cream relative overflow-hidden">
        <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-24 text-center md:pb-32 md:pt-32">
          <span className="inline-block rounded-full border border-gold/40 bg-card/70 px-5 py-1.5 text-sm font-medium tracking-wide text-muted-foreground">
            {t("tagline")}
          </span>
          <h1 className="mt-8 font-display text-7xl font-semibold leading-[1.05] md:text-9xl">{t("brand")}</h1>
          <div className="gold-divider mt-8 text-xl" aria-hidden>✦</div>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">{t("intro")}</p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link to="/book" className="btn-primary px-10 text-base">{t("bookCta")}</Link>
            <a href={c.whatsapp} target="_blank" rel="noreferrer" className="btn-outline px-10 text-base">
              {t("whatsapp")}
            </a>
          </div>
          {!data.settings.booking_open && <p className="mt-6 text-sm text-muted-foreground">{t("bookingClosed")}</p>}
        </div>
        <div aria-hidden className="mx-auto h-px max-w-3xl bg-gradient-to-l from-transparent via-gold/50 to-transparent" />
      </section>

      {/* Portfolio */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <SectionHeading title={t("portfolio")} />
        {data.portfolio.length === 0 ? (
          <p className="card-luxe border-dashed p-16 text-center text-muted-foreground">{t("portfolioEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {data.portfolio.map((p) => (
              <img key={p.id} src={p.url} alt={t("portfolio")} loading="lazy" className="aspect-[3/4] w-full rounded-3xl object-cover shadow-[var(--shadow-soft)]" />
            ))}
          </div>
        )}
      </section>

      {/* Services — butter band */}
      <section className="butter-band">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <SectionHeading title={t("services")} />
          <div className="grid gap-6 md:grid-cols-3">
            {SERVICE_KEYS.map((k) => (
              <div key={k} className="card-luxe group p-9 text-center transition-shadow hover:shadow-[var(--shadow-lift)]">
                <h3 className="font-display text-2xl font-semibold">{t(`svc_${k}` as const)}</h3>
                <p className="mt-5 font-display text-5xl font-semibold text-primary">{fmtMoney(SERVICES[k].price, lang)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{k === "bride" ? t("forBride") : t("perPerson")}</p>
                <div className="mx-auto mt-6 h-px w-12 bg-gold/60" aria-hidden />
                <p className="mt-5 text-sm text-muted-foreground">
                  {t("deposit")}: {fmtMoney(SERVICES[k].deposit, lang)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">✦ {t("lashesFree")} · {t("travelPending")}</p>
          <div className="card-luxe mx-auto mt-10 max-w-2xl p-8 text-center">
            <h3 className="font-display text-xl font-semibold">{t("hairTitle")}</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{t("hairNote")}</p>
          </div>
          <div className="mt-14 text-center">
            <Link to="/book" className="btn-primary px-10 text-base">{t("bookCta")}</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12 text-sm">
          <div>
            <p className="font-display text-lg font-semibold">{t("contact")}</p>
            <p className="mt-1 text-muted-foreground" dir="ltr">{c.phone}</p>
          </div>
          <div className="flex flex-wrap gap-6">
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

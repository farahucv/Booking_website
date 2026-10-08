import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { SERVICES, SERVICE_KEYS } from "@/lib/pricing";
import { getPublicSettings } from "@/lib/settings.functions";
import { listPortfolio } from "@/lib/bookings.functions";
import heroImg from "@/assets/hero.jpg";

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

function SectionHeading({ title, light }: { title: string; light?: boolean }) {
  return (
    <div className="mb-12 text-center">
      <h2 className={`font-display text-4xl font-bold md:text-5xl ${light ? "text-[oklch(0.96_0.012_88)]" : ""}`}>{title}</h2>
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

      {/* Hero — editorial split */}
      <section className="hero-editorial relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="text-center md:text-start">
            <span className="eyebrow">{t("tagline")}</span>
            <h1 className="mt-6 font-display text-6xl font-bold leading-[1.1] md:text-8xl">{t("brand")}</h1>
            <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-muted-foreground md:mx-0">{t("intro")}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <Link to="/book" className="btn-gold px-10 text-base">{t("bookCta")}</Link>
              <a href={c.whatsapp} target="_blank" rel="noreferrer" className="btn-outline px-10 text-base">
                {t("whatsapp")}
              </a>
            </div>
            {!data.settings.booking_open && <p className="mt-6 text-sm text-muted-foreground">{t("bookingClosed")}</p>}
          </div>
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 rounded-[2.5rem] border border-gold/40" />
            <img
              src={heroImg}
              alt={t("brand")}
              width={1536}
              height={1024}
              className="relative aspect-[4/3] w-full rounded-[2rem] object-cover shadow-[var(--shadow-lift)]"
            />
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <SectionHeading title={t("portfolio")} />
        {data.portfolio.length === 0 ? (
          <p className="card-luxe border-dashed p-16 text-center text-muted-foreground">{t("portfolioEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
            {data.portfolio.map((p, i) => (
              <img
                key={p.id}
                src={p.url}
                alt={t("portfolio")}
                loading="lazy"
                className={`aspect-[3/4] w-full rounded-3xl object-cover shadow-[var(--shadow-soft)] ${i % 3 === 1 ? "md:translate-y-8" : ""}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Services — espresso feature band */}
      <section className="espresso-band">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <SectionHeading title={t("services")} light />
          <div className="grid gap-6 md:grid-cols-3">
            {SERVICE_KEYS.map((k) => {
              const featured = k === "queen";
              return (
                <div
                  key={k}
                  className={`rounded-3xl p-9 text-center transition-transform hover:-translate-y-1 ${
                    featured
                      ? "border border-gold/60 bg-[oklch(0.32_0.04_58)] shadow-[var(--shadow-lift)] md:scale-[1.04]"
                      : "border border-[oklch(1_0_0/12%)] bg-[oklch(1_0_0/4%)]"
                  }`}
                >
                  <h3 className="font-display text-2xl font-bold text-[oklch(0.96_0.012_88)]">{t(`svc_${k}` as const)}</h3>
                  <p className="mt-5 font-display text-5xl font-bold text-gold">{fmtMoney(SERVICES[k].price, lang)}</p>
                  <p className="mt-2 text-sm text-[oklch(0.8_0.02_80)]">{k === "bride" ? t("forBride") : t("perPerson")}</p>
                  <div className="mx-auto mt-6 h-px w-12 bg-gold/60" aria-hidden />
                  <p className="mt-5 text-sm text-[oklch(0.8_0.02_80)]">
                    {t("deposit")}: {fmtMoney(SERVICES[k].deposit, lang)}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-[oklch(0.8_0.02_80)]">✦ {t("lashesFree")} · {t("travelPending")}</p>
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-[oklch(1_0_0/12%)] bg-[oklch(1_0_0/4%)] p-8 text-center">
            <h3 className="font-display text-xl font-bold text-[oklch(0.96_0.012_88)]">{t("hairTitle")}</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[oklch(0.8_0.02_80)]">{t("hairNote")}</p>
          </div>
          <div className="mt-14 text-center">
            <Link to="/book" className="btn-gold px-10 text-base">{t("bookCta")}</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12 text-sm">
          <div>
            <p className="font-display text-lg font-bold">{t("contact")}</p>
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

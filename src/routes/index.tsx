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
      <section className="mx-auto max-w-5xl px-4 pb-14 pt-16 text-center">
        <p className="text-sm font-medium tracking-widest text-primary">{t("tagline")}</p>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight md:text-7xl">{t("brand")}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">{t("intro")}</p>
        <Link to="/book" className="mt-8 inline-block rounded-full bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-lg hover:opacity-90">
          {t("bookCta")}
        </Link>
        {!data.settings.booking_open && <p className="mt-4 text-sm text-muted-foreground">{t("bookingClosed")}</p>}
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">{t("portfolio")}</h2>
        {data.portfolio.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("portfolioEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {data.portfolio.map((p) => (
              <img key={p.id} src={p.url} alt={t("portfolio")} loading="lazy" className="aspect-[3/4] w-full rounded-xl object-cover" />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">{t("services")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {SERVICE_KEYS.map((k) => (
            <div key={k} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold">{t(`svc_${k}` as const)}</h3>
              <p className="mt-3 text-3xl font-extrabold text-primary">{fmtMoney(SERVICES[k].price, lang)}</p>
              <p className="text-sm text-muted-foreground">{k === "bride" ? t("forBride") : t("perPerson")}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("deposit")}: {fmtMoney(SERVICES[k].deposit, lang)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">✦ {t("lashesFree")} · {t("travelPending")}</p>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-bold">{t("hairTitle")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t("hairNote")}</p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm">
          <div>
            <p className="font-bold">{t("contact")}</p>
            <p className="text-muted-foreground" dir="ltr">{c.phone}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href={c.whatsapp} target="_blank" rel="noreferrer" className="hover:text-primary">{t("whatsapp")}</a>
            <a href={c.instagram} target="_blank" rel="noreferrer" className="hover:text-primary">Instagram</a>
            <a href={c.tiktok} target="_blank" rel="noreferrer" className="hover:text-primary">TikTok</a>
            <a href={c.snapchat} target="_blank" rel="noreferrer" className="hover:text-primary">Snapchat</a>
            <Link to="/admin" className="text-muted-foreground hover:text-primary">{tr("الإدارة", "Admin")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { SERVICES, SERVICE_KEYS } from "@/lib/pricing";
import { getPublicSettings } from "@/lib/settings.functions";
import { listPortfolio } from "@/lib/bookings.functions";
import heroImg from "@/assets/studio-editorial.jpg";
import detailImg from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { ArrowUpLeft, ArrowDown, MessageCircle } from "lucide-react";

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

function Index() {
  const { t, tr, lang } = useI18n();
  const { data } = useSuspenseQuery(homeQuery);
  const c = data.settings.contact;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="maison-hero relative isolate overflow-hidden">
        <img src={heroImg} alt={tr("تفاصيل مكياج بإضاءة طبيعية", "Makeup vanity in natural light")} width={1920} height={1024} className="maison-hero-image absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="maison-hero-shade absolute inset-0 -z-10" />
        <div className="maison-hero-inner mx-auto flex h-full max-w-7xl items-end px-6 pb-16 md:px-12 md:pb-20">
          <div className="maison-hero-copy max-w-lg">
            <p className="text-xs font-medium">{t("tagline")}</p>
            <h1 className="mt-6 font-display text-6xl font-normal leading-[1.2] md:text-8xl">{t("brand")}</h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed">{t("intro")}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="rounded-none shadow-none"><Link to="/book">{t("bookCta")}<ArrowUpLeft className="rtl:rotate-0 ltr:rotate-90" /></Link></Button>
              <Button asChild variant="link" className="text-foreground"><a href={c.whatsapp} target="_blank" rel="noreferrer"><MessageCircle />{t("whatsapp")}</a></Button>
            </div>
            {!data.settings.booking_open && <p className="mt-5 text-sm">{t("bookingClosed")}</p>}
          </div>
        </div>
        <a href="#services" className="absolute bottom-5 left-1/2 -translate-x-1/2 text-foreground" aria-label={t("services")}><ArrowDown className="size-4" /></a>
      </section>

      <section id="services" className="scroll-mt-24 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
            <div><p className="mb-3 text-xs text-muted-foreground">{tr("لكل مناسبة", "For every occasion")}</p><h2 className="font-display text-4xl font-normal md:text-5xl">{t("services")}</h2></div>
            <Button asChild variant="link" className="p-0 text-foreground"><Link to="/book">{t("bookCta")}<ArrowUpLeft /></Link></Button>
          </div>
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {SERVICE_KEYS.map((k, i) => <div key={k} className="border-t border-border pt-6">
              <p className="text-xs text-muted-foreground" dir="ltr">0{i + 1}</p>
              <h3 className="mt-5 font-display text-3xl font-normal">{t(`svc_${k}` as const)}</h3>
              <p className="mt-6 font-display text-4xl">{fmtMoney(SERVICES[k].price, lang)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{k === "bride" ? t("forBride") : t("perPerson")}</p>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm"><span className="text-muted-foreground">{t("deposit")}</span><span>{fmtMoney(SERVICES[k].deposit, lang)}</span></div>
            </div>)}
          </div>
          <p className="mt-12 text-sm text-muted-foreground">{t("lashesFree")} · {t("travelPending")}</p>
        </div>
      </section>

      <section className="maison-feature relative isolate flex min-h-[480px] items-center overflow-hidden md:min-h-[560px]">
        <img src={detailImg} alt={tr("تفاصيل أدوات المكياج", "Makeup details")} width={1536} height={1024} loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="maison-feature-shade absolute inset-0 -z-10" />
        <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12">
          <div className="max-w-md"><p className="text-xs">{tr("تفاصيل إطلالتكِ", "Complete your look")}</p><h2 className="mt-6 font-display text-4xl font-normal leading-snug md:text-5xl">{t("hairTitle")}</h2><p className="mt-5 text-base leading-relaxed">{t("hairNote")}</p><Button asChild size="lg" className="mt-8 rounded-none shadow-none"><Link to="/book">{t("bookCta")}<ArrowUpLeft /></Link></Button></div>
        </div>
      </section>

      <section id="portfolio" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-16 md:px-12 md:py-24">
        <p className="mb-3 text-xs text-muted-foreground">{tr("من الاستوديو", "From the studio")}</p>
        <h2 className="mb-10 font-display text-4xl font-normal md:text-5xl">{t("portfolio")}</h2>
        {data.portfolio.length === 0 ? <p className="border-y border-border py-12 text-sm text-muted-foreground">{t("portfolioEmpty")}</p> : <div className="grid grid-cols-2 gap-5 md:grid-cols-3">{data.portfolio.map(p => <img key={p.id} src={p.url} alt={t("portfolio")} loading="lazy" className="aspect-[3/4] w-full object-cover" />)}</div>}
      </section>

      <footer id="contact" className="scroll-mt-24 border-t border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-10 px-6 py-14 md:px-12">
          <div><p className="font-display text-3xl">{t("brand")}</p><p className="mt-3 text-sm text-muted-foreground">{t("tagline")}</p></div>
          <div><h2 className="mb-4 text-sm">{t("contact")}</h2><p className="text-sm text-muted-foreground" dir="ltr">{c.phone}</p><Button asChild variant="link" className="mt-3 p-0 text-foreground"><a href={c.whatsapp} target="_blank" rel="noreferrer"><MessageCircle />{t("whatsapp")}</a></Button></div>
          <div className="flex flex-col gap-3 text-sm"><a href={c.instagram} target="_blank" rel="noreferrer">Instagram</a><a href={c.tiktok} target="_blank" rel="noreferrer">TikTok</a><a href={c.snapchat} target="_blank" rel="noreferrer">Snapchat</a></div>
        </div>
        <div className="mx-auto flex max-w-7xl justify-between border-t border-border px-6 py-5 text-xs text-muted-foreground md:px-12"><span>© {t("brand")}</span><Link to="/admin">{tr("الإدارة", "Admin")}</Link></div>
      </footer>
    </div>
  );
}

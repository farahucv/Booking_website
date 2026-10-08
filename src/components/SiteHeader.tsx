import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export function SiteHeader() {
  const { t, tr, lang, setLang } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="maison-header mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-12">
        <Link to="/" className="shrink-0 font-display text-2xl text-foreground">
          {t("brand")}
        </Link>
        <nav aria-label={tr("التنقل الرئيسي", "Main navigation")} className="hidden items-center gap-9 text-sm text-muted-foreground md:flex">
          <Button asChild variant="link" className="h-auto p-0 font-normal text-muted-foreground"><a href="/#services">{t("services")}</a></Button>
          <Button asChild variant="link" className="h-auto p-0 font-normal text-muted-foreground"><a href="/#portfolio">{t("portfolio")}</a></Button>
          <Button asChild variant="link" className="h-auto p-0 font-normal text-muted-foreground"><a href="/#contact">{t("contact")}</a></Button>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="px-2 text-xs font-normal"
            aria-label="Switch language"
          >
            {lang === "ar" ? "English" : "عربي"}
          </Button>
          <Button asChild variant="ghost" size="icon"><Link to="/book" aria-label={t("bookCta")} title={t("bookCta")}><CalendarDays /></Link></Button>
        </div>
      </div>
    </header>
  );
}

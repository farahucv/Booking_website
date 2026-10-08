import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
          {t("brand")}
          <span className="ms-2 inline-block h-1.5 w-1.5 rounded-full bg-gold align-middle" aria-hidden />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            aria-label="Switch language"
          >
            {lang === "ar" ? "English" : "عربي"}
          </button>
          <Link to="/book" className="btn-primary !px-5 !py-2 text-sm">
            {t("bookCta")}
          </Link>
        </div>
      </div>
    </header>
  );
}

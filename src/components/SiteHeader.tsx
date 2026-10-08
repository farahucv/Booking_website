import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight text-foreground">
          {t("brand")}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            aria-label="Switch language"
          >
            {lang === "ar" ? "English" : "عربي"}
          </button>
          <Link to="/book" className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90">
            {t("bookCta")}
          </Link>
        </div>
      </div>
    </header>
  );
}

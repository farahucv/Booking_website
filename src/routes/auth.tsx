import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "دخول الإدارة — جود الشاوي | Admin sign in" },
      { name: "description", content: "تسجيل دخول لوحة إدارة حجوزات جود الشاوي." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "دخول الإدارة — جود الشاوي" },
      { property: "og:description", content: "لوحة إدارة الحجوزات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, tr } = useI18n();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const cls = "w-full rounded-xl border border-input bg-background px-3 py-2.5";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) throw error;
        toast.success(tr("تم إنشاء الحساب. تحققي من بريدكِ لتأكيده ثم سجلي الدخول.", "Account created. Confirm your email, then sign in."));
        setMode("in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold">{t("admin")} — {mode === "in" ? t("login") : t("signup")}</h1>
        <input className={cls} type="email" required placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        <input className={cls} type="password" required minLength={8} placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
        <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 font-bold text-primary-foreground disabled:opacity-50">{busy ? "…" : mode === "in" ? t("login") : t("signup")}</button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground underline">
          {mode === "in" ? t("signup") : t("login")}
        </button>
        <p className="text-xs text-muted-foreground">{tr("أول حساب يُنشأ يصبح حساب الإدارة تلقائيًا.", "The first account created becomes the admin account.")}</p>
      </form>
    </div>
  );
}

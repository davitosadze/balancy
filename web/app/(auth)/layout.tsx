"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { useLangStore } from "@/lib/i18n";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, initialize } = useAuthStore();
  const router = useRouter();
  const { t, lang, setLang } = useLangStore();

  useEffect(() => {
    initialize().then(() => {
      if (useAuthStore.getState().isAuthenticated) router.replace("/");
    });
  }, []);

  return (
    <div className="soft-page min-h-screen flex">
      {/* Left brand panel */}
      <div className="soft-hero hidden lg:flex lg:w-[420px] xl:w-[460px] flex-col justify-between p-10 shrink-0 rounded-none border-y-0 border-l-0">
        {/* Logo + lang switcher */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-neutral-950 text-[17px] tracking-tight">
            Balancy
          </Link>
          <button
            onClick={() => setLang(lang === "en" ? "ka" : "en")}
            className="text-[12px] font-semibold text-amber-700 hover:text-amber-900 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/70">
            {lang === "en" ? "GE" : "EN"}
          </button>
        </div>

        {/* Tagline */}
        <div>
          <h2 className="text-[32px] font-bold text-neutral-950 leading-[1.2] mb-4">
            {t("auth_brand_tagline_1")}
            <br />
            {t("auth_brand_tagline_2")}
          </h2>
          <p className="text-neutral-600 text-sm leading-relaxed max-w-xs">
            {t("auth_brand_desc")}
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-3">
          {[
            t("auth_brand_feature_1"),
            t("auth_brand_feature_2"),
            t("auth_brand_feature_3"),
            t("auth_brand_feature_4"),
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-sm text-neutral-600">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-white/70 p-8 lg:p-16">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo + lang switcher */}
          <div className="lg:hidden mb-8 flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="font-bold text-neutral-900 text-xl tracking-tight">
                Balancy
              </Link>
              <p className="text-sm text-neutral-500 mt-0.5">
                {t("auth_mobile_subtitle")}
              </p>
            </div>
            <button
              onClick={() => setLang(lang === "en" ? "ka" : "en")}
              className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors px-2.5 py-1 rounded-lg border border-neutral-200 hover:border-neutral-400">
              {lang === "en" ? "GE" : "EN"}
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

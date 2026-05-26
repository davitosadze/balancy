"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HandCoins,
  BarChart2,
  DollarSign,
  User,
  LogOut,
  Menu,
  X,
  Users,
  Sun,
  Moon,
  CalendarDays,
  Activity,
  Crown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { usePremiumStore } from "@/lib/store/premium";
import { useLangStore } from "@/lib/i18n";
import clsx from "clsx";

function getInitialDarkMode() {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("theme");
  if (saved) return saved === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { isPremium, initialize: initializePremium } = usePremiumStore();
  const { lang, setLang, t } = useLangStore();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(getInitialDarkMode);

  const nav = [
    { href: "/loans", icon: HandCoins, label: t("nav_loans") },
    { href: "/contacts", icon: Users, label: t("nav_contacts") },
    { href: "/activity", icon: Activity, label: t("nav_activity") },
    { href: "/statistics", icon: BarChart2, label: t("nav_statistics") },
    { href: "/calendar", icon: CalendarDays, label: t("nav_calendar") },
    { href: "/rates", icon: DollarSign, label: t("nav_rates") },
    { href: "/premium", icon: Crown, label: t("nav_premium") },
    { href: "/profile", icon: User, label: t("nav_profile") },
  ];

  useEffect(() => {
    initializePremium(user);
  }, [initializePremium, user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const initials =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .map((s) => s![0].toUpperCase())
      .join("") ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User";

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-white/95 backdrop-blur-xl border-b border-neutral-200 shadow-sm shadow-slate-200/70">
        <Link
          href="/loans"
          className="font-bold text-base tracking-tight text-neutral-900"
          onClick={() => setOpen(false)}>
          Balancy
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          "fixed top-0 left-0 z-50 h-screen w-[240px] flex flex-col",
          "bg-white border-r border-neutral-200",
          "transition-transform duration-200",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-[60px] border-b border-neutral-100 shrink-0">
          <Link
            href="/loans"
            className="font-bold text-neutral-900 text-[15px] tracking-tight"
            onClick={() => setOpen(false)}>
            Balancy
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, icon: Icon, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-950",
                )}>
                <Icon
                  size={16}
                  className={active ? "text-blue-600" : "text-neutral-400"}
                />
                <span className="flex-1">{label}</span>
                {href === "/premium" && isPremium && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    ON
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-neutral-100 shrink-0">
          {/* Language switcher */}
          <div className="flex items-center gap-1 px-3 mb-2">
            {(["en", "ka"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx(
                  "flex-1 h-7 rounded-md text-[12px] font-semibold transition-colors",
                  lang === l
                    ? "bg-blue-600 text-white"
                    : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100",
                )}>
                {l === "en" ? "EN" : "ქართ"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-neutral-50 mb-1 border border-neutral-200">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-neutral-900 truncate">
                {fullName}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors flex items-center justify-center shrink-0"
              aria-label="Toggle dark mode">
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors">
            <LogOut size={15} />
            {t("nav_signout")}
          </button>
        </div>
      </aside>
    </>
  );
}

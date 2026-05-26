"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useLangStore } from "@/lib/i18n";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const { t } = useLangStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    clearError();
    try {
      await login(data.email, data.password);
      router.replace("/");
    } catch {}
  };

  return (
    <div>
      <h1 className="text-[32px] font-bold text-neutral-900 leading-tight mb-1.5">
        {t("auth_login_title")}
      </h1>
      <p className="text-sm text-neutral-500 mb-8">{t("auth_login_subtitle")}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
            {t("auth_email")}
          </label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="w-full h-14 px-4 rounded-2xl border border-neutral-200 bg-white text-base text-neutral-900 outline-none focus:border-neutral-900 focus:ring-0 transition-colors placeholder:text-neutral-400"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1.5">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
            {t("auth_password")}
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="w-full h-14 px-4 pr-11 rounded-2xl border border-neutral-200 bg-white text-base text-neutral-900 outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1.5">
              {errors.password.message}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-neutral-950 text-white rounded-2xl text-base font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors">
          {isLoading ? t("auth_signing_in") : t("auth_sign_in")}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-7">
        {t("auth_no_account")}{" "}
        <Link
          href="/register"
          className="font-semibold text-neutral-900 hover:underline">
          {t("auth_create_account")}
        </Link>
      </p>
    </div>
  );
}

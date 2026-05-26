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

const schema = z
  .object({
    first_name: z.string().min(1, "Required"),
    last_name: z.string().min(1, "Required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "At least 6 characters"),
    confirm: z.string().min(1, "Required"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const {
    register: registerUser,
    isLoading,
    error,
    clearError,
  } = useAuthStore();
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
      await registerUser({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      router.replace("/");
    } catch {}
  };

  return (
    <div>
      <h1 className="text-[32px] font-bold text-neutral-900 leading-tight mb-1.5">
        {t("auth_create_account")}
      </h1>
      <p className="text-sm text-neutral-500 mb-8">
        {t("auth_register_subtitle")}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
              {t("auth_first_name")}
            </label>
            <input
              {...register("first_name")}
              className="w-full h-14 px-4 rounded-2xl border border-neutral-200 bg-white text-base text-neutral-900 outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
              placeholder="Ana"
            />
            {errors.first_name && (
              <p className="text-red-500 text-xs mt-1.5">
                {errors.first_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
              {t("auth_last_name")}
            </label>
            <input
              {...register("last_name")}
              className="w-full h-14 px-4 rounded-2xl border border-neutral-200 bg-white text-base text-neutral-900 outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
              placeholder="Kapanadze"
            />
            {errors.last_name && (
              <p className="text-red-500 text-xs mt-1.5">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
            {t("auth_email")}
          </label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="w-full h-14 px-4 rounded-2xl border border-neutral-200 bg-white text-base text-neutral-900 outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
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
              autoComplete="new-password"
              className="w-full h-14 px-4 pr-12 rounded-2xl border border-neutral-200 bg-white text-base text-neutral-900 outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
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

        <div>
          <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
            {t("auth_confirm_password")}
          </label>
          <input
            {...register("confirm")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full h-14 px-4 rounded-2xl border border-neutral-200 bg-white text-base text-neutral-900 outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
            placeholder="••••••••"
          />
          {errors.confirm && (
            <p className="text-red-500 text-xs mt-1.5">
              {errors.confirm.message}
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
          {isLoading ? t("auth_creating_account") : t("auth_create_account")}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-7">
        {t("auth_have_account")}{" "}
        <Link
          href="/login"
          className="font-semibold text-neutral-900 hover:underline">
          {t("auth_sign_in")}
        </Link>
      </p>
    </div>
  );
}
